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
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
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
  
  // Serve the appropriate index.html based on environment
  const indexPath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '../dist/index.html')
    : path.join(__dirname, '../public/index.html');
  
  res.sendFile(indexPath);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Freelance Invoice Generator server running on port ${PORT}`);
  logger.info(`📋 Health check available at http://localhost:${PORT}/health`);
  logger.info(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
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
