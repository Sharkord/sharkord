import path from 'path';
import { ensureDir } from './fs';
import * as serverPaths from './paths';

const pathsList = Object.values(serverPaths);
const IGNORE_LIST = [serverPaths.SRC_MIGRATIONS_PATH];

const promises = pathsList.map(async (dir) => {
  const resolvedPath = path.resolve(process.cwd(), dir);
  const extension = path.extname(resolvedPath);

  if (extension || IGNORE_LIST.includes(resolvedPath)) return;

  await ensureDir(resolvedPath);
});

await Promise.all(promises);
