import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission } from '@sharkord/shared';
import {
  AlertTriangle,
  Loader2,
  Monitor,
  MonitorOff,
  PhoneOff,
  Video,
  VideoOff,
  Wifi,
  WifiOff
} from 'lucide-react';
import { memo, useMemo } from 'react';
import { ExternalAudioStreams } from '../channel-view/voice/external-audio-streams';
import { VoiceAudioStreams } from '../channel-view/voice/voice-audio-streams';
import { Button } from '../ui/button';
import { StatsPopover } from './stats-popover';

const VoiceControl = memo(() => {
  const voiceChannelId = useCurrentVoiceChannelId();
  const channelCan = useChannelCan(voiceChannelId);
  const { ownVoiceState, toggleWebcam, toggleScreenShare, connectionStatus } =
    useVoice();

  const connectionInfo = useMemo(() => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: 'Connecting...',
          color: 'text-yellow-500'
        };
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4 text-green-600" />,
          text: 'Voice connected',
          color: 'text-green-600'
        };
      case 'failed':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          text: 'Connection failed',
          color: 'text-red-500'
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="h-4 w-4 text-red-500" />,
          text: 'Disconnected',
          color: 'text-red-500'
        };
    }
  }, [connectionStatus]);

  if (!voiceChannelId) {
    return null;
  }

  return (
    <>
      <VoiceAudioStreams channelId={voiceChannelId} />
      <ExternalAudioStreams channelId={voiceChannelId} />
      <div className="bg-secondary/30 border-t border-border">
        <StatsPopover>
          <div className="flex items-center px-2 py-1.5 gap-2 bg-secondary/50 cursor-pointer hover:bg-secondary/60 transition-colors">
            {connectionInfo.icon}
            <span className={cn('text-xs font-medium', connectionInfo.color)}>
              {connectionInfo.text}
            </span>
          </div>
        </StatsPopover>

        <div className="flex items-center justify-between px-2 py-2">
          <Button variant="outline" size="sm" onClick={leaveVoice}>
            <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
            Disconnect
          </Button>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-md transition-all duration-200',
                ownVoiceState.webcamEnabled
                  ? 'bg-green-500/15 hover:bg-green-500/25 text-green-400 hover:text-green-300'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
              )}
              onClick={toggleWebcam}
              title={
                ownVoiceState.webcamEnabled
                  ? 'Turn off camera'
                  : 'Turn on camera'
              }
              disabled={!channelCan(ChannelPermission.WEBCAM)}
            >
              {ownVoiceState.webcamEnabled ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-md transition-all duration-200',
                ownVoiceState.sharingScreen
                  ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 hover:text-blue-300'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
              )}
              onClick={toggleScreenShare}
              title={
                ownVoiceState.sharingScreen
                  ? 'Stop screen share'
                  : 'Start screen share'
              }
              disabled={!channelCan(ChannelPermission.SHARE_SCREEN)}
            >
              {ownVoiceState.sharingScreen ? (
                <Monitor className="h-4 w-4" />
              ) : (
                <MonitorOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
});

export { VoiceControl };
