from datetime import datetime
from typing import List, Dict, Optional, Tuple, Union
import logging
from app import db
from app.models.campaign import Campaign, CampaignRecipient, CampaignStatus
from app.models.contact import Contact, ContactStatus
from app.models.smtp_config import SMTPConfig
from app.models.smtp_settings import SMTPSettings
from app.services.smtp_service import SMTPService

logger = logging.getLogger(__name__)

class EmailService:
    """High-level service for managing email campaigns and delivery."""
    
    @staticmethod
    def send_campaign(campaign_id: int, user_id: int) -> Tuple[bool, str, Dict]:
        """
        Send an email campaign to all its recipients.
        
        Args:
            campaign_id: ID of the campaign to send
            user_id: ID of the user who owns the campaign
            
        Returns:
            Tuple of (success: bool, message: str, results: dict)
        """
        try:
            # Get campaign
            campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first()
            if not campaign:
                return False, "Campaign not found", {}
            
            # Check if campaign can be sent
            if not campaign.can_be_sent():
                return False, "Campaign cannot be sent - missing required fields", {}
            
            if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED]:
                return False, f"Campaign cannot be sent - status is {campaign.status.value}", {}
            
            # Get the SMTP account assigned to this campaign
            from app.models.smtp_account import SMTPAccount
            
            if not campaign.smtp_account_id:
                return False, "No SMTP account assigned to this campaign. Please select an SMTP account.", {}
            
            smtp_account = SMTPAccount.query.get(campaign.smtp_account_id)
            if not smtp_account:
                return False, "SMTP account not found", {}
            
            if not smtp_account.is_active:
                return False, "SMTP account is not active", {}
            
            if not smtp_account.is_verified:
                return False, "SMTP account is not verified. Please contact your administrator.", {}
            
            logger.info(f"Using SMTP account '{smtp_account.name}' (ID: {smtp_account.id}) for campaign {campaign_id}")
            
            # Get campaign recipients
            recipients = EmailService._get_campaign_recipients(campaign)
            if not recipients:
                return False, "No valid recipients found for this campaign", {}
            
            # Update campaign status
            campaign.status = CampaignStatus.SENDING
            campaign.sent_at = datetime.utcnow()
            campaign.total_recipients = len(recipients)
            db.session.commit()
            
            # Send emails
            results = EmailService._send_campaign_emails(campaign, recipients, smtp_account)
            
            # Update campaign with results
            EmailService._update_campaign_results(campaign, results)
            
            # Mark campaign as completed
            campaign.status = CampaignStatus.SENT
            campaign.completed_at = datetime.utcnow()
            db.session.commit()
            
            success_count = sum(1 for r in results if r['success'])
            total_count = len(results)
            
            return True, f"Campaign sent: {success_count}/{total_count} emails delivered", {
                'total_recipients': total_count,
                'successful_sends': success_count,
                'failed_sends': total_count - success_count,
                'results': results
            }
            
        except Exception as e:
            logger.error(f"Error sending campaign {campaign_id}: {e}")
            
            # Update campaign status to failed
            if 'campaign' in locals():
                campaign.status = CampaignStatus.FAILED
                db.session.commit()
            
            return False, f"Failed to send campaign: {str(e)}", {}
    
    @staticmethod
    def send_test_email(campaign_id: int, user_id: int, test_email: str) -> Tuple[bool, str]:
        """
        Send a test email for a campaign.
        
        Args:
            campaign_id: ID of the campaign to test
            user_id: ID of the user who owns the campaign
            test_email: Email address to send the test to
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            # Get campaign
            campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first()
            if not campaign:
                return False, "Campaign not found"
            
            # Get user's default SMTP configuration
            smtp_config = SMTPConfig.query.filter_by(
                user_id=user_id, 
                is_active=True, 
                is_default=True
            ).first()
            
            if not smtp_config:
                return False, "No active SMTP configuration found"
            
            # Send test email
            with SMTPService(smtp_config) as smtp_service:
                success, message = smtp_service.send_email(
                    to_email=test_email,
                    subject=f"[TEST] {campaign.subject}",
                    html_content=campaign.html_content,
                    text_content=campaign.text_content
                )
            
            if success:
                logger.info(f"Test email sent for campaign {campaign_id} to {test_email}")
                return True, "Test email sent successfully"
            else:
                logger.warning(f"Failed to send test email for campaign {campaign_id}: {message}")
                return False, f"Failed to send test email: {message}"
            
        except Exception as e:
            logger.error(f"Error sending test email for campaign {campaign_id}: {e}")
            return False, f"Failed to send test email: {str(e)}"
    
    @staticmethod
    def test_smtp_configuration(smtp_config_id: int, user_id: int, test_email: str) -> Tuple[bool, str]:
        """
        Test an SMTP configuration by sending a test email.
        
        Args:
            smtp_config_id: ID of the SMTP configuration to test
            user_id: ID of the user who owns the configuration
            test_email: Email address to send the test to
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            # Get SMTP configuration
            smtp_config = SMTPConfig.query.filter_by(
                id=smtp_config_id, 
                user_id=user_id
            ).first()
            
            if not smtp_config:
                return False, "SMTP configuration not found"
            
            # Test SMTP connection first
            connection_success, connection_message = smtp_config.test_connection()
            if not connection_success:
                db.session.commit()  # Save test results
                return False, f"Connection test failed: {connection_message}"
            
            # Send test email
            with SMTPService(smtp_config) as smtp_service:
                success, message = smtp_service.send_test_email(test_email)
            
            # Update SMTP config with test results
            if success:
                smtp_config.test_successful = True
                smtp_config.test_error_message = None
            else:
                smtp_config.test_successful = False
                smtp_config.test_error_message = message
            
            smtp_config.last_tested_at = datetime.utcnow()
            db.session.commit()
            
            return success, message
            
        except Exception as e:
            logger.error(f"Error testing SMTP configuration {smtp_config_id}: {e}")
            return False, f"Failed to test SMTP configuration: {str(e)}"
    
    @staticmethod
    def _get_campaign_recipients(campaign: Campaign) -> List[Dict]:
        """Get all valid recipients for a campaign."""
        try:
            # First, check if this campaign has specific recipients assigned
            existing_recipients = CampaignRecipient.query.filter_by(
                campaign_id=campaign.id
            ).all()
            
            if existing_recipients:
                # Campaign has specific recipients - use only those
                logger.info(f"Campaign {campaign.id} has {len(existing_recipients)} specific recipients assigned")
                recipients = []
                
                for recipient_record in existing_recipients:
                    contact = Contact.query.get(recipient_record.contact_id)
                    if contact and contact.is_sendable():
                        recipients.append({
                            'email': contact.email,
                            'first_name': contact.first_name or '',
                            'last_name': contact.last_name or '',
                            'full_name': contact.full_name or contact.email,
                            'contact_id': contact.id,
                            'recipient_record': recipient_record
                        })
                
                return recipients
            
            # No specific recipients - use all active, subscribed contacts for the user (legacy behavior)
            logger.info(f"Campaign {campaign.id} has no specific recipients, using all active contacts")
            contacts = Contact.query.filter_by(
                user_id=campaign.user_id,
                status=ContactStatus.ACTIVE,
                subscribed=True
            ).all()
            
            recipients = []
            for contact in contacts:
                if contact.is_sendable():
                    # Create campaign recipient record
                    recipient_record = CampaignRecipient(
                        campaign_id=campaign.id,
                        contact_id=contact.id
                    )
                    db.session.add(recipient_record)
                    
                    recipients.append({
                        'email': contact.email,
                        'first_name': contact.first_name or '',
                        'last_name': contact.last_name or '',
                        'full_name': contact.full_name or contact.email,
                        'contact_id': contact.id,
                        'recipient_record': recipient_record
                    })
            
            db.session.commit()
            return recipients
            
        except Exception as e:
            logger.error(f"Error getting campaign recipients: {e}")
            return []
    
    @staticmethod
    def _send_campaign_emails(
        campaign: Campaign, 
        recipients: List[Dict], 
        smtp_account
    ) -> List[Dict]:
        """Send emails to all campaign recipients."""
        from app.models.smtp_account import SMTPAccount
        
        results = []
        
        try:
            with SMTPService(smtp_account) as smtp_service:
                results = smtp_service.bulk_send_emails(
                    recipients=recipients,
                    subject=campaign.subject,
                    html_template=campaign.html_content,
                    text_template=campaign.text_content,
                    batch_size=10  # Reconnect every 10 emails to avoid timeouts
                )
                
                # Update recipient records with results
                for i, result in enumerate(results):
                    if i < len(recipients):
                        recipient = recipients[i]
                        recipient_record = recipient['recipient_record']
                        
                        if result['success']:
                            recipient_record.email_sent = True
                            recipient_record.sent_at = datetime.utcnow()
                            # Update SMTP account usage
                            smtp_account.total_emails_sent += 1
                            smtp_account.emails_sent_today += 1
                            smtp_account.last_used_at = datetime.utcnow()
                        else:
                            recipient_record.email_failed = True
                            recipient_record.error_message = result.get('error', 'Unknown error')
                
                db.session.commit()
                
        except Exception as e:
            logger.error(f"Error sending campaign emails: {e}")
            # Mark all remaining as failed
            for recipient in recipients:
                results.append({
                    'email': recipient['email'],
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    @staticmethod
    def _update_campaign_results(campaign: Campaign, results: List[Dict]):
        """Update campaign statistics based on sending results."""
        try:
            successful_sends = sum(1 for r in results if r['success'])
            failed_sends = len(results) - successful_sends
            
            campaign.emails_sent = len(results)
            campaign.emails_delivered = successful_sends  # Assume delivered if sent successfully
            campaign.emails_failed = failed_sends
            
            db.session.commit()
            
        except Exception as e:
            logger.error(f"Error updating campaign results: {e}")
    
    @staticmethod
    def get_campaign_analytics(campaign_id: int, user_id: int) -> Optional[Dict]:
        """Get detailed analytics for a campaign."""
        try:
            campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first()
            if not campaign:
                return None
            
            recipients = CampaignRecipient.query.filter_by(campaign_id=campaign_id).all()
            
            analytics = {
                'campaign': campaign.to_dict(include_analytics=True),
                'recipient_details': [r.to_dict() for r in recipients],
                'summary': {
                    'total_recipients': len(recipients),
                    'emails_sent': sum(1 for r in recipients if r.email_sent),
                    'emails_delivered': sum(1 for r in recipients if r.email_delivered),
                    'emails_opened': sum(1 for r in recipients if r.email_opened),
                    'emails_clicked': sum(1 for r in recipients if r.email_clicked),
                    'emails_bounced': sum(1 for r in recipients if r.email_bounced),
                    'emails_failed': sum(1 for r in recipients if r.email_failed),
                }
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Error getting campaign analytics: {e}")
            return None