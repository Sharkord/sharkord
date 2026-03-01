import { DELETED_USER_IDENTITY_AND_NAME } from '@sharkord/shared';
import { getNickname } from './nicknames';

const getRenderedUsername = (user: { name: string }, userId?: number) => {
  if (user.name === DELETED_USER_IDENTITY_AND_NAME) {
    return 'Deleted';
  }

  if (userId != null) {
    const nickname = getNickname(userId);
    if (nickname) return nickname;
  }

  return user.name;
};

export { getRenderedUsername };
