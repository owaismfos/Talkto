import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { type AppThemeColors } from '../theme/colors';
import Contacts from 'react-native-contacts';

const AddContactScreen = ({ navigation, route }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [number, setNumber] = useState(route?.params?.phoneNumber ?? '');
  const [nickname, setNickname] = useState(route?.params?.initialName ?? '');
  const [isValidUser, setIsValidUser] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const checkUser = async (value: string) => {
    const sanitizedValue = value.replace(/\s/g, '');
    setNumber(sanitizedValue);
    if (sanitizedValue.length < 10) {
      setIsValidUser(false);
      return;
    }

    setChecking(true);
    try {
      const res = await api.get(`/check-user?phone=${encodeURIComponent(sanitizedValue)}`);
      setIsValidUser(!!res.data.exists);
    } catch (err) {
      console.log('Error checking user:', err);
      setIsValidUser(false);
      Alert.alert('Could not check user', 'Please try again when the server is reachable.');
    } finally {
      setChecking(false);
    }
  };

  const addContact = async () => {
    setIsAdding(true);
    try {
      await api.post('/contacts', {
        contact_number: number,
        nickname,
      });
      navigation.goBack();
    } catch (err) {
      console.log(err);
      Alert.alert('Contact not added', 'Could not save this contact on the server.');
    } finally {
      setIsAdding(false);
    }
  };

  const loadDeviceContacts = async () => {
    setIsLoadingContacts(true);
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          setDeviceContacts([]);
          return;
        }
      }

      const contacts = await Contacts.getAll();
      setDeviceContacts(contacts.slice(0, 12));
    } catch (err) {
      console.log(err);
      Alert.alert('Contacts unavailable', 'Could not read contacts from your phone.');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  useEffect(() => {
    loadDeviceContacts();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (number || nickname) {
        Alert.alert('Discard changes', 'Going back now will remove this draft contact.', [
          { text: 'Cancel', onPress: () => null, style: 'cancel' },
          { text: 'Discard', onPress: () => navigation.goBack(), style: 'destructive' },
        ]);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation, nickname, number]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Add a new contact</Text>
        <Text style={styles.heroText}>Pick from your phone contacts or enter a number manually.</Text>
      </View>

      <Text style={styles.label}>Phone number</Text>
      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        value={number}
        onChangeText={checkUser}
        placeholder="Enter mobile number"
        placeholderTextColor="#98A2B3"
      />

      {checking ? <Text style={styles.helper}>Checking account availability...</Text> : null}
      {!checking && number.length >= 10 ? (
        <Text style={[styles.helper, { color: isValidUser ? colors.accent : colors.danger }]}>
          {isValidUser ? 'User found' : 'No matching user found'}
        </Text>
      ) : null}

      <Text style={styles.label}>Nickname</Text>
      <TextInput
        style={styles.input}
        value={nickname}
        onChangeText={setNickname}
        placeholder="How should this contact appear?"
        placeholderTextColor="#98A2B3"
      />

      <Text style={styles.label}>Phone contacts</Text>
      {isLoadingContacts ? <Text style={styles.helper}>Loading contacts...</Text> : null}
      {deviceContacts.map(contact => {
        const phoneNumber = contact.phoneNumbers?.[0]?.number;
        if (!phoneNumber) {
          return null;
        }

        return (
          <TouchableOpacity
            key={`${contact.recordID}-${phoneNumber}`}
            style={styles.contactOption}
            onPress={() => {
              setNumber(phoneNumber.replace(/\D/g, ''));
              setNickname(contact.displayName || contact.givenName || 'Contact');
              checkUser(phoneNumber.replace(/\D/g, ''));
            }}
          >
            <Text style={styles.contactOptionTitle}>{contact.displayName || contact.givenName || 'Contact'}</Text>
            <Text style={styles.contactOptionSubtitle}>{phoneNumber}</Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.button, (!isValidUser || !nickname || checking || isAdding) && styles.buttonDisabled]}
        onPress={addContact}
        disabled={!isValidUser || !nickname || checking || isAdding}
      >
        {isAdding ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Add Contact</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  hero: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginVertical: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    color: colors.text,
  },
  helper: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 13,
  },
  button: {
    marginTop: 28,
    backgroundColor: colors.brand,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  contactOption: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  contactOptionTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  contactOptionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },
});

export default AddContactScreen;
