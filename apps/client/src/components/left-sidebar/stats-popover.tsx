import { useVoice } from '@/features/server/voice/hooks';
import { formatBigNumber } from '@/helpers/format-big-number';
import { Popover, PopoverContent, PopoverTrigger } from '@sharkord/ui';
import { filesize } from 'filesize';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

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

const getCodecLabel = (codec: string) => {
  const parts = codec.split('/');

  return parts.length > 1 ? parts[1] : codec;
};

type StatsLabelValueProps = {
  text?: string;
  label?: string;
  value?: React.ReactNode;
  valueClassName?: string;
};

const StatsLabelValue = memo(
  ({ text, label, value, valueClassName }: StatsLabelValueProps) => {
    let resolvedLabel = label;
    let resolvedValue = value;

    if (text) {
      const [textLabel, ...valueParts] = text.split(':');
      const textValue = valueParts.join(':').trim();

      if (!textValue) return text;

      resolvedLabel = textLabel;
      resolvedValue = textValue;
    }

    if (!resolvedLabel || resolvedValue === undefined) return null;

    return (
      <>
        <span className="text-muted-foreground">{resolvedLabel}:</span>{' '}
        <span className={valueClassName ?? 'text-foreground'}>
          {resolvedValue}
        </span>
      </>
    );
  }
);

StatsLabelValue.displayName = 'StatsLabelValue';

const StatsPopover = memo(({ children }: StatsPopoverProps) => {
  const { t } = useTranslation('sidebar');
  const { transportStats } = useVoice();
  const [showSimulcastLayers, setShowSimulcastLayers] = useState(false);

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
        label: t('gpuEncoder', { encoder: screenShare.encoderImplementation }),
        isHardware: true
      };
    }

    if (softwareEncoders.some((sw) => lowerImpl.includes(sw))) {
      return {
        label: t('cpuEncoder', { encoder: screenShare.encoderImplementation }),
        isHardware: false
      };
    }

    return {
      label: t('unknownEncoder', {
        encoder: screenShare.encoderImplementation
      }),
      isHardware: null
    };
  }, [screenShare?.encoderImplementation, t]);

  const codec = useMemo(() => {
    return screenShare?.codec ? getCodecLabel(screenShare.codec) : undefined;
  }, [screenShare?.codec]);

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="start" className="p-0">
        <div className="w-72 p-3 text-xs">
          <h3 className="font-semibold text-sm mb-2 text-foreground">
            {t('transportStats')}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <h4 className="font-medium text-green-400 mb-1">
                {t('outgoing')}
              </h4>
              {producer ? (
                <div className="space-y-1">
                  <div>
                    <StatsLabelValue
                      text={t('rate', { rate: filesize(currentBitrateSent) })}
                    />
                  </div>
                  <div>
                    <StatsLabelValue
                      text={t('packets', {
                        packets: formatBigNumber(producer.packetsSent)
                      })}
                    />
                  </div>
                  <div>
                    <StatsLabelValue
                      text={t('rtt', { rtt: producer.rtt.toFixed(1) })}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">{t('noData')}</div>
              )}
            </div>

            <div>
              <h4 className="font-medium text-cyan-400 mb-1">
                {t('incoming')}
              </h4>
              {consumer ? (
                <div className="space-y-1">
                  <div>
                    <StatsLabelValue
                      text={t('rate', {
                        rate: filesize(currentBitrateReceived)
                      })}
                    />
                  </div>
                  <div>
                    <StatsLabelValue
                      text={t('packets', {
                        packets: formatBigNumber(consumer.packetsReceived)
                      })}
                    />
                  </div>
                  {consumer.packetsLost > 0 && (
                    <div>
                      <StatsLabelValue
                        text={t('packetsLost', {
                          lost: formatBigNumber(consumer.packetsLost)
                        })}
                        valueClassName="text-red-400"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  {t('noRemoteStreams')}
                </div>
              )}
            </div>
          </div>

          {screenShare && (
            <div className="border-t border-border/50 pt-2 mb-3">
              <h4 className="font-medium text-blue-400 mb-1">
                {t('screenShare')}
              </h4>
              <div className="space-y-1">
                {screenShare.codec && (
                  <div>
                    <StatsLabelValue text={t('codec', { codec })} />
                  </div>
                )}
                {encoder && (
                  <div>
                    <StatsLabelValue
                      label={t('encoder').replace(/:$/, '')}
                      value={encoder.label}
                      valueClassName={
                        encoder.isHardware === true
                          ? 'text-green-400'
                          : encoder.isHardware === false
                            ? 'text-yellow-400'
                            : undefined
                      }
                    />
                  </div>
                )}
                <div>
                  <StatsLabelValue
                    text={t('resolution', {
                      width: screenShare.width,
                      height: screenShare.height
                    })}
                  />
                </div>
                <div>
                  <StatsLabelValue
                    text={t('frameRate', {
                      fps: Math.round(screenShare.frameRate)
                    })}
                  />
                </div>
                <div>
                  <StatsLabelValue
                    text={t('bitrate', {
                      bitrate: filesize(screenShare.bitrate)
                    })}
                  />
                </div>
                {screenShare.simulcast && screenShare.layers.length > 1 && (
                  <div>
                    <button
                      className="text-left hover:underline"
                      type="button"
                      onClick={() => setShowSimulcastLayers((show) => !show)}
                    >
                      <StatsLabelValue
                        text={t('simulcastLayers', {
                          count: screenShare.layers.length
                        })}
                      />
                    </button>
                    {showSimulcastLayers && (
                      <div className="mt-2 space-y-2">
                        {screenShare.layers.map((layer, index) => (
                          <div
                            key={layer.id}
                            className="space-y-1 rounded-md border border-border/50 p-2"
                          >
                            <div className="border-b border-border/50 pb-1 font-medium text-foreground">
                              {t('simulcastLayer', {
                                layer: layer.rid || index + 1
                              })}
                              {layer.codec &&
                                ` (${getCodecLabel(layer.codec)})`}
                            </div>
                            <div>
                              <StatsLabelValue
                                text={t('resolution', {
                                  width: layer.width,
                                  height: layer.height
                                })}
                              />
                            </div>
                            <div>
                              <StatsLabelValue
                                text={t('frameRate', {
                                  fps: Math.round(layer.frameRate)
                                })}
                              />
                            </div>
                            <div>
                              <StatsLabelValue
                                text={t('bitrate', {
                                  bitrate: filesize(layer.bitrate)
                                })}
                              />
                            </div>
                            <div>
                              <StatsLabelValue
                                text={t('packets', {
                                  packets: formatBigNumber(layer.packetsSent)
                                })}
                              />
                            </div>
                            {layer.qualityLimitationReason !== 'none' && (
                              <div>
                                <StatsLabelValue
                                  text={t('qualityLimited', {
                                    reason: layer.qualityLimitationReason
                                  })}
                                  valueClassName="text-yellow-400"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <StatsLabelValue
                    text={t('framesEncoded', {
                      frames: formatBigNumber(screenShare.framesEncoded)
                    })}
                  />
                </div>
                {screenShare.qualityLimitationReason !== 'none' && (
                  <div>
                    <StatsLabelValue
                      text={t('qualityLimited', {
                        reason: screenShare.qualityLimitationReason
                      })}
                      valueClassName="text-yellow-400"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-border/50 pt-2">
            <h4 className="font-medium text-yellow-400 mb-1">
              {t('sessionTotals')}
            </h4>
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
