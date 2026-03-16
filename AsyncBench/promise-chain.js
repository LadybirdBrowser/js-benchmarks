// Measures .then() chaining on promises (no async/await).
function run() {
    let p = Promise.resolve(0);
    for (let i = 0; i < 200_000; i++) {
        p = p.then(v => v + 1);
    }
    return p;
}

run();
