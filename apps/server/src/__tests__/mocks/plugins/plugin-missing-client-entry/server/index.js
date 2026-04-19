const onLoad = (ctx) => {
  ctx.log('plugin-missing-client-entry loaded');
};

const onUnload = (ctx) => {
  ctx.log('plugin-missing-client-entry unloaded');
};

export { onLoad, onUnload };