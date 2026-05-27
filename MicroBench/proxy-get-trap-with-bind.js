function go() {
  function handler(event) {}
  const listener = { handleEvent: handler };
  const cache = new WeakMap();

  const p = new Proxy(listener, {
    get(target, prop, receiver) {
      if (prop === "handleEvent") {
        const fn = target[prop];
        if (fn) {
          let wrapped = cache.get(fn);
          if (!wrapped) {
            wrapped = function (e) {
              return fn.call(this, e);
            };
            cache.set(fn, wrapped);
          }
          return wrapped.bind(target);
        }
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  const event = {};
  for (let i = 0; i < 10_000_000; ++i) {
    p.handleEvent(event);
  }
}

go();
