import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, SafeAreaView, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '@/constants/Config';

interface SeatData {
  id: number;
  label: string;
  is_booked: boolean;
}

export default function BookingScreen() {
  const router = useRouter();
  // Loại bỏ movieId nếu không dùng đến để hết báo lỗi đỏ
  const { title, showtimeId } = useLocalSearchParams<{ title: string, showtimeId: string }>();
  
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  
  const TICKET_PRICE = 75000;

  const fetchSeats = useCallback(async () => {
    // Nếu không có showtimeId thì không gọi API
    if (!showtimeId) {
        console.warn("Không tìm thấy showtimeId");
        setLoading(false);
        return;
    }
    try {
      // Đảm bảo API_URL/seats/${showtimeId}/ là đúng cấu trúc Django của bạn
      const response = await axios.get(`${API_URL}/seats/${showtimeId}/`);
      setSeats(response.data);
    } catch (error: any) {
      console.error("Lỗi lấy sơ đồ ghế:", error.response?.status || error.message);
      // Hiển thị thông báo cụ thể nếu là lỗi 404
      const msg = error.response?.status === 404 
        ? "Suất chiếu này chưa được tạo sơ đồ ghế." 
        : "Không thể kết nối đến máy chủ.";
      Alert.alert("Lỗi", msg);
    } finally {
      setLoading(false);
    }
  }, [showtimeId]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  const toggleSeat = (id: number, isBooked: boolean) => {
    if (isBooked) return;
    if (selectedSeats.includes(id)) {
      setSelectedSeats(selectedSeats.filter(s => s !== id));
    } else {
      setSelectedSeats([...selectedSeats, id]);
    }
  };

  const handleBooking = async () => {
    Alert.alert(
      "Xác nhận thanh toán", 
      `Bạn chọn ${selectedSeats.length} ghế cho phim ${title}. Tổng: ${(selectedSeats.length * TICKET_PRICE).toLocaleString()}đ`, 
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Đồng ý", 
          onPress: async () => {
            try {
               await axios.post(`${API_URL}/bookings/`, { 
                 showtime: showtimeId, 
                 seats: selectedSeats 
               });
               Alert.alert("Thành công", "Bạn đã đặt vé thành công!");
               router.replace('/(tabs)'); 
            } catch (error) {
               Alert.alert("Lỗi", "Đặt vé thất bại. Ghế có thể đã có người chọn.");
               fetchSeats(); // Tải lại để cập nhật trạng thái ghế mới nhất
            }
          } 
        }
      ]
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#e50914" />
      <Text style={{color: 'white', marginTop: 10}}>Đang tải sơ đồ ghế...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Nút Back đã được đẩy xuống thấp hơn bằng marginTop */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={28} color="white" />
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
        renderItem={({ item }) => {
          const isSelected = selectedSeats.includes(item.id);
          const isBooked = item.is_booked;

          return (
            <TouchableOpacity 
              style={[
                styles.seat, 
                isSelected && styles.selectedSeat,
                isBooked && styles.bookedSeat
              ]} 
              onPress={() => toggleSeat(item.id, isBooked)}
              disabled={isBooked}
            >
              <Text style={[
                styles.seatLabel, 
                isBooked && { color: '#444' }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContainer}
      />

      <View style={styles.footer}>
        <View style={styles.legend}>
            <View style={styles.legendItem}><View style={styles.seatTiny}/><Text style={styles.legendText}>Trống</Text></View>
            <View style={styles.legendItem}><View style={[styles.seatTiny, styles.selectedSeat]}/><Text style={styles.legendText}>Chọn</Text></View>
            <View style={styles.legendItem}><View style={[styles.seatTiny, styles.bookedSeat]}/><Text style={styles.legendText}>Hết</Text></View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.footerText} numberOfLines={1}>
            Ghế: {seats.filter(s => selectedSeats.includes(s.id)).map(s => s.label).join(', ')}
          </Text>
          <Text style={styles.totalPrice}>
            {(selectedSeats.length * TICKET_PRICE).toLocaleString()}đ
          </Text>
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

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000',
    // Đảm bảo nội dung không bị dính sát mép trên ở Android
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  backBtn: { 
    marginLeft: 15, 
    marginTop: 20, // Đẩy nút xuống thấp hơn để không bị tai thỏ che
    width: 45, 
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', 
    borderRadius: 22.5 
  },
  header: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginVertical: 10, paddingHorizontal: 50 },
  screenContainer: { alignItems: 'center', marginVertical: 20 },
  screenLine: { 
    width: '80%', height: 3, backgroundColor: '#e50914', borderRadius: 2,
    shadowColor: '#e50914', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 15, elevation: 15,
  },
  screenText: { color: '#555', marginTop: 8, fontSize: 10, letterSpacing: 2 },
  listContainer: { alignSelf: 'center', paddingBottom: 20 },
  seat: { width: 35, height: 35, backgroundColor: '#262626', margin: 5, borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  selectedSeat: { backgroundColor: '#e50914', borderColor: '#ff4d4d' },
  bookedSeat: { backgroundColor: '#111', borderColor: '#222', opacity: 0.3 }, 
  seatLabel: { color: '#fff', fontSize: 10 },
  footer: { padding: 20, backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  legend: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendText: { color: '#888', fontSize: 12, marginLeft: 5 },
  seatTiny: { width: 12, height: 12, backgroundColor: '#262626', borderRadius: 3 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  footerText: { color: '#888', fontSize: 13, flex: 1, marginRight: 10 },
  totalPrice: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  confirmBtn: { backgroundColor: '#e50914', padding: 18, borderRadius: 15, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#333', opacity: 0.5 },
  confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }
});