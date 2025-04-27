function foo(f) {
    for (let i = 0; i < 50_000_000; ++i)
        f(1, 2, 3);
}

foo(function() {})
