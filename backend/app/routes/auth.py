from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app import db
from app.models.user import User

bp = Blueprint('auth', __name__)

@bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint for auth routes."""
    return {'status': 'ok', 'service': 'auth'}

@bp.route('/login', methods=['POST'])
def login():
    """Login endpoint for users."""
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password required'}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        
        if user and user.check_password(data['password']) and user.is_active:
            # Create access token
            access_token = user.generate_auth_token()
            
            return jsonify({
                'success': True,
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role.value,
                    'is_admin': user.is_admin(),
                    'is_manager': user.is_manager(),
                    'can_create_campaigns': user.can_create_campaigns()
                }
            }), 200
        
        return jsonify({'error': 'Invalid email or password'}), 401
        
    except Exception as e:
        return jsonify({'error': f'Login error: {str(e)}'}), 500

@bp.route('/register', methods=['POST'])
def register():
    """Register new user (for development purposes)."""
    try:
        data = request.get_json()
        
        required_fields = ['email', 'password']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'User with this email already exists'}), 409
        
        # Create new user
        user = User(
            email=data['email'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Create access token
        access_token = user.generate_auth_token()
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role.value,
                'is_admin': user.is_admin(),
                'is_manager': user.is_manager(),
                'can_create_campaigns': user.can_create_campaigns()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Registration error: {str(e)}'}), 500

@bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current user info (requires authentication)."""
    from app.middleware.auth import authenticated_required
    from flask import g
    
    @authenticated_required
    def _get_user():
        user = g.current_user
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role.value,
                'is_admin': user.is_admin(),
                'is_manager': user.is_manager(),
                'can_create_campaigns': user.can_create_campaigns()
            }
        })
    
    return _get_user()