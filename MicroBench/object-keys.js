function f() {
  var object = {};
  for (let i = 0; i < 100; i++) object["k" + i] = i;

  for (var i = 0; i < 500_000; i++) {
    Object.keys(object);
  }
}

f();
