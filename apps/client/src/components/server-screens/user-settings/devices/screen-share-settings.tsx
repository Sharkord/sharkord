import {
  Resolution,
  type TDeviceSettings,
  type TScreenShareTransport
} from '@/types';
import {
  Group,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch
} from '@sharkord/ui';
import { filesize } from 'filesize';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ResolutionFpsControl } from './resolution-fps-control';

type TScreenShareSettingsProps = {
  resolution: TDeviceSettings['screenResolution'];
  framerate: TDeviceSettings['screenFramerate'];
  bitrate: TDeviceSettings['screenBitrate'];
  shareSystemAudio: TDeviceSettings['shareSystemAudio'];
  transport: TScreenShareTransport;
  maxBitrate: number;
  onResolutionChange: (value: Resolution) => void;
  onFramerateChange: (value: number) => void;
  onBitrateChange: (value: number) => void;
  onShareSystemAudioChange: (value: boolean) => void;
  onTransportChange: (value: TScreenShareTransport) => void;
};

const ScreenShareSettings = memo(
  ({
    resolution,
    framerate,
    bitrate,
    shareSystemAudio,
    transport,
    maxBitrate,
    onResolutionChange,
    onFramerateChange,
    onBitrateChange,
    onShareSystemAudioChange,
    onTransportChange
  }: TScreenShareSettingsProps) => {
    const { t } = useTranslation('settings');
    const handleResolutionChange = useCallback(
      (value: string) => onResolutionChange(value as Resolution),
      [onResolutionChange]
    );
    const handleTransportChange = useCallback(
      (value: TScreenShareTransport) => onTransportChange(value),
      [onTransportChange]
    );
    const handleBitrateChange = useCallback(
      (value: number[]) => {
        const nextBitrate = value[0];

        if (nextBitrate !== undefined) onBitrateChange(nextBitrate);
      },
      [onBitrateChange]
    );

    return (
      <div className="space-y-4">
        <ResolutionFpsControl
          resolution={resolution}
          framerate={framerate}
          onResolutionChange={handleResolutionChange}
          onFramerateChange={onFramerateChange}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t('maxBitrateLabel')}</span>
          <Slider
            className="max-w-96"
            min={200}
            max={maxBitrate}
            step={100}
            value={[bitrate]}
            onValueChange={handleBitrateChange}
            rightSlot={
              <span className="w-20 text-right text-sm text-muted-foreground">
                {filesize(bitrate * 125, { bits: true })}/s
              </span>
            }
          />
        </div>

        <Group
          label={t('shareSystemAudioLabel')}
          description={t('shareSystemAudioDesc')}
        >
          <Switch
            checked={shareSystemAudio}
            onCheckedChange={onShareSystemAudioChange}
          />
        </Group>

        <Group
          label={t('screenShareTransportLabel')}
          description={t('screenShareTransportDescription')}
        >
          <Select value={transport} onValueChange={handleTransportChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="server">{t('screenShareServer')}</SelectItem>
                <SelectItem value="direct">{t('screenShareDirect')}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Group>
      </div>
    );
  }
);

export { ScreenShareSettings };
