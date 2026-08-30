import {
  ActivityLogType,
  MAX_USER_NAME_LENGTH,
  OidcError,
  sha256
} from '@sharkord/shared';
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
  activityLog,
  channelReadStates,
  files,
  oidcTransactions,
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

const getHandoffCode = (target: URL) =>
  new URLSearchParams(target.hash.replace(/^#/, '')).get('oidc');

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
    code: getHandoffCode(target),
    error: target.searchParams.get('oidc_error'),
    cookie
  };
};

const exchange = async (code: string, cookie?: string) =>
  fetch(`${testsBaseUrl}/oidc/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {})
    },
    body: JSON.stringify({ code })
  });

const signIn = async () => {
  const { code, error, cookie } = await runOidcFlow();

  expect(error).toBeNull();
  expect(code).not.toBeNull();

  const response = await exchange(code!, cookie);

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
  provider.setUserInfoAvailable(true);

  oidcManager.resetForTests();
});

describe('an issuer that ends with a slash', () => {
  let pathProvider: TFakeOidcProvider;

  beforeAll(async () => {
    pathProvider = await startFakeOidcProvider('/application/o/sharkord');
  });

  afterAll(async () => {
    await pathProvider.close();
  });

  test('should keep the trailing slash so discovery validates', async () => {
    expect(pathProvider.issuer).toEndWith('/');

    config.oidc.issuer = pathProvider.issuer;
    config.oidc.clientId = pathProvider.clientId;
    config.oidc.clientSecret = pathProvider.clientSecret;
    oidcManager.resetForTests();

    const response = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    expect(response.status).toBe(302);
    expect(findTestLog('error', 'does not match')).toBeUndefined();
  });
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

    // keyed by state so a second tab starting a login cannot invalidate the first
    expect(cookie).toContain(
      `sharkord_oidc_state_${target.searchParams.get('state')}=1`
    );
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  test('should not clobber a login already in flight in another tab', async () => {
    const first = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });
    const second = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    const firstState = new URL(first.headers.get('location')!).searchParams.get(
      'state'
    )!;

    // the browser holds both cookies, so the first tab can still finish
    const cookies = [getStateCookie(first), getStateCookie(second)].join('; ');

    const authorizeResponse = await fetch(first.headers.get('location')!, {
      redirect: 'manual'
    });

    const callbackResponse = await fetch(
      authorizeResponse.headers.get('location')!,
      { redirect: 'manual', headers: { cookie: cookies } }
    );

    const target = new URL(callbackResponse.headers.get('location')!);

    expect(firstState).toBeTruthy();
    expect(target.searchParams.get('oidc_error')).toBeNull();
    expect(getHandoffCode(target)).not.toBeNull();
  });

  // a browser is mid navigation, so json would strand it on a raw error page
  test('should redirect rather than serve json when oidc is disabled', async () => {
    config.oidc.enabled = false;

    const response = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    expect(response.status).toBe(302);
    expect(
      new URL(response.headers.get('location')!).searchParams.get('oidc_error')
    ).toBe(OidcError.SERVER_ERROR);
  });

  // the loopback exemption that lets this suite (and a local setup) run over plain http
  // must not extend to a real host, where the discovery document and the client secret
  // would travel in the clear
  test('should refuse a plain http issuer that is not loopback', async () => {
    config.oidc.issuer = 'http://accounts.example.com';

    const response = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    expect(response.status).toBe(302);
    expect(
      new URL(response.headers.get('location')!).searchParams.get('oidc_error')
    ).toBe(OidcError.SERVER_ERROR);
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

  // the spec makes basic the default for an omitted field, but real providers that omit it
  test('should keep posting the secret when the provider advertises nothing', async () => {
    provider.setAuthMethods(undefined);

    await signIn();

    expect(provider.getLastTokenAuth()).toBe('post');
  });
});

describe('behind a tls terminating proxy', () => {
  const PROXY_HEADERS = { 'x-forwarded-proto': 'https' };

  test('should send the same redirect_uri to authorize and to token', async () => {
    const loginResponse = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual',
      headers: PROXY_HEADERS
    });

    const authorizeUrl = new URL(loginResponse.headers.get('location')!);
    const cookie = getStateCookie(loginResponse);

    expect(authorizeUrl.searchParams.get('redirect_uri')).toStartWith(
      'https://'
    );

    const authorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' });

    // the proxy hands the request on over plain http, which is what the server sees
    const forwarded = new URL(authorizeResponse.headers.get('location')!);

    forwarded.protocol = 'http:';

    const callbackResponse = await fetch(forwarded, {
      redirect: 'manual',
      headers: { ...PROXY_HEADERS, cookie }
    });

    const target = new URL(callbackResponse.headers.get('location')!);

    expect(target.searchParams.get('oidc_error')).toBeNull();
    expect(getHandoffCode(target)).not.toBeNull();
    expect(target.protocol).toBe('https:');
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
      email_verified: 'false'
    });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.identity).toBe('oidc-subject-1');
  });

  // an unverified email never becomes the identity any more, so what is left to refuse is
  // a sub that collides with a local identity with nothing verified behind it
  test('should refuse to link an existing local account on nothing verified', async () => {
    provider.setClaims({ sub: 'testowner', preferred_username: 'impostor' });
    provider.setIdTokenClaims(['sub', 'preferred_username']);

    const { error } = await runOidcFlow();

    expect(error).toBe(OidcError.SERVER_ERROR);
    expect(findTestLog('error', 'email_verified is not true')).toBeDefined();

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

  // an unverified email is whatever the account holder typed at the provider. taking it as
  // the identity would let them reserve an address here before its owner ever signs in,
  // and the owner would then be refused for colliding with it
  test('should key on the sub rather than an unverified email', async () => {
    provider.setClaims({ ...DEFAULT_CLAIMS, email_verified: false });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created).toBeDefined();
    expect(created!.identity).toBe('oidc-subject-1');
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

  // the provider decides this string, and the interface renders any account named
  // __deleted_user__ as a tombstone and hides it from the member list
  test('should refuse the reserved name and fall back to a generated one', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      preferred_username: '__deleted_user__',
      name: '__deleted_user__'
    });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.name).not.toBe('__deleted_user__');
    expect(created!.name).toStartWith('SharkordUser');
  });

  test('should refuse a name past the length the interface allows', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      preferred_username: 'x'.repeat(80),
      name: 'y'.repeat(80)
    });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.name.length).toBeLessThanOrEqual(MAX_USER_NAME_LENGTH);
  });

  test('should fall back to the name claim when preferred_username is unusable', async () => {
    provider.setClaims({
      ...DEFAULT_CLAIMS,
      preferred_username: '   ',
      name: 'Real Name'
    });

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.name).toBe('Real Name');
  });

  // a transient userinfo failure used to leave the account permanently keyed on its sub,
  // and nothing ever re-syncs the identity afterwards
  test('should refuse to guess an identity when userinfo is unreachable', async () => {
    provider.setIdTokenClaims(['sub']);
    provider.setUserInfoAvailable(false);

    const { error } = await runOidcFlow();

    expect(error).toBe(OidcError.SERVER_ERROR);

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created).toBeUndefined();
  });

  // a provider that genuinely has no email is a different case from one we cannot reach
  test('should key on the sub verbatim when the provider has no email', async () => {
    provider.setClaims({
      sub: 'MixedCaseSubject',
      preferred_username: 'nomail'
    });
    provider.setIdTokenClaims(['sub', 'preferred_username']);

    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'MixedCaseSubject'))
      .get();

    expect(created!.identity).toBe('MixedCaseSubject');
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

    // stands in for the transaction expiring
    await tdb.delete(oidcTransactions);

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

  // it used to be cleared here, but the exchange needs it to tell the browser that started
  // the login from anyone else holding the code
  test('should keep the state cookie for the exchange and clear it there', async () => {
    const { code, cookie } = await runOidcFlow();

    const response = await exchange(code!, cookie);
    const [setCookie] = response.headers.getSetCookie();

    expect(response.status).toBe(200);
    expect(setCookie).toContain('sharkord_oidc_state_');
    expect(setCookie).toContain('Max-Age=0');
  });

  test('should clear the state cookie when the callback fails', async () => {
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

    const [setCookie] = response.headers.getSetCookie();

    expect(setCookie).toContain('sharkord_oidc_state_');
    expect(setCookie).toContain('Max-Age=0');
  });

  test('should redirect rather than serve json when oidc is disabled', async () => {
    config.oidc.enabled = false;

    const response = await fetch(`${testsBaseUrl}/oidc/callback?code=x`, {
      redirect: 'manual'
    });

    expect(response.status).toBe(302);
    expect(
      new URL(response.headers.get('location')!).searchParams.get('oidc_error')
    ).toBe(OidcError.SERVER_ERROR);
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

describe('the issuer an account belongs to', () => {
  test('should record the issuer the account was created against', async () => {
    await signIn();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(created!.oidcIssuer).toBe(provider.issuer);
  });

  // a sub is only unique inside the issuer that minted it, so repointing the server at a
  // provider whose subs happen to collide must not hand the old accounts over
  test('should refuse a subject that belongs to a different issuer', async () => {
    await signIn();

    await tdb
      .update(users)
      .set({ oidcIssuer: 'https://somewhere.else.example.com/' })
      .where(eq(users.oidcSub, 'oidc-subject-1'));

    const { error } = await runOidcFlow();

    expect(error).toBe(OidcError.ACCESS_DENIED);
  });

  test('should adopt the issuer on a link made before it was recorded', async () => {
    await signIn();

    await tdb
      .update(users)
      .set({ oidcIssuer: null })
      .where(eq(users.oidcSub, 'oidc-subject-1'));

    const { error } = await runOidcFlow();

    const adopted = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(error).toBeNull();
    expect(adopted!.oidcIssuer).toBe(provider.issuer);
  });
});

describe('registrations through the provider', () => {
  test('should refuse to register while new users are disabled', async () => {
    await tdb.update(settings).set({ allowNewUsers: false });

    const { error } = await runOidcFlow();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(error).toBe(OidcError.REGISTRATION_CLOSED);
    expect(created).toBeUndefined();
  });

  // the gate is on registering, an account that already exists still signs in
  test('should still sign in an existing account while new users are disabled', async () => {
    await signIn();

    await tdb.update(settings).set({ allowNewUsers: false });

    const { error } = await runOidcFlow();

    expect(error).toBeNull();
  });

  test('should log the registration', async () => {
    await signIn();

    const logs = await tdb
      .select()
      .from(activityLog)
      .where(eq(activityLog.type, ActivityLogType.USER_CREATED))
      .all();

    const created = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    expect(logs).toHaveLength(1);
    expect(logs[0]!.userId).toBe(created!.id);
  });

  test('should not log a sign in that created nothing', async () => {
    await signIn();
    await signIn();

    const logs = await tdb
      .select()
      .from(activityLog)
      .where(eq(activityLog.type, ActivityLogType.USER_CREATED))
      .all();

    expect(logs).toHaveLength(1);
  });
});

// the login in flight is a row rather than something the process holds, so a restart in
// the middle of one does not strand the user on the provider
describe('a login that outlives the process', () => {
  test('should complete after everything held in memory is gone', async () => {
    const loginResponse = await fetch(`${testsBaseUrl}/oidc/login`, {
      redirect: 'manual'
    });

    const cookie = getStateCookie(loginResponse);
    const authorizeResponse = await fetch(
      loginResponse.headers.get('location')!,
      { redirect: 'manual' }
    );

    oidcManager.resetForTests();

    const callbackResponse = await fetch(
      authorizeResponse.headers.get('location')!,
      { redirect: 'manual', headers: { cookie } }
    );

    const target = new URL(callbackResponse.headers.get('location')!);

    expect(target.searchParams.get('oidc_error')).toBeNull();
    expect(getHandoffCode(target)).not.toBeNull();
  });
});

describe('/oidc/backchannel-logout', () => {
  const logout = async (token: string) =>
    fetch(`${testsBaseUrl}/oidc/backchannel-logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ logout_token: token }).toString()
    });

  const getTokenVersion = async () => {
    const user = await tdb
      .select()
      .from(users)
      .where(eq(users.oidcSub, 'oidc-subject-1'))
      .get();

    return user?.tokenVersion;
  };

  test('should end every session the subject has here', async () => {
    await signIn();

    const response = await logout(await provider.createLogoutToken());

    expect(response.status).toBe(200);
    expect(await getTokenVersion()).toBe(1);
  });

  // answering the same way either side of it keeps the endpoint from reporting who has an
  // account here
  test('should accept a subject with no account here', async () => {
    const response = await logout(
      await provider.createLogoutToken({ sub: 'nobody' })
    );

    expect(response.status).toBe(200);
  });

  test('should refuse a token carrying a nonce', async () => {
    await signIn();

    const response = await logout(
      await provider.createLogoutToken({ nonce: 'replayed-id-token' })
    );

    expect(response.status).toBe(400);
    expect(await getTokenVersion()).toBe(0);
  });

  test('should refuse a token that is not a logout event', async () => {
    await signIn();

    const response = await logout(
      await provider.createLogoutToken({ events: undefined })
    );

    expect(response.status).toBe(400);
    expect(await getTokenVersion()).toBe(0);
  });

  test('should refuse a token that identifies no subject', async () => {
    const response = await logout(
      await provider.createLogoutToken({ sub: undefined })
    );

    expect(response.status).toBe(400);
  });

  test('should refuse a token nobody signed', async () => {
    await signIn();

    const response = await logout('not.a.jwt');

    expect(response.status).toBe(400);
    expect(await getTokenVersion()).toBe(0);
  });

  test('should refuse a subject linked to a different issuer', async () => {
    await signIn();

    await tdb
      .update(users)
      .set({ oidcIssuer: 'https://somewhere.else.example.com/' })
      .where(eq(users.oidcSub, 'oidc-subject-1'));

    const response = await logout(await provider.createLogoutToken());

    expect(response.status).toBe(200);
    expect(await getTokenVersion()).toBe(0);
  });

  test('should 404 when oidc is disabled', async () => {
    config.oidc.enabled = false;

    const response = await logout('anything');

    expect(response.status).toBe(404);
  });
});

