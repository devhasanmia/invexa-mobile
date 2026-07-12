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
import { ExpensesSkeleton } from './LoadingSkeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Receipt, DollarSign, X, Check, Plus, Calendar, Layers } from 'lucide-react-native';

const EXPENSE_CATEGORIES = [
  { id: 'ALL', label: 'সব খরচ', icon: '📋' },
  { id: 'PRODUCT_PURCHASE', label: 'পণ্য ক্রয়', icon: '🛍️' },
  { id: 'SALARY', label: 'বেতন', icon: '💼' },
  { id: 'RENT', label: 'ভাড়া', icon: '🏠' },
  { id: 'ELECTRICITY', label: 'বিদ্যুৎ বিল', icon: '💡' },
  { id: 'INTERNET', label: 'ইন্টারনেট', icon: '🌐' },
  { id: 'OTHERS', label: 'অন্যান্য', icon: '📦' },
];

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'ক্যাশ' },
  { id: 'BKASH', label: 'বিকাশ' },
  { id: 'NAGAD', label: 'নগদ' },
  { id: 'BANK', label: 'ব্যাংক' },
];

const BUDGET_LIMIT = 50000; // Monthly budget limit

export default function ExpensesView() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isNewExpenseModalVisible, setIsNewExpenseModalVisible] = useState(false);

  // New Expense States
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('OTHERS');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'BANK'>('CASH');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load cached expenses first for instant render
  const loadCachedData = async () => {
    try {
      const cached = await storage.get<any[]>('cached_expenses');
      if (cached) {
        setExpenses(cached);
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Error loading cached expenses:', e);
    }
  };

  const fetchExpenses = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) {
      setIsLoading(true);
    }
    try {
      const res = await api.get('/expenses');
      const fetchedExpenses = res.data.data.result || [];
      // Sort expenses by date descending
      fetchedExpenses.sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
      
      setExpenses(fetchedExpenses);
      await storage.set('cached_expenses', fetchedExpenses);
    } catch (error: any) {
      console.error('Failed to fetch expenses:', error);
      Alert.alert('ভুল', 'খরচের বিবরণী লোড করা যায়নি।');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadCachedData();
      await fetchExpenses(expenses.length === 0);
    };
    initialize();
  }, []);

  const handleCreateExpense = async () => {
    if (!title.trim() || !amount.trim()) {
      setErrorMsg('দয়া করে খরচের বিবরণ ও পরিমাণ দিন');
      return;
    }

    const amtVal = parseFloat(amount);
    if (isNaN(amtVal) || amtVal <= 0) {
      setErrorMsg('খরচের পরিমাণ সঠিক হতে হবে');
      return;
    }

    try {
      setErrorMsg(null);
      setIsSubmitting(true);
      const payload = {
        title: title.trim(),
        category,
        amount: amtVal,
        paymentMethod,
        note: note.trim(),
      };

      await api.post('/expenses', payload);
      
      Alert.alert('সফল', 'নতুন খরচ যুক্ত করা হয়েছে');
      setIsNewExpenseModalVisible(false);
      
      // Reset inputs
      setTitle('');
      setCategory('OTHERS');
      setAmount('');
      setPaymentMethod('CASH');
      setNote('');

      // Refresh list
      fetchExpenses(false);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'খরচ সংরক্ষণ করা যায়নি';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summaries Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let todayTotal = 0;
    let monthTotal = 0;

    expenses.forEach((exp) => {
      const expDate = new Date(exp.date || exp.createdAt);
      if (expDate.toDateString() === todayStr) {
        todayTotal += exp.amount;
      }
      if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
        monthTotal += exp.amount;
      }
    });

    return {
      todayTotal,
      monthTotal,
    };
  }, [expenses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses(false);
  };

  // Filter & Search logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchCat = selectedCategory === 'ALL' || exp.category === selectedCategory;
      const matchSearch =
        exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [expenses, selectedCategory, searchQuery]);

  const budgetProgress = Math.min(Math.round((stats.monthTotal / BUDGET_LIMIT) * 100), 100);

  const formatTk = (n: number) => `৳${n.toLocaleString('bn-BD')}`;
  
  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'PRODUCT_PURCHASE':
        return { label: 'পণ্য ক্রয়', icon: '🛍️', color: '#3b82f6', bg: '#eff6ff' };
      case 'SALARY':
        return { label: 'বেতন', icon: '💼', color: '#10b981', bg: '#ecfdf5' };
      case 'RENT':
        return { label: 'ভাড়া', icon: '🏠', color: '#8b5cf6', bg: '#f5f3ff' };
      case 'ELECTRICITY':
        return { label: 'বিদ্যুৎ বিল', icon: '💡', color: '#f59e0b', bg: '#fffbeb' };
      case 'INTERNET':
        return { label: 'ইন্টারনেট', icon: '🌐', color: '#06b6d4', bg: '#ecfeff' };
      default:
        return { label: 'অন্যান্য', icon: '📦', color: '#64748b', bg: '#f8fafc' };
    }
  };

  const renderExpenseCard = useCallback(({ item }: { item: any }) => {
    const catDetails = getCategoryDetails(item.category);
    const dateFormatted = new Date(item.date || item.createdAt).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return (
      <View style={styles.expenseCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: catDetails.bg }]}>
            <Text style={{ marginRight: 4 }}>{catDetails.icon}</Text>
            <Text style={[styles.categoryText, { color: catDetails.color }]}>{catDetails.label}</Text>
          </View>
          <Text style={styles.paymentMethodBadge}>{item.paymentMethod}</Text>
        </View>

        <Text style={styles.expenseTitle}>{item.title}</Text>
        {item.note ? <Text style={styles.expenseNote} numberOfLines={1}>{item.note}</Text> : null}

        <View style={styles.cardFooter}>
          <View style={styles.dateContainer}>
            <Calendar size={12} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>{dateFormatted}</Text>
          </View>
          <Text style={styles.expenseAmount}>৳{item.amount.toLocaleString('bn-BD')}</Text>
        </View>
      </View>
    );
  }, []);

  if (isLoading && expenses.length === 0) {
    return <ExpensesSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBarWrapper}>
        <Search size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="খরচ বিবরণ বা মাধ্যম দিয়ে খুঁজুন..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 8 }}>
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredExpenses}
        renderItem={renderExpenseCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.scrollList}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <>
            {/* Top Summaries Grid */}
            <View style={styles.summariesRow}>
              <View style={styles.summaryCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
                  <Receipt size={18} color="#ef4444" />
                </View>
                <Text style={styles.summaryLabel}>আজকের মোট খরচ</Text>
                <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{formatTk(stats.todayTotal)}</Text>
              </View>

              <View style={styles.summaryCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#ffedd5' }]}>
                  <DollarSign size={18} color="#f97316" />
                </View>
                <Text style={styles.summaryLabel}>চলতি মাসের খরচ</Text>
                <Text style={[styles.summaryValue, { color: '#f97316' }]}>{formatTk(stats.monthTotal)}</Text>
              </View>
            </View>

            {/* Monthly Budget Progress Card */}
            <View style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetTitle}>বাজেট লিমিট ও ব্যবহার (চলতি মাস)</Text>
                <Text style={styles.budgetPercent}>{budgetProgress}% ব্যবহৃত</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${budgetProgress}%`,
                      backgroundColor: budgetProgress > 85 ? '#ef4444' : budgetProgress > 60 ? '#f59e0b' : '#10b981',
                    },
                  ]}
                />
              </View>
              <View style={styles.budgetFooter}>
                <Text style={styles.budgetLimitText}>সর্বোচ্চ লিমিট: {formatTk(BUDGET_LIMIT)}</Text>
                <Text style={styles.budgetLimitText}>অবशिष्ट: {formatTk(Math.max(0, BUDGET_LIMIT - stats.monthTotal))}</Text>
              </View>
            </View>

            {/* Category Filter horizontal */}
            <View style={{ height: 38, marginBottom: 16, marginTop: 4 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catTab, selectedCategory === cat.id && styles.catTabActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.catTabText, selectedCategory === cat.id && styles.catTabTextActive]}>
                      {cat.icon} {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Layers size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>কোনো খরচের তথ্য পাওয়া যায়নি</Text>
          </View>
        }
      />

      {/* Floating Add Expense FAB */}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={() => {
          setErrorMsg(null);
          setIsNewExpenseModalVisible(true);
        }}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#4f46e5', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fabGradient}
        >
          <Plus size={20} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.fabBtnText}>নতুন খরচ</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* New Expense Modal */}
      <Modal visible={isNewExpenseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>নতুন খরচ লিপিবদ্ধ করুন</Text>
              <TouchableOpacity onPress={() => setIsNewExpenseModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              {errorMsg && (
                <View style={styles.modalErrorBanner}>
                  <Text style={styles.modalErrorText}>{errorMsg}</Text>
                </View>
              )}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>খরচের বিবরণ (Title) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="যেমন: বিদ্যুৎ বিল, নাস্তা ইত্যাদি"
                  placeholderTextColor="#cbd5e1"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>খরচের পরিমাণ (Amount in Taka) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="৳০.০০"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>ক্যাটাগরি নির্বাচন করুন *</Text>
                <View style={styles.catGrid}>
                  {EXPENSE_CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.catGridBtn, category === c.id && styles.catGridBtnActive]}
                      onPress={() => setCategory(c.id)}
                    >
                      <Text style={styles.catGridIcon}>{c.icon}</Text>
                      <Text style={[styles.catGridLabel, category === c.id && styles.catGridLabelActive]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>পেমেন্ট মাধ্যম (Payment Method) *</Text>
                <View style={styles.methodsRow}>
                  {PAYMENT_METHODS.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.methodBtn, paymentMethod === m.id && styles.methodBtnActive]}
                      onPress={() => setPaymentMethod(m.id as any)}
                    >
                      <Text style={[styles.methodBtnText, paymentMethod === m.id && styles.methodBtnTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>নোট/মন্তব্য (ঐচ্ছিক)</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="অতিরিক্ত কোনো তথ্য থাকলে এখানে লিখুন..."
                  placeholderTextColor="#cbd5e1"
                  multiline
                  value={note}
                  onChangeText={setNote}
                />
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateExpense}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtnGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.submitBtnText}>খরচ সংরক্ষণ করুন</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  scrollList: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 96,
  },
  summariesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  budgetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetTitle: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '800',
  },
  budgetPercent: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetLimitText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  categoriesScroll: {
    gap: 8,
  },
  catTab: {
    paddingHorizontal: 16,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catTabActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  catTabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  catTabTextActive: {
    color: '#ffffff',
  },
  expenseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paymentMethodBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  expenseNote: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ef4444',
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '600',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    height: 48,
    borderRadius: 24,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 999,
  },
  fabGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderRadius: 24,
  },
  fabBtnText: {
    color: '#ffffff',
    fontSize: 14,
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
    paddingBottom: 24,
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  closeBtn: {
    padding: 4,
  },
  modalForm: {
    padding: 20,
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catGridBtn: {
    width: '31%',
    aspectRatio: 1.3,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  catGridBtnActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#818cf8',
  },
  catGridIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  catGridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  catGridLabelActive: {
    color: '#4f46e5',
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodBtnActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#818cf8',
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  methodBtnTextActive: {
    color: '#4f46e5',
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 8,
    marginBottom: 16,
  },
  submitBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalErrorBanner: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  modalErrorText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
