"""
Admin SMTP Account Management Routes
Admin-only endpoints for creating, managing, and assigning SMTP accounts
"""
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User, UserRole
from app.models.smtp_account import SMTPAccount, UserSMTPAssignment
from datetime import datetime
import smtplib
import ssl
from functools import wraps

logger = logging.getLogger(__name__)

smtp_admin_bp = Blueprint('smtp_admin', __name__)

def admin_required(f):
    """Decorator to require admin role for endpoint access."""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != UserRole.ADMIN:
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
            
        return f(*args, **kwargs)
    return decorated_function


@smtp_admin_bp.route('/smtp-accounts', methods=['POST'])
@admin_required
def create_smtp_account():
    """Create a new SMTP account (Admin only)."""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Validate required fields
        required_fields = ['name', 'provider', 'host', 'port', 'username', 'password', 'from_name', 'from_email']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Check if name already exists
        existing = SMTPAccount.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({
                'success': False,
                'error': f'SMTP account with name "{data["name"]}" already exists'
            }), 409
        
        # Create new SMTP account
        smtp_account = SMTPAccount(
            name=data['name'],
            description=data.get('description', ''),
            provider=data['provider'],
            host=data['host'],
            port=int(data['port']),
            username=data['username'],
            password=data['password'],  # TODO: Encrypt in production
            encryption=data.get('encryption', 'tls'),
            from_name=data['from_name'],
            from_email=data['from_email'],
            reply_to_email=data.get('reply_to_email'),
            is_active=data.get('is_active', True),
            daily_limit=data.get('daily_limit'),
            created_by_admin_id=current_user_id
        )
        
        db.session.add(smtp_account)
        db.session.commit()
        
        logger.info(f'Admin {current_user_id} created SMTP account: {smtp_account.name} (ID: {smtp_account.id})')
        
        return jsonify({
            'success': True,
            'message': 'SMTP account created successfully',
            'smtp_account': smtp_account.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'success': False, 'error': f'Invalid data: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error creating SMTP account: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@smtp_admin_bp.route('/smtp-accounts', methods=['GET'])
@admin_required
def list_smtp_accounts():
    """List all SMTP accounts (Admin only)."""
    try:
        accounts = SMTPAccount.query.order_by(SMTPAccount.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'smtp_accounts': [account.to_dict() for account in accounts],
            'total': len(accounts)
        })
        
    except Exception as e:
        logger.error(f'Error listing SMTP accounts: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@smtp_admin_bp.route('/smtp-accounts/<int:smtp_id>', methods=['GET'])
@admin_required
def get_smtp_account(smtp_id):
    """Get a specific SMTP account (Admin only)."""
    try:
        account = SMTPAccount.query.get(smtp_id)
        
        if not account:
            return jsonify({
                'success': False,
                'error': 'SMTP account not found'
            }), 404
        
        return jsonify({
            'success': True,
            'smtp_account': account.to_dict()
        })
        
    except Exception as e:
        logger.error(f'Error getting SMTP account: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@smtp_admin_bp.route('/smtp-accounts/<int:smtp_id>', methods=['PUT'])
@admin_required
def update_smtp_account(smtp_id):
    """Update an existing SMTP account (Admin only)."""
    try:
        account = SMTPAccount.query.get(smtp_id)
        
        if not account:
            return jsonify({
                'success': False,
                'error': 'SMTP account not found'
            }), 404
        
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            # Check if new name conflicts with existing
            existing = SMTPAccount.query.filter_by(name=data['name']).first()
            if existing and existing.id != smtp_id:
                return jsonify({
                    'success': False,
                    'error': f'SMTP account with name "{data["name"]}" already exists'
                }), 409
            account.name = data['name']
        
        if 'description' in data:
            account.description = data['description']
        if 'provider' in data:
            account.provider = data['provider']
        if 'host' in data:
            account.host = data['host']
        if 'port' in data:
            account.port = int(data['port'])
        if 'username' in data:
            account.username = data['username']
        if 'password' in data and data['password'] != '••••••••':
            account.password = data['password']
        if 'encryption' in data:
            account.encryption = data['encryption']
        if 'from_name' in data:
            account.from_name = data['from_name']
        if 'from_email' in data:
            account.from_email = data['from_email']
        if 'reply_to_email' in data:
            account.reply_to_email = data['reply_to_email']
        if 'is_active' in data:
            account.is_active = data['is_active']
        if 'daily_limit' in data:
            account.daily_limit = data['daily_limit']
        
        account.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f'SMTP account {smtp_id} updated successfully')
        
        return jsonify({
            'success': True,
            'message': 'SMTP account updated successfully',
            'smtp_account': account.to_dict()
        })
        
    except ValueError as e:
        return jsonify({'success': False, 'error': f'Invalid data: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error updating SMTP account: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@smtp_admin_bp.route('/smtp-accounts/<int:smtp_id>', methods=['DELETE'])
@admin_required
def delete_smtp_account(smtp_id):
    """Delete an SMTP account (Admin only)."""
    try:
        account = SMTPAccount.query.get(smtp_id)
        
        if not account:
            return jsonify({
                'success': False,
                'error': 'SMTP account not found'
            }), 404
        
        # Check if any campaigns are using this SMTP
        from app.models.campaign import Campaign
        campaigns_using = Campaign.query.filter_by(smtp_account_id=smtp_id).count()
        
        if campaigns_using > 0:
            return jsonify({
                'success': False,
                'error': f'Cannot delete SMTP account. {campaigns_using} campaign(s) are using it.'
            }), 409
        
        account_name = account.name
        db.session.delete(account)
        db.session.commit()
        
        logger.info(f'SMTP account {smtp_id} ({account_name}) deleted successfully')
        
        return jsonify({
            'success': True,
            'message': f'SMTP account "{account_name}" deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error deleting SMTP account: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@smtp_admin_bp.route('/smtp-accounts/<int:smtp_id>/test', methods=['POST'])
@admin_required
def test_smtp_connection(smtp_id):
    """Test SMTP connection (Admin only)."""
    try:
        account = SMTPAccount.query.get(smtp_id)
        
        if not account:
            return jsonify({
                'success': False,
                'error': 'SMTP account not found'
            }), 404
        
        # Test the connection
        try:
            if account.encryption == 'ssl':
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(account.host, account.port, context=context, timeout=10)
            else:
                server = smtplib.SMTP(account.host, account.port, timeout=10)
                if account.encryption == 'tls':
                    server.starttls()
            
            server.login(account.username, account.password)
            server.quit()
            
            # Update test status
            account.is_verified = True
            account.last_tested_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f'SMTP account {smtp_id} test successful')
            
            return jsonify({
                'success': True,
                'message': 'SMTP connection successful! Account verified.'
            })
            
        except smtplib.SMTPAuthenticationError as e:
            logger.warning(f'SMTP auth failed for account {smtp_id}: {str(e)}')
            return jsonify({
                'success': False,
                'error': 'Authentication failed. Please check username and password.'
            }), 400
        except smtplib.SMTPConnectError as e:
            logger.warning(f'SMTP connection failed for account {smtp_id}: {str(e)}')
            return jsonify({
                'success': False,
                'error': f'Could not connect to SMTP server: {str(e)}'
            }), 400
        except Exception as e:
            logger.error(f'SMTP test error for account {smtp_id}: {str(e)}')
            return jsonify({
                'success': False,
                'error': f'Connection test failed: {str(e)}'
            }), 400
            
    except Exception as e:
        logger.error(f'Error testing SMTP account: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


# User-SMTP Assignment Endpoints

@smtp_admin_bp.route('/users/<int:user_id>/smtp-accounts', methods=['POST'])
@admin_required
def assign_smtp_to_user(user_id):
    """Assign an SMTP account to a user (Admin only)."""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        if not data.get('smtp_account_id'):
            return jsonify({
                'success': False,
                'error': 'smtp_account_id is required'
            }), 400
        
        smtp_account_id = data['smtp_account_id']
        
        # Validate user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Validate SMTP account exists
        smtp_account = SMTPAccount.query.get(smtp_account_id)
        if not smtp_account:
            return jsonify({
                'success': False,
                'error': 'SMTP account not found'
            }), 404
        
        # Check if already assigned
        existing = UserSMTPAssignment.query.filter_by(
            user_id=user_id,
            smtp_account_id=smtp_account_id
        ).first()
        
        if existing:
            return jsonify({
                'success': False,
                'error': 'SMTP account already assigned to this user'
            }), 409
        
        # Create assignment
        assignment = UserSMTPAssignment(
            user_id=user_id,
            smtp_account_id=smtp_account_id,
            assigned_by_admin_id=current_user_id
        )
        
        db.session.add(assignment)
        db.session.commit()
        
        logger.info(f'Admin {current_user_id} assigned SMTP {smtp_account_id} to user {user_id}')
        
        return jsonify({
            'success': True,
            'message': f'SMTP account "{smtp_account.name}" assigned to {user.email}',
            'assignment': assignment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error assigning SMTP to user: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@smtp_admin_bp.route('/users/<int:user_id>/smtp-accounts', methods=['GET'])
@admin_required
def get_user_smtp_assignments(user_id):
    """Get all SMTP accounts assigned to a user (Admin only)."""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        assignments = UserSMTPAssignment.query.filter_by(user_id=user_id).all()
        
        smtp_accounts = []
        for assignment in assignments:
            smtp_data = assignment.smtp_account.to_dict()
            smtp_data['assigned_at'] = assignment.assigned_at.isoformat() if assignment.assigned_at else None
            smtp_accounts.append(smtp_data)
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role.value
            },
            'smtp_accounts': smtp_accounts,
            'total': len(smtp_accounts)
        })
        
    except Exception as e:
        logger.error(f'Error getting user SMTP assignments: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@smtp_admin_bp.route('/users/<int:user_id>/smtp-accounts/<int:smtp_id>', methods=['DELETE'])
@admin_required
def unassign_smtp_from_user(user_id, smtp_id):
    """Remove an SMTP account assignment from a user (Admin only)."""
    try:
        assignment = UserSMTPAssignment.query.filter_by(
            user_id=user_id,
            smtp_account_id=smtp_id
        ).first()
        
        if not assignment:
            return jsonify({
                'success': False,
                'error': 'Assignment not found'
            }), 404
        
        db.session.delete(assignment)
        db.session.commit()
        
        logger.info(f'SMTP {smtp_id} unassigned from user {user_id}')
        
        return jsonify({
            'success': True,
            'message': 'SMTP account unassigned successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error unassigning SMTP from user: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500
