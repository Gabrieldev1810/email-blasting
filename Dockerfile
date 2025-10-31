# Production Dockerfile for Beacon Blast Email Platform
FROM node:20-slim

# Install system dependencies including Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files from temp directory and install Node.js dependencies
COPY .build-temp/package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Install Python dependencies
RUN cd backend && pip3 install --no-cache-dir -r requirements.txt

# Build frontend
RUN npm run build

# Create production user
RUN useradd -r -s /bin/false appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]
