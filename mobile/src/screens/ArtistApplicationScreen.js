import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme';
import api from '../services/api';

function ArtistApplicationScreen({ navigation }) {
  const [mode, setMode] = useState('choose'); // 'choose', 'code', 'apply'
  const [inviteCode, setInviteCode] = useState('');
  const [formData, setFormData] = useState({
    bio: '',
    portfolio_url: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const validateForm = () => {
    if (!formData.bio.trim()) {
      Alert.alert('Validation Error', 'Please enter your artist bio');
      return false;
    }

    if (formData.bio.trim().length < 50) {
      Alert.alert('Validation Error', 'Bio must be at least 50 characters');
      return false;
    }

    if (formData.portfolio_url && !isValidUrl(formData.portfolio_url)) {
      Alert.alert('Validation Error', 'Please enter a valid portfolio URL');
      return false;
    }

    return true;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleCodeSubmit = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Validation Error', 'Please enter your invite code');
      return;
    }

    try {
      setLoading(true);
      const response = await api.redeemInviteCode({ code: inviteCode.trim() });

      // Update user role in AsyncStorage
      await AsyncStorage.setItem('userRole', 'artist');

      Alert.alert(
        'Success!',
        'Your invite code has been activated! You are now an artist and can start uploading your artwork.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Code redemption error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error?.message || error.response?.data?.message || 'Invalid or expired invite code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await api.applyAsArtist({
        bio: formData.bio.trim(),
        portfolioUrl: formData.portfolio_url.trim(),
      });

      // Update user role in AsyncStorage
      await AsyncStorage.setItem('userRole', 'artist');

      Alert.alert(
        'Application Submitted!',
        'Your artist application has been submitted successfully. You are now an artist and can start uploading your artwork!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Application error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error?.message || error.response?.data?.message || 'Failed to submit application. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Choose mode screen
  if (mode === 'choose') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="palette" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Become an Artist</Text>
            <Text style={styles.subtitle}>
              Choose how you'd like to become an artist on our platform
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setMode('code')}
            >
              <View style={styles.optionIconContainer}>
                <Icon name="ticket" size={40} color={theme.colors.primary} />
              </View>
              <Text style={styles.optionTitle}>I Have an Invite Code</Text>
              <Text style={styles.optionDescription}>
                Enter your invite code to instantly become an artist
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setMode('apply')}
            >
              <View style={styles.optionIconContainer}>
                <Icon name="file-document-edit" size={40} color={theme.colors.primary} />
              </View>
              <Text style={styles.optionTitle}>Submit Application</Text>
              <Text style={styles.optionDescription}>
                Fill out an application to join our artist community
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Invite code screen
  if (mode === 'code') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="ticket" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Enter Invite Code</Text>
            <Text style={styles.subtitle}>
              Enter the invite code you received to become an artist instantly
            </Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Invite Code <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your invite code"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleCodeSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Activating...' : 'Activate Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setMode('choose')}
            >
              <Text style={styles.backButtonText}>Back to Options</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Application form screen
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="palette" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Artist Application</Text>
          <Text style={styles.subtitle}>
            Tell us about yourself and your artwork
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Why Join?</Text>
          <View style={styles.benefit}>
            <Icon name="check-circle" size={24} color={theme.colors.success} />
            <Text style={styles.benefitText}>Reach art collectors worldwide</Text>
          </View>
          <View style={styles.benefit}>
            <Icon name="check-circle" size={24} color={theme.colors.success} />
            <Text style={styles.benefitText}>Secure payment processing</Text>
          </View>
          <View style={styles.benefit}>
            <Icon name="check-circle" size={24} color={theme.colors.success} />
            <Text style={styles.benefitText}>Artist dashboard and analytics</Text>
          </View>
          <View style={styles.benefit}>
            <Icon name="check-circle" size={24} color={theme.colors.success} />
            <Text style={styles.benefitText}>Build your portfolio online</Text>
          </View>
        </View>

        {/* Application Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Application Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Artist Bio <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.hint}>
              Tell us about yourself, your artistic journey, and your style (min 50 characters)
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Share your story as an artist..."
              value={formData.bio}
              onChangeText={(value) => handleChange('bio', value)}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {formData.bio.length} / 50 minimum
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Portfolio URL</Text>
            <Text style={styles.hint}>
              Link to your online portfolio or website (optional)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="https://yourportfolio.com"
              value={formData.portfolio_url}
              onChangeText={(value) => handleChange('portfolio_url', value)}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Important Info */}
        <View style={styles.infoBox}>
          <Icon name="information" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Your application will be reviewed by our team. We'll notify you via email once it's
            approved, typically within 1-3 business days.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setMode('choose')}
        >
          <Text style={styles.backButtonText}>Back to Options</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray100,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsSection: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  benefitText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.md,
  },
  formSection: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  required: {
    color: theme.colors.error,
  },
  hint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
  },
  textArea: {
    minHeight: 120,
  },
  charCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'right',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.md,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadow.md,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.gray400,
  },
  submitButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.white,
  },
  backButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  optionsContainer: {
    padding: theme.spacing.lg,
  },
  optionCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadow.md,
  },
  optionIconContainer: {
    marginBottom: theme.spacing.md,
  },
  optionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ArtistApplicationScreen;
