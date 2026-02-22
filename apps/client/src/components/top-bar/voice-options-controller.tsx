import {
  setHideNonVideoParticipants,
  setShowUserBannersInVoice
} from '@/features/server/voice/actions';
import {
  useHideNonVideoParticipants,
  useShowUserBannersInVoice
} from '@/features/server/voice/hooks';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
  Tooltip
} from '@sharkord/ui';
import { Settings } from 'lucide-react';
import { memo, useCallback } from 'react';

const VoiceOptionsController = memo(() => {
  const hideNonVideoParticipants = useHideNonVideoParticipants();
  const showUserBanners = useShowUserBannersInVoice();

  const handleToggleHideNonVideo = useCallback((checked: boolean) => {
    setHideNonVideoParticipants(checked);
  }, []);

  const handleToggleShowUserBanners = useCallback((checked: boolean) => {
    setShowUserBannersInVoice(checked);
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 transition-all duration-200 ease-in-out"
        >
          <Tooltip content="Voice Options" asChild={false}>
            <Settings className="w-4 h-4" />
          </Tooltip>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <h4 className="font-medium text-sm cursor-default mb-3">
            Voice Options
          </h4>

          <div className="flex items-center justify-between space-x-3">
            <span
              onClick={() =>
                handleToggleHideNonVideo(!hideNonVideoParticipants)
              }
              className="text-sm text-foreground cursor-pointer select-none flex-1"
            >
              Hide non-video participants
            </span>
            <Switch
              id="hide-non-video"
              checked={hideNonVideoParticipants}
              onCheckedChange={handleToggleHideNonVideo}
              data-1p-ignore
              data-lpignore="true"
            />
          </div>

          <div className="flex items-center justify-between space-x-3">
            <span
              onClick={() => handleToggleShowUserBanners(!showUserBanners)}
              className="text-sm text-foreground cursor-pointer select-none flex-1"
            >
              Display user banners
            </span>
            <Switch
              id="show-user-banners"
              checked={showUserBanners}
              onCheckedChange={handleToggleShowUserBanners}
              data-1p-ignore
              data-lpignore="true"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

VoiceOptionsController.displayName = 'VoiceOptionsController';

export { VoiceOptionsController };
