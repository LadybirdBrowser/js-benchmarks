// Measures a realistic async data pipeline with dependent calls.
async function fetch(id) { return { id, data: id * 10 }; }
async function transform(record) { return { ...record, data: record.data + 1 }; }
async function validate(record) { return record.data > 0; }
async function save(record) { return record.id; }

async function processItem(id) {
    const raw = await fetch(id);
    const transformed = await transform(raw);
    const valid = await validate(transformed);
    if (valid) return await save(transformed);
    return -1;
}

async function run() {
    let sum = 0;
    for (let i = 0; i < 100_000; i++) {
        sum += await processItem(i);
    }
    return sum;
}

run();
