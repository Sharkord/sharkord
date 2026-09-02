import z from 'zod';
import { zHttpUrl, zPluginId } from './primitives';

/**
 * The SDK contract this server speaks. A plugin declares the same number as
 * `sdkVersion` in its manifest, and one that does not match is refused at load
 * rather than failing later against an API that moved.
 */
export const PLUGIN_SDK_VERSION = 2;

/** where the host looks for a plugin's `onLoad` */
export const SERVER_ENTRY_FILE = 'server/index.js';
/** the only file of a plugin the browser can fetch, so bundle the UI into it */
export const CLIENT_ENTRY_FILE = 'client/index.js';

export const zPluginManifest = z.object({
  id: zPluginId,
  name: z.string().min(1, 'Plugin name is required'),
  author: z.string().min(1, 'Plugin author is required'),
  description: z.string().min(1, 'Plugin description is required'),
  homepage: zHttpUrl.optional(),
  logo: zHttpUrl.optional(),
  sdkVersion: z.number().int().nonnegative(),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9-.]+)?$/, 'Invalid version format')
});

export type TPluginManifest = z.infer<typeof zPluginManifest>;

export type TPluginInfo = {
  id: string;
  enabled: boolean;
  loadError?: string;
  sdkVersion: TPluginManifest['sdkVersion'];
  author: TPluginManifest['author'];
  description: TPluginManifest['description'];
  version: TPluginManifest['version'];
  logo: TPluginManifest['logo'];
  name: TPluginManifest['name'];
  homepage: TPluginManifest['homepage'];
  path: string;
};

export type TPluginMetadata = {
  pluginId: string;
  name: string;
  description: string;
  version: string;
  avatarUrl?: string;
};

export const assertSdkVersionCompatibility = (sdkVersion: number) => {
  if (sdkVersion === PLUGIN_SDK_VERSION) return;

  throw new Error(
    `Plugin SDK version ${sdkVersion} is not compatible with server SDK version ${PLUGIN_SDK_VERSION}.`
  );
};

export type TLogEntry = {
  type: 'info' | 'error' | 'debug';
  timestamp: number;
  message: string;
  pluginId: string;
};
