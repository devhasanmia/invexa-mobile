import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/client';
import storage from '../api/storage';
import * as SecureStore from '../api/secureStore';
import {
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  AlertTriangle,
  ShoppingBag,
  BookOpen,
  ArrowUpRight,
  RefreshCw,
  Receipt,
  Store,
  Award,
  ShieldCheck,
  Target,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DashboardSkeleton } from './LoadingSkeleton';

interface DashboardViewProps {
  onNavigate: (tab: 'dashboard' | 'pos' | 'dues') => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const [stats, setStats] = useState<any>(null);
  const [shopName, setShopName] = useState('');
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached data from AsyncStorage first for instant render
  const loadCachedData = async () => {
    try {
      const cachedStats = await storage.get<any>('cached_stats');
      const cachedShopName = await storage.get<string>('cached_shop_name');
      const cachedTopProds = await storage.get<any[]>('cached_top_selling');
      
      if (cachedStats) {
        setStats(cachedStats);
      }
      if (cachedShopName) {
        setShopName(cachedShopName);
      }
      if (cachedTopProds) {
        setTopProducts(cachedTopProds);
      }
      // If we have cached stats, we can disable the loading spinner immediately
      if (cachedStats) {
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Error loading cached dashboard data:', e);
    }
  };

  const fetchData = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) {
      setIsLoading(true);
    }
    try {
      setError(null);
      const [statsRes, shopsRes, topSellingRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/shops'),
        api.get('/reports/top-selling').catch(() => ({ data: { data: [] } })),
      ]);

      const freshStats = statsRes.data.data;
      setStats(freshStats);
      await storage.set('cached_stats', freshStats);

      const freshTopProds = topSellingRes.data.data || [];
      setTopProducts(freshTopProds);
      await storage.set('cached_top_selling', freshTopProds);

