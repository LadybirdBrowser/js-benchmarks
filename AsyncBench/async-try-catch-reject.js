// Measures async try/catch with thrown rejections.
async function mayThrow(x) {
    if (x % 2 === 0) throw x;
    return x;
}

async function run() {
    let sum = 0;
    for (let i = 0; i < 200_000; i++) {
        try {
            sum += await mayThrow(i);
        } catch (e) {
            sum += e;
        }
    }
    return sum;
}

run();
