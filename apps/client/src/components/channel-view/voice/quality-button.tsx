import {
  getStreamQualityDropdownValue,
  parseStreamQualityDropdownValue
} from '@/components/voice-provider/helpers';
import { useVoice } from '@/features/server/voice/hooks';
import { useStreamQualityData } from '@/hooks/use-stream-quality-data';
import { StreamKind } from '@sharkord/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  IconButton,
  type TIconButtonSize
} from '@sharkord/ui';
import { Gauge } from 'lucide-react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { memo, useCallback, useState } from 'react';

type TQualityButtonProps = {
  streamId: number;
  kind: StreamKind.VIDEO | StreamKind.SCREEN | StreamKind.EXTERNAL_VIDEO;
  disabled?: boolean;
  className?: string;
  size?: TIconButtonSize;
};

const QualityButton = memo(
  ({
    streamId,
    kind,
    disabled = false,
    className,
    size = 'sm'
  }: TQualityButtonProps) => {
    const { setStreamQuality } = useVoice();
    const [isPending, setIsPending] = useState(false);

    const { qualityLabel, quality, orderedLayers } = useStreamQualityData(
      streamId,
      kind
    );

    const handleQualityChange = useCallback(
      async (nextQuality: string) => {
        if (disabled) return;

        setIsPending(true);

        try {
          await setStreamQuality(
            streamId,
            kind,
            parseStreamQualityDropdownValue(nextQuality)
          );
        } finally {
          setIsPending(false);
        }
      },
      [disabled, kind, setStreamQuality, streamId]
    );

    const isDisabled = disabled || isPending;

    const stopPropagation = useCallback((event: ReactMouseEvent) => {
      event.stopPropagation();
    }, []);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            variant={quality.mode === 'auto' ? 'ghost' : 'primary'}
            icon={Gauge}
            title={
              disabled
                ? 'Quality selection unavailable'
                : `Quality: ${qualityLabel ?? 'Auto'}`
            }
            size={size}
            className={className}
            disabled={isDisabled}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          side="top"
          className="w-32"
          onClick={stopPropagation}
        >
          <DropdownMenuRadioGroup
            value={getStreamQualityDropdownValue(quality)}
            onValueChange={handleQualityChange}
          >
            {orderedLayers.map((layer) => (
              <DropdownMenuRadioItem
                key={layer.spatialLayer}
                value={`layer-${layer.spatialLayer}`}
                disabled={isDisabled}
              >
                {layer.label}
              </DropdownMenuRadioItem>
            ))}
            <DropdownMenuRadioItem value="auto" disabled={isDisabled}>
              Auto
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

QualityButton.displayName = 'QualityButton';

export { QualityButton };
