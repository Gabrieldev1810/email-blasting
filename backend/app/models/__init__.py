# Import all models to make them available for migrations
from .user import User
from .campaign import Campaign  
from .contact import Contact
from .smtp_config import SMTPConfig
from .upload import Upload
from .email_log import EmailLog, LinkClick

__all__ = ['User', 'Campaign', 'Contact', 'SMTPConfig', 'Upload', 'EmailLog', 'LinkClick']