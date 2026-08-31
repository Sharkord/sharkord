const onLoad = (ctx) => {
  ctx.hooks.onBeforeFileSave(async ({ bytes }) => {
    const original = new TextDecoder().decode(bytes);

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
