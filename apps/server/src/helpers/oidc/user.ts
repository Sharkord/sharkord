import {
  ActivityLogType,
  DELETED_USER_IDENTITY_AND_NAME,
  MAX_USER_NAME_LENGTH,
  OidcError,
  type TJoinedUser
} from '@sharkord/shared';
import { randomBytes } from 'crypto';
import { createUser, linkOidcSub } from '../../db/mutations/users';
import { publishUser } from '../../db/publishers';
import { getSettings } from '../../db/queries/server';
import { getUserByIdentity, getUserByOidcSub } from '../../db/queries/users';
import { enqueueActivityLog } from '../../queues/activity-log';
import { importOidcAvatar } from './avatar';
import { OidcCallbackError } from './error';

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

const getIssuer = (claims: TOidcClaims): string => {
  const issuer = getStringClaim(claims, 'iss');

  if (!issuer) throw new Error('OIDC claims are missing iss');

  return issuer;
};

const isEmailVerified = (claims: TOidcClaims): boolean =>
  claims.email_verified === true || claims.email_verified === 'true';

const getIdentity = (claims: TOidcClaims, userInfoFailed: boolean): string => {
  const email = getStringClaim(claims, 'email');

  if (email && isEmailVerified(claims)) return email.toLowerCase();

  if (userInfoFailed) {
    throw new Error(
      'No verified email claim and the userinfo endpoint could not be reached, refusing to guess an identity'
    );
  }

  return getSubject(claims);
};

const toValidDisplayName = (value: string | undefined): string | undefined => {
  const name = value?.trim();

  if (!name || name.length > MAX_USER_NAME_LENGTH) return undefined;
  if (name === DELETED_USER_IDENTITY_AND_NAME) return undefined;

  return name;
};

const getDisplayName = (claims: TOidcClaims): string | undefined =>
  toValidDisplayName(getStringClaim(claims, 'preferred_username')) ??
  toValidDisplayName(getStringClaim(claims, 'name'));

const createUnusablePasswordHash = () =>
  Bun.password.hash(randomBytes(32).toString('hex'));

const assertSameIssuer = async (
  user: TJoinedUser,
  sub: string,
  issuer: string
) => {
  if (user.oidcIssuer === issuer) return;

  if (user.oidcIssuer) {
    throw new OidcCallbackError(
      OidcError.ACCESS_DENIED,
      `Subject of "${user.identity}" belongs to issuer "${user.oidcIssuer}", not "${issuer}"`
    );
  }

  await linkOidcSub(user.id, sub, issuer);
};

const resolveOidcUser = async (
  claims: TOidcClaims,
  { userInfoFailed, ip }: { userInfoFailed: boolean; ip?: string }
): Promise<{ user: TJoinedUser; created: boolean }> => {
  const sub = getSubject(claims);
  const issuer = getIssuer(claims);
  const existingBySub = await getUserByOidcSub(sub);

  if (existingBySub) {
    await assertSameIssuer(existingBySub, sub, issuer);

    return { user: existingBySub, created: false };
  }

  const identity = getIdentity(claims, userInfoFailed);

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

    await linkOidcSub(existingByIdentity.id, sub, issuer);

    const linked = await getUserByOidcSub(sub);

    if (!linked) throw new Error('Failed to link OIDC subject');

    publishUser(linked.id, 'update');

    return { user: linked, created: false };
  }

  const settings = await getSettings();

  if (!settings.allowNewUsers) {
    throw new OidcCallbackError(
      OidcError.REGISTRATION_CLOSED,
      `Refusing to register "${identity}" through OIDC: new user registrations are disabled`
    );
  }

  const userId = await createUser({
    identity,
    hashedPassword: (await createUnusablePasswordHash()).toString(),
    name: getDisplayName(claims),
    oidcSub: sub,
    oidcIssuer: issuer
  });

  const created = await getUserByOidcSub(sub);

  if (!created) throw new Error('Failed to create the OIDC user');

  publishUser(userId, 'create');

  enqueueActivityLog({
    type: ActivityLogType.USER_CREATED,
    userId,
    details: { inviteCode: undefined, username: created.name },
    ip
  });

  const picture = getStringClaim(claims, 'picture');

  if (picture) await importOidcAvatar(userId, picture);

  return { user: (await getUserByOidcSub(sub)) ?? created, created: true };
};

export { resolveOidcUser };
export type { TOidcClaims };
