import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import type { TDialogBaseProps } from '@/components/dialogs/types';
import { ScreenShareSettings } from '@/components/server-screens/user-settings/devices/screen-share-settings';
import { usePublicServerSettings } from '@/features/server/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import {
  getScreenShareTransport,
  setScreenShareTransport
} from '@/helpers/screen-share-transport';
import { Resolution, type TScreenShareTransport } from '@/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@sharkord/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TScreenShareSettingsDialogProps = TDialogBaseProps;

const ScreenShareSettingsDialog = memo(
  ({ isOpen, close }: TScreenShareSettingsDialogProps) => {
    const { t: tDialogs } = useTranslation('dialogs');
    const { devices, saveDevices } = useDevices();
    const { startScreenShare } = useVoice();
    const serverSettings = usePublicServerSettings();
    const [transport, setTransport] = useState(getScreenShareTransport);
    const maxBitrate = useMemo(
      () =>
        serverSettings?.webRtcMaxBitrate
          ? serverSettings.webRtcMaxBitrate / 1000
          : 0,
      [serverSettings?.webRtcMaxBitrate]
    );
    const updateDevices = useCallback(
      (updates: Partial<typeof devices>) =>
        saveDevices({ ...devices, ...updates }),
      [devices, saveDevices]
    );
    const handleResolutionChange = useCallback(
      (value: Resolution) => updateDevices({ screenResolution: value }),
      [updateDevices]
    );
    const handleFramerateChange = useCallback(
      (value: number) => updateDevices({ screenFramerate: value }),
      [updateDevices]
    );
    const handleBitrateChange = useCallback(
      (value: number) => updateDevices({ screenBitrate: value }),
      [updateDevices]
    );
    const handleShareSystemAudioChange = useCallback(
      (value: boolean) => updateDevices({ shareSystemAudio: value }),
      [updateDevices]
    );
    const handleTransportChange = useCallback(
      (value: TScreenShareTransport) => {
        setTransport(value);
        setScreenShareTransport(value);
      },
      []
    );
    const handleStart = useCallback(async () => {
      close();
      await startScreenShare();
    }, [close, startScreenShare]);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
          onInteractOutside={close}
          close={close}
        >
          <DialogHeader>
            <DialogTitle>{tDialogs('screenShareSettingsTitle')}</DialogTitle>
            <DialogDescription>
              {tDialogs('screenShareSettingsDescription')}
            </DialogDescription>
          </DialogHeader>

          <ScreenShareSettings
            resolution={devices.screenResolution}
            framerate={devices.screenFramerate}
            bitrate={devices.screenBitrate}
            shareSystemAudio={devices.shareSystemAudio}
            transport={transport}
            maxBitrate={maxBitrate}
            onResolutionChange={handleResolutionChange}
            onFramerateChange={handleFramerateChange}
            onBitrateChange={handleBitrateChange}
            onShareSystemAudioChange={handleShareSystemAudioChange}
            onTransportChange={handleTransportChange}
          />

          <DialogFooter>
            <Button variant="outline" onClick={close}>
              {tDialogs('cancel')}
            </Button>
            <Button onClick={handleStart}>
              {tDialogs('screenShareStart')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { ScreenShareSettingsDialog };
