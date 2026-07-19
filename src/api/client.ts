import axios from 'axios';
import * as SecureStore from './secureStore';

export const DEFAULT_BASE_URL = 'https://invexa-server.vercel.app/api/v1';

// In-memory cache for API configuration parameters to avoid slow filesystem SecureStore read delays
export const apiCache = {
  baseUrl: DEFAULT_BASE_URL,
  token: '',
  refreshToken: '',
  shopId: '',
};

// Helper function to sanitize/migrate base URL if it's pointing to old local IP addresses
const normalizeUrl = (url: string | null): string => {
  if (!url) return DEFAULT_BASE_URL;
  if (url.includes('192.168.') || url.includes('localhost:5000') || url.includes('127.0.0.1')) {
    return DEFAULT_BASE_URL;
  }
  return url;
};

// Initialize cache from SecureStore on startup in parallel for max performance
export const initApiCache = async () => {
  try {
    const [url, token, refreshToken, shopId] = await Promise.all([
      SecureStore.getItemAsync('server_url'),
      SecureStore.getItemAsync('access_token'),
      SecureStore.getItemAsync('refresh_token'),
      SecureStore.getItemAsync('selected_shop_id'),
    ]);

    const cleanUrl = normalizeUrl(url);
    if (cleanUrl !== url) {
      SecureStore.setItemAsync('server_url', cleanUrl).catch(() => {});
    }

    apiCache.baseUrl = cleanUrl;
    apiCache.token = token || '';
    apiCache.refreshToken = refreshToken || '';
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
  url = normalizeUrl(url);
  apiCache.baseUrl = url;
  return apiCache.baseUrl;
};

// Create axios instance with 15s timeout
const api = axios.create({
  timeout: 15000,
});

// Synchronous interceptor to inject baseURL, token, and shopId instantly from memory cache
api.interceptors.request.use(
  (config) => {
    config.baseURL = apiCache.baseUrl || DEFAULT_BASE_URL;

    if (apiCache.token && !config.url?.includes('/auth/refresh-token')) {
      config.headers.Authorization = `Bearer ${apiCache.token}`;
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
