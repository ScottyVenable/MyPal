const path = require('path');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@': path.resolve(__dirname, 'src'),
          '@ai': path.resolve(__dirname, '..', 'ai'),
        },
      },
    ],
  ],
};
