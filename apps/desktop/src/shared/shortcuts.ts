const SHORTCUTS = {
  addServer: 'CmdOrCtrl+Shift+N',
  toggleServerList: 'CmdOrCtrl+Shift+B',
  toggleMenuBar: 'CmdOrCtrl+Shift+M',
  togglePerformanceOverlay: 'CmdOrCtrl+Shift+D'
} as const;

const MAX_SHORTCUT_SERVERS = 9;

const getServerShortcut = (index: number) =>
  index < MAX_SHORTCUT_SERVERS ? `CmdOrCtrl+${index + 1}` : undefined;

export { MAX_SHORTCUT_SERVERS, SHORTCUTS, getServerShortcut };
