"""
Campaign schemas for request validation.
"""

from marshmallow import Schema, fields, validates, ValidationError, validate
from datetime import datetime


class CampaignCreateSchema(Schema):
    """Schema for campaign creation validation."""
    
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255), error_messages={
        'required': 'Campaign name is required'
    })
    subject = fields.Str(required=True, validate=validate.Length(min=1, max=500), error_messages={
        'required': 'Subject is required'
    })
    body = fields.Str(required=True, validate=validate.Length(min=1), error_messages={
        'required': 'Email body is required'
    })
    sender_name = fields.Str(required=False, validate=validate.Length(max=255))
    sender_email = fields.Email(required=False, error_messages={
        'invalid': 'Invalid sender email format'
    })
    recipient_emails = fields.Str(required=False)  # Comma-separated emails
    contact_list_id = fields.Int(required=False)
    scheduled_at = fields.DateTime(required=False, allow_none=True)
    status = fields.Str(missing='draft', validate=validate.OneOf(['draft', 'scheduled', 'sending', 'sent', 'failed']))
    
    @validates('scheduled_at')
    def validate_scheduled_at(self, value):
        """Validate scheduled date is in the future."""
        if value and value <= datetime.utcnow():
            raise ValidationError('Scheduled date must be in the future')
    
    @validates('recipient_emails')
    def validate_recipient_emails(self, value):
        """Validate comma-separated email list."""
        if value:
            emails = [e.strip() for e in value.split(',')]
            if len(emails) > 1000:
                raise ValidationError('Maximum 1000 recipients per campaign')
            
            # Basic email format check
            email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
            invalid_emails = [e for e in emails if not email_pattern.match(e)]
            if invalid_emails:
                raise ValidationError(f'Invalid email format: {", ".join(invalid_emails[:5])}')


class CampaignUpdateSchema(Schema):
    """Schema for campaign update validation."""
    
    name = fields.Str(required=False, validate=validate.Length(min=1, max=255))
    subject = fields.Str(required=False, validate=validate.Length(min=1, max=500))
    body = fields.Str(required=False, validate=validate.Length(min=1))
    sender_name = fields.Str(required=False, validate=validate.Length(max=255))
    sender_email = fields.Email(required=False)
    recipient_emails = fields.Str(required=False)
    contact_list_id = fields.Int(required=False)
    scheduled_at = fields.DateTime(required=False, allow_none=True)
    status = fields.Str(required=False, validate=validate.OneOf(['draft', 'scheduled', 'sending', 'sent', 'failed']))
    
    @validates('scheduled_at')
    def validate_scheduled_at(self, value):
        """Validate scheduled date is in the future."""
        if value and value <= datetime.utcnow():
            raise ValidationError('Scheduled date must be in the future')


class TestEmailSchema(Schema):
    """Schema for test email sending."""
    
    subject = fields.Str(required=True, validate=validate.Length(min=1, max=500))
    body = fields.Str(required=True, validate=validate.Length(min=1))
    recipient_email = fields.Email(required=True, error_messages={
        'required': 'Recipient email is required',
        'invalid': 'Invalid email format'
    })
    sender_name = fields.Str(required=False, validate=validate.Length(max=255))
    sender_email = fields.Email(required=False)


import re
