"""
User SMTP Access Routes
Endpoints for managers/users to view their assigned SMTP accounts
"""
import logging
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.models.smtp_account import SMTPAccount, UserSMTPAssignment

logger = logging.getLogger(__name__)

smtp_user_bp = Blueprint('smtp_user', __name__)


@smtp_user_bp.route('/my-smtp-accounts', methods=['GET'])
@jwt_required()
def get_my_smtp_accounts():
    """Get SMTP accounts assigned to the current user (for use in campaigns)."""
    try:
        logger.info('=== get_my_smtp_accounts called ===')
        current_user_id = get_jwt_identity()
        logger.info(f'Current user ID: {current_user_id}')
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Get all assigned SMTP accounts that are active
        assignments = UserSMTPAssignment.query.filter_by(user_id=current_user_id).all()
        
        smtp_accounts = []
        for assignment in assignments:
            smtp = assignment.smtp_account
            # Only return active and verified SMTP accounts
            if smtp.is_active and smtp.is_verified:
                smtp_accounts.append({
                    'id': smtp.id,
                    'name': smtp.name,
                    'description': smtp.description,
                    'provider': smtp.provider,
                    'from_name': smtp.from_name,
                    'from_email': smtp.from_email,
                    'reply_to_email': smtp.reply_to_email,
                    'daily_limit': smtp.daily_limit,
                    'emails_sent_today': smtp.emails_sent_today,
                })
        
        logger.info(f'User {current_user_id} retrieved {len(smtp_accounts)} assigned SMTP accounts')
        
        return jsonify({
            'success': True,
            'smtp_accounts': smtp_accounts,
            'total': len(smtp_accounts)
        })
        
    except Exception as e:
        logger.error(f'Error getting user SMTP accounts: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500


@smtp_user_bp.route('/my-smtp-accounts/<int:smtp_id>', methods=['GET'])
@jwt_required()
def get_my_smtp_account(smtp_id):
    """Get details of a specific SMTP account assigned to current user."""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user has access to this SMTP account
        assignment = UserSMTPAssignment.query.filter_by(
            user_id=current_user_id,
            smtp_account_id=smtp_id
        ).first()
        
        if not assignment:
            return jsonify({
                'success': False,
                'error': 'SMTP account not found or not assigned to you'
            }), 404
        
        smtp = assignment.smtp_account
        
        if not smtp.is_active:
            return jsonify({
                'success': False,
                'error': 'SMTP account is not active'
            }), 403
        
        return jsonify({
            'success': True,
            'smtp_account': {
                'id': smtp.id,
                'name': smtp.name,
                'description': smtp.description,
                'provider': smtp.provider,
                'from_name': smtp.from_name,
                'from_email': smtp.from_email,
                'reply_to_email': smtp.reply_to_email,
                'is_verified': smtp.is_verified,
                'daily_limit': smtp.daily_limit,
                'emails_sent_today': smtp.emails_sent_today,
                'total_emails_sent': smtp.total_emails_sent,
            }
        })
        
    except Exception as e:
        logger.error(f'Error getting user SMTP account: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500
