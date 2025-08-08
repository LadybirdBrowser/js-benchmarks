#include <emscripten.h>
#include <stdlib.h>

// Compiled with: -O2 -g0

__attribute__((noinline)) int random_input(
    int arg0, int arg1, int arg2, int arg3,
    int arg4, int arg5, int arg6, int arg7,
    int arg8, int arg9, int arg10, int arg11,
    int arg12, int arg13, int arg14, int arg15
)
{
    return rand()
        + arg0 + arg1 + arg2 + arg3
        + arg4 + arg5 + arg6 + arg7
        + arg8 + arg9 + arg10 + arg11
        + arg12 + arg13 + arg14 + arg15;
}

EMSCRIPTEN_KEEPALIVE
void run_microbench() {
    int result = random_input(
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    );
    for (int i = 0; i < 50'000'000; i++) {
        result += random_input(
            result, result, result, result,
            result, result, result, result,
            result, result, result, result,
            result, result, result, result
        );
    }
}
