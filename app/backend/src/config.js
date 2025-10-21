import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function coalesceEnv(env, ...keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(env, key) && env[key] !== undefined) {
      const value = env[key];
      if (typeof value === 'string' && value.trim() === '') {
        continue;
      }
      if (value !== undefined) {
        return { key, value };
      }
    }
  }
  return null;
}

function resolveDirectory(env, keys, defaultSegments, errors) {
  const entry = coalesceEnv(env, ...keys);
  if (!entry) {
    return { path: path.join(__dirname, ...defaultSegments), source: 'default' };
  }

  const resolved = path.resolve(String(entry.value));
  try {
    if (fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) {
        errors.push(`Environment variable ${entry.key} must point to a directory (received ${resolved}).`);
      }
    }
  } catch (error) {
    errors.push(`Unable to inspect path from ${entry.key} (${resolved}): ${error.message}`);
  }
  return { path: resolved, source: entry.key };
}

function parseBoolean(env, key, defaultValue, errors) {
  if (!Object.prototype.hasOwnProperty.call(env, key) || env[key] === undefined) {
    return defaultValue;
  }
  const raw = String(env[key]).trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  errors.push(`Environment variable ${key} must be a boolean-like value (0/1/true/false/yes/no).`);
  return defaultValue;
}

function parsePort(env, key, defaultValue, errors) {
  if (!Object.prototype.hasOwnProperty.call(env, key) || env[key] === undefined || env[key] === '') {
    return defaultValue;
  }
  const value = Number.parseInt(env[key], 10);
  if (!Number.isFinite(value) || value <= 0 || value > 65535) {
    errors.push(`Environment variable ${key} must be a valid port number (1-65535).`);
    return defaultValue;
  }
  return value;
}

export function buildConfig(env = process.env) {
  const errors = [];
  const dataDir = resolveDirectory(env, ['MYPAL_DATA_DIR', 'DATA_DIR'], ['..', 'data'], errors);
  const logsDir = resolveDirectory(env, ['MYPAL_LOGS_DIR', 'LOGS_DIR'], ['..', '..', '..', 'logs'], errors);
  const modelsDir = resolveDirectory(env, ['MYPAL_MODELS_DIR', 'MODELS_DIR'], ['..', 'models'], errors);

  const telemetryForce = parseBoolean(env, 'MYPAL_FORCE_TELEMETRY', false, errors);
  const port = parsePort(env, 'PORT', 3001, errors);

  return {
    config: {
      dataDir: dataDir.path,
      logsDir: logsDir.path,
      modelsDir: modelsDir.path,
      telemetryForce,
      port,
    },
    errors,
  };
}

export function loadConfig() {
  const { config, errors } = buildConfig(process.env);
  if (errors.length > 0) {
    const message = ['Environment validation failed:', ...errors.map(e => ` - ${e}`)].join('\n');
    const error = new Error(message);
    error.reasons = errors;
    throw error;
  }
  return config;
}
