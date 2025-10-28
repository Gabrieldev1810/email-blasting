import logging

logger = logging.getLogger(__name__)
from flask import Blueprint, request, jsonify, g
from app import db
from app.models.smtp_config import SMTPConfig
from app.middleware.auth import authenticated_required
import smtplib
import ssl
from email.mime.text import MIMEText
from datetime import datetime

smtp_config_bp = Blueprint('smtp_config', __name__)

@smtp_config_bp.route('/smtp-configs', methods=['GET'])
@authenticated_required
def get_smtp_configs():
    """Get all SMTP configurations for the current user."""
    try:
        current_user = g.current_user
        configs = SMTPConfig.query.filter_by(user_id=current_user.id).all()
        
        return jsonify({
            'success': True, 
            'configs': [config.to_dict() for config in configs]
        })
        
    except Exception as e:
        logger.error(f"Error fetching SMTP configs: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@smtp_config_bp.route('/smtp-configs', methods=['POST'])
@authenticated_required
def create_smtp_config():
    """Create a new SMTP configuration."""
    try:
        data = request.get_json()
        current_user = g.current_user
        
        # Validate required fields
        required_fields = ['name', 'provider', 'host', 'port', 'username', 'password', 'sender_email']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # If this is set as default, unset other defaults for this user
        if data.get('is_default', False):
            SMTPConfig.query.filter_by(user_id=current_user.id, is_default=True).update({'is_default': False})
        
        # Create new SMTP config
        smtp_config = SMTPConfig(
            user_id=current_user.id,
            name=data['name'],
            provider=data['provider'],
            host=data['host'],
            port=int(data['port']),
            username=data['username'],
            password=data['password'],
            sender_email=data['sender_email'],
            encryption=data.get('encryption', 'tls'),
            sender_name=data.get('sender_name', ''),
            reply_to=data.get('reply_to', data['sender_email']),
            is_default=data.get('is_default', False),
            max_emails_per_hour=data.get('max_emails_per_hour', 100)
        )
        
        db.session.add(smtp_config)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': 'SMTP configuration created successfully',
            'config': smtp_config.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating SMTP config: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@smtp_config_bp.route('/smtp-configs/<int:config_id>', methods=['GET'])
@authenticated_required
def get_smtp_config(config_id):
    """Get a specific SMTP configuration."""
    try:
        current_user = g.current_user
        config = SMTPConfig.query.filter_by(id=config_id, user_id=current_user.id).first()
        
        if not config:
            return jsonify({'success': False, 'error': 'SMTP configuration not found'}), 404
        
        return jsonify({
            'success': True, 
            'config': config.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error fetching SMTP config {config_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@smtp_config_bp.route('/smtp-configs/<int:config_id>', methods=['PUT'])
@authenticated_required
def update_smtp_config(config_id):
    """Update an existing SMTP configuration."""
    try:
        data = request.get_json()
        current_user = g.current_user
        config = SMTPConfig.query.filter_by(id=config_id, user_id=current_user.id).first()
        
        if not config:
            return jsonify({'success': False, 'error': 'SMTP configuration not found'}), 404
        
        # If this is being set as default, unset other defaults for this user
        if data.get('is_default', False) and not config.is_default:
            SMTPConfig.query.filter_by(user_id=current_user.id, is_default=True).update({'is_default': False})
        
        # Update fields
        updatable_fields = [
            'name', 'provider', 'host', 'port', 'username', 'sender_email',
            'encryption', 'sender_name', 'reply_to', 'is_default', 'is_active',
            'max_emails_per_hour'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(config, field, data[field])
        
        # Update password if provided
        if 'password' in data and data['password']:
            config.set_password(data['password'])
        
        config.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': 'SMTP configuration updated successfully',
            'config': config.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating SMTP config {config_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@smtp_config_bp.route('/smtp-configs/<int:config_id>', methods=['DELETE'])
@authenticated_required
def delete_smtp_config(config_id):
    """Delete an SMTP configuration."""
    try:
        current_user = g.current_user
        config = SMTPConfig.query.filter_by(id=config_id, user_id=current_user.id).first()
        
        if not config:
            return jsonify({'success': False, 'error': 'SMTP configuration not found'}), 404
        
        # Check if this is the last active config
        active_configs_count = SMTPConfig.query.filter_by(
            user_id=current_user.id, 
            is_active=True
        ).count()
        
        if config.is_active and active_configs_count == 1:
            return jsonify({
                'success': False, 
                'error': 'Cannot delete the last active SMTP configuration. Please add another configuration first.'
            }), 400
        
        config_name = config.name
        db.session.delete(config)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'SMTP configuration "{config_name}" deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting SMTP config {config_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@smtp_config_bp.route('/smtp-configs/<int:config_id>/test', methods=['POST'])
@authenticated_required
def test_smtp_config(config_id):
    """Test an SMTP configuration."""
    try:
        current_user = g.current_user
        config = SMTPConfig.query.filter_by(id=config_id, user_id=current_user.id).first()
        
        if not config:
            return jsonify({'success': False, 'error': 'SMTP configuration not found'}), 404
        
        # Test the connection
        try:
            if config.encryption == 'ssl':
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(config.host, config.port, context=context)
            else:
                server = smtplib.SMTP(config.host, config.port)
                if config.encryption == 'tls':
                    server.starttls()
            
            server.login(config.username, config.get_decrypted_password())
            server.quit()
            
            # Update test status
            config.last_tested_at = datetime.utcnow()
            config.test_successful = True
            config.test_error_message = None
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'SMTP connection successful!'})
            
        except smtplib.SMTPAuthenticationError as auth_error:
            config.last_tested_at = datetime.utcnow()
            config.test_successful = False
            config.test_error_message = 'Authentication failed'
            db.session.commit()
            return jsonify({'success': False, 'error': 'Authentication failed. Please check your username and password.'}), 400
            
        except smtplib.SMTPConnectError as conn_error:
            config.last_tested_at = datetime.utcnow()
            config.test_successful = False
            config.test_error_message = f'Connection failed: {str(conn_error)}'
            db.session.commit()
            return jsonify({'success': False, 'error': f'Could not connect to SMTP server {config.host}:{config.port}'}), 400
            
        except Exception as smtp_error:
            config.last_tested_at = datetime.utcnow()
            config.test_successful = False
            config.test_error_message = str(smtp_error)
            db.session.commit()
            return jsonify({'success': False, 'error': f'SMTP connection failed: {str(smtp_error)}'}), 400
            
    except Exception as e:
        logger.error(f"Error testing SMTP config {config_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@smtp_config_bp.route('/smtp-configs/<int:config_id>/set-default', methods=['POST'])
@authenticated_required
def set_default_smtp_config(config_id):
    """Set an SMTP configuration as the default for the user."""
    try:
        current_user = g.current_user
        config = SMTPConfig.query.filter_by(id=config_id, user_id=current_user.id).first()
        
        if not config:
            return jsonify({'success': False, 'error': 'SMTP configuration not found'}), 404
        
        if not config.is_active:
            return jsonify({'success': False, 'error': 'Cannot set inactive configuration as default'}), 400
        
        # Unset all other defaults for this user
        SMTPConfig.query.filter_by(user_id=current_user.id, is_default=True).update({'is_default': False})
        
        # Set this config as default
        config.is_default = True
        config.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'SMTP configuration "{config.name}" set as default'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting default SMTP config {config_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@smtp_config_bp.route('/smtp-configs/bulk-delete', methods=['POST'])
@authenticated_required
def bulk_delete_smtp_configs():
    """Delete multiple SMTP configurations."""
    try:
        data = request.get_json()
        config_ids = data.get('config_ids', [])
        
        if not config_ids or not isinstance(config_ids, list):
            return jsonify({'success': False, 'error': 'Invalid config_ids provided'}), 400
        
        current_user = g.current_user
        configs = SMTPConfig.query.filter(
            SMTPConfig.id.in_(config_ids),
            SMTPConfig.user_id == current_user.id
        ).all()
        
        if not configs:
            return jsonify({'success': False, 'error': 'No valid SMTP configurations found to delete'}), 404
        
        # Check if we're trying to delete all active configs
        active_configs_count = SMTPConfig.query.filter_by(
            user_id=current_user.id, 
            is_active=True
        ).count()
        
        active_configs_to_delete = sum(1 for config in configs if config.is_active)
        
        if active_configs_to_delete >= active_configs_count:
            return jsonify({
                'success': False, 
                'error': 'Cannot delete all active SMTP configurations. Please keep at least one active configuration.'
            }), 400
        
        deleted_names = [config.name for config in configs]
        
        for config in configs:
            db.session.delete(config)
        
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'Successfully deleted {len(configs)} SMTP configurations: {", ".join(deleted_names)}'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error bulk deleting SMTP configs: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500