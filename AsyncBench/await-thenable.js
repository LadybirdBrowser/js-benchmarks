// Measures awaiting a custom thenable object (not a real Promise).
const thenable = { then(cb) { cb(42); } };

async function run() {
    let sum = 0;
    for (let i = 0; i < 1_000_000; i++) {
        sum += await thenable;
    }
    return sum;
}

run();
