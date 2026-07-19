import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import api from '../api/client';
import storage from '../api/storage';
import { DuesSkeleton } from './LoadingSkeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Send, DollarSign, Search, Check, X, Phone, Users } from 'lucide-react-native';

export default function HalkhataView() {
  const [dueCustomers, setDueCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk SMS Modal
  const [isBulkSmsModalVisible, setIsBulkSmsModalVisible] = useState(false);
  const [bulkSmsMessage, setBulkSmsMessage] = useState(
    'শুভ হালখাতা! আমাদের শপে আপনার বকেয়া রয়েছে। অনুগ্রহ করে বকেয়া পরিশোধ করে মিষ্টি মুখ করার আমন্ত্রণ গ্রহণ করুন।'
  );

  // Pay Due Modal
  const [selectedCust, setSelectedCust] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BKASH' | 'NAGAD'>('CASH');

  const fetchHalkhataData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await api.get('/customers?limit=0');
      const allCusts = res.data?.data || [];
      const duesOnly = allCusts.filter((c: any) => c.due > 0);
      setDueCustomers(duesOnly);
      await storage.set('cached_due_customers', duesOnly);
    } catch (e) {
      console.error('Failed to fetch halkhata customers:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHalkhataData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHalkhataData(false);
  };

  const totalDuesTarget = useMemo(() => {
    return dueCustomers.reduce((sum, c) => sum + (c.due || 0), 0);
  }, [dueCustomers]);

  const handleSendBulkSms = async () => {
    if (!bulkSmsMessage.trim()) {
      Alert.alert('ভুল', 'মেসেজ বিষয়বস্তু লিখুন');
      return;
    }

    try {
      setIsSubmitting(true);
      const mobiles = dueCustomers.map((c) => c.mobile).filter(Boolean);
      await api.post('/sms/bulk', {
        recipients: mobiles,
        message: bulkSmsMessage.trim(),
      });

      Alert.alert('সফল!', `${mobiles.length} জন বকেয়া কাস্টমারকে হালখাতার নিমন্ত্রণ SMS পাঠানো হয়েছে`);
      setIsBulkSmsModalVisible(false);
    } catch (e: any) {
      Alert.alert('ব্যর্থ', e.response?.data?.message || 'SMS পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayDue = async () => {
    if (!selectedCust || !payAmount || parseFloat(payAmount) <= 0) {
      Alert.alert('ভুল', 'সঠিক পরিমাণ লিখুন');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/customers/${selectedCust._id}/pay-due`, {
        amountPaid: parseFloat(payAmount),
        paymentMethod: payMethod,
      });

      Alert.alert('সফল!', 'বকেয়া আদায়ে হালখাতা খাতা আপডেট হয়েছে');
      setSelectedCust(null);
      setPayAmount('');
      fetchHalkhataData(false);
    } catch (e: any) {
      Alert.alert('ব্যর্থ', e.response?.data?.message || 'টাকা জমা ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return dueCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mobile.includes(searchQuery)
    );
  }, [dueCustomers, searchQuery]);

  const renderCustomerItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.custName}>{item.name}</Text>
          <Text style={styles.custPhone}>📱 {item.mobile}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.dueLabel}>বকেয়া টার্গেট</Text>
          <Text style={styles.dueAmount}>৳{item.due}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={() => {
            setSelectedCust(item);
            setPayAmount(item.due.toString());
          }}
          activeOpacity={0.7}
        >
          <DollarSign size={13} color="#10b981" style={{ marginRight: 4 }} />
          <Text style={styles.payBtnText}>হালখাতা আদায়</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), []);

  if (isLoading && dueCustomers.length === 0) {
    return <DuesSkeleton />;
  }

  return (
    <View style={styles.root}>
      {/* Halkhata Summary Banner */}
      <View style={styles.banner}>
        <LinearGradient
          colors={['#8b5cf6', '#6d28d9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bannerGradient}
        >
          <View style={styles.bannerHeader}>
            <BookOpen size={20} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.bannerTitle}>শুভ হালখাতা ইভেন্ট</Text>
          </View>
          <Text style={styles.bannerSub}>মোট বকেয়া সংগ্রহের লক্ষ্যমাত্রা</Text>
          <Text style={styles.bannerAmount}>৳{totalDuesTarget.toLocaleString('bn-BD')}</Text>

          <TouchableOpacity
            style={styles.bulkSmsBtn}
            onPress={() => setIsBulkSmsModalVisible(true)}
            activeOpacity={0.85}
          >
            <Send size={14} color="#6d28d9" style={{ marginRight: 6 }} />
            <Text style={styles.bulkSmsBtnText}>সবাইকে হালখাতার নিমন্ত্রণ SMS পাঠান ({dueCustomers.length})</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrapper}>
        <Search size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="কাস্টমার নাম বা মোবাইল দিয়ে খুঁজুন..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Due Customer List */}
      <FlatList
        data={filtered}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Users size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>হালখাতার জন্য কোনো বকেয়া গ্রাহক নেই</Text>
          </View>
        }
      />

      {/* Bulk SMS Modal */}
      {isBulkSmsModalVisible && (
        <Modal visible={isBulkSmsModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: 'auto', paddingBottom: 24 }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>হালখাতার নিমন্ত্রণ SMS (Bulk SMS)</Text>
                <TouchableOpacity onPress={() => setIsBulkSmsModalVisible(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
              </View>

              <View style={{ padding: 20, gap: 14 }}>
                <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                  মোট {dueCustomers.length} জন বকেয়া কাস্টমারকে নিমন্ত্রণ মেসেজ পাঠানো হবে।
                </Text>

                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  value={bulkSmsMessage}
                  onChangeText={setBulkSmsMessage}
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleSendBulkSms} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Send size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.submitBtnText}>এসএমএস পাঠান</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Pay Due Modal */}
      {selectedCust && (
        <Modal visible={!!selectedCust} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: 'auto', paddingBottom: 24 }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>হালখাতা আদায় রেকর্ড</Text>
                <TouchableOpacity onPress={() => setSelectedCust(null)}><X size={20} color="#94a3b8" /></TouchableOpacity>
              </View>

              <View style={{ padding: 20, gap: 14 }}>
                <View style={styles.custBanner}>
                  <Text style={styles.custBannerName}>{selectedCust.name}</Text>
                  <Text style={styles.custBannerAmt}>বর্তমান বকেয়া: ৳{selectedCust.due}</Text>
                </View>

                <View>
                  <Text style={styles.inputLabel}>আদায়কৃত টাকার পরিমাণ (৳)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={payAmount}
                    onChangeText={setPayAmount}
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>পেমেন্ট মাধ্যম</Text>
                  <View style={styles.payGrid}>
                    {(['CASH', 'BKASH', 'NAGAD'] as const).map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.payGridBtn, payMethod === m && styles.payGridBtnActive]}
                        onPress={() => setPayMethod(m)}
                      >
                        <Text style={[styles.payGridText, payMethod === m && styles.payGridTextActive]}>
                          {m === 'CASH' ? 'ক্যাশ' : m === 'BKASH' ? 'বিকাশ' : 'নগদ'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handlePayDue} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>আদায় নিশ্চিত করুন</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  banner: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 22,
    overflow: 'hidden',
  },
  bannerGradient: {
    padding: 20,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  bannerAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 4,
  },
  bulkSmsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    height: 38,
    borderRadius: 12,
    marginTop: 12,
  },
  bulkSmsBtnText: {
    color: '#6d28d9',
    fontSize: 12,
    fontWeight: '800',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  custName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  custPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  dueLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  dueAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ef4444',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 10,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 10,
  },
  payBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyWrap: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '600',
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
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  textArea: {
    height: 100,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#0f172a',
  },
  custBanner: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  custBannerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  custBannerAmt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ef4444',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  payGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  payGridBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payGridBtnActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  payGridText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  payGridTextActive: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
