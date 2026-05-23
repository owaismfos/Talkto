import type { ChatPreview, CommunityItem, StatusUpdate, CallItem, SettingItem } from '../services/interfaces'

export type HomeTabKey = 'Chats' | 'Updates' | 'Communities' | 'Calls';


export const mockChats: ChatPreview[] = [
  // {
  //   id: 'u1',
  //   name: 'Aisha Khan',
  //   status: 'Online',
  //   last_message: 'See you at 7 for the sprint review.',
  //   lastSeen: 'online',
  //   unreadCount: 3,
  //   time: '09:42',
  //   pinned: true,
  // },
  // {
  //   id: 'u2',
  //   name: 'Rohan Sharma',
  //   status: 'Last seen 10 minutes ago',
  //   last_message: 'Shared the deployment notes.',
  //   lastSeen: 'last seen today at 09:10',
  //   unreadCount: 0,
  //   time: '08:18',
  // },
  // {
  //   id: 'u3',
  //   name: 'Design Team',
  //   status: '5 participants',
  //   last_message: 'New hero banner draft is ready.',
  //   lastSeen: 'active today',
  //   unreadCount: 7,
  //   time: 'Yesterday',
  //   pinned: true,
  // },
  // {
  //   id: 'u4',
  //   name: 'Neha Patel',
  //   status: 'Typing less, shipping more',
  //   last_message: 'Can you check the API response shape?',
  //   lastSeen: 'last seen yesterday at 22:15',
  //   unreadCount: 0,
  //   time: 'Yesterday',
  // },
];

export const mockStatuses: StatusUpdate[] = [
  { id: 's1', name: 'Aisha Khan', time: '20 minutes ago', seen: false },
  { id: 's2', name: 'Rohan Sharma', time: '45 minutes ago', seen: false },
  { id: 's3', name: 'Priya Menon', time: 'Today, 08:04', seen: true },
  { id: 's4', name: 'Arjun Nair', time: 'Yesterday, 23:11', seen: true },
];

export const mockCalls: CallItem[] = [
  { id: 'c1', name: 'Aisha Khan', direction: 'incoming', type: 'voice', time: 'Today, 09:05' },
  { id: 'c2', name: 'Neha Patel', direction: 'missed', type: 'video', time: 'Today, 07:48' },
  { id: 'c3', name: 'Product Standup', direction: 'outgoing', type: 'voice', time: 'Yesterday, 18:20' },
];

export const mockCommunities: CommunityItem[] = [
  {
    id: 'g1',
    name: 'Talkto Builders',
    description: 'Release notes, support handoff, and engineering updates.',
    members: '126 members',
  },
  {
    id: 'g2',
    name: 'Weekend Football',
    description: 'Lineups, venue updates, and match-day photos.',
    members: '38 members',
  },
];

export const mockSettings: SettingItem[] = [
  {
    id: 'st1',
    title: 'Account',
    description: 'Security notifications, privacy, and linked devices.',
  },
  {
    id: 'st2',
    title: 'Chats',
    description: 'Theme, wallpaper, chat backup, and history.',
  },
  {
    id: 'st3',
    title: 'Notifications',
    description: 'Message tones, group alerts, and call sounds.',
  },
  {
    id: 'st4',
    title: 'Storage and data',
    description: 'Network usage, downloads, and media quality.',
  },
];

