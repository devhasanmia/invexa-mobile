import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface BrandLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export default function BrandLoader({ message = 'লোড হচ্ছে...', fullScreen = true }: BrandLoaderProps) {
  return (
    <View style={[styles.container, fullScreen ? styles.fullScreen : styles.inline]}>
      <View style={styles.logoCircle}>
        <LinearGradient
          colors={['#4f46e5', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoGradient}
        >
          <Sparkles size={28} color="#ffffff" />
        </LinearGradient>
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
    width: 64,
    height: 64,
    borderRadius: 22,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
