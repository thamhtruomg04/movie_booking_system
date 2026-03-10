import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '@/constants/Config';
import LoginScreen from '../login'; 
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      setIsLoggedIn(true);
      fetchProfile(token);
    } else {
      setIsLoggedIn(false);
      setUserData(null);
    }
  };

  const fetchProfile = async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/profile/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserData(response.data);
      
      // Lưu thông tin user để dùng ở các nơi khác nếu cần
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    } catch (e) {
      handleLogout(true);
    }
  };

  const handleLogout = async (silent = false) => {
    const logoutAction = async () => {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('user'); // Xóa luôn info user khi logout
      setIsLoggedIn(false);
      setUserData(null);
    };

    if (silent) return logoutAction();

    Alert.alert("Đăng xuất", "Bạn muốn thoát tài khoản?", [
      { text: "Hủy" },
      { text: "Đồng ý", onPress: logoutAction }
    ]);
  };

  if (isLoggedIn === null) return <View style={styles.centered}><ActivityIndicator color="#e50914" /></View>;

  if (!isLoggedIn) return <LoginScreen onLoginSuccess={checkLoginStatus} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="person-circle" size={100} color="#e50914" />
        <Text style={styles.userName}>{userData?.username || "Thành viên"}</Text>
        <Text style={styles.userEmail}>{userData?.email || "Email chưa cập nhật"}</Text>
        
        {/* Hiển thị Badge Admin nếu là Staff */}
        {userData?.is_staff && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMINISTRATOR</Text>
          </View>
        )}
      </View>

      <View style={styles.menu}>
        <MenuButton 
          icon="receipt-outline" 
          label="Lịch sử đặt vé" 
          onPress={() => router.push('/movie/history' as any)} 
        />

        {/* NÚT ADMIN: Trong file ProfileScreen.tsx */}
{userData?.is_staff && (
  <MenuButton 
    icon="shield-checkmark-outline" 
    label="Quản trị hệ thống" 
    color="#00ff00" 
    onPress={() => {
      // Đảm bảo đường dẫn này khớp chính xác với tên file admin.tsx trong app/
      router.push('/admin'); 
    }} 
  />
)}

        <MenuButton 
          icon="log-out-outline" 
          label="Đăng xuất" 
          color="#e50914" 
          onPress={() => handleLogout()} 
        />
      </View>
    </View>
  );
}

const MenuButton = ({ icon, label, color = "white", onPress }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={[styles.menuText, { color }]}>{label}</Text>
    <Ionicons name="chevron-forward" size={20} color="#444" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 30 },
  userName: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  userEmail: { color: '#888', fontSize: 14 },
  
  // Badge Admin
  adminBadge: { 
    backgroundColor: '#e50914', 
    paddingHorizontal: 10, 
    paddingVertical: 2, 
    borderRadius: 5, 
    marginTop: 8 
  },
  adminBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  menu: { backgroundColor: '#111', borderRadius: 15, paddingHorizontal: 15 },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#222' 
  },
  menuText: { flex: 1, color: 'white', marginLeft: 15, fontSize: 16 }
});