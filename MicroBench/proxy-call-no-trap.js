function go() {
  function target() {}

  const p = new Proxy(target, {});

  for (let i = 0; i < 10_000_000; ++i) {
    p(1);
  }
}

go();
