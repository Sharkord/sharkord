import type { THotkeyInputLabels } from '@sharkord/shared';
import { X } from 'lucide-react';
import * as React from 'react';
import { comboFromKeyboardEvent, formatCombo } from '../lib/hotkey';
import { cn } from '../lib/utils';
import { Button } from './button';
import { IconButton } from './icon-button';

type THotkeyInputProps = {
  value?: string;
  labels: THotkeyInputLabels;
  onChange: (combo: string) => string | undefined;
  onClear: () => void;
  error?: string;
  className?: string;
};

type TKeyboardLock = {
  lock?: () => Promise<void>;
  unlock?: () => void;
};

const getKeyboardLock = (): TKeyboardLock | undefined =>
  (navigator as { keyboard?: TKeyboardLock }).keyboard;

const HotkeyInput = React.memo(
  ({
    value,
    labels,
    onChange,
    onClear,
    error,
    className
  }: THotkeyInputProps) => {
    const [recording, setRecording] = React.useState(false);
    const [rejection, setRejection] = React.useState<string>();
    const containerRef = React.useRef<HTMLDivElement>(null);

    const toggleRecording = React.useCallback(() => {
      setRejection(undefined);
      setRecording((current) => !current);
    }, []);

    const assign = React.useCallback(
      (combo: string) => {
        setRecording(false);
        setRejection(onChange(combo));
      },
      [onChange]
    );

    const handleClear = React.useCallback(() => {
      setRejection(undefined);
      onClear();
    }, [onClear]);

    React.useEffect(() => {
      if (!recording) {
        return;
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        event.preventDefault();
        event.stopPropagation();

        if (event.code === 'Escape') {
          setRecording(false);

          return;
        }

        const combo = comboFromKeyboardEvent(event);

        if (combo) {
          assign(combo);
        }
      };

      const handleMouseDown = (event: MouseEvent) => {
        const { target } = event;
        const container = containerRef.current;

        if (container && target instanceof Node && container.contains(target)) {
          return;
        }

        setRecording(false);
      };

      const keyboard = getKeyboardLock();

      if (keyboard && keyboard.lock) {
        const locking = keyboard.lock();

        locking.catch(() => {});
      }

      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('mousedown', handleMouseDown, true);

      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('mousedown', handleMouseDown, true);

        if (keyboard && keyboard.unlock) {
          keyboard.unlock();
        }
      };
    }, [recording, assign]);

    let label = labels.unbound;

    if (recording) {
      label = labels.recording;
    } else if (value) {
      label = formatCombo(value);
    }

    const problem = rejection ?? error;

    return (
      <div className={className}>
        <div ref={containerRef} className="flex items-center gap-2">
          <Button
            type="button"
            variant={recording ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'min-w-40 font-mono',
              !value && !recording && 'text-muted-foreground'
            )}
            onClick={toggleRecording}
          >
            {label}
          </Button>
          {value && !recording && (
            <IconButton
              type="button"
              icon={X}
              size="sm"
              variant="ghost"
              aria-label={labels.clear}
              onClick={handleClear}
            />
          )}
        </div>
        {recording && (
          <p className="mt-1 text-xs text-muted-foreground">{labels.hint}</p>
        )}
        {!recording && problem && (
          <p className="mt-1 text-xs text-destructive">{problem}</p>
        )}
      </div>
    );
  }
);

export { HotkeyInput };
export type { THotkeyInputLabels, THotkeyInputProps };
