// Array of Objects - Tests array scanning with many object references

function createObjectArray(size) {
    const arr = new Array(size);
    for (let i = 0; i < size; i++) {
        arr[i] = {
            index: i,
            data: i * 2,
            flag: i % 2 === 0
        };
    }
    return arr;
}

function sumArray(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        sum += arr[i].data;
    }
    return sum;
}

const arrays = [];
const arraySize = 800000;
const numArrays = 8;

for (let i = 0; i < numArrays; i++) {
    arrays.push(createObjectArray(arraySize));
}

let total = 0;
for (const arr of arrays) {
    total += sumArray(arr);
}

gc();
