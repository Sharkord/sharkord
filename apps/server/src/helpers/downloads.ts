import { mkdir } from 'fs/promises';
import path from 'path';
import { logger } from '../logger';
import { ensureDir } from './fs';
import { PLUGINS_PATH, TMP_PATH } from './paths';

const downloadsPath = path.join(TMP_PATH, 'downloads');

const downloadPlugin = async (url: string): Promise<void> => {
  await ensureDir(downloadsPath);

  const downloadPath = path.join(downloadsPath, path.basename(url));

  logger.debug(`Downloading plugin from ${url} to ${downloadPath}`);

  await downloadFile(url, downloadPath);

  const tarball = await Bun.file(downloadPath).bytes();
  const archive = new Bun.Archive(tarball);
  const entryCount = await archive.extract(PLUGINS_PATH);

  logger.debug(`Extracted ${entryCount} entries from plugin archive`);
};

const downloadFile = async (
  url: string,
  outputPath: string,
  options?: {
    headers?: Record<string, string>;
    overwrite?: boolean;
  }
): Promise<void> => {
  const { headers = {} } = options || {};

  await mkdir(path.dirname(outputPath), { recursive: true });

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  }

  const file = Bun.file(outputPath);

  await Bun.write(file, res);
};

export { downloadFile, downloadPlugin };
