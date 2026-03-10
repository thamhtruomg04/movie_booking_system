import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#000', borderTopWidth: 0 },
        tabBarActiveTintColor: '#e50914',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index" 
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="explore" 
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />,
        }}
      />

      {/* Đảm bảo cái "name" này phải trùng tên với file profile.tsx */}
      <Tabs.Screen
        name="profile" 
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}