// Profile Selection Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  Portal,
  Dialog,
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchProfiles, createProfile, loadProfile, deleteProfile } from '../store/profileSlice';
import { Profile } from '../types';

export default function ProfileSelectionScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { profiles, loading, error } = useSelector((state: RootState) => state.profile);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  useEffect(() => {
    dispatch(fetchProfiles());
  }, []);

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      Alert.alert('Error', 'Please enter a profile name');
      return;
    }

    try {
      await dispatch(createProfile(newProfileName.trim())).unwrap();
      setDialogVisible(false);
      setNewProfileName('');
    } catch (err) {
      Alert.alert('Error', 'Failed to create profile');
    }
  };

  const handleSelectProfile = async (profile: Profile) => {
    try {
      await dispatch(loadProfile(profile.id)).unwrap();
      navigation.replace('Main');
    } catch (err) {
      Alert.alert('Error', 'Failed to load profile');
    }
  };

  const handleDeleteProfile = (profile: Profile) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete ${profile.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteProfile(profile.id)),
        },
      ]
    );
  };

  const renderProfile = ({ item }: { item: Profile }) => (
    <Card style={styles.card} onPress={() => handleSelectProfile(item)}>
      <Card.Content>
        <Text variant="titleLarge">{item.name}</Text>
        <Text variant="bodyMedium">Level {item.level} • {item.xp} XP</Text>
        <Text variant="bodySmall">Last active: {new Date(item.lastActive).toLocaleDateString()}</Text>
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => handleSelectProfile(item)}>Select</Button>
        <Button onPress={() => handleDeleteProfile(item)} textColor="red">
          Delete
        </Button>
      </Card.Actions>
    </Card>
  );

  if (loading && profiles.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profiles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        MyPal
      </Text>
      <Text variant="titleMedium" style={styles.subtitle}>
        Select a Profile
      </Text>

      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      <FlatList
        data={profiles}
        renderItem={renderProfile}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge">No profiles yet</Text>
            <Text variant="bodyMedium">Create your first MyPal companion!</Text>
          </View>
        }
      />

      <Button
        mode="contained"
        onPress={() => setDialogVisible(true)}
        style={styles.createButton}
      >
        Create New Profile
      </Button>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Create New Profile</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Profile Name"
              value={newProfileName}
              onChangeText={setNewProfileName}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateProfile}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  listContent: {
    flexGrow: 1,
  },
  card: {
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  createButton: {
    marginTop: 16,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 12,
  },
});
