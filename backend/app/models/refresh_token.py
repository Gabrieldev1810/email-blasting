"""
Refresh Token model for token renewal without re-authentication.
"""

from app import db
from datetime import datetime, timedelta
import secrets


class RefreshToken(db.Model):
    """Model for storing refresh tokens."""
    
    __tablename__ = 'refresh_token'
    
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    revoked = db.Column(db.Boolean, default=False)
    revoked_at = db.Column(db.DateTime, nullable=True)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('refresh_tokens', lazy='dynamic'))
    
    def __init__(self, user_id, expires_in_days=30):
        """Initialize refresh token."""
        self.user_id = user_id
        self.token = self.generate_token()
        self.expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
    
    @staticmethod
    def generate_token():
        """Generate a secure random token."""
        return secrets.token_urlsafe(64)
    
    def is_valid(self):
        """Check if refresh token is valid."""
        return not self.revoked and self.expires_at > datetime.utcnow()
    
    def revoke(self):
        """Revoke the refresh token."""
        self.revoked = True
        self.revoked_at = datetime.utcnow()
    
    @classmethod
    def cleanup_expired(cls):
        """Remove expired refresh tokens (run periodically)."""
        expired_tokens = cls.query.filter(cls.expires_at < datetime.utcnow()).all()
        for token in expired_tokens:
            db.session.delete(token)
        db.session.commit()
        return len(expired_tokens)
    
    def to_dict(self):
        """Convert refresh token to dictionary."""
        return {
            'id': self.id,
            'token': self.token,
            'expires_at': self.expires_at.isoformat(),
            'created_at': self.created_at.isoformat(),
            'revoked': self.revoked
        }
