"""
Production logging configuration for Beacon Blast Email Marketing Platform.
Provides structured logging with different levels for production deployment.
"""

import logging
import logging.handlers
import os
from datetime import datetime

def setup_production_logging():
    """Configure production-appropriate logging."""
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Clear any existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # File handler for all logs with rotation
    file_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, 'beacon_blast.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)
    
    # Error file handler for errors only
    error_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, 'beacon_blast_errors.log'),
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=3
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    root_logger.addHandler(error_handler)
    
    # Console handler for production (only warnings and errors)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Set up specific loggers
    setup_module_loggers()
    
    logging.info("Production logging configuration initialized")

def setup_module_loggers():
    """Configure specific loggers for different modules."""
    
    # Email service logger
    email_logger = logging.getLogger('email_service')
    email_logger.setLevel(logging.INFO)
    
    # Campaign logger
    campaign_logger = logging.getLogger('campaigns')
    campaign_logger.setLevel(logging.INFO)
    
    # Tracking logger
    tracking_logger = logging.getLogger('tracking')
    tracking_logger.setLevel(logging.INFO)
    
    # Authentication logger
    auth_logger = logging.getLogger('auth')
    auth_logger.setLevel(logging.INFO)
    
    # Database logger
    db_logger = logging.getLogger('database')
    db_logger.setLevel(logging.WARNING)  # Only log warnings/errors for DB

def get_logger(name):
    """Get a logger instance for a specific module."""
    return logging.getLogger(name)

# Security-focused logging functions
def log_security_event(event_type, user_id=None, ip_address=None, details=None):
    """Log security-related events."""
    security_logger = logging.getLogger('security')
    message = f"SECURITY_EVENT: {event_type}"
    if user_id:
        message += f" | User: {user_id}"
    if ip_address:
        message += f" | IP: {ip_address}"
    if details:
        message += f" | Details: {details}"
    security_logger.warning(message)

def log_api_access(endpoint, method, user_id=None, status_code=None, response_time=None):
    """Log API access for monitoring."""
    api_logger = logging.getLogger('api_access')
    message = f"API_ACCESS: {method} {endpoint}"
    if user_id:
        message += f" | User: {user_id}"
    if status_code:
        message += f" | Status: {status_code}"
    if response_time:
        message += f" | Time: {response_time:.3f}s"
    api_logger.info(message)

def log_email_event(event_type, campaign_id=None, contact_id=None, details=None):
    """Log email-related events for tracking."""
    email_logger = logging.getLogger('email_events')
    message = f"EMAIL_EVENT: {event_type}"
    if campaign_id:
        message += f" | Campaign: {campaign_id}"
    if contact_id:
        message += f" | Contact: {contact_id}"
    if details:
        message += f" | Details: {details}"
    email_logger.info(message)