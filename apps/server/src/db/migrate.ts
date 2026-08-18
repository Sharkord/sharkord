import type { Database } from 'bun:sqlite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';

// the only way migrations may be applied, because the pragma order is not optional.
//
// a rebuild migration (create __new_x, copy rows, drop x, rename) fires every child foreign
// key action on the drop, and the `PRAGMA foreign_keys=OFF` drizzle writes at the top of
// those files cannot stop it: sqlite makes that pragma a no-op inside a transaction and the
// migrator wraps every migration in one, so it only takes effect out here on the connection.
// getting this wrong cascaded away every message file, reaction, reply link and read marker
// on a real server, see R1 in AUDIT.md
const migrateDatabase = async (
  sqlite: Database,
  db: BunSQLiteDatabase,
  migrationsFolder: string
): Promise<void> => {
  sqlite.run('PRAGMA foreign_keys = OFF;');

  // finally, not a trailing statement: a migration that throws would otherwise leave the
  // connection with foreign keys off, and every cascade in the schema depends on them
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    sqlite.run('PRAGMA foreign_keys = ON;');
  }
};

export { migrateDatabase };
