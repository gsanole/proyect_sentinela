import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Text, Title, Paragraph } from 'react-native-paper';
import axios from 'axios';
import { API_URL } from '@env';

const VerifyEmailScreen = ({ navigation, route }) => {
  const { email } = route.params || {};
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/verify-email`, {
        token: verificationCode.trim()
      });

      console.log('Verification response:', response.data);

      if (response.data.success) {
        Alert.alert(
          'Email Verified!',
          'Your email has been verified successfully. You can now sign in.',
          [{ 
            text: 'OK', 
            onPress: () => navigation.navigate('Login')
          }]
        );
      }
    } catch (error) {
      console.error('Verification error:', error);
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Verification failed. Please check your code and try again.';
      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address not found. Please sign up again.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/resend-verification`, {
        email
      });

      console.log('Resend response:', response.data);

      Alert.alert(
        'Verification Code Resent',
        'A new verification code has been sent. Please check your email and the server console.'
      );
    } catch (error) {
      console.error('Resend error:', error);
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to resend verification code.';
      Alert.alert('Resend Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Verification?',
      'You will need to verify your email before you can sign in. You can verify later using the link sent to your email.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip for Now', 
          onPress: () => navigation.navigate('Login')
        }
      ]
    );
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <Title style={styles.title}>Verify Your Email</Title>
        
        <Paragraph style={styles.description}>
          We've sent a verification code to your email{email ? ` (${email})` : ''}. 
          Please check your email and enter the code below.
        </Paragraph>

        <Paragraph style={styles.devNote}>
          📱 <Text style={styles.bold}>Development Mode:</Text> Check your backend server 
          console for the verification code.
        </Paragraph>

        <TextInput
          label="Verification Code"
          value={verificationCode}
          onChangeText={setVerificationCode}
          mode="outlined"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Enter verification code"
        />

        <Button
          mode="contained"
          onPress={handleVerify}
          loading={loading}
          disabled={loading || !verificationCode.trim()}
          style={styles.button}
        >
          Verify Email
        </Button>

        <View style={styles.actions}>
          <Button
            mode="text"
            onPress={handleResend}
            disabled={loading}
            style={styles.textButton}
          >
            Resend Code
          </Button>

          <Button
            mode="text"
            onPress={handleSkip}
            disabled={loading}
            style={styles.textButton}
          >
            Skip for Now
          </Button>
        </View>

        <Paragraph style={styles.note}>
          Don't see the code? Check your spam folder or click "Resend Code".
        </Paragraph>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    color: '#666',
  },
  devNote: {
    fontSize: 14,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    color: '#856404',
  },
  bold: {
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  button: {
    marginBottom: 12,
    paddingVertical: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  textButton: {
    flex: 1,
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default VerifyEmailScreen;
