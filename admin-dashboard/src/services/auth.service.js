import api from './api';

/**
 * Authentication Service for Admin Dashboard
 */

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

class AuthService {
  /**
   * Admin login
   */
  async login(email, password) {
    try {
      const response = await api.login({ email, password });
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        
        // Verify user is admin
        if (user.role !== 'admin') {
          return {
            success: false,
            error: 'Access denied. Admin privileges required.',
          };
        }
        
        // Store auth data
        this.storeAuthData(token, user);
        
        return {
          success: true,
          user,
          token,
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
   * Logout
   */
  async logout() {
    try {
      await api.logout();
    } catch (error) {
      console.log('Logout API call failed:', error);
    }
    
    // Clear local storage
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    
    return { success: true };
  }

  /**
   * Get stored token
   */
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  getUserData() {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getUserData();
    return !!token && user?.role === 'admin';
  }

  /**
   * Store auth data
   */
  storeAuthData(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  }
}

export default new AuthService();
