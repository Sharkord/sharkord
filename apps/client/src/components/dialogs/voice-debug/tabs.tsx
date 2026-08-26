import type {
  TVoiceDebugEvent,
  TVoiceDebugSnapshot
} from '@/helpers/voice-debug';
import { cn } from '@sharkord/ui';
import { memo, useEffect, useRef } from 'react';
import { formatTime, statsByType } from './helpers';
import { Fields, Pill, Section, StatGroup } from './parts';

type TSnapshotTabProps = {
  snapshot: TVoiceDebugSnapshot;
};

const TransportsTab = memo(({ snapshot }: TSnapshotTabProps) => (
  <div className="space-y-3">
    {!snapshot.transports.length && (
      <p className="font-mono text-[11px] text-muted-foreground">
        no transports
      </p>
    )}
    {snapshot.transports.map((transport) => (
      <Section
        key={transport.id}
        title={`${transport.role} transport · ${transport.direction}`}
        actions={<Pill label="stats" value={transport.stats.length} />}
      >
        <StatGroup
          stats={[
            ...statsByType(transport.stats, 'transport'),
            ...statsByType(transport.stats, 'candidate-pair'),
            ...statsByType(transport.stats, 'local-candidate'),
            ...statsByType(transport.stats, 'remote-candidate')
          ]}
          emptyLabel="no ICE stats, the transport is closed"
        />
      </Section>
    ))}
  </div>
));

const ProducersTab = memo(({ snapshot }: TSnapshotTabProps) => (
  <div className="space-y-3">
    {!snapshot.producers.length && (
      <p className="font-mono text-[11px] text-muted-foreground">
        no producers
      </p>
    )}
    {snapshot.producers.map((producer) => (
      <Section
        key={producer.id}
        title={`producer · ${producer.kind} · ${producer.id}`}
        actions={<Pill label="encodings" value={producer.encodings.length} />}
      >
        <Fields
          data={{
            mediaKind: producer.mediaKind,
            closed: producer.closed,
            paused: producer.paused,
            maxSpatialLayer: producer.maxSpatialLayer,
            codec: producer.codec,
            ...producer.track,
            ...producer.track?.settings
          }}
        />
        <StatGroup
          stats={producer.stats}
          emptyLabel="no stats, the producer is closed"
        />
      </Section>
    ))}
  </div>
));

const ConsumersTab = memo(({ snapshot }: TSnapshotTabProps) => (
  <div className="space-y-3">
    {!snapshot.consumers.length && (
      <p className="font-mono text-[11px] text-muted-foreground">
        no consumers
      </p>
    )}
    {snapshot.consumers.map((consumer) => (
      <Section
        key={consumer.id}
        title={`consumer · user ${consumer.remoteId} · ${consumer.kind}`}
        actions={<Pill label="producer" value={consumer.producerId} />}
      >
        <Fields
          data={{
            mediaKind: consumer.mediaKind,
            closed: consumer.closed,
            paused: consumer.paused,
            codec: consumer.codec,
            ...consumer.track,
            ...consumer.track?.settings
          }}
        />
        <StatGroup
          stats={consumer.stats}
          emptyLabel="no stats, the consumer is closed"
        />
      </Section>
    ))}
  </div>
));

const EVENT_CLASSES: Record<TVoiceDebugEvent['category'], string> = {
  voice: 'text-primary',
  warn: 'text-amber-500',
  error: 'text-destructive',
  ws: 'text-sky-500'
};

const EventRow = memo(({ event }: { event: TVoiceDebugEvent }) => (
  <div className="flex items-start gap-2 rounded px-2 py-0.5 font-mono text-[11px] hover:bg-muted/50">
    <span className="shrink-0 text-muted-foreground">
      {formatTime(event.at)}
    </span>
    <span className={cn('w-11 shrink-0', EVENT_CLASSES[event.category])}>
      {event.category}
    </span>
    <span className="min-w-0 max-w-[40%] break-all">{event.message}</span>
    {!!event.data && (
      <span className="min-w-0 flex-1 break-all text-muted-foreground">
        {event.data}
      </span>
    )}
  </div>
));

const EventsTab = memo(({ events }: { events: TVoiceDebugEvent[] }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, []);

  return (
    <div className="space-y-0.5">
      {!events.length && (
        <p className="font-mono text-[11px] text-muted-foreground">no events</p>
      )}
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
});

const RawTab = memo(({ json }: { json: string }) => (
  <pre className="font-mono text-[11px] whitespace-pre-wrap break-all">
    {json}
  </pre>
));

export { ConsumersTab, EventsTab, ProducersTab, RawTab, TransportsTab };
