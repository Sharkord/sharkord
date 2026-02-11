import { Separator } from '@/components/ui/separator';
import { Tooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import { useOwnVoiceState, useVoice } from '@/features/server/voice/hooks';
import { ChannelPermission } from '@sharkord/shared';
import {
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  ScreenShareOff,
  Video,
  VideoOff
} from 'lucide-react';
import { memo, useMemo } from 'react';
import { ControlToggleButton } from './control-toggle-button';
import { useControlsBarVisibility } from './hooks/use-controls-bar-visibility';

type TControlsBarProps = {
  channelId: number;
};

const ControlsBar = memo(({ channelId }: TControlsBarProps) => {
  const { toggleMic, toggleWebcam, toggleScreenShare } = useVoice();
  const ownVoiceState = useOwnVoiceState();
  const channelCan = useChannelCan(channelId);

  const isVisible = useControlsBarVisibility();

  const permissions = useMemo(() => {
    return {
      canSpeak: channelCan(ChannelPermission.SPEAK),
      canWebcam: channelCan(ChannelPermission.WEBCAM),
      canShareScreen: channelCan(ChannelPermission.SHARE_SCREEN)
    };
  }, [channelCan]);

  return (
    <div
      className={cn(
        'absolute bottom-8 left-0 right-0 flex justify-center items-center pointer-events-none z-50',
        'transition-all duration-300 ease-in-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1 pointer-events-auto',
          'p-2 rounded-[24px] border shadow-2xl',
          'bg-card/90 backdrop-blur-md border-border/50'
        )}
      >
        <div className="flex items-center gap-1 px-1">
          <ControlToggleButton
            enabled={ownVoiceState.micMuted}
            enabledLabel="Unmute"
            disabledLabel="Mute"
            enabledIcon={MicOff}
            disabledIcon={Mic}
            enabledClassName="bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400"
            onClick={toggleMic}
            disabled={!permissions.canSpeak}
            />

          <ControlToggleButton
            enabled={ownVoiceState.webcamEnabled}
            enabledLabel="Stop Video"
            disabledLabel="Start Video"
            enabledIcon={Video}
            disabledIcon={VideoOff}
            enabledClassName="bg-green-500/15 hover:bg-green-500/25 text-green-400 hover:text-green-300"
            onClick={toggleWebcam}
            disabled={!permissions.canWebcam}
            />

          <ControlToggleButton
            enabled={ownVoiceState.sharingScreen}
            enabledLabel="Stop Sharing"
            disabledLabel="Share Screen"
            enabledIcon={ScreenShareOff}
            disabledIcon={Monitor}
            enabledClassName="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300"
            onClick={toggleScreenShare}
            disabled={!permissions.canShareScreen}
            />
        </div>

        <Separator orientation="vertical" className="h-6 mx-2 bg-border/60" />

        <Tooltip content="Disconnect">
          <Button
            size="icon"
            className={cn(
              'h-11 w-16 rounded-[20px] text-white transition-all active:scale-95',
              'border-none shadow-none',
              'bg-[#ec4245] hover:bg-[#da373c]'
            )}
            onClick={leaveVoice}
            aria-label="Disconnect"
          >
            <PhoneOff size={24} fill="currentColor" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
});

ControlsBar.displayName = 'ControlsBar';

export { ControlsBar };
