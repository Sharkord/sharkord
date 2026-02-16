import * as client from 'openid-client';
import { config } from '../config';
import http from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { userRoles, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sha256 } from '@sharkord/shared';
import { getDefaultRole, getRoles } from '../db/queries/roles';
import { getServerToken } from '../db/queries/server';
import { publishUser } from '../db/publishers';
import { getUserByIdentity } from '../db/queries/users';
import { randomUUID } from 'crypto';

// Allow self-signed certs (Delete in production if using real SSL)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Setup OIDC Discovery
 */
const getOidcConfig = async () => {
  let issuerUrl = config.oidc.issuer;
  
  // Clean up URL
  const suffix = '/.well-known/openid-configuration';
  if (issuerUrl.endsWith(suffix)) {
    issuerUrl = issuerUrl.substring(0, issuerUrl.length - suffix.length);
  }
  
  // Authentik Requirement: Issuer URL must end with a slash
  if (!issuerUrl.endsWith('/')) {
    issuerUrl += '/';
  }

  const issuer = new URL(issuerUrl);

  return client.discovery(
    issuer,
    config.oidc.clientId,
    config.oidc.clientSecret,
    undefined, 
    {
      [client.customFetch]: async (url: string, options: any) => {
        return fetch(url, {
          ...options,
          tls: { rejectUnauthorized: false }
        });
      }
    }
  );
};

const getCurrentUrl = (req: http.IncomingMessage) => {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const url = new URL(req.url ?? '', `${protocol}://${host}`);
  
  if (config.oidc.redirectUrl.startsWith('https:')) {
    url.protocol = 'https:';
  }
  return url;
};

// --- HANDLERS ---

const oidcLogin = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  try {
    const as = await getOidcConfig();
    const redirectTo = client.buildAuthorizationUrl(as, {
      redirect_uri: config.oidc.redirectUrl,
      scope: 'openid profile email groups roles',
    });

    res.writeHead(302, { Location: redirectTo.href });
    res.end();
  } catch (error) {
    console.error('OIDC Login Error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
};

const oidcCallback = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  try {
    const as = await getOidcConfig();
    const currentUrl = getCurrentUrl(req);

    // 1. Standard Token Exchange
    const response = await client.authorizationCodeGrant(
        as,
        currentUrl,
        {
            idTokenExpected: true,
            expectedState: client.skipStateCheck
        },
        {
            redirect_uri: config.oidc.redirectUrl
        },
        {
          [client.allowInsecureRequests as unknown as string]: true
        }
    );

    // 2. Extract Claims
    // We use 'any' here to allow merging UserInfo later without TS complaining 
    // that the types don't match the strict 'IDToken' interface.
    let claims: any = response.claims();

    // 3. Robust Fallback
    // If ID Token is thin, fetch full profile from UserInfo endpoint
    if (!claims || (!claims.email && !claims.sub)) {
        // We pass '' as fallback for sub to satisfy TS string requirement
        const userInfo = await client.fetchUserInfo(as, response.access_token, claims?.sub || '');
        claims = { ...claims, ...userInfo };
    }

    if (!claims || (!claims.sub && !claims.email)) {
        throw new Error('No identity claims found in ID Token or UserInfo');
    }

    // --- USER SYNC & LOGIC ---

    // Check Required Group
    if (config.oidc.requiredGroup) {
        const userGroups = (claims.groups as string[]) ?? (claims.roles as string[]) ?? [];
        const hasRequiredGroup = userGroups.some(g => g.toLowerCase() === config.oidc.requiredGroup!.toLowerCase());
        
        if (!hasRequiredGroup) {
            res.writeHead(403);
            res.end(`Access Denied: Missing required group '${config.oidc.requiredGroup}'`);
            return;
        }
    }

    const identity = claims.email ?? claims.preferred_username ?? claims.sub;
    
    // Explicitly cast to string to satisfy TS
    let user = await getUserByIdentity(identity as string);

    // Create User
    if (!user) {
        const randomPassword = randomUUID();
        const hashedPassword = await sha256(randomPassword);
        const defaultRole = await getDefaultRole();

        if (!defaultRole) throw new Error('Default role not found');

        const newUser = await db
          .insert(users)
          .values({
            name: (claims.name as string) ?? 'OIDC User',
            identity: identity as string,
            createdAt: Date.now(),
            password: hashedPassword,
          })
          .returning()
          .get();
        
        await db.insert(userRoles).values({
            roleId: defaultRole.id,
            userId: newUser.id,
            createdAt: Date.now(),
        });

        publishUser(newUser.id, 'create');
        
        // RE-FETCH FULL USER OBJECT
        // We must do this because 'newUser' is a raw table row, but 'user' needs 
        // to be the Joined User type (with roles, etc.) for the code below.
        user = await getUserByIdentity(identity as string);
    }

    if (!user) {
        throw new Error('User could not be found or created');
    }

    // Role Mapping
    const rolesMapping = JSON.parse(config.oidc.rolesMapping || '{}');
    if (Object.keys(rolesMapping).length > 0) {
        const oidcRoles = ((claims.groups as string[]) ?? (claims.roles as string[]) ?? []).map((role: string) => role.toLowerCase());
        const allDbRoles = await getRoles();
        const userRoleIds = new Set<number>();

        for (const oidcRoleName of oidcRoles) {
            const sharkordRoleName = rolesMapping[oidcRoleName];
            if (sharkordRoleName) {
                const dbRole = allDbRoles.find(r => r.name.toLowerCase() === sharkordRoleName.toLowerCase());
                if (dbRole) userRoleIds.add(dbRole.id);
            }
        }

        if (userRoleIds.size > 0) {
            await db.delete(userRoles).where(eq(userRoles.userId, user.id));
            await db.insert(userRoles).values(Array.from(userRoleIds).map(roleId => ({
                userId: user.id,
                roleId,
                createdAt: Date.now()
            })));
        }
    }

    // Issue App Token & Redirect
    const token = jwt.sign({ userId: user.id }, await getServerToken(), {
      expiresIn: '86400s' // 1 day
    });

    const clientUrl = req.headers.referer || req.headers.origin || `http://${req.headers.host}`;
    const redirectUrl = new URL(clientUrl);
    redirectUrl.searchParams.set('token', token);

    res.writeHead(302, { Location: redirectUrl.toString() });
    res.end();

  } catch (error) {
    console.error('OIDC Callback Error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
};

export { oidcLogin, oidcCallback };