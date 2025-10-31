"""
Contact schemas for request validation.
"""

from marshmallow import Schema, fields, validates, ValidationError, validate


class ContactCreateSchema(Schema):
    """Schema for contact creation validation."""
    
    email = fields.Email(required=True, error_messages={
        'required': 'Email is required',
        'invalid': 'Invalid email format'
    })
    first_name = fields.Str(required=False, validate=validate.Length(max=100))
    last_name = fields.Str(required=False, validate=validate.Length(max=100))
    company = fields.Str(required=False, validate=validate.Length(max=200))
    phone = fields.Str(required=False, validate=validate.Length(max=20))
    tags = fields.Str(required=False)  # Comma-separated tags
    
    @validates('email')
    def validate_email(self, value):
        """Additional email validation."""
        if len(value) > 255:
            raise ValidationError('Email is too long')


class ContactBulkUploadSchema(Schema):
    """Schema for bulk contact upload validation."""
    
    file = fields.Field(required=True, error_messages={
        'required': 'CSV file is required'
    })
    
    @validates('file')
    def validate_file(self, value):
        """Validate uploaded file."""
        if not value:
            raise ValidationError('File is required')
        
        # File type validation (done in route with werkzeug)
        # Size validation (done in route)


class ContactListSchema(Schema):
    """Schema for contact list filtering."""
    
    page = fields.Int(missing=1, validate=validate.Range(min=1))
    per_page = fields.Int(missing=20, validate=validate.Range(min=1, max=100))
    search = fields.Str(required=False)
    tags = fields.Str(required=False)  # Comma-separated tags
