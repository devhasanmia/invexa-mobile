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
import { PosSkeleton } from './LoadingSkeleton';
import { Search, Package, Plus, Edit2, X, Check, Camera, Layers, Tag, ShieldAlert } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ProductsView() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['ALL']);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Product Modal
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [catName, setCatName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [warranty, setWarranty] = useState('No Warranty');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Edit Stock/Price Modal
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');

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
      setPhotoUri(result.assets[0].uri);
    }
  };

  const loadCachedData = async () => {
    try {
      const cached = await storage.get<any[]>('cached_products');
      if (cached) {
        setProducts(cached);
        const uniqueCats = ['ALL', ...new Set(cached.map((p: any) => p.category?.name).filter(Boolean)) as any];
        setCategories(uniqueCats);
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Error loading cached products:', e);
    }
  };

  const fetchProducts = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setIsLoading(true);
    try {
      const res = await api.get('/products?limit=0');
      const prods = res.data.data || [];
      setProducts(prods);
      await storage.set('cached_products', prods);
      const uniqueCats = ['ALL', ...new Set(prods.map((p: any) => p.category?.name).filter(Boolean)) as any];
      setCategories(uniqueCats);
    } catch (e) {
      console.error('Failed to fetch products:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadCachedData();
      await fetchProducts(products.length === 0);
    };
    initialize();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(false);
  };

  const handleCreateProduct = async () => {
    if (!name.trim() || !sellingPrice.trim() || !stock.trim()) {
      Alert.alert('ভুল', 'দয়া করে পণ্যের নাম, বিক্রয় মূল্য এবং স্টক উল্লেখ করুন');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        name: name.trim(),
        sku: sku.trim() || `PROD-${Date.now().toString().slice(-6)}`,
        categoryName: catName.trim() || 'General',
        sellingPrice: parseFloat(sellingPrice),
        purchasePrice: parseFloat(purchasePrice) || parseFloat(sellingPrice) * 0.8,
        stock: parseInt(stock),
        unit: unit.trim(),
        warranty: warranty.trim(),
      };

      let res;
      if (photoUri) {
        const formData = new FormData();
        formData.append('data', JSON.stringify(payload));
        const uriParts = photoUri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const filename = photoUri.split('/').pop() || 'photo.jpg';
        formData.append('image', {
          uri: photoUri,
          name: filename,
          type: `image/${fileType}`,
        } as any);

        res = await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/products', payload);
      }

      Alert.alert('সফল', 'নতুন পণ্য সফলভাবে যুক্ত হয়েছে');
      setIsAddModalVisible(false);
      resetForm();
      fetchProducts(false);
    } catch (e: any) {
      Alert.alert('ব্যর্থ', e.response?.data?.message || 'পণ্য সংরক্ষণ করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSku('');
    setCatName('');
    setSellingPrice('');
    setPurchasePrice('');
    setStock('');
    setUnit('Pcs');
    setWarranty('No Warranty');
    setPhotoUri(null);
  };

  const handleQuickEdit = (prod: any) => {
    setEditingProduct(prod);
    setEditPrice(prod.sellingPrice.toString());
    setEditStock(prod.stock.toString());
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    try {
      setIsSubmitting(true);
      await api.patch(`/products/${editingProduct._id}`, {
        sellingPrice: parseFloat(editPrice),
        stock: parseInt(editStock),
      });
      Alert.alert('সফল', 'পণ্যের তথ্য আপডেট হয়েছে');
      setEditingProduct(null);
      fetchProducts(false);
    } catch (e: any) {
      Alert.alert('ব্যর্থ', e.response?.data?.message || 'আপডেট ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category?.name === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const renderProductItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.prodCard}>
      {item.image && item.image !== 'N/A' ? (
        <Image source={{ uri: item.image }} style={styles.prodImg} />
      ) : (
        <View style={styles.prodImgPlaceholder}>
          <Text style={styles.prodInitial}>{item.name.charAt(0)}</Text>
        </View>
      )}

      <View style={styles.prodDetails}>
        <View style={styles.prodHeader}>
          <Text style={styles.prodName} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity onPress={() => handleQuickEdit(item)} style={styles.editBtn}>
            <Edit2 size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        <Text style={styles.prodSku}>কোড: {item.sku || 'N/A'} • {item.category?.name || 'General'}</Text>

        <View style={styles.prodFooter}>
          <Text style={styles.prodPrice}>৳{item.sellingPrice}</Text>
          <View style={[styles.stockBadge, item.stock < 5 ? styles.stockLow : styles.stockNormal]}>
            <Text style={[styles.stockText, item.stock < 5 ? styles.stockLowText : styles.stockNormalText]}>
              স্টক: {item.stock} {item.unit || 'টি'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  ), []);

  if (isLoading && products.length === 0) {
    return <PosSkeleton />;
  }

  return (
    <View style={styles.root}>
      {/* Search Bar */}
      <View style={styles.searchBarWrapper}>
        <Search size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="পণ্য বা কোড দিয়ে খুঁজুন..."
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

      {/* Category Pills Bar */}
      <View style={{ height: 38, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catTab, selectedCategory === cat && styles.catTabActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catTabText, selectedCategory === cat && styles.catTabTextActive]}>
                {cat === 'ALL' ? `সব পণ্য (${products.length})` : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Product List */}
      <FlatList
        data={filtered}
        renderItem={renderProductItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Layers size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>কোনো পণ্য পাওয়া যায়নি</Text>
          </View>
        }
      />

      {/* Add Product FAB */}
      <TouchableOpacity style={styles.fabBtn} onPress={() => setIsAddModalVisible(true)} activeOpacity={0.85}>
        <Plus size={20} color="#ffffff" style={{ marginRight: 6 }} />
        <Text style={styles.fabText}>নতুন পণ্য</Text>
      </TouchableOpacity>

      {/* Add Product Modal */}
      {isAddModalVisible && (
        <Modal visible={isAddModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '92%' }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>নতুন পণ্য যোগ করুন</Text>
                <TouchableOpacity onPress={() => setIsAddModalVisible(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
                <TouchableOpacity onPress={pickImage} style={styles.photoUploadBtn} activeOpacity={0.8}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Camera size={26} color="#64748b" />
                      <Text style={styles.photoText}>পণ্যের ছবি তুলুন / যোগ করুন</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View>
                  <Text style={styles.inputLabel}>পণ্যের নাম *</Text>
                  <TextInput style={styles.textInput} placeholder="যেমন: স্যামসং গ্যালাক্সি ৳১৫০" placeholderTextColor="#cbd5e1" value={name} onChangeText={setName} />
                </View>

                <View style={styles.rowTwo}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>বারকোড / SKU কোড</Text>
                    <TextInput style={styles.textInput} placeholder="PROD-001" placeholderTextColor="#cbd5e1" value={sku} onChangeText={setSku} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>ক্যাটাগরি</Text>
                    <TextInput style={styles.textInput} placeholder="মোবাইল" placeholderTextColor="#cbd5e1" value={catName} onChangeText={setCatName} />
                  </View>
                </View>

                <View style={styles.rowTwo}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>বিক্রয় মূল্য (৳) *</Text>
                    <TextInput style={styles.textInput} keyboardType="numeric" placeholder="০.০০" placeholderTextColor="#cbd5e1" value={sellingPrice} onChangeText={setSellingPrice} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>ক্রয় মূল্য (৳)</Text>
                    <TextInput style={styles.textInput} keyboardType="numeric" placeholder="০.০০" placeholderTextColor="#cbd5e1" value={purchasePrice} onChangeText={setPurchasePrice} />
                  </View>
                </View>

                <View style={styles.rowTwo}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>স্টক পরিমাণ *</Text>
                    <TextInput style={styles.textInput} keyboardType="numeric" placeholder="১০" placeholderTextColor="#cbd5e1" value={stock} onChangeText={setStock} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>একক (Unit)</Text>
                    <TextInput style={styles.textInput} placeholder="Pcs / কেজি / লিটার" placeholderTextColor="#cbd5e1" value={unit} onChangeText={setUnit} />
                  </View>
                </View>

                <View>
                  <Text style={styles.inputLabel}>ওয়ারেন্টি সার্ভিস</Text>
                  <TextInput style={styles.textInput} placeholder="যেমন: 6 Months, 1 Year" placeholderTextColor="#cbd5e1" value={warranty} onChangeText={setWarranty} />
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateProduct} disabled={isSubmitting} activeOpacity={0.85}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.submitBtnText}>পণ্য সেভ করুন</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <Modal visible={!!editingProduct} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: 'auto', paddingBottom: 24 }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>পণ্য সম্পাদন (Quick Edit)</Text>
                <TouchableOpacity onPress={() => setEditingProduct(null)}><X size={20} color="#94a3b8" /></TouchableOpacity>
              </View>

              <View style={{ padding: 20, gap: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>{editingProduct.name}</Text>
                <View>
                  <Text style={styles.inputLabel}>বিক্রয় মূল্য (৳)</Text>
                  <TextInput style={styles.textInput} keyboardType="numeric" value={editPrice} onChangeText={setEditPrice} />
                </View>

                <View>
                  <Text style={styles.inputLabel}>স্টক পরিমাণ</Text>
                  <TextInput style={styles.textInput} keyboardType="numeric" value={editStock} onChangeText={setEditStock} />
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateProduct} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>আপডেট সংরক্ষণ করুন</Text>
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
  catTab: {
    paddingHorizontal: 14,
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
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 96,
  },
  prodCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  prodImg: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  prodImgPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prodInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4f46e5',
  },
  prodDetails: {
    flex: 1,
  },
  prodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  editBtn: {
    padding: 4,
  },
  prodSku: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  prodFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  prodPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10b981',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockNormal: {
    backgroundColor: '#f1f5f9',
  },
  stockLow: {
    backgroundColor: '#fee2e2',
  },
  stockText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stockNormalText: {
    color: '#475569',
  },
  stockLowText: {
    color: '#ef4444',
  },
  emptyWrap: {
    padding: 40,
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
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: {
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
  formContent: {
    padding: 20,
    gap: 14,
  },
  photoUploadBtn: {
    alignItems: 'center',
    marginBottom: 4,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  photoPlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  photoText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
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
    fontWeight: '500',
    backgroundColor: '#ffffff',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
