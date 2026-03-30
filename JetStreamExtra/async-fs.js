"use strict";

// --- JetStreamExtra/support/runtime.js ---

"use strict";

if (typeof read === "undefined" && typeof readFile === "function")
    globalThis.read = readFile;

const JetStreamExtra_originalRandom = Math.random;
const JetStreamExtra_originalPerformance = globalThis.performance;
const JetStreamExtra_originalNow =
    JetStreamExtra_originalPerformance && typeof JetStreamExtra_originalPerformance.now === "function"
        ? () => JetStreamExtra_originalPerformance.now()
        : () => Date.now();
const JetStreamExtra_marks = new Map();

const JetStreamExtra_deterministicRandom = (() => {
    const initialSeed = 49734321;
    let seed = initialSeed;

    const deterministicRandom = () => {
        seed = ((seed + 0x7ed55d16) + (seed << 12)) & 0xffff_ffff;
        seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffff_ffff;
        seed = ((seed + 0x165667b1) + (seed << 5)) & 0xffff_ffff;
        seed = ((seed + 0xd3a2646c) ^ (seed << 9)) & 0xffff_ffff;
        seed = ((seed + 0xfd7046c5) + (seed << 3)) & 0xffff_ffff;
        seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffff_ffff;
        return (seed >>> 0) / 0x1_0000_0000;
    };

    deterministicRandom.__resetSeed = () => {
        seed = initialSeed;
    };

    return deterministicRandom;
})();

function JetStreamExtra_formatValue(value) {
    if (typeof value === "string")
        return value;
    if (value instanceof Error)
        return value.stack || value.message;
    try {
        return String(value);
    } catch {
        return "[unprintable value]";
    }
}

function JetStreamExtra_printToShell(printer, args) {
    if (typeof printer !== "function")
        return;
    printer(args.map(JetStreamExtra_formatValue).join(" "));
}

const JetStreamExtra_console = globalThis.console ? Object.assign({}, globalThis.console) : {};
JetStreamExtra_console.log ??= (...args) => JetStreamExtra_printToShell(globalThis.print, args);
JetStreamExtra_console.info ??= JetStreamExtra_console.log;
JetStreamExtra_console.warn ??= (...args) => JetStreamExtra_printToShell(globalThis.printErr || globalThis.print, args);
JetStreamExtra_console.error ??= (...args) => JetStreamExtra_printToShell(globalThis.printErr || globalThis.print, args);
JetStreamExtra_console.assert = (condition, ...args) => {
    if (condition)
        return;
    throw new Error(args.length ? args.map(JetStreamExtra_formatValue).join(" ") : "Assertion failed");
};
globalThis.console = JetStreamExtra_console;

globalThis.performance ??= {};
globalThis.performance.now ??= JetStreamExtra_originalNow;
globalThis.performance.timeOrigin ??= Date.now();
globalThis.performance.mark ??= function(name) {
    const startTime = this.now();
    JetStreamExtra_marks.set(name, startTime);
    return { name, entryType: "mark", startTime, duration: 0 };
};
globalThis.performance.measure ??= function(name, startMark) {
    const endTime = this.now();
    const startTime = startMark && JetStreamExtra_marks.has(startMark) ? JetStreamExtra_marks.get(startMark) : endTime;
    return { name, entryType: "measure", startTime, duration: endTime - startTime };
};

function JetStreamExtra_createElement(name, ownerDocument) {
    return {
        nodeName: String(name).toUpperCase(),
        ownerDocument,
        style: {},
        width: 0,
        height: 0,
        children: [],
        addEventListener() {},
        removeEventListener() {},
        setAttribute(attribute, value) {
            this[attribute] = value;
        },
        appendChild(child) {
            this.children.push(child);
            return child;
        },
        removeChild(child) {
            const index = this.children.indexOf(child);
            if (index >= 0)
                this.children.splice(index, 1);
            return child;
        },
        getContext() {
            return null;
        },
    };
}

const JetStreamExtra_document = globalThis.document || {};
JetStreamExtra_document.createElementNS ??= (_namespace, name) => JetStreamExtra_createElement(name, JetStreamExtra_document);
JetStreamExtra_document.createElement ??= (name) => JetStreamExtra_createElement(name, JetStreamExtra_document);
JetStreamExtra_document.addEventListener ??= function() {};
JetStreamExtra_document.removeEventListener ??= function() {};
JetStreamExtra_document.body ??= JetStreamExtra_createElement("body", JetStreamExtra_document);
JetStreamExtra_document.documentElement ??= JetStreamExtra_createElement("html", JetStreamExtra_document);
globalThis.document = JetStreamExtra_document;

