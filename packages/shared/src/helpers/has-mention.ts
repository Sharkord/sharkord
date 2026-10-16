import { MessageNodeType } from '../statics';

// both attribute orders are matched, sanitize-html keeps whatever order the editor wrote
const buildMentionPattern = (
  type: MessageNodeType,
  attribute: string,
  id: number
) =>
  new RegExp(
    `<span[^>]*(?:\\bdata-type="${type}"[^>]*\\b${attribute}="${id}"|\\b${attribute}="${id}"[^>]*\\bdata-type="${type}")[^>]*>`
  );

const hasMention = (
  content: string | null | undefined,
  userId: number | undefined,
  roleIds: number[] = []
): boolean => {
  if (!content || !userId) return false;

  if (
    buildMentionPattern(MessageNodeType.MENTION, 'data-user-id', userId).test(
      content
    )
  ) {
    return true;
  }

  return roleIds.some((roleId) =>
    buildMentionPattern(
      MessageNodeType.ROLE_MENTION,
      'data-role-id',
      roleId
    ).test(content)
  );
};

export { hasMention };
