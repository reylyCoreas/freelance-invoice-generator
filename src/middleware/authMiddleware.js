import { authService } from '../services/authService.js';
import { logger } from '../utils/logger.js';

// Middleware to authenticate JWT tokens
export const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No authorization header provided'
      });
    }

    // Expected format: "Bearer <token>"
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // Verify token
    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };

    // Add token to request for potential use in logout
    req.token = token;

    logger.debug('User authenticated successfully', { userId: decoded.id });
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Optional middleware - authenticate if token is provided, but don't require it
export const optionalAuthenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      // No valid token format, continue without authentication
      return next();
    }

    // Try to verify token
    const decoded = authService.verifyToken(token);
    
    if (decoded) {
      // Token is valid, add user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name
      };
      req.token = token;
      logger.debug('User optionally authenticated', { userId: decoded.id });
    }

    // Continue regardless of token validity
    next();
  } catch (error) {
    logger.warn('Optional authentication failed, continuing without auth:', error);
    next();
  }
};

// Middleware to check if user is authenticated (alias for authenticate)
export const requireAuth = authenticate;

// Middleware to check if user owns a resource or is admin
export const requireOwnership = (resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const resourceId = req.params[resourceIdField];
      const userId = req.user.id;

      // For this simple implementation, we'll just check if the user exists
      // In a more complex system, you'd check resource ownership
      
      // You could implement more sophisticated ownership checks here
      // For example, checking if an invoice belongs to the authenticated user
      
      next();
    } catch (error) {
      logger.error('Ownership check failed:', error);
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
  };
};

// Middleware to log authentication attempts (useful for security monitoring)
export const logAuthAttempts = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log authentication attempt
    const isAuthRoute = req.path.includes('/auth/');
    const method = req.method;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    if (isAuthRoute) {
      const statusCode = res.statusCode;
      const success = statusCode >= 200 && statusCode < 300;
      
      logger.info('Authentication attempt', {
        method,
        path: req.path,
        ip,
        userAgent,
        success,
        statusCode,
        email: req.body?.email || 'unknown'
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Rate limiting middleware for auth routes (simple implementation)
const authAttempts = new Map();

export const rateLimitAuth = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean old attempts
    for (const [key, data] of authAttempts.entries()) {
      if (now - data.lastAttempt > windowMs) {
        authAttempts.delete(key);
      }
    }
    
    // Check current attempts
    const attempts = authAttempts.get(ip) || { count: 0, lastAttempt: now };
    
    if (attempts.count >= maxAttempts && now - attempts.lastAttempt < windowMs) {
      logger.warn('Rate limit exceeded for auth attempt', { ip, attempts: attempts.count });
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil((windowMs - (now - attempts.lastAttempt)) / 1000)
      });
    }
    
    // Track this attempt
    authAttempts.set(ip, {
      count: attempts.count + 1,
      lastAttempt: now
    });
    
    next();
  };
};

export default {
  authenticate,
  optionalAuthenticate,
  requireAuth,
  requireOwnership,
  logAuthAttempts,
  rateLimitAuth
};
