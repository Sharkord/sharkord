import type { TInvite, TJoinedInvite } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '..';
import { files, invites, roles, userRoles, users } from '../schema';

const isInviteValid = async (
  code: string | undefined
): Promise<{ error?: string; invite?: TInvite }> => {
  if (!code) {
    return { error: 'Invalid invite code' };
  }

  const invite = await db
    .select()
    .from(invites)
    .where(eq(invites.code, code))
    .get();

  if (!invite) {
    return { error: 'Invite code not found' };
  }

  if (invite.expiresAt && invite.expiresAt < Date.now()) {
    return { error: 'Invite code has expired' };
  }

  if (invite.maxUses && invite.uses >= invite.maxUses) {
    return { error: 'Invite code has reached maximum uses' };
  }

  return { invite };
};

const getInvites = async (): Promise<TJoinedInvite[]> => {
  const avatarFiles = alias(files, 'avatarFiles');
  const bannerFiles = alias(files, 'bannerFiles');

  const rows = await db
    .select({
      invite: invites,
      creator: {
        id: users.id,
        name: users.name,
        bannerColor: users.bannerColor,
        bio: users.bio,
        banned: users.banned,
        createdAt: users.createdAt,
        avatarId: users.avatarId,
        bannerId: users.bannerId
      },
      avatar: avatarFiles,
      banner: bannerFiles,
      role: {
        id: roles.id,
        name: roles.name,
        color: roles.color
      }
    })
    .from(invites)
    .innerJoin(users, eq(invites.creatorId, users.id))
    .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
    .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
    .leftJoin(roles, eq(invites.roleId, roles.id));

  const rolesByUser = await db
    .select({
      userId: userRoles.userId,
      roleId: userRoles.roleId
    })
    .from(userRoles)
    .all();

  const rolesMap = rolesByUser.reduce(
    (acc, { userId, roleId }) => {
      if (!acc[userId]) acc[userId] = [];
      acc[userId].push(roleId);
      return acc;
    },
    {} as Record<number, number[]>
  );

  return rows.map((row) => ({
    ...row.invite,
    creator: {
      ...row.creator,
      avatar: row.avatar,
      banner: row.banner,
      roleIds: rolesMap[row.creator.id] || []
    },
    role: row.role?.id ? row.role : null
  }));
};

export { getInvites, isInviteValid };
