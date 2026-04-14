import {
  type LocalStorageKey,
  removeLocalStorageItem,
  setLocalStorageItem
} from '@/helpers/storage';
import { useCallback } from 'react';

const MAX_VH = 80;
const MIN_PX = 56;
const RESET_THRESHOLD_PX = 10;

type TChatInputDividerProps = {
  composeContainerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
  isAtBottom: () => boolean;
  storageKey: LocalStorageKey;
  defaultMaxHeightVh: number;
};

// calculate the minimum acceptable chat input height
export const measureMinHeight = (composeEl: HTMLDivElement): number => {
  const proseMirror = composeEl.querySelector(
    '.ProseMirror'
  ) as HTMLElement | null;
  if (!proseMirror) return MIN_PX;

  // clamp to one line to measure empty state
  const savedHeight = composeEl.style.height;
  const savedMaxHeight = composeEl.style.maxHeight;
  const scrollRow = composeEl.querySelector(
    '.compose-scroll-row'
  ) as HTMLElement | null;
  const savedScrollTop = scrollRow?.scrollTop ?? 0;
  proseMirror.classList.add('line-clamp-1');
  composeEl.style.height = '';
  composeEl.style.maxHeight = '';

  // measure
  const minHeight = composeEl.getBoundingClientRect().height;

  // restore height and scroll position
  composeEl.style.height = savedHeight;
  composeEl.style.maxHeight = savedMaxHeight;
  proseMirror.classList.remove('line-clamp-1');
  if (scrollRow) scrollRow.scrollTop = savedScrollTop;

  return Math.max(MIN_PX, minHeight);
};

const ChatInputDivider = ({
  composeContainerRef,
  scrollToBottom,
  isAtBottom,
  storageKey,
  defaultMaxHeightVh
}: TChatInputDividerProps) => {
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();

      const composeEl = composeContainerRef.current;

      if (!composeEl) return;

      const wasAtBottom = isAtBottom();
      const startY = e.clientY;
      const startHeight = composeEl.style.height;
      const startMaxHeight = composeEl.style.maxHeight;
      const startHeightPx = composeEl.getBoundingClientRect().height;
      const maxPx = (MAX_VH / 100) * window.innerHeight;
      const minPx = measureMinHeight(composeEl);
      composeEl.style.maxHeight = '';
      composeEl.style.height = `${startHeightPx}px`;
      if (wasAtBottom) scrollToBottom();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const newHeightPx = Math.max(
          minPx,
          Math.min(maxPx, startHeightPx - deltaY)
        );

        composeEl.style.height = `${newHeightPx}px`;

        if (wasAtBottom) {
          scrollToBottom();
        }
      };

      const finish = (upEvent: PointerEvent) => {
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', finish);
        target.removeEventListener('pointercancel', onPointerCancel);

        const deltaY = upEvent.clientY - startY;
        const finalPx = Math.max(
          minPx,
          Math.min(maxPx, startHeightPx - deltaY)
        );

        composeEl.style.height = `${finalPx}px`;

        if (finalPx <= minPx + RESET_THRESHOLD_PX) {
          const proseMirror = composeEl.querySelector(
            '.ProseMirror'
          ) as HTMLElement | null;
          if (
            proseMirror &&
            proseMirror.scrollHeight > minPx + RESET_THRESHOLD_PX
          ) {
            // multi-line content -- pin at min height
            composeEl.style.height = `${minPx}px`;
            composeEl.style.maxHeight = '';
            composeEl.dataset.pendingUnpinOnSend = 'true';
          } else {
            // single line or empty -- reset to auto-grow mode
            composeEl.style.height = '';
            composeEl.style.maxHeight = `${defaultMaxHeightVh}vh`;
            delete composeEl.dataset.pendingUnpinOnSend;
          }
          removeLocalStorageItem(storageKey);
        } else {
          composeEl.style.maxHeight = '';
          const finalVh = Math.round((finalPx / window.innerHeight) * 100);
          setLocalStorageItem(storageKey, String(finalVh));
          delete composeEl.dataset.pendingUnpinOnSend;
        }

        if (wasAtBottom) {
          scrollToBottom();
        }
      };

      const onPointerCancel = () => {
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', finish);
        target.removeEventListener('pointercancel', onPointerCancel);

        composeEl.style.height = startHeight;
        composeEl.style.maxHeight = startMaxHeight;
      };

      target.addEventListener('pointermove', onPointerMove);
      target.addEventListener('pointerup', finish);
      target.addEventListener('pointercancel', onPointerCancel);
    },
    [
      composeContainerRef,
      scrollToBottom,
      isAtBottom,
      storageKey,
      defaultMaxHeightVh
    ]
  );

  return (
    <div
      onPointerDown={onPointerDown}
      className="group relative h-0 shrink-0 overflow-visible cursor-row-resize select-none z-10"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize chat input"
    >
      <div className="absolute inset-x-0 top-0 h-px w-full bg-border transition-all origin-top group-hover:scale-y-[4] group-hover:bg-primary/50 group-active:scale-y-[4] group-active:bg-primary" />
      <div className="absolute inset-x-0 -top-0.5 h-4" />
    </div>
  );
};

export { ChatInputDivider };
