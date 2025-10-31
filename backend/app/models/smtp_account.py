"""
SMTP Account Model - Multi-account support for email sending
Admin creates SMTP accounts and assigns them to managers/users
"""
from datetime import datetime
from app import db

class SMTPAccount(db.Model):
    """SMTP Account model for managing multiple email sending configurations."""
    
    __tablename__ = 'smtp_accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Account identification
    name = db.Column(db.String(100), nullable=False)  # Friendly name (e.g., "Marketing Gmail", "Sales Outlook")
    description = db.Column(db.String(500))
    
    # SMTP Configuration
    provider = db.Column(db.String(50), nullable=False)  # gmail, outlook, sendgrid, custom, etc.
    host = db.Column(db.String(255), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    username = db.Column(db.String(255), nullable=False)
    password = db.Column(db.String(500), nullable=False)  # Should be encrypted in production
    encryption = db.Column(db.String(20), default='tls')  # tls, ssl, none
    
    # Sender Information
    from_name = db.Column(db.String(100), nullable=False)  # Display name in emails
    from_email = db.Column(db.String(255), nullable=False)  # Email address shown as sender
    reply_to_email = db.Column(db.String(255))  # Optional reply-to address
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)  # Set to true after successful test
    last_tested_at = db.Column(db.DateTime)
    last_used_at = db.Column(db.DateTime)
    
    # Limits & Tracking (optional for future rate limiting per SMTP)
    daily_limit = db.Column(db.Integer)  # Max emails per day (null = unlimited)
    emails_sent_today = db.Column(db.Integer, default=0)
    total_emails_sent = db.Column(db.Integer, default=0)
    
    # Audit
    created_by_admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by = db.relationship('User', foreign_keys=[created_by_admin_id], backref='created_smtp_accounts')
    assigned_users = db.relationship('UserSMTPAssignment', back_populates='smtp_account', cascade='all, delete-orphan')
    campaigns = db.relationship('Campaign', back_populates='smtp_account')
    
    def to_dict(self, include_password=False):
        """Convert SMTP account to dictionary."""
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'provider': self.provider,
            'host': self.host,
            'port': self.port,
            'username': self.username,
            'encryption': self.encryption,
            'from_name': self.from_name,
            'from_email': self.from_email,
            'reply_to_email': self.reply_to_email,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'last_tested_at': self.last_tested_at.isoformat() if self.last_tested_at else None,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'daily_limit': self.daily_limit,
            'emails_sent_today': self.emails_sent_today,
            'total_emails_sent': self.total_emails_sent,
            'created_by_admin_id': self.created_by_admin_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_password:
            data['password'] = self.password
        else:
            data['password'] = '••••••••' if self.password else None
            
        return data
    
    def __repr__(self):
        return f'<SMTPAccount {self.name} ({self.from_email})>'


class UserSMTPAssignment(db.Model):
    """Junction table for many-to-many relationship between Users and SMTP Accounts."""
    
    __tablename__ = 'user_smtp_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    smtp_account_id = db.Column(db.Integer, db.ForeignKey('smtp_accounts.id', ondelete='CASCADE'), nullable=False)
    
    # Audit
    assigned_by_admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='smtp_assignments')
    smtp_account = db.relationship('SMTPAccount', back_populates='assigned_users')
    assigned_by = db.relationship('User', foreign_keys=[assigned_by_admin_id])
    
    # Unique constraint: one user can't be assigned the same SMTP account twice
    __table_args__ = (
        db.UniqueConstraint('user_id', 'smtp_account_id', name='unique_user_smtp_assignment'),
    )
    
    def to_dict(self):
        """Convert assignment to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'smtp_account_id': self.smtp_account_id,
            'assigned_by_admin_id': self.assigned_by_admin_id,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
        }
    
    def __repr__(self):
        return f'<UserSMTPAssignment User:{self.user_id} SMTP:{self.smtp_account_id}>'
