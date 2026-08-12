import { Database } from 'bun:sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import fs from 'fs/promises';
import path from 'path';
import { seedTestDb } from '../../../../apps/server/src/__tests__/seed';
import { e2eDataPath } from '../statics';

// run by the `seed:e2e` script before playwright starts, not from a globalSetup hook:
// playwright launches `webServer` *before* globalSetup, so a hook would seed a database the
// server had already booted on and production-seeded, and the server's open handle would keep
// serving the old rows. seeding first means the server's seedDatabase() finds a settings row
// and no-ops, which is what keeps the fixtures out of apps/server's boot path

const MIGRATIONS_PATH = path.resolve(
  import.meta.dir,
  '../../../../apps/server/src/db/migrations'
);

// a crashed run leaves the directory behind, and seeding on top of it would violate the
// single-row settings index rather than fail with anything readable
await fs.rm(e2eDataPath, { recursive: true, force: true });
await fs.mkdir(e2eDataPath, { recursive: true });

const sqlite = new Database(path.join(e2eDataPath, 'db.sqlite'), {
  create: true,
  strict: true
});

sqlite.run('PRAGMA foreign_keys = ON;');

const db = drizzle({ client: sqlite });

await migrate(db, { migrationsFolder: MIGRATIONS_PATH });
await seedTestDb(db, { e2e: true });

sqlite.close();
