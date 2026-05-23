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
