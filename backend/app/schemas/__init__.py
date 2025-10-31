"""
Marshmallow schemas for request validation and serialization.
"""

from .auth_schemas import LoginSchema, RegisterSchema
from .campaign_schemas import CampaignCreateSchema, CampaignUpdateSchema, TestEmailSchema
from .contact_schemas import ContactCreateSchema, ContactBulkUploadSchema
from .smtp_schemas import SMTPSettingsSchema
from .refresh_token_schema import RefreshTokenSchema

__all__ = [
    'LoginSchema',
    'RegisterSchema',
    'CampaignCreateSchema',
    'CampaignUpdateSchema',
    'TestEmailSchema',
    'ContactCreateSchema',
    'ContactBulkUploadSchema',
    'SMTPSettingsSchema',
    'RefreshTokenSchema',
]
