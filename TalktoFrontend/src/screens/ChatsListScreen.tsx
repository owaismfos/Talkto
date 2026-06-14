import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import api from '../services/api';
import { ChatPreview } from '../services/interfaces';
import { getInitials } from '../services/helper'
import { WHATSAPP_COLORS } from '../services/colors'

const ChatsListScreen = ({ navigation }: any) => {
  const [chatList, setChatList] = useState<ChatPreview[]>([]);

  useEffect(() => {
    const getChats = async () => {
      try {
        const res = await api.get('/chats/users');
        console.log(res.data)
        if (Array.isArray(res.data.users) && res.data.users.length > 0) {
          // const mappedChats = res.data.users.map((item: ChatUser) => ({
          //   id: item.id,
          //   name: item.name,
          //   status: item.status,
          //   // lastMessage: item.status,
          //   // lastSeen: item.status,
          //   // unreadCount: 0,
          //   // time: 'Now',
          // }));
          // setChatList(mappedChats);
          setChatList(res.data.users);
        }
      } catch (err) {
        console.log(err);
        Alert.alert('Using demo chats', 'Could not load chats from the server.');
      }
    };

    getChats();
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={chatList}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ChatDetail', { contactName: item.name, contactId: item.id })}
            style={styles.contactRow}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.name}>{item.name}</Text>
              {/* <Text style={styles.status}>{item.lastMessage}</Text> */}
            </View>
            {/* {item.unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            ) : null} */}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHATSAPP_COLORS.surface },
  content: { padding: 16, gap: 12 },
  contactRow: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    backgroundColor: WHATSAPP_COLORS.card,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: WHATSAPP_COLORS.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  textContainer: { flex: 1 },
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
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#042C1A',
    fontWeight: '800',
    fontSize: 12,
  },
});

export default ChatsListScreen;
