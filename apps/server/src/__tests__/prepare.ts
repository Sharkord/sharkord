// this needs to be done before running tests in the CI to make sure the necessary directories and migrations are in place

import { ensureServerDirs } from '../helpers/ensure-server-dirs';
import { loadEmbeds } from '../utils/embeds';

await ensureServerDirs();
await loadEmbeds();
