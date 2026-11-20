const MICROPHONE_NOISE_GATE_WORKLET_NAME = 'sharkord-noise-gate';
const GATE_FADE_MS = 10;

class NoiseGateProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.enabled = true;
    this.thresholdDb = -48;
    this.holdMs = 100;
    this.gateOpen = true;
    this.closeHoldRemainingFrames = 0;
    this.gain = 1;

    this.port.onmessage = (event) => {
      const data = event.data;

      if (!data || typeof data !== 'object') {
        console.warn('[noise-gate] ignored a non-object message', data);
        return;
      }

      if (data.type !== 'config') {
        console.warn('[noise-gate] ignored unknown message type', data.type);
        return;
      }

      const known = ['type', 'enabled', 'thresholdDb', 'holdMs'];
      const unknown = Object.keys(data).filter((key) => !known.includes(key));

      if (unknown.length > 0) {
        console.warn('[noise-gate] config had unknown fields', unknown);
      }

      if (typeof data.enabled === 'boolean') {
        this.enabled = data.enabled;

        if (!this.enabled) {
          this.gateOpen = true;
          this.closeHoldRemainingFrames = 0;
        }
      }

      if (
        typeof data.thresholdDb === 'number' &&
        Number.isFinite(data.thresholdDb)
      ) {
        this.thresholdDb = data.thresholdDb;
      }

      if (typeof data.holdMs === 'number' && Number.isFinite(data.holdMs)) {
        this.holdMs = Math.max(0, data.holdMs);
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!output || output.length === 0) {
      return true;
    }

    const frameCount = output[0]?.length ?? 0;

    if (!input || input.length === 0 || frameCount === 0) {
      for (let channelIndex = 0; channelIndex < output.length; channelIndex++) {
        output[channelIndex].fill(0);
      }

      return true;
    }

    let sum = 0;
    let samplesCount = 0;

    for (let channelIndex = 0; channelIndex < input.length; channelIndex++) {
      const channel = input[channelIndex];

      for (let sampleIndex = 0; sampleIndex < channel.length; sampleIndex++) {
        const sample = channel[sampleIndex];
        sum += sample * sample;
      }

      samplesCount += channel.length;
    }

    const rms = Math.sqrt(sum / Math.max(1, samplesCount));
    const estimatedDecibels = 20 * Math.log10(rms + 1e-8);
    const holdFrames = (this.holdMs / 1000) * sampleRate;

    if (!this.enabled) {
      this.gateOpen = true;
      this.closeHoldRemainingFrames = 0;
    } else if (estimatedDecibels >= this.thresholdDb) {
      this.gateOpen = true;
      this.closeHoldRemainingFrames = holdFrames;
    } else if (this.gateOpen) {
      this.closeHoldRemainingFrames = Math.max(
        0,
        this.closeHoldRemainingFrames - frameCount
      );

      if (this.closeHoldRemainingFrames <= 0) {
        this.gateOpen = false;
      }
    }

    const targetGain = !this.enabled || this.gateOpen ? 1 : 0;
    const gainStep = 1000 / (GATE_FADE_MS * sampleRate);
    const channelCount = Math.min(input.length, output.length);

    for (let sampleIndex = 0; sampleIndex < frameCount; sampleIndex++) {
      if (this.gain < targetGain) {
        this.gain = Math.min(targetGain, this.gain + gainStep);
      } else if (this.gain > targetGain) {
        this.gain = Math.max(targetGain, this.gain - gainStep);
      }

      for (let channelIndex = 0; channelIndex < output.length; channelIndex++) {
        const inputChannel =
          channelIndex < channelCount ? input[channelIndex] : input[0];

        output[channelIndex][sampleIndex] =
          (inputChannel?.[sampleIndex] ?? 0) * this.gain;
      }
    }

    return true;
  }
}

registerProcessor(MICROPHONE_NOISE_GATE_WORKLET_NAME, NoiseGateProcessor);
