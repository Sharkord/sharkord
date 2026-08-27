import { OidcError, sha256 } from '@sharkord/shared';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { createMockContext } from '../../../__tests__/context';
import {
  startFakeOidcProvider,
  type TFakeOidcProvider,
  type TFakeProviderClaims
} from '../../../__tests__/fake-oidc-provider';
import { TEST_SECRET_TOKEN } from '../../../__tests__/seed';
import { findTestLog, tdb, testsBaseUrl } from '../../../__tests__/setup';
import { config } from '../../../config';
import {
  channelReadStates,
  files,
  settings,
  userRoles,
  users
} from '../../../db/schema';
import { oidcManager } from '../../../helpers/oidc/manager';
import { appRouter } from '../../../routers';

/**
 * Driven against a real provider (see fake-oidc-provider.ts) rather than a mocked
 * openid-client, so state, nonce and PKCE are actually exercised.
 *
 * Not covered, because the harness cannot reach it: a provider that is unreachable or
 * answers slowly, and TLS behaviour, since the fake one runs over plain http on loopback.
 * The failure path around them is covered by the bad issuer and unreachable picture cases.
 */
let provider: TFakeOidcProvider;

const DEFAULT_CLAIMS: TFakeProviderClaims = {
  sub: 'oidc-subject-1',
  email: 'oidc.user@example.com',
  email_verified: true,
  preferred_username: 'oidcuser',
  name: 'OIDC User'
};

const getStateCookie = (response: Response) => {
  const [cookie] = response.headers.getSetCookie();

  return cookie?.split(';')[0] ?? '';
};

// walks the redirects a browser would follow: our login route, the provider's authorization
// endpoint, then back into our callback carrying the state cookie
const runOidcFlow = async (options: { cookie?: string } = {}) => {
  const loginResponse = await fetch(`${testsBaseUrl}/oidc/login`, {
    redirect: 'manual'
  });

  const authorizeUrl = loginResponse.headers.get('location')!;
  const cookie = options.cookie ?? getStateCookie(loginResponse);

  const authorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' });

  const callbackResponse = await fetch(
    authorizeResponse.headers.get('location')!,
    {
      redirect: 'manual',
      headers: cookie ? { cookie } : {}
    }
  );

  const target = new URL(callbackResponse.headers.get('location')!);

  return {
    code: target.searchParams.get('oidc'),
    error: target.searchParams.get('oidc_error')
  };
};

