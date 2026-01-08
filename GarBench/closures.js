// Closures - Tests conservative scanning of captured variables
// Creates many closures that capture various objects

function createClosureChain(depth, captured) {
    if (depth === 0) {
        return () => captured.value;
    }
    const localData = { depth, captured };
    return () => {
        return localData.depth + createClosureChain(depth - 1, localData)();
    };
}

function createClosureWeb(size) {
    const closures = [];
    const sharedData = { value: 42, items: [] };

    for (let i = 0; i < size; i++) {
        const localCapture = { index: i, shared: sharedData };
        sharedData.items.push(localCapture);

        closures.push(() => {
            return localCapture.index + localCapture.shared.value;
        });

        // Also create some nested closures
        closures.push(((outer) => {
            const inner = { outer, multiplier: 2 };
            return () => inner.outer.index * inner.multiplier;
        })(localCapture));
    }

    return { closures, sharedData };
}

// Create many closure webs
const webs = [];
const numWebs = 35;
const closuresPerWeb = 20000;

for (let i = 0; i < numWebs; i++) {
    webs.push(createClosureWeb(closuresPerWeb));
}

// Also create some deep closure chains
const chains = [];
for (let i = 0; i < 1500; i++) {
    chains.push(createClosureChain(50, { value: i }));
}

// Execute closures to keep them live
let total = 0;
for (const web of webs) {
    for (let i = 0; i < 100; i++) {
        total += web.closures[i]();
    }
}
for (const chain of chains) {
    total += chain();
}

gc();
