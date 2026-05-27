function go() {
  function target() {}

  const p = new Proxy(target, {
    apply(t, thisArg, args) {
      return t.apply(thisArg, args);
    },
  });

  for (let i = 0; i < 10_000_000; ++i) {
    p();
  }
}

go();
