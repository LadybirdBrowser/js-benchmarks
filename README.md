# Benchmarks

This repository contains JavaScript and WebAssembly benchmarks.

## WebAssembly Micro Benchmarks (WasmMicroBench)

This folder contains pre-compiled WebAssembly micro benchmarks from two sources:

### .c files

If you wish to update the .wasm file, [setup the Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html), edit the accompanying .c file and then compile it with the following command:
```
emcc [benchname].c [compiler_options] --std=c23 -sSTANDALONE_WASM --no-entry -o [benchname].wasm
```
Replace `[compiler_options]` with options such as `-o2 -g0`. You should leave a comment in the .c file indicating what compiler options you used.

For example, with the `call-03-args` microbench:
```
emcc call-03-args.c -O2 -g0 --std=c23 -sSTANDALONE_WASM --no-entry -o call-03-args.wasm
```

To add a new microbench from a .c file:
1. Copy WasmMicroBench/WasmTemplate.c and rename it to what you are testing
2. Insert your microbench code into the run_benchmark funtion.
3. Specify your compiler options.

You may find it useful to use [WebAssembly Binary Toolkit](https://github.com/WebAssembly/wabt), particularly wasm2wat or wasm2c, to ensure emcc isn't optimizing away the code you want to test (e.g. inlining functions when you're testing the call instruction)

### .wat files

If you want to benchmark a specific instruction sequence, you can write a WebAssembly Text Format (.wat) file and compile it to Wasm with the wat2wasm tool from the [WebAssembly Binary Toolkit](https://github.com/WebAssembly/wabt).

## WebAssembly Rust Benchmarks (WasmRustBench)

This folder contains pre-compiled WebAssembly benchmarks written in Rust. Rust is currently a popular language to use for Wasm and allows using crates such as regex in Wasm benchmarks.

Install [Rust as per the instructions on their website](https://www.rust-lang.org/learn/get-started) and then install the wasm32-wasip1 target with:
```bash
rustup target add wasm32-wasip1
```

To add a new benchmark, copy the `template` folder within the `sources` folder, set the package name in Cargo.toml to the name of your benchmark and add your benchmark code to `main` in `src/main.rs`.

Compile Rust with:
```bash
cargo build --release
```

After compiling, copy the resulting `.wasm` file from the `target/wasm32-wasip1/release` folder into the `WasmRustBench` folder.
