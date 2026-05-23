import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { WHATSAPP_COLORS} from '../services/colors';
import { getInitials } from '../services/helper'

const profileFacts = [
  { label: 'Display name', value: 'Talkto User' },
  { label: 'About', value: 'Available for chats, calls, and product feedback.' },
  { label: 'Phone', value: '+91 90000 00000' },
  { label: 'Username', value: '@talkto.user' },
];

const ProfileScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials('Talkto User')}</Text>
        </View>
        <Text style={styles.name}>Talkto User</Text>
        {/* <Text style={styles.about}>Building a clean WhatsApp-style frontend flow.</Text> */}
      </View>

      {profileFacts.map(item => (
        <View key={item.label} style={styles.infoCard}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHATSAPP_COLORS.surface },
  content: { padding: 20, gap: 12 },
  hero: {
    backgroundColor: WHATSAPP_COLORS.brand,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  name: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 14 },
  about: { color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 6, textAlign: 'center' },
  infoCard: {
    backgroundColor: WHATSAPP_COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    padding: 16,
  },
  label: {
    color: WHATSAPP_COLORS.brand,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  value: { color: WHATSAPP_COLORS.text, fontSize: 16, lineHeight: 22, fontWeight: '600' },
});

export default ProfileScreen;
