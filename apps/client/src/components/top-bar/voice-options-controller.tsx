import {
  setHideNonVideoParticipants,
  setHideOwnScreenShare,
  setShowUserBannersInVoice
} from '@/features/server/voice/actions';
import {
  useHideNonVideoParticipants,
  useHideOwnScreenShare,
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
import { useTranslation } from 'react-i18next';

const VoiceOptionsController = memo(() => {
  const { t } = useTranslation('topbar');
  const hideNonVideoParticipants = useHideNonVideoParticipants();
  const showUserBanners = useShowUserBannersInVoice();
  const hideOwnScreenShare = useHideOwnScreenShare();

  const handleToggleHideNonVideo = useCallback((checked: boolean) => {
    setHideNonVideoParticipants(checked);
  }, []);

  const handleToggleShowUserBanners = useCallback((checked: boolean) => {
    setShowUserBannersInVoice(checked);
  }, []);

  const handleToggleHideOwnScreenShare = useCallback((checked: boolean) => {
    setHideOwnScreenShare(checked);
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 transition-all duration-200 ease-in-out"
        >
          <Tooltip content={t('voiceOptions')} asChild={false}>
            <Settings className="w-4 h-4" />
          </Tooltip>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <h4 className="font-medium text-sm cursor-default mb-3">
            {t('voiceOptions')}
          </h4>

          <div className="flex items-center justify-between space-x-3">
            <span
              onClick={() =>
                handleToggleHideNonVideo(!hideNonVideoParticipants)
              }
              className="text-sm text-foreground cursor-pointer select-none flex-1"
            >
              {t('hideNonVideoParticipants')}
            </span>
            <Switch
              id="hide-non-video"
              checked={hideNonVideoParticipants}
              onCheckedChange={handleToggleHideNonVideo}
            />
          </div>

          <div className="flex items-center justify-between space-x-3">
            <span
              onClick={() => handleToggleShowUserBanners(!showUserBanners)}
              className="text-sm text-foreground cursor-pointer select-none flex-1"
            >
              {t('displayUserBanners')}
            </span>
            <Switch
              id="show-user-banners"
              checked={showUserBanners}
              onCheckedChange={handleToggleShowUserBanners}
            />
          </div>

          <div className="flex items-center justify-between space-x-3">
            <span
              onClick={() =>
                handleToggleHideOwnScreenShare(!hideOwnScreenShare)
              }
              className="text-sm text-foreground cursor-pointer select-none flex-1"
            >
              {t('hideOwnScreenShare')}
            </span>
            <Switch
              id="hide-own-screen-share"
              checked={hideOwnScreenShare}
              onCheckedChange={handleToggleHideOwnScreenShare}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

VoiceOptionsController.displayName = 'VoiceOptionsController';

export { VoiceOptionsController };
