from datetime import datetime
from enum import Enum as PyEnum
from app import db

class EmailStatus(PyEnum):
    """Enumeration for email delivery statuses."""
    SENT = "sent"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    FAILED = "failed"

class BounceType(PyEnum):
    """Enumeration for bounce types."""
    HARD = "hard"
    SOFT = "soft"
    COMPLAINT = "complaint"

class EmailLog(db.Model):
    """Email log model for tracking individual email delivery and engagement."""
    
    __tablename__ = 'email_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign keys
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    smtp_account_id = db.Column(db.Integer, db.ForeignKey('smtp_configs.id'), nullable=True)
    
    # Recipient information
    recipient_email = db.Column(db.String(255), nullable=False)
    recipient_name = db.Column(db.String(255))
    
    # Status tracking
    status = db.Column(db.Enum(EmailStatus), default=EmailStatus.SENT)
    
    # Timestamps
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    opened_at = db.Column(db.DateTime)
    clicked_at = db.Column(db.DateTime)
    bounced_at = db.Column(db.DateTime)
    
    # Bounce information
    bounce_type = db.Column(db.Enum(BounceType))
    bounce_reason = db.Column(db.Text)
    bounce_diagnostic = db.Column(db.Text)
    
    # Tracking information
    tracking_id = db.Column(db.String(64), unique=True, nullable=False)  # Unique ID for tracking links
    user_agent = db.Column(db.String(500))
    ip_address = db.Column(db.String(45))
    
    # Email metadata
    message_id = db.Column(db.String(255))  # SMTP message ID
    subject = db.Column(db.String(500))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    campaign = db.relationship('Campaign', backref=db.backref('email_logs', lazy='dynamic'))
    
    def __repr__(self):
        return f'<EmailLog {self.id}: {self.recipient_email} - {self.status.value}>'
    
    @property
    def open_rate_for_campaign(self):
        """Calculate open rate for this campaign."""
        total_sent = EmailLog.query.filter_by(campaign_id=self.campaign_id).count()
        if total_sent == 0:
            return 0
        opened_count = EmailLog.query.filter_by(
            campaign_id=self.campaign_id,
            status=EmailStatus.OPENED
        ).count()
        return round((opened_count / total_sent) * 100, 2)
    
    @property
    def click_rate_for_campaign(self):
        """Calculate click rate for this campaign."""
        total_sent = EmailLog.query.filter_by(campaign_id=self.campaign_id).count()
        if total_sent == 0:
            return 0
        clicked_count = EmailLog.query.filter_by(
            campaign_id=self.campaign_id,
            status=EmailStatus.CLICKED
        ).count()
        return round((clicked_count / total_sent) * 100, 2)
    
    @property
    def bounce_rate_for_campaign(self):
        """Calculate bounce rate for this campaign."""
        total_sent = EmailLog.query.filter_by(campaign_id=self.campaign_id).count()
        if total_sent == 0:
            return 0
        bounced_count = EmailLog.query.filter_by(
            campaign_id=self.campaign_id,
            status=EmailStatus.BOUNCED
        ).count()
        return round((bounced_count / total_sent) * 100, 2)

class LinkClick(db.Model):
    """Model for tracking individual link clicks within emails."""
    
    __tablename__ = 'link_clicks'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign keys
    email_log_id = db.Column(db.Integer, db.ForeignKey('email_logs.id'), nullable=False)
    
    # Click information
    url = db.Column(db.Text, nullable=False)
    clicked_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Tracking metadata
    user_agent = db.Column(db.String(500))
    ip_address = db.Column(db.String(45))
    referrer = db.Column(db.String(500))
    
    # Relationships
    email_log = db.relationship('EmailLog', backref=db.backref('link_clicks', lazy='dynamic'))
    
    def __repr__(self):
        return f'<LinkClick {self.id}: {self.url} at {self.clicked_at}>'