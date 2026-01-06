import type { IRootState } from '@/features/store';
import { useSelector } from 'react-redux';
import {
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

export const useIsOwnUser = (userId: number) =>
  useSelector((state: IRootState) => isOwnUserSelector(state, userId));

export const useUserById = (userId: number) =>
  useSelector((state: IRootState) => userByIdSelector(state, userId));

export const useOwnPublicUser = () =>
  useSelector((state: IRootState) => ownPublicUserSelector(state));

export const useUserStatus = (userId: number) =>
  useSelector((state: IRootState) => userStatusSelector(state, userId));

export const useUsernames = () => useSelector(usernamesSelector);
