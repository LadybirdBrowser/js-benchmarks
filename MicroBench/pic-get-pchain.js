function go() {
  function foo(o) {
    o.kek;
  }

  let pa = { kek: 1 };
  let pb = { a: 1, kek: 1 };
  let pc = { a: 1, b: 1, kek: 1 };
  let pd = { a: 1, b: 1, c: 1, kek: 1 };
  let pe = { a: 1, b: 1, c: 1, d: 1, kek: 1 };

  let a = { __proto__: pa };
  let b = { __proto__: pb };
  let c = { __proto__: pc };
  let d = { __proto__: pd };
  let e = { __proto__: pe };

  for (let i = 0; i < 10_000_000; ++i) {
    foo(a);
    foo(b);
    foo(c);
    foo(d);
  }
}

go();
