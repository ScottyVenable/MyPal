import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { darkTheme, colors } from './src/theme';
import { AIProvider } from './src/store/AIContext';
import { AppNavigator } from './src/navigation/AppNavigator';

const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.error,
  },
};

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <PaperProvider theme={darkTheme}>
        <SafeAreaProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar
              barStyle="light-content"
              backgroundColor={colors.background}
            />
            <AIProvider>
              <AppNavigator />
            </AIProvider>
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
