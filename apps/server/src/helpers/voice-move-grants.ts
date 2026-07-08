const MOVE_GRANT_TTL_MS = 30_000;

type TVoiceMoveGrant = {
  channelId: number;
  expiresAt: number;
};

const voiceMoveGrants = new Map<number, TVoiceMoveGrant>();

const grantVoiceMove = (userId: number, channelId: number): void => {
  voiceMoveGrants.set(userId, {
    channelId,
    expiresAt: Date.now() + MOVE_GRANT_TTL_MS
  });
};

const consumeVoiceMoveGrant = (userId: number, channelId: number): boolean => {
  const grant = voiceMoveGrants.get(userId);

  if (!grant) return false;

  voiceMoveGrants.delete(userId);

  return grant.channelId === channelId && grant.expiresAt > Date.now();
};

const clearVoiceMoveGrantsForTests = (): void => {
  voiceMoveGrants.clear();
};

export { clearVoiceMoveGrantsForTests, consumeVoiceMoveGrant, grantVoiceMove };
