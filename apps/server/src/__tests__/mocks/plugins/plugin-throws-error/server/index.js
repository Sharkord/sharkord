const onLoad = (ctx) => {
  ctx.logger.log('Attempting to load...');
  throw new Error('Intentional error during load');
};

const onUnload = (ctx) => {
  ctx.logger.log('Plugin unloaded');
};

export { onLoad, onUnload };
