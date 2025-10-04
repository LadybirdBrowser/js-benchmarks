function go() {
    let o = {};
    for (let j = 0; j < 5000; ++j) {
        for (let i = 0; i < 1000; ++i) {
            o["e" + i] = i;
        }
    }
}

go();
