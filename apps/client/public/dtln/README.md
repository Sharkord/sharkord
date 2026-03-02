# DTLN noise suppression

We wrap DataDog's [DTLN library](https://github.com/DataDog/dtln-rs)
with resampling necessary to support Firefox and Safari.  The library
expects 16kHz audio, so we give it what it wants, even if the client
won't honor aspirational `sampleRate` constraints.

## Building dtln-processor.js

Fetch the wasm from (DataDog/dtln-rs-demo)[https://github.com/DataDog/dtln-rs-demo]
and incorporate our resampling functionality into the worklet:

```bash
# fetch the upstream source
wget -O /tmp/dtln-core.js https://github.com/DataDog/dtln-rs-demo/raw/d5044ae7c579bda69cca13c1c59e3400c9d29689/src/audio-worklet/dtln.js

# concatenate the resampling bits with dtln.js
cat /tmp/dtln-core.js resampling-postscript.js > dtln-processor.js
```

## Reference

- https://github.com/DataDog/dtln-rs-demo
- https://github.com/DataDog/dtln-rs
- https://www.datadoghq.com/blog/engineering/noise-suppression-library/
