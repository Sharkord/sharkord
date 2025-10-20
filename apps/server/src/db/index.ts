import { Database } from 'bun:sqlite';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { BunSQLiteDatabase, drizzle } from 'drizzle-orm/bun-sqlite';
import { DB_PATH, DRIZZLE_PATH } from '../helpers/paths';
import { getSettings } from './queries/others/get-settings';
import { seedDatabase } from './seed';

let db: BunSQLiteDatabase;

const loadDb = async () => {
  const sqlite = new Database(DB_PATH, { create: true, strict: true });

  db = drizzle({ client: sqlite });

  await migrate(db, { migrationsFolder: DRIZZLE_PATH });
  await seedDatabase();

  const { secretToken } = await getSettings();

  if (!secretToken) {
    throw new Error('Secret token not found in database settings');
  }
};

export { db, loadDb };
