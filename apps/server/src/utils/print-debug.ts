import chalk from 'chalk';
import { config, SERVER_PRIVATE_IP, SERVER_PUBLIC_IP } from '../config';
import * as serverPaths from '../helpers/paths';
import {
  BUILD_DATE,
  IS_DEVELOPMENT,
  IS_PRODUCTION,
  SERVER_VERSION,
  SHARKORD_MEDIASOUP_BIN_NAME
} from './env';

const printDebug = () => {
  if (!config.server.debug) return;

  const message = [
    chalk.dim('────────────────────────────────────────────────────'),
    `${chalk.blue('Bun version:')} ${chalk.bold(String(Bun.version_with_sha))}`,
    `${chalk.blue('Local address:')} ${chalk.bold(String(SERVER_PRIVATE_IP))}`,
    `${chalk.blue('Public address:')} ${chalk.bold(String(SERVER_PUBLIC_IP))}`,
    `${chalk.blue('Server paths:')} ${chalk.bold(
      String(
        Object.entries(serverPaths)
          .map(([key, value]) => `\n  ${key}: ${value}`)
          .join('')
      )
    )}`,
    `${chalk.blue('Config:')} ${chalk.bold(
      String(JSON.stringify(config, null, 2))
    )}`,
    `${chalk.blue('SHARKORD_MEDIASOUP_BIN_NAME:')} ${chalk.bold(String(SHARKORD_MEDIASOUP_BIN_NAME))}`,
    `${chalk.blue('IS_DEVELOPMENT:')} ${chalk.bold(String(IS_DEVELOPMENT))}`,
    `${chalk.blue('IS_PRODUCTION:')} ${chalk.bold(String(IS_PRODUCTION))}`,
    `${chalk.blue('SERVER_VERSION:')} ${chalk.bold(String(SERVER_VERSION))}`,
    `${chalk.blue('BUILD_DATE:')} ${chalk.bold(String(BUILD_DATE))}`
  ].join('\n');

  console.log('%s', message);
  console.log(
    chalk.dim('────────────────────────────────────────────────────')
  );
  console.log(
    chalk.white.bold('Debug mode is enabled. This may affect performance.')
  );
};

export { printDebug };
