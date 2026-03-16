// Measures multiple sequential awaits inside a single async function call.
async function work() {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += await (i * 2);
    }
    return sum;
}

async function run() {
    let total = 0;
    for (let i = 0; i < 100_000; i++) {
        total += await work();
    }
    return total;
}

run();
