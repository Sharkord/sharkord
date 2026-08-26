import { describe, expect, test } from 'bun:test';
import path from 'path';
import { isPathInside } from '../is-path-inside';

describe('isPathInside', () => {
  test('accepts the base directory itself', () => {
    expect(isPathInside('/data/interface', '/data/interface')).toBe(true);
  });

  test('accepts a file directly inside the base', () => {
    expect(isPathInside('/data/interface', '/data/interface/index.html')).toBe(
      true
    );
  });

  test('accepts a nested file', () => {
    expect(
      isPathInside('/data/interface', '/data/interface/assets/app.js')
    ).toBe(true);
  });

  test('rejects a sibling whose name starts with the base', () => {
    expect(isPathInside('/data/interface', '/data/interface-backup')).toBe(
      false
    );
    expect(isPathInside('/data/interface', '/data/interface-backup/.env')).toBe(
      false
    );
  });

  test('rejects a traversal that escapes the base', () => {
    expect(
      isPathInside('/data/interface', path.resolve('/data/interface', '../etc'))
    ).toBe(false);
  });

  test('resolves a traversal that stays inside the base', () => {
    expect(
      isPathInside(
        '/data/plugins/foo',
        path.resolve('/data/plugins/foo', 'sub/../client.js')
      )
    ).toBe(true);
  });

  test('rejects one plugin reaching into another', () => {
    expect(
      isPathInside(
        '/data/plugins/foo',
        path.resolve('/data/plugins/foo', '../foo-evil/client.js')
      )
    ).toBe(false);
  });

  test('rejects an unrelated absolute path', () => {
    expect(isPathInside('/data/interface', '/etc/passwd')).toBe(false);
  });
});
