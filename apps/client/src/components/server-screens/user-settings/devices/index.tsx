import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Group } from '@/components/ui/group';
import { LoadingCard } from '@/components/ui/loading-card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useForm } from '@/hooks/use-form';
import { Resolution } from '@/types';
import { Info } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAvailableDevices } from './hooks/use-available-devices';
import ResolutionFpsControl from './resolution-fps-control';

const DEFAULT_NAME = 'default';

const Devices = memo(() => {
  const { t } = useTranslation();
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
    toast.success(t('userSettings.devices.toasts.saved'));
  }, [saveDevices, values, t]);

  if (availableDevicesLoading || devicesLoading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('userSettings.devices.title')}</CardTitle>
        <CardDescription>
          {t('userSettings.devices.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentVoiceChannelId && (
          <Alert variant="default">
            <Info />
            <AlertDescription>
              {t('userSettings.devices.voiceChannelWarning')}
            </AlertDescription>
          </Alert>
        )}
        <Group label={t('userSettings.devices.microphoneLabel')}>
          <Select
            onValueChange={(value) => onChange('microphoneId', value)}
            value={values.microphoneId}
          >
            <SelectTrigger className="w-[500px]">
              <SelectValue
                placeholder={t('userSettings.devices.selectInputPlaceholder')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {inputDevices.map((device) => (
                  <SelectItem
                    key={device?.deviceId}
                    value={device?.deviceId || DEFAULT_NAME}
                  >
                    {device?.label.trim() ||
                      t('userSettings.devices.defaultMicrophone')}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="flex gap-8">
            <Group label={t('userSettings.devices.echoCancellationLabel')}>
              <Switch
                checked={!!values.echoCancellation}
                onCheckedChange={(checked) =>
                  onChange('echoCancellation', checked)
                }
              />
            </Group>

            <Group label={t('userSettings.devices.noiseSuppressionLabel')}>
              <Switch
                checked={!!values.noiseSuppression}
                onCheckedChange={(checked) =>
                  onChange('noiseSuppression', checked)
                }
              />
            </Group>

            <Group label={t('userSettings.devices.autoGainControlLabel')}>
              <Switch
                checked={!!values.autoGainControl}
                onCheckedChange={(checked) =>
                  onChange('autoGainControl', checked)
                }
              />
            </Group>
          </div>
        </Group>

        <Group label={t('userSettings.devices.webcamLabel')}>
          <Select
            onValueChange={(value) => onChange('webcamId', value)}
            value={values.webcamId}
          >
            <SelectTrigger className="w-[500px]">
              <SelectValue
                placeholder={t('userSettings.devices.selectInputPlaceholder')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {videoDevices.map((device) => (
                  <SelectItem
                    key={device?.deviceId}
                    value={device?.deviceId || DEFAULT_NAME}
                  >
                    {device?.label.trim() ||
                      t('userSettings.devices.defaultWebcam')}
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
        </Group>

        <Group label={t('userSettings.devices.screenSharingLabel')}>
          <ResolutionFpsControl
            framerate={values.screenFramerate}
            resolution={values.screenResolution}
            onFramerateChange={(value) => onChange('screenFramerate', value)}
            onResolutionChange={(value) =>
              onChange('screenResolution', value as Resolution)
            }
          />
        </Group>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('userSettings.actions.cancel')}
          </Button>
          <Button onClick={saveDeviceSettings}>
            {t('userSettings.actions.saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Devices };
