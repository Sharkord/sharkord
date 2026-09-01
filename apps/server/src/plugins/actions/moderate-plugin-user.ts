import { OWNER_ROLE_ID } from '@sharkord/shared';
import { getUserRoleIds } from '../../db/queries/roles';
import {
  banUser,
  kickUser,
  serverUserSessions,
  unbanUser
} from '../../helpers/moderation';
import { invariant } from '../../utils/invariant';

const assertNotOwner = async (userId: number, action: string) => {
  const targetRoleIds = await getUserRoleIds(userId);

  invariant(!targetRoleIds.includes(OWNER_ROLE_ID), {
    code: 'FORBIDDEN',
    message: `Plugins cannot ${action} the server owner.`
  });
};

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
