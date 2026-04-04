import { PluginAvatar } from '@/components/plugin-avatar';
import { UserAvatar } from '@/components/user-avatar';
import { setMessageJumpTarget } from '@/features/app/actions';
import { useChannelById } from '@/features/server/channels/hooks';
import { usePluginMetadata } from '@/features/server/plugins/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { getPlainTextFromHtml, type TJoinedMessage } from '@sharkord/shared';
import { CornerUpLeft } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const SNIPPET_MAX_LENGTH = 32;

type TMessageReplyPreviewWrapperProps = {
  message: TJoinedMessage;
  children?: React.ReactNode;
};

const MessageReplyPreviewWrapper = memo(
  ({ message, children }: TMessageReplyPreviewWrapperProps) => {
    const { t } = useTranslation('common');
    const channel = useChannelById(message.channelId);

    const replyTarget = message.replyTo;
    const replyTargetUser = useUserById(replyTarget?.userId ?? null);
    const replyTargetPlugin = usePluginMetadata(replyTarget?.pluginId);

    const onReplyJumpClick = useCallback(() => {
      if (!message.replyToMessageId) {
        return;
      }

      setMessageJumpTarget({
        channelId: message.channelId,
        messageId: message.replyToMessageId,
        isDm: !!channel?.isDm,
        highlightTime: 2000
      });
    }, [message.replyToMessageId, message.channelId, channel?.isDm]);

    const replyTargetAuthorName = useMemo(() => {
      if (replyTargetPlugin) {
        return (
          replyTargetPlugin.name ?? replyTarget?.pluginId ?? t('unknownUser')
        );
      }

      if (replyTargetUser) {
        return getRenderedUsername(replyTargetUser);
      }

      return t('unknownUser');
    }, [replyTargetPlugin, replyTarget, replyTargetUser, t]);

    const replyTargetSnippet = useMemo(() => {
      if (!replyTarget) {
        return t('originalMessageUnavailable');
      }

      const plainText = getPlainTextFromHtml(replyTarget.content ?? '').trim();

      if (plainText) {
        return plainText.length > SNIPPET_MAX_LENGTH
          ? plainText.slice(0, SNIPPET_MAX_LENGTH) + '…'
          : plainText;
      }

      return t('replyAttachmentFallback');
    }, [replyTarget, t]);

    if (!message.replyToMessageId) {
      return null;
    }

    return (
      <div>
        <div className="group flex items-center pl-2 pt-0.5">
          <div className="relative flex w-10 shrink-0 justify-end self-stretch overflow-visible">
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-2 -right-3 top-[16%] w-8 text-foreground/20 transition-colors group-hover:text-foreground/30 group-focus-within:text-foreground/55"
            >
              <svg
                className="block h-full w-full overflow-visible"
                viewBox="0 0 24 24"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M23 1H9C4.582 1 1 4.582 1 9V23"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
          <button
            type="button"
            className="ml-1 -mt-2 flex min-w-0 max-w-full items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
            onClick={onReplyJumpClick}
          >
            {replyTarget?.pluginId ? (
              <PluginAvatar
                name={replyTargetPlugin?.name}
                avatarUrl={replyTargetPlugin?.avatarUrl}
                className="h-4 w-4"
              />
            ) : replyTargetUser ? (
              <UserAvatar
                userId={replyTargetUser.id}
                className="h-4 w-4"
                showStatusBadge={false}
              />
            ) : (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CornerUpLeft className="h-3 w-3" />
              </span>
            )}

            <span className="max-w-40 truncate font-medium">
              {replyTargetAuthorName}
            </span>
            <span className="truncate opacity-90">{replyTargetSnippet}</span>
          </button>
        </div>

        {children}
      </div>
    );
  }
);

export { MessageReplyPreviewWrapper };
