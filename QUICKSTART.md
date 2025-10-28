# Quick Start Guide - Beacon Blast

Get Beacon Blast up and running in 5 minutes!

## Prerequisites
- Docker Desktop installed
- Git installed
- 4GB RAM minimum

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/Gabrieldev1810/email-blasting.git
cd email-blasting
```

### 2. Configure Environment
```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Generate secure keys (Linux/Mac)
export SECRET_KEY=$(openssl rand -hex 32)
export JWT_SECRET=$(openssl rand -hex 32)

# Or manually edit the files and set:
# SECRET_KEY=your-random-string-here
# JWT_SECRET_KEY=another-random-string-here
```

### 3. Start the Application
```bash
docker-compose up -d
```

### 4. Access the Application
- **Frontend**: http://localhost
- **Backend API**: http://localhost:5001

### 5. Login with Default Credentials
```
Email: admin@beaconblast.com
Password: admin123
```

**⚠️ IMPORTANT: Change these credentials immediately in Settings!**

## First Steps

### 1. Configure SMTP Settings
Go to **Settings** → **SMTP Configuration** and add your email provider details:

**For Gmail:**
- SMTP Server: `smtp.gmail.com`
- Port: `587`
- Username: Your Gmail address
- Password: [App Password](https://support.google.com/accounts/answer/185833)
- Encryption: TLS

### 2. Import Contacts
1. Go to **Contacts**
2. Click **Upload CSV**
3. Use format: `email,first_name,last_name,company`

### 3. Create Your First Campaign
1. Go to **Campaigns** → **Create Campaign**
2. Fill in campaign details
3. Upload recipient list or use existing contacts
4. Choose "Send Now" or "Schedule for Later"

### 4. Monitor Performance
Check the **Dashboard** for:
- Email delivery statistics
- Open and click rates
- Campaign performance trends

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Update application
git pull
docker-compose pull
docker-compose up -d

# Backup database
docker cp beacon-blast-backend:/app/instance/beacon_blast.db ./backup.db
```

## Troubleshooting

### Can't send emails?
1. Check SMTP settings in Settings page
2. For Gmail, enable "App Passwords"
3. Check backend logs: `docker-compose logs backend`

### Frontend can't connect to backend?
1. Check `.env` file has `VITE_API_URL=http://localhost:5001`
2. Restart services: `docker-compose restart`

### Scheduled campaigns not sending?
1. Check `START_SCHEDULER=true` in `backend/.env`
2. Verify backend logs show "Campaign scheduler started"

## Next Steps

- **Production Deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Full Documentation**: See [README.md](README.md)
- **API Reference**: http://localhost:5001/api/docs

## Support
- GitHub Issues: https://github.com/Gabrieldev1810/email-blasting/issues
- Email: support@beaconblast.com

---

Happy Emailing! 📧✨
