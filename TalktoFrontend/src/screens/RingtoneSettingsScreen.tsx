import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import Sound from 'react-native-sound';
import { WHATSAPP_COLORS } from '../theme/colors';
import { getSelectedRingtone, setSelectedRingtone } from '../services/preferences';

interface RingtoneOption {
  id: string;
  label: string;
  value: string;
  description: string;
}

const ringtoneOptions: RingtoneOption[] = [
  { id: 'default', label: 'System / default', value: 'default', description: 'Use the phone default ringtone' },
  { id: 'classic', label: 'Classic tone', value: 'classic', description: 'Warm, familiar ringtone' },
  { id: 'soft', label: 'Soft tone', value: 'soft', description: 'Gentle and subtle' },
  { id: 'bright', label: 'Bright tone', value: 'bright', description: 'Clear and energetic' },
  { id: 'pulse', label: 'Pulse tone', value: 'pulse', description: 'Short upbeat ring' },
];

const RingtoneSettingsScreen = () => {
  const [selectedValue, setSelectedValue] = useState('default');
  const [isLoading, setIsLoading] = useState(true);
  const [previewingValue, setPreviewingValue] = useState<string | null>(null);
  const soundRef = useRef<Sound | null>(null);

  const loadSelection = useCallback(async () => {
    try {
      const stored = await getSelectedRingtone();
      setSelectedValue(stored || 'default');
    } catch (error) {
      console.log('Unable to load ringtone selection:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSelection();
    return () => {
      soundRef.current?.stop(() => {
        soundRef.current?.release();
        soundRef.current = null;
      });
    };
  }, [loadSelection]);

  const stopPreview = useCallback(() => {
    soundRef.current?.stop(() => {
      soundRef.current?.release();
      soundRef.current = null;
    });
    setPreviewingValue(null);
  }, []);

  const previewTone = useCallback((value: string) => {
    stopPreview();
    if (value === 'default') {
      setPreviewingValue(value);
      return;
    }

    const tone = value === 'classic' || value === 'soft' || value === 'bright' || value === 'pulse'
      ? 'incoming_call.wav'
      : value;

    const previewSound = new Sound(tone, Sound.MAIN_BUNDLE, error => {
      if (error) {
        console.log('Unable to preview ringtone:', error);
        Alert.alert('Preview unavailable', 'This ringtone could not be played on this device.');
        return;
      }

      previewSound.setNumberOfLoops(1);
      previewSound.play(() => {
        previewSound.release();
        setPreviewingValue(null);
      });
      soundRef.current = previewSound;
      setPreviewingValue(value);
    });
  }, [stopPreview]);

  const chooseCustomRingtone = useCallback(async () => {
    try {
      const [result] = await pick({ type: [types.audio] });
      if (!result?.uri) {
        return;
      }

      const fileUri = result.uri;
      await setSelectedRingtone(fileUri);
      setSelectedValue(fileUri);
      stopPreview();
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      console.log('Unable to pick custom ringtone:', error);
      Alert.alert('Audio unavailable', 'Could not select a custom ringtone from this device.');
    }
  }, [stopPreview]);

  const selectRingtone = useCallback(async (value: string) => {
    setSelectedValue(value);
    await setSelectedRingtone(value);
    previewTone(value);
  }, [previewTone]);

  const currentLabel = useMemo(() => {
    if (selectedValue === 'default') {
      return 'System / default';
    }
    const match = ringtoneOptions.find(item => item.value === selectedValue);
    if (match) {
      return match.label;
    }
    return 'Custom audio';
  }, [selectedValue]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Ringtone</Text>
        <Text style={styles.heroText}>Choose how your phone announces an incoming call. You can preview each tone before saving it.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.selectedLabel}>Current selection</Text>
        <Text style={styles.selectedValue}>{currentLabel}</Text>
      </View>

      {isLoading ? <ActivityIndicator color={WHATSAPP_COLORS.brand} style={{ marginTop: 8 }} /> : null}

      {ringtoneOptions.map(option => {
        const isSelected = selectedValue === option.value;
        const isPreviewing = previewingValue === option.value;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.optionRow, isSelected && styles.optionRowActive]}
            onPress={() => selectRingtone(option.value)}
          >
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <View style={styles.optionActions}>
              <Text style={[styles.optionBadge, isSelected && styles.optionBadgeActive]}>{isSelected ? 'Selected' : 'Preview'}</Text>
              {isPreviewing ? <Text style={styles.previewingText}>Playing</Text> : null}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={styles.customButton} onPress={chooseCustomRingtone}>
        <Text style={styles.customButtonText}>Choose custom MP3 from device</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.stopButton} onPress={stopPreview}>
        <Text style={styles.stopButtonText}>Stop preview</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHATSAPP_COLORS.surface },
  content: { padding: 20, paddingBottom: 32, gap: 12 },
  hero: {
    backgroundColor: WHATSAPP_COLORS.brand,
    borderRadius: 22,
    padding: 16,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  heroText: { color: 'rgba(255,255,255,0.84)', fontSize: 13, lineHeight: 20, marginTop: 6 },
  selectedCard: {
    backgroundColor: WHATSAPP_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    padding: 14,
  },
  selectedLabel: { color: WHATSAPP_COLORS.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  selectedValue: { color: WHATSAPP_COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  optionRow: {
    backgroundColor: WHATSAPP_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionRowActive: {
    borderColor: WHATSAPP_COLORS.brand,
    shadowColor: WHATSAPP_COLORS.brand,
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  optionBody: { flex: 1, paddingRight: 8 },
  optionTitle: { color: WHATSAPP_COLORS.text, fontSize: 15, fontWeight: '700' },
  optionDescription: { color: WHATSAPP_COLORS.muted, fontSize: 12, marginTop: 3 },
  optionActions: { alignItems: 'flex-end', gap: 4 },
  optionBadge: {
    backgroundColor: WHATSAPP_COLORS.accentSoft,
    color: WHATSAPP_COLORS.brand,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  optionBadgeActive: {
    backgroundColor: WHATSAPP_COLORS.accentLight,
    color: WHATSAPP_COLORS.brand,
  },
  previewingText: { color: WHATSAPP_COLORS.brand, fontSize: 11, fontWeight: '700' },
  customButton: {
    backgroundColor: WHATSAPP_COLORS.brand,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  customButtonText: { color: '#FFFFFF', fontWeight: '800' },
  stopButton: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.card,
  },
  stopButtonText: { color: WHATSAPP_COLORS.text, fontWeight: '700' },
});

export default RingtoneSettingsScreen;
