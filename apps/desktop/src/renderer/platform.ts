const isMac = navigator.userAgent.includes('Macintosh');

const canToggleMenuBar = !isMac;
const hasTray = !isMac;

export { canToggleMenuBar, hasTray, isMac };
