import express from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate, rateLimitAuth, logAuthAttempts } from '../middleware/authMiddleware.js';
import { validateRequest, userValidation } from '../validation/schemas.js';

const router = express.Router();
const authController = new AuthController();

// Apply auth logging and rate limiting to all auth routes
router.use(logAuthAttempts);
router.use(rateLimitAuth());

// POST /api/auth/register - Register new user
router.post('/register', 
  validateRequest(userValidation.register),
  authController.register
);

// POST /api/auth/login - Login user
router.post('/login', 
  validateRequest(userValidation.login),
  authController.login
);

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', 
  authenticate,
  authController.refreshToken
);

// POST /api/auth/logout - Logout user
router.post('/logout', 
  authenticate,
  authController.logout
);

// GET /api/auth/me - Get current user profile
router.get('/me', 
  authenticate,
  authController.getProfile
);

// PUT /api/auth/me - Update current user profile
router.put('/me', 
  authenticate,
  validateRequest(userValidation.updateProfile),
  authController.updateProfile
);

// POST /api/auth/change-password - Change user password
router.post('/change-password', 
  authenticate,
  validateRequest(userValidation.changePassword),
  authController.changePassword
);

// GET /api/auth/check - Check if user is authenticated
router.get('/check', 
  authenticate,
  authController.checkAuth
);

// DELETE /api/auth/account - Delete user account
router.delete('/account', 
  authenticate,
  authController.deleteAccount
);

// Admin routes (simple implementation - in production you'd have proper role-based access)
// GET /api/auth/users - Get all users (admin only)
router.get('/users', 
  authenticate,
  authController.getAllUsers
);

export default router;
