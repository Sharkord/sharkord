const sha256File = async (filePath: string) => {
  const hasher = new Bun.CryptoHasher('sha256');

  const file = Bun.file(filePath);
  const stream = file.stream() as unknown as AsyncIterable<Uint8Array>;

  for await (const chunk of stream) {
    hasher.update(chunk);
  }

  return hasher.digest('hex');
};

export { sha256File };
