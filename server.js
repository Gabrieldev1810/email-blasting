import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Health check endpoint for deployment platforms
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

// Start Python Flask backend
const startBackend = () => {
  console.log('Starting Flask backend...');
  
  const pythonCommand = 'python3';
  const backend = spawn(pythonCommand, [
    join(__dirname, 'backend', 'app.py')
  ], {
    env: {
      ...process.env,
      PORT: '5001',
      PYTHONPATH: join(__dirname, 'backend'),
      FLASK_ENV: 'production'
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false
  });

  backend.stdout.on('data', (data) => {
    console.log(`Backend: ${data.toString()}`);
  });

  backend.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data.toString()}`);
  });

  backend.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });

  return backend;
};

// Proxy API requests to Flask backend
app.use('/api', (req, res) => {
  const backendUrl = `http://localhost:5001${req.originalUrl}`;
  
  // Simple proxy implementation
  const options = {
    method: req.method,
    headers: {
      ...req.headers,
      host: 'localhost:5001'
    }
  };

  // For non-GET requests, forward the body
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      options.body = body;
      proxyRequest(backendUrl, options, res);
    });
  } else {
    proxyRequest(backendUrl, options, res);
  }
});

const proxyRequest = async (url, options, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, options);
    
    // Copy status and headers
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.set(key, value);
    });
    
    // Stream the response
    response.body.pipe(res);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Backend service unavailable' });
  }
};

// Handle React Router - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start the backend process
const backendProcess = startBackend();

// Run admin setup on first startup
const runAdminSetup = () => {
  console.log('🎯 Attempting initial admin setup...');
  const setupProcess = spawn('python3', [
    join(__dirname, 'setup_admin.py')
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  setupProcess.stdout.on('data', (data) => {
    console.log(`Setup: ${data.toString()}`);
  });

  setupProcess.stderr.on('data', (data) => {
    console.log(`Setup Error: ${data.toString()}`);
  });

  setupProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Admin setup completed successfully');
    } else {
      console.log(`⚠️ Admin setup exited with code ${code} (may already be completed)`);
    }
  });
};

// Start the Express server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 Backend API: http://localhost:5001`);
  
  // Run admin setup after a delay to ensure backend is ready
  setTimeout(runAdminSetup, 3000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  backendProcess.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  backendProcess.kill('SIGINT');
  process.exit(0);
});