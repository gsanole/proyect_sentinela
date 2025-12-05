import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme';
import api from '../services/api';

function AddEditArtPieceScreen({ route, navigation }) {
  const { artPiece } = route.params || {};
  const isEditing = !!artPiece;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    medium: '',
    dimensions: '',
    year_created: '',
    category: '',
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing && artPiece) {
      setFormData({
        title: artPiece.title || '',
        description: artPiece.description || '',
        price: artPiece.price?.toString() || '',
        medium: artPiece.medium || '',
        dimensions: artPiece.dimensions || '',
        year_created: artPiece.year_created?.toString() || '',
        category: artPiece.category || '',
      });
      if (artPiece.image_url) {
        setSelectedImage({ uri: artPiece.image_url });
      }
    }
  }, [isEditing, artPiece]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleImagePick = async () => {
    // Note: You'll need to implement image picker using react-native-image-picker
    // or expo-image-picker depending on your setup
    Alert.alert(
      'Image Upload',
      'Image picker integration required. Please install react-native-image-picker or expo-image-picker.',
      [
        {
          text: 'From Camera',
          onPress: () => console.log('Camera selected'),
        },
        {
          text: 'From Gallery',
          onPress: () => console.log('Gallery selected'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title');
      return false;
    }

    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return false;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return false;
    }

    if (!formData.category.trim()) {
      Alert.alert('Validation Error', 'Please select a category');
      return false;
    }

    if (!isEditing && !selectedImage) {
      Alert.alert('Validation Error', 'Please select an image for your art piece');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Prepare form data for submission
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('price', parseFloat(formData.price));
      submitData.append('category', formData.category);
      
      if (formData.medium) submitData.append('medium', formData.medium);
      if (formData.dimensions) submitData.append('dimensions', formData.dimensions);
      if (formData.year_created) submitData.append('year_created', parseInt(formData.year_created));

      // Add image if new image selected
      if (selectedImage && !selectedImage.uri.startsWith('http')) {
        submitData.append('image', {
          uri: selectedImage.uri,
          type: 'image/jpeg',
          name: 'art-piece.jpg',
        });
      }

      let response;
      if (isEditing) {
        response = await api.updateArtPiece(artPiece.id, submitData);
      } else {
        response = await api.createArtPiece(submitData);
      }

      Alert.alert(
        'Success',
        isEditing
          ? 'Art piece updated successfully!'
          : 'Art piece created successfully and submitted for approval!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message ||
          `Failed to ${isEditing ? 'update' : 'create'} art piece. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Painting',
    'Sculpture',
    'Photography',
    'Digital Art',
    'Drawing',
    'Mixed Media',
    'Print',
    'Other',
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Art Piece Image</Text>
          <TouchableOpacity style={styles.imageUpload} onPress={handleImagePick}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon name="image-plus" size={48} color={theme.colors.gray400} />
                <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
              </View>
            )}
          </TouchableOpacity>
          {selectedImage && (
            <TouchableOpacity style={styles.changeImageButton} onPress={handleImagePick}>
              <Icon name="image-edit" size={20} color={theme.colors.primary} />
              <Text style={styles.changeImageText}>Change Image</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter art piece title"
              value={formData.title}
              onChangeText={(value) => handleChange('title', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your artwork..."
              value={formData.description}
              onChangeText={(value) => handleChange('description', value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Price <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={formData.price}
              onChangeText={(value) => handleChange('price', value)}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Category <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      formData.category === category && styles.categoryChipActive,
                    ]}
                    onPress={() => handleChange('category', category)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.category === category && styles.categoryChipTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Additional Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medium</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Oil on canvas, Acrylic, Bronze"
              value={formData.medium}
              onChangeText={(value) => handleChange('medium', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dimensions</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g., 24" x 36" or 61cm x 91cm'
              value={formData.dimensions}
              onChangeText={(value) => handleChange('dimensions', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Year Created</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2024"
              value={formData.year_created}
              onChangeText={(value) => handleChange('year_created', value)}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </View>

        {/* Info Box */}
        {!isEditing && (
          <View style={styles.infoBox}>
            <Icon name="information" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Your art piece will be submitted for approval. You'll be notified once it's approved
              and visible to buyers.
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Saving...' : isEditing ? 'Update Art Piece' : 'Add Art Piece'}
          </Text>
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
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  imageUpload: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
    ...theme.shadow.sm,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray100,
    borderWidth: 2,
    borderColor: theme.colors.gray300,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray400,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  changeImageText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  required: {
    color: theme.colors.error,
  },
  input: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
  },
  textArea: {
    minHeight: 100,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  categoryChipTextActive: {
    color: theme.colors.white,
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
});

export default AddEditArtPieceScreen;
