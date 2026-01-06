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

if (!values.version) {
  console.error('Error: version is required.');
  process.exit(1);
}

console.log(`Setting version to ${values.version}...`);

await patchPackageJsons(values.version);
