import {
  type TJoinedPublicUser,
  type TJoinedUser,
  type TStorageData
} from '@sharkord/shared';
import { count, eq, sum } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import jwt from 'jsonwebtoken';
import { db } from '..';
import type { TTokenPayload } from '../../types';
import { files, userRoles, users } from '../schema';
import { getServerToken } from './server';

const getPublicUserById = async (
  userId: number
): Promise<TJoinedPublicUser | undefined> => {
  const avatarFiles = alias(files, 'avatarFiles');
  const bannerFiles = alias(files, 'bannerFiles');

  const results = await db
    .select({
      id: users.id,
      name: users.name,
      bannerColor: users.bannerColor,
      bio: users.bio,
      banned: users.banned,
      avatarId: users.avatarId,
      bannerId: users.bannerId,
      avatar: avatarFiles,
      banner: bannerFiles,
      createdAt: users.createdAt
    })
    .from(users)
    .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
    .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
    .where(eq(users.id, userId))
    .get();

  if (!results) return undefined;

  const roles = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .all();

  return {
    id: results.id,
    name: results.name,
    bannerColor: results.bannerColor,
    bio: results.bio,
    avatarId: results.avatarId,
    bannerId: results.bannerId,
    avatar: results.avatar,
    banner: results.banner,
    createdAt: results.createdAt,
    banned: results.banned,
    roleIds: roles.map((r) => r.roleId)
  };
};

const getPublicUsers = async (
  returnIdentity: boolean = false
): Promise<TJoinedPublicUser[]> => {
  const avatarFiles = alias(files, 'avatarFiles');
  const bannerFiles = alias(files, 'bannerFiles');

  if (returnIdentity) {
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        bannerColor: users.bannerColor,
        bio: users.bio,
        banned: users.banned,
        avatarId: users.avatarId,
        bannerId: users.bannerId,
        avatar: avatarFiles,
        banner: bannerFiles,
        createdAt: users.createdAt,
        _identity: users.identity
      })
      .from(users)
      .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
      .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
      .all();

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

    return results.map((result) => ({
      id: result.id,
      name: result.name,
      bannerColor: result.bannerColor,
      bio: result.bio,
      banned: result.banned,
      avatarId: result.avatarId,
      bannerId: result.bannerId,
      avatar: result.avatar,
      banner: result.banner,
      createdAt: result.createdAt,
      _identity: result._identity,
      roleIds: rolesMap[result.id] || []
    }));
  } else {
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        banned: users.banned,
        bannerColor: users.bannerColor,
        bio: users.bio,
        avatarId: users.avatarId,
        bannerId: users.bannerId,
        avatar: avatarFiles,
        banner: bannerFiles,
        createdAt: users.createdAt
      })
      .from(users)
      .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
      .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
      .all();

    // Get role IDs for all users
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

    return results.map((result) => ({
      id: result.id,
      name: result.name,
      banned: result.banned,
      bannerColor: result.bannerColor,
      bio: result.bio,
      avatarId: result.avatarId,
      bannerId: result.bannerId,
      avatar: result.avatar,
      banner: result.banner,
      createdAt: result.createdAt,
      roleIds: rolesMap[result.id] || []
    }));
  }
};

const getStorageUsageByUserId = async (
  userId: number
): Promise<TStorageData> => {
  const result = await db
    .select({
      fileCount: count(files.id),
      usedStorage: sum(files.size)
    })
    .from(files)
    .where(eq(files.userId, userId))
    .get();

  return {
    userId,
    fileCount: result?.fileCount ?? 0,
    usedStorage: Number(result?.usedStorage ?? 0)
  };
};

const getUserById = async (
  userId: number
): Promise<TJoinedUser | undefined> => {
  const avatarFiles = alias(files, 'avatarFiles');
  const bannerFiles = alias(files, 'bannerFiles');

  const user = await db
    .select({
      id: users.id,
      identity: users.identity,
      name: users.name,
      avatarId: users.avatarId,
      bannerId: users.bannerId,
      bio: users.bio,
      password: users.password,
      bannerColor: users.bannerColor,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
      banned: users.banned,
      banReason: users.banReason,
      bannedAt: users.bannedAt,
      avatar: avatarFiles,
      banner: bannerFiles
    })
    .from(users)
    .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
    .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
    .where(eq(users.id, userId))
    .get();

  if (!user) return undefined;

  const roles = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .all();

  return {
    ...user,
    avatar: user.avatar,
    banner: user.banner,
    roleIds: roles.map((r) => r.roleId)
  };
};

const getUserByIdentity = async (
  identity: string
): Promise<TJoinedUser | undefined> => {
  const avatarFiles = alias(files, 'avatarFiles');
  const bannerFiles = alias(files, 'bannerFiles');

  const user = await db
    .select({
      id: users.id,
      identity: users.identity,
      name: users.name,
      avatarId: users.avatarId,
      bannerId: users.bannerId,
      bio: users.bio,
      bannerColor: users.bannerColor,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      password: users.password,
      lastLoginAt: users.lastLoginAt,
      banned: users.banned,
      banReason: users.banReason,
      bannedAt: users.bannedAt,
      avatar: avatarFiles,
      banner: bannerFiles
    })
    .from(users)
    .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
    .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
    .where(eq(users.identity, identity))
    .get();

  if (!user) return undefined;

  const roles = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, user.id))
    .all();

  return {
    ...user,
    avatar: user.avatar,
    banner: user.banner,
    roleIds: roles.map((r) => r.roleId)
  };
};

const getUserByToken = async (token: string | undefined) => {
  try {
    if (!token) return undefined;

    const decoded = jwt.verify(token, await getServerToken()) as TTokenPayload;

    const user = await getUserById(decoded.userId);

    return user;
  } catch {
    return undefined;
  }
};

const getUsers = async (): Promise<TJoinedUser[]> => {
  const avatarFiles = alias(files, 'avatarFiles');
  const bannerFiles = alias(files, 'bannerFiles');

  const results = await db
    .select({
      id: users.id,
      name: users.name,
      bannerColor: users.bannerColor,
      bio: users.bio,
      avatarId: users.avatarId,
      bannerId: users.bannerId,
      updatedAt: users.updatedAt,
      createdAt: users.createdAt,
      identity: users.identity,
      password: users.password,
      lastLoginAt: users.lastLoginAt,
      banned: users.banned,
      banReason: users.banReason,
      bannedAt: users.bannedAt,
      avatar: avatarFiles,
      banner: bannerFiles
    })
    .from(users)
    .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
    .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
    .all();

  // Get role IDs for all users
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

  return results.map((result) => ({
    id: result.id,
    name: result.name,
    bannerColor: result.bannerColor,
    bio: result.bio,
    avatarId: result.avatarId,
    bannerId: result.bannerId,
    avatar: result.avatar,
    banner: result.banner,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    identity: result.identity,
    password: result.password,
    lastLoginAt: result.lastLoginAt,
    banned: result.banned,
    banReason: result.banReason,
    bannedAt: result.bannedAt,
    roleIds: rolesMap[result.id] || []
  }));
};

export {
  getPublicUserById,
  getPublicUsers,
  getStorageUsageByUserId,
  getUserById,
  getUserByIdentity,
  getUserByToken,
  getUsers
};
