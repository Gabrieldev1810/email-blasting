#!/usr/bin/env python3
"""
Simple test to see if Flask can start
"""

from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'message': 'Simple server running'})

@app.route('/')
def root():
    return jsonify({'message': 'Simple test server'})

if __name__ == '__main__':
    print("Starting simple test server...")
    try:
        from waitress import serve
        print("Using Waitress...")
        serve(app, host='127.0.0.1', port=5001)
    except ImportError:
        print("Using Flask dev server...")
        app.run(host='127.0.0.1', port=5001, debug=False)