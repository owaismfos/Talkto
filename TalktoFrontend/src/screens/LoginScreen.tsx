import React, { useState } from 'react';
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import * as Keychain from 'react-native-keychain';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Image
} from 'react-native';

import api from '../services/api';

const getLoginErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (detail) {
      return JSON.stringify(detail);
    }
    return error.response
      ? `Server returned ${error.response.status}`
      : error.message;
  }

  return error instanceof Error ? error.message : 'Unexpected login error';
};

const LoginScreen = ({ navigation, onLoginSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleLogin = async () => {
    if (phoneNumber === '' || password === '') {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = await DeviceInfo.getDeviceName();
      console.log('Device ID:', deviceId);
      console.log('Device Name:', deviceName);
      try {
      const response = await api.post('/auth/login', 
        {
          phone_number: phoneNumber,           // Matches Pydantic 'email'
          password: password,     // Matches Pydantic 'password'
          device_id: deviceId,     // Matches Pydantic 'device_id'
          device_name: deviceName, // Matches Pydantic 'device_name'
          fcm_token: 'dummy_fcm_token' // Optional: Add if your backend expects it
        }
      );
      console.log('Login response status:', response.status);
      // const responseText = await response.text();
      // console.log('Login response text:', responseText);

      const result = response.data
      console.log('Login response data:', result);
      // Store the tokens securely using Keychain
      await Keychain.setGenericPassword('session', JSON.stringify({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        userId: result.user_id,
      }));

      if (onLoginSuccess) {
        await onLoginSuccess();
      }
      } catch (error) {
        const message = getLoginErrorMessage(error);
        Alert.alert('Login Failed', message);
        console.error('Login error:', message, error);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Connection to server failed');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Talkto</Text>
      <View style={styles.phoneInputWrapper}>
        {/* Hardcoded Country Section */}
        <View style={styles.countryPicker}>
          {/* <Text style={styles.flagText}>🇮🇳</Text> */}
          <Image 
                source={require('../assets/indian-flag.webp')} 
                style={styles.flagImage} 
          />
          <Text style={styles.countryCode}>+91</Text>
        </View>

        {/* Mobile Number Input */}
        <TextInput
          placeholder="Mobile Number"
          style={styles.mobileInput}
          placeholderTextColor="#999"
          keyboardType="phone-pad" // Shows numeric keypad
          value={phoneNumber} // Using your existing 'email' state variable
          onChangeText={text => setPhoneNumber(text)}
          maxLength={10} // Limits to 10 digits
        />
      </View>
      <View style={styles.passwordWrapper}>
        <TextInput
          placeholder="Password"
          style={styles.passwordInput}
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          // This flips between true (dots) and false (plain text)
          secureTextEntry={!passwordVisible}
        />

        <TouchableOpacity
          onPress={() => setPasswordVisible(!passwordVisible)}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>
            {passwordVisible ? 'HIDE' : 'SHOW'}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#fff',
  },
  logo: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#075E54',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 20,
    padding: 10,
    fontSize: 16,
    color: '#000000', // 👈 Change this to solid black to be 100% sure
    backgroundColor: 'transparent', // Ensure no white-on-white overlap
  },
  button: {
    backgroundColor: '#075E54',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  phoneInputWrapper: {
    flexDirection: 'row', // Lays children out horizontally
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 20,
  },
  flagImage: {
    width: 30,          // Set specific width
    height: 20,         // Set specific height
    borderRadius: 2,    // Optional: slight rounded corners
    marginRight: 8,
    resizeMode: 'contain', // Ensures the flag doesn't look stretched
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    borderRightWidth: 1, // Vertical line separator
    borderRightColor: '#eee',
    height: '60%', // Line height
    marginRight: 10,
  },
  flagText: {
    fontSize: 20,
    marginRight: 5,
  },
  countryCode: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  mobileInput: {
    flex: 1, // Takes up the remaining width
    padding: 10,
    fontSize: 16,
    color: '#000',
  },

  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 25,
  },
  passwordInput: {
    flex: 1, // Takes up all space except for the "Show" button
    padding: 10,
    fontSize: 16,
    color: '#000',
  },
  toggleButton: {
    padding: 10,
  },
  toggleText: {
    color: '#075E54', // Match your app theme color
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default LoginScreen;
