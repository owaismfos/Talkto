import { NativeModules, Platform } from 'react-native';

const API_PORT = 8000;
const DEFAULT_API_HOST = '192.168.1.102';
const EMULATOR_API_HOST = '10.0.2.2';

const getRuntimeOverrideHost = () => {
  if (typeof global !== 'undefined') {
    const override = global?.APP_CONFIG?.API_HOST || global?.__APP_API_HOST__;
    if (override) {
      return override;
    }
  }

  if (typeof process !== 'undefined' && process.env?.API_HOST) {
    return process.env.API_HOST;
  }

  return null;
};

const getDevServerHost = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  const host = scriptURL?.match(/^[^:]+:\/\/([^:/]+)/)?.[1];

  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return Platform.OS === 'android' ? EMULATOR_API_HOST : 'localhost';
  }

  return host;
};

const API_HOST = getRuntimeOverrideHost() || (__DEV__ ? getDevServerHost() : DEFAULT_API_HOST);

const CONFIG = {
  API_HOST,
  API_PORT,
  API_URL: `http://${API_HOST}:${API_PORT}`,
  WS_URL: `ws://${API_HOST}:${API_PORT}`,
};

export default CONFIG;
