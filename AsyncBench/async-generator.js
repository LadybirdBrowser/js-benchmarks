// Measures async generator (for-await-of) performance.
async function* counter(n) {
    for (let i = 0; i < n; i++) {
        yield i;
    }
}

async function run() {
    let sum = 0;
    for (let i = 0; i < 20_000; i++) {
        for await (const v of counter(10)) {
            sum += v;
        }
    }
    return sum;
}

run();
