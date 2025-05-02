function foo() {
    let o = {}
    for (let i = 0; i < 128; ++i)
        o[String.fromCharCode(i)] = "OK";
    let counter = 0;
    for (let i = 0; i < 250_000; ++i) {
        for (let _ in o) {
            counter++;
        }
    }
    return counter;
}

let counter = foo();
console.log(counter);
