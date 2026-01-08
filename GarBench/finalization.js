// Finalization - Tests FinalizationRegistry and weak reference handling
// Creates many objects registered for finalization

let cleanupCount = 0;
const registry = new FinalizationRegistry((heldValue) => {
    cleanupCount++;
});

function createTrackedObjects(count) {
    const liveRefs = [];
    for (let i = 0; i < count; i++) {
        const obj = { id: i, data: new Array(10).fill(i) };
        registry.register(obj, i);
        // Keep half of them alive
        if (i % 2 === 0) {
            liveRefs.push(obj);
        }
    }
    return liveRefs;
}

// Create many rounds of tracked objects
let allLiveRefs = [];
const rounds = 17;
const objectsPerRound = 100000;

for (let r = 0; r < rounds; r++) {
    const liveRefs = createTrackedObjects(objectsPerRound);
    allLiveRefs = allLiveRefs.concat(liveRefs);
    // Trim to avoid memory blowup
    if (allLiveRefs.length > 1000000) {
        allLiveRefs = allLiveRefs.slice(-500000);
    }
}

// Force GC to trigger finalization
gc();

// Access live refs to ensure they're kept
let sum = 0;
for (const ref of allLiveRefs) {
    sum += ref.id;
}
