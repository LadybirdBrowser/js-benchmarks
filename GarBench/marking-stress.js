// Marking Stress - Creates a massive interconnected object graph
// Designed to maximize marking work: many objects, many edges, all live

const NUM_NODES = 2000000;
const EDGES_PER_NODE = 5;

// Create all nodes first (simple objects to minimize allocation overhead)
const nodes = new Array(NUM_NODES);
for (let i = 0; i < NUM_NODES; i++) {
    nodes[i] = { id: i, edges: null };
}

// Now wire up edges - each node points to EDGES_PER_NODE other nodes
// This creates a dense graph where marking must visit many edges
for (let i = 0; i < NUM_NODES; i++) {
    const edges = new Array(EDGES_PER_NODE);
    for (let j = 0; j < EDGES_PER_NODE; j++) {
        // Pseudo-random but deterministic edge targets
        const target = (i * 7 + j * 13 + 37) % NUM_NODES;
        edges[j] = nodes[target];
    }
    nodes[i].edges = edges;
}

// Add some deeply nested structures to stress mark stack
for (let i = 0; i < 500; i++) {
    let current = nodes[i * 1000 % NUM_NODES];
    for (let depth = 0; depth < 100; depth++) {
        current.deep = { value: depth, next: null };
        current = current.deep;
    }
}

gc();

// Touch nodes to ensure they stay live
let sum = 0;
for (let i = 0; i < 1000; i++) {
    sum += nodes[i * 1000 % NUM_NODES].id;
}
