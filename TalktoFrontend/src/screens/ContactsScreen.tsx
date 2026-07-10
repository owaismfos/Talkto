import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { getInitials, getAvatarColor } from '../services/helper'
import { useTheme } from '../contexts/ThemeContext';
import { type AppThemeColors } from '../services/colors';

interface Contact {
  id: string;
  nickname: string;
  added_at: string;
}

const ContactsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [contactList, setContactList] = useState<Contact[]>([]);

  useFocusEffect(
    useCallback(() => {
    const getContacts = async () => {
      try {
        const res = await api.get('/contacts');
        setContactList(Array.isArray(res.data.contacts) ? res.data.contacts : []);
      } catch (err) {
        console.log(err);
        setContactList([]);
        Alert.alert('Contacts unavailable', 'Could not load contacts from the server.');
      }
    };

    getContacts();
    }, []),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contactList}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={<Text style={styles.emptyText}>No contacts saved yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ChatDetail', { contactName: item.nickname, contactId: item.id })}
            style={styles.contactRow}
          >
            <View style={[
              styles.avatar,
              { backgroundColor: getAvatarColor(item.nickname) },
            ]}>
              <Text style={styles.avatarText}>{getInitials(item.nickname)}</Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.name}>{item.nickname}</Text>
              <Text style={styles.status}>Added {new Date(item.added_at).toLocaleDateString()}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.card,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    // backgroundColor: WHATSAPP_COLORS.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  status: {
    color: WHATSAPP_COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },
  emptyText: {
    color: WHATSAPP_COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default ContactsScreen;
