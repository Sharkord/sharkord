const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const executable = path.join(
  __dirname,
  'build',
  'sharkord-audio-attenuator.exe'
);

const createLineReader = (child) => {
  let buffer = '';
  const lines = [];
  const waiters = [];

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
      buffer = buffer.slice(newlineIndex + 1);
      const waiter = waiters.shift();
      if (waiter) {
        waiter(line);
      } else {
        lines.push(line);
      }
      newlineIndex = buffer.indexOf('\n');
    }
  });

  const nextLine = (timeoutMs = 5000) => {
    if (lines.length > 0) {
      return Promise.resolve(lines.shift());
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = waiters.indexOf(onLine);
        if (idx !== -1) waiters.splice(idx, 1);
        reject(new Error('Timed out waiting for line from helper'));
      }, timeoutMs);

      const onLine = (line) => {
        clearTimeout(timer);
        resolve(line);
      };
      waiters.push(onLine);
    });
  };

  return { nextLine };
};

test('rejects invalid PID arguments', () => {
  if (process.platform !== 'win32') return;

  const result = spawnSync(executable, ['not-a-pid'], { windowsHide: true });
  assert.notEqual(result.status, 0);
});

test('starts, handles PING/EXCLUDE/DUCK/RESTORE commands, and exits cleanly on QUIT', async () => {
  if (process.platform !== 'win32') return;

  const child = spawn(executable, [String(process.pid)], { windowsHide: true });
  const reader = createLineReader(child);

  const ready = await reader.nextLine();
  assert.equal(ready, 'READY');

  child.stdin.write('PING\n');
  assert.equal(await reader.nextLine(), 'PONG');

  child.stdin.write(`EXCLUDE ${process.pid}\n`);
  assert.equal(await reader.nextLine(), 'OK');

  child.stdin.write('DUCK 50 50\n');
  assert.equal(await reader.nextLine(), 'OK');

  child.stdin.write('RESTORE 50\n');
  assert.equal(await reader.nextLine(), 'OK');

  child.stdin.write('UNKNOWN_CMD\n');
  assert.equal(await reader.nextLine(), 'ERR unknown command');

  const exitPromise = new Promise((resolve) => {
    child.on('close', (code) => resolve(code));
  });

  child.stdin.write('QUIT\n');
  const exitCode = await exitPromise;
  assert.equal(exitCode, 0);
});

test('exits cleanly when stdin closes (parent process EOF)', async () => {
  if (process.platform !== 'win32') return;

  const child = spawn(executable, [String(process.pid)], { windowsHide: true });
  const reader = createLineReader(child);

  assert.equal(await reader.nextLine(), 'READY');

  const exitPromise = new Promise((resolve) => {
    child.on('close', (code) => resolve(code));
  });

  child.stdin.end();
  const exitCode = await exitPromise;
  assert.equal(exitCode, 0);
});
