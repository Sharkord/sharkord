const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB limit for image reads

const readCapped = async (response: Response) => {
  const declared = Number(response.headers.get('content-length'));

  if (declared > MAX_IMAGE_BYTES) {
    return undefined;
  }

  const { body } = response;

  if (!body) {
    return undefined;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];

  let size = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    size += value.length;

    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();

      return undefined;
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks);
};

export { MAX_IMAGE_BYTES, readCapped };
