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
// --- JetStreamExtra/support/compat.js ---

globalThis.navigator ??= { userAgent: "JetStreamExtra", hardwareConcurrency: 1 };
globalThis.window.navigator ??= globalThis.navigator;
globalThis.Element ??= class Element {};
globalThis.HTMLElement ??= class HTMLElement extends globalThis.Element {};
globalThis.SVGElement ??= class SVGElement extends globalThis.Element {};
globalThis.customElements ??= { get() { return undefined; } };
globalThis.MutationObserver ??= class MutationObserver {
    observe() {}
    disconnect() {}
};
globalThis.setTimeout ??= function() { return 0; };
globalThis.clearTimeout ??= function() {};
globalThis.Blob ??= class Blob {
    constructor(parts = [], options = {}) {
        this.parts = parts;
        this.type = options.type || "";
    }
};
globalThis.URL ??= {};
globalThis.URL.createObjectURL ??= function() { return ""; };
document.querySelector ??= function() { return null; };
document.querySelectorAll ??= function() { return []; };
// --- JetStreamExtra/RexBench/OfflineAssembler/registers.js ---

/*
 * Copyright (C) 2011-2017 Apple Inc. All rights reserved.
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
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. 
 */
"use strict";

const gprs =
    [
     "t0",
     "t1",
     "t2",
     "t3",
     "t4",
     "t5",
     "cfr",
     "a0",
     "a1",
     "a2",
     "a3",
     "r0",
     "r1",
     "sp",
     "lr",
     "pc",
     // 64-bit only registers:
     "csr0",
     "csr1",
     "csr2",
     "csr3",
     "csr4",
     "csr5",
     "csr6",
     "csr7",
     "csr8",
     "csr9"
    ]

const fprs =
    [
     "ft0",
     "ft1",
     "ft2",
     "ft3",
     "ft4",
     "ft5",
     "fa0",
     "fa1",
     "fa2",
     "fa3",
     "csfr0",
     "csfr1",
     "csfr2",
     "csfr3",
     "csfr4",
     "csfr5",
     "csfr6",
     "csfr7",
     "fr"
    ]

const registers = gprs.concat(fprs);

var gprPattern = new RegExp("^((" + gprs.join(")|(") + "))$");
var fprPattern = new RegExp("^((" + fprs.join(")|(") + "))$");

var registerPattern = new RegExp("^((" + registers.join(")|(") + "))$");

// --- JetStreamExtra/RexBench/OfflineAssembler/instructions.js ---

/*
 * Copyright (C) 2011-2017 Apple Inc. All rights reserved.
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
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. 
 */
"use strict";


// Interesting invariant, which we take advantage of: branching instructions
// always begin with "b", and no non-branching instructions begin with "b".
// Terminal instructions are "jmp" and "ret".

const macroInstructions =
    [
     "emit",
     "addi",
     "andi",
     "lshifti",
     "lshiftp",
     "lshiftq",
     "muli",
     "negi",
     "negp",
     "negq",
     "noti",
     "ori",
     "rshifti",
     "urshifti",
     "rshiftp",
     "urshiftp",
     "rshiftq",
     "urshiftq",
     "subi",
     "xori",
     "loadi",
     "loadis",
     "loadb",
     "loadbs",
     "loadh",
     "loadhs",
     "storei",
     "storeb",
     "loadd",
     "moved",
     "stored",
     "addd",
     "divd",
     "subd",
     "muld",
     "sqrtd",
     "ci2d",
     "fii2d", // usage: fii2d <gpr with least significant bits>, <gpr with most significant bits>, <fpr>
     "fd2ii", // usage: fd2ii <fpr>, <gpr with least significant bits>, <gpr with most significant bits>
     "fq2d",
     "fd2q",
     "bdeq",
     "bdneq",
     "bdgt",
     "bdgteq",
     "bdlt",
     "bdlteq",
     "bdequn",
     "bdnequn",
     "bdgtun",
     "bdgtequn",
     "bdltun",
     "bdltequn",
     "btd2i",
     "td2i",
     "bcd2i",
     "movdz",
     "pop",
     "push",
     "move",
     "sxi2q",
     "zxi2q",
     "nop",
     "bieq",
     "bineq",
     "bia",
     "biaeq",
     "bib",
     "bibeq",
     "bigt",
     "bigteq",
     "bilt",
     "bilteq",
     "bbeq",
     "bbneq",
     "bba",
     "bbaeq",
     "bbb",
     "bbbeq",
     "bbgt",
     "bbgteq",
     "bblt",
     "bblteq",
     "btis",
     "btiz",
     "btinz",
     "btbs",
     "btbz",
     "btbnz",
     "jmp",
     "baddio",
     "baddis",
     "baddiz",
     "baddinz",
     "bsubio",
     "bsubis",
     "bsubiz",
     "bsubinz",
     "bmulio",
     "bmulis",
     "bmuliz",
     "bmulinz",
     "borio",
     "boris",
     "boriz",
     "borinz",
     "break",
     "call",
     "ret",
     "cbeq",
     "cbneq",
     "cba",
     "cbaeq",
     "cbb",
     "cbbeq",
     "cbgt",
     "cbgteq",
     "cblt",
     "cblteq",
     "cieq",
     "cineq",
     "cia",
     "ciaeq",
     "cib",
     "cibeq",
     "cigt",
     "cigteq",
     "cilt",
     "cilteq",
     "tis",
     "tiz",
     "tinz",
     "tbs",
     "tbz",
     "tbnz",
     "tps",
     "tpz",
     "tpnz",
     "peek",
     "poke",
     "bpeq",
     "bpneq",
     "bpa",
     "bpaeq",
     "bpb",
     "bpbeq",
     "bpgt",
     "bpgteq",
     "bplt",
     "bplteq",
     "addp",
     "mulp",
     "andp",
     "orp",
     "subp",
     "xorp",
     "loadp",
     "cpeq",
     "cpneq",
     "cpa",
     "cpaeq",
     "cpb",
     "cpbeq",
     "cpgt",
     "cpgteq",
     "cplt",
     "cplteq",
     "storep",
     "btps",
     "btpz",
     "btpnz",
     "baddpo",
     "baddps",
     "baddpz",
     "baddpnz",
     "tqs",
     "tqz",
     "tqnz",
     "bqeq",
     "bqneq",
     "bqa",
     "bqaeq",
     "bqb",
     "bqbeq",
     "bqgt",
     "bqgteq",
     "bqlt",
     "bqlteq",
     "addq",
     "mulq",
     "andq",
     "orq",
     "subq",
     "xorq",
     "loadq",
     "cqeq",
     "cqneq",
     "cqa",
     "cqaeq",
     "cqb",
     "cqbeq",
     "cqgt",
     "cqgteq",
     "cqlt",
     "cqlteq",
     "storeq",
     "btqs",
     "btqz",
     "btqnz",
     "baddqo",
     "baddqs",
     "baddqz",
     "baddqnz",
     "bo",
     "bs",
     "bz",
     "bnz",
     "leai",
     "leap",
     "memfence"
    ];

const x86Instructions =
    [
     "cdqi",
     "idivi"
    ];

const armInstructions =
    [
     "clrbp",
     "mvlbl"
    ];

const arm64Instructions =
    [
     "pcrtoaddr",   // Address from PC relative offset - adr instruction
     "nopFixCortexA53Err835769" // nop on Cortex-A53 (nothing otherwise)
    ];

const riscInstructions =
    [
     "smulli",  // Multiply two 32-bit words and produce a 64-bit word
     "addis",   // Add integers and set a flag.
     "subis",   // Same, but for subtraction.
     "oris",    // Same, but for bitwise or.
     "addps"    // addis but for pointers.
    ];

const mipsInstructions =
    [
    "la",
    "movz",
    "movn",
    "setcallreg",
    "slt",
    "sltu",
    "pichdr"
    ];

const cxxInstructions =
    [
     "cloopCrash",              // no operands
     "cloopCallJSFunction",     // operands: callee
     "cloopCallNative",         // operands: callee
     "cloopCallSlowPath",       // operands: callTarget, currentFrame, currentPC
     "cloopCallSlowPathVoid",   // operands: callTarget, currentFrame, currentPC

     /* For debugging only:
      * Takes no operands but simply emits whatever follows in // comments as
      * a line of C++ code in the generated LLIntAssembly.h file. This can be
      * used to insert instrumentation into the interpreter loop to inspect
      * variables of interest. Do not leave these instructions in production
      * code.
      */
     "cloopDo",              // no operands
    ];

const instructions = macroInstructions.concat(x86Instructions, armInstructions, arm64Instructions, riscInstructions, mipsInstructions, cxxInstructions);

const instructionSet = new Set(instructions);

function isBranch(instruction)
{
    return /^b/.test(instruction);
}

function hasFallThrough(instruction)
{
    return instruction != "ret" && instruction != "jmp";
}

// --- JetStreamExtra/RexBench/OfflineAssembler/ast.js ---

/*
 * Copyright (C) 2016-2017 Apple Inc. All rights reserved.
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
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

/*
 * Base utility types for the AST.
 *
 * Valid methods for Node:
 *
 * node.children -> Returns an array of immediate children.  It has been modified 
 *     from the original Ruby version to dump directly nearly the original source.
 *
 * node.descendents -> Returns an array of all strict descendants (children
 *     and children of children, transitively).
 *
 */

class Node
{
    constructor(codeOrigin)
    {
        this._codeOrigin = codeOrigin;
    }

    get codeOriginString()
    {
        return this._codeOrigin.toString();
    }

    get codeOrigin()
    {
        return this._codeOrigin;
    }
}

class NoChildren extends Node
{
    constructor(codeOrigin)
    {
        super(codeOrigin);
    }

    children()
    {
        return [];
    }
}

function structOffsetKey(struct, field)
{
    return struct + "::" + field;
}

// AST nodes.

class StructOffset extends NoChildren
{
    constructor(codeOrigin, struct, field)
    {
        super(codeOrigin);
        this._struct = struct;
        this._field = field;
    }

    static forField(codeOrigin, struct, field)
    {
        let key = structOffsetKey(struct, field);

        if (!this.mapping[key])
            this.mapping[key] = new StructOffset(codeOrigin, struct, field);

        return this.mapping[key];
    }

    static resetMappings()
    {
        this.mapping = {};
    }

    dump()
    {
        return this.struct + "::" + this.field;
    }

    compare(other)
    {
        if (this.struct != other.struct)
            return this.struct.localeCompare(other.struct);

        return this.field.localeCompare(other.field);
    }

    get struct()
    {
        return this._struct;
    }

    get field()
    {
        return this._field;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return true;
    }

    get isRegister()
    {
        return false;
    }
}

StructOffset.mapping = {};

class Sizeof extends NoChildren
{
    constructor(codeOrigin, struct)
    {
        super(codeOrigin);
        this._struct = struct;
    }

    static forName(codeOrigin, struct)
    {
        if (!this.mapping[struct])
            this.mapping[struct] = new Sizeof(codeOrigin, struct);

        return this.mapping[struct];
    }

    static resetMappings()
    {
        this.mapping = {};
    }

    dump()
    {
        return "sizeof " + this.struct;
    }

    compare(other)
    {
        return this.struct.localeCompare(other.struct);
    }

    get struct()
    {
        return this._struct;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return true;
    }

    get isRegister()
    {
        return false;
    }
}

Sizeof.mapping = {};

class Immediate extends NoChildren
{
    constructor(codeOrigin, value)
    {
        super(codeOrigin);
        if (value instanceof Number)
            value = value.valueOf();
        this._value = value;
        if (typeof(value) != "number")
            throw "Bad immediate value " + value.inspect() + " at " + this.codeOriginString();
    }

    dump()
    {
        return this.value.toString();
    }

    equals(other)
    {
        return other instanceof Immediate && other.value == this.value;
    }

    get value()
    {
        return this._value;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return true;
    }

    get isImmediateOperand()
    {
        return true;
    }

    get isRegister()
    {
        return false;
    }
}

class AddImmediates extends Node
{
    constructor(codeOrigin, left, right)
    {
        super(codeOrigin);
        this._left = left;
        this._right = right;
    }

    children()
    {
        return [this.left, this.right];
    }

    dump()
    {
        return "(" + this.left.dump() + " + " + this.right.dump() + ")";
    }

    value()
    {
        return (this.left.value() + this.right.value()).toString();
    }

    get left()
    {
        return this._left;
    }

    get right()
    {
        return this._right;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return true;
    }

    get isImmediateOperand()
    {
        return true;
    }

    get isRegister()
    {
        return false;
    }
}

class SubImmediates extends Node
{
    constructor(codeOrigin, left, right)
    {
        super(codeOrigin);
        this._left = left;
        this._right = right;
    }

    children()
    {
        return [this.left, this.right];
    }

    dump()
    {
        return "(" + this.left.dump() + " - " + this.right.dump() + ")";
    }

    value()
    {
        return (this.left.value() - this.right.value()).toString();
    }

    get left()
    {
        return this._left;
    }

    get right()
    {
        return this._right;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return true;
    }

    get isImmediateOperand()
    {
        return true;
    }

    get isRegister()
    {
        return false;
    }
}

class MulImmediates extends Node
{
    constructor(codeOrigin, left, right)
    {
        super(codeOrigin);
        this._left = left;
        this._right = right;
    }

    children()
    {
        return [this.left, this.right];
    }

    dump()
    {
        return "(" + this.left.dump() + " * " + this.right.dump() + ")";
    }

    get left()
    {
        return this._left;
    }

    get right()
    {
        return this._right;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return true;
    }

    get isImmediateOperand()
    {
        return false;
    }

    get isRegister()
    {
        return false;
    }
}

class NegImmediate extends Node
{
    constructor(codeOrigin, child)
    {
        super(codeOrigin);
        this._child = child;
    }

    children()
    {
        return [this.child];
    }

    dump()
    {
        return "(-" + this.child.dump() + ")";
    }

    get child()
    {
        return this._child;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return true;
    }

    get isImmediateOperand()
    {
        return false;
    }

    get isRegister()
    {
        return false;
    }
}

class OrImmediates extends Node
{
    constructor(codeOrigin, left, right)
    {
        super(codeOrigin);
        this._left = left;
        this._right = right;
    }

    children()
    {
        return [this.left, this.right];
    }

    dump()
    {
        return "(" + this.left.dump() + " | " + this.right.dump() + ")";
    }

    get left()
    {
        return this._left;
    }

    get right()
    {
        return this._right;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return true;
    }

    get isImmediateOperand()
    {
        return false;
    }

    get isRegister()
    {
        return false;
    }
}

class AndImmediates extends Node
{
    constructor(codeOrigin, left, right)
    {
        super(codeOrigin);
        this._left = left;
        this._right = right;
    }

    children()
    {
        return [this.left, this.right];
    }

    dump()
    {
        return "(" + this.left.dump() + " & " + this.right.dump() + ")";
    }

    get left()
    {
        return this._left;
    }

    get right()
    {
        return this._right;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return true;
    }

    get isImmediateOperand()
    {
        return false;
    }

    get isRegister()
    {
        return false;
    }
}

class XorImmediates extends Node
{
    constructor(codeOrigin, left, right)
    {
        super(codeOrigin);
        this._left = left;
        this._right = right;
    }

    children()
    {
        return [this.left, this.right];
    }

    dump()
    {
        return "(" + this.left.dump() + " ^ " + this.right.dump() + ")";
    }

    get left()
    {
        return this._left;
    }

    get right()
    {
        return this._right;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return true;
    }

    get isImmediateOperand()
    {
        return false;
    }

    get isRegister()
    {
        return false;
    }
}

class BitnotImmediate extends Node
{
    constructor(codeOrigin, child)
    {
        super(codeOrigin);
        this._child = child;
    }

    children()
    {
        return [this.child];
    }

    dump()
    {
        return "(~" + this.child.dump() + ")";
    }

    get child()
    {
        return this._child;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return true;
    }

    get isImmediateOperand()
    {
        return false;
    }

    get isRegister()
    {
        return false;
    }
}

class StringLiteral extends NoChildren
{
    constructor(codeOrigin, value)
    {
        super(codeOrigin);
        if (!value instanceof String || value[0] != "\"" || value.slice(-1) != "\"")
            throw "Bad string literal " + value.inspect() + " at " + this.codeOriginString();
        this._value = value.slice(1, -1);
    }

    dump()
    {
        return "\"" + this.value + "\"";
    }

    equals(other)
    {
        return other instanceof StringLiteral && other.value == this.value;
    }

    get value()
    {
        return this._value;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return false;
    }

    get isImmediateOperand()
    {
        return false;
    }

    get isRegister()
    {
        return false;
    }
}

class RegisterID extends NoChildren
{
    constructor(codeOrigin, name)
    {
        super(codeOrigin);
        this._name = name;
    }

    static forName(codeOrigin, name)
    {
        if (!this.mapping[name])
            this.mapping[name] = new RegisterID(codeOrigin, name);

        return this.mapping[name];
    }

    dump()
    {
        return this.name;
    }

    get name()
    {
        return this._name;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return false;
    }

    get isRegister()
    {
        return true;
    }
}

RegisterID.mapping = {};

class FPRegisterID extends NoChildren
{
    constructor(codeOrigin, name)
    {
        super(codeOrigin);
        this._name = name;
    }

    static forName(codeOrigin, name)
    {
        if (!this.mapping[name])
            this.mapping[name] = new FPRegisterID(codeOrigin, name);

        return this.mapping[name];
    }

    dump()
    {
        return this.name;
    }

    get name()
    {
        return this._name;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return false;
    }

    get isImmediateOperand()
    {
        return false;
    }

    get isRegister()
    {
        return true;
    }
}

FPRegisterID.mapping = {};

class SpecialRegister extends NoChildren
{
    constructor(name)
    {
        this._name = name;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return false;
    }

    get isImmediateOperand()
    {
        return false;
    }

    get isRegister()
    {
        return true;
    }
}

class Variable extends NoChildren
{
    constructor(codeOrigin, name)
    {
        super(codeOrigin);
        this._name = name;
    }

    static forName(codeOrigin, name)
    {
        if (!this.mapping[name])
            this.mapping[name] = new Variable(codeOrigin, name);

        return this.mapping[name];
    }

    dump()
    {
        return this.name;
    }

    get name()
    {
        return this._name;
    }

    inspect()
    {
        return "<variable " + this.name + " at " + this.codeOriginString();
    }
}

Variable.mapping = {};

class Address extends Node
{
    constructor(codeOrigin, base, offset)
    {
        super(codeOrigin);
        this._base = base;
        this._offset = offset;
        if (!base instanceof Variable && !base.register)
            throw "Bad base for address " + base.inspect() + " at " + this.codeOriginString();
        if (!offset instanceof Variable && !offset.immediate())
            throw "Bad offset for address " + offset.inspect() + " at " + this.codeOriginString();
    }

    withOffset(extraOffset)
    {
        return new Address(this.codeOrigin, this.base, new Immediate(this.codeOrigin, this.offset.value + extraOffset));
    }

    children()
    {
        return [this.base, this.offset];
    }

    dump()
    {
        return this.offset.dump() + "[" + this.base.dump() + "]";
    }

    get base()
    {
        return this._base;
    }

    get offset()
    {
        return this._offset;
    }

    get isAddress()
    {
        return true;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return false;
    }

    get isImmediateOperand()
    {
        return true;
    }

    get isRegister()
    {
        return false;
    }
}

class BaseIndex extends Node
{
    constructor(codeOrigin, base, index, scale, offset)
    {
        super(codeOrigin);
        this._base = base;
        this._index = index;
        this._scale = scale;
        if (![1, 2, 4, 8].includes(this._scale))
            throw "Bad scale " + this._scale + " at " + this.codeOriginString();
        this._offset = offset;
    }

    scaleShift()
    {
        switch(this.scale)
        {
        case 1:
            return 0;
        case 2:
            return 1;
        case 4:
            return 2;
        case 8:
            return 3;
        default:
            throw "Bad scale " + this.scale + " at " + this.codeOriginString();
        }
    }

    withOffset(extraOffset)
    {
        return new BaseIndex(codeOrigin, this.base, this.index, this.scale, new Immediate(codeOrigin, this.offset.value + extraOffset));
    }

    children()
    {
        return [this.base, this.index, this.offset];
    }

    dump()
    {
        return this.offset.dump() + "[" + this.base.dump() + ", " + this.index.dump() + ", " + this.scale + "]";
    }

    get base()
    {
        return this._base;
    }

    get index()
    {
        return this._index;
    }

    get scale()
    {
        return this._scale;
    }

    get offset()
    {
        return this._offset;
    }

    get isAddress()
    {
        return true;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return false;
    }

    get isImmediateOperand()
    {
        return false;
    }

    get isRegister()
    {
        return false;
    }
}

class AbsoluteAddress extends NoChildren
{
    constructor(codeOrigin, address)
    {
        super(codeOrigin);
        this._address = address;
    }

    withOffset(extraOffset)
    {
        return new AbsoluteAddress(codeOrigin, new Immediate(codeOrigin, this.address.value + extraOffset));
    }

    dump()
    {
        return this.address.dump() + "[]";
    }

    get address()
    {
        return this._address;
    }

    get isAddress()
    {
        return true;
    }

    get isLabel()
    {
        return false;
    }

    get isImmediate()
    {
        return false;
    }

    get isImmediateOperand()
    {
        return true;
    }

    get isRegister()
    {
        return false;
    }
}

class Instruction extends Node
{
    constructor(codeOrigin, opcode, operands, annotation=nil)
    {
        super(codeOrigin);
        this._opcode = opcode;
        this._operands = operands;
        this._annotation = annotation;
    }

    children()
    {
        return [];
    }

    dump()
    {
        return "    " + this.opcode + " " + (this.operands.map(function(v) { return v.dump(); }).join(", "));
    }

    get opcode()
    {
        return this._opcode;
    }

    get operands()
    {
        return this._operands;
    }

    get annotation()
    {
        return this._annotation;
    }
}

class Error extends NoChildren
{
    constructor(codeOrigin)
    {
        super(codeOrigin);
    }

    dump()
    {
        return "    error";
    }
}

class ConstExpr extends  NoChildren
{
    constructor(codeOrigin, value)
    {
        super(codeOrigin);
        this._value = value;
    }

    static forName(codeOrigin, text)
    {
        if (!this.mapping[text])
            this.mapping[text] = new ConstExpr(codeOrigin, text);

        return this.mapping[text];
    }

    static resetMappings()
    {
        this.mapping = {};
    }

    dump()
    {
        return "constexpr (" + this.value + ")";
    }

    compare(other)
    {
        return this.value(other.value);
    }

    isImmediate()
    {
        return true;
    }

    get variable()
    {
        return this._variable;
    }

    get value()
    {
        return this._value;
    }
}

ConstExpr.mapping = {};


class ConstDecl extends Node
{
    constructor(codeOrigin, variable, value)
    {
        super(codeOrigin);
        this._variable = variable;
        this._value = value;
    }

    children()
    {
        return [this.variable, this.value];
    }

    dump()
    {
        return "const " + this.variable.dump() + " = " + this.value.dump();
    }

    get variable()
    {
        return this._variable;
    }

    get value()
    {
        return this._value;
    }
}

let _labelMapping = {};
let _referencedExternLabels = [];

class Label extends NoChildren
{
    constructor(codeOrigin, name)
    {
        super(codeOrigin);
        this._name = name;
        this._extern = true;
        this._global = false;
    }

    static forName(codeOrigin, name, definedInFile)
    {
        if (_labelMapping[name]) {
            if (!_labelMapping[name] instanceof Label)
                throw "Label name collision: " + name;
        } else
            _labelMapping[name] = new Label(codeOrigin, name);

        if (definedInFile)
            _labelMapping[name].clearExtern();

        return _labelMapping[name];
    }

    static setAsGlobal(codeOrigin, name)
    {
        if (_labelMapping[name]) {
            let label = _labelMapping[name];
            if (label.isGlobal())
                throw "Label: " + name + " declared global multiple times";
            label.setGlobal();
        } else {
            let newLabel = new Label(codeOrigin, name);
            newLabel.setGlobal();
            _labelMapping[name] = newLabel;
        }
    }

    static resetMappings()
    {
        _labelMapping = {};
        _referencedExternLabels = [];
    }


    static resetReferenced()
    {
        _referencedExternLabels = [];
    }

    clearExtern()
    {
        this._extern = false;
    }

    isExtern()
    {
        return this._extern;
    }

    setGlobal()
    {
        this._global = true;
    }

    isGlobal()
    {
        return this._global;
    }

    dump()
    {
        return this.name + ":";
    }

    get name()
    {
        return this._name;
    }
}

class LocalLabel extends NoChildren
{
    constructor(codeOrigin, name)
    {
        super(codeOrigin);
        this._name = name;
    }

    static forName(codeOrigin, name)
    {
        if (_labelMapping[name]) {
            if (!_labelMapping[name] instanceof LocalLabel)
                throw "Label name collision: " + name;
        } else
            _labelMapping[name] = new LocalLabel(codeOrigin, name);

        return _labelMapping[name];
    }

    static unique(comment)
    {
        let newName = "_" + comment;
        if (_labelMapping[newName]) {
            while (_labelMapping[newName = "_#" + this.uniqueNameCounter + "_" + comment])
                this.uniqueNameCounter++;
        }

        return forName(undefined, newName);
    }

    static resetMappings()
    {
        this.uniquNameCounter = 0;
    }

    cleanName()
    {
        if (/^\./.test(this._name))
            return "_" + this._name.slice(1);

        return this._name;
    }

    isGlobal()
    {
        return false;
    }

    dump()
    {
        return this.name + ":";
    }

    get name()
    {
        return this._name;
    }
}

LocalLabel.uniqueNameCounter = 0;


class LabelReference extends Node
{
    constructor(codeOrigin, label)
    {
        super(codeOrigin);
        this._label = label;
    }

    children()
    {
        return [this.label];
    }

    name()
    {
        return this.label.name;
    }

    isExtern()
    {
        return _labelMapping[name] instanceof Label && _labelMapping[name].isExtern();
    }

    used()
    {
        if (!_referencedExternLabels.include(this._label) && this.isExtern())
            _referencedExternLabels.push(this._label);
    }

    dump()
    {
        return this.label.name;
    }

    value()
    {
        return asmLabel();
    }

    get label()
    {
        return this._label;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return true;
    }

    get isImmediate()
    {
        return false;
    }

    get isImmediateOperand()
    {
        return true;
    }
}

class LocalLabelReference extends NoChildren
{
    constructor(codeOrigin, label)
    {
        super(codeOrigin);
        this._label = label;
    }

    children()
    {
        return [this._label];
    }

    name()
    {
        return this.label.name;
    }

    dump()
    {
        return this.label.name;
    }

    value()
    {
        return asmLabel();
    }

    get label()
    {
        return this._label;
    }

    get isAddress()
    {
        return false;
    }

    get isLabel()
    {
        return true;
    }

    get isImmediate()
    {
        return false;
    }

    get isImmediateOperand()
    {
        return true;
    }
}

class Sequence extends Node
{
    constructor(codeOrigin, list)
    {
        super(codeOrigin);
        this._list = list;
    }

    children()
    {
        return this.list;
    }

    dump()
    {
        return "" + this.list.map(function(v) { return v.dump()}).join("\n");
    }

    get list()
    {
        return this._list;
    }
}

class True extends NoChildren
{
    constructor()
    {
        super(undefined);
    }

    static instance()
    {
        return True.instance;
    }

    value()
    {
        return true;
    }

    dump()
    {
        return "true";
    }
}

True.instance = new True();

class False extends NoChildren
{
    constructor()
    {
        super(undefined);
    }

    static instance()
    {
        return False.instance;
    }

    value()
    {
        return false;
    }

    dump()
    {
        return "false";
    }
}

False.instance = new False();

class Setting extends NoChildren
{
    constructor(codeOrigin, name)
    {
        super(codeOrigin);
        this._name = name;
    }

    static forName(codeOrigin, name)
    {
        if (!this.mapping[name])
            this.mapping[name] = new Setting(codeOrigin, name);

        return this.mapping[name];
    }

    static resetMappings()
    {
        this.mapping = {};
    }

    dump()
    {
        return this.name;
    }

    get name()
    {
        return this._name;
    }
}

Setting.mapping = {};

class And extends Node
{
    constructor(codeOrigin, left, right)
    {
        super(codeOrigin);
        this._left = left;
        this._right = right;
    }

    children()
    {
        return [this.left, this.right];
    }

    dump()
    {
        return "(" + this.left.dump() + " and " + this.right.dump() + ")";
    }

    get left()
    {
        return this._left;
    }

    get right()
    {
        return this._right;
    }
}

class Or extends Node
{
    constructor(codeOrigin, left, right)
    {
        super(codeOrigin);
        this._left = left;
        this._right = right;
    }

    children()
    {
        return [this.left, this.right];
    }

    dump()
    {
        return "(" + this.left.dump() + " or " + this.right.dump() + ")";
    }

    get left()
    {
        return this._left;
    }

    get right()
    {
        return this._right;
    }
}

class Not extends Node
{
    constructor(codeOrigin, child)
    {
        super(codeOrigin);
        this._child = child;
    }

    children()
    {
        return [this.child];
    }

    dump()
    {
        return "(not" + this.child.dump() + ")";
    }

    get child()
    {
        return this._child;
    }
}

class Skip extends NoChildren
{
    constructor(codeOrigin)
    {
        super(codeOrigin);
    }

    dump()
    {
        return "    skip";
    }
}

class IfThenElse extends Node
{
    constructor(codeOrigin, predicate, thenCase)
    {
        super(codeOrigin);
        this._predicate = predicate;
        this._thenCase = thenCase;
        this._elseCase = new Skip(codeOrigin);
    }

    children()
    {
        return [];
    }

    dump()
    {
        return "if " + this.predicate.dump() + "\n" + this.thenCase.dump() + "\nelse\n" + this.elseCase.dump() + "\nend";
    }

    get predicate()
    {
        return this._predicate;
    }

    get thenCase()
    {
        return this._thenCase;
    }

    get elseCase()
    {
        return this._elseCase;
    }

    set elseCase(newElseCase)
    {
        this._elseCase = newElseCase;
    }
}

class Macro extends Node
{
    constructor(codeOrigin, name, variables, body)
    {
        super(codeOrigin);
        this._name = name;
        this._variables = variables;
        this._body = body;
    }

    children()
    {
        return [];
    }

    dump()
    {
        return "macro " + this.name + "(" + this.variables.map(function(v) { return v.dump()}).join(", ") + ")\n" + this.body.dump() + "\nend";
    }

    get name()
    {
        return this._name;
    }

    get variables()
    {
        return this._variables;
    }

    get body()
    {
        return this._body;
    }
}

class MacroCall extends Node
{
    constructor(codeOrigin, name, operands, annotation)
    {
        super(codeOrigin);
        this._name = name;
        this._operands = operands;
        if (!this._operands)
            throw "Operands empty to Macro call " + name;
        this._annotation = annotation;
    }

    children()
    {
        return [];
    }

    dump()
    {
        return "    " + this.name + "(" + this.operands.map(function(v) { return v.dump() }).join(", ") + ")";
    }

    get name()
    {
        return this._name;
    }

    get operands()
    {
        return this._operands;
    }

    get annotation()
    {
        return this._annotation;
    }
}

function resetAST()
{
    StructOffset.resetMappings();
    Sizeof.resetMappings();
    ConstExpr.resetMappings();
    Label.resetMappings();
    LocalLabel.resetMappings();
    Setting.resetMappings();
}

// --- JetStreamExtra/RexBench/OfflineAssembler/parser.js ---

/*
 * Copyright (C) 2017 Apple Inc. All rights reserved.
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
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. 
 */

"use strict";

const GlobalAnnotation = "global";
const LocalAnnotation = "local";

class SourceFile
{
    constructor(fileName)
    {
        this._fileName = fileName;
        let fileNumber = SourceFile.fileNames.indexOf(fileName);
        if (fileNumber == -1) {
            SourceFile.fileNames.push(fileName);
            fileNumber = SourceFile.fileNames.length;
        } else
            fileNumber++; // File numbers are 1 based

        this._fileNumber = fileNumber;
    }

    get name()
    {
        return this._fileName;
    }

    get fileNumber()
    {
        return this._fileNumber;
    }
}

SourceFile.fileNames = [];

class CodeOrigin
{
    constructor(sourceFile, lineNumber)
    {
        this._sourceFile = sourceFile;
        this._lineNumber = lineNumber;
    }

    fileName()
    {
        return this._sourceFile.name;
    }

    debugDirective()
    {
        return emitWinAsm ? undefined : "\".loc " + this._sourceFile.fileNumber + " " + this._lineNumber + "\\n\"";
    }

    toString()
    {
        return this.fileName() + ":" + this._lineNumber;
    }

    get lineNumber()
    {
        return this._lineNumber;
    }
}

class IncludeFile
{
    constructor(moduleName, defaultDir)
    {
        this._fileName = moduleName + ".asm";
    }

    toString()
    {
        return fileName;
    }

    get fileName()
    {
        return this._fileName;
    }
}

IncludeFile.includeDirs = [];


class Token
{
    constructor(codeOrigin, string)
    {
        this._codeOrigin = codeOrigin;
        this._string = string;
    }

    isEqualTo(other)
    {
        if (other instanceof Token)
            return this.string === other.string;

        return this.string === other;
    }

    isNotEqualTo(other)
    {
        return !this.isEqualTo(other);
    }

    get string()
    {
        return this._string;
    }

    get codeOrigin()
    {
        return this._codeOrigin;
    }

    toString()
    {
        return "" + this._string + "\" at " + this._codeOrigin;
    }

    parseError(comment)
    {
        if (!comment || !comment.length)
            throw "Parse error: " + this;

        throw "Parse error: " + this + ": " + comment;
    }
}

class Annotation
{
    constructor(codeOrigin, type, string)
    {
        this.codeOrigin = codeOrigin;
        this.type = type;
        this.string = string;
    }

    get codeOrigin()
    {
        return this.codeOrigin;
    }

    get type()
    {
        return this.type;
    }

    get string()
    {
        return this.string;
    }
}


// The lexer. Takes a string and returns an array of tokens.

function lex(str, file)
{
    function scanRegExp(source, regexp)
    {
        return source.match(regexp);
    }

    let result = [];
    let lineNumber = 1;
    let annotation = null;
    let annotationType;
    let whitespaceFound = false;

    while (str.length)
    {
        let tokenMatch;
        let annotation;
        let annotationType;

        if (tokenMatch = scanRegExp(str, /^#([^\n]*)/))
            ; // comment, ignore
        else if (tokenMatch = scanRegExp(str, /^\/\/\ ?([^\n]*)/)) {
            // annotation
            annotation = tokenMatch[0];
            annotationType = whitespaceFound ? LocalAnnotation : GlobalAnnotation;
        } else if (tokenMatch = scanRegExp(str, /^\n/)) {
            /* We've found a '\n'.  Emit the last comment recorded if appropriate:
             * We need to parse annotations regardless of whether the backend does
             * anything with them or not. This is because the C++ backend may make
             * use of this for its cloopDo debugging utility even if
             * enableInstrAnnotations is not enabled.
             */
            if (annotation) {
                result.push(new Annotation(new CodeOrigin(file, lineNumber),
                                           annotationType, annotation));
                annotation = null;
            }
            result.push(new Token(new CodeOrigin(file, lineNumber), tokenMatch[0]));
            lineNumber++;
        } else if (tokenMatch = scanRegExp(str, /^[a-zA-Z]([a-zA-Z0-9_.]*)/))
            result.push(new Token(new CodeOrigin(file, lineNumber), tokenMatch[0]));
        else if (tokenMatch = scanRegExp(str, /^\.([a-zA-Z0-9_]*)/))
            result.push(new Token(new CodeOrigin(file, lineNumber), tokenMatch[0]));
        else if (tokenMatch = scanRegExp(str, /^_([a-zA-Z0-9_]*)/))
            result.push(new Token(new CodeOrigin(file, lineNumber), tokenMatch[0]));
        else if (tokenMatch = scanRegExp(str, /^([ \t]+)/)) {
            // whitespace, ignore
            whitespaceFound = true;
            str = str.slice(tokenMatch[0].length);
            continue;
        } else if (tokenMatch = scanRegExp(str, /^0x([0-9a-fA-F]+)/))
            result.push(new Token(new CodeOrigin(file, lineNumber), Number.parseInt(tokenMatch[1], 16)));
        else if (tokenMatch = scanRegExp(str, /^0([0-7]+)/))
            result.push(new Token(new CodeOrigin(file, lineNumber), Number.parseInt(tokenMatch[1], 8)));
        else if (tokenMatch = scanRegExp(str, /^([0-9]+)/))
            result.push(new Token(new CodeOrigin(file, lineNumber), tokenMatch[0]));
        else if (tokenMatch = scanRegExp(str,  /^::/))
            result.push(new Token(new CodeOrigin(file, lineNumber), tokenMatch[0]));
        else if (tokenMatch = scanRegExp(str, /^[:,\(\)\[\]=\+\-~\|&^*]/))
            result.push(new Token(new CodeOrigin(file, lineNumber), tokenMatch[0]));
        else if (tokenMatch = scanRegExp(str, /^\".*\"/))
            result.push(new Token(new CodeOrigin(file, lineNumber), tokenMatch[0]));
        else
            throw "Lexer error at " + (new CodeOrigin(file, lineNumber)) + ", unexpected sequence " + str.slice(0, 20);

        whitespaceFound = false;
        str = str.slice(tokenMatch[0].length);
    }

    return result;
}

// Token identification.

function isRegister(token)
{
    registerPattern.test(token.string);
}

function isInstruction(token)
{
    return instructionSet.has(token.string);
}

function isKeyword(token)
{
    return /^((true)|(false)|(if)|(then)|(else)|(elsif)|(end)|(and)|(or)|(not)|(global)|(macro)|(const)|(constexpr)|(sizeof)|(error)|(include))$/.test(token.string)
        || isRegister(token)
        || isInstruction(token);
}

function isIdentifier(token)
{
    return /^[a-zA-Z]([a-zA-Z0-9_.]*)$/.test(token.string) && !isKeyword(token);
}

function isLabel(token)
{
    let tokenString;
    if (token instanceof Token)
        tokenString = token.string;
    else
        tokenString = token;

    return /^_([a-zA-Z0-9_]*)$/.test(tokenString);
}

function isLocalLabel(token)
{
    let tokenString;
    if (token instanceof Token)
        tokenString = token.string;
    else
        tokenString = token;

    return /^\.([a-zA-Z0-9_]*)$/.test(tokenString);
}

function isVariable(token)
{
    return isIdentifier(token) || isRegister(token);
}

function isInteger(token)
{
    return /^[0-9]/.test(token.string);
}

function isString(token)
{
    return /^".*"/.test(token.string);
}


// The parser. Takes an array of tokens and returns an AST. Methods
// other than parse(tokens) are not for public consumption.

class Parser
{
    constructor(data, fileName)
    {
        this.tokens = lex(data, fileName);
        this.idx = 0;
        this.annotation = null;
    }

    parseError(comment)
    {
        if (this.tokens[this.idx])
            this.tokens[this.idx].parseError(comment);
        else {
            if (!comment.length)
                throw "Parse error at end of file";

            throw "Parse error at end of file: " + comment;
        }
    }

    consume(regexp)
    {
        if (regexp) {
            if (!regexp.test(this.tokens[this.idx].string))
                this.parseError();
        } else if (this.idx != this.tokens.length)
            this.parseError();

        this.idx++;
    }

    skipNewLine()
    {
        while (this.tokens[this.idx].isEqualTo("\n"))
            this.idx++;
    }

    parsePredicateAtom()
    {
        if (this.tokens[this.idx].isEqualTo("not")) {
            let codeOrigin = this.tokens[this.idx].codeOrigin;
            this.idx++;
            return new Not(codeOrigin, this.parsePredicateAtom());
        }
        if (this.tokens[this.idx].isEqualTo("(")) {
            this.idx++;
            skipNewLine();
            let result = this.parsePredicate();
            if (this.tokens[this.idx].isNotEqualTo(")"))
                parseError();
            this.idx++;
            return result;
        }
        if (this.tokens[this.idx].isEqualTo("true")) {
            let result = True.instance();
            this.idx++;
            return result;
        }
        if (this.tokens[this.idx].isEqualTo("false")) {
            let result = False.instance();
            this.idx++;
            return result;
        }
        if (isIdentifier(this.tokens[this.idx])) {
            let result = Setting.forName(this.tokens[this.idx].codeOrigin, this.tokens[this.idx].string);
            this.idx++;
            return result;
        }

        this.parseError();
    }

    parsePredicateAnd()
    {
        let result = this.parsePredicateAtom();
        while (this.tokens[this.idx].isEqualTo("and")) {
            let codeOrigin = this.tokens[this.idx].codeOrigin;
            this.idx++;
            this.skipNewLine();
            let right = this.parsePredicateAtom();
            result = new And(codeOrigin, result, right);
        }

        return result;
    }

    parsePredicate()
    {
        // some examples of precedence:
        // not a and b -> (not a) and b
        // a and b or c -> (a and b) or c
        // a or b and c -> a or (b and c)

        let result = this.parsePredicateAnd();
        while (this.tokens[this.idx].isEqualTo("or")) {
            let codeOrigin = this.tokens[this.idx].codeOrigin;
            this.idx++;
            this.skipNewLine();
            let right = this.parsePredicateAnd();
            result = new Or(codeOrigin, result, right);
        }

        return result;
    }

    parseVariable()
    {
        let result;
        if (isRegister(this.tokens[this.idx])) {
            if (fprPattern.test(this.tokens[this.idx].string))
                result = FPRegisterID.forName(this.tokens[this.idx].codeOrigin, this.tokens[this.idx].string);
            else
                result = RegisterID.forName(this.tokens[this.idx].codeOrigin, this.tokens[this.idx].string);
        } else if (isIdentifier(this.tokens[this.idx]))
            result = Variable.forName(this.tokens[this.idx].codeOrigin, this.tokens[this.idx].string);
        else
            this.parseError();

        this.idx++;
        return result;
    }

    parseAddress(offset)
    {
        if (this.tokens[this.idx].isNotEqualTo("["))
            this.parseError();

        let codeOrigin = this.tokens[this.idx].codeOrigin;
        let result;

        // Three possibilities:
        // []       -> AbsoluteAddress
        // [a]      -> Address
        // [a,b]    -> BaseIndex with scale = 1
        // [a,b,c]  -> BaseIndex

        this.idx++;
        if (this.tokens[this.idx].isEqualTo("]")) {
            this.idx++;
            return new AbsoluteAddress(codeOrigin, offset);
        }
        let a = this.parseVariable();
        if (this.tokens[this.idx].isEqualTo("]"))
            result = new Address(codeOrigin, a, offset);
        else
        {
            if (this.tokens[this.idx].isNotEqualTo(","))
                this.parseError();
            this.idx++;
            let b = this.parseVariable();
            if (this.tokens[this.idx].isEqualTo("]"))
                result = new BaseIndex(codeOrigin, a, b, 1, offset);
            else {
                if (this.tokens[this.idx].isNotEqualTo(","))
                    this.parseError();
                this.idx++;
                if (!["1", "2", "4", "8"].includes(this.tokens[this.idx].string))
                    this.parseError();
                let c = Number.parseInt(this.tokens[this.idx]);
                this.idx++;
                if (this.tokens[this.idx].isNotEqualTo("]"))
                    this.parseError();
                result = new BaseIndex(codeOrigin, a, b, c, offset);
            }
        }
        this.idx++;
        return result;
    }

    parseColonColon()
    {
        this.skipNewLine();
        let firstToken = this.tokens[this.idx];
        let codeOrigin = this.tokens[this.idx].codeOrigin;
        if (!isIdentifier(this.tokens[this.idx]))
            this.parseError();
        let names = [this.tokens[this.idx].string];
        this.idx++;
        while (this.tokens[this.idx].isEqualTo("::")) {
            this.idx++;
            if (!isIdentifier(this.tokens[this.idx]))
                this.parseError();
            names.push(this.tokens[this.idx].string);
            this.idx++;
        }
        if (!names.length)
            firstToken.parseError();
        return { codeOrigin: codeOrigin, names: names };
    }

    parseTextInParens()
    {
        this.skipNewLine();
        let codeOrigin = this.tokens[this.idx].codeOrigin;
        if (this.tokens[this.idx].isNotEqualTo("("))
            throw "Missing \"(\" at " + codeOrigin;
        this.idx++;
        // need at least one item
        if (this.tokens[this.idx].isEqualTo(")"))
            throw "No items in list at " + codeOrigin;
        let numEnclosedParens = 0;
        let text = [];
        while (this.tokens[this.idx].isNotEqualTo(")") || numEnclosedParens > 0) {
            if (this.tokens[this.idx].isEqualTo("("))
                numEnclosedParens++;
            else if (this.tokens[this.idx].isEqualTo(")"))
                numEnclosedParens--;

            text.push(this.tokens[this.idx].string);
            this.idx++;
        }
        this.idx++;
        return { codeOrigin: codeOrigin, text: text };
    }

    parseExpressionAtom()
    {
        let result;
        this.skipNewLine();
        if (this.tokens[this.idx].isEqualTo("-")) {
            this.idx++;
            return new NegImmediate(this.tokens[this.idx - 1].codeOrigin, this.parseExpressionAtom());
        }
        if (this.tokens[this.idx].isEqualTo("~")) {
            this.idx++;
            return new BitnotImmediate(this.tokens[this.idx - 1].codeOrigin, this.parseExpressionAtom());
        }
        if (this.tokens[this.idx].isEqualTo("(")) {
            this.idx++;
            result = this.parseExpression();
            if (this.tokens[this.idx].isNotEqualTo(")"))
                this.parseError();
            this.idx++;
            return result;
        }
        if (isInteger(this.tokens[this.idx])) {
            result = new Immediate(this.tokens[this.idx].codeOrigin, Number.parseInt(this.tokens[this.idx]));
            this.idx++;
            return result;
        }
        if (isString(this.tokens[this.idx])) {
            result = new StringLiteral(this.tokens[this.idx].codeOrigin, this.tokens[this.idx].string);
            this.idx++;
            return result;
        }
        if (isIdentifier(this.tokens[this.idx])) {
            let {codeOrigin, names} = this.parseColonColon();
            if (names.length > 1)
                return StructOffset.forField(codeOrigin, names.slice(0, -1).join('::'), names[names.length - 1]);

            return Variable.forName(codeOrigin, names[0]);
        }
        if (isRegister(this.tokens[this.idx]))
            return this.parseVariable();
        if (this.tokens[this.idx].isEqualTo("sizeof")) {
            this.idx++;
            let {codeOrigin, names} = this.parseColonColon();
            return Sizeof.forName(codeOrigin, names.join("::"));
        }
        if (this.tokens[this.idx].isEqualTo("constexpr")) {
            this.idx++;
            this.skipNewLine();
            let codeOrigin;
            let text;
            let names;
            if (this.tokens[this.idx].isEqualTo("(")) {
                ({ codeOrigin, text } = this.parseTextInParens());
                text = text.join("");
            } else {
                ({ codeOrigin, names } = this.parseColonColon());
                text = names.join("::");
            }
            return ConstExpr.forName(codeOrigin, text);
        }
        if (isLabel(this.tokens[this.idx])) {
            result = new LabelReference(this.tokens[this.idx].codeOrigin, Label.forName(this.tokens[this.idx].codeOrigin, this.tokens[this.idx].string));
            this.idx++;
            return result;
        }
        if (isLocalLabel(this.tokens[this.idx])) {
            result = new LocalLabelReference(this.tokens[this.idx].codeOrigin, LocalLabel.forName(this.tokens[this.idx].codeOrigin, this.tokens[this.idx].string));
            this.idx++;
            return result;
        }
        this.parseError();
    }

    parseExpressionMul()
    {
        this.skipNewLine();
        let result = this.parseExpressionAtom();
        while (this.tokens[this.idx].isEqualTo("*")) {
            if (this.tokens[this.idx].isEqualTo("*")) {
                this.idx++;
                result = new MulImmediates(this.tokens[this.idx - 1].codeOrigin, result, this.parseExpressionAtom());
            } else
                throw "Invalid token " + this.tokens[this.idx] + " in multiply expression";
        }
        return result;
    }

    couldBeExpression()
    {
        return this.tokens[this.idx].isEqualTo("-") || this.tokens[this.idx].isEqualTo("~") || this.tokens[this.idx].isEqualTo("constexpr") || this.tokens[this.idx].isEqualTo("sizeof") || isInteger(this.tokens[this.idx]) || isString(this.tokens[this.idx]) || isVariable(this.tokens[this.idx]) || this.tokens[this.idx].isEqualTo("(");
    }

    parseExpressionAdd()
    {
        this.skipNewLine();
        let result = this.parseExpressionMul();
        while (this.tokens[this.idx].isEqualTo("+") || this.tokens[this.idx].isEqualTo("-")) {
            if (this.tokens[this.idx].isEqualTo("+")) {
                this.idx++;
                result = new AddImmediates(this.tokens[this.idx - 1].codeOrigin, result, this.parseExpressionMul());
            } else if (this.tokens[this.idx].isEqualTo("-")) {
                this.idx++;
                result = new SubImmediates(this.tokens[this.idx - 1].codeOrigin, result, this.parseExpressionMul());
            } else
                throw "Invalid token " + this.tokens[this.idx] + " in addition expression";
        }
        return result;
    }

    parseExpressionAnd()
    {
        this.skipNewLine();
        let result = this.parseExpressionAdd();
        while (this.tokens[this.idx].isEqualTo("&")) {
            this.idx++;
            result = new AndImmediates(this.tokens[this.idx - 1].codeOrigin, result, this.parseExpressionAdd());
        }
        return result;
    }

    parseExpression()
    {
        this.skipNewLine();
        let result = this.parseExpressionAnd();
        while (this.tokens[this.idx].isEqualTo("|") || this.tokens[this.idx].isEqualTo("^")) {
            if (this.tokens[this.idx].isEqualTo("|")) {
                this.idx++;
                result = new OrImmediates(this.tokens[this.idx - 1].codeOrigin, result, this.parseExpressionAnd());
            } else if (this.tokens[this.idx].isEqualTo("^")) {
                this.idx++;
                result = new XorImmediates(this.tokens[this.idx - 1].codeOrigin, result, this.parseExpressionAnd());
            } else
                throw "Invalid token " + this.tokens[this.idx] + " in expression";
        }
        return result;
    }

    parseOperand(comment)
    {
        this.skipNewLine();
        if (this.couldBeExpression()) {
            let expr = this.parseExpression();
            if (this.tokens[this.idx].isEqualTo("["))
                return this.parseAddress(expr);

            return expr;
        }
        if (this.tokens[this.idx].isEqualTo("["))
            return this.parseAddress(new Immediate(this.tokens[this.idx].codeOrigin, 0));
        if (isLabel(this.tokens[this.idx])) {
            let result = new LabelReference(this.tokens[this.idx].codeOrigin, Label.forName(this.tokens[this.idx].codeOrigin, this.tokens[this.idx].string));
            this.idx++;
            return result;
        }
        if (isLocalLabel(this.tokens[this.idx])) {
            let result = new LocalLabelReference(this.tokens[this.idx].codeOrigin, LocalLabel.forName(this.tokens[this.idx].codeOrigin, this.tokens[this.idx].string));
            this.idx++;
            return result;
        }

        this.parseError(comment);
    }

    parseMacroVariables()
    {
        this.skipNewLine();
        this.consume(/^\($/);
        let variables = [];
        while (true) {
            this.skipNewLine();
            if (this.tokens[this.idx].isEqualTo(")")) {
                this.idx++;
                break
            } else if (isIdentifier(this.tokens[this.idx])) {
                 variables.push(Variable.forName(this.tokens[this.idx].codeOrigin, this.tokens[this.idx].string));
                this.idx++;
                this.skipNewLine();
                if (this.tokens[this.idx].isEqualTo(")")) {
                    this.idx++;
                    break;
                } else if (this.tokens[this.idx].isEqualTo(","))
                    this.idx++;
                else
                    this.parseError();
            } else
                this.parseError();
        }
        return variables;
    }

    parseSequence(final, comment)
    {
        let firstCodeOrigin = this.tokens[this.idx].codeOrigin;
        let list = [];
        while (true) {
            if ((this.idx == this.tokens.length && !final) || (final && final.test(this.tokens[this.idx].string)))
                break;
            else if (this.tokens[this.idx] instanceof Annotation) {
                // This is the only place where we can encounter a global
                // annotation, and hence need to be able to distinguish between
                // them.
                // globalAnnotations are the ones that start from column 0. All
                // others are considered localAnnotations.  The only reason to
                // distinguish between them is so that we can format the output
                // nicely as one would expect.

                let codeOrigin = this.tokens[this.idx].codeOrigin;
                let annotationOpcode = (this.tokens[this.idx].type == GlobalAnnotation) ? "globalAnnotation" : "localAnnotation";
                list.push(new Instruction(codeOrigin, annotationOpcode, [], this.tokens[this.idx].string));
                this.annotation = null;
                this.idx += 2 // Consume the newline as well.
            } else if (this.tokens[this.idx].isEqualTo("\n")) {
                // ignore
                this.idx++;
            } else if (this.tokens[this.idx].isEqualTo("const")) {
                this.idx++;
                if (!isVariable(this.tokens[this.idx]))
                    this.parseError();
                let variable = Variable.forName(this.tokens[this.idx].codeOrigin, this.tokens[this.idx].string);
                this.idx++;
                if (this.tokens[this.idx].isNotEqualTo("="))
                    this.parseError();
                this.idx++;
                let value = this.parseOperand("while inside of const " + variable.name);
                list.push(new ConstDecl(this.tokens[this.idx].codeOrigin, variable, value));
            } else if (this.tokens[this.idx].isEqualTo("error")) {
                list.push(new Error(this.tokens[this.idx].codeOrigin));
                this.idx++;
            } else if (this.tokens[this.idx].isEqualTo("if")) {
                let codeOrigin = this.tokens[this.idx].codeOrigin;
                this.idx++;
                this.skipNewLine();
                let predicate = this.parsePredicate();
                this.consume(/^((then)|(\n))$/);
                this.skipNewLine();
                let ifThenElse = new IfThenElse(codeOrigin, predicate, this.parseSequence(/^((else)|(end)|(elsif))$/, "while inside of \"if " + predicate.dump() + "\""));
                list.push(ifThenElse);
                while (this.tokens[this.idx].isEqualTo("elsif")) {
                    codeOrigin = this.tokens[this.idx].codeOrigin;
                    this.idx++;
                    this.skipNewLine();
                    predicate = this.parsePredicate();
                    this.consume(/^((then)|(\n))$/);
                    this.skipNewLine();
                    let elseCase = new IfThenElse(codeOrigin, predicate, this.parseSequence(/^((else)|(end)|(elsif))$/, "while inside of \"if " + predicate.dump() + "\""));
                    ifThenElse.elseCase = elseCase;
                    ifThenElse = elseCase;
                }
                if (this.tokens[this.idx].isEqualTo("else")) {
                    this.idx++;
                    ifThenElse.elseCase = this.parseSequence(/^end$/, "while inside of else case for \"if " + predicate.dump() + "\"");
                    this.idx++;
                } else {
                    if (this.tokens[this.idx].isNotEqualTo("end"))
                        this.parseError();
                    this.idx++;
                }
            } else if (this.tokens[this.idx].isEqualTo("macro")) {
                let codeOrigin = this.tokens[this.idx].codeOrigin;
                this.idx++;
                this.skipNewLine();
                if (!isIdentifier(this.tokens[this.idx]))
                    this.parseError();
                let name = this.tokens[this.idx].string;
                this.idx++;
                let variables = this.parseMacroVariables();
                let body = this.parseSequence(/^end$/, "while inside of macro " + name);
                this.idx++;
                list.push(new Macro(codeOrigin, name, variables, body));
            } else if (this.tokens[this.idx].isEqualTo("global")) {
                let codeOrigin = this.tokens[this.idx].codeOrigin;
                this.idx++;
                this.skipNewLine();
                if (!isLabel(this.tokens[this.idx]))
                    this.parseError();
                let name = this.tokens[this.idx].string;
                this.idx++;
                Label.setAsGlobal(codeOrigin, name);
            } else if (isInstruction(this.tokens[this.idx])) {
                let codeOrigin = this.tokens[this.idx].codeOrigin;
                let name = this.tokens[this.idx].string;
                this.idx++;
                if ((!final && this.idx == this.tokens.size) || (final && final.test(this.tokens[this.idx].string))) {
                    // Zero operand instruction, and it's the last one.
                    list.push(new Instruction(codeOrigin, name, [], this.annotation));
                    this.annotation = null;
                    break;
                } else if (this.tokens[this.idx] instanceof Annotation) {
                    list.push(new Instruction(codeOrigin, name, [], this.tokens[this.idx].string));
                    this.annotation = null;
                    this.idx += 2 // Consume the newline as well.
                } else if (this.tokens[this.idx].isEqualTo("\n")) {
                    // Zero operand instruction.
                    list.push(new Instruction(codeOrigin, name, [], this.annotation));
                    this.annotation = null;
                    this.idx++;
                } else {
                    // It's definitely an instruction, and it has at least one operand.
                    let operands = [];
                    let endOfSequence = false;
                    while (true) {
                        operands.push(this.parseOperand("while inside of instruction " + name));
                        if ((!final && this.idx == this.tokens.size) || (final && final.test(this.tokens[this.idx].string))) {
                            // The end of the instruction and of the sequence.
                            endOfSequence = true;
                            break;
                        } else if (this.tokens[this.idx].isEqualTo(",")) {
                            // Has another operand.
                            this.idx++;
                        } else if (this.tokens[this.idx] instanceof Annotation) {
                            this.annotation = this.tokens[this.idx].string;
                            this.idx += 2; // Consume the newline as well.
                            break;
                        } else if (this.tokens[this.idx].isEqualTo("\n")) {
                            // The end of the instruction.
                            this.idx++;
                            break;
                        } else
                            this.parseError("Expected a comma, newline, or " + final + " after " + operands[operands.length - 1].dump());
                    }
                    list.push(new Instruction(codeOrigin, name, operands, this.annotation));
                    this.annotation = null;
                    if (endOfSequence)
                        break;
                }
            } else if (isIdentifier(this.tokens[this.idx])) {
                // Check for potential macro invocation:
                let codeOrigin = this.tokens[this.idx].codeOrigin;
                let name = this.tokens[this.idx].string;
                this.idx++;
                if (this.tokens[this.idx].isEqualTo("(")) {
                    // Macro invocation.
                    this.idx++;
                    let operands = [];
                    this.skipNewLine();
                    if (this.tokens[this.idx].isEqualTo(")"))
                        this.idx++;
                    else {
                        while (true) {
                            this.skipNewLine();
                            if (this.tokens[this.idx].isEqualTo("macro")) {
                                // It's a macro lambda!
                                let codeOriginInner = this.tokens[this.idx].codeOrigin;
                                this.idx++;
                                let variables = this.parseMacroVariables();
                                let body = this.parseSequence(/^end$/, "while inside of anonymous macro passed as argument to " + name);
                                this.idx++;
                                operands.push(new Macro(codeOriginInner, "", variables, body));
                            } else
                                operands.push(this.parseOperand("while inside of macro call to " + name));

                            this.skipNewLine();
                            if (this.tokens[this.idx].isEqualTo(")")) {
                                this.idx++;
                                break
                            } else if (this.tokens[this.idx].isEqualTo(","))
                                this.idx++;
                            else
                                this.parseError("Unexpected " + this.tokens[this.idx].string + " while parsing invocation of macro " + name);

                        }
                    }
                    // Check if there's a trailing annotation after the macro invoke:
                    if (this.tokens[this.idx] instanceof Annotation) {
                        this.annotation = this.tokens[this.idx].string;
                        this.idx += 2 // Consume the newline as well.
                    }
                    list.push(new MacroCall(codeOrigin, name, operands, this.annotation));
                    this.annotation = null;
                } else
                    this.parseError("Expected \"(\" after " + name);
            } else if (isLabel(this.tokens[this.idx]) || isLocalLabel(this.tokens[this.idx])) {
                let codeOrigin = this.tokens[this.idx].codeOrigin;
                let name = this.tokens[this.idx].string;
                this.idx++;
                if (this.tokens[this.idx].isNotEqualTo(":"))
                    this.parseError();
                // It's a label.
                if (isLabel(name))
                    list.push(Label.forName(codeOrigin, name, true));
                else
                    list.push(LocalLabel.forName(codeOrigin, name));

                this.idx++;
            } else if (this.tokens[this.idx].isEqualTo("include")) {
                this.idx++;
                if (!isIdentifier(this.tokens[this.idx]))
                    this.parseError();
                let moduleName = this.tokens[this.idx].string;
                let fileName = new IncludeFile(moduleName, this.tokens[this.idx].codeOrigin.fileName.dirname).fileName;
                this.idx++;
                list.push(parse(fileName));
            } else
                this.parseError("Expecting terminal " + final + " " + comment);
        }
        return new Sequence(firstCodeOrigin, list);
    }

    parseIncludes(final, comment)
    {
        let firstCodeOrigin = this.tokens[this.idx].codeOrigin;
        let fileList = [];
        fileList.push(this.tokens[this.idx].codeOrigin.fileName);
        while (true) {
            if ((this.idx == this.tokens.length && !final) || (final && final.test(this.tokens[this.idx].string)))
                break;
            else if (this.tokens[this.idx].isEqualTo("include")) {
                this.idx++;
                if (!isIdentifier(this.tokens[this.idx]))
                    this.parseError();
                let moduleName = this.tokens[this.idx].string;
                let fileName = new IncludeFile(moduleName, this.tokens[this.idx].codeOrigin.fileName.dirname).fileName;
                this.idx++;

                fileList.push(fileName);
            } else
                this.idx++;
        }

        return fileList;
    }
}

function parseData(data, fileName)
{
    let parser = new Parser(data, new SourceFile(fileName));
    return parser.parseSequence(null, "");
}

function parse(fileName)
{
    return parseData(File.open(fileName).read(), fileName);
}

// --- JetStreamExtra/RexBench/OfflineAssembler/file.js ---

/*
 * Copyright (C) 2017 Apple Inc. All rights reserved.
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
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. 
 */
"use strict";

class File
{
    constructor (fileName, data)
    {
        this.fileName = fileName;
        this.data = data;
        if (File.directory[fileName])
            throw "Creating file named " + fileName + " that already exists";
        File.directory[fileName] = this;
    }

    static open(fileName)
    {
        return this.directory[fileName];
    }

    read()
    {
        return this.data;
    }
}

File.directory = {};

// --- JetStreamExtra/RexBench/OfflineAssembler/LowLevelInterpreter.js ---

/*
 * DO NOT EDIT THIS FILE, it is autogenerated.
 */
"use strict";

(function() {
    let source = `# Copyright (C) 2011-2017 Apple Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions
# are met:
# 1. Redistributions of source code must retain the above copyright
#    notice, this list of conditions and the following disclaimer.
# 2. Redistributions in binary form must reproduce the above copyright
#    notice, this list of conditions and the following disclaimer in the
#    documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS \`\`AS IS''
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
# PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS
# BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
# THE POSSIBILITY OF SUCH DAMAGE.

# Crash course on the language that this is written in (which I just call
# "assembly" even though it's more than that):
#
# - Mostly gas-style operand ordering. The last operand tends to be the
#   destination. So "a := b" is written as "mov b, a". But unlike gas,
#   comparisons are in-order, so "if (a < b)" is written as
#   "bilt a, b, ...".
#
# - "b" = byte, "h" = 16-bit word, "i" = 32-bit word, "p" = pointer.
#   For 32-bit, "i" and "p" are interchangeable except when an op supports one
#   but not the other.
#
# - In general, valid operands for macro invocations and instructions are
#   registers (eg "t0"), addresses (eg "4[t0]"), base-index addresses
#   (eg "7[t0, t1, 2]"), absolute addresses (eg "0xa0000000[]"), or labels
#   (eg "_foo" or ".foo"). Macro invocations can also take anonymous
#   macros as operands. Instructions cannot take anonymous macros.
#
# - Labels must have names that begin with either "_" or ".".  A "." label
#   is local and gets renamed before code gen to minimize namespace
#   pollution. A "_" label is an extern symbol (i.e. ".globl"). The "_"
#   may or may not be removed during code gen depending on whether the asm
#   conventions for C name mangling on the target platform mandate a "_"
#   prefix.
#
# - A "macro" is a lambda expression, which may be either anonymous or
#   named. But this has caveats. "macro" can take zero or more arguments,
#   which may be macros or any valid operands, but it can only return
#   code. But you can do Turing-complete things via continuation passing
#   style: "macro foo (a, b) b(a, a) end foo(foo, foo)". Actually, don't do
#   that, since you'll just crash the assembler.
#
# - An "if" is a conditional on settings. Any identifier supplied in the
#   predicate of an "if" is assumed to be a #define that is available
#   during code gen. So you can't use "if" for computation in a macro, but
#   you can use it to select different pieces of code for different
#   platforms.
#
# - Arguments to macros follow lexical scoping rather than dynamic scoping.
#   Const's also follow lexical scoping and may override (hide) arguments
#   or other consts. All variables (arguments and constants) can be bound
#   to operands. Additionally, arguments (but not constants) can be bound
#   to macros.

# The following general-purpose registers are available:
#
#  - cfr and sp hold the call frame and (native) stack pointer respectively.
#  They are callee-save registers, and guaranteed to be distinct from all other
#  registers on all architectures.
#
#  - lr is defined on non-X86 architectures (ARM64, ARMv7, ARM,
#  ARMv7_TRADITIONAL, MIPS and CLOOP) and holds the return PC
#
#  - pc holds the (native) program counter on 32-bits ARM architectures (ARM,
#  ARMv7, ARMv7_TRADITIONAL)
#
#  - t0, t1, t2, t3, t4 and optionally t5 are temporary registers that can get trashed on
#  calls, and are pairwise distinct registers. t4 holds the JS program counter, so use
#  with caution in opcodes (actually, don't use it in opcodes at all, except as PC).
#
#  - r0 and r1 are the platform's customary return registers, and thus are
#  two distinct registers
#
#  - a0, a1, a2 and a3 are the platform's customary argument registers, and
#  thus are pairwise distinct registers. Be mindful that:
#    + On X86, there are no argument registers. a0 and a1 are edx and
#    ecx following the fastcall convention, but you should still use the stack
#    to pass your arguments. The cCall2 and cCall4 macros do this for you.
#    + On X86_64_WIN, you should allocate space on the stack for the arguments,
#    and the return convention is weird for > 8 bytes types. The only place we
#    use > 8 bytes return values is on a cCall, and cCall2 and cCall4 handle
#    this for you.
#
#  - The only registers guaranteed to be caller-saved are r0, r1, a0, a1 and a2, and
#  you should be mindful of that in functions that are called directly from C.
#  If you need more registers, you should push and pop them like a good
#  assembly citizen, because any other register will be callee-saved on X86.
#
# You can additionally assume:
#
#  - a3, t2, t3, t4 and t5 are never return registers; t0, t1, a0, a1 and a2
#  can be return registers.
#
#  - t4 and t5 are never argument registers, t3 can only be a3, t1 can only be
#  a1; but t0 and t2 can be either a0 or a2.
#
#  - On 64 bits, there are callee-save registers named csr0, csr1, ... csrN.
#  The last three csr registers are used used to store the PC base and
#  two special tag values. Don't use them for anything else.
#
# Additional platform-specific details (you shouldn't rely on this remaining
# true):
#
#  - For consistency with the baseline JIT, t0 is always r0 (and t1 is always
#  r1 on 32 bits platforms). You should use the r version when you need return
#  registers, and the t version otherwise: code using t0 (or t1) should still
#  work if swapped with e.g. t3, while code using r0 (or r1) should not. There
#  *may* be legacy code relying on this.
#
#  - On all platforms other than X86, t0 can only be a0 and t2 can only be a2.
#
#  - On all platforms other than X86 and X86_64, a2 is not a return register.
#  a2 is r0 on X86 (because we have so few registers) and r1 on X86_64 (because
#  the ABI enforces it).
#
# The following floating-point registers are available:
#
#  - ft0-ft5 are temporary floating-point registers that get trashed on calls,
#  and are pairwise distinct.
#
#  - fa0 and fa1 are the platform's customary floating-point argument
#  registers, and are both distinct. On 64-bits platforms, fa2 and fa3 are
#  additional floating-point argument registers.
#
#  - fr is the platform's customary floating-point return register
#
# You can assume that ft1-ft5 or fa1-fa3 are never fr, and that ftX is never
# faY if X != Y.

# First come the common protocols that both interpreters use. Note that each
# of these must have an ASSERT() in LLIntData.cpp

# Work-around for the fact that the toolchain's awareness of armv7k / armv7s
# results in a separate slab in the fat binary, yet the offlineasm doesn't know
# to expect it.
if ARMv7k
end
if ARMv7s
end

# These declarations must match interpreter/JSStack.h.

const PtrSize = constexpr (sizeof(void*))

if JSVALUE64
    const CallFrameHeaderSlots = 5
else
    const CallFrameHeaderSlots = 4
    const CallFrameAlignSlots = 1
end
const SlotSize = 8

const JSEnvironmentRecord_variables = (sizeof JSEnvironmentRecord + SlotSize - 1) & ~(SlotSize - 1)
const DirectArguments_storage = (sizeof DirectArguments + SlotSize - 1) & ~(SlotSize - 1)

const StackAlignment = 16
const StackAlignmentSlots = 2
const StackAlignmentMask = StackAlignment - 1

const CallerFrameAndPCSize = 2 * PtrSize

const CallerFrame = 0
const ReturnPC = CallerFrame + PtrSize
const CodeBlock = ReturnPC + PtrSize
const Callee = CodeBlock + SlotSize
const ArgumentCount = Callee + SlotSize
const ThisArgumentOffset = ArgumentCount + SlotSize
const FirstArgumentOffset = ThisArgumentOffset + SlotSize
const CallFrameHeaderSize = ThisArgumentOffset

# Some value representation constants.
if JSVALUE64
    const TagBitTypeOther = 0x2
    const TagBitBool      = 0x4
    const TagBitUndefined = 0x8
    const ValueEmpty      = 0x0
    const ValueFalse      = TagBitTypeOther | TagBitBool
    const ValueTrue       = TagBitTypeOther | TagBitBool | 1
    const ValueUndefined  = TagBitTypeOther | TagBitUndefined
    const ValueNull       = TagBitTypeOther
    const TagTypeNumber   = 0xffff000000000000
    const TagMask         = TagTypeNumber | TagBitTypeOther
else
    const Int32Tag = -1
    const BooleanTag = -2
    const NullTag = -3
    const UndefinedTag = -4
    const CellTag = -5
    const EmptyValueTag = -6
    const DeletedValueTag = -7
    const LowestTag = DeletedValueTag
end

# PutByIdFlags data
const PutByIdPrimaryTypeMask = constexpr PutByIdPrimaryTypeMask
const PutByIdPrimaryTypeSecondary = constexpr PutByIdPrimaryTypeSecondary
const PutByIdPrimaryTypeObjectWithStructure = constexpr PutByIdPrimaryTypeObjectWithStructure
const PutByIdPrimaryTypeObjectWithStructureOrOther = constexpr PutByIdPrimaryTypeObjectWithStructureOrOther
const PutByIdSecondaryTypeMask = constexpr PutByIdSecondaryTypeMask
const PutByIdSecondaryTypeBottom = constexpr PutByIdSecondaryTypeBottom
const PutByIdSecondaryTypeBoolean = constexpr PutByIdSecondaryTypeBoolean
const PutByIdSecondaryTypeOther = constexpr PutByIdSecondaryTypeOther
const PutByIdSecondaryTypeInt32 = constexpr PutByIdSecondaryTypeInt32
const PutByIdSecondaryTypeNumber = constexpr PutByIdSecondaryTypeNumber
const PutByIdSecondaryTypeString = constexpr PutByIdSecondaryTypeString
const PutByIdSecondaryTypeSymbol = constexpr PutByIdSecondaryTypeSymbol
const PutByIdSecondaryTypeObject = constexpr PutByIdSecondaryTypeObject
const PutByIdSecondaryTypeObjectOrOther = constexpr PutByIdSecondaryTypeObjectOrOther
const PutByIdSecondaryTypeTop = constexpr PutByIdSecondaryTypeTop

const CallOpCodeSize = 9

if X86_64 or ARM64 or C_LOOP
    const maxFrameExtentForSlowPathCall = 0
elsif ARM or ARMv7_TRADITIONAL or ARMv7
    const maxFrameExtentForSlowPathCall = 24
elsif X86 or X86_WIN
    const maxFrameExtentForSlowPathCall = 40
elsif MIPS
    const maxFrameExtentForSlowPathCall = 40
elsif X86_64_WIN
    const maxFrameExtentForSlowPathCall = 64
end

if X86_64 or X86_64_WIN or ARM64
    const CalleeSaveSpaceAsVirtualRegisters = 3
else
    const CalleeSaveSpaceAsVirtualRegisters = 0
end

const CalleeSaveSpaceStackAligned = (CalleeSaveSpaceAsVirtualRegisters * SlotSize + StackAlignment - 1) & ~StackAlignmentMask


# Watchpoint states
const ClearWatchpoint = constexpr ClearWatchpoint
const IsWatched = constexpr IsWatched
const IsInvalidated = constexpr IsInvalidated

# ShadowChicken data
const ShadowChickenTailMarker = constexpr ShadowChicken::Packet::tailMarkerValue

# ArithProfile data
const ArithProfileInt = 0x100000
const ArithProfileIntInt = 0x120000
const ArithProfileNumber = 0x200000
const ArithProfileNumberInt = 0x220000
const ArithProfileNumberNumber = 0x240000
const ArithProfileIntNumber = 0x140000

# Some register conventions.
if JSVALUE64
    # - Use a pair of registers to represent the PC: one register for the
    #   base of the bytecodes, and one register for the index.
    # - The PC base (or PB for short) must be stored in a callee-save register.
    # - C calls are still given the Instruction* rather than the PC index.
    #   This requires an add before the call, and a sub after.
    const PC = t4 # When changing this, make sure LLIntPC is up to date in LLIntPCRanges.h
    if ARM64
        const PB = csr7
        const tagTypeNumber = csr8
        const tagMask = csr9
    elsif X86_64
        const PB = csr2
        const tagTypeNumber = csr3
        const tagMask = csr4
    elsif X86_64_WIN
        const PB = csr4
        const tagTypeNumber = csr5
        const tagMask = csr6
    elsif C_LOOP
        const PB = csr0
        const tagTypeNumber = csr1
        const tagMask = csr2
    end

    macro loadisFromInstruction(offset, dest)
        loadis offset * 8[PB, PC, 8], dest
    end
    
    macro loadpFromInstruction(offset, dest)
        loadp offset * 8[PB, PC, 8], dest
    end
    
    macro storeisToInstruction(value, offset)
        storei value, offset * 8[PB, PC, 8]
    end

    macro storepToInstruction(value, offset)
        storep value, offset * 8[PB, PC, 8]
    end

else
    const PC = t4 # When changing this, make sure LLIntPC is up to date in LLIntPCRanges.h
    macro loadisFromInstruction(offset, dest)
        loadis offset * 4[PC], dest
    end
    
    macro loadpFromInstruction(offset, dest)
        loadp offset * 4[PC], dest
    end

    macro storeisToInstruction(value, offset)
        storei value, offset * 4[PC]
    end
end

if X86_64_WIN
    const extraTempReg = t0
else
    const extraTempReg = t5
end

# Constants for reasoning about value representation.
if BIG_ENDIAN
    const TagOffset = 0
    const PayloadOffset = 4
else
    const TagOffset = 4
    const PayloadOffset = 0
end

# Constant for reasoning about butterflies.
const IsArray                  = constexpr IsArray
const IndexingShapeMask        = constexpr IndexingShapeMask
const NoIndexingShape          = constexpr NoIndexingShape
const Int32Shape               = constexpr Int32Shape
const DoubleShape              = constexpr DoubleShape
const ContiguousShape          = constexpr ContiguousShape
const ArrayStorageShape        = constexpr ArrayStorageShape
const SlowPutArrayStorageShape = constexpr SlowPutArrayStorageShape

# Type constants.
const StringType = constexpr StringType
const SymbolType = constexpr SymbolType
const ObjectType = constexpr ObjectType
const FinalObjectType = constexpr FinalObjectType
const JSFunctionType = constexpr JSFunctionType
const ArrayType = constexpr ArrayType
const DerivedArrayType = constexpr DerivedArrayType
const ProxyObjectType = constexpr ProxyObjectType

# The typed array types need to be numbered in a particular order because of the manually written
# switch statement in get_by_val and put_by_val.
const Int8ArrayType = constexpr Int8ArrayType
const Int16ArrayType = constexpr Int16ArrayType
const Int32ArrayType = constexpr Int32ArrayType
const Uint8ArrayType = constexpr Uint8ArrayType
const Uint8ClampedArrayType = constexpr Uint8ClampedArrayType
const Uint16ArrayType = constexpr Uint16ArrayType
const Uint32ArrayType = constexpr Uint32ArrayType
const Float32ArrayType = constexpr Float32ArrayType
const Float64ArrayType = constexpr Float64ArrayType

const FirstArrayType = Int8ArrayType
const LastArrayType = Float64ArrayType

# Type flags constants.
const MasqueradesAsUndefined = constexpr MasqueradesAsUndefined
const ImplementsDefaultHasInstance = constexpr ImplementsDefaultHasInstance

# Bytecode operand constants.
const FirstConstantRegisterIndex = constexpr FirstConstantRegisterIndex

# Code type constants.
const GlobalCode = constexpr GlobalCode
const EvalCode = constexpr EvalCode
const FunctionCode = constexpr FunctionCode
const ModuleCode = constexpr ModuleCode

# The interpreter steals the tag word of the argument count.
const LLIntReturnPC = ArgumentCount + TagOffset

# String flags.
const HashFlags8BitBuffer = 8

# Copied from PropertyOffset.h
const firstOutOfLineOffset = 100

# ResolveType
const GlobalProperty = constexpr GlobalProperty
const GlobalVar = constexpr GlobalVar
const GlobalLexicalVar = constexpr GlobalLexicalVar
const ClosureVar = constexpr ClosureVar
const LocalClosureVar = constexpr LocalClosureVar
const ModuleVar = constexpr ModuleVar
const GlobalPropertyWithVarInjectionChecks = constexpr GlobalPropertyWithVarInjectionChecks
const GlobalVarWithVarInjectionChecks = constexpr GlobalVarWithVarInjectionChecks
const GlobalLexicalVarWithVarInjectionChecks = constexpr GlobalLexicalVarWithVarInjectionChecks
const ClosureVarWithVarInjectionChecks = constexpr ClosureVarWithVarInjectionChecks

const ResolveTypeMask = constexpr GetPutInfo::typeBits
const InitializationModeMask = constexpr GetPutInfo::initializationBits
const InitializationModeShift = constexpr GetPutInfo::initializationShift
const NotInitialization = constexpr InitializationMode::NotInitialization

const MarkedBlockSize = constexpr MarkedBlock::blockSize
const MarkedBlockMask = ~(MarkedBlockSize - 1)

const BlackThreshold = constexpr blackThreshold

# Allocation constants
if JSVALUE64
    const JSFinalObjectSizeClassIndex = 1
else
    const JSFinalObjectSizeClassIndex = 3
end

# This must match wtf/Vector.h
const VectorBufferOffset = 0
if JSVALUE64
    const VectorSizeOffset = 12
else
    const VectorSizeOffset = 8
end

# Some common utilities.
macro crash()
    if C_LOOP
        cloopCrash
    else
        call _llint_crash
    end
end

macro assert(assertion)
    if ASSERT_ENABLED
        assertion(.ok)
        crash()
    .ok:
    end
end

# The probe macro can be used to insert some debugging code without perturbing scalar
# registers. Presently, the probe macro only preserves scalar registers. Hence, the
# C probe callback function should not trash floating point registers.
#
# The macro you pass to probe() can pass whatever registers you like to your probe
# callback function. However, you need to be mindful of which of the registers are
# also used as argument registers, and ensure that you don't trash the register value
# before storing it in the probe callback argument register that you desire.
#
# Here's an example of how it's used:
#
#     probe(
#         macro()
#             move cfr, a0 # pass the ExecState* as arg0.
#             move t0, a1 # pass the value of register t0 as arg1.
#             call _cProbeCallbackFunction # to do whatever you want.
#         end
#     )
#
if X86_64
    macro probe(action)
        # save all the registers that the LLInt may use.
        push a0, a1
        push a2, a3
        push t0, t1
        push t2, t3
        push t4, t5

        action()

        # restore all the registers we saved previously.
        pop t5, t4
        pop t3, t2
        pop t1, t0
        pop a3, a2
        pop a1, a0
    end
end

macro checkStackPointerAlignment(tempReg, location)
    if ARM64 or C_LOOP
        # ARM64 will check for us!
        # C_LOOP does not need the alignment, and can use a little perf
        # improvement from avoiding useless work.
    else
        if ARM or ARMv7 or ARMv7_TRADITIONAL
            # ARM can't do logical ops with the sp as a source
            move sp, tempReg
            andp StackAlignmentMask, tempReg
        else
            andp sp, StackAlignmentMask, tempReg
        end
        btpz tempReg, .stackPointerOkay
        move location, tempReg
        break
    .stackPointerOkay:
    end
end

if C_LOOP or ARM64 or X86_64 or X86_64_WIN
    const CalleeSaveRegisterCount = 0
elsif ARM or ARMv7_TRADITIONAL or ARMv7
    const CalleeSaveRegisterCount = 7
elsif MIPS
    const CalleeSaveRegisterCount = 1
elsif X86 or X86_WIN
    const CalleeSaveRegisterCount = 3
end

const CalleeRegisterSaveSize = CalleeSaveRegisterCount * PtrSize

# VMEntryTotalFrameSize includes the space for struct VMEntryRecord and the
# callee save registers rounded up to keep the stack aligned
const VMEntryTotalFrameSize = (CalleeRegisterSaveSize + sizeof VMEntryRecord + StackAlignment - 1) & ~StackAlignmentMask

macro pushCalleeSaves()
    if C_LOOP or ARM64 or X86_64 or X86_64_WIN
    elsif ARM or ARMv7_TRADITIONAL
        emit "push {r4-r10}"
    elsif ARMv7
        emit "push {r4-r6, r8-r11}"
    elsif MIPS
        emit "addiu $sp, $sp, -4"
        emit "sw $s4, 0($sp)"
        # save $gp to $s4 so that we can restore it after a function call
        emit "move $s4, $gp"
    elsif X86
        emit "push %esi"
        emit "push %edi"
        emit "push %ebx"
    elsif X86_WIN
        emit "push esi"
        emit "push edi"
        emit "push ebx"
    end
end

macro popCalleeSaves()
    if C_LOOP or ARM64 or X86_64 or X86_64_WIN
    elsif ARM or ARMv7_TRADITIONAL
        emit "pop {r4-r10}"
    elsif ARMv7
        emit "pop {r4-r6, r8-r11}"
    elsif MIPS
        emit "lw $s4, 0($sp)"
        emit "addiu $sp, $sp, 4"
    elsif X86
        emit "pop %ebx"
        emit "pop %edi"
        emit "pop %esi"
    elsif X86_WIN
        emit "pop ebx"
        emit "pop edi"
        emit "pop esi"
    end
end

macro preserveCallerPCAndCFR()
    if C_LOOP or ARM or ARMv7 or ARMv7_TRADITIONAL or MIPS
        push lr
        push cfr
    elsif X86 or X86_WIN or X86_64 or X86_64_WIN
        push cfr
    elsif ARM64
        push cfr, lr
    else
        error
    end
    move sp, cfr
end

macro restoreCallerPCAndCFR()
    move cfr, sp
    if C_LOOP or ARM or ARMv7 or ARMv7_TRADITIONAL or MIPS
        pop cfr
        pop lr
    elsif X86 or X86_WIN or X86_64 or X86_64_WIN
        pop cfr
    elsif ARM64
        pop lr, cfr
    end
end

macro preserveCalleeSavesUsedByLLInt()
    subp CalleeSaveSpaceStackAligned, sp
    if C_LOOP
    elsif ARM or ARMv7_TRADITIONAL
    elsif ARMv7
    elsif ARM64
        emit "stp x27, x28, [x29, #-16]"
        emit "stp xzr, x26, [x29, #-32]"
    elsif MIPS
    elsif X86
    elsif X86_WIN
    elsif X86_64
        storep csr4, -8[cfr]
        storep csr3, -16[cfr]
        storep csr2, -24[cfr]
    elsif X86_64_WIN
        storep csr6, -8[cfr]
        storep csr5, -16[cfr]
        storep csr4, -24[cfr]
    end
end

macro restoreCalleeSavesUsedByLLInt()
    if C_LOOP
    elsif ARM or ARMv7_TRADITIONAL
    elsif ARMv7
    elsif ARM64
        emit "ldp xzr, x26, [x29, #-32]"
        emit "ldp x27, x28, [x29, #-16]"
    elsif MIPS
    elsif X86
    elsif X86_WIN
    elsif X86_64
        loadp -24[cfr], csr2
        loadp -16[cfr], csr3
        loadp -8[cfr], csr4
    elsif X86_64_WIN
        loadp -24[cfr], csr4
        loadp -16[cfr], csr5
        loadp -8[cfr], csr6
    end
end

macro copyCalleeSavesToVMEntryFrameCalleeSavesBuffer(vm, temp)
    if ARM64 or X86_64 or X86_64_WIN
        loadp VM::topVMEntryFrame[vm], temp
        vmEntryRecord(temp, temp)
        leap VMEntryRecord::calleeSaveRegistersBuffer[temp], temp
        if ARM64
            storep csr0, [temp]
            storep csr1, 8[temp]
            storep csr2, 16[temp]
            storep csr3, 24[temp]
            storep csr4, 32[temp]
            storep csr5, 40[temp]
            storep csr6, 48[temp]
            storep csr7, 56[temp]
            storep csr8, 64[temp]
            storep csr9, 72[temp]
            stored csfr0, 80[temp]
            stored csfr1, 88[temp]
            stored csfr2, 96[temp]
            stored csfr3, 104[temp]
            stored csfr4, 112[temp]
            stored csfr5, 120[temp]
            stored csfr6, 128[temp]
            stored csfr7, 136[temp]
        elsif X86_64
            storep csr0, [temp]
            storep csr1, 8[temp]
            storep csr2, 16[temp]
            storep csr3, 24[temp]
            storep csr4, 32[temp]
        elsif X86_64_WIN
            storep csr0, [temp]
            storep csr1, 8[temp]
            storep csr2, 16[temp]
            storep csr3, 24[temp]
            storep csr4, 32[temp]
            storep csr5, 40[temp]
            storep csr6, 48[temp]
        end
    end
end

macro restoreCalleeSavesFromVMEntryFrameCalleeSavesBuffer(vm, temp)
    if ARM64 or X86_64 or X86_64_WIN
        loadp VM::topVMEntryFrame[vm], temp
        vmEntryRecord(temp, temp)
        leap VMEntryRecord::calleeSaveRegistersBuffer[temp], temp
        if ARM64
            loadp [temp], csr0
            loadp 8[temp], csr1
            loadp 16[temp], csr2
            loadp 24[temp], csr3
            loadp 32[temp], csr4
            loadp 40[temp], csr5
            loadp 48[temp], csr6
            loadp 56[temp], csr7
            loadp 64[temp], csr8
            loadp 72[temp], csr9
            loadd 80[temp], csfr0
            loadd 88[temp], csfr1
            loadd 96[temp], csfr2
            loadd 104[temp], csfr3
            loadd 112[temp], csfr4
            loadd 120[temp], csfr5
            loadd 128[temp], csfr6
            loadd 136[temp], csfr7
        elsif X86_64
            loadp [temp], csr0
            loadp 8[temp], csr1
            loadp 16[temp], csr2
            loadp 24[temp], csr3
            loadp 32[temp], csr4
        elsif X86_64_WIN
            loadp [temp], csr0
            loadp 8[temp], csr1
            loadp 16[temp], csr2
            loadp 24[temp], csr3
            loadp 32[temp], csr4
            loadp 40[temp], csr5
            loadp 48[temp], csr6
        end
    end
end

macro preserveReturnAddressAfterCall(destinationRegister)
    if C_LOOP or ARM or ARMv7 or ARMv7_TRADITIONAL or ARM64 or MIPS
        # In C_LOOP case, we're only preserving the bytecode vPC.
        move lr, destinationRegister
    elsif X86 or X86_WIN or X86_64 or X86_64_WIN
        pop destinationRegister
    else
        error
    end
end

macro functionPrologue()
    if X86 or X86_WIN or X86_64 or X86_64_WIN
        push cfr
    elsif ARM64
        push cfr, lr
    elsif C_LOOP or ARM or ARMv7 or ARMv7_TRADITIONAL or MIPS
        push lr
        push cfr
    end
    move sp, cfr
end

macro functionEpilogue()
    if X86 or X86_WIN or X86_64 or X86_64_WIN
        pop cfr
    elsif ARM64
        pop lr, cfr
    elsif C_LOOP or ARM or ARMv7 or ARMv7_TRADITIONAL or MIPS
        pop cfr
        pop lr
    end
end

macro vmEntryRecord(entryFramePointer, resultReg)
    subp entryFramePointer, VMEntryTotalFrameSize, resultReg
end

macro getFrameRegisterSizeForCodeBlock(codeBlock, size)
    loadi CodeBlock::m_numCalleeLocals[codeBlock], size
    lshiftp 3, size
    addp maxFrameExtentForSlowPathCall, size
end

macro restoreStackPointerAfterCall()
    loadp CodeBlock[cfr], t2
    getFrameRegisterSizeForCodeBlock(t2, t2)
    if ARMv7
        subp cfr, t2, t2
        move t2, sp
    else
        subp cfr, t2, sp
    end
end

macro traceExecution()
    if COLLECT_STATS
        callSlowPath(_llint_count_opcode)
    end
    if EXECUTION_TRACING
        callSlowPath(_llint_trace)
    end
end

macro traceSlowPathExecution()
    if COLLECT_STATS
        callSlowPath(_llint_count_opcode_slow_path)
    end
end

macro callOpcodeSlowPath(slowPath)
    traceSlowPathExecution()
    callSlowPath(slowPath)
end

macro callTargetFunction(callee)
    if C_LOOP
        cloopCallJSFunction callee
    else
        call callee
    end
    restoreStackPointerAfterCall()
    dispatchAfterCall()
end

macro prepareForRegularCall(callee, temp1, temp2, temp3)
    addp CallerFrameAndPCSize, sp
end

# sp points to the new frame
macro prepareForTailCall(callee, temp1, temp2, temp3)
    restoreCalleeSavesUsedByLLInt()

    loadi PayloadOffset + ArgumentCount[cfr], temp2
    loadp CodeBlock[cfr], temp1
    loadp CodeBlock::m_numParameters[temp1], temp1
    bilteq temp1, temp2, .noArityFixup
    move temp1, temp2

.noArityFixup:
    # We assume < 2^28 arguments
    muli SlotSize, temp2
    addi StackAlignment - 1 + CallFrameHeaderSize, temp2
    andi ~StackAlignmentMask, temp2

    move cfr, temp1
    addp temp2, temp1

    loadi PayloadOffset + ArgumentCount[sp], temp2
    # We assume < 2^28 arguments
    muli SlotSize, temp2
    addi StackAlignment - 1 + CallFrameHeaderSize, temp2
    andi ~StackAlignmentMask, temp2

    if ARM or ARMv7_TRADITIONAL or ARMv7 or ARM64 or C_LOOP or MIPS
        addp 2 * PtrSize, sp
        subi 2 * PtrSize, temp2
        loadp PtrSize[cfr], lr
    else
        addp PtrSize, sp
        subi PtrSize, temp2
        loadp PtrSize[cfr], temp3
        storep temp3, [sp]
    end

    subp temp2, temp1
    loadp [cfr], cfr

.copyLoop:
    subi PtrSize, temp2
    loadp [sp, temp2, 1], temp3
    storep temp3, [temp1, temp2, 1]
    btinz temp2, .copyLoop

    move temp1, sp
    jmp callee
end

macro slowPathForCall(slowPath, prepareCall)
    traceSlowPathExecution()
    callCallSlowPath(
        slowPath,
        # Those are r0 and r1
        macro (callee, calleeFramePtr)
            btpz calleeFramePtr, .dontUpdateSP
            move calleeFramePtr, sp
            prepareCall(callee, t2, t3, t4)
        .dontUpdateSP:
            callTargetFunction(callee)
        end)
end

macro arrayProfile(cellAndIndexingType, profile, scratch)
    const cell = cellAndIndexingType
    const indexingType = cellAndIndexingType 
    loadi JSCell::m_structureID[cell], scratch
    storei scratch, ArrayProfile::m_lastSeenStructureID[profile]
    loadb JSCell::m_indexingTypeAndMisc[cell], indexingType
end

macro skipIfIsRememberedOrInEden(cell, slowPath)
    memfence
    bba JSCell::m_cellState[cell], BlackThreshold, .done
    slowPath()
.done:
end

macro notifyWrite(set, slow)
    bbneq WatchpointSet::m_state[set], IsInvalidated, slow
end

macro checkSwitchToJIT(increment, action)
    loadp CodeBlock[cfr], t0
    baddis increment, CodeBlock::m_llintExecuteCounter + BaselineExecutionCounter::m_counter[t0], .continue
    action()
    .continue:
end

macro checkSwitchToJITForEpilogue()
    checkSwitchToJIT(
        10,
        macro ()
            callOpcodeSlowPath(_llint_replace)
        end)
end

macro assertNotConstant(index)
    assert(macro (ok) bilt index, FirstConstantRegisterIndex, ok end)
end

macro functionForCallCodeBlockGetter(targetRegister)
    if JSVALUE64
        loadp Callee[cfr], targetRegister
    else
        loadp Callee + PayloadOffset[cfr], targetRegister
    end
    loadp JSFunction::m_executable[targetRegister], targetRegister
    loadp FunctionExecutable::m_codeBlockForCall[targetRegister], targetRegister
end

macro functionForConstructCodeBlockGetter(targetRegister)
    if JSVALUE64
        loadp Callee[cfr], targetRegister
    else
        loadp Callee + PayloadOffset[cfr], targetRegister
    end
    loadp JSFunction::m_executable[targetRegister], targetRegister
    loadp FunctionExecutable::m_codeBlockForConstruct[targetRegister], targetRegister
end

macro notFunctionCodeBlockGetter(targetRegister)
    loadp CodeBlock[cfr], targetRegister
end

macro functionCodeBlockSetter(sourceRegister)
    storep sourceRegister, CodeBlock[cfr]
end

macro notFunctionCodeBlockSetter(sourceRegister)
    # Nothing to do!
end

# Do the bare minimum required to execute code. Sets up the PC, leave the CodeBlock*
# in t1. May also trigger prologue entry OSR.
macro prologue(codeBlockGetter, codeBlockSetter, osrSlowPath, traceSlowPath)
    # Set up the call frame and check if we should OSR.
    preserveCallerPCAndCFR()

    if EXECUTION_TRACING
        subp maxFrameExtentForSlowPathCall, sp
        callSlowPath(traceSlowPath)
        addp maxFrameExtentForSlowPathCall, sp
    end
    codeBlockGetter(t1)
    if not C_LOOP
        baddis 5, CodeBlock::m_llintExecuteCounter + BaselineExecutionCounter::m_counter[t1], .continue
        if JSVALUE64
            move cfr, a0
            move PC, a1
            cCall2(osrSlowPath)
        else
            # We are after the function prologue, but before we have set up sp from the CodeBlock.
            # Temporarily align stack pointer for this call.
            subp 8, sp
            move cfr, a0
            move PC, a1
            cCall2(osrSlowPath)
            addp 8, sp
        end
        btpz r0, .recover
        move cfr, sp # restore the previous sp
        # pop the callerFrame since we will jump to a function that wants to save it
        if ARM64
            pop lr, cfr
        elsif ARM or ARMv7 or ARMv7_TRADITIONAL or MIPS
            pop cfr
            pop lr
        else
            pop cfr
        end
        jmp r0
    .recover:
        codeBlockGetter(t1)
    .continue:
    end

    codeBlockSetter(t1)

    preserveCalleeSavesUsedByLLInt()

    # Set up the PC.
    if JSVALUE64
        loadp CodeBlock::m_instructions[t1], PB
        move 0, PC
    else
        loadp CodeBlock::m_instructions[t1], PC
    end

    # Get new sp in t0 and check stack height.
    getFrameRegisterSizeForCodeBlock(t1, t0)
    subp cfr, t0, t0
    bpa t0, cfr, .needStackCheck
    loadp CodeBlock::m_vm[t1], t2
    if C_LOOP
        bpbeq VM::m_cloopStackLimit[t2], t0, .stackHeightOK
    else
        bpbeq VM::m_softStackLimit[t2], t0, .stackHeightOK
    end

.needStackCheck:
    # Stack height check failed - need to call a slow_path.
    # Set up temporary stack pointer for call including callee saves
    subp maxFrameExtentForSlowPathCall, sp
    callSlowPath(_llint_stack_check)
    bpeq r1, 0, .stackHeightOKGetCodeBlock
    move r1, cfr
    dispatch(0) # Go to exception handler in PC

.stackHeightOKGetCodeBlock:
    # Stack check slow path returned that the stack was ok.
    # Since they were clobbered, need to get CodeBlock and new sp
    codeBlockGetter(t1)
    getFrameRegisterSizeForCodeBlock(t1, t0)
    subp cfr, t0, t0

.stackHeightOK:
    move t0, sp

    if JSVALUE64
        move TagTypeNumber, tagTypeNumber
        addp TagBitTypeOther, tagTypeNumber, tagMask
    end
end

# Expects that CodeBlock is in t1, which is what prologue() leaves behind.
# Must call dispatch(0) after calling this.
macro functionInitialization(profileArgSkip)
    # Profile the arguments. Unfortunately, we have no choice but to do this. This
    # code is pretty horrendous because of the difference in ordering between
    # arguments and value profiles, the desire to have a simple loop-down-to-zero
    # loop, and the desire to use only three registers so as to preserve the PC and
    # the code block. It is likely that this code should be rewritten in a more
    # optimal way for architectures that have more than five registers available
    # for arbitrary use in the interpreter.
    loadi CodeBlock::m_numParameters[t1], t0
    addp -profileArgSkip, t0 # Use addi because that's what has the peephole
    assert(macro (ok) bpgteq t0, 0, ok end)
    btpz t0, .argumentProfileDone
    loadp CodeBlock::m_argumentValueProfiles + VectorBufferOffset[t1], t3
    mulp sizeof ValueProfile, t0, t2 # Aaaaahhhh! Need strength reduction!
    lshiftp 3, t0
    addp t2, t3
.argumentProfileLoop:
    if JSVALUE64
        loadq ThisArgumentOffset - 8 + profileArgSkip * 8[cfr, t0], t2
        subp sizeof ValueProfile, t3
        storeq t2, profileArgSkip * sizeof ValueProfile + ValueProfile::m_buckets[t3]
    else
        loadi ThisArgumentOffset + TagOffset - 8 + profileArgSkip * 8[cfr, t0], t2
        subp sizeof ValueProfile, t3
        storei t2, profileArgSkip * sizeof ValueProfile + ValueProfile::m_buckets + TagOffset[t3]
        loadi ThisArgumentOffset + PayloadOffset - 8 + profileArgSkip * 8[cfr, t0], t2
        storei t2, profileArgSkip * sizeof ValueProfile + ValueProfile::m_buckets + PayloadOffset[t3]
    end
    baddpnz -8, t0, .argumentProfileLoop
.argumentProfileDone:
end

macro doReturn()
    restoreCalleeSavesUsedByLLInt()
    restoreCallerPCAndCFR()
    ret
end

# stub to call into JavaScript or Native functions
# EncodedJSValue vmEntryToJavaScript(void* code, VM* vm, ProtoCallFrame* protoFrame)
# EncodedJSValue vmEntryToNativeFunction(void* code, VM* vm, ProtoCallFrame* protoFrame)

if C_LOOP
    _llint_vm_entry_to_javascript:
else
    global _vmEntryToJavaScript
    _vmEntryToJavaScript:
end
    doVMEntry(makeJavaScriptCall)


if C_LOOP
    _llint_vm_entry_to_native:
else
    global _vmEntryToNative
    _vmEntryToNative:
end
    doVMEntry(makeHostFunctionCall)


if not C_LOOP
    # void sanitizeStackForVMImpl(VM* vm)
    global _sanitizeStackForVMImpl
    _sanitizeStackForVMImpl:
        # We need three non-aliased caller-save registers. We are guaranteed
        # this for a0, a1 and a2 on all architectures.
        if X86 or X86_WIN
            loadp 4[sp], a0
        end
        const vm = a0
        const address = a1
        const zeroValue = a2
    
        loadp VM::m_lastStackTop[vm], address
        bpbeq sp, address, .zeroFillDone
    
        move 0, zeroValue
    .zeroFillLoop:
        storep zeroValue, [address]
        addp PtrSize, address
        bpa sp, address, .zeroFillLoop
    
    .zeroFillDone:
        move sp, address
        storep address, VM::m_lastStackTop[vm]
        ret
    
    # VMEntryRecord* vmEntryRecord(const VMEntryFrame* entryFrame)
    global _vmEntryRecord
    _vmEntryRecord:
        if X86 or X86_WIN
            loadp 4[sp], a0
        end

        vmEntryRecord(a0, r0)
        ret
end

if C_LOOP
    # Dummy entry point the C Loop uses to initialize.
    _llint_entry:
        crash()
else
    macro initPCRelative(pcBase)
        if X86_64 or X86_64_WIN or X86 or X86_WIN
            call _relativePCBase
        _relativePCBase:
            pop pcBase
        elsif ARM64
        elsif ARMv7
        _relativePCBase:
            move pc, pcBase
            subp 3, pcBase   # Need to back up the PC and set the Thumb2 bit
        elsif ARM or ARMv7_TRADITIONAL
        _relativePCBase:
            move pc, pcBase
            subp 8, pcBase
        elsif MIPS
            la _relativePCBase, pcBase
            setcallreg pcBase # needed to set $t9 to the right value for the .cpload created by the label.
        _relativePCBase:
        end
end

# The PC base is in t1, as this is what _llint_entry leaves behind through
# initPCRelative(t1)
macro setEntryAddress(index, label)
    if X86_64 or X86_64_WIN
        leap (label - _relativePCBase)[t1], t3
        move index, t4
        storep t3, [a0, t4, 8]
    elsif X86 or X86_WIN
        leap (label - _relativePCBase)[t1], t3
        move index, t4
        storep t3, [a0, t4, 4]
    elsif ARM64
        pcrtoaddr label, t1
        move index, t4
        storep t1, [a0, t4, 8]
    elsif ARM or ARMv7 or ARMv7_TRADITIONAL
        mvlbl (label - _relativePCBase), t4
        addp t4, t1, t4
        move index, t3
        storep t4, [a0, t3, 4]
    elsif MIPS
        la label, t4
        la _relativePCBase, t3
        subp t3, t4
        addp t4, t1, t4
        move index, t3
        storep t4, [a0, t3, 4]
    end
end

global _llint_entry
# Entry point for the llint to initialize.
_llint_entry:
    functionPrologue()
    pushCalleeSaves()
    if X86 or X86_WIN
        loadp 20[sp], a0
    end
    initPCRelative(t1)

    # Include generated bytecode initialization file.
    include InitBytecodes

    popCalleeSaves()
    functionEpilogue()
    ret
end

_llint_program_prologue:
    prologue(notFunctionCodeBlockGetter, notFunctionCodeBlockSetter, _llint_entry_osr, _llint_trace_prologue)
    dispatch(0)


_llint_module_program_prologue:
    prologue(notFunctionCodeBlockGetter, notFunctionCodeBlockSetter, _llint_entry_osr, _llint_trace_prologue)
    dispatch(0)


_llint_eval_prologue:
    prologue(notFunctionCodeBlockGetter, notFunctionCodeBlockSetter, _llint_entry_osr, _llint_trace_prologue)
    dispatch(0)


_llint_function_for_call_prologue:
    prologue(functionForCallCodeBlockGetter, functionCodeBlockSetter, _llint_entry_osr_function_for_call, _llint_trace_prologue_function_for_call)
    functionInitialization(0)
    dispatch(0)
    

_llint_function_for_construct_prologue:
    prologue(functionForConstructCodeBlockGetter, functionCodeBlockSetter, _llint_entry_osr_function_for_construct, _llint_trace_prologue_function_for_construct)
    functionInitialization(1)
    dispatch(0)
    

_llint_function_for_call_arity_check:
    prologue(functionForCallCodeBlockGetter, functionCodeBlockSetter, _llint_entry_osr_function_for_call_arityCheck, _llint_trace_arityCheck_for_call)
    functionArityCheck(.functionForCallBegin, _slow_path_call_arityCheck)
.functionForCallBegin:
    functionInitialization(0)
    dispatch(0)


_llint_function_for_construct_arity_check:
    prologue(functionForConstructCodeBlockGetter, functionCodeBlockSetter, _llint_entry_osr_function_for_construct_arityCheck, _llint_trace_arityCheck_for_construct)
    functionArityCheck(.functionForConstructBegin, _slow_path_construct_arityCheck)
.functionForConstructBegin:
    functionInitialization(1)
    dispatch(0)


# Value-representation-specific code.
if JSVALUE64
    include LowLevelInterpreter64
else
    include LowLevelInterpreter32_64
end


# Value-representation-agnostic code.
_llint_op_create_direct_arguments:
    traceExecution()
    callOpcodeSlowPath(_slow_path_create_direct_arguments)
    dispatch(constexpr op_create_direct_arguments_length)


_llint_op_create_scoped_arguments:
    traceExecution()
    callOpcodeSlowPath(_slow_path_create_scoped_arguments)
    dispatch(constexpr op_create_scoped_arguments_length)


_llint_op_create_cloned_arguments:
    traceExecution()
    callOpcodeSlowPath(_slow_path_create_cloned_arguments)
    dispatch(constexpr op_create_cloned_arguments_length)


_llint_op_create_this:
    traceExecution()
    callOpcodeSlowPath(_slow_path_create_this)
    dispatch(constexpr op_create_this_length)


_llint_op_new_object:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_new_object)
    dispatch(constexpr op_new_object_length)


_llint_op_new_func:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_new_func)
    dispatch(constexpr op_new_func_length)


_llint_op_new_generator_func:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_new_generator_func)
    dispatch(constexpr op_new_generator_func_length)


_llint_op_new_async_func:
    traceExecution()
    callSlowPath(_llint_slow_path_new_async_func)
    dispatch(constexpr op_new_async_func_length)


_llint_op_new_array:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_new_array)
    dispatch(constexpr op_new_array_length)


_llint_op_new_array_with_spread:
    traceExecution()
    callOpcodeSlowPath(_slow_path_new_array_with_spread)
    dispatch(constexpr op_new_array_with_spread_length)


_llint_op_spread:
    traceExecution()
    callOpcodeSlowPath(_slow_path_spread)
    dispatch(constexpr op_spread_length)


_llint_op_new_array_with_size:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_new_array_with_size)
    dispatch(constexpr op_new_array_with_size_length)


_llint_op_new_array_buffer:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_new_array_buffer)
    dispatch(constexpr op_new_array_buffer_length)


_llint_op_new_regexp:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_new_regexp)
    dispatch(constexpr op_new_regexp_length)


_llint_op_less:
    traceExecution()
    callOpcodeSlowPath(_slow_path_less)
    dispatch(constexpr op_less_length)


_llint_op_lesseq:
    traceExecution()
    callOpcodeSlowPath(_slow_path_lesseq)
    dispatch(constexpr op_lesseq_length)


_llint_op_greater:
    traceExecution()
    callOpcodeSlowPath(_slow_path_greater)
    dispatch(constexpr op_greater_length)


_llint_op_greatereq:
    traceExecution()
    callOpcodeSlowPath(_slow_path_greatereq)
    dispatch(constexpr op_greatereq_length)


_llint_op_mod:
    traceExecution()
    callOpcodeSlowPath(_slow_path_mod)
    dispatch(constexpr op_mod_length)


_llint_op_pow:
    traceExecution()
    callOpcodeSlowPath(_slow_path_pow)
    dispatch(constexpr op_pow_length)


_llint_op_typeof:
    traceExecution()
    callOpcodeSlowPath(_slow_path_typeof)
    dispatch(constexpr op_typeof_length)


_llint_op_is_object_or_null:
    traceExecution()
    callOpcodeSlowPath(_slow_path_is_object_or_null)
    dispatch(constexpr op_is_object_or_null_length)

_llint_op_is_function:
    traceExecution()
    callOpcodeSlowPath(_slow_path_is_function)
    dispatch(constexpr op_is_function_length)


_llint_op_in:
    traceExecution()
    callOpcodeSlowPath(_slow_path_in)
    dispatch(constexpr op_in_length)


_llint_op_try_get_by_id:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_try_get_by_id)
    dispatch(constexpr op_try_get_by_id_length)


_llint_op_del_by_id:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_del_by_id)
    dispatch(constexpr op_del_by_id_length)


_llint_op_del_by_val:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_del_by_val)
    dispatch(constexpr op_del_by_val_length)


_llint_op_put_by_index:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_put_by_index)
    dispatch(constexpr op_put_by_index_length)


_llint_op_put_getter_by_id:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_put_getter_by_id)
    dispatch(constexpr op_put_getter_by_id_length)


_llint_op_put_setter_by_id:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_put_setter_by_id)
    dispatch(constexpr op_put_setter_by_id_length)


_llint_op_put_getter_setter_by_id:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_put_getter_setter_by_id)
    dispatch(constexpr op_put_getter_setter_by_id_length)


_llint_op_put_getter_by_val:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_put_getter_by_val)
    dispatch(constexpr op_put_getter_by_val_length)


_llint_op_put_setter_by_val:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_put_setter_by_val)
    dispatch(constexpr op_put_setter_by_val_length)


_llint_op_define_data_property:
    traceExecution()
    callOpcodeSlowPath(_slow_path_define_data_property)
    dispatch(constexpr op_define_data_property_length)


_llint_op_define_accessor_property:
    traceExecution()
    callOpcodeSlowPath(_slow_path_define_accessor_property)
    dispatch(constexpr op_define_accessor_property_length)


_llint_op_jtrue:
    traceExecution()
    jumpTrueOrFalse(
        macro (value, target) btinz value, target end,
        _llint_slow_path_jtrue)


_llint_op_jfalse:
    traceExecution()
    jumpTrueOrFalse(
        macro (value, target) btiz value, target end,
        _llint_slow_path_jfalse)


_llint_op_jless:
    traceExecution()
    compare(
        macro (left, right, target) bilt left, right, target end,
        macro (left, right, target) bdlt left, right, target end,
        _llint_slow_path_jless)


_llint_op_jnless:
    traceExecution()
    compare(
        macro (left, right, target) bigteq left, right, target end,
        macro (left, right, target) bdgtequn left, right, target end,
        _llint_slow_path_jnless)


_llint_op_jgreater:
    traceExecution()
    compare(
        macro (left, right, target) bigt left, right, target end,
        macro (left, right, target) bdgt left, right, target end,
        _llint_slow_path_jgreater)


_llint_op_jngreater:
    traceExecution()
    compare(
        macro (left, right, target) bilteq left, right, target end,
        macro (left, right, target) bdltequn left, right, target end,
        _llint_slow_path_jngreater)


_llint_op_jlesseq:
    traceExecution()
    compare(
        macro (left, right, target) bilteq left, right, target end,
        macro (left, right, target) bdlteq left, right, target end,
        _llint_slow_path_jlesseq)


_llint_op_jnlesseq:
    traceExecution()
    compare(
        macro (left, right, target) bigt left, right, target end,
        macro (left, right, target) bdgtun left, right, target end,
        _llint_slow_path_jnlesseq)


_llint_op_jgreatereq:
    traceExecution()
    compare(
        macro (left, right, target) bigteq left, right, target end,
        macro (left, right, target) bdgteq left, right, target end,
        _llint_slow_path_jgreatereq)


_llint_op_jngreatereq:
    traceExecution()
    compare(
        macro (left, right, target) bilt left, right, target end,
        macro (left, right, target) bdltun left, right, target end,
        _llint_slow_path_jngreatereq)


_llint_op_loop_hint:
    traceExecution()
    checkSwitchToJITForLoop()
    dispatch(constexpr op_loop_hint_length)


_llint_op_check_traps:
    traceExecution()
    loadp CodeBlock[cfr], t1
    loadp CodeBlock::m_vm[t1], t1
    loadb VM::m_traps+VMTraps::m_needTrapHandling[t1], t0
    btpnz t0, .handleTraps
.afterHandlingTraps:
    dispatch(constexpr op_check_traps_length)
.handleTraps:
    callTrapHandler(.throwHandler)
    jmp .afterHandlingTraps
.throwHandler:
    jmp _llint_throw_from_slow_path_trampoline


# Returns the packet pointer in t0.
macro acquireShadowChickenPacket(slow)
    loadp CodeBlock[cfr], t1
    loadp CodeBlock::m_vm[t1], t1
    loadp VM::m_shadowChicken[t1], t2
    loadp ShadowChicken::m_logCursor[t2], t0
    bpaeq t0, ShadowChicken::m_logEnd[t2], slow
    addp sizeof ShadowChicken::Packet, t0, t1
    storep t1, ShadowChicken::m_logCursor[t2]
end


_llint_op_nop:
    dispatch(constexpr op_nop_length)


_llint_op_switch_string:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_switch_string)
    dispatch(0)


_llint_op_new_func_exp:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_new_func_exp)
    dispatch(constexpr op_new_func_exp_length)

_llint_op_new_generator_func_exp:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_new_generator_func_exp)
    dispatch(constexpr op_new_generator_func_exp_length)

_llint_op_new_async_func_exp:
    traceExecution()
    callSlowPath(_llint_slow_path_new_async_func_exp)
    dispatch(constexpr op_new_async_func_exp_length)


_llint_op_set_function_name:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_set_function_name)
    dispatch(constexpr op_set_function_name_length)

_llint_op_call:
    traceExecution()
    arrayProfileForCall()
    doCall(_llint_slow_path_call, prepareForRegularCall)

_llint_op_tail_call:
    traceExecution()
    arrayProfileForCall()
    checkSwitchToJITForEpilogue()
    doCall(_llint_slow_path_call, prepareForTailCall)

_llint_op_construct:
    traceExecution()
    doCall(_llint_slow_path_construct, prepareForRegularCall)

macro doCallVarargs(frameSlowPath, slowPath, prepareCall)
    callOpcodeSlowPath(frameSlowPath)
    branchIfException(_llint_throw_from_slow_path_trampoline)
    # calleeFrame in r1
    if JSVALUE64
        move r1, sp
    else
        # The calleeFrame is not stack aligned, move down by CallerFrameAndPCSize to align
        if ARMv7
            subp r1, CallerFrameAndPCSize, t2
            move t2, sp
        else
            subp r1, CallerFrameAndPCSize, sp
        end
    end
    slowPathForCall(slowPath, prepareCall)
end

_llint_op_call_varargs:
    traceExecution()
    doCallVarargs(_llint_slow_path_size_frame_for_varargs, _llint_slow_path_call_varargs, prepareForRegularCall)

_llint_op_tail_call_varargs:
    traceExecution()
    checkSwitchToJITForEpilogue()
    # We lie and perform the tail call instead of preparing it since we can't
    # prepare the frame for a call opcode
    doCallVarargs(_llint_slow_path_size_frame_for_varargs, _llint_slow_path_call_varargs, prepareForTailCall)


_llint_op_tail_call_forward_arguments:
    traceExecution()
    checkSwitchToJITForEpilogue()
    # We lie and perform the tail call instead of preparing it since we can't
    # prepare the frame for a call opcode
    doCallVarargs(_llint_slow_path_size_frame_for_forward_arguments, _llint_slow_path_tail_call_forward_arguments, prepareForTailCall)


_llint_op_construct_varargs:
    traceExecution()
    doCallVarargs(_llint_slow_path_size_frame_for_varargs, _llint_slow_path_construct_varargs, prepareForRegularCall)


_llint_op_call_eval:
    traceExecution()
    
    # Eval is executed in one of two modes:
    #
    # 1) We find that we're really invoking eval() in which case the
    #    execution is perfomed entirely inside the slow_path, and it
    #    returns the PC of a function that just returns the return value
    #    that the eval returned.
    #
    # 2) We find that we're invoking something called eval() that is not
    #    the real eval. Then the slow_path returns the PC of the thing to
    #    call, and we call it.
    #
    # This allows us to handle two cases, which would require a total of
    # up to four pieces of state that cannot be easily packed into two
    # registers (C functions can return up to two registers, easily):
    #
    # - The call frame register. This may or may not have been modified
    #   by the slow_path, but the convention is that it returns it. It's not
    #   totally clear if that's necessary, since the cfr is callee save.
    #   But that's our style in this here interpreter so we stick with it.
    #
    # - A bit to say if the slow_path successfully executed the eval and has
    #   the return value, or did not execute the eval but has a PC for us
    #   to call.
    #
    # - Either:
    #   - The JS return value (two registers), or
    #
    #   - The PC to call.
    #
    # It turns out to be easier to just always have this return the cfr
    # and a PC to call, and that PC may be a dummy thunk that just
    # returns the JS value that the eval returned.
    
    slowPathForCall(_llint_slow_path_call_eval, prepareForRegularCall)


_llint_generic_return_point:
    dispatchAfterCall()


_llint_op_strcat:
    traceExecution()
    callOpcodeSlowPath(_slow_path_strcat)
    dispatch(constexpr op_strcat_length)


_llint_op_push_with_scope:
    traceExecution()
    callOpcodeSlowPath(_slow_path_push_with_scope)
    dispatch(constexpr op_push_with_scope_length)


_llint_op_assert:
    traceExecution()
    callOpcodeSlowPath(_slow_path_assert)
    dispatch(constexpr op_assert_length)


_llint_op_unreachable:
    traceExecution()
    callOpcodeSlowPath(_slow_path_unreachable)
    dispatch(constexpr op_unreachable_length)


_llint_op_yield:
    notSupported()


_llint_op_create_lexical_environment:
    traceExecution()
    callOpcodeSlowPath(_slow_path_create_lexical_environment)
    dispatch(constexpr op_create_lexical_environment_length)


_llint_op_throw:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_throw)
    dispatch(constexpr op_throw_length)


_llint_op_throw_static_error:
    traceExecution()
    callOpcodeSlowPath(_slow_path_throw_static_error)
    dispatch(constexpr op_throw_static_error_length)


_llint_op_debug:
    traceExecution()
    loadp CodeBlock[cfr], t0
    loadi CodeBlock::m_debuggerRequests[t0], t0
    btiz t0, .opDebugDone
    callOpcodeSlowPath(_llint_slow_path_debug)
.opDebugDone:                    
    dispatch(constexpr op_debug_length)


_llint_native_call_trampoline:
    nativeCallTrampoline(NativeExecutable::m_function)


_llint_native_construct_trampoline:
    nativeCallTrampoline(NativeExecutable::m_constructor)

_llint_op_get_enumerable_length:
    traceExecution()
    callOpcodeSlowPath(_slow_path_get_enumerable_length)
    dispatch(constexpr op_get_enumerable_length_length)

_llint_op_has_indexed_property:
    traceExecution()
    callOpcodeSlowPath(_slow_path_has_indexed_property)
    dispatch(constexpr op_has_indexed_property_length)

_llint_op_has_structure_property:
    traceExecution()
    callOpcodeSlowPath(_slow_path_has_structure_property)
    dispatch(constexpr op_has_structure_property_length)

_llint_op_has_generic_property:
    traceExecution()
    callOpcodeSlowPath(_slow_path_has_generic_property)
    dispatch(constexpr op_has_generic_property_length)

_llint_op_get_direct_pname:
    traceExecution()
    callOpcodeSlowPath(_slow_path_get_direct_pname)
    dispatch(constexpr op_get_direct_pname_length)

_llint_op_get_property_enumerator:
    traceExecution()
    callOpcodeSlowPath(_slow_path_get_property_enumerator)
    dispatch(constexpr op_get_property_enumerator_length)

_llint_op_enumerator_structure_pname:
    traceExecution()
    callOpcodeSlowPath(_slow_path_next_structure_enumerator_pname)
    dispatch(constexpr op_enumerator_structure_pname_length)

_llint_op_enumerator_generic_pname:
    traceExecution()
    callOpcodeSlowPath(_slow_path_next_generic_enumerator_pname)
    dispatch(constexpr op_enumerator_generic_pname_length)

_llint_op_to_index_string:
    traceExecution()
    callOpcodeSlowPath(_slow_path_to_index_string)
    dispatch(constexpr op_to_index_string_length)

_llint_op_create_rest:
    traceExecution()
    callOpcodeSlowPath(_slow_path_create_rest)
    dispatch(constexpr op_create_rest_length)

_llint_op_instanceof:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_instanceof)
    dispatch(constexpr op_instanceof_length)

_llint_op_get_by_id_with_this:
    traceExecution()
    callOpcodeSlowPath(_slow_path_get_by_id_with_this)
    dispatch(constexpr op_get_by_id_with_this_length)

_llint_op_get_by_val_with_this:
    traceExecution()
    callOpcodeSlowPath(_slow_path_get_by_val_with_this)
    dispatch(constexpr op_get_by_val_with_this_length)

_llint_op_put_by_id_with_this:
    traceExecution()
    callOpcodeSlowPath(_slow_path_put_by_id_with_this)
    dispatch(constexpr op_put_by_id_with_this_length)

_llint_op_put_by_val_with_this:
    traceExecution()
    callOpcodeSlowPath(_slow_path_put_by_val_with_this)
    dispatch(constexpr op_put_by_val_with_this_length)

_llint_op_resolve_scope_for_hoisting_func_decl_in_eval:
    traceExecution()
    callOpcodeSlowPath(_slow_path_resolve_scope_for_hoisting_func_decl_in_eval)
    dispatch(constexpr op_resolve_scope_for_hoisting_func_decl_in_eval_length)

# Lastly, make sure that we can link even though we don't support all opcodes.
# These opcodes should never arise when using LLInt or either JIT. We assert
# as much.

macro notSupported()
    if ASSERT_ENABLED
        crash()
    else
        # We should use whatever the smallest possible instruction is, just to
        # ensure that there is a gap between instruction labels. If multiple
        # smallest instructions exist, we should pick the one that is most
        # likely result in execution being halted. Currently that is the break
        # instruction on all architectures we're interested in. (Break is int3
        # on Intel, which is 1 byte, and bkpt on ARMv7, which is 2 bytes.)
        break
    end
end
`;

    new File("LowLevelInterpreter.asm", source);
})();

// --- JetStreamExtra/RexBench/OfflineAssembler/LowLevelInterpreter32_64.js ---

/*
 * DO NOT EDIT THIS FILE, it is autogenerated.
 */
"use strict";

(function() {
    let source = `# Copyright (C) 2011-2017 Apple Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions
# are met:
# 1. Redistributions of source code must retain the above copyright
#    notice, this list of conditions and the following disclaimer.
# 2. Redistributions in binary form must reproduce the above copyright
#    notice, this list of conditions and the following disclaimer in the
#    documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS \`\`AS IS''
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
# PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS
# BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
# THE POSSIBILITY OF SUCH DAMAGE.


# Utilities
macro dispatch(advance)
    addp advance * 4, PC
    jmp [PC]
end

macro dispatchBranchWithOffset(pcOffset)
    lshifti 2, pcOffset
    addp pcOffset, PC
    jmp [PC]
end

macro dispatchBranch(pcOffset)
    loadi pcOffset, t0
    dispatchBranchWithOffset(t0)
end

macro dispatchAfterCall()
    loadi ArgumentCount + TagOffset[cfr], PC
    loadi 4[PC], t3
    storei r1, TagOffset[cfr, t3, 8]
    storei r0, PayloadOffset[cfr, t3, 8]
    valueProfile(r1, r0, 4 * (CallOpCodeSize - 1), t3)
    dispatch(CallOpCodeSize)
end

macro cCall2(function)
    if ARM or ARMv7 or ARMv7_TRADITIONAL or MIPS
        call function
    elsif X86 or X86_WIN
        subp 8, sp
        push a1
        push a0
        call function
        addp 16, sp
    elsif C_LOOP
        cloopCallSlowPath function, a0, a1
    else
        error
    end
end

macro cCall2Void(function)
    if C_LOOP
        cloopCallSlowPathVoid function, a0, a1
    else
        cCall2(function)
    end
end

macro cCall4(function)
    if ARM or ARMv7 or ARMv7_TRADITIONAL or MIPS
        call function
    elsif X86 or X86_WIN
        push a3
        push a2
        push a1
        push a0
        call function
        addp 16, sp
    elsif C_LOOP
        error
    else
        error
    end
end

macro callSlowPath(slowPath)
    move cfr, a0
    move PC, a1
    cCall2(slowPath)
    move r0, PC
end

macro doVMEntry(makeCall)
    functionPrologue()
    pushCalleeSaves()

    # x86 needs to load arguments from the stack
    if X86 or X86_WIN
        loadp 16[cfr], a2
        loadp 12[cfr], a1
        loadp 8[cfr], a0
    end

    const entry = a0
    const vm = a1
    const protoCallFrame = a2

    # We are using t3, t4 and t5 as temporaries through the function.
    # Since we have the guarantee that tX != aY when X != Y, we are safe from
    # aliasing problems with our arguments.

    if ARMv7
        vmEntryRecord(cfr, t3)
        move t3, sp
    else
        vmEntryRecord(cfr, sp)
    end

    storep vm, VMEntryRecord::m_vm[sp]
    loadp VM::topCallFrame[vm], t4
    storep t4, VMEntryRecord::m_prevTopCallFrame[sp]
    loadp VM::topVMEntryFrame[vm], t4
    storep t4, VMEntryRecord::m_prevTopVMEntryFrame[sp]

    # Align stack pointer
    if X86_WIN or MIPS
        addp CallFrameAlignSlots * SlotSize, sp, t3
        andp ~StackAlignmentMask, t3
        subp t3, CallFrameAlignSlots * SlotSize, sp
    elsif ARM or ARMv7 or ARMv7_TRADITIONAL
        addp CallFrameAlignSlots * SlotSize, sp, t3
        clrbp t3, StackAlignmentMask, t3
        if ARMv7
            subp t3, CallFrameAlignSlots * SlotSize, t3
            move t3, sp
        else
            subp t3, CallFrameAlignSlots * SlotSize, sp
        end
    end

    loadi ProtoCallFrame::paddedArgCount[protoCallFrame], t4
    addp CallFrameHeaderSlots, t4, t4
    lshiftp 3, t4
    subp sp, t4, t3
    bpa t3, sp, .throwStackOverflow

    # Ensure that we have enough additional stack capacity for the incoming args,
    # and the frame for the JS code we're executing. We need to do this check
    # before we start copying the args from the protoCallFrame below.
    if C_LOOP
        bpaeq t3, VM::m_cloopStackLimit[vm], .stackHeightOK
    else
        bpaeq t3, VM::m_softStackLimit[vm], .stackHeightOK
    end

    if C_LOOP
        move entry, t4
        move vm, t5
        cloopCallSlowPath _llint_stack_check_at_vm_entry, vm, t3
        bpeq t0, 0, .stackCheckFailed
        move t4, entry
        move t5, vm
        jmp .stackHeightOK

.stackCheckFailed:
        move t4, entry
        move t5, vm
    end

.throwStackOverflow:
    subp 8, sp # Align stack for cCall2() to make a call.
    move vm, a0
    move protoCallFrame, a1
    cCall2(_llint_throw_stack_overflow_error)

    if ARMv7
        vmEntryRecord(cfr, t3)
        move t3, sp
    else
        vmEntryRecord(cfr, sp)
    end

    loadp VMEntryRecord::m_vm[sp], t5
    loadp VMEntryRecord::m_prevTopCallFrame[sp], t4
    storep t4, VM::topCallFrame[t5]
    loadp VMEntryRecord::m_prevTopVMEntryFrame[sp], t4
    storep t4, VM::topVMEntryFrame[t5]

    if ARMv7
        subp cfr, CalleeRegisterSaveSize, t5
        move t5, sp
    else
        subp cfr, CalleeRegisterSaveSize, sp
    end

    popCalleeSaves()
    functionEpilogue()
    ret

.stackHeightOK:
    move t3, sp
    move 4, t3

.copyHeaderLoop:
    subi 1, t3
    loadi TagOffset[protoCallFrame, t3, 8], t5
    storei t5, TagOffset + CodeBlock[sp, t3, 8]
    loadi PayloadOffset[protoCallFrame, t3, 8], t5
    storei t5, PayloadOffset + CodeBlock[sp, t3, 8]
    btinz t3, .copyHeaderLoop

    loadi PayloadOffset + ProtoCallFrame::argCountAndCodeOriginValue[protoCallFrame], t4
    subi 1, t4
    loadi ProtoCallFrame::paddedArgCount[protoCallFrame], t5
    subi 1, t5

    bieq t4, t5, .copyArgs
.fillExtraArgsLoop:
    subi 1, t5
    storei UndefinedTag, ThisArgumentOffset + 8 + TagOffset[sp, t5, 8]
    storei 0, ThisArgumentOffset + 8 + PayloadOffset[sp, t5, 8]
    bineq t4, t5, .fillExtraArgsLoop

.copyArgs:
    loadp ProtoCallFrame::args[protoCallFrame], t3

.copyArgsLoop:
    btiz t4, .copyArgsDone
    subi 1, t4
    loadi TagOffset[t3, t4, 8], t5
    storei t5, ThisArgumentOffset + 8 + TagOffset[sp, t4, 8]
    loadi PayloadOffset[t3, t4, 8], t5
    storei t5, ThisArgumentOffset + 8 + PayloadOffset[sp, t4, 8]
    jmp .copyArgsLoop

.copyArgsDone:
    storep sp, VM::topCallFrame[vm]
    storep cfr, VM::topVMEntryFrame[vm]

    makeCall(entry, t3, t4)

    if ARMv7
        vmEntryRecord(cfr, t3)
        move t3, sp
    else
        vmEntryRecord(cfr, sp)
    end

    loadp VMEntryRecord::m_vm[sp], t5
    loadp VMEntryRecord::m_prevTopCallFrame[sp], t4
    storep t4, VM::topCallFrame[t5]
    loadp VMEntryRecord::m_prevTopVMEntryFrame[sp], t4
    storep t4, VM::topVMEntryFrame[t5]

    if ARMv7
        subp cfr, CalleeRegisterSaveSize, t5
        move t5, sp
    else
        subp cfr, CalleeRegisterSaveSize, sp
    end

    popCalleeSaves()
    functionEpilogue()
    ret
end

macro makeJavaScriptCall(entry, temp, unused)
    addp CallerFrameAndPCSize, sp
    checkStackPointerAlignment(temp, 0xbad0dc02)
    if C_LOOP
        cloopCallJSFunction entry
    else
        call entry
    end
    checkStackPointerAlignment(temp, 0xbad0dc03)
    subp CallerFrameAndPCSize, sp
end

macro makeHostFunctionCall(entry, temp1, temp2)
    move entry, temp1
    storep cfr, [sp]
    if C_LOOP
        move sp, a0
        storep lr, PtrSize[sp]
        cloopCallNative temp1
    elsif X86 or X86_WIN
        # Put callee frame pointer on stack as arg0, also put it in ecx for "fastcall" targets
        move 0, temp2
        move temp2, 4[sp] # put 0 in ReturnPC
        move sp, a0 # a0 is ecx
        push temp2 # Push dummy arg1
        push a0
        call temp1
        addp 8, sp
    else
        move sp, a0
        call temp1
    end
end

_handleUncaughtException:
    loadp Callee + PayloadOffset[cfr], t3
    andp MarkedBlockMask, t3
    loadp MarkedBlock::m_vm[t3], t3
    restoreCalleeSavesFromVMEntryFrameCalleeSavesBuffer(t3, t0)
    loadp VM::callFrameForCatch[t3], cfr
    storep 0, VM::callFrameForCatch[t3]

    loadp CallerFrame[cfr], cfr

    if ARMv7
        vmEntryRecord(cfr, t3)
        move t3, sp
    else
        vmEntryRecord(cfr, sp)
    end

    loadp VMEntryRecord::m_vm[sp], t3
    loadp VMEntryRecord::m_prevTopCallFrame[sp], t5
    storep t5, VM::topCallFrame[t3]
    loadp VMEntryRecord::m_prevTopVMEntryFrame[sp], t5
    storep t5, VM::topVMEntryFrame[t3]

    if ARMv7
        subp cfr, CalleeRegisterSaveSize, t3
        move t3, sp
    else
        subp cfr, CalleeRegisterSaveSize, sp
    end

    popCalleeSaves()
    functionEpilogue()
    ret

macro doReturnFromHostFunction(extraStackSpace)
    functionEpilogue(extraStackSpace)
    ret
end

# Debugging operation if you'd like to print an operand in the instruction stream. fromWhere
# should be an immediate integer - any integer you like; use it to identify the place you're
# debugging from. operand should likewise be an immediate, and should identify the operand
# in the instruction stream you'd like to print out.
macro traceOperand(fromWhere, operand)
    move fromWhere, a2
    move operand, a3
    move cfr, a0
    move PC, a1
    cCall4(_llint_trace_operand)
    move r0, PC
    move r1, cfr
end

# Debugging operation if you'd like to print the value of an operand in the instruction
# stream. Same as traceOperand(), but assumes that the operand is a register, and prints its
# value.
macro traceValue(fromWhere, operand)
    move fromWhere, a2
    move operand, a3
    move cfr, a0
    move PC, a1
    cCall4(_llint_trace_value)
    move r0, PC
    move r1, cfr
end

# Call a slowPath for call opcodes.
macro callCallSlowPath(slowPath, action)
    storep PC, ArgumentCount + TagOffset[cfr]
    move cfr, a0
    move PC, a1
    cCall2(slowPath)
    action(r0, r1)
end

macro callTrapHandler(throwHandler)
    storei PC, ArgumentCount + TagOffset[cfr]
    move cfr, a0
    move PC, a1
    cCall2(_llint_slow_path_handle_traps)
    btpnz r0, throwHandler
    loadi ArgumentCount + TagOffset[cfr], PC
end

macro checkSwitchToJITForLoop()
    checkSwitchToJIT(
        1,
        macro ()
            storei PC, ArgumentCount + TagOffset[cfr]
            move cfr, a0
            move PC, a1
            cCall2(_llint_loop_osr)
            btpz r0, .recover
            move r1, sp
            jmp r0
        .recover:
            loadi ArgumentCount + TagOffset[cfr], PC
        end)
end

macro loadVariable(operand, index, tag, payload)
    loadisFromInstruction(operand, index)
    loadi TagOffset[cfr, index, 8], tag
    loadi PayloadOffset[cfr, index, 8], payload
end

# Index, tag, and payload must be different registers. Index is not
# changed.
macro loadConstantOrVariable(index, tag, payload)
    bigteq index, FirstConstantRegisterIndex, .constant
    loadi TagOffset[cfr, index, 8], tag
    loadi PayloadOffset[cfr, index, 8], payload
    jmp .done
.constant:
    loadp CodeBlock[cfr], payload
    loadp CodeBlock::m_constantRegisters + VectorBufferOffset[payload], payload
    # There is a bit of evil here: if the index contains a value >= FirstConstantRegisterIndex,
    # then value << 3 will be equal to (value - FirstConstantRegisterIndex) << 3.
    loadp TagOffset[payload, index, 8], tag
    loadp PayloadOffset[payload, index, 8], payload
.done:
end

macro loadConstantOrVariableTag(index, tag)
    bigteq index, FirstConstantRegisterIndex, .constant
    loadi TagOffset[cfr, index, 8], tag
    jmp .done
.constant:
    loadp CodeBlock[cfr], tag
    loadp CodeBlock::m_constantRegisters + VectorBufferOffset[tag], tag
    # There is a bit of evil here: if the index contains a value >= FirstConstantRegisterIndex,
    # then value << 3 will be equal to (value - FirstConstantRegisterIndex) << 3.
    loadp TagOffset[tag, index, 8], tag
.done:
end

# Index and payload may be the same register. Index may be clobbered.
macro loadConstantOrVariable2Reg(index, tag, payload)
    bigteq index, FirstConstantRegisterIndex, .constant
    loadi TagOffset[cfr, index, 8], tag
    loadi PayloadOffset[cfr, index, 8], payload
    jmp .done
.constant:
    loadp CodeBlock[cfr], tag
    loadp CodeBlock::m_constantRegisters + VectorBufferOffset[tag], tag
    # There is a bit of evil here: if the index contains a value >= FirstConstantRegisterIndex,
    # then value << 3 will be equal to (value - FirstConstantRegisterIndex) << 3.
    lshifti 3, index
    addp index, tag
    loadp PayloadOffset[tag], payload
    loadp TagOffset[tag], tag
.done:
end

macro loadConstantOrVariablePayloadTagCustom(index, tagCheck, payload)
    bigteq index, FirstConstantRegisterIndex, .constant
    tagCheck(TagOffset[cfr, index, 8])
    loadi PayloadOffset[cfr, index, 8], payload
    jmp .done
.constant:
    loadp CodeBlock[cfr], payload
    loadp CodeBlock::m_constantRegisters + VectorBufferOffset[payload], payload
    # There is a bit of evil here: if the index contains a value >= FirstConstantRegisterIndex,
    # then value << 3 will be equal to (value - FirstConstantRegisterIndex) << 3.
    tagCheck(TagOffset[payload, index, 8])
    loadp PayloadOffset[payload, index, 8], payload
.done:
end

# Index and payload must be different registers. Index is not mutated. Use
# this if you know what the tag of the variable should be. Doing the tag
# test as part of loading the variable reduces register use, but may not
# be faster than doing loadConstantOrVariable followed by a branch on the
# tag.
macro loadConstantOrVariablePayload(index, expectedTag, payload, slow)
    loadConstantOrVariablePayloadTagCustom(
        index,
        macro (actualTag) bineq actualTag, expectedTag, slow end,
        payload)
end

macro loadConstantOrVariablePayloadUnchecked(index, payload)
    loadConstantOrVariablePayloadTagCustom(
        index,
        macro (actualTag) end,
        payload)
end

macro writeBarrierOnOperand(cellOperand)
    loadisFromInstruction(cellOperand, t1)
    loadConstantOrVariablePayload(t1, CellTag, t2, .writeBarrierDone)
    skipIfIsRememberedOrInEden(
        t2, 
        macro()
            push cfr, PC
            # We make two extra slots because cCall2 will poke.
            subp 8, sp
            move t2, a1 # t2 can be a0 on x86
            move cfr, a0
            cCall2Void(_llint_write_barrier_slow)
            addp 8, sp
            pop PC, cfr
        end)
.writeBarrierDone:
end

macro writeBarrierOnOperands(cellOperand, valueOperand)
    loadisFromInstruction(valueOperand, t1)
    loadConstantOrVariableTag(t1, t0)
    bineq t0, CellTag, .writeBarrierDone

    writeBarrierOnOperand(cellOperand)
.writeBarrierDone:
end

macro writeBarrierOnGlobal(valueOperand, loadHelper)
    loadisFromInstruction(valueOperand, t1)
    loadConstantOrVariableTag(t1, t0)
    bineq t0, CellTag, .writeBarrierDone

    loadHelper(t3)

    skipIfIsRememberedOrInEden(
        t3,
        macro()
            push cfr, PC
            # We make two extra slots because cCall2 will poke.
            subp 8, sp
            move cfr, a0
            move t3, a1
            cCall2Void(_llint_write_barrier_slow)
            addp 8, sp
            pop PC, cfr
        end)
.writeBarrierDone:
end

macro writeBarrierOnGlobalObject(valueOperand)
    writeBarrierOnGlobal(valueOperand,
        macro(registerToStoreGlobal)
            loadp CodeBlock[cfr], registerToStoreGlobal
            loadp CodeBlock::m_globalObject[registerToStoreGlobal], registerToStoreGlobal
        end)
end

macro writeBarrierOnGlobalLexicalEnvironment(valueOperand)
    writeBarrierOnGlobal(valueOperand,
        macro(registerToStoreGlobal)
            loadp CodeBlock[cfr], registerToStoreGlobal
            loadp CodeBlock::m_globalObject[registerToStoreGlobal], registerToStoreGlobal
            loadp JSGlobalObject::m_globalLexicalEnvironment[registerToStoreGlobal], registerToStoreGlobal
        end)
end

macro valueProfile(tag, payload, operand, scratch)
    loadp operand[PC], scratch
    storei tag, ValueProfile::m_buckets + TagOffset[scratch]
    storei payload, ValueProfile::m_buckets + PayloadOffset[scratch]
end


# Entrypoints into the interpreter

# Expects that CodeBlock is in t1, which is what prologue() leaves behind.
macro functionArityCheck(doneLabel, slowPath)
    loadi PayloadOffset + ArgumentCount[cfr], t0
    biaeq t0, CodeBlock::m_numParameters[t1], doneLabel
    move cfr, a0
    move PC, a1
    cCall2(slowPath)   # This slowPath has a simple protocol: t0 = 0 => no error, t0 != 0 => error
    btiz r0, .noError
    move r1, cfr   # r1 contains caller frame
    jmp _llint_throw_from_slow_path_trampoline

.noError:
    # r1 points to ArityCheckData.
    loadp CommonSlowPaths::ArityCheckData::thunkToCall[r1], t3
    btpz t3, .proceedInline
    
    loadp CommonSlowPaths::ArityCheckData::paddedStackSpace[r1], a0
    call t3
    if ASSERT_ENABLED
        loadp ReturnPC[cfr], t0
        loadp [t0], t0
    end
    jmp .continue

.proceedInline:
    loadi CommonSlowPaths::ArityCheckData::paddedStackSpace[r1], t1
    btiz t1, .continue
    loadi PayloadOffset + ArgumentCount[cfr], t2
    addi CallFrameHeaderSlots, t2

    // Check if there are some unaligned slots we can use
    move t1, t3
    andi StackAlignmentSlots - 1, t3
    btiz t3, .noExtraSlot
.fillExtraSlots:
    move 0, t0
    storei t0, PayloadOffset[cfr, t2, 8]
    move UndefinedTag, t0
    storei t0, TagOffset[cfr, t2, 8]
    addi 1, t2
    bsubinz 1, t3, .fillExtraSlots
    andi ~(StackAlignmentSlots - 1), t1
    btiz t1, .continue

.noExtraSlot:
    // Move frame up t1 slots
    negi t1
    move cfr, t3
    move t1, t0
    lshiftp 3, t0
    addp t0, cfr
    addp t0, sp
.copyLoop:
    loadi PayloadOffset[t3], t0
    storei t0, PayloadOffset[t3, t1, 8]
    loadi TagOffset[t3], t0
    storei t0, TagOffset[t3, t1, 8]
    addp 8, t3
    bsubinz 1, t2, .copyLoop

    // Fill new slots with JSUndefined
    move t1, t2
.fillLoop:
    move 0, t0
    storei t0, PayloadOffset[t3, t1, 8]
    move UndefinedTag, t0
    storei t0, TagOffset[t3, t1, 8]
    addp 8, t3
    baddinz 1, t2, .fillLoop

.continue:
    # Reload CodeBlock and PC, since the slow_path clobbered it.
    loadp CodeBlock[cfr], t1
    loadp CodeBlock::m_instructions[t1], PC
    jmp doneLabel
end

macro branchIfException(label)
    loadp Callee + PayloadOffset[cfr], t3
    andp MarkedBlockMask, t3
    loadp MarkedBlock::m_vm[t3], t3
    btiz VM::m_exception[t3], .noException
    jmp label
.noException:
end


# Instruction implementations

_llint_op_enter:
    traceExecution()
    checkStackPointerAlignment(t2, 0xdead00e1)
    loadp CodeBlock[cfr], t2                // t2<CodeBlock> = cfr.CodeBlock
    loadi CodeBlock::m_numVars[t2], t2      // t2<size_t> = t2<CodeBlock>.m_numVars
    btiz t2, .opEnterDone
    move UndefinedTag, t0
    move 0, t1
    negi t2
.opEnterLoop:
    storei t0, TagOffset[cfr, t2, 8]
    storei t1, PayloadOffset[cfr, t2, 8]
    addi 1, t2
    btinz t2, .opEnterLoop
.opEnterDone:
    callOpcodeSlowPath(_slow_path_enter)
    dispatch(constexpr op_enter_length)


_llint_op_get_argument:
    traceExecution()
    loadisFromInstruction(1, t1)
    loadisFromInstruction(2, t2)
    loadi PayloadOffset + ArgumentCount[cfr], t0
    bilteq t0, t2, .opGetArgumentOutOfBounds
    loadi ThisArgumentOffset + TagOffset[cfr, t2, 8], t0
    loadi ThisArgumentOffset + PayloadOffset[cfr, t2, 8], t3
    storei t0, TagOffset[cfr, t1, 8]
    storei t3, PayloadOffset[cfr, t1, 8]
    valueProfile(t0, t3, 12, t1)
    dispatch(constexpr op_get_argument_length)

.opGetArgumentOutOfBounds:
    storei UndefinedTag, TagOffset[cfr, t1, 8]
    storei 0, PayloadOffset[cfr, t1, 8]
    valueProfile(UndefinedTag, 0, 12, t1)
    dispatch(constexpr op_get_argument_length)


_llint_op_argument_count:
    traceExecution()
    loadisFromInstruction(1, t2)
    loadi PayloadOffset + ArgumentCount[cfr], t0
    subi 1, t0
    move Int32Tag, t1
    storei t1, TagOffset[cfr, t2, 8]
    storei t0, PayloadOffset[cfr, t2, 8]
    dispatch(constexpr op_argument_count_length)


_llint_op_get_scope:
    traceExecution()
    loadi Callee + PayloadOffset[cfr], t0
    loadi JSCallee::m_scope[t0], t0
    loadisFromInstruction(1, t1)
    storei CellTag, TagOffset[cfr, t1, 8]
    storei t0, PayloadOffset[cfr, t1, 8]
    dispatch(constexpr op_get_scope_length)


_llint_op_to_this:
    traceExecution()
    loadi 4[PC], t0
    bineq TagOffset[cfr, t0, 8], CellTag, .opToThisSlow
    loadi PayloadOffset[cfr, t0, 8], t0
    bbneq JSCell::m_type[t0], FinalObjectType, .opToThisSlow
    loadpFromInstruction(2, t2)
    bpneq JSCell::m_structureID[t0], t2, .opToThisSlow
    dispatch(constexpr op_to_this_length)

.opToThisSlow:
    callOpcodeSlowPath(_slow_path_to_this)
    dispatch(constexpr op_to_this_length)


_llint_op_check_tdz:
    traceExecution()
    loadisFromInstruction(1, t0)
    loadConstantOrVariableTag(t0, t1)
    bineq t1, EmptyValueTag, .opNotTDZ
    callOpcodeSlowPath(_slow_path_throw_tdz_error)

.opNotTDZ:
    dispatch(constexpr op_check_tdz_length)


_llint_op_mov:
    traceExecution()
    loadi 8[PC], t1
    loadi 4[PC], t0
    loadConstantOrVariable(t1, t2, t3)
    storei t2, TagOffset[cfr, t0, 8]
    storei t3, PayloadOffset[cfr, t0, 8]
    dispatch(constexpr op_mov_length)


_llint_op_not:
    traceExecution()
    loadi 8[PC], t0
    loadi 4[PC], t1
    loadConstantOrVariable(t0, t2, t3)
    bineq t2, BooleanTag, .opNotSlow
    xori 1, t3
    storei t2, TagOffset[cfr, t1, 8]
    storei t3, PayloadOffset[cfr, t1, 8]
    dispatch(constexpr op_not_length)

.opNotSlow:
    callOpcodeSlowPath(_slow_path_not)
    dispatch(constexpr op_not_length)


_llint_op_eq:
    traceExecution()
    loadi 12[PC], t2
    loadi 8[PC], t0
    loadConstantOrVariable(t2, t3, t1)
    loadConstantOrVariable2Reg(t0, t2, t0)
    bineq t2, t3, .opEqSlow
    bieq t2, CellTag, .opEqSlow
    bib t2, LowestTag, .opEqSlow
    loadi 4[PC], t2
    cieq t0, t1, t0
    storei BooleanTag, TagOffset[cfr, t2, 8]
    storei t0, PayloadOffset[cfr, t2, 8]
    dispatch(constexpr op_eq_length)

.opEqSlow:
    callOpcodeSlowPath(_slow_path_eq)
    dispatch(constexpr op_eq_length)


_llint_op_eq_null:
    traceExecution()
    loadi 8[PC], t0
    loadi 4[PC], t3
    assertNotConstant(t0)
    loadi TagOffset[cfr, t0, 8], t1
    loadi PayloadOffset[cfr, t0, 8], t0
    bineq t1, CellTag, .opEqNullImmediate
    btbnz JSCell::m_flags[t0], MasqueradesAsUndefined, .opEqNullMasqueradesAsUndefined
    move 0, t1
    jmp .opEqNullNotImmediate
.opEqNullMasqueradesAsUndefined:
    loadp JSCell::m_structureID[t0], t1
    loadp CodeBlock[cfr], t0
    loadp CodeBlock::m_globalObject[t0], t0
    cpeq Structure::m_globalObject[t1], t0, t1
    jmp .opEqNullNotImmediate
.opEqNullImmediate:
    cieq t1, NullTag, t2
    cieq t1, UndefinedTag, t1
    ori t2, t1
.opEqNullNotImmediate:
    storei BooleanTag, TagOffset[cfr, t3, 8]
    storei t1, PayloadOffset[cfr, t3, 8]
    dispatch(constexpr op_eq_null_length)


_llint_op_neq:
    traceExecution()
    loadi 12[PC], t2
    loadi 8[PC], t0
    loadConstantOrVariable(t2, t3, t1)
    loadConstantOrVariable2Reg(t0, t2, t0)
    bineq t2, t3, .opNeqSlow
    bieq t2, CellTag, .opNeqSlow
    bib t2, LowestTag, .opNeqSlow
    loadi 4[PC], t2
    cineq t0, t1, t0
    storei BooleanTag, TagOffset[cfr, t2, 8]
    storei t0, PayloadOffset[cfr, t2, 8]
    dispatch(constexpr op_neq_length)

.opNeqSlow:
    callOpcodeSlowPath(_slow_path_neq)
    dispatch(constexpr op_neq_length)
    

_llint_op_neq_null:
    traceExecution()
    loadi 8[PC], t0
    loadi 4[PC], t3
    assertNotConstant(t0)
    loadi TagOffset[cfr, t0, 8], t1
    loadi PayloadOffset[cfr, t0, 8], t0
    bineq t1, CellTag, .opNeqNullImmediate
    btbnz JSCell::m_flags[t0], MasqueradesAsUndefined, .opNeqNullMasqueradesAsUndefined
    move 1, t1
    jmp .opNeqNullNotImmediate
.opNeqNullMasqueradesAsUndefined:
    loadp JSCell::m_structureID[t0], t1
    loadp CodeBlock[cfr], t0
    loadp CodeBlock::m_globalObject[t0], t0
    cpneq Structure::m_globalObject[t1], t0, t1
    jmp .opNeqNullNotImmediate
.opNeqNullImmediate:
    cineq t1, NullTag, t2
    cineq t1, UndefinedTag, t1
    andi t2, t1
.opNeqNullNotImmediate:
    storei BooleanTag, TagOffset[cfr, t3, 8]
    storei t1, PayloadOffset[cfr, t3, 8]
    dispatch(constexpr op_neq_null_length)


macro strictEq(equalityOperation, slowPath)
    loadi 12[PC], t2
    loadi 8[PC], t0
    loadConstantOrVariable(t2, t3, t1)
    loadConstantOrVariable2Reg(t0, t2, t0)
    bineq t2, t3, .slow
    bib t2, LowestTag, .slow
    bineq t2, CellTag, .notStringOrSymbol
    bbaeq JSCell::m_type[t0], ObjectType, .notStringOrSymbol
    bbb JSCell::m_type[t1], ObjectType, .slow
.notStringOrSymbol:
    loadi 4[PC], t2
    equalityOperation(t0, t1, t0)
    storei BooleanTag, TagOffset[cfr, t2, 8]
    storei t0, PayloadOffset[cfr, t2, 8]
    dispatch(4)

.slow:
    callOpcodeSlowPath(slowPath)
    dispatch(4)
end

_llint_op_stricteq:
    traceExecution()
    strictEq(macro (left, right, result) cieq left, right, result end, _slow_path_stricteq)


_llint_op_nstricteq:
    traceExecution()
    strictEq(macro (left, right, result) cineq left, right, result end, _slow_path_nstricteq)


_llint_op_inc:
    traceExecution()
    loadi 4[PC], t0
    bineq TagOffset[cfr, t0, 8], Int32Tag, .opIncSlow
    loadi PayloadOffset[cfr, t0, 8], t1
    baddio 1, t1, .opIncSlow
    storei t1, PayloadOffset[cfr, t0, 8]
    dispatch(constexpr op_inc_length)

.opIncSlow:
    callOpcodeSlowPath(_slow_path_inc)
    dispatch(constexpr op_inc_length)


_llint_op_dec:
    traceExecution()
    loadi 4[PC], t0
    bineq TagOffset[cfr, t0, 8], Int32Tag, .opDecSlow
    loadi PayloadOffset[cfr, t0, 8], t1
    bsubio 1, t1, .opDecSlow
    storei t1, PayloadOffset[cfr, t0, 8]
    dispatch(constexpr op_dec_length)

.opDecSlow:
    callOpcodeSlowPath(_slow_path_dec)
    dispatch(constexpr op_dec_length)


_llint_op_to_number:
    traceExecution()
    loadi 8[PC], t0
    loadi 4[PC], t1
    loadConstantOrVariable(t0, t2, t3)
    bieq t2, Int32Tag, .opToNumberIsInt
    biaeq t2, LowestTag, .opToNumberSlow
.opToNumberIsInt:
    storei t2, TagOffset[cfr, t1, 8]
    storei t3, PayloadOffset[cfr, t1, 8]
    valueProfile(t2, t3, 12, t1)
    dispatch(constexpr op_to_number_length)

.opToNumberSlow:
    callOpcodeSlowPath(_slow_path_to_number)
    dispatch(constexpr op_to_number_length)


_llint_op_to_string:
    traceExecution()
    loadi 8[PC], t0
    loadi 4[PC], t1
    loadConstantOrVariable(t0, t2, t3)
    bineq t2, CellTag, .opToStringSlow
    bbneq JSCell::m_type[t3], StringType, .opToStringSlow
.opToStringIsString:
    storei t2, TagOffset[cfr, t1, 8]
    storei t3, PayloadOffset[cfr, t1, 8]
    dispatch(constexpr op_to_string_length)

.opToStringSlow:
    callOpcodeSlowPath(_slow_path_to_string)
    dispatch(constexpr op_to_string_length)


_llint_op_negate:
    traceExecution()
    loadi 8[PC], t0
    loadi 4[PC], t3
    loadConstantOrVariable(t0, t1, t2)
    loadisFromInstruction(3, t0)
    bineq t1, Int32Tag, .opNegateSrcNotInt
    btiz t2, 0x7fffffff, .opNegateSlow
    negi t2
    ori ArithProfileInt, t0
    storei Int32Tag, TagOffset[cfr, t3, 8]
    storeisToInstruction(t0, 3)
    storei t2, PayloadOffset[cfr, t3, 8]
    dispatch(constexpr op_negate_length)
.opNegateSrcNotInt:
    bia t1, LowestTag, .opNegateSlow
    xori 0x80000000, t1
    ori ArithProfileNumber, t0
    storei t2, PayloadOffset[cfr, t3, 8]
    storeisToInstruction(t0, 3)
    storei t1, TagOffset[cfr, t3, 8]
    dispatch(constexpr op_negate_length)

.opNegateSlow:
    callOpcodeSlowPath(_slow_path_negate)
    dispatch(constexpr op_negate_length)


macro binaryOpCustomStore(integerOperationAndStore, doubleOperation, slowPath)
    loadi 12[PC], t2
    loadi 8[PC], t0
    loadConstantOrVariable(t2, t3, t1)
    loadConstantOrVariable2Reg(t0, t2, t0)
    bineq t2, Int32Tag, .op1NotInt
    bineq t3, Int32Tag, .op2NotInt
    loadisFromInstruction(4, t5)
    ori ArithProfileIntInt, t5
    storeisToInstruction(t5, 4)
    loadi 4[PC], t2
    integerOperationAndStore(t3, t1, t0, .slow, t2)
    dispatch(5)

.op1NotInt:
    # First operand is definitely not an int, the second operand could be anything.
    bia t2, LowestTag, .slow
    bib t3, LowestTag, .op1NotIntOp2Double
    bineq t3, Int32Tag, .slow
    loadisFromInstruction(4, t5)
    ori ArithProfileNumberInt, t5
    storeisToInstruction(t5, 4)
    ci2d t1, ft1
    jmp .op1NotIntReady
.op1NotIntOp2Double:
    fii2d t1, t3, ft1
    loadisFromInstruction(4, t5)
    ori ArithProfileNumberNumber, t5
    storeisToInstruction(t5, 4)
.op1NotIntReady:
    loadi 4[PC], t1
    fii2d t0, t2, ft0
    doubleOperation(ft1, ft0)
    stored ft0, [cfr, t1, 8]
    dispatch(5)

.op2NotInt:
    # First operand is definitely an int, the second operand is definitely not.
    loadi 4[PC], t2
    bia t3, LowestTag, .slow
    loadisFromInstruction(4, t5)
    ori ArithProfileIntNumber, t5
    storeisToInstruction(t5, 4)
    ci2d t0, ft0
    fii2d t1, t3, ft1
    doubleOperation(ft1, ft0)
    stored ft0, [cfr, t2, 8]
    dispatch(5)

.slow:
    callOpcodeSlowPath(slowPath)
    dispatch(5)
end

macro binaryOp(integerOperation, doubleOperation, slowPath)
    binaryOpCustomStore(
        macro (int32Tag, left, right, slow, index)
            integerOperation(left, right, slow)
            storei int32Tag, TagOffset[cfr, index, 8]
            storei right, PayloadOffset[cfr, index, 8]
        end,
        doubleOperation, slowPath)
end

_llint_op_add:
    traceExecution()
    binaryOp(
        macro (left, right, slow) baddio left, right, slow end,
        macro (left, right) addd left, right end,
        _slow_path_add)


_llint_op_mul:
    traceExecution()
    binaryOpCustomStore(
        macro (int32Tag, left, right, slow, index)
            const scratch = int32Tag   # We know that we can reuse the int32Tag register since it has a constant.
            move right, scratch
            bmulio left, scratch, slow
            btinz scratch, .done
            bilt left, 0, slow
            bilt right, 0, slow
        .done:
            storei Int32Tag, TagOffset[cfr, index, 8]
            storei scratch, PayloadOffset[cfr, index, 8]
        end,
        macro (left, right) muld left, right end,
        _slow_path_mul)


_llint_op_sub:
    traceExecution()
    binaryOp(
        macro (left, right, slow) bsubio left, right, slow end,
        macro (left, right) subd left, right end,
        _slow_path_sub)


_llint_op_div:
    traceExecution()
    binaryOpCustomStore(
        macro (int32Tag, left, right, slow, index)
            ci2d left, ft0
            ci2d right, ft1
            divd ft0, ft1
            bcd2i ft1, right, .notInt
            storei int32Tag, TagOffset[cfr, index, 8]
            storei right, PayloadOffset[cfr, index, 8]
            jmp .done
        .notInt:
            stored ft1, [cfr, index, 8]
        .done:
        end,
        macro (left, right) divd left, right end,
        _slow_path_div)


macro bitOp(operation, slowPath, advance)
    loadi 12[PC], t2
    loadi 8[PC], t0
    loadConstantOrVariable(t2, t3, t1)
    loadConstantOrVariable2Reg(t0, t2, t0)
    bineq t3, Int32Tag, .slow
    bineq t2, Int32Tag, .slow
    loadi 4[PC], t2
    operation(t1, t0)
    storei t3, TagOffset[cfr, t2, 8]
    storei t0, PayloadOffset[cfr, t2, 8]
    dispatch(advance)

.slow:
    callOpcodeSlowPath(slowPath)
    dispatch(advance)
end

_llint_op_lshift:
    traceExecution()
    bitOp(
        macro (left, right) lshifti left, right end,
        _slow_path_lshift,
        constexpr op_lshift_length)


_llint_op_rshift:
    traceExecution()
    bitOp(
        macro (left, right) rshifti left, right end,
        _slow_path_rshift,
        constexpr op_rshift_length)


_llint_op_urshift:
    traceExecution()
    bitOp(
        macro (left, right) urshifti left, right end,
        _slow_path_urshift,
        constexpr op_urshift_length)


_llint_op_unsigned:
    traceExecution()
    loadi 4[PC], t0
    loadi 8[PC], t1
    loadConstantOrVariablePayload(t1, Int32Tag, t2, .opUnsignedSlow)
    bilt t2, 0, .opUnsignedSlow
    storei t2, PayloadOffset[cfr, t0, 8]
    storei Int32Tag, TagOffset[cfr, t0, 8]
    dispatch(constexpr op_unsigned_length)
.opUnsignedSlow:
    callOpcodeSlowPath(_slow_path_unsigned)
    dispatch(constexpr op_unsigned_length)


_llint_op_bitand:
    traceExecution()
    bitOp(
        macro (left, right) andi left, right end,
        _slow_path_bitand,
        constexpr op_bitand_length)


_llint_op_bitxor:
    traceExecution()
    bitOp(
        macro (left, right) xori left, right end,
        _slow_path_bitxor,
        constexpr op_bitxor_length)


_llint_op_bitor:
    traceExecution()
    bitOp(
        macro (left, right) ori left, right end,
        _slow_path_bitor,
        constexpr op_bitor_length)


_llint_op_overrides_has_instance:
    traceExecution()

    loadisFromInstruction(1, t3)
    storei BooleanTag, TagOffset[cfr, t3, 8]

    # First check if hasInstanceValue is the one on Function.prototype[Symbol.hasInstance]
    loadisFromInstruction(3, t0)
    loadConstantOrVariablePayload(t0, CellTag, t2, .opOverrideshasInstanceValueNotCell)
    loadConstantOrVariable(t0, t1, t2)
    bineq t1, CellTag, .opOverrideshasInstanceValueNotCell

    # We don't need hasInstanceValue's tag register anymore.
    loadp CodeBlock[cfr], t1
    loadp CodeBlock::m_globalObject[t1], t1
    loadp JSGlobalObject::m_functionProtoHasInstanceSymbolFunction[t1], t1
    bineq t1, t2, .opOverrideshasInstanceValueNotDefault

    # We know the constructor is a cell.
    loadisFromInstruction(2, t0)
    loadConstantOrVariablePayloadUnchecked(t0, t1)
    tbz JSCell::m_flags[t1], ImplementsDefaultHasInstance, t0
    storei t0, PayloadOffset[cfr, t3, 8]
    dispatch(constexpr op_overrides_has_instance_length)

.opOverrideshasInstanceValueNotCell:
.opOverrideshasInstanceValueNotDefault:
    storei 1, PayloadOffset[cfr, t3, 8]
    dispatch(constexpr op_overrides_has_instance_length)

_llint_op_instanceof_custom:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_instanceof_custom)
    dispatch(constexpr op_instanceof_custom_length)


_llint_op_is_empty:
    traceExecution()
    loadi 8[PC], t1
    loadi 4[PC], t0
    loadConstantOrVariable(t1, t2, t3)
    cieq t2, EmptyValueTag, t3
    storei BooleanTag, TagOffset[cfr, t0, 8]
    storei t3, PayloadOffset[cfr, t0, 8]
    dispatch(constexpr op_is_empty_length)


_llint_op_is_undefined:
    traceExecution()
    loadi 8[PC], t1
    loadi 4[PC], t0
    loadConstantOrVariable(t1, t2, t3)
    storei BooleanTag, TagOffset[cfr, t0, 8]
    bieq t2, CellTag, .opIsUndefinedCell
    cieq t2, UndefinedTag, t3
    storei t3, PayloadOffset[cfr, t0, 8]
    dispatch(constexpr op_is_undefined_length)
.opIsUndefinedCell:
    btbnz JSCell::m_flags[t3], MasqueradesAsUndefined, .opIsUndefinedMasqueradesAsUndefined
    move 0, t1
    storei t1, PayloadOffset[cfr, t0, 8]
    dispatch(constexpr op_is_undefined_length)
.opIsUndefinedMasqueradesAsUndefined:
    loadp JSCell::m_structureID[t3], t1
    loadp CodeBlock[cfr], t3
    loadp CodeBlock::m_globalObject[t3], t3
    cpeq Structure::m_globalObject[t1], t3, t1
    storei t1, PayloadOffset[cfr, t0, 8]
    dispatch(constexpr op_is_undefined_length)


_llint_op_is_boolean:
    traceExecution()
    loadi 8[PC], t1
    loadi 4[PC], t2
    loadConstantOrVariableTag(t1, t0)
    cieq t0, BooleanTag, t0
    storei BooleanTag, TagOffset[cfr, t2, 8]
    storei t0, PayloadOffset[cfr, t2, 8]
    dispatch(constexpr op_is_boolean_length)


_llint_op_is_number:
    traceExecution()
    loadi 8[PC], t1
    loadi 4[PC], t2
    loadConstantOrVariableTag(t1, t0)
    storei BooleanTag, TagOffset[cfr, t2, 8]
    addi 1, t0
    cib t0, LowestTag + 1, t1
    storei t1, PayloadOffset[cfr, t2, 8]
    dispatch(constexpr op_is_number_length)


_llint_op_is_cell_with_type:
    traceExecution()
    loadi 8[PC], t1
    loadi 4[PC], t2
    loadConstantOrVariable(t1, t0, t3)
    storei BooleanTag, TagOffset[cfr, t2, 8]
    bineq t0, CellTag, .notCellCase
    loadi 12[PC], t0
    cbeq JSCell::m_type[t3], t0, t1
    storei t1, PayloadOffset[cfr, t2, 8]
    dispatch(constexpr op_is_cell_with_type_length)
.notCellCase:
    storep 0, PayloadOffset[cfr, t2, 8]
    dispatch(constexpr op_is_cell_with_type_length)


_llint_op_is_object:
    traceExecution()
    loadi 8[PC], t1
    loadi 4[PC], t2
    loadConstantOrVariable(t1, t0, t3)
    storei BooleanTag, TagOffset[cfr, t2, 8]
    bineq t0, CellTag, .opIsObjectNotCell
    cbaeq JSCell::m_type[t3], ObjectType, t1
    storei t1, PayloadOffset[cfr, t2, 8]
    dispatch(constexpr op_is_object_length)
.opIsObjectNotCell:
    storep 0, PayloadOffset[cfr, t2, 8]
    dispatch(constexpr op_is_object_length)


macro loadPropertyAtVariableOffsetKnownNotInline(propertyOffset, objectAndStorage, tag, payload)
    assert(macro (ok) bigteq propertyOffset, firstOutOfLineOffset, ok end)
    negi propertyOffset
    loadp JSObject::m_butterfly[objectAndStorage], objectAndStorage
    loadi TagOffset + (firstOutOfLineOffset - 2) * 8[objectAndStorage, propertyOffset, 8], tag
    loadi PayloadOffset + (firstOutOfLineOffset - 2) * 8[objectAndStorage, propertyOffset, 8], payload
end

macro loadPropertyAtVariableOffset(propertyOffset, objectAndStorage, tag, payload)
    bilt propertyOffset, firstOutOfLineOffset, .isInline
    loadp JSObject::m_butterfly[objectAndStorage], objectAndStorage
    negi propertyOffset
    jmp .ready
.isInline:
    addp sizeof JSObject - (firstOutOfLineOffset - 2) * 8, objectAndStorage
.ready:
    loadi TagOffset + (firstOutOfLineOffset - 2) * 8[objectAndStorage, propertyOffset, 8], tag
    loadi PayloadOffset + (firstOutOfLineOffset - 2) * 8[objectAndStorage, propertyOffset, 8], payload
end

macro storePropertyAtVariableOffset(propertyOffsetAsInt, objectAndStorage, tag, payload)
    bilt propertyOffsetAsInt, firstOutOfLineOffset, .isInline
    loadp JSObject::m_butterfly[objectAndStorage], objectAndStorage
    negi propertyOffsetAsInt
    jmp .ready
.isInline:
    addp sizeof JSObject - (firstOutOfLineOffset - 2) * 8, objectAndStorage
.ready:
    storei tag, TagOffset + (firstOutOfLineOffset - 2) * 8[objectAndStorage, propertyOffsetAsInt, 8]
    storei payload, PayloadOffset + (firstOutOfLineOffset - 2) * 8[objectAndStorage, propertyOffsetAsInt, 8]
end


# We only do monomorphic get_by_id caching for now, and we do not modify the
# opcode for own properties. We also allow for the cache to change anytime it fails,
# since ping-ponging is free. At best we get lucky and the get_by_id will continue
# to take fast path on the new cache. At worst we take slow path, which is what
# we would have been doing anyway. For prototype/unset properties, we will attempt to
# convert opcode into a get_by_id_proto_load/get_by_id_unset, respectively, after an
# execution counter hits zero.

_llint_op_get_by_id:
    traceExecution()
    loadi 8[PC], t0
    loadi 16[PC], t1
    loadConstantOrVariablePayload(t0, CellTag, t3, .opGetByIdSlow)
    loadi 20[PC], t2
    bineq JSCell::m_structureID[t3], t1, .opGetByIdSlow
    loadPropertyAtVariableOffset(t2, t3, t0, t1)
    loadi 4[PC], t2
    storei t0, TagOffset[cfr, t2, 8]
    storei t1, PayloadOffset[cfr, t2, 8]
    valueProfile(t0, t1, 32, t2)
    dispatch(constexpr op_get_by_id_length)

.opGetByIdSlow:
    callOpcodeSlowPath(_llint_slow_path_get_by_id)
    dispatch(constexpr op_get_by_id_length)


_llint_op_get_by_id_proto_load:
    traceExecution()
    loadi 8[PC], t0
    loadi 16[PC], t1
    loadConstantOrVariablePayload(t0, CellTag, t3, .opGetByIdProtoSlow)
    loadi 20[PC], t2
    bineq JSCell::m_structureID[t3], t1, .opGetByIdProtoSlow
    loadpFromInstruction(6, t3)
    loadPropertyAtVariableOffset(t2, t3, t0, t1)
    loadi 4[PC], t2
    storei t0, TagOffset[cfr, t2, 8]
    storei t1, PayloadOffset[cfr, t2, 8]
    valueProfile(t0, t1, 32, t2)
    dispatch(constexpr op_get_by_id_proto_load_length)

.opGetByIdProtoSlow:
    callOpcodeSlowPath(_llint_slow_path_get_by_id)
    dispatch(constexpr op_get_by_id_proto_load_length)


_llint_op_get_by_id_unset:
    traceExecution()
    loadi 8[PC], t0
    loadi 16[PC], t1
    loadConstantOrVariablePayload(t0, CellTag, t3, .opGetByIdUnsetSlow)
    bineq JSCell::m_structureID[t3], t1, .opGetByIdUnsetSlow
    loadi 4[PC], t2
    storei UndefinedTag, TagOffset[cfr, t2, 8]
    storei 0, PayloadOffset[cfr, t2, 8]
    valueProfile(UndefinedTag, 0, 32, t2)
    dispatch(constexpr op_get_by_id_unset_length)

.opGetByIdUnsetSlow:
    callOpcodeSlowPath(_llint_slow_path_get_by_id)
    dispatch(constexpr op_get_by_id_unset_length)


_llint_op_get_array_length:
    traceExecution()
    loadi 8[PC], t0
    loadp 16[PC], t1
    loadConstantOrVariablePayload(t0, CellTag, t3, .opGetArrayLengthSlow)
    move t3, t2
    arrayProfile(t2, t1, t0)
    btiz t2, IsArray, .opGetArrayLengthSlow
    btiz t2, IndexingShapeMask, .opGetArrayLengthSlow
    loadi 4[PC], t1
    loadp JSObject::m_butterfly[t3], t0
    loadi -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t0], t0
    bilt t0, 0, .opGetArrayLengthSlow
    valueProfile(Int32Tag, t0, 32, t2)
    storep t0, PayloadOffset[cfr, t1, 8]
    storep Int32Tag, TagOffset[cfr, t1, 8]
    dispatch(constexpr op_get_array_length_length)

.opGetArrayLengthSlow:
    callOpcodeSlowPath(_llint_slow_path_get_by_id)
    dispatch(constexpr op_get_array_length_length)


_llint_op_put_by_id:
    traceExecution()
    writeBarrierOnOperands(1, 3)
    loadi 4[PC], t3
    loadConstantOrVariablePayload(t3, CellTag, t0, .opPutByIdSlow)
    loadi JSCell::m_structureID[t0], t2
    bineq t2, 16[PC], .opPutByIdSlow

    # At this point, we have:
    # t2 -> currentStructureID
    # t0 -> object base
    # We will lose currentStructureID in the shenanigans below.

    loadi 12[PC], t1
    loadConstantOrVariable(t1, t2, t3)
    loadi 32[PC], t1

    # At this point, we have:
    # t0 -> object base
    # t1 -> put by id flags
    # t2 -> value tag
    # t3 -> value payload

    btinz t1, PutByIdPrimaryTypeMask, .opPutByIdTypeCheckObjectWithStructureOrOther

    # We have one of the non-structure type checks. Find out which one.
    andi PutByIdSecondaryTypeMask, t1
    bilt t1, PutByIdSecondaryTypeString, .opPutByIdTypeCheckLessThanString

    # We are one of the following: String, Symbol, Object, ObjectOrOther, Top
    bilt t1, PutByIdSecondaryTypeObjectOrOther, .opPutByIdTypeCheckLessThanObjectOrOther

    # We are either ObjectOrOther or Top.
    bieq t1, PutByIdSecondaryTypeTop, .opPutByIdDoneCheckingTypes

    # Check if we are ObjectOrOther.
    bieq t2, CellTag, .opPutByIdTypeCheckObject
.opPutByIdTypeCheckOther:
    bieq t2, NullTag, .opPutByIdDoneCheckingTypes
    bieq t2, UndefinedTag, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow

.opPutByIdTypeCheckLessThanObjectOrOther:
    # We are either String, Symbol or Object.
    bineq t2, CellTag, .opPutByIdSlow
    bieq t1, PutByIdSecondaryTypeObject, .opPutByIdTypeCheckObject
    bieq t1, PutByIdSecondaryTypeSymbol, .opPutByIdTypeCheckSymbol
    bbeq JSCell::m_type[t3], StringType, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow
.opPutByIdTypeCheckObject:
    bbaeq JSCell::m_type[t3], ObjectType, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow
.opPutByIdTypeCheckSymbol:
    bbeq JSCell::m_type[t3], SymbolType, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow

.opPutByIdTypeCheckLessThanString:
    # We are one of the following: Bottom, Boolean, Other, Int32, Number.
    bilt t1, PutByIdSecondaryTypeInt32, .opPutByIdTypeCheckLessThanInt32

    # We are either Int32 or Number.
    bieq t1, PutByIdSecondaryTypeNumber, .opPutByIdTypeCheckNumber

    bieq t2, Int32Tag, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow

.opPutByIdTypeCheckNumber:
    bib t2, LowestTag + 1, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow

.opPutByIdTypeCheckLessThanInt32:
    # We are one of the following: Bottom, Boolean, Other
    bineq t1, PutByIdSecondaryTypeBoolean, .opPutByIdTypeCheckBottomOrOther
    bieq t2, BooleanTag, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow

.opPutByIdTypeCheckBottomOrOther:
    bieq t1, PutByIdSecondaryTypeOther, .opPutByIdTypeCheckOther
    jmp .opPutByIdSlow

.opPutByIdTypeCheckObjectWithStructureOrOther:
    bieq t2, CellTag, .opPutByIdTypeCheckObjectWithStructure
    btinz t1, PutByIdPrimaryTypeObjectWithStructureOrOther, .opPutByIdTypeCheckOther
    jmp .opPutByIdSlow

.opPutByIdTypeCheckObjectWithStructure:
    andi PutByIdSecondaryTypeMask, t1
    bineq t1, JSCell::m_structureID[t3], .opPutByIdSlow

.opPutByIdDoneCheckingTypes:
    loadi 24[PC], t1

    btiz t1, .opPutByIdNotTransition

    # This is the transition case. t1 holds the new Structure*. If we have a chain, we need to
    # check it. t0 is the base. We may clobber t1 to use it as scratch.
    loadp 28[PC], t3
    btpz t3, .opPutByIdTransitionDirect

    loadi 16[PC], t2 # Need old structure again.
    loadp StructureChain::m_vector[t3], t3
    assert(macro (ok) btpnz t3, ok end)

    loadp Structure::m_prototype[t2], t2
    btpz t2, .opPutByIdTransitionChainDone
.opPutByIdTransitionChainLoop:
    loadp [t3], t1
    bpneq t1, JSCell::m_structureID[t2], .opPutByIdSlow
    addp 4, t3
    loadp Structure::m_prototype[t1], t2
    btpnz t2, .opPutByIdTransitionChainLoop

.opPutByIdTransitionChainDone:
    loadi 24[PC], t1

.opPutByIdTransitionDirect:
    storei t1, JSCell::m_structureID[t0]
    loadi 12[PC], t1
    loadConstantOrVariable(t1, t2, t3)
    loadi 20[PC], t1
    storePropertyAtVariableOffset(t1, t0, t2, t3)
    writeBarrierOnOperand(1)
    dispatch(constexpr op_put_by_id_length)

.opPutByIdNotTransition:
    # The only thing live right now is t0, which holds the base.
    loadi 12[PC], t1
    loadConstantOrVariable(t1, t2, t3)
    loadi 20[PC], t1
    storePropertyAtVariableOffset(t1, t0, t2, t3)
    dispatch(constexpr op_put_by_id_length)

.opPutByIdSlow:
    callOpcodeSlowPath(_llint_slow_path_put_by_id)
    dispatch(constexpr op_put_by_id_length)


_llint_op_get_by_val:
    traceExecution()
    loadi 8[PC], t2
    loadConstantOrVariablePayload(t2, CellTag, t0, .opGetByValSlow)
    move t0, t2
    loadp 16[PC], t3
    arrayProfile(t2, t3, t1)
    loadi 12[PC], t3
    loadConstantOrVariablePayload(t3, Int32Tag, t1, .opGetByValSlow)
    loadp JSObject::m_butterfly[t0], t3
    andi IndexingShapeMask, t2
    bieq t2, Int32Shape, .opGetByValIsContiguous
    bineq t2, ContiguousShape, .opGetByValNotContiguous
.opGetByValIsContiguous:
    
    biaeq t1, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t3], .opGetByValOutOfBounds
    loadi TagOffset[t3, t1, 8], t2
    loadi PayloadOffset[t3, t1, 8], t1
    jmp .opGetByValDone

.opGetByValNotContiguous:
    bineq t2, DoubleShape, .opGetByValNotDouble
    biaeq t1, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t3], .opGetByValOutOfBounds
    loadd [t3, t1, 8], ft0
    bdnequn ft0, ft0, .opGetByValSlow
    # FIXME: This could be massively optimized.
    fd2ii ft0, t1, t2
    loadi 4[PC], t0
    jmp .opGetByValNotEmpty

.opGetByValNotDouble:
    subi ArrayStorageShape, t2
    bia t2, SlowPutArrayStorageShape - ArrayStorageShape, .opGetByValSlow
    biaeq t1, -sizeof IndexingHeader + IndexingHeader::u.lengths.vectorLength[t3], .opGetByValOutOfBounds
    loadi ArrayStorage::m_vector + TagOffset[t3, t1, 8], t2
    loadi ArrayStorage::m_vector + PayloadOffset[t3, t1, 8], t1

.opGetByValDone:
    loadi 4[PC], t0
    bieq t2, EmptyValueTag, .opGetByValOutOfBounds
.opGetByValNotEmpty:
    storei t2, TagOffset[cfr, t0, 8]
    storei t1, PayloadOffset[cfr, t0, 8]
    valueProfile(t2, t1, 20, t0)
    dispatch(constexpr op_get_by_val_length)

.opGetByValOutOfBounds:
    loadpFromInstruction(4, t0)
    storeb 1, ArrayProfile::m_outOfBounds[t0]
.opGetByValSlow:
    callOpcodeSlowPath(_llint_slow_path_get_by_val)
    dispatch(constexpr op_get_by_val_length)


macro contiguousPutByVal(storeCallback)
    biaeq t3, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t0], .outOfBounds
.storeResult:
    loadi 12[PC], t2
    storeCallback(t2, t1, t0, t3)
    dispatch(5)

.outOfBounds:
    biaeq t3, -sizeof IndexingHeader + IndexingHeader::u.lengths.vectorLength[t0], .opPutByValOutOfBounds
    loadp 16[PC], t2
    storeb 1, ArrayProfile::m_mayStoreToHole[t2]
    addi 1, t3, t2
    storei t2, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t0]
    jmp .storeResult
end

macro putByVal(slowPath)
    traceExecution()
    writeBarrierOnOperands(1, 3)
    loadi 4[PC], t0
    loadConstantOrVariablePayload(t0, CellTag, t1, .opPutByValSlow)
    move t1, t2
    loadp 16[PC], t3
    arrayProfile(t2, t3, t0)
    loadi 8[PC], t0
    loadConstantOrVariablePayload(t0, Int32Tag, t3, .opPutByValSlow)
    loadp JSObject::m_butterfly[t1], t0
    andi IndexingShapeMask, t2
    bineq t2, Int32Shape, .opPutByValNotInt32
    contiguousPutByVal(
        macro (operand, scratch, base, index)
            loadConstantOrVariablePayload(operand, Int32Tag, scratch, .opPutByValSlow)
            storei Int32Tag, TagOffset[base, index, 8]
            storei scratch, PayloadOffset[base, index, 8]
        end)

.opPutByValNotInt32:
    bineq t2, DoubleShape, .opPutByValNotDouble
    contiguousPutByVal(
        macro (operand, scratch, base, index)
            const tag = scratch
            const payload = operand
            loadConstantOrVariable2Reg(operand, tag, payload)
            bineq tag, Int32Tag, .notInt
            ci2d payload, ft0
            jmp .ready
        .notInt:
            fii2d payload, tag, ft0
            bdnequn ft0, ft0, .opPutByValSlow
        .ready:
            stored ft0, [base, index, 8]
        end)

.opPutByValNotDouble:
    bineq t2, ContiguousShape, .opPutByValNotContiguous
    contiguousPutByVal(
        macro (operand, scratch, base, index)
            const tag = scratch
            const payload = operand
            loadConstantOrVariable2Reg(operand, tag, payload)
            storei tag, TagOffset[base, index, 8]
            storei payload, PayloadOffset[base, index, 8]
        end)

.opPutByValNotContiguous:
    bineq t2, ArrayStorageShape, .opPutByValSlow
    biaeq t3, -sizeof IndexingHeader + IndexingHeader::u.lengths.vectorLength[t0], .opPutByValOutOfBounds
    bieq ArrayStorage::m_vector + TagOffset[t0, t3, 8], EmptyValueTag, .opPutByValArrayStorageEmpty
.opPutByValArrayStorageStoreResult:
    loadi 12[PC], t2
    loadConstantOrVariable2Reg(t2, t1, t2)
    storei t1, ArrayStorage::m_vector + TagOffset[t0, t3, 8]
    storei t2, ArrayStorage::m_vector + PayloadOffset[t0, t3, 8]
    dispatch(5)

.opPutByValArrayStorageEmpty:
    loadp 16[PC], t1
    storeb 1, ArrayProfile::m_mayStoreToHole[t1]
    addi 1, ArrayStorage::m_numValuesInVector[t0]
    bib t3, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t0], .opPutByValArrayStorageStoreResult
    addi 1, t3, t1
    storei t1, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t0]
    jmp .opPutByValArrayStorageStoreResult

.opPutByValOutOfBounds:
    loadpFromInstruction(4, t0)
    storeb 1, ArrayProfile::m_outOfBounds[t0]
.opPutByValSlow:
    callOpcodeSlowPath(slowPath)
    dispatch(5)
end

_llint_op_put_by_val:
    putByVal(_llint_slow_path_put_by_val)

_llint_op_put_by_val_direct:
    putByVal(_llint_slow_path_put_by_val_direct)

_llint_op_jmp:
    traceExecution()
    dispatchBranch(4[PC])


macro jumpTrueOrFalse(conditionOp, slow)
    loadi 4[PC], t1
    loadConstantOrVariablePayload(t1, BooleanTag, t0, .slow)
    conditionOp(t0, .target)
    dispatch(3)

.target:
    dispatchBranch(8[PC])

.slow:
    callOpcodeSlowPath(slow)
    dispatch(0)
end


macro equalNull(cellHandler, immediateHandler)
    loadi 4[PC], t0
    assertNotConstant(t0)
    loadi TagOffset[cfr, t0, 8], t1
    loadi PayloadOffset[cfr, t0, 8], t0
    bineq t1, CellTag, .immediate
    loadp JSCell::m_structureID[t0], t2
    cellHandler(t2, JSCell::m_flags[t0], .target)
    dispatch(3)

.target:
    dispatchBranch(8[PC])

.immediate:
    ori 1, t1
    immediateHandler(t1, .target)
    dispatch(3)
end

_llint_op_jeq_null:
    traceExecution()
    equalNull(
        macro (structure, value, target) 
            btbz value, MasqueradesAsUndefined, .opJeqNullNotMasqueradesAsUndefined
            loadp CodeBlock[cfr], t0
            loadp CodeBlock::m_globalObject[t0], t0
            bpeq Structure::m_globalObject[structure], t0, target
.opJeqNullNotMasqueradesAsUndefined:
        end,
        macro (value, target) bieq value, NullTag, target end)
    

_llint_op_jneq_null:
    traceExecution()
    equalNull(
        macro (structure, value, target) 
            btbz value, MasqueradesAsUndefined, target 
            loadp CodeBlock[cfr], t0
            loadp CodeBlock::m_globalObject[t0], t0
            bpneq Structure::m_globalObject[structure], t0, target
        end,
        macro (value, target) bineq value, NullTag, target end)


_llint_op_jneq_ptr:
    traceExecution()
    loadi 4[PC], t0
    loadi 8[PC], t1
    loadp CodeBlock[cfr], t2
    loadp CodeBlock::m_globalObject[t2], t2
    bineq TagOffset[cfr, t0, 8], CellTag, .opJneqPtrBranch
    loadp JSGlobalObject::m_specialPointers[t2, t1, 4], t1
    bpeq PayloadOffset[cfr, t0, 8], t1, .opJneqPtrFallThrough
.opJneqPtrBranch:
    storei 1, 16[PC]
    dispatchBranch(12[PC])
.opJneqPtrFallThrough:
    dispatch(constexpr op_jneq_ptr_length)


macro compare(integerCompare, doubleCompare, slowPath)
    loadi 4[PC], t2
    loadi 8[PC], t3
    loadConstantOrVariable(t2, t0, t1)
    loadConstantOrVariable2Reg(t3, t2, t3)
    bineq t0, Int32Tag, .op1NotInt
    bineq t2, Int32Tag, .op2NotInt
    integerCompare(t1, t3, .jumpTarget)
    dispatch(4)

.op1NotInt:
    bia t0, LowestTag, .slow
    bib t2, LowestTag, .op1NotIntOp2Double
    bineq t2, Int32Tag, .slow
    ci2d t3, ft1
    jmp .op1NotIntReady
.op1NotIntOp2Double:
    fii2d t3, t2, ft1
.op1NotIntReady:
    fii2d t1, t0, ft0
    doubleCompare(ft0, ft1, .jumpTarget)
    dispatch(4)

.op2NotInt:
    ci2d t1, ft0
    bia t2, LowestTag, .slow
    fii2d t3, t2, ft1
    doubleCompare(ft0, ft1, .jumpTarget)
    dispatch(4)

.jumpTarget:
    dispatchBranch(12[PC])

.slow:
    callOpcodeSlowPath(slowPath)
    dispatch(0)
end


_llint_op_switch_imm:
    traceExecution()
    loadi 12[PC], t2
    loadi 4[PC], t3
    loadConstantOrVariable(t2, t1, t0)
    loadp CodeBlock[cfr], t2
    loadp CodeBlock::m_rareData[t2], t2
    muli sizeof SimpleJumpTable, t3   # FIXME: would be nice to peephole this!
    loadp CodeBlock::RareData::m_switchJumpTables + VectorBufferOffset[t2], t2
    addp t3, t2
    bineq t1, Int32Tag, .opSwitchImmNotInt
    subi SimpleJumpTable::min[t2], t0
    biaeq t0, SimpleJumpTable::branchOffsets + VectorSizeOffset[t2], .opSwitchImmFallThrough
    loadp SimpleJumpTable::branchOffsets + VectorBufferOffset[t2], t3
    loadi [t3, t0, 4], t1
    btiz t1, .opSwitchImmFallThrough
    dispatchBranchWithOffset(t1)

.opSwitchImmNotInt:
    bib t1, LowestTag, .opSwitchImmSlow  # Go to slow path if it's a double.
.opSwitchImmFallThrough:
    dispatchBranch(8[PC])

.opSwitchImmSlow:
    callOpcodeSlowPath(_llint_slow_path_switch_imm)
    dispatch(0)


_llint_op_switch_char:
    traceExecution()
    loadi 12[PC], t2
    loadi 4[PC], t3
    loadConstantOrVariable(t2, t1, t0)
    loadp CodeBlock[cfr], t2
    loadp CodeBlock::m_rareData[t2], t2
    muli sizeof SimpleJumpTable, t3
    loadp CodeBlock::RareData::m_switchJumpTables + VectorBufferOffset[t2], t2
    addp t3, t2
    bineq t1, CellTag, .opSwitchCharFallThrough
    bbneq JSCell::m_type[t0], StringType, .opSwitchCharFallThrough
    bineq JSString::m_length[t0], 1, .opSwitchCharFallThrough
    loadp JSString::m_value[t0], t0
    btpz  t0, .opSwitchOnRope
    loadp StringImpl::m_data8[t0], t1
    btinz StringImpl::m_hashAndFlags[t0], HashFlags8BitBuffer, .opSwitchChar8Bit
    loadh [t1], t0
    jmp .opSwitchCharReady
.opSwitchChar8Bit:
    loadb [t1], t0
.opSwitchCharReady:
    subi SimpleJumpTable::min[t2], t0
    biaeq t0, SimpleJumpTable::branchOffsets + VectorSizeOffset[t2], .opSwitchCharFallThrough
    loadp SimpleJumpTable::branchOffsets + VectorBufferOffset[t2], t2
    loadi [t2, t0, 4], t1
    btiz t1, .opSwitchCharFallThrough
    dispatchBranchWithOffset(t1)

.opSwitchCharFallThrough:
    dispatchBranch(8[PC])

.opSwitchOnRope:
    callOpcodeSlowPath(_llint_slow_path_switch_char)
    dispatch(0)


macro arrayProfileForCall()
    loadi 16[PC], t3
    negi t3
    bineq ThisArgumentOffset + TagOffset[cfr, t3, 8], CellTag, .done
    loadi ThisArgumentOffset + PayloadOffset[cfr, t3, 8], t0
    loadp JSCell::m_structureID[t0], t0
    loadpFromInstruction(CallOpCodeSize - 2, t1)
    storep t0, ArrayProfile::m_lastSeenStructureID[t1]
.done:
end

macro doCall(slowPath, prepareCall)
    loadi 8[PC], t0
    loadi 20[PC], t1
    loadp LLIntCallLinkInfo::callee[t1], t2
    loadConstantOrVariablePayload(t0, CellTag, t3, .opCallSlow)
    bineq t3, t2, .opCallSlow
    loadi 16[PC], t3
    lshifti 3, t3
    negi t3
    addp cfr, t3  # t3 contains the new value of cfr
    storei t2, Callee + PayloadOffset[t3]
    loadi 12[PC], t2
    storei PC, ArgumentCount + TagOffset[cfr]
    storei t2, ArgumentCount + PayloadOffset[t3]
    storei CellTag, Callee + TagOffset[t3]
    move t3, sp
    prepareCall(LLIntCallLinkInfo::machineCodeTarget[t1], t2, t3, t4)
    callTargetFunction(LLIntCallLinkInfo::machineCodeTarget[t1])

.opCallSlow:
    slowPathForCall(slowPath, prepareCall)
end

_llint_op_ret:
    traceExecution()
    checkSwitchToJITForEpilogue()
    loadi 4[PC], t2
    loadConstantOrVariable(t2, t1, t0)
    doReturn()


_llint_op_to_primitive:
    traceExecution()
    loadi 8[PC], t2
    loadi 4[PC], t3
    loadConstantOrVariable(t2, t1, t0)
    bineq t1, CellTag, .opToPrimitiveIsImm
    bbaeq JSCell::m_type[t0], ObjectType, .opToPrimitiveSlowCase
.opToPrimitiveIsImm:
    storei t1, TagOffset[cfr, t3, 8]
    storei t0, PayloadOffset[cfr, t3, 8]
    dispatch(constexpr op_to_primitive_length)

.opToPrimitiveSlowCase:
    callOpcodeSlowPath(_slow_path_to_primitive)
    dispatch(constexpr op_to_primitive_length)


_llint_op_catch:
    # This is where we end up from the JIT's throw trampoline (because the
    # machine code return address will be set to _llint_op_catch), and from
    # the interpreter's throw trampoline (see _llint_throw_trampoline).
    # The throwing code must have known that we were throwing to the interpreter,
    # and have set VM::targetInterpreterPCForThrow.
    loadp Callee + PayloadOffset[cfr], t3
    andp MarkedBlockMask, t3
    loadp MarkedBlock::m_vm[t3], t3
    restoreCalleeSavesFromVMEntryFrameCalleeSavesBuffer(t3, t0)
    loadp VM::callFrameForCatch[t3], cfr
    storep 0, VM::callFrameForCatch[t3]
    restoreStackPointerAfterCall()

    loadi VM::targetInterpreterPCForThrow[t3], PC

    callOpcodeSlowPath(_llint_slow_path_check_if_exception_is_uncatchable_and_notify_profiler)
    bpeq r1, 0, .isCatchableException
    jmp _llint_throw_from_slow_path_trampoline

.isCatchableException:
    loadp Callee + PayloadOffset[cfr], t3
    andp MarkedBlockMask, t3
    loadp MarkedBlock::m_vm[t3], t3

    loadi VM::m_exception[t3], t0
    storei 0, VM::m_exception[t3]
    loadi 4[PC], t2
    storei t0, PayloadOffset[cfr, t2, 8]
    storei CellTag, TagOffset[cfr, t2, 8]

    loadi Exception::m_value + TagOffset[t0], t1
    loadi Exception::m_value + PayloadOffset[t0], t0
    loadi 8[PC], t2
    storei t0, PayloadOffset[cfr, t2, 8]
    storei t1, TagOffset[cfr, t2, 8]

    traceExecution()  # This needs to be here because we don't want to clobber t0, t1, t2, t3 above.
    dispatch(3)

_llint_op_end:
    traceExecution()
    checkSwitchToJITForEpilogue()
    loadi 4[PC], t0
    assertNotConstant(t0)
    loadi TagOffset[cfr, t0, 8], t1
    loadi PayloadOffset[cfr, t0, 8], t0
    doReturn()


_llint_throw_from_slow_path_trampoline:
    callSlowPath(_llint_slow_path_handle_exception)

    # When throwing from the interpreter (i.e. throwing from LLIntSlowPaths), so
    # the throw target is not necessarily interpreted code, we come to here.
    # This essentially emulates the JIT's throwing protocol.
    loadp Callee[cfr], t1
    andp MarkedBlockMask, t1
    loadp MarkedBlock::m_vm[t1], t1
    copyCalleeSavesToVMEntryFrameCalleeSavesBuffer(t1, t2)
    jmp VM::targetMachinePCForThrow[t1]


_llint_throw_during_call_trampoline:
    preserveReturnAddressAfterCall(t2)
    jmp _llint_throw_from_slow_path_trampoline


macro nativeCallTrampoline(executableOffsetToFunction)

    functionPrologue()
    storep 0, CodeBlock[cfr]
    loadi Callee + PayloadOffset[cfr], t1
    // Callee is still in t1 for code below
    if X86 or X86_WIN
        subp 8, sp # align stack pointer
        andp MarkedBlockMask, t1
        loadp MarkedBlock::m_vm[t1], t3
        storep cfr, VM::topCallFrame[t3]
        move cfr, a0  # a0 = ecx
        storep a0, [sp]
        loadi Callee + PayloadOffset[cfr], t1
        loadp JSFunction::m_executable[t1], t1
        checkStackPointerAlignment(t3, 0xdead0001)
        call executableOffsetToFunction[t1]
        loadp Callee + PayloadOffset[cfr], t3
        andp MarkedBlockMask, t3
        loadp MarkedBlock::m_vm[t3], t3
        addp 8, sp
    elsif ARM or ARMv7 or ARMv7_TRADITIONAL or C_LOOP or MIPS
        subp 8, sp # align stack pointer
        # t1 already contains the Callee.
        andp MarkedBlockMask, t1
        loadp MarkedBlock::m_vm[t1], t1
        storep cfr, VM::topCallFrame[t1]
        move cfr, a0
        loadi Callee + PayloadOffset[cfr], t1
        loadp JSFunction::m_executable[t1], t1
        checkStackPointerAlignment(t3, 0xdead0001)
        if C_LOOP
            cloopCallNative executableOffsetToFunction[t1]
        else
            call executableOffsetToFunction[t1]
        end
        loadp Callee + PayloadOffset[cfr], t3
        andp MarkedBlockMask, t3
        loadp MarkedBlock::m_vm[t3], t3
        addp 8, sp
    else
        error
    end
    
    btinz VM::m_exception[t3], .handleException

    functionEpilogue()
    ret

.handleException:
    storep cfr, VM::topCallFrame[t3]
    jmp _llint_throw_from_slow_path_trampoline
end


macro getConstantScope(dst)
    loadpFromInstruction(6, t0)
    loadisFromInstruction(dst, t1)
    storei CellTag, TagOffset[cfr, t1, 8]
    storei t0, PayloadOffset[cfr, t1, 8]
end

macro varInjectionCheck(slowPath)
    loadp CodeBlock[cfr], t0
    loadp CodeBlock::m_globalObject[t0], t0
    loadp JSGlobalObject::m_varInjectionWatchpoint[t0], t0
    bbeq WatchpointSet::m_state[t0], IsInvalidated, slowPath
end

macro resolveScope()
    loadp CodeBlock[cfr], t0
    loadisFromInstruction(5, t2)

    loadisFromInstruction(2, t0)
    loadp PayloadOffset[cfr, t0, 8], t0
    btiz t2, .resolveScopeLoopEnd

.resolveScopeLoop:
    loadp JSScope::m_next[t0], t0
    subi 1, t2
    btinz t2, .resolveScopeLoop

.resolveScopeLoopEnd:
    loadisFromInstruction(1, t1)
    storei CellTag, TagOffset[cfr, t1, 8]
    storei t0, PayloadOffset[cfr, t1, 8]
end


_llint_op_resolve_scope:
    traceExecution()
    loadisFromInstruction(4, t0)

#rGlobalProperty:
    bineq t0, GlobalProperty, .rGlobalVar
    getConstantScope(1)
    dispatch(7)

.rGlobalVar:
    bineq t0, GlobalVar, .rGlobalLexicalVar
    getConstantScope(1)
    dispatch(7)

.rGlobalLexicalVar:
    bineq t0, GlobalLexicalVar, .rClosureVar
    getConstantScope(1)
    dispatch(7)

.rClosureVar:
    bineq t0, ClosureVar, .rModuleVar
    resolveScope()
    dispatch(7)

.rModuleVar:
    bineq t0, ModuleVar, .rGlobalPropertyWithVarInjectionChecks
    getConstantScope(1)
    dispatch(7)

.rGlobalPropertyWithVarInjectionChecks:
    bineq t0, GlobalPropertyWithVarInjectionChecks, .rGlobalVarWithVarInjectionChecks
    varInjectionCheck(.rDynamic)
    getConstantScope(1)
    dispatch(7)

.rGlobalVarWithVarInjectionChecks:
    bineq t0, GlobalVarWithVarInjectionChecks, .rGlobalLexicalVarWithVarInjectionChecks
    varInjectionCheck(.rDynamic)
    getConstantScope(1)
    dispatch(7)

.rGlobalLexicalVarWithVarInjectionChecks:
    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .rClosureVarWithVarInjectionChecks
    varInjectionCheck(.rDynamic)
    getConstantScope(1)
    dispatch(7)

.rClosureVarWithVarInjectionChecks:
    bineq t0, ClosureVarWithVarInjectionChecks, .rDynamic
    varInjectionCheck(.rDynamic)
    resolveScope()
    dispatch(7)

.rDynamic:
    callOpcodeSlowPath(_slow_path_resolve_scope)
    dispatch(7)


macro loadWithStructureCheck(operand, slowPath)
    loadisFromInstruction(operand, t0)
    loadp PayloadOffset[cfr, t0, 8], t0
    loadpFromInstruction(5, t1)
    bpneq JSCell::m_structureID[t0], t1, slowPath
end

macro getProperty()
    loadisFromInstruction(6, t3)
    loadPropertyAtVariableOffset(t3, t0, t1, t2)
    valueProfile(t1, t2, 28, t0)
    loadisFromInstruction(1, t0)
    storei t1, TagOffset[cfr, t0, 8]
    storei t2, PayloadOffset[cfr, t0, 8]
end

macro getGlobalVar(tdzCheckIfNecessary)
    loadpFromInstruction(6, t0)
    loadp TagOffset[t0], t1
    loadp PayloadOffset[t0], t2
    tdzCheckIfNecessary(t1)
    valueProfile(t1, t2, 28, t0)
    loadisFromInstruction(1, t0)
    storei t1, TagOffset[cfr, t0, 8]
    storei t2, PayloadOffset[cfr, t0, 8]
end

macro getClosureVar()
    loadisFromInstruction(6, t3)
    loadp JSEnvironmentRecord_variables + TagOffset[t0, t3, 8], t1
    loadp JSEnvironmentRecord_variables + PayloadOffset[t0, t3, 8], t2
    valueProfile(t1, t2, 28, t0)
    loadisFromInstruction(1, t0)
    storei t1, TagOffset[cfr, t0, 8]
    storei t2, PayloadOffset[cfr, t0, 8]
end

_llint_op_get_from_scope:
    traceExecution()
    loadisFromInstruction(4, t0)
    andi ResolveTypeMask, t0

#gGlobalProperty:
    bineq t0, GlobalProperty, .gGlobalVar
    loadWithStructureCheck(2, .gDynamic)
    getProperty()
    dispatch(8)

.gGlobalVar:
    bineq t0, GlobalVar, .gGlobalLexicalVar
    getGlobalVar(macro(t) end)
    dispatch(8)

.gGlobalLexicalVar:
    bineq t0, GlobalLexicalVar, .gClosureVar
    getGlobalVar(
        macro(tag)
            bieq tag, EmptyValueTag, .gDynamic
        end)
    dispatch(8)

.gClosureVar:
    bineq t0, ClosureVar, .gGlobalPropertyWithVarInjectionChecks
    loadVariable(2, t2, t1, t0)
    getClosureVar()
    dispatch(8)

.gGlobalPropertyWithVarInjectionChecks:
    bineq t0, GlobalPropertyWithVarInjectionChecks, .gGlobalVarWithVarInjectionChecks
    loadWithStructureCheck(2, .gDynamic)
    getProperty()
    dispatch(8)

.gGlobalVarWithVarInjectionChecks:
    bineq t0, GlobalVarWithVarInjectionChecks, .gGlobalLexicalVarWithVarInjectionChecks
    varInjectionCheck(.gDynamic)
    getGlobalVar(macro(t) end)
    dispatch(8)

.gGlobalLexicalVarWithVarInjectionChecks:
    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .gClosureVarWithVarInjectionChecks
    varInjectionCheck(.gDynamic)
    getGlobalVar(
        macro(tag)
            bieq tag, EmptyValueTag, .gDynamic
        end)
    dispatch(8)

.gClosureVarWithVarInjectionChecks:
    bineq t0, ClosureVarWithVarInjectionChecks, .gDynamic
    varInjectionCheck(.gDynamic)
    loadVariable(2, t2, t1, t0)
    getClosureVar()
    dispatch(8)

.gDynamic:
    callOpcodeSlowPath(_llint_slow_path_get_from_scope)
    dispatch(8)


macro putProperty()
    loadisFromInstruction(3, t1)
    loadConstantOrVariable(t1, t2, t3)
    loadisFromInstruction(6, t1)
    storePropertyAtVariableOffset(t1, t0, t2, t3)
end

macro putGlobalVariable()
    loadisFromInstruction(3, t0)
    loadConstantOrVariable(t0, t1, t2)
    loadpFromInstruction(5, t3)
    notifyWrite(t3, .pDynamic)
    loadpFromInstruction(6, t0)
    storei t1, TagOffset[t0]
    storei t2, PayloadOffset[t0]
end

macro putClosureVar()
    loadisFromInstruction(3, t1)
    loadConstantOrVariable(t1, t2, t3)
    loadisFromInstruction(6, t1)
    storei t2, JSEnvironmentRecord_variables + TagOffset[t0, t1, 8]
    storei t3, JSEnvironmentRecord_variables + PayloadOffset[t0, t1, 8]
end

macro putLocalClosureVar()
    loadisFromInstruction(3, t1)
    loadConstantOrVariable(t1, t2, t3)
    loadpFromInstruction(5, t5)
    btpz t5, .noVariableWatchpointSet
    notifyWrite(t5, .pDynamic)
.noVariableWatchpointSet:
    loadisFromInstruction(6, t1)
    storei t2, JSEnvironmentRecord_variables + TagOffset[t0, t1, 8]
    storei t3, JSEnvironmentRecord_variables + PayloadOffset[t0, t1, 8]
end


_llint_op_put_to_scope:
    traceExecution()
    loadisFromInstruction(4, t0)
    andi ResolveTypeMask, t0

#pLocalClosureVar:
    bineq t0, LocalClosureVar, .pGlobalProperty
    writeBarrierOnOperands(1, 3)
    loadVariable(1, t2, t1, t0)
    putLocalClosureVar()
    dispatch(7)

.pGlobalProperty:
    bineq t0, GlobalProperty, .pGlobalVar
    writeBarrierOnOperands(1, 3)
    loadWithStructureCheck(1, .pDynamic)
    putProperty()
    dispatch(7)

.pGlobalVar:
    bineq t0, GlobalVar, .pGlobalLexicalVar
    writeBarrierOnGlobalObject(3)
    putGlobalVariable()
    dispatch(7)

.pGlobalLexicalVar:
    bineq t0, GlobalLexicalVar, .pClosureVar
    writeBarrierOnGlobalLexicalEnvironment(3)
    putGlobalVariable()
    dispatch(7)

.pClosureVar:
    bineq t0, ClosureVar, .pGlobalPropertyWithVarInjectionChecks
    writeBarrierOnOperands(1, 3)
    loadVariable(1, t2, t1, t0)
    putClosureVar()
    dispatch(7)

.pGlobalPropertyWithVarInjectionChecks:
    bineq t0, GlobalPropertyWithVarInjectionChecks, .pGlobalVarWithVarInjectionChecks
    writeBarrierOnOperands(1, 3)
    loadWithStructureCheck(1, .pDynamic)
    putProperty()
    dispatch(7)

.pGlobalVarWithVarInjectionChecks:
    bineq t0, GlobalVarWithVarInjectionChecks, .pGlobalLexicalVarWithVarInjectionChecks
    writeBarrierOnGlobalObject(3)
    varInjectionCheck(.pDynamic)
    putGlobalVariable()
    dispatch(7)

.pGlobalLexicalVarWithVarInjectionChecks:
    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .pClosureVarWithVarInjectionChecks
    writeBarrierOnGlobalLexicalEnvironment(3)
    varInjectionCheck(.pDynamic)
    putGlobalVariable()
    dispatch(7)

.pClosureVarWithVarInjectionChecks:
    bineq t0, ClosureVarWithVarInjectionChecks, .pModuleVar
    writeBarrierOnOperands(1, 3)
    varInjectionCheck(.pDynamic)
    loadVariable(1, t2, t1, t0)
    putClosureVar()
    dispatch(7)

.pModuleVar:
    bineq t0, ModuleVar, .pDynamic
    callOpcodeSlowPath(_slow_path_throw_strict_mode_readonly_property_write_error)
    dispatch(7)

.pDynamic:
    callOpcodeSlowPath(_llint_slow_path_put_to_scope)
    dispatch(7)


_llint_op_get_from_arguments:
    traceExecution()
    loadisFromInstruction(2, t0)
    loadi PayloadOffset[cfr, t0, 8], t0
    loadi 12[PC], t1
    loadi DirectArguments_storage + TagOffset[t0, t1, 8], t2
    loadi DirectArguments_storage + PayloadOffset[t0, t1, 8], t3
    loadisFromInstruction(1, t1)
    valueProfile(t2, t3, 16, t0)
    storei t2, TagOffset[cfr, t1, 8]
    storei t3, PayloadOffset[cfr, t1, 8]
    dispatch(5)


_llint_op_put_to_arguments:
    traceExecution()
    writeBarrierOnOperands(1, 3)
    loadisFromInstruction(1, t0)
    loadi PayloadOffset[cfr, t0, 8], t0
    loadisFromInstruction(3, t1)
    loadConstantOrVariable(t1, t2, t3)
    loadi 8[PC], t1
    storei t2, DirectArguments_storage + TagOffset[t0, t1, 8]
    storei t3, DirectArguments_storage + PayloadOffset[t0, t1, 8]
    dispatch(4)


_llint_op_get_parent_scope:
    traceExecution()
    loadisFromInstruction(2, t0)
    loadp PayloadOffset[cfr, t0, 8], t0
    loadp JSScope::m_next[t0], t0
    loadisFromInstruction(1, t1)
    storei CellTag, TagOffset[cfr, t1, 8]
    storei t0, PayloadOffset[cfr, t1, 8]
    dispatch(3)


_llint_op_profile_type:
    traceExecution()
    loadp CodeBlock[cfr], t1
    loadp CodeBlock::m_vm[t1], t1
    # t1 is holding the pointer to the typeProfilerLog.
    loadp VM::m_typeProfilerLog[t1], t1

    # t0 is holding the payload, t5 is holding the tag.
    loadisFromInstruction(1, t2)
    loadConstantOrVariable(t2, t5, t0)

    bieq t5, EmptyValueTag, .opProfileTypeDone

    # t2 is holding the pointer to the current log entry.
    loadp TypeProfilerLog::m_currentLogEntryPtr[t1], t2

    # Store the JSValue onto the log entry.
    storei t5, TypeProfilerLog::LogEntry::value + TagOffset[t2]
    storei t0, TypeProfilerLog::LogEntry::value + PayloadOffset[t2]

    # Store the TypeLocation onto the log entry.
    loadpFromInstruction(2, t3)
    storep t3, TypeProfilerLog::LogEntry::location[t2]

    bieq t5, CellTag, .opProfileTypeIsCell
    storei 0, TypeProfilerLog::LogEntry::structureID[t2]
    jmp .opProfileTypeSkipIsCell
.opProfileTypeIsCell:
    loadi JSCell::m_structureID[t0], t3
    storei t3, TypeProfilerLog::LogEntry::structureID[t2]
.opProfileTypeSkipIsCell:
    
    # Increment the current log entry.
    addp sizeof TypeProfilerLog::LogEntry, t2
    storep t2, TypeProfilerLog::m_currentLogEntryPtr[t1]

    loadp TypeProfilerLog::m_logEndPtr[t1], t1
    bpneq t2, t1, .opProfileTypeDone
    callOpcodeSlowPath(_slow_path_profile_type_clear_log)

.opProfileTypeDone:
    dispatch(6)


_llint_op_profile_control_flow:
    traceExecution()
    loadpFromInstruction(1, t0)
    loadi BasicBlockLocation::m_executionCount[t0], t1
    addi 1, t1
    bieq t1, 0, .done # We overflowed.
    storei t1, BasicBlockLocation::m_executionCount[t0]
.done:
    dispatch(2)


_llint_op_get_rest_length:
    traceExecution()
    loadi PayloadOffset + ArgumentCount[cfr], t0
    subi 1, t0
    loadisFromInstruction(2, t1)
    bilteq t0, t1, .storeZero
    subi t1, t0
    jmp .finish
.storeZero:
    move 0, t0
.finish:
    loadisFromInstruction(1, t1)
    storei t0, PayloadOffset[cfr, t1, 8]
    storei Int32Tag, TagOffset[cfr, t1, 8]
    dispatch(3)


_llint_op_log_shadow_chicken_prologue:
    traceExecution()
    acquireShadowChickenPacket(.opLogShadowChickenPrologueSlow)
    storep cfr, ShadowChicken::Packet::frame[t0]
    loadp CallerFrame[cfr], t1
    storep t1, ShadowChicken::Packet::callerFrame[t0]
    loadp Callee + PayloadOffset[cfr], t1
    storep t1, ShadowChicken::Packet::callee[t0]
    loadisFromInstruction(1, t1)
    loadi PayloadOffset[cfr, t1, 8], t1
    storep t1, ShadowChicken::Packet::scope[t0]
    dispatch(2)
.opLogShadowChickenPrologueSlow:
    callOpcodeSlowPath(_llint_slow_path_log_shadow_chicken_prologue)
    dispatch(2)


_llint_op_log_shadow_chicken_tail:
    traceExecution()
    acquireShadowChickenPacket(.opLogShadowChickenTailSlow)
    storep cfr, ShadowChicken::Packet::frame[t0]
    storep ShadowChickenTailMarker, ShadowChicken::Packet::callee[t0]
    loadVariable(1, t3, t2, t1)
    storei t2, TagOffset + ShadowChicken::Packet::thisValue[t0]
    storei t1, PayloadOffset + ShadowChicken::Packet::thisValue[t0]
    loadisFromInstruction(2, t1)
    loadi PayloadOffset[cfr, t1, 8], t1
    storep t1, ShadowChicken::Packet::scope[t0]
    loadp CodeBlock[cfr], t1
    storep t1, ShadowChicken::Packet::codeBlock[t0]
    storei PC, ShadowChicken::Packet::callSiteIndex[t0]
    dispatch(3)
.opLogShadowChickenTailSlow:
    callOpcodeSlowPath(_llint_slow_path_log_shadow_chicken_tail)
    dispatch(3)
`;

    new File("LowLevelInterpreter32_64.asm", source);
})();

// --- JetStreamExtra/RexBench/OfflineAssembler/LowLevelInterpreter64.js ---

/*
 * DO NOT EDIT THIS FILE, it is autogenerated.
 */
"use strict";

(function() {
    let source = `# Copyright (C) 2011-2017 Apple Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions
# are met:
# 1. Redistributions of source code must retain the above copyright
#    notice, this list of conditions and the following disclaimer.
# 2. Redistributions in binary form must reproduce the above copyright
#    notice, this list of conditions and the following disclaimer in the
#    documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS \`\`AS IS''
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
# PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS
# BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
# THE POSSIBILITY OF SUCH DAMAGE.


# Utilities.
macro jumpToInstruction()
    jmp [PB, PC, 8]
end

macro dispatch(advance)
    addp advance, PC
    jumpToInstruction()
end

macro dispatchInt(advance)
    addi advance, PC
    jumpToInstruction()
end

macro dispatchIntIndirect(offset)
    dispatchInt(offset * 8[PB, PC, 8])
end

macro dispatchAfterCall()
    loadi ArgumentCount + TagOffset[cfr], PC
    loadp CodeBlock[cfr], PB
    loadp CodeBlock::m_instructions[PB], PB
    loadisFromInstruction(1, t1)
    storeq r0, [cfr, t1, 8]
    valueProfile(r0, (CallOpCodeSize - 1), t3)
    dispatch(CallOpCodeSize)
end

macro cCall2(function)
    checkStackPointerAlignment(t4, 0xbad0c002)
    if X86_64 or ARM64
        call function
    elsif X86_64_WIN
        # Note: this implementation is only correct if the return type size is > 8 bytes.
        # See macro cCall2Void for an implementation when the return type <= 8 bytes.
        # On Win64, when the return type is larger than 8 bytes, we need to allocate space on the stack for the return value.
        # On entry rcx (a0), should contain a pointer to this stack space. The other parameters are shifted to the right,
        # rdx (a1) should contain the first argument, and r8 (a2) should contain the second argument.
        # On return, rax contains a pointer to this stack value, and we then need to copy the 16 byte return value into rax (r0) and rdx (r1)
        # since the return value is expected to be split between the two.
        # See http://msdn.microsoft.com/en-us/library/7572ztz4.aspx
        move a1, a2
        move a0, a1
        subp 48, sp
        move sp, a0
        addp 32, a0
        call function
        addp 48, sp
        move 8[r0], r1
        move [r0], r0
    elsif C_LOOP
        cloopCallSlowPath function, a0, a1
    else
        error
    end
end

macro cCall2Void(function)
    if C_LOOP
        cloopCallSlowPathVoid function, a0, a1
    elsif X86_64_WIN
        # Note: we cannot use the cCall2 macro for Win64 in this case,
        # as the Win64 cCall2 implemenation is only correct when the return type size is > 8 bytes.
        # On Win64, rcx and rdx are used for passing the first two parameters.
        # We also need to make room on the stack for all four parameter registers.
        # See http://msdn.microsoft.com/en-us/library/ms235286.aspx
        subp 32, sp 
        call function
        addp 32, sp 
    else
        cCall2(function)
    end
end

# This barely works. arg3 and arg4 should probably be immediates.
macro cCall4(function)
    checkStackPointerAlignment(t4, 0xbad0c004)
    if X86_64 or ARM64
        call function
    elsif X86_64_WIN
        # On Win64, rcx, rdx, r8, and r9 are used for passing the first four parameters.
        # We also need to make room on the stack for all four parameter registers.
        # See http://msdn.microsoft.com/en-us/library/ms235286.aspx
        subp 64, sp
        call function
        addp 64, sp
    else
        error
    end
end

macro doVMEntry(makeCall)
    functionPrologue()
    pushCalleeSaves()

    const entry = a0
    const vm = a1
    const protoCallFrame = a2

    vmEntryRecord(cfr, sp)

    checkStackPointerAlignment(t4, 0xbad0dc01)

    storep vm, VMEntryRecord::m_vm[sp]
    loadp VM::topCallFrame[vm], t4
    storep t4, VMEntryRecord::m_prevTopCallFrame[sp]
    loadp VM::topVMEntryFrame[vm], t4
    storep t4, VMEntryRecord::m_prevTopVMEntryFrame[sp]

    loadi ProtoCallFrame::paddedArgCount[protoCallFrame], t4
    addp CallFrameHeaderSlots, t4, t4
    lshiftp 3, t4
    subp sp, t4, t3
    bqbeq sp, t3, .throwStackOverflow

    # Ensure that we have enough additional stack capacity for the incoming args,
    # and the frame for the JS code we're executing. We need to do this check
    # before we start copying the args from the protoCallFrame below.
    if C_LOOP
        bpaeq t3, VM::m_cloopStackLimit[vm], .stackHeightOK
    else
        bpaeq t3, VM::m_softStackLimit[vm], .stackHeightOK
    end

    if C_LOOP
        move entry, t4
        move vm, t5
        cloopCallSlowPath _llint_stack_check_at_vm_entry, vm, t3
        bpeq t0, 0, .stackCheckFailed
        move t4, entry
        move t5, vm
        jmp .stackHeightOK

.stackCheckFailed:
        move t4, entry
        move t5, vm
    end

.throwStackOverflow:
    move vm, a0
    move protoCallFrame, a1
    cCall2(_llint_throw_stack_overflow_error)

    vmEntryRecord(cfr, t4)

    loadp VMEntryRecord::m_vm[t4], vm
    loadp VMEntryRecord::m_prevTopCallFrame[t4], extraTempReg
    storep extraTempReg, VM::topCallFrame[vm]
    loadp VMEntryRecord::m_prevTopVMEntryFrame[t4], extraTempReg
    storep extraTempReg, VM::topVMEntryFrame[vm]

    subp cfr, CalleeRegisterSaveSize, sp

    popCalleeSaves()
    functionEpilogue()
    ret

.stackHeightOK:
    move t3, sp
    move 4, t3

.copyHeaderLoop:
    # Copy the CodeBlock/Callee/ArgumentCount/|this| from protoCallFrame into the callee frame.
    subi 1, t3
    loadq [protoCallFrame, t3, 8], extraTempReg
    storeq extraTempReg, CodeBlock[sp, t3, 8]
    btinz t3, .copyHeaderLoop

    loadi PayloadOffset + ProtoCallFrame::argCountAndCodeOriginValue[protoCallFrame], t4
    subi 1, t4
    loadi ProtoCallFrame::paddedArgCount[protoCallFrame], extraTempReg
    subi 1, extraTempReg

    bieq t4, extraTempReg, .copyArgs
    move ValueUndefined, t3
.fillExtraArgsLoop:
    subi 1, extraTempReg
    storeq t3, ThisArgumentOffset + 8[sp, extraTempReg, 8]
    bineq t4, extraTempReg, .fillExtraArgsLoop

.copyArgs:
    loadp ProtoCallFrame::args[protoCallFrame], t3

.copyArgsLoop:
    btiz t4, .copyArgsDone
    subi 1, t4
    loadq [t3, t4, 8], extraTempReg
    storeq extraTempReg, ThisArgumentOffset + 8[sp, t4, 8]
    jmp .copyArgsLoop

.copyArgsDone:
    if ARM64
        move sp, t4
        storep t4, VM::topCallFrame[vm]
    else
        storep sp, VM::topCallFrame[vm]
    end
    storep cfr, VM::topVMEntryFrame[vm]

    checkStackPointerAlignment(extraTempReg, 0xbad0dc02)

    makeCall(entry, t3)

    # We may have just made a call into a JS function, so we can't rely on sp
    # for anything but the fact that our own locals (ie the VMEntryRecord) are
    # not below it. It also still has to be aligned, though.
    checkStackPointerAlignment(t2, 0xbad0dc03)

    vmEntryRecord(cfr, t4)

    loadp VMEntryRecord::m_vm[t4], vm
    loadp VMEntryRecord::m_prevTopCallFrame[t4], t2
    storep t2, VM::topCallFrame[vm]
    loadp VMEntryRecord::m_prevTopVMEntryFrame[t4], t2
    storep t2, VM::topVMEntryFrame[vm]

    subp cfr, CalleeRegisterSaveSize, sp

    popCalleeSaves()
    functionEpilogue()

    ret
end


macro makeJavaScriptCall(entry, temp)
    addp 16, sp
    if C_LOOP
        cloopCallJSFunction entry
    else
        call entry
    end
    subp 16, sp
end


macro makeHostFunctionCall(entry, temp)
    move entry, temp
    storep cfr, [sp]
    move sp, a0
    if C_LOOP
        storep lr, 8[sp]
        cloopCallNative temp
    elsif X86_64_WIN
        # We need to allocate 32 bytes on the stack for the shadow space.
        subp 32, sp
        call temp
        addp 32, sp
    else
        call temp
    end
end


_handleUncaughtException:
    loadp Callee[cfr], t3
    andp MarkedBlockMask, t3
    loadp MarkedBlock::m_vm[t3], t3
    restoreCalleeSavesFromVMEntryFrameCalleeSavesBuffer(t3, t0)
    loadp VM::callFrameForCatch[t3], cfr
    storep 0, VM::callFrameForCatch[t3]

    loadp CallerFrame[cfr], cfr
    vmEntryRecord(cfr, t2)

    loadp VMEntryRecord::m_vm[t2], t3
    loadp VMEntryRecord::m_prevTopCallFrame[t2], extraTempReg
    storep extraTempReg, VM::topCallFrame[t3]
    loadp VMEntryRecord::m_prevTopVMEntryFrame[t2], extraTempReg
    storep extraTempReg, VM::topVMEntryFrame[t3]

    subp cfr, CalleeRegisterSaveSize, sp

    popCalleeSaves()
    functionEpilogue()
    ret


macro prepareStateForCCall()
    leap [PB, PC, 8], PC
end

macro restoreStateAfterCCall()
    move r0, PC
    subp PB, PC
    rshiftp 3, PC
end

macro callSlowPath(slowPath)
    prepareStateForCCall()
    move cfr, a0
    move PC, a1
    cCall2(slowPath)
    restoreStateAfterCCall()
end

macro traceOperand(fromWhere, operand)
    prepareStateForCCall()
    move fromWhere, a2
    move operand, a3
    move cfr, a0
    move PC, a1
    cCall4(_llint_trace_operand)
    restoreStateAfterCCall()
end

macro traceValue(fromWhere, operand)
    prepareStateForCCall()
    move fromWhere, a2
    move operand, a3
    move cfr, a0
    move PC, a1
    cCall4(_llint_trace_value)
    restoreStateAfterCCall()
end

# Call a slow path for call call opcodes.
macro callCallSlowPath(slowPath, action)
    storei PC, ArgumentCount + TagOffset[cfr]
    prepareStateForCCall()
    move cfr, a0
    move PC, a1
    cCall2(slowPath)
    action(r0, r1)
end

macro callTrapHandler(throwHandler)
    storei PC, ArgumentCount + TagOffset[cfr]
    prepareStateForCCall()
    move cfr, a0
    move PC, a1
    cCall2(_llint_slow_path_handle_traps)
    btpnz r0, throwHandler
    loadi ArgumentCount + TagOffset[cfr], PC
end

macro checkSwitchToJITForLoop()
    checkSwitchToJIT(
        1,
        macro()
            storei PC, ArgumentCount + TagOffset[cfr]
            prepareStateForCCall()
            move cfr, a0
            move PC, a1
            cCall2(_llint_loop_osr)
            btpz r0, .recover
            move r1, sp
            jmp r0
        .recover:
            loadi ArgumentCount + TagOffset[cfr], PC
        end)
end

macro loadCaged(basePtr, source, dest, scratch)
    loadp source, dest
    if GIGACAGE_ENABLED and not C_LOOP
        loadp basePtr, scratch
        btpz scratch, .done
        andp constexpr GIGACAGE_MASK, dest
        addp scratch, dest
    .done:
    end
end

macro loadVariable(operand, value)
    loadisFromInstruction(operand, value)
    loadq [cfr, value, 8], value
end

# Index and value must be different registers. Index may be clobbered.
macro loadConstantOrVariable(index, value)
    bpgteq index, FirstConstantRegisterIndex, .constant
    loadq [cfr, index, 8], value
    jmp .done
.constant:
    loadp CodeBlock[cfr], value
    loadp CodeBlock::m_constantRegisters + VectorBufferOffset[value], value
    subp FirstConstantRegisterIndex, index
    loadq [value, index, 8], value
.done:
end

macro loadConstantOrVariableInt32(index, value, slow)
    loadConstantOrVariable(index, value)
    bqb value, tagTypeNumber, slow
end

macro loadConstantOrVariableCell(index, value, slow)
    loadConstantOrVariable(index, value)
    btqnz value, tagMask, slow
end

macro writeBarrierOnOperand(cellOperand)
    loadisFromInstruction(cellOperand, t1)
    loadConstantOrVariableCell(t1, t2, .writeBarrierDone)
    skipIfIsRememberedOrInEden(
        t2,
        macro()
            push PB, PC
            move t2, a1 # t2 can be a0 (not on 64 bits, but better safe than sorry)
            move cfr, a0
            cCall2Void(_llint_write_barrier_slow)
            pop PC, PB
        end)
.writeBarrierDone:
end

macro writeBarrierOnOperands(cellOperand, valueOperand)
    loadisFromInstruction(valueOperand, t1)
    loadConstantOrVariableCell(t1, t0, .writeBarrierDone)
    btpz t0, .writeBarrierDone

    writeBarrierOnOperand(cellOperand)
.writeBarrierDone:
end

macro writeBarrierOnGlobal(valueOperand, loadHelper)
    loadisFromInstruction(valueOperand, t1)
    loadConstantOrVariableCell(t1, t0, .writeBarrierDone)
    btpz t0, .writeBarrierDone

    loadHelper(t3)
    skipIfIsRememberedOrInEden(
        t3,
        macro()
            push PB, PC
            move cfr, a0
            move t3, a1
            cCall2Void(_llint_write_barrier_slow)
            pop PC, PB
        end
    )
.writeBarrierDone:
end

macro writeBarrierOnGlobalObject(valueOperand)
    writeBarrierOnGlobal(valueOperand,
        macro(registerToStoreGlobal)
            loadp CodeBlock[cfr], registerToStoreGlobal
            loadp CodeBlock::m_globalObject[registerToStoreGlobal], registerToStoreGlobal
        end)
end

macro writeBarrierOnGlobalLexicalEnvironment(valueOperand)
    writeBarrierOnGlobal(valueOperand,
        macro(registerToStoreGlobal)
            loadp CodeBlock[cfr], registerToStoreGlobal
            loadp CodeBlock::m_globalObject[registerToStoreGlobal], registerToStoreGlobal
            loadp JSGlobalObject::m_globalLexicalEnvironment[registerToStoreGlobal], registerToStoreGlobal
        end)
end

macro valueProfile(value, operand, scratch)
    loadpFromInstruction(operand, scratch)
    storeq value, ValueProfile::m_buckets[scratch]
end

macro structureIDToStructureWithScratch(structureIDThenStructure, scratch)
    loadp CodeBlock[cfr], scratch
    loadp CodeBlock::m_vm[scratch], scratch
    loadp VM::heap + Heap::m_structureIDTable + StructureIDTable::m_table[scratch], scratch
    loadp [scratch, structureIDThenStructure, 8], structureIDThenStructure
end

macro loadStructureWithScratch(cell, structure, scratch)
    loadi JSCell::m_structureID[cell], structure
    structureIDToStructureWithScratch(structure, scratch)
end

macro loadStructureAndClobberFirstArg(cell, structure)
    loadi JSCell::m_structureID[cell], structure
    loadp CodeBlock[cfr], cell
    loadp CodeBlock::m_vm[cell], cell
    loadp VM::heap + Heap::m_structureIDTable + StructureIDTable::m_table[cell], cell
    loadp [cell, structure, 8], structure
end

# Entrypoints into the interpreter.

# Expects that CodeBlock is in t1, which is what prologue() leaves behind.
macro functionArityCheck(doneLabel, slowPath)
    loadi PayloadOffset + ArgumentCount[cfr], t0
    biaeq t0, CodeBlock::m_numParameters[t1], doneLabel
    prepareStateForCCall()
    move cfr, a0
    move PC, a1
    cCall2(slowPath)   # This slowPath has the protocol: r0 = 0 => no error, r0 != 0 => error
    btiz r0, .noError
    move r1, cfr   # r1 contains caller frame
    jmp _llint_throw_from_slow_path_trampoline

.noError:
    loadi CommonSlowPaths::ArityCheckData::paddedStackSpace[r1], t1
    btiz t1, .continue
    loadi PayloadOffset + ArgumentCount[cfr], t2
    addi CallFrameHeaderSlots, t2

    // Check if there are some unaligned slots we can use
    move t1, t3
    andi StackAlignmentSlots - 1, t3
    btiz t3, .noExtraSlot
    move ValueUndefined, t0
.fillExtraSlots:
    storeq t0, [cfr, t2, 8]
    addi 1, t2
    bsubinz 1, t3, .fillExtraSlots
    andi ~(StackAlignmentSlots - 1), t1
    btiz t1, .continue

.noExtraSlot:
    // Move frame up t1 slots
    negq t1
    move cfr, t3
    subp CalleeSaveSpaceAsVirtualRegisters * 8, t3
    addi CalleeSaveSpaceAsVirtualRegisters, t2
    move t1, t0
    lshiftp 3, t0
    addp t0, cfr
    addp t0, sp
.copyLoop:
    loadq [t3], t0
    storeq t0, [t3, t1, 8]
    addp 8, t3
    bsubinz 1, t2, .copyLoop

    // Fill new slots with JSUndefined
    move t1, t2
    move ValueUndefined, t0
.fillLoop:
    storeq t0, [t3, t1, 8]
    addp 8, t3
    baddinz 1, t2, .fillLoop

.continue:
    # Reload CodeBlock and reset PC, since the slow_path clobbered them.
    loadp CodeBlock[cfr], t1
    loadp CodeBlock::m_instructions[t1], PB
    move 0, PC
    jmp doneLabel
end

macro branchIfException(label)
    loadp Callee[cfr], t3
    andp MarkedBlockMask, t3
    loadp MarkedBlock::m_vm[t3], t3
    btqz VM::m_exception[t3], .noException
    jmp label
.noException:
end


# Instruction implementations
_llint_op_enter:
    traceExecution()
    checkStackPointerAlignment(t2, 0xdead00e1)
    loadp CodeBlock[cfr], t2                // t2<CodeBlock> = cfr.CodeBlock
    loadi CodeBlock::m_numVars[t2], t2      // t2<size_t> = t2<CodeBlock>.m_numVars
    subq CalleeSaveSpaceAsVirtualRegisters, t2
    move cfr, t1
    subq CalleeSaveSpaceAsVirtualRegisters * 8, t1
    btiz t2, .opEnterDone
    move ValueUndefined, t0
    negi t2
    sxi2q t2, t2
.opEnterLoop:
    storeq t0, [t1, t2, 8]
    addq 1, t2
    btqnz t2, .opEnterLoop
.opEnterDone:
    callOpcodeSlowPath(_slow_path_enter)
    dispatch(constexpr op_enter_length)


_llint_op_get_argument:
    traceExecution()
    loadisFromInstruction(1, t1)
    loadisFromInstruction(2, t2)
    loadi PayloadOffset + ArgumentCount[cfr], t0
    bilteq t0, t2, .opGetArgumentOutOfBounds
    loadq ThisArgumentOffset[cfr, t2, 8], t0
    storeq t0, [cfr, t1, 8]
    valueProfile(t0, 3, t2)
    dispatch(constexpr op_get_argument_length)

.opGetArgumentOutOfBounds:
    storeq ValueUndefined, [cfr, t1, 8]
    valueProfile(ValueUndefined, 3, t2)
    dispatch(constexpr op_get_argument_length)


_llint_op_argument_count:
    traceExecution()
    loadisFromInstruction(1, t1)
    loadi PayloadOffset + ArgumentCount[cfr], t0
    subi 1, t0
    orq TagTypeNumber, t0
    storeq t0, [cfr, t1, 8]
    dispatch(constexpr op_argument_count_length)


_llint_op_get_scope:
    traceExecution()
    loadp Callee[cfr], t0
    loadp JSCallee::m_scope[t0], t0
    loadisFromInstruction(1, t1)
    storeq t0, [cfr, t1, 8]
    dispatch(constexpr op_get_scope_length)


_llint_op_to_this:
    traceExecution()
    loadisFromInstruction(1, t0)
    loadq [cfr, t0, 8], t0
    btqnz t0, tagMask, .opToThisSlow
    bbneq JSCell::m_type[t0], FinalObjectType, .opToThisSlow
    loadStructureWithScratch(t0, t1, t2)
    loadpFromInstruction(2, t2)
    bpneq t1, t2, .opToThisSlow
    dispatch(constexpr op_to_this_length)

.opToThisSlow:
    callOpcodeSlowPath(_slow_path_to_this)
    dispatch(constexpr op_to_this_length)


_llint_op_check_tdz:
    traceExecution()
    loadisFromInstruction(1, t0)
    loadConstantOrVariable(t0, t1)
    bqneq t1, ValueEmpty, .opNotTDZ
    callOpcodeSlowPath(_slow_path_throw_tdz_error)

.opNotTDZ:
    dispatch(constexpr op_check_tdz_length)


_llint_op_mov:
    traceExecution()
    loadisFromInstruction(2, t1)
    loadisFromInstruction(1, t0)
    loadConstantOrVariable(t1, t2)
    storeq t2, [cfr, t0, 8]
    dispatch(constexpr op_mov_length)


_llint_op_not:
    traceExecution()
    loadisFromInstruction(2, t0)
    loadisFromInstruction(1, t1)
    loadConstantOrVariable(t0, t2)
    xorq ValueFalse, t2
    btqnz t2, ~1, .opNotSlow
    xorq ValueTrue, t2
    storeq t2, [cfr, t1, 8]
    dispatch(constexpr op_not_length)

.opNotSlow:
    callOpcodeSlowPath(_slow_path_not)
    dispatch(constexpr op_not_length)


macro equalityComparison(integerComparison, slowPath)
    traceExecution()
    loadisFromInstruction(3, t0)
    loadisFromInstruction(2, t2)
    loadisFromInstruction(1, t3)
    loadConstantOrVariableInt32(t0, t1, .slow)
    loadConstantOrVariableInt32(t2, t0, .slow)
    integerComparison(t0, t1, t0)
    orq ValueFalse, t0
    storeq t0, [cfr, t3, 8]
    dispatch(4)

.slow:
    callOpcodeSlowPath(slowPath)
    dispatch(4)
end

_llint_op_eq:
    equalityComparison(
        macro (left, right, result) cieq left, right, result end,
        _slow_path_eq)


_llint_op_neq:
    equalityComparison(
        macro (left, right, result) cineq left, right, result end,
        _slow_path_neq)


macro equalNullComparison()
    loadisFromInstruction(2, t0)
    loadq [cfr, t0, 8], t0
    btqnz t0, tagMask, .immediate
    btbnz JSCell::m_flags[t0], MasqueradesAsUndefined, .masqueradesAsUndefined
    move 0, t0
    jmp .done
.masqueradesAsUndefined:
    loadStructureWithScratch(t0, t2, t1)
    loadp CodeBlock[cfr], t0
    loadp CodeBlock::m_globalObject[t0], t0
    cpeq Structure::m_globalObject[t2], t0, t0
    jmp .done
.immediate:
    andq ~TagBitUndefined, t0
    cqeq t0, ValueNull, t0
.done:
end

_llint_op_eq_null:
    traceExecution()
    equalNullComparison()
    loadisFromInstruction(1, t1)
    orq ValueFalse, t0
    storeq t0, [cfr, t1, 8]
    dispatch(constexpr op_eq_null_length)


_llint_op_neq_null:
    traceExecution()
    equalNullComparison()
    loadisFromInstruction(1, t1)
    xorq ValueTrue, t0
    storeq t0, [cfr, t1, 8]
    dispatch(constexpr op_neq_null_length)


macro strictEq(equalityOperation, slowPath)
    traceExecution()
    loadisFromInstruction(3, t0)
    loadisFromInstruction(2, t2)
    loadConstantOrVariable(t0, t1)
    loadConstantOrVariable(t2, t0)
    move t0, t2
    orq t1, t2
    btqz t2, tagMask, .slow
    bqaeq t0, tagTypeNumber, .leftOK
    btqnz t0, tagTypeNumber, .slow
.leftOK:
    bqaeq t1, tagTypeNumber, .rightOK
    btqnz t1, tagTypeNumber, .slow
.rightOK:
    equalityOperation(t0, t1, t0)
    loadisFromInstruction(1, t1)
    orq ValueFalse, t0
    storeq t0, [cfr, t1, 8]
    dispatch(4)

.slow:
    callOpcodeSlowPath(slowPath)
    dispatch(4)
end

_llint_op_stricteq:
    strictEq(
        macro (left, right, result) cqeq left, right, result end,
        _slow_path_stricteq)


_llint_op_nstricteq:
    strictEq(
        macro (left, right, result) cqneq left, right, result end,
        _slow_path_nstricteq)


macro preOp(arithmeticOperation, slowPath)
    traceExecution()
    loadisFromInstruction(1, t0)
    loadq [cfr, t0, 8], t1
    bqb t1, tagTypeNumber, .slow
    arithmeticOperation(t1, .slow)
    orq tagTypeNumber, t1
    storeq t1, [cfr, t0, 8]
    dispatch(2)

.slow:
    callOpcodeSlowPath(slowPath)
    dispatch(2)
end

_llint_op_inc:
    preOp(
        macro (value, slow) baddio 1, value, slow end,
        _slow_path_inc)


_llint_op_dec:
    preOp(
        macro (value, slow) bsubio 1, value, slow end,
        _slow_path_dec)


_llint_op_to_number:
    traceExecution()
    loadisFromInstruction(2, t0)
    loadisFromInstruction(1, t1)
    loadConstantOrVariable(t0, t2)
    bqaeq t2, tagTypeNumber, .opToNumberIsImmediate
    btqz t2, tagTypeNumber, .opToNumberSlow
.opToNumberIsImmediate:
    storeq t2, [cfr, t1, 8]
    valueProfile(t2, 3, t0)
    dispatch(constexpr op_to_number_length)

.opToNumberSlow:
    callOpcodeSlowPath(_slow_path_to_number)
    dispatch(constexpr op_to_number_length)


_llint_op_to_string:
    traceExecution()
    loadisFromInstruction(2, t1)
    loadisFromInstruction(1, t2)
    loadConstantOrVariable(t1, t0)
    btqnz t0, tagMask, .opToStringSlow
    bbneq JSCell::m_type[t0], StringType, .opToStringSlow
.opToStringIsString:
    storeq t0, [cfr, t2, 8]
    dispatch(constexpr op_to_string_length)

.opToStringSlow:
    callOpcodeSlowPath(_slow_path_to_string)
    dispatch(constexpr op_to_string_length)


_llint_op_negate:
    traceExecution()
    loadisFromInstruction(2, t0)
    loadisFromInstruction(1, t1)
    loadConstantOrVariable(t0, t3)
    loadisFromInstruction(3, t2)
    bqb t3, tagTypeNumber, .opNegateNotInt
    btiz t3, 0x7fffffff, .opNegateSlow
    negi t3
    ori ArithProfileInt, t2
    orq tagTypeNumber, t3
    storeisToInstruction(t2, 3)
    storeq t3, [cfr, t1, 8]
    dispatch(constexpr op_negate_length)
.opNegateNotInt:
    btqz t3, tagTypeNumber, .opNegateSlow
    xorq 0x8000000000000000, t3
    ori ArithProfileNumber, t2
    storeq t3, [cfr, t1, 8]
    storeisToInstruction(t2, 3)
    dispatch(constexpr op_negate_length)

.opNegateSlow:
    callOpcodeSlowPath(_slow_path_negate)
    dispatch(constexpr op_negate_length)


macro binaryOpCustomStore(integerOperationAndStore, doubleOperation, slowPath)
    loadisFromInstruction(3, t0)
    loadisFromInstruction(2, t2)
    loadConstantOrVariable(t0, t1)
    loadConstantOrVariable(t2, t0)
    bqb t0, tagTypeNumber, .op1NotInt
    bqb t1, tagTypeNumber, .op2NotInt
    loadisFromInstruction(1, t2)
    integerOperationAndStore(t1, t0, .slow, t2)
    loadisFromInstruction(4, t1)
    ori ArithProfileIntInt, t1
    storeisToInstruction(t1, 4)
    dispatch(5)

.op1NotInt:
    # First operand is definitely not an int, the second operand could be anything.
    btqz t0, tagTypeNumber, .slow
    bqaeq t1, tagTypeNumber, .op1NotIntOp2Int
    btqz t1, tagTypeNumber, .slow
    addq tagTypeNumber, t1
    fq2d t1, ft1
    loadisFromInstruction(4, t2)
    ori ArithProfileNumberNumber, t2
    storeisToInstruction(t2, 4)
    jmp .op1NotIntReady
.op1NotIntOp2Int:
    loadisFromInstruction(4, t2)
    ori ArithProfileNumberInt, t2
    storeisToInstruction(t2, 4)
    ci2d t1, ft1
.op1NotIntReady:
    loadisFromInstruction(1, t2)
    addq tagTypeNumber, t0
    fq2d t0, ft0
    doubleOperation(ft1, ft0)
    fd2q ft0, t0
    subq tagTypeNumber, t0
    storeq t0, [cfr, t2, 8]
    dispatch(5)

.op2NotInt:
    # First operand is definitely an int, the second is definitely not.
    loadisFromInstruction(1, t2)
    btqz t1, tagTypeNumber, .slow
    loadisFromInstruction(4, t3)
    ori ArithProfileIntNumber, t3
    storeisToInstruction(t3, 4)
    ci2d t0, ft0
    addq tagTypeNumber, t1
    fq2d t1, ft1
    doubleOperation(ft1, ft0)
    fd2q ft0, t0
    subq tagTypeNumber, t0
    storeq t0, [cfr, t2, 8]
    dispatch(5)

.slow:
    callOpcodeSlowPath(slowPath)
    dispatch(5)
end

macro binaryOp(integerOperation, doubleOperation, slowPath)
    binaryOpCustomStore(
        macro (left, right, slow, index)
            integerOperation(left, right, slow)
            orq tagTypeNumber, right
            storeq right, [cfr, index, 8]
        end,
        doubleOperation, slowPath)
end

_llint_op_add:
    traceExecution()
    binaryOp(
        macro (left, right, slow) baddio left, right, slow end,
        macro (left, right) addd left, right end,
        _slow_path_add)


_llint_op_mul:
    traceExecution()
    binaryOpCustomStore(
        macro (left, right, slow, index)
            # Assume t3 is scratchable.
            move right, t3
            bmulio left, t3, slow
            btinz t3, .done
            bilt left, 0, slow
            bilt right, 0, slow
        .done:
            orq tagTypeNumber, t3
            storeq t3, [cfr, index, 8]
        end,
        macro (left, right) muld left, right end,
        _slow_path_mul)


_llint_op_sub:
    traceExecution()
    binaryOp(
        macro (left, right, slow) bsubio left, right, slow end,
        macro (left, right) subd left, right end,
        _slow_path_sub)


_llint_op_div:
    traceExecution()
    if X86_64 or X86_64_WIN
        binaryOpCustomStore(
            macro (left, right, slow, index)
                # Assume t3 is scratchable.
                btiz left, slow
                bineq left, -1, .notNeg2TwoThe31DivByNeg1
                bieq right, -2147483648, .slow
            .notNeg2TwoThe31DivByNeg1:
                btinz right, .intOK
                bilt left, 0, slow
            .intOK:
                move left, t3
                move right, t0
                cdqi
                idivi t3
                btinz t1, slow
                orq tagTypeNumber, t0
                storeq t0, [cfr, index, 8]
            end,
            macro (left, right) divd left, right end,
            _slow_path_div)
    else
        callOpcodeSlowPath(_slow_path_div)
        dispatch(constexpr op_div_length)
    end


macro bitOp(operation, slowPath, advance)
    loadisFromInstruction(3, t0)
    loadisFromInstruction(2, t2)
    loadisFromInstruction(1, t3)
    loadConstantOrVariable(t0, t1)
    loadConstantOrVariable(t2, t0)
    bqb t0, tagTypeNumber, .slow
    bqb t1, tagTypeNumber, .slow
    operation(t1, t0)
    orq tagTypeNumber, t0
    storeq t0, [cfr, t3, 8]
    dispatch(advance)

.slow:
    callOpcodeSlowPath(slowPath)
    dispatch(advance)
end

_llint_op_lshift:
    traceExecution()
    bitOp(
        macro (left, right) lshifti left, right end,
        _slow_path_lshift,
        constexpr op_lshift_length)


_llint_op_rshift:
    traceExecution()
    bitOp(
        macro (left, right) rshifti left, right end,
        _slow_path_rshift,
        constexpr op_rshift_length)


_llint_op_urshift:
    traceExecution()
    bitOp(
        macro (left, right) urshifti left, right end,
        _slow_path_urshift,
        constexpr op_urshift_length)


_llint_op_unsigned:
    traceExecution()
    loadisFromInstruction(1, t0)
    loadisFromInstruction(2, t1)
    loadConstantOrVariable(t1, t2)
    bilt t2, 0, .opUnsignedSlow
    storeq t2, [cfr, t0, 8]
    dispatch(constexpr op_unsigned_length)
.opUnsignedSlow:
    callOpcodeSlowPath(_slow_path_unsigned)
    dispatch(constexpr op_unsigned_length)


_llint_op_bitand:
    traceExecution()
    bitOp(
        macro (left, right) andi left, right end,
        _slow_path_bitand,
        constexpr op_bitand_length)


_llint_op_bitxor:
    traceExecution()
    bitOp(
        macro (left, right) xori left, right end,
        _slow_path_bitxor,
        constexpr op_bitxor_length)


_llint_op_bitor:
    traceExecution()
    bitOp(
        macro (left, right) ori left, right end,
        _slow_path_bitor,
        constexpr op_bitor_length)


_llint_op_overrides_has_instance:
    traceExecution()
    loadisFromInstruction(1, t3)

    loadisFromInstruction(3, t1)
    loadConstantOrVariable(t1, t0)
    loadp CodeBlock[cfr], t2
    loadp CodeBlock::m_globalObject[t2], t2
    loadp JSGlobalObject::m_functionProtoHasInstanceSymbolFunction[t2], t2
    bqneq t0, t2, .opOverridesHasInstanceNotDefaultSymbol

    loadisFromInstruction(2, t1)
    loadConstantOrVariable(t1, t0)
    tbz JSCell::m_flags[t0], ImplementsDefaultHasInstance, t1
    orq ValueFalse, t1
    storeq t1, [cfr, t3, 8]
    dispatch(constexpr op_overrides_has_instance_length)

.opOverridesHasInstanceNotDefaultSymbol:
    storeq ValueTrue, [cfr, t3, 8]
    dispatch(constexpr op_overrides_has_instance_length)


_llint_op_instanceof_custom:
    traceExecution()
    callOpcodeSlowPath(_llint_slow_path_instanceof_custom)
    dispatch(constexpr op_instanceof_custom_length)


_llint_op_is_empty:
    traceExecution()
    loadisFromInstruction(2, t1)
    loadisFromInstruction(1, t2)
    loadConstantOrVariable(t1, t0)
    cqeq t0, ValueEmpty, t3
    orq ValueFalse, t3
    storeq t3, [cfr, t2, 8]
    dispatch(constexpr op_is_empty_length)


_llint_op_is_undefined:
    traceExecution()
    loadisFromInstruction(2, t1)
    loadisFromInstruction(1, t2)
    loadConstantOrVariable(t1, t0)
    btqz t0, tagMask, .opIsUndefinedCell
    cqeq t0, ValueUndefined, t3
    orq ValueFalse, t3
    storeq t3, [cfr, t2, 8]
    dispatch(constexpr op_is_undefined_length)
.opIsUndefinedCell:
    btbnz JSCell::m_flags[t0], MasqueradesAsUndefined, .masqueradesAsUndefined
    move ValueFalse, t1
    storeq t1, [cfr, t2, 8]
    dispatch(constexpr op_is_undefined_length)
.masqueradesAsUndefined:
    loadStructureWithScratch(t0, t3, t1)
    loadp CodeBlock[cfr], t1
    loadp CodeBlock::m_globalObject[t1], t1
    cpeq Structure::m_globalObject[t3], t1, t0
    orq ValueFalse, t0
    storeq t0, [cfr, t2, 8]
    dispatch(constexpr op_is_undefined_length)


_llint_op_is_boolean:
    traceExecution()
    loadisFromInstruction(2, t1)
    loadisFromInstruction(1, t2)
    loadConstantOrVariable(t1, t0)
    xorq ValueFalse, t0
    tqz t0, ~1, t0
    orq ValueFalse, t0
    storeq t0, [cfr, t2, 8]
    dispatch(constexpr op_is_boolean_length)


_llint_op_is_number:
    traceExecution()
    loadisFromInstruction(2, t1)
    loadisFromInstruction(1, t2)
    loadConstantOrVariable(t1, t0)
    tqnz t0, tagTypeNumber, t1
    orq ValueFalse, t1
    storeq t1, [cfr, t2, 8]
    dispatch(constexpr op_is_number_length)


_llint_op_is_cell_with_type:
    traceExecution()
    loadisFromInstruction(3, t0)
    loadisFromInstruction(2, t1)
    loadisFromInstruction(1, t2)
    loadConstantOrVariable(t1, t3)
    btqnz t3, tagMask, .notCellCase
    cbeq JSCell::m_type[t3], t0, t1
    orq ValueFalse, t1
    storeq t1, [cfr, t2, 8]
    dispatch(constexpr op_is_cell_with_type_length)
.notCellCase:
    storeq ValueFalse, [cfr, t2, 8]
    dispatch(constexpr op_is_cell_with_type_length)


_llint_op_is_object:
    traceExecution()
    loadisFromInstruction(2, t1)
    loadisFromInstruction(1, t2)
    loadConstantOrVariable(t1, t0)
    btqnz t0, tagMask, .opIsObjectNotCell
    cbaeq JSCell::m_type[t0], ObjectType, t1
    orq ValueFalse, t1
    storeq t1, [cfr, t2, 8]
    dispatch(constexpr op_is_object_length)
.opIsObjectNotCell:
    storeq ValueFalse, [cfr, t2, 8]
    dispatch(constexpr op_is_object_length)


macro loadPropertyAtVariableOffset(propertyOffsetAsInt, objectAndStorage, value)
    bilt propertyOffsetAsInt, firstOutOfLineOffset, .isInline
    loadCaged(_g_jsValueGigacageBasePtr, JSObject::m_butterfly[objectAndStorage], objectAndStorage, value)
    negi propertyOffsetAsInt
    sxi2q propertyOffsetAsInt, propertyOffsetAsInt
    jmp .ready
.isInline:
    addp sizeof JSObject - (firstOutOfLineOffset - 2) * 8, objectAndStorage
.ready:
    loadq (firstOutOfLineOffset - 2) * 8[objectAndStorage, propertyOffsetAsInt, 8], value
end


macro storePropertyAtVariableOffset(propertyOffsetAsInt, objectAndStorage, value, scratch)
    bilt propertyOffsetAsInt, firstOutOfLineOffset, .isInline
    loadCaged(_g_jsValueGigacageBasePtr, JSObject::m_butterfly[objectAndStorage], objectAndStorage, scratch)
    negi propertyOffsetAsInt
    sxi2q propertyOffsetAsInt, propertyOffsetAsInt
    jmp .ready
.isInline:
    addp sizeof JSObject - (firstOutOfLineOffset - 2) * 8, objectAndStorage
.ready:
    storeq value, (firstOutOfLineOffset - 2) * 8[objectAndStorage, propertyOffsetAsInt, 8]
end

_llint_op_get_by_id:
    traceExecution()
    loadisFromInstruction(2, t0)
    loadConstantOrVariableCell(t0, t3, .opGetByIdSlow)
    loadi JSCell::m_structureID[t3], t1
    loadisFromInstruction(4, t2)
    bineq t2, t1, .opGetByIdSlow
    loadisFromInstruction(5, t1)
    loadisFromInstruction(1, t2)
    loadPropertyAtVariableOffset(t1, t3, t0)
    storeq t0, [cfr, t2, 8]
    valueProfile(t0, 8, t1)
    dispatch(constexpr op_get_by_id_length)

.opGetByIdSlow:
    callOpcodeSlowPath(_llint_slow_path_get_by_id)
    dispatch(constexpr op_get_by_id_length)


_llint_op_get_by_id_proto_load:
    traceExecution()
    loadisFromInstruction(2, t0)
    loadConstantOrVariableCell(t0, t3, .opGetByIdProtoSlow)
    loadi JSCell::m_structureID[t3], t1
    loadisFromInstruction(4, t2)
    bineq t2, t1, .opGetByIdProtoSlow
    loadisFromInstruction(5, t1)
    loadpFromInstruction(6, t3)
    loadisFromInstruction(1, t2)
    loadPropertyAtVariableOffset(t1, t3, t0)
    storeq t0, [cfr, t2, 8]
    valueProfile(t0, 8, t1)
    dispatch(constexpr op_get_by_id_proto_load_length)

.opGetByIdProtoSlow:
    callOpcodeSlowPath(_llint_slow_path_get_by_id)
    dispatch(constexpr op_get_by_id_proto_load_length)


_llint_op_get_by_id_unset:
    traceExecution()
    loadisFromInstruction(2, t0)
    loadConstantOrVariableCell(t0, t3, .opGetByIdUnsetSlow)
    loadi JSCell::m_structureID[t3], t1
    loadisFromInstruction(4, t2)
    bineq t2, t1, .opGetByIdUnsetSlow
    loadisFromInstruction(1, t2)
    storeq ValueUndefined, [cfr, t2, 8]
    valueProfile(ValueUndefined, 8, t1)
    dispatch(constexpr op_get_by_id_unset_length)

.opGetByIdUnsetSlow:
    callOpcodeSlowPath(_llint_slow_path_get_by_id)
    dispatch(constexpr op_get_by_id_unset_length)


_llint_op_get_array_length:
    traceExecution()
    loadisFromInstruction(2, t0)
    loadpFromInstruction(4, t1)
    loadConstantOrVariableCell(t0, t3, .opGetArrayLengthSlow)
    move t3, t2
    arrayProfile(t2, t1, t0)
    btiz t2, IsArray, .opGetArrayLengthSlow
    btiz t2, IndexingShapeMask, .opGetArrayLengthSlow
    loadisFromInstruction(1, t1)
    loadCaged(_g_jsValueGigacageBasePtr, JSObject::m_butterfly[t3], t0, t2)
    loadi -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t0], t0
    bilt t0, 0, .opGetArrayLengthSlow
    orq tagTypeNumber, t0
    valueProfile(t0, 8, t2)
    storeq t0, [cfr, t1, 8]
    dispatch(constexpr op_get_array_length_length)

.opGetArrayLengthSlow:
    callOpcodeSlowPath(_llint_slow_path_get_by_id)
    dispatch(constexpr op_get_array_length_length)


_llint_op_put_by_id:
    traceExecution()
    loadisFromInstruction(1, t3)
    loadConstantOrVariableCell(t3, t0, .opPutByIdSlow)
    loadisFromInstruction(4, t2)
    bineq t2, JSCell::m_structureID[t0], .opPutByIdSlow

    # At this point, we have:
    # t2 -> current structure ID
    # t0 -> object base

    loadisFromInstruction(3, t1)
    loadConstantOrVariable(t1, t3)

    loadpFromInstruction(8, t1)

    # At this point, we have:
    # t0 -> object base
    # t1 -> put by id flags
    # t2 -> current structure ID
    # t3 -> value to put

    btpnz t1, PutByIdPrimaryTypeMask, .opPutByIdTypeCheckObjectWithStructureOrOther

    # We have one of the non-structure type checks. Find out which one.
    andp PutByIdSecondaryTypeMask, t1
    bplt t1, PutByIdSecondaryTypeString, .opPutByIdTypeCheckLessThanString

    # We are one of the following: String, Symbol, Object, ObjectOrOther, Top
    bplt t1, PutByIdSecondaryTypeObjectOrOther, .opPutByIdTypeCheckLessThanObjectOrOther

    # We are either ObjectOrOther or Top.
    bpeq t1, PutByIdSecondaryTypeTop, .opPutByIdDoneCheckingTypes

    # Check if we are ObjectOrOther.
    btqz t3, tagMask, .opPutByIdTypeCheckObject
.opPutByIdTypeCheckOther:
    andq ~TagBitUndefined, t3
    bqeq t3, ValueNull, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow

.opPutByIdTypeCheckLessThanObjectOrOther:
    # We are either String, Symbol or Object.
    btqnz t3, tagMask, .opPutByIdSlow
    bpeq t1, PutByIdSecondaryTypeObject, .opPutByIdTypeCheckObject
    bpeq t1, PutByIdSecondaryTypeSymbol, .opPutByIdTypeCheckSymbol
    bbeq JSCell::m_type[t3], StringType, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow
.opPutByIdTypeCheckObject:
    bbaeq JSCell::m_type[t3], ObjectType, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow
.opPutByIdTypeCheckSymbol:
    bbeq JSCell::m_type[t3], SymbolType, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow

.opPutByIdTypeCheckLessThanString:
    # We are one of the following: Bottom, Boolean, Other, Int32, Number
    bplt t1, PutByIdSecondaryTypeInt32, .opPutByIdTypeCheckLessThanInt32

    # We are either Int32 or Number.
    bpeq t1, PutByIdSecondaryTypeNumber, .opPutByIdTypeCheckNumber

    bqaeq t3, tagTypeNumber, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow

.opPutByIdTypeCheckNumber:
    btqnz t3, tagTypeNumber, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow

.opPutByIdTypeCheckLessThanInt32:
    # We are one of the following: Bottom, Boolean, Other.
    bpneq t1, PutByIdSecondaryTypeBoolean, .opPutByIdTypeCheckBottomOrOther
    xorq ValueFalse, t3
    btqz t3, ~1, .opPutByIdDoneCheckingTypes
    jmp .opPutByIdSlow

.opPutByIdTypeCheckBottomOrOther:
    bpeq t1, PutByIdSecondaryTypeOther, .opPutByIdTypeCheckOther
    jmp .opPutByIdSlow

.opPutByIdTypeCheckObjectWithStructureOrOther:
    btqz t3, tagMask, .opPutByIdTypeCheckObjectWithStructure
    btpnz t1, PutByIdPrimaryTypeObjectWithStructureOrOther, .opPutByIdTypeCheckOther
    jmp .opPutByIdSlow

.opPutByIdTypeCheckObjectWithStructure:
    urshiftp 3, t1
    bineq t1, JSCell::m_structureID[t3], .opPutByIdSlow

.opPutByIdDoneCheckingTypes:
    loadisFromInstruction(6, t1)
    
    btiz t1, .opPutByIdNotTransition

    # This is the transition case. t1 holds the new structureID. t2 holds the old structure ID.
    # If we have a chain, we need to check it. t0 is the base. We may clobber t1 to use it as
    # scratch.
    loadpFromInstruction(7, t3)
    btpz t3, .opPutByIdTransitionDirect

    loadp StructureChain::m_vector[t3], t3
    assert(macro (ok) btpnz t3, ok end)

    structureIDToStructureWithScratch(t2, t1)
    loadq Structure::m_prototype[t2], t2
    bqeq t2, ValueNull, .opPutByIdTransitionChainDone
.opPutByIdTransitionChainLoop:
    # At this point, t2 contains a prototye, and [t3] contains the Structure* that we want that
    # prototype to have. We don't want to have to load the Structure* for t2. Instead, we load
    # the Structure* from [t3], and then we compare its id to the id in the header of t2.
    loadp [t3], t1
    loadi JSCell::m_structureID[t2], t2
    # Now, t1 has the Structure* and t2 has the StructureID that we want that Structure* to have.
    bineq t2, Structure::m_blob + StructureIDBlob::u.fields.structureID[t1], .opPutByIdSlow
    addp 8, t3
    loadq Structure::m_prototype[t1], t2
    bqneq t2, ValueNull, .opPutByIdTransitionChainLoop

.opPutByIdTransitionChainDone:
    # Reload the new structure, since we clobbered it above.
    loadisFromInstruction(6, t1)

.opPutByIdTransitionDirect:
    storei t1, JSCell::m_structureID[t0]
    writeBarrierOnOperand(1)
    # Reload base into t0
    loadisFromInstruction(1, t1)
    loadConstantOrVariable(t1, t0)

.opPutByIdNotTransition:
    # The only thing live right now is t0, which holds the base.
    loadisFromInstruction(3, t1)
    loadConstantOrVariable(t1, t2)
    loadisFromInstruction(5, t1)
    storePropertyAtVariableOffset(t1, t0, t2, t3)
    writeBarrierOnOperands(1, 3)
    dispatch(constexpr op_put_by_id_length)

.opPutByIdSlow:
    callOpcodeSlowPath(_llint_slow_path_put_by_id)
    dispatch(constexpr op_put_by_id_length)

macro finishGetByVal(result, scratch)
    loadisFromInstruction(1, scratch)
    storeq result, [cfr, scratch, 8]
    valueProfile(result, 5, scratch)
    dispatch(6)
end

macro finishIntGetByVal(result, scratch)
    orq tagTypeNumber, result
    finishGetByVal(result, scratch)
end

macro finishDoubleGetByVal(result, scratch1, scratch2)
    fd2q result, scratch1
    subq tagTypeNumber, scratch1
    finishGetByVal(scratch1, scratch2)
end

_llint_op_get_by_val:
    traceExecution()
    loadisFromInstruction(2, t2)
    loadConstantOrVariableCell(t2, t0, .opGetByValSlow)
    loadpFromInstruction(4, t3)
    move t0, t2
    arrayProfile(t2, t3, t1)
    loadisFromInstruction(3, t3)
    loadConstantOrVariableInt32(t3, t1, .opGetByValSlow)
    sxi2q t1, t1
    loadCaged(_g_jsValueGigacageBasePtr, JSObject::m_butterfly[t0], t3, t5)
    andi IndexingShapeMask, t2
    bieq t2, Int32Shape, .opGetByValIsContiguous
    bineq t2, ContiguousShape, .opGetByValNotContiguous
.opGetByValIsContiguous:

    biaeq t1, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t3], .opGetByValOutOfBounds
    loadisFromInstruction(1, t0)
    loadq [t3, t1, 8], t2
    btqz t2, .opGetByValOutOfBounds
    jmp .opGetByValDone

.opGetByValNotContiguous:
    bineq t2, DoubleShape, .opGetByValNotDouble
    biaeq t1, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t3], .opGetByValOutOfBounds
    loadis 8[PB, PC, 8], t0
    loadd [t3, t1, 8], ft0
    bdnequn ft0, ft0, .opGetByValOutOfBounds
    fd2q ft0, t2
    subq tagTypeNumber, t2
    jmp .opGetByValDone
    
.opGetByValNotDouble:
    subi ArrayStorageShape, t2
    bia t2, SlowPutArrayStorageShape - ArrayStorageShape, .opGetByValNotIndexedStorage
    biaeq t1, -sizeof IndexingHeader + IndexingHeader::u.lengths.vectorLength[t3], .opGetByValOutOfBounds
    loadisFromInstruction(1, t0)
    loadq ArrayStorage::m_vector[t3, t1, 8], t2
    btqz t2, .opGetByValOutOfBounds

.opGetByValDone:
    storeq t2, [cfr, t0, 8]
    valueProfile(t2, 5, t0)
    dispatch(constexpr op_get_by_val_length)

.opGetByValOutOfBounds:
    loadpFromInstruction(4, t0)
    storeb 1, ArrayProfile::m_outOfBounds[t0]
    jmp .opGetByValSlow

.opGetByValNotIndexedStorage:
    # First lets check if we even have a typed array. This lets us do some boilerplate up front.
    loadb JSCell::m_type[t0], t2
    subi FirstArrayType, t2
    bia t2, LastArrayType - FirstArrayType, .opGetByValSlow
    
    # Sweet, now we know that we have a typed array. Do some basic things now.
    loadCaged(_g_primitiveGigacageBasePtr, JSArrayBufferView::m_vector[t0], t3, t5)
    biaeq t1, JSArrayBufferView::m_length[t0], .opGetByValSlow
    
    # Now bisect through the various types. Note that we can treat Uint8ArrayType and
    # Uint8ClampedArrayType the same.
    bia t2, Uint8ClampedArrayType - FirstArrayType, .opGetByValAboveUint8ClampedArray
    
    # We have one of Int8ArrayType .. Uint8ClampedArrayType.
    bia t2, Int16ArrayType - FirstArrayType, .opGetByValInt32ArrayOrUint8Array
    
    # We have one of Int8ArrayType or Int16ArrayType
    bineq t2, Int8ArrayType - FirstArrayType, .opGetByValInt16Array
    
    # We have Int8ArrayType
    loadbs [t3, t1], t0
    finishIntGetByVal(t0, t1)

.opGetByValInt16Array:
    loadhs [t3, t1, 2], t0
    finishIntGetByVal(t0, t1)

.opGetByValInt32ArrayOrUint8Array:
    # We have one of Int16Array, Uint8Array, or Uint8ClampedArray.
    bieq t2, Int32ArrayType - FirstArrayType, .opGetByValInt32Array
    
    # We have either Uint8Array or Uint8ClampedArray. They behave the same so that's cool.
    loadb [t3, t1], t0
    finishIntGetByVal(t0, t1)

.opGetByValInt32Array:
    loadi [t3, t1, 4], t0
    finishIntGetByVal(t0, t1)

.opGetByValAboveUint8ClampedArray:
    # We have one of Uint16ArrayType .. Float64ArrayType.
    bia t2, Uint32ArrayType - FirstArrayType, .opGetByValAboveUint32Array
    
    # We have either Uint16ArrayType or Uint32ArrayType.
    bieq t2, Uint32ArrayType - FirstArrayType, .opGetByValUint32Array

    # We have Uint16ArrayType.
    loadh [t3, t1, 2], t0
    finishIntGetByVal(t0, t1)

.opGetByValUint32Array:
    # This is the hardest part because of large unsigned values.
    loadi [t3, t1, 4], t0
    bilt t0, 0, .opGetByValSlow # This case is still awkward to implement in LLInt.
    finishIntGetByVal(t0, t1)

.opGetByValAboveUint32Array:
    # We have one of Float32ArrayType or Float64ArrayType. Sadly, we cannot handle Float32Array
    # inline yet. That would require some offlineasm changes.
    bieq t2, Float32ArrayType - FirstArrayType, .opGetByValSlow

    # We have Float64ArrayType.
    loadd [t3, t1, 8], ft0
    bdnequn ft0, ft0, .opGetByValSlow
    finishDoubleGetByVal(ft0, t0, t1)

.opGetByValSlow:
    callOpcodeSlowPath(_llint_slow_path_get_by_val)
    dispatch(constexpr op_get_by_val_length)


macro contiguousPutByVal(storeCallback)
    biaeq t3, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t0], .outOfBounds
.storeResult:
    loadisFromInstruction(3, t2)
    storeCallback(t2, t1, [t0, t3, 8])
    dispatch(5)

.outOfBounds:
    biaeq t3, -sizeof IndexingHeader + IndexingHeader::u.lengths.vectorLength[t0], .opPutByValOutOfBounds
    loadp 32[PB, PC, 8], t2
    storeb 1, ArrayProfile::m_mayStoreToHole[t2]
    addi 1, t3, t2
    storei t2, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t0]
    jmp .storeResult
end

macro putByVal(slowPath)
    traceExecution()
    loadisFromInstruction(1, t0)
    loadConstantOrVariableCell(t0, t1, .opPutByValSlow)
    loadpFromInstruction(4, t3)
    move t1, t2
    arrayProfile(t2, t3, t0)
    loadisFromInstruction(2, t0)
    loadConstantOrVariableInt32(t0, t3, .opPutByValSlow)
    sxi2q t3, t3
    loadCaged(_g_jsValueGigacageBasePtr, JSObject::m_butterfly[t1], t0, t5)
    andi IndexingShapeMask, t2
    bineq t2, Int32Shape, .opPutByValNotInt32
    contiguousPutByVal(
        macro (operand, scratch, address)
            loadConstantOrVariable(operand, scratch)
            bpb scratch, tagTypeNumber, .opPutByValSlow
            storep scratch, address
            writeBarrierOnOperands(1, 3)
        end)

.opPutByValNotInt32:
    bineq t2, DoubleShape, .opPutByValNotDouble
    contiguousPutByVal(
        macro (operand, scratch, address)
            loadConstantOrVariable(operand, scratch)
            bqb scratch, tagTypeNumber, .notInt
            ci2d scratch, ft0
            jmp .ready
        .notInt:
            addp tagTypeNumber, scratch
            fq2d scratch, ft0
            bdnequn ft0, ft0, .opPutByValSlow
        .ready:
            stored ft0, address
            writeBarrierOnOperands(1, 3)
        end)

.opPutByValNotDouble:
    bineq t2, ContiguousShape, .opPutByValNotContiguous
    contiguousPutByVal(
        macro (operand, scratch, address)
            loadConstantOrVariable(operand, scratch)
            storep scratch, address
            writeBarrierOnOperands(1, 3)
        end)

.opPutByValNotContiguous:
    bineq t2, ArrayStorageShape, .opPutByValSlow
    biaeq t3, -sizeof IndexingHeader + IndexingHeader::u.lengths.vectorLength[t0], .opPutByValOutOfBounds
    btqz ArrayStorage::m_vector[t0, t3, 8], .opPutByValArrayStorageEmpty
.opPutByValArrayStorageStoreResult:
    loadisFromInstruction(3, t2)
    loadConstantOrVariable(t2, t1)
    storeq t1, ArrayStorage::m_vector[t0, t3, 8]
    writeBarrierOnOperands(1, 3)
    dispatch(5)

.opPutByValArrayStorageEmpty:
    loadpFromInstruction(4, t1)
    storeb 1, ArrayProfile::m_mayStoreToHole[t1]
    addi 1, ArrayStorage::m_numValuesInVector[t0]
    bib t3, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t0], .opPutByValArrayStorageStoreResult
    addi 1, t3, t1
    storei t1, -sizeof IndexingHeader + IndexingHeader::u.lengths.publicLength[t0]
    jmp .opPutByValArrayStorageStoreResult

.opPutByValOutOfBounds:
    loadpFromInstruction(4, t0)
    storeb 1, ArrayProfile::m_outOfBounds[t0]
.opPutByValSlow:
    callOpcodeSlowPath(slowPath)
    dispatch(5)
end

_llint_op_put_by_val:
    putByVal(_llint_slow_path_put_by_val)

_llint_op_put_by_val_direct:
    putByVal(_llint_slow_path_put_by_val_direct)


_llint_op_jmp:
    traceExecution()
    dispatchIntIndirect(1)


macro jumpTrueOrFalse(conditionOp, slow)
    loadisFromInstruction(1, t1)
    loadConstantOrVariable(t1, t0)
    xorq ValueFalse, t0
    btqnz t0, -1, .slow
    conditionOp(t0, .target)
    dispatch(3)

.target:
    dispatchIntIndirect(2)

.slow:
    callOpcodeSlowPath(slow)
    dispatch(0)
end


macro equalNull(cellHandler, immediateHandler)
    loadisFromInstruction(1, t0)
    assertNotConstant(t0)
    loadq [cfr, t0, 8], t0
    btqnz t0, tagMask, .immediate
    loadStructureWithScratch(t0, t2, t1)
    cellHandler(t2, JSCell::m_flags[t0], .target)
    dispatch(3)

.target:
    dispatchIntIndirect(2)

.immediate:
    andq ~TagBitUndefined, t0
    immediateHandler(t0, .target)
    dispatch(3)
end

_llint_op_jeq_null:
    traceExecution()
    equalNull(
        macro (structure, value, target) 
            btbz value, MasqueradesAsUndefined, .notMasqueradesAsUndefined
            loadp CodeBlock[cfr], t0
            loadp CodeBlock::m_globalObject[t0], t0
            bpeq Structure::m_globalObject[structure], t0, target
.notMasqueradesAsUndefined:
        end,
        macro (value, target) bqeq value, ValueNull, target end)


_llint_op_jneq_null:
    traceExecution()
    equalNull(
        macro (structure, value, target) 
            btbz value, MasqueradesAsUndefined, target
            loadp CodeBlock[cfr], t0
            loadp CodeBlock::m_globalObject[t0], t0
            bpneq Structure::m_globalObject[structure], t0, target
        end,
        macro (value, target) bqneq value, ValueNull, target end)


_llint_op_jneq_ptr:
    traceExecution()
    loadisFromInstruction(1, t0)
    loadisFromInstruction(2, t1)
    loadp CodeBlock[cfr], t2
    loadp CodeBlock::m_globalObject[t2], t2
    loadp JSGlobalObject::m_specialPointers[t2, t1, 8], t1
    bpneq t1, [cfr, t0, 8], .opJneqPtrTarget
    dispatch(5)

.opJneqPtrTarget:
    storei 1, 32[PB, PC, 8]
    dispatchIntIndirect(3)


macro compare(integerCompare, doubleCompare, slowPath)
    loadisFromInstruction(1, t2)
    loadisFromInstruction(2, t3)
    loadConstantOrVariable(t2, t0)
    loadConstantOrVariable(t3, t1)
    bqb t0, tagTypeNumber, .op1NotInt
    bqb t1, tagTypeNumber, .op2NotInt
    integerCompare(t0, t1, .jumpTarget)
    dispatch(4)

.op1NotInt:
    btqz t0, tagTypeNumber, .slow
    bqb t1, tagTypeNumber, .op1NotIntOp2NotInt
    ci2d t1, ft1
    jmp .op1NotIntReady
.op1NotIntOp2NotInt:
    btqz t1, tagTypeNumber, .slow
    addq tagTypeNumber, t1
    fq2d t1, ft1
.op1NotIntReady:
    addq tagTypeNumber, t0
    fq2d t0, ft0
    doubleCompare(ft0, ft1, .jumpTarget)
    dispatch(4)

.op2NotInt:
    ci2d t0, ft0
    btqz t1, tagTypeNumber, .slow
    addq tagTypeNumber, t1
    fq2d t1, ft1
    doubleCompare(ft0, ft1, .jumpTarget)
    dispatch(4)

.jumpTarget:
    dispatchIntIndirect(3)

.slow:
    callOpcodeSlowPath(slowPath)
    dispatch(0)
end


_llint_op_switch_imm:
    traceExecution()
    loadisFromInstruction(3, t2)
    loadisFromInstruction(1, t3)
    loadConstantOrVariable(t2, t1)
    loadp CodeBlock[cfr], t2
    loadp CodeBlock::m_rareData[t2], t2
    muli sizeof SimpleJumpTable, t3    # FIXME: would be nice to peephole this!
    loadp CodeBlock::RareData::m_switchJumpTables + VectorBufferOffset[t2], t2
    addp t3, t2
    bqb t1, tagTypeNumber, .opSwitchImmNotInt
    subi SimpleJumpTable::min[t2], t1
    biaeq t1, SimpleJumpTable::branchOffsets + VectorSizeOffset[t2], .opSwitchImmFallThrough
    loadp SimpleJumpTable::branchOffsets + VectorBufferOffset[t2], t3
    loadis [t3, t1, 4], t1
    btiz t1, .opSwitchImmFallThrough
    dispatch(t1)

.opSwitchImmNotInt:
    btqnz t1, tagTypeNumber, .opSwitchImmSlow   # Go slow if it's a double.
.opSwitchImmFallThrough:
    dispatchIntIndirect(2)

.opSwitchImmSlow:
    callOpcodeSlowPath(_llint_slow_path_switch_imm)
    dispatch(0)


_llint_op_switch_char:
    traceExecution()
    loadisFromInstruction(3, t2)
    loadisFromInstruction(1, t3)
    loadConstantOrVariable(t2, t1)
    loadp CodeBlock[cfr], t2
    loadp CodeBlock::m_rareData[t2], t2
    muli sizeof SimpleJumpTable, t3
    loadp CodeBlock::RareData::m_switchJumpTables + VectorBufferOffset[t2], t2
    addp t3, t2
    btqnz t1, tagMask, .opSwitchCharFallThrough
    bbneq JSCell::m_type[t1], StringType, .opSwitchCharFallThrough
    bineq JSString::m_length[t1], 1, .opSwitchCharFallThrough
    loadp JSString::m_value[t1], t0
    btpz  t0, .opSwitchOnRope
    loadp StringImpl::m_data8[t0], t1
    btinz StringImpl::m_hashAndFlags[t0], HashFlags8BitBuffer, .opSwitchChar8Bit
    loadh [t1], t0
    jmp .opSwitchCharReady
.opSwitchChar8Bit:
    loadb [t1], t0
.opSwitchCharReady:
    subi SimpleJumpTable::min[t2], t0
    biaeq t0, SimpleJumpTable::branchOffsets + VectorSizeOffset[t2], .opSwitchCharFallThrough
    loadp SimpleJumpTable::branchOffsets + VectorBufferOffset[t2], t2
    loadis [t2, t0, 4], t1
    btiz t1, .opSwitchCharFallThrough
    dispatch(t1)

.opSwitchCharFallThrough:
    dispatchIntIndirect(2)

.opSwitchOnRope:
    callOpcodeSlowPath(_llint_slow_path_switch_char)
    dispatch(0)


macro arrayProfileForCall()
    loadisFromInstruction(4, t3)
    negp t3
    loadq ThisArgumentOffset[cfr, t3, 8], t0
    btqnz t0, tagMask, .done
    loadpFromInstruction((CallOpCodeSize - 2), t1)
    loadi JSCell::m_structureID[t0], t3
    storei t3, ArrayProfile::m_lastSeenStructureID[t1]
.done:
end

macro doCall(slowPath, prepareCall)
    loadisFromInstruction(2, t0)
    loadpFromInstruction(5, t1)
    loadp LLIntCallLinkInfo::callee[t1], t2
    loadConstantOrVariable(t0, t3)
    bqneq t3, t2, .opCallSlow
    loadisFromInstruction(4, t3)
    lshifti 3, t3
    negp t3
    addp cfr, t3
    storeq t2, Callee[t3]
    loadisFromInstruction(3, t2)
    storei PC, ArgumentCount + TagOffset[cfr]
    storei t2, ArgumentCount + PayloadOffset[t3]
    move t3, sp
    prepareCall(LLIntCallLinkInfo::machineCodeTarget[t1], t2, t3, t4)
    callTargetFunction(LLIntCallLinkInfo::machineCodeTarget[t1])

.opCallSlow:
    slowPathForCall(slowPath, prepareCall)
end

_llint_op_ret:
    traceExecution()
    checkSwitchToJITForEpilogue()
    loadisFromInstruction(1, t2)
    loadConstantOrVariable(t2, r0)
    doReturn()


_llint_op_to_primitive:
    traceExecution()
    loadisFromInstruction(2, t2)
    loadisFromInstruction(1, t3)
    loadConstantOrVariable(t2, t0)
    btqnz t0, tagMask, .opToPrimitiveIsImm
    bbaeq JSCell::m_type[t0], ObjectType, .opToPrimitiveSlowCase
.opToPrimitiveIsImm:
    storeq t0, [cfr, t3, 8]
    dispatch(constexpr op_to_primitive_length)

.opToPrimitiveSlowCase:
    callOpcodeSlowPath(_slow_path_to_primitive)
    dispatch(constexpr op_to_primitive_length)


_llint_op_catch:
    # This is where we end up from the JIT's throw trampoline (because the
    # machine code return address will be set to _llint_op_catch), and from
    # the interpreter's throw trampoline (see _llint_throw_trampoline).
    # The throwing code must have known that we were throwing to the interpreter,
    # and have set VM::targetInterpreterPCForThrow.
    loadp Callee[cfr], t3
    andp MarkedBlockMask, t3
    loadp MarkedBlock::m_vm[t3], t3
    restoreCalleeSavesFromVMEntryFrameCalleeSavesBuffer(t3, t0)
    loadp VM::callFrameForCatch[t3], cfr
    storep 0, VM::callFrameForCatch[t3]
    restoreStackPointerAfterCall()

    loadp CodeBlock[cfr], PB
    loadp CodeBlock::m_instructions[PB], PB
    loadp VM::targetInterpreterPCForThrow[t3], PC
    subp PB, PC
    rshiftp 3, PC

    callOpcodeSlowPath(_llint_slow_path_check_if_exception_is_uncatchable_and_notify_profiler)
    bpeq r1, 0, .isCatchableException
    jmp _llint_throw_from_slow_path_trampoline

.isCatchableException:
    loadp Callee[cfr], t3
    andp MarkedBlockMask, t3
    loadp MarkedBlock::m_vm[t3], t3

    loadq VM::m_exception[t3], t0
    storeq 0, VM::m_exception[t3]
    loadisFromInstruction(1, t2)
    storeq t0, [cfr, t2, 8]

    loadq Exception::m_value[t0], t3
    loadisFromInstruction(2, t2)
    storeq t3, [cfr, t2, 8]

    traceExecution()
    dispatch(constexpr op_catch_length)


_llint_op_end:
    traceExecution()
    checkSwitchToJITForEpilogue()
    loadisFromInstruction(1, t0)
    assertNotConstant(t0)
    loadq [cfr, t0, 8], r0
    doReturn()


_llint_throw_from_slow_path_trampoline:
    loadp Callee[cfr], t1
    andp MarkedBlockMask, t1
    loadp MarkedBlock::m_vm[t1], t1
    copyCalleeSavesToVMEntryFrameCalleeSavesBuffer(t1, t2)

    callSlowPath(_llint_slow_path_handle_exception)

    # When throwing from the interpreter (i.e. throwing from LLIntSlowPaths), so
    # the throw target is not necessarily interpreted code, we come to here.
    # This essentially emulates the JIT's throwing protocol.
    loadp Callee[cfr], t1
    andp MarkedBlockMask, t1
    loadp MarkedBlock::m_vm[t1], t1
    jmp VM::targetMachinePCForThrow[t1]


_llint_throw_during_call_trampoline:
    preserveReturnAddressAfterCall(t2)
    jmp _llint_throw_from_slow_path_trampoline


macro nativeCallTrampoline(executableOffsetToFunction)

    functionPrologue()
    storep 0, CodeBlock[cfr]
    loadp Callee[cfr], t0
    andp MarkedBlockMask, t0, t1
    loadp MarkedBlock::m_vm[t1], t1
    storep cfr, VM::topCallFrame[t1]
    if ARM64 or C_LOOP
        storep lr, ReturnPC[cfr]
    end
    move cfr, a0
    loadp Callee[cfr], t1
    loadp JSFunction::m_executable[t1], t1
    checkStackPointerAlignment(t3, 0xdead0001)
    if C_LOOP
        cloopCallNative executableOffsetToFunction[t1]
    else
        if X86_64_WIN
            subp 32, sp
        end
        call executableOffsetToFunction[t1]
        if X86_64_WIN
            addp 32, sp
        end
    end

    loadp Callee[cfr], t3
    andp MarkedBlockMask, t3
    loadp MarkedBlock::m_vm[t3], t3

    btqnz VM::m_exception[t3], .handleException

    functionEpilogue()
    ret

.handleException:
    storep cfr, VM::topCallFrame[t3]
    jmp _llint_throw_from_slow_path_trampoline
end

macro getConstantScope(dst)
    loadpFromInstruction(6, t0)
    loadisFromInstruction(dst, t1)
    storeq t0, [cfr, t1, 8]
end

macro varInjectionCheck(slowPath)
    loadp CodeBlock[cfr], t0
    loadp CodeBlock::m_globalObject[t0], t0
    loadp JSGlobalObject::m_varInjectionWatchpoint[t0], t0
    bbeq WatchpointSet::m_state[t0], IsInvalidated, slowPath
end

macro resolveScope()
    loadisFromInstruction(5, t2)
    loadisFromInstruction(2, t0)
    loadp [cfr, t0, 8], t0
    btiz t2, .resolveScopeLoopEnd

.resolveScopeLoop:
    loadp JSScope::m_next[t0], t0
    subi 1, t2
    btinz t2, .resolveScopeLoop

.resolveScopeLoopEnd:
    loadisFromInstruction(1, t1)
    storeq t0, [cfr, t1, 8]
end


_llint_op_resolve_scope:
    traceExecution()
    loadisFromInstruction(4, t0)

#rGlobalProperty:
    bineq t0, GlobalProperty, .rGlobalVar
    getConstantScope(1)
    dispatch(constexpr op_resolve_scope_length)

.rGlobalVar:
    bineq t0, GlobalVar, .rGlobalLexicalVar
    getConstantScope(1)
    dispatch(constexpr op_resolve_scope_length)

.rGlobalLexicalVar:
    bineq t0, GlobalLexicalVar, .rClosureVar
    getConstantScope(1)
    dispatch(constexpr op_resolve_scope_length)

.rClosureVar:
    bineq t0, ClosureVar, .rModuleVar
    resolveScope()
    dispatch(constexpr op_resolve_scope_length)

.rModuleVar:
    bineq t0, ModuleVar, .rGlobalPropertyWithVarInjectionChecks
    getConstantScope(1)
    dispatch(constexpr op_resolve_scope_length)

.rGlobalPropertyWithVarInjectionChecks:
    bineq t0, GlobalPropertyWithVarInjectionChecks, .rGlobalVarWithVarInjectionChecks
    varInjectionCheck(.rDynamic)
    getConstantScope(1)
    dispatch(constexpr op_resolve_scope_length)

.rGlobalVarWithVarInjectionChecks:
    bineq t0, GlobalVarWithVarInjectionChecks, .rGlobalLexicalVarWithVarInjectionChecks
    varInjectionCheck(.rDynamic)
    getConstantScope(1)
    dispatch(constexpr op_resolve_scope_length)

.rGlobalLexicalVarWithVarInjectionChecks:
    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .rClosureVarWithVarInjectionChecks
    varInjectionCheck(.rDynamic)
    getConstantScope(1)
    dispatch(constexpr op_resolve_scope_length)

.rClosureVarWithVarInjectionChecks:
    bineq t0, ClosureVarWithVarInjectionChecks, .rDynamic
    varInjectionCheck(.rDynamic)
    resolveScope()
    dispatch(constexpr op_resolve_scope_length)

.rDynamic:
    callOpcodeSlowPath(_slow_path_resolve_scope)
    dispatch(constexpr op_resolve_scope_length)


macro loadWithStructureCheck(operand, slowPath)
    loadisFromInstruction(operand, t0)
    loadq [cfr, t0, 8], t0
    loadStructureWithScratch(t0, t2, t1)
    loadpFromInstruction(5, t1)
    bpneq t2, t1, slowPath
end

macro getProperty()
    loadisFromInstruction(6, t1)
    loadPropertyAtVariableOffset(t1, t0, t2)
    valueProfile(t2, 7, t0)
    loadisFromInstruction(1, t0)
    storeq t2, [cfr, t0, 8]
end

macro getGlobalVar(tdzCheckIfNecessary)
    loadpFromInstruction(6, t0)
    loadq [t0], t0
    tdzCheckIfNecessary(t0)
    valueProfile(t0, 7, t1)
    loadisFromInstruction(1, t1)
    storeq t0, [cfr, t1, 8]
end

macro getClosureVar()
    loadisFromInstruction(6, t1)
    loadq JSEnvironmentRecord_variables[t0, t1, 8], t0
    valueProfile(t0, 7, t1)
    loadisFromInstruction(1, t1)
    storeq t0, [cfr, t1, 8]
end

_llint_op_get_from_scope:
    traceExecution()
    loadisFromInstruction(4, t0)
    andi ResolveTypeMask, t0

#gGlobalProperty:
    bineq t0, GlobalProperty, .gGlobalVar
    loadWithStructureCheck(2, .gDynamic)
    getProperty()
    dispatch(constexpr op_get_from_scope_length)

.gGlobalVar:
    bineq t0, GlobalVar, .gGlobalLexicalVar
    getGlobalVar(macro(v) end)
    dispatch(constexpr op_get_from_scope_length)

.gGlobalLexicalVar:
    bineq t0, GlobalLexicalVar, .gClosureVar
    getGlobalVar(
        macro (value)
            bqeq value, ValueEmpty, .gDynamic
        end)
    dispatch(constexpr op_get_from_scope_length)

.gClosureVar:
    bineq t0, ClosureVar, .gGlobalPropertyWithVarInjectionChecks
    loadVariable(2, t0)
    getClosureVar()
    dispatch(constexpr op_get_from_scope_length)

.gGlobalPropertyWithVarInjectionChecks:
    bineq t0, GlobalPropertyWithVarInjectionChecks, .gGlobalVarWithVarInjectionChecks
    loadWithStructureCheck(2, .gDynamic)
    getProperty()
    dispatch(constexpr op_get_from_scope_length)

.gGlobalVarWithVarInjectionChecks:
    bineq t0, GlobalVarWithVarInjectionChecks, .gGlobalLexicalVarWithVarInjectionChecks
    varInjectionCheck(.gDynamic)
    getGlobalVar(macro(v) end)
    dispatch(constexpr op_get_from_scope_length)

.gGlobalLexicalVarWithVarInjectionChecks:
    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .gClosureVarWithVarInjectionChecks
    varInjectionCheck(.gDynamic)
    getGlobalVar(
        macro (value)
            bqeq value, ValueEmpty, .gDynamic
        end)
    dispatch(constexpr op_get_from_scope_length)

.gClosureVarWithVarInjectionChecks:
    bineq t0, ClosureVarWithVarInjectionChecks, .gDynamic
    varInjectionCheck(.gDynamic)
    loadVariable(2, t0)
    getClosureVar()
    dispatch(constexpr op_get_from_scope_length)

.gDynamic:
    callOpcodeSlowPath(_llint_slow_path_get_from_scope)
    dispatch(constexpr op_get_from_scope_length)


macro putProperty()
    loadisFromInstruction(3, t1)
    loadConstantOrVariable(t1, t2)
    loadisFromInstruction(6, t1)
    storePropertyAtVariableOffset(t1, t0, t2, t3)
end

macro putGlobalVariable()
    loadisFromInstruction(3, t0)
    loadConstantOrVariable(t0, t1)
    loadpFromInstruction(5, t2)
    loadpFromInstruction(6, t0)
    notifyWrite(t2, .pDynamic)
    storeq t1, [t0]
end

macro putClosureVar()
    loadisFromInstruction(3, t1)
    loadConstantOrVariable(t1, t2)
    loadisFromInstruction(6, t1)
    storeq t2, JSEnvironmentRecord_variables[t0, t1, 8]
end

macro putLocalClosureVar()
    loadisFromInstruction(3, t1)
    loadConstantOrVariable(t1, t2)
    loadpFromInstruction(5, t3)
    btpz t3, .noVariableWatchpointSet
    notifyWrite(t3, .pDynamic)
.noVariableWatchpointSet:
    loadisFromInstruction(6, t1)
    storeq t2, JSEnvironmentRecord_variables[t0, t1, 8]
end

macro checkTDZInGlobalPutToScopeIfNecessary()
    loadisFromInstruction(4, t0)
    andi InitializationModeMask, t0
    rshifti InitializationModeShift, t0
    bineq t0, NotInitialization, .noNeedForTDZCheck
    loadpFromInstruction(6, t0)
    loadq [t0], t0
    bqeq t0, ValueEmpty, .pDynamic
.noNeedForTDZCheck:
end


_llint_op_put_to_scope:
    traceExecution()
    loadisFromInstruction(4, t0)
    andi ResolveTypeMask, t0

#pLocalClosureVar:
    bineq t0, LocalClosureVar, .pGlobalProperty
    loadVariable(1, t0)
    putLocalClosureVar()
    writeBarrierOnOperands(1, 3)
    dispatch(constexpr op_put_to_scope_length)

.pGlobalProperty:
    bineq t0, GlobalProperty, .pGlobalVar
    loadWithStructureCheck(1, .pDynamic)
    putProperty()
    writeBarrierOnOperands(1, 3)
    dispatch(constexpr op_put_to_scope_length)

.pGlobalVar:
    bineq t0, GlobalVar, .pGlobalLexicalVar
    writeBarrierOnGlobalObject(3)
    putGlobalVariable()
    dispatch(constexpr op_put_to_scope_length)

.pGlobalLexicalVar:
    bineq t0, GlobalLexicalVar, .pClosureVar
    writeBarrierOnGlobalLexicalEnvironment(3)
    checkTDZInGlobalPutToScopeIfNecessary()
    putGlobalVariable()
    dispatch(constexpr op_put_to_scope_length)

.pClosureVar:
    bineq t0, ClosureVar, .pGlobalPropertyWithVarInjectionChecks
    loadVariable(1, t0)
    putClosureVar()
    writeBarrierOnOperands(1, 3)
    dispatch(constexpr op_put_to_scope_length)

.pGlobalPropertyWithVarInjectionChecks:
    bineq t0, GlobalPropertyWithVarInjectionChecks, .pGlobalVarWithVarInjectionChecks
    loadWithStructureCheck(1, .pDynamic)
    putProperty()
    writeBarrierOnOperands(1, 3)
    dispatch(constexpr op_put_to_scope_length)

.pGlobalVarWithVarInjectionChecks:
    bineq t0, GlobalVarWithVarInjectionChecks, .pGlobalLexicalVarWithVarInjectionChecks
    writeBarrierOnGlobalObject(3)
    varInjectionCheck(.pDynamic)
    putGlobalVariable()
    dispatch(constexpr op_put_to_scope_length)

.pGlobalLexicalVarWithVarInjectionChecks:
    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .pClosureVarWithVarInjectionChecks
    writeBarrierOnGlobalLexicalEnvironment(3)
    varInjectionCheck(.pDynamic)
    checkTDZInGlobalPutToScopeIfNecessary()
    putGlobalVariable()
    dispatch(constexpr op_put_to_scope_length)

.pClosureVarWithVarInjectionChecks:
    bineq t0, ClosureVarWithVarInjectionChecks, .pModuleVar
    varInjectionCheck(.pDynamic)
    loadVariable(1, t0)
    putClosureVar()
    writeBarrierOnOperands(1, 3)
    dispatch(constexpr op_put_to_scope_length)

.pModuleVar:
    bineq t0, ModuleVar, .pDynamic
    callOpcodeSlowPath(_slow_path_throw_strict_mode_readonly_property_write_error)
    dispatch(constexpr op_put_to_scope_length)

.pDynamic:
    callOpcodeSlowPath(_llint_slow_path_put_to_scope)
    dispatch(constexpr op_put_to_scope_length)


_llint_op_get_from_arguments:
    traceExecution()
    loadVariable(2, t0)
    loadi 24[PB, PC, 8], t1
    loadq DirectArguments_storage[t0, t1, 8], t0
    valueProfile(t0, 4, t1)
    loadisFromInstruction(1, t1)
    storeq t0, [cfr, t1, 8]
    dispatch(constexpr op_get_from_arguments_length)


_llint_op_put_to_arguments:
    traceExecution()
    loadVariable(1, t0)
    loadi 16[PB, PC, 8], t1
    loadisFromInstruction(3, t3)
    loadConstantOrVariable(t3, t2)
    storeq t2, DirectArguments_storage[t0, t1, 8]
    writeBarrierOnOperands(1, 3)
    dispatch(constexpr op_put_to_arguments_length)


_llint_op_get_parent_scope:
    traceExecution()
    loadVariable(2, t0)
    loadp JSScope::m_next[t0], t0
    loadisFromInstruction(1, t1)
    storeq t0, [cfr, t1, 8]
    dispatch(constexpr op_get_parent_scope_length)


_llint_op_profile_type:
    traceExecution()
    loadp CodeBlock[cfr], t1
    loadp CodeBlock::m_vm[t1], t1
    # t1 is holding the pointer to the typeProfilerLog.
    loadp VM::m_typeProfilerLog[t1], t1
    # t2 is holding the pointer to the current log entry.
    loadp TypeProfilerLog::m_currentLogEntryPtr[t1], t2

    # t0 is holding the JSValue argument.
    loadisFromInstruction(1, t3)
    loadConstantOrVariable(t3, t0)

    bqeq t0, ValueEmpty, .opProfileTypeDone
    # Store the JSValue onto the log entry.
    storeq t0, TypeProfilerLog::LogEntry::value[t2]
    
    # Store the TypeLocation onto the log entry.
    loadpFromInstruction(2, t3)
    storep t3, TypeProfilerLog::LogEntry::location[t2]

    btqz t0, tagMask, .opProfileTypeIsCell
    storei 0, TypeProfilerLog::LogEntry::structureID[t2]
    jmp .opProfileTypeSkipIsCell
.opProfileTypeIsCell:
    loadi JSCell::m_structureID[t0], t3
    storei t3, TypeProfilerLog::LogEntry::structureID[t2]
.opProfileTypeSkipIsCell:
    
    # Increment the current log entry.
    addp sizeof TypeProfilerLog::LogEntry, t2
    storep t2, TypeProfilerLog::m_currentLogEntryPtr[t1]

    loadp TypeProfilerLog::m_logEndPtr[t1], t1
    bpneq t2, t1, .opProfileTypeDone
    callOpcodeSlowPath(_slow_path_profile_type_clear_log)

.opProfileTypeDone:
    dispatch(constexpr op_profile_type_length)

_llint_op_profile_control_flow:
    traceExecution()
    loadpFromInstruction(1, t0)
    addq 1, BasicBlockLocation::m_executionCount[t0]
    dispatch(constexpr op_profile_control_flow_length)


_llint_op_get_rest_length:
    traceExecution()
    loadi PayloadOffset + ArgumentCount[cfr], t0
    subi 1, t0
    loadisFromInstruction(2, t1)
    bilteq t0, t1, .storeZero
    subi t1, t0
    jmp .boxUp
.storeZero:
    move 0, t0
.boxUp:
    orq tagTypeNumber, t0
    loadisFromInstruction(1, t1)
    storeq t0, [cfr, t1, 8]
    dispatch(constexpr op_get_rest_length_length)


_llint_op_log_shadow_chicken_prologue:
    traceExecution()
    acquireShadowChickenPacket(.opLogShadowChickenPrologueSlow)
    storep cfr, ShadowChicken::Packet::frame[t0]
    loadp CallerFrame[cfr], t1
    storep t1, ShadowChicken::Packet::callerFrame[t0]
    loadp Callee[cfr], t1
    storep t1, ShadowChicken::Packet::callee[t0]
    loadVariable(1, t1)
    storep t1, ShadowChicken::Packet::scope[t0]
    dispatch(constexpr op_log_shadow_chicken_prologue_length)
.opLogShadowChickenPrologueSlow:
    callOpcodeSlowPath(_llint_slow_path_log_shadow_chicken_prologue)
    dispatch(constexpr op_log_shadow_chicken_prologue_length)


_llint_op_log_shadow_chicken_tail:
    traceExecution()
    acquireShadowChickenPacket(.opLogShadowChickenTailSlow)
    storep cfr, ShadowChicken::Packet::frame[t0]
    storep ShadowChickenTailMarker, ShadowChicken::Packet::callee[t0]
    loadVariable(1, t1)
    storep t1, ShadowChicken::Packet::thisValue[t0]
    loadVariable(2, t1)
    storep t1, ShadowChicken::Packet::scope[t0]
    loadp CodeBlock[cfr], t1
    storep t1, ShadowChicken::Packet::codeBlock[t0]
    storei PC, ShadowChicken::Packet::callSiteIndex[t0]
    dispatch(constexpr op_log_shadow_chicken_tail_length)
.opLogShadowChickenTailSlow:
    callOpcodeSlowPath(_llint_slow_path_log_shadow_chicken_tail)
    dispatch(constexpr op_log_shadow_chicken_tail_length)
`;

    new File("LowLevelInterpreter64.asm", source);
})();

// --- JetStreamExtra/RexBench/OfflineAssembler/InitBytecodes.js ---

/*
 * DO NOT EDIT THIS FILE, it is autogenerated.
 */
"use strict";

(function() {
    let source = `# SHA1Hash: ed1768b3225888d7af479d545d6763d107028191
# Copyright (C) 2014 Apple Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions
# are met:
#
# 1.  Redistributions of source code must retain the above copyright
#     notice, this list of conditions and the following disclaimer. 
# 2.  Redistributions in binary form must reproduce the above copyright
#     notice, this list of conditions and the following disclaimer in the
#     documentation and/or other materials provided with the distribution. 
#
# THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
# EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
# DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
# ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
# THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

# Autogenerated from JavaScriptCore/bytecode/BytecodeList.json, do not modify.

setEntryAddress(0, _llint_op_enter)
setEntryAddress(1, _llint_op_get_scope)
setEntryAddress(2, _llint_op_create_direct_arguments)
setEntryAddress(3, _llint_op_create_scoped_arguments)
setEntryAddress(4, _llint_op_create_cloned_arguments)
setEntryAddress(5, _llint_op_create_this)
setEntryAddress(6, _llint_op_get_argument)
setEntryAddress(7, _llint_op_argument_count)
setEntryAddress(8, _llint_op_to_this)
setEntryAddress(9, _llint_op_check_tdz)
setEntryAddress(10, _llint_op_new_object)
setEntryAddress(11, _llint_op_new_array)
setEntryAddress(12, _llint_op_new_array_with_size)
setEntryAddress(13, _llint_op_new_array_with_spread)
setEntryAddress(14, _llint_op_spread)
setEntryAddress(15, _llint_op_new_array_buffer)
setEntryAddress(16, _llint_op_new_regexp)
setEntryAddress(17, _llint_op_mov)
setEntryAddress(18, _llint_op_not)
setEntryAddress(19, _llint_op_eq)
setEntryAddress(20, _llint_op_eq_null)
setEntryAddress(21, _llint_op_neq)
setEntryAddress(22, _llint_op_neq_null)
setEntryAddress(23, _llint_op_stricteq)
setEntryAddress(24, _llint_op_nstricteq)
setEntryAddress(25, _llint_op_less)
setEntryAddress(26, _llint_op_lesseq)
setEntryAddress(27, _llint_op_greater)
setEntryAddress(28, _llint_op_greatereq)
setEntryAddress(29, _llint_op_inc)
setEntryAddress(30, _llint_op_dec)
setEntryAddress(31, _llint_op_to_number)
setEntryAddress(32, _llint_op_to_string)
setEntryAddress(33, _llint_op_negate)
setEntryAddress(34, _llint_op_add)
setEntryAddress(35, _llint_op_mul)
setEntryAddress(36, _llint_op_div)
setEntryAddress(37, _llint_op_mod)
setEntryAddress(38, _llint_op_sub)
setEntryAddress(39, _llint_op_pow)
setEntryAddress(40, _llint_op_lshift)
setEntryAddress(41, _llint_op_rshift)
setEntryAddress(42, _llint_op_urshift)
setEntryAddress(43, _llint_op_unsigned)
setEntryAddress(44, _llint_op_bitand)
setEntryAddress(45, _llint_op_bitxor)
setEntryAddress(46, _llint_op_bitor)
setEntryAddress(47, _llint_op_overrides_has_instance)
setEntryAddress(48, _llint_op_instanceof)
setEntryAddress(49, _llint_op_instanceof_custom)
setEntryAddress(50, _llint_op_typeof)
setEntryAddress(51, _llint_op_is_empty)
setEntryAddress(52, _llint_op_is_undefined)
setEntryAddress(53, _llint_op_is_boolean)
setEntryAddress(54, _llint_op_is_number)
setEntryAddress(55, _llint_op_is_object)
setEntryAddress(56, _llint_op_is_object_or_null)
setEntryAddress(57, _llint_op_is_function)
setEntryAddress(58, _llint_op_is_cell_with_type)
setEntryAddress(59, _llint_op_in)
setEntryAddress(60, _llint_op_get_array_length)
setEntryAddress(61, _llint_op_get_by_id)
setEntryAddress(62, _llint_op_get_by_id_proto_load)
setEntryAddress(63, _llint_op_get_by_id_unset)
setEntryAddress(64, _llint_op_get_by_id_with_this)
setEntryAddress(65, _llint_op_get_by_val_with_this)
setEntryAddress(66, _llint_op_try_get_by_id)
setEntryAddress(67, _llint_op_put_by_id)
setEntryAddress(68, _llint_op_put_by_id_with_this)
setEntryAddress(69, _llint_op_del_by_id)
setEntryAddress(70, _llint_op_get_by_val)
setEntryAddress(71, _llint_op_put_by_val)
setEntryAddress(72, _llint_op_put_by_val_with_this)
setEntryAddress(73, _llint_op_put_by_val_direct)
setEntryAddress(74, _llint_op_del_by_val)
setEntryAddress(75, _llint_op_put_by_index)
setEntryAddress(76, _llint_op_put_getter_by_id)
setEntryAddress(77, _llint_op_put_setter_by_id)
setEntryAddress(78, _llint_op_put_getter_setter_by_id)
setEntryAddress(79, _llint_op_put_getter_by_val)
setEntryAddress(80, _llint_op_put_setter_by_val)
setEntryAddress(81, _llint_op_define_data_property)
setEntryAddress(82, _llint_op_define_accessor_property)
setEntryAddress(83, _llint_op_jmp)
setEntryAddress(84, _llint_op_jtrue)
setEntryAddress(85, _llint_op_jfalse)
setEntryAddress(86, _llint_op_jeq_null)
setEntryAddress(87, _llint_op_jneq_null)
setEntryAddress(88, _llint_op_jneq_ptr)
setEntryAddress(89, _llint_op_jless)
setEntryAddress(90, _llint_op_jlesseq)
setEntryAddress(91, _llint_op_jgreater)
setEntryAddress(92, _llint_op_jgreatereq)
setEntryAddress(93, _llint_op_jnless)
setEntryAddress(94, _llint_op_jnlesseq)
setEntryAddress(95, _llint_op_jngreater)
setEntryAddress(96, _llint_op_jngreatereq)
setEntryAddress(97, _llint_op_loop_hint)
setEntryAddress(98, _llint_op_switch_imm)
setEntryAddress(99, _llint_op_switch_char)
setEntryAddress(100, _llint_op_switch_string)
setEntryAddress(101, _llint_op_new_func)
setEntryAddress(102, _llint_op_new_func_exp)
setEntryAddress(103, _llint_op_new_generator_func)
setEntryAddress(104, _llint_op_new_generator_func_exp)
setEntryAddress(105, _llint_op_new_async_func)
setEntryAddress(106, _llint_op_new_async_func_exp)
setEntryAddress(107, _llint_op_set_function_name)
setEntryAddress(108, _llint_op_call)
setEntryAddress(109, _llint_op_tail_call)
setEntryAddress(110, _llint_op_call_eval)
setEntryAddress(111, _llint_op_call_varargs)
setEntryAddress(112, _llint_op_tail_call_varargs)
setEntryAddress(113, _llint_op_tail_call_forward_arguments)
setEntryAddress(114, _llint_op_ret)
setEntryAddress(115, _llint_op_construct)
setEntryAddress(116, _llint_op_construct_varargs)
setEntryAddress(117, _llint_op_strcat)
setEntryAddress(118, _llint_op_to_primitive)
setEntryAddress(119, _llint_op_resolve_scope)
setEntryAddress(120, _llint_op_get_from_scope)
setEntryAddress(121, _llint_op_put_to_scope)
setEntryAddress(122, _llint_op_get_from_arguments)
setEntryAddress(123, _llint_op_put_to_arguments)
setEntryAddress(124, _llint_op_push_with_scope)
setEntryAddress(125, _llint_op_create_lexical_environment)
setEntryAddress(126, _llint_op_get_parent_scope)
setEntryAddress(127, _llint_op_catch)
setEntryAddress(128, _llint_op_throw)
setEntryAddress(129, _llint_op_throw_static_error)
setEntryAddress(130, _llint_op_debug)
setEntryAddress(131, _llint_op_end)
setEntryAddress(132, _llint_op_profile_type)
setEntryAddress(133, _llint_op_profile_control_flow)
setEntryAddress(134, _llint_op_get_enumerable_length)
setEntryAddress(135, _llint_op_has_indexed_property)
setEntryAddress(136, _llint_op_has_structure_property)
setEntryAddress(137, _llint_op_has_generic_property)
setEntryAddress(138, _llint_op_get_direct_pname)
setEntryAddress(139, _llint_op_get_property_enumerator)
setEntryAddress(140, _llint_op_enumerator_structure_pname)
setEntryAddress(141, _llint_op_enumerator_generic_pname)
setEntryAddress(142, _llint_op_to_index_string)
setEntryAddress(143, _llint_op_assert)
setEntryAddress(144, _llint_op_unreachable)
setEntryAddress(145, _llint_op_create_rest)
setEntryAddress(146, _llint_op_get_rest_length)
setEntryAddress(147, _llint_op_yield)
setEntryAddress(148, _llint_op_check_traps)
setEntryAddress(149, _llint_op_log_shadow_chicken_prologue)
setEntryAddress(150, _llint_op_log_shadow_chicken_tail)
setEntryAddress(151, _llint_op_resolve_scope_for_hoisting_func_decl_in_eval)
setEntryAddress(152, _llint_op_nop)
setEntryAddress(153, _llint_program_prologue)
setEntryAddress(154, _llint_eval_prologue)
setEntryAddress(155, _llint_module_program_prologue)
setEntryAddress(156, _llint_function_for_call_prologue)
setEntryAddress(157, _llint_function_for_construct_prologue)
setEntryAddress(158, _llint_function_for_call_arity_check)
setEntryAddress(159, _llint_function_for_construct_arity_check)
setEntryAddress(160, _llint_generic_return_point)
setEntryAddress(161, _llint_throw_from_slow_path_trampoline)
setEntryAddress(162, _llint_throw_during_call_trampoline)
setEntryAddress(163, _llint_native_call_trampoline)
setEntryAddress(164, _llint_native_construct_trampoline)
setEntryAddress(165, _handleUncaughtException)
`;

    new File("InitBytecodes.asm", source);
})();

// --- JetStreamExtra/RexBench/OfflineAssembler/expected.js ---

/*
 * DO NOT EDIT THIS FILE, it is autogenerated.
 */

"use strict";

let expectedASTDumpedAsLines = [
    "if ARMv7k",
    "",
    "else",
    "    skip",
    "end",
    "if ARMv7s",
    "",
    "else",
    "    skip",
    "end",
    "const PtrSize = constexpr (sizeof(void*))",
    "if JSVALUE64",
    "const CallFrameHeaderSlots = 5",
    "else",
    "const CallFrameHeaderSlots = 4",
    "const CallFrameAlignSlots = 1",
    "end",
    "const SlotSize = 8",
    "const JSEnvironmentRecord_variables = (((sizeof JSEnvironmentRecord + SlotSize) - 1) & (~(SlotSize - 1)))",
    "const DirectArguments_storage = (((sizeof DirectArguments + SlotSize) - 1) & (~(SlotSize - 1)))",
    "const StackAlignment = 16",
    "const StackAlignmentSlots = 2",
    "const StackAlignmentMask = (StackAlignment - 1)",
    "const CallerFrameAndPCSize = (2 * PtrSize)",
    "const CallerFrame = 0",
    "const ReturnPC = (CallerFrame + PtrSize)",
    "const CodeBlock = (ReturnPC + PtrSize)",
    "const Callee = (CodeBlock + SlotSize)",
    "const ArgumentCount = (Callee + SlotSize)",
    "const ThisArgumentOffset = (ArgumentCount + SlotSize)",
    "const FirstArgumentOffset = (ThisArgumentOffset + SlotSize)",
    "const CallFrameHeaderSize = ThisArgumentOffset",
    "if JSVALUE64",
    "const TagBitTypeOther = 2",
    "const TagBitBool = 4",
    "const TagBitUndefined = 8",
    "const ValueEmpty = 0",
    "const ValueFalse = (TagBitTypeOther | TagBitBool)",
    "const ValueTrue = ((TagBitTypeOther | TagBitBool) | 1)",
    "const ValueUndefined = (TagBitTypeOther | TagBitUndefined)",
    "const ValueNull = TagBitTypeOther",
    "const TagTypeNumber = 18446462598732840000",
    "const TagMask = (TagTypeNumber | TagBitTypeOther)",
    "else",
    "const Int32Tag = (-1)",
    "const BooleanTag = (-2)",
    "const NullTag = (-3)",
    "const UndefinedTag = (-4)",
    "const CellTag = (-5)",
    "const EmptyValueTag = (-6)",
    "const DeletedValueTag = (-7)",
    "const LowestTag = DeletedValueTag",
    "end",
    "const PutByIdPrimaryTypeMask = constexpr (PutByIdPrimaryTypeMask)",
    "const PutByIdPrimaryTypeSecondary = constexpr (PutByIdPrimaryTypeSecondary)",
    "const PutByIdPrimaryTypeObjectWithStructure = constexpr (PutByIdPrimaryTypeObjectWithStructure)",
    "const PutByIdPrimaryTypeObjectWithStructureOrOther = constexpr (PutByIdPrimaryTypeObjectWithStructureOrOther)",
    "const PutByIdSecondaryTypeMask = constexpr (PutByIdSecondaryTypeMask)",
    "const PutByIdSecondaryTypeBottom = constexpr (PutByIdSecondaryTypeBottom)",
    "const PutByIdSecondaryTypeBoolean = constexpr (PutByIdSecondaryTypeBoolean)",
    "const PutByIdSecondaryTypeOther = constexpr (PutByIdSecondaryTypeOther)",
    "const PutByIdSecondaryTypeInt32 = constexpr (PutByIdSecondaryTypeInt32)",
    "const PutByIdSecondaryTypeNumber = constexpr (PutByIdSecondaryTypeNumber)",
    "const PutByIdSecondaryTypeString = constexpr (PutByIdSecondaryTypeString)",
    "const PutByIdSecondaryTypeSymbol = constexpr (PutByIdSecondaryTypeSymbol)",
    "const PutByIdSecondaryTypeObject = constexpr (PutByIdSecondaryTypeObject)",
    "const PutByIdSecondaryTypeObjectOrOther = constexpr (PutByIdSecondaryTypeObjectOrOther)",
    "const PutByIdSecondaryTypeTop = constexpr (PutByIdSecondaryTypeTop)",
    "const CallOpCodeSize = 9",
    "if ((X86_64 or ARM64) or C_LOOP)",
    "const maxFrameExtentForSlowPathCall = 0",
    "else",
    "if ((ARM or ARMv7_TRADITIONAL) or ARMv7)",
    "const maxFrameExtentForSlowPathCall = 24",
    "else",
    "if (X86 or X86_WIN)",
    "const maxFrameExtentForSlowPathCall = 40",
    "else",
    "if MIPS",
    "const maxFrameExtentForSlowPathCall = 40",
    "else",
    "if X86_64_WIN",
    "const maxFrameExtentForSlowPathCall = 64",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "end",
    "end",
    "if ((X86_64 or X86_64_WIN) or ARM64)",
    "const CalleeSaveSpaceAsVirtualRegisters = 3",
    "else",
    "const CalleeSaveSpaceAsVirtualRegisters = 0",
    "end",
    "const CalleeSaveSpaceStackAligned = ((((CalleeSaveSpaceAsVirtualRegisters * SlotSize) + StackAlignment) - 1) & (~StackAlignmentMask))",
    "const ClearWatchpoint = constexpr (ClearWatchpoint)",
    "const IsWatched = constexpr (IsWatched)",
    "const IsInvalidated = constexpr (IsInvalidated)",
    "const ShadowChickenTailMarker = constexpr (ShadowChicken::Packet::tailMarkerValue)",
    "const ArithProfileInt = 1048576",
    "const ArithProfileIntInt = 1179648",
    "const ArithProfileNumber = 2097152",
    "const ArithProfileNumberInt = 2228224",
    "const ArithProfileNumberNumber = 2359296",
    "const ArithProfileIntNumber = 1310720",
    "if JSVALUE64",
    "const PC = t4",
    "if ARM64",
    "const PB = csr7",
    "const tagTypeNumber = csr8",
    "const tagMask = csr9",
    "else",
    "if X86_64",
    "const PB = csr2",
    "const tagTypeNumber = csr3",
    "const tagMask = csr4",
    "else",
    "if X86_64_WIN",
    "const PB = csr4",
    "const tagTypeNumber = csr5",
    "const tagMask = csr6",
    "else",
    "if C_LOOP",
    "const PB = csr0",
    "const tagTypeNumber = csr1",
    "const tagMask = csr2",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "end",
    "macro loadisFromInstruction(offset, dest)",
    "    loadis (offset * 8)[PB, PC, 8], dest",
    "end",
    "macro loadpFromInstruction(offset, dest)",
    "    loadp (offset * 8)[PB, PC, 8], dest",
    "end",
    "macro storeisToInstruction(value, offset)",
    "    storei value, (offset * 8)[PB, PC, 8]",
    "end",
    "macro storepToInstruction(value, offset)",
    "    storep value, (offset * 8)[PB, PC, 8]",
    "end",
    "else",
    "const PC = t4",
    "macro loadisFromInstruction(offset, dest)",
    "    loadis (offset * 4)[PC], dest",
    "end",
    "macro loadpFromInstruction(offset, dest)",
    "    loadp (offset * 4)[PC], dest",
    "end",
    "macro storeisToInstruction(value, offset)",
    "    storei value, (offset * 4)[PC]",
    "end",
    "end",
    "if X86_64_WIN",
    "const extraTempReg = t0",
    "else",
    "const extraTempReg = t5",
    "end",
    "if BIG_ENDIAN",
    "const TagOffset = 0",
    "const PayloadOffset = 4",
    "else",
    "const TagOffset = 4",
    "const PayloadOffset = 0",
    "end",
    "const IsArray = constexpr (IsArray)",
    "const IndexingShapeMask = constexpr (IndexingShapeMask)",
    "const NoIndexingShape = constexpr (NoIndexingShape)",
    "const Int32Shape = constexpr (Int32Shape)",
    "const DoubleShape = constexpr (DoubleShape)",
    "const ContiguousShape = constexpr (ContiguousShape)",
    "const ArrayStorageShape = constexpr (ArrayStorageShape)",
    "const SlowPutArrayStorageShape = constexpr (SlowPutArrayStorageShape)",
    "const StringType = constexpr (StringType)",
    "const SymbolType = constexpr (SymbolType)",
    "const ObjectType = constexpr (ObjectType)",
    "const FinalObjectType = constexpr (FinalObjectType)",
    "const JSFunctionType = constexpr (JSFunctionType)",
    "const ArrayType = constexpr (ArrayType)",
    "const DerivedArrayType = constexpr (DerivedArrayType)",
    "const ProxyObjectType = constexpr (ProxyObjectType)",
    "const Int8ArrayType = constexpr (Int8ArrayType)",
    "const Int16ArrayType = constexpr (Int16ArrayType)",
    "const Int32ArrayType = constexpr (Int32ArrayType)",
    "const Uint8ArrayType = constexpr (Uint8ArrayType)",
    "const Uint8ClampedArrayType = constexpr (Uint8ClampedArrayType)",
    "const Uint16ArrayType = constexpr (Uint16ArrayType)",
    "const Uint32ArrayType = constexpr (Uint32ArrayType)",
    "const Float32ArrayType = constexpr (Float32ArrayType)",
    "const Float64ArrayType = constexpr (Float64ArrayType)",
    "const FirstArrayType = Int8ArrayType",
    "const LastArrayType = Float64ArrayType",
    "const MasqueradesAsUndefined = constexpr (MasqueradesAsUndefined)",
    "const ImplementsDefaultHasInstance = constexpr (ImplementsDefaultHasInstance)",
    "const FirstConstantRegisterIndex = constexpr (FirstConstantRegisterIndex)",
    "const GlobalCode = constexpr (GlobalCode)",
    "const EvalCode = constexpr (EvalCode)",
    "const FunctionCode = constexpr (FunctionCode)",
    "const ModuleCode = constexpr (ModuleCode)",
    "const LLIntReturnPC = (ArgumentCount + TagOffset)",
    "const HashFlags8BitBuffer = 8",
    "const firstOutOfLineOffset = 100",
    "const GlobalProperty = constexpr (GlobalProperty)",
    "const GlobalVar = constexpr (GlobalVar)",
    "const GlobalLexicalVar = constexpr (GlobalLexicalVar)",
    "const ClosureVar = constexpr (ClosureVar)",
    "const LocalClosureVar = constexpr (LocalClosureVar)",
    "const ModuleVar = constexpr (ModuleVar)",
    "const GlobalPropertyWithVarInjectionChecks = constexpr (GlobalPropertyWithVarInjectionChecks)",
    "const GlobalVarWithVarInjectionChecks = constexpr (GlobalVarWithVarInjectionChecks)",
    "const GlobalLexicalVarWithVarInjectionChecks = constexpr (GlobalLexicalVarWithVarInjectionChecks)",
    "const ClosureVarWithVarInjectionChecks = constexpr (ClosureVarWithVarInjectionChecks)",
    "const ResolveTypeMask = constexpr (GetPutInfo::typeBits)",
    "const InitializationModeMask = constexpr (GetPutInfo::initializationBits)",
    "const InitializationModeShift = constexpr (GetPutInfo::initializationShift)",
    "const NotInitialization = constexpr (InitializationMode::NotInitialization)",
    "const MarkedBlockSize = constexpr (MarkedBlock::blockSize)",
    "const MarkedBlockMask = (~(MarkedBlockSize - 1))",
    "const BlackThreshold = constexpr (blackThreshold)",
    "if JSVALUE64",
    "const JSFinalObjectSizeClassIndex = 1",
    "else",
    "const JSFinalObjectSizeClassIndex = 3",
    "end",
    "const VectorBufferOffset = 0",
    "if JSVALUE64",
    "const VectorSizeOffset = 12",
    "else",
    "const VectorSizeOffset = 8",
    "end",
    "macro crash()",
    "if C_LOOP",
    "    cloopCrash ",
    "else",
    "    call _llint_crash",
    "end",
    "end",
    "macro assert(assertion)",
    "if ASSERT_ENABLED",
    "    assertion(.ok)",
    "    crash()",
    ".ok:",
    "else",
    "    skip",
    "end",
    "end",
    "if X86_64",
    "macro probe(action)",
    "    push a0, a1",
    "    push a2, a3",
    "    push t0, t1",
    "    push t2, t3",
    "    push t4, t5",
    "    action()",
    "    pop t5, t4",
    "    pop t3, t2",
    "    pop t1, t0",
    "    pop a3, a2",
    "    pop a1, a0",
    "end",
    "else",
    "    skip",
    "end",
    "macro checkStackPointerAlignment(tempReg, location)",
    "if (ARM64 or C_LOOP)",
    "",
    "else",
    "if ((ARM or ARMv7) or ARMv7_TRADITIONAL)",
    "    move sp, tempReg",
    "    andp StackAlignmentMask, tempReg",
    "else",
    "    andp sp, StackAlignmentMask, tempReg",
    "end",
    "    btpz tempReg, .stackPointerOkay",
    "    move location, tempReg",
    "    break ",
    ".stackPointerOkay:",
    "end",
    "end",
    "if (((C_LOOP or ARM64) or X86_64) or X86_64_WIN)",
    "const CalleeSaveRegisterCount = 0",
    "else",
    "if ((ARM or ARMv7_TRADITIONAL) or ARMv7)",
    "const CalleeSaveRegisterCount = 7",
    "else",
    "if MIPS",
    "const CalleeSaveRegisterCount = 1",
    "else",
    "if (X86 or X86_WIN)",
    "const CalleeSaveRegisterCount = 3",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "end",
    "const CalleeRegisterSaveSize = (CalleeSaveRegisterCount * PtrSize)",
    "const VMEntryTotalFrameSize = ((((CalleeRegisterSaveSize + sizeof VMEntryRecord) + StackAlignment) - 1) & (~StackAlignmentMask))",
    "macro pushCalleeSaves()",
    "if (((C_LOOP or ARM64) or X86_64) or X86_64_WIN)",
    "",
    "else",
    "if (ARM or ARMv7_TRADITIONAL)",
    "    emit \"push {r4-r10}\"",
    "else",
    "if ARMv7",
    "    emit \"push {r4-r6, r8-r11}\"",
    "else",
    "if MIPS",
    "    emit \"addiu $sp, $sp, -4\"",
    "    emit \"sw $s4, 0($sp)\"",
    "    emit \"move $s4, $gp\"",
    "else",
    "if X86",
    "    emit \"push %esi\"",
    "    emit \"push %edi\"",
    "    emit \"push %ebx\"",
    "else",
    "if X86_WIN",
    "    emit \"push esi\"",
    "    emit \"push edi\"",
    "    emit \"push ebx\"",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "macro popCalleeSaves()",
    "if (((C_LOOP or ARM64) or X86_64) or X86_64_WIN)",
    "",
    "else",
    "if (ARM or ARMv7_TRADITIONAL)",
    "    emit \"pop {r4-r10}\"",
    "else",
    "if ARMv7",
    "    emit \"pop {r4-r6, r8-r11}\"",
    "else",
    "if MIPS",
    "    emit \"lw $s4, 0($sp)\"",
    "    emit \"addiu $sp, $sp, 4\"",
    "else",
    "if X86",
    "    emit \"pop %ebx\"",
    "    emit \"pop %edi\"",
    "    emit \"pop %esi\"",
    "else",
    "if X86_WIN",
    "    emit \"pop ebx\"",
    "    emit \"pop edi\"",
    "    emit \"pop esi\"",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "macro preserveCallerPCAndCFR()",
    "if ((((C_LOOP or ARM) or ARMv7) or ARMv7_TRADITIONAL) or MIPS)",
    "    push lr",
    "    push cfr",
    "else",
    "if (((X86 or X86_WIN) or X86_64) or X86_64_WIN)",
    "    push cfr",
    "else",
    "if ARM64",
    "    push cfr, lr",
    "else",
    "    error",
    "end",
    "end",
    "end",
    "    move sp, cfr",
    "end",
    "macro restoreCallerPCAndCFR()",
    "    move cfr, sp",
    "if ((((C_LOOP or ARM) or ARMv7) or ARMv7_TRADITIONAL) or MIPS)",
    "    pop cfr",
    "    pop lr",
    "else",
    "if (((X86 or X86_WIN) or X86_64) or X86_64_WIN)",
    "    pop cfr",
    "else",
    "if ARM64",
    "    pop lr, cfr",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "end",
    "macro preserveCalleeSavesUsedByLLInt()",
    "    subp CalleeSaveSpaceStackAligned, sp",
    "if C_LOOP",
    "",
    "else",
    "if (ARM or ARMv7_TRADITIONAL)",
    "",
    "else",
    "if ARMv7",
    "",
    "else",
    "if ARM64",
    "    emit \"stp x27, x28, [x29, #-16]\"",
    "    emit \"stp xzr, x26, [x29, #-32]\"",
    "else",
    "if MIPS",
    "",
    "else",
    "if X86",
    "",
    "else",
    "if X86_WIN",
    "",
    "else",
    "if X86_64",
    "    storep csr4, (-8)[cfr]",
    "    storep csr3, (-16)[cfr]",
    "    storep csr2, (-24)[cfr]",
    "else",
    "if X86_64_WIN",
    "    storep csr6, (-8)[cfr]",
    "    storep csr5, (-16)[cfr]",
    "    storep csr4, (-24)[cfr]",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "macro restoreCalleeSavesUsedByLLInt()",
    "if C_LOOP",
    "",
    "else",
    "if (ARM or ARMv7_TRADITIONAL)",
    "",
    "else",
    "if ARMv7",
    "",
    "else",
    "if ARM64",
    "    emit \"ldp xzr, x26, [x29, #-32]\"",
    "    emit \"ldp x27, x28, [x29, #-16]\"",
    "else",
    "if MIPS",
    "",
    "else",
    "if X86",
    "",
    "else",
    "if X86_WIN",
    "",
    "else",
    "if X86_64",
    "    loadp (-24)[cfr], csr2",
    "    loadp (-16)[cfr], csr3",
    "    loadp (-8)[cfr], csr4",
    "else",
    "if X86_64_WIN",
    "    loadp (-24)[cfr], csr4",
    "    loadp (-16)[cfr], csr5",
    "    loadp (-8)[cfr], csr6",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "macro copyCalleeSavesToVMEntryFrameCalleeSavesBuffer(vm, temp)",
    "if ((ARM64 or X86_64) or X86_64_WIN)",
    "    loadp VM::topVMEntryFrame[vm], temp",
    "    vmEntryRecord(temp, temp)",
    "    leap VMEntryRecord::calleeSaveRegistersBuffer[temp], temp",
    "if ARM64",
    "    storep csr0, 0[temp]",
    "    storep csr1, 8[temp]",
    "    storep csr2, 16[temp]",
    "    storep csr3, 24[temp]",
    "    storep csr4, 32[temp]",
    "    storep csr5, 40[temp]",
    "    storep csr6, 48[temp]",
    "    storep csr7, 56[temp]",
    "    storep csr8, 64[temp]",
    "    storep csr9, 72[temp]",
    "    stored csfr0, 80[temp]",
    "    stored csfr1, 88[temp]",
    "    stored csfr2, 96[temp]",
    "    stored csfr3, 104[temp]",
    "    stored csfr4, 112[temp]",
    "    stored csfr5, 120[temp]",
    "    stored csfr6, 128[temp]",
    "    stored csfr7, 136[temp]",
    "else",
    "if X86_64",
    "    storep csr0, 0[temp]",
    "    storep csr1, 8[temp]",
    "    storep csr2, 16[temp]",
    "    storep csr3, 24[temp]",
    "    storep csr4, 32[temp]",
    "else",
    "if X86_64_WIN",
    "    storep csr0, 0[temp]",
    "    storep csr1, 8[temp]",
    "    storep csr2, 16[temp]",
    "    storep csr3, 24[temp]",
    "    storep csr4, 32[temp]",
    "    storep csr5, 40[temp]",
    "    storep csr6, 48[temp]",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "else",
    "    skip",
    "end",
    "end",
    "macro restoreCalleeSavesFromVMEntryFrameCalleeSavesBuffer(vm, temp)",
    "if ((ARM64 or X86_64) or X86_64_WIN)",
    "    loadp VM::topVMEntryFrame[vm], temp",
    "    vmEntryRecord(temp, temp)",
    "    leap VMEntryRecord::calleeSaveRegistersBuffer[temp], temp",
    "if ARM64",
    "    loadp 0[temp], csr0",
    "    loadp 8[temp], csr1",
    "    loadp 16[temp], csr2",
    "    loadp 24[temp], csr3",
    "    loadp 32[temp], csr4",
    "    loadp 40[temp], csr5",
    "    loadp 48[temp], csr6",
    "    loadp 56[temp], csr7",
    "    loadp 64[temp], csr8",
    "    loadp 72[temp], csr9",
    "    loadd 80[temp], csfr0",
    "    loadd 88[temp], csfr1",
    "    loadd 96[temp], csfr2",
    "    loadd 104[temp], csfr3",
    "    loadd 112[temp], csfr4",
    "    loadd 120[temp], csfr5",
    "    loadd 128[temp], csfr6",
    "    loadd 136[temp], csfr7",
    "else",
    "if X86_64",
    "    loadp 0[temp], csr0",
    "    loadp 8[temp], csr1",
    "    loadp 16[temp], csr2",
    "    loadp 24[temp], csr3",
    "    loadp 32[temp], csr4",
    "else",
    "if X86_64_WIN",
    "    loadp 0[temp], csr0",
    "    loadp 8[temp], csr1",
    "    loadp 16[temp], csr2",
    "    loadp 24[temp], csr3",
    "    loadp 32[temp], csr4",
    "    loadp 40[temp], csr5",
    "    loadp 48[temp], csr6",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "else",
    "    skip",
    "end",
    "end",
    "macro preserveReturnAddressAfterCall(destinationRegister)",
    "if (((((C_LOOP or ARM) or ARMv7) or ARMv7_TRADITIONAL) or ARM64) or MIPS)",
    "    move lr, destinationRegister",
    "else",
    "if (((X86 or X86_WIN) or X86_64) or X86_64_WIN)",
    "    pop destinationRegister",
    "else",
    "    error",
    "end",
    "end",
    "end",
    "macro functionPrologue()",
    "if (((X86 or X86_WIN) or X86_64) or X86_64_WIN)",
    "    push cfr",
    "else",
    "if ARM64",
    "    push cfr, lr",
    "else",
    "if ((((C_LOOP or ARM) or ARMv7) or ARMv7_TRADITIONAL) or MIPS)",
    "    push lr",
    "    push cfr",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "    move sp, cfr",
    "end",
    "macro functionEpilogue()",
    "if (((X86 or X86_WIN) or X86_64) or X86_64_WIN)",
    "    pop cfr",
    "else",
    "if ARM64",
    "    pop lr, cfr",
    "else",
    "if ((((C_LOOP or ARM) or ARMv7) or ARMv7_TRADITIONAL) or MIPS)",
    "    pop cfr",
    "    pop lr",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "end",
    "macro vmEntryRecord(entryFramePointer, resultReg)",
    "    subp entryFramePointer, VMEntryTotalFrameSize, resultReg",
    "end",
    "macro getFrameRegisterSizeForCodeBlock(codeBlock, size)",
    "    loadi CodeBlock::m_numCalleeLocals[codeBlock], size",
    "    lshiftp 3, size",
    "    addp maxFrameExtentForSlowPathCall, size",
    "end",
    "macro restoreStackPointerAfterCall()",
    "    loadp CodeBlock[cfr], t2",
    "    getFrameRegisterSizeForCodeBlock(t2, t2)",
    "if ARMv7",
    "    subp cfr, t2, t2",
    "    move t2, sp",
    "else",
    "    subp cfr, t2, sp",
    "end",
    "end",
    "macro traceExecution()",
    "if COLLECT_STATS",
    "    callSlowPath(_llint_count_opcode)",
    "else",
    "    skip",
    "end",
    "if EXECUTION_TRACING",
    "    callSlowPath(_llint_trace)",
    "else",
    "    skip",
    "end",
    "end",
    "macro traceSlowPathExecution()",
    "if COLLECT_STATS",
    "    callSlowPath(_llint_count_opcode_slow_path)",
    "else",
    "    skip",
    "end",
    "end",
    "macro callOpcodeSlowPath(slowPath)",
    "    traceSlowPathExecution()",
    "    callSlowPath(slowPath)",
    "end",
    "macro callTargetFunction(callee)",
    "if C_LOOP",
    "    cloopCallJSFunction callee",
    "else",
    "    call callee",
    "end",
    "    restoreStackPointerAfterCall()",
    "    dispatchAfterCall()",
    "end",
    "macro prepareForRegularCall(callee, temp1, temp2, temp3)",
    "    addp CallerFrameAndPCSize, sp",
    "end",
    "macro prepareForTailCall(callee, temp1, temp2, temp3)",
    "    restoreCalleeSavesUsedByLLInt()",
    "    loadi (PayloadOffset + ArgumentCount)[cfr], temp2",
    "    loadp CodeBlock[cfr], temp1",
    "    loadp CodeBlock::m_numParameters[temp1], temp1",
    "    bilteq temp1, temp2, .noArityFixup",
    "    move temp1, temp2",
    ".noArityFixup:",
    "    muli SlotSize, temp2",
    "    addi ((StackAlignment - 1) + CallFrameHeaderSize), temp2",
    "    andi (~StackAlignmentMask), temp2",
    "    move cfr, temp1",
    "    addp temp2, temp1",
    "    loadi (PayloadOffset + ArgumentCount)[sp], temp2",
    "    muli SlotSize, temp2",
    "    addi ((StackAlignment - 1) + CallFrameHeaderSize), temp2",
    "    andi (~StackAlignmentMask), temp2",
    "if (((((ARM or ARMv7_TRADITIONAL) or ARMv7) or ARM64) or C_LOOP) or MIPS)",
    "    addp (2 * PtrSize), sp",
    "    subi (2 * PtrSize), temp2",
    "    loadp PtrSize[cfr], lr",
    "else",
    "    addp PtrSize, sp",
    "    subi PtrSize, temp2",
    "    loadp PtrSize[cfr], temp3",
    "    storep temp3, 0[sp]",
    "end",
    "    subp temp2, temp1",
    "    loadp 0[cfr], cfr",
    ".copyLoop:",
    "    subi PtrSize, temp2",
    "    loadp 0[sp, temp2, 1], temp3",
    "    storep temp3, 0[temp1, temp2, 1]",
    "    btinz temp2, .copyLoop",
    "    move temp1, sp",
    "    jmp callee",
    "end",
    "macro slowPathForCall(slowPath, prepareCall)",
    "    traceSlowPathExecution()",
    "    callCallSlowPath(slowPath, macro (callee, calleeFramePtr)",
    "    btpz calleeFramePtr, .dontUpdateSP",
    "    move calleeFramePtr, sp",
    "    prepareCall(callee, t2, t3, t4)",
    ".dontUpdateSP:",
    "    callTargetFunction(callee)",
    "end)",
    "end",
    "macro arrayProfile(cellAndIndexingType, profile, scratch)",
    "const cell = cellAndIndexingType",
    "const indexingType = cellAndIndexingType",
    "    loadi JSCell::m_structureID[cell], scratch",
    "    storei scratch, ArrayProfile::m_lastSeenStructureID[profile]",
    "    loadb JSCell::m_indexingTypeAndMisc[cell], indexingType",
    "end",
    "macro skipIfIsRememberedOrInEden(cell, slowPath)",
    "    memfence ",
    "    bba JSCell::m_cellState[cell], BlackThreshold, .done",
    "    slowPath()",
    ".done:",
    "end",
    "macro notifyWrite(set, slow)",
    "    bbneq WatchpointSet::m_state[set], IsInvalidated, slow",
    "end",
    "macro checkSwitchToJIT(increment, action)",
    "    loadp CodeBlock[cfr], t0",
    "    baddis increment, (CodeBlock::m_llintExecuteCounter + BaselineExecutionCounter::m_counter)[t0], .continue",
    "    action()",
    ".continue:",
    "end",
    "macro checkSwitchToJITForEpilogue()",
    "    checkSwitchToJIT(10, macro ()",
    "    callOpcodeSlowPath(_llint_replace)",
    "end)",
    "end",
    "macro assertNotConstant(index)",
    "    assert(macro (ok)",
    "    bilt index, FirstConstantRegisterIndex, ok",
    "end)",
    "end",
    "macro functionForCallCodeBlockGetter(targetRegister)",
    "if JSVALUE64",
    "    loadp Callee[cfr], targetRegister",
    "else",
    "    loadp (Callee + PayloadOffset)[cfr], targetRegister",
    "end",
    "    loadp JSFunction::m_executable[targetRegister], targetRegister",
    "    loadp FunctionExecutable::m_codeBlockForCall[targetRegister], targetRegister",
    "end",
    "macro functionForConstructCodeBlockGetter(targetRegister)",
    "if JSVALUE64",
    "    loadp Callee[cfr], targetRegister",
    "else",
    "    loadp (Callee + PayloadOffset)[cfr], targetRegister",
    "end",
    "    loadp JSFunction::m_executable[targetRegister], targetRegister",
    "    loadp FunctionExecutable::m_codeBlockForConstruct[targetRegister], targetRegister",
    "end",
    "macro notFunctionCodeBlockGetter(targetRegister)",
    "    loadp CodeBlock[cfr], targetRegister",
    "end",
    "macro functionCodeBlockSetter(sourceRegister)",
    "    storep sourceRegister, CodeBlock[cfr]",
    "end",
    "macro notFunctionCodeBlockSetter(sourceRegister)",
    "",
    "end",
    "macro prologue(codeBlockGetter, codeBlockSetter, osrSlowPath, traceSlowPath)",
    "    preserveCallerPCAndCFR()",
    "if EXECUTION_TRACING",
    "    subp maxFrameExtentForSlowPathCall, sp",
    "    callSlowPath(traceSlowPath)",
    "    addp maxFrameExtentForSlowPathCall, sp",
    "else",
    "    skip",
    "end",
    "    codeBlockGetter(t1)",
    "if (notC_LOOP)",
    "    baddis 5, (CodeBlock::m_llintExecuteCounter + BaselineExecutionCounter::m_counter)[t1], .continue",
    "if JSVALUE64",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(osrSlowPath)",
    "else",
    "    subp 8, sp",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(osrSlowPath)",
    "    addp 8, sp",
    "end",
    "    btpz r0, .recover",
    "    move cfr, sp",
    "if ARM64",
    "    pop lr, cfr",
    "else",
    "if (((ARM or ARMv7) or ARMv7_TRADITIONAL) or MIPS)",
    "    pop cfr",
    "    pop lr",
    "else",
    "    pop cfr",
    "end",
    "end",
    "    jmp r0",
    ".recover:",
    "    codeBlockGetter(t1)",
    ".continue:",
    "else",
    "    skip",
    "end",
    "    codeBlockSetter(t1)",
    "    preserveCalleeSavesUsedByLLInt()",
    "if JSVALUE64",
    "    loadp CodeBlock::m_instructions[t1], PB",
    "    move 0, PC",
    "else",
    "    loadp CodeBlock::m_instructions[t1], PC",
    "end",
    "    getFrameRegisterSizeForCodeBlock(t1, t0)",
    "    subp cfr, t0, t0",
    "    bpa t0, cfr, .needStackCheck",
    "    loadp CodeBlock::m_vm[t1], t2",
    "if C_LOOP",
    "    bpbeq VM::m_cloopStackLimit[t2], t0, .stackHeightOK",
    "else",
    "    bpbeq VM::m_softStackLimit[t2], t0, .stackHeightOK",
    "end",
    ".needStackCheck:",
    "    subp maxFrameExtentForSlowPathCall, sp",
    "    callSlowPath(_llint_stack_check)",
    "    bpeq r1, 0, .stackHeightOKGetCodeBlock",
    "    move r1, cfr",
    "    dispatch(0)",
    ".stackHeightOKGetCodeBlock:",
    "    codeBlockGetter(t1)",
    "    getFrameRegisterSizeForCodeBlock(t1, t0)",
    "    subp cfr, t0, t0",
    ".stackHeightOK:",
    "    move t0, sp",
    "if JSVALUE64",
    "    move TagTypeNumber, tagTypeNumber",
    "    addp TagBitTypeOther, tagTypeNumber, tagMask",
    "else",
    "    skip",
    "end",
    "end",
    "macro functionInitialization(profileArgSkip)",
    "    loadi CodeBlock::m_numParameters[t1], t0",
    "    addp (-profileArgSkip), t0",
    "    assert(macro (ok)",
    "    bpgteq t0, 0, ok",
    "end)",
    "    btpz t0, .argumentProfileDone",
    "    loadp (CodeBlock::m_argumentValueProfiles + VectorBufferOffset)[t1], t3",
    "    mulp sizeof ValueProfile, t0, t2",
    "    lshiftp 3, t0",
    "    addp t2, t3",
    ".argumentProfileLoop:",
    "if JSVALUE64",
    "    loadq ((ThisArgumentOffset - 8) + (profileArgSkip * 8))[cfr, t0, 1], t2",
    "    subp sizeof ValueProfile, t3",
    "    storeq t2, ((profileArgSkip * sizeof ValueProfile) + ValueProfile::m_buckets)[t3]",
    "else",
    "    loadi (((ThisArgumentOffset + TagOffset) - 8) + (profileArgSkip * 8))[cfr, t0, 1], t2",
    "    subp sizeof ValueProfile, t3",
    "    storei t2, (((profileArgSkip * sizeof ValueProfile) + ValueProfile::m_buckets) + TagOffset)[t3]",
    "    loadi (((ThisArgumentOffset + PayloadOffset) - 8) + (profileArgSkip * 8))[cfr, t0, 1], t2",
    "    storei t2, (((profileArgSkip * sizeof ValueProfile) + ValueProfile::m_buckets) + PayloadOffset)[t3]",
    "end",
    "    baddpnz (-8), t0, .argumentProfileLoop",
    ".argumentProfileDone:",
    "end",
    "macro doReturn()",
    "    restoreCalleeSavesUsedByLLInt()",
    "    restoreCallerPCAndCFR()",
    "    ret ",
    "end",
    "if C_LOOP",
    "_llint_vm_entry_to_javascript:",
    "else",
    "_vmEntryToJavaScript:",
    "end",
    "    doVMEntry(makeJavaScriptCall)",
    "if C_LOOP",
    "_llint_vm_entry_to_native:",
    "else",
    "_vmEntryToNative:",
    "end",
    "    doVMEntry(makeHostFunctionCall)",
    "if (notC_LOOP)",
    "_sanitizeStackForVMImpl:",
    "if (X86 or X86_WIN)",
    "    loadp 4[sp], a0",
    "else",
    "    skip",
    "end",
    "const vm = a0",
    "const address = a1",
    "const zeroValue = a2",
    "    loadp VM::m_lastStackTop[vm], address",
    "    bpbeq sp, address, .zeroFillDone",
    "    move 0, zeroValue",
    ".zeroFillLoop:",
    "    storep zeroValue, 0[address]",
    "    addp PtrSize, address",
    "    bpa sp, address, .zeroFillLoop",
    ".zeroFillDone:",
    "    move sp, address",
    "    storep address, VM::m_lastStackTop[vm]",
    "    ret ",
    "_vmEntryRecord:",
    "if (X86 or X86_WIN)",
    "    loadp 4[sp], a0",
    "else",
    "    skip",
    "end",
    "    vmEntryRecord(a0, r0)",
    "    ret ",
    "else",
    "    skip",
    "end",
    "if C_LOOP",
    "_llint_entry:",
    "    crash()",
    "else",
    "macro initPCRelative(pcBase)",
    "if (((X86_64 or X86_64_WIN) or X86) or X86_WIN)",
    "    call _relativePCBase",
    "_relativePCBase:",
    "    pop pcBase",
    "else",
    "if ARM64",
    "",
    "else",
    "if ARMv7",
    "_relativePCBase:",
    "    move pc, pcBase",
    "    subp 3, pcBase",
    "else",
    "if (ARM or ARMv7_TRADITIONAL)",
    "_relativePCBase:",
    "    move pc, pcBase",
    "    subp 8, pcBase",
    "else",
    "if MIPS",
    "    la _relativePCBase, pcBase",
    "    setcallreg pcBase",
    "_relativePCBase:",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "macro setEntryAddress(index, label)",
    "if (X86_64 or X86_64_WIN)",
    "    leap (label - _relativePCBase)[t1], t3",
    "    move index, t4",
    "    storep t3, 0[a0, t4, 8]",
    "else",
    "if (X86 or X86_WIN)",
    "    leap (label - _relativePCBase)[t1], t3",
    "    move index, t4",
    "    storep t3, 0[a0, t4, 4]",
    "else",
    "if ARM64",
    "    pcrtoaddr label, t1",
    "    move index, t4",
    "    storep t1, 0[a0, t4, 8]",
    "else",
    "if ((ARM or ARMv7) or ARMv7_TRADITIONAL)",
    "    mvlbl (label - _relativePCBase), t4",
    "    addp t4, t1, t4",
    "    move index, t3",
    "    storep t4, 0[a0, t3, 4]",
    "else",
    "if MIPS",
    "    la label, t4",
    "    la _relativePCBase, t3",
    "    subp t3, t4",
    "    addp t4, t1, t4",
    "    move index, t3",
    "    storep t4, 0[a0, t3, 4]",
    "else",
    "    skip",
    "end",
    "end",
    "end",
    "end",
    "end",
    "end",
    "_llint_entry:",
    "    functionPrologue()",
    "    pushCalleeSaves()",
    "if (X86 or X86_WIN)",
    "    loadp 20[sp], a0",
    "else",
    "    skip",
    "end",
    "    initPCRelative(t1)",
    "    setEntryAddress(0, _llint_op_enter)",
    "    setEntryAddress(1, _llint_op_get_scope)",
    "    setEntryAddress(2, _llint_op_create_direct_arguments)",
    "    setEntryAddress(3, _llint_op_create_scoped_arguments)",
    "    setEntryAddress(4, _llint_op_create_cloned_arguments)",
    "    setEntryAddress(5, _llint_op_create_this)",
    "    setEntryAddress(6, _llint_op_get_argument)",
    "    setEntryAddress(7, _llint_op_argument_count)",
    "    setEntryAddress(8, _llint_op_to_this)",
    "    setEntryAddress(9, _llint_op_check_tdz)",
    "    setEntryAddress(10, _llint_op_new_object)",
    "    setEntryAddress(11, _llint_op_new_array)",
    "    setEntryAddress(12, _llint_op_new_array_with_size)",
    "    setEntryAddress(13, _llint_op_new_array_with_spread)",
    "    setEntryAddress(14, _llint_op_spread)",
    "    setEntryAddress(15, _llint_op_new_array_buffer)",
    "    setEntryAddress(16, _llint_op_new_regexp)",
    "    setEntryAddress(17, _llint_op_mov)",
    "    setEntryAddress(18, _llint_op_not)",
    "    setEntryAddress(19, _llint_op_eq)",
    "    setEntryAddress(20, _llint_op_eq_null)",
    "    setEntryAddress(21, _llint_op_neq)",
    "    setEntryAddress(22, _llint_op_neq_null)",
    "    setEntryAddress(23, _llint_op_stricteq)",
    "    setEntryAddress(24, _llint_op_nstricteq)",
    "    setEntryAddress(25, _llint_op_less)",
    "    setEntryAddress(26, _llint_op_lesseq)",
    "    setEntryAddress(27, _llint_op_greater)",
    "    setEntryAddress(28, _llint_op_greatereq)",
    "    setEntryAddress(29, _llint_op_inc)",
    "    setEntryAddress(30, _llint_op_dec)",
    "    setEntryAddress(31, _llint_op_to_number)",
    "    setEntryAddress(32, _llint_op_to_string)",
    "    setEntryAddress(33, _llint_op_negate)",
    "    setEntryAddress(34, _llint_op_add)",
    "    setEntryAddress(35, _llint_op_mul)",
    "    setEntryAddress(36, _llint_op_div)",
    "    setEntryAddress(37, _llint_op_mod)",
    "    setEntryAddress(38, _llint_op_sub)",
    "    setEntryAddress(39, _llint_op_pow)",
    "    setEntryAddress(40, _llint_op_lshift)",
    "    setEntryAddress(41, _llint_op_rshift)",
    "    setEntryAddress(42, _llint_op_urshift)",
    "    setEntryAddress(43, _llint_op_unsigned)",
    "    setEntryAddress(44, _llint_op_bitand)",
    "    setEntryAddress(45, _llint_op_bitxor)",
    "    setEntryAddress(46, _llint_op_bitor)",
    "    setEntryAddress(47, _llint_op_overrides_has_instance)",
    "    setEntryAddress(48, _llint_op_instanceof)",
    "    setEntryAddress(49, _llint_op_instanceof_custom)",
    "    setEntryAddress(50, _llint_op_typeof)",
    "    setEntryAddress(51, _llint_op_is_empty)",
    "    setEntryAddress(52, _llint_op_is_undefined)",
    "    setEntryAddress(53, _llint_op_is_boolean)",
    "    setEntryAddress(54, _llint_op_is_number)",
    "    setEntryAddress(55, _llint_op_is_object)",
    "    setEntryAddress(56, _llint_op_is_object_or_null)",
    "    setEntryAddress(57, _llint_op_is_function)",
    "    setEntryAddress(58, _llint_op_is_cell_with_type)",
    "    setEntryAddress(59, _llint_op_in)",
    "    setEntryAddress(60, _llint_op_get_array_length)",
    "    setEntryAddress(61, _llint_op_get_by_id)",
    "    setEntryAddress(62, _llint_op_get_by_id_proto_load)",
    "    setEntryAddress(63, _llint_op_get_by_id_unset)",
    "    setEntryAddress(64, _llint_op_get_by_id_with_this)",
    "    setEntryAddress(65, _llint_op_get_by_val_with_this)",
    "    setEntryAddress(66, _llint_op_try_get_by_id)",
    "    setEntryAddress(67, _llint_op_put_by_id)",
    "    setEntryAddress(68, _llint_op_put_by_id_with_this)",
    "    setEntryAddress(69, _llint_op_del_by_id)",
    "    setEntryAddress(70, _llint_op_get_by_val)",
    "    setEntryAddress(71, _llint_op_put_by_val)",
    "    setEntryAddress(72, _llint_op_put_by_val_with_this)",
    "    setEntryAddress(73, _llint_op_put_by_val_direct)",
    "    setEntryAddress(74, _llint_op_del_by_val)",
    "    setEntryAddress(75, _llint_op_put_by_index)",
    "    setEntryAddress(76, _llint_op_put_getter_by_id)",
    "    setEntryAddress(77, _llint_op_put_setter_by_id)",
    "    setEntryAddress(78, _llint_op_put_getter_setter_by_id)",
    "    setEntryAddress(79, _llint_op_put_getter_by_val)",
    "    setEntryAddress(80, _llint_op_put_setter_by_val)",
    "    setEntryAddress(81, _llint_op_define_data_property)",
    "    setEntryAddress(82, _llint_op_define_accessor_property)",
    "    setEntryAddress(83, _llint_op_jmp)",
    "    setEntryAddress(84, _llint_op_jtrue)",
    "    setEntryAddress(85, _llint_op_jfalse)",
    "    setEntryAddress(86, _llint_op_jeq_null)",
    "    setEntryAddress(87, _llint_op_jneq_null)",
    "    setEntryAddress(88, _llint_op_jneq_ptr)",
    "    setEntryAddress(89, _llint_op_jless)",
    "    setEntryAddress(90, _llint_op_jlesseq)",
    "    setEntryAddress(91, _llint_op_jgreater)",
    "    setEntryAddress(92, _llint_op_jgreatereq)",
    "    setEntryAddress(93, _llint_op_jnless)",
    "    setEntryAddress(94, _llint_op_jnlesseq)",
    "    setEntryAddress(95, _llint_op_jngreater)",
    "    setEntryAddress(96, _llint_op_jngreatereq)",
    "    setEntryAddress(97, _llint_op_loop_hint)",
    "    setEntryAddress(98, _llint_op_switch_imm)",
    "    setEntryAddress(99, _llint_op_switch_char)",
    "    setEntryAddress(100, _llint_op_switch_string)",
    "    setEntryAddress(101, _llint_op_new_func)",
    "    setEntryAddress(102, _llint_op_new_func_exp)",
    "    setEntryAddress(103, _llint_op_new_generator_func)",
    "    setEntryAddress(104, _llint_op_new_generator_func_exp)",
    "    setEntryAddress(105, _llint_op_new_async_func)",
    "    setEntryAddress(106, _llint_op_new_async_func_exp)",
    "    setEntryAddress(107, _llint_op_set_function_name)",
    "    setEntryAddress(108, _llint_op_call)",
    "    setEntryAddress(109, _llint_op_tail_call)",
    "    setEntryAddress(110, _llint_op_call_eval)",
    "    setEntryAddress(111, _llint_op_call_varargs)",
    "    setEntryAddress(112, _llint_op_tail_call_varargs)",
    "    setEntryAddress(113, _llint_op_tail_call_forward_arguments)",
    "    setEntryAddress(114, _llint_op_ret)",
    "    setEntryAddress(115, _llint_op_construct)",
    "    setEntryAddress(116, _llint_op_construct_varargs)",
    "    setEntryAddress(117, _llint_op_strcat)",
    "    setEntryAddress(118, _llint_op_to_primitive)",
    "    setEntryAddress(119, _llint_op_resolve_scope)",
    "    setEntryAddress(120, _llint_op_get_from_scope)",
    "    setEntryAddress(121, _llint_op_put_to_scope)",
    "    setEntryAddress(122, _llint_op_get_from_arguments)",
    "    setEntryAddress(123, _llint_op_put_to_arguments)",
    "    setEntryAddress(124, _llint_op_push_with_scope)",
    "    setEntryAddress(125, _llint_op_create_lexical_environment)",
    "    setEntryAddress(126, _llint_op_get_parent_scope)",
    "    setEntryAddress(127, _llint_op_catch)",
    "    setEntryAddress(128, _llint_op_throw)",
    "    setEntryAddress(129, _llint_op_throw_static_error)",
    "    setEntryAddress(130, _llint_op_debug)",
    "    setEntryAddress(131, _llint_op_end)",
    "    setEntryAddress(132, _llint_op_profile_type)",
    "    setEntryAddress(133, _llint_op_profile_control_flow)",
    "    setEntryAddress(134, _llint_op_get_enumerable_length)",
    "    setEntryAddress(135, _llint_op_has_indexed_property)",
    "    setEntryAddress(136, _llint_op_has_structure_property)",
    "    setEntryAddress(137, _llint_op_has_generic_property)",
    "    setEntryAddress(138, _llint_op_get_direct_pname)",
    "    setEntryAddress(139, _llint_op_get_property_enumerator)",
    "    setEntryAddress(140, _llint_op_enumerator_structure_pname)",
    "    setEntryAddress(141, _llint_op_enumerator_generic_pname)",
    "    setEntryAddress(142, _llint_op_to_index_string)",
    "    setEntryAddress(143, _llint_op_assert)",
    "    setEntryAddress(144, _llint_op_unreachable)",
    "    setEntryAddress(145, _llint_op_create_rest)",
    "    setEntryAddress(146, _llint_op_get_rest_length)",
    "    setEntryAddress(147, _llint_op_yield)",
    "    setEntryAddress(148, _llint_op_check_traps)",
    "    setEntryAddress(149, _llint_op_log_shadow_chicken_prologue)",
    "    setEntryAddress(150, _llint_op_log_shadow_chicken_tail)",
    "    setEntryAddress(151, _llint_op_resolve_scope_for_hoisting_func_decl_in_eval)",
    "    setEntryAddress(152, _llint_op_nop)",
    "    setEntryAddress(153, _llint_program_prologue)",
    "    setEntryAddress(154, _llint_eval_prologue)",
    "    setEntryAddress(155, _llint_module_program_prologue)",
    "    setEntryAddress(156, _llint_function_for_call_prologue)",
    "    setEntryAddress(157, _llint_function_for_construct_prologue)",
    "    setEntryAddress(158, _llint_function_for_call_arity_check)",
    "    setEntryAddress(159, _llint_function_for_construct_arity_check)",
    "    setEntryAddress(160, _llint_generic_return_point)",
    "    setEntryAddress(161, _llint_throw_from_slow_path_trampoline)",
    "    setEntryAddress(162, _llint_throw_during_call_trampoline)",
    "    setEntryAddress(163, _llint_native_call_trampoline)",
    "    setEntryAddress(164, _llint_native_construct_trampoline)",
    "    setEntryAddress(165, _handleUncaughtException)",
    "    popCalleeSaves()",
    "    functionEpilogue()",
    "    ret ",
    "end",
    "_llint_program_prologue:",
    "    prologue(notFunctionCodeBlockGetter, notFunctionCodeBlockSetter, _llint_entry_osr, _llint_trace_prologue)",
    "    dispatch(0)",
    "_llint_module_program_prologue:",
    "    prologue(notFunctionCodeBlockGetter, notFunctionCodeBlockSetter, _llint_entry_osr, _llint_trace_prologue)",
    "    dispatch(0)",
    "_llint_eval_prologue:",
    "    prologue(notFunctionCodeBlockGetter, notFunctionCodeBlockSetter, _llint_entry_osr, _llint_trace_prologue)",
    "    dispatch(0)",
    "_llint_function_for_call_prologue:",
    "    prologue(functionForCallCodeBlockGetter, functionCodeBlockSetter, _llint_entry_osr_function_for_call, _llint_trace_prologue_function_for_call)",
    "    functionInitialization(0)",
    "    dispatch(0)",
    "_llint_function_for_construct_prologue:",
    "    prologue(functionForConstructCodeBlockGetter, functionCodeBlockSetter, _llint_entry_osr_function_for_construct, _llint_trace_prologue_function_for_construct)",
    "    functionInitialization(1)",
    "    dispatch(0)",
    "_llint_function_for_call_arity_check:",
    "    prologue(functionForCallCodeBlockGetter, functionCodeBlockSetter, _llint_entry_osr_function_for_call_arityCheck, _llint_trace_arityCheck_for_call)",
    "    functionArityCheck(.functionForCallBegin, _slow_path_call_arityCheck)",
    ".functionForCallBegin:",
    "    functionInitialization(0)",
    "    dispatch(0)",
    "_llint_function_for_construct_arity_check:",
    "    prologue(functionForConstructCodeBlockGetter, functionCodeBlockSetter, _llint_entry_osr_function_for_construct_arityCheck, _llint_trace_arityCheck_for_construct)",
    "    functionArityCheck(.functionForConstructBegin, _slow_path_construct_arityCheck)",
    ".functionForConstructBegin:",
    "    functionInitialization(1)",
    "    dispatch(0)",
    "if JSVALUE64",
    "macro jumpToInstruction()",
    "    jmp 0[PB, PC, 8]",
    "end",
    "macro dispatch(advance)",
    "    addp advance, PC",
    "    jumpToInstruction()",
    "end",
    "macro dispatchInt(advance)",
    "    addi advance, PC",
    "    jumpToInstruction()",
    "end",
    "macro dispatchIntIndirect(offset)",
    "    dispatchInt((offset * 8)[PB, PC, 8])",
    "end",
    "macro dispatchAfterCall()",
    "    loadi (ArgumentCount + TagOffset)[cfr], PC",
    "    loadp CodeBlock[cfr], PB",
    "    loadp CodeBlock::m_instructions[PB], PB",
    "    loadisFromInstruction(1, t1)",
    "    storeq r0, 0[cfr, t1, 8]",
    "    valueProfile(r0, (CallOpCodeSize - 1), t3)",
    "    dispatch(CallOpCodeSize)",
    "end",
    "macro cCall2(function)",
    "    checkStackPointerAlignment(t4, 3134242818)",
    "if (X86_64 or ARM64)",
    "    call function",
    "else",
    "if X86_64_WIN",
    "    move a1, a2",
    "    move a0, a1",
    "    subp 48, sp",
    "    move sp, a0",
    "    addp 32, a0",
    "    call function",
    "    addp 48, sp",
    "    move 8[r0], r1",
    "    move 0[r0], r0",
    "else",
    "if C_LOOP",
    "    cloopCallSlowPath function, a0, a1",
    "else",
    "    error",
    "end",
    "end",
    "end",
    "end",
    "macro cCall2Void(function)",
    "if C_LOOP",
    "    cloopCallSlowPathVoid function, a0, a1",
    "else",
    "if X86_64_WIN",
    "    subp 32, sp",
    "    call function",
    "    addp 32, sp",
    "else",
    "    cCall2(function)",
    "end",
    "end",
    "end",
    "macro cCall4(function)",
    "    checkStackPointerAlignment(t4, 3134242820)",
    "if (X86_64 or ARM64)",
    "    call function",
    "else",
    "if X86_64_WIN",
    "    subp 64, sp",
    "    call function",
    "    addp 64, sp",
    "else",
    "    error",
    "end",
    "end",
    "end",
    "macro doVMEntry(makeCall)",
    "    functionPrologue()",
    "    pushCalleeSaves()",
    "const entry = a0",
    "const vm = a1",
    "const protoCallFrame = a2",
    "    vmEntryRecord(cfr, sp)",
    "    checkStackPointerAlignment(t4, 3134249985)",
    "    storep vm, VMEntryRecord::m_vm[sp]",
    "    loadp VM::topCallFrame[vm], t4",
    "    storep t4, VMEntryRecord::m_prevTopCallFrame[sp]",
    "    loadp VM::topVMEntryFrame[vm], t4",
    "    storep t4, VMEntryRecord::m_prevTopVMEntryFrame[sp]",
    "    loadi ProtoCallFrame::paddedArgCount[protoCallFrame], t4",
    "    addp CallFrameHeaderSlots, t4, t4",
    "    lshiftp 3, t4",
    "    subp sp, t4, t3",
    "    bqbeq sp, t3, .throwStackOverflow",
    "if C_LOOP",
    "    bpaeq t3, VM::m_cloopStackLimit[vm], .stackHeightOK",
    "else",
    "    bpaeq t3, VM::m_softStackLimit[vm], .stackHeightOK",
    "end",
    "if C_LOOP",
    "    move entry, t4",
    "    move vm, t5",
    "    cloopCallSlowPath _llint_stack_check_at_vm_entry, vm, t3",
    "    bpeq t0, 0, .stackCheckFailed",
    "    move t4, entry",
    "    move t5, vm",
    "    jmp .stackHeightOK",
    ".stackCheckFailed:",
    "    move t4, entry",
    "    move t5, vm",
    "else",
    "    skip",
    "end",
    ".throwStackOverflow:",
    "    move vm, a0",
    "    move protoCallFrame, a1",
    "    cCall2(_llint_throw_stack_overflow_error)",
    "    vmEntryRecord(cfr, t4)",
    "    loadp VMEntryRecord::m_vm[t4], vm",
    "    loadp VMEntryRecord::m_prevTopCallFrame[t4], extraTempReg",
    "    storep extraTempReg, VM::topCallFrame[vm]",
    "    loadp VMEntryRecord::m_prevTopVMEntryFrame[t4], extraTempReg",
    "    storep extraTempReg, VM::topVMEntryFrame[vm]",
    "    subp cfr, CalleeRegisterSaveSize, sp",
    "    popCalleeSaves()",
    "    functionEpilogue()",
    "    ret ",
    ".stackHeightOK:",
    "    move t3, sp",
    "    move 4, t3",
    ".copyHeaderLoop:",
    "    subi 1, t3",
    "    loadq 0[protoCallFrame, t3, 8], extraTempReg",
    "    storeq extraTempReg, CodeBlock[sp, t3, 8]",
    "    btinz t3, .copyHeaderLoop",
    "    loadi (PayloadOffset + ProtoCallFrame::argCountAndCodeOriginValue)[protoCallFrame], t4",
    "    subi 1, t4",
    "    loadi ProtoCallFrame::paddedArgCount[protoCallFrame], extraTempReg",
    "    subi 1, extraTempReg",
    "    bieq t4, extraTempReg, .copyArgs",
    "    move ValueUndefined, t3",
    ".fillExtraArgsLoop:",
    "    subi 1, extraTempReg",
    "    storeq t3, (ThisArgumentOffset + 8)[sp, extraTempReg, 8]",
    "    bineq t4, extraTempReg, .fillExtraArgsLoop",
    ".copyArgs:",
    "    loadp ProtoCallFrame::args[protoCallFrame], t3",
    ".copyArgsLoop:",
    "    btiz t4, .copyArgsDone",
    "    subi 1, t4",
    "    loadq 0[t3, t4, 8], extraTempReg",
    "    storeq extraTempReg, (ThisArgumentOffset + 8)[sp, t4, 8]",
    "    jmp .copyArgsLoop",
    ".copyArgsDone:",
    "if ARM64",
    "    move sp, t4",
    "    storep t4, VM::topCallFrame[vm]",
    "else",
    "    storep sp, VM::topCallFrame[vm]",
    "end",
    "    storep cfr, VM::topVMEntryFrame[vm]",
    "    checkStackPointerAlignment(extraTempReg, 3134249986)",
    "    makeCall(entry, t3)",
    "    checkStackPointerAlignment(t2, 3134249987)",
    "    vmEntryRecord(cfr, t4)",
    "    loadp VMEntryRecord::m_vm[t4], vm",
    "    loadp VMEntryRecord::m_prevTopCallFrame[t4], t2",
    "    storep t2, VM::topCallFrame[vm]",
    "    loadp VMEntryRecord::m_prevTopVMEntryFrame[t4], t2",
    "    storep t2, VM::topVMEntryFrame[vm]",
    "    subp cfr, CalleeRegisterSaveSize, sp",
    "    popCalleeSaves()",
    "    functionEpilogue()",
    "    ret ",
    "end",
    "macro makeJavaScriptCall(entry, temp)",
    "    addp 16, sp",
    "if C_LOOP",
    "    cloopCallJSFunction entry",
    "else",
    "    call entry",
    "end",
    "    subp 16, sp",
    "end",
    "macro makeHostFunctionCall(entry, temp)",
    "    move entry, temp",
    "    storep cfr, 0[sp]",
    "    move sp, a0",
    "if C_LOOP",
    "    storep lr, 8[sp]",
    "    cloopCallNative temp",
    "else",
    "if X86_64_WIN",
    "    subp 32, sp",
    "    call temp",
    "    addp 32, sp",
    "else",
    "    call temp",
    "end",
    "end",
    "end",
    "_handleUncaughtException:",
    "    loadp Callee[cfr], t3",
    "    andp MarkedBlockMask, t3",
    "    loadp MarkedBlock::m_vm[t3], t3",
    "    restoreCalleeSavesFromVMEntryFrameCalleeSavesBuffer(t3, t0)",
    "    loadp VM::callFrameForCatch[t3], cfr",
    "    storep 0, VM::callFrameForCatch[t3]",
    "    loadp CallerFrame[cfr], cfr",
    "    vmEntryRecord(cfr, t2)",
    "    loadp VMEntryRecord::m_vm[t2], t3",
    "    loadp VMEntryRecord::m_prevTopCallFrame[t2], extraTempReg",
    "    storep extraTempReg, VM::topCallFrame[t3]",
    "    loadp VMEntryRecord::m_prevTopVMEntryFrame[t2], extraTempReg",
    "    storep extraTempReg, VM::topVMEntryFrame[t3]",
    "    subp cfr, CalleeRegisterSaveSize, sp",
    "    popCalleeSaves()",
    "    functionEpilogue()",
    "    ret ",
    "macro prepareStateForCCall()",
    "    leap 0[PB, PC, 8], PC",
    "end",
    "macro restoreStateAfterCCall()",
    "    move r0, PC",
    "    subp PB, PC",
    "    rshiftp 3, PC",
    "end",
    "macro callSlowPath(slowPath)",
    "    prepareStateForCCall()",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(slowPath)",
    "    restoreStateAfterCCall()",
    "end",
    "macro traceOperand(fromWhere, operand)",
    "    prepareStateForCCall()",
    "    move fromWhere, a2",
    "    move operand, a3",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall4(_llint_trace_operand)",
    "    restoreStateAfterCCall()",
    "end",
    "macro traceValue(fromWhere, operand)",
    "    prepareStateForCCall()",
    "    move fromWhere, a2",
    "    move operand, a3",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall4(_llint_trace_value)",
    "    restoreStateAfterCCall()",
    "end",
    "macro callCallSlowPath(slowPath, action)",
    "    storei PC, (ArgumentCount + TagOffset)[cfr]",
    "    prepareStateForCCall()",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(slowPath)",
    "    action(r0, r1)",
    "end",
    "macro callTrapHandler(throwHandler)",
    "    storei PC, (ArgumentCount + TagOffset)[cfr]",
    "    prepareStateForCCall()",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(_llint_slow_path_handle_traps)",
    "    btpnz r0, throwHandler",
    "    loadi (ArgumentCount + TagOffset)[cfr], PC",
    "end",
    "macro checkSwitchToJITForLoop()",
    "    checkSwitchToJIT(1, macro ()",
    "    storei PC, (ArgumentCount + TagOffset)[cfr]",
    "    prepareStateForCCall()",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(_llint_loop_osr)",
    "    btpz r0, .recover",
    "    move r1, sp",
    "    jmp r0",
    ".recover:",
    "    loadi (ArgumentCount + TagOffset)[cfr], PC",
    "end)",
    "end",
    "macro loadCaged(basePtr, source, dest, scratch)",
    "    loadp source, dest",
    "if (GIGACAGE_ENABLED and (notC_LOOP))",
    "    loadp basePtr, scratch",
    "    btpz scratch, .done",
    "    andp constexpr (GIGACAGE_MASK), dest",
    "    addp scratch, dest",
    ".done:",
    "else",
    "    skip",
    "end",
    "end",
    "macro loadVariable(operand, value)",
    "    loadisFromInstruction(operand, value)",
    "    loadq 0[cfr, value, 8], value",
    "end",
    "macro loadConstantOrVariable(index, value)",
    "    bpgteq index, FirstConstantRegisterIndex, .constant",
    "    loadq 0[cfr, index, 8], value",
    "    jmp .done",
    ".constant:",
    "    loadp CodeBlock[cfr], value",
    "    loadp (CodeBlock::m_constantRegisters + VectorBufferOffset)[value], value",
    "    subp FirstConstantRegisterIndex, index",
    "    loadq 0[value, index, 8], value",
    ".done:",
    "end",
    "macro loadConstantOrVariableInt32(index, value, slow)",
    "    loadConstantOrVariable(index, value)",
    "    bqb value, tagTypeNumber, slow",
    "end",
    "macro loadConstantOrVariableCell(index, value, slow)",
    "    loadConstantOrVariable(index, value)",
    "    btqnz value, tagMask, slow",
    "end",
    "macro writeBarrierOnOperand(cellOperand)",
    "    loadisFromInstruction(cellOperand, t1)",
    "    loadConstantOrVariableCell(t1, t2, .writeBarrierDone)",
    "    skipIfIsRememberedOrInEden(t2, macro ()",
    "    push PB, PC",
    "    move t2, a1",
    "    move cfr, a0",
    "    cCall2Void(_llint_write_barrier_slow)",
    "    pop PC, PB",
    "end)",
    ".writeBarrierDone:",
    "end",
    "macro writeBarrierOnOperands(cellOperand, valueOperand)",
    "    loadisFromInstruction(valueOperand, t1)",
    "    loadConstantOrVariableCell(t1, t0, .writeBarrierDone)",
    "    btpz t0, .writeBarrierDone",
    "    writeBarrierOnOperand(cellOperand)",
    ".writeBarrierDone:",
    "end",
    "macro writeBarrierOnGlobal(valueOperand, loadHelper)",
    "    loadisFromInstruction(valueOperand, t1)",
    "    loadConstantOrVariableCell(t1, t0, .writeBarrierDone)",
    "    btpz t0, .writeBarrierDone",
    "    loadHelper(t3)",
    "    skipIfIsRememberedOrInEden(t3, macro ()",
    "    push PB, PC",
    "    move cfr, a0",
    "    move t3, a1",
    "    cCall2Void(_llint_write_barrier_slow)",
    "    pop PC, PB",
    "end)",
    ".writeBarrierDone:",
    "end",
    "macro writeBarrierOnGlobalObject(valueOperand)",
    "    writeBarrierOnGlobal(valueOperand, macro (registerToStoreGlobal)",
    "    loadp CodeBlock[cfr], registerToStoreGlobal",
    "    loadp CodeBlock::m_globalObject[registerToStoreGlobal], registerToStoreGlobal",
    "end)",
    "end",
    "macro writeBarrierOnGlobalLexicalEnvironment(valueOperand)",
    "    writeBarrierOnGlobal(valueOperand, macro (registerToStoreGlobal)",
    "    loadp CodeBlock[cfr], registerToStoreGlobal",
    "    loadp CodeBlock::m_globalObject[registerToStoreGlobal], registerToStoreGlobal",
    "    loadp JSGlobalObject::m_globalLexicalEnvironment[registerToStoreGlobal], registerToStoreGlobal",
    "end)",
    "end",
    "macro valueProfile(value, operand, scratch)",
    "    loadpFromInstruction(operand, scratch)",
    "    storeq value, ValueProfile::m_buckets[scratch]",
    "end",
    "macro structureIDToStructureWithScratch(structureIDThenStructure, scratch)",
    "    loadp CodeBlock[cfr], scratch",
    "    loadp CodeBlock::m_vm[scratch], scratch",
    "    loadp ((VM::heap + Heap::m_structureIDTable) + StructureIDTable::m_table)[scratch], scratch",
    "    loadp 0[scratch, structureIDThenStructure, 8], structureIDThenStructure",
    "end",
    "macro loadStructureWithScratch(cell, structure, scratch)",
    "    loadi JSCell::m_structureID[cell], structure",
    "    structureIDToStructureWithScratch(structure, scratch)",
    "end",
    "macro loadStructureAndClobberFirstArg(cell, structure)",
    "    loadi JSCell::m_structureID[cell], structure",
    "    loadp CodeBlock[cfr], cell",
    "    loadp CodeBlock::m_vm[cell], cell",
    "    loadp ((VM::heap + Heap::m_structureIDTable) + StructureIDTable::m_table)[cell], cell",
    "    loadp 0[cell, structure, 8], structure",
    "end",
    "macro functionArityCheck(doneLabel, slowPath)",
    "    loadi (PayloadOffset + ArgumentCount)[cfr], t0",
    "    biaeq t0, CodeBlock::m_numParameters[t1], doneLabel",
    "    prepareStateForCCall()",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(slowPath)",
    "    btiz r0, .noError",
    "    move r1, cfr",
    "    jmp _llint_throw_from_slow_path_trampoline",
    ".noError:",
    "    loadi CommonSlowPaths::ArityCheckData::paddedStackSpace[r1], t1",
    "    btiz t1, .continue",
    "    loadi (PayloadOffset + ArgumentCount)[cfr], t2",
    "    addi CallFrameHeaderSlots, t2",
    "    move t1, t3",
    "    andi (StackAlignmentSlots - 1), t3",
    "    btiz t3, .noExtraSlot",
    "    move ValueUndefined, t0",
    ".fillExtraSlots:",
    "    storeq t0, 0[cfr, t2, 8]",
    "    addi 1, t2",
    "    bsubinz 1, t3, .fillExtraSlots",
    "    andi (~(StackAlignmentSlots - 1)), t1",
    "    btiz t1, .continue",
    ".noExtraSlot:",
    "    negq t1",
    "    move cfr, t3",
    "    subp (CalleeSaveSpaceAsVirtualRegisters * 8), t3",
    "    addi CalleeSaveSpaceAsVirtualRegisters, t2",
    "    move t1, t0",
    "    lshiftp 3, t0",
    "    addp t0, cfr",
    "    addp t0, sp",
    ".copyLoop:",
    "    loadq 0[t3], t0",
    "    storeq t0, 0[t3, t1, 8]",
    "    addp 8, t3",
    "    bsubinz 1, t2, .copyLoop",
    "    move t1, t2",
    "    move ValueUndefined, t0",
    ".fillLoop:",
    "    storeq t0, 0[t3, t1, 8]",
    "    addp 8, t3",
    "    baddinz 1, t2, .fillLoop",
    ".continue:",
    "    loadp CodeBlock[cfr], t1",
    "    loadp CodeBlock::m_instructions[t1], PB",
    "    move 0, PC",
    "    jmp doneLabel",
    "end",
    "macro branchIfException(label)",
    "    loadp Callee[cfr], t3",
    "    andp MarkedBlockMask, t3",
    "    loadp MarkedBlock::m_vm[t3], t3",
    "    btqz VM::m_exception[t3], .noException",
    "    jmp label",
    ".noException:",
    "end",
    "_llint_op_enter:",
    "    traceExecution()",
    "    checkStackPointerAlignment(t2, 3735879905)",
    "    loadp CodeBlock[cfr], t2",
    "    loadi CodeBlock::m_numVars[t2], t2",
    "    subq CalleeSaveSpaceAsVirtualRegisters, t2",
    "    move cfr, t1",
    "    subq (CalleeSaveSpaceAsVirtualRegisters * 8), t1",
    "    btiz t2, .opEnterDone",
    "    move ValueUndefined, t0",
    "    negi t2",
    "    sxi2q t2, t2",
    ".opEnterLoop:",
    "    storeq t0, 0[t1, t2, 8]",
    "    addq 1, t2",
    "    btqnz t2, .opEnterLoop",
    ".opEnterDone:",
    "    callOpcodeSlowPath(_slow_path_enter)",
    "    dispatch(constexpr (op_enter_length))",
    "_llint_op_get_argument:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t1)",
    "    loadisFromInstruction(2, t2)",
    "    loadi (PayloadOffset + ArgumentCount)[cfr], t0",
    "    bilteq t0, t2, .opGetArgumentOutOfBounds",
    "    loadq ThisArgumentOffset[cfr, t2, 8], t0",
    "    storeq t0, 0[cfr, t1, 8]",
    "    valueProfile(t0, 3, t2)",
    "    dispatch(constexpr (op_get_argument_length))",
    ".opGetArgumentOutOfBounds:",
    "    storeq ValueUndefined, 0[cfr, t1, 8]",
    "    valueProfile(ValueUndefined, 3, t2)",
    "    dispatch(constexpr (op_get_argument_length))",
    "_llint_op_argument_count:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t1)",
    "    loadi (PayloadOffset + ArgumentCount)[cfr], t0",
    "    subi 1, t0",
    "    orq TagTypeNumber, t0",
    "    storeq t0, 0[cfr, t1, 8]",
    "    dispatch(constexpr (op_argument_count_length))",
    "_llint_op_get_scope:",
    "    traceExecution()",
    "    loadp Callee[cfr], t0",
    "    loadp JSCallee::m_scope[t0], t0",
    "    loadisFromInstruction(1, t1)",
    "    storeq t0, 0[cfr, t1, 8]",
    "    dispatch(constexpr (op_get_scope_length))",
    "_llint_op_to_this:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t0)",
    "    loadq 0[cfr, t0, 8], t0",
    "    btqnz t0, tagMask, .opToThisSlow",
    "    bbneq JSCell::m_type[t0], FinalObjectType, .opToThisSlow",
    "    loadStructureWithScratch(t0, t1, t2)",
    "    loadpFromInstruction(2, t2)",
    "    bpneq t1, t2, .opToThisSlow",
    "    dispatch(constexpr (op_to_this_length))",
    ".opToThisSlow:",
    "    callOpcodeSlowPath(_slow_path_to_this)",
    "    dispatch(constexpr (op_to_this_length))",
    "_llint_op_check_tdz:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t0)",
    "    loadConstantOrVariable(t0, t1)",
    "    bqneq t1, ValueEmpty, .opNotTDZ",
    "    callOpcodeSlowPath(_slow_path_throw_tdz_error)",
    ".opNotTDZ:",
    "    dispatch(constexpr (op_check_tdz_length))",
    "_llint_op_mov:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t1)",
    "    loadisFromInstruction(1, t0)",
    "    loadConstantOrVariable(t1, t2)",
    "    storeq t2, 0[cfr, t0, 8]",
    "    dispatch(constexpr (op_mov_length))",
    "_llint_op_not:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t0)",
    "    loadisFromInstruction(1, t1)",
    "    loadConstantOrVariable(t0, t2)",
    "    xorq ValueFalse, t2",
    "    btqnz t2, (~1), .opNotSlow",
    "    xorq ValueTrue, t2",
    "    storeq t2, 0[cfr, t1, 8]",
    "    dispatch(constexpr (op_not_length))",
    ".opNotSlow:",
    "    callOpcodeSlowPath(_slow_path_not)",
    "    dispatch(constexpr (op_not_length))",
    "macro equalityComparison(integerComparison, slowPath)",
    "    traceExecution()",
    "    loadisFromInstruction(3, t0)",
    "    loadisFromInstruction(2, t2)",
    "    loadisFromInstruction(1, t3)",
    "    loadConstantOrVariableInt32(t0, t1, .slow)",
    "    loadConstantOrVariableInt32(t2, t0, .slow)",
    "    integerComparison(t0, t1, t0)",
    "    orq ValueFalse, t0",
    "    storeq t0, 0[cfr, t3, 8]",
    "    dispatch(4)",
    ".slow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(4)",
    "end",
    "_llint_op_eq:",
    "    equalityComparison(macro (left, right, result)",
    "    cieq left, right, result",
    "end, _slow_path_eq)",
    "_llint_op_neq:",
    "    equalityComparison(macro (left, right, result)",
    "    cineq left, right, result",
    "end, _slow_path_neq)",
    "macro equalNullComparison()",
    "    loadisFromInstruction(2, t0)",
    "    loadq 0[cfr, t0, 8], t0",
    "    btqnz t0, tagMask, .immediate",
    "    btbnz JSCell::m_flags[t0], MasqueradesAsUndefined, .masqueradesAsUndefined",
    "    move 0, t0",
    "    jmp .done",
    ".masqueradesAsUndefined:",
    "    loadStructureWithScratch(t0, t2, t1)",
    "    loadp CodeBlock[cfr], t0",
    "    loadp CodeBlock::m_globalObject[t0], t0",
    "    cpeq Structure::m_globalObject[t2], t0, t0",
    "    jmp .done",
    ".immediate:",
    "    andq (~TagBitUndefined), t0",
    "    cqeq t0, ValueNull, t0",
    ".done:",
    "end",
    "_llint_op_eq_null:",
    "    traceExecution()",
    "    equalNullComparison()",
    "    loadisFromInstruction(1, t1)",
    "    orq ValueFalse, t0",
    "    storeq t0, 0[cfr, t1, 8]",
    "    dispatch(constexpr (op_eq_null_length))",
    "_llint_op_neq_null:",
    "    traceExecution()",
    "    equalNullComparison()",
    "    loadisFromInstruction(1, t1)",
    "    xorq ValueTrue, t0",
    "    storeq t0, 0[cfr, t1, 8]",
    "    dispatch(constexpr (op_neq_null_length))",
    "macro strictEq(equalityOperation, slowPath)",
    "    traceExecution()",
    "    loadisFromInstruction(3, t0)",
    "    loadisFromInstruction(2, t2)",
    "    loadConstantOrVariable(t0, t1)",
    "    loadConstantOrVariable(t2, t0)",
    "    move t0, t2",
    "    orq t1, t2",
    "    btqz t2, tagMask, .slow",
    "    bqaeq t0, tagTypeNumber, .leftOK",
    "    btqnz t0, tagTypeNumber, .slow",
    ".leftOK:",
    "    bqaeq t1, tagTypeNumber, .rightOK",
    "    btqnz t1, tagTypeNumber, .slow",
    ".rightOK:",
    "    equalityOperation(t0, t1, t0)",
    "    loadisFromInstruction(1, t1)",
    "    orq ValueFalse, t0",
    "    storeq t0, 0[cfr, t1, 8]",
    "    dispatch(4)",
    ".slow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(4)",
    "end",
    "_llint_op_stricteq:",
    "    strictEq(macro (left, right, result)",
    "    cqeq left, right, result",
    "end, _slow_path_stricteq)",
    "_llint_op_nstricteq:",
    "    strictEq(macro (left, right, result)",
    "    cqneq left, right, result",
    "end, _slow_path_nstricteq)",
    "macro preOp(arithmeticOperation, slowPath)",
    "    traceExecution()",
    "    loadisFromInstruction(1, t0)",
    "    loadq 0[cfr, t0, 8], t1",
    "    bqb t1, tagTypeNumber, .slow",
    "    arithmeticOperation(t1, .slow)",
    "    orq tagTypeNumber, t1",
    "    storeq t1, 0[cfr, t0, 8]",
    "    dispatch(2)",
    ".slow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(2)",
    "end",
    "_llint_op_inc:",
    "    preOp(macro (value, slow)",
    "    baddio 1, value, slow",
    "end, _slow_path_inc)",
    "_llint_op_dec:",
    "    preOp(macro (value, slow)",
    "    bsubio 1, value, slow",
    "end, _slow_path_dec)",
    "_llint_op_to_number:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t0)",
    "    loadisFromInstruction(1, t1)",
    "    loadConstantOrVariable(t0, t2)",
    "    bqaeq t2, tagTypeNumber, .opToNumberIsImmediate",
    "    btqz t2, tagTypeNumber, .opToNumberSlow",
    ".opToNumberIsImmediate:",
    "    storeq t2, 0[cfr, t1, 8]",
    "    valueProfile(t2, 3, t0)",
    "    dispatch(constexpr (op_to_number_length))",
    ".opToNumberSlow:",
    "    callOpcodeSlowPath(_slow_path_to_number)",
    "    dispatch(constexpr (op_to_number_length))",
    "_llint_op_to_string:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t1)",
    "    loadisFromInstruction(1, t2)",
    "    loadConstantOrVariable(t1, t0)",
    "    btqnz t0, tagMask, .opToStringSlow",
    "    bbneq JSCell::m_type[t0], StringType, .opToStringSlow",
    ".opToStringIsString:",
    "    storeq t0, 0[cfr, t2, 8]",
    "    dispatch(constexpr (op_to_string_length))",
    ".opToStringSlow:",
    "    callOpcodeSlowPath(_slow_path_to_string)",
    "    dispatch(constexpr (op_to_string_length))",
    "_llint_op_negate:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t0)",
    "    loadisFromInstruction(1, t1)",
    "    loadConstantOrVariable(t0, t3)",
    "    loadisFromInstruction(3, t2)",
    "    bqb t3, tagTypeNumber, .opNegateNotInt",
    "    btiz t3, 2147483647, .opNegateSlow",
    "    negi t3",
    "    ori ArithProfileInt, t2",
    "    orq tagTypeNumber, t3",
    "    storeisToInstruction(t2, 3)",
    "    storeq t3, 0[cfr, t1, 8]",
    "    dispatch(constexpr (op_negate_length))",
    ".opNegateNotInt:",
    "    btqz t3, tagTypeNumber, .opNegateSlow",
    "    xorq 9223372036854776000, t3",
    "    ori ArithProfileNumber, t2",
    "    storeq t3, 0[cfr, t1, 8]",
    "    storeisToInstruction(t2, 3)",
    "    dispatch(constexpr (op_negate_length))",
    ".opNegateSlow:",
    "    callOpcodeSlowPath(_slow_path_negate)",
    "    dispatch(constexpr (op_negate_length))",
    "macro binaryOpCustomStore(integerOperationAndStore, doubleOperation, slowPath)",
    "    loadisFromInstruction(3, t0)",
    "    loadisFromInstruction(2, t2)",
    "    loadConstantOrVariable(t0, t1)",
    "    loadConstantOrVariable(t2, t0)",
    "    bqb t0, tagTypeNumber, .op1NotInt",
    "    bqb t1, tagTypeNumber, .op2NotInt",
    "    loadisFromInstruction(1, t2)",
    "    integerOperationAndStore(t1, t0, .slow, t2)",
    "    loadisFromInstruction(4, t1)",
    "    ori ArithProfileIntInt, t1",
    "    storeisToInstruction(t1, 4)",
    "    dispatch(5)",
    ".op1NotInt:",
    "    btqz t0, tagTypeNumber, .slow",
    "    bqaeq t1, tagTypeNumber, .op1NotIntOp2Int",
    "    btqz t1, tagTypeNumber, .slow",
    "    addq tagTypeNumber, t1",
    "    fq2d t1, ft1",
    "    loadisFromInstruction(4, t2)",
    "    ori ArithProfileNumberNumber, t2",
    "    storeisToInstruction(t2, 4)",
    "    jmp .op1NotIntReady",
    ".op1NotIntOp2Int:",
    "    loadisFromInstruction(4, t2)",
    "    ori ArithProfileNumberInt, t2",
    "    storeisToInstruction(t2, 4)",
    "    ci2d t1, ft1",
    ".op1NotIntReady:",
    "    loadisFromInstruction(1, t2)",
    "    addq tagTypeNumber, t0",
    "    fq2d t0, ft0",
    "    doubleOperation(ft1, ft0)",
    "    fd2q ft0, t0",
    "    subq tagTypeNumber, t0",
    "    storeq t0, 0[cfr, t2, 8]",
    "    dispatch(5)",
    ".op2NotInt:",
    "    loadisFromInstruction(1, t2)",
    "    btqz t1, tagTypeNumber, .slow",
    "    loadisFromInstruction(4, t3)",
    "    ori ArithProfileIntNumber, t3",
    "    storeisToInstruction(t3, 4)",
    "    ci2d t0, ft0",
    "    addq tagTypeNumber, t1",
    "    fq2d t1, ft1",
    "    doubleOperation(ft1, ft0)",
    "    fd2q ft0, t0",
    "    subq tagTypeNumber, t0",
    "    storeq t0, 0[cfr, t2, 8]",
    "    dispatch(5)",
    ".slow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(5)",
    "end",
    "macro binaryOp(integerOperation, doubleOperation, slowPath)",
    "    binaryOpCustomStore(macro (left, right, slow, index)",
    "    integerOperation(left, right, slow)",
    "    orq tagTypeNumber, right",
    "    storeq right, 0[cfr, index, 8]",
    "end, doubleOperation, slowPath)",
    "end",
    "_llint_op_add:",
    "    traceExecution()",
    "    binaryOp(macro (left, right, slow)",
    "    baddio left, right, slow",
    "end, macro (left, right)",
    "    addd left, right",
    "end, _slow_path_add)",
    "_llint_op_mul:",
    "    traceExecution()",
    "    binaryOpCustomStore(macro (left, right, slow, index)",
    "    move right, t3",
    "    bmulio left, t3, slow",
    "    btinz t3, .done",
    "    bilt left, 0, slow",
    "    bilt right, 0, slow",
    ".done:",
    "    orq tagTypeNumber, t3",
    "    storeq t3, 0[cfr, index, 8]",
    "end, macro (left, right)",
    "    muld left, right",
    "end, _slow_path_mul)",
    "_llint_op_sub:",
    "    traceExecution()",
    "    binaryOp(macro (left, right, slow)",
    "    bsubio left, right, slow",
    "end, macro (left, right)",
    "    subd left, right",
    "end, _slow_path_sub)",
    "_llint_op_div:",
    "    traceExecution()",
    "if (X86_64 or X86_64_WIN)",
    "    binaryOpCustomStore(macro (left, right, slow, index)",
    "    btiz left, slow",
    "    bineq left, (-1), .notNeg2TwoThe31DivByNeg1",
    "    bieq right, (-2147483648), .slow",
    ".notNeg2TwoThe31DivByNeg1:",
    "    btinz right, .intOK",
    "    bilt left, 0, slow",
    ".intOK:",
    "    move left, t3",
    "    move right, t0",
    "    cdqi ",
    "    idivi t3",
    "    btinz t1, slow",
    "    orq tagTypeNumber, t0",
    "    storeq t0, 0[cfr, index, 8]",
    "end, macro (left, right)",
    "    divd left, right",
    "end, _slow_path_div)",
    "else",
    "    callOpcodeSlowPath(_slow_path_div)",
    "    dispatch(constexpr (op_div_length))",
    "end",
    "macro bitOp(operation, slowPath, advance)",
    "    loadisFromInstruction(3, t0)",
    "    loadisFromInstruction(2, t2)",
    "    loadisFromInstruction(1, t3)",
    "    loadConstantOrVariable(t0, t1)",
    "    loadConstantOrVariable(t2, t0)",
    "    bqb t0, tagTypeNumber, .slow",
    "    bqb t1, tagTypeNumber, .slow",
    "    operation(t1, t0)",
    "    orq tagTypeNumber, t0",
    "    storeq t0, 0[cfr, t3, 8]",
    "    dispatch(advance)",
    ".slow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(advance)",
    "end",
    "_llint_op_lshift:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    lshifti left, right",
    "end, _slow_path_lshift, constexpr (op_lshift_length))",
    "_llint_op_rshift:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    rshifti left, right",
    "end, _slow_path_rshift, constexpr (op_rshift_length))",
    "_llint_op_urshift:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    urshifti left, right",
    "end, _slow_path_urshift, constexpr (op_urshift_length))",
    "_llint_op_unsigned:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t0)",
    "    loadisFromInstruction(2, t1)",
    "    loadConstantOrVariable(t1, t2)",
    "    bilt t2, 0, .opUnsignedSlow",
    "    storeq t2, 0[cfr, t0, 8]",
    "    dispatch(constexpr (op_unsigned_length))",
    ".opUnsignedSlow:",
    "    callOpcodeSlowPath(_slow_path_unsigned)",
    "    dispatch(constexpr (op_unsigned_length))",
    "_llint_op_bitand:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    andi left, right",
    "end, _slow_path_bitand, constexpr (op_bitand_length))",
    "_llint_op_bitxor:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    xori left, right",
    "end, _slow_path_bitxor, constexpr (op_bitxor_length))",
    "_llint_op_bitor:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    ori left, right",
    "end, _slow_path_bitor, constexpr (op_bitor_length))",
    "_llint_op_overrides_has_instance:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t3)",
    "    loadisFromInstruction(3, t1)",
    "    loadConstantOrVariable(t1, t0)",
    "    loadp CodeBlock[cfr], t2",
    "    loadp CodeBlock::m_globalObject[t2], t2",
    "    loadp JSGlobalObject::m_functionProtoHasInstanceSymbolFunction[t2], t2",
    "    bqneq t0, t2, .opOverridesHasInstanceNotDefaultSymbol",
    "    loadisFromInstruction(2, t1)",
    "    loadConstantOrVariable(t1, t0)",
    "    tbz JSCell::m_flags[t0], ImplementsDefaultHasInstance, t1",
    "    orq ValueFalse, t1",
    "    storeq t1, 0[cfr, t3, 8]",
    "    dispatch(constexpr (op_overrides_has_instance_length))",
    ".opOverridesHasInstanceNotDefaultSymbol:",
    "    storeq ValueTrue, 0[cfr, t3, 8]",
    "    dispatch(constexpr (op_overrides_has_instance_length))",
    "_llint_op_instanceof_custom:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_instanceof_custom)",
    "    dispatch(constexpr (op_instanceof_custom_length))",
    "_llint_op_is_empty:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t1)",
    "    loadisFromInstruction(1, t2)",
    "    loadConstantOrVariable(t1, t0)",
    "    cqeq t0, ValueEmpty, t3",
    "    orq ValueFalse, t3",
    "    storeq t3, 0[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_empty_length))",
    "_llint_op_is_undefined:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t1)",
    "    loadisFromInstruction(1, t2)",
    "    loadConstantOrVariable(t1, t0)",
    "    btqz t0, tagMask, .opIsUndefinedCell",
    "    cqeq t0, ValueUndefined, t3",
    "    orq ValueFalse, t3",
    "    storeq t3, 0[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_undefined_length))",
    ".opIsUndefinedCell:",
    "    btbnz JSCell::m_flags[t0], MasqueradesAsUndefined, .masqueradesAsUndefined",
    "    move ValueFalse, t1",
    "    storeq t1, 0[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_undefined_length))",
    ".masqueradesAsUndefined:",
    "    loadStructureWithScratch(t0, t3, t1)",
    "    loadp CodeBlock[cfr], t1",
    "    loadp CodeBlock::m_globalObject[t1], t1",
    "    cpeq Structure::m_globalObject[t3], t1, t0",
    "    orq ValueFalse, t0",
    "    storeq t0, 0[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_undefined_length))",
    "_llint_op_is_boolean:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t1)",
    "    loadisFromInstruction(1, t2)",
    "    loadConstantOrVariable(t1, t0)",
    "    xorq ValueFalse, t0",
    "    tqz t0, (~1), t0",
    "    orq ValueFalse, t0",
    "    storeq t0, 0[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_boolean_length))",
    "_llint_op_is_number:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t1)",
    "    loadisFromInstruction(1, t2)",
    "    loadConstantOrVariable(t1, t0)",
    "    tqnz t0, tagTypeNumber, t1",
    "    orq ValueFalse, t1",
    "    storeq t1, 0[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_number_length))",
    "_llint_op_is_cell_with_type:",
    "    traceExecution()",
    "    loadisFromInstruction(3, t0)",
    "    loadisFromInstruction(2, t1)",
    "    loadisFromInstruction(1, t2)",
    "    loadConstantOrVariable(t1, t3)",
    "    btqnz t3, tagMask, .notCellCase",
    "    cbeq JSCell::m_type[t3], t0, t1",
    "    orq ValueFalse, t1",
    "    storeq t1, 0[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_cell_with_type_length))",
    ".notCellCase:",
    "    storeq ValueFalse, 0[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_cell_with_type_length))",
    "_llint_op_is_object:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t1)",
    "    loadisFromInstruction(1, t2)",
    "    loadConstantOrVariable(t1, t0)",
    "    btqnz t0, tagMask, .opIsObjectNotCell",
    "    cbaeq JSCell::m_type[t0], ObjectType, t1",
    "    orq ValueFalse, t1",
    "    storeq t1, 0[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_object_length))",
    ".opIsObjectNotCell:",
    "    storeq ValueFalse, 0[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_object_length))",
    "macro loadPropertyAtVariableOffset(propertyOffsetAsInt, objectAndStorage, value)",
    "    bilt propertyOffsetAsInt, firstOutOfLineOffset, .isInline",
    "    loadCaged(_g_jsValueGigacageBasePtr, JSObject::m_butterfly[objectAndStorage], objectAndStorage, value)",
    "    negi propertyOffsetAsInt",
    "    sxi2q propertyOffsetAsInt, propertyOffsetAsInt",
    "    jmp .ready",
    ".isInline:",
    "    addp (sizeof JSObject - ((firstOutOfLineOffset - 2) * 8)), objectAndStorage",
    ".ready:",
    "    loadq ((firstOutOfLineOffset - 2) * 8)[objectAndStorage, propertyOffsetAsInt, 8], value",
    "end",
    "macro storePropertyAtVariableOffset(propertyOffsetAsInt, objectAndStorage, value, scratch)",
    "    bilt propertyOffsetAsInt, firstOutOfLineOffset, .isInline",
    "    loadCaged(_g_jsValueGigacageBasePtr, JSObject::m_butterfly[objectAndStorage], objectAndStorage, scratch)",
    "    negi propertyOffsetAsInt",
    "    sxi2q propertyOffsetAsInt, propertyOffsetAsInt",
    "    jmp .ready",
    ".isInline:",
    "    addp (sizeof JSObject - ((firstOutOfLineOffset - 2) * 8)), objectAndStorage",
    ".ready:",
    "    storeq value, ((firstOutOfLineOffset - 2) * 8)[objectAndStorage, propertyOffsetAsInt, 8]",
    "end",
    "_llint_op_get_by_id:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t0)",
    "    loadConstantOrVariableCell(t0, t3, .opGetByIdSlow)",
    "    loadi JSCell::m_structureID[t3], t1",
    "    loadisFromInstruction(4, t2)",
    "    bineq t2, t1, .opGetByIdSlow",
    "    loadisFromInstruction(5, t1)",
    "    loadisFromInstruction(1, t2)",
    "    loadPropertyAtVariableOffset(t1, t3, t0)",
    "    storeq t0, 0[cfr, t2, 8]",
    "    valueProfile(t0, 8, t1)",
    "    dispatch(constexpr (op_get_by_id_length))",
    ".opGetByIdSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_get_by_id)",
    "    dispatch(constexpr (op_get_by_id_length))",
    "_llint_op_get_by_id_proto_load:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t0)",
    "    loadConstantOrVariableCell(t0, t3, .opGetByIdProtoSlow)",
    "    loadi JSCell::m_structureID[t3], t1",
    "    loadisFromInstruction(4, t2)",
    "    bineq t2, t1, .opGetByIdProtoSlow",
    "    loadisFromInstruction(5, t1)",
    "    loadpFromInstruction(6, t3)",
    "    loadisFromInstruction(1, t2)",
    "    loadPropertyAtVariableOffset(t1, t3, t0)",
    "    storeq t0, 0[cfr, t2, 8]",
    "    valueProfile(t0, 8, t1)",
    "    dispatch(constexpr (op_get_by_id_proto_load_length))",
    ".opGetByIdProtoSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_get_by_id)",
    "    dispatch(constexpr (op_get_by_id_proto_load_length))",
    "_llint_op_get_by_id_unset:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t0)",
    "    loadConstantOrVariableCell(t0, t3, .opGetByIdUnsetSlow)",
    "    loadi JSCell::m_structureID[t3], t1",
    "    loadisFromInstruction(4, t2)",
    "    bineq t2, t1, .opGetByIdUnsetSlow",
    "    loadisFromInstruction(1, t2)",
    "    storeq ValueUndefined, 0[cfr, t2, 8]",
    "    valueProfile(ValueUndefined, 8, t1)",
    "    dispatch(constexpr (op_get_by_id_unset_length))",
    ".opGetByIdUnsetSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_get_by_id)",
    "    dispatch(constexpr (op_get_by_id_unset_length))",
    "_llint_op_get_array_length:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t0)",
    "    loadpFromInstruction(4, t1)",
    "    loadConstantOrVariableCell(t0, t3, .opGetArrayLengthSlow)",
    "    move t3, t2",
    "    arrayProfile(t2, t1, t0)",
    "    btiz t2, IsArray, .opGetArrayLengthSlow",
    "    btiz t2, IndexingShapeMask, .opGetArrayLengthSlow",
    "    loadisFromInstruction(1, t1)",
    "    loadCaged(_g_jsValueGigacageBasePtr, JSObject::m_butterfly[t3], t0, t2)",
    "    loadi ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t0], t0",
    "    bilt t0, 0, .opGetArrayLengthSlow",
    "    orq tagTypeNumber, t0",
    "    valueProfile(t0, 8, t2)",
    "    storeq t0, 0[cfr, t1, 8]",
    "    dispatch(constexpr (op_get_array_length_length))",
    ".opGetArrayLengthSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_get_by_id)",
    "    dispatch(constexpr (op_get_array_length_length))",
    "_llint_op_put_by_id:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t3)",
    "    loadConstantOrVariableCell(t3, t0, .opPutByIdSlow)",
    "    loadisFromInstruction(4, t2)",
    "    bineq t2, JSCell::m_structureID[t0], .opPutByIdSlow",
    "    loadisFromInstruction(3, t1)",
    "    loadConstantOrVariable(t1, t3)",
    "    loadpFromInstruction(8, t1)",
    "    btpnz t1, PutByIdPrimaryTypeMask, .opPutByIdTypeCheckObjectWithStructureOrOther",
    "    andp PutByIdSecondaryTypeMask, t1",
    "    bplt t1, PutByIdSecondaryTypeString, .opPutByIdTypeCheckLessThanString",
    "    bplt t1, PutByIdSecondaryTypeObjectOrOther, .opPutByIdTypeCheckLessThanObjectOrOther",
    "    bpeq t1, PutByIdSecondaryTypeTop, .opPutByIdDoneCheckingTypes",
    "    btqz t3, tagMask, .opPutByIdTypeCheckObject",
    ".opPutByIdTypeCheckOther:",
    "    andq (~TagBitUndefined), t3",
    "    bqeq t3, ValueNull, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckLessThanObjectOrOther:",
    "    btqnz t3, tagMask, .opPutByIdSlow",
    "    bpeq t1, PutByIdSecondaryTypeObject, .opPutByIdTypeCheckObject",
    "    bpeq t1, PutByIdSecondaryTypeSymbol, .opPutByIdTypeCheckSymbol",
    "    bbeq JSCell::m_type[t3], StringType, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckObject:",
    "    bbaeq JSCell::m_type[t3], ObjectType, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckSymbol:",
    "    bbeq JSCell::m_type[t3], SymbolType, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckLessThanString:",
    "    bplt t1, PutByIdSecondaryTypeInt32, .opPutByIdTypeCheckLessThanInt32",
    "    bpeq t1, PutByIdSecondaryTypeNumber, .opPutByIdTypeCheckNumber",
    "    bqaeq t3, tagTypeNumber, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckNumber:",
    "    btqnz t3, tagTypeNumber, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckLessThanInt32:",
    "    bpneq t1, PutByIdSecondaryTypeBoolean, .opPutByIdTypeCheckBottomOrOther",
    "    xorq ValueFalse, t3",
    "    btqz t3, (~1), .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckBottomOrOther:",
    "    bpeq t1, PutByIdSecondaryTypeOther, .opPutByIdTypeCheckOther",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckObjectWithStructureOrOther:",
    "    btqz t3, tagMask, .opPutByIdTypeCheckObjectWithStructure",
    "    btpnz t1, PutByIdPrimaryTypeObjectWithStructureOrOther, .opPutByIdTypeCheckOther",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckObjectWithStructure:",
    "    urshiftp 3, t1",
    "    bineq t1, JSCell::m_structureID[t3], .opPutByIdSlow",
    ".opPutByIdDoneCheckingTypes:",
    "    loadisFromInstruction(6, t1)",
    "    btiz t1, .opPutByIdNotTransition",
    "    loadpFromInstruction(7, t3)",
    "    btpz t3, .opPutByIdTransitionDirect",
    "    loadp StructureChain::m_vector[t3], t3",
    "    assert(macro (ok)",
    "    btpnz t3, ok",
    "end)",
    "    structureIDToStructureWithScratch(t2, t1)",
    "    loadq Structure::m_prototype[t2], t2",
    "    bqeq t2, ValueNull, .opPutByIdTransitionChainDone",
    ".opPutByIdTransitionChainLoop:",
    "    loadp 0[t3], t1",
    "    loadi JSCell::m_structureID[t2], t2",
    "    bineq t2, (Structure::m_blob + StructureIDBlob::u.fields.structureID)[t1], .opPutByIdSlow",
    "    addp 8, t3",
    "    loadq Structure::m_prototype[t1], t2",
    "    bqneq t2, ValueNull, .opPutByIdTransitionChainLoop",
    ".opPutByIdTransitionChainDone:",
    "    loadisFromInstruction(6, t1)",
    ".opPutByIdTransitionDirect:",
    "    storei t1, JSCell::m_structureID[t0]",
    "    writeBarrierOnOperand(1)",
    "    loadisFromInstruction(1, t1)",
    "    loadConstantOrVariable(t1, t0)",
    ".opPutByIdNotTransition:",
    "    loadisFromInstruction(3, t1)",
    "    loadConstantOrVariable(t1, t2)",
    "    loadisFromInstruction(5, t1)",
    "    storePropertyAtVariableOffset(t1, t0, t2, t3)",
    "    writeBarrierOnOperands(1, 3)",
    "    dispatch(constexpr (op_put_by_id_length))",
    ".opPutByIdSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_put_by_id)",
    "    dispatch(constexpr (op_put_by_id_length))",
    "macro finishGetByVal(result, scratch)",
    "    loadisFromInstruction(1, scratch)",
    "    storeq result, 0[cfr, scratch, 8]",
    "    valueProfile(result, 5, scratch)",
    "    dispatch(6)",
    "end",
    "macro finishIntGetByVal(result, scratch)",
    "    orq tagTypeNumber, result",
    "    finishGetByVal(result, scratch)",
    "end",
    "macro finishDoubleGetByVal(result, scratch1, scratch2)",
    "    fd2q result, scratch1",
    "    subq tagTypeNumber, scratch1",
    "    finishGetByVal(scratch1, scratch2)",
    "end",
    "_llint_op_get_by_val:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t2)",
    "    loadConstantOrVariableCell(t2, t0, .opGetByValSlow)",
    "    loadpFromInstruction(4, t3)",
    "    move t0, t2",
    "    arrayProfile(t2, t3, t1)",
    "    loadisFromInstruction(3, t3)",
    "    loadConstantOrVariableInt32(t3, t1, .opGetByValSlow)",
    "    sxi2q t1, t1",
    "    loadCaged(_g_jsValueGigacageBasePtr, JSObject::m_butterfly[t0], t3, t5)",
    "    andi IndexingShapeMask, t2",
    "    bieq t2, Int32Shape, .opGetByValIsContiguous",
    "    bineq t2, ContiguousShape, .opGetByValNotContiguous",
    ".opGetByValIsContiguous:",
    "    biaeq t1, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t3], .opGetByValOutOfBounds",
    "    loadisFromInstruction(1, t0)",
    "    loadq 0[t3, t1, 8], t2",
    "    btqz t2, .opGetByValOutOfBounds",
    "    jmp .opGetByValDone",
    ".opGetByValNotContiguous:",
    "    bineq t2, DoubleShape, .opGetByValNotDouble",
    "    biaeq t1, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t3], .opGetByValOutOfBounds",
    "    loadis 8[PB, PC, 8], t0",
    "    loadd 0[t3, t1, 8], ft0",
    "    bdnequn ft0, ft0, .opGetByValOutOfBounds",
    "    fd2q ft0, t2",
    "    subq tagTypeNumber, t2",
    "    jmp .opGetByValDone",
    ".opGetByValNotDouble:",
    "    subi ArrayStorageShape, t2",
    "    bia t2, (SlowPutArrayStorageShape - ArrayStorageShape), .opGetByValNotIndexedStorage",
    "    biaeq t1, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.vectorLength)[t3], .opGetByValOutOfBounds",
    "    loadisFromInstruction(1, t0)",
    "    loadq ArrayStorage::m_vector[t3, t1, 8], t2",
    "    btqz t2, .opGetByValOutOfBounds",
    ".opGetByValDone:",
    "    storeq t2, 0[cfr, t0, 8]",
    "    valueProfile(t2, 5, t0)",
    "    dispatch(constexpr (op_get_by_val_length))",
    ".opGetByValOutOfBounds:",
    "    loadpFromInstruction(4, t0)",
    "    storeb 1, ArrayProfile::m_outOfBounds[t0]",
    "    jmp .opGetByValSlow",
    ".opGetByValNotIndexedStorage:",
    "    loadb JSCell::m_type[t0], t2",
    "    subi FirstArrayType, t2",
    "    bia t2, (LastArrayType - FirstArrayType), .opGetByValSlow",
    "    loadCaged(_g_primitiveGigacageBasePtr, JSArrayBufferView::m_vector[t0], t3, t5)",
    "    biaeq t1, JSArrayBufferView::m_length[t0], .opGetByValSlow",
    "    bia t2, (Uint8ClampedArrayType - FirstArrayType), .opGetByValAboveUint8ClampedArray",
    "    bia t2, (Int16ArrayType - FirstArrayType), .opGetByValInt32ArrayOrUint8Array",
    "    bineq t2, (Int8ArrayType - FirstArrayType), .opGetByValInt16Array",
    "    loadbs 0[t3, t1, 1], t0",
    "    finishIntGetByVal(t0, t1)",
    ".opGetByValInt16Array:",
    "    loadhs 0[t3, t1, 2], t0",
    "    finishIntGetByVal(t0, t1)",
    ".opGetByValInt32ArrayOrUint8Array:",
    "    bieq t2, (Int32ArrayType - FirstArrayType), .opGetByValInt32Array",
    "    loadb 0[t3, t1, 1], t0",
    "    finishIntGetByVal(t0, t1)",
    ".opGetByValInt32Array:",
    "    loadi 0[t3, t1, 4], t0",
    "    finishIntGetByVal(t0, t1)",
    ".opGetByValAboveUint8ClampedArray:",
    "    bia t2, (Uint32ArrayType - FirstArrayType), .opGetByValAboveUint32Array",
    "    bieq t2, (Uint32ArrayType - FirstArrayType), .opGetByValUint32Array",
    "    loadh 0[t3, t1, 2], t0",
    "    finishIntGetByVal(t0, t1)",
    ".opGetByValUint32Array:",
    "    loadi 0[t3, t1, 4], t0",
    "    bilt t0, 0, .opGetByValSlow",
    "    finishIntGetByVal(t0, t1)",
    ".opGetByValAboveUint32Array:",
    "    bieq t2, (Float32ArrayType - FirstArrayType), .opGetByValSlow",
    "    loadd 0[t3, t1, 8], ft0",
    "    bdnequn ft0, ft0, .opGetByValSlow",
    "    finishDoubleGetByVal(ft0, t0, t1)",
    ".opGetByValSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_get_by_val)",
    "    dispatch(constexpr (op_get_by_val_length))",
    "macro contiguousPutByVal(storeCallback)",
    "    biaeq t3, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t0], .outOfBounds",
    ".storeResult:",
    "    loadisFromInstruction(3, t2)",
    "    storeCallback(t2, t1, 0[t0, t3, 8])",
    "    dispatch(5)",
    ".outOfBounds:",
    "    biaeq t3, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.vectorLength)[t0], .opPutByValOutOfBounds",
    "    loadp 32[PB, PC, 8], t2",
    "    storeb 1, ArrayProfile::m_mayStoreToHole[t2]",
    "    addi 1, t3, t2",
    "    storei t2, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t0]",
    "    jmp .storeResult",
    "end",
    "macro putByVal(slowPath)",
    "    traceExecution()",
    "    loadisFromInstruction(1, t0)",
    "    loadConstantOrVariableCell(t0, t1, .opPutByValSlow)",
    "    loadpFromInstruction(4, t3)",
    "    move t1, t2",
    "    arrayProfile(t2, t3, t0)",
    "    loadisFromInstruction(2, t0)",
    "    loadConstantOrVariableInt32(t0, t3, .opPutByValSlow)",
    "    sxi2q t3, t3",
    "    loadCaged(_g_jsValueGigacageBasePtr, JSObject::m_butterfly[t1], t0, t5)",
    "    andi IndexingShapeMask, t2",
    "    bineq t2, Int32Shape, .opPutByValNotInt32",
    "    contiguousPutByVal(macro (operand, scratch, address)",
    "    loadConstantOrVariable(operand, scratch)",
    "    bpb scratch, tagTypeNumber, .opPutByValSlow",
    "    storep scratch, address",
    "    writeBarrierOnOperands(1, 3)",
    "end)",
    ".opPutByValNotInt32:",
    "    bineq t2, DoubleShape, .opPutByValNotDouble",
    "    contiguousPutByVal(macro (operand, scratch, address)",
    "    loadConstantOrVariable(operand, scratch)",
    "    bqb scratch, tagTypeNumber, .notInt",
    "    ci2d scratch, ft0",
    "    jmp .ready",
    ".notInt:",
    "    addp tagTypeNumber, scratch",
    "    fq2d scratch, ft0",
    "    bdnequn ft0, ft0, .opPutByValSlow",
    ".ready:",
    "    stored ft0, address",
    "    writeBarrierOnOperands(1, 3)",
    "end)",
    ".opPutByValNotDouble:",
    "    bineq t2, ContiguousShape, .opPutByValNotContiguous",
    "    contiguousPutByVal(macro (operand, scratch, address)",
    "    loadConstantOrVariable(operand, scratch)",
    "    storep scratch, address",
    "    writeBarrierOnOperands(1, 3)",
    "end)",
    ".opPutByValNotContiguous:",
    "    bineq t2, ArrayStorageShape, .opPutByValSlow",
    "    biaeq t3, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.vectorLength)[t0], .opPutByValOutOfBounds",
    "    btqz ArrayStorage::m_vector[t0, t3, 8], .opPutByValArrayStorageEmpty",
    ".opPutByValArrayStorageStoreResult:",
    "    loadisFromInstruction(3, t2)",
    "    loadConstantOrVariable(t2, t1)",
    "    storeq t1, ArrayStorage::m_vector[t0, t3, 8]",
    "    writeBarrierOnOperands(1, 3)",
    "    dispatch(5)",
    ".opPutByValArrayStorageEmpty:",
    "    loadpFromInstruction(4, t1)",
    "    storeb 1, ArrayProfile::m_mayStoreToHole[t1]",
    "    addi 1, ArrayStorage::m_numValuesInVector[t0]",
    "    bib t3, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t0], .opPutByValArrayStorageStoreResult",
    "    addi 1, t3, t1",
    "    storei t1, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t0]",
    "    jmp .opPutByValArrayStorageStoreResult",
    ".opPutByValOutOfBounds:",
    "    loadpFromInstruction(4, t0)",
    "    storeb 1, ArrayProfile::m_outOfBounds[t0]",
    ".opPutByValSlow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(5)",
    "end",
    "_llint_op_put_by_val:",
    "    putByVal(_llint_slow_path_put_by_val)",
    "_llint_op_put_by_val_direct:",
    "    putByVal(_llint_slow_path_put_by_val_direct)",
    "_llint_op_jmp:",
    "    traceExecution()",
    "    dispatchIntIndirect(1)",
    "macro jumpTrueOrFalse(conditionOp, slow)",
    "    loadisFromInstruction(1, t1)",
    "    loadConstantOrVariable(t1, t0)",
    "    xorq ValueFalse, t0",
    "    btqnz t0, (-1), .slow",
    "    conditionOp(t0, .target)",
    "    dispatch(3)",
    ".target:",
    "    dispatchIntIndirect(2)",
    ".slow:",
    "    callOpcodeSlowPath(slow)",
    "    dispatch(0)",
    "end",
    "macro equalNull(cellHandler, immediateHandler)",
    "    loadisFromInstruction(1, t0)",
    "    assertNotConstant(t0)",
    "    loadq 0[cfr, t0, 8], t0",
    "    btqnz t0, tagMask, .immediate",
    "    loadStructureWithScratch(t0, t2, t1)",
    "    cellHandler(t2, JSCell::m_flags[t0], .target)",
    "    dispatch(3)",
    ".target:",
    "    dispatchIntIndirect(2)",
    ".immediate:",
    "    andq (~TagBitUndefined), t0",
    "    immediateHandler(t0, .target)",
    "    dispatch(3)",
    "end",
    "_llint_op_jeq_null:",
    "    traceExecution()",
    "    equalNull(macro (structure, value, target)",
    "    btbz value, MasqueradesAsUndefined, .notMasqueradesAsUndefined",
    "    loadp CodeBlock[cfr], t0",
    "    loadp CodeBlock::m_globalObject[t0], t0",
    "    bpeq Structure::m_globalObject[structure], t0, target",
    ".notMasqueradesAsUndefined:",
    "end, macro (value, target)",
    "    bqeq value, ValueNull, target",
    "end)",
    "_llint_op_jneq_null:",
    "    traceExecution()",
    "    equalNull(macro (structure, value, target)",
    "    btbz value, MasqueradesAsUndefined, target",
    "    loadp CodeBlock[cfr], t0",
    "    loadp CodeBlock::m_globalObject[t0], t0",
    "    bpneq Structure::m_globalObject[structure], t0, target",
    "end, macro (value, target)",
    "    bqneq value, ValueNull, target",
    "end)",
    "_llint_op_jneq_ptr:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t0)",
    "    loadisFromInstruction(2, t1)",
    "    loadp CodeBlock[cfr], t2",
    "    loadp CodeBlock::m_globalObject[t2], t2",
    "    loadp JSGlobalObject::m_specialPointers[t2, t1, 8], t1",
    "    bpneq t1, 0[cfr, t0, 8], .opJneqPtrTarget",
    "    dispatch(5)",
    ".opJneqPtrTarget:",
    "    storei 1, 32[PB, PC, 8]",
    "    dispatchIntIndirect(3)",
    "macro compare(integerCompare, doubleCompare, slowPath)",
    "    loadisFromInstruction(1, t2)",
    "    loadisFromInstruction(2, t3)",
    "    loadConstantOrVariable(t2, t0)",
    "    loadConstantOrVariable(t3, t1)",
    "    bqb t0, tagTypeNumber, .op1NotInt",
    "    bqb t1, tagTypeNumber, .op2NotInt",
    "    integerCompare(t0, t1, .jumpTarget)",
    "    dispatch(4)",
    ".op1NotInt:",
    "    btqz t0, tagTypeNumber, .slow",
    "    bqb t1, tagTypeNumber, .op1NotIntOp2NotInt",
    "    ci2d t1, ft1",
    "    jmp .op1NotIntReady",
    ".op1NotIntOp2NotInt:",
    "    btqz t1, tagTypeNumber, .slow",
    "    addq tagTypeNumber, t1",
    "    fq2d t1, ft1",
    ".op1NotIntReady:",
    "    addq tagTypeNumber, t0",
    "    fq2d t0, ft0",
    "    doubleCompare(ft0, ft1, .jumpTarget)",
    "    dispatch(4)",
    ".op2NotInt:",
    "    ci2d t0, ft0",
    "    btqz t1, tagTypeNumber, .slow",
    "    addq tagTypeNumber, t1",
    "    fq2d t1, ft1",
    "    doubleCompare(ft0, ft1, .jumpTarget)",
    "    dispatch(4)",
    ".jumpTarget:",
    "    dispatchIntIndirect(3)",
    ".slow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(0)",
    "end",
    "_llint_op_switch_imm:",
    "    traceExecution()",
    "    loadisFromInstruction(3, t2)",
    "    loadisFromInstruction(1, t3)",
    "    loadConstantOrVariable(t2, t1)",
    "    loadp CodeBlock[cfr], t2",
    "    loadp CodeBlock::m_rareData[t2], t2",
    "    muli sizeof SimpleJumpTable, t3",
    "    loadp (CodeBlock::RareData::m_switchJumpTables + VectorBufferOffset)[t2], t2",
    "    addp t3, t2",
    "    bqb t1, tagTypeNumber, .opSwitchImmNotInt",
    "    subi SimpleJumpTable::min[t2], t1",
    "    biaeq t1, (SimpleJumpTable::branchOffsets + VectorSizeOffset)[t2], .opSwitchImmFallThrough",
    "    loadp (SimpleJumpTable::branchOffsets + VectorBufferOffset)[t2], t3",
    "    loadis 0[t3, t1, 4], t1",
    "    btiz t1, .opSwitchImmFallThrough",
    "    dispatch(t1)",
    ".opSwitchImmNotInt:",
    "    btqnz t1, tagTypeNumber, .opSwitchImmSlow",
    ".opSwitchImmFallThrough:",
    "    dispatchIntIndirect(2)",
    ".opSwitchImmSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_switch_imm)",
    "    dispatch(0)",
    "_llint_op_switch_char:",
    "    traceExecution()",
    "    loadisFromInstruction(3, t2)",
    "    loadisFromInstruction(1, t3)",
    "    loadConstantOrVariable(t2, t1)",
    "    loadp CodeBlock[cfr], t2",
    "    loadp CodeBlock::m_rareData[t2], t2",
    "    muli sizeof SimpleJumpTable, t3",
    "    loadp (CodeBlock::RareData::m_switchJumpTables + VectorBufferOffset)[t2], t2",
    "    addp t3, t2",
    "    btqnz t1, tagMask, .opSwitchCharFallThrough",
    "    bbneq JSCell::m_type[t1], StringType, .opSwitchCharFallThrough",
    "    bineq JSString::m_length[t1], 1, .opSwitchCharFallThrough",
    "    loadp JSString::m_value[t1], t0",
    "    btpz t0, .opSwitchOnRope",
    "    loadp StringImpl::m_data8[t0], t1",
    "    btinz StringImpl::m_hashAndFlags[t0], HashFlags8BitBuffer, .opSwitchChar8Bit",
    "    loadh 0[t1], t0",
    "    jmp .opSwitchCharReady",
    ".opSwitchChar8Bit:",
    "    loadb 0[t1], t0",
    ".opSwitchCharReady:",
    "    subi SimpleJumpTable::min[t2], t0",
    "    biaeq t0, (SimpleJumpTable::branchOffsets + VectorSizeOffset)[t2], .opSwitchCharFallThrough",
    "    loadp (SimpleJumpTable::branchOffsets + VectorBufferOffset)[t2], t2",
    "    loadis 0[t2, t0, 4], t1",
    "    btiz t1, .opSwitchCharFallThrough",
    "    dispatch(t1)",
    ".opSwitchCharFallThrough:",
    "    dispatchIntIndirect(2)",
    ".opSwitchOnRope:",
    "    callOpcodeSlowPath(_llint_slow_path_switch_char)",
    "    dispatch(0)",
    "macro arrayProfileForCall()",
    "    loadisFromInstruction(4, t3)",
    "    negp t3",
    "    loadq ThisArgumentOffset[cfr, t3, 8], t0",
    "    btqnz t0, tagMask, .done",
    "    loadpFromInstruction((CallOpCodeSize - 2), t1)",
    "    loadi JSCell::m_structureID[t0], t3",
    "    storei t3, ArrayProfile::m_lastSeenStructureID[t1]",
    ".done:",
    "end",
    "macro doCall(slowPath, prepareCall)",
    "    loadisFromInstruction(2, t0)",
    "    loadpFromInstruction(5, t1)",
    "    loadp LLIntCallLinkInfo::callee[t1], t2",
    "    loadConstantOrVariable(t0, t3)",
    "    bqneq t3, t2, .opCallSlow",
    "    loadisFromInstruction(4, t3)",
    "    lshifti 3, t3",
    "    negp t3",
    "    addp cfr, t3",
    "    storeq t2, Callee[t3]",
    "    loadisFromInstruction(3, t2)",
    "    storei PC, (ArgumentCount + TagOffset)[cfr]",
    "    storei t2, (ArgumentCount + PayloadOffset)[t3]",
    "    move t3, sp",
    "    prepareCall(LLIntCallLinkInfo::machineCodeTarget[t1], t2, t3, t4)",
    "    callTargetFunction(LLIntCallLinkInfo::machineCodeTarget[t1])",
    ".opCallSlow:",
    "    slowPathForCall(slowPath, prepareCall)",
    "end",
    "_llint_op_ret:",
    "    traceExecution()",
    "    checkSwitchToJITForEpilogue()",
    "    loadisFromInstruction(1, t2)",
    "    loadConstantOrVariable(t2, r0)",
    "    doReturn()",
    "_llint_op_to_primitive:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t2)",
    "    loadisFromInstruction(1, t3)",
    "    loadConstantOrVariable(t2, t0)",
    "    btqnz t0, tagMask, .opToPrimitiveIsImm",
    "    bbaeq JSCell::m_type[t0], ObjectType, .opToPrimitiveSlowCase",
    ".opToPrimitiveIsImm:",
    "    storeq t0, 0[cfr, t3, 8]",
    "    dispatch(constexpr (op_to_primitive_length))",
    ".opToPrimitiveSlowCase:",
    "    callOpcodeSlowPath(_slow_path_to_primitive)",
    "    dispatch(constexpr (op_to_primitive_length))",
    "_llint_op_catch:",
    "    loadp Callee[cfr], t3",
    "    andp MarkedBlockMask, t3",
    "    loadp MarkedBlock::m_vm[t3], t3",
    "    restoreCalleeSavesFromVMEntryFrameCalleeSavesBuffer(t3, t0)",
    "    loadp VM::callFrameForCatch[t3], cfr",
    "    storep 0, VM::callFrameForCatch[t3]",
    "    restoreStackPointerAfterCall()",
    "    loadp CodeBlock[cfr], PB",
    "    loadp CodeBlock::m_instructions[PB], PB",
    "    loadp VM::targetInterpreterPCForThrow[t3], PC",
    "    subp PB, PC",
    "    rshiftp 3, PC",
    "    callOpcodeSlowPath(_llint_slow_path_check_if_exception_is_uncatchable_and_notify_profiler)",
    "    bpeq r1, 0, .isCatchableException",
    "    jmp _llint_throw_from_slow_path_trampoline",
    ".isCatchableException:",
    "    loadp Callee[cfr], t3",
    "    andp MarkedBlockMask, t3",
    "    loadp MarkedBlock::m_vm[t3], t3",
    "    loadq VM::m_exception[t3], t0",
    "    storeq 0, VM::m_exception[t3]",
    "    loadisFromInstruction(1, t2)",
    "    storeq t0, 0[cfr, t2, 8]",
    "    loadq Exception::m_value[t0], t3",
    "    loadisFromInstruction(2, t2)",
    "    storeq t3, 0[cfr, t2, 8]",
    "    traceExecution()",
    "    dispatch(constexpr (op_catch_length))",
    "_llint_op_end:",
    "    traceExecution()",
    "    checkSwitchToJITForEpilogue()",
    "    loadisFromInstruction(1, t0)",
    "    assertNotConstant(t0)",
    "    loadq 0[cfr, t0, 8], r0",
    "    doReturn()",
    "_llint_throw_from_slow_path_trampoline:",
    "    loadp Callee[cfr], t1",
    "    andp MarkedBlockMask, t1",
    "    loadp MarkedBlock::m_vm[t1], t1",
    "    copyCalleeSavesToVMEntryFrameCalleeSavesBuffer(t1, t2)",
    "    callSlowPath(_llint_slow_path_handle_exception)",
    "    loadp Callee[cfr], t1",
    "    andp MarkedBlockMask, t1",
    "    loadp MarkedBlock::m_vm[t1], t1",
    "    jmp VM::targetMachinePCForThrow[t1]",
    "_llint_throw_during_call_trampoline:",
    "    preserveReturnAddressAfterCall(t2)",
    "    jmp _llint_throw_from_slow_path_trampoline",
    "macro nativeCallTrampoline(executableOffsetToFunction)",
    "    functionPrologue()",
    "    storep 0, CodeBlock[cfr]",
    "    loadp Callee[cfr], t0",
    "    andp MarkedBlockMask, t0, t1",
    "    loadp MarkedBlock::m_vm[t1], t1",
    "    storep cfr, VM::topCallFrame[t1]",
    "if (ARM64 or C_LOOP)",
    "    storep lr, ReturnPC[cfr]",
    "else",
    "    skip",
    "end",
    "    move cfr, a0",
    "    loadp Callee[cfr], t1",
    "    loadp JSFunction::m_executable[t1], t1",
    "    checkStackPointerAlignment(t3, 3735879681)",
    "if C_LOOP",
    "    cloopCallNative executableOffsetToFunction[t1]",
    "else",
    "if X86_64_WIN",
    "    subp 32, sp",
    "else",
    "    skip",
    "end",
    "    call executableOffsetToFunction[t1]",
    "if X86_64_WIN",
    "    addp 32, sp",
    "else",
    "    skip",
    "end",
    "end",
    "    loadp Callee[cfr], t3",
    "    andp MarkedBlockMask, t3",
    "    loadp MarkedBlock::m_vm[t3], t3",
    "    btqnz VM::m_exception[t3], .handleException",
    "    functionEpilogue()",
    "    ret ",
    ".handleException:",
    "    storep cfr, VM::topCallFrame[t3]",
    "    jmp _llint_throw_from_slow_path_trampoline",
    "end",
    "macro getConstantScope(dst)",
    "    loadpFromInstruction(6, t0)",
    "    loadisFromInstruction(dst, t1)",
    "    storeq t0, 0[cfr, t1, 8]",
    "end",
    "macro varInjectionCheck(slowPath)",
    "    loadp CodeBlock[cfr], t0",
    "    loadp CodeBlock::m_globalObject[t0], t0",
    "    loadp JSGlobalObject::m_varInjectionWatchpoint[t0], t0",
    "    bbeq WatchpointSet::m_state[t0], IsInvalidated, slowPath",
    "end",
    "macro resolveScope()",
    "    loadisFromInstruction(5, t2)",
    "    loadisFromInstruction(2, t0)",
    "    loadp 0[cfr, t0, 8], t0",
    "    btiz t2, .resolveScopeLoopEnd",
    ".resolveScopeLoop:",
    "    loadp JSScope::m_next[t0], t0",
    "    subi 1, t2",
    "    btinz t2, .resolveScopeLoop",
    ".resolveScopeLoopEnd:",
    "    loadisFromInstruction(1, t1)",
    "    storeq t0, 0[cfr, t1, 8]",
    "end",
    "_llint_op_resolve_scope:",
    "    traceExecution()",
    "    loadisFromInstruction(4, t0)",
    "    bineq t0, GlobalProperty, .rGlobalVar",
    "    getConstantScope(1)",
    "    dispatch(constexpr (op_resolve_scope_length))",
    ".rGlobalVar:",
    "    bineq t0, GlobalVar, .rGlobalLexicalVar",
    "    getConstantScope(1)",
    "    dispatch(constexpr (op_resolve_scope_length))",
    ".rGlobalLexicalVar:",
    "    bineq t0, GlobalLexicalVar, .rClosureVar",
    "    getConstantScope(1)",
    "    dispatch(constexpr (op_resolve_scope_length))",
    ".rClosureVar:",
    "    bineq t0, ClosureVar, .rModuleVar",
    "    resolveScope()",
    "    dispatch(constexpr (op_resolve_scope_length))",
    ".rModuleVar:",
    "    bineq t0, ModuleVar, .rGlobalPropertyWithVarInjectionChecks",
    "    getConstantScope(1)",
    "    dispatch(constexpr (op_resolve_scope_length))",
    ".rGlobalPropertyWithVarInjectionChecks:",
    "    bineq t0, GlobalPropertyWithVarInjectionChecks, .rGlobalVarWithVarInjectionChecks",
    "    varInjectionCheck(.rDynamic)",
    "    getConstantScope(1)",
    "    dispatch(constexpr (op_resolve_scope_length))",
    ".rGlobalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalVarWithVarInjectionChecks, .rGlobalLexicalVarWithVarInjectionChecks",
    "    varInjectionCheck(.rDynamic)",
    "    getConstantScope(1)",
    "    dispatch(constexpr (op_resolve_scope_length))",
    ".rGlobalLexicalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .rClosureVarWithVarInjectionChecks",
    "    varInjectionCheck(.rDynamic)",
    "    getConstantScope(1)",
    "    dispatch(constexpr (op_resolve_scope_length))",
    ".rClosureVarWithVarInjectionChecks:",
    "    bineq t0, ClosureVarWithVarInjectionChecks, .rDynamic",
    "    varInjectionCheck(.rDynamic)",
    "    resolveScope()",
    "    dispatch(constexpr (op_resolve_scope_length))",
    ".rDynamic:",
    "    callOpcodeSlowPath(_slow_path_resolve_scope)",
    "    dispatch(constexpr (op_resolve_scope_length))",
    "macro loadWithStructureCheck(operand, slowPath)",
    "    loadisFromInstruction(operand, t0)",
    "    loadq 0[cfr, t0, 8], t0",
    "    loadStructureWithScratch(t0, t2, t1)",
    "    loadpFromInstruction(5, t1)",
    "    bpneq t2, t1, slowPath",
    "end",
    "macro getProperty()",
    "    loadisFromInstruction(6, t1)",
    "    loadPropertyAtVariableOffset(t1, t0, t2)",
    "    valueProfile(t2, 7, t0)",
    "    loadisFromInstruction(1, t0)",
    "    storeq t2, 0[cfr, t0, 8]",
    "end",
    "macro getGlobalVar(tdzCheckIfNecessary)",
    "    loadpFromInstruction(6, t0)",
    "    loadq 0[t0], t0",
    "    tdzCheckIfNecessary(t0)",
    "    valueProfile(t0, 7, t1)",
    "    loadisFromInstruction(1, t1)",
    "    storeq t0, 0[cfr, t1, 8]",
    "end",
    "macro getClosureVar()",
    "    loadisFromInstruction(6, t1)",
    "    loadq JSEnvironmentRecord_variables[t0, t1, 8], t0",
    "    valueProfile(t0, 7, t1)",
    "    loadisFromInstruction(1, t1)",
    "    storeq t0, 0[cfr, t1, 8]",
    "end",
    "_llint_op_get_from_scope:",
    "    traceExecution()",
    "    loadisFromInstruction(4, t0)",
    "    andi ResolveTypeMask, t0",
    "    bineq t0, GlobalProperty, .gGlobalVar",
    "    loadWithStructureCheck(2, .gDynamic)",
    "    getProperty()",
    "    dispatch(constexpr (op_get_from_scope_length))",
    ".gGlobalVar:",
    "    bineq t0, GlobalVar, .gGlobalLexicalVar",
    "    getGlobalVar(macro (v)",
    "",
    "end)",
    "    dispatch(constexpr (op_get_from_scope_length))",
    ".gGlobalLexicalVar:",
    "    bineq t0, GlobalLexicalVar, .gClosureVar",
    "    getGlobalVar(macro (value)",
    "    bqeq value, ValueEmpty, .gDynamic",
    "end)",
    "    dispatch(constexpr (op_get_from_scope_length))",
    ".gClosureVar:",
    "    bineq t0, ClosureVar, .gGlobalPropertyWithVarInjectionChecks",
    "    loadVariable(2, t0)",
    "    getClosureVar()",
    "    dispatch(constexpr (op_get_from_scope_length))",
    ".gGlobalPropertyWithVarInjectionChecks:",
    "    bineq t0, GlobalPropertyWithVarInjectionChecks, .gGlobalVarWithVarInjectionChecks",
    "    loadWithStructureCheck(2, .gDynamic)",
    "    getProperty()",
    "    dispatch(constexpr (op_get_from_scope_length))",
    ".gGlobalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalVarWithVarInjectionChecks, .gGlobalLexicalVarWithVarInjectionChecks",
    "    varInjectionCheck(.gDynamic)",
    "    getGlobalVar(macro (v)",
    "",
    "end)",
    "    dispatch(constexpr (op_get_from_scope_length))",
    ".gGlobalLexicalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .gClosureVarWithVarInjectionChecks",
    "    varInjectionCheck(.gDynamic)",
    "    getGlobalVar(macro (value)",
    "    bqeq value, ValueEmpty, .gDynamic",
    "end)",
    "    dispatch(constexpr (op_get_from_scope_length))",
    ".gClosureVarWithVarInjectionChecks:",
    "    bineq t0, ClosureVarWithVarInjectionChecks, .gDynamic",
    "    varInjectionCheck(.gDynamic)",
    "    loadVariable(2, t0)",
    "    getClosureVar()",
    "    dispatch(constexpr (op_get_from_scope_length))",
    ".gDynamic:",
    "    callOpcodeSlowPath(_llint_slow_path_get_from_scope)",
    "    dispatch(constexpr (op_get_from_scope_length))",
    "macro putProperty()",
    "    loadisFromInstruction(3, t1)",
    "    loadConstantOrVariable(t1, t2)",
    "    loadisFromInstruction(6, t1)",
    "    storePropertyAtVariableOffset(t1, t0, t2, t3)",
    "end",
    "macro putGlobalVariable()",
    "    loadisFromInstruction(3, t0)",
    "    loadConstantOrVariable(t0, t1)",
    "    loadpFromInstruction(5, t2)",
    "    loadpFromInstruction(6, t0)",
    "    notifyWrite(t2, .pDynamic)",
    "    storeq t1, 0[t0]",
    "end",
    "macro putClosureVar()",
    "    loadisFromInstruction(3, t1)",
    "    loadConstantOrVariable(t1, t2)",
    "    loadisFromInstruction(6, t1)",
    "    storeq t2, JSEnvironmentRecord_variables[t0, t1, 8]",
    "end",
    "macro putLocalClosureVar()",
    "    loadisFromInstruction(3, t1)",
    "    loadConstantOrVariable(t1, t2)",
    "    loadpFromInstruction(5, t3)",
    "    btpz t3, .noVariableWatchpointSet",
    "    notifyWrite(t3, .pDynamic)",
    ".noVariableWatchpointSet:",
    "    loadisFromInstruction(6, t1)",
    "    storeq t2, JSEnvironmentRecord_variables[t0, t1, 8]",
    "end",
    "macro checkTDZInGlobalPutToScopeIfNecessary()",
    "    loadisFromInstruction(4, t0)",
    "    andi InitializationModeMask, t0",
    "    rshifti InitializationModeShift, t0",
    "    bineq t0, NotInitialization, .noNeedForTDZCheck",
    "    loadpFromInstruction(6, t0)",
    "    loadq 0[t0], t0",
    "    bqeq t0, ValueEmpty, .pDynamic",
    ".noNeedForTDZCheck:",
    "end",
    "_llint_op_put_to_scope:",
    "    traceExecution()",
    "    loadisFromInstruction(4, t0)",
    "    andi ResolveTypeMask, t0",
    "    bineq t0, LocalClosureVar, .pGlobalProperty",
    "    loadVariable(1, t0)",
    "    putLocalClosureVar()",
    "    writeBarrierOnOperands(1, 3)",
    "    dispatch(constexpr (op_put_to_scope_length))",
    ".pGlobalProperty:",
    "    bineq t0, GlobalProperty, .pGlobalVar",
    "    loadWithStructureCheck(1, .pDynamic)",
    "    putProperty()",
    "    writeBarrierOnOperands(1, 3)",
    "    dispatch(constexpr (op_put_to_scope_length))",
    ".pGlobalVar:",
    "    bineq t0, GlobalVar, .pGlobalLexicalVar",
    "    writeBarrierOnGlobalObject(3)",
    "    putGlobalVariable()",
    "    dispatch(constexpr (op_put_to_scope_length))",
    ".pGlobalLexicalVar:",
    "    bineq t0, GlobalLexicalVar, .pClosureVar",
    "    writeBarrierOnGlobalLexicalEnvironment(3)",
    "    checkTDZInGlobalPutToScopeIfNecessary()",
    "    putGlobalVariable()",
    "    dispatch(constexpr (op_put_to_scope_length))",
    ".pClosureVar:",
    "    bineq t0, ClosureVar, .pGlobalPropertyWithVarInjectionChecks",
    "    loadVariable(1, t0)",
    "    putClosureVar()",
    "    writeBarrierOnOperands(1, 3)",
    "    dispatch(constexpr (op_put_to_scope_length))",
    ".pGlobalPropertyWithVarInjectionChecks:",
    "    bineq t0, GlobalPropertyWithVarInjectionChecks, .pGlobalVarWithVarInjectionChecks",
    "    loadWithStructureCheck(1, .pDynamic)",
    "    putProperty()",
    "    writeBarrierOnOperands(1, 3)",
    "    dispatch(constexpr (op_put_to_scope_length))",
    ".pGlobalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalVarWithVarInjectionChecks, .pGlobalLexicalVarWithVarInjectionChecks",
    "    writeBarrierOnGlobalObject(3)",
    "    varInjectionCheck(.pDynamic)",
    "    putGlobalVariable()",
    "    dispatch(constexpr (op_put_to_scope_length))",
    ".pGlobalLexicalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .pClosureVarWithVarInjectionChecks",
    "    writeBarrierOnGlobalLexicalEnvironment(3)",
    "    varInjectionCheck(.pDynamic)",
    "    checkTDZInGlobalPutToScopeIfNecessary()",
    "    putGlobalVariable()",
    "    dispatch(constexpr (op_put_to_scope_length))",
    ".pClosureVarWithVarInjectionChecks:",
    "    bineq t0, ClosureVarWithVarInjectionChecks, .pModuleVar",
    "    varInjectionCheck(.pDynamic)",
    "    loadVariable(1, t0)",
    "    putClosureVar()",
    "    writeBarrierOnOperands(1, 3)",
    "    dispatch(constexpr (op_put_to_scope_length))",
    ".pModuleVar:",
    "    bineq t0, ModuleVar, .pDynamic",
    "    callOpcodeSlowPath(_slow_path_throw_strict_mode_readonly_property_write_error)",
    "    dispatch(constexpr (op_put_to_scope_length))",
    ".pDynamic:",
    "    callOpcodeSlowPath(_llint_slow_path_put_to_scope)",
    "    dispatch(constexpr (op_put_to_scope_length))",
    "_llint_op_get_from_arguments:",
    "    traceExecution()",
    "    loadVariable(2, t0)",
    "    loadi 24[PB, PC, 8], t1",
    "    loadq DirectArguments_storage[t0, t1, 8], t0",
    "    valueProfile(t0, 4, t1)",
    "    loadisFromInstruction(1, t1)",
    "    storeq t0, 0[cfr, t1, 8]",
    "    dispatch(constexpr (op_get_from_arguments_length))",
    "_llint_op_put_to_arguments:",
    "    traceExecution()",
    "    loadVariable(1, t0)",
    "    loadi 16[PB, PC, 8], t1",
    "    loadisFromInstruction(3, t3)",
    "    loadConstantOrVariable(t3, t2)",
    "    storeq t2, DirectArguments_storage[t0, t1, 8]",
    "    writeBarrierOnOperands(1, 3)",
    "    dispatch(constexpr (op_put_to_arguments_length))",
    "_llint_op_get_parent_scope:",
    "    traceExecution()",
    "    loadVariable(2, t0)",
    "    loadp JSScope::m_next[t0], t0",
    "    loadisFromInstruction(1, t1)",
    "    storeq t0, 0[cfr, t1, 8]",
    "    dispatch(constexpr (op_get_parent_scope_length))",
    "_llint_op_profile_type:",
    "    traceExecution()",
    "    loadp CodeBlock[cfr], t1",
    "    loadp CodeBlock::m_vm[t1], t1",
    "    loadp VM::m_typeProfilerLog[t1], t1",
    "    loadp TypeProfilerLog::m_currentLogEntryPtr[t1], t2",
    "    loadisFromInstruction(1, t3)",
    "    loadConstantOrVariable(t3, t0)",
    "    bqeq t0, ValueEmpty, .opProfileTypeDone",
    "    storeq t0, TypeProfilerLog::LogEntry::value[t2]",
    "    loadpFromInstruction(2, t3)",
    "    storep t3, TypeProfilerLog::LogEntry::location[t2]",
    "    btqz t0, tagMask, .opProfileTypeIsCell",
    "    storei 0, TypeProfilerLog::LogEntry::structureID[t2]",
    "    jmp .opProfileTypeSkipIsCell",
    ".opProfileTypeIsCell:",
    "    loadi JSCell::m_structureID[t0], t3",
    "    storei t3, TypeProfilerLog::LogEntry::structureID[t2]",
    ".opProfileTypeSkipIsCell:",
    "    addp sizeof TypeProfilerLog::LogEntry, t2",
    "    storep t2, TypeProfilerLog::m_currentLogEntryPtr[t1]",
    "    loadp TypeProfilerLog::m_logEndPtr[t1], t1",
    "    bpneq t2, t1, .opProfileTypeDone",
    "    callOpcodeSlowPath(_slow_path_profile_type_clear_log)",
    ".opProfileTypeDone:",
    "    dispatch(constexpr (op_profile_type_length))",
    "_llint_op_profile_control_flow:",
    "    traceExecution()",
    "    loadpFromInstruction(1, t0)",
    "    addq 1, BasicBlockLocation::m_executionCount[t0]",
    "    dispatch(constexpr (op_profile_control_flow_length))",
    "_llint_op_get_rest_length:",
    "    traceExecution()",
    "    loadi (PayloadOffset + ArgumentCount)[cfr], t0",
    "    subi 1, t0",
    "    loadisFromInstruction(2, t1)",
    "    bilteq t0, t1, .storeZero",
    "    subi t1, t0",
    "    jmp .boxUp",
    ".storeZero:",
    "    move 0, t0",
    ".boxUp:",
    "    orq tagTypeNumber, t0",
    "    loadisFromInstruction(1, t1)",
    "    storeq t0, 0[cfr, t1, 8]",
    "    dispatch(constexpr (op_get_rest_length_length))",
    "_llint_op_log_shadow_chicken_prologue:",
    "    traceExecution()",
    "    acquireShadowChickenPacket(.opLogShadowChickenPrologueSlow)",
    "    storep cfr, ShadowChicken::Packet::frame[t0]",
    "    loadp CallerFrame[cfr], t1",
    "    storep t1, ShadowChicken::Packet::callerFrame[t0]",
    "    loadp Callee[cfr], t1",
    "    storep t1, ShadowChicken::Packet::callee[t0]",
    "    loadVariable(1, t1)",
    "    storep t1, ShadowChicken::Packet::scope[t0]",
    "    dispatch(constexpr (op_log_shadow_chicken_prologue_length))",
    ".opLogShadowChickenPrologueSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_log_shadow_chicken_prologue)",
    "    dispatch(constexpr (op_log_shadow_chicken_prologue_length))",
    "_llint_op_log_shadow_chicken_tail:",
    "    traceExecution()",
    "    acquireShadowChickenPacket(.opLogShadowChickenTailSlow)",
    "    storep cfr, ShadowChicken::Packet::frame[t0]",
    "    storep ShadowChickenTailMarker, ShadowChicken::Packet::callee[t0]",
    "    loadVariable(1, t1)",
    "    storep t1, ShadowChicken::Packet::thisValue[t0]",
    "    loadVariable(2, t1)",
    "    storep t1, ShadowChicken::Packet::scope[t0]",
    "    loadp CodeBlock[cfr], t1",
    "    storep t1, ShadowChicken::Packet::codeBlock[t0]",
    "    storei PC, ShadowChicken::Packet::callSiteIndex[t0]",
    "    dispatch(constexpr (op_log_shadow_chicken_tail_length))",
    ".opLogShadowChickenTailSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_log_shadow_chicken_tail)",
    "    dispatch(constexpr (op_log_shadow_chicken_tail_length))",
    "else",
    "macro dispatch(advance)",
    "    addp (advance * 4), PC",
    "    jmp 0[PC]",
    "end",
    "macro dispatchBranchWithOffset(pcOffset)",
    "    lshifti 2, pcOffset",
    "    addp pcOffset, PC",
    "    jmp 0[PC]",
    "end",
    "macro dispatchBranch(pcOffset)",
    "    loadi pcOffset, t0",
    "    dispatchBranchWithOffset(t0)",
    "end",
    "macro dispatchAfterCall()",
    "    loadi (ArgumentCount + TagOffset)[cfr], PC",
    "    loadi 4[PC], t3",
    "    storei r1, TagOffset[cfr, t3, 8]",
    "    storei r0, PayloadOffset[cfr, t3, 8]",
    "    valueProfile(r1, r0, (4 * (CallOpCodeSize - 1)), t3)",
    "    dispatch(CallOpCodeSize)",
    "end",
    "macro cCall2(function)",
    "if (((ARM or ARMv7) or ARMv7_TRADITIONAL) or MIPS)",
    "    call function",
    "else",
    "if (X86 or X86_WIN)",
    "    subp 8, sp",
    "    push a1",
    "    push a0",
    "    call function",
    "    addp 16, sp",
    "else",
    "if C_LOOP",
    "    cloopCallSlowPath function, a0, a1",
    "else",
    "    error",
    "end",
    "end",
    "end",
    "end",
    "macro cCall2Void(function)",
    "if C_LOOP",
    "    cloopCallSlowPathVoid function, a0, a1",
    "else",
    "    cCall2(function)",
    "end",
    "end",
    "macro cCall4(function)",
    "if (((ARM or ARMv7) or ARMv7_TRADITIONAL) or MIPS)",
    "    call function",
    "else",
    "if (X86 or X86_WIN)",
    "    push a3",
    "    push a2",
    "    push a1",
    "    push a0",
    "    call function",
    "    addp 16, sp",
    "else",
    "if C_LOOP",
    "    error",
    "else",
    "    error",
    "end",
    "end",
    "end",
    "end",
    "macro callSlowPath(slowPath)",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(slowPath)",
    "    move r0, PC",
    "end",
    "macro doVMEntry(makeCall)",
    "    functionPrologue()",
    "    pushCalleeSaves()",
    "if (X86 or X86_WIN)",
    "    loadp 16[cfr], a2",
    "    loadp 12[cfr], a1",
    "    loadp 8[cfr], a0",
    "else",
    "    skip",
    "end",
    "const entry = a0",
    "const vm = a1",
    "const protoCallFrame = a2",
    "if ARMv7",
    "    vmEntryRecord(cfr, t3)",
    "    move t3, sp",
    "else",
    "    vmEntryRecord(cfr, sp)",
    "end",
    "    storep vm, VMEntryRecord::m_vm[sp]",
    "    loadp VM::topCallFrame[vm], t4",
    "    storep t4, VMEntryRecord::m_prevTopCallFrame[sp]",
    "    loadp VM::topVMEntryFrame[vm], t4",
    "    storep t4, VMEntryRecord::m_prevTopVMEntryFrame[sp]",
    "if (X86_WIN or MIPS)",
    "    addp (CallFrameAlignSlots * SlotSize), sp, t3",
    "    andp (~StackAlignmentMask), t3",
    "    subp t3, (CallFrameAlignSlots * SlotSize), sp",
    "else",
    "if ((ARM or ARMv7) or ARMv7_TRADITIONAL)",
    "    addp (CallFrameAlignSlots * SlotSize), sp, t3",
    "    clrbp t3, StackAlignmentMask, t3",
    "if ARMv7",
    "    subp t3, (CallFrameAlignSlots * SlotSize), t3",
    "    move t3, sp",
    "else",
    "    subp t3, (CallFrameAlignSlots * SlotSize), sp",
    "end",
    "else",
    "    skip",
    "end",
    "end",
    "    loadi ProtoCallFrame::paddedArgCount[protoCallFrame], t4",
    "    addp CallFrameHeaderSlots, t4, t4",
    "    lshiftp 3, t4",
    "    subp sp, t4, t3",
    "    bpa t3, sp, .throwStackOverflow",
    "if C_LOOP",
    "    bpaeq t3, VM::m_cloopStackLimit[vm], .stackHeightOK",
    "else",
    "    bpaeq t3, VM::m_softStackLimit[vm], .stackHeightOK",
    "end",
    "if C_LOOP",
    "    move entry, t4",
    "    move vm, t5",
    "    cloopCallSlowPath _llint_stack_check_at_vm_entry, vm, t3",
    "    bpeq t0, 0, .stackCheckFailed",
    "    move t4, entry",
    "    move t5, vm",
    "    jmp .stackHeightOK",
    ".stackCheckFailed:",
    "    move t4, entry",
    "    move t5, vm",
    "else",
    "    skip",
    "end",
    ".throwStackOverflow:",
    "    subp 8, sp",
    "    move vm, a0",
    "    move protoCallFrame, a1",
    "    cCall2(_llint_throw_stack_overflow_error)",
    "if ARMv7",
    "    vmEntryRecord(cfr, t3)",
    "    move t3, sp",
    "else",
    "    vmEntryRecord(cfr, sp)",
    "end",
    "    loadp VMEntryRecord::m_vm[sp], t5",
    "    loadp VMEntryRecord::m_prevTopCallFrame[sp], t4",
    "    storep t4, VM::topCallFrame[t5]",
    "    loadp VMEntryRecord::m_prevTopVMEntryFrame[sp], t4",
    "    storep t4, VM::topVMEntryFrame[t5]",
    "if ARMv7",
    "    subp cfr, CalleeRegisterSaveSize, t5",
    "    move t5, sp",
    "else",
    "    subp cfr, CalleeRegisterSaveSize, sp",
    "end",
    "    popCalleeSaves()",
    "    functionEpilogue()",
    "    ret ",
    ".stackHeightOK:",
    "    move t3, sp",
    "    move 4, t3",
    ".copyHeaderLoop:",
    "    subi 1, t3",
    "    loadi TagOffset[protoCallFrame, t3, 8], t5",
    "    storei t5, (TagOffset + CodeBlock)[sp, t3, 8]",
    "    loadi PayloadOffset[protoCallFrame, t3, 8], t5",
    "    storei t5, (PayloadOffset + CodeBlock)[sp, t3, 8]",
    "    btinz t3, .copyHeaderLoop",
    "    loadi (PayloadOffset + ProtoCallFrame::argCountAndCodeOriginValue)[protoCallFrame], t4",
    "    subi 1, t4",
    "    loadi ProtoCallFrame::paddedArgCount[protoCallFrame], t5",
    "    subi 1, t5",
    "    bieq t4, t5, .copyArgs",
    ".fillExtraArgsLoop:",
    "    subi 1, t5",
    "    storei UndefinedTag, ((ThisArgumentOffset + 8) + TagOffset)[sp, t5, 8]",
    "    storei 0, ((ThisArgumentOffset + 8) + PayloadOffset)[sp, t5, 8]",
    "    bineq t4, t5, .fillExtraArgsLoop",
    ".copyArgs:",
    "    loadp ProtoCallFrame::args[protoCallFrame], t3",
    ".copyArgsLoop:",
    "    btiz t4, .copyArgsDone",
    "    subi 1, t4",
    "    loadi TagOffset[t3, t4, 8], t5",
    "    storei t5, ((ThisArgumentOffset + 8) + TagOffset)[sp, t4, 8]",
    "    loadi PayloadOffset[t3, t4, 8], t5",
    "    storei t5, ((ThisArgumentOffset + 8) + PayloadOffset)[sp, t4, 8]",
    "    jmp .copyArgsLoop",
    ".copyArgsDone:",
    "    storep sp, VM::topCallFrame[vm]",
    "    storep cfr, VM::topVMEntryFrame[vm]",
    "    makeCall(entry, t3, t4)",
    "if ARMv7",
    "    vmEntryRecord(cfr, t3)",
    "    move t3, sp",
    "else",
    "    vmEntryRecord(cfr, sp)",
    "end",
    "    loadp VMEntryRecord::m_vm[sp], t5",
    "    loadp VMEntryRecord::m_prevTopCallFrame[sp], t4",
    "    storep t4, VM::topCallFrame[t5]",
    "    loadp VMEntryRecord::m_prevTopVMEntryFrame[sp], t4",
    "    storep t4, VM::topVMEntryFrame[t5]",
    "if ARMv7",
    "    subp cfr, CalleeRegisterSaveSize, t5",
    "    move t5, sp",
    "else",
    "    subp cfr, CalleeRegisterSaveSize, sp",
    "end",
    "    popCalleeSaves()",
    "    functionEpilogue()",
    "    ret ",
    "end",
    "macro makeJavaScriptCall(entry, temp, unused)",
    "    addp CallerFrameAndPCSize, sp",
    "    checkStackPointerAlignment(temp, 3134249986)",
    "if C_LOOP",
    "    cloopCallJSFunction entry",
    "else",
    "    call entry",
    "end",
    "    checkStackPointerAlignment(temp, 3134249987)",
    "    subp CallerFrameAndPCSize, sp",
    "end",
    "macro makeHostFunctionCall(entry, temp1, temp2)",
    "    move entry, temp1",
    "    storep cfr, 0[sp]",
    "if C_LOOP",
    "    move sp, a0",
    "    storep lr, PtrSize[sp]",
    "    cloopCallNative temp1",
    "else",
    "if (X86 or X86_WIN)",
    "    move 0, temp2",
    "    move temp2, 4[sp]",
    "    move sp, a0",
    "    push temp2",
    "    push a0",
    "    call temp1",
    "    addp 8, sp",
    "else",
    "    move sp, a0",
    "    call temp1",
    "end",
    "end",
    "end",
    "_handleUncaughtException:",
    "    loadp (Callee + PayloadOffset)[cfr], t3",
    "    andp MarkedBlockMask, t3",
    "    loadp MarkedBlock::m_vm[t3], t3",
    "    restoreCalleeSavesFromVMEntryFrameCalleeSavesBuffer(t3, t0)",
    "    loadp VM::callFrameForCatch[t3], cfr",
    "    storep 0, VM::callFrameForCatch[t3]",
    "    loadp CallerFrame[cfr], cfr",
    "if ARMv7",
    "    vmEntryRecord(cfr, t3)",
    "    move t3, sp",
    "else",
    "    vmEntryRecord(cfr, sp)",
    "end",
    "    loadp VMEntryRecord::m_vm[sp], t3",
    "    loadp VMEntryRecord::m_prevTopCallFrame[sp], t5",
    "    storep t5, VM::topCallFrame[t3]",
    "    loadp VMEntryRecord::m_prevTopVMEntryFrame[sp], t5",
    "    storep t5, VM::topVMEntryFrame[t3]",
    "if ARMv7",
    "    subp cfr, CalleeRegisterSaveSize, t3",
    "    move t3, sp",
    "else",
    "    subp cfr, CalleeRegisterSaveSize, sp",
    "end",
    "    popCalleeSaves()",
    "    functionEpilogue()",
    "    ret ",
    "macro doReturnFromHostFunction(extraStackSpace)",
    "    functionEpilogue(extraStackSpace)",
    "    ret ",
    "end",
    "macro traceOperand(fromWhere, operand)",
    "    move fromWhere, a2",
    "    move operand, a3",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall4(_llint_trace_operand)",
    "    move r0, PC",
    "    move r1, cfr",
    "end",
    "macro traceValue(fromWhere, operand)",
    "    move fromWhere, a2",
    "    move operand, a3",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall4(_llint_trace_value)",
    "    move r0, PC",
    "    move r1, cfr",
    "end",
    "macro callCallSlowPath(slowPath, action)",
    "    storep PC, (ArgumentCount + TagOffset)[cfr]",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(slowPath)",
    "    action(r0, r1)",
    "end",
    "macro callTrapHandler(throwHandler)",
    "    storei PC, (ArgumentCount + TagOffset)[cfr]",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(_llint_slow_path_handle_traps)",
    "    btpnz r0, throwHandler",
    "    loadi (ArgumentCount + TagOffset)[cfr], PC",
    "end",
    "macro checkSwitchToJITForLoop()",
    "    checkSwitchToJIT(1, macro ()",
    "    storei PC, (ArgumentCount + TagOffset)[cfr]",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(_llint_loop_osr)",
    "    btpz r0, .recover",
    "    move r1, sp",
    "    jmp r0",
    ".recover:",
    "    loadi (ArgumentCount + TagOffset)[cfr], PC",
    "end)",
    "end",
    "macro loadVariable(operand, index, tag, payload)",
    "    loadisFromInstruction(operand, index)",
    "    loadi TagOffset[cfr, index, 8], tag",
    "    loadi PayloadOffset[cfr, index, 8], payload",
    "end",
    "macro loadConstantOrVariable(index, tag, payload)",
    "    bigteq index, FirstConstantRegisterIndex, .constant",
    "    loadi TagOffset[cfr, index, 8], tag",
    "    loadi PayloadOffset[cfr, index, 8], payload",
    "    jmp .done",
    ".constant:",
    "    loadp CodeBlock[cfr], payload",
    "    loadp (CodeBlock::m_constantRegisters + VectorBufferOffset)[payload], payload",
    "    loadp TagOffset[payload, index, 8], tag",
    "    loadp PayloadOffset[payload, index, 8], payload",
    ".done:",
    "end",
    "macro loadConstantOrVariableTag(index, tag)",
    "    bigteq index, FirstConstantRegisterIndex, .constant",
    "    loadi TagOffset[cfr, index, 8], tag",
    "    jmp .done",
    ".constant:",
    "    loadp CodeBlock[cfr], tag",
    "    loadp (CodeBlock::m_constantRegisters + VectorBufferOffset)[tag], tag",
    "    loadp TagOffset[tag, index, 8], tag",
    ".done:",
    "end",
    "macro loadConstantOrVariable2Reg(index, tag, payload)",
    "    bigteq index, FirstConstantRegisterIndex, .constant",
    "    loadi TagOffset[cfr, index, 8], tag",
    "    loadi PayloadOffset[cfr, index, 8], payload",
    "    jmp .done",
    ".constant:",
    "    loadp CodeBlock[cfr], tag",
    "    loadp (CodeBlock::m_constantRegisters + VectorBufferOffset)[tag], tag",
    "    lshifti 3, index",
    "    addp index, tag",
    "    loadp PayloadOffset[tag], payload",
    "    loadp TagOffset[tag], tag",
    ".done:",
    "end",
    "macro loadConstantOrVariablePayloadTagCustom(index, tagCheck, payload)",
    "    bigteq index, FirstConstantRegisterIndex, .constant",
    "    tagCheck(TagOffset[cfr, index, 8])",
    "    loadi PayloadOffset[cfr, index, 8], payload",
    "    jmp .done",
    ".constant:",
    "    loadp CodeBlock[cfr], payload",
    "    loadp (CodeBlock::m_constantRegisters + VectorBufferOffset)[payload], payload",
    "    tagCheck(TagOffset[payload, index, 8])",
    "    loadp PayloadOffset[payload, index, 8], payload",
    ".done:",
    "end",
    "macro loadConstantOrVariablePayload(index, expectedTag, payload, slow)",
    "    loadConstantOrVariablePayloadTagCustom(index, macro (actualTag)",
    "    bineq actualTag, expectedTag, slow",
    "end, payload)",
    "end",
    "macro loadConstantOrVariablePayloadUnchecked(index, payload)",
    "    loadConstantOrVariablePayloadTagCustom(index, macro (actualTag)",
    "",
    "end, payload)",
    "end",
    "macro writeBarrierOnOperand(cellOperand)",
    "    loadisFromInstruction(cellOperand, t1)",
    "    loadConstantOrVariablePayload(t1, CellTag, t2, .writeBarrierDone)",
    "    skipIfIsRememberedOrInEden(t2, macro ()",
    "    push cfr, PC",
    "    subp 8, sp",
    "    move t2, a1",
    "    move cfr, a0",
    "    cCall2Void(_llint_write_barrier_slow)",
    "    addp 8, sp",
    "    pop PC, cfr",
    "end)",
    ".writeBarrierDone:",
    "end",
    "macro writeBarrierOnOperands(cellOperand, valueOperand)",
    "    loadisFromInstruction(valueOperand, t1)",
    "    loadConstantOrVariableTag(t1, t0)",
    "    bineq t0, CellTag, .writeBarrierDone",
    "    writeBarrierOnOperand(cellOperand)",
    ".writeBarrierDone:",
    "end",
    "macro writeBarrierOnGlobal(valueOperand, loadHelper)",
    "    loadisFromInstruction(valueOperand, t1)",
    "    loadConstantOrVariableTag(t1, t0)",
    "    bineq t0, CellTag, .writeBarrierDone",
    "    loadHelper(t3)",
    "    skipIfIsRememberedOrInEden(t3, macro ()",
    "    push cfr, PC",
    "    subp 8, sp",
    "    move cfr, a0",
    "    move t3, a1",
    "    cCall2Void(_llint_write_barrier_slow)",
    "    addp 8, sp",
    "    pop PC, cfr",
    "end)",
    ".writeBarrierDone:",
    "end",
    "macro writeBarrierOnGlobalObject(valueOperand)",
    "    writeBarrierOnGlobal(valueOperand, macro (registerToStoreGlobal)",
    "    loadp CodeBlock[cfr], registerToStoreGlobal",
    "    loadp CodeBlock::m_globalObject[registerToStoreGlobal], registerToStoreGlobal",
    "end)",
    "end",
    "macro writeBarrierOnGlobalLexicalEnvironment(valueOperand)",
    "    writeBarrierOnGlobal(valueOperand, macro (registerToStoreGlobal)",
    "    loadp CodeBlock[cfr], registerToStoreGlobal",
    "    loadp CodeBlock::m_globalObject[registerToStoreGlobal], registerToStoreGlobal",
    "    loadp JSGlobalObject::m_globalLexicalEnvironment[registerToStoreGlobal], registerToStoreGlobal",
    "end)",
    "end",
    "macro valueProfile(tag, payload, operand, scratch)",
    "    loadp operand[PC], scratch",
    "    storei tag, (ValueProfile::m_buckets + TagOffset)[scratch]",
    "    storei payload, (ValueProfile::m_buckets + PayloadOffset)[scratch]",
    "end",
    "macro functionArityCheck(doneLabel, slowPath)",
    "    loadi (PayloadOffset + ArgumentCount)[cfr], t0",
    "    biaeq t0, CodeBlock::m_numParameters[t1], doneLabel",
    "    move cfr, a0",
    "    move PC, a1",
    "    cCall2(slowPath)",
    "    btiz r0, .noError",
    "    move r1, cfr",
    "    jmp _llint_throw_from_slow_path_trampoline",
    ".noError:",
    "    loadp CommonSlowPaths::ArityCheckData::thunkToCall[r1], t3",
    "    btpz t3, .proceedInline",
    "    loadp CommonSlowPaths::ArityCheckData::paddedStackSpace[r1], a0",
    "    call t3",
    "if ASSERT_ENABLED",
    "    loadp ReturnPC[cfr], t0",
    "    loadp 0[t0], t0",
    "else",
    "    skip",
    "end",
    "    jmp .continue",
    ".proceedInline:",
    "    loadi CommonSlowPaths::ArityCheckData::paddedStackSpace[r1], t1",
    "    btiz t1, .continue",
    "    loadi (PayloadOffset + ArgumentCount)[cfr], t2",
    "    addi CallFrameHeaderSlots, t2",
    "    move t1, t3",
    "    andi (StackAlignmentSlots - 1), t3",
    "    btiz t3, .noExtraSlot",
    ".fillExtraSlots:",
    "    move 0, t0",
    "    storei t0, PayloadOffset[cfr, t2, 8]",
    "    move UndefinedTag, t0",
    "    storei t0, TagOffset[cfr, t2, 8]",
    "    addi 1, t2",
    "    bsubinz 1, t3, .fillExtraSlots",
    "    andi (~(StackAlignmentSlots - 1)), t1",
    "    btiz t1, .continue",
    ".noExtraSlot:",
    "    negi t1",
    "    move cfr, t3",
    "    move t1, t0",
    "    lshiftp 3, t0",
    "    addp t0, cfr",
    "    addp t0, sp",
    ".copyLoop:",
    "    loadi PayloadOffset[t3], t0",
    "    storei t0, PayloadOffset[t3, t1, 8]",
    "    loadi TagOffset[t3], t0",
    "    storei t0, TagOffset[t3, t1, 8]",
    "    addp 8, t3",
    "    bsubinz 1, t2, .copyLoop",
    "    move t1, t2",
    ".fillLoop:",
    "    move 0, t0",
    "    storei t0, PayloadOffset[t3, t1, 8]",
    "    move UndefinedTag, t0",
    "    storei t0, TagOffset[t3, t1, 8]",
    "    addp 8, t3",
    "    baddinz 1, t2, .fillLoop",
    ".continue:",
    "    loadp CodeBlock[cfr], t1",
    "    loadp CodeBlock::m_instructions[t1], PC",
    "    jmp doneLabel",
    "end",
    "macro branchIfException(label)",
    "    loadp (Callee + PayloadOffset)[cfr], t3",
    "    andp MarkedBlockMask, t3",
    "    loadp MarkedBlock::m_vm[t3], t3",
    "    btiz VM::m_exception[t3], .noException",
    "    jmp label",
    ".noException:",
    "end",
    "_llint_op_enter:",
    "    traceExecution()",
    "    checkStackPointerAlignment(t2, 3735879905)",
    "    loadp CodeBlock[cfr], t2",
    "    loadi CodeBlock::m_numVars[t2], t2",
    "    btiz t2, .opEnterDone",
    "    move UndefinedTag, t0",
    "    move 0, t1",
    "    negi t2",
    ".opEnterLoop:",
    "    storei t0, TagOffset[cfr, t2, 8]",
    "    storei t1, PayloadOffset[cfr, t2, 8]",
    "    addi 1, t2",
    "    btinz t2, .opEnterLoop",
    ".opEnterDone:",
    "    callOpcodeSlowPath(_slow_path_enter)",
    "    dispatch(constexpr (op_enter_length))",
    "_llint_op_get_argument:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t1)",
    "    loadisFromInstruction(2, t2)",
    "    loadi (PayloadOffset + ArgumentCount)[cfr], t0",
    "    bilteq t0, t2, .opGetArgumentOutOfBounds",
    "    loadi (ThisArgumentOffset + TagOffset)[cfr, t2, 8], t0",
    "    loadi (ThisArgumentOffset + PayloadOffset)[cfr, t2, 8], t3",
    "    storei t0, TagOffset[cfr, t1, 8]",
    "    storei t3, PayloadOffset[cfr, t1, 8]",
    "    valueProfile(t0, t3, 12, t1)",
    "    dispatch(constexpr (op_get_argument_length))",
    ".opGetArgumentOutOfBounds:",
    "    storei UndefinedTag, TagOffset[cfr, t1, 8]",
    "    storei 0, PayloadOffset[cfr, t1, 8]",
    "    valueProfile(UndefinedTag, 0, 12, t1)",
    "    dispatch(constexpr (op_get_argument_length))",
    "_llint_op_argument_count:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t2)",
    "    loadi (PayloadOffset + ArgumentCount)[cfr], t0",
    "    subi 1, t0",
    "    move Int32Tag, t1",
    "    storei t1, TagOffset[cfr, t2, 8]",
    "    storei t0, PayloadOffset[cfr, t2, 8]",
    "    dispatch(constexpr (op_argument_count_length))",
    "_llint_op_get_scope:",
    "    traceExecution()",
    "    loadi (Callee + PayloadOffset)[cfr], t0",
    "    loadi JSCallee::m_scope[t0], t0",
    "    loadisFromInstruction(1, t1)",
    "    storei CellTag, TagOffset[cfr, t1, 8]",
    "    storei t0, PayloadOffset[cfr, t1, 8]",
    "    dispatch(constexpr (op_get_scope_length))",
    "_llint_op_to_this:",
    "    traceExecution()",
    "    loadi 4[PC], t0",
    "    bineq TagOffset[cfr, t0, 8], CellTag, .opToThisSlow",
    "    loadi PayloadOffset[cfr, t0, 8], t0",
    "    bbneq JSCell::m_type[t0], FinalObjectType, .opToThisSlow",
    "    loadpFromInstruction(2, t2)",
    "    bpneq JSCell::m_structureID[t0], t2, .opToThisSlow",
    "    dispatch(constexpr (op_to_this_length))",
    ".opToThisSlow:",
    "    callOpcodeSlowPath(_slow_path_to_this)",
    "    dispatch(constexpr (op_to_this_length))",
    "_llint_op_check_tdz:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t0)",
    "    loadConstantOrVariableTag(t0, t1)",
    "    bineq t1, EmptyValueTag, .opNotTDZ",
    "    callOpcodeSlowPath(_slow_path_throw_tdz_error)",
    ".opNotTDZ:",
    "    dispatch(constexpr (op_check_tdz_length))",
    "_llint_op_mov:",
    "    traceExecution()",
    "    loadi 8[PC], t1",
    "    loadi 4[PC], t0",
    "    loadConstantOrVariable(t1, t2, t3)",
    "    storei t2, TagOffset[cfr, t0, 8]",
    "    storei t3, PayloadOffset[cfr, t0, 8]",
    "    dispatch(constexpr (op_mov_length))",
    "_llint_op_not:",
    "    traceExecution()",
    "    loadi 8[PC], t0",
    "    loadi 4[PC], t1",
    "    loadConstantOrVariable(t0, t2, t3)",
    "    bineq t2, BooleanTag, .opNotSlow",
    "    xori 1, t3",
    "    storei t2, TagOffset[cfr, t1, 8]",
    "    storei t3, PayloadOffset[cfr, t1, 8]",
    "    dispatch(constexpr (op_not_length))",
    ".opNotSlow:",
    "    callOpcodeSlowPath(_slow_path_not)",
    "    dispatch(constexpr (op_not_length))",
    "_llint_op_eq:",
    "    traceExecution()",
    "    loadi 12[PC], t2",
    "    loadi 8[PC], t0",
    "    loadConstantOrVariable(t2, t3, t1)",
    "    loadConstantOrVariable2Reg(t0, t2, t0)",
    "    bineq t2, t3, .opEqSlow",
    "    bieq t2, CellTag, .opEqSlow",
    "    bib t2, LowestTag, .opEqSlow",
    "    loadi 4[PC], t2",
    "    cieq t0, t1, t0",
    "    storei BooleanTag, TagOffset[cfr, t2, 8]",
    "    storei t0, PayloadOffset[cfr, t2, 8]",
    "    dispatch(constexpr (op_eq_length))",
    ".opEqSlow:",
    "    callOpcodeSlowPath(_slow_path_eq)",
    "    dispatch(constexpr (op_eq_length))",
    "_llint_op_eq_null:",
    "    traceExecution()",
    "    loadi 8[PC], t0",
    "    loadi 4[PC], t3",
    "    assertNotConstant(t0)",
    "    loadi TagOffset[cfr, t0, 8], t1",
    "    loadi PayloadOffset[cfr, t0, 8], t0",
    "    bineq t1, CellTag, .opEqNullImmediate",
    "    btbnz JSCell::m_flags[t0], MasqueradesAsUndefined, .opEqNullMasqueradesAsUndefined",
    "    move 0, t1",
    "    jmp .opEqNullNotImmediate",
    ".opEqNullMasqueradesAsUndefined:",
    "    loadp JSCell::m_structureID[t0], t1",
    "    loadp CodeBlock[cfr], t0",
    "    loadp CodeBlock::m_globalObject[t0], t0",
    "    cpeq Structure::m_globalObject[t1], t0, t1",
    "    jmp .opEqNullNotImmediate",
    ".opEqNullImmediate:",
    "    cieq t1, NullTag, t2",
    "    cieq t1, UndefinedTag, t1",
    "    ori t2, t1",
    ".opEqNullNotImmediate:",
    "    storei BooleanTag, TagOffset[cfr, t3, 8]",
    "    storei t1, PayloadOffset[cfr, t3, 8]",
    "    dispatch(constexpr (op_eq_null_length))",
    "_llint_op_neq:",
    "    traceExecution()",
    "    loadi 12[PC], t2",
    "    loadi 8[PC], t0",
    "    loadConstantOrVariable(t2, t3, t1)",
    "    loadConstantOrVariable2Reg(t0, t2, t0)",
    "    bineq t2, t3, .opNeqSlow",
    "    bieq t2, CellTag, .opNeqSlow",
    "    bib t2, LowestTag, .opNeqSlow",
    "    loadi 4[PC], t2",
    "    cineq t0, t1, t0",
    "    storei BooleanTag, TagOffset[cfr, t2, 8]",
    "    storei t0, PayloadOffset[cfr, t2, 8]",
    "    dispatch(constexpr (op_neq_length))",
    ".opNeqSlow:",
    "    callOpcodeSlowPath(_slow_path_neq)",
    "    dispatch(constexpr (op_neq_length))",
    "_llint_op_neq_null:",
    "    traceExecution()",
    "    loadi 8[PC], t0",
    "    loadi 4[PC], t3",
    "    assertNotConstant(t0)",
    "    loadi TagOffset[cfr, t0, 8], t1",
    "    loadi PayloadOffset[cfr, t0, 8], t0",
    "    bineq t1, CellTag, .opNeqNullImmediate",
    "    btbnz JSCell::m_flags[t0], MasqueradesAsUndefined, .opNeqNullMasqueradesAsUndefined",
    "    move 1, t1",
    "    jmp .opNeqNullNotImmediate",
    ".opNeqNullMasqueradesAsUndefined:",
    "    loadp JSCell::m_structureID[t0], t1",
    "    loadp CodeBlock[cfr], t0",
    "    loadp CodeBlock::m_globalObject[t0], t0",
    "    cpneq Structure::m_globalObject[t1], t0, t1",
    "    jmp .opNeqNullNotImmediate",
    ".opNeqNullImmediate:",
    "    cineq t1, NullTag, t2",
    "    cineq t1, UndefinedTag, t1",
    "    andi t2, t1",
    ".opNeqNullNotImmediate:",
    "    storei BooleanTag, TagOffset[cfr, t3, 8]",
    "    storei t1, PayloadOffset[cfr, t3, 8]",
    "    dispatch(constexpr (op_neq_null_length))",
    "macro strictEq(equalityOperation, slowPath)",
    "    loadi 12[PC], t2",
    "    loadi 8[PC], t0",
    "    loadConstantOrVariable(t2, t3, t1)",
    "    loadConstantOrVariable2Reg(t0, t2, t0)",
    "    bineq t2, t3, .slow",
    "    bib t2, LowestTag, .slow",
    "    bineq t2, CellTag, .notStringOrSymbol",
    "    bbaeq JSCell::m_type[t0], ObjectType, .notStringOrSymbol",
    "    bbb JSCell::m_type[t1], ObjectType, .slow",
    ".notStringOrSymbol:",
    "    loadi 4[PC], t2",
    "    equalityOperation(t0, t1, t0)",
    "    storei BooleanTag, TagOffset[cfr, t2, 8]",
    "    storei t0, PayloadOffset[cfr, t2, 8]",
    "    dispatch(4)",
    ".slow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(4)",
    "end",
    "_llint_op_stricteq:",
    "    traceExecution()",
    "    strictEq(macro (left, right, result)",
    "    cieq left, right, result",
    "end, _slow_path_stricteq)",
    "_llint_op_nstricteq:",
    "    traceExecution()",
    "    strictEq(macro (left, right, result)",
    "    cineq left, right, result",
    "end, _slow_path_nstricteq)",
    "_llint_op_inc:",
    "    traceExecution()",
    "    loadi 4[PC], t0",
    "    bineq TagOffset[cfr, t0, 8], Int32Tag, .opIncSlow",
    "    loadi PayloadOffset[cfr, t0, 8], t1",
    "    baddio 1, t1, .opIncSlow",
    "    storei t1, PayloadOffset[cfr, t0, 8]",
    "    dispatch(constexpr (op_inc_length))",
    ".opIncSlow:",
    "    callOpcodeSlowPath(_slow_path_inc)",
    "    dispatch(constexpr (op_inc_length))",
    "_llint_op_dec:",
    "    traceExecution()",
    "    loadi 4[PC], t0",
    "    bineq TagOffset[cfr, t0, 8], Int32Tag, .opDecSlow",
    "    loadi PayloadOffset[cfr, t0, 8], t1",
    "    bsubio 1, t1, .opDecSlow",
    "    storei t1, PayloadOffset[cfr, t0, 8]",
    "    dispatch(constexpr (op_dec_length))",
    ".opDecSlow:",
    "    callOpcodeSlowPath(_slow_path_dec)",
    "    dispatch(constexpr (op_dec_length))",
    "_llint_op_to_number:",
    "    traceExecution()",
    "    loadi 8[PC], t0",
    "    loadi 4[PC], t1",
    "    loadConstantOrVariable(t0, t2, t3)",
    "    bieq t2, Int32Tag, .opToNumberIsInt",
    "    biaeq t2, LowestTag, .opToNumberSlow",
    ".opToNumberIsInt:",
    "    storei t2, TagOffset[cfr, t1, 8]",
    "    storei t3, PayloadOffset[cfr, t1, 8]",
    "    valueProfile(t2, t3, 12, t1)",
    "    dispatch(constexpr (op_to_number_length))",
    ".opToNumberSlow:",
    "    callOpcodeSlowPath(_slow_path_to_number)",
    "    dispatch(constexpr (op_to_number_length))",
    "_llint_op_to_string:",
    "    traceExecution()",
    "    loadi 8[PC], t0",
    "    loadi 4[PC], t1",
    "    loadConstantOrVariable(t0, t2, t3)",
    "    bineq t2, CellTag, .opToStringSlow",
    "    bbneq JSCell::m_type[t3], StringType, .opToStringSlow",
    ".opToStringIsString:",
    "    storei t2, TagOffset[cfr, t1, 8]",
    "    storei t3, PayloadOffset[cfr, t1, 8]",
    "    dispatch(constexpr (op_to_string_length))",
    ".opToStringSlow:",
    "    callOpcodeSlowPath(_slow_path_to_string)",
    "    dispatch(constexpr (op_to_string_length))",
    "_llint_op_negate:",
    "    traceExecution()",
    "    loadi 8[PC], t0",
    "    loadi 4[PC], t3",
    "    loadConstantOrVariable(t0, t1, t2)",
    "    loadisFromInstruction(3, t0)",
    "    bineq t1, Int32Tag, .opNegateSrcNotInt",
    "    btiz t2, 2147483647, .opNegateSlow",
    "    negi t2",
    "    ori ArithProfileInt, t0",
    "    storei Int32Tag, TagOffset[cfr, t3, 8]",
    "    storeisToInstruction(t0, 3)",
    "    storei t2, PayloadOffset[cfr, t3, 8]",
    "    dispatch(constexpr (op_negate_length))",
    ".opNegateSrcNotInt:",
    "    bia t1, LowestTag, .opNegateSlow",
    "    xori 2147483648, t1",
    "    ori ArithProfileNumber, t0",
    "    storei t2, PayloadOffset[cfr, t3, 8]",
    "    storeisToInstruction(t0, 3)",
    "    storei t1, TagOffset[cfr, t3, 8]",
    "    dispatch(constexpr (op_negate_length))",
    ".opNegateSlow:",
    "    callOpcodeSlowPath(_slow_path_negate)",
    "    dispatch(constexpr (op_negate_length))",
    "macro binaryOpCustomStore(integerOperationAndStore, doubleOperation, slowPath)",
    "    loadi 12[PC], t2",
    "    loadi 8[PC], t0",
    "    loadConstantOrVariable(t2, t3, t1)",
    "    loadConstantOrVariable2Reg(t0, t2, t0)",
    "    bineq t2, Int32Tag, .op1NotInt",
    "    bineq t3, Int32Tag, .op2NotInt",
    "    loadisFromInstruction(4, t5)",
    "    ori ArithProfileIntInt, t5",
    "    storeisToInstruction(t5, 4)",
    "    loadi 4[PC], t2",
    "    integerOperationAndStore(t3, t1, t0, .slow, t2)",
    "    dispatch(5)",
    ".op1NotInt:",
    "    bia t2, LowestTag, .slow",
    "    bib t3, LowestTag, .op1NotIntOp2Double",
    "    bineq t3, Int32Tag, .slow",
    "    loadisFromInstruction(4, t5)",
    "    ori ArithProfileNumberInt, t5",
    "    storeisToInstruction(t5, 4)",
    "    ci2d t1, ft1",
    "    jmp .op1NotIntReady",
    ".op1NotIntOp2Double:",
    "    fii2d t1, t3, ft1",
    "    loadisFromInstruction(4, t5)",
    "    ori ArithProfileNumberNumber, t5",
    "    storeisToInstruction(t5, 4)",
    ".op1NotIntReady:",
    "    loadi 4[PC], t1",
    "    fii2d t0, t2, ft0",
    "    doubleOperation(ft1, ft0)",
    "    stored ft0, 0[cfr, t1, 8]",
    "    dispatch(5)",
    ".op2NotInt:",
    "    loadi 4[PC], t2",
    "    bia t3, LowestTag, .slow",
    "    loadisFromInstruction(4, t5)",
    "    ori ArithProfileIntNumber, t5",
    "    storeisToInstruction(t5, 4)",
    "    ci2d t0, ft0",
    "    fii2d t1, t3, ft1",
    "    doubleOperation(ft1, ft0)",
    "    stored ft0, 0[cfr, t2, 8]",
    "    dispatch(5)",
    ".slow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(5)",
    "end",
    "macro binaryOp(integerOperation, doubleOperation, slowPath)",
    "    binaryOpCustomStore(macro (int32Tag, left, right, slow, index)",
    "    integerOperation(left, right, slow)",
    "    storei int32Tag, TagOffset[cfr, index, 8]",
    "    storei right, PayloadOffset[cfr, index, 8]",
    "end, doubleOperation, slowPath)",
    "end",
    "_llint_op_add:",
    "    traceExecution()",
    "    binaryOp(macro (left, right, slow)",
    "    baddio left, right, slow",
    "end, macro (left, right)",
    "    addd left, right",
    "end, _slow_path_add)",
    "_llint_op_mul:",
    "    traceExecution()",
    "    binaryOpCustomStore(macro (int32Tag, left, right, slow, index)",
    "const scratch = int32Tag",
    "    move right, scratch",
    "    bmulio left, scratch, slow",
    "    btinz scratch, .done",
    "    bilt left, 0, slow",
    "    bilt right, 0, slow",
    ".done:",
    "    storei Int32Tag, TagOffset[cfr, index, 8]",
    "    storei scratch, PayloadOffset[cfr, index, 8]",
    "end, macro (left, right)",
    "    muld left, right",
    "end, _slow_path_mul)",
    "_llint_op_sub:",
    "    traceExecution()",
    "    binaryOp(macro (left, right, slow)",
    "    bsubio left, right, slow",
    "end, macro (left, right)",
    "    subd left, right",
    "end, _slow_path_sub)",
    "_llint_op_div:",
    "    traceExecution()",
    "    binaryOpCustomStore(macro (int32Tag, left, right, slow, index)",
    "    ci2d left, ft0",
    "    ci2d right, ft1",
    "    divd ft0, ft1",
    "    bcd2i ft1, right, .notInt",
    "    storei int32Tag, TagOffset[cfr, index, 8]",
    "    storei right, PayloadOffset[cfr, index, 8]",
    "    jmp .done",
    ".notInt:",
    "    stored ft1, 0[cfr, index, 8]",
    ".done:",
    "end, macro (left, right)",
    "    divd left, right",
    "end, _slow_path_div)",
    "macro bitOp(operation, slowPath, advance)",
    "    loadi 12[PC], t2",
    "    loadi 8[PC], t0",
    "    loadConstantOrVariable(t2, t3, t1)",
    "    loadConstantOrVariable2Reg(t0, t2, t0)",
    "    bineq t3, Int32Tag, .slow",
    "    bineq t2, Int32Tag, .slow",
    "    loadi 4[PC], t2",
    "    operation(t1, t0)",
    "    storei t3, TagOffset[cfr, t2, 8]",
    "    storei t0, PayloadOffset[cfr, t2, 8]",
    "    dispatch(advance)",
    ".slow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(advance)",
    "end",
    "_llint_op_lshift:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    lshifti left, right",
    "end, _slow_path_lshift, constexpr (op_lshift_length))",
    "_llint_op_rshift:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    rshifti left, right",
    "end, _slow_path_rshift, constexpr (op_rshift_length))",
    "_llint_op_urshift:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    urshifti left, right",
    "end, _slow_path_urshift, constexpr (op_urshift_length))",
    "_llint_op_unsigned:",
    "    traceExecution()",
    "    loadi 4[PC], t0",
    "    loadi 8[PC], t1",
    "    loadConstantOrVariablePayload(t1, Int32Tag, t2, .opUnsignedSlow)",
    "    bilt t2, 0, .opUnsignedSlow",
    "    storei t2, PayloadOffset[cfr, t0, 8]",
    "    storei Int32Tag, TagOffset[cfr, t0, 8]",
    "    dispatch(constexpr (op_unsigned_length))",
    ".opUnsignedSlow:",
    "    callOpcodeSlowPath(_slow_path_unsigned)",
    "    dispatch(constexpr (op_unsigned_length))",
    "_llint_op_bitand:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    andi left, right",
    "end, _slow_path_bitand, constexpr (op_bitand_length))",
    "_llint_op_bitxor:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    xori left, right",
    "end, _slow_path_bitxor, constexpr (op_bitxor_length))",
    "_llint_op_bitor:",
    "    traceExecution()",
    "    bitOp(macro (left, right)",
    "    ori left, right",
    "end, _slow_path_bitor, constexpr (op_bitor_length))",
    "_llint_op_overrides_has_instance:",
    "    traceExecution()",
    "    loadisFromInstruction(1, t3)",
    "    storei BooleanTag, TagOffset[cfr, t3, 8]",
    "    loadisFromInstruction(3, t0)",
    "    loadConstantOrVariablePayload(t0, CellTag, t2, .opOverrideshasInstanceValueNotCell)",
    "    loadConstantOrVariable(t0, t1, t2)",
    "    bineq t1, CellTag, .opOverrideshasInstanceValueNotCell",
    "    loadp CodeBlock[cfr], t1",
    "    loadp CodeBlock::m_globalObject[t1], t1",
    "    loadp JSGlobalObject::m_functionProtoHasInstanceSymbolFunction[t1], t1",
    "    bineq t1, t2, .opOverrideshasInstanceValueNotDefault",
    "    loadisFromInstruction(2, t0)",
    "    loadConstantOrVariablePayloadUnchecked(t0, t1)",
    "    tbz JSCell::m_flags[t1], ImplementsDefaultHasInstance, t0",
    "    storei t0, PayloadOffset[cfr, t3, 8]",
    "    dispatch(constexpr (op_overrides_has_instance_length))",
    ".opOverrideshasInstanceValueNotCell:",
    ".opOverrideshasInstanceValueNotDefault:",
    "    storei 1, PayloadOffset[cfr, t3, 8]",
    "    dispatch(constexpr (op_overrides_has_instance_length))",
    "_llint_op_instanceof_custom:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_instanceof_custom)",
    "    dispatch(constexpr (op_instanceof_custom_length))",
    "_llint_op_is_empty:",
    "    traceExecution()",
    "    loadi 8[PC], t1",
    "    loadi 4[PC], t0",
    "    loadConstantOrVariable(t1, t2, t3)",
    "    cieq t2, EmptyValueTag, t3",
    "    storei BooleanTag, TagOffset[cfr, t0, 8]",
    "    storei t3, PayloadOffset[cfr, t0, 8]",
    "    dispatch(constexpr (op_is_empty_length))",
    "_llint_op_is_undefined:",
    "    traceExecution()",
    "    loadi 8[PC], t1",
    "    loadi 4[PC], t0",
    "    loadConstantOrVariable(t1, t2, t3)",
    "    storei BooleanTag, TagOffset[cfr, t0, 8]",
    "    bieq t2, CellTag, .opIsUndefinedCell",
    "    cieq t2, UndefinedTag, t3",
    "    storei t3, PayloadOffset[cfr, t0, 8]",
    "    dispatch(constexpr (op_is_undefined_length))",
    ".opIsUndefinedCell:",
    "    btbnz JSCell::m_flags[t3], MasqueradesAsUndefined, .opIsUndefinedMasqueradesAsUndefined",
    "    move 0, t1",
    "    storei t1, PayloadOffset[cfr, t0, 8]",
    "    dispatch(constexpr (op_is_undefined_length))",
    ".opIsUndefinedMasqueradesAsUndefined:",
    "    loadp JSCell::m_structureID[t3], t1",
    "    loadp CodeBlock[cfr], t3",
    "    loadp CodeBlock::m_globalObject[t3], t3",
    "    cpeq Structure::m_globalObject[t1], t3, t1",
    "    storei t1, PayloadOffset[cfr, t0, 8]",
    "    dispatch(constexpr (op_is_undefined_length))",
    "_llint_op_is_boolean:",
    "    traceExecution()",
    "    loadi 8[PC], t1",
    "    loadi 4[PC], t2",
    "    loadConstantOrVariableTag(t1, t0)",
    "    cieq t0, BooleanTag, t0",
    "    storei BooleanTag, TagOffset[cfr, t2, 8]",
    "    storei t0, PayloadOffset[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_boolean_length))",
    "_llint_op_is_number:",
    "    traceExecution()",
    "    loadi 8[PC], t1",
    "    loadi 4[PC], t2",
    "    loadConstantOrVariableTag(t1, t0)",
    "    storei BooleanTag, TagOffset[cfr, t2, 8]",
    "    addi 1, t0",
    "    cib t0, (LowestTag + 1), t1",
    "    storei t1, PayloadOffset[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_number_length))",
    "_llint_op_is_cell_with_type:",
    "    traceExecution()",
    "    loadi 8[PC], t1",
    "    loadi 4[PC], t2",
    "    loadConstantOrVariable(t1, t0, t3)",
    "    storei BooleanTag, TagOffset[cfr, t2, 8]",
    "    bineq t0, CellTag, .notCellCase",
    "    loadi 12[PC], t0",
    "    cbeq JSCell::m_type[t3], t0, t1",
    "    storei t1, PayloadOffset[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_cell_with_type_length))",
    ".notCellCase:",
    "    storep 0, PayloadOffset[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_cell_with_type_length))",
    "_llint_op_is_object:",
    "    traceExecution()",
    "    loadi 8[PC], t1",
    "    loadi 4[PC], t2",
    "    loadConstantOrVariable(t1, t0, t3)",
    "    storei BooleanTag, TagOffset[cfr, t2, 8]",
    "    bineq t0, CellTag, .opIsObjectNotCell",
    "    cbaeq JSCell::m_type[t3], ObjectType, t1",
    "    storei t1, PayloadOffset[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_object_length))",
    ".opIsObjectNotCell:",
    "    storep 0, PayloadOffset[cfr, t2, 8]",
    "    dispatch(constexpr (op_is_object_length))",
    "macro loadPropertyAtVariableOffsetKnownNotInline(propertyOffset, objectAndStorage, tag, payload)",
    "    assert(macro (ok)",
    "    bigteq propertyOffset, firstOutOfLineOffset, ok",
    "end)",
    "    negi propertyOffset",
    "    loadp JSObject::m_butterfly[objectAndStorage], objectAndStorage",
    "    loadi (TagOffset + ((firstOutOfLineOffset - 2) * 8))[objectAndStorage, propertyOffset, 8], tag",
    "    loadi (PayloadOffset + ((firstOutOfLineOffset - 2) * 8))[objectAndStorage, propertyOffset, 8], payload",
    "end",
    "macro loadPropertyAtVariableOffset(propertyOffset, objectAndStorage, tag, payload)",
    "    bilt propertyOffset, firstOutOfLineOffset, .isInline",
    "    loadp JSObject::m_butterfly[objectAndStorage], objectAndStorage",
    "    negi propertyOffset",
    "    jmp .ready",
    ".isInline:",
    "    addp (sizeof JSObject - ((firstOutOfLineOffset - 2) * 8)), objectAndStorage",
    ".ready:",
    "    loadi (TagOffset + ((firstOutOfLineOffset - 2) * 8))[objectAndStorage, propertyOffset, 8], tag",
    "    loadi (PayloadOffset + ((firstOutOfLineOffset - 2) * 8))[objectAndStorage, propertyOffset, 8], payload",
    "end",
    "macro storePropertyAtVariableOffset(propertyOffsetAsInt, objectAndStorage, tag, payload)",
    "    bilt propertyOffsetAsInt, firstOutOfLineOffset, .isInline",
    "    loadp JSObject::m_butterfly[objectAndStorage], objectAndStorage",
    "    negi propertyOffsetAsInt",
    "    jmp .ready",
    ".isInline:",
    "    addp (sizeof JSObject - ((firstOutOfLineOffset - 2) * 8)), objectAndStorage",
    ".ready:",
    "    storei tag, (TagOffset + ((firstOutOfLineOffset - 2) * 8))[objectAndStorage, propertyOffsetAsInt, 8]",
    "    storei payload, (PayloadOffset + ((firstOutOfLineOffset - 2) * 8))[objectAndStorage, propertyOffsetAsInt, 8]",
    "end",
    "_llint_op_get_by_id:",
    "    traceExecution()",
    "    loadi 8[PC], t0",
    "    loadi 16[PC], t1",
    "    loadConstantOrVariablePayload(t0, CellTag, t3, .opGetByIdSlow)",
    "    loadi 20[PC], t2",
    "    bineq JSCell::m_structureID[t3], t1, .opGetByIdSlow",
    "    loadPropertyAtVariableOffset(t2, t3, t0, t1)",
    "    loadi 4[PC], t2",
    "    storei t0, TagOffset[cfr, t2, 8]",
    "    storei t1, PayloadOffset[cfr, t2, 8]",
    "    valueProfile(t0, t1, 32, t2)",
    "    dispatch(constexpr (op_get_by_id_length))",
    ".opGetByIdSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_get_by_id)",
    "    dispatch(constexpr (op_get_by_id_length))",
    "_llint_op_get_by_id_proto_load:",
    "    traceExecution()",
    "    loadi 8[PC], t0",
    "    loadi 16[PC], t1",
    "    loadConstantOrVariablePayload(t0, CellTag, t3, .opGetByIdProtoSlow)",
    "    loadi 20[PC], t2",
    "    bineq JSCell::m_structureID[t3], t1, .opGetByIdProtoSlow",
    "    loadpFromInstruction(6, t3)",
    "    loadPropertyAtVariableOffset(t2, t3, t0, t1)",
    "    loadi 4[PC], t2",
    "    storei t0, TagOffset[cfr, t2, 8]",
    "    storei t1, PayloadOffset[cfr, t2, 8]",
    "    valueProfile(t0, t1, 32, t2)",
    "    dispatch(constexpr (op_get_by_id_proto_load_length))",
    ".opGetByIdProtoSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_get_by_id)",
    "    dispatch(constexpr (op_get_by_id_proto_load_length))",
    "_llint_op_get_by_id_unset:",
    "    traceExecution()",
    "    loadi 8[PC], t0",
    "    loadi 16[PC], t1",
    "    loadConstantOrVariablePayload(t0, CellTag, t3, .opGetByIdUnsetSlow)",
    "    bineq JSCell::m_structureID[t3], t1, .opGetByIdUnsetSlow",
    "    loadi 4[PC], t2",
    "    storei UndefinedTag, TagOffset[cfr, t2, 8]",
    "    storei 0, PayloadOffset[cfr, t2, 8]",
    "    valueProfile(UndefinedTag, 0, 32, t2)",
    "    dispatch(constexpr (op_get_by_id_unset_length))",
    ".opGetByIdUnsetSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_get_by_id)",
    "    dispatch(constexpr (op_get_by_id_unset_length))",
    "_llint_op_get_array_length:",
    "    traceExecution()",
    "    loadi 8[PC], t0",
    "    loadp 16[PC], t1",
    "    loadConstantOrVariablePayload(t0, CellTag, t3, .opGetArrayLengthSlow)",
    "    move t3, t2",
    "    arrayProfile(t2, t1, t0)",
    "    btiz t2, IsArray, .opGetArrayLengthSlow",
    "    btiz t2, IndexingShapeMask, .opGetArrayLengthSlow",
    "    loadi 4[PC], t1",
    "    loadp JSObject::m_butterfly[t3], t0",
    "    loadi ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t0], t0",
    "    bilt t0, 0, .opGetArrayLengthSlow",
    "    valueProfile(Int32Tag, t0, 32, t2)",
    "    storep t0, PayloadOffset[cfr, t1, 8]",
    "    storep Int32Tag, TagOffset[cfr, t1, 8]",
    "    dispatch(constexpr (op_get_array_length_length))",
    ".opGetArrayLengthSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_get_by_id)",
    "    dispatch(constexpr (op_get_array_length_length))",
    "_llint_op_put_by_id:",
    "    traceExecution()",
    "    writeBarrierOnOperands(1, 3)",
    "    loadi 4[PC], t3",
    "    loadConstantOrVariablePayload(t3, CellTag, t0, .opPutByIdSlow)",
    "    loadi JSCell::m_structureID[t0], t2",
    "    bineq t2, 16[PC], .opPutByIdSlow",
    "    loadi 12[PC], t1",
    "    loadConstantOrVariable(t1, t2, t3)",
    "    loadi 32[PC], t1",
    "    btinz t1, PutByIdPrimaryTypeMask, .opPutByIdTypeCheckObjectWithStructureOrOther",
    "    andi PutByIdSecondaryTypeMask, t1",
    "    bilt t1, PutByIdSecondaryTypeString, .opPutByIdTypeCheckLessThanString",
    "    bilt t1, PutByIdSecondaryTypeObjectOrOther, .opPutByIdTypeCheckLessThanObjectOrOther",
    "    bieq t1, PutByIdSecondaryTypeTop, .opPutByIdDoneCheckingTypes",
    "    bieq t2, CellTag, .opPutByIdTypeCheckObject",
    ".opPutByIdTypeCheckOther:",
    "    bieq t2, NullTag, .opPutByIdDoneCheckingTypes",
    "    bieq t2, UndefinedTag, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckLessThanObjectOrOther:",
    "    bineq t2, CellTag, .opPutByIdSlow",
    "    bieq t1, PutByIdSecondaryTypeObject, .opPutByIdTypeCheckObject",
    "    bieq t1, PutByIdSecondaryTypeSymbol, .opPutByIdTypeCheckSymbol",
    "    bbeq JSCell::m_type[t3], StringType, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckObject:",
    "    bbaeq JSCell::m_type[t3], ObjectType, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckSymbol:",
    "    bbeq JSCell::m_type[t3], SymbolType, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckLessThanString:",
    "    bilt t1, PutByIdSecondaryTypeInt32, .opPutByIdTypeCheckLessThanInt32",
    "    bieq t1, PutByIdSecondaryTypeNumber, .opPutByIdTypeCheckNumber",
    "    bieq t2, Int32Tag, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckNumber:",
    "    bib t2, (LowestTag + 1), .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckLessThanInt32:",
    "    bineq t1, PutByIdSecondaryTypeBoolean, .opPutByIdTypeCheckBottomOrOther",
    "    bieq t2, BooleanTag, .opPutByIdDoneCheckingTypes",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckBottomOrOther:",
    "    bieq t1, PutByIdSecondaryTypeOther, .opPutByIdTypeCheckOther",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckObjectWithStructureOrOther:",
    "    bieq t2, CellTag, .opPutByIdTypeCheckObjectWithStructure",
    "    btinz t1, PutByIdPrimaryTypeObjectWithStructureOrOther, .opPutByIdTypeCheckOther",
    "    jmp .opPutByIdSlow",
    ".opPutByIdTypeCheckObjectWithStructure:",
    "    andi PutByIdSecondaryTypeMask, t1",
    "    bineq t1, JSCell::m_structureID[t3], .opPutByIdSlow",
    ".opPutByIdDoneCheckingTypes:",
    "    loadi 24[PC], t1",
    "    btiz t1, .opPutByIdNotTransition",
    "    loadp 28[PC], t3",
    "    btpz t3, .opPutByIdTransitionDirect",
    "    loadi 16[PC], t2",
    "    loadp StructureChain::m_vector[t3], t3",
    "    assert(macro (ok)",
    "    btpnz t3, ok",
    "end)",
    "    loadp Structure::m_prototype[t2], t2",
    "    btpz t2, .opPutByIdTransitionChainDone",
    ".opPutByIdTransitionChainLoop:",
    "    loadp 0[t3], t1",
    "    bpneq t1, JSCell::m_structureID[t2], .opPutByIdSlow",
    "    addp 4, t3",
    "    loadp Structure::m_prototype[t1], t2",
    "    btpnz t2, .opPutByIdTransitionChainLoop",
    ".opPutByIdTransitionChainDone:",
    "    loadi 24[PC], t1",
    ".opPutByIdTransitionDirect:",
    "    storei t1, JSCell::m_structureID[t0]",
    "    loadi 12[PC], t1",
    "    loadConstantOrVariable(t1, t2, t3)",
    "    loadi 20[PC], t1",
    "    storePropertyAtVariableOffset(t1, t0, t2, t3)",
    "    writeBarrierOnOperand(1)",
    "    dispatch(constexpr (op_put_by_id_length))",
    ".opPutByIdNotTransition:",
    "    loadi 12[PC], t1",
    "    loadConstantOrVariable(t1, t2, t3)",
    "    loadi 20[PC], t1",
    "    storePropertyAtVariableOffset(t1, t0, t2, t3)",
    "    dispatch(constexpr (op_put_by_id_length))",
    ".opPutByIdSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_put_by_id)",
    "    dispatch(constexpr (op_put_by_id_length))",
    "_llint_op_get_by_val:",
    "    traceExecution()",
    "    loadi 8[PC], t2",
    "    loadConstantOrVariablePayload(t2, CellTag, t0, .opGetByValSlow)",
    "    move t0, t2",
    "    loadp 16[PC], t3",
    "    arrayProfile(t2, t3, t1)",
    "    loadi 12[PC], t3",
    "    loadConstantOrVariablePayload(t3, Int32Tag, t1, .opGetByValSlow)",
    "    loadp JSObject::m_butterfly[t0], t3",
    "    andi IndexingShapeMask, t2",
    "    bieq t2, Int32Shape, .opGetByValIsContiguous",
    "    bineq t2, ContiguousShape, .opGetByValNotContiguous",
    ".opGetByValIsContiguous:",
    "    biaeq t1, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t3], .opGetByValOutOfBounds",
    "    loadi TagOffset[t3, t1, 8], t2",
    "    loadi PayloadOffset[t3, t1, 8], t1",
    "    jmp .opGetByValDone",
    ".opGetByValNotContiguous:",
    "    bineq t2, DoubleShape, .opGetByValNotDouble",
    "    biaeq t1, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t3], .opGetByValOutOfBounds",
    "    loadd 0[t3, t1, 8], ft0",
    "    bdnequn ft0, ft0, .opGetByValSlow",
    "    fd2ii ft0, t1, t2",
    "    loadi 4[PC], t0",
    "    jmp .opGetByValNotEmpty",
    ".opGetByValNotDouble:",
    "    subi ArrayStorageShape, t2",
    "    bia t2, (SlowPutArrayStorageShape - ArrayStorageShape), .opGetByValSlow",
    "    biaeq t1, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.vectorLength)[t3], .opGetByValOutOfBounds",
    "    loadi (ArrayStorage::m_vector + TagOffset)[t3, t1, 8], t2",
    "    loadi (ArrayStorage::m_vector + PayloadOffset)[t3, t1, 8], t1",
    ".opGetByValDone:",
    "    loadi 4[PC], t0",
    "    bieq t2, EmptyValueTag, .opGetByValOutOfBounds",
    ".opGetByValNotEmpty:",
    "    storei t2, TagOffset[cfr, t0, 8]",
    "    storei t1, PayloadOffset[cfr, t0, 8]",
    "    valueProfile(t2, t1, 20, t0)",
    "    dispatch(constexpr (op_get_by_val_length))",
    ".opGetByValOutOfBounds:",
    "    loadpFromInstruction(4, t0)",
    "    storeb 1, ArrayProfile::m_outOfBounds[t0]",
    ".opGetByValSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_get_by_val)",
    "    dispatch(constexpr (op_get_by_val_length))",
    "macro contiguousPutByVal(storeCallback)",
    "    biaeq t3, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t0], .outOfBounds",
    ".storeResult:",
    "    loadi 12[PC], t2",
    "    storeCallback(t2, t1, t0, t3)",
    "    dispatch(5)",
    ".outOfBounds:",
    "    biaeq t3, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.vectorLength)[t0], .opPutByValOutOfBounds",
    "    loadp 16[PC], t2",
    "    storeb 1, ArrayProfile::m_mayStoreToHole[t2]",
    "    addi 1, t3, t2",
    "    storei t2, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t0]",
    "    jmp .storeResult",
    "end",
    "macro putByVal(slowPath)",
    "    traceExecution()",
    "    writeBarrierOnOperands(1, 3)",
    "    loadi 4[PC], t0",
    "    loadConstantOrVariablePayload(t0, CellTag, t1, .opPutByValSlow)",
    "    move t1, t2",
    "    loadp 16[PC], t3",
    "    arrayProfile(t2, t3, t0)",
    "    loadi 8[PC], t0",
    "    loadConstantOrVariablePayload(t0, Int32Tag, t3, .opPutByValSlow)",
    "    loadp JSObject::m_butterfly[t1], t0",
    "    andi IndexingShapeMask, t2",
    "    bineq t2, Int32Shape, .opPutByValNotInt32",
    "    contiguousPutByVal(macro (operand, scratch, base, index)",
    "    loadConstantOrVariablePayload(operand, Int32Tag, scratch, .opPutByValSlow)",
    "    storei Int32Tag, TagOffset[base, index, 8]",
    "    storei scratch, PayloadOffset[base, index, 8]",
    "end)",
    ".opPutByValNotInt32:",
    "    bineq t2, DoubleShape, .opPutByValNotDouble",
    "    contiguousPutByVal(macro (operand, scratch, base, index)",
    "const tag = scratch",
    "const payload = operand",
    "    loadConstantOrVariable2Reg(operand, tag, payload)",
    "    bineq tag, Int32Tag, .notInt",
    "    ci2d payload, ft0",
    "    jmp .ready",
    ".notInt:",
    "    fii2d payload, tag, ft0",
    "    bdnequn ft0, ft0, .opPutByValSlow",
    ".ready:",
    "    stored ft0, 0[base, index, 8]",
    "end)",
    ".opPutByValNotDouble:",
    "    bineq t2, ContiguousShape, .opPutByValNotContiguous",
    "    contiguousPutByVal(macro (operand, scratch, base, index)",
    "const tag = scratch",
    "const payload = operand",
    "    loadConstantOrVariable2Reg(operand, tag, payload)",
    "    storei tag, TagOffset[base, index, 8]",
    "    storei payload, PayloadOffset[base, index, 8]",
    "end)",
    ".opPutByValNotContiguous:",
    "    bineq t2, ArrayStorageShape, .opPutByValSlow",
    "    biaeq t3, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.vectorLength)[t0], .opPutByValOutOfBounds",
    "    bieq (ArrayStorage::m_vector + TagOffset)[t0, t3, 8], EmptyValueTag, .opPutByValArrayStorageEmpty",
    ".opPutByValArrayStorageStoreResult:",
    "    loadi 12[PC], t2",
    "    loadConstantOrVariable2Reg(t2, t1, t2)",
    "    storei t1, (ArrayStorage::m_vector + TagOffset)[t0, t3, 8]",
    "    storei t2, (ArrayStorage::m_vector + PayloadOffset)[t0, t3, 8]",
    "    dispatch(5)",
    ".opPutByValArrayStorageEmpty:",
    "    loadp 16[PC], t1",
    "    storeb 1, ArrayProfile::m_mayStoreToHole[t1]",
    "    addi 1, ArrayStorage::m_numValuesInVector[t0]",
    "    bib t3, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t0], .opPutByValArrayStorageStoreResult",
    "    addi 1, t3, t1",
    "    storei t1, ((-sizeof IndexingHeader) + IndexingHeader::u.lengths.publicLength)[t0]",
    "    jmp .opPutByValArrayStorageStoreResult",
    ".opPutByValOutOfBounds:",
    "    loadpFromInstruction(4, t0)",
    "    storeb 1, ArrayProfile::m_outOfBounds[t0]",
    ".opPutByValSlow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(5)",
    "end",
    "_llint_op_put_by_val:",
    "    putByVal(_llint_slow_path_put_by_val)",
    "_llint_op_put_by_val_direct:",
    "    putByVal(_llint_slow_path_put_by_val_direct)",
    "_llint_op_jmp:",
    "    traceExecution()",
    "    dispatchBranch(4[PC])",
    "macro jumpTrueOrFalse(conditionOp, slow)",
    "    loadi 4[PC], t1",
    "    loadConstantOrVariablePayload(t1, BooleanTag, t0, .slow)",
    "    conditionOp(t0, .target)",
    "    dispatch(3)",
    ".target:",
    "    dispatchBranch(8[PC])",
    ".slow:",
    "    callOpcodeSlowPath(slow)",
    "    dispatch(0)",
    "end",
    "macro equalNull(cellHandler, immediateHandler)",
    "    loadi 4[PC], t0",
    "    assertNotConstant(t0)",
    "    loadi TagOffset[cfr, t0, 8], t1",
    "    loadi PayloadOffset[cfr, t0, 8], t0",
    "    bineq t1, CellTag, .immediate",
    "    loadp JSCell::m_structureID[t0], t2",
    "    cellHandler(t2, JSCell::m_flags[t0], .target)",
    "    dispatch(3)",
    ".target:",
    "    dispatchBranch(8[PC])",
    ".immediate:",
    "    ori 1, t1",
    "    immediateHandler(t1, .target)",
    "    dispatch(3)",
    "end",
    "_llint_op_jeq_null:",
    "    traceExecution()",
    "    equalNull(macro (structure, value, target)",
    "    btbz value, MasqueradesAsUndefined, .opJeqNullNotMasqueradesAsUndefined",
    "    loadp CodeBlock[cfr], t0",
    "    loadp CodeBlock::m_globalObject[t0], t0",
    "    bpeq Structure::m_globalObject[structure], t0, target",
    ".opJeqNullNotMasqueradesAsUndefined:",
    "end, macro (value, target)",
    "    bieq value, NullTag, target",
    "end)",
    "_llint_op_jneq_null:",
    "    traceExecution()",
    "    equalNull(macro (structure, value, target)",
    "    btbz value, MasqueradesAsUndefined, target",
    "    loadp CodeBlock[cfr], t0",
    "    loadp CodeBlock::m_globalObject[t0], t0",
    "    bpneq Structure::m_globalObject[structure], t0, target",
    "end, macro (value, target)",
    "    bineq value, NullTag, target",
    "end)",
    "_llint_op_jneq_ptr:",
    "    traceExecution()",
    "    loadi 4[PC], t0",
    "    loadi 8[PC], t1",
    "    loadp CodeBlock[cfr], t2",
    "    loadp CodeBlock::m_globalObject[t2], t2",
    "    bineq TagOffset[cfr, t0, 8], CellTag, .opJneqPtrBranch",
    "    loadp JSGlobalObject::m_specialPointers[t2, t1, 4], t1",
    "    bpeq PayloadOffset[cfr, t0, 8], t1, .opJneqPtrFallThrough",
    ".opJneqPtrBranch:",
    "    storei 1, 16[PC]",
    "    dispatchBranch(12[PC])",
    ".opJneqPtrFallThrough:",
    "    dispatch(constexpr (op_jneq_ptr_length))",
    "macro compare(integerCompare, doubleCompare, slowPath)",
    "    loadi 4[PC], t2",
    "    loadi 8[PC], t3",
    "    loadConstantOrVariable(t2, t0, t1)",
    "    loadConstantOrVariable2Reg(t3, t2, t3)",
    "    bineq t0, Int32Tag, .op1NotInt",
    "    bineq t2, Int32Tag, .op2NotInt",
    "    integerCompare(t1, t3, .jumpTarget)",
    "    dispatch(4)",
    ".op1NotInt:",
    "    bia t0, LowestTag, .slow",
    "    bib t2, LowestTag, .op1NotIntOp2Double",
    "    bineq t2, Int32Tag, .slow",
    "    ci2d t3, ft1",
    "    jmp .op1NotIntReady",
    ".op1NotIntOp2Double:",
    "    fii2d t3, t2, ft1",
    ".op1NotIntReady:",
    "    fii2d t1, t0, ft0",
    "    doubleCompare(ft0, ft1, .jumpTarget)",
    "    dispatch(4)",
    ".op2NotInt:",
    "    ci2d t1, ft0",
    "    bia t2, LowestTag, .slow",
    "    fii2d t3, t2, ft1",
    "    doubleCompare(ft0, ft1, .jumpTarget)",
    "    dispatch(4)",
    ".jumpTarget:",
    "    dispatchBranch(12[PC])",
    ".slow:",
    "    callOpcodeSlowPath(slowPath)",
    "    dispatch(0)",
    "end",
    "_llint_op_switch_imm:",
    "    traceExecution()",
    "    loadi 12[PC], t2",
    "    loadi 4[PC], t3",
    "    loadConstantOrVariable(t2, t1, t0)",
    "    loadp CodeBlock[cfr], t2",
    "    loadp CodeBlock::m_rareData[t2], t2",
    "    muli sizeof SimpleJumpTable, t3",
    "    loadp (CodeBlock::RareData::m_switchJumpTables + VectorBufferOffset)[t2], t2",
    "    addp t3, t2",
    "    bineq t1, Int32Tag, .opSwitchImmNotInt",
    "    subi SimpleJumpTable::min[t2], t0",
    "    biaeq t0, (SimpleJumpTable::branchOffsets + VectorSizeOffset)[t2], .opSwitchImmFallThrough",
    "    loadp (SimpleJumpTable::branchOffsets + VectorBufferOffset)[t2], t3",
    "    loadi 0[t3, t0, 4], t1",
    "    btiz t1, .opSwitchImmFallThrough",
    "    dispatchBranchWithOffset(t1)",
    ".opSwitchImmNotInt:",
    "    bib t1, LowestTag, .opSwitchImmSlow",
    ".opSwitchImmFallThrough:",
    "    dispatchBranch(8[PC])",
    ".opSwitchImmSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_switch_imm)",
    "    dispatch(0)",
    "_llint_op_switch_char:",
    "    traceExecution()",
    "    loadi 12[PC], t2",
    "    loadi 4[PC], t3",
    "    loadConstantOrVariable(t2, t1, t0)",
    "    loadp CodeBlock[cfr], t2",
    "    loadp CodeBlock::m_rareData[t2], t2",
    "    muli sizeof SimpleJumpTable, t3",
    "    loadp (CodeBlock::RareData::m_switchJumpTables + VectorBufferOffset)[t2], t2",
    "    addp t3, t2",
    "    bineq t1, CellTag, .opSwitchCharFallThrough",
    "    bbneq JSCell::m_type[t0], StringType, .opSwitchCharFallThrough",
    "    bineq JSString::m_length[t0], 1, .opSwitchCharFallThrough",
    "    loadp JSString::m_value[t0], t0",
    "    btpz t0, .opSwitchOnRope",
    "    loadp StringImpl::m_data8[t0], t1",
    "    btinz StringImpl::m_hashAndFlags[t0], HashFlags8BitBuffer, .opSwitchChar8Bit",
    "    loadh 0[t1], t0",
    "    jmp .opSwitchCharReady",
    ".opSwitchChar8Bit:",
    "    loadb 0[t1], t0",
    ".opSwitchCharReady:",
    "    subi SimpleJumpTable::min[t2], t0",
    "    biaeq t0, (SimpleJumpTable::branchOffsets + VectorSizeOffset)[t2], .opSwitchCharFallThrough",
    "    loadp (SimpleJumpTable::branchOffsets + VectorBufferOffset)[t2], t2",
    "    loadi 0[t2, t0, 4], t1",
    "    btiz t1, .opSwitchCharFallThrough",
    "    dispatchBranchWithOffset(t1)",
    ".opSwitchCharFallThrough:",
    "    dispatchBranch(8[PC])",
    ".opSwitchOnRope:",
    "    callOpcodeSlowPath(_llint_slow_path_switch_char)",
    "    dispatch(0)",
    "macro arrayProfileForCall()",
    "    loadi 16[PC], t3",
    "    negi t3",
    "    bineq (ThisArgumentOffset + TagOffset)[cfr, t3, 8], CellTag, .done",
    "    loadi (ThisArgumentOffset + PayloadOffset)[cfr, t3, 8], t0",
    "    loadp JSCell::m_structureID[t0], t0",
    "    loadpFromInstruction((CallOpCodeSize - 2), t1)",
    "    storep t0, ArrayProfile::m_lastSeenStructureID[t1]",
    ".done:",
    "end",
    "macro doCall(slowPath, prepareCall)",
    "    loadi 8[PC], t0",
    "    loadi 20[PC], t1",
    "    loadp LLIntCallLinkInfo::callee[t1], t2",
    "    loadConstantOrVariablePayload(t0, CellTag, t3, .opCallSlow)",
    "    bineq t3, t2, .opCallSlow",
    "    loadi 16[PC], t3",
    "    lshifti 3, t3",
    "    negi t3",
    "    addp cfr, t3",
    "    storei t2, (Callee + PayloadOffset)[t3]",
    "    loadi 12[PC], t2",
    "    storei PC, (ArgumentCount + TagOffset)[cfr]",
    "    storei t2, (ArgumentCount + PayloadOffset)[t3]",
    "    storei CellTag, (Callee + TagOffset)[t3]",
    "    move t3, sp",
    "    prepareCall(LLIntCallLinkInfo::machineCodeTarget[t1], t2, t3, t4)",
    "    callTargetFunction(LLIntCallLinkInfo::machineCodeTarget[t1])",
    ".opCallSlow:",
    "    slowPathForCall(slowPath, prepareCall)",
    "end",
    "_llint_op_ret:",
    "    traceExecution()",
    "    checkSwitchToJITForEpilogue()",
    "    loadi 4[PC], t2",
    "    loadConstantOrVariable(t2, t1, t0)",
    "    doReturn()",
    "_llint_op_to_primitive:",
    "    traceExecution()",
    "    loadi 8[PC], t2",
    "    loadi 4[PC], t3",
    "    loadConstantOrVariable(t2, t1, t0)",
    "    bineq t1, CellTag, .opToPrimitiveIsImm",
    "    bbaeq JSCell::m_type[t0], ObjectType, .opToPrimitiveSlowCase",
    ".opToPrimitiveIsImm:",
    "    storei t1, TagOffset[cfr, t3, 8]",
    "    storei t0, PayloadOffset[cfr, t3, 8]",
    "    dispatch(constexpr (op_to_primitive_length))",
    ".opToPrimitiveSlowCase:",
    "    callOpcodeSlowPath(_slow_path_to_primitive)",
    "    dispatch(constexpr (op_to_primitive_length))",
    "_llint_op_catch:",
    "    loadp (Callee + PayloadOffset)[cfr], t3",
    "    andp MarkedBlockMask, t3",
    "    loadp MarkedBlock::m_vm[t3], t3",
    "    restoreCalleeSavesFromVMEntryFrameCalleeSavesBuffer(t3, t0)",
    "    loadp VM::callFrameForCatch[t3], cfr",
    "    storep 0, VM::callFrameForCatch[t3]",
    "    restoreStackPointerAfterCall()",
    "    loadi VM::targetInterpreterPCForThrow[t3], PC",
    "    callOpcodeSlowPath(_llint_slow_path_check_if_exception_is_uncatchable_and_notify_profiler)",
    "    bpeq r1, 0, .isCatchableException",
    "    jmp _llint_throw_from_slow_path_trampoline",
    ".isCatchableException:",
    "    loadp (Callee + PayloadOffset)[cfr], t3",
    "    andp MarkedBlockMask, t3",
    "    loadp MarkedBlock::m_vm[t3], t3",
    "    loadi VM::m_exception[t3], t0",
    "    storei 0, VM::m_exception[t3]",
    "    loadi 4[PC], t2",
    "    storei t0, PayloadOffset[cfr, t2, 8]",
    "    storei CellTag, TagOffset[cfr, t2, 8]",
    "    loadi (Exception::m_value + TagOffset)[t0], t1",
    "    loadi (Exception::m_value + PayloadOffset)[t0], t0",
    "    loadi 8[PC], t2",
    "    storei t0, PayloadOffset[cfr, t2, 8]",
    "    storei t1, TagOffset[cfr, t2, 8]",
    "    traceExecution()",
    "    dispatch(3)",
    "_llint_op_end:",
    "    traceExecution()",
    "    checkSwitchToJITForEpilogue()",
    "    loadi 4[PC], t0",
    "    assertNotConstant(t0)",
    "    loadi TagOffset[cfr, t0, 8], t1",
    "    loadi PayloadOffset[cfr, t0, 8], t0",
    "    doReturn()",
    "_llint_throw_from_slow_path_trampoline:",
    "    callSlowPath(_llint_slow_path_handle_exception)",
    "    loadp Callee[cfr], t1",
    "    andp MarkedBlockMask, t1",
    "    loadp MarkedBlock::m_vm[t1], t1",
    "    copyCalleeSavesToVMEntryFrameCalleeSavesBuffer(t1, t2)",
    "    jmp VM::targetMachinePCForThrow[t1]",
    "_llint_throw_during_call_trampoline:",
    "    preserveReturnAddressAfterCall(t2)",
    "    jmp _llint_throw_from_slow_path_trampoline",
    "macro nativeCallTrampoline(executableOffsetToFunction)",
    "    functionPrologue()",
    "    storep 0, CodeBlock[cfr]",
    "    loadi (Callee + PayloadOffset)[cfr], t1",
    "if (X86 or X86_WIN)",
    "    subp 8, sp",
    "    andp MarkedBlockMask, t1",
    "    loadp MarkedBlock::m_vm[t1], t3",
    "    storep cfr, VM::topCallFrame[t3]",
    "    move cfr, a0",
    "    storep a0, 0[sp]",
    "    loadi (Callee + PayloadOffset)[cfr], t1",
    "    loadp JSFunction::m_executable[t1], t1",
    "    checkStackPointerAlignment(t3, 3735879681)",
    "    call executableOffsetToFunction[t1]",
    "    loadp (Callee + PayloadOffset)[cfr], t3",
    "    andp MarkedBlockMask, t3",
    "    loadp MarkedBlock::m_vm[t3], t3",
    "    addp 8, sp",
    "else",
    "if ((((ARM or ARMv7) or ARMv7_TRADITIONAL) or C_LOOP) or MIPS)",
    "    subp 8, sp",
    "    andp MarkedBlockMask, t1",
    "    loadp MarkedBlock::m_vm[t1], t1",
    "    storep cfr, VM::topCallFrame[t1]",
    "    move cfr, a0",
    "    loadi (Callee + PayloadOffset)[cfr], t1",
    "    loadp JSFunction::m_executable[t1], t1",
    "    checkStackPointerAlignment(t3, 3735879681)",
    "if C_LOOP",
    "    cloopCallNative executableOffsetToFunction[t1]",
    "else",
    "    call executableOffsetToFunction[t1]",
    "end",
    "    loadp (Callee + PayloadOffset)[cfr], t3",
    "    andp MarkedBlockMask, t3",
    "    loadp MarkedBlock::m_vm[t3], t3",
    "    addp 8, sp",
    "else",
    "    error",
    "end",
    "end",
    "    btinz VM::m_exception[t3], .handleException",
    "    functionEpilogue()",
    "    ret ",
    ".handleException:",
    "    storep cfr, VM::topCallFrame[t3]",
    "    jmp _llint_throw_from_slow_path_trampoline",
    "end",
    "macro getConstantScope(dst)",
    "    loadpFromInstruction(6, t0)",
    "    loadisFromInstruction(dst, t1)",
    "    storei CellTag, TagOffset[cfr, t1, 8]",
    "    storei t0, PayloadOffset[cfr, t1, 8]",
    "end",
    "macro varInjectionCheck(slowPath)",
    "    loadp CodeBlock[cfr], t0",
    "    loadp CodeBlock::m_globalObject[t0], t0",
    "    loadp JSGlobalObject::m_varInjectionWatchpoint[t0], t0",
    "    bbeq WatchpointSet::m_state[t0], IsInvalidated, slowPath",
    "end",
    "macro resolveScope()",
    "    loadp CodeBlock[cfr], t0",
    "    loadisFromInstruction(5, t2)",
    "    loadisFromInstruction(2, t0)",
    "    loadp PayloadOffset[cfr, t0, 8], t0",
    "    btiz t2, .resolveScopeLoopEnd",
    ".resolveScopeLoop:",
    "    loadp JSScope::m_next[t0], t0",
    "    subi 1, t2",
    "    btinz t2, .resolveScopeLoop",
    ".resolveScopeLoopEnd:",
    "    loadisFromInstruction(1, t1)",
    "    storei CellTag, TagOffset[cfr, t1, 8]",
    "    storei t0, PayloadOffset[cfr, t1, 8]",
    "end",
    "_llint_op_resolve_scope:",
    "    traceExecution()",
    "    loadisFromInstruction(4, t0)",
    "    bineq t0, GlobalProperty, .rGlobalVar",
    "    getConstantScope(1)",
    "    dispatch(7)",
    ".rGlobalVar:",
    "    bineq t0, GlobalVar, .rGlobalLexicalVar",
    "    getConstantScope(1)",
    "    dispatch(7)",
    ".rGlobalLexicalVar:",
    "    bineq t0, GlobalLexicalVar, .rClosureVar",
    "    getConstantScope(1)",
    "    dispatch(7)",
    ".rClosureVar:",
    "    bineq t0, ClosureVar, .rModuleVar",
    "    resolveScope()",
    "    dispatch(7)",
    ".rModuleVar:",
    "    bineq t0, ModuleVar, .rGlobalPropertyWithVarInjectionChecks",
    "    getConstantScope(1)",
    "    dispatch(7)",
    ".rGlobalPropertyWithVarInjectionChecks:",
    "    bineq t0, GlobalPropertyWithVarInjectionChecks, .rGlobalVarWithVarInjectionChecks",
    "    varInjectionCheck(.rDynamic)",
    "    getConstantScope(1)",
    "    dispatch(7)",
    ".rGlobalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalVarWithVarInjectionChecks, .rGlobalLexicalVarWithVarInjectionChecks",
    "    varInjectionCheck(.rDynamic)",
    "    getConstantScope(1)",
    "    dispatch(7)",
    ".rGlobalLexicalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .rClosureVarWithVarInjectionChecks",
    "    varInjectionCheck(.rDynamic)",
    "    getConstantScope(1)",
    "    dispatch(7)",
    ".rClosureVarWithVarInjectionChecks:",
    "    bineq t0, ClosureVarWithVarInjectionChecks, .rDynamic",
    "    varInjectionCheck(.rDynamic)",
    "    resolveScope()",
    "    dispatch(7)",
    ".rDynamic:",
    "    callOpcodeSlowPath(_slow_path_resolve_scope)",
    "    dispatch(7)",
    "macro loadWithStructureCheck(operand, slowPath)",
    "    loadisFromInstruction(operand, t0)",
    "    loadp PayloadOffset[cfr, t0, 8], t0",
    "    loadpFromInstruction(5, t1)",
    "    bpneq JSCell::m_structureID[t0], t1, slowPath",
    "end",
    "macro getProperty()",
    "    loadisFromInstruction(6, t3)",
    "    loadPropertyAtVariableOffset(t3, t0, t1, t2)",
    "    valueProfile(t1, t2, 28, t0)",
    "    loadisFromInstruction(1, t0)",
    "    storei t1, TagOffset[cfr, t0, 8]",
    "    storei t2, PayloadOffset[cfr, t0, 8]",
    "end",
    "macro getGlobalVar(tdzCheckIfNecessary)",
    "    loadpFromInstruction(6, t0)",
    "    loadp TagOffset[t0], t1",
    "    loadp PayloadOffset[t0], t2",
    "    tdzCheckIfNecessary(t1)",
    "    valueProfile(t1, t2, 28, t0)",
    "    loadisFromInstruction(1, t0)",
    "    storei t1, TagOffset[cfr, t0, 8]",
    "    storei t2, PayloadOffset[cfr, t0, 8]",
    "end",
    "macro getClosureVar()",
    "    loadisFromInstruction(6, t3)",
    "    loadp (JSEnvironmentRecord_variables + TagOffset)[t0, t3, 8], t1",
    "    loadp (JSEnvironmentRecord_variables + PayloadOffset)[t0, t3, 8], t2",
    "    valueProfile(t1, t2, 28, t0)",
    "    loadisFromInstruction(1, t0)",
    "    storei t1, TagOffset[cfr, t0, 8]",
    "    storei t2, PayloadOffset[cfr, t0, 8]",
    "end",
    "_llint_op_get_from_scope:",
    "    traceExecution()",
    "    loadisFromInstruction(4, t0)",
    "    andi ResolveTypeMask, t0",
    "    bineq t0, GlobalProperty, .gGlobalVar",
    "    loadWithStructureCheck(2, .gDynamic)",
    "    getProperty()",
    "    dispatch(8)",
    ".gGlobalVar:",
    "    bineq t0, GlobalVar, .gGlobalLexicalVar",
    "    getGlobalVar(macro (t)",
    "",
    "end)",
    "    dispatch(8)",
    ".gGlobalLexicalVar:",
    "    bineq t0, GlobalLexicalVar, .gClosureVar",
    "    getGlobalVar(macro (tag)",
    "    bieq tag, EmptyValueTag, .gDynamic",
    "end)",
    "    dispatch(8)",
    ".gClosureVar:",
    "    bineq t0, ClosureVar, .gGlobalPropertyWithVarInjectionChecks",
    "    loadVariable(2, t2, t1, t0)",
    "    getClosureVar()",
    "    dispatch(8)",
    ".gGlobalPropertyWithVarInjectionChecks:",
    "    bineq t0, GlobalPropertyWithVarInjectionChecks, .gGlobalVarWithVarInjectionChecks",
    "    loadWithStructureCheck(2, .gDynamic)",
    "    getProperty()",
    "    dispatch(8)",
    ".gGlobalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalVarWithVarInjectionChecks, .gGlobalLexicalVarWithVarInjectionChecks",
    "    varInjectionCheck(.gDynamic)",
    "    getGlobalVar(macro (t)",
    "",
    "end)",
    "    dispatch(8)",
    ".gGlobalLexicalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .gClosureVarWithVarInjectionChecks",
    "    varInjectionCheck(.gDynamic)",
    "    getGlobalVar(macro (tag)",
    "    bieq tag, EmptyValueTag, .gDynamic",
    "end)",
    "    dispatch(8)",
    ".gClosureVarWithVarInjectionChecks:",
    "    bineq t0, ClosureVarWithVarInjectionChecks, .gDynamic",
    "    varInjectionCheck(.gDynamic)",
    "    loadVariable(2, t2, t1, t0)",
    "    getClosureVar()",
    "    dispatch(8)",
    ".gDynamic:",
    "    callOpcodeSlowPath(_llint_slow_path_get_from_scope)",
    "    dispatch(8)",
    "macro putProperty()",
    "    loadisFromInstruction(3, t1)",
    "    loadConstantOrVariable(t1, t2, t3)",
    "    loadisFromInstruction(6, t1)",
    "    storePropertyAtVariableOffset(t1, t0, t2, t3)",
    "end",
    "macro putGlobalVariable()",
    "    loadisFromInstruction(3, t0)",
    "    loadConstantOrVariable(t0, t1, t2)",
    "    loadpFromInstruction(5, t3)",
    "    notifyWrite(t3, .pDynamic)",
    "    loadpFromInstruction(6, t0)",
    "    storei t1, TagOffset[t0]",
    "    storei t2, PayloadOffset[t0]",
    "end",
    "macro putClosureVar()",
    "    loadisFromInstruction(3, t1)",
    "    loadConstantOrVariable(t1, t2, t3)",
    "    loadisFromInstruction(6, t1)",
    "    storei t2, (JSEnvironmentRecord_variables + TagOffset)[t0, t1, 8]",
    "    storei t3, (JSEnvironmentRecord_variables + PayloadOffset)[t0, t1, 8]",
    "end",
    "macro putLocalClosureVar()",
    "    loadisFromInstruction(3, t1)",
    "    loadConstantOrVariable(t1, t2, t3)",
    "    loadpFromInstruction(5, t5)",
    "    btpz t5, .noVariableWatchpointSet",
    "    notifyWrite(t5, .pDynamic)",
    ".noVariableWatchpointSet:",
    "    loadisFromInstruction(6, t1)",
    "    storei t2, (JSEnvironmentRecord_variables + TagOffset)[t0, t1, 8]",
    "    storei t3, (JSEnvironmentRecord_variables + PayloadOffset)[t0, t1, 8]",
    "end",
    "_llint_op_put_to_scope:",
    "    traceExecution()",
    "    loadisFromInstruction(4, t0)",
    "    andi ResolveTypeMask, t0",
    "    bineq t0, LocalClosureVar, .pGlobalProperty",
    "    writeBarrierOnOperands(1, 3)",
    "    loadVariable(1, t2, t1, t0)",
    "    putLocalClosureVar()",
    "    dispatch(7)",
    ".pGlobalProperty:",
    "    bineq t0, GlobalProperty, .pGlobalVar",
    "    writeBarrierOnOperands(1, 3)",
    "    loadWithStructureCheck(1, .pDynamic)",
    "    putProperty()",
    "    dispatch(7)",
    ".pGlobalVar:",
    "    bineq t0, GlobalVar, .pGlobalLexicalVar",
    "    writeBarrierOnGlobalObject(3)",
    "    putGlobalVariable()",
    "    dispatch(7)",
    ".pGlobalLexicalVar:",
    "    bineq t0, GlobalLexicalVar, .pClosureVar",
    "    writeBarrierOnGlobalLexicalEnvironment(3)",
    "    putGlobalVariable()",
    "    dispatch(7)",
    ".pClosureVar:",
    "    bineq t0, ClosureVar, .pGlobalPropertyWithVarInjectionChecks",
    "    writeBarrierOnOperands(1, 3)",
    "    loadVariable(1, t2, t1, t0)",
    "    putClosureVar()",
    "    dispatch(7)",
    ".pGlobalPropertyWithVarInjectionChecks:",
    "    bineq t0, GlobalPropertyWithVarInjectionChecks, .pGlobalVarWithVarInjectionChecks",
    "    writeBarrierOnOperands(1, 3)",
    "    loadWithStructureCheck(1, .pDynamic)",
    "    putProperty()",
    "    dispatch(7)",
    ".pGlobalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalVarWithVarInjectionChecks, .pGlobalLexicalVarWithVarInjectionChecks",
    "    writeBarrierOnGlobalObject(3)",
    "    varInjectionCheck(.pDynamic)",
    "    putGlobalVariable()",
    "    dispatch(7)",
    ".pGlobalLexicalVarWithVarInjectionChecks:",
    "    bineq t0, GlobalLexicalVarWithVarInjectionChecks, .pClosureVarWithVarInjectionChecks",
    "    writeBarrierOnGlobalLexicalEnvironment(3)",
    "    varInjectionCheck(.pDynamic)",
    "    putGlobalVariable()",
    "    dispatch(7)",
    ".pClosureVarWithVarInjectionChecks:",
    "    bineq t0, ClosureVarWithVarInjectionChecks, .pModuleVar",
    "    writeBarrierOnOperands(1, 3)",
    "    varInjectionCheck(.pDynamic)",
    "    loadVariable(1, t2, t1, t0)",
    "    putClosureVar()",
    "    dispatch(7)",
    ".pModuleVar:",
    "    bineq t0, ModuleVar, .pDynamic",
    "    callOpcodeSlowPath(_slow_path_throw_strict_mode_readonly_property_write_error)",
    "    dispatch(7)",
    ".pDynamic:",
    "    callOpcodeSlowPath(_llint_slow_path_put_to_scope)",
    "    dispatch(7)",
    "_llint_op_get_from_arguments:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t0)",
    "    loadi PayloadOffset[cfr, t0, 8], t0",
    "    loadi 12[PC], t1",
    "    loadi (DirectArguments_storage + TagOffset)[t0, t1, 8], t2",
    "    loadi (DirectArguments_storage + PayloadOffset)[t0, t1, 8], t3",
    "    loadisFromInstruction(1, t1)",
    "    valueProfile(t2, t3, 16, t0)",
    "    storei t2, TagOffset[cfr, t1, 8]",
    "    storei t3, PayloadOffset[cfr, t1, 8]",
    "    dispatch(5)",
    "_llint_op_put_to_arguments:",
    "    traceExecution()",
    "    writeBarrierOnOperands(1, 3)",
    "    loadisFromInstruction(1, t0)",
    "    loadi PayloadOffset[cfr, t0, 8], t0",
    "    loadisFromInstruction(3, t1)",
    "    loadConstantOrVariable(t1, t2, t3)",
    "    loadi 8[PC], t1",
    "    storei t2, (DirectArguments_storage + TagOffset)[t0, t1, 8]",
    "    storei t3, (DirectArguments_storage + PayloadOffset)[t0, t1, 8]",
    "    dispatch(4)",
    "_llint_op_get_parent_scope:",
    "    traceExecution()",
    "    loadisFromInstruction(2, t0)",
    "    loadp PayloadOffset[cfr, t0, 8], t0",
    "    loadp JSScope::m_next[t0], t0",
    "    loadisFromInstruction(1, t1)",
    "    storei CellTag, TagOffset[cfr, t1, 8]",
    "    storei t0, PayloadOffset[cfr, t1, 8]",
    "    dispatch(3)",
    "_llint_op_profile_type:",
    "    traceExecution()",
    "    loadp CodeBlock[cfr], t1",
    "    loadp CodeBlock::m_vm[t1], t1",
    "    loadp VM::m_typeProfilerLog[t1], t1",
    "    loadisFromInstruction(1, t2)",
    "    loadConstantOrVariable(t2, t5, t0)",
    "    bieq t5, EmptyValueTag, .opProfileTypeDone",
    "    loadp TypeProfilerLog::m_currentLogEntryPtr[t1], t2",
    "    storei t5, (TypeProfilerLog::LogEntry::value + TagOffset)[t2]",
    "    storei t0, (TypeProfilerLog::LogEntry::value + PayloadOffset)[t2]",
    "    loadpFromInstruction(2, t3)",
    "    storep t3, TypeProfilerLog::LogEntry::location[t2]",
    "    bieq t5, CellTag, .opProfileTypeIsCell",
    "    storei 0, TypeProfilerLog::LogEntry::structureID[t2]",
    "    jmp .opProfileTypeSkipIsCell",
    ".opProfileTypeIsCell:",
    "    loadi JSCell::m_structureID[t0], t3",
    "    storei t3, TypeProfilerLog::LogEntry::structureID[t2]",
    ".opProfileTypeSkipIsCell:",
    "    addp sizeof TypeProfilerLog::LogEntry, t2",
    "    storep t2, TypeProfilerLog::m_currentLogEntryPtr[t1]",
    "    loadp TypeProfilerLog::m_logEndPtr[t1], t1",
    "    bpneq t2, t1, .opProfileTypeDone",
    "    callOpcodeSlowPath(_slow_path_profile_type_clear_log)",
    ".opProfileTypeDone:",
    "    dispatch(6)",
    "_llint_op_profile_control_flow:",
    "    traceExecution()",
    "    loadpFromInstruction(1, t0)",
    "    loadi BasicBlockLocation::m_executionCount[t0], t1",
    "    addi 1, t1",
    "    bieq t1, 0, .done",
    "    storei t1, BasicBlockLocation::m_executionCount[t0]",
    ".done:",
    "    dispatch(2)",
    "_llint_op_get_rest_length:",
    "    traceExecution()",
    "    loadi (PayloadOffset + ArgumentCount)[cfr], t0",
    "    subi 1, t0",
    "    loadisFromInstruction(2, t1)",
    "    bilteq t0, t1, .storeZero",
    "    subi t1, t0",
    "    jmp .finish",
    ".storeZero:",
    "    move 0, t0",
    ".finish:",
    "    loadisFromInstruction(1, t1)",
    "    storei t0, PayloadOffset[cfr, t1, 8]",
    "    storei Int32Tag, TagOffset[cfr, t1, 8]",
    "    dispatch(3)",
    "_llint_op_log_shadow_chicken_prologue:",
    "    traceExecution()",
    "    acquireShadowChickenPacket(.opLogShadowChickenPrologueSlow)",
    "    storep cfr, ShadowChicken::Packet::frame[t0]",
    "    loadp CallerFrame[cfr], t1",
    "    storep t1, ShadowChicken::Packet::callerFrame[t0]",
    "    loadp (Callee + PayloadOffset)[cfr], t1",
    "    storep t1, ShadowChicken::Packet::callee[t0]",
    "    loadisFromInstruction(1, t1)",
    "    loadi PayloadOffset[cfr, t1, 8], t1",
    "    storep t1, ShadowChicken::Packet::scope[t0]",
    "    dispatch(2)",
    ".opLogShadowChickenPrologueSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_log_shadow_chicken_prologue)",
    "    dispatch(2)",
    "_llint_op_log_shadow_chicken_tail:",
    "    traceExecution()",
    "    acquireShadowChickenPacket(.opLogShadowChickenTailSlow)",
    "    storep cfr, ShadowChicken::Packet::frame[t0]",
    "    storep ShadowChickenTailMarker, ShadowChicken::Packet::callee[t0]",
    "    loadVariable(1, t3, t2, t1)",
    "    storei t2, (TagOffset + ShadowChicken::Packet::thisValue)[t0]",
    "    storei t1, (PayloadOffset + ShadowChicken::Packet::thisValue)[t0]",
    "    loadisFromInstruction(2, t1)",
    "    loadi PayloadOffset[cfr, t1, 8], t1",
    "    storep t1, ShadowChicken::Packet::scope[t0]",
    "    loadp CodeBlock[cfr], t1",
    "    storep t1, ShadowChicken::Packet::codeBlock[t0]",
    "    storei PC, ShadowChicken::Packet::callSiteIndex[t0]",
    "    dispatch(3)",
    ".opLogShadowChickenTailSlow:",
    "    callOpcodeSlowPath(_llint_slow_path_log_shadow_chicken_tail)",
    "    dispatch(3)",
    "end",
    "_llint_op_create_direct_arguments:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_create_direct_arguments)",
    "    dispatch(constexpr (op_create_direct_arguments_length))",
    "_llint_op_create_scoped_arguments:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_create_scoped_arguments)",
    "    dispatch(constexpr (op_create_scoped_arguments_length))",
    "_llint_op_create_cloned_arguments:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_create_cloned_arguments)",
    "    dispatch(constexpr (op_create_cloned_arguments_length))",
    "_llint_op_create_this:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_create_this)",
    "    dispatch(constexpr (op_create_this_length))",
    "_llint_op_new_object:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_new_object)",
    "    dispatch(constexpr (op_new_object_length))",
    "_llint_op_new_func:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_new_func)",
    "    dispatch(constexpr (op_new_func_length))",
    "_llint_op_new_generator_func:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_new_generator_func)",
    "    dispatch(constexpr (op_new_generator_func_length))",
    "_llint_op_new_async_func:",
    "    traceExecution()",
    "    callSlowPath(_llint_slow_path_new_async_func)",
    "    dispatch(constexpr (op_new_async_func_length))",
    "_llint_op_new_array:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_new_array)",
    "    dispatch(constexpr (op_new_array_length))",
    "_llint_op_new_array_with_spread:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_new_array_with_spread)",
    "    dispatch(constexpr (op_new_array_with_spread_length))",
    "_llint_op_spread:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_spread)",
    "    dispatch(constexpr (op_spread_length))",
    "_llint_op_new_array_with_size:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_new_array_with_size)",
    "    dispatch(constexpr (op_new_array_with_size_length))",
    "_llint_op_new_array_buffer:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_new_array_buffer)",
    "    dispatch(constexpr (op_new_array_buffer_length))",
    "_llint_op_new_regexp:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_new_regexp)",
    "    dispatch(constexpr (op_new_regexp_length))",
    "_llint_op_less:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_less)",
    "    dispatch(constexpr (op_less_length))",
    "_llint_op_lesseq:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_lesseq)",
    "    dispatch(constexpr (op_lesseq_length))",
    "_llint_op_greater:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_greater)",
    "    dispatch(constexpr (op_greater_length))",
    "_llint_op_greatereq:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_greatereq)",
    "    dispatch(constexpr (op_greatereq_length))",
    "_llint_op_mod:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_mod)",
    "    dispatch(constexpr (op_mod_length))",
    "_llint_op_pow:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_pow)",
    "    dispatch(constexpr (op_pow_length))",
    "_llint_op_typeof:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_typeof)",
    "    dispatch(constexpr (op_typeof_length))",
    "_llint_op_is_object_or_null:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_is_object_or_null)",
    "    dispatch(constexpr (op_is_object_or_null_length))",
    "_llint_op_is_function:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_is_function)",
    "    dispatch(constexpr (op_is_function_length))",
    "_llint_op_in:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_in)",
    "    dispatch(constexpr (op_in_length))",
    "_llint_op_try_get_by_id:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_try_get_by_id)",
    "    dispatch(constexpr (op_try_get_by_id_length))",
    "_llint_op_del_by_id:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_del_by_id)",
    "    dispatch(constexpr (op_del_by_id_length))",
    "_llint_op_del_by_val:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_del_by_val)",
    "    dispatch(constexpr (op_del_by_val_length))",
    "_llint_op_put_by_index:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_put_by_index)",
    "    dispatch(constexpr (op_put_by_index_length))",
    "_llint_op_put_getter_by_id:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_put_getter_by_id)",
    "    dispatch(constexpr (op_put_getter_by_id_length))",
    "_llint_op_put_setter_by_id:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_put_setter_by_id)",
    "    dispatch(constexpr (op_put_setter_by_id_length))",
    "_llint_op_put_getter_setter_by_id:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_put_getter_setter_by_id)",
    "    dispatch(constexpr (op_put_getter_setter_by_id_length))",
    "_llint_op_put_getter_by_val:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_put_getter_by_val)",
    "    dispatch(constexpr (op_put_getter_by_val_length))",
    "_llint_op_put_setter_by_val:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_put_setter_by_val)",
    "    dispatch(constexpr (op_put_setter_by_val_length))",
    "_llint_op_define_data_property:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_define_data_property)",
    "    dispatch(constexpr (op_define_data_property_length))",
    "_llint_op_define_accessor_property:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_define_accessor_property)",
    "    dispatch(constexpr (op_define_accessor_property_length))",
    "_llint_op_jtrue:",
    "    traceExecution()",
    "    jumpTrueOrFalse(macro (value, target)",
    "    btinz value, target",
    "end, _llint_slow_path_jtrue)",
    "_llint_op_jfalse:",
    "    traceExecution()",
    "    jumpTrueOrFalse(macro (value, target)",
    "    btiz value, target",
    "end, _llint_slow_path_jfalse)",
    "_llint_op_jless:",
    "    traceExecution()",
    "    compare(macro (left, right, target)",
    "    bilt left, right, target",
    "end, macro (left, right, target)",
    "    bdlt left, right, target",
    "end, _llint_slow_path_jless)",
    "_llint_op_jnless:",
    "    traceExecution()",
    "    compare(macro (left, right, target)",
    "    bigteq left, right, target",
    "end, macro (left, right, target)",
    "    bdgtequn left, right, target",
    "end, _llint_slow_path_jnless)",
    "_llint_op_jgreater:",
    "    traceExecution()",
    "    compare(macro (left, right, target)",
    "    bigt left, right, target",
    "end, macro (left, right, target)",
    "    bdgt left, right, target",
    "end, _llint_slow_path_jgreater)",
    "_llint_op_jngreater:",
    "    traceExecution()",
    "    compare(macro (left, right, target)",
    "    bilteq left, right, target",
    "end, macro (left, right, target)",
    "    bdltequn left, right, target",
    "end, _llint_slow_path_jngreater)",
    "_llint_op_jlesseq:",
    "    traceExecution()",
    "    compare(macro (left, right, target)",
    "    bilteq left, right, target",
    "end, macro (left, right, target)",
    "    bdlteq left, right, target",
    "end, _llint_slow_path_jlesseq)",
    "_llint_op_jnlesseq:",
    "    traceExecution()",
    "    compare(macro (left, right, target)",
    "    bigt left, right, target",
    "end, macro (left, right, target)",
    "    bdgtun left, right, target",
    "end, _llint_slow_path_jnlesseq)",
    "_llint_op_jgreatereq:",
    "    traceExecution()",
    "    compare(macro (left, right, target)",
    "    bigteq left, right, target",
    "end, macro (left, right, target)",
    "    bdgteq left, right, target",
    "end, _llint_slow_path_jgreatereq)",
    "_llint_op_jngreatereq:",
    "    traceExecution()",
    "    compare(macro (left, right, target)",
    "    bilt left, right, target",
    "end, macro (left, right, target)",
    "    bdltun left, right, target",
    "end, _llint_slow_path_jngreatereq)",
    "_llint_op_loop_hint:",
    "    traceExecution()",
    "    checkSwitchToJITForLoop()",
    "    dispatch(constexpr (op_loop_hint_length))",
    "_llint_op_check_traps:",
    "    traceExecution()",
    "    loadp CodeBlock[cfr], t1",
    "    loadp CodeBlock::m_vm[t1], t1",
    "    loadb (VM::m_traps + VMTraps::m_needTrapHandling)[t1], t0",
    "    btpnz t0, .handleTraps",
    ".afterHandlingTraps:",
    "    dispatch(constexpr (op_check_traps_length))",
    ".handleTraps:",
    "    callTrapHandler(.throwHandler)",
    "    jmp .afterHandlingTraps",
    ".throwHandler:",
    "    jmp _llint_throw_from_slow_path_trampoline",
    "macro acquireShadowChickenPacket(slow)",
    "    loadp CodeBlock[cfr], t1",
    "    loadp CodeBlock::m_vm[t1], t1",
    "    loadp VM::m_shadowChicken[t1], t2",
    "    loadp ShadowChicken::m_logCursor[t2], t0",
    "    bpaeq t0, ShadowChicken::m_logEnd[t2], slow",
    "    addp sizeof ShadowChicken::Packet, t0, t1",
    "    storep t1, ShadowChicken::m_logCursor[t2]",
    "end",
    "_llint_op_nop:",
    "    dispatch(constexpr (op_nop_length))",
    "_llint_op_switch_string:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_switch_string)",
    "    dispatch(0)",
    "_llint_op_new_func_exp:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_new_func_exp)",
    "    dispatch(constexpr (op_new_func_exp_length))",
    "_llint_op_new_generator_func_exp:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_new_generator_func_exp)",
    "    dispatch(constexpr (op_new_generator_func_exp_length))",
    "_llint_op_new_async_func_exp:",
    "    traceExecution()",
    "    callSlowPath(_llint_slow_path_new_async_func_exp)",
    "    dispatch(constexpr (op_new_async_func_exp_length))",
    "_llint_op_set_function_name:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_set_function_name)",
    "    dispatch(constexpr (op_set_function_name_length))",
    "_llint_op_call:",
    "    traceExecution()",
    "    arrayProfileForCall()",
    "    doCall(_llint_slow_path_call, prepareForRegularCall)",
    "_llint_op_tail_call:",
    "    traceExecution()",
    "    arrayProfileForCall()",
    "    checkSwitchToJITForEpilogue()",
    "    doCall(_llint_slow_path_call, prepareForTailCall)",
    "_llint_op_construct:",
    "    traceExecution()",
    "    doCall(_llint_slow_path_construct, prepareForRegularCall)",
    "macro doCallVarargs(frameSlowPath, slowPath, prepareCall)",
    "    callOpcodeSlowPath(frameSlowPath)",
    "    branchIfException(_llint_throw_from_slow_path_trampoline)",
    "if JSVALUE64",
    "    move r1, sp",
    "else",
    "if ARMv7",
    "    subp r1, CallerFrameAndPCSize, t2",
    "    move t2, sp",
    "else",
    "    subp r1, CallerFrameAndPCSize, sp",
    "end",
    "end",
    "    slowPathForCall(slowPath, prepareCall)",
    "end",
    "_llint_op_call_varargs:",
    "    traceExecution()",
    "    doCallVarargs(_llint_slow_path_size_frame_for_varargs, _llint_slow_path_call_varargs, prepareForRegularCall)",
    "_llint_op_tail_call_varargs:",
    "    traceExecution()",
    "    checkSwitchToJITForEpilogue()",
    "    doCallVarargs(_llint_slow_path_size_frame_for_varargs, _llint_slow_path_call_varargs, prepareForTailCall)",
    "_llint_op_tail_call_forward_arguments:",
    "    traceExecution()",
    "    checkSwitchToJITForEpilogue()",
    "    doCallVarargs(_llint_slow_path_size_frame_for_forward_arguments, _llint_slow_path_tail_call_forward_arguments, prepareForTailCall)",
    "_llint_op_construct_varargs:",
    "    traceExecution()",
    "    doCallVarargs(_llint_slow_path_size_frame_for_varargs, _llint_slow_path_construct_varargs, prepareForRegularCall)",
    "_llint_op_call_eval:",
    "    traceExecution()",
    "    slowPathForCall(_llint_slow_path_call_eval, prepareForRegularCall)",
    "_llint_generic_return_point:",
    "    dispatchAfterCall()",
    "_llint_op_strcat:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_strcat)",
    "    dispatch(constexpr (op_strcat_length))",
    "_llint_op_push_with_scope:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_push_with_scope)",
    "    dispatch(constexpr (op_push_with_scope_length))",
    "_llint_op_assert:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_assert)",
    "    dispatch(constexpr (op_assert_length))",
    "_llint_op_unreachable:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_unreachable)",
    "    dispatch(constexpr (op_unreachable_length))",
    "_llint_op_yield:",
    "    notSupported()",
    "_llint_op_create_lexical_environment:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_create_lexical_environment)",
    "    dispatch(constexpr (op_create_lexical_environment_length))",
    "_llint_op_throw:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_throw)",
    "    dispatch(constexpr (op_throw_length))",
    "_llint_op_throw_static_error:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_throw_static_error)",
    "    dispatch(constexpr (op_throw_static_error_length))",
    "_llint_op_debug:",
    "    traceExecution()",
    "    loadp CodeBlock[cfr], t0",
    "    loadi CodeBlock::m_debuggerRequests[t0], t0",
    "    btiz t0, .opDebugDone",
    "    callOpcodeSlowPath(_llint_slow_path_debug)",
    ".opDebugDone:",
    "    dispatch(constexpr (op_debug_length))",
    "_llint_native_call_trampoline:",
    "    nativeCallTrampoline(NativeExecutable::m_function)",
    "_llint_native_construct_trampoline:",
    "    nativeCallTrampoline(NativeExecutable::m_constructor)",
    "_llint_op_get_enumerable_length:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_get_enumerable_length)",
    "    dispatch(constexpr (op_get_enumerable_length_length))",
    "_llint_op_has_indexed_property:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_has_indexed_property)",
    "    dispatch(constexpr (op_has_indexed_property_length))",
    "_llint_op_has_structure_property:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_has_structure_property)",
    "    dispatch(constexpr (op_has_structure_property_length))",
    "_llint_op_has_generic_property:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_has_generic_property)",
    "    dispatch(constexpr (op_has_generic_property_length))",
    "_llint_op_get_direct_pname:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_get_direct_pname)",
    "    dispatch(constexpr (op_get_direct_pname_length))",
    "_llint_op_get_property_enumerator:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_get_property_enumerator)",
    "    dispatch(constexpr (op_get_property_enumerator_length))",
    "_llint_op_enumerator_structure_pname:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_next_structure_enumerator_pname)",
    "    dispatch(constexpr (op_enumerator_structure_pname_length))",
    "_llint_op_enumerator_generic_pname:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_next_generic_enumerator_pname)",
    "    dispatch(constexpr (op_enumerator_generic_pname_length))",
    "_llint_op_to_index_string:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_to_index_string)",
    "    dispatch(constexpr (op_to_index_string_length))",
    "_llint_op_create_rest:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_create_rest)",
    "    dispatch(constexpr (op_create_rest_length))",
    "_llint_op_instanceof:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_llint_slow_path_instanceof)",
    "    dispatch(constexpr (op_instanceof_length))",
    "_llint_op_get_by_id_with_this:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_get_by_id_with_this)",
    "    dispatch(constexpr (op_get_by_id_with_this_length))",
    "_llint_op_get_by_val_with_this:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_get_by_val_with_this)",
    "    dispatch(constexpr (op_get_by_val_with_this_length))",
    "_llint_op_put_by_id_with_this:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_put_by_id_with_this)",
    "    dispatch(constexpr (op_put_by_id_with_this_length))",
    "_llint_op_put_by_val_with_this:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_put_by_val_with_this)",
    "    dispatch(constexpr (op_put_by_val_with_this_length))",
    "_llint_op_resolve_scope_for_hoisting_func_decl_in_eval:",
    "    traceExecution()",
    "    callOpcodeSlowPath(_slow_path_resolve_scope_for_hoisting_func_decl_in_eval)",
    "    dispatch(constexpr (op_resolve_scope_for_hoisting_func_decl_in_eval_length))",
    "macro notSupported()",
    "if ASSERT_ENABLED",
    "    crash()",
    "else",
    "    break ",
    "end",
    "end"
];

// --- JetStreamExtra/RexBench/OfflineAssembler/benchmark.js ---

/*
 * Copyright (C) 2017 Apple Inc. All rights reserved.
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
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. 
 */
"use strict";

class Benchmark {
    constructor()
    {
        this.ast = undefined;
    }

    runIteration()
    {
        resetAST();
        this.ast = parse("LowLevelInterpreter.asm");
    }

    validate(iterations)
    {
        let astDumpedAsLines = this.ast.dump().split("\n");

        if (astDumpedAsLines.length != expectedASTDumpedAsLines.length) {
            throw("Actual number of lines (" + astDumpedAsLines.length + ") differs from expected number of lines(" + expectedASTDumpedAsLines.length + ")");
        }

        let index = 0;
        for (let line of astDumpedAsLines) {
            let expectedLine = expectedASTDumpedAsLines[index];
            if (line != expectedLine)
                throw("Line #" + (index + 1) + " differs.  Expected: \"" + expectedLine + "\", got \"" + line + "\"");
            index++;
        }
    }
}
JetStreamExtra_run({
    BenchmarkCtor: Benchmark,
    iterations: 2,
}).catch(JetStreamExtra_fail);
