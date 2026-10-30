import { describe, expect, test } from 'bun:test';
import type { DesktopCapturerSource, WebContents } from 'electron';
import { IpcChannel } from '../../../shared/constants';
import type { TSourcePickRequest } from '../../../shared/types';
import { createSourcePicker } from '../source-picker';

const JPEG = Buffer.from('jpeg');
const THUMBNAIL = `data:image/jpeg;base64,${JPEG.toString('base64')}`;

const createSource = (id: string, name: string) =>
  ({
    id,
    name,
    thumbnail: { toJPEG: () => JPEG }
  }) as unknown as DesktopCapturerSource;

const SCREEN = createSource('screen:0:0', 'Entire screen');
const WINDOW = createSource('window:42:0', 'Terminal');

const createPicker = () => {
  const sent: TSourcePickRequest[] = [];
  const openStates: boolean[] = [];

  const shellContents = {
    send: (channel: string, request: TSourcePickRequest) => {
      if (channel === IpcChannel.SOURCE_PICK_REQUESTED) {
        sent.push(request);
      }
    }
  } as unknown as WebContents;

  const picker = createSourcePicker(shellContents, (open) =>
    openStates.push(open)
  );

  return { picker, sent, openStates };
};

describe('source picker', () => {
  test('offers every source to the shell with its kind and a thumbnail', () => {
    const { picker, sent, openStates } = createPicker();

    picker.pick([SCREEN, WINDOW]);

    expect(openStates).toEqual([true]);
    expect(sent).toEqual([
      {
        requestId: 1,
        sources: [
          {
            id: 'screen:0:0',
            name: 'Entire screen',
            kind: 'screen',
            thumbnail: THUMBNAIL
          },
          {
            id: 'window:42:0',
            name: 'Terminal',
            kind: 'window',
            thumbnail: THUMBNAIL
          }
        ]
      }
    ]);
  });

  test('shares the source the user picked and closes the picker', async () => {
    const { picker, openStates } = createPicker();
    const picked = picker.pick([SCREEN, WINDOW]);

    picker.answer(1, 'window:42:0');

    expect(await picked).toBe('window:42:0');
    expect(openStates).toEqual([true, false]);
  });

  test('shares nothing when the user cancels', async () => {
    const { picker } = createPicker();
    const picked = picker.pick([SCREEN, WINDOW]);

    picker.answer(1, null);

    expect(await picked).toBeNull();
  });

  test('shares nothing for a source that was never offered', async () => {
    const { picker } = createPicker();
    const picked = picker.pick([SCREEN, WINDOW]);

    picker.answer(1, 'screen:9:0');

    expect(await picked).toBeNull();
  });

  test('ignores an answer to another request', async () => {
    const { picker } = createPicker();
    const picked = picker.pick([SCREEN, WINDOW]);

    picker.answer(7, 'screen:0:0');
    picker.answer(1, 'window:42:0');

    expect(await picked).toBe('window:42:0');
  });

  test('a newer request cancels the one still open', async () => {
    const { picker, sent } = createPicker();
    const first = picker.pick([SCREEN, WINDOW]);
    const second = picker.pick([SCREEN, WINDOW]);

    expect(await first).toBeNull();

    picker.answer(2, 'screen:0:0');

    expect(await second).toBe('screen:0:0');
    expect(sent.map(({ requestId }) => requestId)).toEqual([1, 2]);
  });

  test('cancelling, as when the shell reloads, shares nothing and closes the picker', async () => {
    const { picker, openStates } = createPicker();
    const picked = picker.pick([SCREEN, WINDOW]);

    picker.cancel();

    expect(await picked).toBeNull();
    expect(openStates).toEqual([true, false]);
  });
});
