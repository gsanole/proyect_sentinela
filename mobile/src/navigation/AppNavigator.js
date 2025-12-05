import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens (to be created)
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import CartScreen from '../screens/CartScreen';
import SavedScreen from '../screens/SavedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import ArtDetailScreen from '../screens/ArtDetailScreen';
import ArtistProfileScreen from '../screens/ArtistProfileScreen';

// Artist Screens
import ArtistDashboardScreen from '../screens/ArtistDashboardScreen';
import ArtistProfileManagementScreen from '../screens/ArtistProfileManagementScreen';
import MyArtPiecesScreen from '../screens/MyArtPiecesScreen';
import AddEditArtPieceScreen from '../screens/AddEditArtPieceScreen';
import ArtistEarningsScreen from '../screens/ArtistEarningsScreen';
import ArtistApplicationScreen from '../screens/ArtistApplicationScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Cart') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Saved') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VerifyEmail"
          component={VerifyEmailScreen}
          options={{ 
            title: 'Verify Email',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ArtDetail"
          component={ArtDetailScreen}
          options={{ title: 'Art Details' }}
        />
        <Stack.Screen
          name="ArtistProfile"
          component={ArtistProfileScreen}
          options={{ title: 'Artist' }}
        />
        {/* Artist Portal Screens */}
        <Stack.Screen
          name="ArtistDashboard"
          component={ArtistDashboardScreen}
          options={{ title: 'Artist Dashboard' }}
        />
        <Stack.Screen
          name="ArtistProfileManagement"
          component={ArtistProfileManagementScreen}
          options={{ title: 'Edit Artist Profile' }}
        />
        <Stack.Screen
          name="MyArtPieces"
          component={MyArtPiecesScreen}
          options={{ title: 'My Art Pieces' }}
        />
        <Stack.Screen
          name="AddArtPiece"
          component={AddEditArtPieceScreen}
          options={{ title: 'Add Art Piece' }}
        />
        <Stack.Screen
          name="EditArtPiece"
          component={AddEditArtPieceScreen}
          options={{ title: 'Edit Art Piece' }}
        />
        <Stack.Screen
          name="ArtistEarnings"
          component={ArtistEarningsScreen}
          options={{ title: 'Earnings & Payouts' }}
        />
        <Stack.Screen
          name="ArtistApplication"
          component={ArtistApplicationScreen}
          options={{ title: 'Become an Artist' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
