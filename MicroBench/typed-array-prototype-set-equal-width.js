const source = new Uint8Array(16 * 1024 * 1024);
const target = new Int8Array(source.length);

source[0] = 0x80;
source[source.length - 1] = 0xff;

for (let iteration = 0; iteration < 16; ++iteration)
    target.set(source);

if (target[0] !== -128 || target[target.length - 1] !== -1)
    throw new Error("Unexpected result");
