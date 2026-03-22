type TMarketplacePlugin = {
  id: string;
  name: string;
  description: string;
  author: string;
  repo: string;
  logo: string;
  homepage?: string;
  tags?: string[];
  categories?: string[];
  verified: boolean;
  screenshots?: string[];
};

type TMarketplacePluginVersion = {
  version: string;
  downloadUrl: string;
  checksum: string;
  sdkVersion: number | string;
  size: number;
};

type TMarketplaceEntry = {
  plugin: TMarketplacePlugin;
  versions: TMarketplacePluginVersion[];
};

export type {
  TMarketplaceEntry,
  TMarketplacePlugin,
  TMarketplacePluginVersion
};
