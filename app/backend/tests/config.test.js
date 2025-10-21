import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildConfig } from '../src/config.js';

const tempRoots = [];

after(() => {
  for (const dir of tempRoots) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {}
  }
});

describe('environment configuration validation', () => {
  it('accepts valid overrides for directories and primitives', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-config-valid-'));
    tempRoots.push(root);
    const env = {
      MYPAL_DATA_DIR: path.join(root, 'data'),
      MYPAL_LOGS_DIR: path.join(root, 'logs'),
      MYPAL_MODELS_DIR: path.join(root, 'models'),
      PORT: '4100',
      MYPAL_FORCE_TELEMETRY: 'true',
    };

    const { config, errors } = buildConfig(env);
    assert.deepEqual(errors, []);
    assert.equal(config.port, 4100);
    assert.equal(config.telemetryForce, true);
    assert.equal(config.dataDir, path.resolve(env.MYPAL_DATA_DIR));
    assert.equal(config.logsDir, path.resolve(env.MYPAL_LOGS_DIR));
    assert.equal(config.modelsDir, path.resolve(env.MYPAL_MODELS_DIR));
  });

  it('collects errors for invalid inputs', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mypal-config-invalid-'));
    tempRoots.push(root);
    const bogusFile = path.join(root, 'file.txt');
    fs.writeFileSync(bogusFile, 'not a directory');

    const env = {
      MYPAL_DATA_DIR: bogusFile,
      PORT: 'not-a-port',
      MYPAL_FORCE_TELEMETRY: 'maybe',
    };

    const { errors } = buildConfig(env);
    assert.equal(errors.length >= 3, true);
    assert.equal(errors.some(err => err.includes('MYPAL_DATA_DIR')), true);
    assert.equal(errors.some(err => err.includes('PORT')), true);
    assert.equal(errors.some(err => err.includes('MYPAL_FORCE_TELEMETRY')), true);
  });
});
