import { getDesktopAddServerLink } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { findDeepLink, parseDeepLink } from '../parse-deep-link';

describe('parse deep link', () => {
  test('reads the server address of an add server link', () => {
    const link = getDesktopAddServerLink('https://chat.example.com');

    expect(parseDeepLink(link)).toEqual({
      action: 'add-server',
      serverUrl: 'https://chat.example.com'
    });
  });

  test('keeps a server address with a port and a path', () => {
    const link = getDesktopAddServerLink('http://localhost:4991/some/path?x=1');

    expect(parseDeepLink(link)?.serverUrl).toBe(
      'http://localhost:4991/some/path?x=1'
    );
  });

  test('ignores an add server link without an address', () => {
    expect(parseDeepLink('sharkord://add-server')).toBeNull();
    expect(parseDeepLink('sharkord://add-server?url=')).toBeNull();
  });

  test('ignores unknown actions', () => {
    expect(parseDeepLink('sharkord://delete-everything?url=x')).toBeNull();
  });

  test('ignores links of other protocols', () => {
    expect(
      parseDeepLink('https://add-server?url=https://chat.example.com')
    ).toBeNull();
  });

  test('ignores text that is not a link', () => {
    expect(parseDeepLink('not a link')).toBeNull();
  });

  test('finds the link among the command line arguments', () => {
    const link = getDesktopAddServerLink('https://chat.example.com');

    expect(findDeepLink(['/usr/bin/sharkord', '--flag', link])).toBe(link);
    expect(findDeepLink(['/usr/bin/sharkord', '--flag'])).toBeUndefined();
  });
});
