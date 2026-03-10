import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_URL } from '@/constants/Config';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  const handleRegister = async () => {
    try {
      await axios.post(`${API_URL}/register/`, form);
      Alert.alert("Thành công", "Bạn có thể đăng nhập ngay", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error: any) {
      Alert.alert("Lỗi", "Thông tin không hợp lệ hoặc đã tồn tại");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng Ký</Text>
      <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#888" onChangeText={t => setForm({...form, username: t})} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#888" onChangeText={t => setForm({...form, email: t})} />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#888" secureTextEntry onChangeText={t => setForm({...form, password: t})} />
      
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>TẠO TÀI KHOẢN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 20 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15 },
  button: { backgroundColor: '#e50914', padding: 18, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});