import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Authentication Service
 * Handles all auth-related operations with token management
 */

const AUTH_TOKEN_KEY = '@auth_token';
const USER_DATA_KEY = '@user_data';
const PENDING_2FA_KEY = '@pending_2fa';

class AuthService {
  /**
   * Register as buyer
   */
  async registerBuyer(userData) {
    try {
      const response = await api.registerBuyer(userData);
      
      if (response.data.success) {
        // Registration successful, but requires email verification
        return {
          success: true,
          requiresEmailVerification: response.data.data.requiresEmailVerification,
          message: response.data.data.message,
          user: response.data.data.user,
        };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Registration failed',
      };
    }
  }

  /**
   * Register as artist
   */
  async registerArtist(userData) {
    try {
      const response = await api.registerArtist(userData);
      
      if (response.data.success) {
        return {
          success: true,
          requiresEmailVerification: response.data.data.requiresEmailVerification,
          message: response.data.data.message,
          user: response.data.data.user,
        };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Registration failed',
      };
    }
  }

  /**
   * Login
   */
  async login(email, password) {
    try {
      const response = await api.login({ email, password });
      
      if (response.data.success) {
        const { data } = response.data;
        
        // Check if 2FA is required
        if (data.requires2FA) {
          // Store pending 2FA data
          await AsyncStorage.setItem(PENDING_2FA_KEY, JSON.stringify({
            userId: data.userId,
            timestamp: Date.now(),
          }));
          
          return {
            success: true,
            requires2FA: true,
            message: data.message,
          };
        }
        
        // Login successful, store token and user data
        await this.storeAuthData(data.token, data.user);
        
        return {
          success: true,
          user: data.user,
          token: data.token,
        };
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Login failed',
      };
    }
  }

  /**
   * Verify 2FA code
   */
  async verify2FA(code, useBackupCode = false) {
    try {
      // Get pending 2FA data
      const pendingData = await AsyncStorage.getItem(PENDING_2FA_KEY);
      
      if (!pendingData) {
        return { success: false, error: '2FA session expired' };
      }
      
      const { userId } = JSON.parse(pendingData);
      
      const response = await api.verify2FA({ userId, code, useBackupCode });
      
      if (response.data.success) {
        const { data } = response.data;
        
        // Clear pending 2FA data
        await AsyncStorage.removeItem(PENDING_2FA_KEY);
        
        // Store auth data
        await this.storeAuthData(data.token, data.user);
        
        return {
          success: true,
          user: data.user,
          token: data.token,
        };
      }
      
      return { success: false, error: 'Invalid code' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Verification failed',
      };
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    try {
      const response = await api.verifyEmail(token);
      
      if (response.data.success) {
        const { data } = response.data;
        
        // Store auth data
        await this.storeAuthData(data.token, data.user);
        
        return {
          success: true,
          user: data.user,
          token: data.token,
          message: response.data.message,
        };
      }
      
      return { success: false, error: 'Verification failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Verification failed',
      };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(email) {
    try {
      const response = await api.resendVerification(email);
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to resend email',
      };
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await api.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.log('Logout API call failed:', error);
    }
    
    // Clear local storage
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY, PENDING_2FA_KEY]);
    
    return { success: true };
  }

  /**
   * Get stored token
   */
  async getToken() {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  async getUserData() {
    const userData = await AsyncStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Store auth data
   */
  async storeAuthData(token, user) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  }

  /**
   * Forgot password
   */
  async forgotPassword(email) {
    try {
      const response = await api.forgotPassword(email);
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Request failed',
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await api.resetPassword(token, newPassword);
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Reset failed',
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.changePassword(currentPassword, newPassword);
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Change failed',
      };
    }
  }

  /**
   * Enable 2FA
   */
  async enable2FA() {
    try {
      const response = await api.enable2FA();
      return {
        success: true,
        backupCodes: response.data.data.backupCodes,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to enable 2FA',
      };
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(password) {
    try {
      const response = await api.disable2FA(password);
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to disable 2FA',
      };
    }
  }

  /**
   * Get 2FA status
   */
  async get2FAStatus() {
    try {
      const response = await api.get2FAStatus();
      return {
        success: true,
        enabled: response.data.data.enabled,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to get 2FA status',
      };
    }
  }
}

export default new AuthService();
