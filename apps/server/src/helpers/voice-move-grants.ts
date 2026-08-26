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

const hasVoiceMoveGrant = (userId: number, channelId: number): boolean => {
  const grant = voiceMoveGrants.get(userId);

  if (!grant) return false;

  if (grant.channelId !== channelId) return false;

  if (grant.expiresAt <= Date.now()) {
    voiceMoveGrants.delete(userId);

    return false;
  }

  return true;
};

const consumeVoiceMoveGrant = (userId: number): void => {
  voiceMoveGrants.delete(userId);
};

const clearVoiceMoveGrantsForTests = (): void => {
  voiceMoveGrants.clear();
};

export {
  clearVoiceMoveGrantsForTests,
  consumeVoiceMoveGrant,
  grantVoiceMove,
  hasVoiceMoveGrant
};
