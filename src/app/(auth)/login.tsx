import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../_layout';
import axios from 'axios';
import { Lock, Mail, Server, Eye, EyeOff, ShoppingBag, ChevronRight, X, Sparkles } from 'lucide-react-native';
import { DEFAULT_BASE_URL, saveServerUrl, getServerUrl } from '@/api/client';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const { login } = useAuth();
  const [serverUrl, setServerUrl] = useState(DEFAULT_BASE_URL);
  const [email, setEmail] = useState('hafsa.smart.solution@gmail.com');
  const [password, setPassword] = useState('Hasan1122');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [isShopModalVisible, setIsShopModalVisible] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // Load the previously saved server URL on mount so the user doesn't have to re-enter it
  useEffect(() => {
    const loadServerUrl = async () => {
      try {
        const savedUrl = await getServerUrl();
        if (savedUrl) {
          setServerUrl(savedUrl);
        }
      } catch (err) {
        console.error('Error loading saved server URL:', err);
      }
    };
    loadServerUrl();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('ইমেইল ও পাসওয়ার্ড প্রদান করুন');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      let formattedUrl = serverUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `http://${formattedUrl}`;
      }
      if (!formattedUrl.endsWith('/api/v1')) {
        if (formattedUrl.endsWith('/')) formattedUrl = formattedUrl.slice(0, -1);
        if (!formattedUrl.endsWith('/api/v1')) formattedUrl = `${formattedUrl}/api/v1`;
      }

      await saveServerUrl(formattedUrl);

      const response = await axios.post(`${formattedUrl}/auth/login`, {
        email: email.trim(),
        password: password,
      });

      const { accessToken } = response.data.data;
      if (!accessToken) throw new Error('টোকেন পাওয়া যায়নি');

      const shopsResponse = await axios.get(`${formattedUrl}/shops`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const fetchedShops = shopsResponse.data.data || [];

      if (fetchedShops.length === 0) {
        Alert.alert('শপ পাওয়া যায়নি', 'অনুগ্রহ করে শপ তৈরি করুন।');
        return;
      }

      if (fetchedShops.length === 1) {
        await login(accessToken, fetchedShops[0]._id);
      } else {
        setShops(fetchedShops);
        setPendingToken(accessToken);
        setIsShopModalVisible(true);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'লগইন ব্যর্থ হয়েছে! কানেকশন চেক করুন।';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const selectShop = async (shopId: string) => {
    if (pendingToken) {
      setIsShopModalVisible(false);
      await login(pendingToken, shopId);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoCircle}>
              <Sparkles size={28} color="#4f46e5" />
            </View>
            <Text style={styles.brandTitle}>Invexa</Text>
            <Text style={styles.brandSubtitle}>ব্যবসা পরিচালনা হোক সহজ ও স্মার্ট</Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            <Text style={styles.cardHeader}>স্বাগতম! লগইন করুন</Text>

            {errorMsg && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Server Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>সার্ভার আইপি / ডোমেইন</Text>
              <View style={styles.inputFieldWrapper}>
                <Server size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 192.168.0.100:5000"
                  placeholderTextColor="#94a3b8"
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ইমেইল ঠিকানা</Text>
              <View style={styles.inputFieldWrapper}>
                <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="admin@invexa.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>পাসওয়ার্ড</Text>
              <View style={styles.inputFieldWrapper}>
                <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
              <LinearGradient
                colors={['#4f46e5', '#6366f1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>লগইন করুন</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerCopyright}>Invexa © {new Date().getFullYear()} • All Rights Reserved</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Shop Selection Sheet */}
      <Modal visible={isShopModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>দোকান সিলেক্ট করুন</Text>
              <TouchableOpacity onPress={() => setIsShopModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.modalSub}>আপনার একাধিক শপ রয়েছে। প্রবেশ করার জন্য একটি বেছে নিন:</Text>
              {shops.map((shop) => (
                <TouchableOpacity
                  key={shop._id}
                  style={styles.shopCard}
                  onPress={() => selectShop(shop._id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.shopBadge}>
                    <ShoppingBag size={18} color="#4f46e5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopNameText}>{shop.shopName}</Text>
                    <Text style={styles.shopAddressText}>{shop.address || 'ঠিকানা দেওয়া নেই'}</Text>
                  </View>
                  <ChevronRight size={18} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 18,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
  },
  eyeButton: {
    padding: 8,
  },
  submitButton: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerCopyright: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 32,
    fontWeight: '500',
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
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  shopBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shopNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  shopAddressText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
