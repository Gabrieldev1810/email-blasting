# 📨 Email Blasting System – Product Requirements Document (PRD)

## 🧭 Overview
The **Email Blasting System** is a web-based platform that enables users to send bulk email campaigns efficiently and securely using **Google SMTP** or other free SMTP servers. The system aims to provide a **modern, user-friendly, and responsive UI** while ensuring **deliverability, security, and non-spam compliance**.

---

## 🎯 Objectives
- Enable users to send mass email campaigns to targeted recipients.
- Provide intuitive UI for campaign creation, preview, and management.
- Integrate secure SMTP configuration with spam-safe practices.
- Ensure all designs are modern, responsive, and professional.
- Support CSV upload for recipient lists.
- Maintain high email deliverability (avoid spam folders).

---

## ⚙️ Tech Stack
- **Frontend:** reat js, Tailwind CSS, JavaScript (ES6)
- **Backend:** Python Flask
- **Database:** PostgreSQL
- **SMTP Integration:** Gmail SMTP / Other free SMTP providers
- **Deployment:** Vercel (frontend) + Render or AWS (backend)

---

## 🎨 Color Palette
| Color | Description | Hex Code |
|-------|--------------|----------|
| 🖤 Charcoal Black | Primary background / header | `#2B262D` |
| ⚙️ Cool Gray | Neutral sections / text secondary | `#8A8A8A` |
| 🌕 Bright Yellow | Accent / highlight / button hover | `#FFD52E` |
| 🟠 Vibrant Orange | Primary CTA buttons / icons | `#F79A25` |
| ⚪ Pure White | Background / text contrast | `#F5F5F5` |

---

## 🧱 Key Features
### 1. Campaign Management
- Create, edit, preview, and launch campaigns  
- Send test emails before launching  
- Rich text editor for composing email content  
- Preview in both desktop and mobile views  

### 2. Recipient Management
- Upload CSV of recipient emails  
- Validate and remove duplicates  
- Filter and segment contacts  

### 3. Dashboard
- Display stats: sent, delivered, opened, failed  
- Visual analytics with charts and graphs  

### 4. SMTP Configuration
- Allow user-defined SMTP (Gmail, Outlook, etc.)  
- Encrypt credentials for security  

### 5. Email Delivery Security
- DKIM and SPF header support  
- Proper MIME formatting  
- Avoid spam words and ensure safe sender reputation  

### 6. User Management
- Login, logout, and session handling (JWT or Flask session)  
- Admin panel for configuration management  

---

## 📱 Responsiveness
- Mobile-first UI using Tailwind grid/flex utilities  
- Adaptive layouts for mobile, tablet, and desktop  
- Sticky navigation and collapsible sidebar  

---

## 🔒 Security Requirements
- SMTP credentials encrypted in DB  
- Validation for file uploads (CSV format only)  
- Input sanitization for all forms  
- Email header validation to prevent spoofing  

---

## 🚀 Success Metrics
- 95% email delivery success rate  
- < 2% spam rejection rate  
- UI load time < 3 seconds  
- 100% responsiveness score on mobile  

---

## 🧑‍💻 Stakeholders
- **Product Owner:** Gab (Digital Edge Solutions)  
- **Lead Developer:** Full Stack Developer (Python + Tailwind)  
- **Frontend Developer:** UI/UX Specialist  
- **QA Tester:** Automation & Delivery Validation  

---

## 📅 Timeline
**Phase 1:** UI Design & Frontend Setup (1 week)  
**Phase 2:** SMTP Integration & Backend (1 week)  
**Phase 3:** Testing & Deployment (1 week)  
