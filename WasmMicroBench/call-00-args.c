#include <emscripten.h>
#include <stdlib.h>

// Compiled with -O2 -g0

__attribute__((noinline)) int random_input()
{
    return rand();
}

EMSCRIPTEN_KEEPALIVE
void run_microbench() {
    int result = random_input();
    for (int i = 0; i < 50'000'000; i++) {
        result += random_input();
    }
}
