import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import type { TDialogBaseProps } from '@/components/dialogs/types';
import { ScreenShareSettings } from '@/components/server-screens/user-settings/devices/screen-share-settings';
import { startScreenShareFromBridge } from '@/components/voice-provider/controls-bridge';
import { usePublicServerSettings } from '@/features/server/hooks';
import {
  getScreenShareTransport,
  setScreenShareTransport
} from '@/helpers/screen-share-transport';
import { Resolution, type TScreenShareTransport } from '@/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@sharkord/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TScreenShareSettingsDialogProps = TDialogBaseProps;

const ScreenShareSettingsDialog = memo(
  ({ isOpen, close }: TScreenShareSettingsDialogProps) => {
    const { t: tDialogs } = useTranslation('dialogs');
    const { t: tSettings } = useTranslation('settings');
    const { devices, saveDevices } = useDevices();
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
    const handleStart = useCallback(() => {
      close();
      if (!startScreenShareFromBridge()) {
        toast.error(tSettings('voiceControlsUnavailable'));
      }
    }, [close, tSettings]);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
          onInteractOutside={close}
          close={close}
        >
          <DialogHeader>
            <DialogTitle>{tDialogs('screenShareSettingsTitle')}</DialogTitle>
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
