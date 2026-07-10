import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { type AppThemeColors } from '../services/colors';
import { getInitials } from '../services/helper';
import api from '../services/api';

interface Contact {
  id: string;
  nickname: string;
  added_at: string;
}

const NewChatScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const getContacts = async () => {
        setIsLoading(true);
        try {
          const res = await api.get('/contacts');
          setContacts(Array.isArray(res.data.contacts) ? res.data.contacts : []);
        } catch (err) {
          console.log(err);
          Alert.alert('Contacts unavailable', 'Could not load contacts from the server.');
        } finally {
          setIsLoading(false);
        }
      };

      getContacts();
    }, []),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AddContact')}>
          <Text style={styles.actionTitle}>New contact</Text>
          <Text style={styles.actionBody}>Save a new phone number before starting the conversation.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Contacts')}>
          <Text style={styles.actionTitle}>Open contacts</Text>
          <Text style={styles.actionBody}>Choose from the contacts already synced in the app.</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Start a conversation</Text>
      {isLoading ? <ActivityIndicator color={colors.brand} /> : null}
      {contacts.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.contactCard}
          onPress={() => navigation.navigate('ChatDetail', { contactName: item.nickname, contactId: item.id })}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.nickname)}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{item.nickname}</Text>
            <Text style={styles.status}>Tap to message</Text>
          </View>
        </TouchableOpacity>
      ))}
      {!contacts.length && !isLoading ? (
        <Text style={styles.emptyText}>No contacts yet. Add a contact first.</Text>
      ) : null}
    </ScrollView>
  );
};

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 12 },
  actionRow: { gap: 12 },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  actionTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  actionBody: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: colors.brand, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', marginTop: 4 },
  contactCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '800' },
  body: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  status: { color: colors.muted, fontSize: 13 },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default NewChatScreen;
