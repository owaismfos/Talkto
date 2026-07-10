import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_RINGTONE_KEY = 'talkto:selectedRingtone';

export const getSelectedRingtone = async () => {
  const value = await AsyncStorage.getItem(SELECTED_RINGTONE_KEY);
  return value ?? 'default';
};

export const setSelectedRingtone = async (value: string) => {
  await AsyncStorage.setItem(SELECTED_RINGTONE_KEY, value);
};
