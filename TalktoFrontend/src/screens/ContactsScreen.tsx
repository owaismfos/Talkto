import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import api from '../services/api';
import { mockChats } from '../data/mockAppData';
import { getInitials, getAvatarColor } from '../services/helper'
import { WHATSAPP_COLORS } from '../services/colors';

interface Contact {
  id: string;
  nickname: string;
  added_at: string;
}

const fallbackContacts: Contact[] = mockChats.map(item => ({
  id: item.id,
  nickname: item.name,
  added_at: item.time,
}));

const ContactsScreen = ({ navigation }: any) => {
  const [contactList, setContactList] = useState<Contact[]>([]);

  useEffect(() => {
    const getContacts = async () => {
      try {
        const res = await api.get('/contacts');
        if (Array.isArray(res.data.contacts) && res.data.contacts.length > 0) {
          setContactList(res.data.contacts); //WhatsApp-style frontend
        }
      } catch (err) {
        console.log(err);
        Alert.alert('Using demo contacts', 'Could not load contacts from the server.');
      }
    };

    getContacts();
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={contactList}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
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
              <Text style={styles.status}>Added {item.added_at}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.surface,
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
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 18,
    backgroundColor: WHATSAPP_COLORS.card,
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
    color: WHATSAPP_COLORS.text,
  },
  status: {
    color: WHATSAPP_COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },
});

export default ContactsScreen;
