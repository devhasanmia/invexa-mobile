import axios from 'axios';
import * as SecureStore from './secureStore';

export const DEFAULT_BASE_URL = 'http://192.168.0.101:5000/api/v1';

// In-memory cache for API configuration parameters to avoid slow filesystem SecureStore read delays
export const apiCache = {
  baseUrl: '',
  token: '',
  refreshToken: '',
  shopId: '',
};

// Initialize cache from SecureStore on startup
export const initApiCache = async () => {
  try {
    let url = await SecureStore.getItemAsync('server_url');
    if (url && url.includes('192.168.0.100')) {
      url = url.replace('192.168.0.100', '192.168.0.101');
      await SecureStore.setItemAsync('server_url', url);
    }
    apiCache.baseUrl = url || DEFAULT_BASE_URL;

    const token = await SecureStore.getItemAsync('access_token');
    apiCache.token = token || '';

    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    apiCache.refreshToken = refreshToken || '';

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
  let url = await SecureStore.getItemAsync('server_url');
  if (url && url.includes('192.168.0.100')) {
    url = url.replace('192.168.0.100', '192.168.0.101');
    await SecureStore.setItemAsync('server_url', url);
  }
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
      let url = await SecureStore.getItemAsync('server_url');
      if (url && url.includes('192.168.0.100')) {
        url = url.replace('192.168.0.100', '192.168.0.101');
        await SecureStore.setItemAsync('server_url', url);
      }
      apiCache.baseUrl = url || DEFAULT_BASE_URL;
    }
    config.baseURL = apiCache.baseUrl;

    if (!apiCache.token) {
      const token = await SecureStore.getItemAsync('access_token');
      apiCache.token = token || '';
    }
    if (apiCache.token && !config.url?.includes('/auth/refresh-token')) {
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

const handleLogout = async () => {
  apiCache.token = '';
  apiCache.refreshToken = '';
  apiCache.shopId = '';
  try {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('selected_shop_id');
  } catch (e) {
    // Ignore
  }

  if (unauthorizedListener) {
    unauthorizedListener();
  }
};

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor to catch token expiration/invalid errors and refresh token or log out
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message || '';
    const lowercaseMsg = message.toLowerCase();

    const isAuthError =
      status === 401 ||
      status === 403 ||
      lowercaseMsg.includes('token') ||
      lowercaseMsg.includes('jwt') ||
      lowercaseMsg.includes('expired') ||
      lowercaseMsg.includes('unauthorized');

    if (isAuthError && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh-token')) {
        await handleLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = apiCache.refreshToken || (await SecureStore.getItemAsync('refresh_token'));
        if (!storedRefreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshResponse = await axios.post(`${apiCache.baseUrl || DEFAULT_BASE_URL}/auth/refresh-token`, {
          refreshToken: storedRefreshToken,
        });

        const newAccessToken = refreshResponse.data.data?.accessToken;
        if (!newAccessToken) {
          throw new Error('New access token not found in response');
        }

        apiCache.token = newAccessToken;
        await SecureStore.setItemAsync('access_token', newAccessToken);

        processQueue(null, newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        await handleLogout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