globalThis.self ??= globalThis;
globalThis.window ??= globalThis;
globalThis.top ??= globalThis;
globalThis.requestAnimationFrame ??= function() {
    return 0;
};
globalThis.cancelAnimationFrame ??= function() {};

globalThis.JetStreamExtra_loadAll = function(paths) {
    if (typeof load !== "function")
        throw new Error("JetStreamExtra_loadAll requires a JavaScript shell with load().");
    for (const path of paths)
        load(path);
};

globalThis.JetStreamExtra_fail = function(error) {
    console.error(error);
    if (typeof quit === "function")
        quit(1);
    throw error;
};

globalThis.JetStreamExtra_run = async function({ BenchmarkCtor, iterations, deterministicRandom = false }) {
    Math.random = deterministicRandom ? JetStreamExtra_deterministicRandom : JetStreamExtra_originalRandom;

    const benchmark = new BenchmarkCtor();
    await benchmark.init?.();

    for (let iteration = 0; iteration < iterations; ++iteration) {
        await benchmark.prepareForNextIteration?.();
        if (deterministicRandom)
            Math.random.__resetSeed();
        await benchmark.runIteration(iteration);
    }

    await benchmark.validate?.(iterations);
};

// --- JetStreamExtra/generators/async-file-system.js ---

/*
 * Copyright (C) 2018-2023 Apple Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS ``AS IS''
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
*/

"use strict";

function computeIsLittleEndian() {
    let buf = new ArrayBuffer(4);
    let dv = new DataView(buf);
    dv.setUint32(0, 0x11223344, true);
    let view = new Uint8Array(buf);
    return view[0] === 0x44;
}

const isLittleEndian = computeIsLittleEndian();

async function *randomFileContents() {
    let counter = 1;
    while(true) {
        const numBytes = (((counter * 1192.18851371) | 0) % 2056);
        counter++;
        let result = new ArrayBuffer(numBytes);
        let view = new Uint8Array(result);
        for (let i = 0; i < numBytes; ++i)
            view[i] = (i + counter) % 256;
        yield new DataView(result);
    }
}


class File {
    constructor(dataView, permissions) {
        this._data = dataView;
    }

    get data() { return this._data; }

    set data(dataView) { this._data = dataView; }

    get byteLength() { return this._data.byteLength; }

    swapByteOrder() {
        let hash = 0x1a2b3c4d;
        for (let i = 0; i < Math.floor(this.data.byteLength / 8) * 8; i += 8) {
            const data = this.data.getFloat64(i, isLittleEndian);
            this.data.setFloat64(i, data, !isLittleEndian);
            hash ^= data | 0;
        }
        return hash;
    }
}

class Directory {
    constructor() {
        this.structure = new Map;
    }

    async addFile(name, file) {
        let entry = this.structure.get(name);
        if (entry !== undefined) {
            if (entry instanceof File)
                throw new Error("Can't replace file with file.");
            if (entry instanceof Directory)
                throw new Error("Can't replace a file with a new directory.");
            throw new Error("Should not reach this code");
        }

        this.structure.set(name, file);
        return file;
    }

    async addDirectory(name, directory = new Directory) {
        let entry = this.structure.get(name);
        if (entry !== undefined) {
            if (entry instanceof File)
                throw new Error("Can't replace file with directory.");
            if (entry instanceof Directory)
                throw new Error("Can't replace directory with new directory.");
            throw new Error("Should not reach this code");
        }

        this.structure.set(name, directory);
        return directory;
    }

    async* ls() {
        for (let [name, entry] of this.structure)
            yield { name, entry, isDirectory: entry instanceof Directory };
    }

    async* forEachFile() {
        for await (let item of this.ls()) {
            if (!item.isDirectory)
                yield item;
        }
    }

    async* forEachFileRecursively() {
        for await (let item of this.ls()) {
            if (item.isDirectory) {
                for await (let file of item.entry.forEachFileRecursively())
                    yield file;
            } else {
                yield item;
            }
        }
    }

    async* forEachDirectoryRecursively() {
        for await (let item of this.ls()) {
            if (!item.isDirectory)
                continue;

            for await (let dirItem of item.entry.forEachDirectoryRecursively())
                yield dirItem;

            yield item;
        }
    }

    async fileCount() {
        let count = 0;
        for await (let item of this.ls()) {
            if (!item.isDirectory)
                ++count;
        }

        return count;
    }

