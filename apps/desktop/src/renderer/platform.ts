const isMac = navigator.userAgent.includes('Macintosh');

const canToggleMenuBar = !isMac;

export { canToggleMenuBar, isMac };
