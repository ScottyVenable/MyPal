// Settings Screen
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Switch, Button } from 'react-native-paper';
import BackendService from '../services/BackendService';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [telemetry, setTelemetry] = useState(false);

  const handleExportData = async () => {
    const response = await BackendService.exportData();
    if (response.success) {
      Alert.alert('Success', 'Data exported successfully!');
      // In a real app, save the data to device storage
    } else {
      Alert.alert('Error', response.error || 'Failed to export data');
    }
  };

  const handleResetPal = () => {
    Alert.alert(
      'Reset MyPal',
      'Are you sure you want to reset MyPal? This will delete all data and start fresh. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const response = await BackendService.resetPal();
            if (response.success) {
              Alert.alert('Success', 'MyPal has been reset');
            } else {
              Alert.alert('Error', response.error || 'Failed to reset');
            }
          },
        },
      ]
    );
  };

  const handleUpdateSettings = async () => {
    const response = await BackendService.updateSettings({
      notifications,
      telemetryEnabled: telemetry,
    });

    if (response.success) {
      Alert.alert('Success', 'Settings updated');
    } else {
      Alert.alert('Error', response.error || 'Failed to update settings');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Preferences" />
        <Card.Content>
          <View style={styles.settingRow}>
            <Text variant="bodyLarge">Enable Notifications</Text>
            <Switch value={notifications} onValueChange={setNotifications} />
          </View>
          <View style={styles.settingRow}>
            <Text variant="bodyLarge">Enable Telemetry</Text>
            <Switch value={telemetry} onValueChange={setTelemetry} />
          </View>
        </Card.Content>
        <Card.Actions>
          <Button onPress={handleUpdateSettings}>Save Settings</Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Data Management" />
        <Card.Content>
          <Button
            mode="outlined"
            onPress={handleExportData}
            style={styles.actionButton}
          >
            Export Data
          </Button>
          <Button
            mode="outlined"
            onPress={handleResetPal}
            style={styles.actionButton}
            textColor="red"
          >
            Reset MyPal
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="About" />
        <Card.Content>
          <Text variant="bodyLarge">MyPal Mobile</Text>
          <Text variant="bodyMedium" style={styles.version}>
            Version 0.3.0-alpha
          </Text>
          <Text variant="bodySmall" style={styles.description}>
            An evolving AI companion that learns from your interactions, built on developmental psychology principles.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Privacy" />
        <Card.Content>
          <Text variant="bodyMedium">
            MyPal is privacy-first. All data is stored locally on your device. 
            No information is sent to external servers unless you explicitly enable telemetry.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  version: {
    marginTop: 4,
    marginBottom: 8,
  },
  description: {
    marginTop: 8,
    opacity: 0.7,
  },
});
