import {
  getLocalStorageItemAsNumber,
  LocalStorageKey
} from '@/helpers/storage';
import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  getHeight,
  MAX_VH,
  measureMinHeight
} from '../channel-view/text/helpers';

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

    if (!el) return;

    const currentPx = getHeight(el);
    const maxPx = (MAX_VH / 100) * window.innerHeight;

    if (displayItems.length > 0) {
      // measure the natural height with files present -- clear both height and
      // maxHeight so the default max doesn't artificially cap the measurement
      const savedHeight = el.style.height;
      const savedMaxHeight = el.style.maxHeight;

      el.style.height = '';
      el.style.maxHeight = '';

      const naturalPx = getHeight(el);

      el.style.height = savedHeight;
      el.style.maxHeight = savedMaxHeight;

      const clampedNaturalPx = Math.min(naturalPx, maxPx);
      if (el.style.height) {
        userPinnedHeightRef.current ||= currentPx;
      }

      if (clampedNaturalPx > currentPx) {
        el.style.height = '';
        el.style.maxHeight = `${clampedNaturalPx}px`;
      }
    } else {
      const minPx = measureMinHeight(el);

      if (userPinnedHeightRef.current) {
        el.style.height = `${Math.max(userPinnedHeightRef.current, minPx)}px`;
      } else {
        el.style.maxHeight = `${inputDefaultMaxHeightVh}vh`;
      }

      userPinnedHeightRef.current = null;
    }
  }, [displayItems, containerRef, inputDefaultMaxHeightVh]);
};

export { useFileAwareHeight };
