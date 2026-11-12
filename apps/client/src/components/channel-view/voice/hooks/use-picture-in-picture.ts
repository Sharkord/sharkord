import { getPictureInPictureVideo } from '@/helpers/picture-in-picture';
import { useCallback, useEffect, useState, type RefObject } from 'react';

const isShowingStreamOf = (video: HTMLVideoElement) => {
  const pipVideo = getPictureInPictureVideo();

  return (
    document.pictureInPictureElement === pipVideo &&
    !!video.srcObject &&
    pipVideo.srcObject === video.srcObject
  );
};

const usePictureInPicture = (
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled = true
) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    const supported =
      enabled &&
      typeof document !== 'undefined' &&
      document.pictureInPictureEnabled &&
      !!video?.requestPictureInPicture;

    setIsSupported(!!supported);

    if (!video || !supported) {
      setIsActive(false);
      return;
    }

    const pipVideo = getPictureInPictureVideo();

    const syncState = () => {
      setIsActive(isShowingStreamOf(video));
    };

    syncState();
    pipVideo.addEventListener('enterpictureinpicture', syncState);
    pipVideo.addEventListener('leavepictureinpicture', syncState);
    // the card gets its stream after this effect runs, when remounting while pip is open
    video.addEventListener('loadedmetadata', syncState);

    return () => {
      pipVideo.removeEventListener('enterpictureinpicture', syncState);
      pipVideo.removeEventListener('leavepictureinpicture', syncState);
      video.removeEventListener('loadedmetadata', syncState);
    };
  }, [enabled, videoRef]);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;

    if (
      !enabled ||
      !video ||
      !video.srcObject ||
      typeof document === 'undefined' ||
      !document.pictureInPictureEnabled ||
      !video.requestPictureInPicture
    ) {
      return;
    }

    try {
      if (isShowingStreamOf(video)) {
        await document.exitPictureInPicture();
        return;
      }

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }

      const pipVideo = getPictureInPictureVideo();

      pipVideo.srcObject = video.srcObject;

      await pipVideo.play();
      await pipVideo.requestPictureInPicture();
    } catch {
      // ignore errors
    }
  }, [enabled, videoRef]);

  return { isSupported, isActive, togglePictureInPicture };
};

export { usePictureInPicture };
