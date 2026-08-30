import { randomBytes } from 'crypto';
import type http from 'http';
import * as client from 'openid-client';
import { config } from '../../config';
import { getPublicOrigin } from '../../http/helpers';
import { logger } from '../../logger';

const WELL_KNOWN_SUFFIX = '/.well-known/openid-configuration';
const DISCOVERY_CACHE_TTL_MS = 5 * 60 * 1000;

// the state cookie is given the transaction's lifetime, so the two cannot drift apart
const TRANSACTION_TTL_SECONDS = 5 * 60;
const TRANSACTION_TTL_MS = TRANSACTION_TTL_SECONDS * 1000;
const HANDOFF_TTL_MS = 60 * 1000;

type TExpiring = { expiresAt: number };

type TOidcTransaction = TExpiring & {
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
};

type TOidcHandoff = TExpiring & {
  token: string;
};

const isLocalHostname = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

class OidcManager {
  private discovery:
    | ({ value: client.Configuration; issuer: string } & TExpiring)
    | null = null;
  private transactions = new Map<string, TOidcTransaction>();
  private handoffs = new Map<string, TOidcHandoff>();

  private sweep = (entries: Map<string, TExpiring>) => {
    const now = Date.now();

    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(key);
    }
  };

  private takeIfFresh = <T extends TExpiring>(
    entries: Map<string, T>,
    key: string
  ): T | undefined => {
    const entry = entries.get(key);

    entries.delete(key);

    if (!entry || entry.expiresAt <= Date.now()) return undefined;

    return entry;
  };

  public getIssuerUrl = (): URL => {
    const issuer = config.oidc.issuer.trim().replace(/\/+$/, '');

    return new URL(
      issuer.endsWith(WELL_KNOWN_SUFFIX)
        ? issuer.slice(0, -WELL_KNOWN_SUFFIX.length)
        : issuer
    );
  };

  private applyClientAuthMethod = (
    discovered: client.Configuration,
    isLoopback: boolean
  ): client.Configuration => {
    const metadata = discovered.serverMetadata();
    const supported = metadata.token_endpoint_auth_methods_supported;

    if (!supported || supported.includes('client_secret_post'))
      return discovered;

    if (!supported.includes('client_secret_basic')) {
      logger.warn(
        'OIDC provider advertises no client authentication method we support (%s), trying client_secret_post',
        supported.join(', ')
      );

      return discovered;
    }

    logger.debug('OIDC client is authenticating with client_secret_basic');

    const configured = new client.Configuration(
      metadata,
      config.oidc.clientId,
      config.oidc.clientSecret,
      client.ClientSecretBasic(config.oidc.clientSecret)
    );

    if (isLoopback) client.allowInsecureRequests(configured);

    return configured;
  };

  public getConfiguration = async (): Promise<client.Configuration> => {
    const issuerUrl = this.getIssuerUrl();
    const isLoopback = isLocalHostname(issuerUrl.hostname);

    if (issuerUrl.protocol !== 'https:' && !isLoopback) {
      throw new Error(
        `OIDC issuer must use https, got "${issuerUrl.protocol}//${issuerUrl.hostname}"`
      );
    }

    if (
      this.discovery &&
      this.discovery.issuer === config.oidc.issuer &&
      Date.now() < this.discovery.expiresAt
    ) {
      return this.discovery.value;
    }

    const discovered = await client.discovery(
      issuerUrl,
      config.oidc.clientId,
      config.oidc.clientSecret,
      undefined,
      isLoopback ? { execute: [client.allowInsecureRequests] } : undefined
    );

    const value = this.applyClientAuthMethod(discovered, isLoopback);

    this.discovery = {
      value,
      issuer: config.oidc.issuer,
      expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS
    };

    return value;
  };

  public resolveRedirectUri = (req: http.IncomingMessage): string => {
    if (config.oidc.redirectUri) return config.oidc.redirectUri;

    return `${getPublicOrigin(req)}/oidc/callback`;
  };

  public startTransaction = (
    state: string,
    data: Omit<TOidcTransaction, 'expiresAt'>
  ) => {
    this.sweep(this.transactions);

    this.transactions.set(state, {
      ...data,
      expiresAt: Date.now() + TRANSACTION_TTL_MS
    });
  };

  public takeTransaction = (state: string) =>
    this.takeIfFresh(this.transactions, state);

  public createHandoff = (token: string): string => {
    this.sweep(this.handoffs);

    const code = randomBytes(32).toString('base64url');

    this.handoffs.set(code, {
      token,
      expiresAt: Date.now() + HANDOFF_TTL_MS
    });

    return code;
  };

  public takeHandoff = (code: string) => this.takeIfFresh(this.handoffs, code);

  public resetForTests = () => {
    this.discovery = null;
    this.transactions.clear();
    this.handoffs.clear();
  };
}

const oidcManager = new OidcManager();

export { oidcManager, TRANSACTION_TTL_SECONDS };
