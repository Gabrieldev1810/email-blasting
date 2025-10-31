from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app import db, limiter
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.utils.validation import validate_request
from app.schemas.auth_schemas import LoginSchema, RegisterSchema
from app.schemas.refresh_token_schema import RefreshTokenSchema

bp = Blueprint('auth', __name__)

@bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint for auth routes."""
    return {'status': 'ok', 'service': 'auth'}

@bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")  # Limit login attempts
@validate_request(LoginSchema)
def login():
    """Login endpoint for users."""
    try:
        data = request.validated_data
        
        user = User.query.filter_by(email=data['email']).first()
        
        if user and user.check_password(data['password']) and user.is_active:
            # Create access token
            access_token = user.generate_auth_token()
            
            # Create refresh token
            refresh_token = RefreshToken(user_id=user.id)
            db.session.add(refresh_token)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'access_token': access_token,
                'refresh_token': refresh_token.token,
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
@limiter.limit("3 per hour")  # Limit registrations
@validate_request(RegisterSchema)
def register():
    """Register new user (for development purposes)."""
    try:
        data = request.validated_data
        
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
        
        # Create refresh token
        refresh_token = RefreshToken(user_id=user.id)
        db.session.add(refresh_token)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'access_token': access_token,
            'refresh_token': refresh_token.token,
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

@bp.route('/refresh', methods=['POST'])
@limiter.limit("10 per minute")  # Limit refresh attempts
@validate_request(RefreshTokenSchema)
def refresh():
    """Refresh access token using a valid refresh token."""
    try:
        data = request.validated_data
        token_string = data['refresh_token']
        
        # Find the refresh token
        refresh_token = RefreshToken.query.filter_by(token=token_string).first()
        
        if not refresh_token:
            return jsonify({
                'success': False,
                'error': 'Invalid refresh token'
            }), 401
        
        # Validate the token
        if not refresh_token.is_valid():
            return jsonify({
                'success': False,
                'error': 'Refresh token has expired or been revoked'
            }), 401
        
        # Get the user
        user = User.query.get(refresh_token.user_id)
        if not user or not user.is_active:
            return jsonify({
                'success': False,
                'error': 'User not found or inactive'
            }), 401
        
        # Generate new access token
        new_access_token = user.generate_auth_token()
        
        # Optional: Rotate refresh token (revoke old, issue new)
        # For now, we'll keep the same refresh token
        # To enable rotation, uncomment the following:
        # refresh_token.revoke()
        # new_refresh_token = RefreshToken(user_id=user.id)
        # db.session.add(new_refresh_token)
        # db.session.commit()
        # return new_refresh_token.token in response
        
        return jsonify({
            'success': True,
            'access_token': new_access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role.value
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Token refresh error: {str(e)}'
        }), 500

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
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': user.full_name,
                'department': user.department,
                'position': user.position,
                'role': user.role.value,
                'is_admin': user.is_admin(),
                'is_manager': user.is_manager(),
                'can_create_campaigns': user.can_create_campaigns()
            }
        })
    
    return _get_user()

@bp.route('/profile', methods=['PUT'])
def update_profile():
    """Update current user profile (requires authentication)."""
    from app.middleware.auth import authenticated_required
    from flask import g
    
    @authenticated_required
    def _update_profile():
        user = g.current_user
        data = request.get_json()
        
        # Update allowed fields
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'department' in data:
            user.department = data['department']
        if 'position' in data:
            user.position = data['position']
        
        # Update password if provided
        if 'current_password' in data and 'new_password' in data:
            if user.check_password(data['current_password']):
                user.set_password(data['new_password'])
            else:
                return jsonify({
                    'success': False,
                    'error': 'Current password is incorrect'
                }), 400
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': user.full_name,
                'department': user.department,
                'position': user.position,
                'role': user.role.value
            }
        })
    
    return _update_profile()

@bp.route('/profile/request-update', methods=['POST', 'OPTIONS'])
def request_profile_update():
    """Request profile update (sends notification to admin)."""
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200
    
    from app.middleware.auth import authenticated_required
    return authenticated_required(lambda user: _request_profile_update(user))()

def _request_profile_update(user):
    """Handle profile update request."""
    from app.routes.notifications import create_notification
    
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'success': False,
                'error': 'Update request message is required'
            }), 400
        
        message = data.get('message', '').strip()
        current_profile = data.get('current_profile', {})
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Update request message cannot be empty'
            }), 400
        
        # Get all admin users
        admin_users = User.query.filter_by(is_admin=True).all()
        
        if not admin_users:
            return jsonify({
                'success': False,
                'error': 'No administrators found'
            }), 404
        
        # Create notification for each admin
        notification_title = f"Profile Update Request from {user.first_name} {user.last_name}"
        notification_message = f"{message}\n\nCurrent Profile:\n"
        notification_message += f"Name: {current_profile.get('first_name', '')} {current_profile.get('last_name', '')}\n"
        notification_message += f"Department: {current_profile.get('department', 'Not set')}\n"
        notification_message += f"Position: {current_profile.get('position', 'Not set')}"
        
        for admin in admin_users:
            create_notification(
                user_id=admin.id,
                type='PROFILE_UPDATE_REQUEST',
                title=notification_title,
                message=notification_message,
                status='pending'
            )
        
        return jsonify({
            'success': True,
            'message': 'Profile update request sent to administrators'
        }), 200
        
    except Exception as e:
        print(f"Error creating profile update request: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500