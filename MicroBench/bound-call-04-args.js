function go() {
  function target() {}

  const bound = target.bind(null, 1, 2, 3, 4);
  for (let i = 0; i < 50_000_000; ++i) {
    bound();
  }
}

go();
