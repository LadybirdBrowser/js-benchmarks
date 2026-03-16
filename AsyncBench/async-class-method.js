// Measures async class methods.
class Counter {
    #value = 0;
    async increment() {
        this.#value = await (this.#value + 1);
        return this.#value;
    }
}

async function run() {
    const c = new Counter();
    for (let i = 0; i < 500_000; i++) {
        await c.increment();
    }
    return c;
}

run();
