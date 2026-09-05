import fs from 'fs/promises';
import path from 'path';

// written to the data directory so a test can see what ran, and in which order
const record = async (ctx, line) => {
  const logPath = path.join(ctx.dataPath, 'lifecycle.log');
  const existing = (await fs.exists(logPath))
    ? await fs.readFile(logPath, 'utf-8')
    : '';

  await fs.writeFile(logPath, `${existing}${line}\n`);
};

const onUpgrade = async (ctx, { previousVersion, version }) => {
  if (process.env.PLUGIN_UPGRADE_SHOULD_FAIL === 'true') {
    throw new Error('migration failed');
  }

  await record(ctx, `upgrade:${previousVersion}->${version}`);
};

const onLoad = async (ctx) => {
  await record(ctx, 'load');
};

const onUnload = () => {};

export { onLoad, onUnload, onUpgrade };
