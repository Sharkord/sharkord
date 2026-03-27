// const MARKETPLACE_REGISTRY_URL =
//   'https://cdn.jsdelivr.net/gh/Sharkord/plugins@latest/plugins.json';

const MARKETPLACE_REGISTRY_URL =
  'https://raw.githubusercontent.com/Sharkord/plugins/refs/heads/main/plugins.json?raw=true';

type TMarketplacePlugin = {
  id: string;
  name: string;
  description: string;
  author: string;
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
  timestamp: number;
};

type TMarketplaceEntry = {
  plugin: TMarketplacePlugin;
  versions: TMarketplacePluginVersion[];
};

export {
  MARKETPLACE_REGISTRY_URL,
  type TMarketplaceEntry,
  type TMarketplacePlugin,
  type TMarketplacePluginVersion
};
