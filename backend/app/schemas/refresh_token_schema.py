"""
Refresh Token Validation Schemas
"""
from marshmallow import Schema, fields

class RefreshTokenSchema(Schema):
    """Schema for refresh token requests."""
    refresh_token = fields.Str(required=True)
