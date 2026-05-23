export interface ChatPreview {
  id: string;
  name: string;
  status: string;
  last_message: string;
  last_message_time: string
  lastSeen: string;
  unreadCount: number;
  time: string;
  pinned?: boolean;
}

export interface StatusUpdate {
  id: string;
  name: string;
  time: string;
  seen: boolean;
}

export interface CallItem {
  id: string;
  name: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  type: 'voice' | 'video';
  time: string;
}

export interface CommunityItem {
  id: string;
  name: string;
  description: string;
  members: string;
}

export interface SettingItem {
  id: string;
  title: string;
  description: string;
}