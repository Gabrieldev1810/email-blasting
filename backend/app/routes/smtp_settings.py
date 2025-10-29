import logging

logger = logging.getLogger(__name__)
from flask import Blueprint, request, jsonify
from app import db
from app.models.smtp_settings import SMTPSettings
import smtplib
import ssl
from email.mime.text import MIMEText
from datetime import datetime

settings_bp = Blueprint('smtp_settings', __name__)

@settings_bp.route('/smtp-settings', methods=['GET'])
def get_smtp_settings():
    """Get current SMTP settings."""
    try:
        settings = SMTPSettings.query.order_by(SMTPSettings.created_at.desc()).first()
        
        if settings:
            return jsonify({'success': True, 'settings': settings.to_dict()})
        else:
            return jsonify({'success': True, 'settings': None})
            
    except Exception as e:
        logger.error(f"Error fetching SMTP settings: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/smtp-settings', methods=['POST'])
def save_smtp_settings():
    """Save or update SMTP settings."""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['provider', 'host', 'port', 'username', 'password']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Check if an SMTP setting with the same host and username already exists
        existing_settings = SMTPSettings.query.filter_by(
            host=data['host'],
            username=data['username']
        ).first()
        
        if existing_settings:
            # Update existing settings with same host/username
            existing_settings.provider = data.get('provider', 'custom')
            existing_settings.host = data['host']
            existing_settings.port = int(data['port'])
            existing_settings.username = data['username']
            existing_settings.password = data['password']
            existing_settings.encryption = data.get('encryption', 'tls')
            existing_settings.sender_name = data.get('sender_name', '')
            existing_settings.sender_email = data.get('sender_email', '')
            existing_settings.is_configured = True
            existing_settings.updated_at = datetime.utcnow()
            
            message = 'SMTP settings updated successfully'
            
            message = 'SMTP settings updated successfully'
        else:
            # Get or create default user
            from app.models.user import User
            default_user = User.query.first()
            if not default_user:
                default_user = User(
                    email='admin@beaconblast.com',
                    password='admin123',
                    first_name='Admin',
                    last_name='User',
                    is_active=True
                )
                db.session.add(default_user)
                db.session.flush()  # Get the ID without committing yet
            
            # Create new SMTP settings (add to list)
            new_settings = SMTPSettings(
                provider=data.get('provider', 'custom'),
                host=data['host'],
                port=int(data['port']),
                username=data['username'],
                password=data['password'],
                encryption=data.get('encryption', 'tls'),
                sender_name=data.get('sender_name', ''),
                sender_email=data.get('sender_email', ''),
                is_configured=True,
                user_id=default_user.id
            )
            db.session.add(new_settings)
            
            message = 'New SMTP settings added successfully'
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': message})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving SMTP settings: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/smtp-settings/test', methods=['POST'])
def test_smtp_connection():
    """Test SMTP connection with provided settings."""
    try:
        data = request.get_json()
        
        # Extract connection details - map from frontend field names to backend
        host = data.get('host') or data.get('smtp_host')
        port = int(data.get('port', 587)) if data.get('port') else int(data.get('smtp_port', 587))
        username = data.get('username')
        password = data.get('password')
        encryption = data.get('encryption', 'tls')
        
        if not all([host, username, password]):
            return jsonify({'success': False, 'error': 'Missing required connection details'}), 400
        
        # Test the connection
        try:
            if encryption == 'ssl':
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(host, port, context=context)
            else:
                server = smtplib.SMTP(host, port)
                if encryption == 'tls':
                    server.starttls()
            
            server.login(username, password)
            server.quit()
            
            # Update test status in database if this is an existing setting
            existing_settings = SMTPSettings.query.first()
            if existing_settings:
                existing_settings.test_status = 'success'
                existing_settings.last_tested_at = datetime.utcnow()
                db.session.commit()
            
            return jsonify({'success': True, 'message': 'SMTP connection successful!'})
            
        except smtplib.SMTPAuthenticationError:
            return jsonify({'success': False, 'error': 'Authentication failed. Please check your username and password.'}), 400
        except smtplib.SMTPConnectError:
            return jsonify({'success': False, 'error': f'Could not connect to SMTP server {host}:{port}'}), 400
        except Exception as smtp_error:
            return jsonify({'success': False, 'error': f'SMTP connection failed: {str(smtp_error)}'}), 400
            
    except Exception as e:
        logger.error(f"Error testing SMTP connection: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/smtp-settings', methods=['DELETE'])
def delete_smtp_settings():
    """Delete SMTP settings."""
    try:
        settings = SMTPSettings.query.first()
        
        if not settings:
            return jsonify({'success': False, 'error': 'No SMTP settings found to delete'}), 404
        
        # Delete the settings
        db.session.delete(settings)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': 'SMTP settings deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting SMTP settings: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/smtp-settings/<int:settings_id>', methods=['DELETE'])
def delete_smtp_settings_by_id(settings_id):
    """Delete specific SMTP settings by ID."""
    try:
        settings = SMTPSettings.query.get(settings_id)
        
        if not settings:
            return jsonify({'success': False, 'error': 'SMTP settings not found'}), 404
        
        # Delete the settings
        db.session.delete(settings)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'SMTP settings (ID: {settings_id}) deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting SMTP settings {settings_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/smtp-settings/status', methods=['GET'])
def get_smtp_status():
    """Get SMTP configuration status."""
    try:
        settings = SMTPSettings.query.first()
        
        if not settings:
            return jsonify({
                'success': True, 
                'configured': False,
                'message': 'No SMTP settings configured'
            })
        
        return jsonify({
            'success': True,
            'configured': settings.is_configured,
            'last_tested': settings.last_tested_at.isoformat() if settings.last_tested_at else None,
            'test_status': settings.test_status,
            'provider': settings.provider
        })
        
    except Exception as e:
        logger.error(f"Error getting SMTP status: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500