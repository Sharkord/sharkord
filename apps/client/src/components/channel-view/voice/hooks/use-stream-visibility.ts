import { useVoice } from '@/features/server/voice/hooks';
import type { TPausableStreamKind } from '@sharkord/shared';
import { useEffect, type RefObject } from 'react';

const HIDE_DELAY_MS = 500;

const useStreamVisibility = (
  ref: RefObject<HTMLVideoElement | null>,
  remoteId: number,
  kind: TPausableStreamKind,
  enabled: boolean
) => {
  const { setStreamVisible } = useVoice();

  useEffect(() => {
    const element = ref.current;

    if (!enabled || !element) return;

    let isShown = false;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const hide = () => {
      if (!isShown) return;

      isShown = false;
      setStreamVisible(remoteId, kind, false);
    };

    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(hideTimer);

      const isVisible =
        entry.isIntersecting || document.pictureInPictureElement === element;

      if (!isVisible) {
        hideTimer = setTimeout(hide, HIDE_DELAY_MS);

        return;
      }

      if (isShown) return;

      isShown = true;
      setStreamVisible(remoteId, kind, true);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
      clearTimeout(hideTimer);
      hide();
    };
  }, [ref, remoteId, kind, enabled, setStreamVisible]);
};

export { useStreamVisibility };
