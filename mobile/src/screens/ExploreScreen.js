import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, FlatList, Image } from 'react-native';
import { Searchbar, Chip, Button, Card, Text, ActivityIndicator, Menu, Divider, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '@env';

function ExploreScreen() {
  const navigation = useNavigation();
  const [artPieces, setArtPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['All', 'Paintings', 'Sculptures', 'Photography', 'Digital Art', 'Mixed Media'];
  const sortOptions = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Most Popular', value: 'popular' },
  ];

  useEffect(() => {
    fetchArtPieces();
  }, [selectedCategory, sortBy]);

  const fetchArtPieces = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('q', searchQuery);
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (sortBy) params.append('sort', sortBy);
      if (priceRange.min) params.append('minPrice', priceRange.min);
      if (priceRange.max) params.append('maxPrice', priceRange.max);

      const url = `${API_URL}/art-pieces${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await axios.get(url);
      setArtPieces(response.data || []);
    } catch (error) {
      console.error('Error fetching art pieces:', error);
      setArtPieces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchArtPieces();
  };

  const applyFilters = () => {
    setShowFilters(false);
    fetchArtPieces();
  };

  const clearFilters = () => {
    setSelectedCategory('All');
    setSortBy('newest');
    setPriceRange({ min: '', max: '' });
    setSearchQuery('');
    setShowFilters(false);
  };

  const renderArtItem = ({ item }) => (
    <Card 
      style={styles.artCard}
      onPress={() => navigation.navigate('ArtDetail', { artId: item.id })}
    >
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

  if (loading && artPieces.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search art pieces..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={handleSearch}
          style={styles.searchbar}
        />
        <IconButton
          icon={showFilters ? 'filter-off' : 'filter'}
          mode="contained"
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterButton}
        />
      </View>

      {/* Filters Section */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text variant="titleSmall" style={styles.filterTitle}>Price Range</Text>
          <View style={styles.priceRangeContainer}>
            <Searchbar
              placeholder="Min"
              value={priceRange.min}
              onChangeText={(text) => setPriceRange({ ...priceRange, min: text })}
              keyboardType="numeric"
              style={styles.priceInput}
            />
            <Text style={styles.priceSeparator}>-</Text>
            <Searchbar
              placeholder="Max"
              value={priceRange.max}
              onChangeText={(text) => setPriceRange({ ...priceRange, max: text })}
              keyboardType="numeric"
              style={styles.priceInput}
            />
          </View>
          <View style={styles.filterActions}>
            <Button mode="outlined" onPress={clearFilters} style={styles.filterButton}>
              Clear
            </Button>
            <Button mode="contained" onPress={applyFilters} style={styles.filterButton}>
              Apply
            </Button>
          </View>
          <Divider style={styles.divider} />
        </View>
      )}

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <Chip
            key={category}
            selected={selectedCategory === category}
            onPress={() => setSelectedCategory(category)}
            style={styles.categoryChip}
          >
            {category}
          </Chip>
        ))}
      </ScrollView>

      {/* Sort and Results Count */}
      <View style={styles.resultsBar}>
        <Text variant="bodyMedium">{artPieces.length} results</Text>
        <Menu
          visible={showSortMenu}
          onDismiss={() => setShowSortMenu(false)}
          anchor={
            <Button 
              mode="outlined" 
              onPress={() => setShowSortMenu(true)}
              icon="sort"
              compact
            >
              {sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort'}
            </Button>
          }
        >
          {sortOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                setSortBy(option.value);
                setShowSortMenu(false);
              }}
              title={option.label}
            />
          ))}
        </Menu>
      </View>

      {/* Art Grid */}
      <FlatList
        data={artPieces}
        renderItem={renderArtItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge">No art pieces found</Text>
            <Button mode="contained" onPress={clearFilters} style={styles.emptyButton}>
              Clear Filters
            </Button>
          </View>
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
  searchContainer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  searchbar: {
    flex: 1,
    elevation: 0,
  },
  filterButton: {
    marginLeft: 8,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTitle: {
    marginBottom: 10,
    fontWeight: 'bold',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  priceInput: {
    flex: 1,
    elevation: 0,
  },
  priceSeparator: {
    marginHorizontal: 10,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    marginTop: 15,
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  categoryChip: {
    marginHorizontal: 5,
  },
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  artCard: {
    width: '48%',
    marginVertical: 8,
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
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyButton: {
    marginTop: 20,
  },
});

export default ExploreScreen;
