// Wide Tree - Tests marking breadth with many children per node

function createWideTree(width, depth) {
    if (depth === 0) {
        return { value: 1, children: [] };
    }
    const children = [];
    for (let i = 0; i < width; i++) {
        children.push(createWideTree(width, depth - 1));
    }
    return { value: depth, children };
}

function countNodes(node) {
    let count = 1;
    for (const child of node.children) {
        count += countNodes(child);
    }
    return count;
}

// width=15, depth=5 gives ~760K nodes per tree
const trees = [];
const numTrees = 4;

for (let i = 0; i < numTrees; i++) {
    trees.push(createWideTree(15, 5));
}

let totalNodes = 0;
for (const tree of trees) {
    totalNodes += countNodes(tree);
}

gc();
