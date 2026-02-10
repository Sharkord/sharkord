import { BunUpdater } from 'bun-sfe-autoupdater';
import { config } from '../config';
import { logger } from '../logger';
import { IS_DOCKER, IS_PRODUCTION, SERVER_VERSION } from './env';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

class Updater {
  private bunUpdater: BunUpdater;
  private isUpdating: boolean = false;

  constructor() {
    this.bunUpdater = new BunUpdater({
      repoOwner: 'Sharkord',
      repoName: 'sharkord',
      currentVersion: SERVER_VERSION
    });

    if (!this.canUpdate()) {
      return;
    }

    this.setupAutoUpdater();
  }

  public canUpdate = (): boolean => IS_PRODUCTION && !IS_DOCKER;

  public getLatestVersion = async () => this.bunUpdater.getLatestVersion();

  public hasUpdates = async () => this.bunUpdater.hasUpdates();

  public update = async (): Promise<void> => {
    if (!this.canUpdate()) return;

    if (this.isUpdating) {
      logger.debug('Update check already in progress, skipping');
      return;
    }

    this.isUpdating = true;

    try {
      logger.info('Checking for updates...');

      // if an update is available, it will be downloaded automatically
      // the app will restart to apply the update
      await this.bunUpdater.checkForUpdates();
    } catch (error) {
      logger.error('Failed to check for updates:', error);
    } finally {
      this.isUpdating = false;
    }
  };

  private setupAutoUpdater = async (): Promise<void> => {
    if (!config.server.autoupdate) {
      logger.info('Auto-updater disabled: check config to enable');
      return;
    }

    logger.info(
      `Auto-updater enabled, checking every ${UPDATE_CHECK_INTERVAL_MS / 1000 / 60} minutes`
    );

    await this.update();

    setInterval(this.update, UPDATE_CHECK_INTERVAL_MS);
  };
}

const updater = new Updater();

export { updater };
