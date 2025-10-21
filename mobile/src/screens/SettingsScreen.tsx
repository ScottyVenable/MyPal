import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Card,
  Text,
  Switch,
  Button,
  Divider,
  TextInput,
  useTheme,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const theme = useTheme();
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const url = await AsyncStorage.getItem('serverUrl');
      const dark = await AsyncStorage.getItem('darkMode');
      if (url) setServerUrl(url);
      if (dark) setDarkMode(dark === 'true');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveServerUrl = async () => {
    try {
      await AsyncStorage.setItem('serverUrl', serverUrl);
      Alert.alert('Success', 'Server URL saved. Restart the app to apply changes.');
    } catch (error) {
      console.error('Failed to save server URL:', error);
      Alert.alert('Error', 'Failed to save server URL');
    }
  };

  const toggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    try {
      await AsyncStorage.setItem('darkMode', value.toString());
      Alert.alert('Notice', 'Theme will be applied on next app launch');
    } catch (error) {
      console.error('Failed to save dark mode:', error);
    }
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data? This will not delete your profiles.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Keep auth token and settings
              const token = await AsyncStorage.getItem('authToken');
              const url = await AsyncStorage.getItem('serverUrl');
              const dark = await AsyncStorage.getItem('darkMode');

              await AsyncStorage.clear();

              // Restore
              if (token) await AsyncStorage.setItem('authToken', token);
              if (url) await AsyncStorage.setItem('serverUrl', url);
              if (dark) await AsyncStorage.setItem('darkMode', dark);

              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Failed to clear cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Server Connection
          </Text>
          <TextInput
            mode="outlined"
            label="Server URL"
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://localhost:3001"
            style={styles.input}
          />
          <Button mode="contained" onPress={saveServerUrl} style={styles.button}>
            Save Server URL
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Appearance
          </Text>
          <View style={styles.settingRow}>
            <View>
              <Text variant="bodyLarge">Dark Mode</Text>
              <Text variant="bodySmall">Use dark theme</Text>
            </View>
            <Switch value={darkMode} onValueChange={toggleDarkMode} />
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Data & Storage
          </Text>
          <Button mode="outlined" onPress={clearCache} style={styles.button}>
            Clear Cache
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            About
          </Text>
          <View style={styles.aboutItem}>
            <Text variant="bodyMedium">App Version</Text>
            <Text variant="bodyMedium">1.0.0</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.aboutItem}>
            <Text variant="bodyMedium">Build Number</Text>
            <Text variant="bodyMedium">1</Text>
          </View>
          <Divider style={styles.divider} />
          <Text variant="bodySmall" style={styles.description}>
            MyPal - Your AI Companion
          </Text>
          <Text variant="bodySmall" style={styles.description}>
            A personalized AI assistant with neural network-based learning and
            multi-profile support.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 8,
  },
  description: {
    marginTop: 8,
    opacity: 0.7,
  },
});
