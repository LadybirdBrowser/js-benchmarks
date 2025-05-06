function go() {
  function foo(o) {
    o.kek = 3;
  }

  let a = { kek: 1 };
  let b = { a: 1, kek: 1 };
  let c = { a: 1, b: 1, kek: 1 };
  let d = { a: 1, b: 1, c: 1, kek: 1 };

  for (let i = 0; i < 10_000_000; ++i) {
    foo(a);
    foo(b);
    foo(c);
    foo(d);
  }
}

go();
