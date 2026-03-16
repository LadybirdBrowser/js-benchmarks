// Measures spawning many concurrent async tasks and collecting results.
async function task(x) { return x * 2; }

async function run() {
    let sum = 0;
    for (let i = 0; i < 10_000; i++) {
        const promises = [];
        for (let j = 0; j < 16; j++) {
            promises.push(task(i + j));
        }
        const results = await Promise.all(promises);
        for (const r of results) sum += r;
    }
    return sum;
}

run();
