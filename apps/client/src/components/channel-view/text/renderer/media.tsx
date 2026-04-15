import { memo, useMemo } from 'react';
import { AudioOverride } from '../overrides/audio';
import { ImageOverride } from '../overrides/image';
import { MediaOverride } from '../overrides/media';
import { VideoOverride } from '../overrides/video';
import type { TFoundMedia } from '../renderer/types';

type TMediaProps = {
  media: TFoundMedia[];
};

const Media = memo(({ media }: TMediaProps) => {
  const { imagesAndVideos, audios } = useMemo(() => {
    const imagesAndVideos = media.filter(
      (item) => item.type === 'image' || item.type === 'video'
    );
    const audios = media.filter((item) => item.type === 'audio');

    return {
      imagesAndVideos,
      audios
    };
  }, [media]);

  const singleVisualMedia =
    imagesAndVideos.length === 1 ? imagesAndVideos[0] : null;
  const hasOnlySingleVisualMedia =
    singleVisualMedia !== null && audios.length === 0;

  return (
    <>
      {hasOnlySingleVisualMedia && singleVisualMedia.type === 'image' && (
        <ImageOverride src={singleVisualMedia.url} />
      )}

      {hasOnlySingleVisualMedia && singleVisualMedia.type === 'video' && (
        <VideoOverride src={singleVisualMedia.url} />
      )}

      {!hasOnlySingleVisualMedia && imagesAndVideos.length > 0 && (
        <MediaOverride media={imagesAndVideos} />
      )}

      {audios.map((media) => (
        <AudioOverride src={media.url} key={media.key} />
      ))}
    </>
  );
});

export { Media };
