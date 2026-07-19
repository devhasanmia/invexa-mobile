import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Store, ShieldCheck, LogOut } from 'lucide-react-native';
import storage from '../api/storage';
import api from '../api/client';

interface SettingsViewProps {
  onLogout: () => Promise<void>;
}

export default function SettingsView({ onLogout }: SettingsViewProps) {
  const [shopName, setShopName] = useState('');
  const [role, setRole] = useState('SHOP_OWNER');
  const [limits, setLimits] = useState<any>(null);

  useEffect(() => {
    const loadInfo = async () => {
      const cachedShopName = await storage.get<string>('cached_shop_name');
      if (cachedShopName) setShopName(cachedShopName);

      try {
        const res = await api.get('/dashboard/stats');
        const subLimits = res.data.data?.subscriptionLimits;
        if (subLimits) {
          setLimits(subLimits);
        }
      } catch (e) {
        // Ignore
      }
    };
    loadInfo();
  }, []);

  const handleLogoutPress = () => {
    Alert.alert(
      'লগআউট',
      'আপনি কি নিশ্চিতভাবে লগআউট করতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        { text: 'হ্যাঁ, লগআউট', style: 'destructive', onPress: onLogout }
      ]
    );
  };

  const planName = limits?.planName || 'Free Trial';
  const maxSales = limits?.limits?.maxSalesPerDay === -1 ? 'অসীম' : limits?.limits?.maxSalesPerDay || 'N/A';
  const maxProducts = limits?.limits?.maxProducts === -1 ? 'অসীম' : limits?.limits?.maxProducts || 'N/A';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Shop Info Card */}
      <View style={styles.profileCard}>
        <View style={styles.storeIconCircle}>
          <Store size={24} color="#4f46e5" />
        </View>
        <Text style={styles.shopNameText}>{shopName || 'আমার দোকান'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{role === 'SHOP_OWNER' ? 'শপ ওনার (মালিক)' : 'স্টাফ অ্যাসিস্ট্যান্ট'}</Text>
        </View>
      </View>

      {/* Subscription & Limits */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <ShieldCheck size={18} color="#10b981" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>সাবস্ক্রিপশন ও লিমিট বিবরণ</Text>
        </View>

        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>অ্যাক্টিভ প্ল্যান</Text>
          <Text style={[styles.limitVal, { color: '#10b981', fontWeight: '800' }]}>{planName}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>দৈনিক বিক্রি লিমিট</Text>
          <Text style={styles.limitVal}>{maxSales}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>সর্বোচ্চ প্রোডাক্ট সংখ্যা</Text>
          <Text style={styles.limitVal}>{maxProducts}</Text>
        </View>
      </View>

      {/* Log out button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress} activeOpacity={0.85}>
        <LogOut size={18} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.logoutBtnText}>লগআউট করুন</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  storeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  limitLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  limitVal: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
