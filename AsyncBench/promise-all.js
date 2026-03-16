// Measures Promise.all with multiple async functions.
async function asyncVal(x) { return x * 2; }

async function run() {
    let sum = 0;
    for (let i = 0; i < 100_000; i++) {
        const [a, b, c, d] = await Promise.all([
            asyncVal(i),
            asyncVal(i + 1),
            asyncVal(i + 2),
            asyncVal(i + 3),
        ]);
        sum += a + b + c + d;
    }
    return sum;
}

run();
