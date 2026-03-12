import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { gitHubEmojis } from '@tiptap/extension-emoji';
import { memo, useMemo } from 'react';

type TEmojiOverrideProps = {
  name: string;
};

const EmojiOverride = memo(({ name }: TEmojiOverrideProps) => {
  const customEmojis = useCustomEmojis();

  const resolved = useMemo(() => {
    // custom emojis take priority, then github emojis
    const custom = customEmojis.find(
      (e) => e.name === name || e.shortcodes.includes(name)
    );
    if (custom) return { src: custom.fallbackImage ?? null, native: null };

    const github = gitHubEmojis.find(
      (e) => e.name === name || e.shortcodes.includes(name)
    );
    if (!github) return null;
    // prefer native unicode character; fall back to image if unavailable
    return { src: github.fallbackImage ?? null, native: github.emoji ?? null };
  }, [name, customEmojis]);

  if (!resolved) return <span>:{name}:</span>;

  if (resolved.native) {
    return <span className="emoji-image">{resolved.native}</span>;
  }

  if (resolved.src) {
    return (
      <img
        src={resolved.src}
        alt={`:${name}:`}
        draggable={false}
        className="emoji-image"
      />
    );
  }

  return <span>:{name}:</span>;
});

export { EmojiOverride };
