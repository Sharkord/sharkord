import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { getVoiceControlsBridge } from '@/components/voice-provider/controls-bridge';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useOwnVoiceState } from '@/features/server/voice/hooks';
import {
  MICROPHONE_GATE_DEFAULT_THRESHOLD_DB,
} from '@/helpers/audio-gate';
import {
  getNoiseGateWorkletAvailabilitySnapshot,
  subscribeNoiseGateWorkletAvailability
} from '@/helpers/audio-worklet/noise-gate-worklet';
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
  Separator,
  Slider,
  Switch
} from '@sharkord/ui';
import { filesize } from 'filesize';
import { Info } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { useAvailableDevices } from './hooks/use-available-devices';
import { MicrophoneTestLevelBar } from './microphone-test-level-bar';
import { useMicrophoneTest } from './hooks/use-microphone-test';
import { useWebcamTest } from './hooks/use-webcam-test';
import ResolutionFpsControl from './resolution-fps-control';

const DEFAULT_NAME = 'default';

const Devices = memo(() => {
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const ownVoiceState = useOwnVoiceState();
  const {
    inputDevices,
    playbackDevices,
    videoDevices,
    loading: availableDevicesLoading,
    loadDevices
  } = useAvailableDevices();
  const { devices, saveDevices, loading: devicesLoading } = useDevices();
  const { values, onChange } = useForm(devices);
  const noiseGateWorkletAvailability = useSyncExternalStore(
    subscribeNoiseGateWorkletAvailability,
    getNoiseGateWorkletAvailabilitySnapshot,
    getNoiseGateWorkletAvailabilitySnapshot
  );
  const isNoiseGateAvailable = noiseGateWorkletAvailability.available;
  const {
    testAudioRef,
    permissionState,
    isTesting,
    getAudioLevelSnapshot,
    error: microphoneTestError,
    requestPermission,
    startTest,
    stopTest
  } = useMicrophoneTest({
    microphoneId: values.microphoneId,
    playbackId: values.playbackId,
    autoGainControl: !!values.autoGainControl,
    echoCancellation: !!values.echoCancellation,
    noiseSuppression: !!values.noiseSuppression,
    noiseGateEnabled: values.noiseGateEnabled ?? true,
    noiseGateThresholdDb:
      values.noiseGateThresholdDb ?? MICROPHONE_GATE_DEFAULT_THRESHOLD_DB
  });
  const {
    testVideoRef,
    isStarting: isVideoStarting,
    isTesting: isVideoTesting,
    isPreviewReady: isVideoPreviewReady,
    error: webcamTestError,
    startTest: startVideoTest,
    stopTest: stopVideoTest
  } = useWebcamTest({
    webcamId: values.webcamId,
    webcamResolution: values.webcamResolution,
    webcamFramerate: values.webcamFramerate
  });

  const saveDeviceSettings = useCallback(() => {
    saveDevices(values);
    toast.success('Device settings saved');
  }, [saveDevices, values]);
  const didPrimeDevicesOnGrantedRef = useRef(false);
  const mutedByTestRef = useRef<{
    previousMicMuted: boolean;
    previousSoundMuted: boolean;
  } | null>(null);
  const restoreVoiceStateAfterTestRef = useRef<() => Promise<void>>(
    async () => {}
  );

  const restoreVoiceStateAfterTest = useCallback(async () => {
    if (!currentVoiceChannelId) {
      mutedByTestRef.current = null;
      return;
    }

    const mutedByTest = mutedByTestRef.current;
    if (!mutedByTest) return;

    mutedByTestRef.current = null;

    const voiceControlsBridge = getVoiceControlsBridge();
    if (!voiceControlsBridge) {
      toast.error('Voice controls are unavailable right now.');
      return;
    }

    await voiceControlsBridge.setMicMuted(mutedByTest.previousMicMuted);
    await voiceControlsBridge.setSoundMuted(mutedByTest.previousSoundMuted);
  }, [currentVoiceChannelId]);

  useEffect(() => {
    restoreVoiceStateAfterTestRef.current = restoreVoiceStateAfterTest;
  }, [restoreVoiceStateAfterTest]);

  const startMicrophoneTest = useCallback(async () => {
    if (currentVoiceChannelId) {
      const voiceControlsBridge = getVoiceControlsBridge();
      if (!voiceControlsBridge) {
        toast.error('Voice controls are unavailable right now.');
        return;
      }

      mutedByTestRef.current = {
        previousMicMuted: ownVoiceState.micMuted,
        previousSoundMuted: ownVoiceState.soundMuted
      };

      await voiceControlsBridge.setMicMuted(true);
      await voiceControlsBridge.setSoundMuted(true);
    } else {
      mutedByTestRef.current = null;
    }

    const didStart = await startTest();

    if (!didStart) {
      await restoreVoiceStateAfterTest();
      return;
    }
  }, [
    currentVoiceChannelId,
    ownVoiceState.micMuted,
    ownVoiceState.soundMuted,
    startTest,
    restoreVoiceStateAfterTest
  ]);

  const stopMicrophoneTest = useCallback(async () => {
    stopTest();
    await restoreVoiceStateAfterTest();
  }, [stopTest, restoreVoiceStateAfterTest]);

  const requestMicrophonePermission = useCallback(async () => {
    await requestPermission();
    await loadDevices();
  }, [requestPermission, loadDevices]);

  const startWebcamTest = useCallback(async () => {
    const didStart = await startVideoTest();
    if (!didStart) return;

    await loadDevices();
  }, [startVideoTest, loadDevices]);

  useEffect(() => {
    if (permissionState !== 'granted') {
      didPrimeDevicesOnGrantedRef.current = false;
      return;
    }

    if (didPrimeDevicesOnGrantedRef.current) return;
    didPrimeDevicesOnGrantedRef.current = true;

    void (async () => {
      await requestPermission({ silent: true });
      await loadDevices();
    })();
  }, [permissionState, requestPermission, loadDevices]);

  useEffect(() => {
    return () => {
      void restoreVoiceStateAfterTestRef.current();
    };
  }, []);

  const hasMicrophones = inputDevices.length > 0;
  const hasDefaultPlaybackOption = playbackDevices.some(
    (device) => device?.deviceId === DEFAULT_NAME
  );
  const hasDefaultVideoOption = videoDevices.some(
    (device) => device?.deviceId === DEFAULT_NAME
  );

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
      <CardContent className="space-y-6">
        {currentVoiceChannelId && (
          <Alert variant="default">
            <Info />
            <AlertDescription>
              You are in a voice channel, changes will only take effect after
              you leave and rejoin the channel.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-6">
          <Group label="Playback">
            <Select
              onValueChange={(value) => onChange('playbackId', value)}
              value={values.playbackId}
            >
              <SelectTrigger className="w-92">
                <SelectValue placeholder="Select the output device" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {!hasDefaultPlaybackOption && (
                    <SelectItem value={DEFAULT_NAME}>Default Output</SelectItem>
                  )}
                  {playbackDevices.map((device) => (
                    <SelectItem
                      key={device?.deviceId}
                      value={device?.deviceId || DEFAULT_NAME}
                    >
                      {device?.label.trim() || 'Default Output'}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Group>

          <Group label="Microphone">
            <Select
              onValueChange={(value) => onChange('microphoneId', value)}
              value={values.microphoneId}
            >
              <SelectTrigger className="w-92">
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

            <div className="flex items-center gap-4">
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

              <Group label="Noise gate">
                <Switch
                  checked={values.noiseGateEnabled ?? true}
                  disabled={!isNoiseGateAvailable}
                  onCheckedChange={(checked) =>
                    onChange('noiseGateEnabled', checked)
                  }
                />
              </Group>
            </div>

            {!isNoiseGateAvailable && (
              <p className="text-xs text-muted-foreground">
                Noise gate is unavailable. Microphone audio will be sent without
                gating.
                {noiseGateWorkletAvailability.reason
                  ? ` ${noiseGateWorkletAvailability.reason}`
                  : ''}
              </p>
            )}
          </Group>

          <Group label="Microphone Test">
            <div className="flex items-center gap-2">
              {permissionState !== 'granted' && (
                <Button variant="outline" onClick={requestMicrophonePermission}>
                  Permit Microphone Access
                </Button>
              )}

              {!isTesting ? (
                <Button
                  variant="secondary"
                  onClick={() => void startMicrophoneTest()}
                  disabled={permissionState === 'denied' || !hasMicrophones}
                >
                  Start Test
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => void stopMicrophoneTest()}
                >
                  Stop Test
                </Button>
              )}
            </div>

            {currentVoiceChannelId && isTesting && (
              <p className="text-sm text-muted-foreground">
                You are temporarily muted and deafened while the test is
                running.
              </p>
            )}

            <MicrophoneTestLevelBar
              isTesting={isTesting}
              noiseGateEnabled={values.noiseGateEnabled ?? true}
              noiseGateControlsDisabled={!isNoiseGateAvailable}
              noiseGateThresholdDb={values.noiseGateThresholdDb}
              onThresholdChange={(value) => onChange('noiseGateThresholdDb', value)}
              getAudioLevelSnapshot={getAudioLevelSnapshot}
            />

            {microphoneTestError && (
              <Alert variant="destructive">
                <Info />
                <AlertDescription>{microphoneTestError}</AlertDescription>
              </Alert>
            )}

            <audio ref={testAudioRef} className="hidden" />
          </Group>
        </div>

        <Separator />

        <div className="space-y-6">
          <Group label="Webcam">
            <div className="space-y-4">
              <Select
                onValueChange={(value) => onChange('webcamId', value)}
                value={values.webcamId}
              >
                <SelectTrigger className="w-full max-w-96">
                  <SelectValue placeholder="Select the input device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {!hasDefaultVideoOption && (
                      <SelectItem value={DEFAULT_NAME}>
                        Default Webcam
                      </SelectItem>
                    )}
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

              <div className="group relative aspect-video w-full max-w-[28rem] overflow-hidden rounded-md border border-border bg-muted/40">
                <video
                  ref={testVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`h-full w-full object-cover transition-opacity duration-150 ${
                    values.mirrorOwnVideo ? '-scale-x-100' : ''
                  } ${isVideoTesting ? 'opacity-100' : 'opacity-0'}`}
                />

                {!isVideoTesting && !isVideoStarting && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="secondary"
                      onClick={() => void startWebcamTest()}
                    >
                      Start Video Preview
                    </Button>
                  </div>
                )}

                {(isVideoStarting ||
                  (isVideoTesting && !isVideoPreviewReady)) && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Starting camera...
                  </div>
                )}

                {isVideoTesting && (
                  <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-3 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <Button
                      variant="secondary"
                      className="pointer-events-auto"
                      onClick={stopVideoTest}
                    >
                      Stop Video Preview
                    </Button>
                  </div>
                )}
              </div>

              {webcamTestError && (
                <Alert variant="destructive">
                  <Info />
                  <AlertDescription>{webcamTestError}</AlertDescription>
                </Alert>
              )}

              <ResolutionFpsControl
                framerate={values.webcamFramerate}
                resolution={values.webcamResolution}
                onFramerateChange={(value) =>
                  onChange('webcamFramerate', value)
                }
                onResolutionChange={(value) =>
                  onChange('webcamResolution', value as Resolution)
                }
              />

              <Group label="Mirror own video">
                <Switch
                  checked={!!values.mirrorOwnVideo}
                  onCheckedChange={(checked) =>
                    onChange('mirrorOwnVideo', checked)
                  }
                />
              </Group>

              <Group label="Screen Sharing">
                <div className="flex">
                  <ResolutionFpsControl
                    framerate={values.screenFramerate}
                    resolution={values.screenResolution}
                    onFramerateChange={(value) =>
                      onChange('screenFramerate', value)
                    }
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
                    className="max-w-96"
                    min={200}
                    max={30000}
                    step={100}
                    value={[values.screenBitrate ?? DEFAULT_BITRATE]}
                    onValueChange={([value]) =>
                      onChange('screenBitrate', value)
                    }
                    rightSlot={
                      <span className="text-sm text-muted-foreground w-20 text-right">
                        {filesize(
                          (values.screenBitrate ?? DEFAULT_BITRATE) * 125,
                          {
                            bits: true
                          }
                        )}
                        /s
                      </span>
                    }
                  />
                </div>

                <span className="text-sm text-muted-foreground">
                  These screen sharing settings are best effort and may not be
                  supported on all platforms or browsers, which means that in
                  some cases the actual resolution, framerate or codec used may
                  differ from the selected ones. In the end, is up to the
                  browser to handle the screen sharing stream in the best way
                  possible, based on the current system performance and network
                  conditions.
                </span>
              </Group>
            </div>
          </Group>
        </div>
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
