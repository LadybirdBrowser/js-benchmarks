// Measures the overhead of awaiting an already-resolved promise.
async function run() {
    let sum = 0;
    for (let i = 0; i < 1_000_000; i++) {
        sum += await Promise.resolve(1);
    }
    return sum;
}

run();
