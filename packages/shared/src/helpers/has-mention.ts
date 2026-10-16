import { MessageNodeType } from '../statics';

const SPAN_TAG_PATTERN = /<span\b[^>]*>/g;
const DATA_TYPE_PATTERN = /\bdata-type="([^"]*)"/;
const USER_ID_PATTERN = /\bdata-user-id="(\d+)"/;
const ROLE_ID_PATTERN = /\bdata-role-id="(\d+)"/;

type TMentions = {
  userIds: number[];
  roleIds: number[];
};

const getMentions = (content: string | null | undefined): TMentions => {
  const userIds = new Set<number>();
  const roleIds = new Set<number>();

  for (const [tag] of (content ?? '').matchAll(SPAN_TAG_PATTERN)) {
    const typeMatch = tag.match(DATA_TYPE_PATTERN);

    if (!typeMatch) continue;

    const [, type] = typeMatch;

    if (type === MessageNodeType.MENTION) {
      const userIdMatch = tag.match(USER_ID_PATTERN);

      if (userIdMatch) userIds.add(Number(userIdMatch[1]));
    } else if (type === MessageNodeType.ROLE_MENTION) {
      const roleIdMatch = tag.match(ROLE_ID_PATTERN);

      if (roleIdMatch) roleIds.add(Number(roleIdMatch[1]));
    }
  }

  return { userIds: [...userIds], roleIds: [...roleIds] };
};

const hasMention = (
  content: string | null | undefined,
  userId: number | undefined,
  roleIds: number[] = []
): boolean => {
  if (!content || !userId) return false;

  const mentions = getMentions(content);

  return (
    mentions.userIds.includes(userId) ||
    roleIds.some((roleId) => mentions.roleIds.includes(roleId))
  );
};

export { getMentions, hasMention };
