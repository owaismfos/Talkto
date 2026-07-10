import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mockChats } from '../data/mockAppData';
import { useTheme } from '../contexts/ThemeContext';
import { type AppThemeColors } from '../services/colors';
import { getInitials } from '../services/helper'

const archivedItems = mockChats.filter(item => !item.pinned);

const ArchivedChatsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Archived chats</Text>
      <Text style={styles.subtitle}>Muted or less active conversations stay here until you need them.</Text>
      {archivedItems.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={() => navigation.navigate('ChatDetail', { contactName: item.name, contactId: item.id })}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.message}>{item.last_message}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.brandDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '800' },
  body: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  message: { color: colors.muted, fontSize: 13 },
});

export default ArchivedChatsScreen;
