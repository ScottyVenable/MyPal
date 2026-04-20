import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import StorageUtil from './storageUtil.js';

class ProfileManager {
  constructor(baseDataDir) {
    this.baseDataDir = baseDataDir;
    this.profilesDir = path.join(baseDataDir, 'profiles');
    this.indexPath = path.join(baseDataDir, 'profiles-index.json');
    this.currentProfile = null;
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.indexPath)) {
      this.saveIndex({
        profiles: [],
        lastUsedId: null,
        version: '1.0.0'
      });
    }
  }

  loadIndex() {
    return StorageUtil.readJson(this.indexPath, {
      profiles: [],
      lastUsedId: null,
      version: '1.0.0'
    });
  }

  saveIndex(index) {
    return StorageUtil.writeJson(this.indexPath, index);
  }

  generateId() {
    return crypto.randomBytes(8).toString('hex');
  }

  getProfileDir(profileId) {
    return path.join(this.profilesDir, `profile-${profileId}`);
  }

  getProfileDataPath(profileId, filename) {
    return path.join(this.getProfileDir(profileId), filename);
  }

  createProfile(name) {
    const index = this.loadIndex();
    
    // Enforce 3 profile limit
    if (index.profiles.length >= 3) {
      return { 
        success: false, 
        error: 'Maximum of 3 profiles reached. Please delete a profile to create a new one.' 
      };
    }

    // Validate name
    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Profile name cannot be empty.' };
    }

    if (name.trim().length > 30) {
      return { success: false, error: 'Profile name must be 30 characters or less.' };
    }

    // Check for duplicate names
    if (index.profiles.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
      return { success: false, error: 'A profile with this name already exists.' };
    }

    const id = this.generateId();
    const profileDir = this.getProfileDir(id);

    // Create profile directory
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    const now = Date.now();
    const metadata = {
      id,
      name: name.trim(),
      createdAt: now,
      lastPlayedAt: now,
      level: 1,
      xp: 0,
      messageCount: 0,
      memoryCount: 0,
      version: '1.0.0'
    };

    // Create initial data files
    const initialData = {
      'metadata.json': metadata,
      'chat-log.json': [],
      'memories.json': [],
      'vocabulary.json': [],
      'journal.json': [],
      'concepts.json': [],
      'facts.json': [],
      'neural.json': null,
      'settings.json': {
        xpMultiplier: 1,
        apiProvider: 'local',
        telemetry: false,
        authRequired: false
      }
    };

    try {
      for (const [filename, data] of Object.entries(initialData)) {
        const filePath = this.getProfileDataPath(id, filename);
        StorageUtil.writeJson(filePath, data);
      }

      // Add to index
      index.profiles.push({
        id,
        name: name.trim(),
        createdAt: now,
        lastPlayedAt: now
      });
      index.lastUsedId = id;
      this.saveIndex(index);

      this.currentProfile = id;

      return { 
        success: true, 
        profile: metadata 
      };
    } catch (err) {
      console.error('Failed to create profile:', err);
      // Cleanup on failure
      try {
        if (fs.existsSync(profileDir)) {
          fs.rmSync(profileDir, { recursive: true, force: true });
        }
      } catch (cleanupErr) {
        console.error('Cleanup failed:', cleanupErr);
      }
      return { success: false, error: 'Failed to create profile files.' };
    }
  }

  listProfiles() {
    const index = this.loadIndex();
    
    // Enrich with metadata
    const profiles = index.profiles.map(p => {
      const metadataPath = this.getProfileDataPath(p.id, 'metadata.json');
      try {
        if (fs.existsSync(metadataPath)) {
          const metadata = StorageUtil.readJson(metadataPath);
          return {
            ...p,
            level: metadata.level || 1,
            xp: metadata.xp || 0,
            messageCount: metadata.messageCount || 0,
            memoryCount: metadata.memoryCount || 0
          };
        }
      } catch (err) {
        console.error(`Failed to load metadata for profile ${p.id}:`, err);
      }
      return p;
    });

    return {
      profiles,
      lastUsedId: index.lastUsedId,
      maxProfiles: 3
    };
  }

  loadProfile(profileId) {
    const index = this.loadIndex();
    const profile = index.profiles.find(p => p.id === profileId);

    if (!profile) {
      return { success: false, error: 'Profile not found.' };
    }

    const profileDir = this.getProfileDir(profileId);
    if (!fs.existsSync(profileDir)) {
      return { success: false, error: 'Profile directory not found.' };
    }

    // Update last played
    const metadataPath = this.getProfileDataPath(profileId, 'metadata.json');
    try {
      const metadata = StorageUtil.readJson(metadataPath);
      metadata.lastPlayedAt = Date.now();
      StorageUtil.writeJson(metadataPath, metadata);
      
      // Update index
      index.lastUsedId = profileId;
      const profileEntry = index.profiles.find(p => p.id === profileId);
      if (profileEntry) {
        profileEntry.lastPlayedAt = metadata.lastPlayedAt;
      }
      this.saveIndex(index);

      this.currentProfile = profileId;

      return {
        success: true,
        profile: metadata
      };
    } catch (err) {
      console.error('Failed to load profile:', err);
      return { success: false, error: 'Failed to load profile data.' };
    }
  }

  deleteProfile(profileId) {
    const index = this.loadIndex();
    const profileIndex = index.profiles.findIndex(p => p.id === profileId);

    if (profileIndex === -1) {
      return { success: false, error: 'Profile not found.' };
    }

    const profileDir = this.getProfileDir(profileId);

    try {
      // Delete directory
      if (fs.existsSync(profileDir)) {
        fs.rmSync(profileDir, { recursive: true, force: true });
      }

      // Remove from index
      index.profiles.splice(profileIndex, 1);
      
      // Clear last used if it was this profile
      if (index.lastUsedId === profileId) {
        index.lastUsedId = index.profiles.length > 0 ? index.profiles[0].id : null;
      }

      this.saveIndex(index);

      // Clear current if it was this profile
      if (this.currentProfile === profileId) {
        this.currentProfile = null;
      }

      return { success: true };
    } catch (err) {
      console.error('Failed to delete profile:', err);
      return { success: false, error: 'Failed to delete profile.' };
    }
  }

  getCurrentProfileId() {
    return this.currentProfile;
  }

  getCurrentProfileData(filename) {
    if (!this.currentProfile) {
      return null;
    }

    const filePath = this.getProfileDataPath(this.currentProfile, filename);
    
    // Check for compressed version first
    const compressedPath = filePath + '.gz';
    if (fs.existsSync(compressedPath)) {
      return StorageUtil.readJson(compressedPath, null, true);
    }
    
    return StorageUtil.readJson(filePath, null);
  }

  saveCurrentProfileData(filename, data) {
    if (!this.currentProfile) {
      return false;
    }

    const filePath = this.getProfileDataPath(this.currentProfile, filename);
    
    // Use compression for large files (neural.json)
    const shouldCompress = filename === 'neural.json' && StorageUtil.shouldCompress(filePath, 50);
    
    if (shouldCompress) {
      // Remove old uncompressed version if it exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return StorageUtil.writeJson(filePath, data, true);
    }
    
    return StorageUtil.writeJson(filePath, data);
  }

  updateProfileMetadata(updates) {
    if (!this.currentProfile) {
      return false;
    }

    const metadata = this.getCurrentProfileData('metadata.json');
    if (!metadata) {
      return false;
    }

    Object.assign(metadata, updates);
    metadata.lastPlayedAt = Date.now();

    return StorageUtil.writeJson(
      this.getProfileDataPath(this.currentProfile, 'metadata.json'),
      metadata
    );
  }

  // Get path to current profile's data file
  getCurrentProfilePath(filename) {
    if (!this.currentProfile) {
      return null;
    }
    return this.getProfileDataPath(this.currentProfile, filename);
  }
}

export default ProfileManager;
