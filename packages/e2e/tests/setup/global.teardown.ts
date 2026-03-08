import fs from 'fs/promises';
import { e2eDataPath } from '../statics';

export default async function globalTeardown(): Promise<void> {
  await fs.rm(e2eDataPath, { recursive: true, force: true });
}
