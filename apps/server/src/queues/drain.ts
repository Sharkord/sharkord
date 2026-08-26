import type Queue from 'queue';

// the queues exist to keep work off the request path, which means a route returns before its
// side effect has landed. tests need to wait for that without a fixed sleep, and the suite has
// to wait before it closes the per-test database: a job that runs after the close writes into
// whatever database came next, or throws
const drainQueue = async (queue: Queue): Promise<void> => {
  // length counts pending and in-flight jobs, so zero means there is nothing left to wait for.
  // checked synchronously before subscribing, or an "end" that already fired would be missed
  if (queue.length === 0) return;

  await new Promise<void>((resolve) => {
    queue.addEventListener('end', () => resolve(), { once: true });
  });
};

export { drainQueue };
