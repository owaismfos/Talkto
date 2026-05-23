import { NativeModules, Platform } from 'react-native';

const API_PORT = 8000;
const LAN_API_HOST = '192.168.1.104';

const getDevServerHost = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  const host = scriptURL?.match(/^[^:]+:\/\/([^:/]+)/)?.[1];

  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return Platform.OS === 'android' ? LAN_API_HOST : 'localhost';
  }

  return host;
};

const API_HOST = __DEV__ && Platform.OS !== 'android'
  ? getDevServerHost()
  : LAN_API_HOST;

const CONFIG = {
  API_HOST,
  API_PORT,
  API_URL: `http://${API_HOST}:${API_PORT}`,
  WS_URL: `ws://${API_HOST}:${API_PORT}`,
};

export default CONFIG;
