import { useCustomEmojiFile } from '@/features/server/emojis/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { memo, useMemo } from 'react';

type TCustomEmojiOverrideProps = {
  name: string;
  src: string;
  alt?: string;
};

const CustomEmojiOverride = memo(
  ({ name, src, alt }: TCustomEmojiOverrideProps) => {
    const file = useCustomEmojiFile(name);
    const url = useMemo(() => (file ? getFileUrl(file) : src), [file, src]);

    return <img src={url} alt={alt} draggable={false} loading="lazy" />;
  }
);

export { CustomEmojiOverride };