describe('/oidc/exchange', () => {
  test('should reject a code that was already used', async () => {
    const { code, cookie } = await runOidcFlow();

    expect((await exchange(code!, cookie)).status).toBe(200);
    expect((await exchange(code!, cookie)).status).toBe(401);
  });

  // the code travels through a redirect, so holding it is not on its own proof of being
  // the browser that asked for the login
  test('should reject a code presented without the state cookie', async () => {
    const { code } = await runOidcFlow();

    expect((await exchange(code!)).status).toBe(401);
  });

  test("should reject a code presented with someone else's state cookie", async () => {
    const { code } = await runOidcFlow();
    const other = await runOidcFlow();

    expect((await exchange(code!, other.cookie)).status).toBe(401);
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

    // still a navigation, so the reason comes back through the interface
    expect(response.status).toBe(302);
    expect(
      new URL(response.headers.get('location')!).searchParams.get('oidc_error')
    ).toBe(OidcError.RATE_LIMITED);
  });

  test('should answer the exchange route with json instead', async () => {
    const { maxRequests } = config.rateLimiters.oidc;

    for (let attempt = 0; attempt < maxRequests; attempt++) {
      await fetch(`${testsBaseUrl}/oidc/login`, { redirect: 'manual' });
    }

    const response = await exchange('anything');

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
