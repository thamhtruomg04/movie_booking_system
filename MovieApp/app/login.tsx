import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';
import { Ionicons } from '@expo/vector-icons';

// Định nghĩa kiểu dữ liệu cho Props
interface LoginProps {
  onLoginSuccess?: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ");
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login/`, { username, password });
      const { access } = response.data;

      if (access) {
        await AsyncStorage.setItem('userToken', access);
        // Nếu được gọi từ Tab Profile thì chạy hàm callback này
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      Alert.alert("Thất bại", "Tài khoản hoặc mật khẩu không đúng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="film" size={60} color="#e50914" />
      <Text style={styles.title}>Đăng Nhập</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Tên đăng nhập" 
        placeholderTextColor="#888"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Mật khẩu" 
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ĐĂNG NHẬP</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/register')}>
        <Text style={{color: '#888', marginTop: 20}}>Chưa có tài khoản? <Text style={{color: '#e50914'}}>Đăng ký</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginVertical: 20 },
  input: { width: '100%', backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15 },
  button: { width: '100%', backgroundColor: '#e50914', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});