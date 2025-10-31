# 📨 Beacon Blast - Email Marketing Platform

A modern, full-stack email marketing platform built with React, Flask, and PostgreSQL.

## 🚀 Project Overview

**Beacon Blast** is a comprehensive email marketing solution featuring:
- 📧 **Email Campaign Management** - Create, send, and track email campaigns
- 👥 **Contact Management** - Import, organize, and segment email lists  
- ⚙️ **SMTP Integration** - Support for Gmail, Outlook, Yahoo, and custom SMTP
- 📊 **Analytics Dashboard** - Track opens, clicks, bounces, and deliverability
- 🎨 **Modern UI** - Responsive design with Tailwind CSS and Shadcn/UI

## 🏗️ Tech Stack

### **Frontend**
- ⚛️ **React 18** with TypeScript
- 🎨 **Tailwind CSS** for styling
- 🧩 **Shadcn/UI** component library
- 📱 **Responsive design** (mobile-first)
- ⚡ **Vite** for fast development

### **Backend**  
- 🐍 **Flask** Python web framework
- 🗄️ **PostgreSQL** database with SQLAlchemy ORM
- 📧 **SMTP integration** (Gmail, Outlook, Yahoo, Custom)
- 🔐 **JWT authentication**
- 🔒 **Encrypted credential storage**

## 📁 Project Structure

```
beacon-blast-ui/                    # 📦 Monorepo Root
├── src/                           # 🎨 Frontend (React + Tailwind)
├── backend/                       # 🔧 Backend (Flask + PostgreSQL)  
├── md-files/                      # 📚 Documentation
└── public/                        # 🖼️ Static assets
```

## 🚀 Quick Start

### **Frontend Development**
```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd beacon-blast-ui

# Install dependencies
npm install

# Start development server
npm run dev
# ➜ Local: http://localhost:5173
```

### **Backend Development**
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment
copy .env.example .env
# Edit .env with your database credentials

# Start backend server
python app.py
# ➜ Local: http://localhost:5000
```

## 🎯 Features

### ✅ **Completed Features**
- 🎨 **Modern UI Design** - Professional interface with PRD color scheme
- 📱 **Responsive Layout** - Works on desktop, tablet, and mobile
- 👥 **Contact Management** - Import CSV, add/edit contacts, status tracking
- ⚙️ **SMTP Configuration** - Multiple providers with connection testing
- 🔧 **Settings Management** - User preferences, security settings
- 🏗️ **Backend Architecture** - Complete Flask API structure
- 📧 **Email Services** - SMTP integration with encryption
- 🗄️ **Database Models** - User, Campaign, Contact, SMTP Config

### 🔄 **In Development**
- 📡 **API Routes** - REST endpoints for frontend integration
- 🔐 **Authentication** - JWT-based user management  
- 📧 **Campaign Sending** - Email delivery and tracking
- 📊 **Analytics** - Open/click tracking and reporting

## 📊 Project Status: 87% Complete

**Frontend**: 🟢 90% Complete  
**Backend**: 🟡 85% Complete  
**Integration**: 🔴 0% Complete  

## 🛠️ Development Commands

### **Frontend** (from root directory)
```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### **Backend** (from backend/ directory)  
```bash
python app.py        # Start Flask server
flask db migrate     # Create migration
flask db upgrade     # Apply migrations
```

## 🚀 Deployment

### **Nixpacks** - Coolify/Railway (Recommended)
Nixpacks automatically detects and builds both frontend and backend:

```bash
# Build and deploy with Nixpacks (automatic detection)
nixpacks build .     # Local build test
# Or simply deploy to Coolify/Railway
```

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - JWT token secret
- `FLASK_ENV=production`
- `PORT=5001`

The included `nixpacks.toml` configures:
- ⚛️ Node.js 18 for frontend build (Vite)
- 🐍 Python 3.12 for backend runtime (Flask)
- 🌐 Nginx reverse proxy (frontend → backend API)
- 📁 Static file serving from `dist/`

### **Alternative Deployments**

#### **Frontend** - Vercel
```bash
npm run build        # Build production files
# Deploy dist/ folder to Vercel
```

#### **Backend** - Render/AWS/Railway  
```bash
# Set environment variables
# Deploy backend/ folder with requirements.txt
```

## 📚 Documentation

- 📋 **[Development Progress](DEVELOPMENT_PROGRESS.md)** - Current status and completed tasks
- 🏗️ **[Monorepo Guide](MONOREPO_GUIDE.md)** - Project structure and workflow
- 📝 **[Product Requirements](md-files/prd.md)** - Feature specifications
- ✅ **[Task Breakdown](md-files/task.md)** - Development tasks
- 📅 **[Execution Plan](md-files/plan.md)** - Project timeline

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1fab9ff2-5e96-4ede-863b-888f34d52f2a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
