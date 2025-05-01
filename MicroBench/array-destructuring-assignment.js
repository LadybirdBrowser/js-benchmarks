function f() {
    const arr = [];
    for (let i = 0; i < 10_000_000; i++) {
        arr.push([i]);
    }
    let sum = 0;
    for (let [i] of arr) {
        sum += i;
    }
}

f();
