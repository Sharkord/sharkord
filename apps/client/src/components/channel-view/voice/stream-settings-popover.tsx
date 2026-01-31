import { IconButton } from '@/components/ui/icon-button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Settings, Volume2, VolumeX } from 'lucide-react';
import { memo } from 'react';

type TStreamSettingsPopoverProps = {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
};

const StreamSettingsPopover = memo(
  ({
    volume,
    isMuted,
    onVolumeChange,
    onMuteToggle
  }: TStreamSettingsPopoverProps) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <IconButton
            variant="ghost"
            icon={Settings}
            title="Stream Settings"
            size="sm"
          />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          className="w-56 p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Volume
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                variant="ghost"
                icon={isMuted ? VolumeX : Volume2}
                onClick={onMuteToggle}
                title={isMuted ? 'Unmute' : 'Mute'}
                size="sm"
                className={isMuted ? 'text-red-400' : ''}
              />
              <Slider
                value={[volume]}
                onValueChange={([value]) => onVolumeChange(value)}
                min={0}
                max={100}
                step={1}
                className="flex-1 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {Math.round(volume)}%
              </span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

StreamSettingsPopover.displayName = 'StreamSettingsPopover';

export { StreamSettingsPopover };
