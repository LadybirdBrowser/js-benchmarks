function doubled(value) {
    try {
        return value * 2;
    } catch (e) {
        return 0;
    }
}

function f() {
    let sum = 0;
    for (let i = 0; i < 50_000_000; i++) sum += doubled(i & 1023);
    return sum;
}

f();
