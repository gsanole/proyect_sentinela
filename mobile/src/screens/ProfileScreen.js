import React from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { List, Avatar, Divider, Switch, Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { logout } from '../redux/slices/authSlice';

function ProfileScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector((state) => state.auth);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const handleBecomeArtist = () => {
    Alert.alert(
      'Become an Artist',
      'Would you like to apply to become an artist on ArtHub? You\'ll be able to upload and sell your artwork.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => navigation.navigate('ArtistApplication'),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Avatar.Text 
          size={80} 
          label={`${user?.first_name?.[0] || 'U'}${user?.last_name?.[0] || ''}`}
          style={styles.avatar}
        />
        <Text variant="headlineSmall" style={styles.name}>
          {user?.first_name} {user?.last_name}
        </Text>
        <Text variant="bodyMedium" style={styles.email}>{user?.email}</Text>
        <Text variant="bodySmall" style={styles.role}>
          {user?.role === 'buyer' ? 'Customer' : 'Artist'}
        </Text>
      </View>

      <Divider style={styles.divider} />

      {/* Account Section */}
      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Edit Profile"
          description="Update your personal information"
          left={props => <List.Icon {...props} icon="account-edit" />}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <List.Item
          title="Order History"
          description="View your past orders"
          left={props => <List.Icon {...props} icon="history" />}
          onPress={() => navigation.navigate('OrderHistory')}
        />
        <List.Item
          title="Addresses"
          description="Manage shipping addresses"
          left={props => <List.Icon {...props} icon="map-marker" />}
          onPress={() => navigation.navigate('Addresses')}
        />
        <List.Item
          title="Payment Methods"
          description="Manage payment options"
          left={props => <List.Icon {...props} icon="credit-card" />}
          onPress={() => navigation.navigate('PaymentMethods')}
        />
      </List.Section>

      <Divider />

      {/* Preferences Section */}
      <List.Section>
        <List.Subheader>Preferences</List.Subheader>
        <List.Item
          title="Notifications"
          description="Email and push notifications"
          left={props => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />
          )}
        />
        <List.Item
          title="Language"
          description="English"
          left={props => <List.Icon {...props} icon="translate" />}
          onPress={() => Alert.alert('Language', 'Language settings coming soon')}
        />
        <List.Item
          title="Currency"
          description="USD ($)"
          left={props => <List.Icon {...props} icon="currency-usd" />}
          onPress={() => Alert.alert('Currency', 'Currency settings coming soon')}
        />
      </List.Section>

      <Divider />

      {/* Artist Section (only for buyers) */}
      {user?.role === 'buyer' && (
        <>
          <List.Section>
            <List.Subheader>Artist</List.Subheader>
            <List.Item
              title="Become an Artist"
              description="Start selling your artwork"
              left={props => <List.Icon {...props} icon="palette" />}
              onPress={handleBecomeArtist}
            />
          </List.Section>
          <Divider />
        </>
      )}

      {/* Support Section */}
      <List.Section>
        <List.Subheader>Support</List.Subheader>
        <List.Item
          title="Help & FAQ"
          description="Get answers to common questions"
          left={props => <List.Icon {...props} icon="help-circle" />}
          onPress={() => navigation.navigate('Help')}
        />
        <List.Item
          title="Contact Support"
          description="Get in touch with our team"
          left={props => <List.Icon {...props} icon="email" />}
          onPress={() => navigation.navigate('ContactSupport')}
        />
        <List.Item
          title="Privacy Policy"
          left={props => <List.Icon {...props} icon="shield-account" />}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
        <List.Item
          title="Terms of Service"
          left={props => <List.Icon {...props} icon="file-document" />}
          onPress={() => navigation.navigate('TermsOfService')}
        />
      </List.Section>

      <Divider />

      {/* Account Actions */}
      <List.Section>
        <List.Item
          title="Logout"
          titleStyle={styles.logoutText}
          left={props => <List.Icon {...props} icon="logout" color="#d32f2f" />}
          onPress={handleLogout}
        />
      </List.Section>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.version}>ArtHub v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
  avatar: {
    marginBottom: 15,
  },
  name: {
    marginBottom: 5,
  },
  email: {
    color: '#666',
    marginBottom: 5,
  },
  role: {
    color: '#1976d2',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  divider: {
    marginVertical: 8,
  },
  logoutText: {
    color: '#d32f2f',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  version: {
    color: '#999',
  },
});

export default ProfileScreen;
