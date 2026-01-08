// Cyclic Graph - Tests handling of circular references

function createCyclicGraph(numNodes, edgesPerNode) {
    const nodes = [];
    for (let i = 0; i < numNodes; i++) {
        nodes.push({ id: i, edges: [] });
    }

    for (let i = 0; i < numNodes; i++) {
        for (let j = 0; j < edgesPerNode; j++) {
            const target = (i + j * 97 + 31) % numNodes;
            nodes[i].edges.push(nodes[target]);
        }
    }

    return nodes;
}

function traverseGraph(nodes, steps) {
    let current = nodes[0];
    let sum = 0;
    for (let i = 0; i < steps; i++) {
        sum += current.id;
        const edgeIndex = i % current.edges.length;
        current = current.edges[edgeIndex];
    }
    return sum;
}

const graph = createCyclicGraph(700000, 10);
const result = traverseGraph(graph, 3000000);

gc();
