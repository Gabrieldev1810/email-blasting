#!/usr/bin/env python3
"""
One-time setup script for Beacon Blast Email Platform
Creates initial admin user account for production deployment

Usage: python setup_admin.py
Note: This script should only be run once during initial deployment
"""

import sys
import os
import hashlib
from datetime import datetime

# Add backend path to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def create_admin_user():
    """Create initial admin user account"""
    try:
        # Import Flask app and database models
        from app import create_app, db
        from app.models.user import User
        
        # Create Flask app context
        app = create_app()
        
        with app.app_context():
            print("🚀 Beacon Blast - Initial Admin Setup")
            print("=" * 50)
            
            # Admin credentials
            admin_email = "gab.duano101898@gmail.com"
            admin_password = "Gabriel_101898@@"
            admin_username = "admin"
            
            # Check if admin user already exists
            existing_admin = User.query.filter_by(email=admin_email).first()
            if existing_admin:
                print(f"✅ Admin user already exists with email: {admin_email}")
                print(f"   User ID: {existing_admin.id}")
                print(f"   Role: {existing_admin.role}")
                print(f"   Created: {existing_admin.created_at}")
                return True
            
            # Create admin user
            print(f"👤 Creating admin user: {admin_email}")
            
            admin_user = User(
                username=admin_username,
                email=admin_email,
                role='admin',
                department='IT Administration',
                position='System Administrator',
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            # Set password (this will be hashed automatically by the User model)
            admin_user.set_password(admin_password)
            
            # Add to database
            db.session.add(admin_user)
            db.session.commit()
            
            print("✅ Admin user created successfully!")
            print(f"   Email: {admin_email}")
            print(f"   Username: {admin_username}")
            print(f"   Role: admin")
            print(f"   User ID: {admin_user.id}")
            
            print("\n🔐 Login Credentials:")
            print(f"   Email: {admin_email}")
            print(f"   Password: {admin_password}")
            
            print("\n⚠️  SECURITY REMINDER:")
            print("   1. Change this password after first login")
            print("   2. Delete this setup script after use")
            print("   3. Create additional admin users as needed")
            
            return True
            
    except ImportError as e:
        print(f"❌ Error importing modules: {e}")
        print("   Make sure you're running this from the project root directory")
        return False
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return False

def setup_database():
    """Initialize database tables if they don't exist"""
    try:
        from app import create_app, db
        
        app = create_app()
        with app.app_context():
            print("🗄️  Initializing database...")
            
            # Create all tables
            db.create_all()
            print("✅ Database tables initialized")
            
            return True
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False

def main():
    """Main setup function"""
    print("🎯 Starting Beacon Blast Initial Setup...")
    print(f"📅 Setup Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Step 1: Setup database
    if not setup_database():
        print("❌ Database setup failed. Exiting.")
        sys.exit(1)
    
    print()
    
    # Step 2: Create admin user
    if not create_admin_user():
        print("❌ Admin user creation failed. Exiting.")
        sys.exit(1)
    
    print()
    print("🎉 Setup completed successfully!")
    print("🌐 Your Beacon Blast Email Platform is ready to use!")
    print()
    print("📋 Next Steps:")
    print("   1. Access your deployment URL")
    print("   2. Login with the credentials shown above")
    print("   3. Change the default password")
    print("   4. Configure SMTP settings")
    print("   5. Start creating email campaigns!")
    print()
    print("🗑️  Remember to delete this setup script after use for security")

if __name__ == "__main__":
    main()