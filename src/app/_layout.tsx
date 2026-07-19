import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { ActivityIndicator, View, StyleSheet, StatusBar } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from '../api/secureStore';
import { initApiCache, apiCache, setUnauthorizedListener } from '../api/client';
import BrandLoader from '../components/BrandLoader';

interface AuthContextType {
  token: string | null;
  login: (token: string, refreshToken: string, shopId: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default function RootLayout() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const checkToken = async () => {
      try {
        await initApiCache(); // Initialize in-memory cache in parallel
        setToken(apiCache.token || null);
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!token && !inAuthGroup) router.replace('/(auth)/login');
    else if (token && inAuthGroup) router.replace('/(tabs)');
  }, [token, segments, isLoading]);

  const login = async (newToken: string, newRefreshToken: string, shopId: string) => {
    apiCache.token = newToken;
    apiCache.refreshToken = newRefreshToken;
    apiCache.shopId = shopId;
    await SecureStore.setItemAsync('access_token', newToken);
    await SecureStore.setItemAsync('refresh_token', newRefreshToken);
    await SecureStore.setItemAsync('selected_shop_id', shopId);
    setToken(newToken);
  };

  const logout = useCallback(async () => {
    apiCache.token = '';
    apiCache.refreshToken = '';
    apiCache.shopId = '';
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('selected_shop_id');
    setToken(null);
  }, []);

  useEffect(() => {
    setUnauthorizedListener(logout);
    return () => {
      setUnauthorizedListener(() => {});
    };
  }, [logout]);

  if (isLoading) {
    return <BrandLoader message="অ্যাপ্লিকেশন চালু হচ্ছে..." />;
  }

  return (
    <AuthContext.Provider value={{ token, login, logout, isLoading }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={false} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f8fafc' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
