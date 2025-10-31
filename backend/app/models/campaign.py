from datetime import datetime
from enum import Enum as PyEnum
from app import db

class CampaignStatus(PyEnum):
    """Enumeration for campaign statuses."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    FAILED = "failed"

class Campaign(db.Model):
    """Campaign model for email marketing campaigns."""
    
    __tablename__ = 'campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    smtp_account_id = db.Column(db.Integer, db.ForeignKey('smtp_accounts.id'), nullable=True)  # Which SMTP to use
    
    # Campaign details
    name = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(500), nullable=False)
    sender_name = db.Column(db.String(100))
    sender_email = db.Column(db.String(120))
    reply_to = db.Column(db.String(120))
    
    # Email content
    html_content = db.Column(db.Text)
    text_content = db.Column(db.Text)
    
    # Campaign settings
    status = db.Column(db.Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    scheduled_at = db.Column(db.DateTime)
    send_immediately = db.Column(db.Boolean, default=False)
    
    # Analytics
    total_recipients = db.Column(db.Integer, default=0)
    emails_sent = db.Column(db.Integer, default=0)
    emails_delivered = db.Column(db.Integer, default=0)
    emails_opened = db.Column(db.Integer, default=0)
    emails_clicked = db.Column(db.Integer, default=0)
    emails_bounced = db.Column(db.Integer, default=0)
    emails_failed = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sent_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Relationships
    recipients = db.relationship('CampaignRecipient', backref='campaign', lazy=True, cascade='all, delete-orphan')
    smtp_account = db.relationship('SMTPAccount', back_populates='campaigns')
    
    def __init__(self, user_id, name, subject, **kwargs):
        self.user_id = user_id
        self.name = name
        self.subject = subject
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    @property
    def open_rate(self):
        """Calculate email open rate percentage."""
        if self.emails_delivered == 0:
            return 0.0
        return (self.emails_opened / self.emails_delivered) * 100
    
    @property
    def click_rate(self):
        """Calculate email click rate percentage."""
        if self.emails_delivered == 0:
            return 0.0
        return (self.emails_clicked / self.emails_delivered) * 100
    
    @property
    def bounce_rate(self):
        """Calculate email bounce rate percentage."""
        if self.emails_sent == 0:
            return 0.0
        return (self.emails_bounced / self.emails_sent) * 100
    
    @property
    def delivery_rate(self):
        """Calculate email delivery rate percentage."""
        if self.emails_sent == 0:
            return 0.0
        return (self.emails_delivered / self.emails_sent) * 100
    
    def can_be_sent(self):
        """Check if campaign can be sent."""
        return (
            self.status in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED] and
            self.subject and
            (self.html_content or self.text_content) and
            self.sender_email
        )
    
    def to_dict(self, include_analytics=True):
        """Convert campaign object to dictionary."""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'subject': self.subject,
            'sender_name': self.sender_name,
            'sender_email': self.sender_email,
            'reply_to': self.reply_to,
            'html_content': self.html_content,
            'text_content': self.text_content,
            'status': self.status.value if self.status else None,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'send_immediately': self.send_immediately,
            'total_recipients': self.total_recipients,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }
        
        if include_analytics:
            data.update({
                'emails_sent': self.emails_sent,
                'emails_delivered': self.emails_delivered,
                'emails_opened': self.emails_opened,
                'emails_clicked': self.emails_clicked,
                'emails_bounced': self.emails_bounced,
                'emails_failed': self.emails_failed,
                'open_rate': self.open_rate,
                'click_rate': self.click_rate,
                'bounce_rate': self.bounce_rate,
                'delivery_rate': self.delivery_rate,
            })
        
        return data
    
    def __repr__(self):
        return f'<Campaign {self.name}>'


class CampaignRecipient(db.Model):
    """Model for tracking individual email recipients per campaign."""
    
    __tablename__ = 'campaign_recipients'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey('contacts.id'), nullable=False)
    
    # Email status for this recipient
    email_sent = db.Column(db.Boolean, default=False)
    email_delivered = db.Column(db.Boolean, default=False)
    email_opened = db.Column(db.Boolean, default=False)
    email_clicked = db.Column(db.Boolean, default=False)
    email_bounced = db.Column(db.Boolean, default=False)
    email_failed = db.Column(db.Boolean, default=False)
    
    # Error tracking
    error_message = db.Column(db.Text)
    bounce_reason = db.Column(db.String(500))
    
    # Timestamps
    sent_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    opened_at = db.Column(db.DateTime)
    clicked_at = db.Column(db.DateTime)
    bounced_at = db.Column(db.DateTime)
    
    def to_dict(self):
        """Convert recipient object to dictionary."""
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'contact_id': self.contact_id,
            'email_sent': self.email_sent,
            'email_delivered': self.email_delivered,
            'email_opened': self.email_opened,
            'email_clicked': self.email_clicked,
            'email_bounced': self.email_bounced,
            'email_failed': self.email_failed,
            'error_message': self.error_message,
            'bounce_reason': self.bounce_reason,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'opened_at': self.opened_at.isoformat() if self.opened_at else None,
            'clicked_at': self.clicked_at.isoformat() if self.clicked_at else None,
            'bounced_at': self.bounced_at.isoformat() if self.bounced_at else None,
        }