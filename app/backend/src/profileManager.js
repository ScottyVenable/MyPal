import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const BACKUP_EXTENSIONS = ['.tmp', '.bak'];
const syncWaitBuffer = typeof SharedArrayBuffer === 'function' ? new SharedArrayBuffer(4) : null;
const syncWaitArray = syncWaitBuffer ? new Int32Array(syncWaitBuffer) : null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sleepSync(ms) {
  if (ms <= 0) {
    return;
  }
  if (syncWaitArray && typeof Atomics !== 'undefined' && typeof Atomics.wait === 'function') {
    Atomics.wait(syncWaitArray, 0, 0, ms);
    return;
  }
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // Busy wait fallback for environments without Atomics.wait
  }
}

class ProfileManager {
  constructor(baseDataDir) {
    this.baseDataDir = baseDataDir;
    this.profilesDir = path.join(baseDataDir, 'profiles');
    this.indexPath = path.join(baseDataDir, 'profiles-index.json');
    this.currentProfile = null;
    this._cache = new Map();
    
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
      this._cache.clear();

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
      profiles: profiles.sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)),
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
      this._cache.clear();

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
        this._cache.clear();
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
    
    // Check if there's a pending write for this file - if so, wait for it
    if (this._pendingWrites && this._pendingWrites.has(filePath)) {
      // Synchronous read during pending write - cancel the pending write and read immediately
      clearTimeout(this._pendingWrites.get(filePath));
      this._pendingWrites.delete(filePath);
    }
    
    const serveCached = () => {
      if (!this._cache.has(filePath)) {
        return undefined;
      }
      console.warn(`[PROFILE] Serving cached ${filename} after read failure`);
      const cached = this._cache.get(filePath);
      return this.cloneData(cached);
    };

    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        // Validate JSON is complete before parsing
        if (!data || data.trim() === '') {
          console.warn(`[PROFILE] Empty file detected: ${filename}, attempting recovery`);
          const recovered = this.recoverFromBackup(filePath, filename);
          if (recovered !== null) {
            return recovered;
          }
          const cached = serveCached();
          if (cached !== undefined) {
            return cached;
          }
          return null;
        }
        const parsed = JSON.parse(data);
        this.rememberData(filePath, parsed);
  return this.cloneData(parsed);
      }
    } catch (err) {
      // Only log parse errors at warn level - file corruption is recoverable
      if (err instanceof SyntaxError) {
        console.warn(`[PROFILE] JSON parse error in ${filename} (file may be mid-write, attempting recovery):`, err.message);
        const recovered = this.recoverFromBackup(filePath, filename);
        if (recovered !== null) {
          return recovered;
        }
      } else {
        console.error(`[PROFILE] Failed to load ${filename} for current profile:`, err);
      }
      // If JSON parse fails, file might be corrupted - return null and let it be recreated
      const cached = serveCached();
      if (cached !== undefined) {
        return cached;
      }
      return null;
    }
    const cached = serveCached();
    if (cached !== undefined) {
      return cached;
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
   * Helper for async writes with debouncing and atomic writes
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
        // Atomic write: write to temp file, then promote
        const tempFile = `${file}.tmp`;
        const jsonString = JSON.stringify(data, null, 2);

        await fs.promises.writeFile(tempFile, jsonString, 'utf8');
        await this.commitTempFile(tempFile, file, jsonString);

        this.rememberData(file, data);

        this._pendingWrites.delete(file);
      } catch (error) {
        console.error('Error writing file:', file, error);
        this._pendingWrites.delete(file);
        
        // Clean up temp file if it exists
        try {
          const tempFile = `${file}.tmp`;
          if (fs.existsSync(tempFile)) {
            await fs.promises.unlink(tempFile);
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        
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

  rememberData(filePath, data) {
    if (!this._cache) {
      this._cache = new Map();
    }
    if (data === undefined) {
      this._cache.delete(filePath);
      return;
    }
    if (data === null) {
      this._cache.set(filePath, null);
      return;
    }
    try {
      const snapshot = JSON.parse(JSON.stringify(data));
      this._cache.set(filePath, snapshot);
    } catch (err) {
      console.warn(`[PROFILE] Failed to snapshot cache for ${path.basename(filePath)}:`, err?.message || err);
    }
  }

  cloneData(data) {
    if (data === null || data === undefined) {
      return data ?? null;
    }
    try {
      return JSON.parse(JSON.stringify(data));
    } catch (err) {
      console.warn('[PROFILE] Failed to clone cached data:', err?.message || err);
      return data;
    }
  }

  recoverFromBackup(filePath, filename) {
    for (const ext of BACKUP_EXTENSIONS) {
      const candidate = `${filePath}${ext}`;
      try {
        if (!fs.existsSync(candidate)) {
          continue;
        }
        const raw = fs.readFileSync(candidate, 'utf8');
        if (!raw || raw.trim() === '') {
          continue;
        }
        const parsed = JSON.parse(raw);
        console.warn(`[PROFILE] Recovered ${filename} from backup ${path.basename(candidate)}`);
        this.rememberData(filePath, parsed);
        const restored = this.attemptRestoreFile(filePath, raw);
        if (restored && ext === '.tmp') {
          try {
            fs.unlinkSync(candidate);
          } catch (cleanupErr) {
            if (cleanupErr?.code !== 'ENOENT') {
              console.warn(`[PROFILE] Failed to remove stale backup ${path.basename(candidate)}:`, cleanupErr?.message || cleanupErr);
            }
          }
        }
        return this.cloneData(parsed);
      } catch (recoveryErr) {
        console.error(`[PROFILE] Failed to recover ${filename} from backup ${candidate}:`, recoveryErr);
      }
    }

    if (this._cache && this._cache.has(filePath)) {
      console.warn(`[PROFILE] Falling back to cached ${filename} after recovery attempts failed`);
      return this.cloneData(this._cache.get(filePath));
    }

    return null;
  }

  attemptRestoreFile(filePath, rawContents) {
    const retryableCodes = new Set(['EPERM', 'EACCES', 'EBUSY', 'EEXIST', 'ENOTEMPTY']);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        fs.writeFileSync(filePath, rawContents, 'utf8');
        return true;
      } catch (err) {
        if (!retryableCodes.has(err.code)) {
          console.error(`[PROFILE] Unable to restore ${path.basename(filePath)} from backup:`, err);
          return false;
        }
        console.warn(`[PROFILE] Restore retry ${attempt + 1}/5 for ${path.basename(filePath)} due to ${err.code}`);
        sleepSync(40 * (attempt + 1) * (attempt + 1));
      }
    }
    console.warn(`[PROFILE] Could not restore ${path.basename(filePath)} after repeated attempts; leaving backup file for manual recovery`);
    return false;
  }

  async commitTempFile(tempFile, finalFile, contents) {
    const retryableCodes = new Set(['EPERM', 'EACCES', 'EBUSY', 'EEXIST', 'ENOTEMPTY']);
    let lastError = null;
    const maxAttempts = 6;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await this.safeUnlink(finalFile);
        await fs.promises.rename(tempFile, finalFile);
        return;
      } catch (error) {
        lastError = error;

        if (!retryableCodes.has(error.code)) {
          break;
        }

        const delay = 50 * (attempt + 1) * (attempt + 1);
        console.warn(`[PROFILE] Rename retry ${attempt + 1}/${maxAttempts} for ${path.basename(finalFile)} due to ${error.code}`);
        await sleep(delay);
      }
    }

    if (lastError) {
      if (lastError.code && retryableCodes.has(lastError.code)) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await fs.promises.writeFile(finalFile, contents, 'utf8');
            await this.safeUnlink(tempFile);
            return;
          } catch (writeErr) {
            lastError = writeErr;
            if (!retryableCodes.has(writeErr.code)) {
              break;
            }
            const delay = 75 * (attempt + 1) * (attempt + 1);
            console.warn(`[PROFILE] Direct write retry ${attempt + 1}/3 for ${path.basename(finalFile)} due to ${writeErr.code}`);
            await sleep(delay);
          }
        }
      }

      console.warn(`[PROFILE] Preserving temp file ${path.basename(tempFile)} for manual recovery after repeated failures`);
      throw lastError;
    }
  }

  commitTempFileSync(tempFile, finalFile, contents) {
    const retryableCodes = new Set(['EPERM', 'EACCES', 'EBUSY', 'EEXIST', 'ENOTEMPTY']);
    let lastError = null;
    const maxAttempts = 6;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        this.safeUnlinkSync(finalFile);
        fs.renameSync(tempFile, finalFile);
        return;
      } catch (error) {
        lastError = error;

        if (!retryableCodes.has(error.code)) {
          break;
        }

        console.warn(`[PROFILE] (sync) Rename retry ${attempt + 1}/${maxAttempts} for ${path.basename(finalFile)} due to ${error.code}`);
        sleepSync(50 * (attempt + 1) * (attempt + 1));
      }
    }

    if (lastError) {
      if (lastError.code && retryableCodes.has(lastError.code)) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            fs.writeFileSync(finalFile, contents, 'utf8');
            this.cleanupTempFile(tempFile);
            return;
          } catch (writeErr) {
            lastError = writeErr;
            if (!retryableCodes.has(writeErr.code)) {
              break;
            }
            console.warn(`[PROFILE] (sync) Direct write retry ${attempt + 1}/3 for ${path.basename(finalFile)} due to ${writeErr.code}`);
            sleepSync(75 * (attempt + 1) * (attempt + 1));
          }
        }
      }

      console.warn(`[PROFILE] Preserving temp file ${path.basename(tempFile)} for manual recovery after repeated failures`);
      throw lastError;
    }
  }

  async safeUnlink(filePath) {
    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      if (!err || (err.code !== 'ENOENT' && err.code !== 'EPERM' && err.code !== 'EACCES' && err.code !== 'EBUSY')) {
        console.warn(`[PROFILE] Failed to remove file ${filePath}:`, err?.message || err);
      }
    }
  }

  safeUnlinkSync(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      if (!err || (err.code !== 'ENOENT' && err.code !== 'EPERM' && err.code !== 'EACCES' && err.code !== 'EBUSY')) {
        console.warn(`[PROFILE] Failed to remove file ${filePath}:`, err?.message || err);
      }
    }
  }

  cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      if (!err || err.code !== 'ENOENT') {
        console.warn(`[PROFILE] Failed to clean up temp file ${filePath}:`, err?.message || err);
      }
    }
  }

  saveCurrentProfileData(filename, data) {
    if (!this.currentProfile) {
      return false;
    }

    const filePath = this.getProfileDataPath(this.currentProfile, filename);
    try {
      const tempFile = `${filePath}.tmp`;
      const jsonString = JSON.stringify(data, null, 2);

      fs.writeFileSync(tempFile, jsonString, 'utf8');
      this.commitTempFileSync(tempFile, filePath, jsonString);

      this.rememberData(filePath, data);

      return true;
    } catch (err) {
      console.error(`Failed to save ${filename} for current profile:`, err);
      this.cleanupTempFile(`${filePath}.tmp`);
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
