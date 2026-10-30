import { session, type NativeImage } from 'electron';
import type { TServer } from '../../shared/types';
import { loadImage } from '../images/load-image';
import { getPartition } from '../views/server-views';

type TCreateServerIconOptions = {
  fallback: NativeImage;
  apply: (icon: NativeImage) => void;
};

const createServerIcon = ({ fallback, apply }: TCreateServerIconOptions) => {
  const loaded = new Map<string, NativeImage>();

  let wantedUrl: string | null = null;

  const load = async (id: string, url: string) => {
    const icon = await loadImage(url, session.fromPartition(getPartition(id)));

    if (!icon) {
      return;
    }

    loaded.set(url, icon);

    if (wantedUrl === url) {
      apply(icon);
    }
  };

  return (server: TServer | undefined) => {
    const url = server?.iconUrl ?? null;

    if (url === wantedUrl) {
      return;
    }

    wantedUrl = url;

    if (!server || !url) {
      apply(fallback);

      return;
    }

    const cached = loaded.get(url);

    if (cached) {
      apply(cached);

      return;
    }

    apply(fallback);
    load(server.id, url).catch(console.error);
  };
};

export { createServerIcon };
