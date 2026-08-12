import { Database } from 'bun:sqlite';
import { afterAll, afterEach, beforeAll, beforeEach, mock } from 'bun:test';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import fs from 'fs/promises';
import path from 'path';
import { DATA_PATH } from '../helpers/paths';
import { clearVoiceMoveGrantsForTests } from '../helpers/voice-move-grants';
import { createHttpServer } from '../http';
import { loadMediasoup } from '../utils/mediasoup';
import { clearRateLimitersForTests } from '../utils/rate-limiters/rate-limiter';
import { DRIZZLE_PATH, setTestDb } from './mock-db';
import { seedTestDb } from './seed';

/**
 * Global test setup - creates a fresh isolated database before each test.
 * This ensures tests don't interfere with each other.
 *
 * The database is:
 * 1. Created in-memory (fast, isolated)
 * 2. Migrated (applies schema)
 * 3. Seeded (with test data)
 * 4. Set as the mocked db (via setTestDb)
 * 5. Cleaned up after the test
 */

const DISABLE_CONSOLE = true;
const CLEANUP_AFTER_FINISH = true;

type TTestLogEntry = {
  level: 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'fatal';
  message: string;
};

// the suite silences the logger, which used to make "caught the error, logged it and carried
// on" indistinguishable from success. entries are collected here so a test can assert that a
// path really did fail quietly. cleared before every test by the beforeEach below
const testLogs: TTestLogEntry[] = [];

const findTestLog = (level: TTestLogEntry['level'], substring: string) =>
  testLogs.find(
    (entry) => entry.level === level && entry.message.includes(substring)
  );

if (DISABLE_CONSOLE) {
  const noop = () => {};

  global.console.log = noop;
  global.console.info = noop;
  global.console.warn = noop;
  global.console.debug = noop;

  const record =
    (level: TTestLogEntry['level']) =>
    (...args: unknown[]) => {
      testLogs.push({ level, message: args.map(String).join(' ') });
    };

  mock.module('../logger', () => ({
    logger: {
      info: record('info'),
      warn: record('warn'),
      error: record('error'),
      debug: record('debug'),
      trace: record('trace'),
      fatal: record('fatal')
    }
  }));
}

let tdb: BunSQLiteDatabase;
let sqlite: Database | null = null;
let testsBaseUrl: string;

beforeAll(async () => {
  const server = await createHttpServer(0);
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Test HTTP server did not bind to a TCP port');
  }

  await loadMediasoup();

  testsBaseUrl = `http://localhost:${address.port}`;
});

beforeEach(async () => {
  testLogs.length = 0;

  clearRateLimitersForTests();
  clearVoiceMoveGrantsForTests();

  if (sqlite) {
    try {
      sqlite.close();
    } catch {
      // ignore
    }
  }

  sqlite = new Database(':memory:', { create: true, strict: true });
  sqlite.run('PRAGMA foreign_keys = ON;');

  tdb = drizzle({ client: sqlite });

  // updates the mocked db to use this new test database
  setTestDb(tdb);

  // apply migrations and seed data for this test
  await migrate(tdb, { migrationsFolder: DRIZZLE_PATH });
  await seedTestDb(tdb);
});

afterEach(() => {
  if (sqlite) {
    try {
      sqlite.close();
      sqlite = null;
    } catch {
      // ignore
    }
  }
});

afterAll(async () => {
  if (!CLEANUP_AFTER_FINISH) return;

  const expectedTestPath = path.resolve(process.cwd(), './data-test');

  if (path.resolve(DATA_PATH) !== expectedTestPath) return;

  try {
    await fs.rm(DATA_PATH, { recursive: true });
  } catch {
    // ignore
  }
});

export { findTestLog, tdb, testLogs, testsBaseUrl };
