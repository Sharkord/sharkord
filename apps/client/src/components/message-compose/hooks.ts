import {
  getLocalStorageItemAsNumber,
  LocalStorageKey
} from '@/helpers/storage';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { getHeight, measureMinHeight } from '../channel-view/text/helpers';

type TUseFileAwareHeightParams = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  composeContainerRef?: React.RefObject<HTMLDivElement | null>;
  displayItems: unknown[];
  inputStorageKey: LocalStorageKey;
  inputDefaultMaxHeightVh: number;
};

const useFileAwareHeight = ({
  containerRef,
  composeContainerRef,
  displayItems,
  inputStorageKey,
  inputDefaultMaxHeightVh
}: TUseFileAwareHeightParams) => {
  const userPinnedHeightRef = useRef<number | null>(null);

  // on mount, restore the saved height or set the default max-height
  useLayoutEffect(() => {
    if (!composeContainerRef) return;
    const el = composeContainerRef.current;

    if (!el) return;

    const savedVh =
      getLocalStorageItemAsNumber(inputStorageKey, inputDefaultMaxHeightVh) ??
      inputDefaultMaxHeightVh;

    if (savedVh === inputDefaultMaxHeightVh) {
      el.style.maxHeight = `${savedVh}vh`;
    } else {
      el.style.height = `${savedVh}vh`;
    }
  }, [composeContainerRef, inputStorageKey, inputDefaultMaxHeightVh]);

  // when files are added, if we're pinned at an explicit height that is too
  // small to show them, bump up; when files are all removed, restore
  useEffect(() => {
    const el = containerRef.current;

    if (!el?.style.height) return;

    const currentPx = getHeight(el);

    if (displayItems.length > 0) {
      // measure the natural height with files present
      const savedHeight = el.style.height;

      el.style.height = '';

      const naturalPx = getHeight(el);

      el.style.height = savedHeight;

      if (naturalPx > currentPx) {
        if (userPinnedHeightRef.current === null) {
          userPinnedHeightRef.current = currentPx;
        }

        el.style.height = `${naturalPx}px`;
      }
    } else if (userPinnedHeightRef.current !== null) {
      const minPx = measureMinHeight(el);

      el.style.height = `${Math.max(userPinnedHeightRef.current, minPx)}px`;

      userPinnedHeightRef.current = null;
    }
  }, [displayItems, containerRef]);
};

export { useFileAwareHeight };
