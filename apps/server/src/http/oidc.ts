import * as client from 'openid-client';
import { config } from '../config';
import http from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { userRoles, users } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getDefaultRole, getRoles } from '../db/queries/roles';
import { getServerToken } from '../db/queries/server';
import { publishUser } from '../db/publishers';
import { getUserByIdentity, getUserByOidcSub } from '../db/queries/users';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import fs from 'fs/promises';

const getBaseUrl = (req: http.IncomingMessage) => {
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = req.headers.host;
  return `${protocol}://${host}`;
};

const safeCompare = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

// Cache the OIDC discovery document for 5 minutes to avoid hitting the
// IdP well-known endpoint on every login and every callback.
let discoveryCache: { value: Awaited<ReturnType<typeof client.discovery>>; issuer: string; expiresAt: number } | null = null;
const DISCOVERY_CACHE_TTL_MS = 5 * 60 * 1000;

export const getOidcConfig = async () => {
  const issuerUrl = new URL(config.oidc.issuer);

  const isLocal = issuerUrl.hostname === 'localhost' || issuerUrl.hostname === '127.0.0.1';
  if (!isLocal && issuerUrl.protocol !== 'https:') {
    throw new Error(`Security Error: OIDC Issuer must use HTTPS for non-local host: ${issuerUrl.hostname}`);
  }

  if (discoveryCache && discoveryCache.issuer === config.oidc.issuer && Date.now() < discoveryCache.expiresAt) {
    return discoveryCache.value;
  }

  const discoveryOptions: any = {};

  if (config.oidc.caCertPath) {
    try {
      const ca = await fs.readFile(config.oidc.caCertPath);

      discoveryOptions[client.customFetch] = (url: string, options: any) => {
        return fetch(url, {
          ...options,
          ca: ca,
        });
      };
    } catch (err) {
      console.error(`OIDC Config Error: Failed to read CA file at ${config.oidc.caCertPath}.`);
    }
  }

  const result = await client.discovery(
    issuerUrl,
    config.oidc.clientId,
    config.oidc.clientSecret,
    undefined,
    discoveryOptions
  );

  discoveryCache = { value: result, issuer: config.oidc.issuer, expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS };
  return result;
};

