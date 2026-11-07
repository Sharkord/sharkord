const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const executable = path.join(__dirname, 'build/sharkord-window-audio.exe');
const enabled = process.platform === 'win32';

const writeTone = (file, frequency) => {
  const rate = 48000;
  const pcm = Buffer.alloc(rate * 4);
  for (let i = 0; i < rate * 2; i++) {
    pcm.writeInt16LE(
      Math.round(655 * Math.sin((2 * Math.PI * frequency * i) / rate)),
      i * 2
    );
  }
  const header = Buffer.alloc(44);
  header.write('RIFF');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, pcm]));
};

const startPlayer = (file) =>
  new Promise((resolve, reject) => {
    const escaped = file.replaceAll("'", "''");
    // the form has a real hwnd but is never shown; capture is restricted to this test process.
    const script = `Add-Type -AssemblyName System.Windows.Forms; $form = New-Object System.Windows.Forms.Form; [Console]::Out.WriteLine($form.Handle.ToInt64()); $player = New-Object System.Media.SoundPlayer '${escaped}'; $player.Load(); $player.PlayLooping(); Start-Sleep -Seconds 20`;
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true }
    );
    let output = '';
    let error = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`player startup timed out: ${error}`));
    }, 10000);
    child.stderr.on('data', (data) => {
      error += data;
    });
    child.stdout.on('data', (data) => {
      output += data;
      if (output.includes('\n')) {
        clearTimeout(timeout);
        resolve({ child, handle: output.trim() });
      }
    });
    child.on('error', reject);
    child.on('exit', () => {
      clearTimeout(timeout);
      reject(new Error(error || 'player exited'));
    });
  });

const capture = (handle) =>
  new Promise((resolve, reject) => {
    const child = spawn(executable, [handle], { windowsHide: true });
    const chunks = [];
    let error = '';
    const stop = setTimeout(() => child.stdin.end(), 5000);
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('helper did not stop'));
    }, 9000);
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => {
      error += chunk;
    });
    child.stdin.on('error', () => {});
    child.on('error', reject);
    child.on('exit', (code) => {
      clearTimeout(stop);
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(error));
      const data = Buffer.concat(chunks);
      assert.equal(data.subarray(0, 8).toString(), 'SAUDIO1\n');
      assert.equal((data.length - 8) % 8, 0);
      resolve(data.subarray(8));
    });
  });

const amplitude = (pcm, frequency) => {
  const frames = Math.min(48000 * 2, pcm.length / 8 - 48000);
  assert.ok(
    frames > 48000,
    'capture must contain more than two seconds of audio'
  );
  let real = 0;
  let imaginary = 0;
  for (let i = 0; i < frames; i++) {
    const sample = pcm.readFloatLE((i + 48000) * 8);
    real += sample * Math.cos((2 * Math.PI * frequency * i) / 48000);
    imaginary += sample * Math.sin((2 * Math.PI * frequency * i) / 48000);
  }
  return (2 * Math.hypot(real, imaginary)) / frames;
};

test(
  'invalid or missing window handles never start audio capture',
  { skip: !enabled },
  () => {
    for (const args of [
      [],
      ['0'],
      ['not-a-window'],
      ['18446744073709551615']
    ]) {
      const result = spawnSync(executable, args, { windowsHide: true });
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout.length, 0);
    }
  }
);

test(
  'captures only the selected window process and stops on stdin close',
  {
    skip: !enabled,
    timeout: 30000
  },
  async () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'sharkord-audio-test-')
    );
    const files = [
      path.join(directory, '440.wav'),
      path.join(directory, '880.wav')
    ];
    const players = [];
    try {
      writeTone(files[0], 440);
      writeTone(files[1], 880);
      players.push(await startPlayer(files[0]));
      players.push(await startPlayer(files[1]));
      await new Promise((resolve) => setTimeout(resolve, 500));
      const recordings = await Promise.all(
        players.map(({ handle }) => capture(handle))
      );
      recordings.forEach((pcm, i) => {
        const selected = amplitude(pcm, i === 0 ? 440 : 880);
        const other = amplitude(pcm, i === 0 ? 880 : 440);
        assert.ok(selected > 0.0001, 'selected app must be audible');
        assert.ok(
          selected > other * 100,
          'unselected app must be at least 40 dB quieter'
        );
      });
    } finally {
      for (const { child } of players) child.kill();
      // only these two generated files are removed; no recursive deletion.
      for (const file of files) if (fs.existsSync(file)) fs.unlinkSync(file);
      fs.rmdirSync(directory);
    }
  }
);
