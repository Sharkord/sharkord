import { embeddedFiles } from 'bun';
import fs from 'fs/promises';
import path from 'path';
import { getExecutableName } from '../helpers/get-executable-name';
import {
  DRIZZLE_PATH,
  INTERFACE_PATH,
  MEDIASOUP_PATH,
  SRC_MIGRATIONS_PATH
} from '../helpers/paths';
import { unzipBlobToDirectory } from '../helpers/zip';
import { logger } from '../logger';
import { IS_DEVELOPMENT, IS_TEST } from '../utils/env';

const findEmbedFile = (fileName: string) => {
  const extension = path.extname(fileName);
  const prefix = fileName.replace(extension, '');

  return embeddedFiles.find((file) => {
    // for some reason this blob doesn't have a name but it works and it's in the documentation
    // https://bun.com/docs/bundler/executables#listing-embedded-files
    const fileName = (file as File).name;

    return fileName.startsWith(prefix) && fileName.endsWith(extension);
  });
};

const loadEmbeds = async () => {
  logger.debug('Loading embedded files...');

  if (IS_DEVELOPMENT || IS_TEST) {
    // files are only embedded in production
    logger.debug('Development mode, skipping embedded files extraction');

    // copy migrations from src/db/migrations to DRIZZLE_PATH to allow running migrations in development
    await fs.cp(SRC_MIGRATIONS_PATH, DRIZZLE_PATH, { recursive: true });

    return;
  }

  const interfaceBlob = findEmbedFile('interface.zip');
  const drizzleBlob = findEmbedFile('drizzle.zip');
  const mediasoupBlob = findEmbedFile('mediasoup-worker');

  if (!interfaceBlob || !drizzleBlob || !mediasoupBlob) {
    throw new Error('Embedded files not found');
  }

  try {
    logger.debug('Extracting interface...');

    await unzipBlobToDirectory(interfaceBlob, INTERFACE_PATH);
  } catch (error) {
    logger.error('Failed to extract interface:', error);
    process.exit(1);
  }

  try {
    logger.debug('Extracting drizzle migrations...');

    await unzipBlobToDirectory(drizzleBlob, DRIZZLE_PATH);
  } catch (error) {
    logger.error('Failed to extract drizzle migrations:', error);
    process.exit(1);
  }

  try {
    logger.debug('Extracting mediasoup worker...');

    const mediasoupPath = path.join(
      MEDIASOUP_PATH,
      getExecutableName('mediasoup-worker')
    );

    const arrayBuffer = await mediasoupBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(mediasoupPath, buffer);
    await fs.chmod(mediasoupPath, 0o755);
  } catch (error) {
    logger.error('Failed to extract mediasoup worker:', error);
  }
};

export { loadEmbeds };