    async totalFileSize() {
        let size = 0;
        for await (const {entry: file} of this.forEachFileRecursively()) {
            size += file.byteLength;
        }
        return size;
    }

    async rm(name) {
        return this.structure.delete(name);
    }

    async visit(visitor) {
        visitor.visitDir(undefined, this);
        for await (const {name, entry, isDirectory} of this.ls()) {
            if (isDirectory)
                await entry.visit(visitor);
            else
                visitor.visitFile(name, entry);
        }
    }

}

const MAX_DIR_COUNT = 2500;
const MAX_FILE_COUNT = 800;

async function setupDirectory() {
    const fs = new Directory;
    let dirs = [fs];
    let counter = 0;
    for (let dir of dirs) {
        for (let i = 0; i < 15; ++i) {
            if (dirs.length <= MAX_DIR_COUNT) {
                dirs.push(await dir.addDirectory(`dir-${i}`));
            }
            counter++;
        }
    }

    let fileCounter = 0;
    for await (const fileContents of randomFileContents()) {
        const dirIndex = fileCounter * 107;
        const dir = dirs[dirIndex % dirs.length];
        await dir.addFile(`file-${fileCounter}`, new File(fileContents));
        fileCounter++
        if (fileCounter >= MAX_FILE_COUNT)
            break;
    }

    return fs;
}

class FSVisitor {
    visitFile(name, file) {
    }

    visitDir(name, dir) {
    }
}

class CountVisitor extends FSVisitor {
    fileCount = 0;
    dirCount = 0;

    visitFile() {
        this.fileCount++;
    }

    visitDir() {
        this.dirCount++;
    }
}

class CountDracula extends FSVisitor {
    bytes = 0;
    visitFile(name, file) {
        this.bytes += file.byteLength;
    }
}


class Benchmark {
    EXPECTED_FILE_COUNT = 739;

    totalFileCount = 0;
    totalDirCount = 0;
    lastFileHash = undefined;
    fs;

    async prepareForNextIteration() {
        this.fs = await setupDirectory();
    }

    async runIteration() {
        for await (let { entry: file } of this.fs.forEachFileRecursively()) {
            this.lastFileHash = file.swapByteOrder();
        }

        let bytesDeleted = 0;
        let counter = 0;
        for await (const { name, entry: dir } of this.fs.forEachDirectoryRecursively()) {
            const oldTotalSize = await dir.totalFileSize();
            if (await dir.fileCount() === 0)
                continue;
            counter++;
            if (counter % 13 !== 0)
                continue;
            for await (const { name } of dir.forEachFile()) {
                const result = await dir.rm(name);
                if (!result)
                    throw new Error("rm should have returned true");
            }
            const totalReducedSize = oldTotalSize - dir.totalFileSize();
            bytesDeleted += totalReducedSize;
        }
        if (bytesDeleted === 0)
            throw new Error("Did not delete any files");

        const countVisitor = new CountVisitor();
        await this.fs.visit(countVisitor);

        const countDracula = new CountDracula();
        await this.fs.visit(countDracula);

        let fileCount = 0;
        let fileBytes = 0;
        for await (const {entry: file} of this.fs.forEachFileRecursively()) {
            fileCount++
            fileBytes += file.byteLength;
        }
        this.totalFileCount += fileCount;

        let dirCount = 1;
        for await (let _ of this.fs.forEachDirectoryRecursively()) {
            dirCount++;
        }
        this.totalDirCount += dirCount;

        if (countVisitor.fileCount !== fileCount)
            throw new Error(`Invalid total file count ${countVisitor.fileCount}, expected ${fileCount}.`);
        if (countDracula.bytes !== fileBytes)
            throw new Error(`Invalid total file bytes ${countDracula.bytes}, expected ${fileBytes}.`);
        if (countVisitor.dirCount !== dirCount)
            throw new Error(`Invalid total dir count ${countVisitor.dirCount}, expected ${dirCount}.`);

    }

    validate(iterations) {
        const expectedFileCount = this.EXPECTED_FILE_COUNT * iterations;
        if (this.totalFileCount != expectedFileCount)
            throw new Error(`Invalid total file count ${this.totalFileCount}, expected ${expectedFileCount}.`);
        if (this.lastFileHash === undefined)
            throw new Error(`Invalid file hash: ${this.lastFileHash}`);
    }
}

JetStreamExtra_run({
    BenchmarkCtor: Benchmark,
    iterations: 9,
    deterministicRandom: true,
}).catch(JetStreamExtra_fail);
