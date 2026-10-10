import { isTextPresentation } from '@/components/tiptap-input/helpers';
import { getFileUrl } from '@/helpers/get-file-url';
import { cn } from '@/lib/utils';
import type { TFile } from '@sharkord/shared';
import { memo, useCallback, useMemo, useState } from 'react';
import { findGitHubEmoji } from './helpers';

type TEmojiProps = {
  emoji: string;
  file: TFile | null;
  className?: string;
  nativeEmojiClassName?: string;
};

const Emoji = memo(
  ({ emoji, file, className, nativeEmojiClassName }: TEmojiProps) => {
    const gitHubEmoji = useMemo(
      () => findGitHubEmoji(emoji, file),
      [emoji, file]
    );

    const [failed, setFailed] = useState(false);

    const onError = useCallback(() => setFailed(true), []);

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

    if (failed) {
      return <span className="text-xs text-muted-foreground">:{emoji}:</span>;
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
