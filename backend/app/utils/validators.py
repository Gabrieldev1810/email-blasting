import re
from typing import Dict, List, Tuple, Optional
from email_validator import validate_email as email_validate, EmailNotValidError

def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate an email address.
    
    Args:
        email: Email address to validate
        
    Returns:
        Tuple of (is_valid: bool, message: str)
    """
    try:
        if not email or not isinstance(email, str):
            return False, "Email is required"
        
        # Use email-validator library for comprehensive validation
        valid = email_validate(email)
        return True, "Valid email"
        
    except EmailNotValidError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Invalid email format: {str(e)}"

def validate_campaign_data(data: Dict) -> Tuple[bool, List[str]]:
    """
    Validate campaign data.
    
    Args:
        data: Campaign data dictionary
        
    Returns:
        Tuple of (is_valid: bool, errors: List[str])
    """
    errors = []
    
    # Required fields
    required_fields = ['name', 'subject', 'sender_email']
    for field in required_fields:
        if not data.get(field):
            errors.append(f"{field.replace('_', ' ').title()} is required")
    
    # Validate sender email
    if data.get('sender_email'):
        is_valid, message = validate_email(data['sender_email'])
        if not is_valid:
            errors.append(f"Invalid sender email: {message}")
    
    # Validate reply-to email if provided
    if data.get('reply_to'):
        is_valid, message = validate_email(data['reply_to'])
        if not is_valid:
            errors.append(f"Invalid reply-to email: {message}")
    
    # Validate content
    if not data.get('html_content') and not data.get('text_content'):
        errors.append("Either HTML content or text content is required")
    
    # Validate subject length
    if data.get('subject') and len(data['subject']) > 500:
        errors.append("Subject line is too long (maximum 500 characters)")
    
    # Validate name length
    if data.get('name') and len(data['name']) > 200:
        errors.append("Campaign name is too long (maximum 200 characters)")
    
    return len(errors) == 0, errors

def validate_contact_data(data: Dict) -> Tuple[bool, List[str]]:
    """
    Validate contact data.
    
    Args:
        data: Contact data dictionary
        
    Returns:
        Tuple of (is_valid: bool, errors: List[str])
    """
    errors = []
    
    # Email is required
    if not data.get('email'):
        errors.append("Email is required")
    else:
        is_valid, message = validate_email(data['email'])
        if not is_valid:
            errors.append(f"Invalid email: {message}")
    
    # Validate name lengths if provided
    if data.get('first_name') and len(data['first_name']) > 50:
        errors.append("First name is too long (maximum 50 characters)")
    
    if data.get('last_name') and len(data['last_name']) > 50:
        errors.append("Last name is too long (maximum 50 characters)")
    
    if data.get('company') and len(data['company']) > 100:
        errors.append("Company name is too long (maximum 100 characters)")
    
    # Validate phone format if provided
    if data.get('phone'):
        phone = data['phone'].strip()
        # Simple phone validation - adjust regex as needed
        phone_pattern = r'^\+?[\d\s\-\(\)]{7,20}$'
        if not re.match(phone_pattern, phone):
            errors.append("Invalid phone number format")
    
    return len(errors) == 0, errors

def validate_smtp_config_data(data: Dict) -> Tuple[bool, List[str]]:
    """
    Validate SMTP configuration data.
    
    Args:
        data: SMTP config data dictionary
        
    Returns:
        Tuple of (is_valid: bool, errors: List[str])
    """
    errors = []
    
    # Required fields
    required_fields = ['name', 'provider', 'host', 'port', 'username', 'password', 'sender_email']
    for field in required_fields:
        if not data.get(field):
            errors.append(f"{field.replace('_', ' ').title()} is required")
    
    # Validate port
    try:
        port = int(data.get('port', 0))
        if port < 1 or port > 65535:
            errors.append("Port must be between 1 and 65535")
    except (ValueError, TypeError):
        errors.append("Port must be a valid number")
    
    # Validate encryption
    valid_encryptions = ['tls', 'ssl', 'none']
    if data.get('encryption') and data['encryption'].lower() not in valid_encryptions:
        errors.append(f"Encryption must be one of: {', '.join(valid_encryptions)}")
    
    # Validate emails
    if data.get('username'):
        is_valid, message = validate_email(data['username'])
        if not is_valid:
            errors.append(f"Invalid username email: {message}")
    
    if data.get('sender_email'):
        is_valid, message = validate_email(data['sender_email'])
        if not is_valid:
            errors.append(f"Invalid sender email: {message}")
    
    if data.get('reply_to'):
        is_valid, message = validate_email(data['reply_to'])
        if not is_valid:
            errors.append(f"Invalid reply-to email: {message}")
    
    # Validate rate limits
    if data.get('max_emails_per_hour'):
        try:
            max_emails = int(data['max_emails_per_hour'])
            if max_emails < 1 or max_emails > 10000:
                errors.append("Max emails per hour must be between 1 and 10000")
        except (ValueError, TypeError):
            errors.append("Max emails per hour must be a valid number")
    
    return len(errors) == 0, errors

def validate_csv_data(csv_data: List[Dict]) -> Tuple[bool, List[str], List[Dict]]:
    """
    Validate CSV import data.
    
    Args:
        csv_data: List of contact dictionaries from CSV
        
    Returns:
        Tuple of (is_valid: bool, errors: List[str], valid_contacts: List[Dict])
    """
    errors = []
    valid_contacts = []
    
    if not csv_data:
        return False, ["No data found in CSV file"], []
    
    for i, row in enumerate(csv_data, 1):
        row_errors = []
        
        # Validate email (required)
        if not row.get('email'):
            row_errors.append(f"Row {i}: Email is required")
        else:
            is_valid, message = validate_email(row['email'])
            if not is_valid:
                row_errors.append(f"Row {i}: {message}")
        
        if row_errors:
            errors.extend(row_errors)
        else:
            # Clean up the data
            clean_contact = {
                'email': row['email'].lower().strip(),
                'first_name': row.get('first_name', '').strip(),
                'last_name': row.get('last_name', '').strip(),
                'company': row.get('company', '').strip(),
                'phone': row.get('phone', '').strip(),
            }
            valid_contacts.append(clean_contact)
    
    # Check for duplicate emails
    seen_emails = set()
    duplicate_errors = []
    for i, contact in enumerate(valid_contacts):
        email = contact['email']
        if email in seen_emails:
            duplicate_errors.append(f"Duplicate email found: {email}")
        seen_emails.add(email)
    
    errors.extend(duplicate_errors)
    
    return len(errors) == 0, errors, valid_contacts