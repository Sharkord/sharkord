import { openServerScreen } from '@/features/server-screens/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission } from '@sharkord/shared';
import { HeadphoneOff, Headphones, Mic, MicOff, Settings } from 'lucide-react';
import { memo, useCallback } from 'react';
import { ServerScreen } from '../server-screens/screens';
import { Button } from '@sharkord/ui';
import { UserAvatar } from '../user-avatar';
import { UserPopover } from '../user-popover';

const UserControl = memo(() => {
  const ownPublicUser = useOwnPublicUser();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const { ownVoiceState, toggleMic, toggleSound } = useVoice();
  const channelCan = useChannelCan(currentVoiceChannelId);

  const handleSettingsClick = useCallback(() => {
    openServerScreen(ServerScreen.USER_SETTINGS);
  }, []);

  if (!ownPublicUser) return null;

  return (
    <div className="flex items-center justify-between h-14 px-2 bg-muted/20 border-t border-border">
      <UserPopover userId={ownPublicUser.id}>
        <div className="flex items-center space-x-2 min-w-0 flex-1 cursor-pointer hover:bg-muted/30 rounded-md p-1 transition-colors">
          <UserAvatar
            userId={ownPublicUser.id}
            className="h-8 w-8 flex-shrink-0"
            showUserPopover={false}
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-foreground truncate">
              {ownPublicUser.name}
            </span>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-muted-foreground capitalize">
                {ownPublicUser.status}
              </span>
            </div>
          </div>
        </div>
      </UserPopover>

      <div className="flex items-center space-x-0.5">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 hover:bg-muted/50',
            ownVoiceState.micMuted
              ? 'text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={toggleMic}
          title={
            ownVoiceState.micMuted
              ? 'Unmute microphone (Ctrl+Shift+M)'
              : 'Mute microphone (Ctrl+Shift+M)'
          }
          disabled={!channelCan(ChannelPermission.SPEAK)}
        >
          {ownVoiceState.micMuted ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 hover:bg-muted/50',
            ownVoiceState.soundMuted
              ? 'text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={toggleSound}
          title={
            ownVoiceState.soundMuted
              ? 'Undeafen (Ctrl+Shift+D)'
              : 'Deafen (Ctrl+Shift+D)'
          }
        >
          {ownVoiceState.soundMuted ? (
            <HeadphoneOff className="h-4 w-4" />
          ) : (
            <Headphones className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={handleSettingsClick}
          title="User settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export { UserControl };
