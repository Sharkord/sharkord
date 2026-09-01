import type { TCategory, TChannel } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { categories, channels } from '../../db/schema';
import {
  createCategory,
  deleteCategory,
  updateCategory
} from '../../helpers/categories';
import {
  createChannel,
  deleteChannel,
  updateChannel,
  type TCreateChannel,
  type TUpdateChannel
} from '../../helpers/channels';

const PLUGIN_ACTOR = null;

const createPluginChannel = (input: TCreateChannel): Promise<TChannel> =>
  createChannel(input, PLUGIN_ACTOR);

const updatePluginChannel = (channelId: number, values: TUpdateChannel) =>
  updateChannel(channelId, values, PLUGIN_ACTOR);

const deletePluginChannel = (channelId: number) =>
  deleteChannel(channelId, PLUGIN_ACTOR);

const createPluginCategory = (name: string): Promise<TCategory> =>
  createCategory(name, PLUGIN_ACTOR);

const updatePluginCategory = (categoryId: number, name: string) =>
  updateCategory(categoryId, name, PLUGIN_ACTOR);

const deletePluginCategory = (categoryId: number) =>
  deleteCategory(categoryId, PLUGIN_ACTOR);

const listPluginCategories = async (): Promise<TCategory[]> =>
  (await db.select().from(categories)) as TCategory[];

// DMs are left out: they are private conversations, and the write API refuses
// them anyway, so what a plugin can list is what it can act on
const listPluginChannels = async (): Promise<TChannel[]> =>
  (await db
    .select()
    .from(channels)
    .where(eq(channels.isDm, false))) as TChannel[];

export {
  createPluginCategory,
  createPluginChannel,
  deletePluginCategory,
  deletePluginChannel,
  listPluginCategories,
  listPluginChannels,
  updatePluginCategory,
  updatePluginChannel
};
