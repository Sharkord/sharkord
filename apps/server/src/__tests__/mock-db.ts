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

mock.module('../db/index', () => ({
  get db() {
    return tdb;
  },
  loadDb: async () => {} // No-op in tests
}));

const setTestDb = (newDb: BunSQLiteDatabase) => {
  tdb = newDb;
};

const getTestDb = () => tdb;

export { DRIZZLE_PATH, getTestDb, setTestDb };
