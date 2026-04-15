import { getPlainTextFromHtml, type TJoinedMessage } from '@sharkord/shared';

const SNIPPET_MAX_LENGTH = 32;

const getReplyTargetSnippet = (
  replyTarget: TJoinedMessage['replyTo'],
  t: (key: string) => string
) => {
  if (!replyTarget) {
    return t('originalMessageUnavailable');
  }

  const plainText = getPlainTextFromHtml(replyTarget.content ?? '').trim();

  if (!plainText) {
    return t('replyAttachmentFallback');
  }

  return plainText.length > SNIPPET_MAX_LENGTH
    ? `${plainText.slice(0, SNIPPET_MAX_LENGTH)}…`
    : plainText;
};

export { getReplyTargetSnippet };
