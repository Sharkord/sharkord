import { Database } from 'bun:sqlite';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { BunSQLiteDatabase, drizzle } from 'drizzle-orm/bun-sqlite';
import { DB_PATH, DRIZZLE_PATH } from '../helpers/paths';
import * as schema from './schema';
import { seedDatabase } from './seed';

let db: BunSQLiteDatabase<typeof schema>;

const loadDb = async () => {
  const sqlite = new Database(DB_PATH, { create: true, strict: true });

  sqlite.run('PRAGMA foreign_keys = ON;');

  db = drizzle(sqlite, { schema });

  await migrate(db, { migrationsFolder: DRIZZLE_PATH });
  await seedDatabase();
};

export { db, loadDb };
