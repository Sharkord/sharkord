import { UserAvatar } from '@/components/user-avatar';
import { useStreamVolumeControl } from '@/components/voice-provider/hooks/use-stream-volume-control';
import type { TVoiceUser } from '@/features/server/types';
import { useIsOwnUser } from '@/features/server/users/hooks';
import { useSpeakingState } from '@/features/server/voice/hooks';
import { cn } from '@sharkord/ui';
import {
  HeadphoneOff,
  Headphones,
  Mic,
  MicOff,
  Monitor,
  Video,
  VolumeX
} from 'lucide-react';
import { memo } from 'react';
import { UserPopover } from '../user-popover';
import { StreamContextMenu } from './stream-context-menu';

type TVoiceUserProps = {
  userId: number;
  user: TVoiceUser;
  isOwnChannel?: boolean;
};

const VoiceUser = memo(({ user, isOwnChannel = false }: TVoiceUserProps) => {
  const isOwnUser = useIsOwnUser(user.id);
  const { isMuted } = useStreamVolumeControl({ type: 'user', userId: user.id });
  const { isActivelySpeaking, speakingEffectClass } = useSpeakingState(user.id);
  const shouldShowMuteIndicator = isOwnChannel && !isOwnUser && isMuted;

  const userRow = (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/30 text-sm">
      <UserAvatar
        userId={user.id}
        className={cn('h-5 w-5', isActivelySpeaking && speakingEffectClass)}
        showUserPopover={true}
        showStatusBadge={false}
      />

      <span className="flex-1 text-muted-foreground truncate text-xs">
        {user.name}
      </span>

      <div className="flex items-center gap-1 opacity-60">
        {shouldShowMuteIndicator && (
          <VolumeX className="h-3 w-3 text-red-500" />
        )}

        <div>
          {user.state.micMuted ? (
            <MicOff className="h-3 w-3 text-red-500" />
          ) : (
            <Mic className="h-3 w-3 text-green-500" />
          )}
        </div>

        <div>
          {user.state.soundMuted ? (
            <HeadphoneOff className="h-3 w-3 text-red-500" />
          ) : (
            <Headphones className="h-3 w-3 text-green-500" />
          )}
        </div>

        {user.state.webcamEnabled && (
          <Video className="h-3 w-3 text-blue-500" />
        )}

        {user.state.sharingScreen && (
          <Monitor className="h-3 w-3 text-purple-500" />
        )}
      </div>
    </div>
  );

  if (isOwnUser || !isOwnChannel) {
    return <UserPopover userId={user.id}>{userRow}</UserPopover>;
  }

  return (
    <StreamContextMenu type="user" userId={user.id} name={user.name}>
      <UserPopover userId={user.id}>{userRow}</UserPopover>
    </StreamContextMenu>
  );
});

export { VoiceUser };
