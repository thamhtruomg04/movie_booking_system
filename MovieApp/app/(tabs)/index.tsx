import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  RefreshControl,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_URL, MEDIA_URL } from '@/constants/Config';

// Định nghĩa Interface chuẩn
interface Movie {
  id: number;
  title: string;
  image: string;
  duration: number;
}

export default function HomeScreen() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Trạng thái vuốt để load lại
  const router = useRouter();

  const fetchMovies = async () => {
    try {
      const response = await axios.get(`${API_URL}/movies/`);
      setMovies(response.data);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu phim:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  // Hàm xử lý khi người dùng vuốt màn hình xuống
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMovies();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NETFILM</Text>
      </View>

      <FlatList
        data={movies}
        numColumns={2}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" />
        }
        renderItem={({ item }: { item: Movie }) => (
          <TouchableOpacity 
            style={styles.movieCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/movie/${item.id}`)}
          >
            <Image 
              source={{ 
                uri: item.image 
                  ? (item.image.startsWith('http') ? item.image : `${MEDIA_URL}${item.image}`)
                  : 'https://via.placeholder.com/300x450?text=No+Poster' // Ảnh dự phòng
              }} 
              style={styles.poster} 
            />
            <View style={styles.textContainer}>
              <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.movieInfo}>{item.duration} phút</Text>
                <Text style={styles.hdTag}>HD</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  loadingContainer: { 
    flex: 1, 
    backgroundColor: '#000', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: {
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  headerTitle: { 
    color: '#e50914', 
    fontSize: 26, 
    fontWeight: '900', 
    textAlign: 'center',
    letterSpacing: 2
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 20
  },
  movieCard: { 
    flex: 1, 
    margin: 8, 
    backgroundColor: '#111', 
    borderRadius: 15, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222'
  },
  poster: { 
    width: '100%', 
    height: 240, 
    resizeMode: 'cover' 
  },
  textContainer: { 
    padding: 10 
  },
  movieTitle: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 15, 
    marginBottom: 6 
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  movieInfo: { 
    color: '#888', 
    fontSize: 12 
  },
  hdTag: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#333',
    paddingHorizontal: 4,
    borderRadius: 3,
    overflow: 'hidden'
  }
});