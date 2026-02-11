import type { TArtifact } from '@sharkord/shared';
import {
  validateReleaseMetadata,
  type TReleaseMetadata
} from 'bun-sfe-autoupdater';
import fs from 'fs/promises';
import path from 'path';

const buildScriptDir = import.meta.dir;
const serverCwd = path.resolve(buildScriptDir, '..');
const rootCwd = path.resolve(serverCwd, '..', '..');

const rootPckJson = path.join(rootCwd, 'package.json');
const serverPckJson = path.join(rootCwd, 'apps', 'server', 'package.json');
const clientPckJson = path.join(rootCwd, 'apps', 'client', 'package.json');
const sharedPckJson = path.join(rootCwd, 'packages', 'shared', 'package.json');

const unpack = async (tgzPath: string, outDir: string) => {
  const tarProc = Bun.spawn(['tar', '-xzf', tgzPath, '-C', outDir], {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit'
  });
  await tarProc.exited;

  if (tarProc.exitCode !== 0) {
    throw new Error(`Failed to unpack ${tgzPath}`);
  }
};

const downloadMediasoupBinary = async (
  version: string,
  target: Bun.Build.Target
) => {
  let url = `https://github.com/versatica/mediasoup/releases/download/${version}/`;
  let fileName = '';

  switch (target) {
    case 'bun-linux-x64':
      url += `mediasoup-worker-${version}-linux-x64-kernel6.tgz`;
      fileName = 'mediasoup-worker';
      break;
    case 'bun-linux-arm64':
      url += `mediasoup-worker-${version}-linux-arm64-kernel6.tgz`;
      fileName = 'mediasoup-worker';
      break;
    case 'bun-windows-x64':
      url += `mediasoup-worker-${version}-win32-x64.tgz`;
      fileName = 'mediasoup-worker.exe';
      break;
    case 'bun-darwin-arm64':
      url += `mediasoup-worker-${version}-darwin-arm64.tgz`;
      fileName = 'mediasoup-worker';
      break;
    default:
      throw new Error(`Unsupported target for mediasoup binary: ${target}`);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download mediasoup binary for target ${target}: ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const targetPath = path.join(
    serverCwd,
    'build',
    'temp',
    `mediasoup-worker-${target}.tgz`
  );

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, buffer);

  await unpack(targetPath, path.join(serverCwd, 'build', 'temp'));

  return fileName;
};

const getCurrentVersion = async () => {
  const pkg = JSON.parse(await fs.readFile(rootPckJson, 'utf8'));

  return pkg.version;
};

const getMediasoupVersion = async () => {
  const serverPkg = JSON.parse(await fs.readFile(serverPckJson, 'utf8'));

  return serverPkg.dependencies['mediasoup'].replace('^', '');
};

const patchPackageJsons = async (newVersion: string) => {
  const packageJsonPaths = [
    rootPckJson,
    serverPckJson,
    clientPckJson,
    sharedPckJson
  ];

  for (const pckPath of packageJsonPaths) {
    const pkg = JSON.parse(await fs.readFile(pckPath, 'utf8'));

    pkg.version = newVersion;

    await fs.writeFile(pckPath, JSON.stringify(pkg, null, 2), 'utf8');
  }
};

type TTarget = {
  out: string;
  target: Bun.Build.Target;
};

const compile = async ({ out, target }: TTarget) => {
  const version = await getCurrentVersion();
  const mediasoupVersion = await getMediasoupVersion();
  const mediasoupBinary = await downloadMediasoupBinary(
    mediasoupVersion,
    target
  );

  const entryPoints = [
    path.join(serverCwd, 'src', 'index.ts'),
    path.join(serverCwd, 'build', 'temp', 'drizzle.zip'),
    path.join(serverCwd, 'build', 'temp', 'interface.zip'),
    path.join(serverCwd, 'build', 'temp', mediasoupBinary)
  ];

  await Bun.build({
    entrypoints: entryPoints,
    compile: {
      outfile: out,
      target,
      windows: {
        copyright: `Copyright (c) ${new Date().getFullYear()} Sharkord`,
        description: 'Sharkord Server - https://sharkord.com',
        title: 'Sharkord Server',
        icon: path.join(serverCwd, 'assets', 'icon.ico'),
        version: version,
        publisher: 'Sharkord'
      }
    },
    define: {
      'process.env.SHARKORD_ENV': '"production"',
      'process.env.SHARKORD_BUILD_VERSION': `"${version}"`,
      'process.env.SHARKORD_BUILD_DATE': `"${new Date().toISOString()}"`,
      'process.env.SHARKORD_MEDIASOUP_BIN_NAME': `"${mediasoupBinary}"`,
      'process.env.CURRENT_VERSION': `"${version}"`
    }
  });
};

const getFileChecksum = async (filePath: string) => {
  const fileBuffer = await fs.readFile(filePath);
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex;
};

const getVersionInfo = async (
  targets: TTarget[],
  outPath: string
): Promise<TReleaseMetadata> => {
  const version = await getCurrentVersion();

  const artifacts: TArtifact[] = [];

  for (const target of targets) {
    const artifactPath = path.join(outPath, target.out);

    artifacts.push({
      name: path.basename(artifactPath),
      target: target.target.replace('bun-', ''),
      size: (await fs.stat(artifactPath)).size,
      checksum: await getFileChecksum(artifactPath)
    });
  }

  const versionInfo = validateReleaseMetadata({
    version,
    releaseDate: new Date().toISOString(),
    artifacts
  });

  return versionInfo;
};

const rmIfExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    await fs.rm(filePath);
  } catch {
    // ignore
  }
};

export {
  compile,
  downloadMediasoupBinary,
  getCurrentVersion,
  getVersionInfo,
  patchPackageJsons,
  rmIfExists
};
export type { TTarget };
