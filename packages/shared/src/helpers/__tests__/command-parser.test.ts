import { describe, expect, test } from 'bun:test';
import type { RegisteredCommand } from '../../plugins';
import { parseDomCommand, toDomCommand } from '../command-parser';

// html parsers hand attribute values back with entities already decoded, so the
// round-trip tests have to decode too or they assert on the escaped form
const toAttribs = (domString: string): Record<string, string> => {
  const attribs: Record<string, string> = {};

  for (const [, name, value] of domString.matchAll(/([\w-]+)="([^"]*)"/g)) {
    attribs[name!] = value!
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  return attribs;
};

describe('command-parser', () => {
  describe('toDomCommand', () => {
    test('should convert simple command to DOM string', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'test-command',
        description: 'Test command',
        status: 'pending',
        command: {
          name: 'test-command',
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, []);

      expect(result).toBe(
        '<command data-plugin-id="test-plugin" data-command="test-command" data-args="[]" data-status="pending" data-response=""></command>'
      );
    });

    test('should convert command with string argument', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'greet',
        status: 'pending',
        args: [
          {
            name: 'username',
            type: 'string',
            required: true
          }
        ],
        command: {
          name: 'greet',
          args: [
            {
              name: 'username',
              type: 'string',
              required: true
            }
          ],
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, ['Alice']);

      expect(result).toBe(
        '<command data-plugin-id="test-plugin" data-command="greet" data-args="[{&quot;name&quot;:&quot;username&quot;,&quot;value&quot;:&quot;Alice&quot;,&quot;status&quot;:&quot;pending&quot;}]" data-status="pending" data-response=""></command>'
      );
    });

    test('should convert command with multiple arguments', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'calculate',
        status: 'completed',
        args: [
          {
            name: 'a',
            type: 'number',
            required: true
          },
          {
            name: 'b',
            type: 'number',
            required: true
          },
          {
            name: 'operation',
            type: 'string',
            required: true
          }
        ],
        command: {
          name: 'calculate',
          args: [
            {
              name: 'a',
              type: 'number',
              required: true
            },
            {
              name: 'b',
              type: 'number',
              required: true
            },
            {
              name: 'operation',
              type: 'string',
              required: true
            }
          ],
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, [10, 20, 'add']);

      expect(result).toBe(
        '<command data-plugin-id="test-plugin" data-command="calculate" data-args="[{&quot;name&quot;:&quot;a&quot;,&quot;value&quot;:10,&quot;status&quot;:&quot;completed&quot;},{&quot;name&quot;:&quot;b&quot;,&quot;value&quot;:20,&quot;status&quot;:&quot;completed&quot;},{&quot;name&quot;:&quot;operation&quot;,&quot;value&quot;:&quot;add&quot;,&quot;status&quot;:&quot;completed&quot;}]" data-status="completed" data-response=""></command>'
      );
    });

    test('should sanitize sensitive arguments', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'login',
        status: 'pending',
        args: [
          {
            name: 'username',
            type: 'string',
            required: true
          },
          {
            name: 'password',
            type: 'string',
            required: true,
            sensitive: true
          }
        ],
        command: {
          name: 'login',
          args: [
            {
              name: 'username',
              type: 'string',
              required: true
            },
            {
              name: 'password',
              type: 'string',
              required: true,
              sensitive: true
            }
          ],
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, ['alice', 'secret123']);

      expect(result).toBe(
        '<command data-plugin-id="test-plugin" data-command="login" data-args="[{&quot;name&quot;:&quot;username&quot;,&quot;value&quot;:&quot;alice&quot;,&quot;status&quot;:&quot;pending&quot;},{&quot;name&quot;:&quot;password&quot;,&quot;value&quot;:&quot;****&quot;,&quot;status&quot;:&quot;pending&quot;}]" data-status="pending" data-response=""></command>'
      );
    });

    test('should handle command with no args defined', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'ping',
        status: 'pending',
        command: {
          name: 'ping',
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, []);

      expect(result).toBe(
        '<command data-plugin-id="test-plugin" data-command="ping" data-args="[]" data-status="pending" data-response=""></command>'
      );
    });

    test('should handle boolean arguments', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'toggle',
        status: 'pending',
        args: [
          {
            name: 'enabled',
            type: 'boolean',
            required: true
          }
        ],
        command: {
          name: 'toggle',
          args: [
            {
              name: 'enabled',
              type: 'boolean',
              required: true
            }
          ],
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, [true]);

      expect(result).toBe(
        '<command data-plugin-id="test-plugin" data-command="toggle" data-args="[{&quot;name&quot;:&quot;enabled&quot;,&quot;value&quot;:true,&quot;status&quot;:&quot;pending&quot;}]" data-status="pending" data-response=""></command>'
      );
    });

    test('should handle null and undefined values', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'test',
        status: 'pending',
        args: [
          {
            name: 'value1',
            type: 'string',
            required: false
          },
          {
            name: 'value2',
            type: 'string',
            required: false
          }
        ],
        command: {
          name: 'test',
          args: [
            {
              name: 'value1',
              type: 'string',
              required: false
            },
            {
              name: 'value2',
              type: 'string',
              required: false
            }
          ],
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, [null, undefined]);

      // undefined values are not included in the JSON stringification
      expect(result).toBe(
        '<command data-plugin-id="test-plugin" data-command="test" data-args="[{&quot;name&quot;:&quot;value1&quot;,&quot;value&quot;:null,&quot;status&quot;:&quot;pending&quot;},{&quot;name&quot;:&quot;value2&quot;,&quot;status&quot;:&quot;pending&quot;}]" data-status="pending" data-response=""></command>'
      );
    });

    test('should handle multiple sensitive arguments', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'auth',
        status: 'pending',
        args: [
          {
            name: 'token',
            type: 'string',
            required: true,
            sensitive: true
          },
          {
            name: 'apiKey',
            type: 'string',
            required: true,
            sensitive: true
          }
        ],
        command: {
          name: 'auth',
          args: [
            {
              name: 'token',
              type: 'string',
              required: true,
              sensitive: true
            },
            {
              name: 'apiKey',
              type: 'string',
              required: true,
              sensitive: true
            }
          ],
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, ['abc123', 'xyz789']);

      expect(result).toBe(
        '<command data-plugin-id="test-plugin" data-command="auth" data-args="[{&quot;name&quot;:&quot;token&quot;,&quot;value&quot;:&quot;****&quot;,&quot;status&quot;:&quot;pending&quot;},{&quot;name&quot;:&quot;apiKey&quot;,&quot;value&quot;:&quot;****&quot;,&quot;status&quot;:&quot;pending&quot;}]" data-status="pending" data-response=""></command>'
      );
    });
  });

  describe('parseDomCommand', () => {
    test('should parse simple command', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'test-command',
          'data-args': '[]'
        }
      };

      const result = parseDomCommand(domElement);

      expect(result.pluginId).toBe('test-plugin');
      expect(result.commandName).toBe('test-command');
      expect(result.args).toEqual([]);
    });

    test('should parse command with string argument', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'greet',
          'data-args': '[{"name":"username","value":"Alice"}]'
        }
      };

      const result = parseDomCommand(domElement);

      expect(result.pluginId).toBe('test-plugin');
      expect(result.commandName).toBe('greet');
      expect(result.args).toEqual([{ name: 'username', value: 'Alice' }]);
    });

    test('should parse command with multiple arguments', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'calculate',
          'data-args':
            '[{"name":"a","value":10},{"name":"b","value":20},{"name":"operation","value":"add"}]'
        }
      };

      const result = parseDomCommand(domElement);

      expect(result.pluginId).toBe('test-plugin');
      expect(result.commandName).toBe('calculate');
      expect(result.args).toEqual([
        { name: 'a', value: 10 },
        { name: 'b', value: 20 },
        { name: 'operation', value: 'add' }
      ]);
    });

    test('should parse command with sanitized sensitive arguments', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'login',
          'data-args':
            '[{"name":"username","value":"alice"},{"name":"password","value":"****"}]'
        }
      };

      const result = parseDomCommand(domElement);

      expect(result.pluginId).toBe('test-plugin');
      expect(result.commandName).toBe('login');
      expect(result.args).toEqual([
        { name: 'username', value: 'alice' },
        { name: 'password', value: '****' }
      ]);
    });

    test('should parse command with boolean argument', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'toggle',
          'data-args': '[{"name":"enabled","value":true}]'
        }
      };

      const result = parseDomCommand(domElement);

      expect(result.pluginId).toBe('test-plugin');
      expect(result.commandName).toBe('toggle');
      expect(result.args).toEqual([{ name: 'enabled', value: true }]);
    });

    test('should parse command with null values', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'test',
          'data-args':
            '[{"name":"value1","value":null},{"name":"value2","value":null}]'
        }
      };

      const result = parseDomCommand(domElement);

      expect(result.pluginId).toBe('test-plugin');
      expect(result.commandName).toBe('test');
      expect(result.args).toEqual([
        { name: 'value1', value: null },
        { name: 'value2', value: null }
      ]);
    });

    test('should throw error for missing command name', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': '',
          'data-args': '[]'
        }
      };

      expect(() => parseDomCommand(domElement)).toThrow();
    });

    test('should throw error for missing plugin ID', () => {
      const domElement = {
        attribs: {
          'data-command': 'test',
          'data-args': '[]'
        }
      };

      expect(() => parseDomCommand(domElement)).toThrow();
    });

    test('should throw error for missing data-plugin-id attribute', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': '',
          'data-command': 'test',
          'data-args': '[]'
        }
      };

      expect(() => parseDomCommand(domElement)).toThrow();
    });

    test('should throw error for missing data-command attribute', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-args': '[]'
        }
      };

      expect(() => parseDomCommand(domElement)).toThrow();
    });

    test('should handle missing data-args attribute', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'test'
        }
      };

      const result = parseDomCommand(domElement);

      expect(result.pluginId).toBe('test-plugin');
      expect(result.commandName).toBe('test');
      expect(result.args).toEqual([]);
    });

    test('should throw error for invalid JSON in args', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'test',
          'data-args': 'invalid-json'
        }
      };

      expect(() => parseDomCommand(domElement)).toThrow(
        'Invalid command arguments JSON'
      );
    });

    test('should throw error for non-array args', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'test',
          'data-args': '{"not":"array"}'
        }
      };

      expect(() => parseDomCommand(domElement)).toThrow();
    });

    test('should handle empty args array', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'ping',
          'data-args': '[]'
        }
      };

      const result = parseDomCommand(domElement);

      expect(result.pluginId).toBe('test-plugin');
      expect(result.commandName).toBe('ping');
      expect(result.args).toEqual([]);
    });

    test('should handle command with special characters in name', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'test-command_v2',
          'data-args': '[]'
        }
      };

      const result = parseDomCommand(domElement);

      expect(result.pluginId).toBe('test-plugin');
      expect(result.commandName).toBe('test-command_v2');
      expect(result.args).toEqual([]);
    });

    test('should handle command with complex nested objects in args', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'complex',
          'data-args': '[{"name":"config","value":{"nested":{"key":"value"}}}]'
        }
      };

      const result = parseDomCommand(domElement);

      expect(result.pluginId).toBe('test-plugin');
      expect(result.commandName).toBe('complex');
      expect(result.args).toEqual([
        { name: 'config', value: { nested: { key: 'value' } } }
      ]);
    });

    test('should handle command with number arguments', () => {
      const domElement = {
        attribs: {
          'data-plugin-id': 'test-plugin',
          'data-command': 'sum',
          'data-args': '[{"name":"a","value":5},{"name":"b","value":10}]'
        }
      };

      const result = parseDomCommand(domElement);

      expect(result.pluginId).toBe('test-plugin');
      expect(result.commandName).toBe('sum');
      expect(result.args).toEqual([
        { name: 'a', value: 5 },
        { name: 'b', value: 10 }
      ]);
    });
  });

  describe('round-trip conversion', () => {
    test('should maintain data integrity through conversion cycle', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'test',
        status: 'pending',
        args: [
          {
            name: 'arg1',
            type: 'string',
            required: true
          },
          {
            name: 'arg2',
            type: 'number',
            required: true
          }
        ],
        command: {
          name: 'test',
          args: [
            {
              name: 'arg1',
              type: 'string',
              required: true
            },
            {
              name: 'arg2',
              type: 'number',
              required: true
            }
          ],
          executes: async () => ({})
        }
      };

      const domString = toDomCommand(command, ['hello', 42]);

      const domElement = { attribs: toAttribs(domString) };

      const parsed = parseDomCommand(domElement);

      expect(parsed.pluginId).toBe('test-plugin');
      expect(parsed.commandName).toBe('test');
      expect(parsed.status).toBe('pending');
      expect(parsed.args).toEqual([
        { name: 'arg1', value: 'hello' },
        { name: 'arg2', value: 42 }
      ]);
    });

    test('should handle sensitive data in round-trip', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'secure',
        status: 'pending',
        args: [
          {
            name: 'public',
            type: 'string',
            required: true
          },
          {
            name: 'secret',
            type: 'string',
            required: true,
            sensitive: true
          }
        ],
        command: {
          name: 'secure',
          args: [
            {
              name: 'public',
              type: 'string',
              required: true
            },
            {
              name: 'secret',
              type: 'string',
              required: true,
              sensitive: true
            }
          ],
          executes: async () => ({})
        }
      };

      const domString = toDomCommand(command, ['visible', 'hidden']);

      const domElement = { attribs: toAttribs(domString) };

      const parsed = parseDomCommand(domElement);

      expect(parsed.pluginId).toBe('test-plugin');
      expect(parsed.commandName).toBe('secure');
      expect(parsed.status).toBe('pending');
      expect(parsed.args).toEqual([
        { name: 'public', value: 'visible' },
        { name: 'secret', value: '****' }
      ]);
    });

    test('should include logo attribute when imageUrl is provided', () => {
      const command: RegisteredCommand & {
        imageUrl?: string;
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'test',
        status: 'pending',
        imageUrl: 'https://example.com/logo.png',
        command: {
          name: 'test',
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, []);

      expect(result).toContain(
        'data-plugin-logo="https://example.com/logo.png"'
      );
    });

    test('escapes user supplied arguments so they cannot break out of the attribute', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'echo',
        status: 'pending',
        args: [{ name: 'text', type: 'string', required: true }],
        command: {
          name: 'echo',
          args: [{ name: 'text', type: 'string', required: true }],
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, [
        `a'></command><img src=x onerror=alert(1)>`
      ]);

      expect(result).not.toContain('<img');
      expect(result).not.toContain('</command><');
      expect(result.match(/<\/command>/g)).toHaveLength(1);
      expect(parseDomCommand({ attribs: toAttribs(result) }).args).toEqual([
        { name: 'text', value: `a'></command><img src=x onerror=alert(1)>` }
      ]);
    });

    test('escapes plugin supplied responses and command names', () => {
      const command: RegisteredCommand & {
        status: 'pending' | 'completed' | 'failed';
        response?: unknown;
      } = {
        pluginId: 'test-plugin',
        name: `evil" onload="alert(1)`,
        status: 'completed',
        response: `done' <script>alert(1)</script>`,
        command: {
          name: 'evil',
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, []);

      expect(result).not.toContain('<script');
      expect(result).not.toContain('onload="alert');

      const parsed = parseDomCommand({ attribs: toAttribs(result) });

      expect(parsed.commandName).toBe(`evil" onload="alert(1)`);
      expect(parsed.response).toBe(`done' <script>alert(1)</script>`);
    });

    test('should omit logo attribute when imageUrl is undefined', () => {
      const command: RegisteredCommand & {
        imageUrl?: string;
        status: 'pending' | 'completed' | 'failed';
      } = {
        pluginId: 'test-plugin',
        name: 'test',
        status: 'pending',
        command: {
          name: 'test',
          executes: async () => ({})
        }
      };

      const result = toDomCommand(command, []);

      expect(result).not.toContain('data-plugin-logo');
    });
  });
});
