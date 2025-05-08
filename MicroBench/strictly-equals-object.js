let a = {};
let b = a;
for (let i = 0; i < 100_000_000; ++i) {
    if (a === b)
        continue;
}
