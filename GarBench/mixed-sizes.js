// Mixed Sizes - Tests allocation and collection of varying object sizes

function createTinyObject(id) {
    return { id };
}

function createSmallObject(id) {
    return { id, a: id + 1, b: id + 2, c: id + 3, d: id + 4 };
}

function createMediumObject(id) {
    return {
        id,
        data: new Array(50).fill(id),
        nested: { x: id * 2, y: id * 3, z: id * 4, items: [id, id + 1, id + 2, id + 3, id + 4] }
    };
}

function createLargeObject(id) {
    return {
        id,
        buffer: new Array(500).fill(id),
        strings: new Array(20).fill(null).map((_, i) => 'string_' + id + '_' + i),
        objects: new Array(10).fill(null).map((_, i) => ({ index: i, value: id + i }))
    };
}

function touchObject(obj) {
    if (obj.buffer) return obj.buffer.length;
    if (obj.data) return obj.data.length;
    return obj.id;
}

const allObjects = [];

for (let i = 0; i < 1500000; i++) {
    allObjects.push(createTinyObject(i));
}

for (let i = 0; i < 600000; i++) {
    allObjects.push(createSmallObject(i));
}

for (let i = 0; i < 150000; i++) {
    allObjects.push(createMediumObject(i));
}

for (let i = 0; i < 15000; i++) {
    allObjects.push(createLargeObject(i));
}

for (let i = 0; i < 300000; i++) {
    const idx1 = (i * 7) % allObjects.length;
    const idx2 = (i * 13 + 1000) % allObjects.length;
    allObjects[idx1].link = allObjects[idx2];
}

let total = 0;
for (const obj of allObjects) {
    total += touchObject(obj);
}

gc();
