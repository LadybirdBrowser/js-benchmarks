// Sparse Arrays - Tests handling of arrays with holes
// Creates large sparse arrays with objects at scattered indices

function createSparseArray(size, density) {
    const arr = new Array(size);
    const step = Math.floor(1 / density);
    for (let i = 0; i < size; i += step) {
        arr[i] = {
            index: i,
            data: new Array(5).fill(i)
        };
    }
    return arr;
}

function sumSparseArray(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== undefined) {
            sum += arr[i].index;
        }
    }
    return sum;
}

// Create various sparse arrays with different densities
const sparseArrays = [];

// Very sparse (1% density)
for (let i = 0; i < 10; i++) {
    sparseArrays.push(createSparseArray(2000000, 0.01));
}

// Medium sparse (10% density)
for (let i = 0; i < 10; i++) {
    sparseArrays.push(createSparseArray(1000000, 0.1));
}

// Light sparse (50% density)
for (let i = 0; i < 5; i++) {
    sparseArrays.push(createSparseArray(500000, 0.5));
}

// Sum all to keep them live
let total = 0;
for (const arr of sparseArrays) {
    total += sumSparseArray(arr);
}

gc();
