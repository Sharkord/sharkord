import { TRPCError } from '@trpc/server';

const invariant: (
  condition: unknown,
  trpcData: ConstructorParameters<typeof TRPCError>[0] | string
) => asserts condition = (condition, trpcData) => {
  if (!condition) {
    if (typeof trpcData === 'string') {
      trpcData = {
        code: 'BAD_REQUEST',
        message: trpcData
      };
    }

    throw new TRPCError(trpcData);
  }
};

export { invariant };
