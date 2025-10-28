#!/usr/bin/env python3
"""
Test campaign scheduling functionality
"""
import os
import sys
sys.path.append(os.path.dirname(__file__))
from datetime import datetime, timedelta

from app import create_app, db
from app.models.campaign import Campaign, CampaignStatus

app = create_app()

with app.app_context():
    print("=== Testing Campaign Scheduling ===")
    
    # Check for scheduled campaigns
    scheduled = Campaign.query.filter_by(status=CampaignStatus.SCHEDULED).all()
    print(f"Scheduled campaigns: {len(scheduled)}")
    
    for campaign in scheduled:
        print(f"Campaign: {campaign.name}")
        print(f"  ID: {campaign.id}")
        print(f"  Status: {campaign.status}")
        print(f"  Scheduled for: {campaign.scheduled_at}")
        print(f"  Current time: {datetime.utcnow()}")
        
        if campaign.scheduled_at:
            diff = campaign.scheduled_at - datetime.utcnow()
            if diff.total_seconds() > 0:
                print(f"  Time until execution: {diff}")
            else:
                print(f"  OVERDUE by: {-diff}")
        print()
    
    # Check recent campaigns
    recent = Campaign.query.order_by(Campaign.created_at.desc()).limit(3).all()
    print("Recent campaigns:")
    for campaign in recent:
        print(f"  {campaign.name} - Status: {campaign.status} - Created: {campaign.created_at}")