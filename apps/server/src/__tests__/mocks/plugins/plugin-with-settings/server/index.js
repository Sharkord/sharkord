let pluginSettings = null;

const onLoad = async (ctx) => {
  pluginSettings = await ctx.settings.register([
    {
      key: 'greeting',
      name: 'Greeting Message',
      description: 'The message to display when someone joins',
      type: 'string',
      defaultValue: 'Hello!'
    },
    {
      key: 'maxRetries',
      name: 'Max Retries',
      description: 'Maximum number of retries',
      type: 'number',
      defaultValue: 3
    },
    {
      key: 'enabled',
      name: 'Feature Enabled',
      description: 'Whether the feature is enabled',
      type: 'boolean',
      defaultValue: true
    },
    {
      key: 'apiKey',
      name: 'API Key',
      description: 'Credential for the upstream service',
      type: 'secret',
      defaultValue: ''
    },
    {
      key: 'mode',
      name: 'Mode',
      description: 'How the plugin behaves',
      type: 'enum',
      defaultValue: 'balanced',
      options: [
        { value: 'fast', label: 'Fast' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'thorough', label: 'Thorough' }
      ]
    }
  ]);

  ctx.commands.register({
    name: 'get-settings',
    description: 'Returns current settings values',
    executes: async () => {
      return {
        greeting: pluginSettings.get('greeting'),
        maxRetries: pluginSettings.get('maxRetries'),
        enabled: pluginSettings.get('enabled'),
        apiKey: pluginSettings.get('apiKey'),
        mode: pluginSettings.get('mode')
      };
    }
  });

  ctx.commands.register({
    name: 'set-greeting',
    description: 'Updates greeting setting',
    args: [{ name: 'value', type: 'string', required: true }],
    executes: async (_ctx, args) => {
      pluginSettings.set('greeting', args.value);
      return { success: true };
    }
  });

  ctx.commands.register({
    name: 'set-mode',
    description: 'Updates the mode setting',
    args: [{ name: 'value', type: 'string', required: true }],
    executes: async (_ctx, args) => {
      pluginSettings.set('mode', args.value);
      return { success: true };
    }
  });

  ctx.logger.log('Plugin with settings loaded');
};

const onUnload = (ctx) => {
  pluginSettings = null;
  ctx.logger.log('Plugin with settings unloaded');
};

export { onLoad, onUnload };
