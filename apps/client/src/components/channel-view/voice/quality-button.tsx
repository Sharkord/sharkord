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
  IconButton
} from '@sharkord/ui';
import { Gauge } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

type TQualityButtonProps = {
  streamId: number;
  kind: StreamKind.VIDEO | StreamKind.SCREEN | StreamKind.EXTERNAL_VIDEO;
  disabled?: boolean;
};

const QualityButton = memo(
  ({ streamId, kind, disabled = false }: TQualityButtonProps) => {
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
            size="sm"
            disabled={isDisabled}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          side="top"
          className="w-32"
          onClick={(e) => e.stopPropagation()}
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
