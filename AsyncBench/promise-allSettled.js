// Measures Promise.allSettled with a mix of resolved and rejected.
async function ok(x) { return x; }

async function run() {
    let sum = 0;
    for (let i = 0; i < 100_000; i++) {
        const results = await Promise.allSettled([ok(i), ok(i + 1), ok(i + 2), ok(i + 3)]);
        for (const r of results)
            sum += r.value;
    }
    return sum;
}

run();
