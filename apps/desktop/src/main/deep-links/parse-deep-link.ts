import { DESKTOP_ADD_SERVER_ACTION, DESKTOP_PROTOCOL } from '@sharkord/shared';

type TDeepLink = {
  action: 'add-server';
  serverUrl: string;
};

const parseDeepLink = (link: string): TDeepLink | null => {
  let url: URL;

  try {
    url = new URL(link);
  } catch {
    return null;
  }

  if (
    url.protocol !== `${DESKTOP_PROTOCOL}:` ||
    url.hostname !== DESKTOP_ADD_SERVER_ACTION
  ) {
    return null;
  }

  const serverUrl = url.searchParams.get('url');

  if (!serverUrl) {
    return null;
  }

  return { action: 'add-server', serverUrl };
};

// windows and linux hand the link over as a command line argument
const findDeepLink = (argv: string[]) =>
  argv.find((arg) => arg.startsWith(`${DESKTOP_PROTOCOL}://`));

export { findDeepLink, parseDeepLink };
export type { TDeepLink };
