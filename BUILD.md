# MyPal AI — Build Guide

Complete instructions for building the MyPal AI mobile application from source.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | 18+ LTS | [Download](https://nodejs.org/) |
| **npm** | 9+ | Ships with Node.js |
| **JDK** | 17 | OpenJDK or Oracle JDK |
| **Android Studio** | Latest | [Download](https://developer.android.com/studio) |
| **Android SDK** | API 34 | Install via Android Studio SDK Manager |
| **Android Build Tools** | 34.0.0 | Install via Android Studio SDK Manager |
| **Android NDK** | 25.1.x | Install via Android Studio SDK Manager |
| **Git** | Latest | [Download](https://git-scm.com/) |

---

## Environment Setup

### 1. Set Environment Variables

Add these to your shell profile (`~/.bashrc`, `~/.zshrc`, or equivalent):

```bash
# Java
export JAVA_HOME=/path/to/jdk-17

# Android SDK (default Android Studio install paths shown)
export ANDROID_HOME=$HOME/Android/Sdk        # Linux
# export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk  # Windows

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Reload your shell:

```bash
source ~/.bashrc   # or ~/.zshrc
```

### 2. Verify Installation

```bash
node --version     # Should print v18.x or higher
java --version     # Should print openjdk 17.x
adb --version      # Should print Android Debug Bridge version
```

### 3. Android SDK Components

Open Android Studio → **Settings → SDK Manager** and install:

- **SDK Platforms**: Android 14 (API 34)
- **SDK Tools**:
  - Android SDK Build-Tools 34.0.0
  - Android SDK Command-line Tools
  - Android Emulator
  - Android SDK Platform-Tools
  - NDK (Side by side) 25.1.x

---

## Build Instructions

### Step 1: Clone and Checkout

```bash
git clone https://github.com/ScottyVenable/MyPal.git
cd MyPal
```

### Step 2: Install Dependencies

```bash
# Install root project dependencies
npm install

# Install mobile app dependencies
cd src/mobile
npm install
cd ../..
```

### Step 3: Build AI Engine

The AI engine in `src/ai/` must be compiled from TypeScript before the mobile app can use it:

```bash
cd src/ai
npx tsc --build
cd ../..
```

> **Note**: If `src/ai/tsconfig.json` defines a build script, you can also run `npm run build` from that directory.

### Step 4: Set Up Gradle Wrapper

If this is your first build and `gradle-wrapper.jar` is not present:

```bash
cd src/mobile/android

# Option A: If Gradle is installed locally
gradle wrapper --gradle-version 8.3

# Option B: Open in Android Studio and let it configure automatically
```

### Step 5: Build Android APK

#### Debug Build

```bash
cd src/mobile/android
./gradlew assembleDebug
```

The debug APK will be generated at:

```
src/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

#### Release Build

```bash
cd src/mobile/android
./gradlew assembleRelease
```

The release APK will be generated at:

```
src/mobile/android/app/build/outputs/apk/release/app-release.apk
```

### Step 6: Copy Build to Output Directory

```bash
# From the repository root
mkdir -p builds

# Copy debug APK
cp src/mobile/android/app/build/outputs/apk/debug/app-debug.apk \
   builds/mypal-v0.2.0-alpha-debug.apk

# Copy release APK
cp src/mobile/android/app/build/outputs/apk/release/app-release.apk \
   builds/mypal-v0.2.0-alpha.apk
```

> **Output path convention**: `/builds/mypal-v{version}.apk`

### Step 7: Install on Device / Emulator

```bash
# List connected devices
adb devices

# Install debug build
adb install builds/mypal-v0.2.0-alpha-debug.apk

# Or install release build
adb install builds/mypal-v0.2.0-alpha.apk
```

---

## Development Builds (Metro + Hot Reload)

For active development with hot reload:

```bash
# Terminal 1: Start Metro bundler
cd src/mobile
npx react-native start

# Terminal 2: Build and run on connected device/emulator
cd src/mobile
npx react-native run-android
```

---

## Build Configuration Details

| Setting | Value |
|---|---|
| Application ID | `com.mypal.ai` |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 34 (Android 14) |
| Compile SDK | 34 |
| Gradle Version | 8.3 |
| AGP Version | 8.1.1 |
| Kotlin Version | 1.9.0 |
| JS Engine | Hermes |
| New Architecture | Disabled |
| Version Name | `0.2.0-alpha` |
| Version Code | `1` |

---

## Troubleshooting

### `SDK location not found`

Create a `local.properties` file in `src/mobile/android/`:

```properties
sdk.dir=/path/to/your/Android/Sdk
```

### `Could not determine java version from '21'`

Ensure JDK 17 is set as the default. In Android Studio: **Settings → Build → Gradle → Gradle JDK → 17**.

### `Execution failed for task ':app:mergeDebugNativeLibs'`

Clean the build and retry:

```bash
cd src/mobile/android
./gradlew clean
./gradlew assembleDebug
```

### Metro bundler connection refused

Ensure the Metro bundler is running (`npx react-native start`) and the device can reach the development machine. For emulators:

```bash
adb reverse tcp:8081 tcp:8081
```

### `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

Uninstall the existing app first:

```bash
adb uninstall com.mypal.ai
```

### Out of memory during build

Increase Gradle heap size in `src/mobile/android/gradle.properties`:

```properties
org.gradle.jvmargs=-Xmx6144m
```

### `React Native CLI not found`

Install the CLI globally or use npx:

```bash
npx react-native doctor   # Diagnose environment issues
```

---

## Release Signing (Production)

For production releases, create a release keystore and configure `keystore.properties`:

```properties
# src/mobile/android/keystore.properties
storeFile=path/to/release.keystore
storePassword=your-store-password
keyAlias=your-key-alias
keyPassword=your-key-password
```

> **Security**: Never commit `keystore.properties` or `.keystore` files to version control.
