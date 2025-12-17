import { Database } from 'bun:sqlite';
import { afterEach, beforeEach } from 'bun:test';
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

let tdb: BunSQLiteDatabase;

beforeEach(async () => {
  const sqlite = new Database(':memory:', { create: true, strict: true });

  tdb = drizzle({ client: sqlite });

  // updates the mocked db to use this new test database
  setTestDb(tdb);

  // apply migrations and seed data for this test
  await migrate(tdb, { migrationsFolder: DRIZZLE_PATH });
  await seedDatabase(tdb);
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sqliteDb = (tdb as any).session.db;

  if (sqliteDb && typeof sqliteDb.close === 'function') {
    sqliteDb.close();
  }
});

export { tdb };
