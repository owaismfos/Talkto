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
  sort_time: string;
}

export interface StatusUpdate {
  id: string;
  user_id?: string;
  name: string;
  content?: string | null;
  media_url?: string | null;
  status_type?: 'text' | 'image' | 'video';
  time: string;
  seen: boolean;
}

export interface CallItem {
  id: string;
  contact_id?: string;
  name: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  type: 'voice' | 'video';
  status?: 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended';
  duration_seconds?: number;
  time: string;
}

export interface CommunityItem {
  id: string;
  name: string;
  description: string;
  members: string;
  members_count?: number;
  member_list?: {
    id: string;
    name: string;
    role: string;
    joined_at: string;
  }[];
}

export interface SettingItem {
  id: string;
  title: string;
  description: string;
}
