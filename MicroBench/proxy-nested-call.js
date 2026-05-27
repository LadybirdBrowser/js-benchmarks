function go() {
  function target(event) {}

  const inner = new Proxy(target, {
    apply(t, thisArg, args) {
      return t.apply(thisArg, args);
    },
  });

  const outer = new Proxy(inner, {
    apply(t, thisArg, args) {
      return t.apply(thisArg, args);
    },
  });

  const event = {};
  for (let i = 0; i < 10_000_000; ++i) {
    outer(event);
  }
}

go();
