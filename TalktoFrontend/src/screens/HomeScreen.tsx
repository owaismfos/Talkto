import React, { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  HomeTabKey,
  mockSettings,
} from '../data/mockAppData';
import axios from 'axios';

import { CallItem, ChatPreview, CommunityItem, StatusUpdate } from '../services/interfaces'
import * as Keychain from 'react-native-keychain';
import { getInitials } from '../services/helper'
import api from '../services/api'
import Avatar from '../components/Avatar';
import { useFocusEffect } from '@react-navigation/native';
import { socketService } from '../services/SocketService';
import { useTheme } from '../contexts/ThemeContext';
import { type AppThemeColors } from '../theme/colors';

const TABS: HomeTabKey[] = ['Chats', 'Updates', 'Communities', 'Calls'];

const getApiErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (detail) {
      return JSON.stringify(detail);
    }
    return error.response ? `Server returned ${error.response.status}` : error.message;
  }

  return error instanceof Error ? error.message : 'Unexpected API error';
};

const HomeScreen = ({ navigation, onLogout }: any) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<HomeTabKey>('Chats');
  const [chatList, setChatList] = useState<ChatPreview[]>([]);
  const [statuses, setStatuses] = useState<StatusUpdate[]>([]);
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [groups, setGroups] = useState<CommunityItem[]>([]);
  const [statusDraft, setStatusDraft] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMemberPhone, setGroupMemberPhone] = useState('');
  const [isCreatingStatus, setIsCreatingStatus] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isLoadingHomeData, setIsLoadingHomeData] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const loadHomeData = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoadingHomeData(true);
    }
    try {
      const [chatsRes, statusesRes, callsRes, groupsRes] = await Promise.allSettled([
        api.get('/chats/users'),
        api.get('/statuses'),
        api.get('/calls'),
        api.get('/groups'),
      ]);

      if (chatsRes.status === 'fulfilled') {
        setChatList(Array.isArray(chatsRes.value.data.users) ? chatsRes.value.data.users : []);
      } else {
        console.log('Chats API error:', getApiErrorMessage(chatsRes.reason), chatsRes.reason);
        setChatList([]);
        // Alert.alert('Chats unavailable', getApiErrorMessage(chatsRes.reason));
      }

      if (statusesRes.status === 'fulfilled') {
        setStatuses(Array.isArray(statusesRes.value.data.statuses) ? statusesRes.value.data.statuses : []);
      } else {
        console.log('Statuses API error:', getApiErrorMessage(statusesRes.reason), statusesRes.reason);
        setStatuses([]);
      }

      if (callsRes.status === 'fulfilled') {
        setCalls(Array.isArray(callsRes.value.data.calls) ? callsRes.value.data.calls : []);
      } else {
        console.log('Calls API error:', getApiErrorMessage(callsRes.reason), callsRes.reason);
        setCalls([]);
      }

      if (groupsRes.status === 'fulfilled') {
        setGroups(Array.isArray(groupsRes.value.data.groups) ? groupsRes.value.data.groups : []);
      } else {
        console.log('Groups API error:', getApiErrorMessage(groupsRes.reason), groupsRes.reason);
        setGroups([]);
      }
    } finally {
      if (showLoader) {
        setIsLoadingHomeData(false);
      }
    }
  }, []);

  const handleNewContact = () => {
    setIsMenuVisible(false);
    navigation.navigate('AddContact');
  };

  const handleYourContacts = () => {
    setIsMenuVisible(false);
    navigation.navigate('YourContacts');
  };

  const handleRingtoneSettings = () => {
    setIsMenuVisible(false);
    navigation.navigate('RingtoneSettings');
  };

  const handleThemeSettings = () => {
    setIsMenuVisible(false);
    navigation.navigate('ThemeSettings');
  };

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

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData]),
  );

  useEffect(() => {
    const unsubscribe = socketService.subscribe(data => {
      if (data.action === 'new_message') {
        loadHomeData(false);
      }
    });

    return unsubscribe;
  }, [loadHomeData]);

  const createStatus = async () => {
    const content = statusDraft.trim();
    if (!content) {
      return;
    }

    setIsCreatingStatus(true);
    try {
      const res = await api.post('/statuses', { content, status_type: 'text' });
      if (res.data.status) {
        setStatuses(prev => [res.data.status, ...prev]);
      }
      setStatusDraft('');
    } catch (err) {
      console.log(err);
      Alert.alert('Status not saved', 'Could not create the status on the server.');
    } finally {
      setIsCreatingStatus(false);
    }
  };

  const createGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      return;
    }

    setIsCreatingGroup(true);
    try {
      const res = await api.post('/groups', {
        name,
        description: groupDescription.trim() || null,
        member_phone_numbers: groupMemberPhone.trim() ? [groupMemberPhone.trim()] : [],
      });
      if (res.data.group) {
        setGroups(prev => [res.data.group, ...prev]);
      }
      setGroupName('');
      setGroupDescription('');
      setGroupMemberPhone('');
    } catch (err) {
      console.log(err);
      Alert.alert('Group not created', 'Could not create the group on the server.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const renderChats = () => (
    <FlatList
      data={chatList}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={!isLoadingHomeData ? (
        <Text style={styles.emptyText}>No chats yet. Start a new chat from your contacts.</Text>
      ) : null}
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
              <Text style={styles.rowMeta}>{item.last_message_time || ''}</Text>
            </View>
            <View style={styles.rowBottom}>
              <Text numberOfLines={1} style={styles.rowSubtitle}>
                {item?.last_message || item.status || 'Tap to start chatting'}
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
        <Text style={styles.heroTitle}>Share a 24-hour text status with your contacts.</Text>
        <TextInput
          style={styles.input}
          value={statusDraft}
          onChangeText={setStatusDraft}
          placeholder="What's happening?"
          placeholderTextColor="#98A2B3"
          multiline
        />
        <TouchableOpacity
          style={[styles.primaryButton, (!statusDraft.trim() || isCreatingStatus) && styles.disabledButton]}
          onPress={createStatus}
          disabled={!statusDraft.trim() || isCreatingStatus}
        >
          {isCreatingStatus ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Post status</Text>}
        </TouchableOpacity>
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
      {statuses.map(item => (
        <View key={item.id} style={styles.rowCard}>
          <View style={[styles.avatar, item.seen ? styles.avatarMuted : styles.avatarAccent]}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSubtitle}>{item.content || item.time}</Text>
            <Text style={styles.communityMeta}>{item.time}</Text>
          </View>
        </View>
      ))}
      {!statuses.length && !isLoadingHomeData ? (
        <Text style={styles.emptyText}>No active statuses yet.</Text>
      ) : null}
    </ScrollView>
  );

  const renderCommunities = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={styles.communityBanner}>
        <Text style={styles.heroEyebrow}>Communities</Text>
        <Text style={styles.heroTitle}>Create groups and add members by phone number.</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Group name"
          placeholderTextColor="#98A2B3"
        />
        <TextInput
          style={styles.input}
          value={groupDescription}
          onChangeText={setGroupDescription}
          placeholder="Description"
          placeholderTextColor="#98A2B3"
        />
        <TextInput
          style={styles.input}
          value={groupMemberPhone}
          onChangeText={setGroupMemberPhone}
          placeholder="Member phone number"
          placeholderTextColor="#98A2B3"
          keyboardType="phone-pad"
        />
        <TouchableOpacity
          style={[styles.primaryButton, (!groupName.trim() || isCreatingGroup) && styles.disabledButton]}
          onPress={createGroup}
          disabled={!groupName.trim() || isCreatingGroup}
        >
          {isCreatingGroup ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Create group</Text>}
        </TouchableOpacity>
      </View>
      {groups.map(item => (
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
      {!groups.length && !isLoadingHomeData ? (
        <Text style={styles.emptyText}>No groups yet.</Text>
      ) : null}
    </ScrollView>
  );

  const renderCalls = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Calls</Text>
        <Text style={styles.heroTitle}>Create call links and see your recent call history.</Text>
      </View>
      {calls.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.rowCard}
          onPress={() => item.contact_id
            ? navigation.navigate('Call', { contactId: item.contact_id, contactName: item.name, callType: item.type, mode: 'outgoing' })
            : navigation.navigate('NewCall')}
        >
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
      {!calls.length && !isLoadingHomeData ? (
        <Text style={styles.emptyText}>No calls yet.</Text>
      ) : null}
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Talkto</Text>
          {/* <Text style={styles.headerSubtitle}>WhatsApp-style frontend</Text> */}
        </View>
        <View style={styles.headerActionWrapper}>
          <TouchableOpacity
            style={styles.headerMenuButton}
            onPress={() => setIsMenuVisible(prev => !prev)}
          >
            <Text style={styles.headerMenuIcon}>⋮</Text>
          </TouchableOpacity>
          {isMenuVisible ? (
            <View style={styles.menuLayer}>
              <Pressable style={styles.menuBackdrop} onPress={() => setIsMenuVisible(false)} />
              <View style={styles.dropdownMenu}>
                <TouchableOpacity style={styles.menuItem} onPress={handleNewContact}>
                  <Text style={styles.menuItemText}>New Contact</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleYourContacts}>
                  <Text style={styles.menuItemText}>Your Contacts</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleRingtoneSettings}>
                  <Text style={styles.menuItemText}>Ringtone</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleThemeSettings}>
                  <Text style={styles.menuItemText}>Theme</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={[styles.menuItem, styles.logoutMenuItem]} onPress={handleLogout}>
                  <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
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

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    backgroundColor: colors.brand,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 20,
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
  headerActionWrapper: {
    position: 'relative',
  },
  headerMenuButton: {
    // width: 42,
    // height: 42,
    // borderRadius: 21,
    // backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMenuIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },
  menuLayer: {
    position: 'absolute',
    top: 46,
    right: 0,
    width: 220,
    zIndex: 30,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -400,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  logoutMenuItem: {
    marginTop: 2,
  },
  logoutText: {
    color: colors.danger,
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
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  communityBanner: {
    backgroundColor: colors.accentSoft,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroEyebrow: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  disabledButton: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  heroButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  heroButtonAlt: {
    backgroundColor: colors.accentSoft,
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroButtonAltText: {
    color: colors.brand,
  },
  rowCard: {
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAccent: {
    backgroundColor: colors.accent,
  },
  avatarMuted: {
    backgroundColor: '#98A2B3',
  },
  communityAvatar: {
    backgroundColor: colors.brandDark,
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
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.muted,
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
    backgroundColor: colors.accent,
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
    color: colors.brand,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 18,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: colors.brand,
  },
  tabIndicator: {
    width: 28,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  tabIndicatorPlaceholder: {
    width: 28,
    height: 4,
  },
});

export default HomeScreen;
