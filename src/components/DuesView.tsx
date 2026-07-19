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
  Image,
} from 'react-native';
import api from '../api/client';
import storage from '../api/storage';
import { DuesSkeleton } from './LoadingSkeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, UserMinus, DollarSign, Send, X, Check, Phone, Plus, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function DuesView() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isPayModalVisible, setIsPayModalVisible] = useState(false);
  const [isSmsModalVisible, setIsSmsModalVisible] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK'>('CASH');

  // New Customer States
  const [isNewCustModalVisible, setIsNewCustModalVisible] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustNid, setNewCustNid] = useState('');
  const [newCustPhoto, setNewCustPhoto] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('অনুমতি প্রয়োজন', 'ক্যামেরা রোল অ্যাক্সেস করার অনুমতি প্রয়োজন');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewCustPhoto(result.assets[0].uri);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustName || !newCustMobile || !newCustAddress) {
      Alert.alert('ভুল', 'দয়া করে নাম, মোবাইল নম্বর এবং ঠিকানা দিন');
      return;
    }
    try {
      setIsSubmitting(true);
      const customerData: any = {
        name: newCustName,
        mobile: newCustMobile,
        address: newCustAddress,
      };
      if (newCustEmail.trim()) customerData.email = newCustEmail.trim();
      if (newCustNid.trim()) customerData.nid = newCustNid.trim();

      if (newCustPhoto) {
        const formData = new FormData();
        formData.append('data', JSON.stringify(customerData));

        const uriParts = newCustPhoto.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const filename = newCustPhoto.split('/').pop() || 'photo.jpg';

        formData.append('photo', {
          uri: newCustPhoto,
          name: filename,
          type: `image/${fileType}`,
        } as any);

        await api.post('/customers/create-customer', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await api.post('/customers/create-customer', customerData);
      }

      setIsNewCustModalVisible(false);
      setNewCustName('');
      setNewCustMobile('');
      setNewCustAddress('');
      setNewCustEmail('');
      setNewCustNid('');
      setNewCustPhoto(null);
      Alert.alert('সফল', 'নতুন কাস্টমার তৈরি হয়েছে');
      fetchDueCustomers(false);
    } catch (e: any) {
      Alert.alert('ব্যর্থ', e.response?.data?.message || 'কাস্টমার তৈরি করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load cached due customers
  const loadCachedData = async () => {
    try {
      const cachedDueCusts = await storage.get<any[]>('cached_due_customers');
      if (cachedDueCusts) {
        setCustomers(cachedDueCusts);
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Error loading cached dues:', e);
    }
  };

  const fetchDueCustomers = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) {
      setIsLoading(true);
    }
    try {
      const res = await api.get('/customers?limit=0');
      const all = res.data.data || [];
      const dueOnly = all.filter((c: any) => c.due > 0);
      setCustomers(dueOnly);
      await storage.set('cached_due_customers', dueOnly);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadCachedData();
      await fetchDueCustomers(customers.length === 0);
    };
    initialize();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDueCustomers(false);
  };

  const handlePayDue = async () => {
    if (!amountPaid || parseFloat(amountPaid) <= 0) { Alert.alert('ভুল', 'সঠিক পরিমাণ লিখুন'); return; }
    try {
      setIsSubmitting(true);
      await api.post(`/customers/${selectedCustomer._id}/pay-due`, { amountPaid: parseFloat(amountPaid), paymentMethod, accountId: null });
      Alert.alert('সফল!', 'বকেয়া পরিশোধের রেকর্ড সংরক্ষিত হয়েছে।', [{ text: 'ঠিক আছে', onPress: () => { setIsPayModalVisible(false); setAmountPaid(''); fetchDueCustomers(false); } }]);
    } catch (e: any) {
      Alert.alert('ব্যর্থ', e.response?.data?.message || 'সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsMessage.trim()) { Alert.alert('ভুল', 'মেসেজ ফাঁকা হতে পারে না'); return; }
    try {
      setIsSubmitting(true);
      await api.post('/sms/send', { to: selectedCustomer.mobile, message: smsMessage.trim() });
      Alert.alert('সফল!', 'তাগাদা SMS পাঠানো হয়েছে', [{ text: 'ঠিক আছে', onPress: () => setIsSmsModalVisible(false) }]);
    } catch (e: any) {
      Alert.alert('ব্যর্থ', e.response?.data?.message || 'SMS পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return customers.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.mobile.includes(searchQuery));
  }, [customers, searchQuery]);

  const totalDues = useMemo(() => {
    return customers.reduce((s, c) => s + (c.due || 0), 0);
  }, [customers]);

  const openPayModal = useCallback((c: any) => { 
    setSelectedCustomer(c); 
    setAmountPaid(c.due.toString()); 
    setIsPayModalVisible(true); 
  }, []);

  const openSmsModal = useCallback((c: any) => {
    setSelectedCustomer(c);
    setSmsMessage(`প্রিয় ${c.name}, Invexa শপ থেকে আপনার বকেয়ার পরিমাণ ৳${c.due}। অনুগ্রহ করে বকেয়া পরিশোধ করুন। ধন্যবাদ!`);
    setIsSmsModalVisible(true);
  }, []);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.custName}>{item.name}</Text>
          <View style={styles.phoneRow}>
            <Phone size={12} color="#94a3b8" style={{ marginRight: 4 }} />
            <Text style={styles.phoneText}>{item.mobile}</Text>
          </View>
        </View>
        <View style={styles.dueWrap}>
          <Text style={styles.dueLabel}>বকেয়া</Text>
          <Text style={styles.dueAmount}>৳{item.due}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.actionBtn, styles.smsActionBtn]} onPress={() => openSmsModal(item)} activeOpacity={0.7}>
          <Send size={13} color="#8b5cf6" style={{ marginRight: 4 }} />
          <Text style={[styles.actionBtnText, { color: '#8b5cf6' }]}>তাগাদা পাঠান</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.payActionBtn]} onPress={() => openPayModal(item)} activeOpacity={0.7}>
          <DollarSign size={13} color="#10b981" style={{ marginRight: 4 }} />
          <Text style={[styles.actionBtnText, { color: '#10b981' }]}>বকেয়া আদায়</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [openPayModal, openSmsModal]);

  if (isLoading && customers.length === 0) {
    return <DuesSkeleton />;
  }

  return (
    <View style={styles.root}>
      {/* Summary Banner */}
      <View style={styles.summaryBanner}>
        <View>
          <Text style={styles.summaryLabel}>মোট আদায়যোগ্য বকেয়া</Text>
          <Text style={styles.summaryAmount}>৳{totalDues.toLocaleString('bn-BD')}</Text>
        </View>
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryBadgeText}>{customers.length} জন কাস্টমার</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Search size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="কাস্টমার নাম বা মোবাইল খুঁজুন..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><X size={16} color="#94a3b8" /></TouchableOpacity>}
      </View>

      {/* Dues List */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <UserMinus size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={{ color: '#64748b', fontWeight: '500' }}>কোনো বকেয়া খাতা খালি রয়েছে</Text>
          </View>
        }
      />

      {/* Pay Due Modal */}
      {isPayModalVisible && (
        <Modal visible={isPayModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>বকেয়া আদায় করুন</Text>
                <TouchableOpacity onPress={() => setIsPayModalVisible(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <View style={styles.custDetail}>
                  <Text style={styles.detailName}>{selectedCustomer?.name}</Text>
                  <Text style={styles.detailPhone}>{selectedCustomer?.mobile}</Text>
                  <Text style={styles.detailDue}>বর্তমান বকেয়া: ৳{selectedCustomer?.due}</Text>
                </View>

                <Text style={styles.secLabel}>পরিশোধের পরিমাণ</Text>
                <TextInput
                  style={styles.textField}
                  keyboardType="numeric"
                  value={amountPaid}
                  onChangeText={setAmountPaid}
                  placeholder="টাকার পরিমাণ লিখুন"
                  placeholderTextColor="#cbd5e1"
                />

                <Text style={[styles.secLabel, { marginTop: 18 }]}>পেমেন্ট মেথড</Text>
                <View style={styles.payGrid}>
                  {(['CASH', 'BKASH', 'NAGAD'] as const).map((m) => (
                    <TouchableOpacity key={m} style={[styles.payBtn, paymentMethod === m && styles.payBtnActive]} onPress={() => setPaymentMethod(m)}>
                      <Text style={[styles.payBtnText, paymentMethod === m && styles.payBtnTextActive]}>
                        {m === 'CASH' ? 'ক্যাশ' : m === 'BKASH' ? 'বিকাশ' : 'নগদ'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={handlePayDue} disabled={isSubmitting} activeOpacity={0.85}>
                  <LinearGradient colors={['#10b981', '#059669']} style={styles.submitBtn}>
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Check size={16} color="#ffffff" />
                        <Text style={styles.submitBtnText}>আদায় নিশ্চিত করুন (৳{amountPaid})</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* SMS Alert Modal */}
      {isSmsModalVisible && (
        <Modal visible={isSmsModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>তাগাদা এসএমএস পাঠান</Text>
                <TouchableOpacity onPress={() => setIsSmsModalVisible(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <View style={styles.custDetail}>
                  <Text style={styles.detailName}>{selectedCustomer?.name}</Text>
                  <Text style={styles.detailPhone}>{selectedCustomer?.mobile}</Text>
                </View>
                <Text style={styles.secLabel}>এসএমএস বার্তা</Text>
                <TextInput
                  style={[styles.textField, { height: 100, paddingTop: 12, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={4}
                  value={smsMessage}
                  onChangeText={setSmsMessage}
                  placeholder="মেসেজ লিখুন"
                  placeholderTextColor="#cbd5e1"
                />
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={handleSendSMS} disabled={isSubmitting} activeOpacity={0.85}>
                  <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.submitBtn}>
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Send size={14} color="#ffffff" />
                        <Text style={styles.submitBtnText}>এসএমএস পাঠান</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {/* Floating Add Customer FAB */}
      <TouchableOpacity
        style={styles.fabAddCustomer}
        onPress={() => setIsNewCustModalVisible(true)}
        activeOpacity={0.8}
      >
        <Plus size={22} color="#ffffff" />
      </TouchableOpacity>

      {/* Create Customer Modal */}
      {isNewCustModalVisible && (
        <Modal visible={isNewCustModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>নতুন কাস্টমার যোগ করুন</Text>
                <TouchableOpacity onPress={() => setIsNewCustModalVisible(false)} style={styles.closeBtn}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
                {/* Photo Upload Picker */}
                <View style={styles.photoUploadWrapper}>
                  <TouchableOpacity onPress={pickImage} style={styles.photoPickerBtn} activeOpacity={0.8}>
                    {newCustPhoto ? (
                      <Image source={{ uri: newCustPhoto }} style={styles.photoPreview} />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Camera size={24} color="#64748b" />
                        <Text style={styles.photoPlaceholderText}>ছবি যোগ করুন</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {newCustPhoto && (
                    <TouchableOpacity onPress={() => setNewCustPhoto(null)} style={styles.photoRemoveBtn}>
                      <Text style={styles.photoRemoveText}>ছবি সরান</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View>
                  <Text style={styles.inputLabel}>কাস্টমার নাম *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="নাম লিখুন"
                    placeholderTextColor="#cbd5e1"
                    value={newCustName}
                    onChangeText={setNewCustName}
                  />
                </View>
                <View>
                  <Text style={styles.inputLabel}>মোবাইল নম্বর *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="মোবাইল নম্বর"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="phone-pad"
                    value={newCustMobile}
                    onChangeText={setNewCustMobile}
                  />
                </View>
                <View>
                  <Text style={styles.inputLabel}>ঠিকানা *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="বর্তমান ঠিকানা লিখুন"
                    placeholderTextColor="#cbd5e1"
                    value={newCustAddress}
                    onChangeText={setNewCustAddress}
                  />
                </View>
                <View>
                  <Text style={styles.inputLabel}>ইমেইল এড্রেস (ঐচ্ছিক)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="ইমেইল এড্রেস"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="email-address"
                    value={newCustEmail}
                    onChangeText={setNewCustEmail}
                  />
                </View>
                <View>
                  <Text style={styles.inputLabel}>এনআইডি (ঐচ্ছিক)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="এনআইডি নম্বর"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="numeric"
                    value={newCustNid}
                    onChangeText={setNewCustNid}
                  />
                </View>
                <TouchableOpacity style={[styles.submitBtn, { marginTop: 10, marginBottom: 20 }]} onPress={handleCreateCustomer} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>কাস্টমার সেভ করুন</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
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
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 12,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ef4444',
    marginTop: 4,
  },
  summaryBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  summaryBadgeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  custName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  phoneText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  dueWrap: {
    alignItems: 'flex-end',
  },
  dueLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  dueAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ef4444',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
  },
  smsActionBtn: {
    borderColor: '#ddd6fe',
    backgroundColor: '#f5f3ff',
  },
  payActionBtn: {
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
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
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  custDetail: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  detailName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailPhone: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  detailDue: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '700',
    marginTop: 6,
  },
  secLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textField: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    color: '#0f172a',
    paddingHorizontal: 12,
    height: 46,
    fontSize: 15,
    fontWeight: '600',
  },
  payGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  payBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payBtnActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  payBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  payBtnTextActive: {
    color: '#4f46e5',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  fabAddCustomer: {
    position: 'absolute',
    bottom: 92, // Positioned safely above the floating tab bar
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  closeBtn: {
    padding: 4,
  },
  inputLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    height: 44,
    paddingHorizontal: 12,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  photoUploadWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  photoPickerBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
  },
  photoRemoveBtn: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  photoRemoveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },
});
