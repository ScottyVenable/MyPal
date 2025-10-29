import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DB_NAME = 'mypal.sqlite';
const FLUSH_DELAY_MS = 50;

class NullSqliteStore {
  constructor(logger = console) {
    this.logger = logger;
  }

  isEnabled() {
    return false;
  }

  async ready() {
    return true;
  }

  getByPath() {
    return undefined;
  }

  setByPath() {}

  deleteByPath() {}

  deleteByPrefix() {}

  async flush() {}

  dispose() {}
}

class SqliteStore {
  constructor({ dataDir, dbPath, db, logger = console }) {
    this.dataDir = dataDir;
    this.dbPath = dbPath;
    this.db = db;
    this.logger = logger;
    this.flushTimer = null;
    this.isDisposed = false;

    this.prepare();
    this.installExitHook();
  }

  isEnabled() {
    return true;
  }

  async ready() {
    return true;
  }

  prepare() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  installExitHook() {
    this.exitHandler = () => {
      try {
        this.flushSync();
      } catch (err) {
        this.logger?.warn?.('[SQLITE] Failed to flush database on exit:', err?.message || err);
      }
    };

    process.on('exit', this.exitHandler);
  }

  keyFromPath(filePath) {
    const relative = path.relative(this.dataDir, filePath);
    if (!relative || relative.startsWith('..')) {
      return null;
    }
    return `file:${relative.replace(/\\/g, '/')}`;
  }

  getByPath(filePath) {
    const key = this.keyFromPath(filePath);
    if (!key) return undefined;

    try {
      const stmt = this.db.prepare('SELECT value FROM kv_store WHERE key = ?1');
      try {
        stmt.bind([key]);
        if (!stmt.step()) {
          return undefined;
        }
        const row = stmt.getAsObject();
        if (!row || typeof row.value !== 'string') {
          return undefined;
        }
        return JSON.parse(row.value);
      } finally {
        stmt.free();
      }
    } catch (err) {
      this.logger?.warn?.('[SQLITE] Failed to read key', key, err?.message || err);
      return undefined;
    }
  }

  setByPath(filePath, value, { immediate = false } = {}) {
    const key = this.keyFromPath(filePath);
    if (!key) return;
    if (value === undefined) {
      return;
    }

    try {
      const payload = JSON.stringify(value ?? null);
      this.db.run(
        `INSERT INTO kv_store (key, value, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
        [key, payload, Date.now()]
      );
      this.scheduleFlush(immediate);
    } catch (err) {
      this.logger?.error?.('[SQLITE] Failed to store key', key, err?.message || err);
    }
  }

  deleteByPath(filePath, { immediate = false } = {}) {
    const key = this.keyFromPath(filePath);
    if (!key) return;

    try {
      this.db.run('DELETE FROM kv_store WHERE key = ?1', [key]);
      this.scheduleFlush(immediate);
    } catch (err) {
      this.logger?.warn?.('[SQLITE] Failed to delete key', key, err?.message || err);
    }
  }

  deleteByPrefix(prefixPath, { immediate = false } = {}) {
    const relative = path.relative(this.dataDir, prefixPath);
    if (!relative || relative.startsWith('..')) {
      return;
    }
    const normalized = `file:${relative.replace(/\\/g, '/')}`;
    try {
      this.db.run('DELETE FROM kv_store WHERE key LIKE ?1', [`${normalized}%`]);
      this.scheduleFlush(immediate);
    } catch (err) {
      this.logger?.warn?.('[SQLITE] Failed to delete keys with prefix', normalized, err?.message || err);
    }
  }

  dispose() {
    this.isDisposed = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushSync();
    if (this.exitHandler) {
      process.off('exit', this.exitHandler);
      this.exitHandler = null;
    }
    this.db.close();
  }

  scheduleFlush(immediate = false) {
    if (this.isDisposed) return;
    if (immediate) {
      this.flushSync();
      return;
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushSync();
    }, FLUSH_DELAY_MS);
  }

  flushSync() {
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      this.logger?.error?.('[SQLITE] Failed to flush database to disk:', err?.message || err);
    }
  }

  async flush() {
    this.flushSync();
  }
}

export async function createSqliteStore(dataDir, logger = console) {
  const storageDir = path.join(dataDir, 'storage');
  try {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const dbPath = path.join(storageDir, DEFAULT_DB_NAME);
    const wasmPath = path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

    const SQL = await initSqlJs({
      locateFile: (file) => {
        if (file === 'sql-wasm.wasm') {
          return wasmPath;
        }
        return file;
      }
    });

    const db = fs.existsSync(dbPath)
      ? new SQL.Database(new Uint8Array(fs.readFileSync(dbPath)))
      : new SQL.Database();

    return new SqliteStore({ dataDir, dbPath, db, logger });
  } catch (err) {
    logger?.warn?.('[SQLITE] Falling back to JSON-only mode:', err?.message || err);
    return new NullSqliteStore(logger);
  }
}

export default createSqliteStore;
