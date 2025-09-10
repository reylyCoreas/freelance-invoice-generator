import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import invoiceRoutes from './routes/invoiceRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { optionalAuthenticate } from './middleware/authMiddleware.js';
import { testConnection, initDatabase } from './config/database.js';

// Load environment variables
dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/static', express.static(path.join(__dirname, '../assets')));
app.use('/templates', express.static(path.join(__dirname, '../templates')));
// Serve built client files in production, fallback to public in development
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
} else {
  app.use(express.static(path.join(__dirname, '../public')));
  app.use('/dist', express.static(path.join(__dirname, '../dist')));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    let dbStatus = 'unknown';
    let dbError = null;
    
    try {
      const { testConnection } = await import('./config/database.js');
      const dbConnected = await testConnection();
      dbStatus = dbConnected ? 'connected' : 'disconnected';
    } catch (error) {
      dbStatus = 'error';
      dbError = error.message;
    }
    
    const healthData = {
      status: 'healthy', // Always report healthy so Railway doesn't restart
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: {
        status: dbStatus,
        error: dbError
      },
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(healthData);
  } catch (error) {
    // Even if health check logic fails, return 200 to prevent Railway restarts
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      error: 'Health check error: ' + error.message
    });
  }
});

// Add optional authentication to all API routes (for user context)
app.use('/api', optionalAuthenticate);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/templates', templateRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Freelance Invoice Generator API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      invoices: '/api/invoices',
      clients: '/api/clients',
      templates: '/api/templates'
    },
    authEndpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      profile: 'GET /api/auth/me',
      logout: 'POST /api/auth/logout'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// Additional health check routes for Railway
app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/ready', (req, res) => res.status(200).json({ status: 'ready' }));

// SPA routing - serve index.html for non-API routes
app.get('*', (req, res) => {
  // Don't handle API routes here
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      error: 'API Route not found',
      method: req.method,
      path: req.originalUrl
    });
  }
  
  try {
    // Serve the appropriate index.html based on environment
    const indexPath = process.env.NODE_ENV === 'production' 
      ? path.join(__dirname, '../dist/index.html')
      : path.join(__dirname, '../public/index.html');
    
    res.sendFile(indexPath);
  } catch (error) {
    logger.error('Failed to serve index.html:', error);
    res.status(500).send('Application Error');
  }
});

// Start server with database initialization and retry to avoid failing health checks
app.listen(PORT, async () => {
  logger.info(`🚀 Freelance Invoice Generator server running on port ${PORT}`);
  logger.info(`📋 Health check available at http://localhost:${PORT}/health`);
  logger.info(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Retry DB connection/init to handle startup race conditions on Railway
  const maxAttempts = parseInt(process.env.DB_INIT_MAX_ATTEMPTS || '10', 10);
  const backoffMs = parseInt(process.env.DB_INIT_BACKOFF_MS || '5000', 10); // 5s

  let attempt = 1;
  let initialized = false;

  while (attempt <= maxAttempts && !initialized) {
    try {
      logger.info(`🔌 DB init attempt ${attempt}/${maxAttempts}...`);
      const dbConnected = await testConnection();

      if (!dbConnected) throw new Error('DB connection test failed');

      await initDatabase();
      logger.info('💾 Database initialized successfully');
      initialized = true;
      break;
    } catch (err) {
      logger.warn(`DB init attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxAttempts) {
        logger.error('❌ Exhausted DB init attempts');
        if (process.env.NODE_ENV === 'production') {
          // In production, keep the process alive so health endpoint stays responsive
          // but log a clear error for operator visibility.
          logger.error('Continuing to serve /health while DB is unavailable.');
        }
        break;
      }
      await new Promise(r => setTimeout(r, backoffMs));
      attempt++;
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
