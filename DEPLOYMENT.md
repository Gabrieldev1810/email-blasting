# Beacon Blast Email Marketing Platform - Production Deployment Guide

## 🚀 Production Deployment Checklist

### 1. Environment Setup

#### Frontend Production Build
```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview

# Deploy static files to your hosting service (Netlify, Vercel, etc.)
```

#### Backend Production Setup
```bash
# Create production virtual environment
python -m venv venv_prod
source venv_prod/bin/activate  # Linux/Mac
# or
venv_prod\Scripts\activate     # Windows

# Install production dependencies
pip install -r requirements.txt

# Set production environment variables
cp .env.production.example .env
# Edit .env with your production values
```

### 2. Database Configuration

#### PostgreSQL Production Setup
```sql
-- Create production database
CREATE DATABASE beacon_blast_prod;
CREATE USER beacon_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE beacon_blast_prod TO beacon_user;
```

#### Run Database Migrations
```bash
# Initialize database schema
flask db upgrade

# Verify tables created
python -c "from app import create_app, db; app = create_app('production'); app.app_context().do(db.create_all())"
```

### 3. Security Configuration

#### Required Environment Variables
- ✅ `SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`
- ✅ `JWT_SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`  
- ✅ `DATABASE_URL`: Production PostgreSQL connection string
- ✅ `BASE_URL`: Your production domain (https://your-domain.com)
- ✅ `FRONTEND_URL`: Your frontend domain  
- ✅ `ALLOWED_ORIGINS`: Comma-separated allowed domains

#### Security Headers (Nginx Example)
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # API proxy
    location /api {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Email Configuration

#### SMTP Settings
- Use app passwords for Gmail/Outlook
- Configure SPF records: `v=spf1 include:your-smtp-provider.com ~all`
- Set up DKIM signing for better deliverability
- Configure DMARC policy: `v=DMARC1; p=quarantine; rua=mailto:admin@your-domain.com`

### 5. Monitoring & Logging

#### Log Files Location
```bash
# Application logs
/path/to/app/logs/beacon_blast.log
/path/to/app/logs/beacon_blast_errors.log

# Monitor log files
tail -f logs/beacon_blast.log
```

#### Health Check Endpoint
```bash
# Check if API is running
curl https://your-domain.com/api/health
```

### 6. Process Management

#### Using systemd (Linux)
```ini
# /etc/systemd/system/beacon-blast.service
[Unit]
Description=Beacon Blast Email Marketing API
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/beacon-blast
Environment=PATH=/path/to/beacon-blast/venv_prod/bin
ExecStart=/path/to/beacon-blast/venv_prod/bin/gunicorn -w 4 -b 0.0.0.0:5001 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable beacon-blast
sudo systemctl start beacon-blast
sudo systemctl status beacon-blast
```

### 7. Performance Optimization

#### Database Indexes
```sql
-- Optimize campaign queries
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at);

-- Optimize email tracking
CREATE INDEX idx_email_logs_campaign_id ON email_logs(campaign_id);
CREATE INDEX idx_email_logs_contact_id ON email_logs(contact_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);

-- Optimize contact queries
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_status ON contacts(status);
```

#### Frontend Optimizations
- ✅ Code splitting implemented
- ✅ Tree shaking enabled  
- ✅ Lazy loading for large components
- ✅ Image optimization for assets
- ✅ CDN configuration for static assets

### 8. Backup Strategy

#### Database Backups
```bash
# Daily database backup
pg_dump beacon_blast_prod > backup_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/beacon-blast"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump beacon_blast_prod | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# Keep last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

#### File System Backups
```bash
# Backup uploaded files and logs
tar -czf beacon_blast_files_$(date +%Y%m%d).tar.gz uploads/ logs/
```

### 9. SSL Certificate

#### Using Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (add to crontab)
0 12 * * * /usr/bin/certbot renew --quiet
```

### 10. Deployment Commands

#### Complete Production Deployment
```bash
# Frontend deployment
npm run build
# Upload dist/ folder to your CDN/hosting service

# Backend deployment  
git pull origin main
pip install -r requirements.txt
flask db upgrade
sudo systemctl restart beacon-blast
sudo systemctl restart nginx
```

### 11. Post-Deployment Verification

#### Checklist
- ✅ Health check endpoint responds
- ✅ Database migrations completed
- ✅ Email sending works
- ✅ Authentication system functional
- ✅ HTTPS certificate valid
- ✅ CORS properly configured
- ✅ Logs writing correctly
- ✅ File uploads working
- ✅ Email tracking operational

#### Test Commands
```bash
# Test API health
curl https://your-domain.com/api/health

# Test authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@beaconblast.com","password":"your-password"}'

# Check logs for errors
tail -n 100 logs/beacon_blast_errors.log
```

## 🛡️ Security Best Practices

1. **Regular Updates**: Keep dependencies updated
2. **Access Control**: Use strong passwords and 2FA
3. **Network Security**: Configure firewalls and VPN access
4. **Monitoring**: Set up error alerting and log monitoring  
5. **Backup Testing**: Regularly test backup restoration
6. **Vulnerability Scanning**: Use automated security scanning tools

## 📊 Monitoring & Alerts

### Key Metrics to Monitor
- API response times
- Database connection pool usage
- Email delivery rates
- Error rates and types
- Disk space usage
- Memory and CPU utilization

### Recommended Monitoring Tools
- Application: New Relic, DataDog, or Sentry
- Infrastructure: Prometheus + Grafana
- Uptime: UptimeRobot or Pingdom
- Logs: ELK Stack or Fluentd

---

## 🎉 Production Launch Complete!

Your Beacon Blast Email Marketing Platform is now ready for production use with:
- ✅ Optimized performance
- ✅ Production-grade security  
- ✅ Comprehensive logging
- ✅ Automated backups
- ✅ Health monitoring
- ✅ SSL encryption

For support and updates, refer to the project documentation or contact the development team.