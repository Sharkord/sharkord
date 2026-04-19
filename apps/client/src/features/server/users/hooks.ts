import type { IRootState } from '@/features/store';
import { useSelector } from 'react-redux';
import {
  filteredUsersSelector,
  isOwnUserSelector,
  ownPublicUserSelector,
  ownUserIdSelector,
  ownUserSelector,
  userByIdSelector,
  usernamesSelector,
  usersSelector,
  userStatusSelector
} from './selectors';

export const useUsers = () => useSelector(usersSelector);

export const useOwnUser = () => useSelector(ownUserSelector);

export const useOwnUserId = () => useSelector(ownUserIdSelector);

export const useIsOwnUser = (userId: number | null) =>
  useSelector((state: IRootState) =>
    userId !== null ? isOwnUserSelector(state, userId) : false
  );

export const useUserById = (userId: number | null) =>
  useSelector((state: IRootState) =>
    userId !== null ? userByIdSelector(state, userId) : undefined
  );

export const useOwnPublicUser = () =>
  useSelector((state: IRootState) => ownPublicUserSelector(state));

export const useUserStatus = (userId: number) =>
  useSelector((state: IRootState) => userStatusSelector(state, userId));

export const useUsernames = () => useSelector(usernamesSelector);

export const useFilteredUsers = () => useSelector(filteredUsersSelector);
