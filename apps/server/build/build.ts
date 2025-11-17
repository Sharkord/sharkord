import fs from 'fs/promises';
import path from 'path';
import semver from 'semver';
import { parseArgs } from 'util';
import { zipDirectory } from '../src/helpers/zip';
import {
  compile,
  getCurrentVersion,
  getVersionInfo,
  patchPackageJsons,
  rmIfExists,
  type TTarget
} from './helpers';

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    bump: {
      type: 'string',
      default: 'none'
    }
  },
  strict: true,
  allowPositionals: true
});

if (values.bump && values.bump !== 'none') {
  const newVersion = semver.inc(
    await getCurrentVersion(),
    values.bump as semver.ReleaseType
  );

  if (!newVersion) {
    console.error('Failed to increment version');
    process.exit(1);
  }

  await patchPackageJsons(newVersion);
}

const clientCwd = path.resolve(process.cwd(), '..', 'client');
const serverCwd = process.cwd();
const viteDistPath = path.join(clientCwd, 'dist');
const buildPath = path.join(serverCwd, 'build');
const buildTempPath = path.join(buildPath, 'temp');
const drizzleMigrationsPath = path.join(serverCwd, 'src', 'db', 'migrations');
const outPath = path.join(buildPath, 'out');
const releasePath = path.join(outPath, 'release.json');
const interfaceZipPath = path.join(buildTempPath, 'interface.zip');
const drizzleZipPath = path.join(buildTempPath, 'drizzle.zip');

await rmIfExists(buildTempPath);
await rmIfExists(outPath);
await fs.mkdir(buildTempPath, { recursive: true });
await fs.mkdir(outPath, { recursive: true });

console.log('Building client with Vite...');

const viteProc = Bun.spawn(['bun', 'run', 'build'], {
  cwd: clientCwd,
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit'
});
await viteProc.exited;

if (viteProc.exitCode !== 0) {
  console.error('Client build failed');
  process.exit(viteProc.exitCode);
}

console.log('Client build finished, output at:', viteDistPath);
console.log('Creating interface.zip...');

await zipDirectory(viteDistPath, interfaceZipPath);

console.log('Creating drizzle.zip...');

await zipDirectory(drizzleMigrationsPath, drizzleZipPath);

console.log('Compiling server with Bun...');

const targets: TTarget[] = [
  { out: 'sharkord-linux-x64', target: 'bun-linux-x64' },
  { out: 'sharkord-linux-arm64', target: 'bun-linux-arm64' },
  { out: 'sharkord-windows-x64.exe', target: 'bun-windows-x64' },
  { out: 'sharkord-macos-arm64', target: 'bun-darwin-arm64' }
];

for (const target of targets) {
  console.log(`Building for target: ${target.target}...`);

  await compile({
    out: path.join(outPath, target.out),
    target: target.target
  });
}

const releaseInfo = await getVersionInfo(targets, outPath);

await fs.writeFile(releasePath, JSON.stringify(releaseInfo, null, 2), 'utf8');
await fs.rm(buildTempPath, { recursive: true, force: true });

console.log('Sharkord built.');
