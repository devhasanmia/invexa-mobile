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
import { Search, FileText, Eye, DollarSign, X, Check, Calendar, User, Phone } from 'lucide-react-native';

export default function InvoicesView() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'DUE'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Pay Due Modal
  const [payDueInvoice, setPayDueInvoice] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'BANK'>('CASH');

  const loadCachedData = async () => {
    try {
      const cached = await storage.get<any[]>('cached_invoices');
      if (cached) {
        setInvoices(cached);
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Error loading cached invoices:', e);
    }
  };

  const fetchInvoices = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setIsLoading(true);
    try {
      const res = await api.get('/invoices');
      const invs = res.data.data || [];
      setInvoices(invs);
      await storage.set('cached_invoices', invs);
    } catch (e) {
      console.error('Failed to fetch invoices:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadCachedData();
      await fetchInvoices(invoices.length === 0);
    };
    initialize();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices(false);
  };

  const handlePayDue = async () => {
    if (!payDueInvoice || !payAmount || parseFloat(payAmount) <= 0) {
      Alert.alert('ভুল', 'সঠিক টাকার পরিমাণ উল্লেখ করুন');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/invoices/${payDueInvoice.invoiceNo}/pay-due`, {
        amountPaid: parseFloat(payAmount),
        paymentMethod: payMethod,
      });

      Alert.alert('সফল!', 'বকেয়া পরিশোধের তথ্য সফলভাবে সংরক্ষিত হয়েছে');
      setPayDueInvoice(null);
      setPayAmount('');
      fetchInvoices(false);
    } catch (e: any) {
      Alert.alert('ব্যর্থ', e.response?.data?.message || 'বকেয়া গ্রহণ করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isDue = inv.dueAmount > 0;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PAID' && !isDue) ||
        (statusFilter === 'DUE' && isDue);

      const custName = inv.customerId?.name || 'General Customer';
      const custMobile = inv.customerId?.mobile || '';
      const code = inv.invoiceNo || '';

      const matchSearch =
        code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        custName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        custMobile.includes(searchQuery);

      return matchStatus && matchSearch;
    });
  }, [invoices, statusFilter, searchQuery]);

  const renderInvoiceCard = useCallback(({ item }: { item: any }) => {
    const isDue = item.dueAmount > 0;
    const dateFormatted = new Date(item.date).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.codeWrap}>
            <FileText size={14} color="#4f46e5" style={{ marginRight: 4 }} />
            <Text style={styles.codeText}>{item.invoiceNo}</Text>
          </View>

          <View style={[styles.statusBadge, isDue ? styles.dueBadge : styles.paidBadge]}>
            <Text style={[styles.statusText, isDue ? styles.dueText : styles.paidText]}>
              {isDue ? 'বাকি' : 'পরিশোধিত'}
            </Text>
          </View>
        </View>

        <View style={styles.custRow}>
          <Text style={styles.custName}>{item.customerId?.name || 'সাধারণ কাস্টমার'}</Text>
          {item.customerId?.mobile ? (
            <Text style={styles.custPhone}>📱 {item.customerId.mobile}</Text>
          ) : null}
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.dateText}>📅 {dateFormatted}</Text>
            <Text style={styles.methodText}>পেমেন্ট: {item.paymentMethod || 'CASH'}</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.totalAmount}>৳{item.total}</Text>
            {isDue ? <Text style={styles.dueAmount}>বাকি: ৳{item.dueAmount}</Text> : null}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => setSelectedInvoice(item)}
            activeOpacity={0.7}
          >
            <Eye size={13} color="#4f46e5" style={{ marginRight: 4 }} />
            <Text style={styles.viewBtnText}>মেমো দেখুন</Text>
          </TouchableOpacity>

          {isDue ? (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => {
                setPayDueInvoice(item);
                setPayAmount(item.dueAmount.toString());
              }}
              activeOpacity={0.7}
            >
              <DollarSign size={13} color="#10b981" style={{ marginRight: 4 }} />
              <Text style={styles.payBtnText}>বকেয়া আদায়</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }, []);

  if (isLoading && invoices.length === 0) {
    return <DuesSkeleton />;
  }

  return (
    <View style={styles.root}>
      {/* Search Header */}
      <View style={styles.searchBarWrapper}>
        <Search size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="মেমো কোড বা কাস্টমার দিয়ে খুঁজুন..."
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

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'PAID', 'DUE'] as const).map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.filterTab, statusFilter === st && styles.filterTabActive]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[styles.filterTabText, statusFilter === st && styles.filterTabTextActive]}>
              {st === 'ALL' ? `সব ইনভয়েস (${invoices.length})` : st === 'PAID' ? 'পরিশোধিত' : 'বাকি'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Invoice List */}
      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceCard}
        keyExtractor={(item) => item._id || item.invoiceNo}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <FileText size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>কোনো ইনভয়েস রেকর্ড পাওয়া যায়নি</Text>
          </View>
        }
      />

      {/* Memo Detail Preview Modal */}
      {selectedInvoice && (
        <Modal visible={!!selectedInvoice} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>বিক্রয় মেমো ({selectedInvoice.invoiceNo})</Text>
                <TouchableOpacity onPress={() => setSelectedInvoice(null)}><X size={20} color="#94a3b8" /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
                {/* Customer Info Card */}
                <View style={styles.memoSection}>
                  <Text style={styles.memoSecTitle}>কাস্টমার তথ্য</Text>
                  <Text style={styles.memoCustName}>{selectedInvoice.customerId?.name || 'সাধারণ কাস্টমার'}</Text>
                  {selectedInvoice.customerId?.mobile ? (
                    <Text style={styles.memoCustSub}>মোবাইল: {selectedInvoice.customerId.mobile}</Text>
                  ) : null}
                  {selectedInvoice.customerId?.address ? (
                    <Text style={styles.memoCustSub}>ঠিকানা: {selectedInvoice.customerId.address}</Text>
                  ) : null}
                </View>

                {/* Items Table */}
                <View style={styles.memoSection}>
                  <Text style={styles.memoSecTitle}>পণ্য তালিকা</Text>
                  {selectedInvoice.items?.map((it: any, idx: number) => (
                    <View key={idx} style={styles.memoItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memoItemName}>{it.productId?.name || it.desc || 'Unknown Item'}</Text>
                        <Text style={styles.memoItemMeta}>{it.quantity} × ৳{it.rate}</Text>
                      </View>
                      <Text style={styles.memoItemTotal}>৳{it.total}</Text>
                    </View>
                  ))}
                </View>

                {/* Bill Summary */}
                <View style={styles.memoSection}>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>সাবটোটাল:</Text>
                    <Text style={styles.billVal}>৳{selectedInvoice.subtotal || selectedInvoice.total}</Text>
                  </View>
                  {selectedInvoice.discount ? (
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>ডিসকাউন্ট:</Text>
                      <Text style={[styles.billVal, { color: '#ef4444' }]}>-৳{selectedInvoice.discount}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.billRow, { borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={[styles.billLabel, { fontWeight: '800', color: '#0f172a' }]}>সর্বমোট বিল:</Text>
                    <Text style={[styles.billVal, { fontWeight: '800', fontSize: 16, color: '#4f46e5' }]}>৳{selectedInvoice.total}</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>জমা প্রাপ্ত:</Text>
                    <Text style={[styles.billVal, { color: '#10b981' }]}>৳{selectedInvoice.receivedAmount}</Text>
                  </View>
                  {selectedInvoice.dueAmount > 0 && (
                    <View style={styles.billRow}>
                      <Text style={[styles.billLabel, { color: '#ef4444', fontWeight: '800' }]}>অবশিষ্ট বাকি:</Text>
                      <Text style={[styles.billVal, { color: '#ef4444', fontWeight: '800' }]}>৳{selectedInvoice.dueAmount}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Pay Due Modal */}
      {payDueInvoice && (
        <Modal visible={!!payDueInvoice} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: 'auto', paddingBottom: 24 }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>ইনভয়েস বকেয়া আদায়</Text>
                <TouchableOpacity onPress={() => setPayDueInvoice(null)}><X size={20} color="#94a3b8" /></TouchableOpacity>
              </View>

              <View style={{ padding: 20, gap: 14 }}>
                <View style={styles.payDueBanner}>
                  <Text style={styles.payDueTitle}>মেমো: {payDueInvoice.invoiceNo}</Text>
                  <Text style={styles.payDueAmt}>বর্তমান বকেয়া: ৳{payDueInvoice.dueAmount}</Text>
                </View>

                <View>
                  <Text style={styles.inputLabel}>পরিশোধের পরিমাণ (৳)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={payAmount}
                    onChangeText={setPayAmount}
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>পেমেন্ট মেথড</Text>
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
                    <Text style={styles.submitBtnText}>আদায় সম্পন্ন করুন (৳{payAmount})</Text>
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
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 8,
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  filterTabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4f46e5',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paidBadge: {
    backgroundColor: '#dcfce7',
  },
  dueBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  paidText: {
    color: '#15803d',
  },
  dueText: {
    color: '#ef4444',
  },
  custRow: {
    marginBottom: 10,
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  custPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  methodText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  dueAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 10,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 10,
  },
  viewBtnText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '700',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 10,
  },
  payBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
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
  memoSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  memoSecTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  memoCustName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  memoCustSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  memoItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  memoItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  memoItemMeta: {
    fontSize: 11,
    color: '#64748b',
  },
  memoItemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  billLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  billVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  payDueBanner: {
    backgroundColor: '#fee2e2',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  payDueTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
  },
  payDueAmt: {
    fontSize: 16,
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
