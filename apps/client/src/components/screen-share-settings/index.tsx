import { ResolutionFpsControl } from '@/components/resolution-fps-control';
import { usePublicServerSettings } from '@/features/server/hooks';
import {
  getRestrictOwnAudioSupport,
  getSuppressLocalAudioPlaybackSupport
} from '@/helpers/get-display-media-support';
import {
  Resolution,
  ScreenContentHint,
  ScreenCursor,
  VideoCodec,
  type TDeviceSettings
} from '@/types';
import { DEFAULT_BITRATE } from '@sharkord/shared';
import {
  DetailsSection,
  Group,
  Label,
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
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RestrictOwnAudioAlert } from './restrict-own-audio-alert';
import { SuppressLocalAudioPlaybackAlert } from './suppress-local-audio-playback-alert';

type TScreenShareSettingsProps = {
  values: TDeviceSettings;
  onChange: <K extends keyof TDeviceSettings>(
    key: K,
    value: TDeviceSettings[K]
  ) => void;
};

const ScreenShareSettings = memo(
  ({ values, onChange }: TScreenShareSettingsProps) => {
    const { t } = useTranslation('settings');
    const settings = usePublicServerSettings();
    const isRestrictOwnAudioSupported = useMemo(
      () => getRestrictOwnAudioSupport(),
      []
    );
    const isSuppressLocalAudioPlaybackSupported = useMemo(
      () => getSuppressLocalAudioPlaybackSupport(),
      []
    );
    const maxBitrate = useMemo(
      () => (settings?.webRtcMaxBitrate ? settings.webRtcMaxBitrate / 1000 : 0),
      [settings?.webRtcMaxBitrate]
    );
    const bitrate = values.screenBitrate ?? DEFAULT_BITRATE;

    const handleFramerateChange = useCallback(
      (value: number) => onChange('screenFramerate', value),
      [onChange]
    );

    const handleResolutionChange = useCallback(
      (value: string) => onChange('screenResolution', value as Resolution),
      [onChange]
    );

    const handleCodecChange = useCallback(
      (value: string) => onChange('screenCodec', value as VideoCodec),
      [onChange]
    );

    const handleCursorChange = useCallback(
      (value: string) => onChange('screenCursor', value as ScreenCursor),
      [onChange]
    );

    const handleContentHintChange = useCallback(
      (value: string) =>
        onChange('screenContentHint', value as ScreenContentHint),
      [onChange]
    );

    const handleBitrateChange = useCallback(
      ([value]: number[]) => onChange('screenBitrate', value),
      [onChange]
    );

    const handleRestrictOwnAudioChange = useCallback(
      (checked: boolean) => onChange('restrictOwnAudio', checked),
      [onChange]
    );

    const handleSuppressLocalAudioPlaybackChange = useCallback(
      (checked: boolean) => onChange('suppressLocalAudioPlayback', checked),
      [onChange]
    );

    return (
      <>
        <div className="flex">
          <ResolutionFpsControl
            framerate={values.screenFramerate}
            resolution={values.screenResolution}
            onFramerateChange={handleFramerateChange}
            onResolutionChange={handleResolutionChange}
          />

          <div className="ml-2">
            <Select
              value={values.screenCodec ?? VideoCodec.AUTO}
              onValueChange={handleCodecChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('selectCodecPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={VideoCodec.AUTO}>Auto</SelectItem>
                  <SelectItem value={VideoCodec.VP8}>VP8</SelectItem>
                  <SelectItem value={VideoCodec.VP9}>VP9</SelectItem>
                  <SelectItem value={VideoCodec.H264}>H264</SelectItem>
                  <SelectItem value={VideoCodec.AV1}>AV1</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Group label={t('screenCursorLabel')}>
          <Select
            value={values.screenCursor ?? ScreenCursor.ALWAYS}
            onValueChange={handleCursorChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ScreenCursor.ALWAYS}>
                  {t('screenCursorAlways')}
                </SelectItem>
                <SelectItem value={ScreenCursor.MOTION}>
                  {t('screenCursorMotion')}
                </SelectItem>
                <SelectItem value={ScreenCursor.NEVER}>
                  {t('screenCursorNever')}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Group>

        <Group
          label={t('screenContentHintLabel')}
          description={t('screenContentHintDescription')}
        >
          <Select
            value={values.screenContentHint ?? ScreenContentHint.DETAIL}
            onValueChange={handleContentHintChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ScreenContentHint.DETAIL}>
                  {t('screenContentHintDetail')}
                </SelectItem>
                <SelectItem value={ScreenContentHint.MOTION}>
                  {t('screenContentHintMotion')}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Group>

        <div className="flex flex-col gap-2">
          <Label>{t('maxBitrateLabel')}</Label>

          <Slider
            className="max-w-96"
            min={200}
            max={maxBitrate}
            step={100}
            value={[bitrate]}
            onValueChange={handleBitrateChange}
            rightSlot={
              <span className="text-sm text-muted-foreground w-20 text-right">
                {filesize(bitrate * 125, { bits: true })}/s
              </span>
            }
          />
        </div>

        <DetailsSection title={t('screenShareAdvanced')}>
          <Group
            label={t('restrictOwnAudioLabel')}
            description={t('restrictOwnAudioDesc')}
          >
            {isRestrictOwnAudioSupported ? (
              <Switch
                checked={!!values.restrictOwnAudio}
                onCheckedChange={handleRestrictOwnAudioChange}
              />
            ) : (
              <RestrictOwnAudioAlert
                isSupported={isRestrictOwnAudioSupported}
              />
            )}
          </Group>

          <Group
            label={t('suppressLocalAudioPlaybackLabel')}
            description={t('suppressLocalAudioPlaybackDesc')}
          >
            {isSuppressLocalAudioPlaybackSupported ? (
              <Switch
                checked={!!values.suppressLocalAudioPlayback}
                onCheckedChange={handleSuppressLocalAudioPlaybackChange}
              />
            ) : (
              <SuppressLocalAudioPlaybackAlert
                isSupported={isSuppressLocalAudioPlaybackSupported}
              />
            )}
          </Group>
        </DetailsSection>
      </>
    );
  }
);

export { ScreenShareSettings };
