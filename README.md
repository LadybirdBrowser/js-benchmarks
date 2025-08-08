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
