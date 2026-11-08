import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createAudioAttenuator } from '../audio-attenuation';

const createHarness = (
  platform: NodeJS.Platform = 'win32',
  releaseDelayMs = 40
) => {
  const commands: string[] = [];
  let stopped = 0;

  const attenuator = createAudioAttenuator({
    platform,
    releaseDelayMs,
    duckFadeMs: 150,
    restoreFadeMs: 200,
    getExcludedPids: () => [100, 200],
    sendCommand: (cmd) => commands.push(cmd),
    stopProcess: () => {
      stopped += 1;
    }
  });

  return {
    attenuator,
    commands,
    getStopped: () => stopped
  };
};

describe('audio attenuation controller', () => {
  test('is a no-op on non-Windows platforms', () => {
    const { attenuator, commands, getStopped } = createHarness('linux');

    attenuator.setAttenuationSettings({
      attenuationEnabled: true,
      attenuationPercent: 60,
      attenuateWhenOthersSpeak: true,
      attenuateWhenSelfSpeaks: true
    });
    attenuator.setServerSpeaking('s1', {
      selfSpeaking: true,
      othersSpeaking: true
    });
    attenuator.stop();

    expect(commands).toEqual([]);
    expect(getStopped()).toBe(0);
  });

  test('does not duck when attenuation is disabled', () => {
    const { attenuator, commands } = createHarness();

    attenuator.setServerSpeaking('s1', {
      selfSpeaking: false,
      othersSpeaking: true
    });

    expect(commands).toEqual([]);
  });

  test('ducks when others speak and restores after hangover delay when speech ends', async () => {
    const { attenuator, commands } = createHarness('win32', 40);

    attenuator.setAttenuationSettings({
      attenuationEnabled: true,
      attenuationPercent: 65,
      attenuateWhenOthersSpeak: true,
      attenuateWhenSelfSpeaks: false
    });

    attenuator.setServerSpeaking('s1', {
      selfSpeaking: false,
      othersSpeaking: true
    });

    expect(commands).toEqual(['EXCLUDE 100 200', 'DUCK 65 150']);

    attenuator.setServerSpeaking('s1', {
      selfSpeaking: false,
      othersSpeaking: false
    });

    // Still within hangover window
    expect(commands).toEqual(['EXCLUDE 100 200', 'DUCK 65 150']);

    await Bun.sleep(60);

    expect(commands).toEqual(['EXCLUDE 100 200', 'DUCK 65 150', 'RESTORE 200']);
  });

  test('cancels pending restore if speaking resumes within the hangover window', async () => {
    const { attenuator, commands } = createHarness('win32', 60);

    attenuator.setAttenuationSettings({
      attenuationEnabled: true,
      attenuationPercent: 50,
      attenuateWhenOthersSpeak: true,
      attenuateWhenSelfSpeaks: false
    });

    attenuator.setServerSpeaking('s1', {
      selfSpeaking: false,
      othersSpeaking: true
    });
    attenuator.setServerSpeaking('s1', {
      selfSpeaking: false,
      othersSpeaking: false
    });

    await Bun.sleep(20);

    // Speech resumes before the 60ms hangover completes
    attenuator.setServerSpeaking('s1', {
      selfSpeaking: false,
      othersSpeaking: true
    });

    await Bun.sleep(60);

    // Should not have sent RESTORE
    expect(commands).toEqual(['EXCLUDE 100 200', 'DUCK 50 150']);

    attenuator.stop();
  });

  test('respects attenuateWhenSelfSpeaks and attenuateWhenOthersSpeak toggles', () => {
    const { attenuator, commands } = createHarness();

    attenuator.setAttenuationSettings({
      attenuationEnabled: true,
      attenuationPercent: 50,
      attenuateWhenOthersSpeak: true,
      attenuateWhenSelfSpeaks: false
    });

    // Self speaking while attenuateWhenSelfSpeaks is false -> no duck
    attenuator.setServerSpeaking('s1', {
      selfSpeaking: true,
      othersSpeaking: false
    });
    expect(commands).toEqual([]);

    // Enable attenuateWhenSelfSpeaks while self is already speaking -> ducks immediately
    attenuator.setAttenuationSettings({
      attenuationEnabled: true,
      attenuationPercent: 50,
      attenuateWhenOthersSpeak: true,
      attenuateWhenSelfSpeaks: true
    });
    expect(commands).toEqual(['EXCLUDE 100 200', 'DUCK 50 150']);
  });

  test('updates duck percentage live while ducked and restores immediately when disabled', () => {
    const { attenuator, commands } = createHarness();

    attenuator.setAttenuationSettings({
      attenuationEnabled: true,
      attenuationPercent: 40,
      attenuateWhenOthersSpeak: true,
      attenuateWhenSelfSpeaks: false
    });

    attenuator.setServerSpeaking('s1', {
      selfSpeaking: false,
      othersSpeaking: true
    });
    expect(commands).toEqual(['EXCLUDE 100 200', 'DUCK 40 150']);

    attenuator.setAttenuationSettings({
      attenuationEnabled: true,
      attenuationPercent: 75,
      attenuateWhenOthersSpeak: true,
      attenuateWhenSelfSpeaks: false
    });
    expect(commands).toEqual(['EXCLUDE 100 200', 'DUCK 40 150', 'DUCK 75 150']);

    attenuator.setAttenuationSettings({
      attenuationEnabled: false,
      attenuationPercent: 75,
      attenuateWhenOthersSpeak: true,
      attenuateWhenSelfSpeaks: false
    });
    expect(commands).toEqual([
      'EXCLUDE 100 200',
      'DUCK 40 150',
      'DUCK 75 150',
      'RESTORE 200'
    ]);
  });

  test('aggregates speaking across multiple servers and restores immediately when active server clears', () => {
    const { attenuator, commands } = createHarness();

    attenuator.setAttenuationSettings({
      attenuationEnabled: true,
      attenuationPercent: 50,
      attenuateWhenOthersSpeak: true,
      attenuateWhenSelfSpeaks: false
    });

    attenuator.setServerSpeaking('s1', {
      selfSpeaking: false,
      othersSpeaking: true
    });
    attenuator.setServerSpeaking('s2', {
      selfSpeaking: false,
      othersSpeaking: true
    });

    expect(commands).toEqual(['EXCLUDE 100 200', 'DUCK 50 150']);

    // Clearing s1 while s2 is still speaking keeps audio ducked
    attenuator.clearServerSpeaking('s1');
    expect(commands).toEqual(['EXCLUDE 100 200', 'DUCK 50 150']);

    // Clearing s2 restores immediately
    attenuator.clearServerSpeaking('s2');
    expect(commands).toEqual(['EXCLUDE 100 200', 'DUCK 50 150', 'RESTORE 200']);
  });

  test('drives the native Windows helper process through duck, restore, and stop', async () => {
    if (process.platform !== 'win32') {
      return;
    }

    const executable = path.resolve(
      __dirname,
      '../../../../native/windows-attenuation/build/sharkord-audio-attenuator.exe'
    );

    if (!existsSync(executable)) {
      return;
    }

    const attenuator = createAudioAttenuator({
      platform: 'win32',
      releaseDelayMs: 20,
      duckFadeMs: 20,
      restoreFadeMs: 20,
      getExecutablePath: () => executable,
      getExcludedPids: () => [process.pid]
    });

    attenuator.setAttenuationSettings({
      attenuationEnabled: true,
      attenuationPercent: 50,
      attenuateWhenOthersSpeak: true,
      attenuateWhenSelfSpeaks: false
    });

    attenuator.setServerSpeaking('s1', {
      selfSpeaking: false,
      othersSpeaking: true
    });

    await Bun.sleep(60);

    attenuator.setServerSpeaking('s1', {
      selfSpeaking: false,
      othersSpeaking: false
    });

    await Bun.sleep(50);

    attenuator.stop();
  });
});
