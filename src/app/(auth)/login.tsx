import React, { useState } from 'react';
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
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../_layout';
import axios from 'axios';
import { Lock, Mail, Eye, EyeOff, ShoppingBag, ChevronRight, X, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react-native';
import { getServerUrl } from '@/api/client';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [shops, setShops] = useState<any[]>([]);
  const [isShopModalVisible, setIsShopModalVisible] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingRefreshToken, setPendingRefreshToken] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('ইমেইল ও পাসওয়ার্ড প্রদান করুন');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const targetUrl = await getServerUrl();

      const response = await axios.post(`${targetUrl}/auth/login`, {
        email: email.trim(),
        password: password,
      });

      const { accessToken, refreshToken } = response.data.data;
      if (!accessToken || !refreshToken) throw new Error('টোকেন পাওয়া যায়নি');

      const shopsResponse = await axios.get(`${targetUrl}/shops`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const fetchedShops = shopsResponse.data.data || [];

      if (fetchedShops.length === 0) {
        Alert.alert('শপ পাওয়া যায়নি', 'অনুগ্রহ করে শপ তৈরি করুন।');
        return;
      }

      if (fetchedShops.length === 1) {
        await login(accessToken, refreshToken, fetchedShops[0]._id);
      } else {
        setShops(fetchedShops);
        setPendingToken(accessToken);
        setPendingRefreshToken(refreshToken);
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
    if (pendingToken && pendingRefreshToken) {
      setIsShopModalVisible(false);
      await login(pendingToken, pendingRefreshToken, shopId);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f1f5f9" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Decorative Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadgeContainer}>
              <Image
                source={require('../../../assets/images/logo-glow.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.brandTitle}>Invexa</Text>
            <View style={styles.taglineChip}>
              <ShieldCheck size={13} color="#4f46e5" style={{ marginRight: 4 }} />
              <Text style={styles.taglineText}>স্মার্ট ও ডিজিটাল ব্যবসা সিস্টেম</Text>
            </View>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>একাউন্টে প্রবেশ করুন</Text>
              <Text style={styles.cardSubTitle}>আপনার সঠিক ইমেইল ও পাসওয়ার্ড লিখুন</Text>
            </View>

            {errorMsg && (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ইমেইল ঠিকানা</Text>
              <View
                style={[
                  styles.inputContainer,
                  emailFocused && styles.inputContainerFocused,
                ]}
              >
                <Mail size={19} color={emailFocused ? '#4f46e5' : '#94a3b8'} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="আপনার ইমেইল নাম লিখুন"
                  placeholderTextColor="#a1a1aa"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>পাসওয়ার্ড</Text>
              <View
                style={[
                  styles.inputContainer,
                  passwordFocused && styles.inputContainerFocused,
                ]}
              >
                <Lock size={19} color={passwordFocused ? '#4f46e5' : '#94a3b8'} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor="#a1a1aa"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={19} color="#64748b" />
                  ) : (
                    <Eye size={19} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
              style={{ marginTop: 8 }}
            >
              <LinearGradient
                colors={['#4f46e5', '#3730a3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtn}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.loginBtnText}>লগইন করুন</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footerText}>
            Invexa © {new Date().getFullYear()} • Secure Cloud Platform
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Shop Selection Modal */}
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
    backgroundColor: '#f1f5f9',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 36,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadgeContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 14,
    padding: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.8,
  },
  taglineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
  },
  taglineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338ca',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
  },
  cardHeaderRow: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardSubTitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 14,
    marginBottom: 18,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    height: 52,
    paddingHorizontal: 14,
  },
  inputContainerFocused: {
    borderColor: '#4f46e5',
    backgroundColor: '#ffffff',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 8,
  },
  loginBtn: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 28,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
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
    fontWeight: '800',
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
    fontWeight: '500',
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shopNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  shopAddressText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
});
