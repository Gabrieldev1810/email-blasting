# 🧰 Email Blasting System – Development Task Breakdown

## 🧱 FRONTEND (HTML + Tailwind + JS)
- [x] Build responsive layout with Tailwind theme  
- [ ] Design login page (email-based access)  
- [x] Create dashboard with SMTP usage stats  
- [x] Campaign management form  
- [x] CSV upload UI and validation  
- [x] Real-time progress bar for sending  
- [x] Toast notifications and modals  
- [x] Responsive navbar, sidebar, and dark mode  

---

## ⚙️ BACKEND (Flask + PostgreSQL)
### Authentication
- [x] Setup Flask-JWT / Session login with email credentials  
- [ ] Encrypt SMTP credentials using AES256  
- [x] Store login sessions and track user SMTP usage  

### SMTP Management
- [x] Configure 4 SMTP accounts in DB  
- [ ] Implement SMTP rotation and load balancing logic  
- [ ] Track per-user send limits  
- [x] Add error handling and retry system
- [x] **Fixed boolean datatype issue in SMTP settings save**
- [⚠️] **Configure Gmail App Passwords for SMTP authentication**  

### Campaign & Email Logic
- [x] Create campaign table (id, name, subject, content, user_id)  
- [x] Build email queue system with timestamps  
- [x] Send emails with MIME text + HTML support  
- [x] Integrate Gmail/Outlook/Zoho as SMTP providers
- [x] **Add campaign delete functionality with confirmation dialogs**
- [x] **Add campaign edit functionality and PUT endpoint**
- [x] **Enhanced campaign view with recipient contact lists**  

---

## 🧠 EMAIL OPTIMIZATION
- [ ] Validate SPF/DKIM signatures  
- [ ] Add random delay between sends  
- [ ] Remove blacklisted/spammy words  
- [ ] Track delivery success/failure  
- [ ] Maintain reputation logs  

---

## 📊 ANALYTICS DASHBOARD
- [x] Create REST endpoints for analytics  
- [x] Fetch campaign stats for each SMTP account  
- [x] Display usage charts with Tailwind cards  

---

## 🧪 TESTING
- [ ] Test email sending flow  
- [ ] Validate SMTP rotation  
- [ ] Ensure credentials encryption/decryption  
- [ ] Simulate sending limit and auto-switch  
- [ ] Perform spam testing via Gmail/Outlook accounts  

---

## 👥 USER ROLE SYSTEM
- [x] Create 4-role user system (Admin, Manager, User, Viewer)  
- [x] Configure 4 specific emails as Manager role  
- [x] Implement role-based access control  
- [x] Restrict campaign creation to Admin/Manager only  
- [x] Add role verification middleware

---

## �🚀 DEPLOYMENT
- [ ] Deploy frontend on Vercel  
- [ ] Deploy backend on Render/AWS  
- [ ] Secure environment variables  
- [ ] Perform live test with all 4 SMTP accounts  
- [ ] Final QA + Documentation  
