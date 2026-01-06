import type { TDiskMetrics } from '@sharkord/shared';
import si from 'systeminformation';
import { getUsedFileQuota } from '../db/queries/files';

const getDiskMetrics = async (): Promise<TDiskMetrics> => {
  const [diskInfo, filesUsedSpace] = await Promise.all([
    si.fsSize(),
    getUsedFileQuota()
  ]);

  const totalDisk = diskInfo.reduce((acc, disk) => acc + disk.size, 0);
  const usedDisk = diskInfo.reduce((acc, disk) => acc + disk.used, 0);

  const freeDisk = totalDisk - usedDisk;

  const metrics: TDiskMetrics = {
    totalSpace: totalDisk,
    usedSpace: usedDisk,
    freeSpace: freeDisk,
    sharkordUsedSpace: filesUsedSpace
  };

  return metrics;
};

export { getDiskMetrics };
