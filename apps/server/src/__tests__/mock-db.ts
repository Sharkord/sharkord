import { Database } from 'bun:sqlite';
import { mock } from 'bun:test';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { DRIZZLE_PATH } from '../helpers/paths';
import { seedDatabase } from './seed';

/**
 * This file is preloaded FIRST (via bunfig.toml) to mock the db module
 * before any other code imports it.
 *
 * Architecture:
 * 1. mock-db.ts (this file) - Creates initial db for module imports
 * 2. setup.ts - beforeEach creates fresh db for each test
 *
 * The initial db here ensures that helper functions (like getMockedToken)
 * that are imported at module-level can access a valid database.
 * Then setup.ts replaces it with a fresh db for each test.
 *
 * CRITICAL: We use a Proxy to ensure all database access goes through
 * the getter, so that setTestDb() properly updates the active database.
 */

let tdb: BunSQLiteDatabase;

const initDb = async () => {
  const sqlite = new Database(':memory:', { create: true, strict: true });
  tdb = drizzle({ client: sqlite });

  await migrate(tdb, { migrationsFolder: DRIZZLE_PATH });
  await seedDatabase(tdb);

  return tdb;
};

await initDb();

// create a Proxy that forwards all operations to the current tdb
const dbProxy = new Proxy({} as BunSQLiteDatabase, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (tdb as any)[prop];
  },
  set(_target, prop, value) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tdb as any)[prop] = value;
    return true;
  }
});

mock.module('../db/index', () => ({
  db: dbProxy,
  loadDb: async () => {} // No-op in tests
}));

const setTestDb = (newDb: BunSQLiteDatabase) => {
  tdb = newDb;
};

const getTestDb = () => tdb;

export { DRIZZLE_PATH, getTestDb, setTestDb };
