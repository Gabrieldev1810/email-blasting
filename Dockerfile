# Production Dockerfile for Beacon Blast Email Platform
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    python3 \
    python3-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy application source first
COPY . .

# Debug: Check if package.json exists
RUN echo "=== Checking package.json existence ===" && \
    ls -la package*.json && \
    echo "=== Content check ===" && \
    head -5 package.json

# Install dependencies - use npm install for compatibility
RUN npm cache clean --force && npm install

# Create Python virtual environment and install dependencies
RUN python3 -m venv /app/venv
RUN /app/venv/bin/pip install --upgrade pip
RUN /app/venv/bin/pip install --no-cache-dir -r backend/requirements.txt

# Add virtual environment to PATH and ensure Node.js is accessible
ENV PATH="/app/venv/bin:/usr/local/bin:$PATH"
ENV NODE_PATH="/usr/local/lib/node_modules"

# Node and npm version info for debugging
RUN echo "=== Node and npm versions ===" && \
    node --version && npm --version

# Build frontend
RUN npm run build

# Remove development dependencies to reduce image size
RUN npm prune --only=production

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
CMD ["node", "server.js"]
