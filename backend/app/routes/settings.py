from flask import Blueprint, request, jsonify
from app import db
from app.models.smtp_settings import SMTPSettings
from sqlalchemy import text
import smtplib
from email.mime.text import MIMEText
from datetime import datetime

bp = Blueprint('settings', __name__)

@bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint for settings routes."""
    return {'status': 'ok', 'service': 'settings'}

@bp.route('/debug', methods=['GET'])
def debug_database():
    """Debug endpoint to check database configuration"""
    from flask import current_app
    from sqlalchemy import text
    import os
    
    try:
        db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI')
        
        # Get database file path
        if 'sqlite:///' in db_uri:
            db_file = db_uri.replace('sqlite:///', '')
        else:
            db_file = "Not SQLite"
        
        # Check if file exists
        file_exists = os.path.exists(db_file) if db_file != "Not SQLite" else "N/A"
        
        # Get tables
        try:
            result = db.session.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
            tables = [row[0] for row in result]
        except Exception as e:
            tables = f"Error: {str(e)}"
        
        # Check contacts count
        try:
            result = db.session.execute(text("SELECT COUNT(*) FROM contacts;"))
            contact_count = result.fetchone()[0]
        except Exception as e:
            contact_count = f"Error: {str(e)}"
        
        return jsonify({
            'database_uri': db_uri,
            'database_file': db_file,
            'file_exists': file_exists,
            'tables': tables,
            'contact_count': contact_count
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/smtp', methods=['GET'])
def get_smtp_settings():
    """Get SMTP settings for user"""
    from sqlalchemy import text
    
    try:
        user_id = 1  # Default user for now
        
        # Use raw SQL to bypass model issues
        query = text("""
            SELECT * FROM smtp_settings 
            WHERE user_id = :user_id 
            LIMIT 1
        """)
        
        result = db.session.execute(query, {'user_id': user_id})
        row = result.fetchone()
        
        if not row:
            # Return default settings if none exist
            return jsonify({
                'provider': 'gmail',
                'host': 'smtp.gmail.com',
                'port': 587,
                'username': '',
                'password': '',
                'encryption': 'tls',
                'sender_name': '',
                'sender_email': '',
                'is_configured': False,
                'last_tested_at': None,
                'test_status': None
            })
        
        # Convert row to dict
        return jsonify({
            'id': row[0],
            'provider': row[2],
            'host': row[3],
            'port': row[4],
            'username': row[5],
            'password': '••••••••' if row[6] else '',  # Mask password
            'encryption': row[7],
            'sender_name': row[8] or '',
            'sender_email': row[9] or '',
            'is_configured': bool(row[10]),
            'last_tested_at': row[11],
            'test_status': row[12]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/smtp', methods=['POST'])
def save_smtp_settings():
    """Save or update SMTP settings"""
    from sqlalchemy import text
    
    try:
        user_id = 1  # Default user for now
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['provider', 'host', 'port', 'username', 'password', 'encryption']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if settings exist using raw SQL
        check_query = text("SELECT id FROM smtp_settings WHERE user_id = :user_id LIMIT 1")
        result = db.session.execute(check_query, {'user_id': user_id})
        existing_row = result.fetchone()
        
        current_time = datetime.utcnow().isoformat()
        
        if existing_row:
            # Update existing settings
            update_query = text("""
                UPDATE smtp_settings SET
                    provider = :provider,
                    host = :host,
                    port = :port,
                    username = :username,
                    password = :password,
                    encryption = :encryption,
                    sender_name = :sender_name,
                    sender_email = :sender_email,
                    is_configured = TRUE,
                    updated_at = :updated_at
                WHERE user_id = :user_id
            """)
            
            db.session.execute(update_query, {
                'provider': data['provider'],
                'host': data['host'],
                'port': int(data['port']),
                'username': data['username'],
                'password': data['password'],
                'encryption': data['encryption'],
                'sender_name': data.get('sender_name', ''),
                'sender_email': data.get('sender_email', ''),
                'updated_at': current_time,
                'user_id': user_id
            })
        else:
            # Create new settings
            insert_query = text("""
                INSERT INTO smtp_settings (
                    user_id, provider, host, port, username, password, encryption,
                    sender_name, sender_email, is_configured, created_at, updated_at
                ) VALUES (
                    :user_id, :provider, :host, :port, :username, :password, :encryption,
                    :sender_name, :sender_email, :is_configured, :created_at, :updated_at
                )
            """)
            
            db.session.execute(insert_query, {
                'user_id': user_id,
                'provider': data['provider'],
                'host': data['host'],
                'port': int(data['port']),
                'username': data['username'],
                'password': data['password'],
                'encryption': data['encryption'],
                'sender_name': data.get('sender_name', ''),
                'sender_email': data.get('sender_email', ''),
                'is_configured': True,
                'created_at': current_time,
                'updated_at': current_time
            })
        
        db.session.commit()
        
        return jsonify({
            'message': 'SMTP settings saved successfully',
            'settings': {
                'provider': data['provider'],
                'host': data['host'],
                'port': int(data['port']),
                'username': data['username'],
                'password': '••••••••',
                'encryption': data['encryption'],
                'sender_name': data.get('sender_name', ''),
                'sender_email': data.get('sender_email', ''),
                'is_configured': True
            }
        })
        
    except ValueError as e:
        return jsonify({'error': 'Invalid port number'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/smtp/test', methods=['POST'])
def test_smtp_connection():
    """Test SMTP connection"""
    try:
        user_id = 1  # Default user for now
        data = request.get_json()
        
        # Get SMTP settings from request or database
        if data and all(k in data for k in ['host', 'port', 'username', 'password']):
            host = data.get('host')
            port = int(data.get('port', 587))
            username = data.get('username')
            password = data.get('password')
            encryption = data.get('encryption', 'tls')
        else:
            # Get from database
            smtp_settings = SMTPSettings.query.filter_by(user_id=user_id).first()
            if not smtp_settings:
                return jsonify({'error': 'No SMTP settings found'}), 400
            
            host = smtp_settings.host
            port = smtp_settings.port
            username = smtp_settings.username
            password = smtp_settings.password
            encryption = smtp_settings.encryption
        
        # Test connection
        try:
            if encryption.lower() == 'ssl':
                server = smtplib.SMTP_SSL(host, port)
            else:
                server = smtplib.SMTP(host, port)
                if encryption.lower() == 'tls':
                    server.starttls()
            
            server.login(username, password)
            server.quit()
            
            # Update test status in database
            smtp_settings = SMTPSettings.query.filter_by(user_id=user_id).first()
            if smtp_settings:
                smtp_settings.last_tested_at = datetime.utcnow()
                smtp_settings.test_status = 'success'
                db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'SMTP connection successful',
                'tested_at': datetime.utcnow().isoformat()
            })
            
        except smtplib.SMTPAuthenticationError:
            # Update test status in database
            smtp_settings = SMTPSettings.query.filter_by(user_id=user_id).first()
            if smtp_settings:
                smtp_settings.last_tested_at = datetime.utcnow()
                smtp_settings.test_status = 'failed'
                db.session.commit()
            
            return jsonify({
                'success': False,
                'error': 'Authentication failed. Please check your username and password.'
            }), 401
            
        except Exception as smtp_error:
            # Update test status in database
            smtp_settings = SMTPSettings.query.filter_by(user_id=user_id).first()
            if smtp_settings:
                smtp_settings.last_tested_at = datetime.utcnow()
                smtp_settings.test_status = 'failed'
                db.session.commit()
            
            return jsonify({
                'success': False,
                'error': f'Connection failed: {str(smtp_error)}'
            }), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/smtp/status', methods=['GET'])
def get_smtp_status():
    """Get SMTP configuration status"""
    from sqlalchemy import text
    
    try:
        user_id = 1  # Default user for now
        
        # Use raw SQL to check status
        query = text("""
            SELECT is_configured, test_status, last_tested_at 
            FROM smtp_settings 
            WHERE user_id = :user_id 
            LIMIT 1
        """)
        
        result = db.session.execute(query, {'user_id': user_id})
        row = result.fetchone()
        
        if not row:
            return jsonify({
                'is_configured': False,
                'test_status': None,
                'last_tested_at': None
            })
        
        return jsonify({
            'is_configured': bool(row[0]),
            'test_status': row[1],
            'last_tested_at': row[2]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500