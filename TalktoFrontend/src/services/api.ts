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

// 2. Add a Request Interceptor
// This runs AUTOMATICALLY before every request is sent
api.interceptors.request.use(
  async (config) => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        const session = JSON.parse(credentials.password);
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

export default api;
