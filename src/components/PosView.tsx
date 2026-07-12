import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import api from '../api/client';
import storage from '../api/storage';
import { PosSkeleton } from './LoadingSkeleton';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  ShoppingCart,
  User,
  Plus,
  Minus,
  Trash2,
  X,
  Check,
  ChevronDown,
  Layers,
  QrCode,
  Camera,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

interface FlyingItemProps {
  startX: number;
  startY: number;
  onComplete: () => void;
}

const FlyingItem = ({ startX, startY, onComplete }: FlyingItemProps) => {
  const startXAdjusted = startX - 12;
  const startYAdjusted = startY - 94 - 12; // Adjust for header + status bar offset

  const animX = React.useRef(new Animated.Value(startXAdjusted)).current;
  const animY = React.useRef(new Animated.Value(startYAdjusted)).current;
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const screenWidth = Dimensions.get('window').width;

    const destX = (screenWidth / 2) - 12;
    const destY = 30; // Center of topCartContainer (margin 16 + height 26 = 42) adjusted for half dot height (12)

    Animated.parallel([
      Animated.timing(animX, {
        toValue: destX,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(animY, {
        toValue: destY,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.6,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.6,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 0.4,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  }, [animX, animY, scale, opacity, onComplete]);

  return (
    <Animated.View
      style={[
        styles.flyingDot,
        {
          transform: [
            { translateX: animX },
            { translateY: animY },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      <ShoppingCart size={12} color="#ffffff" />
    </Animated.View>
  );
};

export default function PosView() {
  const [products, setProducts] = useState<any[]>([]);
  const [flyingItems, setFlyingItems] = useState<{ id: string; startX: number; startY: number }[]>([]);
  const [categories, setCategories] = useState<string[]>(['ALL']);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Dynamic Category Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: products.length };
    products.forEach((p) => {
      const catName = p.category?.name;
      if (catName) {
        counts[catName] = (counts[catName] || 0) + 1;
      }
    });
    return counts;
  }, [products]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Checkout and Customer States
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(false);
  
  // New Customer Modal
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
  
  // Billing States
  const [discount, setDiscount] = useState('0'); // Can be flat or percentage
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'DUE'>('CASH');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [loyaltyPointsRedeemed, setLoyaltyPointsRedeemed] = useState('0');

  // Transactional SMS Configuration
  const [sendSMS, setSendSMS] = useState(true);
  const [smsTemplates, setSmsTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Barcode scan simulation
  const handleBarcodeScanSimulate = () => {
    if (products.length === 0) return;
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    addToCart(randomProduct);
    Alert.alert(
      'বারকোড স্ক্যানার (সিমুলেশন)',
      `প্রোডাক্ট: "${randomProduct.name}"\nমূল্য: ৳${randomProduct.sellingPrice}\n\nসফলভাবে কার্ট-এ যুক্ত হয়েছে!`
    );
  };

  // Load cached products & customers
  const loadCachedData = async () => {
    try {
      const cachedProds = await storage.get<any[]>('cached_products');
      const cachedCusts = await storage.get<any[]>('cached_customers');
      const cachedAccs = await storage.get<any[]>('cached_accounts');
      if (cachedProds) {
        setProducts(cachedProds);
        const uniqueCats = ['ALL', ...new Set(cachedProds.map((p: any) => p.category?.name).filter(Boolean)) as any];
        setCategories(uniqueCats);
        setIsLoading(false);
      }
      if (cachedCusts) {
        setCustomers(cachedCusts);
        // Default to first customer if available
        if (cachedCusts.length > 0 && !selectedCustomer) {
          setSelectedCustomer(cachedCusts[0]);
        }
      }
      if (cachedAccs) {
        setAccounts(cachedAccs);
      }
    } catch (e) {
      console.error('Error loading cached POS data:', e);
    }
  };

  const fetchInitialData = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) {
      setIsLoading(true);
    }
    try {
      const [prodRes, custRes, smsRes, accRes] = await Promise.all([
        api.get('/products'),
        api.get('/customers'),
        api.get('/sms/templates').catch(() => ({ data: { data: [] } })),
        api.get('/accounts').catch(() => ({ data: { data: [] } })),
      ]);

      const prods = prodRes.data.data || [];
      setProducts(prods);
      await storage.set('cached_products', prods);

      const uniqueCats = ['ALL', ...new Set(prods.map((p: any) => p.category?.name).filter(Boolean)) as any];
      setCategories(uniqueCats);

      const custs = custRes.data.data || [];
      setCustomers(custs);
      await storage.set('cached_customers', custs);

      const templates = smsRes.data.data || [];
      setSmsTemplates(templates);
      if (templates.length > 0) {
        setSelectedTemplateId(templates[0]._id);
      }

      const accs = accRes.data.data || [];
      setAccounts(accs);
      await storage.set('cached_accounts', accs);

      if (custs.length > 0 && !selectedCustomer) {
        setSelectedCustomer(custs[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadCachedData();
      await fetchInitialData(products.length === 0);
    };
    initialize();
  }, []);

  const handleCreateCustomer = async () => {
    if (!newCustName || !newCustMobile || !newCustAddress) {
      Alert.alert('ভুল', 'দয়া করে নাম, মোবাইল নম্বর এবং ঠিকানা দিন');
      return;
    }
    try {
      const customerData: any = {
        name: newCustName,
        mobile: newCustMobile,
        address: newCustAddress,
      };
      if (newCustEmail.trim()) customerData.email = newCustEmail.trim();
      if (newCustNid.trim()) customerData.nid = newCustNid.trim();

      let res;
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

        res = await api.post('/customers/create-customer', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        res = await api.post('/customers/create-customer', customerData);
      }

      const created = res.data.data;
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomer(created);
      setIsNewCustModalVisible(false);
      setNewCustName('');
      setNewCustMobile('');
      setNewCustAddress('');
      setNewCustEmail('');
      setNewCustNid('');
      setNewCustPhoto(null);
      Alert.alert('সফল', 'নতুন কাস্টমার তৈরি হয়েছে');
    } catch (e: any) {
      Alert.alert('ব্যর্থ', e.response?.data?.message || 'কাস্টমার তৈরি করা যায়নি');
    }
  };

  const addToCart = useCallback((product: any) => {
    if (product.stock <= 0) {
      Alert.alert('আউট অফ স্টক', 'এই প্রোডাক্টটির পর্যাপ্ত স্টক নেই');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          Alert.alert('স্টক লিমিট', 'স্টকের চেয়ে বেশি পরিমাণ সিলেক্ট করা সম্ভব নয়');
          return prev;
        }
        return prev.map((item) =>
          item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, warrantyPeriod: product.warranty || 'No Warranty' }];
    });
  }, []);

  const toggleWarrantyPeriod = (productId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product._id === productId) {
          let nextPeriod = 'No Warranty';
          if (item.warrantyPeriod === 'No Warranty') nextPeriod = '6 Months';
          else if (item.warrantyPeriod === '6 Months') nextPeriod = '1 Year';
          return { ...item, warrantyPeriod: nextPeriod };
        }
        return item;
      })
    );
  };

  const updateQuantity = useCallback((productId: string, amount: number, maxStock: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === productId);
      if (!existing) return prev;
      const nextQty = existing.quantity + amount;
      if (nextQty <= 0) {
        return prev.filter((item) => item.product._id !== productId);
      }
      if (nextQty > maxStock) {
        Alert.alert('স্টক লিমিট', 'স্টকের চেয়ে বেশি পরিমাণ সিলেক্ট করা সম্ভব নয়');
        return prev;
      }
      return prev.map((item) =>
        item.product._id === productId ? { ...item, quantity: nextQty } : item
      );
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  }, []);

  const triggerFlyingAnim = useCallback((event: any) => {
    if (event && event.nativeEvent) {
      const { pageX, pageY } = event.nativeEvent;
      if (pageX && pageY) {
        const id = Math.random().toString(36).substring(7);
        setFlyingItems((prev) => [...prev, { id, startX: pageX, startY: pageY }]);
      }
    }
  }, []);

  const handleAddToCart = useCallback((product: any, event: any) => {
    triggerFlyingAnim(event);
    addToCart(product);
  }, [addToCart, triggerFlyingAnim]);

  const handleIncrement = useCallback((product: any, event: any) => {
    triggerFlyingAnim(event);
    updateQuantity(product._id, 1, product.stock);
  }, [updateQuantity, triggerFlyingAnim]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category?.name === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Billing Math Calculations
  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  }, [cart]);

  const vatTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const vat = item.product.vat || 0;
      const itemSub = item.product.sellingPrice * item.quantity;
      return sum + (itemSub * vat) / 100;
    }, 0);
  }, [cart]);

  const calculatedDiscount = useMemo(() => {
    const val = parseFloat(discount) || 0;
    if (discountType === 'PERCENT') {
      return (subTotal * val) / 100;
    }
    return val;
  }, [subTotal, discount, discountType]);

  const totalBillBeforeCredits = useMemo(() => {
    return subTotal + vatTotal - calculatedDiscount;
  }, [subTotal, vatTotal, calculatedDiscount]);

  // Wallet Credits check
  const customerWallet = selectedCustomer?.walletBalance || 0;
  const appliedWallet = useMemo(() => {
    if (!useWallet) return 0;
    return Math.min(customerWallet, totalBillBeforeCredits);
  }, [useWallet, customerWallet, totalBillBeforeCredits]);

  // Loyalty points discount computation
  const loyaltyPoints = selectedCustomer?.loyaltyPoints || 0;
  const loyaltyDiscount = useMemo(() => {
    const ptsToRedeem = parseInt(loyaltyPointsRedeemed) || 0;
    if (ptsToRedeem <= 0) return 0;
    // Assuming 1 point = ৳1 discount, cap it to available points and bill
    const maxRedeem = Math.min(loyaltyPoints, ptsToRedeem);
    return Math.min(maxRedeem, totalBillBeforeCredits - appliedWallet);
  }, [loyaltyPoints, loyaltyPointsRedeemed, totalBillBeforeCredits, appliedWallet]);

  const remainingBill = useMemo(() => {
    return Math.max(0, totalBillBeforeCredits - appliedWallet - loyaltyDiscount);
  }, [totalBillBeforeCredits, appliedWallet, loyaltyDiscount]);

  // Handle auto-due check
  const isDue = paymentMethod === 'DUE';
  const receivedVal = parseFloat(receivedAmount) || 0;
  const changeAmt = useMemo(() => {
    if (isDue) return 0;
    return Math.max(0, receivedVal - remainingBill);
  }, [receivedVal, remainingBill, isDue]);

  const dueAmt = useMemo(() => {
    if (isDue) return remainingBill;
    return Math.max(0, remainingBill - receivedVal);
  }, [remainingBill, receivedVal, isDue]);

  const actualPaid = useMemo(() => {
    if (isDue) return 0;
    return Math.min(receivedVal, remainingBill);
  }, [receivedVal, remainingBill, isDue]);

  const handleCheckout = async () => {
    if (!selectedCustomer) {
      Alert.alert('ভুল', 'কাস্টমার নির্বাচন করুন');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('ভুল', 'কার্ট খালি রয়েছে');
      return;
    }
    if (!isDue && !receivedAmount && remainingBill > 0) {
      Alert.alert('পেমেন্ট ভুল', 'দয়া করে কাস্টমারের থেকে গ্রহনকৃত টাকা দিন অথবা মেথড "বাকি" সিলেক্ট করুন');
      return;
    }

    try {
      setIsCheckingOut(true);
      const getWarrantyDate = (period: string) => {
        if (period === '6 Months') {
          return new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString();
        }
        if (period === '1 Year') {
          return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        }
        return null;
      };

      let resolvedAccountId: string | null = null;
      if (paymentMethod !== 'DUE' && accounts.length > 0) {
        const matchingAcc = accounts.find(
          (acc) => acc.accountType === paymentMethod && acc.status === 'ACTIVE'
        );
        if (matchingAcc) {
          resolvedAccountId = matchingAcc._id;
        } else {
          // Fallback to first CASH account for CASH payment
          if (paymentMethod === 'CASH') {
            const cashAcc = accounts.find(
              (acc) => acc.accountType === 'CASH' && acc.status === 'ACTIVE'
            );
            if (cashAcc) resolvedAccountId = cashAcc._id;
          }
        }
      }

      const payload = {
        customerId: selectedCustomer._id,
        items: cart.map((i) => ({
          productId: i.product._id,
          quantity: i.quantity,
          rate: i.product.sellingPrice,
          total: i.product.sellingPrice * i.quantity,
          warrantyDate: getWarrantyDate(i.warrantyPeriod),
        })),
        discount: calculatedDiscount,
        receivedAmount: actualPaid,
        paymentMethod,
        accountId: resolvedAccountId,
        dueDate: isDue ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        walletAppliedAmount: appliedWallet,
        sendSMS,
        smsTemplateId: sendSMS && selectedTemplateId ? selectedTemplateId : null,
        loyaltyPointsRedeemed: loyaltyDiscount,
      };
      await api.post('/sales/checkout', payload);
      Alert.alert('সফল বিক্রি!', 'অর্ডারটি সফলভাবে সম্পন্ন হয়েছে।', [{
        text: 'ঠিক আছে',
        onPress: () => { setCart([]); setDiscount('0'); setLoyaltyPointsRedeemed('0'); setUseWallet(false); setReceivedAmount(''); setIsCartVisible(false); fetchInitialData(false); },
      }]);
    } catch (e: any) {
      Alert.alert('ব্যর্থ', e.response?.data?.message || 'অর্ডার প্রসেস করতে ব্যর্থ হয়েছে!');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const renderProduct = useCallback(({ item }: { item: any }) => {
    const cartItem = cart.find((i) => i.product._id === item._id);
    const qtyInCart = cartItem ? cartItem.quantity : 0;

    return (
      <View style={styles.prodCard}>
        <TouchableOpacity onPress={(e) => handleAddToCart(item, e)} activeOpacity={0.8}>
          {item.image && item.image !== 'N/A' ? (
            <Image source={{ uri: item.image }} style={styles.prodImg} />
          ) : (
            <View style={styles.prodImgPlaceholder}>
              <Text style={styles.prodInitial}>{item.name.charAt(0)}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.prodInfo}>
          <Text style={styles.prodName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.prodMeta}>
            <Text style={styles.prodPrice}>৳{item.sellingPrice}</Text>
            <View style={[styles.stockBadge, item.stock < 5 ? styles.stockLow : styles.stockNormal]}>
              <Text style={[styles.stockText, item.stock < 5 ? styles.stockLowText : styles.stockNormalText]}>
                স্টক: {item.stock}
              </Text>
            </View>
          </View>
          {item.warranty && item.warranty !== 'No Warranty' && (
            <View style={styles.gridWarrantyBadge}>
              <Text style={styles.gridWarrantyText}>🛡️ {item.warranty === '6 Months' ? '৬ মাস' : item.warranty === '1 Year' ? '১ বছর' : item.warranty}</Text>
            </View>
          )}

          {/* Interactive Cart Button / Adjuster */}
          {qtyInCart > 0 ? (
            <View style={styles.gridQtyAdjuster}>
              <TouchableOpacity style={styles.gridQtyBtn} onPress={() => updateQuantity(item._id, -1, item.stock)}>
                <Minus size={11} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.gridQtyText}>{qtyInCart} টি</Text>
              <TouchableOpacity style={styles.gridQtyBtn} onPress={(e) => handleIncrement(item, e)}>
                <Plus size={11} color="#4f46e5" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addGridBtn} onPress={(e) => handleAddToCart(item, e)} activeOpacity={0.7}>
              <Plus size={12} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.addGridBtnText}>কার্ট যোগ</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [cart, handleAddToCart, handleIncrement, updateQuantity]);

  if (isLoading && products.length === 0) {
    return <PosSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Top Cart Banner */}
      {cart.length > 0 && (
        <TouchableOpacity style={styles.topCartContainer} onPress={() => setIsCartVisible(true)} activeOpacity={0.9}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topCartGradient}
          >
            <ShoppingCart size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.fabText}>কার্ট দেখুন • {formatTk(subTotal)}</Text>
            <View style={styles.fabCountBadge}>
              <Text style={styles.fabCountText}>{cart.reduce((s, i) => s + i.quantity, 0)}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Search Header */}
      <View style={styles.searchBarWrapper}>
        <Search size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="নাম বা কোড দিয়ে খুঁজুন..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 8 }}>
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleBarcodeScanSimulate} style={styles.scanBtn} activeOpacity={0.7}>
          <QrCode size={18} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* Category Picker horizontal */}
      <View style={{ height: 38, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catTab, selectedCategory === cat && styles.catTabActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catTabText, selectedCategory === cat && styles.catTabTextActive]}>
                {cat === 'ALL' ? `সব প্রোডাক্ট (${products.length})` : `${cat} (${categoryCounts[cat] || 0})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(i) => i._id}
        numColumns={2}
        contentContainerStyle={styles.prodGrid}
        columnWrapperStyle={{ gap: 12 }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Layers size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>কোনো প্রোডাক্ট পাওয়া যায়নি</Text>
          </View>
        }
      />



      {/* Checkout Modal Sheet */}
      {isCartVisible && (
        <Modal visible={isCartVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, (isNewCustModalVisible || isCustomerModalVisible) && { maxHeight: '90%' }]}>
              <View style={styles.modalHandle} />

              {isNewCustModalVisible ? (
                <>
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
                    <TouchableOpacity style={[styles.submitBtn, { marginTop: 10, marginBottom: 20 }]} onPress={handleCreateCustomer}>
                      <Text style={styles.submitBtnText}>কাস্টমার সেভ করুন</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              ) : isCustomerModalVisible ? (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>কাস্টমার সিলেক্ট করুন</Text>
                    <TouchableOpacity onPress={() => setIsCustomerModalVisible(false)} style={styles.closeBtn}>
                      <X size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={customers}
                    keyExtractor={(i) => i._id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.customerItemRow, selectedCustomer?._id === item._id && styles.customerItemRowActive]}
                        onPress={() => { setSelectedCustomer(item); setIsCustomerModalVisible(false); }}
                      >
                        <Text style={[styles.customerItemName, selectedCustomer?._id === item._id && { color: '#4f46e5' }]}>{item.name}</Text>
                        <Text style={styles.customerItemMobile}>{item.mobile}</Text>
                        {selectedCustomer?._id === item._id && <Check size={16} color="#4f46e5" style={{ marginLeft: 'auto' }} />}
                      </TouchableOpacity>
                    )}
                  />
                </>
              ) : (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>কার্ট ও পেমেন্ট বিবরণ</Text>
                    <TouchableOpacity onPress={() => setIsCartVisible(false)} style={styles.closeBtn}>
                      <X size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

              <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
                {/* Cart Items List */}
                <Text style={styles.sectionTitle}>কার্ট আইটেমস</Text>
                <View style={styles.cartList}>
                  {cart.map((item) => (
                    <View key={item.product._id} style={styles.cartItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemName}>{item.product.name}</Text>
                        <Text style={styles.cartItemRate}>৳{item.product.sellingPrice} × {item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.cartWarrantyPill}
                          onPress={() => toggleWarrantyPeriod(item.product._id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.cartWarrantyText}>
                            🛡️ ওয়ারেন্টি: {item.warrantyPeriod === 'No Warranty' ? 'নেই (No Warranty)' : item.warrantyPeriod === '6 Months' ? '৬ মাস' : '১ বছর'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.cartQtyControls}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.product._id, -1, item.product.stock)}>
                          <Minus size={14} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.product._id, 1, item.product.stock)}>
                          <Plus size={14} color="#64748b" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: '#fef2f2' }]} onPress={() => removeFromCart(item.product._id)}>
                          <Trash2 size={13} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Customer Selection */}
                <Text style={styles.sectionTitle}>কাস্টমার নির্বাচন</Text>
                <View style={styles.customerBox}>
                  <TouchableOpacity style={styles.customerSelector} onPress={() => setIsCustomerModalVisible(true)}>
                    <User size={16} color="#64748b" style={{ marginRight: 6 }} />
                    <Text style={styles.selectorLabel}>
                      {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.mobile})` : 'কাস্টমার সিলেক্ট করুন'}
                    </Text>
                    <ChevronDown size={16} color="#64748b" style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addCustomerBtn} onPress={() => setIsNewCustModalVisible(true)}>
                    <Plus size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Loyalty & Credits View */}
                {selectedCustomer && (
                  <View style={styles.creditsSection}>
                    {/* Wallet balance option */}
                    {customerWallet > 0 && (
                      <TouchableOpacity
                        style={[styles.creditOption, useWallet && styles.creditOptionActive]}
                        onPress={() => setUseWallet(!useWallet)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.checkbox, useWallet && styles.checkboxChecked]}>
                          {useWallet && <Check size={10} color="#ffffff" />}
                        </View>
                        <Text style={styles.creditLabel}>ওয়ালেট ব্যালেন্স ব্যবহার করুন (বাকি: ৳{customerWallet})</Text>
                      </TouchableOpacity>
                    )}

                    {/* Loyalty points option */}
                    {loyaltyPoints > 0 && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={styles.pointsLabel}>লয়্যালটি পয়েন্ট রিডিম করুন (মোট পয়েন্ট: {loyaltyPoints})</Text>
                        <TextInput
                          style={styles.pointsInput}
                          keyboardType="numeric"
                          placeholder="রিডিমযোগ্য পয়েন্টের সংখ্যা লিখুন"
                          placeholderTextColor="#cbd5e1"
                          value={loyaltyPointsRedeemed}
                          onChangeText={setLoyaltyPointsRedeemed}
                        />
                      </View>
                    )}
                  </View>
                )}

                {/* Discount options */}
                <Text style={styles.sectionTitle}>ডিসকাউন্ট ও ছাড়</Text>
                <View style={styles.discountSelector}>
                  <TextInput
                    style={styles.discountInput}
                    keyboardType="numeric"
                    placeholder="ডিসকাউন্ট পরিমাণ"
                    placeholderTextColor="#cbd5e1"
                    value={discount}
                    onChangeText={setDiscount}
                  />
                  <View style={styles.toggleGroup}>
                    <TouchableOpacity style={[styles.toggleBtn, discountType === 'FLAT' && styles.toggleBtnActive]} onPress={() => setDiscountType('FLAT')}>
                      <Text style={[styles.toggleBtnText, discountType === 'FLAT' && styles.toggleBtnTextActive]}>৳ Flat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleBtn, discountType === 'PERCENT' && styles.toggleBtnActive]} onPress={() => setDiscountType('PERCENT')}>
                      <Text style={[styles.toggleBtnText, discountType === 'PERCENT' && styles.toggleBtnTextActive]}>% Percent</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Calculation breakdown */}
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>সাব-টোটাল</Text><Text style={styles.breakdownValue}>৳{subTotal}</Text></View>
                  <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>মোট ভ্যাট (VAT)</Text><Text style={styles.breakdownValue}>+ ৳{vatTotal.toFixed(1)}</Text></View>
                  {calculatedDiscount > 0 && <View style={styles.breakdownRow}><Text style={[styles.breakdownLabel, { color: '#ef4444' }]}>ডিসকাউন্ট (-)</Text><Text style={[styles.breakdownValue, { color: '#ef4444' }]}>৳{calculatedDiscount}</Text></View>}
                  {appliedWallet > 0 && <View style={styles.breakdownRow}><Text style={[styles.breakdownLabel, { color: '#3b82f6' }]}>ওয়ালেট ক্রেডিট (-)</Text><Text style={[styles.breakdownValue, { color: '#3b82f6' }]}>৳{appliedWallet}</Text></View>}
                  {loyaltyDiscount > 0 && <View style={styles.breakdownRow}><Text style={[styles.breakdownLabel, { color: '#8b5cf6' }]}>পয়েন্ট রিডিম (-)</Text><Text style={[styles.breakdownValue, { color: '#8b5cf6' }]}>৳{loyaltyDiscount}</Text></View>}
                  <View style={[styles.breakdownRow, styles.grandTotalRow]}><Text style={styles.grandTotalLabel}>সর্বমোট বিল</Text><Text style={styles.grandTotalValue}>৳{remainingBill}</Text></View>
                </View>

                {/* Transactional SMS Config */}
                <View style={styles.smsSection}>
                  <TouchableOpacity style={styles.smsCheckboxRow} onPress={() => setSendSMS(!sendSMS)} activeOpacity={0.8}>
                    <View style={[styles.checkbox, sendSMS && styles.checkboxChecked]}>
                      {sendSMS && <Check size={10} color="#ffffff" />}
                    </View>
                    <Text style={styles.smsLabel}>কাস্টমার মোবাইলে অর্ডার বিবরণী SMS পাঠান</Text>
                  </TouchableOpacity>

                  {sendSMS && smsTemplates.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                      {smsTemplates.map((t) => (
                        <TouchableOpacity
                          key={t._id}
                          style={[styles.templateChip, selectedTemplateId === t._id && styles.templateChipActive]}
                          onPress={() => setSelectedTemplateId(t._id)}
                        >
                          <Text style={[styles.templateChipText, selectedTemplateId === t._id && { color: '#ffffff' }]}>
                            {t.title || 'Template'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Payment Methods */}
                <Text style={styles.sectionTitle}>পেমেন্ট মেথড</Text>
                <View style={styles.methodsGrid}>
                  {(['CASH', 'BKASH', 'NAGAD', 'DUE'] as const).map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[styles.methodBtn, paymentMethod === method && styles.methodBtnActive]}
                      onPress={() => {
                        setPaymentMethod(method);
                        if (method === 'DUE') setReceivedAmount('0');
                      }}
                    >
                      <Text style={[styles.methodBtnText, paymentMethod === method && styles.methodBtnTextActive]}>
                        {method === 'CASH' ? 'ক্যাশ' : method === 'BKASH' ? 'বিকাশ' : method === 'NAGAD' ? 'নগদ' : 'বাকি (Due)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {paymentMethod !== 'DUE' && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.sectionTitle}>গ্রহনকৃত টাকা</Text>
                    <TextInput
                      style={styles.receivedInput}
                      keyboardType="numeric"
                      placeholder={`৳${remainingBill}`}
                      placeholderTextColor="#cbd5e1"
                      value={receivedAmount}
                      onChangeText={setReceivedAmount}
                    />
                  </View>
                )}

                {paymentMethod !== 'DUE' && receivedVal > remainingBill && (
                  <View style={[styles.resultBanner, { borderColor: '#10b981', backgroundColor: '#ecfdf5' }]}>
                    <Text style={{ color: '#10b981', fontWeight: '700' }}>ফেরত:</Text>
                    <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 16 }}>৳{changeAmt}</Text>
                  </View>
                )}
                {dueAmt > 0 && (
                  <View style={[styles.resultBanner, { borderColor: '#ef4444', backgroundColor: '#fef2f2' }]}>
                    <Text style={{ color: '#ef4444', fontWeight: '700' }}>বকেয়া থাকবে:</Text>
                    <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 16 }}>৳{dueAmt}</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={handleCheckout} disabled={isCheckingOut} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.checkoutBtn}
                  >
                    {isCheckingOut ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Check size={18} color="#ffffff" />
                        <Text style={styles.checkoutBtnText}>বিক্রি সম্পন্ন করুন (৳{remainingBill})</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}


      {flyingItems.map((item) => (
        <FlyingItem
          key={item.id}
          startX={item.startX}
          startY={item.startY}
          onComplete={() => {
            setFlyingItems((prev) => prev.filter((i) => i.id !== item.id));
          }}
        />
      ))}
    </View>
  );
}

