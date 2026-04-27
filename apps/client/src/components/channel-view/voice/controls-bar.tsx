import { useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import { useOwnVoiceState, useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission } from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
import {
  HeadphoneOff,
  Headphones,
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

type TControlsBarProps = {
  channelId: number;
};

const ControlsBar = memo(({ channelId }: TControlsBarProps) => {
  const {
    toggleMic,
    toggleSound,
    toggleWebcam,
    toggleScreenShare,
    isScreenShareSupported
  } = useVoice();
  const ownVoiceState = useOwnVoiceState();
  const channelCan = useChannelCan(channelId);

  const permissions = useMemo(
    () => ({
      canSpeak: channelCan(ChannelPermission.SPEAK),
      canWebcam: channelCan(ChannelPermission.WEBCAM),
      canShareScreen: channelCan(ChannelPermission.SHARE_SCREEN)
    }),
    [channelCan]
  );

  return (
    <div
      className={cn(
        'flex justify-center items-center pointer-events-none relative -mt-3 gap-2',
        'transition-all duration-300 ease-in-out',
        'opacity-0 translate-y-10 group-hover/voice-stage:opacity-100 group-hover/voice-stage:translate-y-0',
        'max-h-0 group-hover/voice-stage:max-h-full p-0 group-hover/voice-stage:p-3'
      )}
    >
      <div
        className={cn(
          'flex items-center pointer-events-auto p-1.5',
          'gap-2 rounded border shadow-xl',
          'bg-card border-border/50 backdrop-blur-md'
        )}
      >
        <ControlToggleButton
          enabled={ownVoiceState.micMuted}
          enabledLabel="Unmute"
          disabledLabel="Mute"
          enabledIcon={MicOff}
          disabledIcon={Mic}
          enabledClassName="bg-red-500/20 text-red-500 hover:bg-red-500/30 hover:text-red-500"
          onClick={toggleMic}
          disabled={!permissions.canSpeak || ownVoiceState.soundMuted}
        />

        <ControlToggleButton
          enabled={ownVoiceState.soundMuted}
          enabledLabel="UnDeafen"
          disabledLabel="Deafen"
          enabledIcon={HeadphoneOff}
          disabledIcon={Headphones}
          enabledClassName="bg-red-500/20 text-red-500 hover:bg-red-500/30 hover:text-red-500"
          onClick={toggleSound}
        />

        <div className="h-8 border-r-2 border-border" />

        <ControlToggleButton
          enabled={ownVoiceState.webcamEnabled}
          enabledLabel="Stop Video"
          disabledLabel="Start Video"
          enabledIcon={Video}
          disabledIcon={VideoOff}
          enabledClassName="bg-green-500/20 text-green-500 hover:bg-green-500/30 hover:text-green-500"
          onClick={toggleWebcam}
          disabled={!permissions.canWebcam}
        />

        {isScreenShareSupported && (
          <ControlToggleButton
            enabled={ownVoiceState.sharingScreen}
            enabledLabel="Stop Sharing"
            disabledLabel="Share Screen"
            enabledIcon={ScreenShareOff}
            disabledIcon={Monitor}
            enabledClassName="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 hover:text-blue-500"
            onClick={toggleScreenShare}
            disabled={!permissions.canShareScreen}
          />
        )}
      </div>
      <Tooltip content="Disconnect" sideOffset={-2} usePortal={false}>
        <Button
          className={cn(
            'inline-flex h-full min-w-11 items-center justify-center rounded px-3 border border-border',
            'pointer-events-auto text-white shadow-xl transition-all',
            'bg-[#ec4245] hover:bg-[#da373c]'
          )}
          onClick={() => leaveVoice()}
          aria-label="Disconnect"
        >
          <PhoneOff className="size-4" fill="currentColor" />
        </Button>
      </Tooltip>
    </div>
  );
});

export { ControlsBar };
