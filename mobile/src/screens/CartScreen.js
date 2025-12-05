import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, Alert } from 'react-native';
import { Card, Text, Button, IconButton, Divider, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '@env';

function CartScreen() {
  const navigation = useNavigation();
  const { token } = useSelector((state) => state.auth);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCartItems(response.data || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      await axios.put(
        `${API_URL}/cart/${itemId}`,
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCartItems(Array.isArray(cartItems) ? cartItems.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ) : []);
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  const removeItem = async (itemId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/cart/${itemId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setCartItems(Array.isArray(cartItems) ? cartItems.filter(item => item.id !== itemId) : []);
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ]
    );
  };

  const calculateTotal = () => {
    if (!Array.isArray(cartItems)) return '0.00';
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  };

  const handleCheckout = () => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty');
      return;
    }
    navigation.navigate('Checkout');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="headlineSmall" style={styles.emptyText}>Your cart is empty</Text>
        <Text variant="bodyMedium" style={styles.emptySubtext}>
          Browse our collection and add items to your cart
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
      <ScrollView style={styles.scrollView}>
        {Array.isArray(cartItems) && cartItems.map((item) => (
          <Card key={item.id} style={styles.cartItem}>
            <View style={styles.itemContent}>
              <Image
                source={{ uri: item.image_url || 'https://via.placeholder.com/100' }}
                style={styles.itemImage}
              />
              <View style={styles.itemDetails}>
                <Text variant="titleMedium" numberOfLines={2}>{item.title}</Text>
                <Text variant="bodySmall" style={styles.artistName}>{item.artist_name}</Text>
                <Text variant="titleSmall" style={styles.price}>${item.price}</Text>
                
                <View style={styles.quantityContainer}>
                  <IconButton
                    icon="minus"
                    size={20}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  />
                  <Text variant="bodyLarge" style={styles.quantity}>{item.quantity}</Text>
                  <IconButton
                    icon="plus"
                    size={20}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  />
                </View>
              </View>
              <IconButton
                icon="delete"
                iconColor="#d32f2f"
                onPress={() => removeItem(item.id)}
                style={styles.deleteButton}
              />
            </View>
            <Divider />
            <View style={styles.itemTotal}>
              <Text variant="bodyMedium">Subtotal:</Text>
              <Text variant="titleMedium" style={styles.itemTotalPrice}>
                ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Cart Summary */}
      <View style={styles.summaryContainer}>
        <Divider />
        <View style={styles.summaryRow}>
          <Text variant="bodyLarge">Items ({Array.isArray(cartItems) ? cartItems.length : 0}):</Text>
          <Text variant="bodyLarge">${calculateTotal()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text variant="titleLarge" style={styles.totalLabel}>Total:</Text>
          <Text variant="titleLarge" style={styles.totalAmount}>${calculateTotal()}</Text>
        </View>
        <Button 
          mode="contained" 
          onPress={handleCheckout}
          style={styles.checkoutButton}
          contentStyle={styles.checkoutButtonContent}
        >
          Proceed to Checkout
        </Button>
      </View>
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
  scrollView: {
    flex: 1,
  },
  cartItem: {
    margin: 10,
    backgroundColor: '#fff',
  },
  itemContent: {
    flexDirection: 'row',
    padding: 15,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
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
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantity: {
    marginHorizontal: 10,
    minWidth: 30,
    textAlign: 'center',
  },
  deleteButton: {
    margin: 0,
  },
  itemTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: 10,
  },
  itemTotalPrice: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  checkoutButton: {
    marginTop: 15,
  },
  checkoutButtonContent: {
    paddingVertical: 8,
  },
});

export default CartScreen;
