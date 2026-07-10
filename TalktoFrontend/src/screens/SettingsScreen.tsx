import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { type AppThemeColors } from '../services/colors';

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 12 },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  profileBody: { flex: 1 },
  profileName: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  profileStatus: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  settingCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  manageCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  settingTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  settingDescription: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  logoutButton: {
    backgroundColor: '#FEE4E2',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: { color: colors.danger, fontWeight: '800', fontSize: 15 },
});

export const SettingsScreen = ({ navigation, onLogout }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleLogout = () => {
    // handled by the parent screen when used from HomeScreen
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile')}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>TU</Text>
        </View>
        <View style={styles.profileBody}>
          <Text style={styles.profileName}>Talkto User</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingCard} onPress={() => navigation.navigate('YourContacts')}>
        <Text style={styles.settingTitle}>Manage contacts</Text>
        <Text style={styles.settingDescription}>Review saved contacts and jump straight into a chat.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingCard} onPress={() => navigation.navigate('RingtoneSettings')}>
        <Text style={styles.settingTitle}>Ringtone settings</Text>
        <Text style={styles.settingDescription}>Pick your preferred ringtone or use a custom audio file.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingCard} onPress={() => navigation.navigate('ThemeSettings')}>
        <Text style={styles.settingTitle}>Theme settings</Text>
        <Text style={styles.settingDescription}>Switch between light, dark, or your preferred accent color.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SettingsScreen;
