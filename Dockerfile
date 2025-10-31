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

# Copy package files first for better layer caching
COPY package.json ./
COPY vite.config.ts tsconfig*.json postcss.config.js tailwind.config.ts ./

# Install Node.js dependencies
RUN npm install

# Copy application source
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY backend/ ./backend/

# Create Python virtual environment and install dependencies
RUN python3 -m venv /app/venv
RUN /app/venv/bin/pip install --upgrade pip
RUN /app/venv/bin/pip install --no-cache-dir -r backend/requirements.txt

# Add virtual environment to PATH and set Flask environment
ENV PATH="/app/venv/bin:$PATH"
ENV FLASK_ENV=production
ENV PORT=5001

# Build frontend
RUN npm run build

# Remove development dependencies to reduce image size
RUN npm prune --only=production

# Create production user
RUN useradd -r -s /bin/false appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port (Flask backend port)
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5001/api/health || exit 1

# Start the Flask backend
WORKDIR /app/backend
CMD ["python", "app.py"]
