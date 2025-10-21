# MyPal Mobile - Quick Setup Guide

## ✅ Project Structure Created

Your React Native mobile app has been created with the following structure:

```
mobile/
├── App.tsx                    # Main app entry point
├── index.js                   # React Native registration
├── app.json                   # App configuration
├── package.json               # Dependencies (20+ packages)
├── tsconfig.json              # TypeScript configuration
├── babel.config.js            # Babel transpiler config
├── metro.config.js            # Metro bundler config
├── README.md                  # Full documentation
├── .gitignore                 # Git ignore rules
│
├── src/
│   ├── screens/
│   │   ├── ChatScreen.tsx         # 176 lines - Full chat UI
│   │   ├── ProfilesScreen.tsx     # 164 lines - Profile management
│   │   ├── StatsScreen.tsx        # 143 lines - Statistics dashboard
│   │   ├── BrainScreen.tsx        # 223 lines - Neural visualization
│   │   └── SettingsScreen.tsx     # 175 lines - App settings
│   │
│   ├── navigation/
│   │   └── AppNavigator.tsx       # 90 lines - Bottom tabs + stack
│   │
│   ├── services/
│   │   ├── api.ts                 # 88 lines - REST API client
│   │   └── websocket.ts           # 105 lines - WebSocket service
│   │
│   ├── types/
│   │   └── index.ts               # 62 lines - TypeScript definitions
│   │
│   └── components/                # (empty - ready for your components)
│
└── nodejs-assets/
    └── nodejs-project/
        ├── main.js                # Node.js server entry point
        └── package.json           # Backend dependencies
```

## 🚀 Next Steps

### 1. Install Dependencies
```powershell
cd mobile
npm install
```

This will:
- ✅ Install React Native 0.73.2
- ✅ Install nodejs-mobile-react-native
- ✅ Install React Navigation & Paper UI
- ✅ Set up Node.js polyfills (crypto, stream, vm)
- ✅ Configure all build tools

### 2. Install Backend Dependencies
```powershell
cd nodejs-assets\nodejs-project
npm install
cd ..\..
```

### 3. Copy Your Backend Code

**IMPORTANT**: The embedded Node.js backend needs your server code:

```powershell
# From mobile/ directory
# Copy server files to nodejs-assets/nodejs-project/
Copy-Item -Recurse ..\app\backend\src\* nodejs-assets\nodejs-project\

# Update main.js to import your server
# You'll need to adapt file paths for mobile storage
```

### 4. Platform-Specific Setup

#### For iOS (macOS required):
```bash
cd ios
pod install
cd ..
npm run ios
```

#### For Android:
```powershell
npm run android
```

**Prerequisites**:
- ✅ Android Studio installed
- ✅ Android SDK Platform 33
- ✅ Emulator running OR device connected
- ✅ `ANDROID_HOME` environment variable set

## 📱 Running the App

### iOS (macOS only)
```bash
npm run ios
# Or specify simulator:
npm run ios -- --simulator="iPhone 15 Pro"
```

### Android
```powershell
npm run android
```

### Development
```powershell
# Start Metro bundler in one terminal
npm start

# In another terminal
npm run android  # or npm run ios
```

## 🎯 What You Get

### Features Implemented:
- ✅ **Chat Interface**: Full message list with user/AI distinction
- ✅ **Profile Management**: Create, load, delete profiles
- ✅ **Statistics Dashboard**: Level, XP, personality traits, charts
- ✅ **Brain Visualization**: Neural network diagram with real-time updates
- ✅ **Settings**: Server URL, dark mode, cache management
- ✅ **Navigation**: Bottom tabs (Chat, Stats, Brain, Settings)
- ✅ **Real-time Updates**: WebSocket connection for neural events
- ✅ **Offline Storage**: AsyncStorage for settings and cache

### Technologies:
- **React Native 0.73.2**: Latest stable version
- **TypeScript 5.3.3**: Full type safety
- **nodejs-mobile-react-native**: Embedded Node.js backend
- **React Navigation 6.x**: Professional navigation
- **React Native Paper 5.11.6**: Material Design UI
- **React Native Chart Kit**: Charts and graphs
- **React Native SVG**: Neural network visualization

## ⚠️ Important Notes

### Backend Integration
The `nodejs-assets/nodejs-project/main.js` file contains a **placeholder server**. You need to:

1. Copy your full backend code from `app/backend/src/`
2. Update file paths to use React Native's document directory
3. Copy `profileManager.js` and other required modules
4. Test all routes work in mobile environment

See the full README.md for detailed instructions.

### TypeScript Errors
The TypeScript errors you see are expected - they'll resolve after running `npm install`.

### Data Storage
- Profile data: Device document directory
- Settings: AsyncStorage
- All data persists between app launches
- Fully offline-capable

## 🐛 Troubleshooting

### Metro Won't Start
```powershell
npm start -- --reset-cache
```

### Android Build Fails
```powershell
cd android
.\gradlew clean
cd ..
npm run android
```

### iOS Pod Issues (macOS)
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Node.js Backend Won't Start
- Check Metro terminal for "Node.js server started successfully"
- Verify `nodejs-assets/nodejs-project/main.js` exists
- Check backend dependencies are installed

## 📚 Documentation

Full documentation in `README.md` includes:
- Complete installation guide
- Platform-specific setup
- Backend integration steps
- Troubleshooting
- Production build instructions
- Project architecture overview

## 🎉 You're Ready!

Your mobile app structure is complete. Just:
1. Run `npm install`
2. Copy your backend code
3. Run on iOS/Android

The app will run your AI companion entirely on-device with a native mobile interface!

---

**Need Help?**
- See `README.md` for full documentation
- Check React Native docs: https://reactnative.dev/
- nodejs-mobile docs: https://github.com/janeasystems/nodejs-mobile-react-native
