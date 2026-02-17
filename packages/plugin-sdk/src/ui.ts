import type { TSlots } from '@sharkord/shared';

export interface UIPluginContext {
  ui: {
    registerComponents(components: TSlots): void;
  };
}
