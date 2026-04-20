import fs from 'fs';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Storage Utility for optimized JSON file operations
 * Provides minified JSON storage and optional gzip compression
 */
class StorageUtil {
  /**
   * Read JSON file with automatic decompression
   * @param {string} filePath - Path to the JSON file
   * @param {*} defaultValue - Default value if file doesn't exist
   * @param {boolean} compressed - Whether the file is gzip compressed
   * @returns {*} Parsed JSON data
   */
  static readJson(filePath, defaultValue = null, compressed = false) {
    try {
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }

      const buffer = fs.readFileSync(filePath);
      
      if (compressed) {
        const decompressed = zlib.gunzipSync(buffer);
        return JSON.parse(decompressed.toString('utf8'));
      }
      
      return JSON.parse(buffer.toString('utf8'));
    } catch (err) {
      console.error(`Failed to read JSON from ${filePath}:`, err);
      return defaultValue;
    }
  }

  /**
   * Write JSON file with optional compression (minified by default)
   * @param {string} filePath - Path to the JSON file
   * @param {*} data - Data to write
   * @param {boolean} compressed - Whether to gzip compress the file
   * @param {boolean} pretty - Whether to pretty-print (default: false for space efficiency)
   * @returns {boolean} Success status
   */
  static writeJson(filePath, data, compressed = false, pretty = false) {
    try {
      const jsonString = pretty 
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);

      if (compressed) {
        const compressedData = zlib.gzipSync(jsonString);
        fs.writeFileSync(filePath + '.gz', compressedData);
        return true;
      }

      fs.writeFileSync(filePath, jsonString, 'utf8');
      return true;
    } catch (err) {
      console.error(`Failed to write JSON to ${filePath}:`, err);
      return false;
    }
  }

  /**
   * Migrate a file from pretty-printed to minified format
   * @param {string} filePath - Path to the JSON file
   * @returns {object} Migration statistics
   */
  static minifyFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const originalSize = fs.statSync(filePath).size;
      const data = this.readJson(filePath);
      
      if (data === null) {
        return { success: false, error: 'Failed to read file' };
      }

      this.writeJson(filePath, data, false, false);
      const newSize = fs.statSync(filePath).size;

      return {
        success: true,
        originalSize,
        newSize,
        savings: originalSize - newSize,
        percentSaved: ((originalSize - newSize) / originalSize * 100).toFixed(2)
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Compress a file to .gz format
   * @param {string} filePath - Path to the JSON file
   * @returns {object} Compression statistics
   */
  static compressFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const originalSize = fs.statSync(filePath).size;
      const data = this.readJson(filePath);
      
      if (data === null) {
        return { success: false, error: 'Failed to read file' };
      }

      // Write compressed version
      this.writeJson(filePath, data, true, false);
      const compressedPath = filePath + '.gz';
      const newSize = fs.statSync(compressedPath).size;

      // Remove original uncompressed file
      fs.unlinkSync(filePath);

      return {
        success: true,
        originalSize,
        newSize,
        savings: originalSize - newSize,
        percentSaved: ((originalSize - newSize) / originalSize * 100).toFixed(2),
        compressedPath
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Decompress a .gz file back to regular JSON
   * @param {string} filePath - Path to the .gz file
   * @returns {object} Decompression status
   */
  static decompressFile(filePath) {
    try {
      const gzPath = filePath.endsWith('.gz') ? filePath : filePath + '.gz';
      
      if (!fs.existsSync(gzPath)) {
        return { success: false, error: 'Compressed file not found' };
      }

      const data = this.readJson(gzPath, null, true);
      
      if (data === null) {
        return { success: false, error: 'Failed to read compressed file' };
      }

      const targetPath = filePath.endsWith('.gz') ? filePath.slice(0, -3) : filePath;
      this.writeJson(targetPath, data, false, false);

      return {
        success: true,
        decompressedPath: targetPath
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get file size statistics
   * @param {string} filePath - Path to the file
   * @returns {object} Size information
   */
  static getFileSize(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { exists: false };
      }

      const stats = fs.statSync(filePath);
      return {
        exists: true,
        bytes: stats.size,
        kb: (stats.size / 1024).toFixed(2),
        mb: (stats.size / (1024 * 1024)).toFixed(2)
      };
    } catch (err) {
      return { exists: false, error: err.message };
    }
  }

  /**
   * Check if a file should be compressed based on size threshold
   * @param {string} filePath - Path to the file
   * @param {number} thresholdKB - Threshold in KB (default: 50KB)
   * @returns {boolean} Whether file should be compressed
   */
  static shouldCompress(filePath, thresholdKB = 50) {
    const size = this.getFileSize(filePath);
    return size.exists && (size.bytes / 1024) > thresholdKB;
  }
}

export default StorageUtil;