export const oidcLogin = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (config.oidc.oidcEnabled === false) {
    return res.writeHead(404);
  }
  
  try {
    const as = await getOidcConfig();

    const referer = req.headers.referer;
    if (!referer) {
      return res.writeHead(400, 'Referer header is missing').end();
    }

    const refererOrigin = new URL(referer).origin;
    if (!config.oidc.allowedOrigins.includes(refererOrigin)) {
      return res.writeHead(400, 'Invalid origin').end();
    }
    
    const code_verifier = client.randomPKCECodeVerifier();
    const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
    const state = client.randomState();
    const nonce = client.randomNonce();

    const sessionData = JSON.stringify({ code_verifier, state, nonce, redirectOrigin: refererOrigin });
    
    // Set OIDC session cookie
    res.setHeader('Set-Cookie', `__Host-oidc_session=${encodeURIComponent(sessionData)}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`);

    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/auth/callback`;

    const parameters: Record<string, string> = {
      redirect_uri: redirectUri,
      scope: ['openid', 'profile', 'email', config.oidc.groupsClaim, ...config.oidc.additionalScopes].filter(Boolean).join(' '),
      code_challenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    };

    const redirectTo = client.buildAuthorizationUrl(as, parameters);
    res.writeHead(302, { Location: redirectTo.href }).end();
  } catch (error) {
    console.error('OIDC Login Error:', error);
    res.writeHead(500).end('Internal Server Error');
  }
};

export const oidcCallback = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (config.oidc.oidcEnabled === false) {
    return res.writeHead(404);
  }

  try {
    const as = await getOidcConfig();
    
    const rawCookies = req.headers.cookie || '';
    const cookieMap = Object.fromEntries(
      rawCookies.split('; ').map(v => {
        const idx = v.indexOf('=');
        return [v.slice(0, idx), v.slice(idx + 1)];
      })
    );
    const sessionCookie = cookieMap['__Host-oidc_session'];

    if (!sessionCookie) throw new Error('Missing OIDC session cookie');
    
    let sessionData;
    try {
        sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    } catch(e) {
        throw new Error('Invalid session cookie format');
    }
    const { code_verifier, state: expectedState, nonce: expectedNonce, redirectOrigin } = sessionData;

    if (!redirectOrigin || !config.oidc.allowedOrigins.includes(redirectOrigin)) {
      throw new Error('Invalid redirect origin in session');
    }
    
    const baseUrl = getBaseUrl(req);
    const safeUrl = (req.url || '').startsWith('/') ? req.url : '/';
    const url = new URL(safeUrl || '', baseUrl);

    const params = Object.fromEntries(url.searchParams);
    
    if (!params.state || !safeCompare(params.state, expectedState)) {
      throw new Error('CSRF token mismatch');
    }
    
    const tokenResponse = await client.authorizationCodeGrant(as, url, {
      pkceCodeVerifier: code_verifier,
      expectedState,
      expectedNonce,
    });

    const idTokenClaims = tokenResponse.claims();
    if (!idTokenClaims?.sub) {
      throw new Error('Invalid claims: missing sub');
    }

    let mergedClaims: Record<string, unknown> = { ...idTokenClaims };
    const needsUserInfo = !idTokenClaims.email ||
      !idTokenClaims[config.oidc.groupsClaim] ||
      !idTokenClaims[config.oidc.usernameClaim] ||
      (!!config.oidc.displayNameClaim && !idTokenClaims[config.oidc.displayNameClaim]);

    if (needsUserInfo) {
      try {
        const userInfo = await client.fetchUserInfo(as, tokenResponse.access_token, idTokenClaims.sub);
        // ID token claims take precedence over UserInfo (ID token is signed)
        mergedClaims = { ...userInfo, ...idTokenClaims };
      } catch (err) {
        console.warn('OIDC: Could not fetch UserInfo endpoint:', err);
      }
    }

    if (config.oidc.requiredGroups.length > 0) {
      const userGroups = ((mergedClaims[config.oidc.groupsClaim] as string[]) || []).map(g => g.toLowerCase());
      const hasRequired = config.oidc.requiredGroups.some(r => userGroups.includes(r.toLowerCase()));
      if (!hasRequired) {
        return res.writeHead(403).end('Forbidden');
      }
    }

    const identity = ((mergedClaims.email as string) || idTokenClaims.sub) as string;
    const user = await syncUserWithDatabase(identity, mergedClaims);

    const appToken = jwt.sign({ userId: user.id }, await getServerToken(), { expiresIn: '1d' });
    
    const target = new URL(redirectOrigin);
    
    // Set success flag so frontend knows to initiate connection
    target.searchParams.set('oidc_status', 'success');

    // Set App Token as HttpOnly Cookie AND Clear OIDC Session in one header
    const authCookie = `sharkord_token=${appToken}; Path=/; SameSite=Lax; Secure; Max-Age=86400`;
    const clearSession = '__Host-oidc_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax';

    res.setHeader('Set-Cookie', [authCookie, clearSession]);
    res.writeHead(302, { Location: target.toString() }).end();

  } catch (error) {
    console.error('OIDC Callback Error:', error);
    res.writeHead(401).end('Authentication Failed');
  }
};

function resolveDisplayName(claims: Record<string, unknown>): string {
  if (config.oidc.displayNameClaim) {
    const val = claims[config.oidc.displayNameClaim] as string | undefined;
    if (val) return val;
  }
  return (claims[config.oidc.usernameClaim] as string) ?? (claims.sub as string);
}

async function syncUserWithDatabase(identity: string, claims: Record<string, unknown>) {
  const sub = claims.sub as string;

  // Look up by stable IdP subject first, fall back to identity for users
  // created before oidcSub was introduced.
  let user = await getUserByOidcSub(sub) ?? await getUserByIdentity(identity);

  if (!user) {
    const defaultRole = await getDefaultRole();
    if (!defaultRole) throw new Error('Default role missing');

    const randomPassword = createHash('sha256').update(randomBytes(32).toString('hex')).digest('hex');

    const [insertedUser] = await db.insert(users).values({
      identity,
      password: randomPassword,
      name: resolveDisplayName(claims),
      oidcSub: sub,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      banned: false,
    }).returning();

    if (!insertedUser) {
      throw new Error('Failed to create user: Database insert returned no data.');
    }

    await db.insert(userRoles).values({
      roleId: defaultRole.id,
      userId: insertedUser.id,
      createdAt: Date.now(),
    });

    publishUser(insertedUser.id, 'create');

    user = await getUserByOidcSub(sub);
  } else {
    // Sync mutable fields that may have changed on the IdP.
    const updates: Partial<typeof users.$inferInsert> = {};

    // Always update lastLoginAt.
    updates.lastLoginAt = Date.now();

    // Always backfill oidcSub for users created before this feature.
    if (!user.oidcSub) updates.oidcSub = sub;

    // Sync identity (e.g. email) if it changed on the IdP.
    if (user.identity !== identity) updates.identity = identity;

    // Sync display name: always when enforceOidcDisplayName, otherwise only
    // on first login (oidcSub was null, covered by the backfill path above).
    if (config.oidc.enforceOidcDisplayName) {
      const idpName = resolveDisplayName(claims);
      if (user.name !== idpName) updates.name = idpName;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(users).set({ ...updates, updatedAt: Date.now() }).where(eq(users.id, user.id));
      publishUser(user.id, 'update');
      user = await getUserByOidcSub(sub);
    }
  }

  if (!user) throw new Error('User synchronization failed');

  await applyRoleMappings(user.id, claims);
  return user;
}

async function applyRoleMappings(userId: number, claims: any) {
  const rolesMapping = config.oidc.rolesMapping;
  if (Object.keys(rolesMapping).length === 0) return;

  const oidcGroups = ((claims[config.oidc.groupsClaim] as string[]) || []).map((g: string) => g.toLowerCase());
  const allDbRoles = await getRoles();
  const targetRoleIds: number[] = [];

  for (const [oidcRole, localRole] of Object.entries(rolesMapping)) {
    if (oidcGroups.includes(oidcRole.toLowerCase())) {
      const dbRole = allDbRoles.find(
        (r: { id: number; name: string; }) => r.name.toLowerCase() === localRole.toLowerCase()
      );
      if (dbRole) targetRoleIds.push(dbRole.id);
    }
  }
  const uniqueTargetRoleIds = [...new Set(targetRoleIds)];
  const userCurrentRoles = await db.query.userRoles.findMany({ where: eq(userRoles.userId, userId) });

  if (config.oidc.enforceOidcRoles) {
    const mappedRoleNames = Object.values(rolesMapping).map(name => name.toLowerCase());
    const mappedDbRoles = allDbRoles.filter(
      (r: { id: number; name: string; }) => mappedRoleNames.includes(r.name.toLowerCase())
    );
    const mappedDbRoleIds = mappedDbRoles.map(r => r.id);
    const userCurrentRoleIds = userCurrentRoles.map(r => r.roleId);

    const rolesToRemove = userCurrentRoleIds.filter(id => mappedDbRoleIds.includes(id) && !uniqueTargetRoleIds.includes(id));
    if (rolesToRemove.length > 0) {
      await db.delete(userRoles).where(and(
        eq(userRoles.userId, userId),
        inArray(userRoles.roleId, rolesToRemove)
      ));
    }
  } else {
    const oidcManagedRoleIds = userCurrentRoles
      .filter((r) => r.addedBy === 'oidc')
      .map((r) => r.roleId);

    const rolesToRemove = oidcManagedRoleIds.filter((id) => !uniqueTargetRoleIds.includes(id));
    if (rolesToRemove.length > 0) {
      await db.delete(userRoles).where(and(
        eq(userRoles.userId, userId),
        inArray(userRoles.roleId, rolesToRemove),
        eq(userRoles.addedBy, 'oidc')
      ));
    }
  }

  const rolesToAdd = uniqueTargetRoleIds.filter((id) => !userCurrentRoles.some((r) => r.roleId === id));
  if (rolesToAdd.length > 0) {
    await db.insert(userRoles).values(
      rolesToAdd.map(roleId => ({
        userId,
        roleId,
        createdAt: Date.now(),
        addedBy: 'oidc' as const
      }))
    );
  }
}