function f() {
    let array = [];
    for (let i = 0; i < 3_000; i++) {
        array.push(i);
    }

    for (let i = 0; i < 10_000; i++) {
        array.map(x => x * 2);
    }
}

f();
