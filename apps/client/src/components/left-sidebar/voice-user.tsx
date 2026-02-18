import { UserAvatar } from '@/components/user-avatar';
import type { TVoiceUser } from '@/features/server/types';
import {
  HeadphoneOff,
  Headphones,
  Mic,
  MicOff,
  Monitor,
  Video
} from 'lucide-react';
import { memo } from 'react';
import { UserPopover } from '../user-popover';

type TVoiceUserProps = {
  userId: number;
  user: TVoiceUser;
};

const VoiceUser = memo(({ user }: TVoiceUserProps) => {
  return (
    <UserPopover userId={user.id}>
      <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/30 text-sm">
        <UserAvatar
          userId={user.id}
          className="h-5 w-5"
          showUserPopover={true}
          showStatusBadge={false}
        />

        <span className="flex-1 text-muted-foreground truncate text-xs">
          {user.name}
        </span>

        <div className="flex items-center gap-1 opacity-60">
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
    </UserPopover>
  );
});

export { VoiceUser };
