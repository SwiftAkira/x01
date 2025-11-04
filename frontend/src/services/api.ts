/**
 * API Service
 * REST API client for SpeedLink backend
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '@/utils/constants';
import { getStorageItem, removeStorageItem } from '@/utils/storage';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStorageItem<string>(STORAGE_KEYS.AUTH_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized - clear auth and redirect to login
    if (error.response?.status === 401) {
      removeStorageItem(STORAGE_KEYS.AUTH_TOKEN);
      removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
      window.location.href = '/login';
    }

    // Log error for debugging
    console.error('API Error:', error.response?.data || error.message);

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: { email: string; password: string; display_name?: string }) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  refresh: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};

// Party API
export const partyApi = {
  create: async (data: { name?: string; settings?: Record<string, unknown> }) => {
    const response = await apiClient.post('/party', data);
    return response.data;
  },

  join: async (partyCode: string) => {
    const response = await apiClient.post(`/party/join`, { partyCode });
    return response.data;
  },

  leave: async (partyId: string) => {
    const response = await apiClient.delete(`/party/${partyId}/leave`);
    return response.data;
  },

  getDetails: async (partyId: string) => {
    const response = await apiClient.get(`/party/${partyId}`);
    return response.data;
  },

  getMembers: async (partyId: string) => {
    const response = await apiClient.get(`/party/${partyId}/members`);
    return response.data;
  },
};

// User API
export const userApi = {
  getProfile: async () => {
    const response = await apiClient.get('/user/profile');
    return response.data;
  },

  updateProfile: async (data: {
    display_name?: string;
    vehicle_type?: string;
    privacy_mode?: string;
  }) => {
    const response = await apiClient.put('/user/profile', data);
    return response.data;
  },
};

// Alerts API
export const alertsApi = {
  getNearby: async (lat: number, lon: number, radius: number = 5000) => {
    const response = await apiClient.get('/alerts/nearby', {
      params: { lat, lon, radius },
    });
    return response.data;
  },
};

// Export default client for custom requests
export default apiClient;
