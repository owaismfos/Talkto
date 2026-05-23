import { StyleSheet } from 'react-native';
import { WHATSAPP_COLORS } from '../services/colors';
import { SettingsScreen } from './HomeScreen';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHATSAPP_COLORS.surface },
  content: { padding: 20, gap: 12 },
  profileCard: {
    backgroundColor: WHATSAPP_COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: WHATSAPP_COLORS.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  profileBody: { flex: 1 },
  profileName: { color: WHATSAPP_COLORS.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  profileStatus: { color: WHATSAPP_COLORS.muted, fontSize: 13, lineHeight: 18 },
  settingCard: {
    backgroundColor: WHATSAPP_COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    padding: 16,
  },
  manageCard: {
    backgroundColor: '#ECFDF3',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1FADF',
    padding: 16,
  },
  settingTitle: { color: WHATSAPP_COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  settingDescription: { color: WHATSAPP_COLORS.muted, fontSize: 13, lineHeight: 18 },
  logoutButton: {
    backgroundColor: '#FEE4E2',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: { color: WHATSAPP_COLORS.danger, fontWeight: '800', fontSize: 15 },
});

export default SettingsScreen;
