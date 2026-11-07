const { spawnSync } = require('node:child_process');
const path = require('node:path');

if (process.platform === 'win32') {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(__dirname, 'build.ps1')
    ],
    { stdio: 'inherit', windowsHide: true }
  );
  process.exit(result.status ?? 1);
}
