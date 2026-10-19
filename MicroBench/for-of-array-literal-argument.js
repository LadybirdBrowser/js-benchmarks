class Writer {
    constructor(size) {
        this.indices = new Uint16Array(size);
        this.position = 0;
        this.offset = 0;
    }

    writeIndices(list) {
        for (const index of list) this.indices[this.position++] = this.offset + index;
    }
}

function f() {
    const writer = new Writer(6144);
    for (let i = 0; i < 10_000_000; i++) {
        if (writer.position === 6144) writer.position = 0;
        writer.offset = (i & 1023) * 4;
        writer.writeIndices([0, 1, 2, 2, 1, 3]);
    }
}

f();
