import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Image } from 'react-native';

interface BrandLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export default function BrandLoader({ message = 'লোড হচ্ছে...', fullScreen = true }: BrandLoaderProps) {
  return (
    <View style={[styles.container, fullScreen ? styles.fullScreen : styles.inline]}>
      <View style={styles.logoCircle}>
        <Image
          source={require('../../assets/images/logo-glow.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.brandTitle}>Invexa</Text>
      <Text style={styles.brandSubtitle}>ব্যবসার ডিজিটাল সমাধান</Text>
      
      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="small" color="#4f46e5" />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  fullScreen: {
    flex: 1,
  },
  inline: {
    padding: 24,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
  spinnerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 36,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
});
