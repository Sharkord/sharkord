const MOVE_GRANT_TTL_MS = 30_000;

type TVoiceMoveGrant = {
  channelId: number;
  expiresAt: number;
};

const voiceMoveGrants = new Map<number, TVoiceMoveGrant>();

const grantVoiceMove = (userId: number, channelId: number): void => {
  const now = Date.now();

  for (const [grantedUserId, grant] of voiceMoveGrants) {
    if (grant.expiresAt <= now) voiceMoveGrants.delete(grantedUserId);
  }

  voiceMoveGrants.set(userId, {
    channelId,
    expiresAt: now + MOVE_GRANT_TTL_MS
  });
};

const consumeVoiceMoveGrant = (userId: number, channelId: number): boolean => {
  const grant = voiceMoveGrants.get(userId);

  if (!grant) return false;

  if (grant.channelId !== channelId) return false;

  voiceMoveGrants.delete(userId);

  return grant.expiresAt > Date.now();
};

const clearVoiceMoveGrantsForTests = (): void => {
  voiceMoveGrants.clear();
};

export { clearVoiceMoveGrantsForTests, consumeVoiceMoveGrant, grantVoiceMove };
