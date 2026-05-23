import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mockCalls, mockChats } from '../data/mockAppData';
import { WHATSAPP_COLORS } from '../services/colors';
import { getInitials } from '../services/helper';

const NewCallScreen = ({ route }: any) => {
  const activeContact = route?.params?.contactName
    ? {
        id: route.params.contactId ?? route.params.contactName,
        name: route.params.contactName,
      }
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {activeContact ? (
        <View style={styles.activeCallCard}>
          <View style={[styles.avatar, styles.activeAvatar]}>
            <Text style={styles.avatarText}>{getInitials(activeContact.name)}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{activeContact.name}</Text>
            <Text style={styles.detail}>Ready to start a voice call</Text>
          </View>
          <TouchableOpacity style={styles.primaryCallButton}>
            <Text style={styles.primaryCallButtonText}>Call</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.linkCard}>
        <Text style={styles.linkTitle}>Create call link</Text>
        <Text style={styles.linkBody}>Share a reusable voice or video call link with a single tap.</Text>
        <View style={styles.linkPill}>
          <Text style={styles.linkPillText}>talkto.app/call/team-sync</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent calls</Text>
      {mockCalls.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.detail}>
              {item.direction} {item.type} call, {item.time}
            </Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Text style={styles.callButtonText}>{item.type === 'video' ? 'Video' : 'Call'}</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Suggested contacts</Text>
      {mockChats.slice(0, 3).map(item => (
        <View key={item.id} style={styles.card}>
          <View style={[styles.avatar, styles.secondaryAvatar]}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.detail}>{item.status}</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHATSAPP_COLORS.surface },
  content: { padding: 20, gap: 12 },
  linkCard: {
    backgroundColor: '#E8FFF1',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#C6EED2',
    padding: 18,
  },
  linkTitle: { color: WHATSAPP_COLORS.text, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  linkBody: { color: WHATSAPP_COLORS.muted, fontSize: 14, lineHeight: 20 },
  linkPill: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: WHATSAPP_COLORS.brand,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  linkPillText: { color: '#FFFFFF', fontWeight: '700' },
  sectionTitle: { color: WHATSAPP_COLORS.brand, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', marginTop: 6 },
  activeCallCard: {
    backgroundColor: WHATSAPP_COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  card: {
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: WHATSAPP_COLORS.brandDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeAvatar: { backgroundColor: WHATSAPP_COLORS.brand },
  secondaryAvatar: { backgroundColor: WHATSAPP_COLORS.brand },
  avatarText: { color: '#FFFFFF', fontWeight: '800' },
  body: { flex: 1 },
  name: { color: WHATSAPP_COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  detail: { color: WHATSAPP_COLORS.muted, fontSize: 13 },
  callButton: {
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  callButtonText: { color: WHATSAPP_COLORS.brand, fontWeight: '800', fontSize: 12 },
  primaryCallButton: {
    backgroundColor: WHATSAPP_COLORS.brand,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryCallButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});

export default NewCallScreen;
