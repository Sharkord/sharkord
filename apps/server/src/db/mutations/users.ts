import { and, eq, isNull, lt, max, or, sql } from 'drizzle-orm';
import { db } from '..';
import { HttpValidationError } from '../../http/errors';
import { eventBus } from '../../plugins/event-bus';
import { invariant } from '../../utils/invariant';
import { getDefaultRole } from '../queries/roles';
import {
  channelReadStates,
  channels,
  invites,
  messages,
  userRoles,
  users
} from '../schema';

type TCreateUserOptions = {
  identity: string;
  hashedPassword: string;
  name?: string;
  oidcSub?: string;
  oidcIssuer?: string;
  inviteCode?: string;
  inviteRoleId?: number | null;
};

const createUser = async ({
  identity,
  hashedPassword,
  name,
  oidcSub,
  oidcIssuer,
  inviteCode,
  inviteRoleId
}: TCreateUserOptions): Promise<number> => {
  const defaultRole = await getDefaultRole();

  invariant(defaultRole, {
    code: 'NOT_FOUND',
    message: 'Default role not found'
  });

  const randomNum = Math.floor(Math.random() * 99999) + 10000; // between 10000 and 99999 to ensure it's always 5 digits, for better readability
  const username = name || `SharkordUser${randomNum}`;

  const userId = db.transaction((tx) => {
    if (inviteCode) {
      const consumed = tx
        .update(invites)
        .set({ uses: sql`${invites.uses} + 1` })
        .where(
          and(
            eq(invites.code, inviteCode),
            or(isNull(invites.maxUses), lt(invites.uses, invites.maxUses))
          )
        )
        .returning({ id: invites.id })
        .all();

      if (consumed.length === 0) {
        throw new HttpValidationError(
          'identity',
          'This invite code has reached its maximum uses'
        );
      }
    }

    const user = tx
      .insert(users)
      .values({
        name: username,
        identity,
        oidcSub,
        oidcIssuer,
        // an account born at the provider gets an unusable random hash, so there is no
        // current password its owner could supply to change it
        passwordSet: !oidcSub,
        createdAt: Date.now(),
        password: hashedPassword
      })
      .returning()
      .get();

    tx.insert(userRoles)
      .values({
        roleId: defaultRole.id,
        userId: user.id,
        createdAt: Date.now()
      })
      .run();

    // if the invite has a specific role and it's different from the default, assign it too
    if (inviteRoleId && inviteRoleId !== defaultRole.id) {
      tx.insert(userRoles)
        .values({
          roleId: inviteRoleId,
          userId: user.id,
          createdAt: Date.now()
        })
        .run();
    }

    // mark all existing messages as read so the new user doesn't see
    // a flood of unread messages on first join.
    //
    // driven off channels rather than grouping over messages: there are tens of channels
    // and potentially millions of messages, so this is one index seek per channel instead
    // of a full scan plus a temp b-tree. measured on 500k messages across 40 channels,
    // the group-by shape cost ~100ms and this costs ~0.02ms, and it runs inline on an
    // unauthenticated request
    const latestTopLevelMessageId = tx
      .select({ value: max(messages.id) })
      .from(messages)
      .where(
        and(
          eq(messages.channelId, channels.id),
          isNull(messages.parentMessageId)
        )
      );

    const latestMessagePerChannel = tx
      .select({
        channelId: channels.id,
        latestMessageId: sql<
          number | null
        >`(${latestTopLevelMessageId})`.mapWith(Number)
      })
      .from(channels)
      .all();

    const readStateValues = latestMessagePerChannel
      .filter((row) => !!row.latestMessageId)
      .map((row) => ({
        channelId: row.channelId,
        userId: user.id,
        lastReadMessageId: row.latestMessageId!,
        lastReadAt: Date.now()
      }));

    if (readStateValues.length > 0) {
      tx.insert(channelReadStates).values(readStateValues).run();
    }

    return user.id;
  });

  eventBus.emit('user:created', { userId, username });

  return userId;
};

const invalidateUserSessions = async (userId: number) => {
  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, userId))
    .run();
};

const linkOidcSub = async (
  userId: number,
  oidcSub: string,
  oidcIssuer: string
) => {
  await db
    .update(users)
    .set({ oidcSub, oidcIssuer, updatedAt: Date.now() })
    .where(eq(users.id, userId));
};

export { createUser, invalidateUserSessions, linkOidcSub };
