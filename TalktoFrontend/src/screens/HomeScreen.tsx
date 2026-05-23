import React, { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  HomeTabKey,
  mockCalls,
  mockChats,
  mockCommunities,
  mockSettings,
  mockStatuses
} from '../data/mockAppData';
import { WHATSAPP_COLORS } from '../services/colors'

import { ChatPreview } from '../services/interfaces'
import * as Keychain from 'react-native-keychain';
import { styles as settingStyle } from './SettingsScreen';
import { getInitials } from '../services/helper'
import api from '../services/api'
import Avatar from '../components/Avatar';

const TABS: HomeTabKey[] = ['Chats', 'Updates', 'Communities', 'Calls'];

const HomeScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<HomeTabKey>('Chats');
  const [chatList, setChatList] = useState<ChatPreview[]>([]);

  const headerAction = useMemo(() => {
    if (activeTab === 'Chats') {
      return { label: 'New chat', route: 'NewChat' };
    }
    if (activeTab === 'Calls') {
      return { label: 'New call', route: 'NewCall' };
    }
    return { label: 'Settings', route: 'Settings' };
  }, [activeTab]);

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

  const renderChats = () => (
    <FlatList
      data={chatList}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      // ListHeaderComponent={
      //   <View style={styles.heroCard}>
      //     <Text style={styles.heroEyebrow}>Inbox</Text>
      //     <Text style={styles.heroTitle}>Keep important conversations one tap away.</Text>
      //     <View style={styles.heroActions}>
      //       <Pressable style={styles.heroButton} onPress={() => navigation.navigate('ArchivedChats')}>
      //         <Text style={styles.heroButtonText}>Archived</Text>
      //       </Pressable>
      //       <Pressable
      //         style={[styles.heroButton, styles.heroButtonAlt]}
      //         onPress={() => navigation.navigate('Contacts')}
      //       >
      //         <Text style={[styles.heroButtonText, styles.heroButtonAltText]}>Contacts</Text>
      //       </Pressable>
      //     </View>
      //   </View>
      // }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.rowCard}
          onPress={() => navigation.navigate('ChatDetail', { contactName: item.name, contactId: item.id })}
        >
          {/* <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View> */}
          <Avatar name={item.name} />
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowMeta}>{item.last_message_time}</Text>
            </View>
            <View style={styles.rowBottom}>
              <Text numberOfLines={1} style={styles.rowSubtitle}>
                {item?.last_message}
              </Text>
              {item?.unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item?.unreadCount}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );

  const renderUpdates = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Updates</Text>
        <Text style={styles.heroTitle}>Status and channels collected in one feed.</Text>
      </View>
      <TouchableOpacity style={styles.rowCard} onPress={() => navigation.navigate('Profile')}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>ME</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>My status</Text>
          <Text style={styles.rowSubtitle}>Tap to add a text or photo update</Text>
        </View>
      </TouchableOpacity>
      {mockStatuses.map(item => (
        <View key={item.id} style={styles.rowCard}>
          <View style={[styles.avatar, item.seen ? styles.avatarMuted : styles.avatarAccent]}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSubtitle}>{item.time}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderCommunities = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={styles.communityBanner}>
        <Text style={styles.heroEyebrow}>Communities</Text>
        <Text style={styles.heroTitle}>Organize large groups with announcement spaces.</Text>
      </View>
      {mockCommunities.map(item => (
        <View key={item.id} style={styles.rowCard}>
          <View style={[styles.avatar, styles.communityAvatar]}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSubtitle}>{item.description}</Text>
            <Text style={styles.communityMeta}>{item.members}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderCalls = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Calls</Text>
        <Text style={styles.heroTitle}>Create call links and see your recent call history.</Text>
      </View>
      {mockCalls.map(item => (
        <TouchableOpacity key={item.id} style={styles.rowCard} onPress={() => navigation.navigate('NewCall')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowMeta}>{item.type}</Text>
            </View>
            <Text style={styles.rowSubtitle}>
              {item.direction} {item.type} call, {item.time}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderContent = () => {
    if (activeTab === 'Updates') {
      return renderUpdates();
    }
    if (activeTab === 'Communities') {
      return renderCommunities();
    }
    if (activeTab === 'Calls') {
      return renderCalls();
    }
    return renderChats();
  };

  return (
    <SafeAreaView style={settingStyle.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Talkto</Text>
          {/* <Text style={styles.headerSubtitle}>WhatsApp-style frontend</Text> */}
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate(headerAction.route)}>
            <Text style={styles.headerButtonText}>{headerAction.label}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.headerButtonText}>Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.content}>{renderContent()}</View>
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const active = tab === activeTab;
          return (
            <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab}</Text>
              {active ? <View style={styles.tabIndicator} /> : <View style={styles.tabIndicatorPlaceholder} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.surface,
  },
  header: {
    backgroundColor: WHATSAPP_COLORS.brand,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    backgroundColor: WHATSAPP_COLORS.card,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  communityBanner: {
    backgroundColor: '#E9FFF0',
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#C8F1D4',
  },
  heroEyebrow: {
    color: WHATSAPP_COLORS.brand,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    color: WHATSAPP_COLORS.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  heroButton: {
    backgroundColor: WHATSAPP_COLORS.brand,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  heroButtonAlt: {
    backgroundColor: '#ECFDF3',
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroButtonAltText: {
    color: WHATSAPP_COLORS.brand,
  },
  rowCard: {
    backgroundColor: WHATSAPP_COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: WHATSAPP_COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAccent: {
    backgroundColor: WHATSAPP_COLORS.accent,
  },
  avatarMuted: {
    backgroundColor: '#98A2B3',
  },
  communityAvatar: {
    backgroundColor: WHATSAPP_COLORS.brandDark,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  rowTitle: {
    color: WHATSAPP_COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  rowMeta: {
    color: WHATSAPP_COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: WHATSAPP_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontSize: 12,
    fontWeight: '800',
  },
  communityMeta: {
    marginTop: 8,
    color: WHATSAPP_COLORS.brand,
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: WHATSAPP_COLORS.card,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
    paddingBottom: 12,
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    color: WHATSAPP_COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: WHATSAPP_COLORS.brand,
  },
  tabIndicator: {
    width: 28,
    height: 4,
    borderRadius: 999,
    backgroundColor: WHATSAPP_COLORS.brand,
  },
  tabIndicatorPlaceholder: {
    width: 28,
    height: 4,
  },
});

export default HomeScreen;export const SettingsScreen = ({ navigation, onLogout }: any) => {

  const handleLogout = () => {
    Alert.alert('Logout', 'Do you want to sign out from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await Keychain.resetGenericPassword();
          if (onLogout) {
            await onLogout();
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={settingStyle.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={settingStyle.profileCard} onPress={() => navigation.navigate('Profile')}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials('Talkto User')}</Text>
        </View>
        <View style={settingStyle.profileBody}>
          <Text style={settingStyle.profileName}>Talkto User</Text>
          {/* <Text style={styles.profileStatus}>Building a WhatsApp-style frontend in React Native</Text> */}
        </View>
      </TouchableOpacity>

      {mockSettings.map(item => (
        <View key={item.id} style={settingStyle.settingCard}>
          <Text style={settingStyle.settingTitle}>{item.title}</Text>
          <Text style={settingStyle.settingDescription}>{item.description}</Text>
        </View>
      ))}

      <TouchableOpacity style={settingStyle.manageCard} onPress={() => navigation.navigate('Contacts')}>
        <Text style={settingStyle.settingTitle}>Manage contacts</Text>
        <Text style={settingStyle.settingDescription}>Review saved contacts and jump straight into a chat.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={settingStyle.logoutButton} onPress={handleLogout}>
        <Text style={settingStyle.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

