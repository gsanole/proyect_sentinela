import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use different URLs for iOS simulator, Android emulator, and physical devices
const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      // For physical device, use your computer's IP address
      // For simulator, use localhost
      return 'http://192.168.50.129:5000/api/v1';
    } else if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api/v1';  // Android emulator
    }
  }
  return 'https://your-production-api.com/api/v1';  // Production
};

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@auth_token');
    const sessionToken = await AsyncStorage.getItem('@session_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (sessionToken) {
      config.headers['x-session-token'] = sessionToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Track if refresh is in progress to avoid multiple refreshes
let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If refresh is already in progress, wait for it
        return new Promise((resolve) => {
          addRefreshSubscriber((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Get refresh token
        const refreshToken = await AsyncStorage.getItem('@refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Request new access token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken
        });

        const { token, refreshToken: newRefreshToken, sessionToken } = response.data.data;

        // Store new tokens
        await AsyncStorage.setItem('@auth_token', token);
        await AsyncStorage.setItem('@refresh_token', newRefreshToken);
        if (sessionToken) {
          await AsyncStorage.setItem('@session_token', sessionToken);
        }

        // Update authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        originalRequest.headers.Authorization = `Bearer ${token}`;

        // Notify all waiting requests
        onRefreshed(token);
        isRefreshing = false;

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear storage and reject
        isRefreshing = false;
        await AsyncStorage.removeItem('@auth_token');
        await AsyncStorage.removeItem('@refresh_token');
        await AsyncStorage.removeItem('@session_token');
        await AsyncStorage.removeItem('@user_data');
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default {
  // Auth - Registration
  registerBuyer: (userData) => api.post('/auth/register/buyer', userData),
  registerArtist: (userData) => api.post('/auth/register/artist', userData),
  
  // Auth - Login & Logout
  login: (credentials) => api.post('/auth/login', credentials),
  verify2FA: (data) => api.post('/auth/verify-2fa', data),
  logout: async () => {
    const refreshToken = await AsyncStorage.getItem('@refresh_token');
    return api.post('/auth/logout', { refreshToken });
  },
  
  // Auth - Email Verification
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  
  // Auth - Password Management
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
  
  // Auth - Token Management
  refreshAccessToken: async () => {
    const refreshToken = await AsyncStorage.getItem('@refresh_token');
    return api.post('/auth/refresh-token', { refreshToken });
  },
  
  // Sessions
  getSessions: () => api.get('/sessions'),
  revokeSession: (sessionId) => api.delete(`/sessions/${sessionId}`),
  revokeAllOtherSessions: () => api.delete('/sessions/others/all'),
  getLoginHistory: (limit) => api.get('/sessions/history', { params: { limit } }),
  getSecurityAlerts: (limit) => api.get('/sessions/alerts', { params: { limit } }),
  acknowledgeAlert: (alertId) => api.put(`/sessions/alerts/${alertId}/acknowledge`),
  
  // Auth - 2FA Management
  enable2FA: () => api.post('/auth/2fa/enable'),
  disable2FA: (password) => api.post('/auth/2fa/disable', { password }),
  get2FAStatus: () => api.get('/auth/2fa/status'),
  
  // User Profile
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  
  // Art Pieces
  getArtFeed: (params) => api.get('/art-pieces', { params }),
  getArtPiece: (id) => api.get(`/art-pieces/${id}`),
  searchArt: (query) => api.get('/art-pieces/search', { params: query }),
  getFeaturedArt: () => api.get('/art-pieces/featured'),
  
  // Artists
  getArtists: (params) => api.get('/artists', { params }),
  getArtist: (id) => api.get(`/artists/${id}`),
  getArtistArt: (id, params) => api.get(`/artists/${id}/art-pieces`, { params }),
  followArtist: (id) => api.post(`/artists/${id}/follow`),
  unfollowArtist: (id) => api.delete(`/artists/${id}/follow`),
  
  // Favorites
  getFavorites: () => api.get('/favorites'),
  addFavorite: (artPieceId) => api.post('/favorites', { artPieceId }),
  removeFavorite: (artPieceId) => api.delete(`/favorites/${artPieceId}`),
  
  // Cart
  getCart: () => api.get('/cart'),
  addToCart: (artPieceId) => api.post('/cart', { artPieceId }),
  removeFromCart: (artPieceId) => api.delete(`/cart/${artPieceId}`),
  clearCart: () => api.delete('/cart'),
  
  // Orders
  createOrder: (orderData) => api.post('/orders', orderData),
  getOrders: () => api.get('/orders'),
  getOrder: (id) => api.get(`/orders/${id}`),
  
  // Categories
  getCategories: () => api.get('/categories'),
  
  // Notifications
  getNotifications: () => api.get('/notifications'),
  markNotificationRead: (id) => api.put(`/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/notifications/read-all'),
  
  // Artist Portal
  getArtistProfile: () => api.get('/artists/profile'),
  updateArtistProfile: (data) => api.put('/artists/profile', data),
  applyAsArtist: (data) => api.post('/artists/apply', data),
  redeemInviteCode: (data) => api.post('/artists/redeem-code', data),
  getArtistDashboard: () => api.get('/artists/dashboard'),
  getMyArtPieces: (params) => api.get('/artists/my-art-pieces', { params }),
  getArtistSales: (params) => api.get('/artists/sales', { params }),
  getArtistPayouts: (params) => api.get('/artists/payouts', { params }),
  getArtistEarnings: () => api.get('/artists/earnings'),
  createArtPiece: (formData) => api.post('/art-pieces', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateArtPiece: (id, formData) => api.put(`/art-pieces/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteArtPiece: (id) => api.delete(`/art-pieces/${id}`),
};
