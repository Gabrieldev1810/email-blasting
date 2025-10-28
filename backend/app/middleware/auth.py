"""
Role-based access control decorators and middleware for Flask routes.
"""
from functools import wraps
from flask import request, jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models.user import User, UserRole

def role_required(*allowed_roles):
    """
    Decorator to restrict access to routes based on user roles.
    
    Usage:
        @role_required(UserRole.ADMIN, UserRole.MANAGER)
        def admin_only_route():
            pass
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Verify JWT token
                verify_jwt_in_request()
                user_id = get_jwt_identity()
                
                # Convert string identity back to int
                if isinstance(user_id, str):
                    user_id = int(user_id)
                
                # Get user from database
                user = User.query.get(user_id)
                if not user or not user.is_active:
                    return jsonify({'error': 'User not found or inactive'}), 401
                
                # Check if user role is in allowed roles
                if user.role not in allowed_roles:
                    return jsonify({
                        'error': 'Insufficient permissions',
                        'required_roles': [role.value for role in allowed_roles],
                        'user_role': user.role.value
                    }), 403
                
                # Add user to Flask's g object for use in the route
                g.current_user = user
                
                return f(*args, **kwargs)
                
            except Exception as e:
                return jsonify({'error': f'Authentication error: {str(e)}'}), 401
                
        return decorated_function
    return decorator

def admin_required(f):
    """Decorator to restrict access to admin users only."""
    return role_required(UserRole.ADMIN)(f)

def manager_or_admin_required(f):
    """Decorator to restrict access to managers and admins only."""
    return role_required(UserRole.ADMIN, UserRole.MANAGER)(f)

def authenticated_required(f):
    """Decorator to require authentication but allow any role."""
    return role_required(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)(f)

def can_create_campaigns(f):
    """Decorator to check if user can create campaigns."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            
            if not user.can_create_campaigns():
                return jsonify({
                    'error': 'You do not have permission to create campaigns',
                    'required': 'Admin or Manager role'
                }), 403
            
            g.current_user = user
            return f(*args, **kwargs)
            
        except Exception as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
            
    return decorated_function