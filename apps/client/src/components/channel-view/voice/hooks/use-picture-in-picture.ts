import { useCallback, useEffect, useState, type RefObject } from 'react';

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

    const syncState = () => {
      setIsActive(document.pictureInPictureElement === video);
    };

    syncState();
    video.addEventListener('enterpictureinpicture', syncState);
    video.addEventListener('leavepictureinpicture', syncState);

    return () => {
      video.removeEventListener('enterpictureinpicture', syncState);
      video.removeEventListener('leavepictureinpicture', syncState);

      if (document.pictureInPictureElement === video) {
        document.exitPictureInPicture().catch(() => undefined);
      }
    };
  }, [enabled, videoRef]);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;

    if (
      !enabled ||
      !video ||
      typeof document === 'undefined' ||
      !document.pictureInPictureEnabled ||
      !video.requestPictureInPicture
    ) {
      return;
    }

    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
        return;
      }

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }

      await video.requestPictureInPicture();
    } catch {
      // ignore errors
    }
  }, [enabled, videoRef]);

  return { isSupported, isActive, togglePictureInPicture };
};

export { usePictureInPicture };
