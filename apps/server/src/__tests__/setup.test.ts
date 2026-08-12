import { describe, expect, test } from 'bun:test';
import {
  categories,
  channels,
  directMessages,
  logins,
  messages,
  rolePermissions,
  roles,
  settings,
  userRoles,
  users
} from '../db/schema';
import { tdb } from './setup';

// this is the guard on seed.ts's summary comment: every table the seed touches is counted
// here, so adding a row without updating the summary fails rather than drifting quietly. it
// used to cover five of the ten tables, which meant a new category, role permission or dm
// could be added with nothing noticing
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
    expect(usersResults.length).toBe(5);
    expect(channelsResults.length).toBe(4);
    expect(rolesResults.length).toBe(4);
    expect(messagesResults.length).toBe(2);
  });

  test('should seed the join tables the permission checks read', async () => {
    const [userRolesResults, rolePermissionsResults] = await Promise.all([
      tdb.select().from(userRoles),
      tdb.select().from(rolePermissions)
    ]);

    expect(userRolesResults.length).toBe(5);
    expect(rolePermissionsResults.length).toBe(29);
  });

  test('should seed categories and the direct message pair', async () => {
    const [categoriesResults, directMessagesResults] = await Promise.all([
      tdb.select().from(categories),
      tdb.select().from(directMessages)
    ]);

    expect(categoriesResults.length).toBe(2);
    expect(directMessagesResults.length).toBe(1);
  });

  test('should not seed logins outside e2e', async () => {
    // seedTestDb only inserts logins when called with { e2e: true }, which only the e2e
    // package's globalSetup does, so a non-zero count here means that branch has leaked
    expect((await tdb.select().from(logins)).length).toBe(0);
  });

  test('should give user 1 the owner role and user 2 a low-permission one', async () => {
    // the convention every router test relies on: user 1 for happy paths, user 2 for
    // rejections. an accidental role change in the seed would make whole suites pass for
    // the wrong reason
    const ownerRoles = await tdb.select().from(userRoles);

    const forUserOne = ownerRoles.filter((row) => row.userId === 1);
    const forUserTwo = ownerRoles.filter((row) => row.userId === 2);

    expect(forUserOne.map((row) => row.roleId)).toContain(1);
    expect(forUserTwo.map((row) => row.roleId)).not.toContain(1);
  });
});
