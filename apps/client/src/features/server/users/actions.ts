import { store } from '@/features/store';
import { UserStatus, type TJoinedPublicUser } from '@sharkord/shared';
import { serverSliceActions } from '../slice';
import { userByIdSelector } from './selectors';

export const setUsers = (users: TJoinedPublicUser[]) => {
  store.dispatch(serverSliceActions.setUsers(users));
};

export const addUser = (user: TJoinedPublicUser) => {
  store.dispatch(serverSliceActions.addUser(user));
};

export const updateUser = (
  userId: number,
  user: Partial<TJoinedPublicUser>
) => {
  store.dispatch(serverSliceActions.updateUser({ userId, user }));
};

export const removeUser = (userId: number) => {
  store.dispatch(serverSliceActions.removeUser({ userId }));
};

export const handleUserJoin = (user: TJoinedPublicUser) => {
  const state = store.getState();
  const foundUser = userByIdSelector(state, user.id);

  if (foundUser) {
    updateUser(user.id, { ...user, status: UserStatus.ONLINE });
  } else {
    addUser(user);
  }
};
