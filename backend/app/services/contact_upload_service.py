from flask import request, g
from app import db
from app.models.contact import Contact, ContactStatus
from app.models.upload import Upload, UploadType, UploadStatus
from app.utils.file_manager import FileManager
from datetime import datetime
import pandas as pd
import csv
from io import StringIO
import os

class ContactUploadService:
    """Service for handling contact file uploads with comprehensive tracking."""
    
    def __init__(self):
        self.file_manager = FileManager()
    
    def process_file_upload(self, file, user_id):
        """
        Process a file upload (Excel or CSV) with complete tracking.
        
        Args:
            file: FileStorage object from Flask request
            user_id: ID of the user uploading the file
            
        Returns:
            dict: Upload results with statistics and file info
        """
        upload_record = None
        
        try:
            # Determine file type
            filename = file.filename.lower()
            if filename.endswith('.xlsx') or filename.endswith('.xls'):
                upload_type = UploadType.EXCEL
            elif filename.endswith('.csv'):
                upload_type = UploadType.CSV
            else:
                return {
                    'success': False,
                    'error': 'Unsupported file type. Please upload Excel (.xlsx, .xls) or CSV files only.'
                }
            
            # Save the uploaded file
            file_info = self.file_manager.save_uploaded_file(file, user_id)
            
            # Create upload record in database
            upload_record = Upload(
                user_id=user_id,
                upload_type=upload_type,
                status=UploadStatus.PROCESSING,
                original_filename=file_info['original_filename'],
                stored_filename=file_info['stored_filename'],
                file_path=file_info['file_path'],
                file_size=file_info['file_size'],
                mime_type=file_info['mime_type'],
                uploaded_at=datetime.utcnow()
            )
            
            db.session.add(upload_record)
            db.session.commit()  # Commit to get ID
            
            # Process the file based on type
            if upload_type == UploadType.EXCEL:
                result = self._process_excel_file(file_info['file_path'], user_id, upload_record)
            else:
                result = self._process_csv_file(file_info['file_path'], user_id, upload_record)
            
            # Update upload record with final status
            upload_record.processed_at = datetime.utcnow()
            upload_record.total_rows = result.get('total_rows', 0)
            upload_record.processed_rows = result.get('successful_imports', 0)
            upload_record.failed_rows = result.get('skipped_rows', 0)
            
            if result['success']:
                upload_record.status = UploadStatus.SUCCESS if result.get('skipped_rows', 0) == 0 else UploadStatus.PARTIAL
            else:
                upload_record.status = UploadStatus.FAILED
                upload_record.add_error(result.get('error', 'Unknown error'))
            
            # Store metadata
            metadata = {
                'column_mappings': result.get('column_mappings', {}),
                'file_info': file_info,
                'processing_stats': {
                    'total_rows': result.get('total_rows', 0),
                    'successful_imports': result.get('successful_imports', 0),
                    'skipped_rows': result.get('skipped_rows', 0),
                    'errors_count': len(result.get('errors', []))
                }
            }
            upload_record.set_metadata(metadata)
            
            # Add all errors to upload record
            for error in result.get('errors', []):
                upload_record.add_error(error)
            
            db.session.commit()
            
            # Add upload info to result
            result['upload_id'] = upload_record.id
            result['file_info'] = file_info
            
            return result
            
        except Exception as e:
            # Update upload record with error if it exists
            if upload_record:
                upload_record.status = UploadStatus.FAILED
                upload_record.add_error(str(e))
                upload_record.processed_at = datetime.utcnow()
                db.session.commit()
            
            db.session.rollback()
            return {
                'success': False,
                'error': f'Upload processing failed: {str(e)}',
                'upload_id': upload_record.id if upload_record else None
            }
    
    def _process_excel_file(self, file_path, user_id, upload_record):
        """Process Excel file and import contacts."""
        try:
            # Read Excel file using file manager
            excel_result = self.file_manager.read_excel_file(file_path)
            
            if not excel_result['success']:
                return {
                    'success': False,
                    'error': f"Failed to read Excel file: {excel_result['error']}"
                }
            
            df = excel_result['data']
            metadata = excel_result['metadata']
            
            # Create backup before processing
            backup_path = self.file_manager.create_backup_file(
                df.to_dict('records'), 
                user_id, 
                f'excel_backup_{upload_record.id}'
            )
            
            # Process the DataFrame
            return self._process_dataframe(df, user_id, 'excel_import', metadata)
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Excel processing error: {str(e)}'
            }
    
    def _process_csv_file(self, file_path, user_id, upload_record):
        """Process CSV file and import contacts."""
        try:
            # Read CSV file using file manager
            csv_result = self.file_manager.read_csv_file(file_path)
            
            if not csv_result['success']:
                return {
                    'success': False,
                    'error': f"Failed to read CSV file: {csv_result['error']}"
                }
            
            df = csv_result['data']
            metadata = csv_result['metadata']
            
            # Create backup before processing
            backup_path = self.file_manager.create_backup_file(
                df.to_dict('records'), 
                user_id, 
                f'csv_backup_{upload_record.id}'
            )
            
            # Process the DataFrame
            return self._process_dataframe(df, user_id, 'csv_import', metadata)
            
        except Exception as e:
            return {
                'success': False,
                'error': f'CSV processing error: {str(e)}'
            }
    
    def _process_dataframe(self, df, user_id, source, file_metadata=None):
        """Process pandas DataFrame and import contacts."""
        try:
            # Column mapping for flexible field recognition
            column_mappings = {
                'email': ['email', 'email_address', 'e-mail', 'mail', 'e_mail'],
                'first_name': ['first_name', 'firstname', 'first name', 'fname', 'name', 'first'],
                'last_name': ['last_name', 'lastname', 'last name', 'lname', 'surname', 'last'],
                'company': ['company', 'organization', 'org', 'business', 'employer'],
                'phone': ['phone', 'phone_number', 'tel', 'telephone', 'mobile', 'contact'],
                'status': ['status', 'subscription_status', 'contact_status', 'state']
            }
            
            # Map DataFrame columns to our fields
            df_columns = [col.lower().strip() for col in df.columns]
            mapped_columns = {}
            
            for field, possible_names in column_mappings.items():
                for col_name in df_columns:
                    if col_name in possible_names:
                        # Find the original column name (with correct case)
                        original_col = next(col for col in df.columns if col.lower().strip() == col_name)
                        mapped_columns[field] = original_col
                        break
            
            # Validate required fields
            if 'email' not in mapped_columns:
                return {
                    'success': False,
                    'error': f'Email column not found. Available columns: {list(df.columns)}. Expected email columns: {column_mappings["email"]}'
                }
            
            # Statistics tracking
            total_rows = len(df)
            successful_imports = 0
            skipped_rows = 0
            errors = []
            
            # Process each row
            for index, row in df.iterrows():
                try:
                    # Extract and validate email
                    email = str(row[mapped_columns['email']]).strip()
                    if pd.isna(row[mapped_columns['email']]) or not email or email.lower() == 'nan':
                        errors.append(f"Row {index + 2}: Missing email address")
                        skipped_rows += 1
                        continue
                    
                    # Basic email validation
                    if '@' not in email or '.' not in email.split('@')[-1]:
                        errors.append(f"Row {index + 2}: Invalid email format: {email}")
                        skipped_rows += 1
                        continue
                    
                    # Check for duplicates in database
                    existing_contact = Contact.query.filter_by(
                        user_id=user_id,
                        email=email
                    ).first()
                    
                    if existing_contact:
                        errors.append(f"Row {index + 2}: Email {email} already exists")
                        skipped_rows += 1
                        continue
                    
                    # Extract other fields with safe handling
                    first_name = str(row[mapped_columns.get('first_name', '')]).strip() if 'first_name' in mapped_columns else ''
                    last_name = str(row[mapped_columns.get('last_name', '')]).strip() if 'last_name' in mapped_columns else ''
                    company = str(row[mapped_columns.get('company', '')]).strip() if 'company' in mapped_columns else ''
                    phone = str(row[mapped_columns.get('phone', '')]).strip() if 'phone' in mapped_columns else ''
                    status_str = str(row[mapped_columns.get('status', 'active')]).strip().lower() if 'status' in mapped_columns else 'active'
                    
                    # Handle NaN values
                    if first_name.lower() == 'nan': first_name = ''
                    if last_name.lower() == 'nan': last_name = ''
                    if company.lower() == 'nan': company = ''
                    if phone.lower() == 'nan': phone = ''
                    
                    # Map status to enum
                    if status_str in ['active', '1', 'yes', 'subscribed', 'true']:
                        status_enum = ContactStatus.ACTIVE
                    elif status_str in ['unsubscribed', 'unsubscribe', '0', 'no', 'false']:
                        status_enum = ContactStatus.UNSUBSCRIBED
                    elif status_str in ['bounced', 'bounce', 'invalid']:
                        status_enum = ContactStatus.BOUNCED
                    else:
                        status_enum = ContactStatus.ACTIVE
                    
                    # Create contact
                    contact = Contact(
                        user_id=user_id,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        company=company,
                        phone=phone,
                        status=status_enum,
                        source=source,
                        created_at=datetime.utcnow()
                    )
                    
                    db.session.add(contact)
                    successful_imports += 1
                    
                except Exception as row_error:
                    errors.append(f"Row {index + 2}: {str(row_error)}")
                    skipped_rows += 1
                    continue
            
            # Commit all changes
            db.session.commit()
            
            return {
                'success': True,
                'total_rows': total_rows,
                'successful_imports': successful_imports,
                'skipped_rows': skipped_rows,
                'errors': errors,
                'column_mappings': mapped_columns,
                'file_metadata': file_metadata
            }
            
        except Exception as e:
            db.session.rollback()
            return {
                'success': False,
                'error': f'Data processing error: {str(e)}'
            }
    
    def get_upload_history(self, user_id, limit=50):
        """Get upload history for a user."""
        uploads = Upload.query.filter_by(user_id=user_id)\
            .order_by(Upload.uploaded_at.desc())\
            .limit(limit).all()
        
        return [upload.to_dict() for upload in uploads]
    
    def get_upload_by_id(self, upload_id, user_id):
        """Get specific upload by ID (user can only access their own uploads)."""
        upload = Upload.query.filter_by(id=upload_id, user_id=user_id).first()
        return upload.to_dict() if upload else None