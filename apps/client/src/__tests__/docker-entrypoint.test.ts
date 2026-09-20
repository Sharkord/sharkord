import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// the entrypoint is a shell script, so it is run with a real shell rather than read as
// text, and only what a real run can observe is asserted: the directories it creates.
//
// the assertions mirror apps/server/src/helpers/paths.ts, which is the whole point of the
// change: the app resolves SHARKORD_DATA_PATH and falls back to <config>/sharkord, and the
// entrypoint has to prepare that very directory or the app's own write fails as the bun
// user. a test that only agreed with itself would not have caught the original bug.
//
// scope, stated plainly: this machine runs the script as a normal user, so the run takes
// the early `exec /sharkord` branch and the privileged half - the recursive chown, the
// PUID/PGID remap - is not reached or claimed here. those need a container.
const BASH_CANDIDATES = [
  join(process.env.ProgramFiles ?? '', 'Git', 'bin', 'bash.exe'),
  join(process.env['ProgramFiles(x86)'] ?? '', 'Git', 'bin', 'bash.exe'),
  join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Git', 'bin', 'bash.exe'),
  '/bin/sh',
  '/usr/bin/sh'
];

const shell = BASH_CANDIDATES.find((candidate) => existsSync(candidate));

const ENTRYPOINT = resolve(import.meta.dir, '../../../../docker-entrypoint.sh');

const runEntrypoint = (cwd: string, env: Record<string, string> = {}) =>
  Bun.spawnSync([shell!, ENTRYPOINT], {
    cwd,
    env: {
      ...process.env,
      // msys rewrites absolute-looking arguments on the way to a real binary, which the
      // linux target never does
      MSYS2_ARG_CONV_EXCL: '*',
      MSYS_NO_PATHCONV: '1',
      ...env
    },
    stdout: 'pipe',
    stderr: 'pipe'
  });

const toShellPath = (path: string) => path.replace(/\\/g, '/');

describe.skipIf(!shell)('docker-entrypoint.sh', () => {
  const created: string[] = [];

  const scratch = () => {
    const dir = join(tmpdir(), `sharkord-entrypoint-${crypto.randomUUID()}`);

    mkdirSync(dir, { recursive: true });
    created.push(dir);

    return dir;
  };

  afterEach(() => {
    while (created.length) {
      const dir = created.pop();

      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  // the reported bug: the server reads SHARKORD_DATA_PATH, the entrypoint did not, so the
  // directory the app was pointed at was never created and the app could not write into it
  test('should create the directory SHARKORD_DATA_PATH points at', () => {
    const cwd = scratch();
    const target = join(cwd, 'custom-data');

    runEntrypoint(cwd, { SHARKORD_DATA_PATH: toShellPath(target) });

    expect(existsSync(target)).toBe(true);
  });

  test('should create a nested path in one go', () => {
    const cwd = scratch();
    const target = join(cwd, 'a', 'b', 'c');

    runEntrypoint(cwd, { SHARKORD_DATA_PATH: toShellPath(target) });

    expect(existsSync(target)).toBe(true);
  });

  // the server resolves the value with path.resolve(process.cwd()), so the entrypoint has
  // to resolve it against the same place rather than against a directory of its own
  test('should resolve a relative path against the working directory', () => {
    const cwd = scratch();

    runEntrypoint(cwd, { SHARKORD_DATA_PATH: './relative-data' });

    expect(existsSync(join(cwd, 'relative-data'))).toBe(true);
  });

  test('should still create a relative path when the value has a trailing slash', () => {
    const cwd = scratch();

    runEntrypoint(cwd, { SHARKORD_DATA_PATH: 'trailing/' });

    expect(existsSync(join(cwd, 'trailing'))).toBe(true);
  });

  // the default is <config>/sharkord, the same string apps/server/src/helpers/paths.ts
  // falls back to, and it is not asserted here: the shell on this machine is not the
  // container's, so the container home cannot be created or observed without root. the
  // default is the unchanged behaviour; what this file covers is the variable that was
  // being ignored
  test('should not fail before it reaches the binary it execs', () => {
    const cwd = scratch();
    const target = join(cwd, 'quiet-data');

    const result = runEntrypoint(cwd, {
      SHARKORD_DATA_PATH: toShellPath(target)
    });

    // the only error expected here is the missing /sharkord binary, which is the last
    // line of the script and not a failure of the directory preparation above it
    expect(result.stderr.toString()).not.toContain('cannot create directory');
  });
});
