import { describe, expect, test } from 'bun:test';
import { channels, messages, roles, settings, users } from '../db/schema';
import { tdb } from './setup';

describe('tests setup', () => {
  test('should seed database with initial data', async () => {
    const [
      settingsResults,
      usersResults,
      channelsResults,
      rolesResults,
      messagesResults
    ] = await Promise.all([
      tdb.select().from(settings),
      tdb.select().from(users),
      tdb.select().from(channels),
      tdb.select().from(roles),
      tdb.select().from(messages)
    ]);

    expect(settingsResults.length).toBe(1);
    expect(usersResults.length).toBe(2);
    expect(channelsResults.length).toBe(2);
    expect(rolesResults.length).toBe(3);
    expect(messagesResults.length).toBe(1);
  });
});
