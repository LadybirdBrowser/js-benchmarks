// Measures async function call + await overhead for a trivial function.
async function asyncAdd(a, b) { return a + b; }

async function run() {
    let sum = 0;
    for (let i = 0; i < 500_000; i++) {
        sum += await asyncAdd(i, 1);
    }
    return sum;
}

run();
