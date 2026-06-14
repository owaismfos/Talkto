import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Sound from 'react-native-sound';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import { WHATSAPP_COLORS } from '../services/colors';
import { getInitials } from '../services/helper';
import { socketService } from '../services/SocketService';
import api from '../services/api';

const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

Sound.setCategory('Playback');

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const requestAudioPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

const CallScreen = ({ navigation, route }: any) => {
  const {
    contactId,
    contactName = 'Unknown contact',
    callType = 'voice',
    mode = 'outgoing',
  } = route.params;

  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(callType === 'video');
  const [callState, setCallState] = useState<'incoming' | 'calling' | 'connecting' | 'connected' | 'ended'>(
    mode === 'incoming' ? 'incoming' : 'calling',
  );

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<any[]>([]);
  const endedRef = useRef(false);
  const callLogIdRef = useRef<string | null>(null);
  const startedAtRef = useRef(new Date());
  const durationRef = useRef(0);
  const incomingPulse = useRef(new Animated.Value(1)).current;
  const ringtoneRef = useRef<Sound | null>(null);

  const isVideoCall = callType === 'video';
  const isIncoming = callState === 'incoming';
  const isConnected = callState === 'connected';

  const sendSignal = useCallback(
    (payload: Record<string, unknown>) => {
      socketService.send({
        receiver_id: contactId,
        call_type: callType,
        ...payload,
      });
    },
    [callType, contactId],
  );

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
  }, []);

  const closePeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    pendingCandidatesRef.current = [];
  }, []);

  const createCallLog = useCallback(
    async (direction: 'incoming' | 'outgoing' | 'missed', status: 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended') => {
      if (callLogIdRef.current) {
        return;
      }

      try {
        const res = await api.post('/calls', {
          contact_id: contactId,
          contact_name: contactName,
          direction,
          call_type: callType,
          status,
          duration_seconds: durationRef.current,
          started_at: startedAtRef.current.toISOString(),
        });
        callLogIdRef.current = res.data.call?.id ?? null;
      } catch (error) {
        console.log('Unable to create call history:', error);
      }
    },
    [callType, contactId, contactName],
  );

  const updateCallLog = useCallback(async (status: 'accepted' | 'rejected' | 'missed' | 'ended') => {
    if (!callLogIdRef.current) {
      return;
    }

    try {
      await api.put(`/calls/${callLogIdRef.current}`, {
        status,
        duration_seconds: durationRef.current,
        ended_at: new Date().toISOString(),
      });
    } catch (error) {
      console.log('Unable to update call history:', error);
    }
  }, []);

  const finishCall = useCallback(
    (notifyRemote = true) => {
      if (endedRef.current) {
        return;
      }

      endedRef.current = true;
      if (notifyRemote) {
        sendSignal({ action: 'call_end' });
      }
      updateCallLog('ended');
      setCallState('ended');
      stopLocalStream();
      closePeer();
      navigation.goBack();
    },
    [closePeer, navigation, sendSignal, stopLocalStream, updateCallLog],
  );

  const applyPendingCandidates = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer?.remoteDescription) {
      return;
    }

    const candidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of candidates) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const ensurePeer = useCallback(async () => {
    if (peerRef.current) {
      return peerRef.current;
    }

    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      Alert.alert('Microphone permission needed', 'Allow microphone access to make audio calls.');
      throw new Error('Microphone permission denied');
    }

    const localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: isVideoCall,
    });
    localStreamRef.current = localStream;

    const peer = new RTCPeerConnection(rtcConfig);
    peerRef.current = peer;

    localStream.getTracks().forEach(track => {
      peer.addTrack(track, localStream);
    });

    (peer as any).addEventListener('icecandidate', (event: any) => {
      if (event.candidate) {
        sendSignal({
          action: 'ice_candidate',
          candidate: event.candidate,
        });
      }
    });

    (peer as any).addEventListener('connectionstatechange', () => {
      const state = peer.connectionState;
      if (state === 'connected') {
        setCallState('connected');
      }
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        setCallState(prev => (prev === 'ended' ? prev : 'ended'));
      }
    });

    return peer;
  }, [isVideoCall, sendSignal]);

  const startOffer = useCallback(async () => {
    try {
      setCallState('connecting');
      const peer = await ensurePeer();
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendSignal({
        action: 'call_offer',
        offer,
      });
    } catch (error) {
      console.log('Unable to start call offer:', error);
      finishCall(true);
    }
  }, [ensurePeer, finishCall, sendSignal]);

  const acceptCall = useCallback(() => {
    setCallState('connecting');
    createCallLog('incoming', 'accepted');
    sendSignal({ action: 'call_accept' });
  }, [createCallLog, sendSignal]);

  const rejectCall = useCallback(() => {
    createCallLog('missed', 'rejected');
    sendSignal({ action: 'call_reject' });
    updateCallLog('rejected');
    finishCall(false);
  }, [createCallLog, finishCall, sendSignal, updateCallLog]);

  const handleOffer = useCallback(
    async (offer: any) => {
      try {
        setCallState('connecting');
        const peer = await ensurePeer();
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        await applyPendingCandidates();
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSignal({
          action: 'call_answer',
          answer,
        });
      } catch (error) {
        console.log('Unable to answer call offer:', error);
        finishCall(true);
      }
    },
    [applyPendingCandidates, ensurePeer, finishCall, sendSignal],
  );

  const handleAnswer = useCallback(
    async (answer: any) => {
      try {
        const peer = peerRef.current;
        if (!peer) {
          return;
        }
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        await applyPendingCandidates();
      } catch (error) {
        console.log('Unable to apply call answer:', error);
        finishCall(true);
      }
    },
    [applyPendingCandidates, finishCall],
  );

  const handleIceCandidate = useCallback(
    async (candidate: any) => {
      const peer = peerRef.current;
      if (!peer?.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.log('Unable to add ICE candidate:', error);
      }
    },
    [],
  );

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    localStreamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [isMuted]);

  useEffect(() => {
    if (mode === 'outgoing') {
      createCallLog('outgoing', 'ringing');
      sendSignal({
        action: 'call_invite',
        caller_name: 'Talkto User',
      });
    }
  }, [createCallLog, mode, sendSignal]);

  useEffect(() => {
    if (callState === 'incoming') {
      Vibration.vibrate([500, 900], true);
      return () => Vibration.cancel();
    }

    Vibration.cancel();
    return undefined;
  }, [callState]);

  useEffect(() => {
    const stopRingtone = () => {
      ringtoneRef.current?.stop(() => {
        ringtoneRef.current?.release();
        ringtoneRef.current = null;
      });
    };

    if (callState !== 'incoming') {
      stopRingtone();
      return undefined;
    }

    let isActive = true;
    stopRingtone();

    const ringtone = new Sound('incoming_call.wav', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Unable to load incoming call ringtone:', error);
        return;
      }

      if (!isActive) {
        ringtone.release();
        return;
      }

      ringtone.setNumberOfLoops(-1);
      ringtone.play();
      ringtoneRef.current = ringtone;
    });

    return () => {
      isActive = false;
      stopRingtone();
    };
  }, [callState]);

  useEffect(() => {
    if (callState !== 'incoming') {
      incomingPulse.stopAnimation();
      incomingPulse.setValue(1);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(incomingPulse, {
          toValue: 1.14,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(incomingPulse, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      incomingPulse.setValue(1);
    };
  }, [callState, incomingPulse]);

  useEffect(() => {
    const unsubscribe = socketService.subscribe((data) => {
      if (data.sender_id !== contactId) {
        return;
      }

      if (data.action === 'call_accept') {
        updateCallLog('accepted');
        startOffer();
      }

      if (data.action === 'call_reject') {
        Alert.alert('Call declined', `${contactName} declined the call.`);
        updateCallLog('rejected');
        finishCall(false);
      }

      if (data.action === 'call_offer') {
        handleOffer(data.offer);
      }

      if (data.action === 'call_answer') {
        handleAnswer(data.answer);
      }

      if (data.action === 'ice_candidate') {
        handleIceCandidate(data.candidate);
      }

      if (data.action === 'call_end') {
        finishCall(false);
      }
    });

    return unsubscribe;
  }, [contactId, contactName, finishCall, handleAnswer, handleIceCandidate, handleOffer, startOffer, updateCallLog]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const timer = setInterval(() => {
      setDuration(prev => {
        const nextDuration = prev + 1;
        durationRef.current = nextDuration;
        return nextDuration;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnected]);

  useEffect(() => {
    return () => {
      stopLocalStream();
      closePeer();
    };
  }, [closePeer, stopLocalStream]);

  const callStatus = useMemo(() => {
    if (callState === 'incoming') {
      return isVideoCall ? 'Incoming video call' : 'Incoming voice call';
    }
    if (callState === 'calling') {
      return isVideoCall ? 'Video calling...' : 'Calling...';
    }
    if (callState === 'connecting') {
      return 'Connecting...';
    }
    if (callState === 'connected') {
      return formatDuration(duration);
    }
    return 'Call ended';
  }, [callState, duration, isVideoCall]);

  return (
    <SafeAreaView style={[styles.container, isVideoCall && styles.videoContainer]}>
      <View style={styles.stage}>
        {isVideoCall && isCameraOn ? (
          <View style={styles.videoStage}>
            <View style={styles.remoteVideo}>
              <Text style={styles.videoInitials}>{getInitials(contactName)}</Text>
            </View>
            <View style={styles.selfPreview}>
              <Icon name="account" size={28} color="#FFFFFF" />
            </View>
          </View>
        ) : (
          <View style={styles.voiceAvatar}>
            <Text style={styles.voiceAvatarText}>{getInitials(contactName)}</Text>
          </View>
        )}

        <Text style={styles.contactName}>{contactName}</Text>
        <Text style={styles.callStatus}>{callStatus}</Text>
      </View>

      {isIncoming ? (
        <View style={styles.controls}>
          <Animated.View style={{ transform: [{ scale: incomingPulse }] }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Reject call"
              style={[styles.controlButton, styles.endCallButton]}
              onPress={rejectCall}
            >
              <Icon name="phone-hangup" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: incomingPulse }] }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Accept call"
              style={[styles.controlButton, styles.acceptCallButton]}
              onPress={acceptCall}
            >
              <Icon name="phone" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : (
        <View style={styles.controls}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Icon name={isMuted ? 'microphone-off' : 'microphone'} size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isSpeakerOn ? 'Turn speaker off' : 'Turn speaker on'}
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            onPress={() => setIsSpeakerOn(prev => !prev)}
          >
            <Icon name="volume-high" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          {isVideoCall ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
              style={[styles.controlButton, !isCameraOn && styles.controlButtonActive]}
              onPress={() => setIsCameraOn(prev => !prev)}
            >
              <Icon name={isCameraOn ? 'video' : 'video-off'} size={26} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="End call"
            style={[styles.controlButton, styles.endCallButton]}
            onPress={() => finishCall(true)}
          >
            <Icon name="phone-hangup" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.brandDark,
    justifyContent: 'space-between',
  },
  videoContainer: {
    backgroundColor: '#101828',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  voiceAvatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: WHATSAPP_COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  voiceAvatarText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
  },
  videoStage: {
    ...StyleSheet.absoluteFillObject,
  },
  remoteVideo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#182230',
  },
  videoInitials: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 72,
    fontWeight: '800',
  },
  selfPreview: {
    position: 'absolute',
    top: 24,
    right: 20,
    width: 96,
    height: 138,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  callStatus: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  controlButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  acceptCallButton: {
    backgroundColor: WHATSAPP_COLORS.accent,
  },
  endCallButton: {
    backgroundColor: WHATSAPP_COLORS.danger,
  },
});

export default CallScreen;
