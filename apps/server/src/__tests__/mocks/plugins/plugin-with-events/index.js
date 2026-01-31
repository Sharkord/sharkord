let eventCounts = {
  userJoined: 0,
  userLeft: 0,
  messageCreated: 0
};

const onLoad = (ctx) => {
  ctx.log('Plugin with events loaded');

  ctx.events.on('user:joined', ({ username }) => {
    eventCounts.userJoined++;
    ctx.log(`User joined event: ${username}`);
  });

  ctx.events.on('user:left', ({ username }) => {
    eventCounts.userLeft++;
    ctx.log(`User left event: ${username}`);
  });

  ctx.events.on('message:created', ({ content }) => {
    eventCounts.messageCreated++;
    ctx.log(`Message created event: ${content}`);
  });

  ctx.commands.register({
    name: 'get-counts',
    description: 'Get event counts',
    async executes() {
      return eventCounts;
    }
  });
};

const onUnload = (ctx) => {
  ctx.log('Plugin with events unloaded');
  eventCounts = { userJoined: 0, userLeft: 0, messageCreated: 0 };
};

export { onLoad, onUnload };
