# DTLN noise suppression

We wrap DataDog's [DTLN library](https://github.com/DataDog/dtln-rs) with resampling necessary to support Firefox and Safari.  The library expects 16kHz audio, so we give it what it wants, even if the client won't honor aspirational `sampleRate` constraints.

## Building dtln-processor.js

The WASM is built from source using [DataDog/dtln-rs](https://github.com/DataDog/dtln-rs) with two important changes over the upstream defaults:

- **Quantized models** - The upstream dtln-rs ships full-precision TFLite models despite naming them `model_quant_*`.  The genuinely quantized models (~4x smaller) come from [breizhn/DTLN](https://github.com/breizhn/DTLN), which is the original research repo the DataDog implementation is based on.  Swapping these in gives roughly a 3x CPU reduction (11ms => 4ms per 32ms block on an i7-12650H).

- **`-O3` emscripten link flag** - The upstream config has no `-O` flag, leaving the emscripten link step at its default optimisation level.

There is also a fix required for emscripten 5.x compatibility:
- `Module.HEAPF32` is no longer exposed on the `Module` object; use bare `HEAPF32` in `dtln_post.js`
- The `-s ENVIRONMENT=` flag no longer accepts a quoted string; use `-s ENVIRONMENT=web,worker` (no quotes)
- `build.rs` has no Linux path; add one that extracts `tflite-prebuilt.wasm.tar.bz2`

### Steps to build

```bash
# clone the repos
git clone https://github.com/DataDog/dtln-rs /tmp/dtln-rs
git clone https://github.com/breizhn/DTLN /tmp/DTLN

# install emscripten
git clone https://github.com/emscripten-core/emsdk.git /tmp/emsdk
cd /tmp/emsdk && ./emsdk install latest && ./emsdk activate latest
source /tmp/emsdk/emsdk_env.sh

# install rust wasm target
rustup target add wasm32-unknown-emscripten

# swap in the genuinely quantized models from breizhn/DTLN
cp /tmp/DTLN/pretrained_model/model_quant_1.tflite /tmp/dtln-rs/model/
cp /tmp/DTLN/pretrained_model/model_quant_2.tflite /tmp/dtln-rs/model/
```

Apply the following patches to `/tmp/dtln-rs`:

**`.cargo/config.toml`** - Add `-O3` and fix ENVIRONMENT quoting:
```
"-C", "link-args=-O3 -s SINGLE_FILE=1 -s ENVIRONMENT=web,worker",
```

**`dtln_post.js`** - Replace `Module.HEAPF32` with bare `HEAPF32`:
```js
HEAPF32.set(input, audioBufferPtr);
// ...
output.set(HEAPF32.subarray(audioBufferPtr, audioBufferPtr + DTLN_SAMPLE_BLOCK_SIZE));
```

**`build.rs`** - Add a Linux case alongside the existing macOS one:

```rust
#[cfg(target_os = "linux")]
fn main() {
    use std::{env, process::Command};
    use build_target::Arch;
    let target_arch = build_target::target_arch().unwrap();
    if target_arch == Arch::WASM32 {
        Command::new("tar")
            .args(["-xjf", "./tflite/tflite-prebuilt.wasm.tar.bz2", "-C", "./tflite/"])
            .status().unwrap();
    }
    let root_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    println!("cargo:rustc-link-search=native={}/tflite/lib/", root_dir);
    std::fs::read_dir(format!("{}/tflite/lib", root_dir)).unwrap()
        .for_each(|entry| {
            let path = entry.unwrap().path();
            if path.extension().map_or(false, |e| e == "a") {
                let lib_name = path.file_stem().unwrap().to_str().unwrap();
                if let Some(name) = lib_name.strip_prefix("lib") {
                    println!("cargo:rustc-link-lib=dylib={}", name);
                }
            }
        });
}
```

Then build and assemble:

```bash
cd /tmp/dtln-rs
cargo build --release --target wasm32-unknown-emscripten

cat /tmp/dtln-rs/target/wasm32-unknown-emscripten/release/dtln-rs.js \
    resampling-postscript.js \
    > dtln-processor.js
```

## Reference

- https://github.com/DataDog/dtln-rs
- https://github.com/DataDog/dtln-rs-demo
- https://github.com/breizhn/DTLN
- https://www.datadoghq.com/blog/engineering/noise-suppression-library/
