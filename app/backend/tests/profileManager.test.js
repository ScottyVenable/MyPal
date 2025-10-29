import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import ProfileManager from '../src/profileManager.js';
import createSqliteStore from '../src/storage/sqliteStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tempRoot;
let profileManager;
let sqliteStore;

before(async () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-pm-unit-test-'));
  sqliteStore = await createSqliteStore(tempRoot, console);
  profileManager = new ProfileManager(tempRoot, sqliteStore);
  assert.ok(profileManager.kvStore?.isEnabled?.(), 'SQLite store should be enabled for profile manager tests');
});

after(() => {
  try {
    sqliteStore?.dispose?.();
  } catch {}
  if (tempRoot && fs.existsSync(tempRoot)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe('ProfileManager Unit Tests', () => {
  test('should initialize with empty profile list', () => {
    const index = profileManager.loadIndex();
    assert.ok(Array.isArray(index.profiles), 'should have profiles array');
    assert.equal(index.profiles.length, 0, 'should start empty');
    assert.equal(index.lastUsedId, null, 'should have no last used profile');
  });

  test('should create profile directory structure', () => {
    const profilesDir = path.join(tempRoot, 'profiles');
    assert.ok(fs.existsSync(profilesDir), 'profiles directory should exist');
    
    const indexPath = path.join(tempRoot, 'profiles-index.json');
    assert.ok(fs.existsSync(indexPath), 'index file should exist');
  });

  test('should generate unique IDs', () => {
    const id1 = profileManager.generateId();
    const id2 = profileManager.generateId();
    
    assert.ok(id1, 'should generate ID');
    assert.ok(id2, 'should generate second ID');
    assert.notEqual(id1, id2, 'IDs should be unique');
    assert.equal(id1.length, 16, 'ID should be 16 chars (8 bytes hex)');
  });

  test('should create a new profile', () => {
    const result = profileManager.createProfile('TestProfile');
    
    assert.equal(result.success, true, 'creation should succeed');
    assert.ok(result.profile, 'should return profile object');
    assert.equal(result.profile.name, 'TestProfile');
    assert.ok(result.profile.id, 'should have ID');
    assert.equal(result.profile.level, 1, 'should start at level 1');
    assert.equal(result.profile.xp, 0, 'should start with 0 XP');
  });

  test('should reject empty profile name', () => {
    const result = profileManager.createProfile('');
    
    assert.equal(result.success, false, 'should fail');
    assert.ok(result.error, 'should have error message');
    assert.ok(result.error.includes('empty'), 'error should mention empty name');
  });

  test('should reject profile name longer than 30 characters', () => {
    const longName = 'A'.repeat(31);
    const result = profileManager.createProfile(longName);
    
    assert.equal(result.success, false, 'should fail');
    assert.ok(result.error.includes('30'), 'error should mention character limit');
  });

  test('should reject duplicate profile names (case insensitive)', () => {
    profileManager.createProfile('MyProfile');
    const result = profileManager.createProfile('myprofile');
    
    assert.equal(result.success, false, 'should reject duplicate');
    assert.ok(result.error.includes('exists'), 'error should mention duplication');
  });

  test('should enforce 3 profile limit', () => {
    // Clear existing and create 3 profiles
    const index = profileManager.loadIndex();
    index.profiles = [];
    profileManager.saveIndex(index);
    
    profileManager.createProfile('Profile1');
    profileManager.createProfile('Profile2');
    profileManager.createProfile('Profile3');
    
    const result = profileManager.createProfile('Profile4');
    assert.equal(result.success, false, 'should reject 4th profile');
    assert.ok(result.error.includes('3'), 'error should mention limit');
  });

  test('should list all profiles', () => {
    const result = profileManager.listProfiles();
    
    assert.ok(result.profiles, 'should have profiles property');
    assert.ok(Array.isArray(result.profiles), 'profiles should be an array');
    assert.ok(result.profiles.length > 0, 'should have profiles');
    assert.ok(result.profiles[0].id, 'profile should have ID');
    assert.ok(result.profiles[0].name, 'profile should have name');
  });

  test('should get profile from list by ID', () => {
    const result = profileManager.listProfiles();
    const profileId = result.profiles[0].id;
    
    const profile = result.profiles.find(p => p.id === profileId);
    assert.ok(profile, 'should find profile in list');
    assert.equal(profile.id, profileId, 'should return correct profile');
  });

  test('should return undefined for non-existent profile in list', () => {
    const result = profileManager.listProfiles();
    const profile = result.profiles.find(p => p.id === 'nonexistent-id');
    assert.equal(profile, undefined, 'should return undefined');
  });

  test('should load a profile', () => {
    const result = profileManager.listProfiles();
    const profileId = result.profiles[0].id;
    
    const loadResult = profileManager.loadProfile(profileId);
    assert.equal(loadResult.success, true, 'loading should succeed');
    assert.equal(profileManager.getCurrentProfileId(), profileId, 'should set current profile');
  });

  test('should update lastPlayedAt when loading profile', () => {
    const result = profileManager.listProfiles();
    const profileId = result.profiles[0].id;
    const beforeLoad = Date.now();
    
    const loadResult = profileManager.loadProfile(profileId);
    assert.equal(loadResult.success, true, 'should load successfully');
    assert.ok(loadResult.profile.lastPlayedAt >= beforeLoad, 'lastPlayedAt should be updated');
  });

  test('should reject loading non-existent profile', () => {
    const result = profileManager.loadProfile('nonexistent-id');
    assert.equal(result.success, false, 'should fail');
    assert.ok(result.error, 'should have error message');
  });

  test('should delete a profile', () => {
    // Clear space first if needed
    const listResult = profileManager.listProfiles();
    if (listResult.profiles.length >= 3) {
      profileManager.deleteProfile(listResult.profiles[0].id);
    }
    
    const createResult = profileManager.createProfile('ToDelete');
    assert.equal(createResult.success, true, 'creation should succeed');
    const profileId = createResult.profile.id;
    
    const result = profileManager.deleteProfile(profileId);
    assert.equal(result.success, true, 'deletion should succeed');
    
    const afterList = profileManager.listProfiles();
    const profile = afterList.profiles.find(p => p.id === profileId);
    assert.equal(profile, undefined, 'profile should be gone from list');
  });

  test('should clear current profile when deleting active profile', () => {
    // Clear space first if needed
    const listResult = profileManager.listProfiles();
    if (listResult.profiles.length >= 3) {
      profileManager.deleteProfile(listResult.profiles[0].id);
    }
    
    const createResult = profileManager.createProfile('ActiveToDelete');
    assert.equal(createResult.success, true, 'creation should succeed');
    const profileId = createResult.profile.id;
    
    profileManager.loadProfile(profileId);
    assert.equal(profileManager.getCurrentProfileId(), profileId, 'should be active');
    
    profileManager.deleteProfile(profileId);
    assert.equal(profileManager.getCurrentProfileId(), null, 'should clear current profile');
  });

  test('should save and load profile data', () => {
    const listResult = profileManager.listProfiles();
    if (listResult.profiles.length > 0) {
      const profileId = listResult.profiles[0].id;
      profileManager.loadProfile(profileId);
      
      const testData = { test: 'data', timestamp: Date.now() };
      profileManager.saveCurrentProfileData('test.json', testData);
      
      const loaded = profileManager.getCurrentProfileData('test.json');
      assert.deepEqual(loaded, testData, 'data should match');
    }
  });

  test('should recover data from sqlite mirror when JSON file missing', () => {
    const listResult = profileManager.listProfiles();
    if (listResult.profiles.length > 0) {
      const profileId = listResult.profiles[0].id;
      profileManager.loadProfile(profileId);

      const testData = { via: 'sqlite-mirror', timestamp: Date.now() };
      profileManager.saveCurrentProfileData('mirror.json', testData);

      const mirrorPath = profileManager.getCurrentProfilePath('mirror.json');
      assert.ok(fs.existsSync(mirrorPath), 'mirror.json should exist after save');
      fs.unlinkSync(mirrorPath);
      assert.ok(!fs.existsSync(mirrorPath), 'mirror.json should be removed for test');

      const recovered = profileManager.getCurrentProfileData('mirror.json');
      assert.deepEqual(recovered, testData, 'should read data from sqlite mirror');
      assert.ok(fs.existsSync(mirrorPath), 'mirror.json should be regenerated from sqlite');
    }
  });

  test('should handle missing data file gracefully', () => {
    const listResult = profileManager.listProfiles();
    if (listResult.profiles.length > 0) {
      const profileId = listResult.profiles[0].id;
      profileManager.loadProfile(profileId);
      
      const data = profileManager.getCurrentProfileData('nonexistent.json');
      assert.equal(data, null, 'should return null for missing file');
    }
  });

  test('should get profile directory path', () => {
    const listResult = profileManager.listProfiles();
    if (listResult.profiles.length > 0) {
      const profileId = listResult.profiles[0].id;
      const dirPath = profileManager.getProfileDir(profileId);
      
      assert.ok(dirPath, 'should return path');
      assert.ok(dirPath.includes(profileId), 'path should include profile ID');
    }
  });

  test('should get profile data file path', () => {
    const listResult = profileManager.listProfiles();
    if (listResult.profiles.length > 0) {
      const profileId = listResult.profiles[0].id;
      const filePath = profileManager.getProfileDataPath(profileId, 'metadata.json');
      
      assert.ok(filePath, 'should return path');
      assert.ok(filePath.includes(profileId), 'path should include profile ID');
      assert.ok(filePath.includes('metadata.json'), 'path should include filename');
    }
  });

  test('should trim whitespace from profile names', () => {
    // First clear profiles to avoid hitting limit
    const listResult = profileManager.listProfiles();
    listResult.profiles.forEach(p => profileManager.deleteProfile(p.id));
    
    const result = profileManager.createProfile('  Trimmed Name  ');
    
    assert.equal(result.success, true, 'should succeed');
    assert.equal(result.profile.name, 'Trimmed Name', 'should trim whitespace');
  });

  test('should track profile metadata', () => {
    const listResult = profileManager.listProfiles();
    if (listResult.profiles.length > 0) {
      const profile = listResult.profiles[0];
      
      assert.ok(profile.createdAt, 'should have created timestamp');
      assert.ok(profile.lastPlayedAt, 'should have last played timestamp');
      assert.equal(typeof profile.level, 'number', 'should have level');
      assert.equal(typeof profile.xp, 'number', 'should have XP');
    }
  });

  test('should hydrate metadata from sqlite when metadata.json missing', () => {
    const listResult = profileManager.listProfiles();
    if (listResult.profiles.length > 0) {
      const profileId = listResult.profiles[0].id;
      const metadataPath = profileManager.getProfileDataPath(profileId, 'metadata.json');
      const beforeLevel = JSON.parse(fs.readFileSync(metadataPath, 'utf8')).level;
      fs.unlinkSync(metadataPath);
      assert.ok(!fs.existsSync(metadataPath), 'metadata.json should be removed before hydration');

      const refreshed = profileManager.listProfiles();
      const hydrated = refreshed.profiles.find((p) => p.id === profileId);
      assert.ok(hydrated, 'profile should still be listed');
      assert.equal(typeof hydrated.level, 'number', 'hydrated profile should include level');
      assert.ok(fs.existsSync(metadataPath), 'metadata.json should be restored from sqlite');
      const restored = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      assert.equal(restored.level, beforeLevel, 'restored metadata should match stored value');
    }
  });

  test('should update index when creating profile', () => {
    const beforeCount = profileManager.loadIndex().profiles.length;
    
    // Make sure we can create one more
    if (beforeCount >= 3) {
      const listResult = profileManager.listProfiles();
      profileManager.deleteProfile(listResult.profiles[0].id);
    }
    
    const newName = 'NewProfile' + Date.now();
    const result = profileManager.createProfile(newName);
    assert.equal(result.success, true, 'creation should succeed');
    
    const afterCount = profileManager.loadIndex().profiles.length;
    assert.ok(afterCount > beforeCount, 'profile count should increase');
  });

  test('should update index when deleting profile', () => {
    const createResult = profileManager.createProfile('ToDeleteFromIndex' + Date.now());
    if (!createResult.success) {
      // Hit limit, delete one first
      const listResult = profileManager.listProfiles();
      profileManager.deleteProfile(listResult.profiles[0].id);
      const retry = profileManager.createProfile('ToDeleteFromIndex' + Date.now());
      assert.equal(retry.success, true, 'creation should succeed after clearing space');
    }
    
    const beforeCount = profileManager.loadIndex().profiles.length;
    const profileId = createResult.success ? createResult.profile.id : profileManager.loadIndex().profiles[0].id;
    
    profileManager.deleteProfile(profileId);
    
    const afterCount = profileManager.loadIndex().profiles.length;
    assert.equal(afterCount, beforeCount - 1, 'profile count should decrease');
  });

  test('should purge sqlite entries when deleting a profile', () => {
    const label = `SQLiteDelete-${Date.now()}`;
    let createResult = profileManager.createProfile(label);
    if (!createResult.success) {
      const listResult = profileManager.listProfiles();
      profileManager.deleteProfile(listResult.profiles[0].id);
      createResult = profileManager.createProfile(label);
      assert.equal(createResult.success, true, 'profile should be created after clearing space');
    }

    const profileId = createResult.profile.id;
    const metadataPath = profileManager.getProfileDataPath(profileId, 'metadata.json');
    profileManager.loadProfile(profileId);
    profileManager.saveCurrentProfileData('sqlite-delete.json', { value: 1 });
    assert.ok(profileManager.kvStore?.getByPath(metadataPath), 'metadata should exist in sqlite before deletion');

    profileManager.deleteProfile(profileId);
    const stored = profileManager.kvStore?.getByPath(metadataPath);
    assert.equal(stored, undefined, 'sqlite entries should be removed when profile is deleted');
  });

  test('should write sqlite database file alongside JSON backups', async () => {
    const storagePath = path.join(tempRoot, 'storage', 'mypal.sqlite');
    await sqliteStore.flush();
    assert.ok(fs.existsSync(storagePath), 'sqlite mirror file should exist');
    const stats = fs.statSync(storagePath);
    assert.ok(stats.size > 0, 'sqlite mirror file should contain data');
  });
});
