from app import db
from datetime import datetime

class SMTPSettings(db.Model):
    __tablename__ = 'smtp_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # SMTP Configuration
    provider = db.Column(db.String(50), nullable=False, default='gmail')
    host = db.Column(db.String(255), nullable=False)
    port = db.Column(db.Integer, nullable=False, default=587)
    username = db.Column(db.String(255), nullable=False)
    password = db.Column(db.String(500), nullable=False)  # Should be encrypted in production
    encryption = db.Column(db.String(10), nullable=False, default='tls')
    
    # Sender Information
    sender_name = db.Column(db.String(255))
    sender_email = db.Column(db.String(255))
    
    # Status
    is_configured = db.Column(db.Boolean, default=False)
    last_tested_at = db.Column(db.DateTime)
    test_status = db.Column(db.String(20))  # 'success', 'failed', 'pending'
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_password(self):
        """Return the password (for compatibility with SMTPConfig)."""
        return self.password
    
    def to_dict(self):
        return {
            'id': self.id,
            'provider': self.provider,
            'host': self.host,
            'port': self.port,
            'username': self.username,
            'password': '••••••••' if self.password else '',  # Mask password in response
            'encryption': self.encryption,
            'sender_name': self.sender_name,
            'sender_email': self.sender_email,
            'is_configured': self.is_configured,
            'last_tested_at': self.last_tested_at.isoformat() if self.last_tested_at else None,
            'test_status': self.test_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }