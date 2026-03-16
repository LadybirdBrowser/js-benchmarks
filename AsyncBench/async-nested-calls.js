// Measures nested async function call depth.
async function d0(x) { return x + 1; }
async function d1(x) { return await d0(x); }
async function d2(x) { return await d1(x); }
async function d3(x) { return await d2(x); }

async function run() {
    let sum = 0;
    for (let i = 0; i < 200_000; i++) {
        sum += await d3(i);
    }
    return sum;
}

run();
