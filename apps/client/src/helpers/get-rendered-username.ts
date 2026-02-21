import { DELETED_USER_IDENTITY_AND_NAME } from '@sharkord/shared';

const getRenderedUsername = (user: { name: string }) => {
  if (user.name === DELETED_USER_IDENTITY_AND_NAME) {
    return 'Deleted';
  }

  return user.name;
};

export { getRenderedUsername };
