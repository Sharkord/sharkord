import { getErrorMessage } from '@sharkord/shared';
import type { Database } from 'bun:sqlite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import fs from 'fs/promises';
import path from 'path';
import { BACKUPS_PATH } from '../helpers/paths';
import { logger } from '../logger';

type TForeignKeyViolation = {
  table: string;
};

type TJournal = {
  entries: { when: number; tag: string }[];
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

// drizzle's migrate() takes no logger and no callback, so the only way to name what it ran
// is to apply its own rule first: it runs every journal entry stamped later than the newest
// row in its migrations table (sqlite-core/dialect.js). read before the run, because after a
// failure the table has been rolled back and no longer says what was pending
const getPendingMigrationTags = async (
  sqlite: Database,
  migrationsFolder: string
): Promise<string[]> => {
  let journal: TJournal;

  try {
    journal = JSON.parse(
      await fs.readFile(
        path.join(migrationsFolder, 'meta', '_journal.json'),
        'utf-8'
      )
    ) as TJournal;
  } catch {
    // migrate() is about to fail on the same file and say so properly
    return [];
  }

  let appliedThrough = 0;

  try {
    const lastApplied = sqlite
      .query(
        'SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1'
      )
      .get() as { created_at: number } | null;

    appliedThrough = Number(lastApplied?.created_at ?? 0);
  } catch {
    // the table does not exist until the first run creates it, so everything is pending
  }

  return journal.entries
    .filter((entry) => entry.when > appliedThrough)
    .map((entry) => entry.tag);
};

// VACUUM INTO, not a file copy: WAL splits the committed state across db.sqlite and its
// -wal. never pruned, so this costs the size of the database per distinct pre-migration state
const backupDatabase = async (
  sqlite: Database,
  pendingTags: string[]
): Promise<void> => {
  const { filename } = sqlite;

  if (!filename || filename === ':memory:') return;

  await fs.mkdir(BACKUPS_PATH, { recursive: true });

  const suffix = `.before-${pendingTags[0]}.sqlite`;
  const existing = (await fs.readdir(BACKUPS_PATH)).find(
    (name) => name.startsWith(path.basename(filename)) && name.endsWith(suffix)
  );

  // a failed migration rolls the whole batch back, so the database cannot have moved since
  // that snapshot was taken and a second one would be a copy of it. this is what stops a
  // restart loop on a broken migration writing a full copy per attempt
  if (existing) {
    logger.info(
      `Database already backed up to ${path.join(BACKUPS_PATH, existing)}`
    );

    return;
  }

  const backupPath = path.join(
    BACKUPS_PATH,
    `${path.basename(filename)}.${Date.now()}${suffix}`
  );

  sqlite.run('VACUUM INTO ?', [backupPath]);

  logger.info(`Database backed up to ${backupPath}`);
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
  const pendingTags = await getPendingMigrationTags(sqlite, migrationsFolder);

  // not caught: running a destructive migration with no way back is worse than not booting
  if (pendingTags.length > 0) {
    await backupDatabase(sqlite, pendingTags);
  }

  sqlite.run('PRAGMA foreign_keys = OFF;');

  // finally, not a trailing statement: a migration that throws would otherwise leave the
  // connection with foreign keys off, and every cascade in the schema depends on them
  try {
    await migrate(db, { migrationsFolder });
  } catch (error) {
    // drizzle runs the batch in one transaction and rolls back, so the database is
    // untouched and the old server version still boots against it
    logger.error(
      'Migration failed while applying %s. The database was rolled back and is unchanged: %s',
      pendingTags.join(', '),
      getErrorMessage(error)
    );

    throw error;
  } finally {
    sqlite.run('PRAGMA foreign_keys = ON;');
  }

  // after the migrator returns, because it runs the whole batch in one transaction: a
  // rollback means none of these ran, and saying so beforehand would be a lie
  if (pendingTags.length === 0) {
    logger.debug('No migrations to run');
  }

  for (const tag of pendingTags) {
    logger.info(`Migration ${tag} ran`);
  }

  reportForeignKeyViolations(sqlite);
};

export { migrateDatabase };
