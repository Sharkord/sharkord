import type { Node, PatchBay } from '@vencord/venmic';
import { app } from 'electron';
import { createRequire } from 'module';
import path from 'path';

// chromium can only record the whole default output on linux, which carries everyone's voices
// back into the share. venmic builds a pipewire virtual microphone from every app except this one
let patchBay: PatchBay | null | undefined;
// the addon is commonjs without named exports, an es import would not see PatchBay
const requireNative = createRequire(__filename);
let ownerId: string | null = null;

const loadPatchBay = () => {
  if (patchBay !== undefined) {
    return patchBay;
  }

  patchBay = null;

  if (process.platform !== 'linux') {
    return patchBay;
  }

  try {
    const venmic = requireNative(
      '@vencord/venmic'
    ) as typeof import('@vencord/venmic');

    if (venmic.PatchBay.hasPipeWire()) {
      patchBay = new venmic.PatchBay();
    }
  } catch (error) {
    console.error('system audio capture is unavailable', error);
  }

  return patchBay;
};

const getOwnAudioNodes = (): Node[] => {
  // pulse and pipewire name the client after the executable, which also covers the audio service
  const nodes: Node[] = [
    { 'application.process.binary': path.basename(process.execPath) }
  ];

  const metrics = app.getAppMetrics();
  const audioService = metrics.find(({ name }) => name === 'Audio Service');

  if (audioService) {
    nodes.push({ 'application.process.id': String(audioService.pid) });
  }

  return nodes;
};

const startSystemAudio = (id: string) => {
  const bay = loadPatchBay();

  if (!bay) {
    return false;
  }

  if (ownerId !== null && ownerId !== id) {
    return false;
  }

  const linked = bay.link({
    include: [],
    // recording streams, our own microphone among them, are not system audio
    exclude: [...getOwnAudioNodes(), { 'media.class': 'Stream/Input/Audio' }],
    ignore_devices: true,
    only_speakers: true,
    only_default_speakers: true,
    mute: false
  });

  if (linked) {
    ownerId = id;
  }

  return linked;
};

// only the server that started the capture may end it
const stopSystemAudio = (id: string) => {
  if (!patchBay || ownerId !== id) {
    return;
  }

  patchBay.unlink();
  ownerId = null;
};

export { startSystemAudio, stopSystemAudio };
