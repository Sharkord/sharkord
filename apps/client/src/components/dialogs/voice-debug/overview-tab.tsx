import type {
  TVoiceDebugConsumer,
  TVoiceDebugEvent,
  TVoiceDebugProducer,
  TVoiceDebugSnapshot,
  TVoiceDebugStat,
  TVoiceDebugTransport
} from '@/helpers/voice-debug';
import { memo } from 'react';
import {
  describeCandidate,
  findStatById,
  formatBitrate,
  formatBytes,
  formatSeconds,
  formatTime,
  formatValue,
  getSelectedCandidatePair,
  getStateTone,
  statsByType
} from './helpers';
import { Pill, Section } from './parts';

type TRates = Record<string, number>;

const getRate = (rates: TRates, stat: TVoiceDebugStat | undefined) =>
  typeof stat?.id === 'string' ? rates[stat.id] : undefined;

const emptyPairLabel = (transport: TVoiceDebugTransport) => {
  if (transport.closed) return 'transport closed';

  if (transport.connectionState === 'new') {
    return 'not negotiated yet, nothing has been sent or consumed on it';
  }

  return 'no candidate pair selected, ICE never completed';
};

const TrackPills = memo(
  ({ track }: { track: TVoiceDebugProducer['track'] }) => {
    if (!track) return <Pill label="track" value="none" tone="bad" />;

    const { width, height, frameRate } = track.settings;

    return (
      <>
        <Pill
          label="track"
          value={track.readyState}
          tone={track.readyState === 'live' ? 'ok' : 'bad'}
        />
        {track.muted && <Pill label="muted" value="yes" tone="warn" />}
        {!!width && !!height && (
          <Pill label="size" value={`${width}x${height}`} />
        )}
        {!!frameRate && <Pill label="fps" value={Math.round(frameRate)} />}
      </>
    );
  }
);

