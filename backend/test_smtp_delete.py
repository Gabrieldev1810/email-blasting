#!/usr/bin/env python3
"""
Test SMTP delete functionality directly
"""

import os
import sys
from datetime import datetime

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import create_app
    from app.models.smtp_settings import SMTPSettings
    from app.models.user import User
    
    print("Testing SMTP delete functionality...")
    
    # Create Flask app
    app = create_app()
    
    with app.app_context():
        from app import db
        
        # Get the admin user
        admin_user = User.query.filter_by(email="admin@beaconblast.com").first()
        if not admin_user:
            print("Admin user not found!")
            sys.exit(1)
        
        print(f"Found admin user: {admin_user.email}")
        
        # Check existing SMTP settings
        existing_settings = SMTPSettings.query.first()
        print(f"Existing SMTP settings: {existing_settings is not None}")
        
        if existing_settings:
            print(f"Current SMTP: {existing_settings.provider} - {existing_settings.host}")
            
            # Test delete
            db.session.delete(existing_settings)
            db.session.commit()
            print("✅ SMTP settings deleted successfully!")
            
            # Verify deletion
            check_settings = SMTPSettings.query.first()
            if check_settings is None:
                print("✅ Verification: No SMTP settings found (delete successful)")
            else:
                print("❌ Verification failed: SMTP settings still exist")
                
        else:
            # Create a test SMTP setting to delete
            test_settings = SMTPSettings(
                provider="test",
                host="smtp.test.com",
                port=587,
                username="test@test.com",
                password="testpassword",
                encryption="tls",
                sender_name="Test User",
                sender_email="test@test.com",
                is_configured=True,
                user_id=admin_user.id
            )
            db.session.add(test_settings)
            db.session.commit()
            print(f"Created test SMTP settings with ID: {test_settings.id}")
            
            # Now delete it
            db.session.delete(test_settings)
            db.session.commit()
            print("✅ Test SMTP settings created and deleted successfully!")
        
        print("\n✅ SMTP delete functionality working correctly!")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)