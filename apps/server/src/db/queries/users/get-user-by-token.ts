import jwt from 'jsonwebtoken';
import type { TTokenPayload } from '../../../types';
import { getServerToken } from '../../queriesv2/server';
import { getUserById } from './get-user-by-id';

const getUserByToken = async (token: string | undefined) => {
  if (!token) return undefined;

  const decoded = jwt.verify(token, await getServerToken()) as TTokenPayload;

  const user = await getUserById(decoded.userId);

  return user;
};

export { getUserByToken };
