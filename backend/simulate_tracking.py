#!/usr/bin/env python3
"""
Add some simulated email tracking data to test the dashboard charts
"""
import os
import sys
sys.path.append(os.path.dirname(__file__))

from app import create_app, db
from app.models.email_log import EmailLog, EmailStatus
from sqlalchemy import update

app = create_app()

with app.app_context():
    print("Adding simulated email tracking data...")
    
    # Get existing email logs
    logs = EmailLog.query.all()
    print(f"Found {len(logs)} email logs")
    
    if len(logs) >= 5:
        # Update some logs to OPENED status (simulate 2 opens)
        EmailLog.query.filter(EmailLog.id.in_([logs[0].id, logs[1].id])).update(
            {'status': EmailStatus.OPENED}, synchronize_session=False
        )
        
        # Update one log to CLICKED status (simulate 1 click)
        EmailLog.query.filter(EmailLog.id == logs[2].id).update(
            {'status': EmailStatus.CLICKED}, synchronize_session=False
        )
        
        # Update one log to BOUNCED status (simulate 1 bounce)
        EmailLog.query.filter(EmailLog.id == logs[3].id).update(
            {'status': EmailStatus.BOUNCED}, synchronize_session=False
        )
        
        db.session.commit()
        print("Updated email log statuses:")
        print("- 2 emails marked as OPENED")
        print("- 1 email marked as CLICKED") 
        print("- 1 email marked as BOUNCED")
        print("- 1 email remains as SENT")
    else:
        print("Not enough email logs to update")
    
    # Verify the changes
    print("\nCurrent status breakdown:")
    statuses = {}
    for log in EmailLog.query.all():
        status = log.status.value if log.status else 'None'
        statuses[status] = statuses.get(status, 0) + 1
    
    for status, count in statuses.items():
        print(f"  - {status}: {count}")