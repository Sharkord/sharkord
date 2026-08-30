import { createHash, randomBytes } from 'crypto';
import http from 'http';
import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';

/**
 * A minimal OpenID Provider, just enough of the spec for the real openid-client to talk to
 * it: discovery, JWKS, the authorization endpoint, the token endpoint and UserInfo.
 *
 * Mocking openid-client instead would leave the parts that actually matter (state, nonce
 * and PKCE) untested, so the tests drive a real authorization code flow against this.
 *
 * Claims are settable per test through `setClaims`, and `idTokenClaims` controls which of
 * them make it into the signed ID token, so the UserInfo fallback path that providers like
 * Authelia force can be exercised.
 */

type TFakeProviderClaims = Record<string, unknown>;

type TPendingAuthorization = {
  nonce?: string;
  codeChallenge?: string;
  redirectUri: string;
};

const CLIENT_ID = 'sharkord-test-client';
const CLIENT_SECRET = 'sharkord-test-secret';

// a 1x1 png, served from /avatar.png so the picture claim has something real to fetch
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const startFakeOidcProvider = async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256', {
    extractable: true
  });

  const publicJwk: JWK = { ...(await exportJWK(publicKey)), kid: 'test-key' };

  const pendingCodes = new Map<string, TPendingAuthorization>();

  let claims: TFakeProviderClaims = {
    sub: 'oidc-subject-1',
    email: 'oidc.user@example.com',
    email_verified: true,
    preferred_username: 'oidcuser',
    name: 'OIDC User'
  };

  // which claims the ID token itself carries. anything left out is only reachable through
  // UserInfo, which is how a spec-following provider behaves
  let idTokenClaims = ['sub', 'email', 'email_verified', 'preferred_username'];

  let issuer = '';

  // what the discovery document advertises. undefined omits the field entirely, which the
  // discovery spec says means client_secret_basic
  let authMethods: string[] | undefined = ['client_secret_post'];

  // how the client actually authenticated on the last token request, so a test can prove
  // the negotiation picked the advertised method rather than assuming it did
  let lastTokenAuth: 'basic' | 'post' | 'none' = 'none';

  const json = (res: http.ServerResponse, body: unknown) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  const buildIdToken = async (nonce?: string) => {
    const payload: TFakeProviderClaims = {};

    for (const key of idTokenClaims) {
      if (key in claims) payload[key] = claims[key];
    }

    if (nonce) payload.nonce = nonce;

    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(issuer)
      .setAudience(CLIENT_ID)
      .setSubject(String(claims.sub))
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', issuer);

    if (url.pathname === '/.well-known/openid-configuration') {
      json(res, {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/jwks`,
        userinfo_endpoint: `${issuer}/userinfo`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        ...(authMethods
          ? { token_endpoint_auth_methods_supported: authMethods }
          : {})
      });

      return;
    }

    if (url.pathname === '/jwks') {
      json(res, { keys: [publicJwk] });

      return;
    }

    if (url.pathname === '/authorize') {
      const redirectUri = url.searchParams.get('redirect_uri') ?? '';
      const code = randomBytes(16).toString('hex');

      pendingCodes.set(code, {
        nonce: url.searchParams.get('nonce') ?? undefined,
        codeChallenge: url.searchParams.get('code_challenge') ?? undefined,
        redirectUri
      });

      const target = new URL(redirectUri);

      target.searchParams.set('code', code);

      const state = url.searchParams.get('state');

      if (state) target.searchParams.set('state', state);

      res.writeHead(302, { Location: target.toString() });
      res.end();

      return;
    }

    if (url.pathname === '/token') {
      const body = await new Response(req as never).text();
      const params = new URLSearchParams(body);
      const authorization = req.headers.authorization;

      if (authorization?.startsWith('Basic ')) {
        const [id, secret] = Buffer.from(authorization.slice(6), 'base64')
          .toString()
          .split(':');

        lastTokenAuth =
          decodeURIComponent(id ?? '') === CLIENT_ID &&
          decodeURIComponent(secret ?? '') === CLIENT_SECRET
            ? 'basic'
            : 'none';
      } else if (params.get('client_secret') === CLIENT_SECRET) {
        lastTokenAuth = 'post';
      } else {
        lastTokenAuth = 'none';
      }

      if (lastTokenAuth === 'none') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_client' }));

        return;
      }
      const pending = pendingCodes.get(params.get('code') ?? '');

      pendingCodes.delete(params.get('code') ?? '');

      if (!pending) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_grant' }));

        return;
      }

      // a real provider compares this against the authorize request, and a mismatch is how
      // a proxy scheme confusion surfaces
      if (params.get('redirect_uri') !== pending.redirectUri) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'invalid_grant',
            error_description:
              "The 'redirect_uri' from this request does not match the one from the authorize request."
          })
        );

        return;
      }

      // a provider that skipped this would hide a broken PKCE implementation on our side
      if (pending.codeChallenge) {
        const verifier = params.get('code_verifier') ?? '';
        const challenge = createHash('sha256')
          .update(verifier)
          .digest('base64url');

        if (challenge !== pending.codeChallenge) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid_grant' }));

          return;
        }
      }

      json(res, {
        access_token: randomBytes(16).toString('hex'),
        token_type: 'Bearer',
        expires_in: 300,
        id_token: await buildIdToken(pending.nonce)
      });

      return;
    }

    if (url.pathname === '/userinfo') {
      json(res, claims);

      return;
    }

    if (url.pathname === '/avatar.png') {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': TINY_PNG.length
      });
      res.end(TINY_PNG);

      return;
    }

    // a picture the server must refuse to store, whatever it claims to be
    if (url.pathname === '/not-an-image') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html>definitely not a png</html>');

      return;
    }

    if (url.pathname === '/redirected-avatar.png') {
      res.writeHead(302, { Location: `${issuer}/avatar.png` });
      res.end();

      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Fake OIDC provider did not bind to a TCP port');
  }

  issuer = `http://localhost:${address.port}`;

  return {
    issuer,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    setClaims: (next: TFakeProviderClaims) => {
      claims = next;
    },
    setIdTokenClaims: (next: string[]) => {
      idTokenClaims = next;
    },
    setAuthMethods: (next: string[] | undefined) => {
      authMethods = next;
    },
    getLastTokenAuth: () => lastTokenAuth,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
};

type TFakeOidcProvider = Awaited<ReturnType<typeof startFakeOidcProvider>>;

export { startFakeOidcProvider };
export type { TFakeOidcProvider, TFakeProviderClaims };
