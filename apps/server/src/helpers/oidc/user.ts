import {
  DELETED_USER_IDENTITY_AND_NAME,
  type TJoinedUser
} from '@sharkord/shared';
import { randomBytes } from 'crypto';
import { createUser, linkOidcSub } from '../../db/mutations/users';
import { publishUser } from '../../db/publishers';
import { getUserByIdentity, getUserByOidcSub } from '../../db/queries/users';
import { importOidcAvatar } from './avatar';

type TOidcClaims = Record<string, unknown>;

const getStringClaim = (
  claims: TOidcClaims,
  name: string
): string | undefined => {
  const value = claims[name];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const getSubject = (claims: TOidcClaims): string => {
  const sub = getStringClaim(claims, 'sub');

  if (!sub) throw new Error('OIDC claims are missing sub');

  return sub;
};

const getIdentity = (claims: TOidcClaims): string =>
  (getStringClaim(claims, 'email') ?? getSubject(claims)).toLowerCase();

// the spec says boolean, but some providers and most saml bridges send the string
const isEmailVerified = (claims: TOidcClaims): boolean =>
  claims.email_verified === true || claims.email_verified === 'true';

const getDisplayName = (claims: TOidcClaims): string =>
  getStringClaim(claims, 'preferred_username') ??
  getStringClaim(claims, 'name') ??
  getSubject(claims);

const createUnusablePasswordHash = () =>
  Bun.password.hash(randomBytes(32).toString('hex'));

const resolveOidcUser = async (
  claims: TOidcClaims
): Promise<{ user: TJoinedUser; created: boolean }> => {
  const sub = getSubject(claims);
  const existingBySub = await getUserByOidcSub(sub);

  if (existingBySub) return { user: existingBySub, created: false };

  const identity = getIdentity(claims);

  if (identity === DELETED_USER_IDENTITY_AND_NAME) {
    throw new Error(`Refusing the reserved identity "${identity}"`);
  }

  const existingByIdentity = await getUserByIdentity(identity);

  if (existingByIdentity) {
    if (!isEmailVerified(claims)) {
      throw new Error(
        `Refusing to link OIDC subject to existing identity "${identity}": email_verified is not true`
      );
    }

    if (existingByIdentity.oidcSub) {
      throw new Error(
        `Identity "${identity}" is already linked to a different OIDC subject`
      );
    }

    await linkOidcSub(existingByIdentity.id, sub);

    const linked = await getUserByOidcSub(sub);

    if (!linked) throw new Error('Failed to link OIDC subject');

    publishUser(linked.id, 'update');

    return { user: linked, created: false };
  }

  const userId = await createUser({
    identity,
    hashedPassword: (await createUnusablePasswordHash()).toString(),
    name: getDisplayName(claims),
    oidcSub: sub
  });

  const created = await getUserByOidcSub(sub);

  if (!created) throw new Error('Failed to create the OIDC user');

  publishUser(userId, 'create');

  const picture = getStringClaim(claims, 'picture');

  if (picture) await importOidcAvatar(userId, picture);

  return { user: (await getUserByOidcSub(sub)) ?? created, created: true };
};

export { getDisplayName, getIdentity, getSubject, resolveOidcUser };
export type { TOidcClaims };
