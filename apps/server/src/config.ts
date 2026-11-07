import { getErrorMessage } from '@sharkord/shared';
import fs from 'fs/promises';
import { parse, stringify } from 'ini';
import z from 'zod';
import { applyEnvOverrides } from './helpers/apply-env-overrides';
import { ensureServerDirs } from './helpers/ensure-server-dirs';
import { getPrivateIp, resolveAnnouncedAddress } from './helpers/network';
import { CONFIG_INI_PATH } from './helpers/paths';
import { deepMerge } from './utils/deep-merge';
import { IS_DEVELOPMENT, IS_TEST } from './utils/env';

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }

  return value;
};

const zConfig = z.object({
  server: z.object({
    host: z.string().trim(),
    port: z.coerce.number().int().positive(),
    debug: z.coerce.boolean(),
    autoupdate: z.coerce.boolean(),
    backupDatabase: z.coerce.boolean(),
    maxRequestBodyBytes: z.coerce.number().int().positive(),
    rateLimitersEnabled: z.coerce.boolean(),
    allowedOrigins: z
      .preprocess(
        (value) => {
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') return value.split(',');

          return [value];
        },
        z.array(z.string().trim().min(1))
      )
      .default(['*']),
    trustedProxies: z
      .preprocess(
        (value) => {
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') return value.split(',');

          return [value];
        },
        z.array(z.string().trim().min(1))
      )
      .default([])
  }),
  oidc: z.object({
    enabled: z.coerce.boolean(),
    issuer: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
    redirectUri: z.string(),
    disableLocalLogin: z.coerce.boolean()
  }),
  webRtc: z.object({
    port: z.coerce.number().int().positive(),
    announcedAddress: z.string(),
    maxBitrate: z.coerce.number().int().positive()
  })
});

type TConfig = z.infer<typeof zConfig>;

const defaultConfig: TConfig = {
  server: {
    host: '',
    port: 4991,
    debug: IS_DEVELOPMENT,
    autoupdate: false,
    backupDatabase: true,
    maxRequestBodyBytes: 256 * 1024,
    rateLimitersEnabled: true,
    allowedOrigins: ['*'],
    trustedProxies: [
      '127.0.0.1',
      '::1',
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16',
      'fc00::/7'
    ]
  },
  oidc: {
    enabled: false,
    issuer: '',
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    disableLocalLogin: false
  },
  webRtc: {
    port: 40000,
    announcedAddress: '',
    maxBitrate: 30_000_000 // 30 Mbps
  }
};

let config: TConfig = structuredClone(defaultConfig);

await ensureServerDirs();

const configExists = await fs.exists(CONFIG_INI_PATH);

if (!configExists) {
  // config does not exist, create it with the default config
  await fs.writeFile(CONFIG_INI_PATH, stringify(config));
} else {
  try {
    // config exists, we need to make sure it is up to date with the schema
    // to make this easy, we will read the existing config, merge it with the default config, and write it back to the file
    // this way we don't have to worry about migrating old config files when we add/remove config options
    const existingConfigText = await fs.readFile(CONFIG_INI_PATH, {
      encoding: 'utf-8'
    });

    const existingConfig = parse(existingConfigText) as Partial<TConfig>;
    const mergedConfig = deepMerge(config, existingConfig);

    config = zConfig.parse(mergedConfig);

    await fs.writeFile(CONFIG_INI_PATH, stringify(config));
  } catch (error) {
    // something went wrong, just log the error and overwrite the config file with the default config
    console.error(
      `Error reading or parsing config.ini. Overwriting with default config. Error: ${getErrorMessage(error)}`
    );

    await fs.writeFile(CONFIG_INI_PATH, stringify(config));
  }
}

const envOverridesMap: Record<string, string> = {
  'server.host': 'SHARKORD_HOST',
  'server.port': 'SHARKORD_PORT',
  'server.debug': 'SHARKORD_DEBUG',
  'server.autoupdate': 'SHARKORD_AUTOUPDATE',
  'server.backupDatabase': 'SHARKORD_BACKUP_DATABASE',
  'server.maxRequestBodyBytes': 'SHARKORD_MAX_REQUEST_BODY_BYTES',
  'server.allowedOrigins': 'SHARKORD_ALLOWED_ORIGINS',
  'server.trustedProxies': 'SHARKORD_TRUSTED_PROXIES',
  'oidc.enabled': 'SHARKORD_OIDC_ENABLED',
  'oidc.issuer': 'SHARKORD_OIDC_ISSUER',
  'oidc.clientId': 'SHARKORD_OIDC_CLIENT_ID',
  'oidc.clientSecret': 'SHARKORD_OIDC_CLIENT_SECRET',
  'oidc.redirectUri': 'SHARKORD_OIDC_REDIRECT_URI',
  'oidc.disableLocalLogin': 'SHARKORD_OIDC_DISABLE_LOCAL_LOGIN',
  'webRtc.port': 'SHARKORD_WEBRTC_PORT',
  'webRtc.announcedAddress': 'SHARKORD_WEBRTC_ANNOUNCED_ADDRESS',
  'webRtc.maxBitrate': 'SHARKORD_WEBRTC_MAX_BITRATE',
  'server.rateLimitersEnabled': 'SHARKORD_RATE_LIMITERS_ENABLED'
};

// validated again after the overrides, otherwise an env var could put a value
// in the config that does not match its type at all
config = zConfig.parse(applyEnvOverrides(config, envOverridesMap));
config = IS_TEST ? config : deepFreeze(config);

const SERVER_PRIVATE_IP = await getPrivateIp();

// the address mediasoup announces. an explicit ip is used as is, a hostname is
// resolved through dns, and only when neither works do we ask the third party providers
const SERVER_PUBLIC_IP = await resolveAnnouncedAddress(
  config.webRtc.announcedAddress
);

export {
  config,
  deepFreeze,
  defaultConfig,
  envOverridesMap,
  SERVER_PRIVATE_IP,
  SERVER_PUBLIC_IP,
  zConfig
};
