import { UserAvatar } from '@/components/user-avatar';
import { useUserVolumeControl } from '@/components/voice-provider/hooks/use-user-volume-control';
import type { TVoiceUser } from '@/features/server/types';
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  Slider
} from '@sharkord/ui';
import { Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type TVoiceUserContextMenuProps = {
  user: TVoiceUser;
  children: ReactNode;
};

export const VoiceUserContextMenu = ({
  user,
  children
}: TVoiceUserContextMenuProps) => {
  const { t } = useTranslation('sidebar');
  const { volume, isMuted, setVolume, toggleMute } = useUserVolumeControl(
    user.id
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 mb-3">
            <UserAvatar
              userId={user.id}
              className="h-6 w-6"
              showUserPopover={false}
              showStatusBadge={false}
            />
            <span className="text-sm truncate flex-1">{user.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="h-6 w-6 p-0"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Slider
            value={[volume]}
            onValueChange={([val]) => setVolume(val ?? 0)}
            min={0}
            max={100}
            step={1}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t('userVolume')}
            </span>
            <span className="text-xs text-muted-foreground">{volume}%</span>
          </div>
        </div>
      </ContextMenuContent>
    </ContextMenu>
  );
};
