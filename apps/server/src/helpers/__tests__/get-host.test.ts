import { describe, expect, test } from 'bun:test';
import { getHost } from '../get-host';

describe('getHost', () => {
  test('should use the fallback when no host is configured', () => {
    expect(getHost('', 'localhost')).toBe('localhost');
  });

  test('should use the fallback for wildcard hosts', () => {
    expect(getHost('0.0.0.0', '192.168.1.10')).toBe('192.168.1.10');
    expect(getHost('::', '192.168.1.10')).toBe('192.168.1.10');
  });

  test('should use a configured ipv4 address or hostname as is', () => {
    expect(getHost('127.0.0.1', 'localhost')).toBe('127.0.0.1');
    expect(getHost('chat.example.com', 'localhost')).toBe('chat.example.com');
  });

  test('should wrap a configured ipv6 address in brackets', () => {
    expect(getHost('::1', 'localhost')).toBe('[::1]');
  });
});
