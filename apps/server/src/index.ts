// these two imports NEED to be at the very top in this order
// keep the "---------" because it forces prettier to not mess with the order, I can't turn this off here for some reason, need to check later
import { ensureServerDirs } from './helpers/ensure-server-dirs';
await ensureServerDirs();
// ----------------------------------------
import { loadEmbeds } from './utils/embeds';
await loadEmbeds();
// ----------------------------------------
import { IS_PRODUCTION, SERVER_VERSION } from './utils/env';
// ----------------------------------------
import { ActivityLogType } from '@sharkord/shared';
import chalk from 'chalk';
import { config, SERVER_PRIVATE_IP } from './config';
import { loadCrons } from './crons';
import { loadDb } from './db';
import { enqueueActivityLog } from './queues/activity-log';
import { initVoiceRuntimes } from './runtimes';
import { createServers } from './utils/create-servers';
import { loadMediasoup } from './utils/mediasoup';
import { printDebug } from './utils/print-debug';
import './utils/updater';

await loadDb();
await createServers();
await loadMediasoup();
await initVoiceRuntimes();
await loadCrons();

const host = IS_PRODUCTION ? SERVER_PRIVATE_IP : 'localhost';
const url = `http://${host}:${config.server.port}/`;

const message = [
  chalk.green.bold('SHARKORD') + ' ' + chalk.white.bold(`v${SERVER_VERSION}`),
  chalk.dim('────────────────────────────────────────────────────'),
  `${chalk.yellow('Port:')} ${chalk.bold(String(config.server.port))}`,
  `${chalk.yellow('Interface:')} ${chalk.underline.cyan(url)}`
].join('\n');

console.log('%s', message);

printDebug();

enqueueActivityLog({
  type: ActivityLogType.SERVER_STARTED
});
