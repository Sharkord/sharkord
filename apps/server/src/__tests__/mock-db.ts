import { Database } from 'bun:sqlite';
import { mock } from 'bun:test';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrateDatabase } from '../db/migrate';
import { DRIZZLE_PATH } from '../helpers/paths';
import { seedTestDb } from './seed';

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
let template: Uint8Array;

const initDb = async () => {
  const sqlite = new Database(':memory:', { create: true, strict: true });

  tdb = drizzle({ client: sqlite });

  await migrateDatabase(sqlite, tdb, DRIZZLE_PATH);
  await seedTestDb(tdb);

  // taken before any test writes to it
  template = sqlite.serialize();

  return tdb;
};

// every test gets its own copy of the database migrated and seeded once above. running the
// migrations and the seed again took about 25ms per test, a copy takes microseconds
const createTestSqlite = () => {
  const sqlite = Database.deserialize(template, { strict: true });

  // pragmas belong to the connection, the copy does not carry the one migrate turned on
  sqlite.run('PRAGMA foreign_keys = ON;');

  return sqlite;
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

export { createTestSqlite, DRIZZLE_PATH, getTestDb, setTestDb };
