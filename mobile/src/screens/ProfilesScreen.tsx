import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
  FAB,
  Card,
  Text,
  IconButton,
  ActivityIndicator,
  Dialog,
  Portal,
  Button,
  TextInput,
} from 'react-native-paper';
import apiClient from '../services/api';
import { Profile } from '../types';

export default function ProfilesScreen({ navigation }: any) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const response = await apiClient.getProfiles();
      setProfiles(response.profiles || []);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!newProfileName.trim() || creating) return;

    setCreating(true);
    try {
      await apiClient.createProfile(newProfileName);
      setNewProfileName('');
      setShowDialog(false);
      await loadProfiles();
    } catch (error: any) {
      console.error('Failed to create profile:', error);
      alert(error.response?.data?.error || 'Failed to create profile');
    } finally {
      setCreating(false);
    }
  };

  const selectProfile = async (profile: Profile) => {
    try {
      await apiClient.loadProfile(profile.id);
      navigation.navigate('Chat');
    } catch (error) {
      console.error('Failed to load profile:', error);
      alert('Failed to load profile');
    }
  };

  const deleteProfile = async (profileId: string) => {
    try {
      await apiClient.deleteProfile(profileId);
      await loadProfiles();
    } catch (error) {
      console.error('Failed to delete profile:', error);
      alert('Failed to delete profile');
    }
  };

  const renderProfile = ({ item }: { item: Profile }) => (
    <Card style={styles.profileCard} onPress={() => selectProfile(item)}>
      <Card.Content>
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <Text variant="titleLarge">{item.name}</Text>
            <Text variant="bodyMedium">
              Level {item.level} • {item.xp} XP
            </Text>
            <Text variant="bodySmall">
              {item.messageCount} messages • {item.memoryCount} memories
            </Text>
          </View>
          <IconButton
            icon="delete"
            size={20}
            onPress={() => deleteProfile(item.id)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading profiles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={profiles}
        renderItem={renderProfile}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="titleLarge">No profiles yet</Text>
            <Text variant="bodyMedium">
              Create your first AI companion profile to get started
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowDialog(true)}
        label="New Profile"
      />

      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
          <Dialog.Title>Create New Profile</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Profile Name"
              value={newProfileName}
              onChangeText={setNewProfileName}
              maxLength={30}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onPress={createProfile}
              loading={creating}
              disabled={!newProfileName.trim() || creating}
            >
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  listContent: {
    padding: 16,
  },
  profileCard: {
    marginBottom: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
