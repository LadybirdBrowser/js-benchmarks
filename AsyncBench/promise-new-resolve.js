// Measures new Promise(resolve => resolve(x)) pattern.
async function run() {
    let sum = 0;
    for (let i = 0; i < 500_000; i++) {
        sum += await new Promise(resolve => resolve(i));
    }
    return sum;
}

run();
