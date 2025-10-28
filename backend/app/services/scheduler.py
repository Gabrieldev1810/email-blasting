"""
Campaign Scheduler Service

This service handles the execution of scheduled campaigns.
It runs as a background task to check for scheduled campaigns and send them at the appropriate time.
"""

import threading
import time
from datetime import datetime, timedelta
from app import db
from app.models.campaign import Campaign, CampaignStatus
from app.models.contact import Contact, ContactStatus
import logging

logger = logging.getLogger(__name__)

class CampaignScheduler:
    """Campaign scheduler for handling scheduled email campaigns."""
    
    def __init__(self, app=None):
        self.running = False
        self.thread = None
        self.check_interval = 60  # Check every minute
        self.app = app
    
    def start(self, app=None):
        """Start the scheduler."""
        if app:
            self.app = app
            
        if self.running:
            logger.info("Scheduler is already running")
            return
        
        if not self.app:
            logger.error("No Flask app provided to scheduler")
            return
            
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        logger.info("Campaign scheduler started")
    
    def stop(self):
        """Stop the scheduler."""
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)
        logger.info("Campaign scheduler stopped")
    
    def _run_scheduler(self):
        """Main scheduler loop."""
        while self.running:
            try:
                # Use the app instance provided to the scheduler
                with self.app.app_context():
                    self._process_scheduled_campaigns()
            except Exception as e:
                logger.error(f"Error in scheduler loop: {str(e)}")
            
            # Sleep for the check interval
            time.sleep(self.check_interval)
    
    def _process_scheduled_campaigns(self):
        """Check for and process scheduled campaigns that are due."""
        now = datetime.utcnow()
        
        # Find campaigns that are scheduled and due to be sent
        due_campaigns = Campaign.query.filter(
            Campaign.status == CampaignStatus.SCHEDULED,
            Campaign.scheduled_at <= now
        ).all()
        
        if len(due_campaigns) > 0:
            logger.info(f"Found {len(due_campaigns)} campaigns due for sending at {now}")
        
        for campaign in due_campaigns:
            try:
                logger.info(f"Processing scheduled campaign: {campaign.name} (ID: {campaign.id}), scheduled for: {campaign.scheduled_at}")
                
                # Import EmailService here to avoid circular imports
                from app.services.email_service import EmailService
                
                # Send the campaign using EmailService
                success, message, results = EmailService.send_campaign(campaign.id, campaign.user_id)
                
                if success:
                    logger.info(f"Successfully sent scheduled campaign: {campaign.name}. {message}")
                else:
                    logger.error(f"Failed to send scheduled campaign {campaign.name}: {message}")
                    # Mark campaign as failed
                    campaign.status = CampaignStatus.FAILED
                    db.session.commit()
                
            except Exception as e:
                logger.error(f"Error sending scheduled campaign {campaign.id}: {str(e)}", exc_info=True)
                
                # Mark campaign as failed
                try:
                    campaign.status = CampaignStatus.FAILED
                    db.session.commit()
                except Exception as commit_error:
                    logger.error(f"Failed to update campaign status: {commit_error}")

# Global scheduler instance
scheduler = CampaignScheduler()

def start_scheduler(app=None):
    """Start the global scheduler."""
    scheduler.start(app)

def stop_scheduler():
    """Stop the global scheduler."""
    scheduler.stop()


def stop_scheduler():
    """Stop the global scheduler."""
    scheduler.stop()