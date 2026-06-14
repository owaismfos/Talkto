import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import CONFIG from '../config';

// 1. Set the Base URL (Use your computer's IP for Android/Genymotion)
console.log("API Base URL:", CONFIG.API_URL); // Debug log to verify the URL
const api = axios.create({
  baseURL: CONFIG.API_URL, 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string | null> | null = null;

const getStoredSession = async () => {
  const credentials = await Keychain.getGenericPassword();
  if (!credentials) {
    return null;
  }
  return JSON.parse(credentials.password);
};

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const session = await getStoredSession();
      if (!session?.refreshToken) {
        return null;
      }

      const response = await axios.post(`${CONFIG.API_URL}/auth/refresh`, {
        refresh_token: session.refreshToken,
      });
      const accessToken = response.data.access_token;
      if (!accessToken) {
        return null;
      }

      await Keychain.setGenericPassword('session', JSON.stringify({
        ...session,
        accessToken,
      }));
      return accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

// 2. Add a Request Interceptor
// This runs AUTOMATICALLY before every request is sent
api.interceptors.request.use(
  async (config) => {
    try {
      const session = await getStoredSession();
      if (session) {
        const token = session.accessToken;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error("Auth Interceptor Error:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config as any;
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !String(originalRequest?.url || '').includes('/auth/login') &&
      !String(originalRequest?.url || '').includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        if (accessToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await Keychain.resetGenericPassword();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
