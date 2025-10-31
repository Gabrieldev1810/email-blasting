from app import db
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    CAMPAIGN_CREATED = "campaign_created"
    CAMPAIGN_SUCCESS = "campaign_success"
    CAMPAIGN_FAILED = "campaign_failed"
    CAMPAIGN_DRAFT = "campaign_draft"
    CAMPAIGN_SCHEDULED = "campaign_scheduled"
    CAMPAIGN_SENDING = "campaign_sending"
    PROFILE_UPDATE_REQUEST = "profile_update_request"
    SYSTEM = "system"

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.Enum(NotificationType), nullable=False, default=NotificationType.SYSTEM)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete='SET NULL'), nullable=True)
    status = db.Column(db.String(50), nullable=True)  # success, failed, draft, scheduled, sending
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('notifications', lazy=True, cascade='all, delete-orphan'))
    campaign = db.relationship('Campaign', backref=db.backref('notifications', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type.value if self.type else None,
            'title': self.title,
            'message': self.message,
            'campaign_id': self.campaign_id,
            'campaign_name': self.campaign.name if self.campaign else None,
            'status': self.status,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def mark_as_read(self):
        """Mark notification as read."""
        self.is_read = True
    
    def __repr__(self):
        return f'<Notification {self.id} - {self.title} for User {self.user_id}>'
