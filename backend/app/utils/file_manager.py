import os
import uuid
import shutil
from datetime import datetime
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
import pandas as pd
import json

class FileManager:
    """Utility class for managing file uploads and storage."""
    
    def __init__(self, upload_dir='uploads'):
        self.base_upload_dir = upload_dir
        self.contacts_dir = os.path.join(upload_dir, 'contacts')
        self.backups_dir = os.path.join(upload_dir, 'backups')
        
        # Ensure directories exist
        os.makedirs(self.contacts_dir, exist_ok=True)
        os.makedirs(self.backups_dir, exist_ok=True)
    
    def generate_unique_filename(self, original_filename):
        """Generate a unique filename while preserving the extension."""
        name, ext = os.path.splitext(secure_filename(original_filename))
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        return f"{name}_{timestamp}_{unique_id}{ext}"
    
    def save_uploaded_file(self, file, user_id, subdirectory='contacts'):
        """
        Save an uploaded file and return file information.
        
        Args:
            file: FileStorage object from request.files
            user_id: ID of the user uploading the file
            subdirectory: Subdirectory to save file in (default: 'contacts')
            
        Returns:
            dict: File information including path, size, etc.
        """
        if not file or not file.filename:
            raise ValueError("No file provided")
        
        # Create user-specific directory
        user_dir = os.path.join(self.base_upload_dir, subdirectory, f'user_{user_id}')
        os.makedirs(user_dir, exist_ok=True)
        
        # Generate unique filename
        stored_filename = self.generate_unique_filename(file.filename)
        file_path = os.path.join(user_dir, stored_filename)
        
        # Save the file
        file.save(file_path)
        
        # Get file information
        file_size = os.path.getsize(file_path)
        
        return {
            'original_filename': file.filename,
            'stored_filename': stored_filename,
            'file_path': file_path,
            'relative_path': os.path.relpath(file_path, self.base_upload_dir),
            'file_size': file_size,
            'mime_type': file.mimetype or 'application/octet-stream'
        }
    
    def read_excel_file(self, file_path):
        """
        Read Excel file and return data with metadata.
        
        Returns:
            dict: Contains 'data' (DataFrame) and 'metadata'
        """
        try:
            # Read Excel file
            df = pd.read_excel(file_path)
            
            # Generate metadata
            metadata = {
                'total_rows': len(df),
                'total_columns': len(df.columns),
                'column_names': list(df.columns),
                'data_types': df.dtypes.to_dict(),
                'memory_usage': df.memory_usage(deep=True).sum(),
                'has_null_values': df.isnull().any().to_dict(),
                'sample_data': df.head(3).to_dict('records')  # First 3 rows as sample
            }
            
            # Convert data types to strings for JSON serialization
            metadata['data_types'] = {k: str(v) for k, v in metadata['data_types'].items()}
            
            return {
                'data': df,
                'metadata': metadata,
                'success': True
            }
        except Exception as e:
            return {
                'data': None,
                'metadata': None,
                'success': False,
                'error': str(e)
            }
    
    def read_csv_file(self, file_path):
        """
        Read CSV file and return data with metadata.
        
        Returns:
            dict: Contains 'data' (DataFrame) and 'metadata'
        """
        try:
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            df = None
            used_encoding = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    used_encoding = encoding
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                raise ValueError("Could not read CSV file with any supported encoding")
            
            # Generate metadata
            metadata = {
                'total_rows': len(df),
                'total_columns': len(df.columns),
                'column_names': list(df.columns),
                'data_types': df.dtypes.to_dict(),
                'encoding_used': used_encoding,
                'memory_usage': df.memory_usage(deep=True).sum(),
                'has_null_values': df.isnull().any().to_dict(),
                'sample_data': df.head(3).to_dict('records')  # First 3 rows as sample
            }
            
            # Convert data types to strings for JSON serialization
            metadata['data_types'] = {k: str(v) for k, v in metadata['data_types'].items()}
            
            return {
                'data': df,
                'metadata': metadata,
                'success': True
            }
        except Exception as e:
            return {
                'data': None,
                'metadata': None,
                'success': False,
                'error': str(e)
            }
    
    def create_backup_file(self, data, user_id, filename_prefix='backup'):
        """
        Create a backup file with current data.
        
        Args:
            data: List of dictionaries or DataFrame to backup
            user_id: ID of the user
            filename_prefix: Prefix for the backup filename
            
        Returns:
            str: Path to the created backup file
        """
        # Create user backup directory
        user_backup_dir = os.path.join(self.backups_dir, f'user_{user_id}')
        os.makedirs(user_backup_dir, exist_ok=True)
        
        # Generate backup filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"{filename_prefix}_{timestamp}.json"
        backup_path = os.path.join(user_backup_dir, backup_filename)
        
        # Convert DataFrame to list of dicts if necessary
        if hasattr(data, 'to_dict'):
            data = data.to_dict('records')
        
        # Save as JSON
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
        
        return backup_path
    
    def get_file_info(self, file_path):
        """Get information about a stored file."""
        if not os.path.exists(file_path):
            return None
        
        stat = os.stat(file_path)
        return {
            'exists': True,
            'size': stat.st_size,
            'created': datetime.fromtimestamp(stat.st_ctime),
            'modified': datetime.fromtimestamp(stat.st_mtime),
            'is_file': os.path.isfile(file_path)
        }
    
    def delete_file(self, file_path):
        """Safely delete a file."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            raise Exception(f"Failed to delete file: {str(e)}")
    
    def get_user_files(self, user_id, subdirectory='contacts'):
        """Get list of all files for a specific user."""
        user_dir = os.path.join(self.base_upload_dir, subdirectory, f'user_{user_id}')
        
        if not os.path.exists(user_dir):
            return []
        
        files = []
        for filename in os.listdir(user_dir):
            file_path = os.path.join(user_dir, filename)
            if os.path.isfile(file_path):
                info = self.get_file_info(file_path)
                if info:
                    info['filename'] = filename
                    info['path'] = file_path
                    files.append(info)
        
        return sorted(files, key=lambda x: x['modified'], reverse=True)