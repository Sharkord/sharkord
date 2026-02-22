import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useForm } from '@/hooks/use-form';
import { Resolution, VideoCodec } from '@/types';
import { DEFAULT_BITRATE } from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Label,
  LoadingCard,
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
import { Info } from 'lucide-react';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';
import { useAvailableDevices } from './hooks/use-available-devices';
import ResolutionFpsControl from './resolution-fps-control';

const DEFAULT_NAME = 'default';

const Devices = memo(() => {
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const {
    inputDevices,
    videoDevices,
    loading: availableDevicesLoading
  } = useAvailableDevices();
  const { devices, saveDevices, loading: devicesLoading } = useDevices();
  const { values, onChange } = useForm(devices);

  const saveDeviceSettings = useCallback(() => {
    saveDevices(values);
    toast.success('Device settings saved');
  }, [saveDevices, values]);

  if (availableDevicesLoading || devicesLoading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Devices</CardTitle>
        <CardDescription>
          Manage your peripheral devices and their settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentVoiceChannelId && (
          <Alert variant="default">
            <Info />
            <AlertDescription>
              You are in a voice channel, changes will only take effect after
              you leave and rejoin the channel.
            </AlertDescription>
          </Alert>
        )}
        <Group label="Microphone">
          <Select
            onValueChange={(value) => onChange('microphoneId', value)}
            value={values.microphoneId}
          >
            <SelectTrigger className="w-[500px]">
              <SelectValue placeholder="Select the input device" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {inputDevices.map((device) => (
                  <SelectItem
                    key={device?.deviceId}
                    value={device?.deviceId || DEFAULT_NAME}
                  >
                    {device?.label.trim() || 'Default Microphone'}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="flex gap-8">
            <Group label="Echo cancellation">
              <Switch
                checked={!!values.echoCancellation}
                onCheckedChange={(checked) =>
                  onChange('echoCancellation', checked)
                }
              />
            </Group>

            <Group label="Noise suppression">
              <Switch
                checked={!!values.noiseSuppression}
                onCheckedChange={(checked) =>
                  onChange('noiseSuppression', checked)
                }
              />
            </Group>

            <Group label="Automatic gain control">
              <Switch
                checked={!!values.autoGainControl}
                onCheckedChange={(checked) =>
                  onChange('autoGainControl', checked)
                }
              />
            </Group>
          </div>
        </Group>

        <Group label="Webcam">
          <Select
            onValueChange={(value) => onChange('webcamId', value)}
            value={values.webcamId}
          >
            <SelectTrigger className="w-[500px]">
              <SelectValue placeholder="Select the input device" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {videoDevices.map((device) => (
                  <SelectItem
                    key={device?.deviceId}
                    value={device?.deviceId || DEFAULT_NAME}
                  >
                    {device?.label.trim() || 'Default Webcam'}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <ResolutionFpsControl
            framerate={values.webcamFramerate}
            resolution={values.webcamResolution}
            onFramerateChange={(value) => onChange('webcamFramerate', value)}
            onResolutionChange={(value) =>
              onChange('webcamResolution', value as Resolution)
            }
          />
          <Group label="Mirror own video">
            <Switch
              checked={!!values.mirrorOwnVideo}
              onCheckedChange={(checked) => onChange('mirrorOwnVideo', checked)}
            />
          </Group>
        </Group>

        <Group label="Screen Sharing">
          <div className="flex">
            <ResolutionFpsControl
              framerate={values.screenFramerate}
              resolution={values.screenResolution}
              onFramerateChange={(value) => onChange('screenFramerate', value)}
              onResolutionChange={(value) =>
                onChange('screenResolution', value as Resolution)
              }
            />

            <div className="ml-2">
              <Select
                value={values.screenCodec ?? VideoCodec.AUTO}
                onValueChange={(value) =>
                  onChange('screenCodec', value as VideoCodec)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select codec" />
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

          <div className="flex flex-col gap-2">
            <Label>Max Bitrate</Label>

            <Slider
              min={200}
              max={30000}
              step={100}
              value={[values.screenBitrate ?? DEFAULT_BITRATE]}
              onValueChange={([value]) => onChange('screenBitrate', value)}
              rightSlot={
                <span className="text-sm text-muted-foreground w-20 text-right">
                  {filesize((values.screenBitrate ?? DEFAULT_BITRATE) * 125, {
                    bits: true
                  })}
                  /s
                </span>
              }
            />
          </div>

          <span className="text-sm text-muted-foreground">
            These screen sharing settings are best effort and may not be
            supported on all platforms or browsers, which means that in some
            cases the actual resolution, framerate or codec used may differ from
            the selected ones. In the end, is up to the browser to handle the
            screen sharing stream in the best way possible, based on the current
            system performance and network conditions.
          </span>
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            Cancel
          </Button>
          <Button onClick={saveDeviceSettings}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Devices };
