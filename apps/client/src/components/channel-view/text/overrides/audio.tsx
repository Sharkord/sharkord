import { memo } from 'react';
import { AudioPlayer } from './audio-player';
import { OverrideLayout } from './layout';
import { LinkOverride } from './link';

type TAudioOverrideProps = {
  src: string;
};

const AudioOverride = memo(({ src }: TAudioOverrideProps) => {
  return (
    <OverrideLayout>
      <AudioPlayer url={src} />
      <LinkOverride link={src} label="Open in new tab" />
    </OverrideLayout>
  );
});

export { AudioOverride };
