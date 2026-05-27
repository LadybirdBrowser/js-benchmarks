function go() {
  const a = { x: 1 };

  for (let i = 0; i < 50_000_000; ++i) {
    a.nonexistent;
  }
}

go();
