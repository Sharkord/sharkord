import { ActivityLogType } from '@sharkord/shared';
import chalk from 'chalk';
import { config, SERVER_PRIVATE_IP } from './config';
import { loadDb } from './db';
import './helpers/ensure-server-dirs';
import { enqueueActivityLog } from './queues/activity-log';
import { createServers } from './utils/create-servers';
import { loadEmbeds } from './utils/embeds';
import { IS_PRODUCTION, SERVER_VERSION } from './utils/env';
import { loadMediasoup } from './utils/mediasoup';
import { printDebug } from './utils/print-debug';

await loadEmbeds();
await loadDb();
await createServers();
await loadMediasoup();

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
