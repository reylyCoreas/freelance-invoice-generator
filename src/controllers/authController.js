import { logger } from '../utils/logger.js';
import { authService } from '../services/authService.js';
import { User } from '../models/index.js';

export class AuthController {
  async register(req, res, next) {
    try {
      logger.info('User registration attempt', { email: req.body.email });

      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          token: result.token,
          expiresIn: result.expiresIn
        }
      });
    } catch (error) {
      logger.error('Registration failed:', error);

      if (error.message.includes('already exists')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Registration failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      logger.info('User login attempt', { email });

      const result = await authService.login(email, password);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token,
          expiresIn: result.expiresIn
        }
      });
    } catch (error) {
      logger.error('Login failed:', error);

      if (error.message.includes('Invalid email or password')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Login failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      logger.info('Getting user profile', { userId });

      const user = await authService.getProfile(userId);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Failed to get profile:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      logger.info('Updating user profile', { userId });

      const updatedUser = await authService.updateProfile(userId, req.body);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      logger.error('Failed to update profile:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      if (error.message.includes('already in use')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      logger.info('Changing user password', { userId });

      await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Failed to change password:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (error.message.includes('incorrect')) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to change password',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async refreshToken(req, res, next) {
    try {
      const token = req.token || req.body.token;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token is required'
        });
      }

      const result = await authService.refreshToken(token);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: result.token,
          expiresIn: result.expiresIn
        }
      });
    } catch (error) {
      logger.error('Failed to refresh token:', error);

      if (error.message.includes('Invalid token') || error.message.includes('no longer exists')) {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to refresh token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async logout(req, res, next) {
    try {
      const token = req.token;
      
      await authService.logout(token);

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout failed:', error);
      // Always succeed logout attempts
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    }
  }

  async deleteAccount(req, res, next) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      // Verify password before deleting account
      const user = User.findById(userId);
      const isPasswordValid = await authService.comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid password'
        });
      }

      await authService.deleteAccount(userId);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete account:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete account',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Admin endpoints
  async getAllUsers(req, res, next) {
    try {
      // Simple admin check - in production, you'd have proper role-based access
      logger.info('Admin fetching all users', { adminId: req.user.id });

      const users = await authService.getAllUsers();

      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      logger.error('Failed to get all users:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get users',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Check authentication status
  async checkAuth(req, res, next) {
    try {
      // This endpoint is protected by auth middleware, so if we reach here, user is authenticated
      res.json({
        success: true,
        authenticated: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name
        }
      });
    } catch (error) {
      logger.error('Auth check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Auth check failed'
      });
    }
  }
}
