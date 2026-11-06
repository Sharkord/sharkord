const isMac = navigator.userAgent.includes('Macintosh');
const isLinux = navigator.userAgent.includes('Linux');

const canToggleMenuBar = !isMac;
const hasTray = !isMac;

export { canToggleMenuBar, hasTray, isLinux, isMac };
