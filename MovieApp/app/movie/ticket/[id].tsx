import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  ActivityIndicator, ScrollView, Alert, Image 
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';

export default function TicketDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchTicketDetail();
  }, [id]);

  const fetchTicketDetail = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Sử dụng đúng endpoint như bản web: booking-detail/${id}/
      const response = await axios.get(`${API_URL}/booking-detail/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTicket(response.data);
    } catch (error: any) {
      console.error("Lỗi tải chi tiết vé:", error);
      Alert.alert("Thông báo", "Không thể tải thông tin vé.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#e50914" size="large" /></View>;
  if (!ticket) return <View style={styles.centered}><Text style={{color: 'white'}}>Không tìm thấy vé</Text></View>;

  // Xử lý tách chuỗi showtime_display giống hệt bản Web
  // Giả sử format: "22:00 2026-01-31"
  const timePart = ticket.showtime_display?.split(' ')[0] || '--:--';
  const datePart = ticket.showtime_display?.split(' ')[1] || '----/--/--';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Nút đóng ở góc trên (Tùy chọn) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* TẤM VÉ LAYOUT NGANG GIỐNG WEB */}
        <View style={styles.ticketCard}>
          
          {/* PHẦN TRÁI (THÔNG TIN) */}
          <View style={styles.leftSection}>
            <Text style={styles.brandName}>GEMINI CINEMA</Text>
            <Text style={styles.movieTitle} numberOfLines={2}>{ticket.movie_title}</Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <Text style={styles.label}>NGÀY</Text>
                <Text style={styles.value}>{datePart}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.label}>GIỜ</Text>
                <Text style={styles.value}>{timePart}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.label}>PHÒNG</Text>
                <Text style={styles.value}>P.01</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.label}>GHẾ</Text>
                <Text style={[styles.value, {color: '#e50914'}]}>{ticket.seat_labels}</Text>
              </View>
            </View>
          </View>

          {/* PHẦN PHẢI (QR CODE) */}
          <View style={styles.rightSection}>
            <Text style={styles.qrTitle}>QUÉT MÃ VÀO CỔNG</Text>
            
            {/* Hiển thị QR từ Base64 trả về từ Django giống Web */}
            <View style={styles.qrWrapper}>
                {ticket.qr_code ? (
                    <Image 
                        source={{ uri: `data:image/png;base64,${ticket.qr_code}` }} 
                        style={styles.qrImage}
                        resizeMode="contain"
                    />
                ) : (
                    <Ionicons name="qr-code-outline" size={80} color="#ddd" />
                )}
            </View>
            
            <Text style={styles.bookingIdText}>Mã đơn: #{ticket.id}</Text>
          </View>

          {/* HIỆU ỨNG RĂNG CƯA ĐỤC LỖ */}
          <View style={styles.holeTop} />
          <View style={styles.holeBottom} />
        </View>

        {/* CÁC NÚT ĐIỀU KHIỂN GIỐNG WEB */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.btnBack} 
            onPress={() => router.back()}
          >
            <Text style={styles.btnTextWhite}>QUAY LẠI</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnDownload}>
            <Text style={styles.btnTextBlack}>TẢI MÃ QR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnPrint}>
            <Text style={styles.btnTextBlack}>IN VÉ / PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { padding: 15, alignItems: 'flex-end' },
  scrollContent: { alignItems: 'center', paddingVertical: 20 },

  // Ticket Card Layout
  ticketCard: { 
    width: '94%', 
    height: 250, 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    overflow: 'hidden',
    position: 'relative' // Để đặt các lỗ bấm (holes)
  },
  leftSection: { 
    flex: 1.5, 
    padding: 20, 
    borderRightWidth: 1, 
    borderRightColor: '#eee', 
    borderStyle: 'dashed' 
  },
  rightSection: { 
    flex: 1, 
    backgroundColor: '#fafafa', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 10 
  },

  // Info Styles
  brandName: { color: '#e50914', fontSize: 13, letterSpacing: 2, fontWeight: 'bold' },
  movieTitle: { color: '#000', fontSize: 20, fontWeight: '900', marginVertical: 12, lineHeight: 24 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoBox: { width: '50%', marginBottom: 10 },
  label: { color: '#999', fontSize: 9, fontWeight: 'bold' },
  value: { color: '#111', fontSize: 13, fontWeight: 'bold', marginTop: 2 },

  // QR Styles
  qrTitle: { fontSize: 8, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  qrWrapper: { padding: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  qrImage: { width: 110, height: 110 },
  bookingIdText: { fontSize: 10, color: '#999', marginTop: 8 },

  // Hiệu ứng lỗ (Holes)
  holeTop: { 
    position: 'absolute', 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#000', 
    top: -12, 
    right: '38%', 
    marginLeft: -12 
  },
  holeBottom: { 
    position: 'absolute', 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#000', 
    bottom: -12, 
    right: '38%', 
    marginLeft: -12 
  },

  // Buttons Styles
  actionButtons: { flexDirection: 'row', marginTop: 30, gap: 10, paddingHorizontal: 15 },
  btnBack: { backgroundColor: '#333', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnDownload: { backgroundColor: '#00ff00', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, flex: 1.2, alignItems: 'center' },
  btnPrint: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, flex: 1.2, alignItems: 'center' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  btnTextBlack: { color: '#000', fontWeight: 'bold', fontSize: 12 }
});