import { useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import {
  useAlwaysShowVoiceControls,
  useOwnVoiceState,
  useVoice
} from '@/features/server/voice/hooks';
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
import { memo, useCallback, useMemo } from 'react';
import { ControlToggleButton } from './control-toggle-button';
import { WhipIngestButton } from './whip-ingest-button';

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
  const alwaysShowControls = useAlwaysShowVoiceControls();

  const permissions = useMemo(
    () => ({
      canSpeak: channelCan(ChannelPermission.SPEAK),
      canWebcam: channelCan(ChannelPermission.WEBCAM),
      canShareScreen: channelCan(ChannelPermission.SHARE_SCREEN)
    }),
    [channelCan]
  );

  const barClass = alwaysShowControls
    ? 'relative -mt-3'
    : 'absolute bottom-0 left-0 right-0 transition-all duration-300 ease-in-out invisible opacity-0 translate-y-4 group-hover/voice-stage:visible group-hover/voice-stage:opacity-100 group-hover/voice-stage:translate-y-0';

  const handleLeaveVoice = useCallback(() => {
    leaveVoice();
  }, []);

  return (
    <div
      className={cn(
        'flex justify-center items-center pointer-events-none gap-2 p-3',
        barClass
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
          enabledLabel="Undeafen"
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

        <WhipIngestButton
          channelId={channelId}
          className={
            permissions.canShareScreen
              ? undefined
              : 'opacity-50 pointer-events-none'
          }
        />
      </div>
      <Tooltip content="Disconnect">
        <Button
          className={cn(
            'inline-flex h-full min-w-11 items-center justify-center rounded px-3 border border-border',
            'pointer-events-auto text-white shadow-xl transition-all',
            'bg-[#ec4245] hover:bg-[#da373c]'
          )}
          onClick={handleLeaveVoice}
          aria-label="Disconnect"
        >
          <PhoneOff className="size-4" fill="currentColor" />
        </Button>
      </Tooltip>
    </div>
  );
});

export { ControlsBar };
