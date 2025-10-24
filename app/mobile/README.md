# MyPal Mobile

MyPal Mobile is a React Native application that brings the MyPal AI Companion experience to iOS and Android devices. It features an embedded Node.js backend running locally on your device for complete offline functionality.

## Features

- ✅ **Offline-First**: All data stored locally on your device with embedded Node.js backend
- ✅ **Multi-Profile Support**: Create and manage multiple MyPal companions
- ✅ **Developmental Stages**: MyPal grows from babbling to complex conversations
- ✅ **Statistics Tracking**: Monitor XP, level, personality traits, and cognitive development
- ✅ **Neural Network Visualization**: View MyPal's knowledge structure
- ✅ **Privacy-First**: No data sent to external servers unless explicitly enabled
- ✅ **Cross-Platform**: Works on both iOS (14+) and Android (API 34+)

## Technology Stack

- **React Native**: 0.76.6
- **TypeScript**: 5.0.4
- **React Navigation**: 6.x (Stack, Bottom Tabs)
- **React Native Paper**: 5.x (Material Design 3)
- **Redux Toolkit**: State management
- **nodejs-mobile-react-native**: Embedded Node.js backend
- **Express**: Backend API framework

## Prerequisites

### For All Platforms
- Node.js 18+ (LTS recommended)
- npm or yarn package manager
- React Native CLI: `npm install -g react-native-cli`

### For Android Development
- Android Studio with SDK 34+
- Android SDK Build Tools
- Android Emulator or physical device with USB debugging enabled
- Java Development Kit (JDK) 17

### For iOS Development (macOS only)
- Xcode 14+ with Command Line Tools
- CocoaPods: `sudo gem install cocoapods`
- iOS 14+ deployment target
- iOS Simulator or physical device

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/ScottyVenable/MyPal.git
   cd MyPal/app/mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install iOS dependencies** (macOS only):
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Install embedded backend dependencies**:
   ```bash
   cd nodejs-assets/nodejs-project && npm install && cd ../..
   ```

## Running the App

### Android

1. Start an Android emulator or connect a physical device
2. Run the app:
   ```bash
   npm run android
   ```

The app will build and launch on your device/emulator. The embedded Node.js backend starts automatically.

### iOS (macOS only)

1. Open iOS Simulator or connect a physical iOS device
2. Run the app:
   ```bash
   npm run ios
   ```

For physical devices, you'll need to configure code signing in Xcode.

### Development Mode

To start the Metro bundler separately:
```bash
npm start
```

Then press 'a' for Android or 'i' for iOS.

## Project Structure

```
mobile/
├── App.tsx                          # Main app entry point
├── src/
│   ├── components/                  # Reusable UI components
│   ├── screens/                     # Screen components
│   │   ├── ProfileSelectionScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   ├── BrainScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/                    # Business logic
│   │   └── BackendService.ts        # API communication
│   ├── store/                       # Redux state management
│   │   ├── index.ts
│   │   ├── profileSlice.ts
│   │   ├── chatSlice.ts
│   │   └── statsSlice.ts
│   ├── types/                       # TypeScript definitions
│   │   ├── index.ts
│   │   └── navigation.ts
│   ├── hooks/                       # Custom React hooks
│   └── utils/                       # Utility functions
├── nodejs-assets/
│   └── nodejs-project/              # Embedded Node.js backend
│       ├── src/
│       │   └── main.js              # Backend server
│       ├── models/                  # AI model files (future)
│       ├── data/                    # Local data storage
│       └── package.json
├── android/                         # Android native code
├── ios/                             # iOS native code
└── package.json
```

## Key Screens

### Profile Selection
Create, select, and manage multiple MyPal profiles. Each profile maintains its own conversation history and developmental progress.

### Chat
Interactive chat interface where you converse with MyPal. Messages help MyPal learn and grow through developmental stages.

### Stats
View detailed statistics including:
- Current level and XP progress
- Total messages and words learned
- Personality traits (Curious, Logical, Social, Agreeable, Cautious)
- Cognitive lobes (Language, Logic, Emotion, Memory)

### Brain
Visualize MyPal's neural network showing concepts and their relationships. View the number of nodes and connections in MyPal's knowledge graph.

### Settings
Configure app preferences, export data, and manage MyPal's state.

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production

#### Android APK
```bash
cd android
./gradlew assembleRelease
# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

#### iOS (macOS only)
1. Open `ios/MyPalMobile.xcworkspace` in Xcode
2. Select Product > Archive
3. Follow the signing and distribution process

## Troubleshooting

### Metro Bundler Issues
```bash
# Clear cache and restart
npm start -- --reset-cache
```

### Android Build Failures
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### iOS Build Failures
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Backend Not Starting
The embedded Node.js backend should start automatically. Check logs in your device's console for any errors.

## Known Limitations

1. **Neural Network Visualization**: Currently shows basic node/edge information. Full 3D visualization planned for future release.
2. **AI Model**: Uses simplified response logic. Future versions will support local LLM models.
3. **Data Persistence**: Currently uses in-memory storage. SQLite integration planned.
4. **Background Processing**: Limited background processing capabilities on iOS due to platform restrictions.

## Future Enhancements

- [ ] SQLite database for persistent local storage
- [ ] Local LLM integration (GGML/ONNX models)
- [ ] Full 3D neural network visualization
- [ ] Voice input/output support
- [ ] Cloud sync (optional, opt-in)
- [ ] Push notifications for reminders
- [ ] Widget support for quick access
- [ ] Dark mode theme
- [ ] Advanced statistics and analytics

## Privacy & Security

MyPal Mobile is designed with privacy as a top priority:

- ✅ All data stored locally on your device
- ✅ No internet connection required for core functionality
- ✅ No telemetry or analytics unless explicitly enabled
- ✅ Full data export available
- ✅ Complete data deletion with reset function

## Contributing

See the main repository README for contribution guidelines. Mobile-specific contributions should:

1. Follow React Native and TypeScript best practices
2. Test on both iOS and Android
3. Maintain offline-first architecture
4. Ensure privacy-first design principles

## License

TBD - See main repository for license information.

## Support

For issues, questions, or feature requests, please visit the main repository:
https://github.com/ScottyVenable/MyPal

---

**MyPal Mobile** - *Growing Together, One Word at a Time* 🌱
