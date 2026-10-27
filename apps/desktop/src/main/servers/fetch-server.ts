import type { TServer } from '../../shared/types';

type TServerInfo = {
  serverId: string;
  name: string;
  logo: { name: string; _accessToken?: string } | null;
};

const FETCH_TIMEOUT_MS = 5_000;

type TFetch = (url: string, init?: RequestInit) => Promise<Response>;

const getIconUrl = (origin: string, logo: TServerInfo['logo']) => {
  if (!logo) {
    return null;
  }

  const name = encodeURIComponent(logo.name);
  const url = `${origin}/public/${name}`;

  if (!logo._accessToken) {
    return url;
  }

  return `${url}?accessToken=${logo._accessToken}`;
};

// the app passes electron's net.fetch, which goes through chromium like the server views
// do, so a system proxy and the os certificate store apply here too
const fetchServer = async (
  origin: string,
  fetchUrl: TFetch
): Promise<TServer | null> => {
  try {
    const response = await fetchUrl(`${origin}/info`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });

    if (!response.ok) {
      return null;
    }

    const info: Partial<TServerInfo> = await response.json();

    if (typeof info.serverId !== 'string' || typeof info.name !== 'string') {
      return null;
    }

    return {
      id: info.serverId,
      name: info.name,
      url: origin,
      iconUrl: getIconUrl(origin, info.logo ?? null)
    };
  } catch {
    return null;
  }
};

export { fetchServer };
export type { TFetch };
