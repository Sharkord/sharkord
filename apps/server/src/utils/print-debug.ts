import chalk from 'chalk';
import {
  config,
  SERVER_INTERNAL_ANNOUNCED_IP,
  SERVER_PRIVATE_IP,
  SERVER_PUBLIC_IP,
  SERVER_PUBLIC_IPV6
} from '../config';
import * as serverPaths from '../helpers/paths';
import * as envVars from './env';

const printDebug = () => {
  if (!config.server.debug) return;

  const message = [
    chalk.dim('────────────────────────────────────────────────────'),
    `${chalk.blue('Bun version:')} ${chalk.bold(String(Bun.version_with_sha))}`,
    `${chalk.blue('Local address:')} ${chalk.bold(String(SERVER_PRIVATE_IP))}`,
    `${chalk.blue('Public address:')} ${chalk.bold(String(SERVER_PUBLIC_IP))}`,
    `${chalk.blue('Public IPv6 address:')} ${chalk.bold(String(SERVER_PUBLIC_IPV6))}`,
    `${chalk.blue('Internal announced address:')} ${chalk.bold(String(SERVER_INTERNAL_ANNOUNCED_IP))}`,
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
    `${chalk.blue('Environment Variables:')} ${chalk.bold(
      String(
        Object.entries(envVars)
          .map(([key, value]) => `\n  ${key}: ${value}`)
          .join('')
      )
    )}`
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
