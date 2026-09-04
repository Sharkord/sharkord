import { describe, expect, test } from 'bun:test';

// a plugin's client bundle reaches this package through the sdk's barrel, and
// zod is what it drags in: schemas are built at module scope, so a bundler that
// is not told the package is side effect free has to keep every module it can
// reach. one enum used to cost 1.4mb of validation code in a browser
describe('client bundles of this package', () => {
  const bundleProbe = async () => {
    const built = await Bun.build({
      entrypoints: ['./src/__tests__/fixtures/bundle-probe.ts'],
      target: 'browser',
      format: 'esm'
    });

    expect(built.success).toBe(true);

    return built.outputs[0]!.text();
  };

  // asserted as a boolean: a failure here otherwise prints the whole bundle
  test('should not carry zod into a bundle that imports an enum', async () => {
    expect((await bundleProbe()).includes('zod')).toBe(false);
  });

  // the number is not the point: a few hundred bytes against 1.4mb is
  test('should keep an enum import small', async () => {
    expect((await bundleProbe()).length).toBeLessThan(10_000);
  });
});