      const shopId = await SecureStore.getItemAsync('selected_shop_id');
      const shops = shopsRes.data.data || [];
      const current = shops.find((s: any) => s._id === shopId) || shops[0];
      if (current) {
        const name = current.shopName;
        setShopName(name);
        await storage.set('cached_shop_name', name);
      }
    } catch (e: any) {
      console.error(e);
      // Only show error message if we don't have any cached stats rendered
      if (!stats) {
        setError('সার্ভার থেকে তথ্য লোড করা যায়নি।');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadCachedData();
      await fetchData(stats === null); // Show loading spinner only if cache is empty
    };
    initialize();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  if (isLoading && !stats) {
    return <DashboardSkeleton />;
  }

  const salesToday = stats?.todaySales || 0;
  const profitToday = stats?.todayProfit || 0;
  const salesYesterday = stats?.yesterdaySales || 0;
  const trend = stats?.salesTrendPercentage || 0;
  const lowStock = stats?.lowStockCount || 0;
  const todayExpenses = stats?.todayExpenses || 0;

  // Subscription limits details
  const subLimits = stats?.subscriptionLimits;
  const planName = subLimits?.planName || 'Free Trial';
  const usageSalesToday = subLimits?.usage?.salesCountToday || 0;
  const maxSalesLimit = subLimits?.limits?.maxSalesPerDay || 0;
  const usageProducts = subLimits?.usage?.productsCount || 0;
  const maxProductsLimit = subLimits?.limits?.maxProducts || 0;

  // Daily target configuration
  const dailyTarget = 15000;
  const targetProgress = Math.min(Math.round((salesToday / dailyTarget) * 100), 100);

  const profitMargin = salesToday > 0 ? Math.round((profitToday / salesToday) * 100) : 0;
  const trendUp = trend >= 0;

  const formatTk = (n: number) => `৳${n.toLocaleString('bn-BD')}`;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Shop Info Section */}
      <View style={styles.header}>
        <View style={styles.shopBadgeWrapper}>
          <View style={styles.storeIconCircle}>
            <Store size={16} color="#4f46e5" />
          </View>
          <Text style={styles.shopLabel} numberOfLines={1}>{shopName || 'আমার দোকান'}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
          <RefreshCw size={14} color="#64748b" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Hero Card: Today Sales */}
      <View style={styles.heroCard}>
        <LinearGradient
          colors={['#4f46e5', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroTop}>
            <Text style={styles.heroTag}>আজকের মোট বিক্রি</Text>
            <View style={[styles.trendPill, trendUp ? styles.trendPillUp : styles.trendPillDown]}>
              {trendUp ? <TrendingUp size={11} color="#10b981" /> : <TrendingDown size={11} color="#ef4444" />}
              <Text style={[styles.trendPillText, trendUp ? { color: '#10b981' } : { color: '#ef4444' }]}>
                {trendUp ? '+' : ''}{trend}%
              </Text>
            </View>
          </View>
          <Text style={styles.heroAmount}>{formatTk(salesToday)}</Text>
          <View style={styles.heroFooter}>
            <Text style={styles.heroSubText}>গতকাল: {formatTk(salesYesterday)}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsRow}>
        {/* Net Profit Card */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#ecfdf5' }]}>
              <CircleDollarSign size={18} color="#10b981" />
            </View>
            {salesToday > 0 && (
              <View style={styles.marginBadge}>
                <Text style={styles.marginBadgeText}>{profitMargin}% লাভ</Text>
              </View>
            )}
          </View>
          <Text style={styles.metricLabel}>আজকের নীট লাভ</Text>
          <Text style={[styles.metricValue, { color: '#10b981' }]}>{formatTk(profitToday)}</Text>
          <Text style={styles.metricSubtext}>সব খরচ বাদে লাভ</Text>
        </View>

        {/* Today's Expense Card */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#fff7ed' }]}>
              <Receipt size={18} color="#f97316" />
            </View>
          </View>
          <Text style={styles.metricLabel}>আজকের মোট খরচ</Text>
          <Text style={[styles.metricValue, { color: '#f97316' }]}>{formatTk(todayExpenses)}</Text>
          <Text style={styles.metricSubtext}>ক্রয় ও আনুষঙ্গিক খরচ</Text>
        </View>
      </View>

      {/* FEATURE 1: Daily Target Progress Card */}
      <View style={styles.targetCard}>
        <View style={styles.targetHeader}>
          <View style={styles.targetTitleWrap}>
            <Target size={18} color="#4f46e5" style={{ marginRight: 6 }} />
            <Text style={styles.targetTitle}>দৈনিক বিক্রয় লক্ষ্যমাত্রা</Text>
          </View>
          <Text style={styles.targetPercent}>{targetProgress}% পূরণ</Text>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${targetProgress}%` }]} />
        </View>
        
        <View style={styles.targetFooter}>
          <Text style={styles.targetValueText}>আজকের লক্ষ্য: {formatTk(dailyTarget)}</Text>
          <Text style={styles.targetValueRemaining}>বাকি: {formatTk(Math.max(0, dailyTarget - salesToday))}</Text>
        </View>
      </View>

      {/* Low Stock Alert Board */}
      {lowStock > 0 && (
        <TouchableOpacity style={styles.alertBanner} onPress={() => onNavigate('pos')} activeOpacity={0.8}>
          <View style={styles.alertIconCircle}>
            <AlertTriangle size={18} color="#d97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>স্টক ফুরিয়ে যাচ্ছে!</Text>
            <Text style={styles.alertDesc}>{lowStock}টি প্রোডাক্টের স্টক শেষ হওয়ার পথে</Text>
          </View>
          <ArrowUpRight size={16} color="#d97706" />
        </TouchableOpacity>
      )}

      {/* FEATURE 2: Top Selling Products */}
      {topProducts.length > 0 && (
        <View style={styles.topSellingCard}>
          <View style={styles.topSellingHeader}>
            <Award size={18} color="#f59e0b" style={{ marginRight: 6 }} />
            <Text style={styles.topSellingTitle}>সেরা বিক্রিত পণ্যসমূহ</Text>
          </View>
          
          <View style={styles.topSellingList}>
            {topProducts.slice(0, 5).map((prod, index) => (
              <View key={index} style={styles.topProdRow}>
                <View style={styles.topProdInfo}>
                  <Text style={styles.topProdName}>{prod.name}</Text>
                  <Text style={styles.topProdCount}>{prod.salesCount} টি বিক্রি</Text>
                </View>
                <View style={styles.topProdBarBg}>
                  <View style={[styles.topProdBarFill, { width: `${prod.percentage}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* FEATURE 3: Package & Daily Limits */}
      {subLimits && (
        <View style={styles.limitCard}>
          <View style={styles.limitHeader}>
            <ShieldCheck size={18} color="#10b981" style={{ marginRight: 6 }} />
            <Text style={styles.limitTitle}>প্যাকেজ ও দৈনিক লিমিট</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{planName}</Text>
            </View>
          </View>

          <View style={styles.limitGrid}>
            <View style={styles.limitItem}>
              <Text style={styles.limitItemLabel}>দৈনিক বিক্রি লিমিট</Text>
              <Text style={styles.limitItemValue}>
                {usageSalesToday} / {maxSalesLimit === -1 ? 'অসীম' : maxSalesLimit}
              </Text>
            </View>

            <View style={styles.limitItem}>
              <Text style={styles.limitItemLabel}>মোট প্রোডাক্ট লিমিট</Text>
              <Text style={styles.limitItemValue}>
                {usageProducts} / {maxProductsLimit === -1 ? 'অসীম' : maxProductsLimit}
              </Text>
            </View>
          </View>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  shopBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    maxWidth: '85%',
  },
  storeIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  shopLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
  },
  // Hero
  heroCard: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  heroGradient: {
    padding: 24,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTag: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  trendPillUp: {
    backgroundColor: '#e6fcf5',
  },
  trendPillDown: {
    backgroundColor: '#fff5f5',
  },
  trendPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroAmount: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroFooter: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 12,
  },
  heroSubText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marginBadge: {
    backgroundColor: '#e6fcf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  marginBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  metricSubtext: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '500',
  },
  // Feature 1: Target Card
  targetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 10,
    elevation: 1,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  targetPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 4,
  },
  targetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetValueText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  targetValueRemaining: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  // Alert
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  alertIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertTitle: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '700',
  },
  alertDesc: {
    color: '#d97706',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  // Feature 2: Top Selling Card
  topSellingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 10,
    elevation: 1,
  },
  topSellingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  topSellingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  topSellingList: {
    gap: 12,
  },
  topProdRow: {
    gap: 6,
  },
  topProdInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topProdName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  topProdCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
  },
  topProdBarBg: {
    height: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 2,
    overflow: 'hidden',
  },
  topProdBarFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 2,
  },
  // Feature 3: Limit Card
  limitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 10,
    elevation: 1,
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  limitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  planBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planBadgeText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '700',
  },
  limitGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  limitItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  limitItemLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  limitItemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  // Quick Actions
  sectionLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  actionSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
});
