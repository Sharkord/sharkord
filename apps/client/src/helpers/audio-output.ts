import { toast } from 'sonner';

type TAudioElementWithSinkId = HTMLAudioElement & {
  setSinkId?: (deviceId: string) => Promise<void>;
  sinkId?: string;
};

const OUTPUT_WARNING_COOLDOWN_MS = 10000;
const lastOutputWarningByDevice = new Map<string, number>();

const applyAudioOutputDevice = async (
  audioElement: HTMLAudioElement | null,
  playbackId: string | undefined,
  showWarning = true
) => {
  if (!audioElement || !playbackId) return true;

  const audioElementWithSink = audioElement as TAudioElementWithSinkId;

  if (typeof audioElementWithSink.setSinkId !== 'function') {
    return true;
  }

  if (audioElementWithSink.sinkId === playbackId) {
    return true;
  }

  try {
    await audioElementWithSink.setSinkId(playbackId);

    return true;
  } catch (error) {
    console.warn('Failed to set output device:', error);

    const now = Date.now();
    const lastWarningAt = lastOutputWarningByDevice.get(playbackId) ?? 0;
    const isOutsideCooldown = now - lastWarningAt > OUTPUT_WARNING_COOLDOWN_MS;

    if (showWarning && isOutsideCooldown) {
      lastOutputWarningByDevice.set(playbackId, now);
      toast.warning(
        'Could not switch to the selected speaker. Using default output.'
      );
    }

    return false;
  }
};

export { applyAudioOutputDevice };
