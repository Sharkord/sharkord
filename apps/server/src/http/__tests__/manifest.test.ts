import type { TWebAppManifest } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { testsBaseUrl } from '../../__tests__/setup';

describe('/manifest.json', () => {
  test('should return PWA manifest with correct structure', async () => {
    const response = await fetch(`${testsBaseUrl}/manifest.json`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/manifest+json'
    );
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');

    const manifest = (await response.json()) as TWebAppManifest;

    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('description');
    expect(manifest).toHaveProperty('start_url', '/');
    expect(manifest).toHaveProperty('display', 'standalone');
    expect(manifest).toHaveProperty('background_color', '#171717');
    expect(manifest).toHaveProperty('theme_color', '#171717');
    expect(manifest).toHaveProperty('icons');

    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should use server settings for name and description', async () => {
    const response = await fetch(`${testsBaseUrl}/manifest.json`);
    const manifest = (await response.json()) as TWebAppManifest;

    expect(manifest.name).toBe('Test Server');
    expect(manifest.short_name).toBe('Test Server');
    expect(manifest.description).toBe('Test server description');
  });

  test('should truncate short_name to 12 characters', async () => {
    const response = await fetch(`${testsBaseUrl}/manifest.json`);
    const manifest = (await response.json()) as TWebAppManifest;

    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.short_name).toBe(manifest.name.slice(0, 12));
  });

  test('should include default icons when no custom logo', async () => {
    const response = await fetch(`${testsBaseUrl}/manifest.json`);
    const manifest = (await response.json()) as TWebAppManifest;

    const hasDefaultIcon192 = manifest.icons.some(
      (icon) => icon.src === '/icon-192.png' && icon.sizes === '192x192'
    );
    const hasDefaultIcon512 = manifest.icons.some(
      (icon) => icon.src === '/icon-512.png' && icon.sizes === '512x512'
    );

    expect(hasDefaultIcon192).toBe(true);
    expect(hasDefaultIcon512).toBe(true);
  });

  test('should include required icon properties', async () => {
    const response = await fetch(`${testsBaseUrl}/manifest.json`);
    const manifest = (await response.json()) as TWebAppManifest;

    for (const icon of manifest.icons) {
      expect(icon).toHaveProperty('src');
      expect(icon).toHaveProperty('sizes');
      expect(icon).toHaveProperty('type');
      expect(typeof icon.src).toBe('string');
      expect(typeof icon.sizes).toBe('string');
      expect(typeof icon.type).toBe('string');
    }
  });
});
