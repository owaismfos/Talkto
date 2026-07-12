import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { type AppThemeColors } from '../theme/colors';
import { getInitials } from '../services/helper'
import { fontSize, fontWeight, radius, spacing } from '../theme/tokens';

const profileFacts = [
  { label: 'Display name', value: 'Talkto User' },
  { label: 'About', value: 'Available for chats, calls, and product feedback.' },
  { label: 'Phone', value: '+91 90000 00000' },
  { label: 'Username', value: '@talkto.user' },
];

const ProfileScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, gap: spacing.md },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: radius.xl,
    padding: spacing.xxl,
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
  avatarText: { color: '#FFFFFF', fontSize: fontSize.heading2, fontWeight: fontWeight.extraBold },
  name: { color: '#FFFFFF', fontSize: fontSize.heading2, fontWeight: fontWeight.extraBold, marginTop: spacing.md },
  about: { color: 'rgba(255,255,255,0.82)', fontSize: fontSize.body, marginTop: spacing.sm, textAlign: 'center' },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  label: {
    color: colors.brand,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.extraBold,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  value: { color: colors.text, fontSize: fontSize.bodyLarge, lineHeight: 22, fontWeight: fontWeight.semibold },
});

export default ProfileScreen;
