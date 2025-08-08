#include <emscripten.h>
#include <stdlib.h>

// Compiled with: -O2 -g0

__attribute__((noinline)) int random_input(int arg0, int arg1, int arg2, int arg3)
{
    return rand() + arg0 + arg1 + arg2 + arg3;
}

EMSCRIPTEN_KEEPALIVE
void run_microbench() {
    int result = random_input(0, 0, 0, 0);
    for (int i = 0; i < 50'000'000; i++) {
        result += random_input(result, result, result, result);
    }
}
