"""
Production error handlers for Flask application.
Provides secure error responses without exposing sensitive information.
"""

from flask import jsonify, request, current_app
import logging
import traceback

logger = logging.getLogger(__name__)

def register_error_handlers(app):
    """Register error handlers with the Flask application."""
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle bad request errors."""
        logger.warning(f"Bad request from {request.remote_addr}: {request.url}")
        return jsonify({
            'error': 'Bad Request',
            'message': 'The request could not be understood by the server.',
            'success': False
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle unauthorized errors."""
        logger.warning(f"Unauthorized access attempt from {request.remote_addr}: {request.url}")
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication is required to access this resource.',
            'success': False
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle forbidden errors."""
        logger.warning(f"Forbidden access attempt from {request.remote_addr}: {request.url}")
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have permission to access this resource.',
            'success': False
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle not found errors."""
        logger.info(f"404 error from {request.remote_addr}: {request.url}")
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource could not be found.',
            'success': False
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """Handle method not allowed errors."""
        logger.warning(f"Method not allowed from {request.remote_addr}: {request.method} {request.url}")
        return jsonify({
            'error': 'Method Not Allowed',
            'message': 'The method is not allowed for the requested URL.',
            'success': False
        }), 405
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        """Handle request too large errors."""
        logger.warning(f"Request too large from {request.remote_addr}: {request.url}")
        return jsonify({
            'error': 'Request Too Large',
            'message': 'The request payload is too large.',
            'success': False
        }), 413
    
    @app.errorhandler(429)
    def too_many_requests(error):
        """Handle rate limiting errors."""
        logger.warning(f"Rate limit exceeded from {request.remote_addr}: {request.url}")
        return jsonify({
            'error': 'Too Many Requests',
            'message': 'Rate limit exceeded. Please try again later.',
            'success': False,
            'retry_after': 60
        }), 429
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Handle internal server errors."""
        logger.error(f"Internal server error from {request.remote_addr}: {request.url}")
        logger.error(f"Error details: {str(error)}")
        
        # Log full traceback in debug mode
        if current_app.debug:
            logger.error(f"Traceback: {traceback.format_exc()}")
        
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An internal server error occurred. Please try again later.',
            'success': False
        }), 500
    
    @app.errorhandler(503)
    def service_unavailable(error):
        """Handle service unavailable errors."""
        logger.error(f"Service unavailable from {request.remote_addr}: {request.url}")
        return jsonify({
            'error': 'Service Unavailable',
            'message': 'The service is temporarily unavailable. Please try again later.',
            'success': False
        }), 503


def handle_validation_error(errors):
    """Handle validation errors with proper formatting."""
    logger.warning(f"Validation error from {request.remote_addr}: {errors}")
    return jsonify({
        'error': 'Validation Failed',
        'message': 'The provided data failed validation.',
        'validation_errors': errors,
        'success': False
    }), 400


def handle_database_error(error):
    """Handle database errors securely."""
    logger.error(f"Database error: {str(error)}")
    
    # Don't expose database details in production
    if current_app.config.get('ENV') == 'production':
        message = 'A database error occurred. Please try again later.'
    else:
        message = f'Database error: {str(error)}'
    
    return jsonify({
        'error': 'Database Error',
        'message': message,
        'success': False
    }), 500


def handle_email_error(error):
    """Handle email sending errors."""
    logger.error(f"Email error: {str(error)}")
    
    return jsonify({
        'error': 'Email Error',
        'message': 'Failed to send email. Please check your email configuration.',
        'success': False
    }), 500


def handle_file_error(error):
    """Handle file upload/processing errors."""
    logger.error(f"File error: {str(error)}")
    
    return jsonify({
        'error': 'File Error',
        'message': 'Failed to process file. Please check the file format and try again.',
        'success': False
    }), 400