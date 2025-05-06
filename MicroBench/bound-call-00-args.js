function go() {
  function target() {}

  const bound = target.bind(null);
  for (let i = 0; i < 50_000_000; ++i) {
    bound();
  }
}

go();
