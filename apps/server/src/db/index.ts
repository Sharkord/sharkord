import { Database } from 'bun:sqlite';
import { BunSQLiteDatabase, drizzle } from 'drizzle-orm/bun-sqlite';
import { DB_PATH, DRIZZLE_PATH } from '../helpers/paths';
import { migrateDatabase } from './migrate';
import { seedDatabase } from './seed';

let db: BunSQLiteDatabase;

const loadDb = async () => {
  const sqlite = new Database(DB_PATH, { create: true, strict: true });

  sqlite.run('PRAGMA journal_mode = WAL;');
  sqlite.run('PRAGMA synchronous = NORMAL;');
  sqlite.run('PRAGMA busy_timeout = 5000;');

  db = drizzle({ client: sqlite });

  await migrateDatabase(sqlite, db, DRIZZLE_PATH);
  await seedDatabase();
};

export { db, loadDb };
