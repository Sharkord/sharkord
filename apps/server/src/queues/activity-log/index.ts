import type { ActivityLogType, TActivityLogDetailsMap } from '@sharkord/shared';
import Queue from 'queue';
import { db } from '../../db';
import { activityLog } from '../../db/schema';
import { getUserIp } from '../../utils/wss';

const activityLogQueue = new Queue({
  concurrency: 2,
  autostart: true,
  timeout: 3000
});

activityLogQueue.autostart = true;

type TEnqueueActivityLog<T extends ActivityLogType = ActivityLogType> = {
  type: T;
  details?: TActivityLogDetailsMap[T];
  userId?: number;
  ip?: string;
};

const enqueueActivityLog = <T extends ActivityLogType>({
  type,
  details = {} as TActivityLogDetailsMap[T],
  userId = 1,
  ip
}: TEnqueueActivityLog<T>) => {
  const date = Date.now();

  activityLogQueue.push(async (callback) => {
    await db.insert(activityLog).values({
      userId,
      type: type,
      details,
      ip: ip || getUserIp(userId) || null,
      createdAt: date
    });

    callback?.();
  });
};

export { enqueueActivityLog };
