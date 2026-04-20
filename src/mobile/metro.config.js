const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const aiEnginePath = path.resolve(__dirname, '..', 'ai');

const config = {
  watchFolders: [aiEnginePath],
  resolver: {
    extraNodeModules: {
      '@ai': aiEnginePath,
    },
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
