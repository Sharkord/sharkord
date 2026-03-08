import { useVoice } from '@/features/server/voice/hooks';
import { formatBigNumber } from '@/helpers/format-big-number';
import { Popover, PopoverContent, PopoverTrigger } from '@sharkord/ui';
import { filesize } from 'filesize';
import { memo, useMemo } from 'react';

type StatsPopoverProps = {
  children: React.ReactNode;
};

const hardwareEncoders = [
  'external',
  'hardware',
  'nvenc',
  'vaapi',
  'videotoolbox',
  'qsv',
  'amf',
  'mediacodec'
];

const softwareEncoders = ['libvpx', 'openh264', 'libaom', 'software'];

const StatsPopover = memo(({ children }: StatsPopoverProps) => {
  const { transportStats } = useVoice();

  const {
    producer,
    consumer,
    screenShare,
    totalBytesSent,
    totalBytesReceived,
    currentBitrateSent,
    currentBitrateReceived
  } = transportStats;

  const encoder = useMemo(() => {
    if (!screenShare?.encoderImplementation) return null;

    const lowerImpl = screenShare?.encoderImplementation.toLowerCase();

    if (hardwareEncoders.some((hw) => lowerImpl.includes(hw))) {
      return {
        label: `GPU (${screenShare.encoderImplementation})`,
        isHardware: true
      };
    }

    if (softwareEncoders.some((sw) => lowerImpl.includes(sw))) {
      return {
        label: `CPU (${screenShare.encoderImplementation})`,
        isHardware: false
      };
    }

    return {
      label: `Unknown (${screenShare.encoderImplementation})`,
      isHardware: null
    };
  }, [screenShare?.encoderImplementation]);

  const codec = useMemo(() => {
    const parts = screenShare?.codec.split('/');

    return parts && parts.length > 1 ? parts[1] : screenShare?.codec;
  }, [screenShare?.codec]);

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="start" className="p-0">
        <div className="w-72 p-3 text-xs">
          <h3 className="font-semibold text-sm mb-2 text-foreground">
            Transport Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <h4 className="font-medium text-green-400 mb-1">Outgoing</h4>
              {producer ? (
                <div className="space-y-1 text-muted-foreground">
                  <div>Rate: {filesize(currentBitrateSent)}/s</div>
                  <div>Packets: {formatBigNumber(producer.packetsSent)}</div>
                  <div>RTT: {producer.rtt.toFixed(1)} ms</div>
                </div>
              ) : (
                <div className="text-muted-foreground">No data</div>
              )}
            </div>

            <div>
              <h4 className="font-medium text-cyan-400 mb-1">Incoming</h4>
              {consumer ? (
                <div className="space-y-1 text-muted-foreground">
                  <div>Rate: {filesize(currentBitrateReceived)}/s</div>
                  <div>
                    Packets: {formatBigNumber(consumer.packetsReceived)}
                  </div>
                  {consumer.packetsLost > 0 && (
                    <div className="text-red-400">
                      Lost: {formatBigNumber(consumer.packetsLost)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">No remote streams</div>
              )}
            </div>
          </div>

          {screenShare && (
            <div className="border-t border-border/50 pt-2 mb-3">
              <h4 className="font-medium text-blue-400 mb-1">Screen Share</h4>
              <div className="space-y-1 text-muted-foreground">
                {screenShare.codec && <div>Codec: {codec}</div>}
                {encoder && (
                  <div>
                    Encoder:{' '}
                    <span
                      className={
                        encoder.isHardware === true
                          ? 'text-green-400'
                          : encoder.isHardware === false
                            ? 'text-yellow-400'
                            : undefined
                      }
                    >
                      {encoder.label}
                    </span>
                  </div>
                )}
                <div>
                  Resolution: {screenShare.width}x{screenShare.height}
                </div>
                <div>Frame Rate: {Math.round(screenShare.frameRate)} fps</div>
                <div>Bitrate: {filesize(screenShare.bitrate)}/s</div>
                <div>
                  Frames Encoded: {formatBigNumber(screenShare.framesEncoded)}
                </div>
                {screenShare.qualityLimitationReason !== 'none' && (
                  <div className="text-yellow-400">
                    Quality Limited: {screenShare.qualityLimitationReason}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-border/50 pt-2">
            <h4 className="font-medium text-yellow-400 mb-1">Session Totals</h4>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div>↑ {filesize(totalBytesSent)}</div>
              <div>↓ {filesize(totalBytesReceived)}</div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

export { StatsPopover };
