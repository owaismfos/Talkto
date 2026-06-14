/* global jest */

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');

  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(component => component),
    Directions: {},
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    TouchableOpacity: View,
    TouchableHighlight: View,
    TouchableNativeFeedback: View,
    TouchableWithoutFeedback: View,
    createNativeWrapper: jest.fn(component => component),
    GestureHandlerRootView: View,
  };
});

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('test-device-id')),
  getDeviceName: jest.fn(() => Promise.resolve('Test Device')),
}));

jest.mock('react-native-popup-menu', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    MenuProvider: ({ children }) => React.createElement(View, null, children),
    Menu: ({ children }) => React.createElement(View, null, children),
    MenuOptions: ({ children }) => React.createElement(View, null, children),
    MenuOption: ({ children }) => React.createElement(View, null, children),
    MenuTrigger: ({ children }) => React.createElement(View, null, children),
  };
});

jest.mock('@react-navigation/stack', () => {
  const React = require('react');

  return {
    createStackNavigator: () => {
      const Navigator = ({ children }) => React.createElement(React.Fragment, null, children);
      const Screen = ({ component: Component, children, initialParams }) => {
        const props = {
          navigation: {
            navigate: jest.fn(),
            goBack: jest.fn(),
            setOptions: jest.fn(),
            reset: jest.fn(),
          },
          route: { params: initialParams ?? {} },
        };

        if (typeof children === 'function') {
          return children(props);
        }

        return Component ? React.createElement(Component, props) : null;
      };

      return { Navigator, Screen };
    },
  };
});

jest.mock('@react-native-documents/picker', () => ({
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: jest.fn(() => false),
  pick: jest.fn(() => Promise.resolve([])),
  types: {
    images: 'image/*',
    video: 'video/*',
    audio: 'audio/*',
    pdf: 'application/pdf',
    plainText: 'text/plain',
    allFiles: '*/*',
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(() => Promise.resolve({ didCancel: true })),
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
}));

jest.mock('react-native-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  return props => React.createElement(View, props);
});

jest.mock('react-native-nitro-sound', () => ({
  startRecorder: jest.fn(() => Promise.resolve('file://test.m4a')),
  stopRecorder: jest.fn(() => Promise.resolve('file://test.m4a')),
  addRecordBackListener: jest.fn(),
  removeRecordBackListener: jest.fn(),
  startPlayer: jest.fn(() => Promise.resolve()),
  stopPlayer: jest.fn(() => Promise.resolve()),
  addPlayBackListener: jest.fn(),
  removePlayBackListener: jest.fn(),
  mmss: jest.fn(() => '00:00'),
}));

jest.mock('react-native-sound', () => {
  const Sound = jest.fn().mockImplementation((_name, _bundle, callback) => {
    if (callback) {
      callback(null);
    }
    return {
      setNumberOfLoops: jest.fn(),
      play: jest.fn(),
      stop: jest.fn(done => done && done()),
      release: jest.fn(),
    };
  });
  Sound.setCategory = jest.fn();
  Sound.MAIN_BUNDLE = 'MAIN_BUNDLE';
  return Sound;
});

jest.mock('react-native-webrtc', () => ({
  mediaDevices: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [],
      getAudioTracks: () => [],
    })),
  },
  MediaStream: jest.fn(),
  RTCIceCandidate: jest.fn(candidate => candidate),
  RTCPeerConnection: jest.fn().mockImplementation(() => ({
    addTrack: jest.fn(),
    addEventListener: jest.fn(),
    createOffer: jest.fn(() => Promise.resolve({ type: 'offer', sdp: '' })),
    createAnswer: jest.fn(() => Promise.resolve({ type: 'answer', sdp: '' })),
    setLocalDescription: jest.fn(() => Promise.resolve()),
    setRemoteDescription: jest.fn(() => Promise.resolve()),
    addIceCandidate: jest.fn(() => Promise.resolve()),
    close: jest.fn(),
  })),
  RTCSessionDescription: jest.fn(description => description),
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return props => React.createElement(Text, props, props.name ?? 'icon');
});
