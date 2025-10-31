import logging
from flask import Blueprint, request, jsonify
from app import db, limiter
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.middleware.auth import authenticated_required
from flask_jwt_extended import get_jwt_identity
from datetime import datetime

logger = logging.getLogger(__name__)

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/notifications', methods=['GET'])
@limiter.limit("60 per minute")  # Higher limit for notifications
@authenticated_required
def get_notifications():
    """Get all notifications for the current user."""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        filter_type = request.args.get('type', None)
        is_read = request.args.get('is_read', None)
        
        query = Notification.query.filter_by(user_id=current_user_id)
        
        # Apply filters
        if filter_type:
            query = query.filter_by(type=NotificationType(filter_type))
        
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            query = query.filter_by(is_read=is_read_bool)
        
        # Order by newest first
        query = query.order_by(Notification.created_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        notifications_data = [notif.to_dict() for notif in pagination.items]
        
        return jsonify({
            'success': True,
            'notifications': notifications_data,
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@notifications_bp.route('/notifications/unread-count', methods=['GET'])
@limiter.limit("60 per minute")  # Higher limit for unread count polling
@authenticated_required
def get_unread_count():
    """Get count of unread notifications."""
    try:
        current_user_id = get_jwt_identity()
        
        count = Notification.query.filter_by(
            user_id=current_user_id,
            is_read=False
        ).count()
        
        return jsonify({
            'success': True,
            'unread_count': count
        })
        
    except Exception as e:
        logger.error(f"Error fetching unread count: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@notifications_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@authenticated_required
def mark_notification_read(notification_id):
    """Mark a specific notification as read."""
    try:
        current_user_id = get_jwt_identity()
        
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user_id
        ).first()
        
        if not notification:
            return jsonify({'success': False, 'error': 'Notification not found'}), 404
        
        notification.mark_as_read()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Notification marked as read',
            'notification': notification.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error marking notification as read: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@notifications_bp.route('/notifications/mark-all-read', methods=['POST'])
@authenticated_required
def mark_all_read():
    """Mark all notifications as read for the current user."""
    try:
        current_user_id = get_jwt_identity()
        
        updated = Notification.query.filter_by(
            user_id=current_user_id,
            is_read=False
        ).update({'is_read': True})
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{updated} notifications marked as read',
            'count': updated
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error marking all notifications as read: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@notifications_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
@authenticated_required
def delete_notification(notification_id):
    """Delete a specific notification."""
    try:
        current_user_id = get_jwt_identity()
        
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user_id
        ).first()
        
        if not notification:
            return jsonify({'success': False, 'error': 'Notification not found'}), 404
        
        db.session.delete(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Notification deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting notification: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@notifications_bp.route('/notifications/clear-all', methods=['DELETE'])
@authenticated_required
def clear_all_notifications():
    """Delete all notifications for the current user."""
    try:
        current_user_id = get_jwt_identity()
        
        deleted = Notification.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{deleted} notifications cleared',
            'count': deleted
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error clearing notifications: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

def create_notification(user_id, notification_type, title, message, campaign_id=None, status=None):
    """Helper function to create a notification."""
    try:
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            campaign_id=campaign_id,
            status=status
        )
        db.session.add(notification)
        db.session.commit()
        logger.info(f"Created notification for user {user_id}: {title}")
        return notification
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating notification: {str(e)}")
        return None
