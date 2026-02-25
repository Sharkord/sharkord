const MICROPHONE_AUDIO_METER_WORKLET_NAME = 'sharkord-audio-meter';

class AudioMeterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.enabled = true;
    this.updateIntervalMs = 16;
    this.framesSinceReport = 0;
    this.peakDbSinceReport = -Infinity;

    this.port.onmessage = (event) => {
      const data = event.data;

      if (!data || typeof data !== 'object') return;
      if (data.type !== 'config') return;

      if (typeof data.enabled === 'boolean') {
        this.enabled = data.enabled;
      }

      if (
        typeof data.updateIntervalMs === 'number' &&
        Number.isFinite(data.updateIntervalMs)
      ) {
        this.updateIntervalMs = Math.max(1, data.updateIntervalMs);
      }

      this.framesSinceReport = 0;
      this.peakDbSinceReport = -Infinity;
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
      const inputChannel = input[channelIndex];

      for (let sampleIndex = 0; sampleIndex < inputChannel.length; sampleIndex++) {
        const sample = inputChannel[sampleIndex];
        sum += sample * sample;
      }

      samplesCount += inputChannel.length;
    }

    const rms = Math.sqrt(sum / Math.max(1, samplesCount));
    const estimatedDecibels = 20 * Math.log10(rms + 1e-8);

    if (this.enabled) {
      this.peakDbSinceReport = Math.max(this.peakDbSinceReport, estimatedDecibels);
      this.framesSinceReport += frameCount;

      const reportIntervalFrames = (this.updateIntervalMs / 1000) * sampleRate;

      if (this.framesSinceReport >= reportIntervalFrames) {
        this.port.postMessage({
          type: 'meter',
          decibels: this.peakDbSinceReport
        });
        this.framesSinceReport = 0;
        this.peakDbSinceReport = -Infinity;
      }
    }

    const channelCount = Math.min(input.length, output.length);

    for (let channelIndex = 0; channelIndex < channelCount; channelIndex++) {
      output[channelIndex].set(input[channelIndex]);
    }

    for (let channelIndex = channelCount; channelIndex < output.length; channelIndex++) {
      output[channelIndex].fill(0);
    }

    return true;
  }
}

registerProcessor(MICROPHONE_AUDIO_METER_WORKLET_NAME, AudioMeterProcessor);
