import type { Layer, WhiteboardState } from '@sharkord/shared';

const whiteboardRuntimes = new Map<number, WhiteboardRuntime>();

class WhiteboardRuntime {
  public readonly channelId: number;
  private layers: Map<string, Layer> = new Map();
  private layerIds: string[] = [];
  private subscriberCount = 0;

  constructor(channelId: number) {
    this.channelId = channelId;
    whiteboardRuntimes.set(channelId, this);
  }

  public static findById(channelId: number): WhiteboardRuntime | undefined {
    return whiteboardRuntimes.get(channelId);
  }

  public static findOrCreate(channelId: number): WhiteboardRuntime {
    const existing = whiteboardRuntimes.get(channelId);
    if (existing) return existing;
    return new WhiteboardRuntime(channelId);
  }

  public addSubscriber(): void {
    this.subscriberCount++;
  }

  public removeSubscriber(): void {
    this.subscriberCount--;
    if (this.subscriberCount <= 0) {
      this.destroy();
    }
  }

  public getState(): WhiteboardState {
    const layers: Record<string, Layer> = {};
    for (const [id, layer] of this.layers) {
      layers[id] = layer;
    }
    return { layers, layerIds: [...this.layerIds] };
  }

  public addLayer(id: string, layer: Layer): void {
    this.layers.set(id, layer);
    this.layerIds.push(id);
  }

  public updateLayer(id: string, partial: Partial<Layer>): void {
    const existing = this.layers.get(id);
    if (!existing) return;
    this.layers.set(id, { ...existing, ...partial } as Layer);
  }

  public deleteLayer(ids: string[]): void {
    for (const id of ids) {
      this.layers.delete(id);
    }
    this.layerIds = this.layerIds.filter((id) => !ids.includes(id));
  }

  public clear(): void {
    this.layers.clear();
    this.layerIds = [];
  }

  private destroy(): void {
    this.layers.clear();
    this.layerIds = [];
    this.subscriberCount = 0;
    whiteboardRuntimes.delete(this.channelId);
  }
}

export { WhiteboardRuntime };
