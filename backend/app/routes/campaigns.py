import logging

logger = logging.getLogger(__name__)
from flask import Blueprint, request, jsonify, g
from app import db
from app.models.campaign import Campaign, CampaignStatus, CampaignRecipient
from app.models.contact import Contact, ContactStatus
from app.models.smtp_settings import SMTPSettings
from app.models.email_log import EmailLog, EmailStatus
from app.models.notification import NotificationType
from app.middleware.auth import authenticated_required, can_create_campaigns
from app.services.email_tracking_service import EmailTrackingService
from app.routes.notifications import create_notification
from datetime import datetime
from sqlalchemy import func
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl

bp = Blueprint('campaigns', __name__)

@bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint for campaigns routes."""
    return {'status': 'ok', 'service': 'campaigns'}

@bp.route('', methods=['GET'])
@authenticated_required
def get_campaigns():
    """Get campaigns for the current user (managers see their own, admins see all)."""
    try:
        # Get current user from middleware
        from flask import g
        current_user = g.current_user
        
        if current_user.is_admin():
            # Admin sees all campaigns
            campaigns = Campaign.query.order_by(Campaign.created_at.desc()).all()
        else:
            # Managers and others see only their campaigns
            campaigns = Campaign.query.filter_by(user_id=current_user.id).order_by(Campaign.created_at.desc()).all()
        
        campaigns_data = []
        for campaign in campaigns:
            # Get EmailLog-based engagement metrics
            campaign_logs = EmailLog.query.filter_by(campaign_id=campaign.id)
            
            total_sent_logs = campaign_logs.count()
            total_opened_logs = campaign_logs.filter(EmailLog.status.in_([EmailStatus.OPENED, EmailStatus.CLICKED])).count()
            total_clicked_logs = campaign_logs.filter(EmailLog.status == EmailStatus.CLICKED).count()
            total_bounced_logs = campaign_logs.filter(EmailLog.status == EmailStatus.BOUNCED).count()
            
            # Calculate engagement rates
            open_rate = round((total_opened_logs / total_sent_logs) * 100, 2) if total_sent_logs > 0 else 0
            click_rate = round((total_clicked_logs / total_sent_logs) * 100, 2) if total_sent_logs > 0 else 0
            bounce_rate = round((total_bounced_logs / total_sent_logs) * 100, 2) if total_sent_logs > 0 else 0
            
            campaigns_data.append({
                'id': campaign.id,
                'name': campaign.name,
                'subject': campaign.subject,
                'status': campaign.status.value,
                'total_recipients': campaign.total_recipients or 0,
                'emails_sent': total_sent_logs or campaign.emails_sent or 0,
                'emails_opened': total_opened_logs or campaign.emails_opened or 0,
                'emails_clicked': total_clicked_logs or campaign.emails_clicked or 0,
                'emails_bounced': total_bounced_logs or 0,
                'open_rate': open_rate,
                'click_rate': click_rate,
                'bounce_rate': bounce_rate,
                'created_at': campaign.created_at.isoformat() if campaign.created_at else None,
                'scheduled_at': campaign.scheduled_at.isoformat() if campaign.scheduled_at else None
            })
        
        return jsonify({
            'success': True,
            'campaigns': campaigns_data,
            'total': len(campaigns_data)
        })
        
    except Exception as e:
        logger.error(f"Error fetching campaigns: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('', methods=['POST'])
@authenticated_required
@can_create_campaigns
def create_campaign():
    """Create a new campaign."""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'subject', 'sender_email', 'email_content', 'smtp_account_id']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Get current user from middleware
        from flask import g
        current_user = g.current_user
        
        # Validate user has access to the selected SMTP account
        from app.models.smtp_account import UserSMTPAssignment, SMTPAccount
        smtp_account_id = data['smtp_account_id']
        
        assignment = UserSMTPAssignment.query.filter_by(
            user_id=current_user.id,
            smtp_account_id=smtp_account_id
        ).first()
        
        if not assignment:
            return jsonify({
                'success': False,
                'error': 'You do not have access to the selected SMTP account'
            }), 403
        
        # Verify SMTP account is active and verified
        smtp_account = SMTPAccount.query.get(smtp_account_id)
        if not smtp_account or not smtp_account.is_active:
            return jsonify({
                'success': False,
                'error': 'Selected SMTP account is not active'
            }), 400
        
        if not smtp_account.is_verified:
            return jsonify({
                'success': False,
                'error': 'Selected SMTP account is not verified. Please contact your administrator.'
            }), 400
        
        # Handle scheduling
        scheduled_at = None
        send_immediately = data.get('send_immediately', True)
        
        if 'scheduled_at' in data and data['scheduled_at']:
            # Parse the ISO datetime string
            try:
                scheduled_at = datetime.fromisoformat(data['scheduled_at'].replace('Z', '+00:00'))
                send_immediately = False
            except (ValueError, TypeError) as e:
                return jsonify({'success': False, 'error': f'Invalid scheduled_at format: {str(e)}'}), 400
        
        # Determine campaign status
        status = CampaignStatus.SCHEDULED if scheduled_at else CampaignStatus.DRAFT
        
        # Create new campaign
        campaign = Campaign(
            user_id=current_user.id,
            smtp_account_id=smtp_account_id,
            name=data['name'],
            subject=data['subject'],
            sender_name=data.get('sender_name', ''),
            sender_email=data['sender_email'],
            reply_to=data.get('reply_to', data['sender_email']),
            html_content=data['email_content'],
            text_content=data.get('text_content', ''),
            send_immediately=send_immediately,
            scheduled_at=scheduled_at,
            status=status
        )
        
        # Add campaign to session first
        db.session.add(campaign)
        db.session.flush()  # Get campaign ID
        
        # If recipients are specified, create CampaignRecipient records
        if 'recipients' in data and data['recipients']:
            recipients = data['recipients'].split(',')
            valid_recipients = [r.strip() for r in recipients if r.strip()]
            campaign.total_recipients = len(valid_recipients)
            
            # Create or find contacts and add them as campaign recipients
            from app.models.contact import Contact, ContactStatus
            from app.models.campaign import CampaignRecipient
            
            for email in valid_recipients:
                # Try to find existing contact first
                contact = Contact.query.filter_by(email=email, user_id=current_user.id).first()
                
                # If contact doesn't exist, create a new one
                if not contact:
                    # Extract name from email if possible
                    name_part = email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
                    
                    contact = Contact(
                        user_id=current_user.id,
                        email=email,
                        first_name=name_part,
                        status=ContactStatus.ACTIVE,
                        subscribed=True
                    )
                    db.session.add(contact)
                    db.session.flush()  # Get contact ID
                
                # Create campaign recipient record
                campaign_recipient = CampaignRecipient(
                    campaign_id=campaign.id,
                    contact_id=contact.id
                )
                db.session.add(campaign_recipient)
        
        db.session.commit()
        
        # Create notification based on campaign status
        if campaign.status == CampaignStatus.SCHEDULED:
            create_notification(
                user_id=current_user.id,
                notification_type=NotificationType.CAMPAIGN_SCHEDULED,
                title="Campaign Scheduled",
                message=f"Your campaign '{campaign.name}' has been scheduled for {campaign.scheduled_at.strftime('%Y-%m-%d %H:%M')}",
                campaign_id=campaign.id,
                status="scheduled"
            )
        elif campaign.status == CampaignStatus.DRAFT:
            create_notification(
                user_id=current_user.id,
                notification_type=NotificationType.CAMPAIGN_DRAFT,
                title="Campaign Saved as Draft",
                message=f"Your campaign '{campaign.name}' has been saved as a draft",
                campaign_id=campaign.id,
                status="draft"
            )
        else:
            create_notification(
                user_id=current_user.id,
                notification_type=NotificationType.CAMPAIGN_CREATED,
                title="Campaign Created",
                message=f"Your campaign '{campaign.name}' has been created successfully",
                campaign_id=campaign.id,
                status="created"
            )
        
        return jsonify({
            'success': True,
            'message': 'Campaign created successfully',
            'campaign_id': campaign.id
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating campaign: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<int:campaign_id>/send', methods=['POST'])
@authenticated_required
def send_campaign(campaign_id):
    """Send a campaign to recipients with full email tracking."""
    try:
        data = request.get_json()
        campaign = Campaign.query.get_or_404(campaign_id)
        
        # Check if user can send this campaign (owner or admin)
        from flask import g
        current_user = g.current_user
        if not current_user.is_admin() and campaign.user_id != current_user.id:
            return jsonify({'success': False, 'error': 'You do not have permission to send this campaign'}), 403
        
        if campaign.status == CampaignStatus.SENT:
            return jsonify({'success': False, 'error': 'Campaign already sent'}), 400
        
        # Check if campaign is scheduled for future sending
        if campaign.status == CampaignStatus.SCHEDULED and campaign.scheduled_at:
            now = datetime.utcnow()
            if campaign.scheduled_at > now:
                # Allow override with force parameter for admin users
                force_send = data.get('force_send', False)
                if not (current_user.is_admin() and force_send):
                    return jsonify({
                        'success': False, 
                        'error': f'Campaign is scheduled for {campaign.scheduled_at.strftime("%Y-%m-%d %H:%M:%S")} UTC. Cannot send before scheduled time.'
                    }), 400
        
        # Update campaign status to sending
        campaign.status = CampaignStatus.SENDING
        db.session.commit()
        
        # Notify user that campaign is sending
        create_notification(
            user_id=campaign.user_id,
            notification_type=NotificationType.CAMPAIGN_SENDING,
            title="Campaign Sending",
            message=f"Your campaign '{campaign.name}' is now being sent to {campaign.total_recipients} recipients",
            campaign_id=campaign.id,
            status="sending"
        )
        
        # Use EmailTrackingService for sending with full tracking capabilities
        success, message, results = EmailTrackingService.send_campaign_with_tracking(
            campaign_id=campaign_id,
            user_id=campaign.user_id
        )
        
        # Update final status based on results
        if success:
            successful_sends = results.get('successful_sends', 0)
            if successful_sends == 0:
                campaign.status = CampaignStatus.FAILED
                # Notify failure
                create_notification(
                    user_id=campaign.user_id,
                    notification_type=NotificationType.CAMPAIGN_FAILED,
                    title="Campaign Failed",
                    message=f"Campaign '{campaign.name}' failed to send. No emails were delivered successfully.",
                    campaign_id=campaign.id,
                    status="failed"
                )
            else:
                campaign.status = CampaignStatus.SENT
                # Notify success
                create_notification(
                    user_id=campaign.user_id,
                    notification_type=NotificationType.CAMPAIGN_SUCCESS,
                    title="Campaign Sent Successfully",
                    message=f"Campaign '{campaign.name}' was sent successfully to {successful_sends} out of {results.get('total_recipients', 0)} recipients",
                    campaign_id=campaign.id,
                    status="success"
                )
            
            # Set timestamps
            from datetime import datetime
            campaign.sent_at = datetime.utcnow()
            campaign.completed_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': message,
                'sent_count': results.get('successful_sends', 0),
                'failed_count': results.get('failed_sends', 0),
                'total_recipients': results.get('total_recipients', 0)
            })
        else:
            campaign.status = CampaignStatus.FAILED
            db.session.commit()
            # Notify failure
            create_notification(
                user_id=campaign.user_id,
                notification_type=NotificationType.CAMPAIGN_FAILED,
                title="Campaign Failed",
                message=f"Campaign '{campaign.name}' failed: {message}",
                campaign_id=campaign.id,
                status="failed"
            )
            return jsonify({'success': False, 'error': message}), 500
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error sending campaign: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<int:campaign_id>', methods=['GET'])
@authenticated_required
def get_campaign(campaign_id):
    """Get a specific campaign."""
    try:
        campaign = Campaign.query.get_or_404(campaign_id)
        
        return jsonify({
            'success': True,
            'campaign': {
                'id': campaign.id,
                'name': campaign.name,
                'subject': campaign.subject,
                'sender_name': campaign.sender_name,
                'sender_email': campaign.sender_email,
                'reply_to': campaign.reply_to,
                'html_content': campaign.html_content,
                'text_content': campaign.text_content,
                'status': campaign.status.value,
                'total_recipients': campaign.total_recipients,
                'emails_sent': campaign.emails_sent,
                'emails_delivered': campaign.emails_delivered,
                'emails_opened': campaign.emails_opened,
                'emails_clicked': campaign.emails_clicked,
                'emails_bounced': campaign.emails_bounced,
                'emails_failed': campaign.emails_failed,
                'created_at': campaign.created_at.isoformat() if campaign.created_at else None,
                'scheduled_at': campaign.scheduled_at.isoformat() if campaign.scheduled_at else None
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching campaign: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/test-email', methods=['POST'])
@authenticated_required
def send_test_email():
    """Send a test email."""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['subject', 'sender_email', 'test_email', 'email_content']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Get current user's SMTP settings
        from flask import g
        current_user = g.current_user
        smtp_settings = current_user.get_smtp_settings()
        
        if not smtp_settings:
            return jsonify({'success': False, 'error': 'No SMTP configuration found for your account'}), 400
        
        # Create SMTP connection
        try:
            if smtp_settings.encryption == 'tls':
                server = smtplib.SMTP(smtp_settings.host, smtp_settings.port)
                server.starttls(context=ssl.create_default_context())
            else:
                server = smtplib.SMTP_SSL(smtp_settings.host, smtp_settings.port, context=ssl.create_default_context())
            
            # Attempt SMTP login with better error handling
            try:
                server.login(smtp_settings.username, smtp_settings.password)
            except smtplib.SMTPAuthenticationError as e:
                server.quit()
                error_msg = "SMTP Authentication failed. "
                if "BadCredentials" in str(e):
                    error_msg += "For Gmail users: Please use an App Password instead of your regular Gmail password. Go to Google Account Settings > Security > 2-Step Verification > App Passwords to generate one."
                else:
                    error_msg += f"Error: {str(e)}"
                return jsonify({'success': False, 'error': error_msg}), 500
            
            # Create test email
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[TEST] {data['subject']}"
            msg['From'] = f"{data.get('sender_name', '')} <{data['sender_email']}>" if data.get('sender_name') else data['sender_email']
            msg['To'] = data['test_email']
            
            # Add HTML content
            html_part = MIMEText(data['email_content'], 'html')
            msg.attach(html_part)
            
            # Send email
            server.send_message(msg)
            server.quit()
            
            return jsonify({
                'success': True,
                'message': f'Test email sent successfully to {data["test_email"]}'
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': f'Failed to send test email: {str(e)}'}), 500
        
    except Exception as e:
        logger.error(f"Error sending test email: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<int:campaign_id>', methods=['DELETE'])
@authenticated_required
def delete_campaign(campaign_id):
    """Delete a specific campaign."""
    try:
        from flask import request
        campaign = Campaign.query.get_or_404(campaign_id)
        
        # Check if user can delete this campaign (owner or admin)
        from flask import g
        current_user = g.current_user
        if not current_user.is_admin() and campaign.user_id != current_user.id:
            return jsonify({'success': False, 'error': 'You do not have permission to delete this campaign'}), 403
        
        # Check if campaign can be deleted (only allow deletion of drafts and failed campaigns)
        if campaign.status == CampaignStatus.SENDING:
            return jsonify({'success': False, 'error': 'Cannot delete campaign that is currently sending'}), 400
        
        # Check for associated EmailLog records
        email_log_count = EmailLog.query.filter_by(campaign_id=campaign_id).count()
        force_delete = request.args.get('force', 'false').lower() == 'true'
        
        if email_log_count > 0 and not force_delete:
            return jsonify({
                'success': False, 
                'error': f'Campaign has {email_log_count} associated email tracking records. Delete will remove all tracking data.',
                'email_log_count': email_log_count,
                'requires_confirmation': True
            }), 400
        
        # Store campaign name for response
        campaign_name = campaign.name
        
        # If force delete, remove EmailLog records first
        if email_log_count > 0 and force_delete:
            # Delete associated LinkClick records first (they reference EmailLog)
            from sqlalchemy import text
            db.session.execute(text("""
                DELETE FROM link_clicks 
                WHERE email_log_id IN (
                    SELECT id FROM email_logs WHERE campaign_id = :campaign_id
                )
            """), {'campaign_id': campaign_id})
            
            # Delete EmailLog records
            db.session.execute(text("""
                DELETE FROM email_logs WHERE campaign_id = :campaign_id
            """), {'campaign_id': campaign_id})
        
        # Delete campaign recipients
        CampaignRecipient.query.filter_by(campaign_id=campaign_id).delete()
        
        # Delete the campaign
        db.session.delete(campaign)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Campaign "{campaign_name}" deleted successfully' + (f' along with {email_log_count} tracking records' if email_log_count > 0 else '')
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting campaign: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<int:campaign_id>', methods=['PUT'])
@authenticated_required
def update_campaign(campaign_id):
    """Update a specific campaign."""
    try:
        data = request.get_json()
        campaign = Campaign.query.get_or_404(campaign_id)
        
        # Check if user can edit this campaign (owner or admin)
        from flask import g
        current_user = g.current_user
        if not current_user.is_admin() and campaign.user_id != current_user.id:
            return jsonify({'success': False, 'error': 'You do not have permission to edit this campaign'}), 403
        
        # Check if campaign can be edited (allow editing of drafts, failed, and scheduled campaigns)
        if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.FAILED, CampaignStatus.SCHEDULED]:
            return jsonify({'success': False, 'error': 'Cannot edit campaign that has been sent or is currently sending'}), 400
        
        # Update campaign fields
        if 'name' in data:
            campaign.name = data['name']
        if 'subject' in data:
            campaign.subject = data['subject']
        if 'sender_name' in data:
            campaign.sender_name = data['sender_name']
        if 'sender_email' in data:
            campaign.sender_email = data['sender_email']
        if 'reply_to' in data:
            campaign.reply_to = data['reply_to']
        if 'html_content' in data:
            campaign.html_content = data['html_content']
        if 'text_content' in data:
            campaign.text_content = data['text_content']
        
        # Handle scheduled_at update for scheduled campaigns
        if 'scheduled_at' in data:
            if data['scheduled_at']:
                from datetime import datetime
                # Parse the ISO format datetime string
                campaign.scheduled_at = datetime.fromisoformat(data['scheduled_at'].replace('Z', '+00:00'))
            else:
                campaign.scheduled_at = None
        
        # Handle recipients update
        if 'recipients' in data:
            # Clear existing recipients
            from app.models.campaign import CampaignRecipient
            CampaignRecipient.query.filter_by(campaign_id=campaign.id).delete()
            
            # Add new recipients if provided
            if data['recipients']:
                recipients = data['recipients'].split(',')
                valid_recipients = [r.strip() for r in recipients if r.strip()]
                campaign.total_recipients = len(valid_recipients)
                
                # Create or find contacts and add them as campaign recipients
                from app.models.contact import Contact, ContactStatus
                
                for email in valid_recipients:
                    # Try to find existing contact first
                    contact = Contact.query.filter_by(email=email, user_id=current_user.id).first()
                    
                    # If contact doesn't exist, create a new one
                    if not contact:
                        # Extract name from email if possible
                        name_part = email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
                        
                        contact = Contact(
                            user_id=current_user.id,
                            email=email,
                            first_name=name_part,
                            status=ContactStatus.ACTIVE,
                            subscribed=True
                        )
                        db.session.add(contact)
                        db.session.flush()  # Get contact ID
                    
                    # Create campaign recipient record
                    campaign_recipient = CampaignRecipient(
                        campaign_id=campaign.id,
                        contact_id=contact.id
                    )
                    db.session.add(campaign_recipient)
            else:
                campaign.total_recipients = 0
        
        campaign.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Campaign updated successfully',
            'campaign': {
                'id': campaign.id,
                'name': campaign.name,
                'subject': campaign.subject,
                'sender_name': campaign.sender_name,
                'sender_email': campaign.sender_email,
                'reply_to': campaign.reply_to,
                'html_content': campaign.html_content,
                'text_content': campaign.text_content,
                'status': campaign.status.value,
                'updated_at': campaign.updated_at.isoformat() if campaign.updated_at else None
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating campaign: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<int:campaign_id>/contacts', methods=['GET'])
@authenticated_required
def get_campaign_contacts(campaign_id):
    """Get all contacts/recipients for a specific campaign."""
    try:
        current_user = g.current_user
        logger.debug(f"Fetching contacts for campaign {campaign_id}, user {current_user.id} ({current_user.email})")
        
        # Check campaign access - admin can access all campaigns, others only their own
        if current_user.is_admin():
            campaign = Campaign.query.get(campaign_id)
        else:
            campaign = Campaign.query.filter_by(id=campaign_id, user_id=current_user.id).first()
            
        if not campaign:
            logger.info(f"Campaign {campaign_id} not found for user {current_user.id}")
            return jsonify({'success': False, 'error': 'Campaign not found or access denied'}), 404
        
        # Get contacts - admin sees all, others see only their own
        if current_user.is_admin():
            # Admin sees all active contacts from all users
            contacts = Contact.query.filter_by(status=ContactStatus.ACTIVE).all()
            logger.debug(f"Admin access: Found {len(contacts)} active contacts across all users")
        else:
            # Others see only their contacts
            contacts = Contact.query.filter_by(user_id=current_user.id, status=ContactStatus.ACTIVE).all()
            logger.info(f"Found {len(contacts)} active contacts for user {current_user.id}")
        
        contacts_data = []
        for contact in contacts:
            contacts_data.append({
                'id': contact.id,
                'email': contact.email,
                'first_name': contact.first_name,
                'last_name': contact.last_name,
                'full_name': f"{contact.first_name} {contact.last_name}".strip() if contact.first_name or contact.last_name else None,
                'company': contact.company,
                'status': contact.status.value,
                'created_at': contact.created_at.isoformat() if contact.created_at else None
            })
        
        return jsonify({
            'success': True,
            'campaign': {
                'id': campaign.id,
                'name': campaign.name,
                'total_recipients': campaign.total_recipients
            },
            'contacts': contacts_data,
            'total_contacts': len(contacts_data)
        })
        
    except Exception as e:
        logger.error(f"Error fetching campaign contacts: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/export', methods=['GET'])
@authenticated_required
def export_campaigns():
    """Export campaigns data with filtering options."""
    try:
        from flask import send_file
        import io
        import csv
        import pandas as pd
        from datetime import datetime
        
        # Get current user from middleware
        current_user = g.current_user
        
        # Get filter parameters
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        campaign_name = request.args.get('campaign_name', '').strip()
        status_filter = request.args.get('status', 'all')
        export_format = request.args.get('format', 'csv').lower()
        
        # Start with base query
        if current_user.is_admin():
            # Admin sees all campaigns
            query = Campaign.query
        else:
            # Managers and others see only their campaigns
            query = Campaign.query.filter_by(user_id=current_user.id)
        
        # Apply filters
        if date_from:
            try:
                from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(Campaign.created_at >= from_date)
            except ValueError:
                pass
        
        if date_to:
            try:
                to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                query = query.filter(Campaign.created_at <= to_date)
            except ValueError:
                pass
        
        if campaign_name:
            query = query.filter(Campaign.name.ilike(f'%{campaign_name}%'))
        
        if status_filter and status_filter != 'all':
            try:
                status_enum = CampaignStatus(status_filter.lower())
                query = query.filter(Campaign.status == status_enum)
            except ValueError:
                pass
        
        # Order by creation date (newest first)
        campaigns = query.order_by(Campaign.created_at.desc()).all()
        
        # Prepare data for export - include recipients under each campaign
        export_data = []
        for campaign in campaigns:
            # Get campaign recipients with contact details
            recipients = db.session.query(CampaignRecipient, Contact)\
                .join(Contact, CampaignRecipient.contact_id == Contact.id)\
                .filter(CampaignRecipient.campaign_id == campaign.id)\
                .all()
            
            # Prepare recipient lists
            recipient_emails = []
            recipient_names = []
            recipient_companies = []
            recipient_statuses = []
            sent_emails = []
            delivered_emails = []
            opened_emails = []
            clicked_emails = []
            bounced_emails = []
            failed_emails = []
            
            for recipient, contact in recipients:
                recipient_emails.append(contact.email)
                full_name = f"{contact.first_name} {contact.last_name}".strip() if contact.first_name or contact.last_name else contact.email
                recipient_names.append(full_name)
                recipient_companies.append(contact.company or '')
                recipient_statuses.append(contact.status.value)
                sent_emails.append(contact.email if recipient.email_sent else '')
                delivered_emails.append(contact.email if recipient.email_delivered else '')
                opened_emails.append(contact.email if recipient.email_opened else '')
                clicked_emails.append(contact.email if recipient.email_clicked else '')
                bounced_emails.append(contact.email if recipient.email_bounced else '')
                failed_emails.append(contact.email if recipient.email_failed else '')
            
            # Create single row per campaign with all recipient data
            export_data.append({
                'Campaign ID': campaign.id,
                'Campaign Name': campaign.name,
                'Subject': campaign.subject,
                'Status': campaign.status.value.title(),
                'Sender Name': campaign.sender_name or '',
                'Sender Email': campaign.sender_email or '',
                'Total Recipients': campaign.total_recipients or 0,
                'Emails Sent': campaign.emails_sent or 0,
                'Emails Delivered': campaign.emails_delivered or 0,
                'Emails Opened': campaign.emails_opened or 0,
                'Emails Clicked': campaign.emails_clicked or 0,
                'Emails Bounced': campaign.emails_bounced or 0,
                'Emails Failed': campaign.emails_failed or 0,
                'Open Rate %': round(((campaign.emails_opened or 0) / (campaign.emails_sent or 1)) * 100, 2) if campaign.emails_sent else 0,
                'Click Rate %': round(((campaign.emails_clicked or 0) / (campaign.emails_sent or 1)) * 100, 2) if campaign.emails_sent else 0,
                'Bounce Rate %': round(((campaign.emails_bounced or 0) / (campaign.emails_sent or 1)) * 100, 2) if campaign.emails_sent else 0,
                'Created At': campaign.created_at.strftime('%Y-%m-%d %H:%M:%S') if campaign.created_at else '',
                'Scheduled At': campaign.scheduled_at.strftime('%Y-%m-%d %H:%M:%S') if campaign.scheduled_at else '',
                'Updated At': campaign.updated_at.strftime('%Y-%m-%d %H:%M:%S') if campaign.updated_at else '',
                # Recipients information as comma-separated lists
                'Recipient Emails': '; '.join(recipient_emails),
                'Recipient Names': '; '.join(recipient_names),
                'Recipient Companies': '; '.join(recipient_companies),
                'Recipient Statuses': '; '.join(recipient_statuses),
                'Recipients Count': len(recipient_emails),
                # Email delivery status for each recipient
                'Sent To': '; '.join(filter(None, sent_emails)),
                'Delivered To': '; '.join(filter(None, delivered_emails)),
                'Opened By': '; '.join(filter(None, opened_emails)),
                'Clicked By': '; '.join(filter(None, clicked_emails)),
                'Bounced From': '; '.join(filter(None, bounced_emails)),
                'Failed To': '; '.join(filter(None, failed_emails)),
            })
        
        if not export_data:
            return jsonify({'success': False, 'error': 'No campaigns found matching the criteria'}), 404
        
        # Generate timestamp for filename
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        
        if export_format == 'excel':
            # Create Excel file with multiple sheets
            output = io.BytesIO()
            
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                # Main campaigns report with recipients data
                df = pd.DataFrame(export_data)
                df.to_excel(writer, sheet_name='Campaigns with Recipients', index=False)
                
                # Auto-adjust column widths
                worksheet = writer.sheets['Campaigns with Recipients']
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
            
            output.seek(0)
            filename = f'campaigns_report_{timestamp}.xlsx'
            
            return send_file(
                io.BytesIO(output.read()),
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=filename
            )
        
        else:
            # Create CSV file
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=export_data[0].keys())
            writer.writeheader()
            writer.writerows(export_data)
            
            # Convert to bytes
            csv_output = io.BytesIO()
            csv_output.write(output.getvalue().encode('utf-8'))
            csv_output.seek(0)
            
            filename = f'campaigns_report_{timestamp}.csv'
            
            return send_file(
                csv_output,
                mimetype='text/csv',
                as_attachment=True,
                download_name=filename
            )
        
    except Exception as e:
        import traceback
        logger.info(f"Export error: {str(e)}")
        logger.info(f"Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'Export failed: {str(e)}'}), 500