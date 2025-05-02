function foo() {
    const arr = new Array(1_000_000).fill('x');
    let counter = 0;
    for (let i = 0; i < 8; ++i) {
        for (let _ in arr) {
            counter++;
        }
    }
    return counter;
}

let counter = foo();
console.log(counter);
