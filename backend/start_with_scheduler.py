#!/usr/bin/env python3
"""
Start the backend server with scheduler enabled
"""
import os
import sys

# Set environment variable to enable scheduler
os.environ['START_SCHEDULER'] = 'true'

# Add the backend directory to Python path
sys.path.append(os.path.dirname(__file__))

if __name__ == '__main__':
    from app import create_app
    
    app = create_app()
    
    print("Starting Flask server with campaign scheduler...")
    app.run(host='127.0.0.1', port=5001, debug=False, use_reloader=False, threaded=True)