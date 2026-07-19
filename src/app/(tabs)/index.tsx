import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../_layout';
import { LayoutDashboard, ShoppingBag, BookOpen, LogOut, MessageSquare, X, Receipt, Settings, Store, Bell, ArrowLeft, Package, FileText, ClipboardList, ChevronDown } from 'lucide-react-native';
import DashboardView from '../../components/DashboardView';
import PosView from '../../components/PosView';
import DuesView from '../../components/DuesView';
import ExpensesView from '../../components/ExpensesView';
import SettingsView from '../../components/SettingsView';
import ProductsView from '../../components/ProductsView';
import InvoicesView from '../../components/InvoicesView';
import DailyClosingView from '../../components/DailyClosingView';
import HalkhataView from '../../components/HalkhataView';
import storage from '../../api/storage';
import api from '../../api/client';

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'expenses'
  | 'dues'
  | 'settings'
  | 'products'
  | 'invoices'
  | 'dailyClosing'
  | 'halkhata';

export default function MainTabNavigator() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [shopName, setShopName] = useState('আমার দোকান');
  const [isFeatureMenuVisible, setIsFeatureMenuVisible] = useState(false);
  const [isSmsHistoryVisible, setIsSmsHistoryVisible] = useState(false);
  const [smsHistory, setSmsHistory] = useState<any[]>([]);
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [smsRefreshing, setSmsRefreshing] = useState(false);

  const fetchSmsHistory = async (showLoading = false) => {
    if (showLoading) setIsSmsLoading(true);
    try {
      const res = await api.get('/sms/history');
      setSmsHistory(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch SMS history:', error);
    } finally {
      setIsSmsLoading(false);
      setSmsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSmsHistoryVisible) {
      fetchSmsHistory(true);
    }
  }, [isSmsHistoryVisible]);

  // Load shop name from cache to display in the header
  useEffect(() => {
    const loadShopName = async () => {
      const name = await storage.get<string>('cached_shop_name');
      if (name) {
        setShopName(name);
      }
    };
    loadShopName();
    
    // Add a small interval to sync the shop name in case it changes
    const interval = setInterval(loadShopName, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setIsFeatureMenuVisible(false);
  }, []);

  const handleBellPress = () => {
    Alert.alert(
      'নোটিফিকেশন',
      'আপনার কোনো নতুন নোটিফিকেশন নেই। স্টক অ্যালার্ট ও অন্যান্য আপডেট ড্যাশবোর্ডে দেখতে পাবেন।',
      [{ text: 'ঠিক আছে' }]
    );
  };

  // Map header title
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'ড্যাশবোর্ড';
      case 'pos':
        return 'মোবাইল POS';
      case 'expenses':
        return 'খরচ হিসাব';
      case 'dues':
        return 'বকেয়া খাতা';
      case 'settings':
        return 'অ্যাপ সেটিংস';
      case 'products':
        return 'পণ্য ব্যবস্থাপনা';
      case 'invoices':
        return 'মেমো রেজিস্টার';
      case 'dailyClosing':
        return 'ডেইলি ক্লোজিং';
      case 'halkhata':
        return 'শুভ হালখাতা';
    }
  };

  const isSubFeature = ['products', 'invoices', 'dailyClosing', 'halkhata'].includes(activeTab);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Custom Header Bar */}
      <View style={styles.header}>
        {isSubFeature ? (
          <TouchableOpacity onPress={() => handleTabChange('dashboard')} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={18} color="#0f172a" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsFeatureMenuVisible(true)} style={styles.shopHeaderBadge} activeOpacity={0.8}>
            <Store size={14} color="#4f46e5" style={{ marginRight: 4 }} />
            <Text style={styles.shopHeaderName} numberOfLines={1}>{shopName}</Text>
            <ChevronDown size={12} color="#4f46e5" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity onPress={handleBellPress} style={styles.bellBtn} activeOpacity={0.7}>
          <Bell size={18} color="#64748b" />
          <View style={styles.bellDot} />
        </TouchableOpacity>
      </View>

      {/* Screen Views Wrapper */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && <DashboardView onNavigate={handleTabChange} />}
        {activeTab === 'pos' && <PosView />}
        {activeTab === 'expenses' && <ExpensesView />}
        {activeTab === 'dues' && <DuesView />}
        {activeTab === 'settings' && <SettingsView onLogout={logout} />}
        {activeTab === 'products' && <ProductsView />}
        {activeTab === 'invoices' && <InvoicesView />}
        {activeTab === 'dailyClosing' && <DailyClosingView />}
        {activeTab === 'halkhata' && <HalkhataView />}
      </View>

      {/* Custom Luxury Bottom Tab Bar */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {/* Dashboard Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleTabChange('dashboard')}
            activeOpacity={0.7}
          >
            <LayoutDashboard size={20} color={activeTab === 'dashboard' ? '#4f46e5' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>ড্যাশবোর্ড</Text>
            {activeTab === 'dashboard' ? (
              <View style={styles.indicator} />
            ) : (
              <View style={styles.indicatorPlaceholder} />
            )}
          </TouchableOpacity>

          {/* Expenses Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleTabChange('expenses')}
            activeOpacity={0.7}
          >
            <Receipt size={20} color={activeTab === 'expenses' ? '#4f46e5' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>খরচ হিসাব</Text>
            {activeTab === 'expenses' ? (
              <View style={styles.indicator} />
            ) : (
              <View style={styles.indicatorPlaceholder} />
            )}
          </TouchableOpacity>

          {/* POS Raised Center Button */}
          <TouchableOpacity
            style={[styles.centerTabItem, activeTab === 'pos' && styles.centerTabItemActive]}
            onPress={() => handleTabChange('pos')}
            activeOpacity={0.85}
          >
            <ShoppingBag size={22} color={activeTab === 'pos' ? '#ffffff' : '#64748b'} />
          </TouchableOpacity>

          {/* Dues Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleTabChange('dues')}
            activeOpacity={0.7}
          >
            <BookOpen size={20} color={activeTab === 'dues' ? '#4f46e5' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'dues' && styles.tabTextActive]}>বকেয়া</Text>
            {activeTab === 'dues' ? (
              <View style={styles.indicator} />
            ) : (
              <View style={styles.indicatorPlaceholder} />
            )}
          </TouchableOpacity>

          {/* Settings Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => handleTabChange('settings')}
            activeOpacity={0.7}
          >
            <Settings size={20} color={activeTab === 'settings' ? '#4f46e5' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>সেটিংস</Text>
            {activeTab === 'settings' ? (
              <View style={styles.indicator} />
            ) : (
              <View style={styles.indicatorPlaceholder} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Feature Menu Modal Sheet */}
      {isFeatureMenuVisible && (
        <Modal visible={isFeatureMenuVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: 'auto', paddingBottom: 30 }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>ইনভেক্সা মোবাইল ফিচারসমূহ</Text>
                <TouchableOpacity onPress={() => setIsFeatureMenuVisible(false)} style={styles.closeBtn}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.featureGrid}>
                <TouchableOpacity
                  style={[styles.featureItem, activeTab === 'dashboard' && styles.featureItemActive]}
                  onPress={() => handleTabChange('dashboard')}
                >
                  <View style={[styles.featureIconCircle, { backgroundColor: '#eef2ff' }]}>
                    <LayoutDashboard size={20} color="#4f46e5" />
                  </View>
                  <Text style={styles.featureTitle}>ড্যাশবোর্ড</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.featureItem, activeTab === 'pos' && styles.featureItemActive]}
                  onPress={() => handleTabChange('pos')}
                >
                  <View style={[styles.featureIconCircle, { backgroundColor: '#ecfdf5' }]}>
                    <ShoppingBag size={20} color="#10b981" />
                  </View>
                  <Text style={styles.featureTitle}>মোবাইল POS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.featureItem, activeTab === 'products' && styles.featureItemActive]}
                  onPress={() => handleTabChange('products')}
                >
                  <View style={[styles.featureIconCircle, { backgroundColor: '#eef2ff' }]}>
                    <Package size={20} color="#4f46e5" />
                  </View>
                  <Text style={styles.featureTitle}>পণ্য ব্যবস্থাপনা</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.featureItem, activeTab === 'invoices' && styles.featureItemActive]}
                  onPress={() => handleTabChange('invoices')}
                >
                  <View style={[styles.featureIconCircle, { backgroundColor: '#f0f9ff' }]}>
                    <FileText size={20} color="#0284c7" />
                  </View>
                  <Text style={styles.featureTitle}>মেমো রেজিস্টার</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.featureItem, activeTab === 'dailyClosing' && styles.featureItemActive]}
                  onPress={() => handleTabChange('dailyClosing')}
                >
                  <View style={[styles.featureIconCircle, { backgroundColor: '#fff7ed' }]}>
                    <ClipboardList size={20} color="#f97316" />
                  </View>
                  <Text style={styles.featureTitle}>ডেইলি ক্লোজিং</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.featureItem, activeTab === 'halkhata' && styles.featureItemActive]}
                  onPress={() => handleTabChange('halkhata')}
                >
                  <View style={[styles.featureIconCircle, { backgroundColor: '#f5f3ff' }]}>
                    <BookOpen size={20} color="#8b5cf6" />
                  </View>
                  <Text style={styles.featureTitle}>শুভ হালখাতা</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.featureItem, activeTab === 'expenses' && styles.featureItemActive]}
                  onPress={() => handleTabChange('expenses')}
                >
                  <View style={[styles.featureIconCircle, { backgroundColor: '#fef2f2' }]}>
                    <Receipt size={20} color="#ef4444" />
                  </View>
                  <Text style={styles.featureTitle}>খরচ হিসাব</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.featureItem, activeTab === 'dues' && styles.featureItemActive]}
                  onPress={() => handleTabChange('dues')}
                >
                  <View style={[styles.featureIconCircle, { backgroundColor: '#f5f3ff' }]}>
                    <BookOpen size={20} color="#8b5cf6" />
                  </View>
                  <Text style={styles.featureTitle}>বকেয়া খাতা</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.featureItem, activeTab === 'settings' && styles.featureItemActive]}
                  onPress={() => handleTabChange('settings')}
                >
                  <View style={[styles.featureIconCircle, { backgroundColor: '#f1f5f9' }]}>
                    <Settings size={20} color="#64748b" />
                  </View>
                  <Text style={styles.featureTitle}>সেটিংস</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* SMS History Modal */}
      {isSmsHistoryVisible && (
        <Modal visible={isSmsHistoryVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>এসএমএস প্রেরণের ইতিহাস</Text>
                <TouchableOpacity onPress={() => setIsSmsHistoryVisible(false)} style={styles.closeBtn}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {isSmsLoading ? (
                <View style={styles.smsLoadingContainer}>
                  <ActivityIndicator size="large" color="#4f46e5" />
                  <Text style={styles.smsLoadingText}>লোডিং এসএমএস হিস্ট্রি...</Text>
                </View>
              ) : (
                <FlatList
                  data={smsHistory}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={styles.smsListContent}
                  refreshing={smsRefreshing}
                  onRefresh={() => {
                    setSmsRefreshing(true);
                    fetchSmsHistory(false);
                  }}
                  renderItem={({ item }) => (
                    <View style={styles.smsLogCard}>
                      <View style={styles.smsLogTop}>
                        <Text style={styles.smsLogPhone}>📱 {item.to}</Text>
                        <View style={styles.smsCostBadge}>
                          <Text style={styles.smsCostText}>৳{item.smsCost?.toFixed(2)}</Text>
                        </View>
                      </View>
                      <Text style={styles.smsLogMessage}>{item.message}</Text>
                      <View style={styles.smsLogBottom}>
                        <Text style={styles.smsLogDate}>
                          {new Date(item.date).toLocaleString('bn-BD')}
                        </Text>
                        <View style={[styles.smsStatusBadge, item.status === 'SENT' ? styles.smsStatusSent : styles.smsStatusFailed]}>
                          <Text style={[styles.smsStatusText, item.status === 'SENT' ? styles.smsStatusSentText : styles.smsStatusFailedText]}>
                            {item.status === 'SENT' ? 'সফল' : 'ব্যর্থ'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.smsEmpty}>
                      <MessageSquare size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
                      <Text style={styles.smsEmptyText}>কোনো এসএমএস হিস্ট্রি পাওয়া যায়নি</Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 54,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  shopHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    maxWidth: 100,
  },
  shopHeaderName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4f46e5',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    flex: 1,
  },
  bellBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingBottom: 92, // Give space for the raised floating tab bar
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    height: 62,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    height: '100%',
    paddingTop: 8,
  },
  centerTabItem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -28, // Pull up above the tab bar
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  centerTabItemActive: {
    backgroundColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  indicator: {
    width: 12,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#4f46e5',
    marginTop: 4,
  },
  indicatorPlaceholder: {
    width: 12,
    height: 3,
    marginTop: 4,
  },
  tabText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 3,
  },
  tabTextActive: {
    color: '#4f46e5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '80%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  smsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  smsLoadingText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  smsListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  smsLogCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 14,
    marginBottom: 12,
  },
  smsLogTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  smsLogPhone: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  smsCostBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  smsCostText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4f46e5',
  },
  smsLogMessage: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  smsLogBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 8,
  },
  smsLogDate: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  smsStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  smsStatusSent: {
    backgroundColor: '#d1fae5',
  },
  smsStatusFailed: {
    backgroundColor: '#fee2e2',
  },
  smsStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  smsStatusSentText: {
    color: '#065f46',
  },
  smsStatusFailedText: {
    color: '#991b1b',
  },
  smsEmpty: {
    padding: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smsEmptyText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  featureItem: {
    width: '30%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  featureItemActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  featureIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
});
