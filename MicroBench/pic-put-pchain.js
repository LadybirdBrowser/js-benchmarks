function go() {
  function foo(o) {
    o.kek = 3;
  }

  let pa = { set kek(v) {} };
  let pb = { a: 1, set kek(v) {} };
  let pc = { a: 1, b: 1, set kek(v) {} };
  let pd = { a: 1, b: 1, c: 1, set kek(v) {} };
  let pe = { a: 1, b: 1, c: 1, d: 1, set kek(v) {} };

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
