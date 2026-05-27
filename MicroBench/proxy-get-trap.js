function go() {
  function handler(event) {}
  const listener = { handleEvent: handler };

  const p = new Proxy(listener, {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },
  });

  const event = {};
  for (let i = 0; i < 10_000_000; ++i) {
    p.handleEvent(event);
  }
}

go();
