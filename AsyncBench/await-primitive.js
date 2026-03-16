// Measures the overhead of awaiting a primitive value (no promise wrapping needed).
async function run() {
    let sum = 0;
    for (let i = 0; i < 1_000_000; i++) {
        sum += await 1;
    }
    return sum;
}

run();
