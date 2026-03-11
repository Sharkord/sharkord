import fs from 'fs/promises';
import { parse, stringify } from 'ini';
import z from 'zod';
import { applyEnvOverrides } from './helpers/apply-env-overrides';
import { deepMerge } from './helpers/deep-merge';
import { ensureServerDirs } from './helpers/ensure-server-dirs';
import { getErrorMessage } from './helpers/get-error-message';
import { getPrivateIp, getPublicIp } from './helpers/network';
import { CONFIG_INI_PATH } from './helpers/paths';
import { IS_DEVELOPMENT } from './utils/env';

const [SERVER_PUBLIC_IP, SERVER_PRIVATE_IP] = await Promise.all([
  getPublicIp(),
  getPrivateIp()
]);

const jsonTransform = <T>(fallback: T) =>
  z
    .preprocess((val) => {
      if (typeof val !== 'string') return val;
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    }, z.any())
    .transform((val) => val as T);

const commaSeparatedTransform = (fallback: string[]) =>
  z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, z.string().array());

const zConfig = z.object({
  server: z.object({
    port: z.coerce.number().int().positive(),
    debug: z.coerce.boolean(),
    autoupdate: z.coerce.boolean(),
    disableLocalSignup: z.coerce.boolean()
  }),
  oidc: z.object({
    oidcEnabled: z.coerce.boolean(),
    enforceOidcRoles: z.coerce.boolean(),
    issuer: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
    rolesMapping: jsonTransform<Record<string, string>>({}),
    requiredGroups: commaSeparatedTransform([]),
    allowedOrigins: commaSeparatedTransform([]),
    caCertPath: z.string().optional(),
    groupsClaim: z.string(),
    usernameClaim: z.string(),
    displayNameClaim: z.string(),
    enforceOidcDisplayName: z.coerce.boolean(),
    additionalScopes: commaSeparatedTransform([])
  }),
  webRtc: z.object({
    port: z.coerce.number().int().positive(),
    announcedAddress: z.string(),
    maxBitrate: z.coerce.number().int().positive()
  }),
  rateLimiters: z.object({
    sendAndEditMessage: z.object({
      maxRequests: z.coerce.number().int().positive(),
      windowMs: z.coerce.number().int().positive()
    }),
    joinVoiceChannel: z.object({
      maxRequests: z.coerce.number().int().positive(),
      windowMs: z.coerce.number().int().positive()
    }),
    joinServer: z.object({
      maxRequests: z.coerce.number().int().positive(),
      windowMs: z.coerce.number().int().positive()
    }),
    search: z.object({
      maxRequests: z.coerce.number().int().positive(),
      windowMs: z.coerce.number().int().positive()
    })
  })
});

type TConfig = z.output<typeof zConfig>;

const defaultConfig: TConfig = {
  server: {
    port: 4991,
    debug: IS_DEVELOPMENT,
    autoupdate: false,
    disableLocalSignup: false
  },
  oidc: {
    oidcEnabled: false,
    enforceOidcRoles: true,
    issuer: 'https://auth.example.com/.well-known/openid-configuration',
    clientId: '',
    clientSecret: '',
    rolesMapping: {},
    requiredGroups: [],
    allowedOrigins: [],
    caCertPath: '',
    groupsClaim: 'groups',
    usernameClaim: 'preferred_username',
    displayNameClaim: '',
    enforceOidcDisplayName: true,
    additionalScopes: []
  },
  webRtc: {
    port: 40000,
    announcedAddress: '',
    maxBitrate: 30_000_000 // 30 Mbps
  },
  rateLimiters: {
    sendAndEditMessage: {
      maxRequests: 15,
      windowMs: 60_000
    },
    joinVoiceChannel: {
      maxRequests: 20,
      windowMs: 60_000
    },
    joinServer: {
      maxRequests: 5,
      windowMs: 60_000
    },
    search: {
      maxRequests: 15,
      windowMs: 60_000
    }
  }
};

const prepareForSave = (data: TConfig) => {
  const { oidc, ...rest } = data;
  const { allowedOrigins, rolesMapping, ...oidcRest } = oidc;

  return {
    ...rest,
    oidc: {
      ...oidcRest,
      rolesMapping: JSON.stringify(rolesMapping),
      allowedOrigins: allowedOrigins.join(',')
    }
  };
};

let config: TConfig = zConfig.parse(defaultConfig);

await ensureServerDirs();

const configExists = await fs.exists(CONFIG_INI_PATH);

if (!configExists) {
  await fs.writeFile(CONFIG_INI_PATH, stringify(prepareForSave(config)));
} else {
  try {
    const existingConfigText = await fs.readFile(CONFIG_INI_PATH, {
      encoding: 'utf-8'
    });
    const existingConfig = parse(existingConfigText);

    const mergedConfig = deepMerge(defaultConfig, existingConfig);
    config = zConfig.parse(mergedConfig);

    await fs.writeFile(CONFIG_INI_PATH, stringify(prepareForSave(config)));
  } catch (error) {
    console.error(
      `Error parsing config.ini. Resetting to defaults. Error: ${getErrorMessage(error)}`
    );
    await fs.writeFile(CONFIG_INI_PATH, stringify(prepareForSave(config)));
  }
}

config = zConfig.parse(
  applyEnvOverrides(config, {
    'server.port': 'SHARKORD_PORT',
    'server.debug': 'SHARKORD_DEBUG',
    'server.autoupdate': 'SHARKORD_AUTOUPDATE',
    'server.disableLocalSignup': 'SHARKORD_DISABLE_LOCAL_SIGNUP',

    'oidc.oidcEnabled': 'OIDC_ENABLED',
    'oidc.enforceOidcRoles': 'OIDC_ENFORCE_ROLES',
    'oidc.issuer': 'OIDC_ISSUER',
    'oidc.clientId': 'OIDC_CLIENT_ID',
    'oidc.clientSecret': 'OIDC_CLIENT_SECRET',
    'oidc.rolesMapping': 'OIDC_ROLES_MAPPING',
    'oidc.requiredGroups': 'OIDC_REQUIRED_GROUPS',
    'oidc.allowedOrigins': 'OIDC_ALLOWED_ORIGINS',
    'oidc.caCertPath': 'OIDC_CA_CERT_PATH',
    'oidc.groupsClaim': 'OIDC_GROUPS_CLAIM',
    'oidc.usernameClaim': 'OIDC_USERNAME_CLAIM',
    'oidc.displayNameClaim': 'OIDC_DISPLAY_NAME_CLAIM',
    'oidc.enforceOidcDisplayName': 'OIDC_ENFORCE_DISPLAY_NAME',
    'oidc.additionalScopes': 'OIDC_ADDITIONAL_SCOPES',

    'webRtc.port': 'SHARKORD_WEBRTC_PORT',
    'webRtc.announcedAddress': 'SHARKORD_WEBRTC_ANNOUNCED_ADDRESS',
    'webRtc.maxBitrate': 'SHARKORD_WEBRTC_MAX_BITRATE'
  })
);

config = Object.freeze(config);

export { config, SERVER_PRIVATE_IP, SERVER_PUBLIC_IP };
