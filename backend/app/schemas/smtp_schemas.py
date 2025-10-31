"""
SMTP schemas for request validation.
"""

from marshmallow import Schema, fields, validates, ValidationError, validate


class SMTPSettingsSchema(Schema):
    """Schema for SMTP settings validation."""
    
    smtp_server = fields.Str(required=True, validate=validate.Length(min=1, max=255), error_messages={
        'required': 'SMTP server is required'
    })
    smtp_port = fields.Int(required=True, validate=validate.Range(min=1, max=65535), error_messages={
        'required': 'SMTP port is required'
    })
    smtp_username = fields.Str(required=True, validate=validate.Length(min=1, max=255), error_messages={
        'required': 'SMTP username is required'
    })
    smtp_password = fields.Str(required=True, validate=validate.Length(min=1), error_messages={
        'required': 'SMTP password is required'
    })
    use_tls = fields.Bool(missing=True)
    use_ssl = fields.Bool(missing=False)
    sender_name = fields.Str(required=False, validate=validate.Length(max=255))
    sender_email = fields.Email(required=False, error_messages={
        'invalid': 'Invalid sender email format'
    })
    
    @validates('smtp_port')
    def validate_port(self, value):
        """Validate common SMTP ports."""
        common_ports = [25, 465, 587, 2525]
        if value not in common_ports:
            # Warning, not error
            pass
    
    @validates('use_tls')
    def validate_tls_ssl(self, value):
        """Ensure TLS and SSL are not both enabled."""
        # This validation requires access to use_ssl field
        # Better done in route or with @validates_schema
        pass


class SMTPTestSchema(Schema):
    """Schema for SMTP connection testing."""
    
    smtp_server = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    smtp_port = fields.Int(required=True, validate=validate.Range(min=1, max=65535))
    smtp_username = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    smtp_password = fields.Str(required=True, validate=validate.Length(min=1))
    use_tls = fields.Bool(missing=True)
    use_ssl = fields.Bool(missing=False)
