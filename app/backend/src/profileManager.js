import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
    try {
      const data = fs.readFileSync(this.indexPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Failed to load profile index:', err);
      return { profiles: [], lastUsedId: null, version: '1.0.0' };
    }
  }

  saveIndex(index) {
    try {
      fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Failed to save profile index:', err);
      return false;
    }
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
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
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
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
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
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      metadata.lastPlayedAt = Date.now();
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      
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
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error(`Failed to load ${filename} for current profile:`, err);
    }
    return null;
  }

  /**
   * Async version with debouncing for better performance
   */
  async saveCurrentProfileDataAsync(filename, data, immediate = false) {
    if (!this.currentProfile) {
      return false;
    }

    const filePath = this.getProfileDataPath(this.currentProfile, filename);
    try {
      await this.writeJsonAsync(filePath, data, immediate);
      return true;
    } catch (err) {
      console.error(`Failed to save ${filename} for current profile:`, err);
      return false;
    }
  }

  /**
   * Helper for async writes with debouncing
   */
  async writeJsonAsync(file, data, immediate = false) {
    // Debounce map for this instance
    if (!this._pendingWrites) {
      this._pendingWrites = new Map();
    }

    const WRITE_DEBOUNCE_MS = 100;

    // Clear any pending write for this file
    if (this._pendingWrites.has(file)) {
      clearTimeout(this._pendingWrites.get(file));
    }

    const doWrite = async () => {
      try {
        await fs.promises.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
        this._pendingWrites.delete(file);
      } catch (error) {
        console.error('Error writing file:', file, error);
        this._pendingWrites.delete(file);
        throw error;
      }
    };

    if (immediate) {
      return doWrite();
    }

    // Debounce: schedule write after delay
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        try {
          await doWrite();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, WRITE_DEBOUNCE_MS);
      
      this._pendingWrites.set(file, timeoutId);
    });
  }

  saveCurrentProfileData(filename, data) {
    if (!this.currentProfile) {
      return false;
    }

    const filePath = this.getProfileDataPath(this.currentProfile, filename);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error(`Failed to save ${filename} for current profile:`, err);
      return false;
    }
  }

  async updateProfileMetadataAsync(updates, immediate = false) {
    if (!this.currentProfile) {
      return false;
    }

    const metadata = this.getCurrentProfileData('metadata.json');
    if (!metadata) {
      return false;
    }

    Object.assign(metadata, updates);
    metadata.lastPlayedAt = Date.now();

    return this.saveCurrentProfileDataAsync('metadata.json', metadata, immediate);
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

    return this.saveCurrentProfileData('metadata.json', metadata);
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
