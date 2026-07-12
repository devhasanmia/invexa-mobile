import { Platform } from 'react-native';
import * as ExpoSecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';

export const isAvailableAsync = async (): Promise<boolean> => {
  if (isWeb) {
    return true;
  }
  return ExpoSecureStore.isAvailableAsync();
};

export const getItemAsync = async (
  key: string,
  options?: ExpoSecureStore.SecureStoreOptions
): Promise<string | null> => {
  if (isWeb) {
    return AsyncStorage.getItem(key);
  }
  return ExpoSecureStore.getItemAsync(key, options);
};

export const setItemAsync = async (
  key: string,
  value: string,
  options?: ExpoSecureStore.SecureStoreOptions
): Promise<void> => {
  if (isWeb) {
    return AsyncStorage.setItem(key, value);
  }
  return ExpoSecureStore.setItemAsync(key, value, options);
};

export const deleteItemAsync = async (
  key: string,
  options?: ExpoSecureStore.SecureStoreOptions
): Promise<void> => {
  if (isWeb) {
    return AsyncStorage.removeItem(key);
  }
  return ExpoSecureStore.deleteItemAsync(key, options);
};
