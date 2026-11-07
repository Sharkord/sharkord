/// <reference lib="dom" />

import { type Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { withClients } from './helpers/clients';

test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling'
    ]
  }
});

const trackId = (page: Page, tag: 'video' | 'audio') =>
  page
    .getByRole('button', { name: 'Pause watching' })
    .locator('..')
    .locator(tag)
    .evaluate((element: HTMLMediaElement) => {
      if (element.currentTime === 0) return null;

      const stream = element.srcObject;
      if (!(stream instanceof MediaStream)) return null;

      const tracks = stream.getTracks();
      const track = tracks.find(
        ({ enabled, readyState }) => enabled && readyState === 'live'
      );
      return track?.id ?? null;
    });

test('viewers independently pause and resume a camera or a screen with audio', async ({
  browser
}) => {
  await withClients(
    browser,
    ['testowner', 'testuser', 'usera'],
    async ([broadcaster, viewer, other]) => {
      if (!broadcaster || !viewer || !other)
        throw new Error('Expected three clients');

      for (const page of [broadcaster, viewer, other]) {
        await page
          .getByRole('button', { name: 'Voice', exact: true })
          .click({ force: true });
        await expect(
          page.getByText('Voice connected', { exact: true })
        ).toBeVisible();
      }

      const pause = viewer.getByRole('button', { name: 'Pause watching' });
      const resume = viewer.getByRole('button', { name: 'Resume watching' });

      // supply deterministic media without a physical camera or the OS screen picker.
      await broadcaster.evaluate(() => {
        const captureVideo = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 180;
          const context = canvas.getContext('2d');
          const timer = setInterval(() => {
            if (!context) return;
            context.fillStyle = Date.now() % 200 < 100 ? 'blue' : 'green';
            context.fillRect(0, 0, 320, 180);
          }, 70);
          window.addEventListener('pagehide', () => clearInterval(timer), {
            once: true
          });
          return canvas.captureStream(12);
        };

        const getUserMedia = navigator.mediaDevices.getUserMedia.bind(
          navigator.mediaDevices
        );
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          if (constraints?.video) return captureVideo();

          return getUserMedia(constraints);
        };

        navigator.mediaDevices.getDisplayMedia = async () => {
          const screen = captureVideo();
          const audio = new AudioContext();
          const oscillator = audio.createOscillator();
          const output = audio.createMediaStreamDestination();
          oscillator.connect(output);
          oscillator.start();
          await audio.resume();
          for (const track of output.stream.getAudioTracks())
            screen.addTrack(track);
          return screen;
        };
      });

      await broadcaster.getByRole('button', { name: 'Turn on camera' }).click();
      await expect(pause).toBeVisible();
      await expect.poll(() => trackId(viewer, 'video')).not.toBeNull();
      await expect.poll(() => trackId(other, 'video')).not.toBeNull();
      const viewerCamera = await trackId(viewer, 'video');
      const otherCamera = await trackId(other, 'video');
      await pause.click();
      await expect(resume).toBeVisible();
      await expect(resume.locator('..').locator('video')).toHaveCount(0);
      await expect.poll(() => trackId(other, 'video')).toBe(otherCamera);
      await expect(
        broadcaster.getByRole('button', { name: 'Turn off camera' })
      ).toBeVisible();
      await resume.press('Enter');
      await expect(pause).toBeVisible();
      await expect.poll(() => trackId(viewer, 'video')).toBe(viewerCamera);
      await broadcaster
        .getByRole('button', { name: 'Turn off camera' })
        .click();
      await expect(pause).toHaveCount(0);

      await broadcaster
        .getByRole('button', { name: 'Start screen share' })
        .click();
      await expect(pause).toBeVisible();
      for (const page of [viewer, other]) {
        await expect.poll(() => trackId(page, 'video')).not.toBeNull();
        await expect.poll(() => trackId(page, 'audio')).not.toBeNull();
      }
      const viewerScreen = await trackId(viewer, 'video');
      const viewerAudio = await trackId(viewer, 'audio');
      const otherScreen = await trackId(other, 'video');
      const otherAudio = await trackId(other, 'audio');
      await pause.click();
      await expect(resume).toBeVisible();
      await expect(resume.locator('..').locator('video, audio')).toHaveCount(0);
      await expect.poll(() => trackId(other, 'video')).toBe(otherScreen);
      await expect.poll(() => trackId(other, 'audio')).toBe(otherAudio);
      await expect(
        broadcaster.getByRole('button', { name: 'Stop screen share' })
      ).toBeVisible();
      await resume.press('Enter');
      await expect(pause).toBeVisible();
      await expect.poll(() => trackId(viewer, 'video')).toBe(viewerScreen);
      await expect.poll(() => trackId(viewer, 'audio')).toBe(viewerAudio);
      await pause.click();
      await expect(resume).toBeVisible();
      await broadcaster
        .getByRole('button', { name: 'Stop screen share' })
        .click();
      await expect(resume).toHaveCount(0);
    }
  );
});
