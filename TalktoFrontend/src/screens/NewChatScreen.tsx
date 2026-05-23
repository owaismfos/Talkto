import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mockChats } from '../data/mockAppData';
import { WHATSAPP_COLORS } from '../services/colors';
import { getInitials } from '../services/helper';

const NewChatScreen = ({ navigation }: any) => {
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
      {mockChats.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.contactCard}
          onPress={() => navigation.navigate('ChatDetail', { contactName: item.name, contactId: item.id })}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHATSAPP_COLORS.surface },
  content: { padding: 20, gap: 12 },
  actionRow: { gap: 12 },
  actionCard: {
    backgroundColor: WHATSAPP_COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    padding: 18,
  },
  actionTitle: { color: WHATSAPP_COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  actionBody: { color: WHATSAPP_COLORS.muted, fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: WHATSAPP_COLORS.brand, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', marginTop: 4 },
  contactCard: {
    backgroundColor: WHATSAPP_COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WHATSAPP_COLORS.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '800' },
  body: { flex: 1 },
  name: { color: WHATSAPP_COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  status: { color: WHATSAPP_COLORS.muted, fontSize: 13 },
});

export default NewChatScreen;
