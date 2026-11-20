import module from 'module';
import path from 'path';

// caches the compiled main process and its runtime dependencies on disk. it has to run
// before they load, which is why the app itself is required from here. the cache is keyed
// by a hash of each file's source, so an update recompiles whatever changed
module.enableCompileCache?.();

const requireApp = module.createRequire(__filename);

requireApp(path.join(__dirname, 'app.js'));
