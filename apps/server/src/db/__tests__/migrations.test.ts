import { Database } from 'bun:sqlite';
import { afterAll, describe, expect, test } from 'bun:test';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import fs from 'fs';
import path from 'path';
import { findTestLog } from '../../__tests__/setup';
import { SRC_MIGRATIONS_PATH, TMP_PATH } from '../../helpers/paths';
import { migrateDatabase } from '../migrate';

// the guard on migrateDatabase's pragma order. a rebuild migration (create __new_x, copy,
// drop x, rename) fires every child foreign key action on the drop unless foreign keys are
// off, and the `PRAGMA foreign_keys=OFF` drizzle writes into those files cannot do it: the
// migrator runs each migration in a transaction and sqlite makes the pragma a no-op inside
// one. this runs the real chain over real rows and proves they survive it
const REBUILD_MIGRATION = '0018_message_parent_reply_foreign_keys';

const workDir = path.join(TMP_PATH, 'migration-fk-test');

const buildPartialMigrationsFolder = (upToExclusive: string) => {
  const folder = path.join(workDir, 'partial');

  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(path.join(folder, 'meta'), { recursive: true });

  const journal = JSON.parse(
    fs.readFileSync(
      path.join(SRC_MIGRATIONS_PATH, 'meta', '_journal.json'),
      'utf-8'
    )
  ) as { entries: { idx: number; tag: string }[] };

  const cutoff = journal.entries.findIndex(
    (entry) => entry.tag === upToExclusive
  );

  expect(cutoff).toBeGreaterThan(0);

  journal.entries = journal.entries.slice(0, cutoff);

  // only the sql and the journal: the migrator never reads the snapshots, and the
  // hand-written data migrations do not all have one
  for (const entry of journal.entries) {
    fs.copyFileSync(
      path.join(SRC_MIGRATIONS_PATH, `${entry.tag}.sql`),
      path.join(folder, `${entry.tag}.sql`)
    );
  }

  fs.writeFileSync(
    path.join(folder, 'meta', '_journal.json'),
    JSON.stringify(journal)
  );

  return folder;
};

afterAll(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

describe('migrations', () => {
  // the pragma is turned off for the whole migration run, so the only thing that turns it
  // back on is the finally. a failed migration that left it off would give the process a
  // connection with no cascades and no constraint enforcement at all
  test('should turn foreign keys back on when a migration fails', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const dbPath = path.join(workDir, `fk-fail-${Date.now()}.sqlite`);
    const sqlite = new Database(dbPath, { create: true, strict: true });
    const db = drizzle({ client: sqlite });

    const brokenFolder = path.join(workDir, 'broken');

    fs.rmSync(brokenFolder, { recursive: true, force: true });
    fs.mkdirSync(path.join(brokenFolder, 'meta'), { recursive: true });
    fs.writeFileSync(
      path.join(brokenFolder, 'meta', '_journal.json'),
      JSON.stringify({
        version: '7',
        dialect: 'sqlite',
        entries: [
          {
            idx: 0,
            version: '6',
            when: 1,
            tag: '0000_broken',
            breakpoints: true
          }
        ]
      })
    );
    fs.writeFileSync(
      path.join(brokenFolder, '0000_broken.sql'),
      'THIS IS NOT SQL;'
    );

    const foreignKeysOn = () =>
      (sqlite.query('PRAGMA foreign_keys').get() as { foreign_keys: number })
        .foreign_keys === 1;

    await expect(migrateDatabase(sqlite, db, brokenFolder)).rejects.toThrow();

    expect(foreignKeysOn()).toBe(true);

    sqlite.close();
  });

  // migrations run with foreign keys off, and sqlite never revalidates existing rows when
  // the pragma comes back on, so a dangling reference a migration leaves behind is silent
  test('should report rows left pointing at rows that do not exist', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const dbPath = path.join(workDir, `fk-check-${Date.now()}.sqlite`);
    const sqlite = new Database(dbPath, { create: true, strict: true });
    const db = drizzle({ client: sqlite });

    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    expect(findTestLog('error', 'rows that do not exist')).toBeUndefined();

    sqlite.run('PRAGMA foreign_keys = OFF;');
    sqlite.run(
      `INSERT INTO channels (id, type, name, private, is_dm_channel, position, created_at)
       VALUES (1, 'TEXT', 'general', 0, 0, 0, 1)`
    );
    sqlite.run(
      `INSERT INTO messages (id, content, user_id, channel_id, created_at)
       VALUES (1, 'orphan', 999, 1, 1)`
    );
    sqlite.run('PRAGMA foreign_keys = ON;');

    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    const reported = findTestLog('error', 'rows that do not exist');

    expect(reported).toBeDefined();
    expect(reported!.message).toContain('messages');

    sqlite.close();
  });

  test('should not cascade away message relations when rebuilding a table', async () => {
    fs.mkdirSync(workDir, { recursive: true });

    const dbPath = path.join(workDir, `fk-${Date.now()}.sqlite`);
    const sqlite = new Database(dbPath, { create: true, strict: true });
    const db = drizzle({ client: sqlite });

    // bring the schema to the state a real server was on before the rebuild landed
    await migrateDatabase(
      sqlite,
      db,
      buildPartialMigrationsFolder(REBUILD_MIGRATION)
    );

    sqlite.run(
      `INSERT INTO channels (id, type, name, private, is_dm_channel, position, created_at)
       VALUES (1, 'TEXT', 'general', 0, 0, 0, 1)`
    );
    sqlite.run(
      `INSERT INTO users (id, identity, password, name, last_login_at, created_at)
       VALUES (1, 'reader', 'x', 'Reader', 1, 1)`
    );
    sqlite.run(
      `INSERT INTO files (id, name, original_name, md5, user_id, size, mime_type, extension, created_at)
       VALUES (1, 'a.png', 'a.png', 'md5', 1, 1, 'image/png', '.png', 1)`
    );
    sqlite.run(
      `INSERT INTO messages (id, content, user_id, channel_id, created_at)
       VALUES (1, 'root', 1, 1, 1), (2, 'reply', 1, 1, 2)`
    );
    sqlite.run(`UPDATE messages SET reply_to_message_id = 1 WHERE id = 2`);
    sqlite.run(
      `INSERT INTO message_files (message_id, file_id, created_at) VALUES (1, 1, 1)`
    );
    sqlite.run(
      `INSERT INTO message_reactions (message_id, user_id, emoji, created_at)
       VALUES (1, 1, '👍', 1)`
    );
    sqlite.run(
      `INSERT INTO channel_read_states (user_id, channel_id, last_read_message_id, last_read_at)
       VALUES (1, 1, 2, 1)`
    );

    // now the rest of the chain, through the helper every boot path uses
    await migrateDatabase(sqlite, db, SRC_MIGRATIONS_PATH);

    const count = (sql: string) => (sqlite.query(sql).get() as { c: number }).c;

    expect(count('SELECT COUNT(*) c FROM messages')).toBe(2);
    expect(count('SELECT COUNT(*) c FROM message_files')).toBe(1);
    expect(count('SELECT COUNT(*) c FROM message_reactions')).toBe(1);
    expect(
      count(
        'SELECT COUNT(*) c FROM messages WHERE reply_to_message_id IS NOT NULL'
      )
    ).toBe(1);
    expect(
      count(
        'SELECT COUNT(*) c FROM channel_read_states WHERE last_read_message_id IS NOT NULL'
      )
    ).toBe(1);

    sqlite.close();
  });
});