const formatTk = (n: number) => `৳${n.toLocaleString('bn-BD')}`;

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
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scanBtn: {
    padding: 6,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
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
  prodGrid: {
    paddingHorizontal: 16,
    paddingBottom: 84,
  },
  prodCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
    padding: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  prodImg: {
    width: '100%',
    height: 96,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  prodImgPlaceholder: {
    width: '100%',
    height: 96,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prodInitial: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '800',
  },
  prodInfo: {
    marginTop: 8,
  },
  prodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  prodMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  prodPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4f46e5',
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockNormal: {
    backgroundColor: '#f1f5f9',
  },
  stockLow: {
    backgroundColor: '#fffbeb',
  },
  stockText: {
    fontSize: 9,
    fontWeight: '700',
  },
  stockNormalText: {
    color: '#64748b',
  },
  stockLowText: {
    color: '#d97706',
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
  gridQtyAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f3ff',
    borderRadius: 10,
    height: 32,
    marginTop: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  gridQtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gridQtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4f46e5',
  },
  addGridBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    height: 32,
    marginTop: 8,
  },
  addGridBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  // Top Cart Banner
  topCartContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: -4, // Pull search bar closer
    height: 52,
    borderRadius: 14,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  topCartGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  fabCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  fabCountText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },
  // Checkout Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
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
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 20,
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  cartList: {
    gap: 8,
    marginBottom: 20,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  cartItemRate: {
    fontSize: 11,
    color: '#4f46e5',
    fontWeight: '700',
    marginTop: 2,
  },
  cartQtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '700',
    width: 22,
    textAlign: 'center',
    color: '#0f172a',
  },
  customerBox: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  customerSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  addCustomerBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsSection: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 20,
  },
  creditOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditOptionActive: {},
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  creditLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  pointsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  pointsInput: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    height: 38,
    fontSize: 13,
    paddingHorizontal: 10,
    fontWeight: '600',
  },
  discountSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  discountInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    height: 46,
    fontSize: 14,
    paddingHorizontal: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  toggleBtnTextActive: {
    color: '#0f172a',
  },
  breakdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 20,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '700',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4f46e5',
  },
  smsSection: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 20,
  },
  smsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  templateChip: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  templateChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  templateChipText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  methodBtn: {
    flex: 1,
    minWidth: '45%',
    height: 40,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodBtnActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  methodBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  methodBtnTextActive: {
    color: '#4f46e5',
  },
  receivedInput: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    height: 46,
    fontSize: 15,
    paddingHorizontal: 12,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 16,
  },
  resultBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  checkoutBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  customerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  customerItemRowActive: {
    backgroundColor: '#f8fafc',
  },
  customerItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  customerItemMobile: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 8,
    fontWeight: '500',
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
  submitBtn: {
    backgroundColor: '#4f46e5',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  gridWarrantyBadge: {
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  gridWarrantyText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3b82f6',
  },
  cartWarrantyPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  cartWarrantyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
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
  flyingDot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 9999,
  },
});
