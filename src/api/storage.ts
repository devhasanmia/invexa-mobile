import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe in-memory fallback cache if the native AsyncStorage module is null or not built yet
const memoryCache: Record<string, string> = {};

export const storage = {
  // Set item with native AsyncStorage and in-memory cache fallback
  set: async (key: string, value: any) => {
    try {
      const jsonValue = JSON.stringify(value);
      memoryCache[key] = jsonValue;
      
      await AsyncStorage.setItem(key, jsonValue);
    } catch (e: any) {
      // Silence native module errors in development console
      if (!e.message?.includes('Native module is null')) {
        console.error(`Error saving key ${key} to storage:`, e);
      }
    }
  },

  // Get item with native AsyncStorage and in-memory cache fallback
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue != null) {
        memoryCache[key] = jsonValue;
        return JSON.parse(jsonValue) as T;
      }
      
      const fallbackVal = memoryCache[key];
      return fallbackVal ? (JSON.parse(fallbackVal) as T) : null;
    } catch (e: any) {
      const fallbackVal = memoryCache[key];
      if (fallbackVal) {
        return JSON.parse(fallbackVal) as T;
      }
      return null;
    }
  },

  // Remove item
  remove: async (key: string) => {
    try {
      delete memoryCache[key];
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // Ignore
    }
  },

  // Clear all cache keys
  clearCache: async () => {
    try {
      const keys = ['cached_products', 'cached_customers', 'cached_stats', 'cached_shop_name', 'cached_due_customers'];
      for (const key of keys) {
        delete memoryCache[key];
        try {
          await AsyncStorage.removeItem(key);
        } catch (err) {
          // Ignore
        }
      }
    } catch (e) {
      // Ignore
    }
  }
};

export default storage;
