const side = 64;
const length = side * side * side;
const values = new Array(length);

// Fill every index, but visit distant indices first. This temporarily makes the
// array sparse even though the final array is dense.
for (let x = 0; x < side; ++x) {
    for (let y = 0; y < side; ++y) {
        for (let z = 0; z < side; ++z) {
            const index = x + y * side + z * side * side;
            values[index] = index & 255;
        }
    }
}

for (let iteration = 0; iteration < 16; ++iteration) {
    for (let index = 0; index < length; ++index)
        values[index];
}
