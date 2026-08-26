let eventCounts = {
  userJoined: 0,
  userLeft: 0,
  messageCreated: 0
};

const onLoad = (ctx) => {
  ctx.logger.log('Plugin with events loaded');

  ctx.events.on('user:joined', ({ username }) => {
    eventCounts.userJoined++;
    ctx.logger.log(`User joined event: ${username}`);
  });

  ctx.events.on('user:left', ({ username }) => {
    eventCounts.userLeft++;
    ctx.logger.log(`User left event: ${username}`);
  });

  ctx.events.on('message:created', ({ content }) => {
    eventCounts.messageCreated++;
    ctx.logger.log(`Message created event: ${content}`);
  });

  ctx.commands.register({
    name: 'get-counts',
    description: 'Get event counts',
    async execute() {
      return eventCounts;
    }
  });
};

const onUnload = (ctx) => {
  ctx.logger.log('Plugin with events unloaded');
  eventCounts = { userJoined: 0, userLeft: 0, messageCreated: 0 };
};

export { onLoad, onUnload };
