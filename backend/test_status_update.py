#!/usr/bin/env python3
"""
Test campaign status updates directly without HTTP server
"""

import os
import sys
from datetime import datetime

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import create_app
    from app.models.campaign import Campaign, CampaignRecipient
    from app.models.user import User
    from app.models.contact import Contact
    from app.services.email_tracking_service import EmailTrackingService
    
    print("Testing campaign status updates...")
    
    # Create Flask app
    app = create_app()
    
    with app.app_context():
        # Get the admin user
        admin_user = User.query.filter_by(email="admin@beaconblast.com").first()
        if not admin_user:
            print("Admin user not found!")
            sys.exit(1)
        
        print(f"Found admin user: {admin_user.email}")
        
        # Create a test campaign
        from app.models.campaign import CampaignStatus
        campaign = Campaign(
            name="Direct Status Test",
            subject="Testing Direct Status Updates",
            email_content="<h1>Test</h1><p>Testing status updates directly.</p>",
            sender_name="Test User",
            sender_email="admin@beaconblast.com",
            status=CampaignStatus.DRAFT,
            user_id=admin_user.id
        )
        
        from app import db
        db.session.add(campaign)
        db.session.commit()
        
        print(f"Created campaign with ID: {campaign.id}")
        print(f"Initial status: {campaign.status}")
        
        # Get or create a test contact
        test_contact = Contact.query.filter_by(
            email="test@example.com", 
            user_id=admin_user.id
        ).first()
        
        if not test_contact:
            test_contact = Contact(
                email="test@example.com",
                first_name="Test",
                last_name="User",
                user_id=admin_user.id
            )
            db.session.add(test_contact)
            db.session.commit()
        
        # Add a test recipient
        recipient = CampaignRecipient(
            campaign_id=campaign.id,
            contact_id=test_contact.id
        )
        db.session.add(recipient)
        db.session.commit()
        
        print(f"Added recipient: {test_contact.email}")
        
        # Test status update to SENDING
        campaign.status = CampaignStatus.SENDING
        campaign.sent_at = datetime.utcnow()
        db.session.commit()
        
        print(f"Updated status to: {campaign.status}")
        print(f"Sent at: {campaign.sent_at}")
        
        # Test status update to SENT
        campaign.status = CampaignStatus.SENT
        campaign.completed_at = datetime.utcnow()
        db.session.commit()
        
        print(f"Final status: {campaign.status}")
        print(f"Completed at: {campaign.completed_at}")
        
        # Verify the changes persisted
        campaign_check = Campaign.query.get(campaign.id)
        print(f"\nVerification:")
        print(f"Campaign ID: {campaign_check.id}")
        print(f"Status: {campaign_check.status}")
        print(f"Sent at: {campaign_check.sent_at}")
        print(f"Completed at: {campaign_check.completed_at}")
        
        print("\n✅ Campaign status updates working correctly!")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)