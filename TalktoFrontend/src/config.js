import { NativeModules, Platform } from 'react-native';

const API_PORT = 8000;
const DEFAULT_API_PROTOCOL = 'http';
const DEFAULT_API_HOST = '192.168.1.102';
const EMULATOR_API_HOST = '10.0.2.2';
const PROD_API_BASE_URL = 'https://api.talkto.mfos.store';

const normalizeUrl = (value) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed;
};

const getRuntimeOverride = () => {
  if (typeof global !== 'undefined') {
    const override =
      global?.APP_CONFIG?.API_BASE_URL ||
      global?.APP_CONFIG?.API_URL ||
      global?.__APP_API_BASE_URL__ ||
      global?.__APP_API_URL__;

    if (override) {
      return normalizeUrl(override);
    }
  }

  if (typeof process !== 'undefined') {
    const override = process.env?.API_BASE_URL || process.env?.API_URL;
    if (override) {
      return normalizeUrl(override);
    }
  }

  return null;
};

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

const API_BASE_URL = getRuntimeOverride() || (() => {
  const runtimeHost = getRuntimeOverrideHost();
  if (runtimeHost) {
    return `${DEFAULT_API_PROTOCOL}://${runtimeHost}:${API_PORT}`;
  }

  if (!__DEV__) {
    return PROD_API_BASE_URL;
  }

  return `${DEFAULT_API_PROTOCOL}://${getDevServerHost()}:${API_PORT}`;
})();

const WS_URL = (() => {
  const wsProtocol = API_BASE_URL.startsWith('https://') ? 'wss' : 'ws';
  return `${wsProtocol}://${API_BASE_URL.replace(/^https?:\/\//, '')}`;
})();

const CONFIG = {
  API_HOST: API_BASE_URL.replace(/^https?:\/\//, '').replace(/:\d+$/, ''),
  API_PORT,
  API_URL: API_BASE_URL,
  WS_URL,
};

export default CONFIG;
