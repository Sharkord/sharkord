import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, mock } from 'bun:test';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { DRIZZLE_PATH, setTestDb } from './mock-db';
import { seedDatabase } from './seed';

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

const noop = () => {};

global.console.log = noop;
global.console.info = noop;
global.console.warn = noop;
global.console.debug = noop;

mock.module('../logger', () => ({
  logger: {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    trace: noop,
    fatal: noop
  }
}));

let tdb: BunSQLiteDatabase;
let sqlite: Database | null = null;

beforeEach(async () => {
  if (sqlite) {
    try {
      sqlite.close();
    } catch {
      // ignore
    }
  }

  sqlite = new Database(':memory:', { create: true, strict: true });

  tdb = drizzle({ client: sqlite });

  // updates the mocked db to use this new test database
  setTestDb(tdb);

  // apply migrations and seed data for this test
  await migrate(tdb, { migrationsFolder: DRIZZLE_PATH });
  await seedDatabase(tdb);
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

export { tdb };
