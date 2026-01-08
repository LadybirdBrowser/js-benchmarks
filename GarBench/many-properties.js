// Many Properties - Tests objects with large numbers of properties

function createPropertyHeavyObject(numProps) {
    const obj = {};
    for (let i = 0; i < numProps; i++) {
        obj['prop_' + i] = {
            value: i,
            nested: { a: i * 2, b: i * 3 }
        };
    }
    return obj;
}

function createDynamicPropertyObject(numProps) {
    const obj = {};
    for (let i = 0; i < numProps; i++) {
        const key = String.fromCharCode(65 + (i % 26)) + '_' + Math.floor(i / 26);
        obj[key] = { index: i, data: [i, i+1, i+2] };
    }
    return obj;
}

function sumProperties(obj) {
    let sum = 0;
    for (const key in obj) {
        if (obj[key].value !== undefined) {
            sum += obj[key].value;
        } else if (obj[key].index !== undefined) {
            sum += obj[key].index;
        }
    }
    return sum;
}

const objects = [];

for (let i = 0; i < 7000; i++) {
    objects.push(createPropertyHeavyObject(100));
}

for (let i = 0; i < 3500; i++) {
    objects.push(createDynamicPropertyObject(500));
}

for (let i = 0; i < 700; i++) {
    objects.push(createPropertyHeavyObject(1000));
}

let total = 0;
for (const obj of objects) {
    total += sumProperties(obj);
}

gc();
