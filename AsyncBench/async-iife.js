// Measures repeated async IIFE creation and execution.
async function run() {
    let sum = 0;
    for (let i = 0; i < 500_000; i++) {
        sum += await (async () => i * 2)();
    }
    return sum;
}

run();
