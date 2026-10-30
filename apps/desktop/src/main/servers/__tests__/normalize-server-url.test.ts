import { describe, expect, test } from 'bun:test';
import { normalizeServerUrl } from '../normalize-server-url';

describe('normalizeServerUrl', () => {
  test('defaults a bare domain to https', () => {
    expect(normalizeServerUrl('chat.example.com')).toBe(
      'https://chat.example.com'
    );
  });

  test('keeps the port', () => {
    expect(normalizeServerUrl('chat.example.com:8443')).toBe(
      'https://chat.example.com:8443'
    );
  });

  test('defaults local addresses to http', () => {
    expect(normalizeServerUrl('localhost:4991')).toBe('http://localhost:4991');
    expect(normalizeServerUrl('127.0.0.1:4991')).toBe('http://127.0.0.1:4991');
  });

  test('defaults lan addresses to http', () => {
    expect(normalizeServerUrl('192.168.1.10:4991')).toBe(
      'http://192.168.1.10:4991'
    );
    expect(normalizeServerUrl('10.0.0.5')).toBe('http://10.0.0.5');
    expect(normalizeServerUrl('172.16.4.2:4991')).toBe(
      'http://172.16.4.2:4991'
    );
    expect(normalizeServerUrl('172.31.255.1')).toBe('http://172.31.255.1');
    expect(normalizeServerUrl('nas.local:4991')).toBe('http://nas.local:4991');
  });

  test('keeps public addresses that only look close to a lan range on https', () => {
    expect(normalizeServerUrl('172.32.0.1')).toBe('https://172.32.0.1');
    expect(normalizeServerUrl('192.169.0.1')).toBe('https://192.169.0.1');
    expect(normalizeServerUrl('10.example.com')).toBe('https://10.example.com');
    expect(normalizeServerUrl('local.example.com')).toBe(
      'https://local.example.com'
    );
  });

  test('respects an explicit scheme', () => {
    expect(normalizeServerUrl('http://chat.example.com')).toBe(
      'http://chat.example.com'
    );
  });

  test('reduces a full url to its origin', () => {
    expect(normalizeServerUrl('https://chat.example.com/some/path?a=1#b')).toBe(
      'https://chat.example.com'
    );
  });

  test('trims whitespace', () => {
    expect(normalizeServerUrl('  chat.example.com  ')).toBe(
      'https://chat.example.com'
    );
  });

  test('rejects empty input', () => {
    expect(normalizeServerUrl('')).toBeNull();
    expect(normalizeServerUrl('   ')).toBeNull();
  });

  test('rejects schemes other than http and https', () => {
    expect(normalizeServerUrl('ftp://chat.example.com')).toBeNull();
    expect(normalizeServerUrl('file:///etc/passwd')).toBeNull();
  });

  test('rejects unparseable input', () => {
    expect(normalizeServerUrl('http://')).toBeNull();
  });
});
