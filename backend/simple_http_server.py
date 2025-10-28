#!/usr/bin/env python3
"""
Ultra-simple Flask server for frontend testing
"""
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import socket

class CORSHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # Add CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        
        if parsed_path.path == '/api/health':
            response = {'status': 'healthy', 'message': 'Simple HTTP server running'}
        elif parsed_path.path == '/api/dashboard/stats':
            response = {
                'success': True,
                'data': {
                    'total_contacts': 150,
                    'active_contacts': 145,
                    'unsubscribed_contacts': 3,
                    'bounced_contacts': 2,
                    'total_campaigns': 8,
                    'total_emails_sent': 1200,
                    'total_emails_opened': 780,
                    'total_emails_clicked': 234,
                    'email_open_rate': 65.0,
                    'email_click_rate': 19.5,
                    'recent_campaigns': [
                        {
                            'id': 1,
                            'name': 'Welcome Series - Week 1',
                            'status': 'completed',
                            'emails_sent': 150,
                            'emails_opened': 95,
                            'emails_clicked': 28,
                            'created_at': '2025-10-20T10:00:00'
                        },
                        {
                            'id': 2,
                            'name': 'Product Launch Newsletter',
                            'status': 'completed',
                            'emails_sent': 200,
                            'emails_opened': 130,
                            'emails_clicked': 45,
                            'created_at': '2025-10-19T14:30:00'
                        }
                    ]
                }
            }
        else:
            response = {'error': 'Not found', 'path': parsed_path.path}
        
        self.wfile.write(json.dumps(response).encode())

def check_port(port):
    """Check if port is available"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex(('127.0.0.1', port)) != 0

if __name__ == '__main__':
    port = 5001
    
    if not check_port(port):
        print(f"Port {port} is in use, trying port 5002...")
        port = 5002
    
    print(f"Starting simple HTTP server on http://127.0.0.1:{port}")
    print("Available endpoints:")
    print("  GET /api/health - Health check")
    print("  GET /api/dashboard/stats - Dashboard statistics")
    print("Press Ctrl+C to stop")
    
    server = HTTPServer(('127.0.0.1', port), CORSHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        server.shutdown()