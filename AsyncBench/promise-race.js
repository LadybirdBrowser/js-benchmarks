// Measures Promise.race with competing async functions.
async function asyncVal(x) { return x * 2; }

async function run() {
    let sum = 0;
    for (let i = 0; i < 200_000; i++) {
        sum += await Promise.race([asyncVal(i), asyncVal(i + 1)]);
    }
    return sum;
}

run();
