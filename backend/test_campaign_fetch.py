#!/usr/bin/env python3
"""
Test if campaigns can be fetched without enum errors after the fix
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.campaign import Campaign
from app.models.user import User

def test_campaign_fetch():
    """Test if campaigns can be fetched without enum errors"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🔍 Testing campaign fetch after enum fix...")
            
            # Try to fetch all campaigns
            campaigns = Campaign.query.all()
            print(f"✅ Successfully fetched {len(campaigns)} campaigns")
            
            # Display campaign details
            for campaign in campaigns:
                print(f"   Campaign ID {campaign.id}: '{campaign.name}' - Status: {campaign.status}")
            
            print("\n🎉 Campaign enum fix successful - no more errors!")
            return True
            
        except Exception as e:
            print(f"❌ Error fetching campaigns: {e}")
            return False

if __name__ == "__main__":
    success = test_campaign_fetch()
    if success:
        print("\n✅ Campaigns can now be fetched without enum errors!")
        print("   The Flask API should now work properly for campaign operations.")
    else:
        print("\n❌ Still having issues with campaign fetching")