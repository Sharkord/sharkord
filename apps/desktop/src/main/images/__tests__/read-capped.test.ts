import { describe, expect, test } from 'bun:test';
import { MAX_IMAGE_BYTES, readCapped } from '../read-capped';

const streamOf = (chunks: Uint8Array[], onCancel?: () => void) =>
  new ReadableStream<Uint8Array>({
    pull: (controller) => {
      const next = chunks.shift();

      if (!next) {
        controller.close();

        return;
      }

      controller.enqueue(next);
    },
    cancel: onCancel
  });

const respond = (
  stream: ReadableStream<Uint8Array> | null,
  contentLength?: number
) => {
  const headers = new Headers();

  if (contentLength !== undefined) {
    headers.set('content-length', String(contentLength));
  }

  return new Response(stream, { headers });
};

describe('readCapped', () => {
  test('reads a body that fits', async () => {
    const body = respond(
      streamOf([new Uint8Array([1, 2]), new Uint8Array([3])])
    );

    expect(await readCapped(body)).toEqual(Buffer.from([1, 2, 3]));
  });

  test('refuses a declared length over the cap', async () => {
    // the body on its own would fit, only the header puts it over
    const stream = streamOf([new Uint8Array([1, 2, 3])]);

    expect(
      await readCapped(respond(stream, MAX_IMAGE_BYTES + 1))
    ).toBeUndefined();
  });

  test('cuts off a body that goes over the cap while streaming', async () => {
    let wasCancelled = false;

    const chunk = new Uint8Array(MAX_IMAGE_BYTES);
    const stream = streamOf([chunk, chunk], () => {
      wasCancelled = true;
    });

    // no content-length, so the size is only known as it arrives
    expect(await readCapped(respond(stream))).toBeUndefined();
    expect(wasCancelled).toBe(true);
  });

  test('refuses a response with no body', async () => {
    expect(await readCapped(respond(null))).toBeUndefined();
  });
});
