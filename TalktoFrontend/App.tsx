import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { MenuProvider } from 'react-native-popup-menu';

import * as Keychain from 'react-native-keychain';
import { socketService } from './src/services/SocketService';
import { navigate, navigationRef } from './src/services/NavigationService';
import { ThemeProvider } from './src/contexts/ThemeContext';


const App = () => {
  // App.tsx or inside your Auth Logic
  useEffect(() => {
    const checkUser = async () => {
      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        const session = JSON.parse(credentials.password);
        // Connect to the socket ONCE here
        socketService.connect(session.userId); 
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    const unsubscribe = socketService.subscribe((data) => {
      if (data.action === 'call_invite') {
        navigate('Call', {
          contactId: data.sender_id,
          contactName: data.caller_name ?? 'Incoming call',
          callType: data.call_type ?? 'voice',
          mode: 'incoming',
        });
      }
    });

    return unsubscribe;
  }, []);

  return (
    <ThemeProvider>
      <MenuProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </MenuProvider>
    </ThemeProvider>
  );
};

export default App;
