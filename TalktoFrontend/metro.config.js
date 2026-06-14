const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const watchFolders = [path.resolve(projectRoot, 'node_modules')];

const config = {
  projectRoot,
  watchFolders,
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
