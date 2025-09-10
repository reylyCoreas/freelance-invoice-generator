import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';
import { User } from '../models/index.js';

export class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.saltRounds = 12;
  }

  // Generate JWT token
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'invoice-generator',
      audience: 'invoice-users'
    });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'invoice-generator',
        audience: 'invoice-users'
      });
    } catch (error) {
      logger.error('Token verification failed:', error);
      return null;
    }
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Register new user
  async register(userData) {
    try {
      logger.info('Registering new user', { email: userData.email });

      // Check if user already exists
      const existingUser = User.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user
      const user = User.create({
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        businessInfo: userData.businessInfo || {}
      });

      // Generate token
      const token = this.generateToken(user);

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      // Return user data without password
      const { password, ...userWithoutPassword } = user;
      
      return {
        success: true,
        user: userWithoutPassword,
        token,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.error('User registration failed:', error);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      logger.info('User attempting login', { email });

      // Find user by email
      const user = User.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Compare password
      const isPasswordValid = await this.comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate token
      const token = this.generateToken(user);

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      
      return {
        success: true,
        user: userWithoutPassword,
        token,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.error('User login failed:', error);
      throw error;
    }
  }

  // Get user profile
  async getProfile(userId) {
    try {
      const user = User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Return user data without password
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Failed to get user profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    try {
      logger.info('Updating user profile', { userId });

      const user = User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // If email is being updated, check for conflicts
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = User.findByEmail(updateData.email);
        if (existingUser) {
          throw new Error('Email already in use by another account');
        }
      }

      // Update user
      const updatedUser = User.update(userId, updateData);

      logger.info('User profile updated successfully', { userId });

      // Return user data without password
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Failed to update user profile:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      logger.info('Changing user password', { userId });

      const user = User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      User.update(userId, { password: hashedNewPassword });

      logger.info('Password changed successfully', { userId });

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Failed to change password:', error);
      throw error;
    }
  }

  // Refresh token
  async refreshToken(token) {
    try {
      const decoded = this.verifyToken(token);
      if (!decoded) {
        throw new Error('Invalid token');
      }

      // Check if user still exists
      const user = User.findById(decoded.id);
      if (!user) {
        throw new Error('User no longer exists');
      }

      // Generate new token
      const newToken = this.generateToken(user);

      logger.info('Token refreshed successfully', { userId: user.id });

      return {
        success: true,
        token: newToken,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  // Logout (in a real app, you might want to blacklist the token)
  async logout(token) {
    try {
      // In a production app, you might want to add the token to a blacklist
      // For this implementation, we'll just log the logout
      const decoded = this.verifyToken(token);
      if (decoded) {
        logger.info('User logged out', { userId: decoded.id });
      }

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      logger.error('Logout failed:', error);
      return { success: true, message: 'Logged out successfully' }; // Always succeed logout
    }
  }

  // Get all users (admin functionality)
  async getAllUsers() {
    try {
      const users = User.findAll();
      
      // Return users without passwords
      return users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
    } catch (error) {
      logger.error('Failed to get all users:', error);
      throw error;
    }
  }

  // Delete user account
  async deleteAccount(userId) {
    try {
      logger.info('Deleting user account', { userId });

      const user = User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // In a real application, you might want to:
      // 1. Archive the user's invoices
      // 2. Transfer ownership of invoices to another user
      // 3. Send notification emails
      // For now, we'll just delete the user

      const deleted = User.delete(userId);
      if (!deleted) {
        throw new Error('Failed to delete user');
      }

      logger.info('User account deleted successfully', { userId });

      return { success: true, message: 'Account deleted successfully' };
    } catch (error) {
      logger.error('Failed to delete user account:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const authService = new AuthService();
