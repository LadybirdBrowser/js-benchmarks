// String Heavy - Tests objects with many string references
// Creates objects holding various strings that the GC must trace

function generateString(seed, length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += String.fromCharCode(65 + ((seed + i) % 26));
    }
    return result;
}

function createStringHeavyObject(id) {
    return {
        id: id,
        name: generateString(id, 20),
        description: generateString(id * 7, 100),
        tags: [
            generateString(id * 2, 15),
            generateString(id * 3, 15),
            generateString(id * 5, 15)
        ],
        metadata: {
            author: generateString(id * 11, 30),
            category: generateString(id * 13, 25),
            notes: generateString(id * 17, 200)
        }
    };
}

function touchObject(obj) {
    return obj.name.length + obj.description.length + obj.metadata.notes.length;
}

// Create many string-heavy objects
const objects = [];
const numObjects = 35000;

for (let i = 0; i < numObjects; i++) {
    objects.push(createStringHeavyObject(i));
}

// Touch all objects to keep them live
let totalLength = 0;
for (const obj of objects) {
    totalLength += touchObject(obj);
}

gc();
