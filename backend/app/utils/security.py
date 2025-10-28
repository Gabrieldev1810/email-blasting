"""
Security middleware for production deployment.
Adds security headers and input validation.
"""

from functools import wraps
from flask import request, g, current_app, make_response
import re
import html
from email_validator import validate_email, EmailNotValidError


class SecurityMiddleware:
    """Security middleware for Flask application."""
    
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize security middleware with Flask app."""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
    
    def before_request(self):
        """Execute before each request for security checks."""
        # Rate limiting check (if configured)
        if self._should_rate_limit():
            return {'error': 'Rate limit exceeded'}, 429
        
        # Content length check
        max_content_length = current_app.config.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)  # 16MB default
        if request.content_length and request.content_length > max_content_length:
            return {'error': 'Request too large'}, 413
    
    def after_request(self, response):
        """Execute after each request to add security headers."""
        if current_app.config.get('SECURITY_HEADERS'):
            for header, value in current_app.config['SECURITY_HEADERS'].items():
                response.headers[header] = value
        
        # Add CORS headers for production
        if current_app.config.get('ENV') == 'production':
            allowed_origins = current_app.config.get('CORS_ORIGINS', [])
            origin = request.headers.get('Origin')
            if origin in allowed_origins:
                response.headers['Access-Control-Allow-Origin'] = origin
        
        return response
    
    def _should_rate_limit(self):
        """Check if request should be rate limited."""
        # Simple in-memory rate limiting - replace with Redis for production
        return False


def validate_input(schema):
    """Decorator to validate request input against schema."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.is_json:
                data = request.get_json()
                validation_errors = validate_request_data(data, schema)
                if validation_errors:
                    return {'error': 'Validation failed', 'details': validation_errors}, 400
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_request_data(data, schema):
    """Validate request data against schema."""
    errors = []
    
    if not data:
        return ['Request data is required']
    
    for field, rules in schema.items():
        value = data.get(field)
        
        # Required field check
        if rules.get('required', False) and not value:
            errors.append(f'{field} is required')
            continue
        
        if value is None:
            continue
        
        # Type validation
        field_type = rules.get('type')
        if field_type == 'email':
            try:
                validate_email(value)
            except EmailNotValidError:
                errors.append(f'{field} must be a valid email address')
        
        elif field_type == 'string':
            if not isinstance(value, str):
                errors.append(f'{field} must be a string')
            else:
                # Length validation
                min_length = rules.get('min_length')
                max_length = rules.get('max_length')
                if min_length and len(value) < min_length:
                    errors.append(f'{field} must be at least {min_length} characters')
                if max_length and len(value) > max_length:
                    errors.append(f'{field} must be no more than {max_length} characters')
        
        elif field_type == 'integer':
            if not isinstance(value, int):
                errors.append(f'{field} must be an integer')
        
        # Pattern validation
        pattern = rules.get('pattern')
        if pattern and isinstance(value, str):
            if not re.match(pattern, value):
                errors.append(f'{field} format is invalid')
    
    return errors


def sanitize_input(data):
    """Sanitize input data to prevent XSS attacks."""
    if isinstance(data, str):
        return html.escape(data.strip())
    elif isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    return data


def require_auth():
    """Decorator to require authentication."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from flask_jwt_extended import verify_jwt_in_request
            try:
                verify_jwt_in_request()
                return f(*args, **kwargs)
            except Exception:
                return {'error': 'Authentication required'}, 401
        return decorated_function
    return decorator


def require_admin():
    """Decorator to require admin privileges."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from flask_jwt_extended import get_jwt_identity
            from app.models.user import User
            
            try:
                user_id = get_jwt_identity()
                user = User.query.get(user_id)
                if not user or not user.is_admin:
                    return {'error': 'Admin privileges required'}, 403
                return f(*args, **kwargs)
            except Exception:
                return {'error': 'Authentication required'}, 401
        return decorated_function
    return decorator


# Common validation schemas
USER_SCHEMA = {
    'email': {'type': 'email', 'required': True},
    'password': {'type': 'string', 'required': True, 'min_length': 8, 'max_length': 128},
    'first_name': {'type': 'string', 'required': True, 'min_length': 1, 'max_length': 50},
    'last_name': {'type': 'string', 'required': True, 'min_length': 1, 'max_length': 50}
}

CONTACT_SCHEMA = {
    'email': {'type': 'email', 'required': True},
    'first_name': {'type': 'string', 'required': False, 'max_length': 50},
    'last_name': {'type': 'string', 'required': False, 'max_length': 50},
    'company': {'type': 'string', 'required': False, 'max_length': 100}
}

CAMPAIGN_SCHEMA = {
    'name': {'type': 'string', 'required': True, 'min_length': 1, 'max_length': 100},
    'subject': {'type': 'string', 'required': True, 'min_length': 1, 'max_length': 200},
    'content': {'type': 'string', 'required': True, 'min_length': 1},
    'sender_name': {'type': 'string', 'required': True, 'max_length': 50}
}