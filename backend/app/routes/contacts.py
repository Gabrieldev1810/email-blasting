import logging

logger = logging.getLogger(__name__)
from flask import Blueprint, request, jsonify, g, send_file
from app import db
from app.models.contact import Contact, ContactStatus
from app.models.user import UserRole
from app.models.upload import Upload, UploadType, UploadStatus
from app.middleware.auth import authenticated_required
from app.services.contact_upload_service import ContactUploadService
from datetime import datetime
import csv
from io import StringIO
import os

bp = Blueprint('contacts', __name__)

@bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint for contacts routes."""
    return {'status': 'ok', 'service': 'contacts'}

@bp.route('', methods=['GET'])
@bp.route('/', methods=['GET'])
@authenticated_required
def get_contacts():
    """Get all contacts with optional filtering."""
    try:
        # Get query parameters
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        
        # Get current authenticated user
        current_user = g.current_user
        
        # Build query - admin users can see all contacts, others see only their own
        if current_user.role == UserRole.ADMIN:
            query = Contact.query  # Admin sees all contacts
        else:
            query = Contact.query.filter_by(user_id=current_user.id)  # Others see only their own
        
        if search:
            query = query.filter(
                (Contact.first_name.contains(search)) |
                (Contact.last_name.contains(search)) |
                (Contact.email.contains(search))
            )
        
        if status:
            query = query.filter(Contact.status == status)
        
        # Execute query
        contacts = query.all()
        
        # Convert to JSON
        contacts_data = []
        for contact in contacts:
            contacts_data.append({
                'id': contact.id,
                'firstName': contact.first_name,
                'lastName': contact.last_name,
                'email': contact.email,
                'status': contact.status.value if hasattr(contact.status, 'value') else str(contact.status),
                'tags': contact.tags.split(',') if contact.tags else [],
                'createdAt': contact.created_at.isoformat() if contact.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': contacts_data,
            'total': len(contacts_data)
        })
    
    except Exception as e:
        import traceback
        logger.error(f"ERROR in get_contacts: {e}")
        logger.info(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('', methods=['POST'])
@bp.route('/', methods=['POST'])
@authenticated_required
def create_contact():
    """Create a new contact."""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('email'):
            return jsonify({
                'success': False,
                'error': 'Email is required'
            }), 400
        
        # Get current authenticated user
        user_id = g.current_user.id
        
        # Check if email already exists for this user
        existing_contact = Contact.query.filter_by(user_id=user_id, email=data['email']).first()
        if existing_contact:
            return jsonify({
                'success': False,
                'error': 'Contact with this email already exists'
            }), 409
        
        # Create new contact (using user_id = 1 as default for now)
        # TODO: Replace with actual authenticated user_id when auth is implemented
        
        # Convert status string to proper enum
        from app.models.contact import ContactStatus
        status_str = data.get('status', 'active').lower()
        if status_str == 'active':
            status_enum = ContactStatus.ACTIVE
        elif status_str == 'unsubscribed':
            status_enum = ContactStatus.UNSUBSCRIBED
        elif status_str == 'bounced':
            status_enum = ContactStatus.BOUNCED
        else:
            status_enum = ContactStatus.ACTIVE  # Default fallback
        
        contact = Contact(
            user_id=user_id,  # Use the same user_id
            first_name=data.get('firstName', ''),
            last_name=data.get('lastName', ''),
            email=data['email'],
            status=status_enum,
            tags=','.join(data.get('tags', [])),
            created_at=datetime.utcnow()
        )
        
        db.session.add(contact)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': contact.id,
                'firstName': contact.first_name,
                'lastName': contact.last_name,
                'email': contact.email,
                'status': contact.status.value if hasattr(contact.status, 'value') else str(contact.status),
                'tags': contact.tags.split(',') if contact.tags else [],
                'createdAt': contact.created_at.isoformat()
            }
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/<int:contact_id>', methods=['PUT'])
@authenticated_required
def update_contact(contact_id):
    """Update an existing contact."""
    try:
        # Ensure user can only update their own contacts
        contact = Contact.query.filter_by(id=contact_id, user_id=g.current_user.id).first()
        if not contact:
            return jsonify({
                'success': False,
                'error': 'Contact not found or access denied'
            }), 404
            
        data = request.get_json()
        
        # Update fields
        if 'firstName' in data:
            contact.first_name = data['firstName']
        if 'lastName' in data:
            contact.last_name = data['lastName']
        if 'email' in data:
            # Check if email already exists (excluding current contact)
            existing = Contact.query.filter(
                Contact.email == data['email'],
                Contact.id != contact_id
            ).first()
            if existing:
                return jsonify({
                    'success': False,
                    'error': 'Contact with this email already exists'
                }), 409
            contact.email = data['email']
        if 'status' in data:
            contact.status = data['status']
        if 'tags' in data:
            contact.tags = ','.join(data['tags'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': contact.id,
                'firstName': contact.first_name,
                'lastName': contact.last_name,
                'email': contact.email,
                'status': contact.status,
                'tags': contact.tags.split(',') if contact.tags else [],
                'createdAt': contact.created_at.isoformat() if contact.created_at else None
            }
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/<int:contact_id>', methods=['DELETE'])
@authenticated_required
def delete_contact(contact_id):
    """Delete a contact."""
    try:
        current_user = g.current_user
        
        # Admin can delete any contact, others can only delete their own
        if current_user.role == UserRole.ADMIN:
            contact = Contact.query.get(contact_id)
        else:
            contact = Contact.query.filter_by(id=contact_id, user_id=current_user.id).first()
        
        if not contact:
            # More detailed error message for debugging
            existing_contact = Contact.query.get(contact_id)
            if not existing_contact:
                error_msg = f'Contact with ID {contact_id} does not exist'
            else:
                error_msg = f'Contact with ID {contact_id} belongs to user {existing_contact.user_id}, but current user is {current_user.id}'
            
            return jsonify({
                'success': False,
                'error': 'Contact not found or access denied',
                'debug': error_msg
            }), 404
        
        # Store contact email for response message
        contact_email = contact.email
        
        # Delete related campaign_recipients first to avoid foreign key constraint issues
        from app.models.campaign import CampaignRecipient
        CampaignRecipient.query.filter_by(contact_id=contact_id).delete()
        
        # Now delete the contact
        db.session.delete(contact)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Contact {contact_email} deleted successfully'
        })
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting contact {contact_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/stats', methods=['GET'])
@authenticated_required
def get_contact_stats():
    """Get contact statistics."""
    try:
        # Get current authenticated user
        current_user = g.current_user
        
        # Contact counts - admin sees all, others see only their own
        if current_user.role == UserRole.ADMIN:
            total_contacts = Contact.query.count()
            active_contacts = Contact.query.filter_by(status=ContactStatus.ACTIVE).count()
            unsubscribed = Contact.query.filter_by(status=ContactStatus.UNSUBSCRIBED).count()
            bounced = Contact.query.filter_by(status=ContactStatus.BOUNCED).count()
        else:
            total_contacts = Contact.query.filter_by(user_id=current_user.id).count()
            active_contacts = Contact.query.filter_by(user_id=current_user.id, status=ContactStatus.ACTIVE).count()
            unsubscribed = Contact.query.filter_by(user_id=current_user.id, status=ContactStatus.UNSUBSCRIBED).count()
            bounced = Contact.query.filter_by(user_id=current_user.id, status=ContactStatus.BOUNCED).count()
        
        # Email analytics - sum across all contacts 
        if current_user.role == UserRole.ADMIN:
            # Admin sees all email stats
            email_stats = db.session.query(
                db.func.sum(Contact.total_emails_sent).label('total_sent'),
                db.func.sum(Contact.total_emails_bounced).label('total_bounced_emails'),
                db.func.sum(Contact.total_emails_opened).label('total_opened'),
                db.func.sum(Contact.total_emails_clicked).label('total_clicked')
            ).first()
        else:
            # Others see only their own stats
            email_stats = db.session.query(
                db.func.sum(Contact.total_emails_sent).label('total_sent'),
                db.func.sum(Contact.total_emails_bounced).label('total_bounced_emails'),
                db.func.sum(Contact.total_emails_opened).label('total_opened'),
                db.func.sum(Contact.total_emails_clicked).label('total_clicked')
            ).filter_by(user_id=current_user.id).first()
        
        total_sent = email_stats.total_sent or 0
        total_bounced_emails = email_stats.total_bounced_emails or 0
        total_opened = email_stats.total_opened or 0
        total_clicked = email_stats.total_clicked or 0
        
        # Calculate delivery rate (successful sends vs total sends)
        delivery_rate = ((total_sent - total_bounced_emails) / max(total_sent, 1)) * 100 if total_sent > 0 else 0
        open_rate = (total_opened / max(total_sent, 1)) * 100 if total_sent > 0 else 0
        
        return jsonify({
            'success': True,
            'data': {
                'total': total_contacts,
                'active': active_contacts,
                'unsubscribed': unsubscribed,
                'bounced': bounced,
                'total_emails_sent': total_sent,
                'total_emails_bounced': total_bounced_emails,
                'total_emails_opened': total_opened,
                'total_emails_clicked': total_clicked,
                'delivery_rate': round(delivery_rate, 1),
                'open_rate': round(open_rate, 1)
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/upload-csv', methods=['POST'])
@authenticated_required
def upload_csv():
    """Upload contacts from CSV file."""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file uploaded'
            }), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Check file extension
        if not file.filename.lower().endswith('.csv'):
            return jsonify({
                'success': False,
                'error': 'File must be a CSV format'
            }), 400
        
        # Get current authenticated user
        user_id = g.current_user.id
        
        # Read and parse CSV
        try:
            # Read file content
            stream = StringIO(file.stream.read().decode("UTF8"), newline=None)
            csv_input = csv.DictReader(stream)
            
            # Track statistics
            total_rows = 0
            successful_imports = 0
            skipped_rows = 0
            errors = []
            
            # Expected column mappings (case insensitive)
            column_mappings = {
                'email': ['email', 'email_address', 'e-mail', 'mail'],
                'first_name': ['first_name', 'firstname', 'first name', 'fname', 'name'],
                'last_name': ['last_name', 'lastname', 'last name', 'lname', 'surname'],
                'company': ['company', 'organization', 'org', 'business'],
                'phone': ['phone', 'phone_number', 'tel', 'telephone', 'mobile'],
                'status': ['status', 'subscription_status', 'contact_status']
            }
            
            # Get CSV headers and map them
            headers = next(csv_input).keys() if csv_input.line_num == 0 else csv_input.fieldnames
            mapped_columns = {}
            
            for field, possible_names in column_mappings.items():
                for header in headers:
                    if header.lower().strip() in possible_names:
                        mapped_columns[field] = header
                        break
            
            # Validate that email column exists
            if 'email' not in mapped_columns:
                return jsonify({
                    'success': False,
                    'error': 'CSV must contain an email column. Expected column names: email, email_address, e-mail, or mail'
                }), 400
            
            # Reset file position and read again
            stream.seek(0)
            csv_input = csv.DictReader(stream)
            
            # Process each row
            for row_num, row in enumerate(csv_input, start=2):  # Start at 2 to account for header
                total_rows += 1
                
                try:
                    # Extract email (required)
                    email = row.get(mapped_columns['email'], '').strip()
                    if not email:
                        errors.append(f"Row {row_num}: Missing email address")
                        skipped_rows += 1
                        continue
                    
                    # Validate email format (basic check)
                    if '@' not in email or '.' not in email.split('@')[-1]:
                        errors.append(f"Row {row_num}: Invalid email format: {email}")
                        skipped_rows += 1
                        continue
                    
                    # Check if contact already exists
                    existing_contact = Contact.query.filter_by(
                        user_id=user_id, 
                        email=email
                    ).first()
                    
                    if existing_contact:
                        errors.append(f"Row {row_num}: Email {email} already exists")
                        skipped_rows += 1
                        continue
                    
                    # Extract other fields (optional)
                    first_name = row.get(mapped_columns.get('first_name', ''), '').strip()
                    last_name = row.get(mapped_columns.get('last_name', ''), '').strip()
                    company = row.get(mapped_columns.get('company', ''), '').strip()
                    phone = row.get(mapped_columns.get('phone', ''), '').strip()
                    status_str = row.get(mapped_columns.get('status', ''), 'active').strip().lower()
                    
                    # Map status to enum
                    if status_str in ['active', '1', 'yes', 'subscribed', 'true']:
                        status_enum = ContactStatus.ACTIVE
                    elif status_str in ['unsubscribed', 'unsubscribe', '0', 'no', 'false']:
                        status_enum = ContactStatus.UNSUBSCRIBED
                    elif status_str in ['bounced', 'bounce', 'invalid']:
                        status_enum = ContactStatus.BOUNCED
                    else:
                        status_enum = ContactStatus.ACTIVE  # Default
                    
                    # Create contact
                    contact = Contact(
                        user_id=user_id,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        company=company,
                        phone=phone,
                        status=status_enum,
                        source='csv_import',
                        created_at=datetime.utcnow()
                    )
                    
                    db.session.add(contact)
                    successful_imports += 1
                    
                except Exception as row_error:
                    errors.append(f"Row {row_num}: {str(row_error)}")
                    skipped_rows += 1
                    continue
            
            # Commit all changes
            db.session.commit()
            
            # Prepare response
            response_data = {
                'success': True,
                'message': f'CSV import completed successfully',
                'stats': {
                    'total_rows': total_rows,
                    'successful_imports': successful_imports,
                    'skipped_rows': skipped_rows,
                    'duplicate_emails': len([e for e in errors if 'already exists' in e]),
                    'invalid_emails': len([e for e in errors if 'Invalid email format' in e])
                }
            }
            
            # Include errors if any (but limit to first 10 for readability)
            if errors:
                response_data['errors'] = errors[:10]
                if len(errors) > 10:
                    response_data['additional_errors'] = len(errors) - 10
            
            return jsonify(response_data), 201
            
        except UnicodeDecodeError:
            return jsonify({
                'success': False,
                'error': 'File encoding error. Please ensure your CSV is UTF-8 encoded.'
            }), 400
        except Exception as parse_error:
            return jsonify({
                'success': False,
                'error': f'Error parsing CSV file: {str(parse_error)}'
            }), 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@bp.route('/download-template', methods=['GET'])
def download_csv_template():
    """Download a CSV template for importing contacts."""
    try:
        # Create an empty CSV template with headers only
        template_data = []
        
        # Convert to CSV format
        output = StringIO()
        fieldnames = ['email', 'first_name', 'last_name', 'company', 'phone', 'status']
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        
        writer.writeheader()
        writer.writerows(template_data)
        
        csv_content = output.getvalue()
        output.close()
        
        return jsonify({
            'success': True,
            'template': csv_content,
            'filename': 'contacts_template.csv',
            'instructions': {
                'required_columns': ['email'],
                'optional_columns': ['first_name', 'last_name', 'company', 'phone', 'status'],
                'status_values': ['active', 'unsubscribed', 'bounced'],
                'notes': [
                    'Email column is required and must be valid',
                    'Duplicate emails will be skipped',
                    'Status defaults to "active" if not specified',
                    'File must be in CSV format'
                ]
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ===================== ENHANCED FILE UPLOAD ENDPOINTS =====================

@bp.route('/upload-file', methods=['POST'])
@authenticated_required
def upload_file():
    """Enhanced file upload that supports both Excel and CSV with complete tracking."""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file uploaded'
            }), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Validate file type
        allowed_extensions = {'.csv', '.xlsx', '.xls'}
        file_ext = os.path.splitext(file.filename.lower())[1]
        
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': f'Unsupported file type "{file_ext}". Allowed types: {", ".join(allowed_extensions)}'
            }), 400
        
        # Get current user
        user_id = g.current_user.id
        
        # Process upload using service
        upload_service = ContactUploadService()
        result = upload_service.process_file_upload(file, user_id)
        
        # Return response based on result
        if result['success']:
            status_code = 200 if result.get('skipped_rows', 0) == 0 else 206  # 206 for partial success
            
            response_data = {
                'success': True,
                'message': 'File uploaded and processed successfully',
                'upload_id': result.get('upload_id'),
                'statistics': {
                    'total_rows': result.get('total_rows', 0),
                    'successful_imports': result.get('successful_imports', 0),
                    'skipped_rows': result.get('skipped_rows', 0),
                    'errors_count': len(result.get('errors', []))
                },
                'file_info': result.get('file_info', {}),
                'errors': result.get('errors', [])[:10]  # Return first 10 errors
            }
            
            if result.get('skipped_rows', 0) > 0:
                response_data['message'] = f"File processed with {result.get('skipped_rows', 0)} skipped rows. See errors for details."
            
            return jsonify(response_data), status_code
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Upload processing failed'),
                'upload_id': result.get('upload_id')
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Upload failed: {str(e)}'
        }), 500

@bp.route('/uploads', methods=['GET'])
@authenticated_required
def get_upload_history():
    """Get upload history for the current user."""
    try:
        user_id = g.current_user.id
        limit = request.args.get('limit', 50, type=int)
        
        upload_service = ContactUploadService()
        uploads = upload_service.get_upload_history(user_id, limit)
        
        return jsonify({
            'success': True,
            'data': uploads,
            'count': len(uploads)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/uploads/<int:upload_id>', methods=['GET'])
@authenticated_required
def get_upload_details(upload_id):
    """Get detailed information about a specific upload."""
    try:
        user_id = g.current_user.id
        
        upload_service = ContactUploadService()
        upload_data = upload_service.get_upload_by_id(upload_id, user_id)
        
        if not upload_data:
            return jsonify({
                'success': False,
                'error': 'Upload not found or access denied'
            }), 404
        
        return jsonify({
            'success': True,
            'data': upload_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/uploads/<int:upload_id>/download', methods=['GET'])
@authenticated_required
def download_uploaded_file(upload_id):
    """Download the original uploaded file."""
    try:
        user_id = g.current_user.id
        
        # Get upload record
        upload = Upload.query.filter_by(id=upload_id, user_id=user_id).first()
        
        if not upload:
            return jsonify({
                'success': False,
                'error': 'Upload not found or access denied'
            }), 404
        
        # Check if file exists
        if not upload.file_path or not os.path.exists(upload.file_path):
            return jsonify({
                'success': False,
                'error': 'File no longer exists on server'
            }), 404
        
        # Send file
        return send_file(
            upload.file_path,
            as_attachment=True,
            download_name=upload.original_filename,
            mimetype=upload.mime_type
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/uploads/<int:upload_id>/reprocess', methods=['POST'])
@authenticated_required  
def reprocess_upload(upload_id):
    """Reprocess a previously uploaded file."""
    try:
        user_id = g.current_user.id
        
        # Get upload record
        upload = Upload.query.filter_by(id=upload_id, user_id=user_id).first()
        
        if not upload:
            return jsonify({
                'success': False,
                'error': 'Upload not found or access denied'
            }), 404
        
        # Check if file exists
        if not upload.file_path or not os.path.exists(upload.file_path):
            return jsonify({
                'success': False,
                'error': 'File no longer exists on server'
            }), 404
        
        # Use the upload service to reprocess
        upload_service = ContactUploadService()
        
        # Create a mock file object for reprocessing
        class MockFile:
            def __init__(self, filepath, filename):
                self.filename = filename
                with open(filepath, 'rb') as f:
                    self._content = f.read()
                
        mock_file = MockFile(upload.file_path, upload.original_filename)
        result = upload_service.process_file_upload(mock_file, user_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'File reprocessed successfully',
                'statistics': {
                    'total_rows': result.get('total_rows', 0),
                    'successful_imports': result.get('successful_imports', 0),
                    'skipped_rows': result.get('skipped_rows', 0),
                    'errors_count': len(result.get('errors', []))
                },
                'errors': result.get('errors', [])[:10]
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Reprocessing failed')
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ===================== ADMIN FILE MANAGEMENT =====================

@bp.route('/admin/uploads', methods=['GET'])
@authenticated_required
def admin_get_all_uploads():
    """Admin endpoint to view all uploads across all users."""
    try:
        # Check if user is admin
        if g.current_user.role != UserRole.ADMIN:
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        limit = request.args.get('limit', 100, type=int)
        
        uploads = Upload.query.order_by(Upload.uploaded_at.desc())\
            .limit(limit).all()
        
        uploads_data = [upload.to_dict() for upload in uploads]
        
        return jsonify({
            'success': True,
            'data': uploads_data,
            'count': len(uploads_data)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/manual-entry', methods=['POST'])
@authenticated_required
def manual_contact_entry():
    """Track manual contact entries in the upload system."""
    try:
        data = request.get_json()
        user_id = g.current_user.id
        
        # Validate required fields
        if not data or 'contacts' not in data:
            return jsonify({
                'success': False,
                'error': 'Contacts data required'
            }), 400
        
        contacts_data = data['contacts']
        if not isinstance(contacts_data, list):
            contacts_data = [contacts_data]
        
        # Create upload record for manual entry
        upload_record = Upload(
            user_id=user_id,
            upload_type=UploadType.MANUAL,
            status=UploadStatus.PROCESSING,
            original_filename='manual_entry',
            total_rows=len(contacts_data),
            uploaded_at=datetime.utcnow()
        )
        
        db.session.add(upload_record)
        db.session.commit()
        
        successful_imports = 0
        skipped_rows = 0
        errors = []
        
        # Process each contact
        for i, contact_data in enumerate(contacts_data):
            try:
                email = contact_data.get('email', '').strip()
                
                if not email:
                    errors.append(f"Entry {i+1}: Missing email address")
                    skipped_rows += 1
                    continue
                
                # Check for duplicates
                existing_contact = Contact.query.filter_by(
                    user_id=user_id,
                    email=email
                ).first()
                
                if existing_contact:
                    errors.append(f"Entry {i+1}: Email {email} already exists")
                    skipped_rows += 1
                    continue
                
                # Create contact
                contact = Contact(
                    user_id=user_id,
                    email=email,
                    first_name=contact_data.get('firstName', ''),
                    last_name=contact_data.get('lastName', ''),
                    company=contact_data.get('company', ''),
                    phone=contact_data.get('phone', ''),
                    status=ContactStatus.ACTIVE,
                    source='manual_entry',
                    created_at=datetime.utcnow()
                )
                
                db.session.add(contact)
                successful_imports += 1
                
            except Exception as e:
                errors.append(f"Entry {i+1}: {str(e)}")
                skipped_rows += 1
        
        # Update upload record
        upload_record.processed_rows = successful_imports
        upload_record.failed_rows = skipped_rows
        upload_record.status = UploadStatus.SUCCESS if skipped_rows == 0 else UploadStatus.PARTIAL
        upload_record.processed_at = datetime.utcnow()
        
        # Store metadata
        metadata = {
            'entry_method': 'manual',
            'contacts_data': contacts_data,
            'processing_stats': {
                'total_entries': len(contacts_data),
                'successful_imports': successful_imports,
                'skipped_entries': skipped_rows
            }
        }
        upload_record.set_metadata(metadata)
        
        # Add errors
        for error in errors:
            upload_record.add_error(error)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'upload_id': upload_record.id,
            'statistics': {
                'total_entries': len(contacts_data),
                'successful_imports': successful_imports,
                'skipped_entries': skipped_rows,
                'errors_count': len(errors)
            },
            'errors': errors
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500