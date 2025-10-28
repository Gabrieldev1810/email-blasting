import logging

logger = logging.getLogger(__name__)
from datetime import datetime
from cryptography.fernet import Fernet
import os
import base64
from app import db

class SMTPConfig(db.Model):
    """SMTP configuration model for email sending settings."""
    
    __tablename__ = 'smtp_configs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # SMTP server details
    name = db.Column(db.String(100), nullable=False)  # User-friendly name for this config
    provider = db.Column(db.String(50), nullable=False)  # gmail, outlook, yahoo, custom
    host = db.Column(db.String(100), nullable=False)
    port = db.Column(db.Integer, nullable=False, default=587)
    encryption = db.Column(db.String(10), nullable=False, default='tls')  # tls, ssl, none
    
    # Authentication (encrypted)
    username = db.Column(db.String(200), nullable=False)
    password_encrypted = db.Column(db.Text, nullable=False)
    
    # Sender information
    sender_name = db.Column(db.String(100))
    sender_email = db.Column(db.String(120), nullable=False)
    reply_to = db.Column(db.String(120))
    
    # Settings
    is_active = db.Column(db.Boolean, default=True)
    is_default = db.Column(db.Boolean, default=False)
    max_emails_per_hour = db.Column(db.Integer, default=100)
    
    # Connection testing
    last_tested_at = db.Column(db.DateTime)
    test_successful = db.Column(db.Boolean)
    test_error_message = db.Column(db.Text)
    
    # Usage tracking
    emails_sent_today = db.Column(db.Integer, default=0)
    total_emails_sent = db.Column(db.Integer, default=0)
    last_email_sent_at = db.Column(db.DateTime)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Ensure only one default config per user
    __table_args__ = (
        db.CheckConstraint(
            'NOT (is_default = true AND is_active = false)',
            name='default_must_be_active'
        ),
    )
    
    def __init__(self, user_id, name, provider, host, port, username, password, sender_email, **kwargs):
        self.user_id = user_id
        self.name = name
        self.provider = provider
        self.host = host
        self.port = port
        self.username = username
        self.sender_email = sender_email
        self.set_password(password)
        
        for key, value in kwargs.items():
            if hasattr(self, key) and key != 'password_encrypted':
                setattr(self, key, value)
    
    def _get_encryption_key(self):
        """Get or create encryption key for password encryption."""
        # In production, this should be stored securely (e.g., environment variable)
        key = os.environ.get('SMTP_ENCRYPTION_KEY')
        if not key:
            # Generate a key for development (not secure for production!)
            key = Fernet.generate_key()
            key = base64.urlsafe_b64encode(key).decode()
        else:
            key = key.encode()
        
        return key
    
    def set_password(self, password):
        """Encrypt and store the SMTP password."""
        if password:
            key = self._get_encryption_key()
            f = Fernet(key)
            encrypted_password = f.encrypt(password.encode())
            self.password_encrypted = base64.urlsafe_b64encode(encrypted_password).decode()
    
    def get_password(self):
        """Decrypt and return the SMTP password."""
        if self.password_encrypted:
            try:
                key = self._get_encryption_key()
                f = Fernet(key)
                encrypted_data = base64.urlsafe_b64decode(self.password_encrypted.encode())
                password = f.decrypt(encrypted_data)
                return password.decode()
            except Exception as e:
                # Log the error in production
                logger.error(f"Error decrypting password: {e}")
                return None
        return None
    
    def test_connection(self):
        """Test the SMTP connection with current settings."""
        try:
            import smtplib
            from email.mime.text import MIMEText
            
            # Create SMTP connection
            if self.encryption == 'ssl':
                server = smtplib.SMTP_SSL(self.host, self.port)
            else:
                server = smtplib.SMTP(self.host, self.port)
                if self.encryption == 'tls':
                    server.starttls()
            
            # Authenticate
            password = self.get_password()
            if password:
                server.login(self.username, password)
            
            # Close connection
            server.quit()
            
            # Update test results
            self.last_tested_at = datetime.utcnow()
            self.test_successful = True
            self.test_error_message = None
            
            return True, "Connection successful"
            
        except Exception as e:
            # Update test results
            self.last_tested_at = datetime.utcnow()
            self.test_successful = False
            self.test_error_message = str(e)
            
            return False, str(e)
    
    def can_send_email(self):
        """Check if this SMTP config can send emails based on rate limits."""
        if not self.is_active:
            return False, "SMTP configuration is disabled"
        
        if self.emails_sent_today >= self.max_emails_per_hour:
            return False, f"Daily email limit of {self.max_emails_per_hour} reached"
        
        if not self.test_successful:
            return False, "SMTP connection not tested or failed"
        
        return True, "Ready to send"
    
    def increment_email_count(self):
        """Increment the email sent counters."""
        self.emails_sent_today += 1
        self.total_emails_sent += 1
        self.last_email_sent_at = datetime.utcnow()
    
    def reset_daily_count(self):
        """Reset the daily email counter (called by a daily job)."""
        self.emails_sent_today = 0
    
    def make_default(self):
        """Make this SMTP config the default for the user."""
        # Remove default from other configs for this user
        db.session.query(SMTPConfig).filter(
            SMTPConfig.user_id == self.user_id,
            SMTPConfig.id != self.id
        ).update({'is_default': False})
        
        self.is_default = True
    
    def to_dict(self, include_sensitive=False):
        """Convert SMTP config object to dictionary."""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'provider': self.provider,
            'host': self.host,
            'port': self.port,
            'encryption': self.encryption,
            'username': self.username,
            'sender_name': self.sender_name,
            'sender_email': self.sender_email,
            'reply_to': self.reply_to,
            'is_active': self.is_active,
            'is_default': self.is_default,
            'max_emails_per_hour': self.max_emails_per_hour,
            'emails_sent_today': self.emails_sent_today,
            'total_emails_sent': self.total_emails_sent,
            'last_tested_at': self.last_tested_at.isoformat() if self.last_tested_at else None,
            'test_successful': self.test_successful,
            'last_email_sent_at': self.last_email_sent_at.isoformat() if self.last_email_sent_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_sensitive:
            # Only include password status, never the actual password
            data['has_password'] = bool(self.password_encrypted)
            data['test_error_message'] = self.test_error_message
        
        return data
    
    def __repr__(self):
        return f'<SMTPConfig {self.name} ({self.provider})>'