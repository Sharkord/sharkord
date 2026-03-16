import type { TJoinedSettings, TWebAppManifest } from '@sharkord/shared';
import http from 'http';
import { imageSizeFromFile } from 'image-size/fromFile';
import path from 'path';
import { getSettings } from '../db/queries/server';
import { PUBLIC_PATH } from '../helpers/paths';

const DEFAULT_ICONS: TWebAppManifest['icons'] = [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
];

const getImageSize = async (filePath: string) => {
  try {
    const size = await imageSizeFromFile(filePath);

    if (!size.width || !size.height) {
      return undefined;
    }

    return {
      width: size.width,
      height: size.height
    };
  } catch {
    // ignore
  }

  return undefined;
};

const getIcons = async (settings: TJoinedSettings) => {
  if (!settings.logo) {
    return DEFAULT_ICONS;
  }

  const logoPath = path.join(PUBLIC_PATH, settings.logo.name);

  if (settings.logo.mimeType === 'image/svg+xml') {
    return [
      {
        src: `/public/${settings.logo.name}`,
        sizes: 'any',
        type: settings.logo.mimeType,
        purpose: 'any'
      }
    ];
  }

  const logoSize = await getImageSize(logoPath);
  const isSquare = logoSize && logoSize.width === logoSize.height;

  if (!isSquare) {
    return DEFAULT_ICONS;
  }

  return [
    {
      src: `/public/${settings.logo.name}`,
      sizes: `${logoSize.width}x${logoSize.height}`,
      type: settings.logo.mimeType,
      purpose: 'any'
    }
  ];
};

const manifestRouteHandler = async (
  _req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const settings = await getSettings();
  const icons = await getIcons(settings);

  const manifest: TWebAppManifest = {
    name: settings.name,
    short_name: settings.name.slice(0, 12),
    description: settings.description ?? '',
    start_url: '/',
    display: 'standalone',
    background_color: '#171717',
    theme_color: '#171717',
    icons
  };

  res.writeHead(200, {
    'Content-Type': 'application/manifest+json',
    'Cache-Control': 'public, max-age=3600'
  });
  res.end(JSON.stringify(manifest));
};

export { manifestRouteHandler };
