#!/usr/bin/env python3
"""
Smart migration script that uses real contacts and campaigns data
"""
import sys
import os
from datetime import datetime, timedelta
import random

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.contact import Contact, ContactStatus  
from app.models.campaign import Campaign, CampaignStatus
from app.models.user import User
from app.models.email_log import EmailLog, EmailStatus, BounceType, LinkClick

def create_smart_sample_data():
    app = create_app()
    
    with app.app_context():
        print("=== SMART EMAIL LOG MIGRATION ===\n")
        
        # Check existing data
        users = User.query.all()
        contacts = Contact.query.filter_by(status=ContactStatus.ACTIVE).all()
        campaigns = Campaign.query.all()
        existing_logs = EmailLog.query.count()
        
        print(f"Found: {len(users)} users, {len(contacts)} contacts, {len(campaigns)} campaigns")
        print(f"Existing EmailLog records: {existing_logs}")
        
        if existing_logs > 0:
            print("EmailLog records already exist. Skipping migration.")
            return
            
        if len(contacts) == 0:
            print("⚠️  No active contacts found. Creating sample contacts first...")
            create_sample_contacts()
            contacts = Contact.query.filter_by(status=ContactStatus.ACTIVE).all()
            
        if len(campaigns) == 0:
            print("⚠️  No campaigns found. Creating sample campaigns first...")
            create_sample_campaigns()
            campaigns = Campaign.query.all()
            
        if len(users) == 0:
            print("⚠️  No users found. Cannot create campaigns without users.")
            return
            
        # Now create EmailLog records using real data
        print(f"\n📧 Creating EmailLog records using {len(contacts)} real contacts and {len(campaigns)} campaigns...")
        
        created_logs = 0
        for campaign in campaigns:
            # For each campaign, create logs for a subset of contacts
            num_recipients = min(len(contacts), random.randint(5, 20))  # 5-20 recipients per campaign
            selected_contacts = random.sample(contacts, num_recipients)
            
            for contact in selected_contacts:
                # Create EmailLog record
                sent_time = campaign.created_at + timedelta(hours=random.randint(1, 24))
                
                # Determine status based on realistic engagement rates
                rand = random.random()
                if rand < 0.05:  # 5% bounce rate
                    status = EmailStatus.BOUNCED
                    opened_at = None
                    clicked_at = None
                    bounce_type = random.choice([BounceType.SOFT, BounceType.HARD])
                    bounce_reason = random.choice([
                        "Mailbox full", "Invalid recipient", "Spam filter", 
                        "Server unavailable", "Message too large"
                    ])
                elif rand < 0.35:  # 30% open rate (35% - 5%)
                    status = random.choice([EmailStatus.OPENED, EmailStatus.CLICKED])
                    opened_at = sent_time + timedelta(minutes=random.randint(5, 1440))  # 5 min to 24 hours
                    clicked_at = opened_at + timedelta(minutes=random.randint(1, 30)) if status == EmailStatus.CLICKED else None
                    bounce_type = None
                    bounce_reason = None
                else:  # 65% just sent (not opened)
                    status = EmailStatus.SENT
                    opened_at = None
                    clicked_at = None
                    bounce_type = None
                    bounce_reason = None
                
                email_log = EmailLog(
                    campaign_id=campaign.id,
                    recipient_email=contact.email,
                    recipient_name=f"{contact.first_name} {contact.last_name}".strip(),
                    status=status,
                    sent_at=sent_time,
                    opened_at=opened_at,
                    clicked_at=clicked_at,
                    bounce_type=bounce_type,
                    bounce_reason=bounce_reason,
                    tracking_id=f"tk_{campaign.id}_{contact.id}_{random.randint(1000, 9999)}"
                )
                
                db.session.add(email_log)
                created_logs += 1
                
                # Create some click records for clicked emails
                if status == EmailStatus.CLICKED and clicked_at:
                    num_clicks = random.randint(1, 3)
                    for _ in range(num_clicks):
                        click_time = clicked_at + timedelta(minutes=random.randint(0, 60))
                        link_click = LinkClick(
                            email_log_id=email_log.id,
                            link_url=f"https://example.com/page{random.randint(1, 5)}",
                            clicked_at=click_time,
                            ip_address=f"192.168.1.{random.randint(1, 254)}",
                            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                        )
                        db.session.add(link_click)
        
        db.session.commit()
        print(f"✅ Created {created_logs} EmailLog records using real contact and campaign data!")
        
        # Show summary
        show_data_summary()

def create_sample_contacts():
    """Create sample contacts if none exist"""
    sample_contacts = [
        ("john.doe@example.com", "John", "Doe"),
        ("jane.smith@example.com", "Jane", "Smith"),
        ("bob.johnson@example.com", "Bob", "Johnson"),
        ("alice.williams@example.com", "Alice", "Williams"),
        ("charlie.brown@example.com", "Charlie", "Brown"),
        ("diana.davis@example.com", "Diana", "Davis"),
        ("evan.miller@example.com", "Evan", "Miller"),
        ("fiona.wilson@example.com", "Fiona", "Wilson"),
        ("george.moore@example.com", "George", "Moore"),
        ("helen.taylor@example.com", "Helen", "Taylor")
    ]
    
    user = User.query.first()
    if not user:
        print("No user found to assign contacts to")
        return
        
    for email, first_name, last_name in sample_contacts:
        contact = Contact(
            email=email,
            first_name=first_name,
            last_name=last_name,
            status=ContactStatus.ACTIVE,
            user_id=user.id,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
        )
        db.session.add(contact)
    
    db.session.commit()
    print(f"✅ Created {len(sample_contacts)} sample contacts")

def create_sample_campaigns():
    """Create sample campaigns if none exist"""
    user = User.query.first()
    if not user:
        print("No user found to assign campaigns to")
        return
        
    sample_campaigns = [
        "Welcome Newsletter",
        "Product Launch Announcement", 
        "Monthly Newsletter",
        "Special Offer Campaign",
        "Customer Survey"
    ]
    
    for name in sample_campaigns:
        campaign = Campaign(
            name=name,
            subject=f"Subject: {name}",
            body=f"<h1>{name}</h1><p>This is the content for {name}</p>",
            status=CampaignStatus.COMPLETED,
            user_id=user.id,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 60))
        )
        db.session.add(campaign)
    
    db.session.commit()
    print(f"✅ Created {len(sample_campaigns)} sample campaigns")

def show_data_summary():
    """Show summary of created data"""
    print("\n=== DATA SUMMARY ===")
    
    # Email status counts
    for status in EmailStatus:
        count = EmailLog.query.filter_by(status=status).count()
        print(f"{status.value.title()}: {count}")
    
    # Bounce type counts
    bounce_counts = db.session.query(
        EmailLog.bounce_type, 
        db.func.count(EmailLog.id)
    ).filter(
        EmailLog.bounce_type.isnot(None)
    ).group_by(EmailLog.bounce_type).all()
    
    if bounce_counts:
        print("\nBounce Types:")
        for bounce_type, count in bounce_counts:
            print(f"{bounce_type.value}: {count}")
    
    # Click counts
    total_clicks = LinkClick.query.count()
    print(f"\nTotal Link Clicks: {total_clicks}")
    
    print("\n✅ Smart migration complete! Your EmailLog system now uses real contact and campaign data.")

if __name__ == "__main__":
    create_smart_sample_data()