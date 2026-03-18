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
    }
  ]);

  ctx.commands.register({
    name: 'get-settings',
    description: 'Returns current settings values',
    executes: async () => {
      return {
        greeting: pluginSettings.get('greeting'),
        maxRetries: pluginSettings.get('maxRetries'),
        enabled: pluginSettings.get('enabled')
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

  ctx.log('Plugin with settings loaded');
};

const onUnload = (ctx) => {
  pluginSettings = null;
  ctx.log('Plugin with settings unloaded');
};

export { onLoad, onUnload };
