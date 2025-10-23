# MyPal Mobile - Quick Start Guide

This guide will help you get MyPal Mobile running on your device in just a few minutes.

## Prerequisites Check

Before starting, ensure you have:

- ✅ Node.js 18+ installed (`node --version`)
- ✅ npm or yarn package manager
- ✅ For Android: Android Studio with SDK 34+
- ✅ For iOS: macOS with Xcode 14+ (iOS development requires macOS)

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
cd app/mobile
npm install
```

**Note**: This will also install the embedded Node.js backend dependencies automatically via the postinstall script.

### 2. Platform-Specific Setup

#### Android
Ensure you have an Android emulator running or a device connected:
```bash
# Check connected devices
adb devices
```

#### iOS (macOS only)
Install CocoaPods dependencies:
```bash
cd ios
pod install
cd ..
```

### 3. Run the App

#### Android
```bash
npm run android
```

#### iOS
```bash
npm run ios
```

The app will build and launch on your device/emulator. The embedded Node.js backend starts automatically!

## First Time Setup

When you first open the app:

1. **Profile Selection Screen**: Create a new profile by tapping "Create New Profile"
2. **Enter a Name**: Give your MyPal companion a name
3. **Start Chatting**: You'll be taken to the Chat screen where you can start interacting

## Features Overview

### 📱 Chat Tab
- Send messages to MyPal
- Watch MyPal grow from babbling (Level 1) to full conversations
- Messages earn XP and help MyPal level up

### 📊 Stats Tab
- View current level and XP progress
- Track personality traits (Curious, Logical, Social, Agreeable, Cautious)
- See cognitive lobe development

### 🧠 Brain Tab
- View MyPal's neural network structure
- See how many concepts MyPal has learned
- Regenerate the network visualization

### ⚙️ Settings Tab
- Export your data
- Reset MyPal (warning: deletes all data!)
- Configure preferences

## Troubleshooting

### Metro Bundler Won't Start
```bash
npm start -- --reset-cache
```

### Android Build Errors
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### iOS Build Errors
```bash
cd ios
rm -rf Pods
pod install
cd ..
npm run ios
```

### Backend Not Starting
The embedded Node.js backend should start automatically. If you see connection errors:
1. Close the app completely
2. Rebuild: `npm run android` or `npm run ios`
3. Check the Metro bundler logs for errors

## Development Tips

### Viewing Logs
- **Android**: `adb logcat | grep ReactNativeJS`
- **iOS**: View in Xcode Console
- **Metro Bundler**: Check the terminal where you ran `npm start`

### Hot Reload
- **Android**: Double-tap R or shake device → Reload
- **iOS**: Cmd+R in simulator

### Debug Menu
- **Android**: Shake device or Ctrl+M (emulator)
- **iOS**: Cmd+D in simulator

## What's Next?

- Explore the different screens
- Try chatting with MyPal at different levels
- Watch the personality traits evolve
- Export your data to see the JSON structure

## Need Help?

- Check the full README.md for detailed documentation
- Review the main MyPal repository documentation
- Check issues on GitHub: https://github.com/ScottyVenable/MyPal

---

**Enjoy your MyPal companion!** 🌱
