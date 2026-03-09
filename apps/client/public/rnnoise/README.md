# RNNoise noise suppression

We wrap Jitsi's [rnnoise-wasm](https://github.com/jitsi/rnnoise-wasm) (Emscripten
build of [xiph/rnnoise](https://github.com/xiph/rnnoise)) in an AudioWorklet
processor.

## Building rnnoise-processor.js

Adapt the upstream sync (WASM-inlined) build for AudioWorklet classic-script use,
then append our processor class:

```bash
# pull the sync wasm glue from the installed npm package and strip ES module syntax
sed \
  -e 's|var _scriptDir = import.meta.url;|var _scriptDir = typeof self !== "undefined" ? self.location.href : "";|' \
  -e '/^export default createRNNWasmModuleSync;/d' \
  node_modules/@jitsi/rnnoise-wasm/dist/rnnoise-sync.js \
  > /tmp/rnnoise-core.js

# concatenate with the worklet processor
cat /tmp/rnnoise-core.js apps/client/public/rnnoise/rnnoise-worklet-processor.js \
  > apps/client/public/rnnoise/rnnoise-bundle.js
```

## Reference

- https://github.com/jitsi/rnnoise-wasm
- https://github.com/xiph/rnnoise
- https://jmvalin.ca/demo/rnnoise/
