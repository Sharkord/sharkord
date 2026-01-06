import type { TJoinedInvite } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '..';
import { files, invites, userRoles, users } from '../schema';

const isInviteValid = async (
  code: string | undefined
): Promise<string | undefined> => {
  if (!code) {
    return 'Invalid invite code';
  }

  const invite = await db
    .select()
    .from(invites)
    .where(eq(invites.code, code))
    .get();

  if (!invite) {
    return 'Invite code not found';
  }

  if (invite.expiresAt && invite.expiresAt < Date.now()) {
    return 'Invite code has expired';
  }

  if (invite.maxUses && invite.uses >= invite.maxUses) {
    return 'Invite code has reached maximum uses';
  }

  return undefined;
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
      banner: bannerFiles
    })
    .from(invites)
    .innerJoin(users, eq(invites.creatorId, users.id))
    .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
    .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id));

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
    }
  }));
};

export { getInvites, isInviteValid };
