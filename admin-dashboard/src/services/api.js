import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/api/v1';
  }
  return process.env.REACT_APP_API_URL || 'https://your-production-api.com/api/v1';
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
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default {
  // Auth
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  
  // Admin - Users
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deactivateUser: (id) => api.put(`/admin/users/${id}/deactivate`),
  activateUser: (id) => api.put(`/admin/users/${id}/activate`),
  
  // Admin - Artists
  getArtists: (params) => api.get('/admin/artists', { params }),
  approveArtist: (id) => api.post(`/admin/artists/${id}/approve`),
  rejectArtist: (id, reason) => api.post(`/admin/artists/${id}/reject`, { reason }),
  
  // Admin - Art Pieces
  getArtPieces: (params) => api.get('/admin/art-pieces', { params }),
  approveArtPiece: (id) => api.post(`/admin/art-pieces/${id}/approve`),
  rejectArtPiece: (id, reason) => api.post(`/admin/art-pieces/${id}/reject`, { reason }),
  
  // Admin - Orders
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, status) => api.patch(`/admin/orders/${id}/status`, { status }),
  
  // Admin - Payouts
  getPayouts: (params) => api.get('/admin/payouts', { params }),
  processPayout: (id) => api.post(`/admin/payouts/${id}/process`),
  
  // Admin - Invite Codes
  getInviteCodes: (params) => api.get('/admin/invite-codes', { params }),
  generateInviteCode: (data) => api.post('/admin/invite-codes', data),
  deactivateInviteCode: (id) => api.post(`/admin/invite-codes/${id}/deactivate`),
  
  // Admin - Analytics
  getDashboardStats: () => api.get('/admin/analytics/dashboard'),
  getRevenueChart: (days) => api.get('/admin/analytics/revenue-chart', { params: { days } }),
  getTopArtists: (limit) => api.get('/admin/analytics/top-artists', { params: { limit } }),
  getRecentOrders: (limit) => api.get('/admin/analytics/recent-orders', { params: { limit } }),
  
  // Admin - Categories
  getCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
};
