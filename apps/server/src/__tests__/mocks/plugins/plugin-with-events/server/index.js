let eventCounts = {
  userJoined: 0,
  userLeft: 0,
  messageCreated: 0
};

// the payload of the last event of each name, so a test can assert what a
// handler actually received rather than only that it ran
let lastPayloads = {};

const RECORDED = [
  'reaction:added',
  'reaction:removed',
  'message:pinned',
  'message:unpinned',
  'user:banned',
  'user:unbanned',
  'user:kicked',
  'user:created',
  'user:deleted',
  'role:assigned',
  'role:removed',
  'channel:created',
  'channel:updated',
  'channel:deleted',
  'category:created',
  'category:updated',
  'category:deleted',
  'role:created',
  'role:updated',
  'role:deleted',
  'user:updated'
];

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

  for (const name of RECORDED) {
    ctx.events.on(name, (payload) => {
      lastPayloads[name] = payload;
    });
  }

  ctx.commands.register({
    name: 'get-counts',
    description: 'Get event counts',
    async execute() {
      return eventCounts;
    }
  });

  ctx.commands.register({
    name: 'get-last-event',
    description: 'The payload of the last event of a given name',
    args: [{ name: 'name', type: 'string', required: true }],
    async execute(invokerCtx, args) {
      return { payload: lastPayloads[args.name] ?? null };
    }
  });
};

const onUnload = (ctx) => {
  ctx.logger.log('Plugin with events unloaded');
  eventCounts = { userJoined: 0, userLeft: 0, messageCreated: 0 };
  lastPayloads = {};
};

export { onLoad, onUnload };
