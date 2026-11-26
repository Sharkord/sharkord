export const DESKTOP_SHORTCUTS = {
  addServer: 'CmdOrCtrl+Shift+N',
  toggleServerList: 'CmdOrCtrl+Shift+B',
  toggleMenuBar: 'CmdOrCtrl+Shift+M',
  togglePerformanceOverlay: 'CmdOrCtrl+Shift+D'
} as const;

export const MAX_DESKTOP_SHORTCUT_SERVERS = 9;

export const getDesktopServerShortcut = (index: number) =>
  index < MAX_DESKTOP_SHORTCUT_SERVERS ? `CmdOrCtrl+${index + 1}` : undefined;
