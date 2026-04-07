import { cn } from '@/lib/utils';
import { memo } from 'react';
import ReactPlayer from 'react-player';

type TAudioPlayerProps = {
  url: string;
  className?: string;
};

const AudioPlayer = memo(({ url, className }: TAudioPlayerProps) => {
  return (
    <div className={cn('w-150 max-w-full', className)}>
      <ReactPlayer
        src={url}
        controls
        width="100%"
        height="54px"
        style={{
          colorScheme: 'dark'
        }}
      />
    </div>
  );
});

export { AudioPlayer };
