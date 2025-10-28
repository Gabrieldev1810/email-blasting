"""
Enhanced Email Service with EmailLog tracking and bounce handling.
"""

from datetime import datetime
from typing import List, Dict, Optional, Tuple
import logging
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app import db
from app.models.campaign import Campaign
from app.models.email_log import EmailLog, EmailStatus, BounceType
from app.models.smtp_config import SMTPConfig
from app.routes.tracking import rewrite_links_for_tracking, add_tracking_pixel

logger = logging.getLogger(__name__)

class EmailTrackingService:
    """Service for sending emails with engagement tracking."""
    
    @staticmethod
    def send_campaign_with_tracking(campaign_id: int, user_id: int) -> Tuple[bool, str, Dict]:
        """
        Send campaign emails with tracking enabled.
        
        Args:
            campaign_id: Campaign ID to send
            user_id: User ID who owns the campaign
            
        Returns:
            Tuple of (success, message, results_dict)
        """
        try:
            # Get campaign
            campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first()
            if not campaign:
                return False, "Campaign not found", {}
            
            # Get SMTP config - try user-specific first, fall back to global settings
            smtp_config = SMTPConfig.query.filter_by(
                user_id=user_id, 
                is_active=True, 
                is_default=True
            ).first()
            
            # If no user-specific config, try global settings
            if not smtp_config:
                from app.models.smtp_settings import SMTPSettings
                smtp_settings = SMTPSettings.query.filter_by(is_configured=True).first()
                
                if not smtp_settings:
                    return False, "No SMTP configuration found. Please configure SMTP settings first.", {}
                    
                # Convert SMTPSettings to SMTPConfig-like object for compatibility
                class FakeSMTPConfig:
                    def __init__(self):
                        self.id = smtp_settings.id
                        self.user_id = smtp_settings.user_id or user_id
                        self.host = smtp_settings.host
                        self.port = smtp_settings.port
                        self.username = smtp_settings.username
                        self.password = smtp_settings.password
                        self.encryption = smtp_settings.encryption
                        self.sender_name = smtp_settings.sender_name or smtp_settings.sender_email
                        self.sender_email = smtp_settings.sender_email or smtp_settings.username
                        self.from_name = smtp_settings.sender_name or smtp_settings.sender_email
                        self.from_email = smtp_settings.sender_email or smtp_settings.username
                        self.use_tls = smtp_settings.encryption == 'tls'
                    
                    def get_decrypted_password(self):
                        return smtp_settings.password
                
                smtp_config = FakeSMTPConfig()
            
            # Get recipients (you can integrate with existing Contact model)
            recipients = EmailTrackingService._get_campaign_recipients(campaign, user_id)
            if not recipients:
                return False, "No valid recipients found", {}
            
            # Update campaign status to sending
            from app.models.campaign import CampaignStatus
            campaign.status = CampaignStatus.SENDING
            db.session.commit()
            
            # Send emails with tracking
            results = EmailTrackingService._send_tracked_emails(
                campaign, recipients, smtp_config
            )
            
            # Update campaign counters and final status
            successful_sends = sum(1 for r in results if r['success'])
            campaign.emails_sent = successful_sends
            campaign.total_recipients = len(recipients)
            
            # Set final status based on results
            if successful_sends == 0:
                campaign.status = CampaignStatus.FAILED
            else:
                campaign.status = CampaignStatus.SENT
            
            # Set completion timestamp
            campaign.sent_at = datetime.utcnow()
            campaign.completed_at = datetime.utcnow()
            
            db.session.commit()
            
            return True, f"Campaign sent: {successful_sends}/{len(recipients)} emails", {
                'total_recipients': len(recipients),
                'successful_sends': successful_sends,
                'failed_sends': len(recipients) - successful_sends
            }
            
        except Exception as e:
            logger.error(f"Error sending tracked campaign {campaign_id}: {e}")
            return False, f"Failed to send campaign: {str(e)}", {}
    
    @staticmethod
    def _get_campaign_recipients(campaign: Campaign, user_id: int) -> List[Dict]:
        """Get recipients for campaign."""
        from app.models.contact import Contact, ContactStatus
        from app.models.campaign import CampaignRecipient
        
        # First, try to get campaign-specific recipients
        campaign_recipients = db.session.query(CampaignRecipient, Contact)\
            .join(Contact, CampaignRecipient.contact_id == Contact.id)\
            .filter(
                CampaignRecipient.campaign_id == campaign.id,
                Contact.status == ContactStatus.ACTIVE,
                Contact.subscribed == True
            ).all()
        
        recipients = []
        
        if campaign_recipients:
            # Use campaign-specific recipients
            for campaign_recipient, contact in campaign_recipients:
                if contact.is_sendable():  # Additional check for sendable status
                    recipients.append({
                        'email': contact.email,
                        'name': f"{contact.first_name or ''} {contact.last_name or ''}".strip() or contact.email,
                        'contact_id': contact.id
                    })
        else:
            # Fallback to all active, subscribed contacts for the user (legacy behavior)
            contacts = Contact.query.filter_by(
                user_id=user_id,
                status=ContactStatus.ACTIVE,
                subscribed=True
            ).all()
            
            for contact in contacts:
                if contact.is_sendable():  # Additional check for sendable status
                    recipients.append({
                        'email': contact.email,
                        'name': f"{contact.first_name or ''} {contact.last_name or ''}".strip() or contact.email,
                        'contact_id': contact.id
                    })
        
        return recipients
    
    @staticmethod
    def _send_tracked_emails(
        campaign: Campaign, 
        recipients: List[Dict], 
        smtp_config: SMTPConfig
    ) -> List[Dict]:
        """Send emails with tracking pixels and link rewriting."""
        logger.info(f"Starting to send {len(recipients)} emails for campaign {campaign.id}")
        results = []
        
        for recipient in recipients:
            logger.debug(f"Processing recipient: {recipient['email']}")
            try:
                # Create EmailLog entry
                tracking_id = str(uuid.uuid4()).replace('-', '')
                
                email_log = EmailLog(
                    campaign_id=campaign.id,
                    smtp_account_id=smtp_config.id,
                    recipient_email=recipient['email'],
                    recipient_name=recipient['name'],
                    status=EmailStatus.SENT,
                    tracking_id=tracking_id,
                    subject=campaign.subject,
                    sent_at=datetime.utcnow()
                )
                db.session.add(email_log)
                db.session.flush()  # Get the ID
                
                # Prepare HTML content with tracking
                html_content = campaign.html_content or ""
                
                # Add tracking pixel
                html_content = add_tracking_pixel(
                    html_content, email_log.id, tracking_id
                )
                
                # Rewrite links for click tracking
                html_content = rewrite_links_for_tracking(
                    html_content, email_log.id, tracking_id
                )
                
                # Send email
                success, error_msg = EmailTrackingService._send_single_email(
                    smtp_config=smtp_config,
                    to_email=recipient['email'],
                    to_name=recipient['name'],
                    subject=campaign.subject,
                    html_content=html_content,
                    text_content=campaign.text_content
                )
                
                if success:
                    results.append({
                        'email': recipient['email'],
                        'success': True,
                        'email_log_id': email_log.id
                    })
                else:
                    # Check if it's a bounce
                    bounce_type, bounce_reason = EmailTrackingService._classify_bounce(error_msg)
                    if bounce_type:
                        email_log.status = EmailStatus.BOUNCED
                        email_log.bounce_type = bounce_type
                        email_log.bounce_reason = bounce_reason
                        email_log.bounced_at = datetime.utcnow()
                    else:
                        email_log.status = EmailStatus.FAILED
                    
                    results.append({
                        'email': recipient['email'],
                        'success': False,
                        'error': error_msg,
                        'email_log_id': email_log.id
                    })
                
                db.session.commit()
                
            except Exception as e:
                logger.error(f"Error sending to {recipient['email']}: {e}")
                results.append({
                    'email': recipient['email'],
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    @staticmethod
    def _send_single_email(
        smtp_config: SMTPConfig,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: str = None
    ) -> Tuple[bool, str]:
        """Send a single email via SMTP."""
        try:
            logger.debug(f"Preparing to send email to {to_email}")
            logger.debug(f"SMTP Config - Host: {smtp_config.host}, Port: {smtp_config.port}")
            logger.debug(f"From: {smtp_config.from_name} <{smtp_config.from_email}>")
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{smtp_config.from_name} <{smtp_config.from_email}>"
            msg['To'] = f"{to_name} <{to_email}>" if to_name else to_email
            
            # Add text part if available
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                msg.attach(text_part)
            
            # Add HTML part
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Connect to SMTP server
            logger.debug(f"Connecting to SMTP server {smtp_config.host}:{smtp_config.port}, use_tls={smtp_config.use_tls}")
            if smtp_config.use_tls:
                server = smtplib.SMTP(smtp_config.host, smtp_config.port)
                server.starttls()
                logger.debug("Started TLS connection")
            else:
                server = smtplib.SMTP_SSL(smtp_config.host, smtp_config.port)
                logger.debug("Started SSL connection")
            
            # Authenticate
            if smtp_config.username and hasattr(smtp_config, 'get_decrypted_password'):
                password = smtp_config.get_decrypted_password()
                logger.debug(f"Authenticating with username: {smtp_config.username}")
                if password:
                    server.login(smtp_config.username, password)
                    logger.debug("Authentication successful")
                else:
                    logger.error("No password available for authentication")
                    return False, "No password available for SMTP authentication"
            
            # Send email
            logger.debug("Sending email message...")
            server.send_message(msg)
            server.quit()
            logger.info(f"Email sent successfully to {to_email}")
            
            return True, "Email sent successfully"
            
        except smtplib.SMTPRecipientsRefused as e:
            return False, f"Recipient refused: {str(e)}"
        except smtplib.SMTPDataError as e:
            return False, f"SMTP data error: {str(e)}"
        except smtplib.SMTPAuthenticationError as e:
            return False, f"SMTP authentication error: {str(e)}"
        except Exception as e:
            logger.error(f"Email sending error for {to_email}: {str(e)}")
            return False, f"Email sending error: {str(e)}"
    
    @staticmethod
    def _classify_bounce(error_message: str) -> Tuple[Optional[BounceType], str]:
        """Classify bounce type based on error message."""
        error_lower = error_message.lower()
        
        # Hard bounces (permanent failures)
        hard_bounce_indicators = [
            'user unknown', 'no such user', 'invalid recipient',
            'recipient address rejected', 'user not found',
            'does not exist', 'invalid mailbox', 'unknown user'
        ]
        
        # Soft bounces (temporary failures)
        soft_bounce_indicators = [
            'mailbox full', 'quota exceeded', 'temporarily unavailable',
            'try again later', 'temporary failure', 'deferred'
        ]
        
        for indicator in hard_bounce_indicators:
            if indicator in error_lower:
                return BounceType.HARD, error_message
        
        for indicator in soft_bounce_indicators:
            if indicator in error_lower:
                return BounceType.SOFT, error_message
        
        # Default to soft bounce for unknown errors
        return BounceType.SOFT, error_message