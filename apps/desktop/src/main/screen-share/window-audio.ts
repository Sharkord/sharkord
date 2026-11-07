import { app } from 'electron';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { createLogger } from '../logs/logger';

const logger = createLogger('window-audio');
const captures = new Map<string, ChildProcessWithoutNullStreams>();
const HEADER = Buffer.from('SAUDIO1\n');

const stopWindowAudio = (id: string) => {
  const child = captures.get(id);
  captures.delete(id);
  child?.stdin.end();
  child?.kill();
};

const startWindowAudio = (
  id: string,
  sourceId: string,
  send: (data: Uint8Array | null) => void
): Promise<boolean> => {
  const match = /^window:([1-9]\d*):\d+$/.exec(sourceId);
  if (process.platform !== 'win32' || !match) return Promise.resolve(false);

  stopWindowAudio(id);
  const executable = app.isPackaged
    ? path.join(process.resourcesPath, 'sharkord-window-audio.exe')
    : path.join(
        app.getAppPath(),
        'native/windows-audio/build/sharkord-window-audio.exe'
      );
  const child = spawn(executable, [match[1]!], { windowsHide: true });
  // the helper may have exited just before stop closes its input pipe.
  child.stdin.on('error', () => {});
  captures.set(id, child);

  return new Promise((resolve) => {
    let ready = false;
    let pending = Buffer.alloc(0);
    let errorText = '';
    const timeout = setTimeout(() => {
      stopWindowAudio(id);
      resolve(false);
    }, 7000);

    child.stderr.on('data', (data: Buffer) => {
      errorText = (errorText + data.toString()).slice(-1000);
    });
    child.stdout.on('data', (data: Buffer) => {
      if (captures.get(id) !== child) return;
      pending = Buffer.concat([pending, data]);
      if (!ready) {
        if (pending.length < HEADER.length) return;
        if (!pending.subarray(0, HEADER.length).equals(HEADER)) {
          stopWindowAudio(id);
          return;
        }
        pending = pending.subarray(HEADER.length);
        ready = true;
        clearTimeout(timeout);
        resolve(true);
      }
      // pipe reads may split a stereo float32 frame across chunks.
      const length = pending.length - (pending.length % 8);
      if (length) {
        // copy only the audio bytes, never a pooled Buffer's unrelated backing memory.
        send(Uint8Array.from(pending.subarray(0, length)));
        pending = pending.subarray(length);
      }
    });
    child.on('error', (error) => {
      logger.error('window capture failed', error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (captures.get(id) === child) {
        captures.delete(id);
        send(null);
      }
      if (code) logger.warn('window capture exited', { code, errorText });
      resolve(false);
    });
  });
};

export { startWindowAudio, stopWindowAudio };
