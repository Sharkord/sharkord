import { useVoice } from '@/features/server/voice/hooks';
import { filesize } from 'filesize';
import { memo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

type StatsPopoverProps = {
  children: React.ReactNode;
};

const StatsPopover = memo(({ children }: StatsPopoverProps) => {
  const { transportStats } = useVoice();

  const {
    producer,
    consumer,
    totalBytesSent,
    totalBytesReceived,
    currentBitrateSent,
    currentBitrateReceived
  } = transportStats;

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
                  <div>Packets: {producer.packetsSent}</div>
                  <div>RTT: {producer.rtt.toFixed(1)} ms</div>
                </div>
              ) : (
                <div className="text-muted-foreground">No data</div>
              )}
            </div>

            <div>
              <h4 className="font-medium text-blue-400 mb-1">Incoming</h4>
              {consumer ? (
                <div className="space-y-1 text-muted-foreground">
                  <div>Rate: {filesize(currentBitrateReceived)}/s</div>
                  <div>Packets: {consumer.packetsReceived}</div>
                  {consumer.packetsLost > 0 && (
                    <div className="text-red-400">
                      Lost: {consumer.packetsLost}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">No remote streams</div>
              )}
            </div>
          </div>
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
