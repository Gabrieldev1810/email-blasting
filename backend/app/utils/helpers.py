import jwt
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from flask import current_app

def generate_unsubscribe_token(contact_id: int, email: str) -> str:
    """
    Generate a secure unsubscribe token for a contact.
    
    Args:
        contact_id: ID of the contact
        email: Email address of the contact
        
    Returns:
        Secure unsubscribe token
    """
    payload = {
        'contact_id': contact_id,
        'email': email,
        'type': 'unsubscribe',
        'exp': datetime.utcnow() + timedelta(days=365)  # Token valid for 1 year
    }
    
    secret_key = current_app.config.get('SECRET_KEY', 'default-secret')
    return jwt.encode(payload, secret_key, algorithm='HS256')

def verify_unsubscribe_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode an unsubscribe token.
    
    Args:
        token: Unsubscribe token to verify
        
    Returns:
        Decoded token data if valid, None otherwise
    """
    try:
        secret_key = current_app.config.get('SECRET_KEY', 'default-secret')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        
        if payload.get('type') != 'unsubscribe':
            return None
            
        return payload
        
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def generate_api_key() -> str:
    """Generate a secure API key."""
    return secrets.token_urlsafe(32)

def hash_api_key(api_key: str) -> str:
    """Hash an API key for secure storage."""
    return hashlib.sha256(api_key.encode()).hexdigest()

def generate_tracking_pixel_url(campaign_id: int, contact_id: int) -> str:
    """
    Generate a tracking pixel URL for email open tracking.
    
    Args:
        campaign_id: ID of the campaign
        contact_id: ID of the contact
        
    Returns:
        Tracking pixel URL
    """
    # Create a simple tracking token
    data = f"{campaign_id}:{contact_id}:{datetime.utcnow().timestamp()}"
    token = hashlib.md5(data.encode()).hexdigest()
    
    # In production, this would be your actual domain
    base_url = current_app.config.get('BASE_URL', 'http://localhost:5000')
    return f"{base_url}/api/track/open/{token}"

def generate_click_tracking_url(campaign_id: int, contact_id: int, original_url: str) -> str:
    """
    Generate a click tracking URL that redirects to the original URL.
    
    Args:
        campaign_id: ID of the campaign
        contact_id: ID of the contact
        original_url: Original URL to redirect to
        
    Returns:
        Click tracking URL
    """
    # Create tracking data
    tracking_data = {
        'campaign_id': campaign_id,
        'contact_id': contact_id,
        'url': original_url,
        'timestamp': datetime.utcnow().timestamp()
    }
    
    secret_key = current_app.config.get('SECRET_KEY', 'default-secret')
    token = jwt.encode(tracking_data, secret_key, algorithm='HS256')
    
    base_url = current_app.config.get('BASE_URL', 'http://localhost:5000')
    return f"{base_url}/api/track/click/{token}"

def sanitize_html_content(html_content: str) -> str:
    """
    Sanitize HTML content for email safety.
    Note: In production, use a proper HTML sanitization library like bleach
    
    Args:
        html_content: Raw HTML content
        
    Returns:
        Sanitized HTML content
    """
    if not html_content:
        return html_content
    
    # Basic sanitization - remove potentially dangerous tags
    import re
    
    # Remove script tags
    html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove on* event handlers
    html_content = re.sub(r'\son\w+\s*=\s*["\'][^"\']*["\']', '', html_content, flags=re.IGNORECASE)
    
    # Remove javascript: links
    html_content = re.sub(r'javascript\s*:', '', html_content, flags=re.IGNORECASE)
    
    return html_content

def format_email_content_for_tracking(html_content: str, campaign_id: int, contact_id: int) -> str:
    """
    Add tracking pixels and convert links to tracking URLs in email content.
    
    Args:
        html_content: Original HTML content
        campaign_id: ID of the campaign
        contact_id: ID of the contact
        
    Returns:
        HTML content with tracking elements
    """
    if not html_content:
        return html_content
    
    import re
    
    # Add tracking pixel just before closing body tag
    tracking_pixel_url = generate_tracking_pixel_url(campaign_id, contact_id)
    tracking_pixel = f'<img src="{tracking_pixel_url}" width="1" height="1" style="display:none;" />'
    
    # Insert tracking pixel before </body> if it exists, otherwise append
    if '</body>' in html_content.lower():
        html_content = re.sub(r'</body>', f'{tracking_pixel}</body>', html_content, flags=re.IGNORECASE)
    else:
        html_content += tracking_pixel
    
    # Convert links to tracking URLs
    def replace_link(match):
        full_tag = match.group(0)
        url = match.group(1)
        
        # Skip if it's already a tracking URL or email link
        if 'track/click' in url or url.startswith('mailto:'):
            return full_tag
        
        # Generate tracking URL
        tracking_url = generate_click_tracking_url(campaign_id, contact_id, url)
        return full_tag.replace(url, tracking_url)
    
    # Find and replace href attributes
    html_content = re.sub(r'<a[^>]+href\s*=\s*["\']([^"\']+)["\'][^>]*>', replace_link, html_content, flags=re.IGNORECASE)
    
    return html_content

def parse_csv_file(file_content: str, delimiter: str = ',') -> list:
    """
    Parse CSV file content into a list of dictionaries.
    
    Args:
        file_content: Raw CSV file content
        delimiter: CSV delimiter (default: comma)
        
    Returns:
        List of dictionaries representing CSV rows
    """
    import csv
    from io import StringIO
    
    try:
        # Parse CSV content
        csv_reader = csv.DictReader(StringIO(file_content), delimiter=delimiter)
        
        # Convert to list and normalize keys
        data = []
        for row in csv_reader:
            # Normalize keys (lowercase, strip spaces, replace spaces with underscores)
            normalized_row = {}
            for key, value in row.items():
                if key:  # Skip empty keys
                    normalized_key = key.lower().strip().replace(' ', '_')
                    normalized_row[normalized_key] = value.strip() if value else ''
            
            if normalized_row:  # Skip empty rows
                data.append(normalized_row)
        
        return data
        
    except Exception as e:
        raise ValueError(f"Error parsing CSV file: {str(e)}")

def get_pagination_params(page: int = 1, per_page: int = 20, max_per_page: int = 100) -> Dict[str, int]:
    """
    Get and validate pagination parameters.
    
    Args:
        page: Page number (1-based)
        per_page: Items per page
        max_per_page: Maximum allowed items per page
        
    Returns:
        Dictionary with validated pagination parameters
    """
    # Validate page number
    if page < 1:
        page = 1
    
    # Validate per_page
    if per_page < 1:
        per_page = 20
    elif per_page > max_per_page:
        per_page = max_per_page
    
    # Calculate offset
    offset = (page - 1) * per_page
    
    return {
        'page': page,
        'per_page': per_page,
        'offset': offset,
        'limit': per_page
    }