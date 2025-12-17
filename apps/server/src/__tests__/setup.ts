import { Database } from 'bun:sqlite';
import { afterEach, beforeEach } from 'bun:test';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { DRIZZLE_PATH } from '../helpers/paths';
import { seedDatabase } from './seed';

let tdb: BunSQLiteDatabase;

beforeEach(async () => {
  const sqlite = new Database(':memory:', { create: true, strict: true });

  tdb = drizzle({ client: sqlite });

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
