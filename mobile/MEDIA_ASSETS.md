# MyPal Mobile - Media Assets Guide

## Media Folder Location

The media folder has been moved to: `app/media/`

This folder contains:
- `images/` - Logo files, icons, and images
  - `logo_no_background.png` - Main logo (transparent)
  - `logo_outline.png` - Outline version
  - `icon.ico` - Desktop application icon
- Other media assets

## Using Media in Mobile App

Since the mobile app is a separate React Native project, you have three options for using media assets:

### Option 1: Copy to Mobile Assets (Recommended)

Copy the media files you need to the React Native assets folder:

```powershell
# From MOBILE directory
New-Item -ItemType Directory -Force -Path assets/images
Copy-Item ../app/media/images/*.png assets/images/
```

Then use them in React Native:

```tsx
import { Image } from 'react-native';

<Image 
  source={require('../assets/images/logo_no_background.png')}
  style={{ width: 100, height: 100 }}
/>
```

### Option 2: Bundle with React Native

Add media to `react-native.config.js`:

```javascript
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/images'],
};
```

Then run:
```bash
npx react-native-asset
```

### Option 3: Serve from Embedded Backend

If you need to serve media from the Node.js backend:

1. **Copy media to backend assets:**
   ```powershell
   Copy-Item -Recurse ../app/media nodejs-assets/nodejs-project/media
   ```

2. **Update server.js to serve static files:**
   ```javascript
   const express = require('express');
   const path = require('path');
   
   app.use('/media', express.static(path.join(__dirname, 'media')));
   ```

3. **Load in React Native:**
   ```tsx
   <Image 
     source={{ uri: 'http://localhost:3001/media/images/logo_no_background.png' }}
     style={{ width: 100, height: 100 }}
   />
   ```

## Recommended Approach

For the MyPal mobile app, we recommend **Option 1** because:

- ✅ Native asset loading (faster)
- ✅ Works offline immediately
- ✅ Smaller backend bundle size
- ✅ Better performance
- ✅ Standard React Native practice

## Current Implementation

The mobile app is currently set up to use placeholder images. To add the logo:

### 1. Copy Logo Files

```powershell
# From MOBILE directory
New-Item -ItemType Directory -Force -Path assets/images
Copy-Item ../app/media/images/logo_no_background.png assets/images/
Copy-Item ../app/media/images/logo_outline.png assets/images/
```

### 2. Update Screens

Example: Update `src/screens/ProfilesScreen.tsx`:

```tsx
import { Image } from 'react-native';

// Add at top of screen
<View style={{ alignItems: 'center', padding: 20 }}>
  <Image 
    source={require('../../assets/images/logo_no_background.png')}
    style={{ width: 120, height: 120 }}
    resizeMode="contain"
  />
  <Title style={{ marginTop: 10 }}>MyPal</Title>
</View>
```

### 3. Update App Icon

For the app launcher icon:

#### iOS:
1. Create icon sizes using https://appicon.co/
2. Replace images in `ios/MyPal/Images.xcassets/AppIcon.appiconset/`

#### Android:
1. Create icon sizes
2. Replace images in:
   - `android/app/src/main/res/mipmap-hdpi/`
   - `android/app/src/main/res/mipmap-mdpi/`
   - `android/app/src/main/res/mipmap-xhdpi/`
   - `android/app/src/main/res/mipmap-xxhdpi/`
   - `android/app/src/main/res/mipmap-xxxhdpi/`

## Adding Custom Fonts (Future)

If you want to add custom fonts from `app/media/fonts/`:

1. **Create fonts directory:**
   ```powershell
   New-Item -ItemType Directory -Force -Path assets/fonts
   Copy-Item ../app/media/fonts/* assets/fonts/
   ```

2. **Link fonts:**
   ```bash
   npx react-native-asset
   ```

3. **Use in styles:**
   ```tsx
   <Text style={{ fontFamily: 'YourCustomFont' }}>
     Hello MyPal!
   </Text>
   ```

## Summary

Since media is now in `app/media/`, the mobile app needs to reference it correctly:

1. **For images**: Copy to `MOBILE/assets/images/` and use `require()`
2. **For app icons**: Update platform-specific asset folders
3. **For fonts**: Copy to `MOBILE/assets/fonts/` and link with react-native-asset

This keeps the mobile app self-contained and performant! 🚀
