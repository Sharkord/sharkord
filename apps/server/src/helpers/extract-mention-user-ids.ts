const MENTION_USER_ID_REGEX = /data-user-id="(\d+)"/g;

/**
 * Extracts user IDs from message HTML that contains mention spans
 * (e.g. <span data-type="mention" data-user-id="123">@Name</span>).
 */
const extractMentionUserIds = (html: string): number[] => {
  const ids: number[] = [];

  for (const match of html.matchAll(MENTION_USER_ID_REGEX)) {
    const raw = match[1];
    if (raw === undefined) continue;
    const id = parseInt(raw, 10);
    if (!Number.isNaN(id) && !ids.includes(id)) {
      ids.push(id);
    }
  }

  return ids;
};

export { extractMentionUserIds };
