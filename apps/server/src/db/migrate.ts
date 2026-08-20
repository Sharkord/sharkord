import type { Database } from 'bun:sqlite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { config } from '../config';
import { logger } from '../logger';

type TForeignKeyViolation = {
  table: string;
};

// foreign keys are off for the whole run below, so a migration can leave a dangling
// reference behind and nothing complains: sqlite never revalidates existing rows when the
// pragma comes back on. 0018's opening DELETE is the live example, it removes orphaned
// messages without cascading to their files or reactions. reported rather than thrown,
// because refusing to boot over rows that are already written helps nobody
const reportForeignKeyViolations = (sqlite: Database) => {
  const violations = sqlite
    .query('PRAGMA foreign_key_check')
    .all() as TForeignKeyViolation[];

  if (violations.length > 0) {
    const countByTable = violations.reduce<Record<string, number>>(
      (acc, violation) => {
        acc[violation.table] = (acc[violation.table] ?? 0) + 1;

        return acc;
      },
      {}
    );

    const summary = Object.entries(countByTable)
      .map(([table, count]) => `${table} (${count})`)
      .join(', ');

    logger.error(
      'Database has %d row(s) pointing at rows that do not exist: %s',
      violations.length,
      summary
    );
  } else {
    logger.debug('No foreign key violations found in the database.');
  }
};

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

  if (config.server.debug) {
    reportForeignKeyViolations(sqlite);
  }
};

export { migrateDatabase };
