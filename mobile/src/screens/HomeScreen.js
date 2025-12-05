import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Card, Searchbar, Chip, ActivityIndicator, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '@env';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useSelector((state) => state.auth);
  const [artPieces, setArtPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'painting', label: 'Paintings' },
    { id: 'sculpture', label: 'Sculptures' },
    { id: 'photography', label: 'Photography' },
    { id: 'digital', label: 'Digital Art' },
    { id: 'mixed_media', label: 'Mixed Media' },
  ];

  useEffect(() => {
    fetchArtPieces();
  }, [selectedCategory]);

  const fetchArtPieces = async () => {
    try {
      setLoading(true);
      const params = {
        status: 'active',
        limit: 20,
      };
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      const response = await axios.get(`${API_URL}/art-pieces`, { params });
      
      if (response.data.success) {
        setArtPieces(response.data.data.artPieces || []);
      }
    } catch (error) {
      console.error('Error fetching art pieces:', error);
      setArtPieces([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchArtPieces();
  };

  const filteredArtPieces = artPieces.filter((art) =>
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.artist_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderArtCard = (artPiece) => (
    <TouchableOpacity
      key={artPiece.id}
      style={styles.cardWrapper}
      onPress={() => navigation.navigate('ArtDetail', { artPieceId: artPiece.id })}
    >
      <Card style={styles.card}>
        <Card.Cover
          source={{ uri: artPiece.image_url || 'https://via.placeholder.com/300' }}
          style={styles.cardImage}
        />
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" numberOfLines={1} style={styles.artTitle}>
            {artPiece.title}
          </Text>
          <Text variant="bodySmall" style={styles.artistName} numberOfLines={1}>
            {artPiece.artist_name || 'Unknown Artist'}
          </Text>
          <Text variant="titleSmall" style={styles.price}>
            ${parseFloat(artPiece.price).toFixed(2)}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Art Hub Milwaukee
        </Text>
        <Searchbar
          placeholder="Search art or artists..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <Chip
              key={category.id}
              selected={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={styles.categoryChip}
              textStyle={styles.chipText}
            >
              {category.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading amazing art...</Text>
        </View>
      ) : filteredArtPieces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="titleLarge" style={styles.emptyTitle}>
            No Art Found
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {searchQuery
              ? 'Try a different search term'
              : 'No art pieces available in this category'}
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.grid}>
            {filteredArtPieces.map(renderArtCard)}
          </View>
        </ScrollView>
      )}

      {user?.role === 'artist' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('AddArtPiece')}
          label="Add Art"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  searchBar: {
    marginBottom: 12,
    elevation: 0,
  },
  categoriesContainer: {
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  scrollContent: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'white',
  },
  cardImage: {
    height: CARD_WIDTH,
  },
  cardContent: {
    paddingVertical: 12,
  },
  artTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  artistName: {
    color: '#666',
    marginBottom: 8,
  },
  price: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976d2',
  },
});

export default HomeScreen;
