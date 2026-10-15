import {
  ActivityLogType,
  getRandomString,
  INVITE_CODE_REGEX,
  type TInvite
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { invites, roles } from '../db/schema';
import { eventBus } from '../plugins/event-bus';
import { enqueueActivityLog } from '../queues/activity-log';
import { invariant } from '../utils/invariant';

const zCreateInvite = z.object({
  maxUses: z.number().int().min(0).max(100).optional().default(0),
  expiresAt: z.number().int().optional().nullable().default(null),
  code: z
    .string()
    .min(4)
    .max(64)
    .regex(INVITE_CODE_REGEX, 'Invalid invite code')
    .optional(),
  roleId: z.number().optional()
});

type TCreateInvite = z.input<typeof zCreateInvite>;

const createInvite = async (
  input: TCreateInvite,
  creatorId: number, // is who the invite is attributed to
  actorUserId: number | null // is who created the invite, used by plugins on behalf of a user
): Promise<TInvite> => {
  const values = zCreateInvite.parse(input);

  invariant(!values.expiresAt || values.expiresAt > Date.now(), {
    code: 'BAD_REQUEST',
    message: 'The expiration date must be in the future.'
  });

  if (values.roleId) {
    const role = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, values.roleId))
      .limit(1)
      .get();

    invariant(role, {
      code: 'NOT_FOUND',
      message: 'Role not found'
    });
  }

  const invite = await db
    .insert(invites)
    .values({
      code: values.code || getRandomString(24),
      creatorId,
      roleId: values.roleId || null,
      maxUses: values.maxUses || null,
      uses: 0,
      expiresAt: values.expiresAt || null,
      createdAt: Date.now()
    })
    .onConflictDoNothing()
    .returning()
    .get();

  invariant(invite, {
    code: 'CONFLICT',
    message: 'An invite with this code already exists'
  });

  eventBus.emit('invite:created', {
    inviteId: invite.id,
    code: invite.code,
    creatorId,
    roleId: invite.roleId
  });

  enqueueActivityLog({
    type: ActivityLogType.CREATED_INVITE,
    userId: actorUserId,
    details: {
      code: invite.code,
      maxUses: invite.maxUses || 0,
      expiresAt: invite.expiresAt
    }
  });

  return invite;
};

export { createInvite, zCreateInvite };
export type { TCreateInvite };
