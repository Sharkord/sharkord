import type { TWebAppManifest } from '@sharkord/shared';
import http from 'http';
import { getSettings } from '../db/queries/server';

const manifestRouteHandler = async (
  _req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const settings = await getSettings();

  const icons = settings.logo
    ? settings.logo.mimeType === 'image/svg+xml'
      ? [
          {
            src: `/public/${settings.logo.name}`,
            sizes: 'any',
            type: settings.logo.mimeType,
            purpose: 'any'
          }
        ]
      : [
          {
            src: `/public/${settings.logo.name}`,
            sizes: '192x192',
            type: settings.logo.mimeType,
            purpose: 'any'
          },
          {
            src: `/public/${settings.logo.name}`,
            sizes: '512x512',
            type: settings.logo.mimeType,
            purpose: 'any'
          }
        ]
    : [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
      ];

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
