import {
  type TJoinedPublicUser,
  type TJoinedUser,
  type TStorageData
} from '@sharkord/shared';
import { count, eq, sum } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import jwt from 'jsonwebtoken';
import { db } from '..';
import { signFile } from '../../helpers/files-crypto';
import type { TTokenPayload } from '../../types';
import { files, userRoles, users } from '../schema';
import { getServerToken, getSettings } from './server';

const getPublicUserById = async (
  userId: number
): Promise<TJoinedPublicUser | undefined> => {
  const avatarFiles = alias(files, 'avatarFiles');
  const bannerFiles = alias(files, 'bannerFiles');

  const results = await db
    .select({
      id: users.id,
      name: users.name,
      profileColor: users.profileColor,
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

  const [roles, { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds }] =
    await Promise.all([
      db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .where(eq(userRoles.userId, userId))
        .all(),
      getSettings()
    ]);

  return {
    id: results.id,
    name: results.name,
    profileColor: results.profileColor,
    bio: results.bio,
    avatarId: results.avatarId,
    bannerId: results.bannerId,
    avatar: signFile(
      results.avatar,
      storageSignedUrlsEnabled,
      storageSignedUrlsTtlSeconds
    ),
    banner: signFile(
      results.banner,
      storageSignedUrlsEnabled,
      storageSignedUrlsTtlSeconds
    ),
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

  const { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds } =
    await getSettings();

  if (returnIdentity) {
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        profileColor: users.profileColor,
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
      profileColor: result.profileColor,
      bio: result.bio,
      banned: result.banned,
      avatarId: result.avatarId,
      bannerId: result.bannerId,
      avatar: signFile(
        result.avatar,
        storageSignedUrlsEnabled,
        storageSignedUrlsTtlSeconds
      ),
      banner: signFile(
        result.banner,
        storageSignedUrlsEnabled,
        storageSignedUrlsTtlSeconds
      ),
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
        profileColor: users.profileColor,
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
      profileColor: result.profileColor,
      bio: result.bio,
      avatarId: result.avatarId,
      bannerId: result.bannerId,
      avatar: signFile(
        result.avatar,
        storageSignedUrlsEnabled,
        storageSignedUrlsTtlSeconds
      ),
      banner: signFile(
        result.banner,
        storageSignedUrlsEnabled,
        storageSignedUrlsTtlSeconds
      ),
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
      profileColor: users.profileColor,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
      banned: users.banned,
      banReason: users.banReason,
      bannedAt: users.bannedAt,
      tokenVersion: users.tokenVersion,
      avatar: avatarFiles,
      banner: bannerFiles
    })
    .from(users)
    .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
    .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
    .where(eq(users.id, userId))
    .get();

  if (!user) return undefined;

  const [roles, { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds }] =
    await Promise.all([
      db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .where(eq(userRoles.userId, userId))
        .all(),
      getSettings()
    ]);

  return {
    ...user,
    avatar: signFile(
      user.avatar,
      storageSignedUrlsEnabled,
      storageSignedUrlsTtlSeconds
    ),
    banner: signFile(
      user.banner,
      storageSignedUrlsEnabled,
      storageSignedUrlsTtlSeconds
    ),
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
      profileColor: users.profileColor,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      password: users.password,
      lastLoginAt: users.lastLoginAt,
      banned: users.banned,
      banReason: users.banReason,
      bannedAt: users.bannedAt,
      tokenVersion: users.tokenVersion,
      avatar: avatarFiles,
      banner: bannerFiles
    })
    .from(users)
    .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
    .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
    .where(eq(users.identity, identity))
    .get();

  if (!user) return undefined;

  const [roles, { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds }] =
    await Promise.all([
      db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .where(eq(userRoles.userId, user.id))
        .all(),
      getSettings()
    ]);

  return {
    ...user,
    avatar: signFile(
      user.avatar,
      storageSignedUrlsEnabled,
      storageSignedUrlsTtlSeconds
    ),
    banner: signFile(
      user.banner,
      storageSignedUrlsEnabled,
      storageSignedUrlsTtlSeconds
    ),
    roleIds: roles.map((r) => r.roleId)
  };
};

const getUserByToken = async (token: string | undefined) => {
  try {
    if (!token) return undefined;

    const decoded = jwt.verify(token, await getServerToken()) as TTokenPayload;

    const user = await getUserById(decoded.userId);

    if (user?.banned) return undefined;

    // a deleted user has no row, so deletion already invalidates its tokens. this covers
    // the case where the row survives but its sessions should not, such as a password
    // change. tokens predating this mechanism carry no version and count as 0
    if (user && (decoded.tokenVersion ?? 0) !== user.tokenVersion) {
      return undefined;
    }

    return user;
  } catch {
    return undefined;
  }
};

const getUsers = async (): Promise<TJoinedUser[]> => {
  const avatarFiles = alias(files, 'avatarFiles');
  const bannerFiles = alias(files, 'bannerFiles');

  const [results, { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds }] =
    await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          profileColor: users.profileColor,
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
          tokenVersion: users.tokenVersion,
          avatar: avatarFiles,
          banner: bannerFiles
        })
        .from(users)
        .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
        .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
        .all(),
      getSettings()
    ]);

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
    profileColor: result.profileColor,
    bio: result.bio,
    avatarId: result.avatarId,
    bannerId: result.bannerId,
    avatar: signFile(
      result.avatar,
      storageSignedUrlsEnabled,
      storageSignedUrlsTtlSeconds
    ),
    banner: signFile(
      result.banner,
      storageSignedUrlsEnabled,
      storageSignedUrlsTtlSeconds
    ),
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    identity: result.identity,
    password: result.password,
    lastLoginAt: result.lastLoginAt,
    banned: result.banned,
    banReason: result.banReason,
    bannedAt: result.bannedAt,
    tokenVersion: result.tokenVersion,
    roleIds: rolesMap[result.id] || []
  }));
};

const getAllUserIds = async (): Promise<number[]> => {
  const results = await db.select({ id: users.id }).from(users);
  return results.map((r) => r.id);
};

export {
  getAllUserIds,
  getPublicUserById,
  getPublicUsers,
  getStorageUsageByUserId,
  getUserById,
  getUserByIdentity,
  getUserByToken,
  getUsers
};
