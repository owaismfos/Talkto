import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mockChats } from '../data/mockAppData';
import { useTheme } from '../contexts/ThemeContext';
import { type AppThemeColors } from '../theme/colors';
import { getInitials } from '../services/helper'
import { fontSize, fontWeight, radius, spacing } from '../theme/tokens';

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
  content: { padding: spacing.xl, gap: spacing.md },
  title: { color: colors.text, fontSize: fontSize.heading2, fontWeight: fontWeight.extraBold },
  subtitle: { color: colors.muted, fontSize: fontSize.body, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.brandDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: fontWeight.extraBold },
  body: { flex: 1 },
  name: { color: colors.text, fontSize: fontSize.bodyLarge, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  message: { color: colors.muted, fontSize: fontSize.small },
});

export default ArchivedChatsScreen;
