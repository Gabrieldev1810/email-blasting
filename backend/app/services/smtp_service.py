import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
import logging
from typing import Optional, List, Tuple, Union

logger = logging.getLogger(__name__)

class SMTPService:
    """Service for handling SMTP email sending operations."""
    
    def __init__(self, smtp_account):
        """Initialize SMTP service with SMTP account configuration."""
        from app.models.smtp_account import SMTPAccount
        
        if not isinstance(smtp_account, SMTPAccount):
            raise ValueError("SMTP Service requires an SMTPAccount instance")
        
        self.config = smtp_account
        self.server = None
    
    def connect(self) -> Tuple[bool, str]:
        """Establish SMTP connection."""
        try:
            # Create SMTP connection based on encryption type
            if self.config.encryption == 'ssl':
                context = ssl.create_default_context()
                self.server = smtplib.SMTP_SSL(
                    self.config.host, 
                    self.config.port,
                    context=context
                )
            else:
                self.server = smtplib.SMTP(self.config.host, self.config.port)
                
                # Enable security if using TLS
                if self.config.encryption == 'tls':
                    context = ssl.create_default_context()
                    self.server.starttls(context=context)
            
            # Authenticate with the server
            password = self.config.password
            if not password:
                return False, "No password configured"
            
            self.server.login(self.config.username, password)
            
            logger.info(f"SMTP connection established to {self.config.host}:{self.config.port}")
            return True, "Connected successfully"
            
        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"Authentication failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
            
        except smtplib.SMTPConnectError as e:
            error_msg = f"Connection failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
            
        except smtplib.SMTPServerDisconnected as e:
            error_msg = f"Server disconnected: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
            
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    def disconnect(self):
        """Close SMTP connection."""
        if self.server:
            try:
                self.server.quit()
                logger.info("SMTP connection closed")
            except Exception as e:
                logger.warning(f"Error closing SMTP connection: {e}")
            finally:
                self.server = None
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: Optional[str] = None,
        text_content: Optional[str] = None,
        attachments: Optional[List[dict]] = None
    ) -> Tuple[bool, str]:
        """
        Send a single email.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content (optional)
            text_content: Plain text email content (optional)
            attachments: List of attachment dicts with 'filename' and 'content' keys
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            # Validate inputs
            if not to_email or '@' not in to_email:
                return False, f"Invalid recipient email: {to_email}"
            
            if not subject:
                return False, "Email subject is required"
            
            if not html_content and not text_content:
                return False, "Email content (HTML or text) is required"
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.config.sender_name} <{self.config.sender_email}>" if self.config.sender_name else self.config.sender_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add Reply-To if available (only SMTPConfig has this)
            if hasattr(self.config, 'reply_to') and self.config.reply_to:
                msg['Reply-To'] = self.config.reply_to
            
            # Add message ID for tracking
            import uuid
            msg['Message-ID'] = f"<{uuid.uuid4()}@{self.config.sender_email.split('@')[1]}>"
            
            # Add content
            if text_content:
                text_part = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(text_part)
            
            if html_content:
                html_part = MIMEText(html_content, 'html', 'utf-8')
                msg.attach(html_part)
            
            # Add attachments if provided
            if attachments:
                for attachment in attachments:
                    try:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(attachment['content'])
                        encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename= {attachment["filename"]}'
                        )
                        msg.attach(part)
                    except Exception as e:
                        logger.warning(f"Failed to attach file {attachment.get('filename')}: {e}")
            
            # Send email
            if not self.server:
                connected, error = self.connect()
                if not connected:
                    return False, f"Connection failed: {error}"
            
            self.server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True, "Email sent successfully"
            
        except smtplib.SMTPRecipientsRefused as e:
            error_msg = f"Recipient refused: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
            
        except smtplib.SMTPDataError as e:
            error_msg = f"SMTP data error: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
            
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    def send_test_email(self, test_email: str) -> Tuple[bool, str]:
        """Send a test email to verify SMTP configuration."""
        subject = "Test Email from Beacon Blast"
        html_content = """
        <html>
            <body>
                <h2>🎉 SMTP Configuration Test Successful!</h2>
                <p>This is a test email to verify your SMTP configuration in Beacon Blast.</p>
                <p><strong>Configuration Details:</strong></p>
                <ul>
                    <li><strong>Provider:</strong> {provider}</li>
                    <li><strong>Host:</strong> {host}:{port}</li>
                    <li><strong>Encryption:</strong> {encryption}</li>
                    <li><strong>Sender:</strong> {sender_email}</li>
                </ul>
                <p>If you received this email, your SMTP configuration is working correctly!</p>
                <hr>
                <p><small>Sent at: {timestamp}</small></p>
            </body>
        </html>
        """.format(
            provider=self.config.provider,
            host=self.config.host,
            port=self.config.port,
            encryption=self.config.encryption.upper(),
            sender_email=self.config.sender_email,
            timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        )
        
        text_content = f"""
