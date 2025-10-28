from datetime import datetime
from enum import Enum as PyEnum
from app import db
import json

class UploadType(PyEnum):
    """Enumeration for upload types."""
    EXCEL = "excel"
    CSV = "csv"
    MANUAL = "manual"

class UploadStatus(PyEnum):
    """Enumeration for upload statuses."""
    SUCCESS = "success"
    FAILED = "failed"
    PROCESSING = "processing"
    PARTIAL = "partial"

class Upload(db.Model):
    """Model to track all file uploads and manual data entries."""
    
    __tablename__ = 'uploads'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Upload metadata
    upload_type = db.Column(db.Enum(UploadType), nullable=False)
    status = db.Column(db.Enum(UploadStatus), default=UploadStatus.PROCESSING)
    
    # File information
    original_filename = db.Column(db.String(255))
    stored_filename = db.Column(db.String(255))
    file_path = db.Column(db.String(500))
    file_size = db.Column(db.Integer)  # in bytes
    mime_type = db.Column(db.String(100))
    
    # Content information
    total_rows = db.Column(db.Integer, default=0)
    processed_rows = db.Column(db.Integer, default=0)
    failed_rows = db.Column(db.Integer, default=0)
    
    # Metadata storage (JSON) - using custom_metadata to avoid SQLAlchemy reserved word
    custom_metadata = db.Column(db.Text)  # Store additional info as JSON
    error_log = db.Column(db.Text)  # Store any errors encountered
    
    # Timestamps
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('uploads', lazy=True))
    
    def set_metadata(self, metadata_dict):
        """Store metadata as JSON string."""
        if metadata_dict:
            self.custom_metadata = json.dumps(metadata_dict)
    
    def get_metadata(self):
        """Retrieve metadata as dictionary."""
        if self.custom_metadata:
            return json.loads(self.custom_metadata)
        return {}
    
    def add_error(self, error_message):
        """Add an error to the error log."""
        errors = self.get_errors()
        errors.append({
            'timestamp': datetime.utcnow().isoformat(),
            'message': error_message
        })
        self.error_log = json.dumps(errors)
    
    def get_errors(self):
        """Get all errors as a list."""
        if self.error_log:
            return json.loads(self.error_log)
        return []
    
    def to_dict(self):
        """Convert upload to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'upload_type': self.upload_type.value if self.upload_type else None,
            'status': self.status.value if self.status else None,
            'original_filename': self.original_filename,
            'stored_filename': self.stored_filename,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'total_rows': self.total_rows,
            'processed_rows': self.processed_rows,
            'failed_rows': self.failed_rows,
            'metadata': self.get_metadata(),
            'errors': self.get_errors(),
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None
        }
    
    def __repr__(self):
        return f'<Upload {self.id}: {self.original_filename} by User {self.user_id}>'