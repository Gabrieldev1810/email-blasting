# Production Deployment Instructions

## 🚀 Beacon Blast Email Platform - Production Setup

### 📋 Post-Deployment Setup

After your Coolify deployment is successful, follow these steps:

### 1. 🔐 Initial Admin Account Setup

Run the one-time setup script to create your admin account:

```bash
# Access your deployed application terminal in Coolify
# Or SSH into your server and navigate to the app directory

# Run the admin setup script
python3 setup_admin.py
# OR
npm run setup
```

**Admin Credentials (Change after first login!):**
- Email: `gab.duano101898@gmail.com`
- Password: `Gabriel_101898@@`

### 2. 🌐 Access Your Application

1. Open your Coolify-provided URL
2. Login with the credentials above
3. **Immediately change your password** in User Profile settings

### 3. ⚙️ Configure SMTP Settings

Navigate to **Settings > SMTP Configuration** and add your email provider:

**For Gmail:**
- SMTP Server: `smtp.gmail.com`
- Port: `587`
- Use TLS: `Yes`
- Username: Your Gmail address
- Password: Your Gmail App Password (not regular password)

### 4. 🗑️ Security Cleanup

After successful setup:

```bash
# Delete the setup script for security
rm setup_admin.py
```

### 5. ✅ Verification Steps

Test your deployment:
1. ✅ Can login as admin
2. ✅ Can access dashboard
3. ✅ Can configure SMTP settings
4. ✅ Can create test campaigns
5. ✅ Can upload contacts

### 🛠️ Environment Variables (For Coolify)

Add these environment variables in Coolify if needed:

```bash
FLASK_ENV=production
NODE_ENV=production
PORT=3000
SECRET_KEY=your-super-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
```

### 🆘 Troubleshooting

**If setup script fails:**
1. Check if Python dependencies are installed
2. Ensure database is accessible
3. Check application logs in Coolify

**If admin login doesn't work:**
1. Verify the setup script completed successfully
2. Check that the database was created
3. Try running the setup script again

### 📞 Support

For issues with:
- **Deployment**: Check Coolify logs and build process
- **Database**: Verify SQLite file permissions
- **Email**: Test SMTP settings with a simple test email
- **Authentication**: Verify admin user was created successfully

---

**🎉 Your Beacon Blast Email Platform is now ready for production use!**

Start creating powerful email campaigns and managing your contact lists effectively.