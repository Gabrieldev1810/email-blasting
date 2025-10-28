from datetime import datetime
from enum import Enum as PyEnum
from app import db

class ContactStatus(PyEnum):
    """Enumeration for contact statuses."""
    ACTIVE = "active"
    UNSUBSCRIBED = "unsubscribed"
    BOUNCED = "bounced"
    SPAM_COMPLAINT = "spam_complaint"
    INVALID = "invalid"

class Contact(db.Model):
    """Contact model for email recipients."""
    
    __tablename__ = 'contacts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Contact information
    email = db.Column(db.String(120), nullable=False, index=True)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    company = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    
    # Status and preferences
    status = db.Column(db.Enum(ContactStatus), default=ContactStatus.ACTIVE, index=True)
    subscribed = db.Column(db.Boolean, default=True)
    email_verified = db.Column(db.Boolean, default=False)
    
    # Tracking
    source = db.Column(db.String(100))  # How the contact was added (e.g., 'csv_import', 'manual', 'api')
    tags = db.Column(db.Text)  # JSON string of tags
    notes = db.Column(db.Text)
    
    # Analytics
    total_emails_sent = db.Column(db.Integer, default=0)
    total_emails_opened = db.Column(db.Integer, default=0)
    total_emails_clicked = db.Column(db.Integer, default=0)
    total_emails_bounced = db.Column(db.Integer, default=0)
    last_email_sent_at = db.Column(db.DateTime)
    last_email_opened_at = db.Column(db.DateTime)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    unsubscribed_at = db.Column(db.DateTime)
    
    # Relationships
    campaign_recipients = db.relationship('CampaignRecipient', backref='contact', lazy=True)
    
    # Composite unique index for user_id and email
    __table_args__ = (
        db.UniqueConstraint('user_id', 'email', name='_user_email_uc'),
    )
    
    def __init__(self, user_id, email, **kwargs):
        self.user_id = user_id
        self.email = email.lower().strip()  # Normalize email
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    @property
    def full_name(self):
        """Get contact's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name or None
    
    @property
    def display_name(self):
        """Get display name (full name or email if no name)."""
        return self.full_name or self.email
    
    @property
    def open_rate(self):
        """Calculate email open rate percentage for this contact."""
        if self.total_emails_sent == 0:
            return 0.0
        return (self.total_emails_opened / self.total_emails_sent) * 100
    
    @property
    def click_rate(self):
        """Calculate email click rate percentage for this contact."""
        if self.total_emails_sent == 0:
            return 0.0
        return (self.total_emails_clicked / self.total_emails_sent) * 100
    
    def unsubscribe(self):
        """Unsubscribe the contact."""
        self.status = ContactStatus.UNSUBSCRIBED
        self.subscribed = False
        self.unsubscribed_at = datetime.utcnow()
    
    def resubscribe(self):
        """Resubscribe the contact if they were unsubscribed."""
        if self.status == ContactStatus.UNSUBSCRIBED:
            self.status = ContactStatus.ACTIVE
            self.subscribed = True
            self.unsubscribed_at = None
    
    def mark_bounced(self):
        """Mark contact as bounced."""
        self.status = ContactStatus.BOUNCED
        self.total_emails_bounced += 1
    
    def is_sendable(self):
        """Check if we can send emails to this contact."""
        return (
            self.status == ContactStatus.ACTIVE and
            self.subscribed and
            '@' in self.email
        )
    
    def get_tags_list(self):
        """Get tags as a list."""
        if self.tags:
            try:
                import json
                return json.loads(self.tags)
            except:
                return []
        return []
    
    def set_tags_list(self, tags):
        """Set tags from a list."""
        if tags:
            import json
            self.tags = json.dumps(tags)
        else:
            self.tags = None
    
    def to_dict(self, include_analytics=False):
        """Convert contact object to dictionary."""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'display_name': self.display_name,
            'company': self.company,
            'phone': self.phone,
            'status': self.status.value if self.status else None,
            'subscribed': self.subscribed,
            'email_verified': self.email_verified,
            'source': self.source,
            'tags': self.get_tags_list(),
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'unsubscribed_at': self.unsubscribed_at.isoformat() if self.unsubscribed_at else None,
        }
        
        if include_analytics:
            data.update({
                'total_emails_sent': self.total_emails_sent,
                'total_emails_opened': self.total_emails_opened,
                'total_emails_clicked': self.total_emails_clicked,
                'total_emails_bounced': self.total_emails_bounced,
                'open_rate': self.open_rate,
                'click_rate': self.click_rate,
                'last_email_sent_at': self.last_email_sent_at.isoformat() if self.last_email_sent_at else None,
                'last_email_opened_at': self.last_email_opened_at.isoformat() if self.last_email_opened_at else None,
            })
        
        return data
    
    def __repr__(self):
        return f'<Contact {self.email}>'