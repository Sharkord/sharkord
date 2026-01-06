import { parseArgs } from 'util';
import { patchPackageJsons } from './helpers';

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    version: { type: 'string' }
  },
  strict: true,
  allowPositionals: true
});

console.log(`Setting version to ${values.version}...`);

// @ts-expect-error - it is what it is
await patchPackageJsons(values.version);
