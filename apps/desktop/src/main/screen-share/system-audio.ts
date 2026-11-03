import type { Node, PatchBay } from '@vencord/venmic';
import { app } from 'electron';
import { createRequire } from 'module';
import path from 'path';
import { createLogger } from '../logs/logger';

// chromium can only record the whole default output on linux, which carries everyone's voices
// back into the share. venmic builds a pipewire virtual microphone from every app except this one
let patchBay: PatchBay | null | undefined;
// the addon is commonjs without named exports, an es import would not see PatchBay
const requireNative = createRequire(__filename);
let ownerId: string | null = null;

const logger = createLogger('system-audio');

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

    const hasPipeWire = venmic.PatchBay.hasPipeWire();

    logger.info('loaded venmic', { hasPipeWire });

    if (hasPipeWire) {
      patchBay = new venmic.PatchBay();
    }
  } catch (error) {
    logger.error('system audio capture is unavailable', error);
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

// apps that play into a virtual output (easyeffects, a filter chain) never reach a speaker
// themselves, so the default rules skip them and the share is silent
const ALL_OUTPUTS_RULES = {
  // venmic reads a missing property as empty, so this skips loopback and filter chain nodes:
  // their output already carries the apps feeding them, our own voices included
  include: [{ 'media.class': 'Stream/Output/Audio', 'node.link-group': '' }],
  only_speakers: false,
  only_default_speakers: false
};

const DEFAULT_SPEAKER_RULES = {
  include: [],
  only_speakers: true,
  only_default_speakers: true
};

const startSystemAudio = (id: string, allOutputs: boolean) => {
  const bay = loadPatchBay();

  if (!bay) {
    return false;
  }

  if (ownerId !== null && ownerId !== id) {
    logger.warn('another server is already capturing', { serverId: id });

    return false;
  }

  const rules = allOutputs ? ALL_OUTPUTS_RULES : DEFAULT_SPEAKER_RULES;

  const linked = bay.link({
    ...rules,
    // recording streams, our own microphone among them, are not system audio
    exclude: [...getOwnAudioNodes(), { 'media.class': 'Stream/Input/Audio' }],
    ignore_devices: true,
    mute: false
  });

  logger.info('linked system audio', { serverId: id, allOutputs, linked });

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

  logger.info('unlinked system audio', { serverId: id });
};

export { startSystemAudio, stopSystemAudio };
