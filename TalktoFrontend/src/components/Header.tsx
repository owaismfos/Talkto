import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const Header = ({ title }: { title: string }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: '#075E54', // WhatsApp-style Green
    justifyContent: 'center',
    paddingHorizontal: 15,
    // Add a shadow that works on Android
    elevation: 5,
    // Add a shadow that works on iOS/Web
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    marginTop: Platform.OS === 'android' ? 0 : 20, // Handle status bar
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center'
  },
});

export default Header;