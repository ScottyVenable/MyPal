#!/usr/bin/env node

/**
 * Migration script to optimize existing profile data
 * - Converts pretty-printed JSON to minified format
 * - Compresses large files (neural.json)
 * - Reports storage savings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import StorageUtil from '../src/storageUtil.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.MYPAL_DATA_DIR || 
                 process.env.DATA_DIR || 
                 path.join(__dirname, '..', 'data');

const PROFILES_DIR = path.join(DATA_DIR, 'profiles');

// Track statistics
const stats = {
  profilesProcessed: 0,
  filesMinified: 0,
  filesCompressed: 0,
  totalOriginalSize: 0,
  totalNewSize: 0,
  errors: []
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function migrateProfile(profilePath) {
  console.log(`\n📁 Processing profile: ${path.basename(profilePath)}`);
  
  const files = [
    'metadata.json',
    'chat-log.json',
    'memories.json',
    'vocabulary.json',
    'journal.json',
    'concepts.json',
    'facts.json',
    'neural.json',
    'settings.json'
  ];

  let profileOriginalSize = 0;
  let profileNewSize = 0;

  for (const filename of files) {
    const filePath = path.join(profilePath, filename);
    
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const originalSize = fs.statSync(filePath).size;
    profileOriginalSize += originalSize;

    try {
      // Special handling for neural.json - compress it
      if (filename === 'neural.json' && originalSize > 50 * 1024) {
        console.log(`  🗜️  Compressing ${filename} (${formatBytes(originalSize)})...`);
        const result = StorageUtil.compressFile(filePath);
        
        if (result.success) {
          stats.filesCompressed++;
          profileNewSize += result.newSize;
          console.log(`     ✓ Compressed to ${formatBytes(result.newSize)} (${result.percentSaved}% saved)`);
        } else {
          console.error(`     ✗ Failed to compress: ${result.error}`);
          stats.errors.push({ file: filePath, error: result.error });
          profileNewSize += originalSize;
        }
      } else {
        // Minify other files
        const result = StorageUtil.minifyFile(filePath);
        
        if (result.success) {
          stats.filesMinified++;
          profileNewSize += result.newSize;
          
          const saved = result.originalSize - result.newSize;
          if (saved > 0) {
            console.log(`  ✓ Minified ${filename}: ${formatBytes(result.originalSize)} → ${formatBytes(result.newSize)} (${result.percentSaved}% saved)`);
          } else {
            console.log(`  • ${filename}: Already optimized`);
          }
        } else {
          console.error(`  ✗ Failed to minify ${filename}: ${result.error}`);
          stats.errors.push({ file: filePath, error: result.error });
          profileNewSize += originalSize;
        }
      }
    } catch (err) {
      console.error(`  ✗ Error processing ${filename}:`, err.message);
      stats.errors.push({ file: filePath, error: err.message });
      profileNewSize += originalSize;
    }
  }

  stats.totalOriginalSize += profileOriginalSize;
  stats.totalNewSize += profileNewSize;
  stats.profilesProcessed++;

  const profileSavings = profileOriginalSize - profileNewSize;
  const profilePercent = ((profileSavings / profileOriginalSize) * 100).toFixed(2);
  console.log(`  💾 Profile total: ${formatBytes(profileOriginalSize)} → ${formatBytes(profileNewSize)} (${profilePercent}% saved)`);
}

function migrateRootFiles() {
  console.log('\n📁 Processing root data files...');
  
  const rootFiles = [
    'profiles-index.json',
    'state.json',
    'users.json',
    'sessions.json'
  ];

  for (const filename of rootFiles) {
    const filePath = path.join(DATA_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      const result = StorageUtil.minifyFile(filePath);
      
      if (result.success) {
        stats.filesMinified++;
        stats.totalOriginalSize += result.originalSize;
        stats.totalNewSize += result.newSize;
        
        const saved = result.originalSize - result.newSize;
        if (saved > 0) {
          console.log(`  ✓ Minified ${filename}: ${formatBytes(result.originalSize)} → ${formatBytes(result.newSize)} (${result.percentSaved}% saved)`);
        } else {
          console.log(`  • ${filename}: Already optimized`);
        }
      } else {
        console.error(`  ✗ Failed to minify ${filename}: ${result.error}`);
        stats.errors.push({ file: filePath, error: result.error });
      }
    } catch (err) {
      console.error(`  ✗ Error processing ${filename}:`, err.message);
      stats.errors.push({ file: filePath, error: err.message });
    }
  }
}

function main() {
  console.log('🚀 MyPal Storage Optimization Migration');
  console.log('=====================================\n');
  console.log(`Data directory: ${DATA_DIR}`);

  // Check if profiles directory exists
  if (!fs.existsSync(PROFILES_DIR)) {
    console.log('\n⚠️  No profiles directory found. Nothing to migrate.');
    return;
  }

  // Migrate root files
  migrateRootFiles();

  // Migrate each profile
  const profiles = fs.readdirSync(PROFILES_DIR).filter(name => {
    const profilePath = path.join(PROFILES_DIR, name);
    return fs.statSync(profilePath).isDirectory();
  });

  if (profiles.length === 0) {
    console.log('\n⚠️  No profiles found. Nothing to migrate.');
    return;
  }

  for (const profileName of profiles) {
    const profilePath = path.join(PROFILES_DIR, profileName);
    migrateProfile(profilePath);
  }

  // Print summary
  console.log('\n\n📊 Migration Summary');
  console.log('===================');
  console.log(`Profiles processed: ${stats.profilesProcessed}`);
  console.log(`Files minified: ${stats.filesMinified}`);
  console.log(`Files compressed: ${stats.filesCompressed}`);
  console.log(`\nOriginal size: ${formatBytes(stats.totalOriginalSize)}`);
  console.log(`New size: ${formatBytes(stats.totalNewSize)}`);
  
  const totalSavings = stats.totalOriginalSize - stats.totalNewSize;
  const totalPercent = ((totalSavings / stats.totalOriginalSize) * 100).toFixed(2);
  console.log(`Total savings: ${formatBytes(totalSavings)} (${totalPercent}%)`);

  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    for (const { file, error } of stats.errors) {
      console.log(`  • ${file}: ${error}`);
    }
  }

  console.log('\n✅ Migration complete!');
}

// Run migration
main();
