import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Keychain from 'react-native-keychain';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import CallScreen from '../screens/CallScreen';
import AddContactScreen from '../screens/AddContactScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ArchivedChatsScreen from '../screens/ArchivedChatsScreen';
import NewChatScreen from '../screens/NewChatScreen';
import NewCallScreen from '../screens/NewCallScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RingtoneSettingsScreen from '../screens/RingtoneSettingsScreen';
import ThemeSettingsScreen from '../screens/ThemeSettingsScreen';
import { socketService } from '../services/SocketService';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createStackNavigator();

const BackButton = ({ navigation }: { navigation: any }) => (
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
    <Text style={styles.backButtonText}>Back</Text>
  </TouchableOpacity>
);

export const AppNavigator = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const { colors } = useTheme();

  const syncAuthState = useCallback(async () => {
    const credentials = await Keychain.getGenericPassword();
    if (credentials) {
      const session = JSON.parse(credentials.password);
      socketService.connect(session.userId);
      setIsLoggedIn(true);
      return;
    }

    socketService.disconnect();
    setIsLoggedIn(false);
  }, []);

  useEffect(() => {
    syncAuthState();
  }, [syncAuthState]);

  const handleLogout = useCallback(async () => {
    socketService.disconnect();
    setIsLoggedIn(false);
  }, []);

  if (isLoggedIn === null) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { 
          backgroundColor: colors.brand,
          height: 50,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      {!isLoggedIn ? (
        <Stack.Screen name="Login" options={{ headerShown: false }}>
          {props => <LoginScreen {...props} onLoginSuccess={syncAuthState} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen name="Home" options={{ headerShown: false }}>
            {props => <HomeScreen {...props} onLogout={handleLogout} />}
          </Stack.Screen>
          <Stack.Screen
            name="ChatDetail"
            component={ChatDetailScreen}
            options={{}}
          />
          <Stack.Screen
            name="Call"
            component={CallScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddContact"
            component={AddContactScreen}
            options={({ navigation }) => ({
              title: 'Add Contact',
              headerLeft: () => <BackButton navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="Contacts"
            component={ContactsScreen}
            options={({ navigation }) => ({
              title: 'Contacts',
              headerLeft: () => <BackButton navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="ArchivedChats"
            component={ArchivedChatsScreen}
            options={({ navigation }) => ({
              title: 'Archived',
              headerLeft: () => <BackButton navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="NewChat"
            component={NewChatScreen}
            options={({ navigation }) => ({
              title: 'New Chat',
              headerLeft: () => <BackButton navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="NewCall"
            component={NewCallScreen}
            options={({ navigation }) => ({
              title: 'New Call',
              headerLeft: () => <BackButton navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="Settings"
            options={({ navigation }) => ({
              title: 'Settings',
              headerLeft: () => <BackButton navigation={navigation} />,
            })}
          >
            {props => <SettingsScreen {...props} onLogout={handleLogout} />}
          </Stack.Screen>
          <Stack.Screen
            name="YourContacts"
            component={ContactsScreen}
            options={({ navigation }) => ({
              title: 'Your Contacts',
              headerLeft: () => <BackButton navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="RingtoneSettings"
            component={RingtoneSettingsScreen}
            options={({ navigation }) => ({
              title: 'Ringtone',
              headerLeft: () => <BackButton navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="ThemeSettings"
            component={ThemeSettingsScreen}
            options={({ navigation }) => ({
              title: 'Theme',
              headerLeft: () => <BackButton navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={({ navigation }) => ({
              title: 'Profile',
              headerLeft: () => <BackButton navigation={navigation} />,
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginLeft: 14,
    paddingVertical: 8,
    paddingRight: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
