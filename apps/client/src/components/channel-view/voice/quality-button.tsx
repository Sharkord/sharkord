import { useVoice } from '@/features/server/voice/hooks';
import type { TStreamQuality } from '@/types';
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
import { qualityOptions } from './quality-options';

type TQualityButtonProps = {
  streamId: number;
  kind: StreamKind.VIDEO | StreamKind.SCREEN | StreamKind.EXTERNAL_VIDEO;
};

const QualityButton = memo(({ streamId, kind }: TQualityButtonProps) => {
  const { getStreamQuality, setStreamQuality } = useVoice();
  const [isPending, setIsPending] = useState(false);
  const quality = getStreamQuality(streamId, kind);

  const handleQualityChange = useCallback(
    async (nextQuality: string) => {
      setIsPending(true);

      try {
        await setStreamQuality(streamId, kind, nextQuality as TStreamQuality);
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
          variant={quality === 'auto' ? 'ghost' : 'primary'}
          icon={Gauge}
          title={`Quality: ${quality}`}
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
          value={quality}
          onValueChange={handleQualityChange}
        >
          {qualityOptions.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={isPending}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

QualityButton.displayName = 'QualityButton';

export { QualityButton };
