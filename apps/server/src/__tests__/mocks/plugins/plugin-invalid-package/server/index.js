const onLoad = (ctx) => {
  ctx.logger.log('This should never load');
};

const onUnload = () => {};

export { onLoad, onUnload };
