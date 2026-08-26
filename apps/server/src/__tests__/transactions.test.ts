import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { categories } from '../db/schema';
import { tdb } from './setup';

describe('db transactions', () => {
  test('rolls back every statement when the callback throws', () => {
    const before = tdb.select().from(categories).all().length;

    expect(() =>
      db.transaction((tx) => {
        tx.insert(categories)
          .values({ name: 'doomed', position: 99, createdAt: Date.now() })
          .run();

        throw new Error('boom');
      })
    ).toThrow('boom');

    const after = tdb.select().from(categories).all();

    expect(after.length).toBe(before);
    expect(after.some((category) => category.name === 'doomed')).toBe(false);
  });

  test('commits every statement when the callback returns', () => {
    db.transaction((tx) => {
      tx.insert(categories)
        .values({ name: 'kept-one', position: 97, createdAt: Date.now() })
        .run();

      tx.insert(categories)
        .values({ name: 'kept-two', position: 98, createdAt: Date.now() })
        .run();
    });

    const names = tdb
      .select()
      .from(categories)
      .all()
      .map((category) => category.name);

    expect(names).toContain('kept-one');
    expect(names).toContain('kept-two');
  });

  test('rolls back a later statement in the same transaction', () => {
    const seeded = tdb.select().from(categories).all()[0];

    expect(seeded).toBeDefined();

    expect(() =>
      db.transaction((tx) => {
        tx.update(categories)
          .set({ name: 'renamed' })
          .where(eq(categories.id, seeded!.id))
          .run();

        tx.insert(categories)
          .values({ name: 'second', position: 96, createdAt: Date.now() })
          .run();

        throw new Error('boom');
      })
    ).toThrow('boom');

    const reloaded = tdb
      .select()
      .from(categories)
      .where(eq(categories.id, seeded!.id))
      .get();

    expect(reloaded?.name).toBe(seeded!.name);
  });
});
