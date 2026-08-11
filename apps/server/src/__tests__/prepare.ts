// this needs to be done before running tests in the CI to make sure the necessary directories and migrations are in place

import { loadEmbeds } from '../helpers/embeds';
import { ensureServerDirs } from '../helpers/ensure-server-dirs';

await ensureServerDirs();
await loadEmbeds();
