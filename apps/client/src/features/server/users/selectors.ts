import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import { UserStatus } from '@sharkord/shared';
import { createCachedSelector } from 're-reselect';

const STATUS_ORDER: Record<string, number> = {
  online: 0,
  idle: 1,
  offline: 2
};

export const ownUserIdSelector = (state: IRootState) => state.server.ownUserId;

export const usersSelector = createSelector(
  (state: IRootState) => state.server.users,
  (users) => {
    return [...users].sort((a, b) => {
      const aBanned = Boolean(a.banned);
      const bBanned = Boolean(b.banned);

      if (aBanned !== bBanned) {
        return aBanned ? 1 : -1;
      }

      const aStatus = STATUS_ORDER[String(a.status ?? UserStatus.OFFLINE)] ?? 3;
      const bStatus = STATUS_ORDER[String(b.status ?? UserStatus.OFFLINE)] ?? 3;

      if (aStatus !== bStatus) {
        return aStatus - bStatus;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }
);

export const ownUserSelector = createSelector(
  [ownUserIdSelector, usersSelector],
  (ownUserId, users) => users.find((user) => user.id === ownUserId)
);

export const userByIdSelector = createCachedSelector(
  [usersSelector, (_: IRootState, userId: number) => userId],
  (users, userId) => users.find((user) => user.id === userId)
)((_, userId: number) => userId);

export const isOwnUserSelector = createCachedSelector(
  [ownUserIdSelector, (_: IRootState, userId: number) => userId],
  (ownUserId, userId) => ownUserId === userId
)((_, userId: number) => userId);

export const ownPublicUserSelector = createSelector(
  [ownUserIdSelector, usersSelector],
  (ownUserId, users) => users.find((user) => user.id === ownUserId)
);

export const userStatusSelector = createSelector(
  [userByIdSelector],
  (user) => user?.status ?? UserStatus.OFFLINE
);

export const usernamesSelector = createSelector([usersSelector], (users) => {
  const map: Record<number, string> = {};

  users.forEach((user) => {
    map[user.id] = user.name;
  });

  return map;
});
