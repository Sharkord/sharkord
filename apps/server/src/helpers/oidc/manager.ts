import { randomBytes } from 'crypto';
import type http from 'http';
import * as client from 'openid-client';
import { config } from '../../config';
import {
  createOidcHandoff,
  createOidcTransaction,
  takeOidcHandoff,
  takeOidcTransaction
} from '../../db/mutations/oidc';
import { getPublicOrigin } from '../../http/helpers';
import { logger } from '../../logger';

const DISCOVERY_CACHE_TTL_MS = 5 * 60 * 1000;

// the state cookie is given the transaction's lifetime, so the two cannot drift apart.
// long enough to survive mfa enrolment or a password reset on the provider side
const TRANSACTION_TTL_SECONDS = 15 * 60;
const TRANSACTION_TTL_MS = TRANSACTION_TTL_SECONDS * 1000;
const HANDOFF_TTL_MS = 60 * 1000;

type TExpiring = { expiresAt: number };

const isLocalHostname = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

class OidcManager {
  private discovery:
    | ({ value: client.Configuration; issuer: string } & TExpiring)
    | null = null;

  // verbatim on purpose. an issuer is compared to the discovery document by exact string,
  // so a trailing slash is significant: Authentik's issuers end with one and normalising it
  // away makes every discovery fail. openid-client already fetches a pasted well-known url
  // directly, so there is nothing here worth being clever about
  public getIssuerUrl = (): URL => new URL(config.oidc.issuer.trim());

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

  // logins in flight live in the database, so a restart in the middle of one does not
  // strand the user on the provider with a state nothing here remembers
  public startTransaction = (
    state: string,
    data: { nonce: string; codeVerifier: string; redirectUri: string }
  ) =>
    createOidcTransaction({
      ...data,
      state,
      expiresAt: Date.now() + TRANSACTION_TTL_MS
    });

  public takeTransaction = (state: string) => takeOidcTransaction(state);

  public createHandoff = (token: string, state: string): string => {
    const code = randomBytes(32).toString('base64url');

    createOidcHandoff({
      code,
      token,
      state,
      expiresAt: Date.now() + HANDOFF_TTL_MS
    });

    return code;
  };

  public takeHandoff = (code: string) => takeOidcHandoff(code);

  public resetForTests = () => {
    this.discovery = null;
  };
}

const oidcManager = new OidcManager();

export { oidcManager, TRANSACTION_TTL_SECONDS };