SMTP Configuration Test Successful!

This is a test email to verify your SMTP configuration in Beacon Blast.

Configuration Details:
- Provider: {self.config.provider}
- Host: {self.config.host}:{self.config.port}
- Encryption: {self.config.encryption.upper()}
- Sender: {self.config.sender_email}

If you received this email, your SMTP configuration is working correctly!

Sent at: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")}
        """
        
        return self.send_email(
            to_email=test_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
    
    def bulk_send_emails(
        self,
        recipients: List[dict],
        subject: str,
        html_template: Optional[str] = None,
        text_template: Optional[str] = None,
        batch_size: int = 10
    ) -> List[dict]:
        """
        Send emails to multiple recipients.
        
        Args:
            recipients: List of dicts with 'email' and optionally other fields for personalization
            subject: Email subject (can include placeholders like {first_name})
            html_template: HTML email template (can include placeholders)
            text_template: Text email template (can include placeholders)
            batch_size: Number of emails to send before reconnecting
            
        Returns:
            List of results for each recipient
        """
        results = []
        sent_count = 0
        
        try:
            # Connect once for the batch
            connected, error = self.connect()
            if not connected:
                return [{'email': r.get('email', 'unknown'), 'success': False, 'error': error} for r in recipients]
            
            for i, recipient in enumerate(recipients):
                try:
                    email = recipient.get('email')
                    if not email:
                        results.append({
                            'email': 'unknown',
                            'success': False,
                            'error': 'No email address provided'
                        })
                        continue
                    
                    # Personalize subject and content
                    personalized_subject = self._personalize_content(subject, recipient)
                    personalized_html = self._personalize_content(html_template, recipient) if html_template else None
                    personalized_text = self._personalize_content(text_template, recipient) if text_template else None
                    
                    # Send email
                    success, message = self.send_email(
                        to_email=email,
                        subject=personalized_subject,
                        html_content=personalized_html,
                        text_content=personalized_text
                    )
                    
                    results.append({
                        'email': email,
                        'success': success,
                        'error': None if success else message
                    })
                    
                    if success:
                        sent_count += 1
                    
                    # Reconnect after batch_size emails to avoid timeout
                    if (i + 1) % batch_size == 0 and (i + 1) < len(recipients):
                        self.disconnect()
                        connected, error = self.connect()
                        if not connected:
                            # Mark remaining emails as failed
                            for j in range(i + 1, len(recipients)):
                                results.append({
                                    'email': recipients[j].get('email', 'unknown'),
                                    'success': False,
                                    'error': f'Connection lost: {error}'
                                })
                            break
                
                except Exception as e:
                    results.append({
                        'email': recipient.get('email', 'unknown'),
                        'success': False,
                        'error': str(e)
                    })
            
        finally:
            self.disconnect()
        
        logger.info(f"Bulk send completed: {sent_count}/{len(recipients)} emails sent successfully")
        return results
    
    def _personalize_content(self, template: str, data: dict) -> str:
        """Personalize email content with recipient data."""
        if not template:
            return template
        
        try:
            # Simple template substitution
            # In production, consider using Jinja2 for more advanced templating
            for key, value in data.items():
                placeholder = f"{{{key}}}"
                if placeholder in template:
                    template = template.replace(placeholder, str(value) if value else "")
            
            return template
            
        except Exception as e:
            logger.warning(f"Error personalizing content: {e}")
            return template
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()