type TReadBodyOptions = {
  maxBytes: number;
  tooLargeMessage: string;
  onChunk: (chunk: Uint8Array) => void;
};

const readBodyWithLimit = async (
  response: Response,
  { maxBytes, tooLargeMessage, onChunk }: TReadBodyOptions
): Promise<void> => {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    throw new Error(tooLargeMessage);
  }

  if (!response.body) {
    throw new Error('Response has no body');
  }

  const reader = response.body.getReader();

  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;

    received += value.byteLength;

    if (received > maxBytes) {
      await reader.cancel();

      throw new Error(tooLargeMessage);
    }

    onChunk(value);
  }
};

export { readBodyWithLimit };
