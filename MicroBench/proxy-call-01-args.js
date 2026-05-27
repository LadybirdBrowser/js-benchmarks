function go() {
  function target(event) {}

  const p = new Proxy(target, {
    apply(t, thisArg, args) {
      return t.apply(thisArg, args);
    },
  });

  const event = {};
  for (let i = 0; i < 10_000_000; ++i) {
    p(event);
  }
}

go();
