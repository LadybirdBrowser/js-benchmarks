const n = 10_000_000;

function bench(a, b) {
    let total = 0;
    for (let i = 0; i < n; ++i)
        total += (a + b).length;

    if (total !== n * 2)
        throw new Error(String(total));
}

bench("a", "b");
