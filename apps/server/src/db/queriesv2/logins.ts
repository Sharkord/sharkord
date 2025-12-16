import type { TLogin } from '@sharkord/shared';
import { desc, eq } from 'drizzle-orm';
import { db } from '..';
import { logins } from '../schema';

const getLastLogins = async (userId: number, limit = 10): Promise<TLogin[]> =>
  db
    .select()
    .from(logins)
    .where(eq(logins.userId, userId))
    .orderBy(desc(logins.createdAt))
    .limit(limit);

export { getLastLogins };
