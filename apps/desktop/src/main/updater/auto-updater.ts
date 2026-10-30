import { app, Notification, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { TUpdateState } from '../../shared/types';
import { showConfirmDialog } from '../dialogs/show-confirm-dialog';
import { i18n } from '../i18n';

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const STALE_CHECK_MS = 10 * 60 * 1000;
const BUSY_STATUSES = new Set<TUpdateState['status']>([
  'checking',
  'downloading',
  'ready'
]);

// unpackaged dev runs have no update feed, and on linux only the appimage can update itself
const canUpdate = () =>
  app.isPackaged && (process.platform !== 'linux' || !!process.env.APPIMAGE);

// squirrel.mac only installs an update signed like the running app, so an unsigned mac build
// offers each release for download instead
// ponytail: manual updates on macos, drop it once the mac builds are signed with a developer id
const updatesManually = process.platform === 'darwin';
// the publish target in electron-builder.yml, releases are tagged v<version>
const RELEASES_URL = 'https://github.com/Sharkord/sharkord-desktop/releases';

const listeners = new Set<(state: TUpdateState) => void>();

let promptedVersion: string | undefined;
let notifiedVersion: string | undefined;
// kept so it is not garbage collected before it is clicked
let availableNotification: Notification | undefined;
let openUpdates: () => void = () => {};
let enabled = true;
let lastCheckAt = 0;
let state: TUpdateState = {
  currentVersion: app.getVersion(),
  status: canUpdate() ? 'idle' : 'unsupported',
  latestVersion: null,
  percent: 0,
  manual: updatesManually
};

const setState = (patch: Partial<TUpdateState>) => {
  state = { ...state, ...patch };

  for (const listener of listeners) {
    listener(state);
  }
};

const getUpdateState = () => state;

const onUpdateStateChange = (listener: (state: TUpdateState) => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const checkForUpdates = () => {
  if (!canUpdate() || BUSY_STATUSES.has(state.status)) {
    return;
  }

  lastCheckAt = Date.now();

  autoUpdater.checkForUpdates().catch((error) => {
    console.error('update check failed', error);
    setState({ status: 'error' });
  });
};

const checkForUpdatesIfStale = () => {
  if (Date.now() - lastCheckAt < STALE_CHECK_MS) {
    return;
  }

  checkForUpdates();
};

const downloadUpdate = () => {
  if (state.status !== 'available') {
    return;
  }

  if (updatesManually) {
    shell
      .openExternal(`${RELEASES_URL}/tag/v${state.latestVersion}`)
      .catch(console.error);

    return;
  }

  autoUpdater.downloadUpdate().catch((error) => {
    console.error('update download failed', error);
    setState({ status: 'error' });
  });
};

const installUpdate = () => {
  if (state.status !== 'ready') {
    return;
  }

  autoUpdater.quitAndInstall();
};

type TUpdatePrompt = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

const promptUpdate = async (
  version: string,
  { title, message, confirmLabel, onConfirm }: TUpdatePrompt
) => {
  // a check can report the same version again, ask only once
  if (!enabled || promptedVersion === version) {
    return;
  }

  promptedVersion = version;

  // no parent window, it may be hidden in the tray and the prompt would not show
  const isConfirmed = await showConfirmDialog(undefined, {
    type: 'info',
    message: title,
    detail: message,
    confirmLabel,
    cancelLabel: i18n.t('updateDialog.later'),
    focusConfirm: true
  });

  if (isConfirmed) {
    onConfirm();
  }
};

const notifyAvailable = (version: string) => {
  if (enabled || notifiedVersion === version || !Notification.isSupported()) {
    return;
  }

  notifiedVersion = version;

  const notification = new Notification({
    title: i18n.t('updateNotification.title'),
    body: i18n.t('updateNotification.body', { version })
  });

  notification.on('click', () => {
    openUpdates();
  });

  availableNotification = notification;
  availableNotification.show();
};

type TStartAutoUpdaterOptions = {
  onOpenUpdates: () => void;
};

const startAutoUpdater = ({ onOpenUpdates }: TStartAutoUpdaterOptions) => {
  if (!canUpdate()) {
    return;
  }

  openUpdates = onOpenUpdates;

  autoUpdater.on('checking-for-update', () => {
    setState({ status: 'checking' });
  });

  autoUpdater.on('update-not-available', () => {
    setState({ status: 'up-to-date', latestVersion: null });
  });

  autoUpdater.on('update-available', ({ version }) => {
    setState({ status: 'available', latestVersion: version, percent: 0 });
    notifyAvailable(version);

    if (updatesManually) {
      promptUpdate(version, {
        title: i18n.t('manualUpdateDialog.title'),
        message: i18n.t('manualUpdateDialog.message', { version }),
        confirmLabel: i18n.t('manualUpdateDialog.download'),
        onConfirm: downloadUpdate
      }).catch(console.error);
    }
  });

  autoUpdater.on('download-progress', ({ percent }) => {
    setState({ status: 'downloading', percent: Math.round(percent) });
  });

  autoUpdater.on('update-downloaded', ({ version }) => {
    setState({ status: 'ready', latestVersion: version, percent: 100 });
    promptUpdate(version, {
      title: i18n.t('updateDialog.title'),
      message: i18n.t('updateDialog.message', { version }),
      confirmLabel: i18n.t('updateDialog.restart'),
      onConfirm: installUpdate
    }).catch(console.error);
  });

  autoUpdater.on('error', (error) => {
    console.error('updater error', error);
    setState({ status: 'error' });
  });

  checkForUpdates();

  setInterval(checkForUpdates, CHECK_INTERVAL_MS);
};

const setAutoUpdateEnabled = (value: boolean) => {
  const wasEnabled = enabled;

  enabled = value;
  // turned off, a check only reports what is out and the user downloads it from the settings
  autoUpdater.autoDownload = value && !updatesManually;
  // an update downloaded before turning it off must not install on quit either
  autoUpdater.autoInstallOnAppQuit = value && !updatesManually;

  // a check with downloads on also fetches an update found while they were off
  if (value && !wasEnabled) {
    checkForUpdates();
  }
};

export {
  checkForUpdates,
  checkForUpdatesIfStale,
  downloadUpdate,
  getUpdateState,
  installUpdate,
  onUpdateStateChange,
  setAutoUpdateEnabled,
  startAutoUpdater
};
