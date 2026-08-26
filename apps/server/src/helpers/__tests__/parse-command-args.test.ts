import { describe, expect, test } from 'bun:test';
import { parseCommandArgs } from '../parse-command-args';

describe('parseCommandArgs', () => {
  test('returns undefined commandName and empty args for empty string', () => {
    expect(parseCommandArgs('')).toEqual({ commandName: undefined, args: [] });
  });

  test('returns undefined commandName and empty args for whitespace only', () => {
    expect(parseCommandArgs('   ')).toEqual({
      commandName: undefined,
      args: []
    });
  });

  test('returns commandName and empty args for command with no arguments', () => {
    expect(parseCommandArgs('/help')).toEqual({
      commandName: 'help',
      args: []
    });
  });

  test('returns commandName and empty args for command without slash and no arguments', () => {
    expect(parseCommandArgs('help')).toEqual({ commandName: 'help', args: [] });
  });

  test('returns commandName and single argument', () => {
    expect(parseCommandArgs('/ban user123')).toEqual({
      commandName: 'ban',
      args: ['user123']
    });
  });

  test('returns commandName and multiple arguments', () => {
    expect(parseCommandArgs('/kick user123 spamming')).toEqual({
      commandName: 'kick',
      args: ['user123', 'spamming']
    });
  });

  test('handles quoted arguments with spaces', () => {
    expect(parseCommandArgs('/ban user123 "reason with spaces"')).toEqual({
      commandName: 'ban',
      args: ['user123', 'reason with spaces']
    });
  });

  test('handles single quoted arguments', () => {
    expect(parseCommandArgs("/mute user123 'quiet please'")).toEqual({
      commandName: 'mute',
      args: ['user123', 'quiet please']
    });
  });

  test('handles command without leading slash', () => {
    expect(parseCommandArgs('ban user123 reason')).toEqual({
      commandName: 'ban',
      args: ['user123', 'reason']
    });
  });

  test('handles multiple spaces between arguments', () => {
    expect(parseCommandArgs('/kick   user123   reason')).toEqual({
      commandName: 'kick',
      args: ['user123', 'reason']
    });
  });

  test('handles mixed quoted and unquoted arguments', () => {
    expect(
      parseCommandArgs('/warn user123 "first reason" second "third reason"')
    ).toEqual({
      commandName: 'warn',
      args: ['user123', 'first reason', 'second', 'third reason']
    });
  });

  test('parses command with URL argument', () => {
    expect(
      parseCommandArgs('/play https://www.youtube.com/watch?v=abc123XYZ')
    ).toEqual({
      commandName: 'play',
      args: ['https://www.youtube.com/watch?v=abc123XYZ']
    });
  });
});
