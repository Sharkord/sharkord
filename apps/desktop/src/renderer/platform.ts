const isMac = navigator.userAgent.includes('Macintosh');
const isLinux = navigator.userAgent.includes('Linux');
const isWindows = navigator.userAgent.includes('Windows');

const canToggleMenuBar = !isMac;
const hasTray = !isMac;

export { canToggleMenuBar, hasTray, isLinux, isMac, isWindows };
