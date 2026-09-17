import axios from 'axios';

const api = axios.create({
  baseURL: 'https://student-equipment-resale-platform-1.onrender.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: standardize response data and handle auth expiration
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // 401 Unauthorized -> token expired or invalid
      if (error.response.status === 401) {
        const isLoginRequest = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
        if (!isLoginRequest) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?expired=true';
          }
        }
      }
      return Promise.reject(error.response.data || error.message);
    }
    return Promise.reject({
      success: false,
      message: error.message || 'Network error. Please verify backend connection.',
    });
  }
);

export default api;
