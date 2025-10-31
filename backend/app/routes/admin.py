import logging

logger = logging.getLogger(__name__)
from flask import Blueprint, request, jsonify
from app import db, limiter
from app.models.user import User, UserRole
from app.models.smtp_settings import SMTPSettings
from app.middleware.auth import authenticated_required, admin_required
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users', methods=['GET'])
@authenticated_required
@admin_required
def get_all_users():
    """Get all users for admin management."""
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        
        users_data = []
        for user in users:
            user_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': user.full_name,
                'role': user.role.value,
                'is_active': user.is_active,
                'smtp_settings_id': user.smtp_settings_id,
                'smtp_settings': None,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'total_campaigns': len(user.campaigns),
                'total_contacts': len(user.contacts)
            }
            
            # Include SMTP settings info if assigned
            if user.assigned_smtp:
                user_data['smtp_settings'] = {
                    'id': user.assigned_smtp.id,
                    'provider': user.assigned_smtp.provider,
                    'host': user.assigned_smtp.host,
                    'username': user.assigned_smtp.username,
                    'sender_name': user.assigned_smtp.sender_name,
                    'sender_email': user.assigned_smtp.sender_email
                }
            
            users_data.append(user_data)
        
        return jsonify({
            'success': True,
            'users': users_data,
            'total': len(users_data)
        })
        
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/users', methods=['POST'])
@authenticated_required
@admin_required
def create_user():
    """Create a new user (manager)."""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'first_name', 'last_name', 'role']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'success': False, 'error': 'User with this email already exists'}), 400
        
        # Validate role
        try:
            role = UserRole(data['role'])
        except ValueError:
            return jsonify({'success': False, 'error': 'Invalid role specified'}), 400
        
        # Create new user
        new_user = User(
            email=data['email'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=role,
            is_active=data.get('is_active', True)
        )
        
        # Assign SMTP settings if provided
        if 'smtp_settings_id' in data and data['smtp_settings_id']:
            smtp_settings = SMTPSettings.query.get(data['smtp_settings_id'])
            if smtp_settings:
                new_user.assign_smtp_settings(data['smtp_settings_id'])
            else:
                return jsonify({'success': False, 'error': 'Invalid SMTP settings ID'}), 400
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': {
                'id': new_user.id,
                'email': new_user.email,
                'first_name': new_user.first_name,
                'last_name': new_user.last_name,
                'role': new_user.role.value,
                'smtp_settings_id': new_user.smtp_settings_id
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating user: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@authenticated_required
@admin_required
def get_user(user_id):
    """Get a specific user by ID."""
    try:
        user = User.query.get_or_404(user_id)
        
        user_data = {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.full_name,
            'role': user.role.value,
            'is_active': user.is_active,
            'smtp_settings_id': user.smtp_settings_id,
            'smtp_settings': None,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'total_campaigns': len(user.campaigns),
            'total_contacts': len(user.contacts)
        }
        
        # Include SMTP settings info if assigned
        if user.assigned_smtp:
            user_data['smtp_settings'] = {
                'id': user.assigned_smtp.id,
                'provider': user.assigned_smtp.provider,
                'host': user.assigned_smtp.host,
                'username': user.assigned_smtp.username,
                'sender_name': user.assigned_smtp.sender_name,
                'sender_email': user.assigned_smtp.sender_email
            }
        
        return jsonify({
            'success': True,
            'user': user_data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>/smtp', methods=['PUT'])
@authenticated_required
@admin_required
def assign_smtp_to_user(user_id):
    """Assign SMTP settings to a user."""
    try:
        data = request.get_json()
        
        user = User.query.get_or_404(user_id)
        smtp_settings_id = data.get('smtp_settings_id')
        
        if smtp_settings_id:
            # Validate SMTP settings exists
            smtp_settings = SMTPSettings.query.get(smtp_settings_id)
            if not smtp_settings:
                return jsonify({'success': False, 'error': 'SMTP settings not found'}), 404
            
            user.assign_smtp_settings(smtp_settings_id)
        else:
            # Remove SMTP assignment
            user.smtp_settings_id = None
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'SMTP assignment updated successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'smtp_settings_id': user.smtp_settings_id
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error assigning SMTP to user: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/smtp-settings', methods=['GET'])
@limiter.exempt  # Exempt from rate limiting - this is a frequently accessed read-only endpoint
@authenticated_required
@admin_required
def get_all_smtp_settings():
    """Get all SMTP settings for admin selection."""
    try:
        smtp_settings = SMTPSettings.query.all()
        
        smtp_data = []
        for smtp in smtp_settings:
            smtp_data.append({
                'id': smtp.id,
                'provider': smtp.provider,
                'host': smtp.host,
                'port': smtp.port,
                'username': smtp.username,
                'sender_name': smtp.sender_name,
                'sender_email': smtp.sender_email,
                'is_configured': smtp.is_configured,
                'user_id': smtp.user_id,
                'created_at': smtp.created_at.isoformat() if smtp.created_at else None
            })
        
        return jsonify({
            'success': True,
            'smtp_settings': smtp_data,
            'total': len(smtp_data)
        })
        
    except Exception as e:
        logger.error(f"Error fetching SMTP settings: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@authenticated_required
@admin_required
def update_user(user_id):
    """Update user details."""
    try:
        data = request.get_json()
        user = User.query.get_or_404(user_id)
        
        # Update allowed fields
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'role' in data:
            try:
                user.role = UserRole(data['role'])
            except ValueError:
                return jsonify({'success': False, 'error': 'Invalid role specified'}), 400
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User updated successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role.value,
                'is_active': user.is_active,
                'smtp_settings_id': user.smtp_settings_id
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating user: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@authenticated_required
@admin_required
def delete_user(user_id):
    """Delete a user."""
    try:
        user = User.query.get_or_404(user_id)
        
        # Prevent deleting admin users
        if user.role == UserRole.ADMIN:
            return jsonify({'success': False, 'error': 'Cannot delete admin users'}), 400
        
        # Store user info for response
        user_info = f"{user.full_name} ({user.email})"
        
        # Delete the user (cascade will handle related records)
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User {user_info} deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting user: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500