// rnnoise-worklet-processor.js
//
// AudioWorklet processor wrapping RNNoise noise suppression. Requires a 48kHz
// AudioContext — any other sample rate passes audio through unprocessed.
//
// concatenated with rnnoise-sync.js Emscripten glue (inlined WASM) to form rnnoise-bundle.js

const RNNOISE_SAMPLE_RATE = 48000;
const RNNOISE_FRAME_SIZE = 480;

// scale factor: rnnoise_process_frame expects pcm in the range [-32768, 32767]
const PCM_SCALE = 32768;

class RnnoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.isModuleReady = false;
    this.module = null;
    this.rnnoiseHandle = null;
    this.inputPtr = null;
    this.outputPtr = null;

    this.inputBuf = new Float32Array(RNNOISE_FRAME_SIZE);
    this.outputBuf = new Float32Array(RNNOISE_FRAME_SIZE);
    this.inputBufIdx = 0;
    this.outputBufIdx = 0;
    this.outputAvailable = 0;

    // initialise the wasm module synchronously (rnnoise-sync.js has wasm inlined)
    const mod = createRNNWasmModuleSync();
    mod['ready'].then((m) => {
      this.module = m;
      this.rnnoiseHandle = m._rnnoise_create(0);
      // allocate persistent wasm buffers for one frame (float32 = 4 bytes)
      this.inputPtr = m._malloc(RNNOISE_FRAME_SIZE * 4);
      this.outputPtr = m._malloc(RNNOISE_FRAME_SIZE * 4);
      this.isModuleReady = true;
      this.port.postMessage('ready');
    });
  }

  denoise(inputBuf, outputBuf) {
    const m = this.module;
    const heap = m['HEAPF32'];
    const inOff = this.inputPtr >> 2;
    const outOff = this.outputPtr >> 2;

    for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
      heap[inOff + i] = inputBuf[i] * PCM_SCALE;
    }

    m._rnnoise_process_frame(this.rnnoiseHandle, this.outputPtr, this.inputPtr);

    for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
      outputBuf[i] = heap[outOff + i] / PCM_SCALE;
    }
  }

  process(inputs, outputs) {
    if (!inputs[0]?.[0] || !outputs[0]?.[0]) return true;

    const input = inputs[0][0];
    const output = outputs[0][0];

    if (!this.isModuleReady || sampleRate !== RNNOISE_SAMPLE_RATE) {
      output.set(input);
    } else {
      // 480 is not a multiple of 128 (the AudioWorklet quantum size), so a quantum
      // will always straddle a frame boundary — process sample-by-sample
      for (let i = 0; i < input.length; i++) {
        this.inputBuf[this.inputBufIdx++] = input[i];

        if (this.inputBufIdx >= RNNOISE_FRAME_SIZE) {
          this.denoise(this.inputBuf, this.outputBuf);
          this.inputBufIdx = 0;
          this.outputAvailable = RNNOISE_FRAME_SIZE;
          this.outputBufIdx = 0;
        }

        output[i] = this.outputAvailable > 0
          ? (this.outputAvailable--, this.outputBuf[this.outputBufIdx++])
          : 0;
      }
    }

    // copy ch0 to ch1 so the output is centred rather than hard-left
    if (outputs[0][1]) {
      outputs[0][1].set(output);
    }

    return true;
  }
}

registerProcessor('RnnoiseProcessor', RnnoiseProcessor);
