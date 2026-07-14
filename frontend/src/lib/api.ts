import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { notifySessionExpired } from './authSession';

const fallback = Capacitor.isNativePlatform()
  ? undefined
  : 'http://localhost:3001/api';

const API_URL = import.meta.env.VITE_API_URL || fallback;

if (!API_URL) {
  throw new Error('VITE_API_URL must be set for native iOS builds');
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      notifySessionExpired();
    }
    return Promise.reject(error);
  }
);

export default api;

