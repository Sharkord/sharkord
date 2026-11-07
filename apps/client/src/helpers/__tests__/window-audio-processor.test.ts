import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

type TProcessor = {
  port: { onmessage: (event: { data: Uint8Array }) => void };
  process: (inputs: Float32Array[][], outputs: Float32Array[][]) => boolean;
};

const createProcessor = () => {
  let Constructor: new () => TProcessor;
  const source = readFileSync(
    new URL('../../audio-worklets/window-audio-processor.js', import.meta.url),
    'utf8'
  );
  runInNewContext(source, {
    AudioWorkletProcessor: class {
      port = {};
    },
    registerProcessor: (_name: string, processor: new () => TProcessor) => {
      Constructor = processor;
    }
  });
  return new Constructor!();
};

const send = (processor: TProcessor, samples: number[]) => {
  const floats = new Float32Array(samples);
  processor.port.onmessage({ data: new Uint8Array(floats.buffer) });
};

const render = (processor: TProcessor, frames: number) => {
  const output = [new Float32Array(frames), new Float32Array(frames)];
  processor.process([], [output]);
  return output.map((channel) => Array.from(channel));
};

describe('window audio processor', () => {
  test('preserves stereo and emits silence on underrun', () => {
    const processor = createProcessor();
    send(processor, [1, -1, 0.5, -0.5]);
    expect(render(processor, 4)).toEqual([
      [1, 0.5, 0, 0],
      [-1, -0.5, 0, 0]
    ]);
  });

  test('continues across packets and render quanta without swapping channels', () => {
    const processor = createProcessor();
    send(processor, [1, 2, 3, 4]);
    expect(render(processor, 1)).toEqual([[1], [2]]);
    send(processor, [5, 6]);
    expect(render(processor, 3)).toEqual([
      [3, 5, 0],
      [4, 6, 0]
    ]);
  });

  test('drops stale frames when the producer outruns playback', () => {
    const processor = createProcessor();
    send(processor, new Array(48000).fill(-1));
    send(processor, [0.25, 0.75]);
    const output = render(processor, 24000);
    expect(output[0]?.at(-1)).toBe(0.25);
    expect(output[1]?.at(-1)).toBe(0.75);
    expect(render(processor, 1)).toEqual([[0], [0]]);
  });
});