const TransportOverview = memo(
  ({
    transport,
    rates
  }: {
    transport: TVoiceDebugTransport;
    rates: TRates;
  }) => {
    const transportStat = statsByType(transport.stats, 'transport')[0];
    const pair = getSelectedCandidatePair(transport.stats);
    const local = findStatById(transport.stats, pair?.localCandidateId);
    const remote = findStatById(transport.stats, pair?.remoteCandidateId);

    return (
      <Section
        title={`${transport.role} transport · ${transport.id}`}
        actions={
          <>
            <Pill
              label="state"
              value={transport.connectionState}
              tone={getStateTone(transport.connectionState)}
            />
            <Pill
              label="ice"
              value={formatValue(transportStat?.iceState ?? pair?.state)}
              tone={getStateTone(transportStat?.iceState ?? pair?.state)}
            />
            <Pill
              label="dtls"
              value={formatValue(transportStat?.dtlsState)}
              tone={getStateTone(transportStat?.dtlsState)}
            />
            {transport.closed && <Pill label="closed" value="yes" tone="bad" />}
          </>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          <Pill label="rate" value={formatBitrate(getRate(rates, pair))} />
          <Pill label="rtt" value={formatSeconds(pair?.currentRoundTripTime)} />
          <Pill
            label="avail out"
            value={formatBitrate(
              typeof pair?.availableOutgoingBitrate === 'number'
                ? pair.availableOutgoingBitrate
                : undefined
            )}
          />
          <Pill label="sent" value={formatBytes(pair?.bytesSent)} />
          <Pill label="recv" value={formatBytes(pair?.bytesReceived)} />
          <Pill
            label="consent req"
            value={formatValue(pair?.consentRequestsSent)}
          />
        </div>
        <p className="break-all font-mono text-[11px] text-muted-foreground">
          {pair &&
            `${describeCandidate(local)}  →  ${describeCandidate(remote)}`}
          {!pair && emptyPairLabel(transport)}
        </p>
      </Section>
    );
  }
);

const ProducerOverview = memo(
  ({ producer, rates }: { producer: TVoiceDebugProducer; rates: TRates }) => {
    const outbound = statsByType(producer.stats, 'outbound-rtp');
    const remoteInbound = statsByType(producer.stats, 'remote-inbound-rtp')[0];

    return (
      <Section
        title={`producer · ${producer.kind}`}
        actions={
          <>
            <Pill
              label="state"
              value={producer.closed ? 'closed' : 'open'}
              tone={producer.closed ? 'bad' : 'ok'}
            />
            {producer.paused && <Pill label="paused" value="yes" tone="warn" />}
            <Pill label="codec" value={producer.codec ?? '–'} />
            <TrackPills track={producer.track} />
          </>
        }
      >
        {outbound.map((stat, index) => (
          <div
            key={typeof stat.id === 'string' ? stat.id : index}
            className="flex flex-wrap gap-1.5"
          >
            {!!stat.rid && <Pill label="rid" value={String(stat.rid)} />}
            <Pill label="rate" value={formatBitrate(getRate(rates, stat))} />
            <Pill
              label="size"
              value={`${formatValue(stat.frameWidth)}x${formatValue(stat.frameHeight)}`}
            />
            <Pill label="fps" value={formatValue(stat.framesPerSecond)} />
            <Pill label="sent" value={formatBytes(stat.bytesSent)} />
            <Pill
              label="retx"
              value={formatValue(stat.retransmittedPacketsSent)}
            />
            <Pill label="nack" value={formatValue(stat.nackCount)} />
            <Pill label="pli" value={formatValue(stat.pliCount)} />
            {!!stat.qualityLimitationReason &&
              stat.qualityLimitationReason !== 'none' && (
                <Pill
                  label="limited by"
                  value={String(stat.qualityLimitationReason)}
                  tone="warn"
                />
              )}
          </div>
        ))}
        {!outbound.length && (
          <p className="font-mono text-[11px] text-muted-foreground">
            no outbound-rtp reported, nothing is being sent
          </p>
        )}
        {!!remoteInbound && (
          <div className="flex flex-wrap gap-1.5">
            <Pill
              label="peer lost"
              value={formatValue(remoteInbound.packetsLost)}
              tone={
                typeof remoteInbound.packetsLost === 'number' &&
                remoteInbound.packetsLost > 0
                  ? 'warn'
                  : 'muted'
              }
            />
            <Pill
              label="peer jitter"
              value={formatSeconds(remoteInbound.jitter)}
            />
            <Pill
              label="peer rtt"
              value={formatSeconds(remoteInbound.roundTripTime)}
            />
          </div>
        )}
      </Section>
    );
  }
);

const ConsumerOverview = memo(
  ({ consumer, rates }: { consumer: TVoiceDebugConsumer; rates: TRates }) => {
    const inbound = statsByType(consumer.stats, 'inbound-rtp')[0];

    return (
      <Section
        title={`consumer · user ${consumer.remoteId} · ${consumer.kind}`}
        actions={
          <>
            <Pill
              label="state"
              value={consumer.closed ? 'closed' : 'open'}
              tone={consumer.closed ? 'bad' : 'ok'}
            />
            {consumer.paused && <Pill label="paused" value="yes" tone="warn" />}
            <Pill label="codec" value={consumer.codec ?? '–'} />
            <TrackPills track={consumer.track} />
          </>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          <Pill label="rate" value={formatBitrate(getRate(rates, inbound))} />
          <Pill label="recv" value={formatBytes(inbound?.bytesReceived)} />
          <Pill
            label="lost"
            value={formatValue(inbound?.packetsLost)}
            tone={
              typeof inbound?.packetsLost === 'number' &&
              inbound.packetsLost > 0
                ? 'warn'
                : 'muted'
            }
          />
          <Pill label="jitter" value={formatSeconds(inbound?.jitter)} />
          <Pill label="decoded" value={formatValue(inbound?.framesDecoded)} />
          <Pill
            label="freezes"
            value={formatValue(inbound?.freezeCount)}
            tone={
              typeof inbound?.freezeCount === 'number' &&
              inbound.freezeCount > 0
                ? 'warn'
                : 'muted'
            }
          />
        </div>
      </Section>
    );
  }
);

type TOverviewTabProps = {
  snapshot: TVoiceDebugSnapshot;
  rates: TRates;
  connectionEvents: TVoiceDebugEvent[];
};

const OverviewTab = memo(
  ({ snapshot, rates, connectionEvents }: TOverviewTabProps) => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <Pill
          label="session"
          value={snapshot.hasSession ? 'active' : 'none'}
          tone={snapshot.hasSession ? 'ok' : 'muted'}
        />
        <Pill label="transports" value={snapshot.transports.length} />
        <Pill label="producers" value={snapshot.producers.length} />
        <Pill label="consumers" value={snapshot.consumers.length} />
        <Pill label="router codecs" value={snapshot.routerCodecs.length} />
        <Pill label="device codecs" value={snapshot.deviceCodecs.length} />
      </div>

      <Section title="connection">
        {!connectionEvents.length && (
          <p className="font-mono text-[11px] text-muted-foreground">
            no socket events recorded
          </p>
        )}
        {connectionEvents.map((event) => (
          <p key={event.id} className="break-all font-mono text-[11px]">
            <span className="text-muted-foreground">
              {formatTime(event.at)}
            </span>{' '}
            <span
              className={
                event.category === 'error'
                  ? 'text-destructive'
                  : 'text-amber-500'
              }
            >
              {event.message}
            </span>{' '}
            <span className="text-muted-foreground">{event.data}</span>
          </p>
        ))}
      </Section>

      {snapshot.collectErrors.map((error) => (
        <p
          key={error}
          className="break-all font-mono text-[11px] text-destructive"
        >
          {error}
        </p>
      ))}

      {!snapshot.hasSession && (
        <p className="font-mono text-[11px] text-muted-foreground">
          no voice provider mounted, join a voice channel. the events tab still
          holds the history.
        </p>
      )}

      {snapshot.transports.map((transport) => (
        <TransportOverview
          key={transport.id}
          transport={transport}
          rates={rates}
        />
      ))}

      {snapshot.producers.map((producer) => (
        <ProducerOverview key={producer.id} producer={producer} rates={rates} />
      ))}

      {snapshot.consumers.map((consumer) => (
        <ConsumerOverview key={consumer.id} consumer={consumer} rates={rates} />
      ))}
    </div>
  )
);

export { OverviewTab };
