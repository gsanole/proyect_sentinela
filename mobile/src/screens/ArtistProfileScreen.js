import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function ArtistProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Artist Profile Screen to be implemented</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
  },
});

export default ArtistProfileScreen;
