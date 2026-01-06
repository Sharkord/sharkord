import path from 'path';
import { ensureDir } from './fs';
import * as serverPaths from './paths';

const ensureServerDirs = async () => {
  const pathsList = Object.values(serverPaths);
  const IGNORE_LIST = [
    serverPaths.SRC_MIGRATIONS_PATH,
    serverPaths.MEDIASOUP_BINARY_PATH
  ];

  const promises = pathsList.map(async (dir) => {
    if (!dir || typeof dir !== 'string') return;

    const resolvedPath = path.resolve(process.cwd(), dir);
    const extension = path.extname(resolvedPath);

    if (extension || IGNORE_LIST.includes(resolvedPath)) return;

    await ensureDir(resolvedPath);
  });

  await Promise.all(promises);
};

export { ensureServerDirs };
