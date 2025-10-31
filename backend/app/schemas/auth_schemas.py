"""
Authentication schemas for request validation.
"""

from marshmallow import Schema, fields, validates, ValidationError
import re


class LoginSchema(Schema):
    """Schema for login request validation."""
    
    email = fields.Email(required=True, error_messages={
        'required': 'Email is required',
        'invalid': 'Invalid email format'
    })
    password = fields.Str(required=True, error_messages={
        'required': 'Password is required'
    })


class RegisterSchema(Schema):
    """Schema for user registration validation."""
    
    email = fields.Email(required=True, error_messages={
        'required': 'Email is required',
        'invalid': 'Invalid email format'
    })
    password = fields.Str(required=True, error_messages={
        'required': 'Password is required'
    })
    first_name = fields.Str(required=True, error_messages={
        'required': 'First name is required'
    })
    last_name = fields.Str(required=True, error_messages={
        'required': 'Last name is required'
    })
    role = fields.Str(missing='user', validate=lambda x: x in ['admin', 'manager', 'user'])
    
    @validates('password')
    def validate_password(self, value):
        """Validate password strength."""
        if len(value) < 8:
            raise ValidationError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', value):
            raise ValidationError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', value):
            raise ValidationError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', value):
            raise ValidationError('Password must contain at least one number')
    
    @validates('email')
    def validate_email(self, value):
        """Validate email uniqueness (can be done in route)."""
        # Additional email validation if needed
        if len(value) > 255:
            raise ValidationError('Email is too long')
