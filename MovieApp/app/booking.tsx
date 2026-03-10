import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, SafeAreaView, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage'; // SỬA TẠI ĐÂY: Thêm import

interface SeatData {
  id: number;
  label: string;
  is_booked: boolean;
}

export default function BookingScreen() {
  const router = useRouter();
  const { title, showtimeId } = useLocalSearchParams<{ title: string, showtimeId: string }>();
  
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  
  const TICKET_PRICE = 75000;

  const fetchSeats = useCallback(async () => {
    if (!showtimeId) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/seats/${showtimeId}/`);
      setSeats(response.data);
    } catch (error: any) {
      console.error("Lỗi lấy sơ đồ ghế:", error.response?.data || error.message);
      Alert.alert("Lỗi", "Không thể tải sơ đồ ghế.");
    } finally {
      setLoading(false);
    }
  }, [showtimeId]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  const toggleSeat = (id: number, isBooked: boolean) => {
    if (isBooked) return;
    setSelectedSeats(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // HÀM XỬ LÝ ĐẶT VÉ ĐÃ SỬA
  const handleBooking = async () => {
    const totalAmount = selectedSeats.length * TICKET_PRICE;
    
    Alert.alert(
      "Xác nhận thanh toán", 
      `Bạn chọn ${selectedSeats.length} ghế cho phim ${title}.\nTổng tiền: ${totalAmount.toLocaleString()}đ`, 
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Đồng ý", 
          onPress: async () => {
            try {
              // 1. LẤY TOKEN TỪ STORAGE (SỬA TẠI ĐÂY)
              const token = await AsyncStorage.getItem('userToken');

              if (!token) {
                Alert.alert("Yêu cầu đăng nhập", "Vui lòng đăng nhập để thực hiện đặt vé.");
                router.push('/login'); // Chuyển hướng sang trang login nếu chưa có token
                return;
              }

              const bookingData = { 
                showtime_id: parseInt(showtimeId), 
                seat_ids: selectedSeats 
              };

              // 2. GỬI KÈM HEADER AUTHORIZATION (SỬA TẠI ĐÂY)
              const response = await axios.post(
                `${API_URL}/booking/create/`, 
                bookingData,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`, // Thêm token vào đây
                    'Content-Type': 'application/json',
                  }
                }
              );
              
              if (response.status === 201 || response.status === 200) {
                Alert.alert("Thành công", "Bạn đã đặt vé thành công!");
                router.replace('/(tabs)'); 
              }
            } catch (error: any) {
              console.error("Lỗi chi tiết từ Backend:", error.response?.data);
              
              let errorMessage = "Đặt vé thất bại.";
              
              // SỬA TẠI ĐÂY: Xử lý lỗi 401 Unauthorized
              if (error.response?.status === 401) {
                errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
                router.push('/login');
              } else if (error.response?.data) {
                errorMessage = typeof error.response.data === 'string' 
                  ? error.response.data 
                  : Object.values(error.response.data)[0] as string;
              }

              Alert.alert("Thông báo", errorMessage);
              fetchSeats(); 
            }
          } 
        }
      ]
    );
  };

  // ... (Giữ nguyên phần UI Return và Styles bên dưới của bạn)
  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#e50914" />
      <Text style={{color: 'white', marginTop: 10}}>Đang tải sơ đồ ghế...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />
      
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="white" />
      </TouchableOpacity>

      <Text style={styles.header}>{title}</Text>
      
      <View style={styles.screenContainer}>
        <View style={styles.screenLine} />
        <Text style={styles.screenText}>MÀN HÌNH</Text>
      </View>

      <FlatList
        data={seats}
        numColumns={8}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[
              styles.seat, 
              selectedSeats.includes(item.id) && styles.selectedSeat,
              item.is_booked && styles.bookedSeat
            ]} 
            onPress={() => toggleSeat(item.id, item.is_booked)}
            disabled={item.is_booked}
          >
            <Text style={[styles.seatLabel, item.is_booked && { color: '#444' }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContainer}
      />

      <View style={styles.footer}>
        <View style={styles.legend}>
          <LegendItem label="Trống" color="#262626" />
          <LegendItem label="Chọn" color="#e50914" />
          <LegendItem label="Hết" color="#111" opacity={0.5} />
        </View>

        <View style={styles.priceRow}>
          <View style={{flex: 1}}>
            <Text style={styles.footerLabel}>Ghế đã chọn</Text>
            <Text style={styles.footerText} numberOfLines={1}>
              {selectedSeats.length > 0 
                ? seats.filter(s => selectedSeats.includes(s.id)).map(s => s.label).join(', ')
                : 'Chưa chọn'}
            </Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text style={styles.footerLabel}>Tổng tiền</Text>
            <Text style={styles.totalPrice}>
              {(selectedSeats.length * TICKET_PRICE).toLocaleString()}đ
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.confirmBtn, selectedSeats.length === 0 && styles.disabledBtn]}
          disabled={selectedSeats.length === 0}
          onPress={handleBooking}
        >
          <Text style={styles.confirmText}>XÁC NHẬN ĐẶT VÉ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ... các hàm LegendItem và Styles giữ nguyên như code cũ của bạn
const LegendItem = ({ label, color, opacity = 1 }: any) => (
  <View style={styles.legendItem}>
    <View style={[styles.seatTiny, { backgroundColor: color, opacity }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  backBtn: { marginLeft: 15, marginTop: 10, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  header: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginVertical: 10, paddingHorizontal: 40 },
  screenContainer: { alignItems: 'center', marginVertical: 30 },
  screenLine: { width: '80%', height: 4, backgroundColor: '#e50914', borderRadius: 2, shadowColor: '#e50914', shadowRadius: 10, elevation: 10 },
  screenText: { color: '#555', marginTop: 10, fontSize: 10, letterSpacing: 3 },
  listContainer: { alignSelf: 'center', paddingBottom: 20 },
  seat: { width: 38, height: 38, backgroundColor: '#262626', margin: 4, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  selectedSeat: { backgroundColor: '#e50914', borderColor: '#ff4d4d' },
  bookedSeat: { backgroundColor: '#111', borderColor: '#222', opacity: 0.3 }, 
  seatLabel: { color: '#fff', fontSize: 11, fontWeight: '500' },
  footer: { padding: 25, backgroundColor: '#111', borderTopLeftRadius: 35, borderTopRightRadius: 35 },
  legend: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 25 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendText: { color: '#888', fontSize: 12, marginLeft: 8 },
  seatTiny: { width: 14, height: 14, borderRadius: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  footerLabel: { color: '#555', fontSize: 12, marginBottom: 4 },
  footerText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  totalPrice: { color: '#e50914', fontSize: 22, fontWeight: 'bold' },
  confirmBtn: { backgroundColor: '#e50914', padding: 18, borderRadius: 16, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#333', opacity: 0.5 },
  confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }
});