let pendingScrollTarget: number | null = null;

export const setPendingScrollTarget = (messageId: number) => {
  pendingScrollTarget = messageId;
};

export const consumePendingScrollTarget = (): number | null => {
  const target = pendingScrollTarget;
  pendingScrollTarget = null;
  return target;
};
