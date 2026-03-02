import { ServerEvents, type Layer } from '@sharkord/shared';
import { z } from 'zod';
import { WhiteboardRuntime } from '../../runtimes/whiteboard';
import { protectedProcedure, t } from '../../utils/trpc';

const colorSchema = z.object({
  r: z.number(),
  g: z.number(),
  b: z.number()
});

const layerSchema = z.object({
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fill: colorSchema,
  points: z.array(z.array(z.number())).optional(),
  value: z.string().optional()
}) as z.ZodType<Layer>;

// --- Queries ---

const getStateRoute = protectedProcedure
  .input(z.object({ channelId: z.number() }))
  .query(({ input }) => {
    const runtime = WhiteboardRuntime.findById(input.channelId);
    if (!runtime) return { layers: {}, layerIds: [] };
    return runtime.getState();
  });

// --- Mutations ---

const addLayerRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number(),
      layerId: z.string(),
      layer: layerSchema
    })
  )
  .mutation(({ input, ctx }) => {
    const runtime = WhiteboardRuntime.findOrCreate(input.channelId);
    runtime.addLayer(input.layerId, input.layer);

    ctx.pubsub.publishForChannel(
      input.channelId,
      ServerEvents.WHITEBOARD_LAYER_ADD,
      {
        channelId: input.channelId,
        layerId: input.layerId,
        layer: input.layer
      }
    );
  });

const updateLayerRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number(),
      layerId: z.string(),
      layer: layerSchema.partial()
    })
  )
  .mutation(({ input, ctx }) => {
    const runtime = WhiteboardRuntime.findById(input.channelId);
    if (!runtime) return;

    runtime.updateLayer(input.layerId, input.layer);

    ctx.pubsub.publishForChannel(
      input.channelId,
      ServerEvents.WHITEBOARD_LAYER_UPDATE,
      {
        channelId: input.channelId,
        layerId: input.layerId,
        layer: input.layer
      }
    );
  });

const deleteLayerRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number(),
      layerIds: z.array(z.string())
    })
  )
  .mutation(({ input, ctx }) => {
    const runtime = WhiteboardRuntime.findById(input.channelId);
    if (!runtime) return;

    runtime.deleteLayer(input.layerIds);

    ctx.pubsub.publishForChannel(
      input.channelId,
      ServerEvents.WHITEBOARD_LAYER_DELETE,
      {
        channelId: input.channelId,
        layerIds: input.layerIds
      }
    );
  });

const clearRoute = protectedProcedure
  .input(z.object({ channelId: z.number() }))
  .mutation(({ input, ctx }) => {
    const runtime = WhiteboardRuntime.findById(input.channelId);
    if (!runtime) return;

    runtime.clear();

    ctx.pubsub.publishForChannel(
      input.channelId,
      ServerEvents.WHITEBOARD_CLEAR,
      { channelId: input.channelId }
    );
  });

const cursorUpdateRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number(),
      x: z.number(),
      y: z.number()
    })
  )
  .mutation(({ input, ctx }) => {
    ctx.pubsub.publishForChannel(
      input.channelId,
      ServerEvents.WHITEBOARD_CURSOR_UPDATE,
      {
        channelId: input.channelId,
        cursor: {
          userId: ctx.userId,
          userName: ctx.user.name,
          x: input.x,
          y: input.y
        }
      }
    );
  });

// --- Subscriptions ---

const onLayerAddRoute = protectedProcedure
  .input(z.object({ channelId: z.number() }))
  .subscription(({ input, ctx }) => {
    return ctx.pubsub.subscribeForChannel(
      input.channelId,
      ServerEvents.WHITEBOARD_LAYER_ADD
    );
  });

const onLayerUpdateRoute = protectedProcedure
  .input(z.object({ channelId: z.number() }))
  .subscription(({ input, ctx }) => {
    return ctx.pubsub.subscribeForChannel(
      input.channelId,
      ServerEvents.WHITEBOARD_LAYER_UPDATE
    );
  });

const onLayerDeleteRoute = protectedProcedure
  .input(z.object({ channelId: z.number() }))
  .subscription(({ input, ctx }) => {
    return ctx.pubsub.subscribeForChannel(
      input.channelId,
      ServerEvents.WHITEBOARD_LAYER_DELETE
    );
  });

const onCursorUpdateRoute = protectedProcedure
  .input(z.object({ channelId: z.number() }))
  .subscription(({ input, ctx }) => {
    return ctx.pubsub.subscribeForChannel(
      input.channelId,
      ServerEvents.WHITEBOARD_CURSOR_UPDATE
    );
  });

const onClearRoute = protectedProcedure
  .input(z.object({ channelId: z.number() }))
  .subscription(({ input, ctx }) => {
    return ctx.pubsub.subscribeForChannel(
      input.channelId,
      ServerEvents.WHITEBOARD_CLEAR
    );
  });

export const whiteboardRouter = t.router({
  getState: getStateRoute,
  addLayer: addLayerRoute,
  updateLayer: updateLayerRoute,
  deleteLayer: deleteLayerRoute,
  clear: clearRoute,
  cursorUpdate: cursorUpdateRoute,
  onLayerAdd: onLayerAddRoute,
  onLayerUpdate: onLayerUpdateRoute,
  onLayerDelete: onLayerDeleteRoute,
  onCursorUpdate: onCursorUpdateRoute,
  onClear: onClearRoute
});
