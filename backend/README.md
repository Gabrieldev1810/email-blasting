# Beacon Blast Backend API# Beacon Blast Email API



A production-ready Flask backend API for the Beacon Blast email marketing application.A Flask-based REST API for the Beacon Blast email marketing platform.



## 🚀 Features## Features



- **User Management**: Authentication and user profiles- 📧 Email campaign management

- **Contact Management**: Import, export, and organize email contacts  - 👥 Contact and subscriber management  

- **Campaign Management**: Create and manage email campaigns- 🔐 SMTP configuration and authentication

- **SMTP Integration**: Configurable SMTP settings with testing- 📊 Campaign analytics and reporting

- **Email Analytics**: Track opens, clicks, and bounces- 🔒 JWT-based authentication

- **PostgreSQL Database**: Robust data persistence with SQLAlchemy ORM- 🗄️ PostgreSQL database integration

- **RESTful API**: Clean, documented API endpoints

- **CORS Support**: Seamless frontend integration## Tech Stack



## 📋 Prerequisites- **Backend**: Python 3.9+ with Flask

- **Database**: PostgreSQL with SQLAlchemy ORM

- Python 3.8+- **Authentication**: JWT tokens

- PostgreSQL 12+- **Email**: SMTP integration (Gmail, Outlook, Custom)

- pip (Python package manager)- **API**: RESTful endpoints with JSON responses



## ⚡ Quick Start## Project Structure



### 1. Environment Setup```

```bashbeacon-blast-api/

cd backend├── app/

python -m venv venv│   ├── __init__.py

│   ├── models/

# Activate virtual environment│   │   ├── __init__.py

# Windows:│   │   ├── user.py

venv\Scripts\activate│   │   ├── campaign.py

# macOS/Linux:│   │   ├── contact.py

source venv/bin/activate│   │   └── smtp_config.py

```│   ├── routes/

│   │   ├── __init__.py

### 2. Install Dependencies│   │   ├── auth.py

```bash│   │   ├── campaigns.py

pip install -r requirements.txt│   │   ├── contacts.py

```│   │   └── settings.py

│   ├── services/

### 3. Database Configuration│   │   ├── __init__.py

```bash│   │   ├── email_service.py

# Copy and configure environment file│   │   └── smtp_service.py

cp .env.example .env│   └── utils/

│       ├── __init__.py

# Edit .env with your PostgreSQL credentials:│       ├── validators.py

# DATABASE_URL=postgresql://username:password@localhost:5432/beacon_blast_dev│       └── helpers.py

```├── migrations/

├── tests/

### 4. Initialize Database├── config.py

```bash├── requirements.txt

# Ensure PostgreSQL is running, then:├── app.py

python app.py└── README.md

# The app will automatically create tables and default user on first run```

```

## Installation

### 5. Start Development Server

```bash1. Create virtual environment:

python app.py```bash

```python -m venv venv

Server runs on `http://localhost:5001`source venv/bin/activate  # On Windows: venv\Scripts\activate

```

## 🔧 Environment Configuration

2. Install dependencies:

**Required Variables:**```bash

```bashpip install -r requirements.txt

DATABASE_URL=postgresql://username:password@localhost:5432/beacon_blast_dev```

SECRET_KEY=your-production-secret-key-here

FLASK_ENV=development  # Change to 'production' for prod3. Set up environment variables:

``````bash

cp .env.example .env

**Optional Variables:**# Edit .env with your database and email credentials

```bash```

JWT_SECRET_KEY=your-jwt-secret

CORS_ORIGINS=http://localhost:8081,http://localhost:51734. Initialize database:

SMTP_SERVER=smtp.gmail.com```bash

SMTP_PORT=587flask db init

```flask db migrate -m "Initial migration"

flask db upgrade

## 📚 API Documentation```



### Core Endpoints5. Run the application:

```bash

**Health Check**python app.py

- `GET /api/health` - Service health status```



**Authentication**## API Endpoints

- `POST /api/auth/login` - User authentication

- `POST /api/auth/register` - New user registration### Authentication

- `POST /api/auth/login` - User login

**Contacts**- `POST /api/auth/register` - User registration

- `GET /api/contacts` - Retrieve contacts list- `POST /api/auth/logout` - User logout

- `POST /api/contacts` - Create new contact

- `GET /api/contacts/stats` - Contact analytics### Campaigns

- `GET /api/campaigns` - List all campaigns

**SMTP Settings**- `POST /api/campaigns` - Create new campaign

- `GET /api/settings/smtp` - Get current SMTP configuration- `GET /api/campaigns/{id}` - Get campaign details

- `POST /api/settings/smtp` - Save SMTP settings- `PUT /api/campaigns/{id}` - Update campaign

- `POST /api/settings/smtp/test` - Test SMTP connection- `DELETE /api/campaigns/{id}` - Delete campaign

- `POST /api/campaigns/{id}/send` - Send campaign

**Campaigns**

- `GET /api/campaigns` - List email campaigns### Contacts

- `POST /api/campaigns` - Create new campaign- `GET /api/contacts` - List all contacts

- `POST /api/contacts` - Add new contact

## 🏗 Architecture- `PUT /api/contacts/{id}` - Update contact

- `DELETE /api/contacts/{id}` - Delete contact

```- `POST /api/contacts/import` - Import contacts from CSV

backend/

├── app/### Settings

│   ├── __init__.py          # Flask app factory- `GET /api/settings/smtp` - Get SMTP configuration

│   ├── models/              # Database models- `PUT /api/settings/smtp` - Update SMTP configuration

│   │   ├── user.py- `POST /api/settings/smtp/test` - Test SMTP connection

│   │   ├── contact.py

│   │   ├── campaign.py## Environment Variables

│   │   └── smtp_settings.py

│   └── routes/              # API endpoints```env

│       ├── auth.pyFLASK_APP=app.py

│       ├── contacts.pyFLASK_ENV=development

│       ├── campaigns.pySECRET_KEY=your-secret-key-here

│       └── settings.pyDATABASE_URL=postgresql://username:password@localhost/beacon_blast

├── migrations/              # Database migrationsJWT_SECRET_KEY=your-jwt-secret-here

├── app.py                   # Application entry point```

├── config.py               # Configuration management

└── requirements.txt        # Python dependencies## Contributing

```

1. Fork the repository

## 🚀 Production Deployment2. Create your feature branch (`git checkout -b feature/amazing-feature`)

3. Commit your changes (`git commit -m 'Add some amazing feature'`)

### 1. Environment Setup4. Push to the branch (`git push origin feature/amazing-feature`)

```bash5. Open a Pull Request

export FLASK_ENV=production

export DATABASE_URL=postgresql://user:pass@prod-server:5432/beacon_blast## License

export SECRET_KEY=your-super-secure-production-key

```This project is licensed under the MIT License.

### 2. WSGI Server (Gunicorn)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

### 3. Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-api-domain.com;
    
    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Process Management
```bash
# Using systemd
sudo systemctl start beacon-blast-api
sudo systemctl enable beacon-blast-api
```

## 🔒 Security Notes

- Always use environment variables for secrets
- Enable HTTPS in production
- Configure proper CORS origins
- Use strong SECRET_KEY values
- Regular security updates

## 🧪 Testing

```bash
# Test SMTP connectivity
curl -X POST http://localhost:5001/api/settings/smtp/test \
  -H "Content-Type: application/json" \
  -d '{"host":"smtp.gmail.com","port":587,"username":"test@gmail.com"}'

# Health check
curl http://localhost:5001/api/health
```

## 📝 License

MIT License - see LICENSE file for details.