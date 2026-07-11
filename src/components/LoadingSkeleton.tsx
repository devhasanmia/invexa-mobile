import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';

const { width: W } = Dimensions.get('window');

interface SkeletonProps {
  width: any;
  height: number;
  borderRadius?: number;
  style?: any;
}

// Reusable Pulsing Base Skeleton block
export function Skeleton({ width, height, borderRadius = 12, style }: SkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

// 1. Dashboard Skeleton layout
export function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={160} height={28} borderRadius={14} />
        <Skeleton width={32} height={32} borderRadius={10} />
      </View>

      {/* Hero Card */}
      <Skeleton width="100%" height={160} borderRadius={24} style={{ marginBottom: 16 }} />

      {/* Metrics Row */}
      <View style={styles.row}>
        <Skeleton width={(W - 44) / 2} height={110} borderRadius={20} />
        <Skeleton width={(W - 44) / 2} height={110} borderRadius={20} />
      </View>

      {/* Target Card */}
      <Skeleton width="100%" height={92} borderRadius={22} style={{ marginBottom: 16 }} />

      {/* Limits Card */}
      <Skeleton width="100%" height={108} borderRadius={22} style={{ marginBottom: 20 }} />

      {/* Actions Label */}
      <Skeleton width={100} height={14} borderRadius={6} style={{ marginBottom: 12 }} />

      {/* Actions Row */}
      <View style={styles.row}>
        <Skeleton width={(W - 44) / 2} height={100} borderRadius={22} />
        <Skeleton width={(W - 44) / 2} height={100} borderRadius={22} />
      </View>
    </View>
  );
}

// 2. POS Skeleton layout
export function PosSkeleton() {
  return (
    <View style={styles.container}>
      {/* Search bar placeholder */}
      <Skeleton width="100%" height={46} borderRadius={14} style={{ marginBottom: 16 }} />

      {/* Categories scroll placeholder */}
      <View style={[styles.row, { gap: 8, marginBottom: 16 }]}>
        <Skeleton width={80} height={32} borderRadius={16} />
        <Skeleton width={100} height={32} borderRadius={16} />
        <Skeleton width={80} height={32} borderRadius={16} />
        <Skeleton width={90} height={32} borderRadius={16} />
      </View>

      {/* Products Grid placeholders */}
      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <Skeleton width="100%" height={96} borderRadius={12} style={{ marginBottom: 8 }} />
          <Skeleton width="80%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
          <Skeleton width="50%" height={14} borderRadius={6} />
        </View>
        <View style={styles.gridCol}>
          <Skeleton width="100%" height={96} borderRadius={12} style={{ marginBottom: 8 }} />
          <Skeleton width="75%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
          <Skeleton width="45%" height={14} borderRadius={6} />
        </View>
      </View>

      <View style={[styles.gridRow, { marginTop: 12 }]}>
        <View style={styles.gridCol}>
          <Skeleton width="100%" height={96} borderRadius={12} style={{ marginBottom: 8 }} />
          <Skeleton width="85%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
          <Skeleton width="40%" height={14} borderRadius={6} />
        </View>
        <View style={styles.gridCol}>
          <Skeleton width="100%" height={96} borderRadius={12} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
          <Skeleton width="50%" height={14} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

// 3. Dues Skeleton layout
export function DuesSkeleton() {
  return (
    <View style={styles.container}>
      {/* Summary Banner placeholder */}
      <Skeleton width="100%" height={92} borderRadius={22} style={{ marginBottom: 16 }} />

      {/* Search bar placeholder */}
      <Skeleton width="100%" height={44} borderRadius={14} style={{ marginBottom: 16 }} />

      {/* Dues List Item placeholders */}
      <View style={styles.duesCard}>
        <View style={styles.duesCardTop}>
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={120} height={16} borderRadius={8} />
            <Skeleton width={80} height={12} borderRadius={6} />
          </View>
          <Skeleton width={60} height={20} borderRadius={8} />
        </View>
        <View style={styles.duesActions}>
          <Skeleton width={100} height={32} borderRadius={10} />
          <Skeleton width={100} height={32} borderRadius={10} />
        </View>
      </View>

      <View style={[styles.duesCard, { marginTop: 12 }]}>
        <View style={styles.duesCardTop}>
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={140} height={16} borderRadius={8} />
            <Skeleton width={90} height={12} borderRadius={6} />
          </View>
          <Skeleton width={50} height={20} borderRadius={8} />
        </View>
        <View style={styles.duesActions}>
          <Skeleton width={100} height={32} borderRadius={10} />
          <Skeleton width={100} height={32} borderRadius={10} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  skeleton: {
    backgroundColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCol: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  duesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  duesCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  duesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 12,
  },
});
