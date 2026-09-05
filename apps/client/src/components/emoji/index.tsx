import { isTextPresentation } from '@/components/tiptap-input/helpers';
import { getFileUrl } from '@/helpers/get-file-url';
import { cn } from '@/lib/utils';
import type { TFile } from '@sharkord/shared';
import { gitHubEmojis } from '@tiptap/extension-emoji';
import { memo, useCallback, useMemo } from 'react';

type TEmojiProps = {
  emoji: string;
  file: TFile | null;
  className?: string;
  nativeEmojiClassName?: string;
};

const Emoji = memo(
  ({ emoji, file, className, nativeEmojiClassName }: TEmojiProps) => {
    const gitHubEmoji = useMemo(
      () =>
        gitHubEmojis.find(
          (e) => e.name === emoji || e.shortcodes.includes(emoji)
        ),
      [emoji]
    );

    const onError = useCallback(
      (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.target as HTMLImageElement;

        target.outerHTML = `<span class="text-xs text-muted-foreground">:${emoji}:</span>`;
      },
      [emoji]
    );

    const imgSrc = useMemo(
      () => gitHubEmoji?.fallbackImage ?? getFileUrl(file),
      [gitHubEmoji, file]
    );

    if (gitHubEmoji?.emoji && !isTextPresentation(gitHubEmoji.emoji)) {
      return (
        <span className={cn('text-sm', nativeEmojiClassName)}>
          {gitHubEmoji.emoji}
        </span>
      );
    }

    return (
      <img
        src={imgSrc}
        alt={`:${emoji}:`}
        className={cn('w-5 h-5 object-contain', className)}
        onError={onError}
      />
    );
  }
);

Emoji.displayName = 'Emoji';

export { Emoji };
