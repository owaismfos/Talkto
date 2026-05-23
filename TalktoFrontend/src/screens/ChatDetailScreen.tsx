import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Video from 'react-native-video';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import uuid from 'react-native-uuid';
import api from '../services/api';
import CONFIG from '../config';
import { formatTime } from '../services/helper';
import { socketService } from '../services/SocketService';
import { mockChats } from '../data/mockAppData';
import Avatar from '../components/Avatar';
import { WHATSAPP_COLORS } from '../services/colors';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  msg_type: 'text' | 'image' | 'video' | 'audio' | 'file';
  media_url: string | null;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  formatted_time: string;
  read_at: string | null;
  sender: 'me' | 'them';
}

interface AttachmentDraft {
  uri: string;
  name: string;
  type: string;
  size: number | null;
  msgType: Message['msg_type'];
}

type ChatRow =
  | { type: 'message'; id: string; message: Message }
  | { type: 'date'; id: string; label: string };

const getMessageDateKey = (date: string) => {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'unknown';
  }

  return parsedDate.toISOString().slice(0, 10);
};

const getDateLabel = (dateKey: string) => {
  if (dateKey === 'unknown') {
    return 'Unknown date';
  }

  const date = new Date(`${dateKey}T00:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dateKey === getMessageDateKey(today.toISOString())) {
    return 'Today';
  }

  if (dateKey === getMessageDateKey(yesterday.toISOString())) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
};

const buildChatRows = (messages: Message[]): ChatRow[] => {
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const rows: ChatRow[] = [];
  let currentDateKey: string | null = null;

  sortedMessages.forEach(item => {
    const dateKey = getMessageDateKey(item.created_at);
    if (currentDateKey && currentDateKey !== dateKey) {
      rows.push({
        type: 'date',
        id: `date-${currentDateKey}`,
        label: getDateLabel(currentDateKey),
      });
    }

    rows.push({
      type: 'message',
      id: item.id,
      message: item,
    });
    currentDateKey = dateKey;
  });

  if (currentDateKey) {
    rows.push({
      type: 'date',
      id: `date-${currentDateKey}`,
      label: getDateLabel(currentDateKey),
    });
  }

  return rows;
};

const ChatDetailScreen = ({ route }: any) => {
  const { contactName, contactId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [chatStatus, setChatStatus] = useState('last seen recently');
  const [isTyping, setIsTyping] = useState(false);
  const [isMediaMenuOpen, setIsMediaMenuOpen] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState('00:00');
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);

  const typingTimer = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const lastTypingSignalSent = useRef(false);
  const navigation = useNavigation<any>();
  const chatRows = useMemo(() => buildChatRows(messages), [messages]);

  const startCall = useCallback(
    (callType: 'voice' | 'video') => {
      navigation.navigate('Call', { contactId, contactName, callType, mode: 'outgoing' });
    },
    [contactId, contactName, navigation],
  );

  const getAttachmentType = (mimeType: string | null): Message['msg_type'] => {
    if (mimeType?.startsWith('image/')) {
      return 'image';
    }
    if (mimeType?.startsWith('video/')) {
      return 'video';
    }
    if (mimeType?.startsWith('audio/')) {
      return 'audio';
    }
    return 'file';
  };

  const getMediaUrl = (mediaUrl: string | null) => {
    if (!mediaUrl) {
      return null;
    }
    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://') || mediaUrl.startsWith('file://') || mediaUrl.startsWith('content://')) {
      return mediaUrl;
    }
    return `${CONFIG.API_URL}${mediaUrl}`;
  };

  const normalizeFileUri = (uri: string) => {
    if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('http')) {
      return uri;
    }
    return `file://${uri}`;
  };

  const requestAndroidPermission = async (permission: string, title: string, messageText: string) => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const result = await PermissionsAndroid.request(permission as any, {
      title,
      message: messageText,
      buttonPositive: 'Allow',
      buttonNegative: 'Cancel',
    });

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickAttachment = async (pickerType: 'file' | 'media' = 'file') => {
    try {
      const [result] = await pick({
        type: pickerType === 'media'
          ? [types.images, types.video, types.audio]
          : [types.pdf, types.plainText, types.allFiles],
      });
      setAttachment({
        uri: result.uri,
        name: result.name ?? 'attachment',
        type: result.type ?? 'application/octet-stream',
        size: result.size,
        msgType: getAttachmentType(result.type),
      });
      setIsMediaMenuOpen(false);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      console.log(err);
      Alert.alert('Attachment error', 'Could not open the file picker.');
    }
  };

  const pickFromGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'mixed',
      selectionLimit: 1,
      quality: 0.9,
      videoQuality: 'high',
    });

    if (result.didCancel) {
      return;
    }

    if (result.errorCode) {
      Alert.alert('Media error', result.errorMessage || 'Could not choose media.');
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      return;
    }

    setAttachment({
      uri: asset.uri,
      name: asset.fileName ?? `media-${Date.now()}`,
      type: asset.type ?? 'application/octet-stream',
      size: asset.fileSize ?? null,
      msgType: getAttachmentType(asset.type ?? null),
    });
    setIsMediaMenuOpen(false);
  };

  const captureMedia = async (mediaType: 'photo' | 'video') => {
    const hasPermission = await requestAndroidPermission(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      'Camera permission needed',
      mediaType === 'video' ? 'Allow camera access to record a video.' : 'Allow camera access to take a photo.',
    );

    if (!hasPermission) {
      return;
    }

    const result = await launchCamera({
      mediaType,
      quality: 0.9,
      videoQuality: 'high',
      durationLimit: mediaType === 'video' ? 120 : undefined,
      saveToPhotos: false,
    });

    if (result.didCancel) {
      return;
    }

    if (result.errorCode) {
      Alert.alert('Camera error', result.errorMessage || 'Could not capture media.');
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      return;
    }

    setAttachment({
      uri: asset.uri,
      name: asset.fileName ?? `${mediaType}-${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
      type: asset.type ?? (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
      size: asset.fileSize ?? null,
      msgType: mediaType === 'video' ? 'video' : 'image',
    });
    setIsMediaMenuOpen(false);
  };

  const startAudioRecording = async () => {
    const hasPermission = await requestAndroidPermission(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      'Microphone permission needed',
      'Allow microphone access to record audio messages.',
    );

    if (!hasPermission) {
      return;
    }

    try {
      setIsMediaMenuOpen(false);
      setRecordingDuration('00:00');
      await AudioRecorderPlayer.startRecorder();
      AudioRecorderPlayer.addRecordBackListener(recording => {
        setRecordingDuration(AudioRecorderPlayer.mmss(Math.floor(recording.currentPosition / 1000)));
      });
      setIsRecordingAudio(true);
    } catch (err) {
      console.log(err);
      Alert.alert('Recording error', 'Could not start audio recording.');
    }
  };

  const stopAudioRecording = async () => {
    try {
      const resultUri = await AudioRecorderPlayer.stopRecorder();
      AudioRecorderPlayer.removeRecordBackListener();
      setIsRecordingAudio(false);
      setRecordingDuration('00:00');
      setAttachment({
        uri: normalizeFileUri(resultUri),
        name: `audio-${Date.now()}.m4a`,
        type: 'audio/mp4',
        size: null,
        msgType: 'audio',
      });
    } catch (err) {
      console.log(err);
      Alert.alert('Recording error', 'Could not stop audio recording.');
    }
  };

  const cancelAudioRecording = async () => {
    try {
      await AudioRecorderPlayer.stopRecorder();
    } catch (err) {
      console.log(err);
    } finally {
      AudioRecorderPlayer.removeRecordBackListener();
      setIsRecordingAudio(false);
      setRecordingDuration('00:00');
    }
  };

  const toggleAudioPlayback = async (audioUrl: string) => {
    try {
      if (playingAudioUrl === audioUrl) {
        await AudioRecorderPlayer.stopPlayer();
        AudioRecorderPlayer.removePlayBackListener();
        setPlayingAudioUrl(null);
        return;
      }

      await AudioRecorderPlayer.stopPlayer();
      AudioRecorderPlayer.removePlayBackListener();
      await AudioRecorderPlayer.startPlayer(audioUrl);
      setPlayingAudioUrl(audioUrl);
      AudioRecorderPlayer.addPlayBackListener(playback => {
        if (playback.currentPosition >= playback.duration && playback.duration > 0) {
          AudioRecorderPlayer.stopPlayer();
          AudioRecorderPlayer.removePlayBackListener();
          setPlayingAudioUrl(null);
        }
      });
    } catch (err) {
      console.log(err);
      Alert.alert('Playback error', 'Could not play this audio.');
      setPlayingAudioUrl(null);
    }
  };

  const uploadAttachment = async (draft: AttachmentDraft) => {
    const formData = new FormData();
    formData.append('file', {
      uri: draft.uri,
      name: draft.name,
      type: draft.type,
    } as any);

    const res = await api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });

    return res.data as {
      media_url: string;
      msg_type: Message['msg_type'];
      filename: string;
    };
  };

  const sendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !attachment) {
      return;
    }

    const currentAttachment = attachment;
    const pendingMessage: Message = {
      id: uuid.v4() as string,
      sender_id: 'me',
      receiver_id: contactId,
      content: trimmedMessage || (currentAttachment?.msgType === 'file' ? currentAttachment.name : null),
      msg_type: currentAttachment?.msgType ?? 'text',
      media_url: currentAttachment?.uri ?? null,
      status: 'sent',
      created_at: new Date().toISOString(),
      formatted_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read_at: null,
      sender: 'me',
    };

    setMessages(prev => [pendingMessage, ...prev]);
    setMessage('');
    setAttachment(null);
    setIsSending(true);

    try {
      const uploaded = currentAttachment ? await uploadAttachment(currentAttachment) : null;
      const res = await api.post(`/chats/${contactId}/messages`, {
        content: trimmedMessage || (uploaded?.msg_type === 'file' ? uploaded.filename : null),
        msg_type: uploaded?.msg_type ?? 'text',
        media_url: uploaded?.media_url ?? null,
      });
      if (res.data.chat_message) {
        setMessages(prev => prev.map(item => item.id === pendingMessage.id ? res.data.chat_message : item));
      }
    } catch (err) {
      console.log(err);
      Alert.alert('Demo mode', 'Message added locally. The server was not reachable.');
    } finally {
      setIsSending(false);
    }
  };

  const onTextChange = (text: string) => {
    setMessage(text);
    if (!lastTypingSignalSent.current) {
      socketService.send({
        action: 'typing',
        receiver_id: contactId,
        is_typing: true,
      });
      lastTypingSignalSent.current = true;
      setTimeout(() => {
        lastTypingSignalSent.current = false;
      }, 2000);
    }
  };

  useEffect(() => {
    const getChatMessages = async () => {
      try {
        const res = await api.get(`/chats/${contactId}/messages`);
        if (Array.isArray(res.data.messages) && res.data.messages.length > 0) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.log(err);
      }
    };

    getChatMessages();
  }, [contactId]);

  useEffect(() => {
    return () => {
      AudioRecorderPlayer.stopPlayer();
      AudioRecorderPlayer.removePlayBackListener();
      AudioRecorderPlayer.removeRecordBackListener();
    };
  }, []);

  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const res = await api.get(`/users/${contactId}`);
        if (res.data.last_seen) {
          setChatStatus(`${res.data.last_seen}`);
          return;
        }
      } catch (err) {
        console.log(err);
      }

      const chat = mockChats.find(item => item.id === contactId);
      setChatStatus(chat?.lastSeen ?? 'last seen recently');
    };

    fetchInitialStatus();

    const unsubscribe = socketService.subscribe((data) => {
      if (data.action === 'new_message' && data.message.sender_id === contactId) {
        setMessages(prev => [data.message, ...prev]);
      }

      if (data.action === 'presence_update' && data.user_id === contactId) {
        setChatStatus(data.last_seen);
      }

      if (data.action === 'typing_status' && data.sender_id === contactId) {
        setIsTyping(data.is_typing);
        clearTimeout(typingTimer.current);
        if (data.is_typing) {
          typingTimer.current = setTimeout(() => setIsTyping(false), 3000);
        }
      }
    });

    return () => {
      clearTimeout(typingTimer.current);
      unsubscribe();
    };
  }, [contactId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerContainer}>
          {/* <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{getInitials(contactName)}</Text>
          </View> */}
          <Avatar name={contactName} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerNameText}>{contactName}</Text>
            <Text style={[styles.headerStatusText, isTyping && styles.typingGreen]}>
              {isTyping ? 'typing...' : chatStatus}
            </Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Start video call with ${contactName}`}
            style={styles.headerIconButton}
            onPress={() => startCall('video')}
          >
            <Icon name="video" size={23} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Start voice call with ${contactName}`}
            style={styles.headerIconButton}
            onPress={() => startCall('voice')}
          >
            <Icon name="phone" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [chatStatus, contactName, isTyping, navigation, startCall]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        inverted
        data={chatRows}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          if (item.type === 'date') {
            return (
              <View style={styles.dateSeparatorContainer}>
                <Text style={styles.dateSeparatorText}>{item.label}</Text>
              </View>
            );
          }

          const chatMessage = item.message;
          const mediaUrl = getMediaUrl(chatMessage.media_url);
          const isImage = chatMessage.msg_type === 'image' && mediaUrl;
          const isVideo = chatMessage.msg_type === 'video' && mediaUrl;
          const isAudio = chatMessage.msg_type === 'audio' && mediaUrl;
          const isAttachment = chatMessage.msg_type !== 'text' && mediaUrl;

          return (
            <View style={[styles.messageBubble, chatMessage.sender === 'me' ? styles.myMessage : styles.theirMessage]}>
              {isImage ? (
                <Image source={{ uri: mediaUrl }} style={styles.messageImage} resizeMode="cover" />
              ) : isVideo ? (
                <Video
                  source={{ uri: mediaUrl }}
                  style={styles.messageVideo}
                  controls
                  paused
                  resizeMode="cover"
                />
              ) : isAudio ? (
                <TouchableOpacity style={styles.audioCard} onPress={() => toggleAudioPlayback(mediaUrl)}>
                  <Icon name={playingAudioUrl === mediaUrl ? 'stop-circle' : 'play-circle'} size={34} color={WHATSAPP_COLORS.brand} />
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {chatMessage.content || 'Audio message'}
                  </Text>
                </TouchableOpacity>
              ) : isAttachment ? (
                <View style={styles.attachmentCard}>
                  <Icon name="file-document-outline" size={24} color={WHATSAPP_COLORS.brand} />
                  <Text style={styles.attachmentName} numberOfLines={2}>
                    {chatMessage.content || 'Attachment'}
                  </Text>
                </View>
              ) : null}
              {Boolean(chatMessage.content) && (!isAttachment || isImage) ? (
                <Text style={[styles.messageText, isAttachment && styles.captionText]}>{chatMessage.content}</Text>
              ) : null}
              <Text style={styles.timeText}>{formatTime(chatMessage.created_at)}</Text>
            </View>
          );
        }}
      />
      <View style={styles.inputContainer}>
        {isRecordingAudio ? (
          <View style={styles.recordingBar}>
            <Icon name="microphone" size={20} color="#DC2626" />
            <Text style={styles.recordingText}>Recording {recordingDuration}</Text>
            <TouchableOpacity onPress={cancelAudioRecording} style={styles.recordingAction}>
              <Icon name="delete-outline" size={21} color={WHATSAPP_COLORS.muted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={stopAudioRecording} style={styles.recordingDoneButton}>
              <Icon name="check" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}
        {attachment ? (
          <View style={styles.attachmentPreview}>
            <Icon name={attachment.msgType === 'image' ? 'image' : attachment.msgType === 'video' ? 'video' : attachment.msgType === 'audio' ? 'music-note' : 'file-document-outline'} size={20} color={WHATSAPP_COLORS.brand} />
            <Text style={styles.attachmentPreviewText} numberOfLines={1}>{attachment.name}</Text>
            <TouchableOpacity onPress={() => setAttachment(null)} disabled={isSending}>
              <Icon name="close" size={18} color={WHATSAPP_COLORS.muted} />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.composerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Attach media or file"
            style={styles.attachButton}
            onPress={() => setIsMediaMenuOpen(true)}
            disabled={isSending}
          >
            <Icon name="plus" size={25} color={WHATSAPP_COLORS.brand} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={attachment ? 'Add a caption' : 'Type a message'}
            placeholderTextColor="#98A2B3"
            value={message}
            onChangeText={onTextChange}
          />
          <TouchableOpacity
            style={[styles.sendButton, ((!message.trim() && !attachment) || isSending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={(!message.trim() && !attachment) || isSending}
          >
            {isSending ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="send" size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </View>
      <Modal
        visible={isMediaMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMediaMenuOpen(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setIsMediaMenuOpen(false)}>
          <Pressable style={styles.mediaMenu}>
            <TouchableOpacity style={styles.mediaMenuItem} onPress={() => pickAttachment('file')}>
              <Icon name="file-document-outline" size={22} color={WHATSAPP_COLORS.brand} />
              <Text style={styles.mediaMenuText}>PDF or file</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaMenuItem} onPress={pickFromGallery}>
              <Icon name="image-multiple-outline" size={22} color={WHATSAPP_COLORS.brand} />
              <Text style={styles.mediaMenuText}>Photo or video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaMenuItem} onPress={() => captureMedia('photo')}>
              <Icon name="camera-outline" size={22} color={WHATSAPP_COLORS.brand} />
              <Text style={styles.mediaMenuText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaMenuItem} onPress={() => captureMedia('video')}>
              <Icon name="video-outline" size={22} color={WHATSAPP_COLORS.brand} />
              <Text style={styles.mediaMenuText}>Record video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaMenuItem} onPress={startAudioRecording}>
              <Icon name="microphone-outline" size={22} color={WHATSAPP_COLORS.brand} />
              <Text style={styles.mediaMenuText}>Record audio</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E7DDD4' },
  listContent: { padding: 12 },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,23,40,0.06)',
  },
  myMessage: { alignSelf: 'flex-end', backgroundColor: WHATSAPP_COLORS.bubbleMe },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: WHATSAPP_COLORS.bubbleThem },
  dateSeparatorContainer: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  dateSeparatorText: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 12,
    color: WHATSAPP_COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  messageText: { fontSize: 15, color: WHATSAPP_COLORS.text, lineHeight: 20 },
  captionText: { marginTop: 6 },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,40,0.08)',
  },
  messageVideo: {
    width: 240,
    height: 170,
    borderRadius: 10,
    backgroundColor: '#111827',
    overflow: 'hidden',
  },
  attachmentCard: {
    width: 230,
    minHeight: 58,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  audioCard: {
    width: 230,
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  attachmentName: {
    flex: 1,
    color: WHATSAPP_COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  timeText: { fontSize: 11, color: WHATSAPP_COLORS.muted, textAlign: 'right', marginTop: 5 },
  inputContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#F7F8FA',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,40,0.06)',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  attachmentPreviewText: {
    flex: 1,
    color: WHATSAPP_COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  recordingText: {
    flex: 1,
    color: WHATSAPP_COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  recordingAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDoneButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.brand,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
    color: WHATSAPP_COLORS.text,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: WHATSAPP_COLORS.brand,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendText: { color: '#FFFFFF', fontWeight: '800' },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Platform.OS === 'ios' ? 0 : -20,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarLetter: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  headerTextContainer: { 
    justifyContent: 'center',
    marginLeft: 8
  },
  headerNameText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  headerStatusText: { fontSize: 12, color: '#D1FAE5' },
  typingGreen: { color: '#B7F7C1', fontWeight: '700' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 2,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,40,0.18)',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 84,
  },
  mediaMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  mediaMenuItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  mediaMenuText: {
    color: WHATSAPP_COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ChatDetailScreen;
