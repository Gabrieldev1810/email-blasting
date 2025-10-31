from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
# from flask_mail import Mail
from config import config
import os

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["2000 per day", "500 per hour"],  # Increased for development with notifications
    storage_uri="memory://"  # Use Redis in production: "redis://localhost:6379"
)
# mail = Mail()

def create_app(config_name=None):
    """Application factory pattern."""
    print(f"create_app called with config: {config_name}")
    
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')
    
    print(f"Using config: {config_name}")
    app = Flask(__name__)
    print("Flask app instance created")
    
    # Validate production configuration if needed
    if config_name == 'production':
        config['production'].validate()
        print("Production config validated")
    
    app.config.from_object(config[config_name])
    print("Config loaded")
    
    # Initialize production logging
    print("Setting up production logging...")
    try:
        from app.utils.logging_config import setup_production_logging
        setup_production_logging()
        print("Production logging setup complete")
    except Exception as e:
        print(f"Logging setup error: {e}")
    
    # Disable automatic redirects for trailing slashes to prevent CORS issues
    app.url_map.strict_slashes = False
    print("URL map configured")
    
    # Initialize extensions with app
    print("Initializing database...")
    db.init_app(app)
    print("Database initialized")
    
    print("Initializing migrations...")
    migrate.init_app(app, db)
    print("Migrations initialized")
    
    print("Initializing JWT...")
    jwt.init_app(app)
    print("JWT initialized")
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        print(f"Expired token detected: {jwt_payload}")
        return {'success': False, 'error': 'Token has expired', 'msg': 'Token has expired'}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Invalid token detected - Error: {error}")
        logger.error(f"Request path: {request.path if request else 'Unknown'}")
        logger.error(f"Request headers: {dict(request.headers) if request else 'Unknown'}")
        print(f"Invalid token detected: {error}")
        return {'success': False, 'error': 'Invalid token', 'msg': str(error)}, 422
    
    @jwt.unauthorized_loader
    def unauthorized_callback(error):
        print(f"Unauthorized access: {error}")
        return {'success': False, 'error': 'Authorization required', 'msg': str(error)}, 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        print(f"Revoked token detected: {jwt_payload}")
        return {'success': False, 'error': 'Token has been revoked', 'msg': 'Token has been revoked'}, 401
    
    print("Initializing rate limiter...")
    limiter.init_app(app)
    print("Rate limiter initialized")
    
    # Configure CORS - permissive for local development
    cors.init_app(app, 
                  resources={r"/api/*": {"origins": "*"}},
                  supports_credentials=True,
                  allow_headers=['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
                  methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
                  expose_headers=['Authorization'])
    
    # mail.init_app(app)
    
    # Initialize security middleware for production
    if config_name == 'production':
        from app.utils.security import SecurityMiddleware
        SecurityMiddleware(app)
    
    # Import models so Flask-Migrate can detect them
    from app.models import user, contact, campaign, smtp_config, smtp_settings, email_log
    
    # Register blueprints
    from app.routes import auth, campaigns, contacts, settings, admin, dashboard, tracking
    from app.routes import smtp_admin, smtp_user  # New SMTP management routes
    from app.routes import notifications  # Notifications routes
    
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(campaigns.bp, url_prefix='/api/campaigns')
    app.register_blueprint(contacts.bp, url_prefix='/api/contacts')
    app.register_blueprint(settings.bp, url_prefix='/api/settings')
    app.register_blueprint(admin.admin_bp, url_prefix='/api/admin')
    app.register_blueprint(dashboard.bp, url_prefix='/api/dashboard')
    app.register_blueprint(tracking.tracking_bp)
    app.register_blueprint(notifications.notifications_bp, url_prefix='/api')
    
    # New SMTP account management routes
    app.register_blueprint(smtp_admin.smtp_admin_bp, url_prefix='/api/admin')
    app.register_blueprint(smtp_user.smtp_user_bp, url_prefix='/api')
    
    # Register error handlers
    from app.utils.error_handlers import register_error_handlers
    register_error_handlers(app)
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'message': 'Beacon Blast API is running'}
    
    # Root endpoint for testing
    @app.route('/')
    def root():
        return {'message': 'Beacon Blast API', 'version': '1.0.0'}
    
    # List all routes for debugging
    @app.route('/api/routes')
    def list_routes():
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'rule': str(rule)
            })
        return {'routes': routes}
    
    # Create default user if none exists (using app context)
    print("Setting up database and default user...")
    try:
        with app.app_context():
            print("Inside app context")
            from app.models.user import User
            print("User model imported")
            
            # Ensure tables exist
            print("Creating database tables...")
            db.create_all()
            print("Database tables created")
            
            print("Checking for existing users...")
            user_count = User.query.count()
            print(f"Found {user_count} existing users")
            
            if user_count == 0:
                print("Creating default admin user...")
                from app.models.user import UserRole
                default_user = User(
                    email='admin@beaconblast.com',
                    password='admin123',
                    first_name='Admin',
                    last_name='User',
                    role=UserRole.ADMIN,
                    is_active=True
                )
                db.session.add(default_user)
                db.session.commit()
                print("Default admin user created successfully")
            else:
                print("Default user already exists")
    except Exception as e:
        print(f"Error in database setup: {e}")
        import traceback
        traceback.print_exc()
        try:
            db.session.rollback()
        except:
            pass
    
    return app