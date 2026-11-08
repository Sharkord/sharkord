import type { TDesktopVoiceSpeakingState } from '@sharkord/shared';
import electron from 'electron';
import log from 'electron-log/main';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import {
  DEFAULT_SETTINGS,
  type TDesktopSettings
} from '../../shared/desktop-settings';

type TAttenuationSettings = Pick<
  TDesktopSettings,
  | 'attenuationEnabled'
  | 'attenuationPercent'
  | 'attenuateWhenOthersSpeak'
  | 'attenuateWhenSelfSpeaks'
>;

type TAudioAttenuatorOptions = {
  platform?: NodeJS.Platform;
  releaseDelayMs?: number;
  duckFadeMs?: number;
  restoreFadeMs?: number;
  getExecutablePath?: () => string;
  getExcludedPids?: () => number[];
  sendCommand?: (command: string) => void;
  stopProcess?: () => void;
};

const DEFAULT_RELEASE_DELAY_MS = 300;
const DEFAULT_DUCK_FADE_MS = 150;
const DEFAULT_RESTORE_FADE_MS = 200;

// default import so that tests can load this file without an electron runtime
const defaultGetExecutablePath = () =>
  electron.app.isPackaged
    ? path.join(process.resourcesPath, 'sharkord-audio-attenuator.exe')
    : path.join(
        electron.app.getAppPath(),
        'native/windows-attenuation/build/sharkord-audio-attenuator.exe'
      );

const defaultGetExcludedPids = () => {
  const pids = new Set<number>([process.pid]);

  try {
    for (const metric of electron.app.getAppMetrics()) {
      if (metric.pid > 0) {
        pids.add(metric.pid);
      }
    }
  } catch {
    // app metrics may not be available before ready or in unit tests
  }

  return [...pids];
};

const createNativeProcessTransport = (
  getExecutablePath: () => string,
  getExcludedPids: () => number[],
  onUnexpectedExit: () => void
) => {
  let child: ChildProcessWithoutNullStreams | null = null;
  let ready = false;
  let stdoutBuffer = '';
  let queuedCommands: string[] = [];

  const cleanupChild = (target: ChildProcessWithoutNullStreams | null) => {
    if (child && child === target) {
      child = null;
      ready = false;
      stdoutBuffer = '';
      queuedCommands = [];
    }
  };

  const ensureChild = () => {
    if (child) {
      return child;
    }

    const executable = getExecutablePath();
    const initialPids = getExcludedPids().map(String);
    const spawned = spawn(executable, initialPids, { windowsHide: true });

    child = spawned;
    ready = false;
    stdoutBuffer = '';

    spawned.stdin.on('error', () => {});

    spawned.stdout.setEncoding('utf8');
    spawned.stdout.on('data', (chunk: string) => {
      if (child !== spawned) {
        return;
      }

      stdoutBuffer += chunk;
      let newlineIndex = stdoutBuffer.indexOf('\n');

      while (newlineIndex !== -1) {
        const line = stdoutBuffer.slice(0, newlineIndex).replace(/\r$/, '');
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

        if (!ready && line === 'READY') {
          ready = true;
          const pending = queuedCommands;
          queuedCommands = [];

          for (const cmd of pending) {
            spawned.stdin.write(`${cmd}\n`);
          }
        }

        newlineIndex = stdoutBuffer.indexOf('\n');
      }
    });

    spawned.on('error', (error) => {
      log
        .scope('audio-attenuation')
        .error('audio attenuator process error', error);
      cleanupChild(spawned);
    });

    spawned.on('close', () => {
      const wasActive = child === spawned;
      cleanupChild(spawned);

      if (wasActive) {
        onUnexpectedExit();
      }
    });

    return spawned;
  };

  const sendCommand = (command: string) => {
    const active = ensureChild();

    if (!ready) {
      // coalesce redundant DUCK/RESTORE commands while waiting for READY
      if (command.startsWith('DUCK ') || command.startsWith('RESTORE ')) {
        queuedCommands = queuedCommands.filter(
          (queued) =>
            !queued.startsWith('DUCK ') && !queued.startsWith('RESTORE ')
        );
      }
      queuedCommands.push(command);
      return;
    }

    active.stdin.write(`${command}\n`);
  };

  const stopProcess = () => {
    const current = child;

    if (!current) {
      return;
    }

    cleanupChild(current);

    try {
      current.stdin.write('QUIT\n');
      current.stdin.end();
    } catch {
      current.kill();
    }
  };

  return { sendCommand, stopProcess };
};

