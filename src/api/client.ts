import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const DEFAULT_BASE_URL = 'http://192.168.0.100:5000/api/v1';

// In-memory cache for API configuration parameters to avoid slow filesystem SecureStore read delays
export const apiCache = {
  baseUrl: '',
  token: '',
  shopId: '',
};

// Initialize cache from SecureStore on startup
export const initApiCache = async () => {
  try {
    const url = await SecureStore.getItemAsync('server_url');
    apiCache.baseUrl = url || DEFAULT_BASE_URL;

    const token = await SecureStore.getItemAsync('access_token');
    apiCache.token = token || '';

    const shopId = await SecureStore.getItemAsync('selected_shop_id');
    apiCache.shopId = shopId || '';
  } catch (error) {
    console.error('Failed to initialize API cache:', error);
  }
};

// Helper to save server base URL
export const saveServerUrl = async (url: string) => {
  apiCache.baseUrl = url;
  await SecureStore.setItemAsync('server_url', url);
};

// Helper to get server base URL
export const getServerUrl = async (): Promise<string> => {
  if (apiCache.baseUrl) return apiCache.baseUrl;
  const url = await SecureStore.getItemAsync('server_url');
  apiCache.baseUrl = url || DEFAULT_BASE_URL;
  return apiCache.baseUrl;
};

// Create axios instance
const api = axios.create();

// Interceptor to inject baseURL and token dynamically from memory cache
api.interceptors.request.use(
  async (config) => {
    // If memory cache is empty, fallback to SecureStore once
    if (!apiCache.baseUrl) {
      const url = await SecureStore.getItemAsync('server_url');
      apiCache.baseUrl = url || DEFAULT_BASE_URL;
    }
    config.baseURL = apiCache.baseUrl;

    if (!apiCache.token) {
      const token = await SecureStore.getItemAsync('access_token');
      apiCache.token = token || '';
    }
    if (apiCache.token) {
      config.headers.Authorization = `Bearer ${apiCache.token}`;
    }

    if (!apiCache.shopId) {
      const shopId = await SecureStore.getItemAsync('selected_shop_id');
      apiCache.shopId = shopId || '';
    }
    if (apiCache.shopId) {
      config.headers['x-shop-id'] = apiCache.shopId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

export const setUnauthorizedListener = (listener: UnauthorizedListener) => {
  unauthorizedListener = listener;
};

// Response interceptor to catch token expiration/invalid errors and log out automatically
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || '';
    const lowercaseMsg = message.toLowerCase();

    if (
      status === 401 ||
      status === 403 ||
      lowercaseMsg.includes('token') ||
      lowercaseMsg.includes('jwt') ||
      lowercaseMsg.includes('expired') ||
      lowercaseMsg.includes('unauthorized')
    ) {
      // Clear token from cache and SecureStore
      apiCache.token = '';
      apiCache.shopId = '';
      try {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('selected_shop_id');
      } catch (e) {
        // Ignore
      }

      // Notify root layout to redirect to login
      if (unauthorizedListener) {
        unauthorizedListener();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
