import Queue from 'queue';
import { db } from '../../db';
import { logins } from '../../db/schema';
import { logger } from '../../logger';
import type { TConnectionInfo } from '../../types';
import { getIpInfo } from '../../utils/logins';

const loginsQueue = new Queue({
  concurrency: 1,
  autostart: true,
  timeout: 3000
});

loginsQueue.autostart = true;

const enqueueLogin = (userId: number, info: TConnectionInfo | undefined) => {
  loginsQueue.push(async (callback) => {
    if (!info) {
      logger.warn('No connection info provided for login of user %d', userId);
      callback?.();
      return;
    }
    const { ip, ...rest } = info;
    const ipInfo = ip ? await getIpInfo(ip) : undefined;

    await db
      .insert(logins)
      .values({
        userId,
        ip,
        ...rest,
        ...ipInfo,
        createdAt: Date.now()
      })
      .returning()
      .get();

    callback?.();
  });
};

export { enqueueLogin };