const createAudioAttenuator = (options: TAudioAttenuatorOptions = {}) => {
  const platform = options.platform ?? process.platform;
  const releaseDelayMs = options.releaseDelayMs ?? DEFAULT_RELEASE_DELAY_MS;
  const duckFadeMs = options.duckFadeMs ?? DEFAULT_DUCK_FADE_MS;
  const restoreFadeMs = options.restoreFadeMs ?? DEFAULT_RESTORE_FADE_MS;
  const getExecutablePath =
    options.getExecutablePath ?? defaultGetExecutablePath;
  const getExcludedPids = options.getExcludedPids ?? defaultGetExcludedPids;

  const speakingByServer = new Map<string, TDesktopVoiceSpeakingState>();

  let settings: TAttenuationSettings = {
    attenuationEnabled: DEFAULT_SETTINGS.attenuationEnabled,
    attenuationPercent: DEFAULT_SETTINGS.attenuationPercent,
    attenuateWhenOthersSpeak: DEFAULT_SETTINGS.attenuateWhenOthersSpeak,
    attenuateWhenSelfSpeaks: DEFAULT_SETTINGS.attenuateWhenSelfSpeaks
  };

  let isDucked = false;
  let activeDuckPercent: number | null = null;
  let lastExcludedKey = '';
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;

  const clearReleaseTimer = () => {
    if (releaseTimer !== null) {
      clearTimeout(releaseTimer);
      releaseTimer = null;
    }
  };

  const nativeTransport =
    options.sendCommand && options.stopProcess
      ? {
          sendCommand: options.sendCommand,
          stopProcess: options.stopProcess
        }
      : createNativeProcessTransport(getExecutablePath, getExcludedPids, () => {
          isDucked = false;
          activeDuckPercent = null;
          lastExcludedKey = '';
        });

  const shouldDuck = () => {
    if (
      platform !== 'win32' ||
      !settings.attenuationEnabled ||
      settings.attenuationPercent <= 0
    ) {
      return false;
    }

    for (const state of speakingByServer.values()) {
      if (
        (settings.attenuateWhenOthersSpeak && state.othersSpeaking) ||
        (settings.attenuateWhenSelfSpeaks && state.selfSpeaking)
      ) {
        return true;
      }
    }

    return false;
  };

  const syncExcludedPids = () => {
    const pids = getExcludedPids().filter((pid) => pid > 0);
    const key = pids.join(' ');

    if (key && key !== lastExcludedKey) {
      lastExcludedKey = key;
      nativeTransport.sendCommand(`EXCLUDE ${key}`);
    }
  };

  const applyRestoreNow = () => {
    clearReleaseTimer();

    if (!isDucked) {
      return;
    }

    isDucked = false;
    activeDuckPercent = null;
    nativeTransport.sendCommand(`RESTORE ${restoreFadeMs}`);
  };

  const evaluate = (immediateRestore = false) => {
    if (platform !== 'win32') {
      return;
    }

    if (shouldDuck()) {
      clearReleaseTimer();

      const targetPercent = Math.max(
        0,
        Math.min(100, Math.round(settings.attenuationPercent))
      );

      if (!isDucked || activeDuckPercent !== targetPercent) {
        syncExcludedPids();
        isDucked = true;
        activeDuckPercent = targetPercent;
        nativeTransport.sendCommand(`DUCK ${targetPercent} ${duckFadeMs}`);
      }

      return;
    }

    if (!isDucked) {
      clearReleaseTimer();
      return;
    }

    if (
      immediateRestore ||
      !settings.attenuationEnabled ||
      settings.attenuationPercent <= 0
    ) {
      applyRestoreNow();
      return;
    }

    if (releaseTimer === null) {
      releaseTimer = setTimeout(() => {
        releaseTimer = null;
        applyRestoreNow();
      }, releaseDelayMs);
    }
  };

  const setServerSpeaking = (
    serverId: string,
    state: TDesktopVoiceSpeakingState
  ) => {
    const previous = speakingByServer.get(serverId);

    if (
      previous &&
      previous.selfSpeaking === state.selfSpeaking &&
      previous.othersSpeaking === state.othersSpeaking
    ) {
      return;
    }

    if (!state.selfSpeaking && !state.othersSpeaking) {
      speakingByServer.delete(serverId);
    } else {
      speakingByServer.set(serverId, state);
    }

    evaluate(false);
  };

  const clearServerSpeaking = (serverId: string) => {
    if (!speakingByServer.has(serverId)) {
      return;
    }

    speakingByServer.delete(serverId);
    evaluate(true);
  };

  const setAttenuationSettings = (next: TAttenuationSettings) => {
    const changed =
      settings.attenuationEnabled !== next.attenuationEnabled ||
      settings.attenuationPercent !== next.attenuationPercent ||
      settings.attenuateWhenOthersSpeak !== next.attenuateWhenOthersSpeak ||
      settings.attenuateWhenSelfSpeaks !== next.attenuateWhenSelfSpeaks;

    if (!changed) {
      return;
    }

    settings = {
      attenuationEnabled: next.attenuationEnabled,
      attenuationPercent: next.attenuationPercent,
      attenuateWhenOthersSpeak: next.attenuateWhenOthersSpeak,
      attenuateWhenSelfSpeaks: next.attenuateWhenSelfSpeaks
    };

    evaluate(true);
  };

  const stop = () => {
    clearReleaseTimer();
    speakingByServer.clear();
    isDucked = false;
    activeDuckPercent = null;
    lastExcludedKey = '';

    if (platform === 'win32') {
      nativeTransport.stopProcess();
    }
  };

  return {
    setServerSpeaking,
    clearServerSpeaking,
    setAttenuationSettings,
    stop
  };
};

const defaultAttenuator = createAudioAttenuator();

const setServerSpeaking = (
  serverId: string,
  state: TDesktopVoiceSpeakingState
) => {
  defaultAttenuator.setServerSpeaking(serverId, state);
};

const clearServerSpeaking = (serverId: string) => {
  defaultAttenuator.clearServerSpeaking(serverId);
};

const setAttenuationSettings = (settings: TAttenuationSettings) => {
  defaultAttenuator.setAttenuationSettings(settings);
};

const stopAudioAttenuation = () => {
  defaultAttenuator.stop();
};

export {
  clearServerSpeaking,
  createAudioAttenuator,
  setAttenuationSettings,
  setServerSpeaking,
  stopAudioAttenuation
};
export type { TAttenuationSettings };
