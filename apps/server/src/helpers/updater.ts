import { getErrorMessage } from '@sharkord/shared';
import { BunUpdater } from 'bun-sfe-autoupdater';
import { config } from '../config';
import { logger } from '../logger';
import { IS_DOCKER, IS_PRODUCTION, SERVER_VERSION } from '../utils/env';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const CONSECUTIVE_FAILURES_BEFORE_ALARM = 3;

class Updater {
  private bunUpdater: BunUpdater;
  private isUpdating: boolean = false;
  private consecutiveFailures: number = 0;
  private checkTimer: ReturnType<typeof setInterval> | null = null;

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

      if (this.consecutiveFailures > 0) {
        logger.info(
          'Update check recovered after %d consecutive failures',
          this.consecutiveFailures
        );
      }

      this.consecutiveFailures = 0;
    } catch (error) {
      this.consecutiveFailures += 1;

      logger.error(
        'Failed to check for updates (%d consecutive): %s',
        this.consecutiveFailures,
        getErrorMessage(error)
      );

      if (this.consecutiveFailures === CONSECUTIVE_FAILURES_BEFORE_ALARM) {
        logger.error(
          'Auto-update has failed %d times in a row and this server is not updating itself. Check network access to GitHub, or disable server.autoupdate.',
          this.consecutiveFailures
        );
      }
    } finally {
      this.isUpdating = false;
    }
  };

  public stop = (): void => {
    if (!this.checkTimer) return;

    clearInterval(this.checkTimer);
    this.checkTimer = null;
  };

  private setupAutoUpdater = async (): Promise<void> => {
    if (!config.server.autoupdate) {
      return;
    }

    logger.info(
      `Auto-updater enabled, checking every ${UPDATE_CHECK_INTERVAL_MS / 1000 / 60} minutes`
    );

    await this.update();

    this.checkTimer = setInterval(this.update, UPDATE_CHECK_INTERVAL_MS);
  };
}

const updater = new Updater();

export { updater };
