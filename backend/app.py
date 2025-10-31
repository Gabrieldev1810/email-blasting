from dotenv import load_dotenv
import os
import atexit

# Load environment variables
load_dotenv()

print("Loading Flask application...")

try:
    from app import create_app
    print("Flask app factory imported successfully")
    
    # Create Flask application
    app = create_app()
    print("Flask application created successfully")
    
except Exception as e:
    print(f"Error creating Flask application: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') != 'production'  # Enable debug only in development
    
    # Enable scheduler by default (can be disabled with START_SCHEDULER=false)
    start_scheduler_flag = os.environ.get('START_SCHEDULER', 'true').lower() == 'true'
    
    if start_scheduler_flag:
        try:
            # Import and start the scheduler
            from app.services.scheduler import start_scheduler, stop_scheduler
            start_scheduler(app)
            # Register cleanup function
            atexit.register(stop_scheduler)
            print("✅ Campaign scheduler started - checking every 60 seconds for scheduled campaigns")
        except Exception as e:
            print(f"❌ Failed to start scheduler: {e}")
            print("Starting server without scheduler...")
    else:
        print("⚠️  Scheduler is disabled - scheduled campaigns will not be sent automatically")
    
    print(f"Beacon Blast API starting on port {port}")
    print(f"Debug mode: {'ON' if debug else 'OFF'}")
    print(f"Scheduler: {'ON ✅' if start_scheduler_flag else 'OFF ⚠️'}")
    print(f"Starting Flask server on 127.0.0.1:{port}...")
    
    # Check if port is available
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        result = sock.connect_ex(('127.0.0.1', port))
        if result == 0:
            print(f"Warning: Port {port} appears to be in use")
        else:
            print(f"Port {port} is available")
    
    print(f"Server will be available at: http://127.0.0.1:{port}")
    
    try:
        # Use appropriate host for production
        host = '0.0.0.0' if os.environ.get('FLASK_ENV') == 'production' else '127.0.0.1'
        print(f"Using Flask server on {host}:{port}...")
        app.run(host=host, port=port, debug=debug, use_reloader=False, threaded=True)
    except KeyboardInterrupt:
        print("Server stopped by user")
    except Exception as e:
        print(f"Failed to start Flask server: {e}")
        import traceback
        traceback.print_exc()