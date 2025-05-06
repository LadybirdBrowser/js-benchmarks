function go() {
  function target() {}

  const bound = target.bind(
    null,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
  );
  for (let i = 0; i < 50_000_000; ++i) {
    bound();
  }
}

go();
