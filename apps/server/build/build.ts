import fs from 'fs/promises';
import path from 'path';
import { zipDirectory } from '../src/helpers/zip';
import { compile } from './compile';

const clientCwd = path.resolve(process.cwd(), '..', 'client');
const serverCwd = process.cwd();
const viteDistPath = path.join(clientCwd, 'dist');
const buildPath = path.join(serverCwd, 'build');
const buildTempPath = path.join(buildPath, 'temp');
const drizzleMigrationsPath = path.join(serverCwd, 'src', 'db', 'migrations');
const outPath = path.join(buildPath, 'out');
const interfaceZipPath = path.join(buildTempPath, 'interface.zip');
const drizzleZipPath = path.join(buildTempPath, 'drizzle.zip');

await fs.rm(buildTempPath, { recursive: true, force: true });
await fs.mkdir(buildTempPath, { recursive: true });

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

const targets: { out: string; target: Bun.Build.Target }[] = [
  { out: 'sharkord-linux-x64', target: 'bun-linux-x64' },
  { out: 'sharkord-linux-arm64', target: 'bun-linux-arm64' },
  { out: 'sharkord-windows-x64.exe', target: 'bun-windows-x64' },
  { out: 'sharkord-macos-x64', target: 'bun-darwin-x64' },
  { out: 'sharkord-macos-arm64', target: 'bun-darwin-arm64' }
];

for (const target of targets) {
  console.log(`Building for target: ${target.target}...`);

  await compile({
    outPath: path.join(outPath, target.out),
    target: target.target
  });
}

await fs.rm(buildTempPath, { recursive: true, force: true });

console.log('Sharkord built.');
