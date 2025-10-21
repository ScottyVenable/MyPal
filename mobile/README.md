# MyPal Mobile

React Native mobile application for MyPal - Your AI Companion. This app runs an embedded Node.js backend on your device and provides a native mobile interface.

## Architecture

- **Frontend**: React Native 0.73.2 with TypeScript
- **Backend**: Embedded Node.js via nodejs-mobile-react-native
- **UI Framework**: React Native Paper (Material Design)
- **Navigation**: React Navigation 6.x
- **Storage**: AsyncStorage for local persistence
- **Communication**: REST API + WebSockets for real-time updates

## Features

- 💬 **Chat Interface**: Natural conversation with your AI companion
- 👤 **Multi-Profile Support**: Create and manage multiple AI personalities
- 📊 **Statistics Dashboard**: Track level, XP, personality traits
- 🧠 **Neural Network Visualization**: See your AI's "brain" in action
- ⚙️ **Settings**: Configure server, theme, and app preferences
- 🔄 **Real-time Updates**: WebSocket-based neural event streaming
- 📴 **Offline-First**: Embedded backend runs entirely on-device

## Prerequisites

### General
- Node.js 18+ and npm
- Git

### iOS Development
- macOS with Xcode 14+
- CocoaPods (`sudo gem install cocoapods`)
- iOS Simulator or physical iOS device

### Android Development
- Android Studio with Android SDK
- Java Development Kit (JDK) 11+
- Android emulator or physical Android device
- Android SDK Platform 33 (Android 13)

## Installation

### 1. Clone and Navigate
```bash
cd mobile
```

### 2. Install Dependencies
```bash
npm install
```

This will:
- Install React Native and all JS dependencies
- Run `rn-nodeify` to set up Node.js polyfills
- Prepare nodejs-mobile-react-native

### 3. Install Backend Dependencies
```bash
cd nodejs-assets/nodejs-project
npm install
cd ../..
```

### 4. iOS Setup (macOS only)
```bash
cd ios
pod install
cd ..
```

### 5. Platform-Specific Configuration

#### iOS
The Xcode project is automatically configured by CocoaPods. You may need to:
- Open `ios/MyPal.xcworkspace` in Xcode
- Select your development team in Signing & Capabilities
- Build for your target device/simulator

#### Android
The Android project is pre-configured. Ensure:
- Android SDK Platform 33 is installed via Android Studio SDK Manager
- `ANDROID_HOME` environment variable is set
- You have an emulator set up or device connected

## Running the App

### iOS
```bash
npm run ios
```

Or specify a device:
```bash
npm run ios -- --simulator="iPhone 15 Pro"
```

### Android
```bash
npm run android
```

Make sure:
- An Android emulator is running, OR
- A physical device is connected with USB debugging enabled

### Development Mode
```bash
# Start Metro bundler separately (optional)
npm start

# In another terminal, run:
npm run ios
# or
npm run android
```

## Project Structure

```
mobile/
├── App.tsx                 # Main app component
├── index.js                # App entry point
├── app.json                # App configuration
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── babel.config.js         # Babel config
├── metro.config.js         # Metro bundler config
│
├── src/
│   ├── screens/            # Screen components
│   │   ├── ChatScreen.tsx
│   │   ├── ProfilesScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   ├── BrainScreen.tsx
│   │   └── SettingsScreen.tsx
│   │
│   ├── navigation/         # Navigation setup
│   │   └── AppNavigator.tsx
│   │
│   ├── services/           # API & WebSocket services
│   │   ├── api.ts
│   │   └── websocket.ts
│   │
│   ├── components/         # Reusable components
│   │
│   └── types/              # TypeScript types
│       └── index.ts
│
├── nodejs-assets/
│   └── nodejs-project/     # Embedded Node.js backend
│       ├── main.js         # Server entry point
│       └── package.json    # Backend dependencies
│
├── ios/                    # iOS native project
└── android/                # Android native project
```

## Backend Setup

**IMPORTANT**: The embedded Node.js backend (`nodejs-assets/nodejs-project/main.js`) currently contains a minimal placeholder server. You need to:

1. **Copy Your Backend Code**:
   ```bash
   # From the mobile/ directory
   cp -r ../app/backend/src/* nodejs-assets/nodejs-project/
   ```

2. **Adapt for Mobile**:
   - Update file paths to use React Native's document directory
   - Ensure `profileManager.js` and other modules are copied
   - Update `main.js` to import and start your full server
   - Test that all routes work in the mobile environment

3. **Update Dependencies**:
   ```bash
   cd nodejs-assets/nodejs-project
   npm install --save express body-parser cors ws
   # Add any other dependencies your backend needs
   cd ../..
   ```

## Configuration

### Server URL
By default, the app connects to `http://localhost:3001`. To change this:

1. Open the app
2. Go to Settings screen
3. Enter new server URL
4. Save and restart the app

### Data Storage
- Profile data stored in app's document directory
- Settings and cache stored in AsyncStorage
- All data persists between app launches

## Troubleshooting

### Metro Bundler Issues
```bash
# Clear Metro cache
npm start -- --reset-cache

# Or
npx react-native start --reset-cache
```

### iOS Pod Issues
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Android Build Issues
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Node.js Backend Not Starting
- Check logs in Metro terminal for "Node.js server started successfully"
- Verify `nodejs-assets/nodejs-project/main.js` exists
- Check that backend dependencies are installed
- Look for error messages in `rn_bridge.channel` listeners

### TypeScript Errors During Development
Expected during initial setup. Run `npm install` to resolve module imports.

### Connection Issues
- Ensure embedded backend is running (check logs)
- Verify server URL in Settings matches the embedded server port
- For external server testing, update API base URL in `src/services/api.ts`

## Development Workflow

1. **Make Changes**: Edit files in `src/`
2. **Hot Reload**: Changes auto-reload in simulator/device (React components only)
3. **Full Reload**: Press `R` in Metro terminal or shake device and select "Reload"
4. **Backend Changes**: Require app restart to reload Node.js code
5. **Native Changes**: Rebuild app with `npm run ios` or `npm run android`

## Building for Production

### iOS
```bash
# Open Xcode workspace
open ios/MyPal.xcworkspace

# Select "Generic iOS Device" or your device
# Product → Archive
# Follow App Store submission process
```

### Android
```bash
cd android
./gradlew assembleRelease
# APK output: android/app/build/outputs/apk/release/app-release.apk

# Or for AAB (Play Store):
./gradlew bundleRelease
# AAB output: android/app/build/outputs/bundle/release/app-release.aab
```

**Note**: Configure signing keys in `android/app/build.gradle` before release builds.

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint
```

## Known Limitations

- Embedded backend is single-threaded (JavaScript limitation)
- Large neural networks may impact mobile performance
- File I/O on mobile is slower than desktop
- Background processing limited by mobile OS

## Future Enhancements

- [ ] Push notifications for important events
- [ ] Widget support for quick interactions
- [ ] Siri/Google Assistant shortcuts
- [ ] iCloud/Google Drive backup
- [ ] Shared profiles across devices
- [ ] Voice input/output
- [ ] Offline mode improvements

## License

Same as main MyPal project.

## Support

For issues specific to the mobile app, check:
1. This README's troubleshooting section
2. React Native documentation: https://reactnative.dev/
3. nodejs-mobile-react-native docs: https://github.com/janeasystems/nodejs-mobile-react-native

## Contributing

1. Follow React Native and TypeScript best practices
2. Test on both iOS and Android before submitting
3. Update this README for any new setup steps
4. Keep embedded backend in sync with desktop version
