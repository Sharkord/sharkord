const onLoad = (ctx) => {
  ctx.hooks.onBeforeFileSave(async ({ readBytes }) => {
    const original = new TextDecoder().decode(await readBytes());

    return {
      update: {
        bytes: new TextEncoder().encode(`${original}\nmodified by plugin`)
      }
    };
  });

  ctx.logger.log('Plugin before-file-save loaded');
};

const onUnload = (ctx) => {
  ctx.logger.log('Plugin before-file-save unloaded');
};

export { onLoad, onUnload };
