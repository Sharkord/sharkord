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
  z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }, z.any()).transform((val) => val as T);

const commaSeparatedTransform = (fallback: string[]) =>
  z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    return val.split(',').map((s) => s.trim()).filter(Boolean);
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
    requiredGroup: z.string().optional(),
    allowedOrigins: commaSeparatedTransform([]),
    caCertPath: z.string().optional()
  }),
  webRtc: z.object({
    port: z.coerce.number().int().positive(),
    announcedAddress: z.string()
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
    })
  })
});

type TConfig = z.output<typeof zConfig>;

const defaultConfig : TConfig = {
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
    rolesMapping: {"Group1":"Role1"},
    requiredGroup: 'ExampleOIDCGroup',
    allowedOrigins: ['https://sharkord.example.com', 'https://sharkord2.example.com'],
    caCertPath: ''
  },
  webRtc: {
    port: 40000,
    announcedAddress: ''
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
      allowedOrigins: allowedOrigins.join(','),
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
    const existingConfigText = await fs.readFile(CONFIG_INI_PATH, { encoding: 'utf-8' });
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

config = applyEnvOverrides(config, {
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
  'oidc.requiredGroup': 'OIDC_REQUIRED_GROUP',
  'oidc.allowedOrigins': 'OIDC_ALLOWED_ORIGINS',
  'oidc.caCertPath': 'OIDC_CA_CERT_PATH',

  'webRtc.port': 'SHARKORD_WEBRTC_PORT',
  'webRtc.announcedAddress': 'SHARKORD_WEBRTC_ANNOUNCED_ADDRESS'
});

config = Object.freeze(config);

export { config, SERVER_PRIVATE_IP, SERVER_PUBLIC_IP };