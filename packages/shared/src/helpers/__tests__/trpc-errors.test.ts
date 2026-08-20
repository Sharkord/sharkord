import { TRPCClientError } from '@trpc/client';
import { describe, expect, test } from 'bun:test';
import { getTrpcError, parseTrpcErrors } from '../trpc-errors';

const GENERIC = 'Something went wrong, please try again.';

describe('parseTrpcErrors', () => {
  test('should map a plain server rejection to the general field', () => {
    expect(parseTrpcErrors(new TRPCClientError('Invalid password'))).toEqual({
      _general: 'Invalid password'
    });
  });

  test('should map a zod style message to its fields', () => {
    const message = JSON.stringify([
      { code: 'custom', path: ['password'], message: 'Too short' }
    ]);

    expect(parseTrpcErrors(new TRPCClientError(message))).toEqual({
      password: 'Too short'
    });
  });

  test('should fall back to the general field when an issue has no path', () => {
    const message = JSON.stringify([
      { code: 'custom', path: [], message: 'Nope' }
    ]);

    expect(parseTrpcErrors(new TRPCClientError(message))).toEqual({
      _general: 'Nope'
    });
  });

  // every one of these used to come back as an error map with no readable field, so the
  // form that called setTrpcErrors rendered nothing and the user saw no rejection at all
  test('should report a plain error rather than returning it as the error map', () => {
    expect(
      parseTrpcErrors(new Error('TRPC client is not initialized'))
    ).toEqual({ _general: 'TRPC client is not initialized' });
  });

  test('should report null', () => {
    expect(parseTrpcErrors(null)).toEqual({ _general: GENERIC });
  });

  test('should report undefined', () => {
    expect(parseTrpcErrors(undefined)).toEqual({ _general: GENERIC });
  });

  test('should report an array', () => {
    expect(parseTrpcErrors([])).toEqual({ _general: GENERIC });
  });

  test('should report a message that parses to an empty list', () => {
    expect(parseTrpcErrors(new TRPCClientError('[]'))).toEqual({
      _general: GENERIC
    });
  });

  test('should report an empty message', () => {
    expect(parseTrpcErrors(new TRPCClientError(''))).toEqual({
      _general: GENERIC
    });
  });

  test('should pass an already parsed error map through untouched', () => {
    expect(parseTrpcErrors({ password: 'Wrong' })).toEqual({
      password: 'Wrong'
    });
  });
});

describe('getTrpcError', () => {
  test('should prefer the server message', () => {
    expect(getTrpcError(new TRPCClientError('Invalid password'), 'fb')).toBe(
      'Invalid password'
    );
  });

  test('should fall back for a value that is not an error', () => {
    expect(getTrpcError('nope', 'fb')).toBe('fb');
  });
});
