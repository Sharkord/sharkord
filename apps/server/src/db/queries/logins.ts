import type { TLogin } from '@sharkord/shared';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db } from '..';
import { logins } from '../schema';

const getLastLogins = async (userId: number, limit = 10): Promise<TLogin[]> =>
  db
    .select()
    .from(logins)
    .where(eq(logins.userId, userId))
    .orderBy(desc(logins.createdAt))
    .limit(limit);

const hasUserJoinedBefore = async (userId: number): Promise<boolean> => {
  const login = await db
    .select({ id: logins.id })
    .from(logins)
    .where(eq(logins.userId, userId))
    .limit(1)
    .get();

  return !!login;
};

const getUsersSharingIp = async (userId: number, limit: number) => {
  const userIps = db
    .selectDistinct({ ip: logins.ip })
    .from(logins)
    .where(eq(logins.userId, userId));

  return db
    .selectDistinct({ id: logins.userId })
    .from(logins)
    .where(and(inArray(logins.ip, userIps), ne(logins.userId, userId)))
    .limit(limit);
};

export { getLastLogins, getUsersSharingIp, hasUserJoinedBefore };
