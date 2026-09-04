import z from 'zod';
import { zHttpUrl, zPluginId } from './primitives';

// const MARKETPLACE_REGISTRY_URL =
//   'https://cdn.jsdelivr.net/gh/Sharkord/plugins@latest/plugins.json';

const MARKETPLACE_REGISTRY_URL =
  'https://raw.githubusercontent.com/Sharkord/plugins/refs/heads/main/plugins.json?raw=true';

const zMarketplacePlugin = z.object({
  id: zPluginId,
  name: z.string().min(1),
  description: z.string(),
  author: z.string(),
  logo: zHttpUrl,
  homepage: zHttpUrl.optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  verified: z.boolean(),
  screenshots: z.array(zHttpUrl).optional()
});

const zMarketplacePluginVersion = z.object({
  version: z.string().min(1),
  downloadUrl: z.url({ protocol: /^https$/ }),
  checksum: z.string().min(1),
  sdkVersion: z.number().int().nonnegative(),
  size: z.number(),
  timestamp: z.number()
});

const zMarketplaceEntry = z.object({
  plugin: zMarketplacePlugin,
  versions: z.array(zMarketplacePluginVersion)
});

const zMarketplaceRegistry = z.array(z.unknown());

const parseMarketplaceRegistry = (input: unknown): TMarketplaceEntry[] => {
  const rows = zMarketplaceRegistry.parse(input);
  const entries: TMarketplaceEntry[] = [];

  for (const row of rows) {
    const parsed = zMarketplaceEntry.safeParse(row);

    if (parsed.success) entries.push(parsed.data);
  }

  return entries;
};

type TMarketplacePlugin = z.infer<typeof zMarketplacePlugin>;
type TMarketplacePluginVersion = z.infer<typeof zMarketplacePluginVersion>;
type TMarketplaceEntry = z.infer<typeof zMarketplaceEntry>;

export {
  MARKETPLACE_REGISTRY_URL,
  parseMarketplaceRegistry,
  zMarketplaceEntry,
  zMarketplacePlugin,
  zMarketplacePluginVersion,
  type TMarketplaceEntry,
  type TMarketplacePlugin,
  type TMarketplacePluginVersion
};
