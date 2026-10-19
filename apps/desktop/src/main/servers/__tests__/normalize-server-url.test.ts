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
