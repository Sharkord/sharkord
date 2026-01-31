import { IconButton } from '@/components/ui/icon-button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import {
  useVolumeControl,
  type TVolumeKey
} from '@/components/voice-provider/volume-control-context';
import { Volume2, VolumeX } from 'lucide-react';
import { memo, useCallback } from 'react';

type TVolumeButtonProps = {
  volumeKey: TVolumeKey;
};

const VolumeButton = memo(({ volumeKey }: TVolumeButtonProps) => {
  const { getVolume, setVolume, toggleMute } = useVolumeControl();
  const volume = getVolume(volumeKey);
  const isMuted = volume === 0;

  const handleVolumeChange = useCallback(
    (values: number[]) => {
      setVolume(volumeKey, values[0] || 0);
    },
    [volumeKey, setVolume]
  );

  const handleToggleMute = useCallback(() => {
    toggleMute(volumeKey);
  }, [volumeKey, toggleMute]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton
          variant={isMuted ? 'destructive' : 'ghost'}
          icon={isMuted ? VolumeX : Volume2}
          title={isMuted ? 'Unmute' : 'Volume'}
          size="sm"
        />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="top"
        className="w-48 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <IconButton
            variant="ghost"
            icon={isMuted ? VolumeX : Volume2}
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            size="sm"
          />
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            min={0}
            max={100}
            step={1}
            className="flex-1 cursor-pointer"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">
            {volume}%
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
});

VolumeButton.displayName = 'VolumeButton';

export { VolumeButton };
