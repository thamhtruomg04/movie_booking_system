import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, Dimensions, 
  SafeAreaView, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart } from "react-native-chart-kit";
import { API_URL } from '@/constants/Config';

const screenWidth = Dimensions.get("window").width;

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [resStats, resUsers, resResources, resBookings, resCoupons] = await Promise.all([
        axios.get(`${API_URL}/admin/stats/`, { headers }),
        axios.get(`${API_URL}/admin/users/`, { headers }),
        axios.get(`${API_URL}/admin/resources/`, { headers }),
        axios.get(`${API_URL}/admin/bookings/`, { headers }),
        axios.get(`${API_URL}/admin/coupons/`, { headers })
      ]);

      setData({
        stats: resStats.data,
        users: resUsers.data,
        movies: resResources.data.movies,
        rooms: resResources.data.rooms,
        bookings: resBookings.data,
        coupons: resCoupons.data
      });
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải dữ liệu quản trị.");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#e50914" /></View>
    );
  }

  // Xử lý dữ liệu biểu đồ
  const chartData = {
    labels: data.bookings.slice(0, 3).map((b: any) => b.movie.substring(0, 5) + ".."),
    datasets: [{ data: data.bookings.slice(0, 3).map((b: any) => Number(b.total_price) / 1000) }]
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QUẢN TRỊ HỆ THỐNG</Text>
        <TouchableOpacity onPress={fetchAdminData}>
          <Ionicons name="refresh" size={24} color="#00ff00" />
        </TouchableOpacity>
      </View>

      {/* Tabs Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['stats', 'users', 'movies', 'bookings', 'coupons'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabButton, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {/* TAB THỐNG KÊ */}
        {activeTab === 'stats' && (
          <View>
            <View style={styles.statGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>DOANH THU</Text>
                <Text style={styles.statValue}>{data.bookings.reduce((sum: number, b: any) => sum + Number(b.total_price), 0).toLocaleString()}đ</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>VÉ ĐÃ BÁN</Text>
                <Text style={styles.statValue}>{data.bookings.length}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>TĂNG TRƯỞNG (k VNĐ)</Text>
            <BarChart
              data={chartData}
              width={screenWidth - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={chartConfig}
              verticalLabelRotation={0}
              style={styles.chart}
            />
          </View>
        )}

        {/* TAB NGƯỜI DÙNG / VÉ (Giao diện Card thay vì Table) */}
        {activeTab === 'users' && (
          <View>
            <TextInput 
              style={styles.searchInput} 
              placeholder="Tìm người dùng..." 
              placeholderTextColor="#888"
              onChangeText={setSearch}
            />
            {data.users.filter((u:any) => u.username.includes(search)).map((user: any) => (
              <View key={user.id} style={styles.dataCard}>
                <View>
                  <Text style={styles.cardTitle}>{user.username} {user.is_staff ? '⭐' : ''}</Text>
                  <Text style={styles.cardSub}>Số dư: {Number(user.balance).toLocaleString()}đ</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: user.is_staff ? '#e50914' : '#333' }]}>
                  <Text style={styles.badgeText}>{user.is_staff ? 'ADMIN' : 'USER'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* CÁC TAB KHÁC TƯƠNG TỰ... */}
      </ScrollView>
    </SafeAreaView>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#1a1a1a",
  backgroundGradientTo: "#1a1a1a",
  color: (opacity = 1) => `rgba(229, 9, 20, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  barPercentage: 0.6,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerTitle: { color: '#e50914', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  
  // Tabs
  tabContainer: { borderBottomWidth: 1, borderBottomColor: '#222', marginBottom: 10 },
  tabButton: { paddingHorizontal: 20, paddingVertical: 12, marginRight: 5 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#e50914' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 13 },
  activeTabText: { color: '#fff' },

  // Stats
  content: { padding: 20 },
  statGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#1a1a1a', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  statLabel: { color: '#888', fontSize: 10, fontWeight: 'bold' },
  statValue: { color: '#00ff00', fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  chart: { marginVertical: 8, borderRadius: 16 },

  // Data Cards
  searchInput: { backgroundColor: '#1a1a1a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 15 },
  dataCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#1a1a1a', 
    padding: 15, 
    borderRadius: 8, 
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e50914'
  },
  cardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cardSub: { color: '#888', fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});