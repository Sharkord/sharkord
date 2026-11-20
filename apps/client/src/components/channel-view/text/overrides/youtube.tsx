import { useAutoLoadYoutubeEmbeds } from '@/features/app/hooks';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { OverrideLayout } from './layout';
import { VideoPlayer } from './video-player';

type TYoutubeOverrideProps = {
  videoId: string;
};

const YoutubeOverride = memo(({ videoId }: TYoutubeOverrideProps) => {
  const { t } = useTranslation('common');
  const autoLoadYoutubeEmbeds = useAutoLoadYoutubeEmbeds();

  return (
    <OverrideLayout>
      <VideoPlayer
        url={`https://www.youtube.com/watch?v=${videoId}`}
        thumbnail={
          autoLoadYoutubeEmbeds
            ? undefined
            : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        }
        thumbnailLabel={t('playVideo')}
      />
    </OverrideLayout>
  );
});

export { YoutubeOverride };
