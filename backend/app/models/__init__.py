# Import all models to make them available for migrations
from .user import User
from .campaign import Campaign  
from .contact import Contact
from .smtp_account import SMTPAccount, UserSMTPAssignment
from .upload import Upload
from .email_log import EmailLog, LinkClick
from .refresh_token import RefreshToken

# Keep old models for migration purposes - will be removed later
from .smtp_config import SMTPConfig

__all__ = [
    'User', 'Campaign', 'Contact', 'SMTPAccount', 'UserSMTPAssignment',
    'Upload', 'EmailLog', 'LinkClick', 'RefreshToken', 'SMTPConfig'
]