#!/usr/bin/env python3
"""
Test Flask server with proper status updates via HTTP
"""

from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

print("Starting simple Flask test server...")

try:
    from app import create_app
    
    # Create Flask application
    app = create_app()
    
    @app.route('/test-status')
    def test_status():
        return {'message': 'Server is running properly!', 'status': 'ok'}
    
    if __name__ == '__main__':
        print("Flask server starting on port 5001...")
        app.run(host='127.0.0.1', port=5001, debug=False, use_reloader=False)
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()