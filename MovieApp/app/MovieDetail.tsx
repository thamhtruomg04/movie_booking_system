import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, MEDIA_URL } from '@/constants/Config';

interface Showtime {
  id: number;
  start_time: string;
  room_name: string;
}

export default function MovieDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [movie, setMovie] = useState<any>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false); // Trạng thái ẩn hiện bảng chọn giờ

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const movieRes = await axios.get(`${API_URL}/movies/${id}/`);
      setMovie(movieRes.data);
      const showtimeRes = await axios.get(`${API_URL}/showtimes/?movie_id=${id}`);
      setShowtimes(showtimeRes.data);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = () => {
    if (!movie?.image) return 'https://via.placeholder.com/400x600?text=No+Image';
    const cleanImage = movie.image.replace('localhost', '11.11.150.8').replace('127.0.0.1', '11.11.150.8');
    if (cleanImage.startsWith('http')) return cleanImage;
    return `${MEDIA_URL}${cleanImage.startsWith('/') ? cleanImage : `/${cleanImage}`}`;
  };

  // Hàm điều hướng khi người dùng chọn một khung giờ cụ thể
  const navigateToBooking = (showtimeId: number) => {
    setShowModal(false);
    router.push({ 
      pathname: '/booking', 
      params: { title: movie.title, showtimeId: showtimeId.toString() } 
    });
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#e50914" /></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={28} color="white" />
      </TouchableOpacity>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image source={{ uri: getImageUrl() }} style={styles.banner} resizeMode="cover" />
        <View style={styles.content}>
          <Text style={styles.title}>{movie?.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.genreBadge}><Text style={styles.genreText}>{movie?.genre || 'Phim'}</Text></View>
            <Text style={styles.metaText}>{movie?.duration || '120'} phút</Text>
          </View>
          <Text style={styles.descTitle}>Nội dung</Text>
          <Text style={styles.desc}>{movie?.description || 'Nội dung đang cập nhật...'}</Text>

          <TouchableOpacity style={styles.bookBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.bookText}>ĐẶT VÉ NGAY</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL CHỌN GIỜ CHIẾU */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn suất chiếu</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.showtimeGrid}>
              {showtimes.length > 0 ? showtimes.map((item) => (
                <TouchableOpacity key={item.id} style={styles.timeSlot} onPress={() => navigateToBooking(item.id)}>
                  <Text style={styles.timeText}>{item.start_time}</Text>
                  <Text style={styles.roomText}>{item.room_name}</Text>
                </TouchableOpacity>
              )) : <Text style={{color: '#888'}}>Phim hiện chưa có suất chiếu nào.</Text>}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', top: 45, left: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25 },
  banner: { width: '100%', height: 450 },
  content: { padding: 20, marginTop: -40, backgroundColor: '#000', borderTopLeftRadius: 40, borderTopRightRadius: 40, minHeight: 400 },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  genreBadge: { backgroundColor: '#e50914', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginRight: 15 },
  genreText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  metaText: { color: '#888', fontSize: 16 },
  descTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  desc: { color: '#bbb', fontSize: 15, lineHeight: 24, marginTop: 8 },
  bookBtn: { backgroundColor: '#e50914', padding: 18, borderRadius: 15, marginTop: 40, alignItems: 'center' },
  bookText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  // Styles cho Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, minHeight: 300 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  showtimeGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  timeSlot: { backgroundColor: '#333', padding: 15, borderRadius: 12, marginRight: 10, marginBottom: 10, alignItems: 'center', width: '30%' },
  timeText: { color: '#e50914', fontSize: 16, fontWeight: 'bold' },
  roomText: { color: '#888', fontSize: 10, marginTop: 4 }
});