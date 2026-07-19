import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import api from '../api/client';
import storage from '../api/storage';
import { ExpensesSkeleton } from './LoadingSkeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { ClipboardList, CheckCircle2, AlertTriangle, Info, Plus, Minus, History, Check, X } from 'lucide-react-native';

const DENOMINATIONS = [
  { value: 1000, label: '৳ ১০০০' },
  { value: 500, label: '৳ ৫০০' },
  { value: 200, label: '৳ ২০০' },
  { value: 100, label: '৳ ১০০' },
  { value: 50, label: '৳ ৫০' },
  { value: 20, label: '৳ ২০' },
  { value: 10, label: '৳ ১০' },
  { value: 5, label: '৳ ৫' },
  { value: 2, label: '৳ ২' },
  { value: 1, label: '৳ ১' },
];

export default function DailyClosingView() {
  const [expectedCash, setExpectedCash] = useState<number>(0);
  const [denominations, setDenominations] = useState<{ [key: number]: number }>({
    1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
  });
  const [remarks, setRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closingHistory, setClosingHistory] = useState<any[]>([]);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const fetchClosingData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, historyRes] = await Promise.all([
        api.get('/dashboard/stats').catch(() => ({ data: { data: {} } })),
        api.get('/daily-closing/history').catch(() => ({ data: { data: [] } })),
      ]);

      const stats = statsRes.data?.data || {};
      // Calculate expected cash balance from today's sales and expenses if available
      const cash = stats.todaySales !== undefined ? Math.max(0, (stats.todaySales || 0) - (stats.todayExpenses || 0)) : 0;
      setExpectedCash(cash);

      const hist = historyRes.data?.data || [];
      setClosingHistory(hist);
    } catch (e) {
      console.error('Failed to fetch daily closing data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClosingData();
  }, []);

  const actualCash = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [val, count]) => {
      return sum + Number(val) * (Number(count) || 0);
    }, 0);
  }, [denominations]);

  const discrepancy = actualCash - expectedCash;

  const handleAdjustCount = (val: number, delta: number) => {
    setDenominations((prev) => {
      const current = prev[val] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [val]: next };
    });
  };

  const handleSetCount = (val: number, text: string) => {
    const parsed = parseInt(text) || 0;
    setDenominations((prev) => ({ ...prev, [val]: Math.max(0, parsed) }));
  };

  const handleSubmitClosing = async () => {
    if (actualCash === 0) {
      Alert.alert('ভুল', 'ক্যাশ ড্রয়ারে গণনাকৃত টাকা ফাঁকা হতে পারে না');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        denominations: {
          note1000: denominations[1000] || 0,
          note500: denominations[500] || 0,
          note200: denominations[200] || 0,
          note100: denominations[100] || 0,
          note50: denominations[50] || 0,
          note20: denominations[20] || 0,
          note10: denominations[10] || 0,
          note5: denominations[5] || 0,
          note2: denominations[2] || 0,
          note1: denominations[1] || 0,
        },
        actualCash,
        remarks: remarks || 'আজকের ক্যাশ হিসাব সম্পন্ন করা হয়েছে',
      };

      await api.post('/daily-closing/submit', payload).catch(() => api.post('/daily-closing', payload));

      setIsSubmitted(true);
      Alert.alert('সফল!', 'আজকের দিনের ক্যাশ ক্লোজিং সম্পন্ন করা হয়েছে');
      fetchClosingData();
    } catch (e: any) {
      Alert.alert('ব্যর্থ', e.response?.data?.message || 'ক্লোজিং সাবমিট করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <ExpensesSkeleton />;
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerTitleWrap}>
          <ClipboardList size={22} color="#4f46e5" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>ডেইলি ক্লোজিং (ক্যাশ ড্রয়ার কাউন্টার)</Text>
        </View>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => setIsHistoryModalVisible(true)}
          activeOpacity={0.7}
        >
          <History size={14} color="#4f46e5" style={{ marginRight: 4 }} />
          <Text style={styles.historyBtnText}>হিস্ট্রি</Text>
        </TouchableOpacity>
      </View>

      {/* Summary KPI Cards */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>প্রত্যাশিত ক্যাশ</Text>
          <Text style={[styles.kpiValue, { color: '#4f46e5' }]}>৳{expectedCash.toLocaleString('bn-BD')}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>বাস্তব গণনা (Actual)</Text>
          <Text style={[styles.kpiValue, { color: '#10b981' }]}>৳{actualCash.toLocaleString('bn-BD')}</Text>
        </View>
      </View>

      {/* Discrepancy Status Banner */}
      <View
        style={[
          styles.statusCard,
          discrepancy === 0
            ? styles.statusMatch
            : discrepancy > 0
            ? styles.statusSurplus
            : styles.statusShortage,
        ]}
      >
        <View style={styles.statusHeader}>
          {discrepancy === 0 ? (
            <CheckCircle2 size={18} color="#10b981" style={{ marginRight: 6 }} />
          ) : discrepancy > 0 ? (
            <Info size={18} color="#0284c7" style={{ marginRight: 6 }} />
          ) : (
            <AlertTriangle size={18} color="#ef4444" style={{ marginRight: 6 }} />
          )}
          <Text
            style={[
              styles.statusTitle,
              discrepancy === 0
                ? { color: '#15803d' }
                : discrepancy > 0
                ? { color: '#0369a1' }
                : { color: '#b91c1c' },
            ]}
          >
            {discrepancy === 0
              ? 'হিসাব একদম সঠিক আছে!'
              : discrepancy > 0
              ? 'ক্যাশে অতিরিক্ত টাকা রয়েছে (Surplus)'
              : 'ক্যাশে ঘাটতি রয়েছে (Shortage)'}
          </Text>
        </View>
        <Text style={styles.statusDesc}>
          পার্থক্য: {discrepancy === 0 ? '৳০' : discrepancy > 0 ? `+৳${discrepancy}` : `-৳${Math.abs(discrepancy)}`}
        </Text>
      </View>

      {/* Note Denomination Counter */}
      <Text style={styles.sectionTitle}>নোট গণনার হিসাব (Note Counter)</Text>
      <View style={styles.denomGrid}>
        {DENOMINATIONS.map((d) => {
          const count = denominations[d.value] || 0;
          const subtotal = count * d.value;

          return (
            <View key={d.value} style={styles.denomCard}>
              <View style={styles.denomTop}>
                <Text style={styles.denomLabel}>{d.label}</Text>
                <Text style={styles.denomSubtotal}>৳{subtotal}</Text>
              </View>

              <View style={styles.counterRow}>
                <TouchableOpacity style={styles.countBtn} onPress={() => handleAdjustCount(d.value, -1)}>
                  <Minus size={14} color="#64748b" />
                </TouchableOpacity>

                <TextInput
                  style={styles.countInput}
                  keyboardType="numeric"
                  value={count > 0 ? count.toString() : ''}
                  onChangeText={(t) => handleSetCount(d.value, t)}
                  placeholder="0"
                  placeholderTextColor="#cbd5e1"
                />

                <TouchableOpacity style={styles.countBtn} onPress={() => handleAdjustCount(d.value, 1)}>
                  <Plus size={14} color="#4f46e5" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Remarks */}
      <View style={styles.remarksSection}>
        <Text style={styles.sectionTitle}>বিশেষ মন্তব্য / কারণ (Remarks)</Text>
        <TextInput
          style={styles.remarksInput}
          placeholder="ক্যাশে কোনো গরমিল বা মন্তব্য থাকলে এখানে লিখুন..."
          placeholderTextColor="#cbd5e1"
          multiline
          numberOfLines={3}
          value={remarks}
          onChangeText={setRemarks}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, actualCash === 0 && { opacity: 0.6 }]}
        onPress={handleSubmitClosing}
        disabled={actualCash === 0 || isSubmitting}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitGradient}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.submitText}>আজকের দিনের ক্লোজিং সাবমিট করুন</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* History Modal */}
      {isHistoryModalVisible && (
        <Modal visible={isHistoryModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>পূর্ববর্তী ক্লোজিং হিস্ট্রি</Text>
                <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
                {closingHistory.length === 0 ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ color: '#64748b' }}>কোনো পূর্ববর্তী ইতিহাস পাওয়া যায়নি</Text>
                  </View>
                ) : (
                  closingHistory.map((h, i) => (
                    <View key={i} style={styles.historyCard}>
                      <View style={styles.historyTop}>
                        <Text style={styles.historyDate}>
                          📅 {new Date(h.createdAt || h.date).toLocaleDateString('bn-BD')}
                        </Text>
                        <Text style={styles.historyAmount}>ক্যাশ: ৳{h.actualCash}</Text>
                      </View>
                      {h.remarks ? <Text style={styles.historyRemarks}>"{h.remarks}"</Text> : null}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  historyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statusCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusMatch: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  statusSurplus: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  statusShortage: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusDesc: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10,
  },
  denomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  denomCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  denomTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  denomLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  denomSubtotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countInput: {
    flex: 1,
    height: 32,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  remarksSection: {
    marginBottom: 16,
  },
  remarksInput: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
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
  historyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10b981',
  },
  historyRemarks: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
