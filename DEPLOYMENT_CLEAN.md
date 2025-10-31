# Clean Deployment Setup

This repository now has a clean, minimal deployment configuration.

## Local Development
- Uses `.env` file for local development settings
- Run `npm run dev` for frontend development
- Run `python backend/app.py` for backend development

## Production Deployment
- Uses `.env.production` file for production settings
- Uses simple multi-stage Dockerfile
- Builds React frontend and serves Flask backend on port 3000

## Files Structure

### Development Files (Not Deployed)
- `.env` - Local development environment
- `src/` - React source code
- `backend/app/` - Flask source code

### Deployment Files
- `Dockerfile` - Simple multi-stage build
- `.env.production` - Production environment variables
- `.dockerignore` - Files to exclude from Docker build

### Coolify Configuration
The deployment uses Docker mode in Coolify with:
1. Automatic build from Dockerfile
2. Environment variables from `.env.production`
3. Health checks on `/api/health` endpoint
4. Port 3000 exposure