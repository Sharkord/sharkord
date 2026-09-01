export type TDiskMetrics = {
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  sharkordUsedSpace: number;
};

export type TPluginStorageUsage = {
  pluginId: string;
  fileCount: number;
  usedSpace: number;
  installed: boolean;
};
