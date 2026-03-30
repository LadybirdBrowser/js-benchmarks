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
// --- JetStreamExtra/bigint/bigdenary-bundle.js ---

// MIT License

// Copyright (c) 2020 U-Zyn Chua <chua@uzyn.com>

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

globalThis.BigDenary = (function () {
    'use strict';

    function bigIntAbs(n) {
        if (n >= 0n) {
            return n;
        }
        return n * -1n;
    }
    function getDecimals(n) {
        if (isNaN(n)) {
            throw new Error("InvalidNumber");
        }
        const [preDec, postDec] = _splitString(n.toString(), ".");
        return postDec.length;
    }
    function extractExp(n) {
        const [mul, expStr] = _splitString(n, "e");
        if (expStr === "") {
            return [n, 0];
        }
        const exp = parseInt(expStr, 10);
        if (isNaN(exp)) {
            throw new Error("InvalidNumber");
        }
        return [mul, exp];
    }
    function countTrailingZeros(n, upTo) {
        if (n === 0n) {
            return 0;
        }
        let count = 0;
        let c = n < 0 ? n * -1n : n;
        while (c % 10n === 0n && count < upTo) {
            count += 1;
            c = c / 10n;
        }
        return count;
    }
    function _splitString(input, char) {
        const pos = input.indexOf(char);
        if (pos === -1) {
            return [input, ""];
        }
        const after = input.substr(pos + 1);
        if (after.indexOf(char) !== -1) {
            throw new Error("InvalidNumber"); // Multiple occurences
        }
        return [input.substr(0, pos), after];
    }

    const BDCompare = {
        Greater: 1,
        Less: -1,
        Equal: 0,
    };

    class BigDenary {
        constructor(n) {
            if (n instanceof BigDenary) {
                this.base = n.base;
                this._decimals = n.decimals;
            }
            else if (typeof n === "number") {
                this._decimals = getDecimals(n);
                this.base = BigInt(n * Math.pow(10, this._decimals));
            }
            else if (typeof n === "string") {
                const [mul, exp] = extractExp(n);
                const mulDec = getDecimals(mul);
                if (exp > mulDec) {
                    this.base = BigInt(mul.replace(".", "")) *
                        BigInt(Math.pow(10, (exp - mulDec)));
                    this._decimals = 0;
                }
                else {
                    this.base = BigInt(mul.replace(".", ""));
                    this._decimals = mulDec - exp;
                }
            }
            else if (typeof n === "bigint") {
                this.base = n * this.decimalMultiplier;
                this._decimals = 0;
            }
            else if (typeof n === "object" && n !== null) {
                if (n.decimals < 0) {
                    throw new Error("InvalidBigDenaryRaw");
                }
                this.base = n.base;
                this._decimals = n.decimals;
            }
            else {
                throw new Error("UnsupportedInput");
            }
            this.trimTrailingZeros();
        }
        toString() {
            if (this.base === 0n) {
                return "0";
            }
            const negative = (this.base < 0);
            let base = this.base;
            if (negative) {
                base = base * -1n;
            }
            const baseStr = base.toString();
            const position = baseStr.length - this._decimals;
            let pre;
            let post;
            if (position < 0) {
                pre = "";
                post = `${_strOfZeros(position * -1)}${baseStr}`;
            }
            else {
                pre = baseStr.substr(0, position);
                post = baseStr.substr(position);
            }
            let result;
            if (pre.length === 0) {
                result = `0.${post}`;
            }
            else if (post.length === 0) {
                result = `${pre}`;
            }
            else {
                result = `${pre}.${post}`;
            }
            if (negative) {
                return `-${result}`;
            }
            return result;
        }
        valueOf() {
            return Number.parseFloat(this.toString());
        }
        toFixed(digits) {
            if (!digits) {
                return this.toString();
            }
            const temp = new BigDenary(this);
            temp.scaleDecimalsTo(digits);
            return temp.toString();
        }
        get decimals() {
            return this._decimals;
        }
        /**
         * Alters the decimal places, actual underlying value does not change
         */
        scaleDecimalsTo(_decimals) {
            if (_decimals > this._decimals) {
                this.base = this.base *
                    BigDenary.getDecimalMultiplier(_decimals - this._decimals);
            }
            else if (_decimals < this._decimals) {
                const adjust = this._decimals - _decimals;
                const multiplier = BigDenary.getDecimalMultiplier(adjust);
                const remainder = this.base % multiplier;
                this.base = this.base / multiplier;
                if (bigIntAbs(remainder * 2n) >= multiplier) {
                    if (this.base >= 0) {
                        this.base += 1n;
                    }
                    else {
                        this.base -= 1n;
                    }
                }
            }
            this._decimals = _decimals;
        }
        get decimalMultiplier() {
            return BigDenary.getDecimalMultiplier(this._decimals);
        }
        static getDecimalMultiplier(decimals) {
            return 10n ** BigInt(decimals);
        }
        trimTrailingZeros() {
            const trailingZerosCount = countTrailingZeros(this.base, this.decimals);
            if (trailingZerosCount > 0) {
                this.scaleDecimalsTo(this.decimals - trailingZerosCount);
            }
        }
        /**
         * Operations
         */
        plus(operand) {
            const curr = new BigDenary(this);
            const oper = new BigDenary(operand);
            const targetDecs = Math.max(curr.decimals, oper.decimals);
            curr.scaleDecimalsTo(targetDecs);
            oper.scaleDecimalsTo(targetDecs);
            return new BigDenary({
                base: curr.base + oper.base,
                decimals: targetDecs,
            });
        }
        minus(operand) {
            return this.plus((new BigDenary(operand)).negated());
        }
        multipliedBy(operand) {
            const curr = new BigDenary(this);
            const oper = new BigDenary(operand);
            const targetDecs = curr.decimals + oper.decimals;
            return new BigDenary({
                base: curr.base * oper.base,
                decimals: targetDecs,
            });
        }
        dividedBy(operand) {
            const MIN_DIVIDE_DECIMALS = 20;
            const curr = new BigDenary(this);
            const oper = new BigDenary(operand);
            const targetDecs = Math.max(curr.decimals * 2, oper.decimals * 2, MIN_DIVIDE_DECIMALS);
            curr.scaleDecimalsTo(targetDecs);
            return new BigDenary({
                base: curr.base / oper.base,
                decimals: curr.decimals - oper.decimals,
            });
        }
        negated() {
            return new BigDenary({
                base: this.base * -1n,
                decimals: this.decimals,
            });
        }
        absoluteValue() {
            if (this.base >= 0n) {
                return this;
            }
            return this.negated();
        }
        /**
         * Comparisons
         */
        comparedTo(comparator) {
            const curr = new BigDenary(this);
            const comp = new BigDenary(comparator);
            const targetDecs = Math.max(curr.decimals, comp.decimals);
            curr.scaleDecimalsTo(targetDecs);
            comp.scaleDecimalsTo(targetDecs);
            if (curr.base > comp.base) {
                return BDCompare.Greater;
            }
            else if (curr.base < comp.base) {
                return BDCompare.Less;
            }
            return BDCompare.Equal;
        }
        equals(comparator) {
            return (this.comparedTo(comparator) === BDCompare.Equal);
        }
        greaterThan(comparator) {
            return (this.comparedTo(comparator) === BDCompare.Greater);
        }
        greaterThanOrEqualTo(comparator) {
            return ((this.comparedTo(comparator) === BDCompare.Greater) ||
                (this.comparedTo(comparator) === BDCompare.Equal));
        }
        lessThan(comparator) {
            return (this.comparedTo(comparator) === BDCompare.Less);
        }
        lessThanOrEqualTo(comparator) {
            return ((this.comparedTo(comparator) === BDCompare.Less) ||
                (this.comparedTo(comparator) === BDCompare.Equal));
        }
        /**
         * Shortforms
         */
        add(operand) {
            return this.plus(operand);
        }
        sub(operand) {
            return this.minus(operand);
        }
        mul(operand) {
            return this.multipliedBy(operand);
        }
        div(operand) {
            return this.dividedBy(operand);
        }
        neg() {
            return this.negated();
        }
        abs() {
            return this.absoluteValue();
        }
        cmp(comparator) {
            return this.comparedTo(comparator);
        }
        eq(comparator) {
            return this.equals(comparator);
        }
        gt(comparator) {
            return this.greaterThan(comparator);
        }
        gte(comparator) {
            return this.greaterThanOrEqualTo(comparator);
        }
        lt(comparator) {
            return this.lessThan(comparator);
        }
        lte(comparator) {
            return this.lessThanOrEqualTo(comparator);
        }
    }
    function _strOfZeros(count) {
        return "0".repeat(count);
    }

    BigDenary.BDCompare = BDCompare;

    return BigDenary;

})();

