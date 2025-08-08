function f() {
    const a = new Array(10000).fill(1);
    while (a.length > 0) {
        a.shift();
    }
}

f();
