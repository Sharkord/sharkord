import {
  banUser,
  kickUser,
  serverUserSessions,
  unbanUser
} from '../../helpers/moderation';
import { assertNotOwner } from './assert-not-owner';

const PLUGIN_ACTOR = null;

const banPluginUser = async (userId: number, reason?: string) => {
  await assertNotOwner(userId, 'ban');

  await banUser(userId, reason, PLUGIN_ACTOR, serverUserSessions(userId));
};

const unbanPluginUser = async (userId: number) => {
  await unbanUser(userId, PLUGIN_ACTOR);
};

const kickPluginUser = async (userId: number, reason?: string) => {
  await assertNotOwner(userId, 'kick');

  await kickUser(userId, reason, PLUGIN_ACTOR, serverUserSessions(userId));
};

export { banPluginUser, kickPluginUser, unbanPluginUser };
