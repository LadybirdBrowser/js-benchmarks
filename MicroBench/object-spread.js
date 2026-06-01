function go() {
  let source = {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
    e: 5,
    f: 6,
    g: 7,
    h: 8,
  };

  let sink;
  for (let i = 0; i < 5_000_000; ++i) {
    sink = { ...source };
  }
  return sink;
}

go();
