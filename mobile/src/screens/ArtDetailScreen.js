import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function ArtDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Art Detail Screen to be implemented</Text>
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

export default ArtDetailScreen;
