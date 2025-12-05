import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Image, RefreshControl } from 'react-native';
import { Card, Text, IconButton, ActivityIndicator, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '@env';

function SavedScreen() {
  const navigation = useNavigation();
  const { token } = useSelector((state) => state.auth);
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSavedItems();
  }, []);

  const fetchSavedItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedItems(response.data || []);
    } catch (error) {
      console.error('Error fetching saved items:', error);
      setSavedItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSavedItems();
  };

  const removeFavorite = async (artId) => {
    try {
      await axios.delete(`${API_URL}/favorites/${artId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedItems(savedItems.filter(item => item.id !== artId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const renderSavedItem = ({ item }) => (
    <Card 
      style={styles.artCard}
      onPress={() => navigation.navigate('ArtDetail', { artId: item.id })}
    >
      <View style={styles.cardHeader}>
        <IconButton
          icon="heart"
          iconColor="#d32f2f"
          size={24}
          onPress={() => removeFavorite(item.id)}
          style={styles.favoriteButton}
        />
      </View>
      <Card.Cover 
        source={{ uri: item.image_url || 'https://via.placeholder.com/300' }} 
        style={styles.artImage}
      />
      <Card.Content style={styles.artContent}>
        <Text variant="titleMedium" numberOfLines={1}>{item.title}</Text>
        <Text variant="bodySmall" style={styles.artistName}>{item.artist_name}</Text>
        <Text variant="titleSmall" style={styles.price}>${item.price}</Text>
      </Card.Content>
    </Card>
  );

  if (loading && savedItems.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (savedItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="headlineSmall" style={styles.emptyText}>No saved items</Text>
        <Text variant="bodyMedium" style={styles.emptySubtext}>
          Browse art pieces and tap the heart icon to save your favorites
        </Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('Home')}
          style={styles.browseButton}
        >
          Browse Art
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={savedItems}
        renderItem={renderSavedItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginBottom: 10,
  },
  emptySubtext: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  browseButton: {
    paddingHorizontal: 30,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  artCard: {
    width: '48%',
    marginVertical: 8,
    position: 'relative',
  },
  cardHeader: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
  favoriteButton: {
    margin: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  artImage: {
    height: 150,
  },
  artContent: {
    paddingTop: 10,
  },
  artistName: {
    color: '#666',
    marginTop: 4,
  },
  price: {
    color: '#1976d2',
    fontWeight: 'bold',
    marginTop: 4,
  },
});

export default SavedScreen;
