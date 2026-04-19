import {
  CLIENT_ENTRY_FILE,
  SERVER_ENTRY_FILE,
  zPluginManifest
} from '@sharkord/shared';
import { randomUUIDv7 } from 'bun';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../logger';
import { ensureDir } from './fs';
import { PLUGINS_PATH, TMP_PATH } from './paths';
import { sha256File } from './sha-256-file';

const downloadsPath = path.join(TMP_PATH, 'downloads');

const hasPluginStructure = async (pluginPath: string): Promise<boolean> => {
  const manifestPath = path.join(pluginPath, 'manifest.json');
  const serverEntryPath = path.join(pluginPath, SERVER_ENTRY_FILE);
  const clientEntryPath = path.join(pluginPath, CLIENT_ENTRY_FILE);

  const [hasManifest, hasServerEntry, hasClientEntry] = await Promise.all([
    fs.exists(manifestPath),
    fs.exists(serverEntryPath),
    fs.exists(clientEntryPath)
  ]);

  return hasManifest && hasServerEntry && hasClientEntry;
};

const resolveExtractedPluginPath = async (
  extractPath: string
): Promise<string> => {
  if (await hasPluginStructure(extractPath)) {
    return extractPath;
  }

  const entries = await fs.readdir(extractPath, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());
  const pluginDirs: string[] = [];

  for (const directory of directories) {
    const possiblePath = path.join(extractPath, directory.name);

    if (await hasPluginStructure(possiblePath)) {
      pluginDirs.push(possiblePath);
    }
  }

  if (pluginDirs.length === 0) {
    throw new Error(
      'Downloaded archive does not contain a valid plugin structure'
    );
  }

  if (pluginDirs.length > 1) {
    throw new Error(
      'Downloaded archive contains multiple plugin directories; expected only one'
    );
  }

  return pluginDirs[0]!;
};

const downloadPlugin = async (
  url: string,
  expectedChecksum: string
): Promise<void> => {
  await ensureDir(downloadsPath);

  const archivePath = path.join(downloadsPath, `${randomUUIDv7()}.archive`);
  const extractPath = await fs.mkdtemp(path.join(downloadsPath, 'extract-'));

  logger.debug(`Downloading plugin from ${url} to ${archivePath}`);

  try {
    await downloadFile(url, archivePath);

    const actualChecksum = await sha256File(archivePath);

    if (actualChecksum !== expectedChecksum) {
      throw new Error(
        'Downloaded plugin checksum does not match expected checksum'
      );
    }

    const archiveBytes = await Bun.file(archivePath).bytes();
    const archive = new Bun.Archive(archiveBytes);
    const entryCount = await archive.extract(extractPath);

    logger.debug(`Extracted ${entryCount} entries from plugin archive`);

    const pluginPath = await resolveExtractedPluginPath(extractPath);
    const manifestPath = path.join(pluginPath, 'manifest.json');
    const manifest = zPluginManifest.parse(
      JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
    );

    const targetPluginPath = path.join(PLUGINS_PATH, manifest.id);

    await fs.rm(targetPluginPath, { recursive: true, force: true });
    await fs.cp(pluginPath, targetPluginPath, { recursive: true });

    logger.info(`Installed plugin '${manifest.id}' from ${url}`);
  } finally {
    await Promise.allSettled([
      fs.rm(archivePath, { force: true }),
      fs.rm(extractPath, { recursive: true, force: true })
    ]);
  }
};

const downloadFile = async (url: string, outputPath: string): Promise<void> => {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  }

  const file = Bun.file(outputPath);

  await Bun.write(file, res);
};

export { downloadFile, downloadPlugin };
