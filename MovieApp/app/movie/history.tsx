import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Alert, SafeAreaView, RefreshControl, ScrollView, Modal, TextInput 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function BookingHistory() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [depositHistory, setDepositHistory] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // States cho Modal nạp tiền
  const [isModalVisible, setModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100000');

  const fetchAllData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resHistory, resProfile, resDeposits] = await Promise.all([
        axios.get(`${API_URL}/bookings/my-history/`, { headers }),
        axios.get(`${API_URL}/profile/`, { headers }),
        axios.get(`${API_URL}/deposit-history/`, { headers })
      ]);

      setBookings(resHistory.data);
      setBalance(resProfile.data.balance || 0);
      setDepositHistory(resDeposits.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleCancel = async (bookingId: number) => {
    Alert.alert(
      "Xác nhận hủy",
      "Bạn có chắc muốn hủy vé? Tiền sẽ được hoàn lại vào ví.",
      [
        { text: "Không", style: "cancel" },
        { 
          text: "Hủy vé", 
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await axios.post(`${API_URL}/bookings/cancel/${bookingId}/`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              Alert.alert("Thành công", "Đã hoàn tiền vào ví!");
              fetchAllData();
            } catch (err: any) {
              Alert.alert("Lỗi", err.response?.data?.error || "Không thể hủy");
            }
          }
        }
      ]
    );
  };

  // Xử lý nạp tiền qua Modal
  const handleConfirmDeposit = async () => {
    const amountNum = parseInt(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Lỗi", "Số tiền không hợp lệ");
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/deposit/`, 
        { amount: amountNum },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      Alert.alert("Thành công", "Nạp tiền thành công!");
      setModalVisible(false);
      fetchAllData();
    } catch (err) {
      Alert.alert("Lỗi", "Giao dịch thất bại");
    }
  };

  const renderBookingItem = (item: any) => {
    const isExpired = new Date(item.showtime_start) < new Date();
    return (
      <View key={item.id} style={[styles.ticketCard, { borderLeftColor: isExpired ? '#444' : '#e50914' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.movieTitle} numberOfLines={1}>{item.movie_title}</Text>
          <Text style={styles.subText}>{item.showtime_display}</Text>
          <Text style={styles.seatText}>Ghế: {item.seat_labels}</Text>
        </View>

        <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text style={styles.priceText}>{Number(item.total_price).toLocaleString()}đ</Text>
          <View style={styles.actionButtons}>
            {!isExpired && (
              <TouchableOpacity style={styles.btnCancel} onPress={() => handleCancel(item.id)}>
                <Text style={styles.btnCancelText}>Hủy</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
                style={styles.btnDetail} 
                onPress={() => {
                    console.log("Chuyển tới vé ID:", item.id);
                    // Dùng pathname là đường dẫn động [id] và truyền params id riêng
                    router.push({
                    pathname: "/movie/ticket/[id]",
                    params: { id: item.id }
                    });
                }}
                >
                <Text style={styles.btnText}>Xem</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color="#e50914" /></View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" />}>
        {/* Ví Tiền */}
        <View style={styles.walletCard}>
          <View>
            <Text style={{ color: '#aaa', fontSize: 12 }}>Số dư ví</Text>
            <Text style={styles.balanceText}>{Number(balance).toLocaleString()}đ</Text>
          </View>
          <TouchableOpacity style={styles.btnDeposit} onPress={() => setModalVisible(true)}>
            <Text style={styles.btnDepositText}>+ NẠP TIỀN</Text>
          </TouchableOpacity>
        </View>

        {/* Lịch Sử Đặt Vé */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch Sử Đặt Vé</Text>
          {bookings.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có vé nào.</Text>
          ) : (
            bookings.map((item: any) => renderBookingItem(item))
          )}
        </View>

        {/* Lịch Sử Nạp */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch Sử Nạp</Text>
          <View style={styles.depositList}>
            {depositHistory.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có giao dịch.</Text>
            ) : (
              depositHistory.map((item: any) => (
                <View key={item.id} style={styles.depositItem}>
                  <Text style={styles.subText}>{item.date}</Text>
                  <Text style={styles.depositAmount}>+{Number(item.amount).toLocaleString()}đ</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* MODAL NẠP TIỀN (Sửa lỗi Android không có prompt) */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nạp tiền vào ví</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={depositAmount}
              onChangeText={setDepositAmount}
              placeholder="Nhập số tiền..."
              placeholderTextColor="#666"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancelModal} onPress={() => setModalVisible(false)}>
                <Text style={{color: '#fff'}}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirmModal} onPress={handleConfirmDeposit}>
                <Text style={{color: '#000', fontWeight: 'bold'}}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  walletCard: { backgroundColor: '#111', margin: 15, padding: 20, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  balanceText: { color: '#00ff00', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  btnDeposit: { backgroundColor: '#00ff00', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  btnDepositText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  section: { paddingHorizontal: 15, marginBottom: 20 },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', borderBottomWidth: 2, borderBottomColor: '#e50914', alignSelf: 'flex-start', marginBottom: 15, paddingBottom: 5 },
  ticketCard: { backgroundColor: '#1a1a1a', padding: 12, borderRadius: 10, flexDirection: 'row', marginBottom: 12, borderLeftWidth: 5 },
  movieTitle: { color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  subText: { color: '#888', fontSize: 11 },
  seatText: { color: '#ffcc00', fontSize: 11, marginTop: 2 },
  priceText: { color: '#00ff00', fontWeight: 'bold', fontSize: 13 },
  actionButtons: { flexDirection: 'row', marginTop: 8, gap: 8 },
  btnDetail: { backgroundColor: '#e50914', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 5 },
  btnCancel: { backgroundColor: 'transparent', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1, borderColor: '#ff4d4d' },
  btnCancelText: { color: '#ff4d4d', fontSize: 11, fontWeight: 'bold' },
  btnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  depositList: { backgroundColor: '#111', borderRadius: 10, padding: 10 },
  depositItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  depositAmount: { color: '#00ff00', fontWeight: 'bold', fontSize: 13 },
  emptyText: { color: '#555', textAlign: 'center', fontSize: 12, marginVertical: 20 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1a1a1a', width: '80%', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: '#000', color: '#00ff00', padding: 15, borderRadius: 10, fontSize: 20, textAlign: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#00ff00' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btnCancelModal: { padding: 12, width: '45%', alignItems: 'center', borderRadius: 10, backgroundColor: '#444' },
  btnConfirmModal: { padding: 12, width: '45%', alignItems: 'center', borderRadius: 10, backgroundColor: '#00ff00' },
});