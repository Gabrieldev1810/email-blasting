"""
Marshmallow validation utilities and decorators.
"""

from functools import wraps
from flask import request, jsonify
from marshmallow import ValidationError


def validate_request(schema_class):
    """
    Decorator to validate request data against a marshmallow schema.
    
    Usage:
        @app.route('/api/auth/login', methods=['POST'])
        @validate_request(LoginSchema)
        def login():
            # request.validated_data contains validated data
            pass
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get JSON data from request
            if not request.is_json:
                return jsonify({
                    'error': 'Content-Type must be application/json'
                }), 400
            
            data = request.get_json()
            
            # Instantiate schema and validate
            schema = schema_class()
            try:
                validated_data = schema.load(data)
                # Attach validated data to request object
                request.validated_data = validated_data
            except ValidationError as err:
                return jsonify({
                    'error': 'Validation failed',
                    'details': err.messages
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_query_params(schema_class):
    """
    Decorator to validate query parameters against a marshmallow schema.
    
    Usage:
        @app.route('/api/contacts', methods=['GET'])
        @validate_query_params(ContactListSchema)
        def list_contacts():
            # request.validated_params contains validated query params
            pass
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get query parameters
            params = request.args.to_dict()
            
            # Instantiate schema and validate
            schema = schema_class()
            try:
                validated_params = schema.load(params)
                # Attach validated params to request object
                request.validated_params = validated_params
            except ValidationError as err:
                return jsonify({
                    'error': 'Invalid query parameters',
                    'details': err.messages
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