const exchange = async (code: string) =>
  fetch(`${testsBaseUrl}/oidc/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });

const signIn = async () => {
  const { code, error } = await runOidcFlow();

  expect(error).toBeNull();
  expect(code).not.toBeNull();

  const response = await exchange(code!);

  expect(response.status).toBe(200);

  const data = (await response.json()) as { success: boolean; token: string };

  return data.token;
};

beforeAll(async () => {
  provider = await startFakeOidcProvider();
});

afterAll(async () => {
  await provider.close();

  config.oidc.enabled = false;
  config.oidc.disableLocalLogin = false;
});

beforeEach(() => {
  config.oidc.enabled = true;
  config.oidc.disableLocalLogin = false;
  config.oidc.issuer = provider.issuer;
  config.oidc.clientId = provider.clientId;
  config.oidc.clientSecret = provider.clientSecret;
  config.oidc.redirectUri = '';

  provider.setClaims({ ...DEFAULT_CLAIMS });
  provider.setIdTokenClaims([
    'sub',
    'email',
    'email_verified',
    'preferred_username'
  ]);
  provider.setAuthMethods(['client_secret_post']);

  oidcManager.resetForTests();
});

describe('/oidc/login', () => {
  test('should redirect to the provider with pkce, state and nonce', async () => {
    const response = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    expect(response.status).toBe(302);

    const target = new URL(response.headers.get('location')!);

    expect(target.origin).toBe(provider.issuer);
    expect(target.searchParams.get('code_challenge_method')).toBe('S256');
    expect(target.searchParams.get('code_challenge')).toBeTruthy();
    expect(target.searchParams.get('state')).toBeTruthy();
    expect(target.searchParams.get('nonce')).toBeTruthy();
    expect(target.searchParams.get('redirect_uri')).toBe(
      `${testsBaseUrl}/oidc/callback`
    );
  });

  test('should bind the state to an http only cookie', async () => {
    const response = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    const [cookie] = response.headers.getSetCookie();
    const target = new URL(response.headers.get('location')!);

    expect(cookie).toContain(
      `sharkord_oidc_state=${target.searchParams.get('state')}`
    );
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  test('should 404 when oidc is disabled', async () => {
    config.oidc.enabled = false;

    const response = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    expect(response.status).toBe(404);
  });

  // the loopback exemption that lets this suite (and a local setup) run over plain http
  // must not extend to a real host, where the discovery document and the client secret
  // would travel in the clear
  test('should refuse a plain http issuer that is not loopback', async () => {
    config.oidc.issuer = 'http://accounts.example.com';

    const response = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    expect(response.status).toBe(500);
    expect(findTestLog('error', 'must use https')).toBeDefined();
  });

  test('should accept the discovery url in place of the issuer', async () => {
    config.oidc.issuer = `${provider.issuer}/.well-known/openid-configuration`;

    const response = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    expect(response.status).toBe(302);
  });
});

// openid-client always uses client_secret_post and never negotiates, so a provider that
// wants basic auth would fail at the token exchange with an opaque 401
describe('client authentication method', () => {
  test('should post the secret when the provider advertises it', async () => {
    await signIn();

    expect(provider.getLastTokenAuth()).toBe('post');
  });

  test('should switch to basic auth when that is all the provider accepts', async () => {
    provider.setAuthMethods(['client_secret_basic']);

    await signIn();

    expect(provider.getLastTokenAuth()).toBe('basic');
  });

  test('should prefer post when the provider accepts either', async () => {
    provider.setAuthMethods(['client_secret_basic', 'client_secret_post']);

    await signIn();

    expect(provider.getLastTokenAuth()).toBe('post');
  });

  // the discovery spec makes client_secret_basic the default for an omitted field, and
  // providers that leave it out are relying on exactly that
  test('should use basic auth when the provider advertises nothing', async () => {
    provider.setAuthMethods(undefined);

    await signIn();

    expect(provider.getLastTokenAuth()).toBe('basic');
  });
});

describe('/oidc/callback', () => {
  test('should create the user, assign the default role and back fill read states', async () => {
    const token = await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created).toBeDefined();
    expect(created!.identity).toBe('oidc.user@example.com');
    expect(created!.name).toBe('oidcuser');

    const roles = await tdb
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, created!.id))
      .all();

    expect(roles).toHaveLength(1);

    // no password its owner could ever supply, so the settings screen and the route both
    // have to refuse a change rather than fail the current password check by accident
    expect(created!.passwordSet).toBe(false);

    // the seed has messages in channel 1, so a fresh account must not start with them unread
    const readStates = await tdb
      .select()
      .from(channelReadStates)
      .where(eq(channelReadStates.userId, created!.id))
      .all();

    expect(readStates.length).toBeGreaterThan(0);

    const decoded = jwt.verify(
      token,
      await sha256(TEST_SECRET_TOKEN)
    ) as jwt.JwtPayload;

    expect(decoded.userId).toBe(created!.id);
  });

  test('should match an existing account on sub without creating a second one', async () => {
    await signIn();

    // everything except the stable subject changes at the provider
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      email: 'renamed@example.com',
      preferred_username: 'renamed'
    });

    await signIn();

    const matching = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .all();

    expect(matching).toHaveLength(1);
  });

  test('should fall back to userinfo when the id token omits claims', async () => {
    provider.setIdTokenClaims(['sub']);

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.identity).toBe('oidc.user@example.com');
    expect(created!.name).toBe('oidcuser');
  });

  test('should lowercase the identity so it cannot duplicate a local account', async () => {
    provider.setClaims({ ...DEFAULT_CLAIMS, email: 'Oidc.User@Example.com' });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.identity).toBe('oidc.user@example.com');
  });

  test('should link to an existing local account when the email is verified', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      email: 'testowner',
      email_verified: true
    });

    await signIn();

    const owner = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'testowner'))
      .get();

    expect(owner!.id).toBe(1);
    expect(owner!.oidcSub).toBe('oidc-subject-1');

    const all = await tdb.select().from(users).all();

    expect(all.filter((u) => u.identity === 'testowner')).toHaveLength(1);
  });

  // the spec says boolean, saml bridges routinely send the string
  test('should accept a string email_verified when linking', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      email: 'testowner',
      email_verified: 'true'
    });

    await signIn();

    const owner = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'testowner'))
      .get();

    expect(owner!.oidcSub).toBe('oidc-subject-1');
  });

  test('should still refuse a string that is not true', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      email: 'testowner',
      email_verified: 'false'
    });

    const { error } = await runOidcFlow();

    expect(error).toBe(OidcError.SERVER_ERROR);
  });

  test('should refuse to link an existing local account on an unverified email', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      email: 'testowner',
      email_verified: false
    });

    const { error } = await runOidcFlow();

    expect(error).toBe(OidcError.SERVER_ERROR);

    const owner = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'testowner'))
      .get();

    expect(owner!.oidcSub).toBeNull();
  });

  test('should refuse to take over an account already linked to another subject', async () => {
    await signIn();

    provider.setClaims({
      ...DEFAULT_CLAIMS,
      sub: 'a-different-subject',
      email_verified: true
    });

    const { error } = await runOidcFlow();

    expect(error).toBe(OidcError.SERVER_ERROR);

    const linked = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'oidc.user@example.com'))
      .get();

    expect(linked!.oidcSub).toBe('oidc-subject-1');
  });

  test('should still create an account for a new identity with an unverified email', async () => {
    provider.setClaims({ ...DEFAULT_CLAIMS, email_verified: false });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created).toBeDefined();
  });

  test('should import the picture claim as the avatar on registration', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      picture: `${provider.issuer}/avatar.png`
    });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.avatarId).not.toBeNull();

    const avatar = await tdb
      .select()
      .from(files)
      .where(eq(files.id, created!.avatarId!))
      .get();

    expect(avatar!.mimeType).toContain('image/');
    expect(avatar!.size).toBeGreaterThan(0);
  });

  test('should leave the avatar empty when there is no picture claim', async () => {
    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.avatarId).toBeNull();
  });

  // the picture is cosmetic, so nothing it does may cost somebody their sign in
  test('should still sign in when the picture is not an image', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      picture: `${provider.issuer}/not-an-image`
    });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created).toBeDefined();
    expect(created!.avatarId).toBeNull();
    expect(
      findTestLog('warn', 'unsupported picture content type')
    ).toBeDefined();
  });

  test('should still sign in when the picture cannot be fetched', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      picture: `${provider.issuer}/nothing-here.png`
    });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.avatarId).toBeNull();
  });

  // following one would skip the host checks, so a provider that redirects just ends up
  // without an imported avatar
  test('should not follow a redirect on the picture url', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      picture: `${provider.issuer}/redirected-avatar.png`
    });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.avatarId).toBeNull();
  });

  test('should refuse a picture on a private host that is not the provider', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      picture: 'http://192.168.1.1/avatar.png'
    });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.avatarId).toBeNull();
    expect(findTestLog('warn', 'must use https')).toBeDefined();
  });

  test('should skip the import when uploads are disabled', async () => {
    await tdb.update(settings).set({ storageUploadEnabled: false });

    provider.setClaims({
      ...DEFAULT_CLAIMS,
      picture: `${provider.issuer}/avatar.png`
    });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.avatarId).toBeNull();
  });

  // the tombstone row inherits every deleted user's messages, so a subject linked to it
  // would inherit that history
  test('should refuse the reserved deleted user identity', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      email: '__deleted_user__',
      email_verified: true
    });

    const { error } = await runOidcFlow();

    expect(error).toBe(OidcError.SERVER_ERROR);

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created).toBeUndefined();
  });

  test('should reject a banned user', async () => {
    await signIn();

    await tdb
      .update(users)
      .set({ banned: true, banReason: 'testing' })
      .where(eq(users.oidcSub, 'oidc-subject-1'));

    const { error } = await runOidcFlow();

    expect(error).toBe(OidcError.ACCESS_DENIED);
  });

  test('should carry the current tokenVersion so a kick still invalidates sessions', async () => {
    await signIn();

    await tdb
      .update(users)
      .set({ tokenVersion: 3 })
      .where(eq(users.oidcSub, 'oidc-subject-1'));

    const token = await signIn();

    const decoded = jwt.verify(
      token,
      await sha256(TEST_SECRET_TOKEN)
    ) as jwt.JwtPayload;

    expect(decoded.tokenVersion).toBe(3);
  });

  test('should reject a state that does not match the cookie', async () => {
    const { error } = await runOidcFlow({
      cookie: 'sharkord_oidc_state=not-the-right-state'
    });

    expect(error).toBe(OidcError.INVALID_STATE);
  });

  test('should reject a callback with no state cookie at all', async () => {
    const { error } = await runOidcFlow({ cookie: '' });

    expect(error).toBe(OidcError.INVALID_STATE);
  });

  test('should reject a state with no pending transaction', async () => {
    const loginResponse = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    const cookie = getStateCookie(loginResponse);
    const state = new URL(
      loginResponse.headers.get('location')!
    ).searchParams.get('state')!;

    // stands in for the transaction expiring, or the server restarting mid login
    oidcManager.resetForTests();

    const response = await fetch(
      `${testsBaseUrl}/oidc/callback?code=whatever&state=${state}`,
      { redirect: 'manual', headers: { cookie } }
    );

    const target = new URL(response.headers.get('location')!);

    expect(target.searchParams.get('oidc_error')).toBe(OidcError.EXPIRED);
  });

  test('should surface a provider error as access denied', async () => {
    const loginResponse = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    const cookie = getStateCookie(loginResponse);
    const state = new URL(
      loginResponse.headers.get('location')!
    ).searchParams.get('state')!;

    const response = await fetch(
      `${testsBaseUrl}/oidc/callback?error=access_denied&state=${state}`,
      { redirect: 'manual', headers: { cookie } }
    );

    const target = new URL(response.headers.get('location')!);

    expect(target.searchParams.get('oidc_error')).toBe(OidcError.ACCESS_DENIED);
  });

  test('should clear the state cookie on the way out', async () => {
    const loginResponse = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    const cookie = getStateCookie(loginResponse);
    const authorizeUrl = loginResponse.headers.get('location')!;
    const authorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' });

    const callbackResponse = await fetch(
      authorizeResponse.headers.get('location')!,
      { redirect: 'manual', headers: { cookie } }
    );

    const [setCookie] = callbackResponse.headers.getSetCookie();

    expect(setCookie).toContain('sharkord_oidc_state=');
    expect(setCookie).toContain('Max-Age=0');
  });

  test('should 404 when oidc is disabled', async () => {
    config.oidc.enabled = false;

    const response = await fetch(`${testsBaseUrl}/oidc/callback?code=x`, {
      redirect: 'manual'
    });

    expect(response.status).toBe(404);
  });
});

// everything above stops at the token. this is the leg where #237's missing tokenVersion
// actually bit: the token verifies fine and is still refused when the socket opens
describe('using the issued token', () => {
  test('should let the new account join the server', async () => {
    const token = await signIn();

    const caller = appRouter.createCaller(
      await createMockContext({ customToken: token })
    );

    const { handshakeHash } = await caller.others.handshake();
    const initialData = await caller.others.joinServer({ handshakeHash });

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(initialData.ownUserId).toBe(created!.id);
    expect(
      initialData.users.find((user) => user.id === created!.id)?.name
    ).toBe('oidcuser');
  });
});

describe('/oidc/exchange', () => {
  test('should reject a code that was already used', async () => {
    const { code } = await runOidcFlow();

    expect((await exchange(code!)).status).toBe(200);
    expect((await exchange(code!)).status).toBe(401);
  });

  test('should reject an unknown code', async () => {
    const response = await exchange('definitely-not-a-real-code');

    expect(response.status).toBe(401);
  });

  test('should reject a missing code', async () => {
    const response = await fetch(`${testsBaseUrl}/oidc/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    expect(response.status).toBe(400);
  });

  test('should 404 when oidc is disabled', async () => {
    config.oidc.enabled = false;

    const response = await exchange('anything');

    expect(response.status).toBe(404);
  });
});

describe('oidc rate limiting', () => {
  test('should stop hammering the provider from one address', async () => {
    const { maxRequests } = config.rateLimiters.oidc;

    for (let attempt = 0; attempt < maxRequests; attempt++) {
      await fetch(`${testsBaseUrl}/oidc/login`, { redirect: 'manual' });
    }

    const response = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    expect(response.status).toBe(429);
  });
});

describe('local login with disableLocalLogin', () => {
  test('should refuse a password login', async () => {
    config.oidc.disableLocalLogin = true;

    const response = await fetch(`${testsBaseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'testowner', password: 'password123' })
    });

    expect(response.status).toBe(400);

    const data = (await response.json()) as { errors: { identity: string } };

    expect(data.errors.identity).toBe(
      'This server only accepts sign in through its identity provider'
    );
  });

  test('should still allow a password login while it is off', async () => {
    config.oidc.disableLocalLogin = false;

    const response = await fetch(`${testsBaseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'testowner', password: 'password123' })
    });

    expect(response.status).toBe(200);
  });
});
