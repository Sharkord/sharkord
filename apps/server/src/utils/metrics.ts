import type { TDiskMetrics } from '@sharkord/shared';
import path from 'path';
import si from 'systeminformation';
import { getUsedFileQuota } from '../db/queries/files';
import { DATA_PATH } from '../helpers/paths';

type TDiskInfo = Awaited<ReturnType<typeof si.fsSize>>[number];
type TDiskMountInfo = Pick<TDiskInfo, 'mount' | 'size' | 'used'>;

type TGetDiskMetricsDeps = {
  fsSize?: () => Promise<TDiskMountInfo[]>;
  getUsedFileQuota?: () => Promise<number>;
  dataPath?: string;
};

const normalizeMountPath = (value: string) => {
  const resolved = path.resolve(value);

  if (resolved === path.sep) {
    return resolved;
  }

  return resolved.endsWith(path.sep) ? resolved.slice(0, -1) : resolved;
};

const getDiskForDataPath = (disks: TDiskMountInfo[], dataPath: string) => {
  const normalizedDataPath = path.resolve(dataPath);

  const matching = disks.filter((disk) => {
    if (!disk.mount) {
      return false;
    }

    const mountPath = normalizeMountPath(disk.mount);

    return (
      normalizedDataPath === mountPath ||
      normalizedDataPath.startsWith(`${mountPath}${path.sep}`)
    );
  });

  if (matching.length > 0) {
    return matching.sort((a, b) => b.mount.length - a.mount.length)[0];
  }

  return disks[0];
};

const getDiskMetrics = async (
  deps: TGetDiskMetricsDeps = {} // these are just used for testing purposes, so we can mock them
): Promise<TDiskMetrics> => {
  const fsSize = deps.fsSize ?? (() => si.fsSize());
  const getFilesUsedSpace = deps.getUsedFileQuota ?? getUsedFileQuota;
  const dataPath = deps.dataPath ?? DATA_PATH;

  const [diskInfo, filesUsedSpace] = await Promise.all([
    fsSize(),
    getFilesUsedSpace()
  ]);

  const selectedDisk = getDiskForDataPath(diskInfo, dataPath);

  const totalDisk = selectedDisk?.size ?? 0;
  const usedDisk = selectedDisk?.used ?? 0;

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
