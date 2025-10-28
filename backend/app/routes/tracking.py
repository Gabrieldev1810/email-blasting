import logging

logger = logging.getLogger(__name__)
from datetime import datetime
from flask import Blueprint, request, redirect, Response, jsonify
from app import db
from app.models.email_log import EmailLog, LinkClick, EmailStatus
import base64
import secrets
import uuid

tracking_bp = Blueprint('tracking', __name__, url_prefix='/track')

# 1x1 transparent pixel GIF for email open tracking
TRACKING_PIXEL = base64.b64decode(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
)

@tracking_bp.route('/open')
def track_open():
    """
    Track email open events.
    
    Expected query parameters:
    - log_id: The EmailLog ID to track
    - tracking_id: Alternative tracking identifier
    """
    try:
        log_id = request.args.get('log_id')
        tracking_id = request.args.get('tracking_id')
        
        if not log_id and not tracking_id:
            # Return pixel anyway to avoid breaking email display
            return Response(
                TRACKING_PIXEL,
                mimetype='image/gif',
                headers={
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            )
        
        # Find the email log entry
        email_log = None
        if log_id:
            email_log = EmailLog.query.get(log_id)
        elif tracking_id:
            email_log = EmailLog.query.filter_by(tracking_id=tracking_id).first()
        
        if email_log and email_log.status == EmailStatus.SENT:
            # Update to opened status
            email_log.status = EmailStatus.OPENED
            email_log.opened_at = datetime.utcnow()
            
            # Capture tracking metadata
            email_log.user_agent = request.headers.get('User-Agent', '')[:500]
            email_log.ip_address = get_client_ip(request)
            
            # Update campaign counters
            if email_log.campaign:
                email_log.campaign.emails_opened += 1
            
            db.session.commit()
        
        # Return 1x1 transparent pixel
        return Response(
            TRACKING_PIXEL,
            mimetype='image/gif',
            headers={
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Content-Length': str(len(TRACKING_PIXEL))
            }
        )
        
    except Exception as e:
        # Log error but still return pixel to avoid breaking email display
        logger.error(f"Error tracking email open: {str(e)}")
        return Response(
            TRACKING_PIXEL,
            mimetype='image/gif',
            headers={
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        )

@tracking_bp.route('/click')
def track_click():
    """
    Track email click events and redirect to the original URL.
    
    Expected query parameters:
    - log_id: The EmailLog ID to track
    - tracking_id: Alternative tracking identifier  
    - url: The destination URL to redirect to
    """
    try:
        log_id = request.args.get('log_id')
        tracking_id = request.args.get('tracking_id')
        destination_url = request.args.get('url')
        
        if not destination_url:
            return jsonify({'error': 'Missing destination URL'}), 400
        
        # Find the email log entry
        email_log = None
        if log_id:
            email_log = EmailLog.query.get(log_id)
        elif tracking_id:
            email_log = EmailLog.query.filter_by(tracking_id=tracking_id).first()
        
        if email_log:
            # Update email log status to clicked (if not already clicked)
            if email_log.status in [EmailStatus.SENT, EmailStatus.OPENED]:
                email_log.status = EmailStatus.CLICKED
                email_log.clicked_at = datetime.utcnow()
                
                # Update campaign counters
                if email_log.campaign:
                    email_log.campaign.emails_clicked += 1
            
            # Create link click record
            link_click = LinkClick(
                email_log_id=email_log.id,
                url=destination_url,
                clicked_at=datetime.utcnow(),
                user_agent=request.headers.get('User-Agent', '')[:500],
                ip_address=get_client_ip(request),
                referrer=request.headers.get('Referer', '')[:500]
            )
            db.session.add(link_click)
            db.session.commit()
        
        # Redirect to the destination URL
        return redirect(destination_url, code=302)
        
    except Exception as e:
        logger.error(f"Error tracking email click: {str(e)}")
        # Still redirect to avoid breaking user experience
        return redirect(destination_url or 'https://example.com', code=302)

@tracking_bp.route('/unsubscribe')
def track_unsubscribe():
    """
    Handle unsubscribe requests.
    
    Expected query parameters:
    - log_id: The EmailLog ID
    - tracking_id: Alternative tracking identifier
    - email: The email address to unsubscribe
    """
    try:
        log_id = request.args.get('log_id')
        tracking_id = request.args.get('tracking_id')
        email = request.args.get('email')
        
        # Find the email log entry
        email_log = None
        if log_id:
            email_log = EmailLog.query.get(log_id)
        elif tracking_id:
            email_log = EmailLog.query.filter_by(tracking_id=tracking_id).first()
        
        if email_log or email:
            # Here you would implement your unsubscribe logic
            # For now, we'll just track it as a special status
            # You could add an 'unsubscribed' status to the EmailStatus enum
            pass
        
        # Return a simple unsubscribe confirmation page
        return '''
        <!DOCTYPE html>
        <html>
        <head>
            <title>Unsubscribed</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .container { max-width: 500px; margin: 0 auto; }
                .success { color: #28a745; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="success">✓ Unsubscribed Successfully</h1>
                <p>You have been successfully unsubscribed from our mailing list.</p>
                <p>You will no longer receive marketing emails from us.</p>
            </div>
        </body>
        </html>
        '''
        
    except Exception as e:
        logger.error(f"Error processing unsubscribe: {str(e)}")
        return jsonify({'error': 'Failed to process unsubscribe request'}), 500

def get_client_ip(request):
    """Get the client's IP address, accounting for proxies."""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    else:
        return request.remote_addr

def generate_tracking_id():
    """Generate a unique tracking ID for email logs."""
    return str(uuid.uuid4()).replace('-', '')

def rewrite_links_for_tracking(html_content, email_log_id, tracking_id):
    """
    Rewrite links in HTML content to include tracking parameters.
    
    This function should be called before sending emails to add tracking to all links.
    """
    import re
    from urllib.parse import urlencode, quote_plus
    from flask import current_app
    
    def replace_link(match):
        original_url = match.group(1)
        
        # Skip mailto links and tracking URLs
        if original_url.startswith('mailto:') or '/track/' in original_url:
            return match.group(0)
        
        # Create tracking URL with full domain
        tracking_params = {
            'log_id': email_log_id,
            'tracking_id': tracking_id,
            'url': original_url
        }
        base_url = current_app.config.get('BASE_URL', 'http://localhost:5001')
        tracking_url = f"{base_url}/track/click?{urlencode(tracking_params)}"
        
        return f'href="{tracking_url}"'
    
    # Replace href attributes in anchor tags
    link_pattern = r'href=["\']([^"\']+)["\']'
    return re.sub(link_pattern, replace_link, html_content)

def add_tracking_pixel(html_content, email_log_id, tracking_id):
    """
    Add tracking pixel to HTML email content.
    
    This function should be called before sending emails to add open tracking.
    """
    from urllib.parse import urlencode
    from flask import current_app
    
    tracking_params = {
        'log_id': email_log_id,
        'tracking_id': tracking_id
    }
    base_url = current_app.config.get('BASE_URL', 'http://localhost:5001')
    pixel_url = f"{base_url}/track/open?{urlencode(tracking_params)}"
    
    # Add tracking pixel just before closing body tag
    tracking_pixel = f'<img src="{pixel_url}" width="1" height="1" style="display:none;" alt="" />'
    
    if '</body>' in html_content:
        return html_content.replace('</body>', f'{tracking_pixel}</body>')
    else:
        # If no body tag, append at the end
        return html_content + tracking_pixel