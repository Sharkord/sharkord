import {
  getStreamQualityDropdownValue,
  parseStreamQualityDropdownValue
} from '@/components/voice-provider/helpers';
import { useVoice } from '@/features/server/voice/hooks';
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
import { getStreamQualityLabel } from './quality-options';

type TQualityButtonProps = {
  streamId: number;
  kind: StreamKind.VIDEO | StreamKind.SCREEN | StreamKind.EXTERNAL_VIDEO;
};

const QualityButton = memo(({ streamId, kind }: TQualityButtonProps) => {
  const { getStreamQuality, getStreamQualityLayers, setStreamQuality } =
    useVoice();
  const [isPending, setIsPending] = useState(false);
  const quality = getStreamQuality(streamId, kind);
  const layers = getStreamQualityLayers(streamId, kind);
  const orderedLayers = [...layers].sort(
    (a, b) => b.spatialLayer - a.spatialLayer
  );
  const qualityLabel = getStreamQualityLabel(quality, layers);

  const handleQualityChange = useCallback(
    async (nextQuality: string) => {
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
    [kind, setStreamQuality, streamId]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant={quality.mode === 'auto' ? 'ghost' : 'primary'}
          icon={Gauge}
          title={`Quality: ${qualityLabel ?? 'Auto'}`}
          size="sm"
          disabled={isPending}
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
              disabled={isPending}
            >
              {layer.label}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuRadioItem value="auto" disabled={isPending}>
            Auto
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

QualityButton.displayName = 'QualityButton';

export { QualityButton };