// --- JetStreamExtra/bigint/bigdenary-benchmark.js ---

/*
 * Copyright (C) 2022 Apple Inc. All rights reserved.
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
 
const bd1 = new BigDenary('8965168485622506189945604.1235068121348084163185216');
const bd2 = new BigDenary('2480986213549488579706531.6546845013548451265890628');
const bdEquals = (a, b) => a.equals(b);

function areFirstAndLastResultsEqual(bdThunk, areEqual = bdEquals) {
    const firstResult = bdThunk();

    var lastResult;
    for (var i = 0; i < 1e4; i++)
        lastResult = bdThunk();

    return areEqual(firstResult, lastResult);
}

class Benchmark {
    constructor() {
        this._verbose = false;
        this._allFirstAndLastResultsAreEqual = true;
    }

    runIteration() {
        this._allFirstAndLastResultsAreEqual &&=
            areFirstAndLastResultsEqual(() => bd1.plus(bd2)) &&
            areFirstAndLastResultsEqual(() => bd1.minus(bd2)) &&
            areFirstAndLastResultsEqual(() => bd1.negated()) &&
            areFirstAndLastResultsEqual(() => bd1.comparedTo(bd2), Object.is) &&
            areFirstAndLastResultsEqual(() => bd1.multipliedBy(bd2)) &&
            areFirstAndLastResultsEqual(() => bd1.dividedBy(bd2));
    }

    validate(iterations) {
        if (!this._allFirstAndLastResultsAreEqual)
            throw new Error("Expected all first and last results to be equal, but they aren't.");
    }
}
JetStreamExtra_run({
    BenchmarkCtor: Benchmark,
    iterations: 10,
}).catch(JetStreamExtra_fail);
