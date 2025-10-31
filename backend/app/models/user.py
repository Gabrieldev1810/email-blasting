from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from enum import Enum as PyEnum
from app import db

class UserRole(PyEnum):
    """Enumeration for user roles."""
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    USER = "USER"
    VIEWER = "VIEWER"

class User(db.Model):
    """User model for authentication and user management."""
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255))
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    role = db.Column(db.Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    department = db.Column(db.String(100), nullable=True)
    position = db.Column(db.String(100), nullable=True)
    
    # SMTP Configuration Assignment
    smtp_settings_id = db.Column(db.Integer, db.ForeignKey('smtp_settings.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    campaigns = db.relationship('Campaign', backref='user', lazy=True, cascade='all, delete-orphan')
    contacts = db.relationship('Contact', backref='user', lazy=True, cascade='all, delete-orphan')
    assigned_smtp = db.relationship('SMTPSettings', foreign_keys=[smtp_settings_id], lazy=True)
    
    def __init__(self, email, password, **kwargs):
        self.email = email
        self.set_password(password)
        
        # Set role - automatically assign manager if email is in manager list
        if email in self.MANAGER_EMAILS:
            self.role = UserRole.MANAGER
        else:
            self.role = kwargs.get('role', UserRole.USER)
        
        for key, value in kwargs.items():
            if hasattr(self, key) and key != 'role':  # Role already handled above
                setattr(self, key, value)
    
    def set_password(self, password):
        """Hash and set the user's password."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if the provided password matches the user's password."""
        return check_password_hash(self.password_hash, password)
    
    def generate_auth_token(self):
        """Generate JWT access token for the user."""
        return create_access_token(identity=str(self.id))
    
    # Manager email configuration - these 4 emails have manager access
    MANAGER_EMAILS = [
        'manager1@beaconblast.com',
        'manager2@beaconblast.com', 
        'manager3@beaconblast.com',
        'manager4@beaconblast.com'
    ]
    
    @property
    def username(self):
        """Get username (using email as username)."""
        return self.email
    
    @property
    def full_name(self):
        """Get user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name or self.email.split('@')[0]
    
    @property
    def company(self):
        """Get company name (placeholder - not implemented yet)."""
        return None
    
    @property
    def timezone(self):
        """Get user timezone (placeholder - not implemented yet)."""
        return 'UTC'
    
    @property
    def is_verified(self):
        """Check if user email is verified (placeholder - not implemented yet)."""
        return True
    
    @property
    def last_login(self):
        """Get last login time (placeholder - not implemented yet)."""
        return None
    
    def is_admin(self):
        """Check if user has admin role."""
        return self.role == UserRole.ADMIN
    
    def is_manager(self):
        """Check if user has manager role or is in manager emails list."""
        return self.role == UserRole.MANAGER or self.email in self.MANAGER_EMAILS
    
    def can_create_campaigns(self):
        """Check if user can create campaigns (Admin or Manager only)."""
        return self.is_admin() or self.is_manager()
    
    def can_manage_contacts(self):
        """Check if user can manage contacts."""
        return self.role in [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER]
    
    def can_view_analytics(self):
        """Check if user can view analytics."""
        return True  # All roles can view basic analytics
    
    def set_manager_role_if_applicable(self):
        """Automatically set manager role if email is in manager list."""
        if self.email in self.MANAGER_EMAILS:
            self.role = UserRole.MANAGER
    
    def get_smtp_settings(self):
        """Get the SMTP settings assigned to this user, fallback to global settings."""
        if self.assigned_smtp:
            return self.assigned_smtp
        
        # Fallback to global SMTP settings
        from app.models.smtp_settings import SMTPSettings
        return SMTPSettings.query.filter_by(user_id=None).first() or SMTPSettings.query.first()
    
    def assign_smtp_settings(self, smtp_settings_id):
        """Assign SMTP settings to this user."""
        self.smtp_settings_id = smtp_settings_id
    
    def to_dict(self, include_sensitive=False):
        """Convert user object to dictionary."""
        data = {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'department': self.department,
            'position': self.position,
            'company': self.company,
            'timezone': self.timezone,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }
        
        if include_sensitive:
            data['total_campaigns'] = len(self.campaigns)
            data['total_contacts'] = len(self.contacts)
        
        return data
    
    def __repr__(self):
        return f'<User {self.username}>'