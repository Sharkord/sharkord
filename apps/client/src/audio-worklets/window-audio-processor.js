class WindowAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // a stalled page must not build up seconds of stale audio or unbounded memory.
    this.samples = new Float32Array(48000);
    this.read = 0;
    this.write = 0;
    this.count = 0;
    this.port.onmessage = ({ data }) => {
      const input = new Float32Array(
        data.buffer,
        data.byteOffset,
        data.byteLength / 4
      );
      for (let i = 0; i < input.length; i++) {
        if (this.count === this.samples.length) {
          this.read = (this.read + 2) % this.samples.length;
          this.count -= 2;
        }
        this.samples[this.write] = input[i];
        this.write = (this.write + 1) % this.samples.length;
        this.count++;
      }
    };
  }

  process(_inputs, outputs) {
    const [output] = outputs;
    for (let frame = 0; frame < output[0].length; frame++) {
      if (this.count < 2) break;
      for (let channel = 0; channel < 2; channel++) {
        output[channel][frame] = this.samples[this.read];
        this.read = (this.read + 1) % this.samples.length;
        this.count--;
      }
    }
    return true;
  }
}

registerProcessor('window-audio', WindowAudioProcessor);
