import type { TCommandArg } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { serializePluginCommandText } from '../helpers';

const args: TCommandArg[] = [
  { name: 'when', type: 'string' },
  { name: 'what', type: 'string' },
  { name: 'times', type: 'number' }
];

describe('serializePluginCommandText', () => {
  test('should send every filled argument in order', () => {
    expect(
      serializePluginCommandText('remind', args, {
        when: 'tomorrow',
        what: 'call mom',
        times: '2'
      })
    ).toBe('/remind tomorrow "call mom" 2');
  });

  // the server matches arguments by position, so a blank one has to hold its place
  test('should keep the position of a blank argument before a filled one', () => {
    expect(
      serializePluginCommandText('remind', args, { what: 'call mom' })
    ).toBe('/remind "" "call mom"');
  });

  test('should drop blank arguments at the end', () => {
    expect(serializePluginCommandText('remind', args, { when: 'now' })).toBe(
      '/remind now'
    );
  });

  test('should send a command with nothing filled as its name alone', () => {
    expect(serializePluginCommandText('remind', args, {})).toBe('/remind');
  });

  test('should send a boolean as true or false', () => {
    expect(
      serializePluginCommandText('toggle', [{ name: 'on', type: 'boolean' }], {
        on: 'true'
      })
    ).toBe('/toggle true');
  });
});
