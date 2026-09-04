import { Permission } from '@sharkord/shared';

import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import {
  categories,
  pluginData,
  rolePermissions,
  settings
} from '../../db/schema';
import { messageRenderMock } from './message-render-mock';
import { createMockMessagesChannel } from './mock-messages-channel';

const E2E_PLUGIN_ID = 'e2e-plugin';
const MODERATOR_ROLE_ID = 4;

const seedE2EPlugin = async (db: BunSQLiteDatabase) => {
  await db.update(settings).set({ enablePlugins: true });

  await db.insert(rolePermissions).values({
    roleId: MODERATOR_ROLE_ID,
    permission: Permission.USE_PLUGINS,
    createdAt: Date.now()
  });

  await db.insert(pluginData).values({
    pluginId: E2E_PLUGIN_ID,
    enabled: true,
    settings: {}
  });
};

const seedE2E = async (db: BunSQLiteDatabase) => {
  await seedE2EPlugin(db);

  const e2eChannelsCategory = await db
    .insert(categories)
    .values({
      name: 'E2E Channels',
      position: 2,
      createdAt: Date.now()
    })
    .returning()
    .get();

  // read-only: the pagination specs count its pages, so nothing may send into it
  await createMockMessagesChannel(db, e2eChannelsCategory!.id, {
    name: 'Infinite Scroll',
    position: 1,
    totalMessages: 1000,
    firstNumber: 1
  });

  // for the specs that send messages, kept separate so their writes cannot shift the pages
  // the pagination specs are counting. long enough to scroll up in and load a second page
  await createMockMessagesChannel(db, e2eChannelsCategory!.id, {
    name: 'Live Messages',
    position: 2,
    totalMessages: 300,
    firstNumber: 2001
  });

  await messageRenderMock(db, e2eChannelsCategory!.id);
};

export { seedE2E };
