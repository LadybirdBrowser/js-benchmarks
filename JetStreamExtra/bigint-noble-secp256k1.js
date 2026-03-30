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
// --- JetStreamExtra/bigint/web-crypto-sham.js ---

// The MIT License

// Copyright (c) 2013 Dominic Tarr

// Permission is hereby granted, free of charge, 
// to any person obtaining a copy of this software and 
// associated documentation files (the "Software"), to 
// deal in the Software without restriction, including 
// without limitation the rights to use, copy, modify, 
// merge, publish, distribute, sublicense, and/or sell 
// copies of the Software, and to permit persons to whom 
// the Software is furnished to do so, 
// subject to the following conditions:

// The above copyright notice and this permission notice 
// shall be included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. 
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR 
// ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, 
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const shajs = require("sha.js");
const createHmac = require("create-hmac");
const webCryptoSham = {
    getRandomValues(array) {
        if (!(array instanceof Int8Array || array instanceof Uint8Array || array instanceof Int16Array || array instanceof Uint16Array || array instanceof Int32Array || array instanceof Uint32Array || array instanceof Uint8ClampedArray))
            throw new TypeError('Expected an integer array');

        if (array.byteLength > 65536)
            throw new RangeError('Can only request a maximum of 65536 bytes');

        var i = 0, r;

        for (; i < array.length; i++) {
            if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
            array[i] = (r >>> ((i & 0x03) << 3)) & 0xff;
        }

        return array;
    },

    subtle: {
        async digest(algorithm, data) {
            if (data instanceof ArrayBuffer)
                throw new TypeError(`ArrayBuffer data is not supported.`);

            let internalAlgorithm;
            switch (algorithm) {
                case "SHA-256":
                    internalAlgorithm = "sha256";
                    break;
                case "SHA-512":
                    internalAlgorithm = "sha512";
                    break;
                default:
                    throw new TypeError(`Unsupported digest() algorithm: ${algorithm}.`);
            }
            return shajs(internalAlgorithm).update(data).digest();
        },

        async importKey(format, keyData, algorithm, extractable, keyUsages) {
            if (format !== "raw" || algorithm.name !== "HMAC" || algorithm.hash.name !== "SHA-256" || extractable || keyUsages.length !== 1 || keyUsages[0] !== "sign")
                throw new TypeError(`Unsupported importKey() arguments.`);

            return createHmac("sha256", keyData);
        },

        async sign(algorithmName, key, message) {
            if (algorithmName !== "HMAC")
                throw new TypeError(`Unsupported importKey() arguments.`);

            return key.update(message).digest();
        },
    },
};

Object.defineProperty(globalThis, "crypto", {
    value: webCryptoSham,
    writable: false,
    enumerable: true,
    configurable: true,
});

},{"create-hmac":7,"sha.js":34}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],3:[function(require,module,exports){

},{}],4:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":2,"buffer":4,"ieee754":27}],5:[function(require,module,exports){
var Buffer = require('safe-buffer').Buffer
var Transform = require('stream').Transform
var StringDecoder = require('string_decoder').StringDecoder
var inherits = require('inherits')

function CipherBase (hashMode) {
  Transform.call(this)
  this.hashMode = typeof hashMode === 'string'
  if (this.hashMode) {
    this[hashMode] = this._finalOrDigest
  } else {
    this.final = this._finalOrDigest
  }
  if (this._final) {
    this.__final = this._final
    this._final = null
  }
  this._decoder = null
  this._encoding = null
}
inherits(CipherBase, Transform)

CipherBase.prototype.update = function (data, inputEnc, outputEnc) {
  if (typeof data === 'string') {
    data = Buffer.from(data, inputEnc)
  }

  var outData = this._update(data)
  if (this.hashMode) return this

  if (outputEnc) {
    outData = this._toString(outData, outputEnc)
  }

  return outData
}

CipherBase.prototype.setAutoPadding = function () {}
CipherBase.prototype.getAuthTag = function () {
  throw new Error('trying to get auth tag in unsupported state')
}

CipherBase.prototype.setAuthTag = function () {
  throw new Error('trying to set auth tag in unsupported state')
}

CipherBase.prototype.setAAD = function () {
  throw new Error('trying to set aad in unsupported state')
}

CipherBase.prototype._transform = function (data, _, next) {
  var err
  try {
    if (this.hashMode) {
      this._update(data)
    } else {
      this.push(this._update(data))
    }
  } catch (e) {
    err = e
  } finally {
    next(err)
  }
}
CipherBase.prototype._flush = function (done) {
  var err
  try {
    this.push(this.__final())
  } catch (e) {
    err = e
  }

  done(err)
}
CipherBase.prototype._finalOrDigest = function (outputEnc) {
  var outData = this.__final() || Buffer.alloc(0)
  if (outputEnc) {
    outData = this._toString(outData, outputEnc, true)
  }
  return outData
}

CipherBase.prototype._toString = function (value, enc, fin) {
  if (!this._decoder) {
    this._decoder = new StringDecoder(enc)
    this._encoding = enc
  }

  if (this._encoding !== enc) throw new Error('can\'t switch encodings')

  var out = this._decoder.write(value)
  if (fin) {
    out += this._decoder.end()
  }

  return out
}

module.exports = CipherBase

},{"inherits":28,"safe-buffer":32,"stream":41,"string_decoder":57}],6:[function(require,module,exports){
var MD5 = require('md5.js')

module.exports = function (buffer) {
  return new MD5().update(buffer).digest()
}

},{"md5.js":29}],7:[function(require,module,exports){
'use strict'
var inherits = require('inherits')
var Legacy = require('./legacy')
var Base = require('cipher-base')
var Buffer = require('safe-buffer').Buffer
var md5 = require('create-hash/md5')
var RIPEMD160 = require('ripemd160')

var sha = require('sha.js')

var ZEROS = Buffer.alloc(128)

function Hmac (alg, key) {
  Base.call(this, 'digest')
  if (typeof key === 'string') {
    key = Buffer.from(key)
  }

  var blocksize = (alg === 'sha512' || alg === 'sha384') ? 128 : 64

  this._alg = alg
  this._key = key
  if (key.length > blocksize) {
    var hash = alg === 'rmd160' ? new RIPEMD160() : sha(alg)
    key = hash.update(key).digest()
  } else if (key.length < blocksize) {
    key = Buffer.concat([key, ZEROS], blocksize)
  }

  var ipad = this._ipad = Buffer.allocUnsafe(blocksize)
  var opad = this._opad = Buffer.allocUnsafe(blocksize)

  for (var i = 0; i < blocksize; i++) {
    ipad[i] = key[i] ^ 0x36
    opad[i] = key[i] ^ 0x5C
  }
  this._hash = alg === 'rmd160' ? new RIPEMD160() : sha(alg)
  this._hash.update(ipad)
}

inherits(Hmac, Base)

Hmac.prototype._update = function (data) {
  this._hash.update(data)
}

Hmac.prototype._final = function () {
  var h = this._hash.digest()
  var hash = this._alg === 'rmd160' ? new RIPEMD160() : sha(this._alg)
  return hash.update(this._opad).update(h).digest()
}

module.exports = function createHmac (alg, key) {
  alg = alg.toLowerCase()
  if (alg === 'rmd160' || alg === 'ripemd160') {
    return new Hmac('rmd160', key)
  }
  if (alg === 'md5') {
    return new Legacy(md5, key)
  }
  return new Hmac(alg, key)
}

},{"./legacy":8,"cipher-base":5,"create-hash/md5":6,"inherits":28,"ripemd160":31,"safe-buffer":32,"sha.js":34}],8:[function(require,module,exports){
'use strict'
var inherits = require('inherits')
var Buffer = require('safe-buffer').Buffer

var Base = require('cipher-base')

var ZEROS = Buffer.alloc(128)
var blocksize = 64

function Hmac (alg, key) {
  Base.call(this, 'digest')
  if (typeof key === 'string') {
    key = Buffer.from(key)
  }

  this._alg = alg
  this._key = key

  if (key.length > blocksize) {
    key = alg(key)
  } else if (key.length < blocksize) {
    key = Buffer.concat([key, ZEROS], blocksize)
  }

  var ipad = this._ipad = Buffer.allocUnsafe(blocksize)
  var opad = this._opad = Buffer.allocUnsafe(blocksize)

  for (var i = 0; i < blocksize; i++) {
    ipad[i] = key[i] ^ 0x36
    opad[i] = key[i] ^ 0x5C
  }

  this._hash = [ipad]
}

inherits(Hmac, Base)

Hmac.prototype._update = function (data) {
  this._hash.push(data)
}

Hmac.prototype._final = function () {
  var h = this._alg(Buffer.concat(this._hash))
  return this._alg(Buffer.concat([this._opad, h]))
}
module.exports = Hmac

},{"cipher-base":5,"inherits":28,"safe-buffer":32}],9:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}],10:[function(require,module,exports){
'use strict'
var Buffer = require('safe-buffer').Buffer
var Transform = require('readable-stream').Transform
var inherits = require('inherits')

function throwIfNotStringOrBuffer (val, prefix) {
  if (!Buffer.isBuffer(val) && typeof val !== 'string') {
    throw new TypeError(prefix + ' must be a string or a buffer')
  }
}

function HashBase (blockSize) {
  Transform.call(this)

  this._block = Buffer.allocUnsafe(blockSize)
  this._blockSize = blockSize
  this._blockOffset = 0
  this._length = [0, 0, 0, 0]

  this._finalized = false
}

inherits(HashBase, Transform)

HashBase.prototype._transform = function (chunk, encoding, callback) {
  var error = null
  try {
    this.update(chunk, encoding)
  } catch (err) {
    error = err
  }

  callback(error)
}

HashBase.prototype._flush = function (callback) {
  var error = null
  try {
    this.push(this.digest())
  } catch (err) {
    error = err
  }

  callback(error)
}

HashBase.prototype.update = function (data, encoding) {
  throwIfNotStringOrBuffer(data, 'Data')
  if (this._finalized) throw new Error('Digest already called')
  if (!Buffer.isBuffer(data)) data = Buffer.from(data, encoding)

  // consume data
  var block = this._block
  var offset = 0
  while (this._blockOffset + data.length - offset >= this._blockSize) {
    for (var i = this._blockOffset; i < this._blockSize;) block[i++] = data[offset++]
    this._update()
    this._blockOffset = 0
  }
  while (offset < data.length) block[this._blockOffset++] = data[offset++]

  // update length
  for (var j = 0, carry = data.length * 8; carry > 0; ++j) {
    this._length[j] += carry
    carry = (this._length[j] / 0x0100000000) | 0
    if (carry > 0) this._length[j] -= 0x0100000000 * carry
  }

  return this
}

HashBase.prototype._update = function () {
  throw new Error('_update is not implemented')
}

HashBase.prototype.digest = function (encoding) {
  if (this._finalized) throw new Error('Digest already called')
  this._finalized = true

  var digest = this._digest()
  if (encoding !== undefined) digest = digest.toString(encoding)

  // reset state
  this._block.fill(0)
  this._blockOffset = 0
  for (var i = 0; i < 4; ++i) this._length[i] = 0

  return digest
}

HashBase.prototype._digest = function () {
  throw new Error('_digest is not implemented')
}

module.exports = HashBase

},{"inherits":11,"readable-stream":26,"safe-buffer":32}],11:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],12:[function(require,module,exports){
'use strict';

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var codes = {};

function createErrorType(code, message, Base) {
  if (!Base) {
    Base = Error;
  }

  function getMessage(arg1, arg2, arg3) {
    if (typeof message === 'string') {
      return message;
    } else {
      return message(arg1, arg2, arg3);
    }
  }

  var NodeError =
  /*#__PURE__*/
  function (_Base) {
    _inheritsLoose(NodeError, _Base);

    function NodeError(arg1, arg2, arg3) {
      return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
    }

    return NodeError;
  }(Base);

  NodeError.prototype.name = Base.name;
  NodeError.prototype.code = code;
  codes[code] = NodeError;
} // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


function oneOf(expected, thing) {
  if (Array.isArray(expected)) {
    var len = expected.length;
    expected = expected.map(function (i) {
      return String(i);
    });

    if (len > 2) {
      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
    } else if (len === 2) {
      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
    } else {
      return "of ".concat(thing, " ").concat(expected[0]);
    }
  } else {
    return "of ".concat(thing, " ").concat(String(expected));
  }
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


function startsWith(str, search, pos) {
  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


function endsWith(str, search, this_len) {
  if (this_len === undefined || this_len > str.length) {
    this_len = str.length;
  }

  return str.substring(this_len - search.length, this_len) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


function includes(str, search, start) {
  if (typeof start !== 'number') {
    start = 0;
  }

  if (start + search.length > str.length) {
    return false;
  } else {
    return str.indexOf(search, start) !== -1;
  }
}

createErrorType('ERR_INVALID_OPT_VALUE', function (name, value) {
  return 'The value "' + value + '" is invalid for option "' + name + '"';
}, TypeError);
createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
  // determiner: 'must be' or 'must not be'
  var determiner;

  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
    determiner = 'must not be';
    expected = expected.replace(/^not /, '');
  } else {
    determiner = 'must be';
  }

  var msg;

  if (endsWith(name, ' argument')) {
    // For cases like 'first argument'
    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  } else {
    var type = includes(name, '.') ? 'property' : 'argument';
    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  }

  msg += ". Received type ".concat(typeof actual);
  return msg;
}, TypeError);
createErrorType('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF');
createErrorType('ERR_METHOD_NOT_IMPLEMENTED', function (name) {
  return 'The ' + name + ' method is not implemented';
});
createErrorType('ERR_STREAM_PREMATURE_CLOSE', 'Premature close');
createErrorType('ERR_STREAM_DESTROYED', function (name) {
  return 'Cannot call ' + name + ' after a stream was destroyed';
});
createErrorType('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
createErrorType('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable');
createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
createErrorType('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError);
createErrorType('ERR_UNKNOWN_ENCODING', function (arg) {
  return 'Unknown encoding: ' + arg;
}, TypeError);
createErrorType('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event');
module.exports.codes = codes;

},{}],13:[function(require,module,exports){
(function (process){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.
'use strict';
/*<replacement>*/

var objectKeys = Object.keys || function (obj) {
  var keys = [];

  for (var key in obj) {
    keys.push(key);
  }

  return keys;
};
/*</replacement>*/


module.exports = Duplex;

var Readable = require('./_stream_readable');

var Writable = require('./_stream_writable');

require('inherits')(Duplex, Readable);

{
  // Allow the keys array to be GC'ed.
  var keys = objectKeys(Writable.prototype);

  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);
  Readable.call(this, options);
  Writable.call(this, options);
  this.allowHalfOpen = true;

  if (options) {
    if (options.readable === false) this.readable = false;
    if (options.writable === false) this.writable = false;

    if (options.allowHalfOpen === false) {
      this.allowHalfOpen = false;
      this.once('end', onend);
    }
  }
}

Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});
Object.defineProperty(Duplex.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
Object.defineProperty(Duplex.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
}); // the no-half-open enforcer

function onend() {
  // If the writable side ended, then we're ok.
  if (this._writableState.ended) return; // no more data can be written.
  // But allow more writes to happen in this tick.

  process.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }

    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});
}).call(this)}).call(this,require('_process'))
},{"./_stream_readable":15,"./_stream_writable":17,"_process":30,"inherits":11}],14:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.
'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

require('inherits')(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);
  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":16,"inherits":11}],15:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
'use strict';

module.exports = Readable;
/*<replacement>*/

var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;
/*<replacement>*/

var EE = require('events').EventEmitter;

var EElistenerCount = function EElistenerCount(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/


var Stream = require('./internal/streams/stream');
/*</replacement>*/


var Buffer = require('buffer').Buffer;

var OurUint8Array = global.Uint8Array || function () {};

function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}

function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*<replacement>*/


var debugUtil = require('util');

var debug;

if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function debug() {};
}
/*</replacement>*/


var BufferList = require('./internal/streams/buffer_list');

var destroyImpl = require('./internal/streams/destroy');

var _require = require('./internal/streams/state'),
    getHighWaterMark = _require.getHighWaterMark;

var _require$codes = require('../errors').codes,
    ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
    ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF,
    ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT; // Lazy loaded to improve the startup performance.


var StringDecoder;
var createReadableStreamAsyncIterator;
var from;

require('inherits')(Readable, Stream);

var errorOrDestroy = destroyImpl.errorOrDestroy;
var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn); // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.

  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {}; // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.

  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex; // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away

  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode; // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"

  this.highWaterMark = getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex); // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()

  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false; // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.

  this.sync = true; // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.

  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;
  this.paused = true; // Should close be emitted on destroy. Defaults to true.

  this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'end' (and potentially 'finish')

  this.autoDestroy = !!options.autoDestroy; // has it been destroyed

  this.destroyed = false; // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.

  this.defaultEncoding = options.defaultEncoding || 'utf8'; // the number of writers that are awaiting a drain event in .pipe()s

  this.awaitDrain = 0; // if true, a maybeReadMore has been scheduled

  this.readingMore = false;
  this.decoder = null;
  this.encoding = null;

  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');
  if (!(this instanceof Readable)) return new Readable(options); // Checking for a Stream.Duplex instance is faster here instead of inside
  // the ReadableState constructor, at least with V8 6.5

  var isDuplex = this instanceof Duplex;
  this._readableState = new ReadableState(options, this, isDuplex); // legacy

  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined) {
      return false;
    }

    return this._readableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._readableState.destroyed = value;
  }
});
Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;

Readable.prototype._destroy = function (err, cb) {
  cb(err);
}; // Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.


Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;

      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }

      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
}; // Unshift should *always* be something directly out of read()


Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  debug('readableAddChunk', chunk);
  var state = stream._readableState;

  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);

    if (er) {
      errorOrDestroy(stream, er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      } else if (state.destroyed) {
        return false;
      } else {
        state.reading = false;

        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
      maybeReadMore(stream, state);
    }
  } // We can push more data if we are below the highWaterMark.
  // Also, if we have no data yet, we can stand some more bytes.
  // This is to work around cases where hwm=0, such as the repl.


  return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    state.awaitDrain = 0;
    stream.emit('data', chunk);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);
    if (state.needReadable) emitReadable(stream);
  }

  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;

  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk);
  }

  return er;
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
}; // backwards compatibility.


Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  var decoder = new StringDecoder(enc);
  this._readableState.decoder = decoder; // If setEncoding(null), decoder.encoding equals utf8

  this._readableState.encoding = this._readableState.decoder.encoding; // Iterate over current buffer to convert already stored Buffers:

  var p = this._readableState.buffer.head;
  var content = '';

  while (p !== null) {
    content += decoder.write(p.data);
    p = p.next;
  }

  this._readableState.buffer.clear();

  if (content !== '') this._readableState.buffer.push(content);
  this._readableState.length = content.length;
  return this;
}; // Don't raise the hwm > 1GB


var MAX_HWM = 0x40000000;

function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }

  return n;
} // This function is designed to be inlinable, so please take care when making
// changes to the function body.


function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;

  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  } // If we're asking for more than the current hwm, then raise the hwm.


  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n; // Don't have enough

  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }

  return state.length;
} // you can override either this method, or the async _read(n) below.


Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;
  if (n !== 0) state.emittedReadable = false; // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.

  if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state); // if we've ended, and we're now clear, then finish it up.

  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  } // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.
  // if we need a readable event, then we need to do some reading.


  var doRead = state.needReadable;
  debug('need readable', doRead); // if we currently have less than the highWaterMark, then also read some

  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  } // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.


  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true; // if the length is currently zero, then we *need* a readable event.

    if (state.length === 0) state.needReadable = true; // call internal read method

    this._read(state.highWaterMark);

    state.sync = false; // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.

    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = state.length <= state.highWaterMark;
    n = 0;
  } else {
    state.length -= n;
    state.awaitDrain = 0;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true; // If we tried to read() past the EOF, then emit end on the next tick.

    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);
  return ret;
};

function onEofChunk(stream, state) {
  debug('onEofChunk');
  if (state.ended) return;

  if (state.decoder) {
    var chunk = state.decoder.end();

    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }

  state.ended = true;

  if (state.sync) {
    // if we are sync, wait until next tick to emit the data.
    // Otherwise we risk emitting data in the flow()
    // the readable code triggers during a read() call
    emitReadable(stream);
  } else {
    // emit 'readable' now to make sure it gets picked up.
    state.needReadable = false;

    if (!state.emittedReadable) {
      state.emittedReadable = true;
      emitReadable_(stream);
    }
  }
} // Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.


function emitReadable(stream) {
  var state = stream._readableState;
  debug('emitReadable', state.needReadable, state.emittedReadable);
  state.needReadable = false;

  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    process.nextTick(emitReadable_, stream);
  }
}

function emitReadable_(stream) {
  var state = stream._readableState;
  debug('emitReadable_', state.destroyed, state.length, state.ended);

  if (!state.destroyed && (state.length || state.ended)) {
    stream.emit('readable');
    state.emittedReadable = false;
  } // The stream needs another readable event if
  // 1. It is not flowing, as the flow mechanism will take
  //    care of it.
  // 2. It is not ended.
  // 3. It is below the highWaterMark, so we can schedule
  //    another readable later.


  state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
  flow(stream);
} // at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.


function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  // Attempt to read more data if we should.
  //
  // The conditions for reading more data are (one of):
  // - Not enough data buffered (state.length < state.highWaterMark). The loop
  //   is responsible for filling the buffer with enough data if such data
  //   is available. If highWaterMark is 0 and we are not in the flowing mode
  //   we should _not_ attempt to buffer any extra data. We'll get more data
  //   when the stream consumer calls read() instead.
  // - No data in the buffer, and the stream is in flowing mode. In this mode
  //   the loop below is responsible for ensuring read() is called. Failing to
  //   call read here would abort the flow and there's no other mechanism for
  //   continuing the flow if the stream consumer has just subscribed to the
  //   'data' event.
  //
  // In addition to the above conditions to keep reading data, the following
  // conditions prevent the data from being read:
  // - The stream has ended (state.ended).
  // - There is already a pending 'read' operation (state.reading). This is a
  //   case where the the stream has called the implementation defined _read()
  //   method, but they are processing the call asynchronously and have _not_
  //   called push() with new data. In this case we skip performing more
  //   read()s. The execution ends in this method again after the _read() ends
  //   up calling push() with more data.
  while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
    var len = state.length;
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length) // didn't get any data, stop spinning.
      break;
  }

  state.readingMore = false;
} // abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.


Readable.prototype._read = function (n) {
  errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED('_read()'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;

    case 1:
      state.pipes = [state.pipes, dest];
      break;

    default:
      state.pipes.push(dest);
      break;
  }

  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) process.nextTick(endFn);else src.once('end', endFn);
  dest.on('unpipe', onunpipe);

  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');

    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  } // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.


  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);
  var cleanedUp = false;

  function cleanup() {
    debug('cleanup'); // cleanup event handlers once the pipe is broken

    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);
    cleanedUp = true; // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.

    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  src.on('data', ondata);

  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    debug('dest.write', ret);

    if (ret === false) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', state.awaitDrain);
        state.awaitDrain++;
      }

      src.pause();
    }
  } // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.


  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) errorOrDestroy(dest, er);
  } // Make sure our error handler is attached before userland ones.


  prependListener(dest, 'error', onerror); // Both close and finish should trigger unpipe, but only once.

  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }

  dest.once('close', onclose);

  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }

  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  } // tell the dest that it's being piped to


  dest.emit('pipe', src); // start the flow if it hasn't been started already.

  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function pipeOnDrainFunctionResult() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;

    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = {
    hasUnpiped: false
  }; // if we're not piping anywhere, then do nothing.

  if (state.pipesCount === 0) return this; // just one destination.  most common case.

  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;
    if (!dest) dest = state.pipes; // got a match.

    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  } // slow case. multiple pipe destinations.


  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, {
        hasUnpiped: false
      });
    }

    return this;
  } // try to find the right one.


  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;
  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];
  dest.emit('unpipe', this, unpipeInfo);
  return this;
}; // set up data events if they are asked for
// Ensure readable listeners eventually get something


Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);
  var state = this._readableState;

  if (ev === 'data') {
    // update readableListening so that resume() may be a no-op
    // a few lines down. This is needed to support once('readable').
    state.readableListening = this.listenerCount('readable') > 0; // Try start flowing on next tick if stream isn't explicitly paused

    if (state.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.flowing = false;
      state.emittedReadable = false;
      debug('on readable', state.length, state.reading);

      if (state.length) {
        emitReadable(this);
      } else if (!state.reading) {
        process.nextTick(nReadingNextTick, this);
      }
    }
  }

  return res;
};

Readable.prototype.addListener = Readable.prototype.on;

Readable.prototype.removeListener = function (ev, fn) {
  var res = Stream.prototype.removeListener.call(this, ev, fn);

  if (ev === 'readable') {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }

  return res;
};

Readable.prototype.removeAllListeners = function (ev) {
  var res = Stream.prototype.removeAllListeners.apply(this, arguments);

  if (ev === 'readable' || ev === undefined) {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }

  return res;
};

function updateReadableListening(self) {
  var state = self._readableState;
  state.readableListening = self.listenerCount('readable') > 0;

  if (state.resumeScheduled && !state.paused) {
    // flowing needs to be set to true now, otherwise
    // the upcoming resume will not flow.
    state.flowing = true; // crude way to check if we should resume
  } else if (self.listenerCount('data') > 0) {
    self.resume();
  }
}

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
} // pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.


Readable.prototype.resume = function () {
  var state = this._readableState;

  if (!state.flowing) {
    debug('resume'); // we flow only if there is no one listening
    // for readable, but we still have to call
    // resume()

    state.flowing = !state.readableListening;
    resume(this, state);
  }

  state.paused = false;
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  debug('resume', state.reading);

  if (!state.reading) {
    stream.read(0);
  }

  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);

  if (this._readableState.flowing !== false) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }

  this._readableState.paused = true;
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);

  while (state.flowing && stream.read() !== null) {
    ;
  }
} // wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.


Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;
  stream.on('end', function () {
    debug('wrapped end');

    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });
  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk); // don't skip over falsy values in objectMode

    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);

    if (!ret) {
      paused = true;
      stream.pause();
    }
  }); // proxy all the other methods.
  // important when wrapping filters and duplexes.

  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function methodWrap(method) {
        return function methodWrapReturnFunction() {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  } // proxy certain important events.


  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  } // when we try to consume some more bytes, simply unpause the
  // underlying stream.


  this._read = function (n) {
    debug('wrapped _read', n);

    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

if (typeof Symbol === 'function') {
  Readable.prototype[Symbol.asyncIterator] = function () {
    if (createReadableStreamAsyncIterator === undefined) {
      createReadableStreamAsyncIterator = require('./internal/streams/async_iterator');
    }

    return createReadableStreamAsyncIterator(this);
  };
}

Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.highWaterMark;
  }
});
Object.defineProperty(Readable.prototype, 'readableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState && this._readableState.buffer;
  }
});
Object.defineProperty(Readable.prototype, 'readableFlowing', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.flowing;
  },
  set: function set(state) {
    if (this._readableState) {
      this._readableState.flowing = state;
    }
  }
}); // exposed for testing purposes only.

Readable._fromList = fromList;
Object.defineProperty(Readable.prototype, 'readableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.length;
  }
}); // Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.

function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;
  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.first();else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = state.buffer.consume(n, state.decoder);
  }
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;
  debug('endReadable', state.endEmitted);

  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  debug('endReadableNT', state.endEmitted, state.length); // Check that we didn't get one last unshift.

  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');

    if (state.autoDestroy) {
      // In case of duplex streams we need a way to detect
      // if the writable side is ready for autoDestroy as well
      var wState = stream._writableState;

      if (!wState || wState.autoDestroy && wState.finished) {
        stream.destroy();
      }
    }
  }
}

if (typeof Symbol === 'function') {
  Readable.from = function (iterable, opts) {
    if (from === undefined) {
      from = require('./internal/streams/from');
    }

    return from(Readable, iterable, opts);
  };
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }

  return -1;
}
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":12,"./_stream_duplex":13,"./internal/streams/async_iterator":18,"./internal/streams/buffer_list":19,"./internal/streams/destroy":20,"./internal/streams/from":22,"./internal/streams/state":24,"./internal/streams/stream":25,"_process":30,"buffer":4,"events":9,"inherits":11,"string_decoder/":57,"util":3}],16:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.
'use strict';

module.exports = Transform;

var _require$codes = require('../errors').codes,
    ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
    ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING,
    ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;

var Duplex = require('./_stream_duplex');

require('inherits')(Transform, Duplex);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;
  var cb = ts.writecb;

  if (cb === null) {
    return this.emit('error', new ERR_MULTIPLE_CALLBACK());
  }

  ts.writechunk = null;
  ts.writecb = null;
  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);
  cb(er);
  var rs = this._readableState;
  rs.reading = false;

  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);
  Duplex.call(this, options);
  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  }; // start out asking for a readable event once data is transformed.

  this._readableState.needReadable = true; // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.

  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;
    if (typeof options.flush === 'function') this._flush = options.flush;
  } // When the writable side finishes, then flush out anything remaining.


  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function' && !this._readableState.destroyed) {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
}; // This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.


Transform.prototype._transform = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_transform()'));
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;

  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
}; // Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.


Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && !ts.transforming) {
    ts.transforming = true;

    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);
  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data); // TODO(BridgeAR): Write a test for these two error cases
  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided

  if (stream._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
  if (stream._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
  return stream.push(null);
}
},{"../errors":12,"./_stream_duplex":13,"inherits":11}],17:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.
'use strict';

module.exports = Writable;
/* <replacement> */

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
} // It seems a linked list but it is not
// there will be only 2 of these for each stream


function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;

  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/


var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;
/*<replacement>*/

var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/

var Stream = require('./internal/streams/stream');
/*</replacement>*/


var Buffer = require('buffer').Buffer;

var OurUint8Array = global.Uint8Array || function () {};

function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}

function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

var destroyImpl = require('./internal/streams/destroy');

var _require = require('./internal/streams/state'),
    getHighWaterMark = _require.getHighWaterMark;

var _require$codes = require('../errors').codes,
    ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
    ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
    ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE,
    ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED,
    ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES,
    ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END,
    ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;

var errorOrDestroy = destroyImpl.errorOrDestroy;

require('inherits')(Writable, Stream);

function nop() {}

function WritableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {}; // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream,
  // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.

  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex; // object stream flag to indicate whether or not this stream
  // contains buffers or objects.

  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode; // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()

  this.highWaterMark = getHighWaterMark(this, options, 'writableHighWaterMark', isDuplex); // if _final has been called

  this.finalCalled = false; // drain event flag.

  this.needDrain = false; // at the start of calling end()

  this.ending = false; // when end() has been called, and returned

  this.ended = false; // when 'finish' is emitted

  this.finished = false; // has it been destroyed

  this.destroyed = false; // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.

  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode; // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.

  this.defaultEncoding = options.defaultEncoding || 'utf8'; // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.

  this.length = 0; // a flag to see when we're in the middle of a write.

  this.writing = false; // when true all writes will be buffered until .uncork() call

  this.corked = 0; // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.

  this.sync = true; // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.

  this.bufferProcessing = false; // the callback that's passed to _write(chunk,cb)

  this.onwrite = function (er) {
    onwrite(stream, er);
  }; // the callback that the user supplies to write(chunk,encoding,cb)


  this.writecb = null; // the amount that is being written when _write is called.

  this.writelen = 0;
  this.bufferedRequest = null;
  this.lastBufferedRequest = null; // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted

  this.pendingcb = 0; // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams

  this.prefinished = false; // True if the error was already emitted and should not be thrown again

  this.errorEmitted = false; // Should close be emitted on destroy. Defaults to true.

  this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'finish' (and potentially 'end')

  this.autoDestroy = !!options.autoDestroy; // count buffered requests

  this.bufferedRequestCount = 0; // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two

  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];

  while (current) {
    out.push(current);
    current = current.next;
  }

  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function writableStateBufferGetter() {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})(); // Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.


var realHasInstance;

if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function value(object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;
      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function realHasInstance(object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex'); // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.
  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the WritableState constructor, at least with V8 6.5

  var isDuplex = this instanceof Duplex;
  if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
  this._writableState = new WritableState(options, this, isDuplex); // legacy.

  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;
    if (typeof options.writev === 'function') this._writev = options.writev;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
} // Otherwise people can pipe Writable streams, which is just wrong.


Writable.prototype.pipe = function () {
  errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
};

function writeAfterEnd(stream, cb) {
  var er = new ERR_STREAM_WRITE_AFTER_END(); // TODO: defer error events consistently everywhere, not just the cb

  errorOrDestroy(stream, er);
  process.nextTick(cb, er);
} // Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.


function validChunk(stream, state, chunk, cb) {
  var er;

  if (chunk === null) {
    er = new ERR_STREAM_NULL_VALUES();
  } else if (typeof chunk !== 'string' && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer'], chunk);
  }

  if (er) {
    errorOrDestroy(stream, er);
    process.nextTick(cb, er);
    return false;
  }

  return true;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  var isBuf = !state.objectMode && _isUint8Array(chunk);

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;
  if (typeof cb !== 'function') cb = nop;
  if (state.ending) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }
  return ret;
};

Writable.prototype.cork = function () {
  this._writableState.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;
    if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

Object.defineProperty(Writable.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }

  return chunk;
}

Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
}); // if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.

function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);

    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }

  var len = state.objectMode ? 1 : chunk.length;
  state.length += len;
  var ret = state.length < state.highWaterMark; // we must ensure that previous needDrain will not be reset to false.

  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };

    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }

    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED('write'));else if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    process.nextTick(cb, er); // this can emit finish, and it will always happen
    // after error

    process.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er); // this can emit finish, but finish must
    // always follow error

    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;
  if (typeof cb !== 'function') throw new ERR_MULTIPLE_CALLBACK();
  onwriteStateUpdate(state);
  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state) || stream.destroyed;

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      process.nextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
} // Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.


function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
} // if there's something in the buffer waiting, then process it


function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;
    var count = 0;
    var allBuffers = true;

    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }

    buffer.allBuffers = allBuffers;
    doWrite(stream, state, true, state.length, buffer, '', holder.finish); // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite

    state.pendingcb++;
    state.lastBufferedRequest = null;

    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }

    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;
      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--; // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.

      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_write()'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding); // .end() fully uncorks

  if (state.corked) {
    state.corked = 1;
    this.uncork();
  } // ignore unnecessary end() calls.


  if (!state.ending) endWritable(this, state, cb);
  return this;
};

Object.defineProperty(Writable.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}

function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;

    if (err) {
      errorOrDestroy(stream, err);
    }

    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}

function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function' && !state.destroyed) {
      state.pendingcb++;
      state.finalCalled = true;
      process.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);

  if (need) {
    prefinish(stream, state);

    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');

      if (state.autoDestroy) {
        // In case of duplex streams we need a way to detect
        // if the readable side is ready for autoDestroy as well
        var rState = stream._readableState;

        if (!rState || rState.autoDestroy && rState.endEmitted) {
          stream.destroy();
        }
      }
    }
  }

  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);

  if (cb) {
    if (state.finished) process.nextTick(cb);else stream.once('finish', cb);
  }

  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;

  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  } // reuse the free corkReq.


  state.corkedRequestsFree.next = corkReq;
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._writableState === undefined) {
      return false;
    }

    return this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._writableState.destroyed = value;
  }
});
Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;

Writable.prototype._destroy = function (err, cb) {
  cb(err);
};
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":12,"./_stream_duplex":13,"./internal/streams/destroy":20,"./internal/streams/state":24,"./internal/streams/stream":25,"_process":30,"buffer":4,"inherits":11,"util-deprecate":58}],18:[function(require,module,exports){
(function (process){(function (){
'use strict';

var _Object$setPrototypeO;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var finished = require('./end-of-stream');

var kLastResolve = Symbol('lastResolve');
var kLastReject = Symbol('lastReject');
var kError = Symbol('error');
var kEnded = Symbol('ended');
var kLastPromise = Symbol('lastPromise');
var kHandlePromise = Symbol('handlePromise');
var kStream = Symbol('stream');

function createIterResult(value, done) {
  return {
    value: value,
    done: done
  };
}

function readAndResolve(iter) {
  var resolve = iter[kLastResolve];

  if (resolve !== null) {
    var data = iter[kStream].read(); // we defer if data is null
    // we can be expecting either 'end' or
    // 'error'

    if (data !== null) {
      iter[kLastPromise] = null;
      iter[kLastResolve] = null;
      iter[kLastReject] = null;
      resolve(createIterResult(data, false));
    }
  }
}

function onReadable(iter) {
  // we wait for the next tick, because it might
  // emit an error with process.nextTick
  process.nextTick(readAndResolve, iter);
}

function wrapForNext(lastPromise, iter) {
  return function (resolve, reject) {
    lastPromise.then(function () {
      if (iter[kEnded]) {
        resolve(createIterResult(undefined, true));
        return;
      }

      iter[kHandlePromise](resolve, reject);
    }, reject);
  };
}

var AsyncIteratorPrototype = Object.getPrototypeOf(function () {});
var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
  get stream() {
    return this[kStream];
  },

  next: function next() {
    var _this = this;

    // if we have detected an error in the meanwhile
    // reject straight away
    var error = this[kError];

    if (error !== null) {
      return Promise.reject(error);
    }

    if (this[kEnded]) {
      return Promise.resolve(createIterResult(undefined, true));
    }

    if (this[kStream].destroyed) {
      // We need to defer via nextTick because if .destroy(err) is
      // called, the error will be emitted via nextTick, and
      // we cannot guarantee that there is no error lingering around
      // waiting to be emitted.
      return new Promise(function (resolve, reject) {
        process.nextTick(function () {
          if (_this[kError]) {
            reject(_this[kError]);
          } else {
            resolve(createIterResult(undefined, true));
          }
        });
      });
    } // if we have multiple next() calls
    // we will wait for the previous Promise to finish
    // this logic is optimized to support for await loops,
    // where next() is only called once at a time


    var lastPromise = this[kLastPromise];
    var promise;

    if (lastPromise) {
      promise = new Promise(wrapForNext(lastPromise, this));
    } else {
      // fast path needed to support multiple this.push()
      // without triggering the next() queue
      var data = this[kStream].read();

      if (data !== null) {
        return Promise.resolve(createIterResult(data, false));
      }

      promise = new Promise(this[kHandlePromise]);
    }

    this[kLastPromise] = promise;
    return promise;
  }
}, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function () {
  return this;
}), _defineProperty(_Object$setPrototypeO, "return", function _return() {
  var _this2 = this;

  // destroy(err, cb) is a private API
  // we can guarantee we have that here, because we control the
  // Readable class this is attached to
  return new Promise(function (resolve, reject) {
    _this2[kStream].destroy(null, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(createIterResult(undefined, true));
    });
  });
}), _Object$setPrototypeO), AsyncIteratorPrototype);

var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator(stream) {
  var _Object$create;

  var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
    value: stream,
    writable: true
  }), _defineProperty(_Object$create, kLastResolve, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kLastReject, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kError, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kEnded, {
    value: stream._readableState.endEmitted,
    writable: true
  }), _defineProperty(_Object$create, kHandlePromise, {
    value: function value(resolve, reject) {
      var data = iterator[kStream].read();

      if (data) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        resolve(createIterResult(data, false));
      } else {
        iterator[kLastResolve] = resolve;
        iterator[kLastReject] = reject;
      }
    },
    writable: true
  }), _Object$create));
  iterator[kLastPromise] = null;
  finished(stream, function (err) {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      var reject = iterator[kLastReject]; // reject if we are waiting for data in the Promise
      // returned by next() and store the error

      if (reject !== null) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        reject(err);
      }

      iterator[kError] = err;
      return;
    }

    var resolve = iterator[kLastResolve];

    if (resolve !== null) {
      iterator[kLastPromise] = null;
      iterator[kLastResolve] = null;
      iterator[kLastReject] = null;
      resolve(createIterResult(undefined, true));
    }

    iterator[kEnded] = true;
  });
  stream.on('readable', onReadable.bind(null, iterator));
  return iterator;
};

module.exports = createReadableStreamAsyncIterator;
}).call(this)}).call(this,require('_process'))
},{"./end-of-stream":21,"_process":30}],19:[function(require,module,exports){
'use strict';

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _require = require('buffer'),
    Buffer = _require.Buffer;

var _require2 = require('util'),
    inspect = _require2.inspect;

var custom = inspect && inspect.custom || 'inspect';

function copyBuffer(src, target, offset) {
  Buffer.prototype.copy.call(src, target, offset);
}

module.exports =
/*#__PURE__*/
function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  _createClass(BufferList, [{
    key: "push",
    value: function push(v) {
      var entry = {
        data: v,
        next: null
      };
      if (this.length > 0) this.tail.next = entry;else this.head = entry;
      this.tail = entry;
      ++this.length;
    }
  }, {
    key: "unshift",
    value: function unshift(v) {
      var entry = {
        data: v,
        next: this.head
      };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    }
  }, {
    key: "shift",
    value: function shift() {
      if (this.length === 0) return;
      var ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
      --this.length;
      return ret;
    }
  }, {
    key: "clear",
    value: function clear() {
      this.head = this.tail = null;
      this.length = 0;
    }
  }, {
    key: "join",
    value: function join(s) {
      if (this.length === 0) return '';
      var p = this.head;
      var ret = '' + p.data;

      while (p = p.next) {
        ret += s + p.data;
      }

      return ret;
    }
  }, {
    key: "concat",
    value: function concat(n) {
      if (this.length === 0) return Buffer.alloc(0);
      var ret = Buffer.allocUnsafe(n >>> 0);
      var p = this.head;
      var i = 0;

      while (p) {
        copyBuffer(p.data, ret, i);
        i += p.data.length;
        p = p.next;
      }

      return ret;
    } // Consumes a specified amount of bytes or characters from the buffered data.

  }, {
    key: "consume",
    value: function consume(n, hasStrings) {
      var ret;

      if (n < this.head.data.length) {
        // `slice` is the same for buffers and strings.
        ret = this.head.data.slice(0, n);
        this.head.data = this.head.data.slice(n);
      } else if (n === this.head.data.length) {
        // First chunk is a perfect match.
        ret = this.shift();
      } else {
        // Result spans more than one buffer.
        ret = hasStrings ? this._getString(n) : this._getBuffer(n);
      }

      return ret;
    }
  }, {
    key: "first",
    value: function first() {
      return this.head.data;
    } // Consumes a specified amount of characters from the buffered data.

  }, {
    key: "_getString",
    value: function _getString(n) {
      var p = this.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;

      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length) ret += str;else ret += str.slice(0, n);
        n -= nb;

        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = str.slice(nb);
          }

          break;
        }

        ++c;
      }

      this.length -= c;
      return ret;
    } // Consumes a specified amount of bytes from the buffered data.

  }, {
    key: "_getBuffer",
    value: function _getBuffer(n) {
      var ret = Buffer.allocUnsafe(n);
      var p = this.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;

      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;

        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = buf.slice(nb);
          }

          break;
        }

        ++c;
      }

      this.length -= c;
      return ret;
    } // Make sure the linked list only shows the minimal necessary information.

  }, {
    key: custom,
    value: function value(_, options) {
      return inspect(this, _objectSpread({}, options, {
        // Only inspect one level.
        depth: 0,
        // It should not recurse.
        customInspect: false
      }));
    }
  }]);

  return BufferList;
}();
},{"buffer":4,"util":3}],20:[function(require,module,exports){
(function (process){(function (){
'use strict'; // undocumented cb() API, needed for core, not for public API

function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err) {
      if (!this._writableState) {
        process.nextTick(emitErrorNT, this, err);
      } else if (!this._writableState.errorEmitted) {
        this._writableState.errorEmitted = true;
        process.nextTick(emitErrorNT, this, err);
      }
    }

    return this;
  } // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks


  if (this._readableState) {
    this._readableState.destroyed = true;
  } // if this is a duplex stream mark the writable part as destroyed as well


  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      if (!_this._writableState) {
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else if (!_this._writableState.errorEmitted) {
        _this._writableState.errorEmitted = true;
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else {
        process.nextTick(emitCloseNT, _this);
      }
    } else if (cb) {
      process.nextTick(emitCloseNT, _this);
      cb(err);
    } else {
      process.nextTick(emitCloseNT, _this);
    }
  });

  return this;
}

function emitErrorAndCloseNT(self, err) {
  emitErrorNT(self, err);
  emitCloseNT(self);
}

function emitCloseNT(self) {
  if (self._writableState && !self._writableState.emitClose) return;
  if (self._readableState && !self._readableState.emitClose) return;
  self.emit('close');
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finalCalled = false;
    this._writableState.prefinished = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

function errorOrDestroy(stream, err) {
  // We have tests that rely on errors being emitted
  // in the same tick, so changing this is semver major.
  // For now when you opt-in to autoDestroy we allow
  // the error to be emitted nextTick. In a future
  // semver major update we should change the default to this.
  var rState = stream._readableState;
  var wState = stream._writableState;
  if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream.destroy(err);else stream.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy,
  errorOrDestroy: errorOrDestroy
};
}).call(this)}).call(this,require('_process'))
},{"_process":30}],21:[function(require,module,exports){
// Ported from https://github.com/mafintosh/end-of-stream with
// permission from the author, Mathias Buus (@mafintosh).
'use strict';

var ERR_STREAM_PREMATURE_CLOSE = require('../../../errors').codes.ERR_STREAM_PREMATURE_CLOSE;

function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    callback.apply(this, args);
  };
}

function noop() {}

function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}

function eos(stream, opts, callback) {
  if (typeof opts === 'function') return eos(stream, null, opts);
  if (!opts) opts = {};
  callback = once(callback || noop);
  var readable = opts.readable || opts.readable !== false && stream.readable;
  var writable = opts.writable || opts.writable !== false && stream.writable;

  var onlegacyfinish = function onlegacyfinish() {
    if (!stream.writable) onfinish();
  };

  var writableEnded = stream._writableState && stream._writableState.finished;

  var onfinish = function onfinish() {
    writable = false;
    writableEnded = true;
    if (!readable) callback.call(stream);
  };

  var readableEnded = stream._readableState && stream._readableState.endEmitted;

  var onend = function onend() {
    readable = false;
    readableEnded = true;
    if (!writable) callback.call(stream);
  };

  var onerror = function onerror(err) {
    callback.call(stream, err);
  };

  var onclose = function onclose() {
    var err;

    if (readable && !readableEnded) {
      if (!stream._readableState || !stream._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }

    if (writable && !writableEnded) {
      if (!stream._writableState || !stream._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
  };

  var onrequest = function onrequest() {
    stream.req.on('finish', onfinish);
  };

  if (isRequest(stream)) {
    stream.on('complete', onfinish);
    stream.on('abort', onclose);
    if (stream.req) onrequest();else stream.on('request', onrequest);
  } else if (writable && !stream._writableState) {
    // legacy streams
    stream.on('end', onlegacyfinish);
    stream.on('close', onlegacyfinish);
  }

  stream.on('end', onend);
  stream.on('finish', onfinish);
  if (opts.error !== false) stream.on('error', onerror);
  stream.on('close', onclose);
  return function () {
    stream.removeListener('complete', onfinish);
    stream.removeListener('abort', onclose);
    stream.removeListener('request', onrequest);
    if (stream.req) stream.req.removeListener('finish', onfinish);
    stream.removeListener('end', onlegacyfinish);
    stream.removeListener('close', onlegacyfinish);
    stream.removeListener('finish', onfinish);
    stream.removeListener('end', onend);
    stream.removeListener('error', onerror);
    stream.removeListener('close', onclose);
  };
}

module.exports = eos;
},{"../../../errors":12}],22:[function(require,module,exports){
module.exports = function () {
  throw new Error('Readable.from is not available in the browser')
};

},{}],23:[function(require,module,exports){
// Ported from https://github.com/mafintosh/pump with
// permission from the author, Mathias Buus (@mafintosh).
'use strict';

var eos;

function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    callback.apply(void 0, arguments);
  };
}

var _require$codes = require('../../../errors').codes,
    ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
    ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;

function noop(err) {
  // Rethrow the error if it exists to avoid swallowing it
  if (err) throw err;
}

function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}

function destroyer(stream, reading, writing, callback) {
  callback = once(callback);
  var closed = false;
  stream.on('close', function () {
    closed = true;
  });
  if (eos === undefined) eos = require('./end-of-stream');
  eos(stream, {
    readable: reading,
    writable: writing
  }, function (err) {
    if (err) return callback(err);
    closed = true;
    callback();
  });
  var destroyed = false;
  return function (err) {
    if (closed) return;
    if (destroyed) return;
    destroyed = true; // request.destroy just do .end - .abort is what we want

    if (isRequest(stream)) return stream.abort();
    if (typeof stream.destroy === 'function') return stream.destroy();
    callback(err || new ERR_STREAM_DESTROYED('pipe'));
  };
}

function call(fn) {
  fn();
}

function pipe(from, to) {
  return from.pipe(to);
}

function popCallback(streams) {
  if (!streams.length) return noop;
  if (typeof streams[streams.length - 1] !== 'function') return noop;
  return streams.pop();
}

function pipeline() {
  for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
    streams[_key] = arguments[_key];
  }

  var callback = popCallback(streams);
  if (Array.isArray(streams[0])) streams = streams[0];

  if (streams.length < 2) {
    throw new ERR_MISSING_ARGS('streams');
  }

  var error;
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1;
    var writing = i > 0;
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err;
      if (err) destroys.forEach(call);
      if (reading) return;
      destroys.forEach(call);
      callback(error);
    });
  });
  return streams.reduce(pipe);
}

module.exports = pipeline;
},{"../../../errors":12,"./end-of-stream":21}],24:[function(require,module,exports){
'use strict';

var ERR_INVALID_OPT_VALUE = require('../../../errors').codes.ERR_INVALID_OPT_VALUE;

function highWaterMarkFrom(options, isDuplex, duplexKey) {
  return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
}

function getHighWaterMark(state, options, duplexKey, isDuplex) {
  var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);

  if (hwm != null) {
    if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
      var name = isDuplex ? duplexKey : 'highWaterMark';
      throw new ERR_INVALID_OPT_VALUE(name, hwm);
    }

    return Math.floor(hwm);
  } // Default value


  return state.objectMode ? 16 : 16 * 1024;
}

module.exports = {
  getHighWaterMark: getHighWaterMark
};
},{"../../../errors":12}],25:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":9}],26:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');
exports.finished = require('./lib/internal/streams/end-of-stream.js');
exports.pipeline = require('./lib/internal/streams/pipeline.js');

},{"./lib/_stream_duplex.js":13,"./lib/_stream_passthrough.js":14,"./lib/_stream_readable.js":15,"./lib/_stream_transform.js":16,"./lib/_stream_writable.js":17,"./lib/internal/streams/end-of-stream.js":21,"./lib/internal/streams/pipeline.js":23}],27:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],28:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],29:[function(require,module,exports){
'use strict'
var inherits = require('inherits')
var HashBase = require('hash-base')
var Buffer = require('safe-buffer').Buffer

var ARRAY16 = new Array(16)

function MD5 () {
  HashBase.call(this, 64)

  // state
  this._a = 0x67452301
  this._b = 0xefcdab89
  this._c = 0x98badcfe
  this._d = 0x10325476
}

inherits(MD5, HashBase)

MD5.prototype._update = function () {
  var M = ARRAY16
  for (var i = 0; i < 16; ++i) M[i] = this._block.readInt32LE(i * 4)

  var a = this._a
  var b = this._b
  var c = this._c
  var d = this._d

  a = fnF(a, b, c, d, M[0], 0xd76aa478, 7)
  d = fnF(d, a, b, c, M[1], 0xe8c7b756, 12)
  c = fnF(c, d, a, b, M[2], 0x242070db, 17)
  b = fnF(b, c, d, a, M[3], 0xc1bdceee, 22)
  a = fnF(a, b, c, d, M[4], 0xf57c0faf, 7)
  d = fnF(d, a, b, c, M[5], 0x4787c62a, 12)
  c = fnF(c, d, a, b, M[6], 0xa8304613, 17)
  b = fnF(b, c, d, a, M[7], 0xfd469501, 22)
  a = fnF(a, b, c, d, M[8], 0x698098d8, 7)
  d = fnF(d, a, b, c, M[9], 0x8b44f7af, 12)
  c = fnF(c, d, a, b, M[10], 0xffff5bb1, 17)
  b = fnF(b, c, d, a, M[11], 0x895cd7be, 22)
  a = fnF(a, b, c, d, M[12], 0x6b901122, 7)
  d = fnF(d, a, b, c, M[13], 0xfd987193, 12)
  c = fnF(c, d, a, b, M[14], 0xa679438e, 17)
  b = fnF(b, c, d, a, M[15], 0x49b40821, 22)

  a = fnG(a, b, c, d, M[1], 0xf61e2562, 5)
  d = fnG(d, a, b, c, M[6], 0xc040b340, 9)
  c = fnG(c, d, a, b, M[11], 0x265e5a51, 14)
  b = fnG(b, c, d, a, M[0], 0xe9b6c7aa, 20)
  a = fnG(a, b, c, d, M[5], 0xd62f105d, 5)
  d = fnG(d, a, b, c, M[10], 0x02441453, 9)
  c = fnG(c, d, a, b, M[15], 0xd8a1e681, 14)
  b = fnG(b, c, d, a, M[4], 0xe7d3fbc8, 20)
  a = fnG(a, b, c, d, M[9], 0x21e1cde6, 5)
  d = fnG(d, a, b, c, M[14], 0xc33707d6, 9)
  c = fnG(c, d, a, b, M[3], 0xf4d50d87, 14)
  b = fnG(b, c, d, a, M[8], 0x455a14ed, 20)
  a = fnG(a, b, c, d, M[13], 0xa9e3e905, 5)
  d = fnG(d, a, b, c, M[2], 0xfcefa3f8, 9)
  c = fnG(c, d, a, b, M[7], 0x676f02d9, 14)
  b = fnG(b, c, d, a, M[12], 0x8d2a4c8a, 20)

  a = fnH(a, b, c, d, M[5], 0xfffa3942, 4)
  d = fnH(d, a, b, c, M[8], 0x8771f681, 11)
  c = fnH(c, d, a, b, M[11], 0x6d9d6122, 16)
  b = fnH(b, c, d, a, M[14], 0xfde5380c, 23)
  a = fnH(a, b, c, d, M[1], 0xa4beea44, 4)
  d = fnH(d, a, b, c, M[4], 0x4bdecfa9, 11)
  c = fnH(c, d, a, b, M[7], 0xf6bb4b60, 16)
  b = fnH(b, c, d, a, M[10], 0xbebfbc70, 23)
  a = fnH(a, b, c, d, M[13], 0x289b7ec6, 4)
  d = fnH(d, a, b, c, M[0], 0xeaa127fa, 11)
  c = fnH(c, d, a, b, M[3], 0xd4ef3085, 16)
  b = fnH(b, c, d, a, M[6], 0x04881d05, 23)
  a = fnH(a, b, c, d, M[9], 0xd9d4d039, 4)
  d = fnH(d, a, b, c, M[12], 0xe6db99e5, 11)
  c = fnH(c, d, a, b, M[15], 0x1fa27cf8, 16)
  b = fnH(b, c, d, a, M[2], 0xc4ac5665, 23)

  a = fnI(a, b, c, d, M[0], 0xf4292244, 6)
  d = fnI(d, a, b, c, M[7], 0x432aff97, 10)
  c = fnI(c, d, a, b, M[14], 0xab9423a7, 15)
  b = fnI(b, c, d, a, M[5], 0xfc93a039, 21)
  a = fnI(a, b, c, d, M[12], 0x655b59c3, 6)
  d = fnI(d, a, b, c, M[3], 0x8f0ccc92, 10)
  c = fnI(c, d, a, b, M[10], 0xffeff47d, 15)
  b = fnI(b, c, d, a, M[1], 0x85845dd1, 21)
  a = fnI(a, b, c, d, M[8], 0x6fa87e4f, 6)
  d = fnI(d, a, b, c, M[15], 0xfe2ce6e0, 10)
  c = fnI(c, d, a, b, M[6], 0xa3014314, 15)
  b = fnI(b, c, d, a, M[13], 0x4e0811a1, 21)
  a = fnI(a, b, c, d, M[4], 0xf7537e82, 6)
  d = fnI(d, a, b, c, M[11], 0xbd3af235, 10)
  c = fnI(c, d, a, b, M[2], 0x2ad7d2bb, 15)
  b = fnI(b, c, d, a, M[9], 0xeb86d391, 21)

  this._a = (this._a + a) | 0
  this._b = (this._b + b) | 0
  this._c = (this._c + c) | 0
  this._d = (this._d + d) | 0
}

MD5.prototype._digest = function () {
  // create padding and handle blocks
  this._block[this._blockOffset++] = 0x80
  if (this._blockOffset > 56) {
    this._block.fill(0, this._blockOffset, 64)
    this._update()
    this._blockOffset = 0
  }

  this._block.fill(0, this._blockOffset, 56)
  this._block.writeUInt32LE(this._length[0], 56)
  this._block.writeUInt32LE(this._length[1], 60)
  this._update()

  // produce result
  var buffer = Buffer.allocUnsafe(16)
  buffer.writeInt32LE(this._a, 0)
  buffer.writeInt32LE(this._b, 4)
  buffer.writeInt32LE(this._c, 8)
  buffer.writeInt32LE(this._d, 12)
  return buffer
}

function rotl (x, n) {
  return (x << n) | (x >>> (32 - n))
}

function fnF (a, b, c, d, m, k, s) {
  return (rotl((a + ((b & c) | ((~b) & d)) + m + k) | 0, s) + b) | 0
}

function fnG (a, b, c, d, m, k, s) {
  return (rotl((a + ((b & d) | (c & (~d))) + m + k) | 0, s) + b) | 0
}

function fnH (a, b, c, d, m, k, s) {
  return (rotl((a + (b ^ c ^ d) + m + k) | 0, s) + b) | 0
}

function fnI (a, b, c, d, m, k, s) {
  return (rotl((a + ((c ^ (b | (~d)))) + m + k) | 0, s) + b) | 0
}

module.exports = MD5

},{"hash-base":10,"inherits":28,"safe-buffer":32}],30:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],31:[function(require,module,exports){
'use strict'
var Buffer = require('buffer').Buffer
var inherits = require('inherits')
var HashBase = require('hash-base')

var ARRAY16 = new Array(16)

var zl = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
  3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
  1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
  4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
]

var zr = [
  5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
  6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
  15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
  8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
  12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
]

var sl = [
  11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
  7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
  11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
  11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
  9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
]

var sr = [
  8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
  9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
  9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
  15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
  8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
]

var hl = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e]
var hr = [0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000]

function RIPEMD160 () {
  HashBase.call(this, 64)

  // state
  this._a = 0x67452301
  this._b = 0xefcdab89
  this._c = 0x98badcfe
  this._d = 0x10325476
  this._e = 0xc3d2e1f0
}

inherits(RIPEMD160, HashBase)

RIPEMD160.prototype._update = function () {
  var words = ARRAY16
  for (var j = 0; j < 16; ++j) words[j] = this._block.readInt32LE(j * 4)

  var al = this._a | 0
  var bl = this._b | 0
  var cl = this._c | 0
  var dl = this._d | 0
  var el = this._e | 0

  var ar = this._a | 0
  var br = this._b | 0
  var cr = this._c | 0
  var dr = this._d | 0
  var er = this._e | 0

  // computation
  for (var i = 0; i < 80; i += 1) {
    var tl
    var tr
    if (i < 16) {
      tl = fn1(al, bl, cl, dl, el, words[zl[i]], hl[0], sl[i])
      tr = fn5(ar, br, cr, dr, er, words[zr[i]], hr[0], sr[i])
    } else if (i < 32) {
      tl = fn2(al, bl, cl, dl, el, words[zl[i]], hl[1], sl[i])
      tr = fn4(ar, br, cr, dr, er, words[zr[i]], hr[1], sr[i])
    } else if (i < 48) {
      tl = fn3(al, bl, cl, dl, el, words[zl[i]], hl[2], sl[i])
      tr = fn3(ar, br, cr, dr, er, words[zr[i]], hr[2], sr[i])
    } else if (i < 64) {
      tl = fn4(al, bl, cl, dl, el, words[zl[i]], hl[3], sl[i])
      tr = fn2(ar, br, cr, dr, er, words[zr[i]], hr[3], sr[i])
    } else { // if (i<80) {
      tl = fn5(al, bl, cl, dl, el, words[zl[i]], hl[4], sl[i])
      tr = fn1(ar, br, cr, dr, er, words[zr[i]], hr[4], sr[i])
    }

    al = el
    el = dl
    dl = rotl(cl, 10)
    cl = bl
    bl = tl

    ar = er
    er = dr
    dr = rotl(cr, 10)
    cr = br
    br = tr
  }

  // update state
  var t = (this._b + cl + dr) | 0
  this._b = (this._c + dl + er) | 0
  this._c = (this._d + el + ar) | 0
  this._d = (this._e + al + br) | 0
  this._e = (this._a + bl + cr) | 0
  this._a = t
}

RIPEMD160.prototype._digest = function () {
  // create padding and handle blocks
  this._block[this._blockOffset++] = 0x80
  if (this._blockOffset > 56) {
    this._block.fill(0, this._blockOffset, 64)
    this._update()
    this._blockOffset = 0
  }

  this._block.fill(0, this._blockOffset, 56)
  this._block.writeUInt32LE(this._length[0], 56)
  this._block.writeUInt32LE(this._length[1], 60)
  this._update()

  // produce result
  var buffer = Buffer.alloc ? Buffer.alloc(20) : new Buffer(20)
  buffer.writeInt32LE(this._a, 0)
  buffer.writeInt32LE(this._b, 4)
  buffer.writeInt32LE(this._c, 8)
  buffer.writeInt32LE(this._d, 12)
  buffer.writeInt32LE(this._e, 16)
  return buffer
}

function rotl (x, n) {
  return (x << n) | (x >>> (32 - n))
}

function fn1 (a, b, c, d, e, m, k, s) {
  return (rotl((a + (b ^ c ^ d) + m + k) | 0, s) + e) | 0
}

function fn2 (a, b, c, d, e, m, k, s) {
  return (rotl((a + ((b & c) | ((~b) & d)) + m + k) | 0, s) + e) | 0
}

function fn3 (a, b, c, d, e, m, k, s) {
  return (rotl((a + ((b | (~c)) ^ d) + m + k) | 0, s) + e) | 0
}

function fn4 (a, b, c, d, e, m, k, s) {
  return (rotl((a + ((b & d) | (c & (~d))) + m + k) | 0, s) + e) | 0
}

function fn5 (a, b, c, d, e, m, k, s) {
  return (rotl((a + (b ^ (c | (~d))) + m + k) | 0, s) + e) | 0
}

module.exports = RIPEMD160

},{"buffer":4,"hash-base":10,"inherits":28}],32:[function(require,module,exports){
/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":4}],33:[function(require,module,exports){
var Buffer = require('safe-buffer').Buffer

// prototype class for hash functions
function Hash (blockSize, finalSize) {
  this._block = Buffer.alloc(blockSize)
  this._finalSize = finalSize
  this._blockSize = blockSize
  this._len = 0
}

Hash.prototype.update = function (data, enc) {
  if (typeof data === 'string') {
    enc = enc || 'utf8'
    data = Buffer.from(data, enc)
  }

  var block = this._block
  var blockSize = this._blockSize
  var length = data.length
  var accum = this._len

  for (var offset = 0; offset < length;) {
    var assigned = accum % blockSize
    var remainder = Math.min(length - offset, blockSize - assigned)

    for (var i = 0; i < remainder; i++) {
      block[assigned + i] = data[offset + i]
    }

    accum += remainder
    offset += remainder

    if ((accum % blockSize) === 0) {
      this._update(block)
    }
  }

  this._len += length
  return this
}

Hash.prototype.digest = function (enc) {
  var rem = this._len % this._blockSize

  this._block[rem] = 0x80

  // zero (rem + 1) trailing bits, where (rem + 1) is the smallest
  // non-negative solution to the equation (length + 1 + (rem + 1)) === finalSize mod blockSize
  this._block.fill(0, rem + 1)

  if (rem >= this._finalSize) {
    this._update(this._block)
    this._block.fill(0)
  }

  var bits = this._len * 8

  // uint32
  if (bits <= 0xffffffff) {
    this._block.writeUInt32BE(bits, this._blockSize - 4)

  // uint64
  } else {
    var lowBits = (bits & 0xffffffff) >>> 0
    var highBits = (bits - lowBits) / 0x100000000

    this._block.writeUInt32BE(highBits, this._blockSize - 8)
    this._block.writeUInt32BE(lowBits, this._blockSize - 4)
  }

  this._update(this._block)
  var hash = this._hash()

  return enc ? hash.toString(enc) : hash
}

Hash.prototype._update = function () {
  throw new Error('_update must be implemented by subclass')
}

module.exports = Hash

},{"safe-buffer":32}],34:[function(require,module,exports){
var exports = module.exports = function SHA (algorithm) {
  algorithm = algorithm.toLowerCase()

  var Algorithm = exports[algorithm]
  if (!Algorithm) throw new Error(algorithm + ' is not supported (we accept pull requests)')

  return new Algorithm()
}

exports.sha = require('./sha')
exports.sha1 = require('./sha1')
exports.sha224 = require('./sha224')
exports.sha256 = require('./sha256')
exports.sha384 = require('./sha384')
exports.sha512 = require('./sha512')

},{"./sha":35,"./sha1":36,"./sha224":37,"./sha256":38,"./sha384":39,"./sha512":40}],35:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-0, as defined
 * in FIPS PUB 180-1
 * This source code is derived from sha1.js of the same repository.
 * The difference between SHA-0 and SHA-1 is just a bitwise rotate left
 * operation was added.
 */

var inherits = require('inherits')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var K = [
  0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0
]

var W = new Array(80)

function Sha () {
  this.init()
  this._w = W

  Hash.call(this, 64, 56)
}

inherits(Sha, Hash)

Sha.prototype.init = function () {
  this._a = 0x67452301
  this._b = 0xefcdab89
  this._c = 0x98badcfe
  this._d = 0x10325476
  this._e = 0xc3d2e1f0

  return this
}

function rotl5 (num) {
  return (num << 5) | (num >>> 27)
}

function rotl30 (num) {
  return (num << 30) | (num >>> 2)
}

function ft (s, b, c, d) {
  if (s === 0) return (b & c) | ((~b) & d)
  if (s === 2) return (b & c) | (b & d) | (c & d)
  return b ^ c ^ d
}

Sha.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 80; ++i) W[i] = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]

  for (var j = 0; j < 80; ++j) {
    var s = ~~(j / 20)
    var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0

    e = d
    d = c
    c = rotl30(b)
    b = a
    a = t
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
}

Sha.prototype._hash = function () {
  var H = Buffer.allocUnsafe(20)

  H.writeInt32BE(this._a | 0, 0)
  H.writeInt32BE(this._b | 0, 4)
  H.writeInt32BE(this._c | 0, 8)
  H.writeInt32BE(this._d | 0, 12)
  H.writeInt32BE(this._e | 0, 16)

  return H
}

module.exports = Sha

},{"./hash":33,"inherits":28,"safe-buffer":32}],36:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

var inherits = require('inherits')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var K = [
  0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0
]

var W = new Array(80)

function Sha1 () {
  this.init()
  this._w = W

  Hash.call(this, 64, 56)
}

inherits(Sha1, Hash)

Sha1.prototype.init = function () {
  this._a = 0x67452301
  this._b = 0xefcdab89
  this._c = 0x98badcfe
  this._d = 0x10325476
  this._e = 0xc3d2e1f0

  return this
}

function rotl1 (num) {
  return (num << 1) | (num >>> 31)
}

function rotl5 (num) {
  return (num << 5) | (num >>> 27)
}

function rotl30 (num) {
  return (num << 30) | (num >>> 2)
}

function ft (s, b, c, d) {
  if (s === 0) return (b & c) | ((~b) & d)
  if (s === 2) return (b & c) | (b & d) | (c & d)
  return b ^ c ^ d
}

Sha1.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 80; ++i) W[i] = rotl1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16])

  for (var j = 0; j < 80; ++j) {
    var s = ~~(j / 20)
    var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0

    e = d
    d = c
    c = rotl30(b)
    b = a
    a = t
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
}

Sha1.prototype._hash = function () {
  var H = Buffer.allocUnsafe(20)

  H.writeInt32BE(this._a | 0, 0)
  H.writeInt32BE(this._b | 0, 4)
  H.writeInt32BE(this._c | 0, 8)
  H.writeInt32BE(this._d | 0, 12)
  H.writeInt32BE(this._e | 0, 16)

  return H
}

module.exports = Sha1

},{"./hash":33,"inherits":28,"safe-buffer":32}],37:[function(require,module,exports){
/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var inherits = require('inherits')
var Sha256 = require('./sha256')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var W = new Array(64)

function Sha224 () {
  this.init()

  this._w = W // new Array(64)

  Hash.call(this, 64, 56)
}

inherits(Sha224, Sha256)

Sha224.prototype.init = function () {
  this._a = 0xc1059ed8
  this._b = 0x367cd507
  this._c = 0x3070dd17
  this._d = 0xf70e5939
  this._e = 0xffc00b31
  this._f = 0x68581511
  this._g = 0x64f98fa7
  this._h = 0xbefa4fa4

  return this
}

Sha224.prototype._hash = function () {
  var H = Buffer.allocUnsafe(28)

  H.writeInt32BE(this._a, 0)
  H.writeInt32BE(this._b, 4)
  H.writeInt32BE(this._c, 8)
  H.writeInt32BE(this._d, 12)
  H.writeInt32BE(this._e, 16)
  H.writeInt32BE(this._f, 20)
  H.writeInt32BE(this._g, 24)

  return H
}

module.exports = Sha224

},{"./hash":33,"./sha256":38,"inherits":28,"safe-buffer":32}],38:[function(require,module,exports){
/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var inherits = require('inherits')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var K = [
  0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
  0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
  0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
  0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
  0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
  0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
  0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
  0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
  0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
  0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
  0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
  0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
  0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
  0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
]

var W = new Array(64)

function Sha256 () {
  this.init()

  this._w = W // new Array(64)

  Hash.call(this, 64, 56)
}

inherits(Sha256, Hash)

Sha256.prototype.init = function () {
  this._a = 0x6a09e667
  this._b = 0xbb67ae85
  this._c = 0x3c6ef372
  this._d = 0xa54ff53a
  this._e = 0x510e527f
  this._f = 0x9b05688c
  this._g = 0x1f83d9ab
  this._h = 0x5be0cd19

  return this
}

function ch (x, y, z) {
  return z ^ (x & (y ^ z))
}

function maj (x, y, z) {
  return (x & y) | (z & (x | y))
}

function sigma0 (x) {
  return (x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10)
}

function sigma1 (x) {
  return (x >>> 6 | x << 26) ^ (x >>> 11 | x << 21) ^ (x >>> 25 | x << 7)
}

function gamma0 (x) {
  return (x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)
}

function gamma1 (x) {
  return (x >>> 17 | x << 15) ^ (x >>> 19 | x << 13) ^ (x >>> 10)
}

Sha256.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0
  var f = this._f | 0
  var g = this._g | 0
  var h = this._h | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 64; ++i) W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) | 0

  for (var j = 0; j < 64; ++j) {
    var T1 = (h + sigma1(e) + ch(e, f, g) + K[j] + W[j]) | 0
    var T2 = (sigma0(a) + maj(a, b, c)) | 0

    h = g
    g = f
    f = e
    e = (d + T1) | 0
    d = c
    c = b
    b = a
    a = (T1 + T2) | 0
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
  this._f = (f + this._f) | 0
  this._g = (g + this._g) | 0
  this._h = (h + this._h) | 0
}

Sha256.prototype._hash = function () {
  var H = Buffer.allocUnsafe(32)

  H.writeInt32BE(this._a, 0)
  H.writeInt32BE(this._b, 4)
  H.writeInt32BE(this._c, 8)
  H.writeInt32BE(this._d, 12)
  H.writeInt32BE(this._e, 16)
  H.writeInt32BE(this._f, 20)
  H.writeInt32BE(this._g, 24)
  H.writeInt32BE(this._h, 28)

  return H
}

module.exports = Sha256

},{"./hash":33,"inherits":28,"safe-buffer":32}],39:[function(require,module,exports){
var inherits = require('inherits')
var SHA512 = require('./sha512')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var W = new Array(160)

function Sha384 () {
  this.init()
  this._w = W

  Hash.call(this, 128, 112)
}

inherits(Sha384, SHA512)

Sha384.prototype.init = function () {
  this._ah = 0xcbbb9d5d
  this._bh = 0x629a292a
  this._ch = 0x9159015a
  this._dh = 0x152fecd8
  this._eh = 0x67332667
  this._fh = 0x8eb44a87
  this._gh = 0xdb0c2e0d
  this._hh = 0x47b5481d

  this._al = 0xc1059ed8
  this._bl = 0x367cd507
  this._cl = 0x3070dd17
  this._dl = 0xf70e5939
  this._el = 0xffc00b31
  this._fl = 0x68581511
  this._gl = 0x64f98fa7
  this._hl = 0xbefa4fa4

  return this
}

Sha384.prototype._hash = function () {
  var H = Buffer.allocUnsafe(48)

  function writeInt64BE (h, l, offset) {
    H.writeInt32BE(h, offset)
    H.writeInt32BE(l, offset + 4)
  }

  writeInt64BE(this._ah, this._al, 0)
  writeInt64BE(this._bh, this._bl, 8)
  writeInt64BE(this._ch, this._cl, 16)
  writeInt64BE(this._dh, this._dl, 24)
  writeInt64BE(this._eh, this._el, 32)
  writeInt64BE(this._fh, this._fl, 40)

  return H
}

module.exports = Sha384

},{"./hash":33,"./sha512":40,"inherits":28,"safe-buffer":32}],40:[function(require,module,exports){
var inherits = require('inherits')
var Hash = require('./hash')
var Buffer = require('safe-buffer').Buffer

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
]

var W = new Array(160)

function Sha512 () {
  this.init()
  this._w = W

  Hash.call(this, 128, 112)
}

inherits(Sha512, Hash)

Sha512.prototype.init = function () {
  this._ah = 0x6a09e667
  this._bh = 0xbb67ae85
  this._ch = 0x3c6ef372
  this._dh = 0xa54ff53a
  this._eh = 0x510e527f
  this._fh = 0x9b05688c
  this._gh = 0x1f83d9ab
  this._hh = 0x5be0cd19

  this._al = 0xf3bcc908
  this._bl = 0x84caa73b
  this._cl = 0xfe94f82b
  this._dl = 0x5f1d36f1
  this._el = 0xade682d1
  this._fl = 0x2b3e6c1f
  this._gl = 0xfb41bd6b
  this._hl = 0x137e2179

  return this
}

function Ch (x, y, z) {
  return z ^ (x & (y ^ z))
}

function maj (x, y, z) {
  return (x & y) | (z & (x | y))
}

function sigma0 (x, xl) {
  return (x >>> 28 | xl << 4) ^ (xl >>> 2 | x << 30) ^ (xl >>> 7 | x << 25)
}

function sigma1 (x, xl) {
  return (x >>> 14 | xl << 18) ^ (x >>> 18 | xl << 14) ^ (xl >>> 9 | x << 23)
}

function Gamma0 (x, xl) {
  return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7)
}

function Gamma0l (x, xl) {
  return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7 | xl << 25)
}

function Gamma1 (x, xl) {
  return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6)
}

function Gamma1l (x, xl) {
  return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6 | xl << 26)
}

function getCarry (a, b) {
  return (a >>> 0) < (b >>> 0) ? 1 : 0
}

Sha512.prototype._update = function (M) {
  var W = this._w

  var ah = this._ah | 0
  var bh = this._bh | 0
  var ch = this._ch | 0
  var dh = this._dh | 0
  var eh = this._eh | 0
  var fh = this._fh | 0
  var gh = this._gh | 0
  var hh = this._hh | 0

  var al = this._al | 0
  var bl = this._bl | 0
  var cl = this._cl | 0
  var dl = this._dl | 0
  var el = this._el | 0
  var fl = this._fl | 0
  var gl = this._gl | 0
  var hl = this._hl | 0

  for (var i = 0; i < 32; i += 2) {
    W[i] = M.readInt32BE(i * 4)
    W[i + 1] = M.readInt32BE(i * 4 + 4)
  }
  for (; i < 160; i += 2) {
    var xh = W[i - 15 * 2]
    var xl = W[i - 15 * 2 + 1]
    var gamma0 = Gamma0(xh, xl)
    var gamma0l = Gamma0l(xl, xh)

    xh = W[i - 2 * 2]
    xl = W[i - 2 * 2 + 1]
    var gamma1 = Gamma1(xh, xl)
    var gamma1l = Gamma1l(xl, xh)

    // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
    var Wi7h = W[i - 7 * 2]
    var Wi7l = W[i - 7 * 2 + 1]

    var Wi16h = W[i - 16 * 2]
    var Wi16l = W[i - 16 * 2 + 1]

    var Wil = (gamma0l + Wi7l) | 0
    var Wih = (gamma0 + Wi7h + getCarry(Wil, gamma0l)) | 0
    Wil = (Wil + gamma1l) | 0
    Wih = (Wih + gamma1 + getCarry(Wil, gamma1l)) | 0
    Wil = (Wil + Wi16l) | 0
    Wih = (Wih + Wi16h + getCarry(Wil, Wi16l)) | 0

    W[i] = Wih
    W[i + 1] = Wil
  }

  for (var j = 0; j < 160; j += 2) {
    Wih = W[j]
    Wil = W[j + 1]

    var majh = maj(ah, bh, ch)
    var majl = maj(al, bl, cl)

    var sigma0h = sigma0(ah, al)
    var sigma0l = sigma0(al, ah)
    var sigma1h = sigma1(eh, el)
    var sigma1l = sigma1(el, eh)

    // t1 = h + sigma1 + ch + K[j] + W[j]
    var Kih = K[j]
    var Kil = K[j + 1]

    var chh = Ch(eh, fh, gh)
    var chl = Ch(el, fl, gl)

    var t1l = (hl + sigma1l) | 0
    var t1h = (hh + sigma1h + getCarry(t1l, hl)) | 0
    t1l = (t1l + chl) | 0
    t1h = (t1h + chh + getCarry(t1l, chl)) | 0
    t1l = (t1l + Kil) | 0
    t1h = (t1h + Kih + getCarry(t1l, Kil)) | 0
    t1l = (t1l + Wil) | 0
    t1h = (t1h + Wih + getCarry(t1l, Wil)) | 0

    // t2 = sigma0 + maj
    var t2l = (sigma0l + majl) | 0
    var t2h = (sigma0h + majh + getCarry(t2l, sigma0l)) | 0

    hh = gh
    hl = gl
    gh = fh
    gl = fl
    fh = eh
    fl = el
    el = (dl + t1l) | 0
    eh = (dh + t1h + getCarry(el, dl)) | 0
    dh = ch
    dl = cl
    ch = bh
    cl = bl
    bh = ah
    bl = al
    al = (t1l + t2l) | 0
    ah = (t1h + t2h + getCarry(al, t1l)) | 0
  }

  this._al = (this._al + al) | 0
  this._bl = (this._bl + bl) | 0
  this._cl = (this._cl + cl) | 0
  this._dl = (this._dl + dl) | 0
  this._el = (this._el + el) | 0
  this._fl = (this._fl + fl) | 0
  this._gl = (this._gl + gl) | 0
  this._hl = (this._hl + hl) | 0

  this._ah = (this._ah + ah + getCarry(this._al, al)) | 0
  this._bh = (this._bh + bh + getCarry(this._bl, bl)) | 0
  this._ch = (this._ch + ch + getCarry(this._cl, cl)) | 0
  this._dh = (this._dh + dh + getCarry(this._dl, dl)) | 0
  this._eh = (this._eh + eh + getCarry(this._el, el)) | 0
  this._fh = (this._fh + fh + getCarry(this._fl, fl)) | 0
  this._gh = (this._gh + gh + getCarry(this._gl, gl)) | 0
  this._hh = (this._hh + hh + getCarry(this._hl, hl)) | 0
}

Sha512.prototype._hash = function () {
  var H = Buffer.allocUnsafe(64)

  function writeInt64BE (h, l, offset) {
    H.writeInt32BE(h, offset)
    H.writeInt32BE(l, offset + 4)
  }

  writeInt64BE(this._ah, this._al, 0)
  writeInt64BE(this._bh, this._bl, 8)
  writeInt64BE(this._ch, this._cl, 16)
  writeInt64BE(this._dh, this._dl, 24)
  writeInt64BE(this._eh, this._el, 32)
  writeInt64BE(this._fh, this._fl, 40)
  writeInt64BE(this._gh, this._gl, 48)
  writeInt64BE(this._hh, this._hl, 56)

  return H
}

module.exports = Sha512

},{"./hash":33,"inherits":28,"safe-buffer":32}],41:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/lib/_stream_readable.js');
Stream.Writable = require('readable-stream/lib/_stream_writable.js');
Stream.Duplex = require('readable-stream/lib/_stream_duplex.js');
Stream.Transform = require('readable-stream/lib/_stream_transform.js');
Stream.PassThrough = require('readable-stream/lib/_stream_passthrough.js');
Stream.finished = require('readable-stream/lib/internal/streams/end-of-stream.js')
Stream.pipeline = require('readable-stream/lib/internal/streams/pipeline.js')

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":9,"inherits":42,"readable-stream/lib/_stream_duplex.js":44,"readable-stream/lib/_stream_passthrough.js":45,"readable-stream/lib/_stream_readable.js":46,"readable-stream/lib/_stream_transform.js":47,"readable-stream/lib/_stream_writable.js":48,"readable-stream/lib/internal/streams/end-of-stream.js":52,"readable-stream/lib/internal/streams/pipeline.js":54}],42:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],43:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"dup":12}],44:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"./_stream_readable":46,"./_stream_writable":48,"_process":30,"dup":13,"inherits":42}],45:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"./_stream_transform":47,"dup":14,"inherits":42}],46:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"../errors":43,"./_stream_duplex":44,"./internal/streams/async_iterator":49,"./internal/streams/buffer_list":50,"./internal/streams/destroy":51,"./internal/streams/from":53,"./internal/streams/state":55,"./internal/streams/stream":56,"_process":30,"buffer":4,"dup":15,"events":9,"inherits":42,"string_decoder/":57,"util":3}],47:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"../errors":43,"./_stream_duplex":44,"dup":16,"inherits":42}],48:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"../errors":43,"./_stream_duplex":44,"./internal/streams/destroy":51,"./internal/streams/state":55,"./internal/streams/stream":56,"_process":30,"buffer":4,"dup":17,"inherits":42,"util-deprecate":58}],49:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./end-of-stream":52,"_process":30,"dup":18}],50:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"buffer":4,"dup":19,"util":3}],51:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"_process":30,"dup":20}],52:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"../../../errors":43,"dup":21}],53:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],54:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"../../../errors":43,"./end-of-stream":52,"dup":23}],55:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"../../../errors":43,"dup":24}],56:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25,"events":9}],57:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":32}],58:[function(require,module,exports){
(function (global){(function (){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1]);

// --- JetStreamExtra/bigint/noble-secp256k1-bundle.js ---

// The MIT License (MIT)

// Copyright (c) 2019 Paul Miller (https://paulmillr.com)

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = exports.schnorr = exports.verify = exports.signSync = exports.sign = exports.getSharedSecret = exports.recoverPublicKey = exports.getPublicKey = exports.Signature = exports.Point = exports.CURVE = void 0;
const nodeCrypto = require("crypto");
const _0n = BigInt(0);
const _1n = BigInt(1);
const _2n = BigInt(2);
const _3n = BigInt(3);
const _8n = BigInt(8);
const CURVE = Object.freeze({
    a: _0n,
    b: BigInt(7),
    P: BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f'),
    n: BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'),
    h: _1n,
    Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
    Gy: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
    beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee'),
});
exports.CURVE = CURVE;
function weistrass(x) {
    const { a, b } = CURVE;
    const x2 = mod(x * x);
    const x3 = mod(x2 * x);
    return mod(x3 + a * x + b);
}
const USE_ENDOMORPHISM = CURVE.a === _0n;
class ShaError extends Error {
    constructor(message) {
        super(message);
    }
}
class JacobianPoint {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    static fromAffine(p) {
        if (!(p instanceof Point)) {
            throw new TypeError('JacobianPoint#fromAffine: expected Point');
        }
        return new JacobianPoint(p.x, p.y, _1n);
    }
    static toAffineBatch(points) {
        const toInv = invertBatch(points.map((p) => p.z));
        return points.map((p, i) => p.toAffine(toInv[i]));
    }
    static normalizeZ(points) {
        return JacobianPoint.toAffineBatch(points).map(JacobianPoint.fromAffine);
    }
    equals(other) {
        if (!(other instanceof JacobianPoint))
            throw new TypeError('JacobianPoint expected');
        const { x: X1, y: Y1, z: Z1 } = this;
        const { x: X2, y: Y2, z: Z2 } = other;
        const Z1Z1 = mod(Z1 * Z1);
        const Z2Z2 = mod(Z2 * Z2);
        const U1 = mod(X1 * Z2Z2);
        const U2 = mod(X2 * Z1Z1);
        const S1 = mod(mod(Y1 * Z2) * Z2Z2);
        const S2 = mod(mod(Y2 * Z1) * Z1Z1);
        return U1 === U2 && S1 === S2;
    }
    negate() {
        return new JacobianPoint(this.x, mod(-this.y), this.z);
    }
    double() {
        const { x: X1, y: Y1, z: Z1 } = this;
        const A = mod(X1 * X1);
        const B = mod(Y1 * Y1);
        const C = mod(B * B);
        const x1b = X1 + B;
        const D = mod(_2n * (mod(x1b * x1b) - A - C));
        const E = mod(_3n * A);
        const F = mod(E * E);
        const X3 = mod(F - _2n * D);
        const Y3 = mod(E * (D - X3) - _8n * C);
        const Z3 = mod(_2n * Y1 * Z1);
        return new JacobianPoint(X3, Y3, Z3);
    }
    add(other) {
        if (!(other instanceof JacobianPoint))
            throw new TypeError('JacobianPoint expected');
        const { x: X1, y: Y1, z: Z1 } = this;
        const { x: X2, y: Y2, z: Z2 } = other;
        if (X2 === _0n || Y2 === _0n)
            return this;
        if (X1 === _0n || Y1 === _0n)
            return other;
        const Z1Z1 = mod(Z1 * Z1);
        const Z2Z2 = mod(Z2 * Z2);
        const U1 = mod(X1 * Z2Z2);
        const U2 = mod(X2 * Z1Z1);
        const S1 = mod(mod(Y1 * Z2) * Z2Z2);
        const S2 = mod(mod(Y2 * Z1) * Z1Z1);
        const H = mod(U2 - U1);
        const r = mod(S2 - S1);
        if (H === _0n) {
            if (r === _0n) {
                return this.double();
            }
            else {
                return JacobianPoint.ZERO;
            }
        }
        const HH = mod(H * H);
        const HHH = mod(H * HH);
        const V = mod(U1 * HH);
        const X3 = mod(r * r - HHH - _2n * V);
        const Y3 = mod(r * (V - X3) - S1 * HHH);
        const Z3 = mod(Z1 * Z2 * H);
        return new JacobianPoint(X3, Y3, Z3);
    }
    subtract(other) {
        return this.add(other.negate());
    }
    multiplyUnsafe(scalar) {
        const P0 = JacobianPoint.ZERO;
        if (typeof scalar === 'bigint' && scalar === _0n)
            return P0;
        let n = normalizeScalar(scalar);
        if (n === _1n)
            return this;
        if (!USE_ENDOMORPHISM) {
            let p = P0;
            let d = this;
            while (n > _0n) {
                if (n & _1n)
                    p = p.add(d);
                d = d.double();
                n >>= _1n;
            }
            return p;
        }
        let { k1neg, k1, k2neg, k2 } = splitScalarEndo(n);
        let k1p = P0;
        let k2p = P0;
        let d = this;
        while (k1 > _0n || k2 > _0n) {
            if (k1 & _1n)
                k1p = k1p.add(d);
            if (k2 & _1n)
                k2p = k2p.add(d);
            d = d.double();
            k1 >>= _1n;
            k2 >>= _1n;
        }
        if (k1neg)
            k1p = k1p.negate();
        if (k2neg)
            k2p = k2p.negate();
        k2p = new JacobianPoint(mod(k2p.x * CURVE.beta), k2p.y, k2p.z);
        return k1p.add(k2p);
    }
    precomputeWindow(W) {
        const windows = USE_ENDOMORPHISM ? 128 / W + 1 : 256 / W + 1;
        const points = [];
        let p = this;
        let base = p;
        for (let window = 0; window < windows; window++) {
            base = p;
            points.push(base);
            for (let i = 1; i < 2 ** (W - 1); i++) {
                base = base.add(p);
                points.push(base);
            }
            p = base.double();
        }
        return points;
    }
    wNAF(n, affinePoint) {
        if (!affinePoint && this.equals(JacobianPoint.BASE))
            affinePoint = Point.BASE;
        const W = (affinePoint && affinePoint._WINDOW_SIZE) || 1;
        if (256 % W) {
            throw new Error('Point#wNAF: Invalid precomputation window, must be power of 2');
        }
        let precomputes = affinePoint && pointPrecomputes.get(affinePoint);
        if (!precomputes) {
            precomputes = this.precomputeWindow(W);
            if (affinePoint && W !== 1) {
                precomputes = JacobianPoint.normalizeZ(precomputes);
                pointPrecomputes.set(affinePoint, precomputes);
            }
        }
        let p = JacobianPoint.ZERO;
        let f = JacobianPoint.ZERO;
        const windows = 1 + (USE_ENDOMORPHISM ? 128 / W : 256 / W);
        const windowSize = 2 ** (W - 1);
        const mask = BigInt(2 ** W - 1);
        const maxNumber = 2 ** W;
        const shiftBy = BigInt(W);
        for (let window = 0; window < windows; window++) {
            const offset = window * windowSize;
            let wbits = Number(n & mask);
            n >>= shiftBy;
            if (wbits > windowSize) {
                wbits -= maxNumber;
                n += _1n;
            }
            if (wbits === 0) {
                let pr = precomputes[offset];
                if (window % 2)
                    pr = pr.negate();
                f = f.add(pr);
            }
            else {
                let cached = precomputes[offset + Math.abs(wbits) - 1];
                if (wbits < 0)
                    cached = cached.negate();
                p = p.add(cached);
            }
        }
        return { p, f };
    }
    multiply(scalar, affinePoint) {
        let n = normalizeScalar(scalar);
        let point;
        let fake;
        if (USE_ENDOMORPHISM) {
            const { k1neg, k1, k2neg, k2 } = splitScalarEndo(n);
            let { p: k1p, f: f1p } = this.wNAF(k1, affinePoint);
            let { p: k2p, f: f2p } = this.wNAF(k2, affinePoint);
            if (k1neg)
                k1p = k1p.negate();
            if (k2neg)
                k2p = k2p.negate();
            k2p = new JacobianPoint(mod(k2p.x * CURVE.beta), k2p.y, k2p.z);
            point = k1p.add(k2p);
            fake = f1p.add(f2p);
        }
        else {
            const { p, f } = this.wNAF(n, affinePoint);
            point = p;
            fake = f;
        }
        return JacobianPoint.normalizeZ([point, fake])[0];
    }
    toAffine(invZ = invert(this.z)) {
        const { x, y, z } = this;
        const iz1 = invZ;
        const iz2 = mod(iz1 * iz1);
        const iz3 = mod(iz2 * iz1);
        const ax = mod(x * iz2);
        const ay = mod(y * iz3);
        const zz = mod(z * iz1);
        if (zz !== _1n)
            throw new Error('invZ was invalid');
        return new Point(ax, ay);
    }
}
JacobianPoint.BASE = new JacobianPoint(CURVE.Gx, CURVE.Gy, _1n);
JacobianPoint.ZERO = new JacobianPoint(_0n, _1n, _0n);
const pointPrecomputes = new WeakMap();
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    _setWindowSize(windowSize) {
        this._WINDOW_SIZE = windowSize;
        pointPrecomputes.delete(this);
    }
    hasEvenY() {
        return this.y % _2n === _0n;
    }
    static fromCompressedHex(bytes) {
        const isShort = bytes.length === 32;
        const x = bytesToNumber(isShort ? bytes : bytes.subarray(1));
        if (!isValidFieldElement(x))
            throw new Error('Point is not on curve');
        const y2 = weistrass(x);
        let y = sqrtMod(y2);
        const isYOdd = (y & _1n) === _1n;
        if (isShort) {
            if (isYOdd)
                y = mod(-y);
        }
        else {
            const isFirstByteOdd = (bytes[0] & 1) === 1;
            if (isFirstByteOdd !== isYOdd)
                y = mod(-y);
        }
        const point = new Point(x, y);
        point.assertValidity();
        return point;
    }
    static fromUncompressedHex(bytes) {
        const x = bytesToNumber(bytes.subarray(1, 33));
        const y = bytesToNumber(bytes.subarray(33, 65));
        const point = new Point(x, y);
        point.assertValidity();
        return point;
    }
    static fromHex(hex) {
        const bytes = ensureBytes(hex);
        const len = bytes.length;
        const header = bytes[0];
        if (len === 32 || (len === 33 && (header === 0x02 || header === 0x03))) {
            return this.fromCompressedHex(bytes);
        }
        if (len === 65 && header === 0x04)
            return this.fromUncompressedHex(bytes);
        throw new Error(`Point.fromHex: received invalid point. Expected 32-33 compressed bytes or 65 uncompressed bytes, not ${len}`);
    }
    static fromPrivateKey(privateKey) {
        return Point.BASE.multiply(normalizePrivateKey(privateKey));
    }
    static fromSignature(msgHash, signature, recovery) {
        msgHash = ensureBytes(msgHash);
        const h = truncateHash(msgHash);
        const { r, s } = normalizeSignature(signature);
        if (recovery !== 0 && recovery !== 1) {
            throw new Error('Cannot recover signature: invalid recovery bit');
        }
        const prefix = recovery & 1 ? '03' : '02';
        const R = Point.fromHex(prefix + numTo32bStr(r));
        const { n } = CURVE;
        const rinv = invert(r, n);
        const u1 = mod(-h * rinv, n);
        const u2 = mod(s * rinv, n);
        const Q = Point.BASE.multiplyAndAddUnsafe(R, u1, u2);
        if (!Q)
            throw new Error('Cannot recover signature: point at infinify');
        Q.assertValidity();
        return Q;
    }
    toRawBytes(isCompressed = false) {
        return hexToBytes(this.toHex(isCompressed));
    }
    toHex(isCompressed = false) {
        const x = numTo32bStr(this.x);
        if (isCompressed) {
            const prefix = this.hasEvenY() ? '02' : '03';
            return `${prefix}${x}`;
        }
        else {
            return `04${x}${numTo32bStr(this.y)}`;
        }
    }
    toHexX() {
        return this.toHex(true).slice(2);
    }
    toRawX() {
        return this.toRawBytes(true).slice(1);
    }
    assertValidity() {
        const msg = 'Point is not on elliptic curve';
        const { x, y } = this;
        if (!isValidFieldElement(x) || !isValidFieldElement(y))
            throw new Error(msg);
        const left = mod(y * y);
        const right = weistrass(x);
        if (mod(left - right) !== _0n)
            throw new Error(msg);
    }
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }
    negate() {
        return new Point(this.x, mod(-this.y));
    }
    double() {
        return JacobianPoint.fromAffine(this).double().toAffine();
    }
    add(other) {
        return JacobianPoint.fromAffine(this).add(JacobianPoint.fromAffine(other)).toAffine();
    }
    subtract(other) {
        return this.add(other.negate());
    }
    multiply(scalar) {
        return JacobianPoint.fromAffine(this).multiply(scalar, this).toAffine();
    }
    multiplyAndAddUnsafe(Q, a, b) {
        const P = JacobianPoint.fromAffine(this);
        const aP = a === _0n || a === _1n || this !== Point.BASE ? P.multiplyUnsafe(a) : P.multiply(a);
        const bQ = JacobianPoint.fromAffine(Q).multiplyUnsafe(b);
        const sum = aP.add(bQ);
        return sum.equals(JacobianPoint.ZERO) ? undefined : sum.toAffine();
    }
}
exports.Point = Point;
Point.BASE = new Point(CURVE.Gx, CURVE.Gy);
Point.ZERO = new Point(_0n, _0n);
function sliceDER(s) {
    return Number.parseInt(s[0], 16) >= 8 ? '00' + s : s;
}
function parseDERInt(data) {
    if (data.length < 2 || data[0] !== 0x02) {
        throw new Error(`Invalid signature integer tag: ${bytesToHex(data)}`);
    }
    const len = data[1];
    const res = data.subarray(2, len + 2);
    if (!len || res.length !== len) {
        throw new Error(`Invalid signature integer: wrong length`);
    }
    if (res[0] === 0x00 && res[1] <= 0x7f) {
        throw new Error('Invalid signature integer: trailing length');
    }
    return { data: bytesToNumber(res), left: data.subarray(len + 2) };
}
function parseDERSignature(data) {
    if (data.length < 2 || data[0] != 0x30) {
        throw new Error(`Invalid signature tag: ${bytesToHex(data)}`);
    }
    if (data[1] !== data.length - 2) {
        throw new Error('Invalid signature: incorrect length');
    }
    const { data: r, left: sBytes } = parseDERInt(data.subarray(2));
    const { data: s, left: rBytesLeft } = parseDERInt(sBytes);
    if (rBytesLeft.length) {
        throw new Error(`Invalid signature: left bytes after parsing: ${bytesToHex(rBytesLeft)}`);
    }
    return { r, s };
}
class Signature {
    constructor(r, s) {
        this.r = r;
        this.s = s;
        this.assertValidity();
    }
    static fromCompact(hex) {
        const arr = hex instanceof Uint8Array;
        const name = 'Signature.fromCompact';
        if (typeof hex !== 'string' && !arr)
            throw new TypeError(`${name}: Expected string or Uint8Array`);
        const str = arr ? bytesToHex(hex) : hex;
        if (str.length !== 128)
            throw new Error(`${name}: Expected 64-byte hex`);
        return new Signature(hexToNumber(str.slice(0, 64)), hexToNumber(str.slice(64, 128)));
    }
    static fromDER(hex) {
        const arr = hex instanceof Uint8Array;
        if (typeof hex !== 'string' && !arr)
            throw new TypeError(`Signature.fromDER: Expected string or Uint8Array`);
        const { r, s } = parseDERSignature(arr ? hex : hexToBytes(hex));
        return new Signature(r, s);
    }
    static fromHex(hex) {
        return this.fromDER(hex);
    }
    assertValidity() {
        const { r, s } = this;
        if (!isWithinCurveOrder(r))
            throw new Error('Invalid Signature: r must be 0 < r < n');
        if (!isWithinCurveOrder(s))
            throw new Error('Invalid Signature: s must be 0 < s < n');
    }
    hasHighS() {
        const HALF = CURVE.n >> _1n;
        return this.s > HALF;
    }
    normalizeS() {
        return this.hasHighS() ? new Signature(this.r, CURVE.n - this.s) : this;
    }
    toDERRawBytes(isCompressed = false) {
        return hexToBytes(this.toDERHex(isCompressed));
    }
    toDERHex(isCompressed = false) {
        const sHex = sliceDER(numberToHexUnpadded(this.s));
        if (isCompressed)
            return sHex;
        const rHex = sliceDER(numberToHexUnpadded(this.r));
        const rLen = numberToHexUnpadded(rHex.length / 2);
        const sLen = numberToHexUnpadded(sHex.length / 2);
        const length = numberToHexUnpadded(rHex.length / 2 + sHex.length / 2 + 4);
        return `30${length}02${rLen}${rHex}02${sLen}${sHex}`;
    }
    toRawBytes() {
        return this.toDERRawBytes();
    }
    toHex() {
        return this.toDERHex();
    }
    toCompactRawBytes() {
        return hexToBytes(this.toCompactHex());
    }
    toCompactHex() {
        return numTo32bStr(this.r) + numTo32bStr(this.s);
    }
}
exports.Signature = Signature;
function concatBytes(...arrays) {
    if (!arrays.every((b) => b instanceof Uint8Array))
        throw new Error('Uint8Array list expected');
    if (arrays.length === 1)
        return arrays[0];
    const length = arrays.reduce((a, arr) => a + arr.length, 0);
    const result = new Uint8Array(length);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
        const arr = arrays[i];
        result.set(arr, pad);
        pad += arr.length;
    }
    return result;
}
const hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
function bytesToHex(uint8a) {
    if (!(uint8a instanceof Uint8Array))
        throw new Error('Expected Uint8Array');
    let hex = '';
    for (let i = 0; i < uint8a.length; i++) {
        hex += hexes[uint8a[i]];
    }
    return hex;
}
const POW_2_256 = BigInt('0x10000000000000000000000000000000000000000000000000000000000000000');
function numTo32bStr(num) {
    if (typeof num !== 'bigint')
        throw new Error('Expected bigint');
    if (!(_0n <= num && num < POW_2_256))
        throw new Error('Expected number < 2^256');
    return num.toString(16).padStart(64, '0');
}
function numTo32b(num) {
    const b = hexToBytes(numTo32bStr(num));
    if (b.length !== 32)
        throw new Error('Error: expected 32 bytes');
    return b;
}
function numberToHexUnpadded(num) {
    const hex = num.toString(16);
    return hex.length & 1 ? `0${hex}` : hex;
}
function hexToNumber(hex) {
    if (typeof hex !== 'string') {
        throw new TypeError('hexToNumber: expected string, got ' + typeof hex);
    }
    return BigInt(`0x${hex}`);
}
function hexToBytes(hex) {
    if (typeof hex !== 'string') {
        throw new TypeError('hexToBytes: expected string, got ' + typeof hex);
    }
    if (hex.length % 2)
        throw new Error('hexToBytes: received invalid unpadded hex' + hex.length);
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < array.length; i++) {
        const j = i * 2;
        const hexByte = hex.slice(j, j + 2);
        const byte = Number.parseInt(hexByte, 16);
        if (Number.isNaN(byte) || byte < 0)
            throw new Error('Invalid byte sequence');
        array[i] = byte;
    }
    return array;
}
function bytesToNumber(bytes) {
    return hexToNumber(bytesToHex(bytes));
}
function ensureBytes(hex) {
    return hex instanceof Uint8Array ? Uint8Array.from(hex) : hexToBytes(hex);
}
function normalizeScalar(num) {
    if (typeof num === 'number' && Number.isSafeInteger(num) && num > 0)
        return BigInt(num);
    if (typeof num === 'bigint' && isWithinCurveOrder(num))
        return num;
    throw new TypeError('Expected valid private scalar: 0 < scalar < curve.n');
}
function mod(a, b = CURVE.P) {
    const result = a % b;
    return result >= _0n ? result : b + result;
}
function pow2(x, power) {
    const { P } = CURVE;
    let res = x;
    while (power-- > _0n) {
        res *= res;
        res %= P;
    }
    return res;
}
function sqrtMod(x) {
    const { P } = CURVE;
    const _6n = BigInt(6);
    const _11n = BigInt(11);
    const _22n = BigInt(22);
    const _23n = BigInt(23);
    const _44n = BigInt(44);
    const _88n = BigInt(88);
    const b2 = (x * x * x) % P;
    const b3 = (b2 * b2 * x) % P;
    const b6 = (pow2(b3, _3n) * b3) % P;
    const b9 = (pow2(b6, _3n) * b3) % P;
    const b11 = (pow2(b9, _2n) * b2) % P;
    const b22 = (pow2(b11, _11n) * b11) % P;
    const b44 = (pow2(b22, _22n) * b22) % P;
    const b88 = (pow2(b44, _44n) * b44) % P;
    const b176 = (pow2(b88, _88n) * b88) % P;
    const b220 = (pow2(b176, _44n) * b44) % P;
    const b223 = (pow2(b220, _3n) * b3) % P;
    const t1 = (pow2(b223, _23n) * b22) % P;
    const t2 = (pow2(t1, _6n) * b2) % P;
    return pow2(t2, _2n);
}
function invert(number, modulo = CURVE.P) {
    if (number === _0n || modulo <= _0n) {
        throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
    }
    let a = mod(number, modulo);
    let b = modulo;
    let x = _0n, y = _1n, u = _1n, v = _0n;
    while (a !== _0n) {
        const q = b / a;
        const r = b % a;
        const m = x - u * q;
        const n = y - v * q;
        b = a, a = r, x = u, y = v, u = m, v = n;
    }
    const gcd = b;
    if (gcd !== _1n)
        throw new Error('invert: does not exist');
    return mod(x, modulo);
}
function invertBatch(nums, p = CURVE.P) {
    const scratch = new Array(nums.length);
    const lastMultiplied = nums.reduce((acc, num, i) => {
        if (num === _0n)
            return acc;
        scratch[i] = acc;
        return mod(acc * num, p);
    }, _1n);
    const inverted = invert(lastMultiplied, p);
    nums.reduceRight((acc, num, i) => {
        if (num === _0n)
            return acc;
        scratch[i] = mod(acc * scratch[i], p);
        return mod(acc * num, p);
    }, inverted);
    return scratch;
}
const divNearest = (a, b) => (a + b / _2n) / b;
const ENDO = {
    a1: BigInt('0x3086d221a7d46bcde86c90e49284eb15'),
    b1: -_1n * BigInt('0xe4437ed6010e88286f547fa90abfe4c3'),
    a2: BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8'),
    b2: BigInt('0x3086d221a7d46bcde86c90e49284eb15'),
    POW_2_128: BigInt('0x100000000000000000000000000000000'),
};
function splitScalarEndo(k) {
    const { n } = CURVE;
    const { a1, b1, a2, b2, POW_2_128 } = ENDO;
    const c1 = divNearest(b2 * k, n);
    const c2 = divNearest(-b1 * k, n);
    let k1 = mod(k - c1 * a1 - c2 * a2, n);
    let k2 = mod(-c1 * b1 - c2 * b2, n);
    const k1neg = k1 > POW_2_128;
    const k2neg = k2 > POW_2_128;
    if (k1neg)
        k1 = n - k1;
    if (k2neg)
        k2 = n - k2;
    if (k1 > POW_2_128 || k2 > POW_2_128) {
        throw new Error('splitScalarEndo: Endomorphism failed, k=' + k);
    }
    return { k1neg, k1, k2neg, k2 };
}
function truncateHash(hash) {
    const { n } = CURVE;
    const byteLength = hash.length;
    const delta = byteLength * 8 - 256;
    let h = bytesToNumber(hash);
    if (delta > 0)
        h = h >> BigInt(delta);
    if (h >= n)
        h -= n;
    return h;
}
let _sha256Sync;
let _hmacSha256Sync;
class HmacDrbg {
    constructor() {
        this.v = new Uint8Array(32).fill(1);
        this.k = new Uint8Array(32).fill(0);
        this.counter = 0;
    }
    hmac(...values) {
        return exports.utils.hmacSha256(this.k, ...values);
    }
    hmacSync(...values) {
        return _hmacSha256Sync(this.k, ...values);
    }
    checkSync() {
        if (typeof _hmacSha256Sync !== 'function')
            throw new ShaError('hmacSha256Sync needs to be set');
    }
    incr() {
        if (this.counter >= 1000)
            throw new Error('Tried 1,000 k values for sign(), all were invalid');
        this.counter += 1;
    }
    async reseed(seed = new Uint8Array()) {
        this.k = await this.hmac(this.v, Uint8Array.from([0x00]), seed);
        this.v = await this.hmac(this.v);
        if (seed.length === 0)
            return;
        this.k = await this.hmac(this.v, Uint8Array.from([0x01]), seed);
        this.v = await this.hmac(this.v);
    }
    reseedSync(seed = new Uint8Array()) {
        this.checkSync();
        this.k = this.hmacSync(this.v, Uint8Array.from([0x00]), seed);
        this.v = this.hmacSync(this.v);
        if (seed.length === 0)
            return;
        this.k = this.hmacSync(this.v, Uint8Array.from([0x01]), seed);
        this.v = this.hmacSync(this.v);
    }
    async generate() {
        this.incr();
        this.v = await this.hmac(this.v);
        return this.v;
    }
    generateSync() {
        this.checkSync();
        this.incr();
        this.v = this.hmacSync(this.v);
        return this.v;
    }
}
function isWithinCurveOrder(num) {
    return _0n < num && num < CURVE.n;
}
function isValidFieldElement(num) {
    return _0n < num && num < CURVE.P;
}
function kmdToSig(kBytes, m, d) {
    const k = bytesToNumber(kBytes);
    if (!isWithinCurveOrder(k))
        return;
    const { n } = CURVE;
    const q = Point.BASE.multiply(k);
    const r = mod(q.x, n);
    if (r === _0n)
        return;
    const s = mod(invert(k, n) * mod(m + d * r, n), n);
    if (s === _0n)
        return;
    const sig = new Signature(r, s);
    const recovery = (q.x === sig.r ? 0 : 2) | Number(q.y & _1n);
    return { sig, recovery };
}
function normalizePrivateKey(key) {
    let num;
    if (typeof key === 'bigint') {
        num = key;
    }
    else if (typeof key === 'number' && Number.isSafeInteger(key) && key > 0) {
        num = BigInt(key);
    }
    else if (typeof key === 'string') {
        if (key.length !== 64)
            throw new Error('Expected 32 bytes of private key');
        num = hexToNumber(key);
    }
    else if (key instanceof Uint8Array) {
        if (key.length !== 32)
            throw new Error('Expected 32 bytes of private key');
        num = bytesToNumber(key);
    }
    else {
        throw new TypeError('Expected valid private key');
    }
    if (!isWithinCurveOrder(num))
        throw new Error('Expected private key: 0 < key < n');
    return num;
}
function normalizePublicKey(publicKey) {
    if (publicKey instanceof Point) {
        publicKey.assertValidity();
        return publicKey;
    }
    else {
        return Point.fromHex(publicKey);
    }
}
function normalizeSignature(signature) {
    if (signature instanceof Signature) {
        signature.assertValidity();
        return signature;
    }
    try {
        return Signature.fromDER(signature);
    }
    catch (error) {
        return Signature.fromCompact(signature);
    }
}
function getPublicKey(privateKey, isCompressed = false) {
    return Point.fromPrivateKey(privateKey).toRawBytes(isCompressed);
}
exports.getPublicKey = getPublicKey;
function recoverPublicKey(msgHash, signature, recovery, isCompressed = false) {
    return Point.fromSignature(msgHash, signature, recovery).toRawBytes(isCompressed);
}
exports.recoverPublicKey = recoverPublicKey;
function isProbPub(item) {
    const arr = item instanceof Uint8Array;
    const str = typeof item === 'string';
    const len = (arr || str) && item.length;
    if (arr)
        return len === 33 || len === 65;
    if (str)
        return len === 66 || len === 130;
    if (item instanceof Point)
        return true;
    return false;
}
function getSharedSecret(privateA, publicB, isCompressed = false) {
    if (isProbPub(privateA))
        throw new TypeError('getSharedSecret: first arg must be private key');
    if (!isProbPub(publicB))
        throw new TypeError('getSharedSecret: second arg must be public key');
    const b = normalizePublicKey(publicB);
    b.assertValidity();
    return b.multiply(normalizePrivateKey(privateA)).toRawBytes(isCompressed);
}
exports.getSharedSecret = getSharedSecret;
function bits2int(bytes) {
    const slice = bytes.length > 32 ? bytes.slice(0, 32) : bytes;
    return bytesToNumber(slice);
}
function bits2octets(bytes) {
    const z1 = bits2int(bytes);
    const z2 = mod(z1, CURVE.n);
    return int2octets(z2 < _0n ? z1 : z2);
}
function int2octets(num) {
    return numTo32b(num);
}
function initSigArgs(msgHash, privateKey, extraEntropy) {
    if (msgHash == null)
        throw new Error(`sign: expected valid message hash, not "${msgHash}"`);
    const h1 = ensureBytes(msgHash);
    const d = normalizePrivateKey(privateKey);
    const seedArgs = [int2octets(d), bits2octets(h1)];
    if (extraEntropy != null) {
        if (extraEntropy === true)
            extraEntropy = exports.utils.randomBytes(32);
        const e = ensureBytes(extraEntropy);
        if (e.length !== 32)
            throw new Error('sign: Expected 32 bytes of extra data');
        seedArgs.push(e);
    }
    const seed = concatBytes(...seedArgs);
    const m = bits2int(h1);
    return { seed, m, d };
}
function finalizeSig(recSig, opts) {
    let { sig, recovery } = recSig;
    const { canonical, der, recovered } = Object.assign({ canonical: true, der: true }, opts);
    if (canonical && sig.hasHighS()) {
        sig = sig.normalizeS();
        recovery ^= 1;
    }
    const hashed = der ? sig.toDERRawBytes() : sig.toCompactRawBytes();
    return recovered ? [hashed, recovery] : hashed;
}
async function sign(msgHash, privKey, opts = {}) {
    const { seed, m, d } = initSigArgs(msgHash, privKey, opts.extraEntropy);
    let sig;
    const drbg = new HmacDrbg();
    await drbg.reseed(seed);
    while (!(sig = kmdToSig(await drbg.generate(), m, d)))
        await drbg.reseed();
    return finalizeSig(sig, opts);
}
exports.sign = sign;
function signSync(msgHash, privKey, opts = {}) {
    const { seed, m, d } = initSigArgs(msgHash, privKey, opts.extraEntropy);
    let sig;
    const drbg = new HmacDrbg();
    drbg.reseedSync(seed);
    while (!(sig = kmdToSig(drbg.generateSync(), m, d)))
        drbg.reseedSync();
    return finalizeSig(sig, opts);
}
exports.signSync = signSync;
const vopts = { strict: true };
function verify(signature, msgHash, publicKey, opts = vopts) {
    let sig;
    try {
        sig = normalizeSignature(signature);
        msgHash = ensureBytes(msgHash);
    }
    catch (error) {
        return false;
    }
    const { r, s } = sig;
    if (opts.strict && sig.hasHighS())
        return false;
    const h = truncateHash(msgHash);
    let P;
    try {
        P = normalizePublicKey(publicKey);
    }
    catch (error) {
        return false;
    }
    const { n } = CURVE;
    const sinv = invert(s, n);
    const u1 = mod(h * sinv, n);
    const u2 = mod(r * sinv, n);
    const R = Point.BASE.multiplyAndAddUnsafe(P, u1, u2);
    if (!R)
        return false;
    const v = mod(R.x, n);
    return v === r;
}
exports.verify = verify;
function schnorrChallengeFinalize(ch) {
    return mod(bytesToNumber(ch), CURVE.n);
}
class SchnorrSignature {
    constructor(r, s) {
        this.r = r;
        this.s = s;
        this.assertValidity();
    }
    static fromHex(hex) {
        const bytes = ensureBytes(hex);
        if (bytes.length !== 64)
            throw new TypeError(`SchnorrSignature.fromHex: expected 64 bytes, not ${bytes.length}`);
        const r = bytesToNumber(bytes.subarray(0, 32));
        const s = bytesToNumber(bytes.subarray(32, 64));
        return new SchnorrSignature(r, s);
    }
    assertValidity() {
        const { r, s } = this;
        if (!isValidFieldElement(r) || !isWithinCurveOrder(s))
            throw new Error('Invalid signature');
    }
    toHex() {
        return numTo32bStr(this.r) + numTo32bStr(this.s);
    }
    toRawBytes() {
        return hexToBytes(this.toHex());
    }
}
function schnorrGetPublicKey(privateKey) {
    return Point.fromPrivateKey(privateKey).toRawX();
}
class InternalSchnorrSignature {
    constructor(message, privateKey, auxRand = exports.utils.randomBytes()) {
        if (message == null)
            throw new TypeError(`sign: Expected valid message, not "${message}"`);
        this.m = ensureBytes(message);
        const { x, scalar } = this.getScalar(normalizePrivateKey(privateKey));
        this.px = x;
        this.d = scalar;
        this.rand = ensureBytes(auxRand);
        if (this.rand.length !== 32)
            throw new TypeError('sign: Expected 32 bytes of aux randomness');
    }
    getScalar(priv) {
        const point = Point.fromPrivateKey(priv);
        const scalar = point.hasEvenY() ? priv : CURVE.n - priv;
        return { point, scalar, x: point.toRawX() };
    }
    initNonce(d, t0h) {
        return numTo32b(d ^ bytesToNumber(t0h));
    }
    finalizeNonce(k0h) {
        const k0 = mod(bytesToNumber(k0h), CURVE.n);
        if (k0 === _0n)
            throw new Error('sign: Creation of signature failed. k is zero');
        const { point: R, x: rx, scalar: k } = this.getScalar(k0);
        return { R, rx, k };
    }
    finalizeSig(R, k, e, d) {
        return new SchnorrSignature(R.x, mod(k + e * d, CURVE.n)).toRawBytes();
    }
    error() {
        throw new Error('sign: Invalid signature produced');
    }
    async calc() {
        const { m, d, px, rand } = this;
        const tag = exports.utils.taggedHash;
        const t = this.initNonce(d, await tag(TAGS.aux, rand));
        const { R, rx, k } = this.finalizeNonce(await tag(TAGS.nonce, t, px, m));
        const e = schnorrChallengeFinalize(await tag(TAGS.challenge, rx, px, m));
        const sig = this.finalizeSig(R, k, e, d);
        if (!(await schnorrVerify(sig, m, px)))
            this.error();
        return sig;
    }
    calcSync() {
        const { m, d, px, rand } = this;
        const tag = exports.utils.taggedHashSync;
        const t = this.initNonce(d, tag(TAGS.aux, rand));
        const { R, rx, k } = this.finalizeNonce(tag(TAGS.nonce, t, px, m));
        const e = schnorrChallengeFinalize(tag(TAGS.challenge, rx, px, m));
        const sig = this.finalizeSig(R, k, e, d);
        if (!schnorrVerifySync(sig, m, px))
            this.error();
        return sig;
    }
}
async function schnorrSign(msg, privKey, auxRand) {
    return new InternalSchnorrSignature(msg, privKey, auxRand).calc();
}
function schnorrSignSync(msg, privKey, auxRand) {
    return new InternalSchnorrSignature(msg, privKey, auxRand).calcSync();
}
function initSchnorrVerify(signature, message, publicKey) {
    const raw = signature instanceof SchnorrSignature;
    const sig = raw ? signature : SchnorrSignature.fromHex(signature);
    if (raw)
        sig.assertValidity();
    return {
        ...sig,
        m: ensureBytes(message),
        P: normalizePublicKey(publicKey),
    };
}
function finalizeSchnorrVerify(r, P, s, e) {
    const R = Point.BASE.multiplyAndAddUnsafe(P, normalizePrivateKey(s), mod(-e, CURVE.n));
    if (!R || !R.hasEvenY() || R.x !== r)
        return false;
    return true;
}
async function schnorrVerify(signature, message, publicKey) {
    try {
        const { r, s, m, P } = initSchnorrVerify(signature, message, publicKey);
        const e = schnorrChallengeFinalize(await exports.utils.taggedHash(TAGS.challenge, numTo32b(r), P.toRawX(), m));
        return finalizeSchnorrVerify(r, P, s, e);
    }
    catch (error) {
        return false;
    }
}
function schnorrVerifySync(signature, message, publicKey) {
    try {
        const { r, s, m, P } = initSchnorrVerify(signature, message, publicKey);
        const e = schnorrChallengeFinalize(exports.utils.taggedHashSync(TAGS.challenge, numTo32b(r), P.toRawX(), m));
        return finalizeSchnorrVerify(r, P, s, e);
    }
    catch (error) {
        if (error instanceof ShaError)
            throw error;
        return false;
    }
}
exports.schnorr = {
    Signature: SchnorrSignature,
    getPublicKey: schnorrGetPublicKey,
    sign: schnorrSign,
    verify: schnorrVerify,
    signSync: schnorrSignSync,
    verifySync: schnorrVerifySync,
};
Point.BASE._setWindowSize(8);
const crypto = {
    node: undefined,
    web: typeof self === 'object' && 'crypto' in self ? self.crypto : undefined,
};
const TAGS = {
    challenge: 'BIP0340/challenge',
    aux: 'BIP0340/aux',
    nonce: 'BIP0340/nonce',
};
const TAGGED_HASH_PREFIXES = {};
exports.utils = {
    bytesToHex,
    hexToBytes,
    concatBytes,
    mod,
    invert,
    isValidPrivateKey(privateKey) {
        try {
            normalizePrivateKey(privateKey);
            return true;
        }
        catch (error) {
            return false;
        }
    },
    _bigintTo32Bytes: numTo32b,
    _normalizePrivateKey: normalizePrivateKey,
    hashToPrivateKey: (hash) => {
        hash = ensureBytes(hash);
        if (hash.length < 40 || hash.length > 1024)
            throw new Error('Expected 40-1024 bytes of private key as per FIPS 186');
        const num = mod(bytesToNumber(hash), CURVE.n - _1n) + _1n;
        return numTo32b(num);
    },
    randomBytes: (bytesLength = 32) => {
        if (crypto.web) {
            return crypto.web.getRandomValues(new Uint8Array(bytesLength));
        }
        else if (crypto.node) {
            const { randomBytes } = crypto.node;
            return Uint8Array.from(randomBytes(bytesLength));
        }
        else {
            throw new Error("The environment doesn't have randomBytes function");
        }
    },
    randomPrivateKey: () => {
        return exports.utils.hashToPrivateKey(exports.utils.randomBytes(40));
    },
    sha256: async (...messages) => {
        if (crypto.web) {
            const buffer = await crypto.web.subtle.digest('SHA-256', concatBytes(...messages));
            return new Uint8Array(buffer);
        }
        else if (crypto.node) {
            const { createHash } = crypto.node;
            const hash = createHash('sha256');
            messages.forEach((m) => hash.update(m));
            return Uint8Array.from(hash.digest());
        }
        else {
            throw new Error("The environment doesn't have sha256 function");
        }
    },
    hmacSha256: async (key, ...messages) => {
        if (crypto.web) {
            const ckey = await crypto.web.subtle.importKey('raw', key, { name: 'HMAC', hash: { name: 'SHA-256' } }, false, ['sign']);
            const message = concatBytes(...messages);
            const buffer = await crypto.web.subtle.sign('HMAC', ckey, message);
            return new Uint8Array(buffer);
        }
        else if (crypto.node) {
            const { createHmac } = crypto.node;
            const hash = createHmac('sha256', key);
            messages.forEach((m) => hash.update(m));
            return Uint8Array.from(hash.digest());
        }
        else {
            throw new Error("The environment doesn't have hmac-sha256 function");
        }
    },
    sha256Sync: undefined,
    hmacSha256Sync: undefined,
    taggedHash: async (tag, ...messages) => {
        let tagP = TAGGED_HASH_PREFIXES[tag];
        if (tagP === undefined) {
            const tagH = await exports.utils.sha256(Uint8Array.from(tag, (c) => c.charCodeAt(0)));
            tagP = concatBytes(tagH, tagH);
            TAGGED_HASH_PREFIXES[tag] = tagP;
        }
        return exports.utils.sha256(tagP, ...messages);
    },
    taggedHashSync: (tag, ...messages) => {
        if (typeof _sha256Sync !== 'function')
            throw new ShaError('sha256Sync is undefined, you need to set it');
        let tagP = TAGGED_HASH_PREFIXES[tag];
        if (tagP === undefined) {
            const tagH = _sha256Sync(Uint8Array.from(tag, (c) => c.charCodeAt(0)));
            tagP = concatBytes(tagH, tagH);
            TAGGED_HASH_PREFIXES[tag] = tagP;
        }
        return _sha256Sync(tagP, ...messages);
    },
    precompute(windowSize = 8, point = Point.BASE) {
        const cached = point === Point.BASE ? point : new Point(point.x, point.y);
        cached._setWindowSize(windowSize);
        cached.multiply(_3n);
        return cached;
    },
};
Object.defineProperties(exports.utils, {
    sha256Sync: {
        configurable: false,
        get() {
            return _sha256Sync;
        },
        set(val) {
            if (!_sha256Sync)
                _sha256Sync = val;
        },
    },
    hmacSha256Sync: {
        configurable: false,
        get() {
            return _hmacSha256Sync;
        },
        set(val) {
            if (!_hmacSha256Sync)
                _hmacSha256Sync = val;
        },
    },
});

},{"crypto":9}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.output = exports.exists = exports.hash = exports.bytes = exports.bool = exports.number = void 0;
function number(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error(`Wrong positive integer: ${n}`);
}
exports.number = number;
function bool(b) {
    if (typeof b !== 'boolean')
        throw new Error(`Expected boolean, not ${b}`);
}
exports.bool = bool;
function bytes(b, ...lengths) {
    if (!(b instanceof Uint8Array))
        throw new TypeError('Expected Uint8Array');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new TypeError(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
}
exports.bytes = bytes;
function hash(hash) {
    if (typeof hash !== 'function' || typeof hash.create !== 'function')
        throw new Error('Hash should be wrapped by utils.wrapConstructor');
    number(hash.outputLen);
    number(hash.blockLen);
}
exports.hash = hash;
function exists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
exports.exists = exists;
function output(out, instance) {
    bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
}
exports.output = output;
const assert = {
    number,
    bool,
    bytes,
    hash,
    exists,
    output,
};
exports.default = assert;

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHA2 = void 0;
const _assert_js_1 = require("./_assert.js");
const utils_js_1 = require("./utils.js");
// Polyfill for Safari 14
function setBigUint64(view, byteOffset, value, isLE) {
    if (typeof view.setBigUint64 === 'function')
        return view.setBigUint64(byteOffset, value, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(0xffffffff);
    const wh = Number((value >> _32n) & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
}
// Base SHA2 class (RFC 6234)
class SHA2 extends utils_js_1.Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
        super();
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.buffer = new Uint8Array(blockLen);
        this.view = (0, utils_js_1.createView)(this.buffer);
    }
    update(data) {
        _assert_js_1.default.exists(this);
        const { view, buffer, blockLen } = this;
        data = (0, utils_js_1.toBytes)(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input, cast it to view and process
            if (take === blockLen) {
                const dataView = (0, utils_js_1.createView)(data);
                for (; blockLen <= len - pos; pos += blockLen)
                    this.process(dataView, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
            }
        }
        this.length += data.length;
        this.roundClean();
        return this;
    }
    digestInto(out) {
        _assert_js_1.default.exists(this);
        _assert_js_1.default.output(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message
        buffer[pos++] = 0b10000000;
        this.buffer.subarray(pos).fill(0);
        // we have less than padOffset left in buffer, so we cannot put length in current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
        }
        // Pad until full block byte with zeros
        for (let i = pos; i < blockLen; i++)
            buffer[i] = 0;
        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
        // So we just write lowest 64 bits of that value.
        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
        this.process(view, 0);
        const oview = (0, utils_js_1.createView)(out);
        this.get().forEach((v, i) => oview.setUint32(4 * i, v, isLE));
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneInto(to) {
        to || (to = new this.constructor());
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.length = length;
        to.pos = pos;
        to.finished = finished;
        to.destroyed = destroyed;
        if (length % blockLen)
            to.buffer.set(buffer);
        return to;
    }
}
exports.SHA2 = SHA2;

},{"./_assert.js":2,"./utils.js":7}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crypto = {
    node: undefined,
    web: typeof self === 'object' && 'crypto' in self ? self.crypto : undefined,
};

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hmac = void 0;
const _assert_js_1 = require("./_assert.js");
const utils_js_1 = require("./utils.js");
// HMAC (RFC 2104)
class HMAC extends utils_js_1.Hash {
    constructor(hash, _key) {
        super();
        this.finished = false;
        this.destroyed = false;
        _assert_js_1.default.hash(hash);
        const key = (0, utils_js_1.toBytes)(_key);
        this.iHash = hash.create();
        if (!(this.iHash instanceof utils_js_1.Hash))
            throw new TypeError('Expected instance of class which extends utils.Hash');
        const blockLen = (this.blockLen = this.iHash.blockLen);
        this.outputLen = this.iHash.outputLen;
        const pad = new Uint8Array(blockLen);
        // blockLen can be bigger than outputLen
        pad.set(key.length > this.iHash.blockLen ? hash.create().update(key).digest() : key);
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36;
        this.iHash.update(pad);
        // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
        this.oHash = hash.create();
        // Undo internal XOR && apply outer XOR
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36 ^ 0x5c;
        this.oHash.update(pad);
        pad.fill(0);
    }
    update(buf) {
        _assert_js_1.default.exists(this);
        this.iHash.update(buf);
        return this;
    }
    digestInto(out) {
        _assert_js_1.default.exists(this);
        _assert_js_1.default.bytes(out, this.outputLen);
        this.finished = true;
        this.iHash.digestInto(out);
        this.oHash.update(out);
        this.oHash.digestInto(out);
        this.destroy();
    }
    digest() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
    }
    _cloneInto(to) {
        // Create new instance without calling constructor since key already in state and we don't know it.
        to || (to = Object.create(Object.getPrototypeOf(this), {}));
        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
    }
    destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
    }
}
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - message key
 * @param message - message data
 */
const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
exports.hmac = hmac;
exports.hmac.create = (hash, key) => new HMAC(hash, key);

},{"./_assert.js":2,"./utils.js":7}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = void 0;
const _sha2_js_1 = require("./_sha2.js");
const utils_js_1 = require("./utils.js");
// Choice: a ? b : c
const Chi = (a, b, c) => (a & b) ^ (~a & c);
// Majority function, true if any two inpust is true
const Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
// Round constants:
// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
// prettier-ignore
const SHA256_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);
// Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
// prettier-ignore
const IV = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
// Temporary buffer, not used to store anything between runs
// Named this way because it matches specification.
const SHA256_W = new Uint32Array(64);
class SHA256 extends _sha2_js_1.SHA2 {
    constructor() {
        super(64, 32, 8, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        this.A = IV[0] | 0;
        this.B = IV[1] | 0;
        this.C = IV[2] | 0;
        this.D = IV[3] | 0;
        this.E = IV[4] | 0;
        this.F = IV[5] | 0;
        this.G = IV[6] | 0;
        this.H = IV[7] | 0;
    }
    get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4)
            SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = (0, utils_js_1.rotr)(W15, 7) ^ (0, utils_js_1.rotr)(W15, 18) ^ (W15 >>> 3);
            const s1 = (0, utils_js_1.rotr)(W2, 17) ^ (0, utils_js_1.rotr)(W2, 19) ^ (W2 >>> 10);
            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
        }
        // Compression function main loop, 64 rounds
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
            const sigma1 = (0, utils_js_1.rotr)(E, 6) ^ (0, utils_js_1.rotr)(E, 11) ^ (0, utils_js_1.rotr)(E, 25);
            const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const sigma0 = (0, utils_js_1.rotr)(A, 2) ^ (0, utils_js_1.rotr)(A, 13) ^ (0, utils_js_1.rotr)(A, 22);
            const T2 = (sigma0 + Maj(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
        SHA256_W.fill(0);
    }
    destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        this.buffer.fill(0);
    }
}
/**
 * SHA2-256 hash function
 * @param message - data that would be hashed
 */
exports.sha256 = (0, utils_js_1.wrapConstructor)(() => new SHA256());

},{"./_sha2.js":3,"./utils.js":7}],7:[function(require,module,exports){
"use strict";
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomBytes = exports.wrapConstructorWithOpts = exports.wrapConstructor = exports.checkOpts = exports.Hash = exports.concatBytes = exports.toBytes = exports.utf8ToBytes = exports.asyncLoop = exports.nextTick = exports.hexToBytes = exports.bytesToHex = exports.isLE = exports.rotr = exports.createView = exports.u32 = exports.u8 = void 0;
// The import here is via the package name. This is to ensure
// that exports mapping/resolution does fall into place.
const crypto_1 = require("@noble/hashes/crypto");
// Cast array to different type
const u8 = (arr) => new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
exports.u8 = u8;
const u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
exports.u32 = u32;
// Cast array to view
const createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
exports.createView = createView;
// The rotate right (circular right shift) operation for uint32
const rotr = (word, shift) => (word << (32 - shift)) | (word >>> shift);
exports.rotr = rotr;
exports.isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
// There is almost no big endian hardware, but js typed arrays uses platform specific endianness.
// So, just to be sure not to corrupt anything.
if (!exports.isLE)
    throw new Error('Non little-endian hardware is not supported');
const hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]))
 */
function bytesToHex(uint8a) {
    // pre-caching improves the speed 6x
    if (!(uint8a instanceof Uint8Array))
        throw new Error('Uint8Array expected');
    let hex = '';
    for (let i = 0; i < uint8a.length; i++) {
        hex += hexes[uint8a[i]];
    }
    return hex;
}
exports.bytesToHex = bytesToHex;
/**
 * @example hexToBytes('deadbeef')
 */
function hexToBytes(hex) {
    if (typeof hex !== 'string') {
        throw new TypeError('hexToBytes: expected string, got ' + typeof hex);
    }
    if (hex.length % 2)
        throw new Error('hexToBytes: received invalid unpadded hex');
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < array.length; i++) {
        const j = i * 2;
        const hexByte = hex.slice(j, j + 2);
        const byte = Number.parseInt(hexByte, 16);
        if (Number.isNaN(byte) || byte < 0)
            throw new Error('Invalid byte sequence');
        array[i] = byte;
    }
    return array;
}
exports.hexToBytes = hexToBytes;
// There is no setImmediate in browser and setTimeout is slow. However, call to async function will return Promise
// which will be fullfiled only on next scheduler queue processing step and this is exactly what we need.
const nextTick = async () => { };
exports.nextTick = nextTick;
// Returns control to thread each 'tick' ms to avoid blocking
async function asyncLoop(iters, tick, cb) {
    let ts = Date.now();
    for (let i = 0; i < iters; i++) {
        cb(i);
        // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
        const diff = Date.now() - ts;
        if (diff >= 0 && diff < tick)
            continue;
        await (0, exports.nextTick)();
        ts += diff;
    }
}
exports.asyncLoop = asyncLoop;
function utf8ToBytes(str) {
    if (typeof str !== 'string') {
        throw new TypeError(`utf8ToBytes expected string, got ${typeof str}`);
    }
    return new TextEncoder().encode(str);
}
exports.utf8ToBytes = utf8ToBytes;
function toBytes(data) {
    if (typeof data === 'string')
        data = utf8ToBytes(data);
    if (!(data instanceof Uint8Array))
        throw new TypeError(`Expected input type is Uint8Array (got ${typeof data})`);
    return data;
}
exports.toBytes = toBytes;
/**
 * Concats Uint8Array-s into one; like `Buffer.concat([buf1, buf2])`
 * @example concatBytes(buf1, buf2)
 */
function concatBytes(...arrays) {
    if (!arrays.every((a) => a instanceof Uint8Array))
        throw new Error('Uint8Array list expected');
    if (arrays.length === 1)
        return arrays[0];
    const length = arrays.reduce((a, arr) => a + arr.length, 0);
    const result = new Uint8Array(length);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
        const arr = arrays[i];
        result.set(arr, pad);
        pad += arr.length;
    }
    return result;
}
exports.concatBytes = concatBytes;
// For runtime check if class implements interface
class Hash {
    // Safe version that clones internal state
    clone() {
        return this._cloneInto();
    }
}
exports.Hash = Hash;
// Check if object doens't have custom constructor (like Uint8Array/Array)
const isPlainObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]' && obj.constructor === Object;
function checkOpts(defaults, opts) {
    if (opts !== undefined && (typeof opts !== 'object' || !isPlainObject(opts)))
        throw new TypeError('Options should be object or undefined');
    const merged = Object.assign(defaults, opts);
    return merged;
}
exports.checkOpts = checkOpts;
function wrapConstructor(hashConstructor) {
    const hashC = (message) => hashConstructor().update(toBytes(message)).digest();
    const tmp = hashConstructor();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashConstructor();
    return hashC;
}
exports.wrapConstructor = wrapConstructor;
function wrapConstructorWithOpts(hashCons) {
    const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
    const tmp = hashCons({});
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (opts) => hashCons(opts);
    return hashC;
}
exports.wrapConstructorWithOpts = wrapConstructorWithOpts;
/**
 * Secure PRNG
 */
function randomBytes(bytesLength = 32) {
    if (crypto_1.crypto.web) {
        return crypto_1.crypto.web.getRandomValues(new Uint8Array(bytesLength));
    }
    else if (crypto_1.crypto.node) {
        return new Uint8Array(crypto_1.crypto.node.randomBytes(bytesLength).buffer);
    }
    else {
        throw new Error("The environment doesn't have randomBytes function");
    }
}
exports.randomBytes = randomBytes;

},{"@noble/hashes/crypto":4}],8:[function(require,module,exports){
const secp = require('..');
const { hmac } = require('@noble/hashes/hmac');
const { sha256 } = require('@noble/hashes/sha256');

const points =
`0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9
02fffffffffffffffffffffffffffffffffffffffffffffffffffffffeeffffc2e
03936cb2bd56e681d360bbce6a3a7a1ccbf72f3ab8792edbc45fb08f55b929c588
02993e1095f5caa7548e55950d77ac3c2dd1e59f1cfce7f19b01849ff8398c9e09
02dca0df5a8e3f9547d1162f93e3ecf5f943e8e2dace37005daae069ac4a45cb88
028e834a9b951ba2de51a26e9ecc03509067d26fa1e4687a066aa458841bffd276
0300a566fc5d0b861a14494b305d90d4d392e0f2051adb84e3164e5a40cc5717b1
024e59d4d4df077c91ccd3ee298eb56a22e38397dba3517b5cdd6160a1a5a6beea
02c0b268004f6bd8614fa04c9d46b66e1d5a690c4a2e7a88a82d0d43bc52fb043c
0398298e37ca91b46819c51d5fdee822f0505e338d5301d2b9405ca955273166a4
02f03e6e95a7664cc37714be8be083c0027a4705842aeef960ac7693762ef60d06
02e042d44d8375359e8a9101b219bfb54f562e61bd55cb8311f09e1150ea53f970
03a2113cf152585d96791a42cdd78782757fbfb5c6b2c11b59857eb4f7fda0b0e8
03459ac94a4708e75d9827b498318467c15dee7e11b1acf184e91f963f6e5a9ca5
020192aa2c259e62b69eff8c9a41146db15b822891bc07d0d9fd43cfe67968c65f
022bb27f65b9fe3cc3aa23f2347ad789a62d0cdcbf92d7d571f3b13dacbcf92df9
03af4afcacce49ac751b5641c9374b1de119b30c09762a875224eb8da9957b6d2f
021b4d87177fb0fe0b900d5035e73b8fb1990f964175403f622ec7dd1d27026d29
0382ae5b423ba5537b83f14e618bf8764b993bc08188aaa0c99b825703b7749cbb
034cd032cdc72820498aeb0fdd25712aa4f6d263997cf7df140b8c42d44626b08c
0224ee8b8a1783eca5deef2ed43ffc0607fd7e8ca4297380a36406ea3f5261b451
02ad3dcb02317bbed0db0358167ac5f434c5ae435a37763f30ab32ad69ae6d7cf6
03c64259853a3b2dce84736231aee41e10a27926bb6dd0c545aa11a6010b844b89
038b56474b1e27c83a12f16dae5de3752964d8a760ab7825bd73fe65b8256cc44c
02f633e39fd1b59eb327d7cf74ffb59b24c42ad5eb08d9b143b1b2980809be21db
02cda3981026d8f2e478354c9056dc6a9b7e5d1ac04d6e5a3f94a7d7fc32935d4b
020ef8035248b300f941e29b606c2a3f312992008b8a65c81ae359eb2040bcbf52
03b4424c7e6e1019d850dbab5de4f7e612150224af0f349100dd610583891db192
03c31935acc46a2fd1eca7218af127ec80177e51f2b46815e57d04bd1a9e128d73
03857d5e1f088581abfeafd0ff12ba22833f37a36fc94773739aad66519ed27ea7
0298f46420bb3698cacf91987e9b6694f721ffb19b3c6d51cc300a006491314776
02bfd2ad3eb4e6c82e3a5a0b31580f19bc3ca8b47319bac49749dcb82386658ebb
03dce4bce6dab6e7907ec23ff69816e7261771127e381d129c30732d36f4ddf607
02208716566b6deea19a839ee48bead8a7a79a96161cf0e6694aee87ba561d06bc
03680a3a159b3264bdc6735decdc3d642080e5d2cab4e981a353e326168338b499
02197b6ac4c75562d9936b09b3eddc3c8df12237b4bee6a220c907e16d861c250d
02177fdc547a7a3307e5a49f85248f9a772583386ce398268eb6e0078d9040647d
02c9a6cbf7726fd02263a7ff27971392f42e6be1ac5ebd2eb3aee7af1de8b3f8f9
02894333b518f1fe68d77ba943e443b8cc57f814cd418d9a0487be664926eb8214
03049c38c88923ff6879bc7e607cb8148e5d293107cb0f31364778964c853b3bb8
034117175396b781f19b88c0c52d4cb32343e997b4f598da1a11765c6fe3c8b2cf
03b126c160765024a7fae3ab622ce47deb5c833ad0730f6eecaec151c126d482bf
0369de88712ea4f90848b9f7efe4bbf1072c57729831ee147825f490f175f0b034
0350378aa75b856b7e319324a7b9795cfa30408df09ed34a41c4521592284a5d00
033ccdb6734d618c1b59aca0aeb89e7dcc2e1029676d60d6d9776e7f8e71c226b6
0221a6624ed8be01c5cc8038dd1a9b8c2b903ae19dbf06887ae50ffd2c724c38c0
030cfd0315f86aeb3df021762ba6ee1a9064d7b72c39f3cae2402dbbe0a923801e
037944f914f4c3a2b6abd14696ef829f751d4ffc1ead3053a8c299b09ceb52ae7b
02e610b1b02b6046e07209bb6cc6531b607740e7af4a6c8d2bb3eae4c3198d2ae3
02a88abaf9416dfa5a0e99a426a5a0b0ce84180a7056aaa9529f1fcfcbd6183a09
027f9a280040bd03d22ae48ab62094158dc396eaeae5db7cd9d52e014782de3c27
024ce4966c7518668ed58e280a4afe92a19880f75db87ec02db6efbf612678283e
03913b5aa4d2c474002184262c3874bbd5daf1b7e15867087b4bc65ac220a57694
034781cd42657cb3f5fb3f55022105ce13c5bac38e84ba262039b3951699a565d5
03ad1d6b50d275f31d5ca08c1e4b420eb700267e0a6d2b1c27f38bed97e9f6cc29
03e69a24fbf617030c814b2a590938e03aa40315f05f1fb96b4077da05973e1273
0307d6fd8f4413448846ffa4113ac3adf72b32246ed9ca6469e167af841d2fc18b
020ea62d41351f426ba27bb6d5bf0811dc92c1101dae695af2c795ca3f87a22d5c
03e7c668b08f013a6ad8c9461047f261f1b9743b04fe64da786a5ef164ff7e3cf5
037454f71498cf82e871d072b8e42b4bb5ea3b23d0743f13b02862f229ab3b7e56
02d24769d0873e0bc98e7081af1f3b84c714a79e349a29b364a12387b3f7d69df6
0321a1a152d08b59f6b0e416897a186eba698d82f5e250b06862e4c3c2fb65e572
034982e1ac13f34e5d7afa5e41e8f3f6eaad7252f36941034b9a5f7cef038f540b
036e8b87e785b1d0de475380156dbccad6a94c2dee3e4a8966695c494a167671d6
02d3e51fb7fd9003d5b071760411c99b84a0e93bd60016365df4c975d9e16ea8c9
03751d2afb61b958152ae8e77dee0e940997fdcd2668c0dbf8823402fceb7e88be
0247d2dce610287932e37fed01c6d684000a1d120f3f304c5ddd1d1e5663b67eae
0365e4dd48bab958973bb24e299ed25e8948325e7ef013d92f6e57d6315bb48fd8
033f98c128f31fc4ec8eac1914c14cf16b777f5e288a942c59983cdea1b9e4ad02
03417f571a912504b0c751475fded43cb84ca14bb538c0969f2d1947691c1d0935
02c57c42a0cccd84220fb177b43a703f21571ed7df5d7d6cdb18816eb1b5a9662f
021b42f27f17ab5ece23b869462601c13dd8054256eaa8b5615eeefb01213cca2d
0332905eed1aaded232f439b8874f5e3d2ff7b4b2b95a4f3b1ca34f83553e944ed
030b6f2a0ba1847feb30bbc44317894df4cd3bad998784ec2ae265ef37bd47ea05
031454a29879bd4d13b72f47479fcb474b2cdad94ddaf69f30f4cc857d643666b0
0208359d15adfb09cd1da642e7129e413682a245691dbe2456e7ac9cded6adf32c
02942eb519530fd73a5cc94e11ce2f896453355ef15cb5885808608fa4ce8bf064
034f0203e17932a2f418fb696b24bd77e7ab9416972c5e0f579bfd05f8e29e620c
035ed93d1ff7a7bf1a6393633ef7df0e14ad72a68a000938af7ee23fd8b6b0ac36
02d7cdeaab2e9cc01992e87e2ea6aa6b54b584723cc0a8e15ac029bd68519836dd
0271d42602c33c20dd7164f0911cbe0af2db6ce6e9486ebd14c338090ed6998740
025cba2271cb32293e096ad208654f6b6b5c0da42b56b6fe379b83e1bf7baeac89
02dc557e661863af1a69d7b1f4ee2b2342bca58300da9ab00bdddb4aeea2213b87
021b7dcdb25156d9794ddb77fca2c3400cdb921558179ce50799fb95eff8e50884
0383dd55403b6b9abb00a2fb55109a60f1e6708898d1340157a11830165653fac0
0338fb8b12b659db384b290a3960589fa9f308df65b8f2086084004f4663626c51
039f5f332c4afd01e1dc4daac6a72d501da7c478add9ff9af23a329720696e6aa6
0203d165255fd7e38eba143567850d33efcfc9d2940bcf12797fb7e7b962584f47
030f220778600c9a24f6f1abdf80a9dc58f9c03f9826627763956e845fb96698a3
030aa48f84fdccfb94a57c3fecfb2f2c8f1dfb95e5a707014f0f4663ee61b4d0f6
03afc13b246da8fa2be1328a46210b80a13c9745c73b9063e4995d7b01d6161770
02dc6a0cc34de607558c5d1c640bb26a6d3c742b6f887f01ba34e56eb2790022a1
0306413898a49c93cccf3db6e9078c1b6a8e62568e4a4770e0d7d96792d1c580ad
034b22e1a561d70c993893b93474d4d96727d683ac9c44691d9e7a26ce799d5ef2
03696f30714eda15cd6cbf96ebe46e2268a6cefadfbc42e3d335c9f6ca88b71845
0384907ac6eaf81fd7329444ccf5c91455daa15b31ebaca91f1725ec3bb54a693e
03cd615a14664ea7a937a479706d9d7a8e6db01e99a333f3f8da0d654484b9c5d2
0352d69015ade2c01d68dd58b662d4901646b069641864aa834a58b4fbeed0c73a
02f5bab664b51eebd83dc28e763dd6c43eb5036bc75ea3edce580748cce5e93798
02205890b41bb6e5527a42bb997fe6fed34e61a872617144629754c31e923c39e2
02401c91adb53a92df25b53560fe8ab6577cc125165a48761e3c4dda6f11d3e895
03836379eb14b50e5247aeca7b0d57f591b728d7121fa5c841cb4fe39253b02eed
03be471389b2d76529055efb1e82f884dcb49d5258cb01d8730c299d06eb6be5cb
0235f2b8b63cc50e957ed8257d55820d2cd1621479e508eaa9652926cb6e058d70
03cb0df381438de568b43af0a82c8993d46974fd4a7812e4a8c6b2363c183719c9
037bad0f12a6469ba878dbea854ba33ce4d773a0e99eefc8db5b3e602e6bc445fc
03d87a0ccca3f4b818e900276a5977282c03e4d6f19411133de473adc604639456
0295186a9bfed0e3090301b4f418a42603d886849c3cc47fa1cebf40532c9b7114
02706c8149929ae7ba577211c8da0faa0796ffc0dea662bb1e0d9f98e85faf4f2a
03c11031ce91749346f1feee1fcffb1cdd52de00ec43f2a37e771eef4d670576d1
03df31918bdff95396cf7231ca9a0000971591baa002e9a8c116cc5800cf2ccf56
02bed2c10a2b3261442dfe0cafee8d2cd5c22d86d4b96f1fadcedbd9cf6a17f7d8
031b08f760cd95f3acfaae57cf6356fc15ee5e9ec297e75182f66bd07111b29f2b
0206b53c35e247158623217620cf6f76d9a5993d03763bc86aaf1c1322d2070609
03b1d85cb2eaf4486d50b667944da7b4f265371be0ae88a4bdff41d0e9b189da22
03ff2fc67aedff7342d5d4ed3d5c41923e1014a0d947ec291936cfe278831c8f16
034992653647ea1e23a9782f6d3a438fba37e124e07079ddabf478008a90b31000
038c81edf32ef2edd33a9eda2137ffb1530dc94eda72f53ca4120bc689e8bf98ca
02d863fd44073475438da133cc1dbd048f905649210780880cbb9e7024b9da9976
027b3698c454ce79d1fe28d1b6431f44f93d827e58a97f7c6bb3687387b6e3d286
03f921c18273f42527e746f9ea6e61ca984aac0eeb965254311bb94fd5af4f11f8
03274c123c625eee6edb56a4cee676c79ca3f437a17359045ebf8c393ca947fe1f
026e68d3447eb81888a25e676bbd2f460c4208c2b4da2e11a160469db736d946bc
03694178fc531b9b3794af1ceb7dcaea4e2c39d0a6cd4b9eb8cdadcf18ef3de7d3
038616f356094fdefd136d79ee62fe613edcd3695805582e63e727718ed3c92017
03bc8acb439eb28908ddbf16aea27651e8ee94753924a4803201b1a00375a98016
02e2759fc7bab6bb2a16aff3c7c7515b9ce74204e3fa9531abfd4c5576a7c78ff4
03b2df257714a3e92f960c302e4ef08c4d03d50abc57beebf2c5d76606806b3669
0328e34ddacfcc28cfe4e3fed52e8d43d62541ed34fea614f261b3b646279009a8
037d576c441239ae7a8a5b7a11173b976fbffed55117ed00a227f19546eb6a1910
024cb6c08eb9b45d8eae5bab3f18e6bf66e09291bf48321f2589186d03d87ac753
023c9f1a0d4e8b1f53444a7e7620965abbdac8898dea6476b8a9b6f8430691a42a
03b43589c9e6a766c14de1512af275a85c5d55cc907f0005205b4a3b9d1dbdfad2
037899adde92b9e013229365fa2c91a1e4dfe7442128af95567b38d904166db5f4
0324559a19baf26fcd59435e36a411d34d9a60e6148e7cdf397b26c60c551b9de1
0302e42a452ebc5ebde5fbff8fedd34892af7b23c68a9d424caec5b133eef1690a
03ba84918a81bb4132037099404e87cfad2f18c7367da8f5391c5c09f2d5dd3c6a
02d0df41ee93d732c716c50ed6ed740503ad2f33cb5ed93f5891fef62c6be4d76b
03c4481642f4441e609f331190e36a4975d901e78fa04fc8643ea1dcb22806e4cd
0344dfacec9b9fba6fddd9ea345e6f852b6e54263e358629ea94e6b798e66c5eb9
03be97429122dd13964ec08ab2433ddda9c92140df7a7913e9d29cf8e66880ecd1
020e90315e0e1ce44de33f34dc7a6609fe3cd0fb7395d93eaee87d830b97c9a790
036f970b34d26af9ab988fad19dfdd8587c3dc13149dbe623d538d0f14b4d5f659
03871a40d1b14ef1662a82dc2dbc3970d2e0797f4e75eabe0a98c60a6945fcd9d9
03b66fcd41e2672b90f6fd628ac352a6d8157a2a3e8ee32fa718f815a5ad219063
02d3e5dc3854f36e8bcaf3433f1b544089ad212409f280d3bbc3b06e71e73da24e
02a25ce5556a408fc1f8f2b68b0f0b2367c0b4a07b877c8edfc7d97c39b2bb70b5
02c3e01203a207be387b6b7fc4303e3bc150be18763601964c92797567b26c6734
021b63a258a7d7bac117bafa00bcb7f8b0498faea02cadb8ecca60f0b1e08a14ca
034b97469c053aa50ee0b53da2c54c55f4e8b644b17bbf267290a73f3ef3ca8e09
02ae52dc2d1bf8e7cb8097c2ac51e70b17ee65315a1a394d4218f5c66c06e9ace9
02563f3c6f6b7760bd12b72fd9d96cdea398b0cad3021de2e09f45b8dd6f845808
03f0f66fe260a4dc74f5c83e4b927f1c96c313e37782f8467173f8e6ecc8262de3
033a71a4cadc57ba72dcbf7717355b0b2fdece26c7cadcbcf678e1aa240fc4542c
03f25178d26a1eb0d585e5646b2c13613d9c7fc03ce1000349149631c91a6f119b
031df0e130a382ba4cfff9be861f95089d1591a5f27943d84f86806dbd4c27150c
0277a8e81dbbd99dd07dcf386864c658651c1f4d98248e67193cd06a7ade3577be
031f25a3b8f876522abcaacd40cd6ec0ad536d8ee571412aeef387894c4d20eeed
032b5a102ffdf9ead9cfd7c66a01375f6cdebb84003111a8a8e6743253c1bc5e26
027addf9f35ca84c8c4ebc3fe716eb2cd68aa7c3e5f5dc00c7c0b1dd0eff092bb5
02117e6d41eb6ac7046f4de78b96c522f2e29deafad4c8e8f9c125d0ffd53c9bac
036783a86e5002fb3c42ec775664d8510cb811a734ad94eb56e88b94cb47120dfc
033705a4373cf4ed666c42317fdf76202d6ae869913f5815498331709e02f0d5a7
037f5cc66eac690430d6cc562e0be29dcf1365bba36ed09e5ae89157b36e745841
030ff2220473d3591ed26222c34e7ffd892bac5dc34120ec6be47871a684025ef7
02794effc611dd3ffc682107b7c59745ea0ca02ab79c94acb085df6c095c1b78ad
02c2be42ee6b67681c0cb7839764bca2847a80fc984495222fbb6b3c8e310e4ea7
02b6b3323774bc8847e5e60c613a87476135679e687b430e1284c697233d7a6f42
03818f6377c77cb33eb1458fd294c3f201e6959e9ca4f6cb4426ee6cafd8cfd861
039449f3bc32c7ef8193616be9877f209300a362ee3d8dafd73916ead905101268
02d5f4da17efd649a344a4307eb6d2d8f1a0ee783217936e65c6493e2d43074e9f
031b0a06637602c131c7cbf7c9534f15f7f82d4ebcc2fced3c7682c7892c08ef38
027a74320d3d87319a36d07adfa4a69f35426f5de9d23541770cca86d16aef2864
02d334766d7321155b951094bea2490039c6c0f8ba09555b4ad1fedb8342843172
03d0a618584d1e1efc869b197424498580ab9f75004017fd3a506d707d0123abc6
03a00f4fa958a24d5a8615bbd98557b944ec822f7b4f0d80ced994341130f904d9
025f102e66be9c144dcdb2d63459fe7ee10f2c63feffa3160d0a7d3ca39ab1bc15
03215d99530e463d4cdfac54af55411c00ed1e257aefa330967130c432411f5a1f
035c89ef544ca7099f23819651c3cfc530f3a1c1cb41955dbd21f43ac424d73d71
03b8e71c54ad27b0970d6a931854a4652444538933aa5b50e2a7f35c12c864c5f8
03147414141416c78afa74e3863b8d92818da7c8da3bdb2a3a6599c50eca4e51f6
029a28554e060c24f4b7baddc920b45b6ba0516fbb9f5d221c0c781f7c5c4d23ac
0239beb141c88bc7d7c147de7ec2b76c7423b93581b78f485854ebdcd16117fbb1
03947e82f5a53043f9edbeb7fe6b7338cd58cb391ce1c491946ee1eb1e755927c0
024fd8b2340d3dfca1624bd633100dcc78e83ee8cd77b8e0d42da83a4a66d2ec0d
03a1174f018e72038ee906b5dca1d63dd9005793e562e413427799f93cc436fb25
02663184719e43212f176391063798cfeadefbb8864ea53a7ae8fd7e46871ab7d2
03094b8a7efed67a9cd546af95588c6d7bf7ef4cd29dd740324f314f784a9f4b27
021341c6283f3c2d64571755a98f2f4881d596d714a6754325f6c7ae43e651a20f
03f97889f96b903ccacbb1eca2f4baa08d69948df1396fd1eb42d4bdbdf192c395
036115d9596030a2d77730022c0cd8003346d252865a051b72baeec8eebd60fafb
023617102b0ad2939dbbf462e3bcdd68eb197eee7d527a94e433191634ccc024f1
02b167011c0337b9f83a4c472302d72e784c64a8e32ede0a7863f5c3b23b8db5bd
0359f3ee9dd184ad21192a0d98a89c757344ad9e16e333ab186d648430877d31f2
02b6d05d980734ab687bfa0f4651ab6d28cdacb9723df1ec1bca2ff0628f1e40a4
02d12e8a3433a61943fc67bd830829c51a224eaa86fcfa75f0de7f34e07254ff30
02cfc36b640512afb35172a195f8d6bf68be06e1de85bd5b43320ed489e04ef4d7
027c9e65cb36c585ef29fef7cf7d688e7352e28ba083d88622b1a561104a757cbc
03334cc4b9975d547951ff44e6259904e8c74eb2233916ba3e12cf5b1c564131fa
03f184fcbb191b8d8c38e937fe76705c3b61837dc944ac24e278632bf817b9a77a
03e8bcf9611d5714c5fa9e9ebeb9bda3f2a92fdc3e7d114242e52e03bf3bce2ec2
03effa0f4ff9d6e9954c33fe1015d87fa3e28b0b749982785b970d24729b80c9ab
02e00848946856b63df9fcb2b020052b83917f443e085dcfa0164e86c47c66f66e
02756d6fcf877b375ef653bf6851373b83203b9b40683d7ea7d21d023f48413880
03247faaeb0ebdf7ebf0381123d746bad3c5e571255f1d284e7e31b0155e27b67e
03b8eb3af47bafd5962f125cdf1a1faaa8cd8c9cdb0ba83567ee48c4bf9d6acaf3
03a0f9b8e7b4388904bc67f643108d79eb2e5c1d1f486d98b2cf92d2912a2b0425
031c861fa795f1769b41ab3bad6e0f809c1112a5b7257a74d21eb8d524226c5f2f
03c53c5c31f6d355615153048a74b4aea9925a3fdbb0bf2ff66192576f1924b480
02dc41621a97f5a4bf8af369055478b1b132cbb1ec63d62bbd2b8abed5520ea409
02688f82fde0463834190da331477843383ca81b84829cd56d2433b6d7c1aaf2b9
02bf6c12b60d62fe9cd8b91ae45e1f71cfbbf504c9ccfe9d3d3e1b986731ef05ff
0285c391a516f3091295359a06315a667003a6c4b4a69d626cb5992c79525590a9
03a1c2125c018489b25f3426d4faab3c5f14b57dbf43242ff619d3a9e6133bc87e
03d6319e947c7b9c834a15fe89beec8318aba1d199080392b6bab89d16d9185bb2
039c8bae5d01218cbd8b8fe6b7d9054a87b07ba6cde117e5dc6bd123539ad845b9
036ff38e1e1953e2f90142d89eddd3a8d29383c00d8c9e3b3d6cc66b995c44685e
03694367c99f478828239c71c764cf2b1fb9d4b8284570c9920377c374a9e83a98
02fc0815ba4ca08c3b7cc1ca906dbd160b7640f738ec7c3b2a8f57bac36873a417
02ef46e7fb554868a943ef8aaba5e6753dc1debd560907983377a7878ab0727742
0378c30691e185f10fca94a6cdf7a0884b4644b31c5c131e92617f1e1d6045b285
037841f48cc15494f87c5a9aa01bb7878c3e898bcc6a19b67cd8dccf1785af64da
03f19542ff1845447829bed21cceb61d067889d0b2d9f3192747c5a4fc9dbdeeb1
039a18e71d16a7cc7fcec9526624cceb030b53294dfd46a0cf6d9015db975f83d8
033be0645ad90781e9738e2aaa86c23e6950ddb177818f6b997d5611b2327b5611
03efd6f978c688a120ff61090b1f6eb402e44f1e947d7ba2f9a85ed5098fe3bd17
02ed800045c6ec6053134125b30c6398c9883c741ffa83a0626f25662e19040def
029cb885b3b720ed51870abee41d237d43db2944cb6b2a0c71231d2c55a2c08c7b
031ff173251ea6b13e8ca57e3c82712e7d4cfa8e746acb09998aa02f067efd9f91
0323de6e47494e4d0b9fc150c167d809fdcb8a93209c964e16e4c18fa3f995a8b9
026245c15e527e84b2b5c32afc7348511fee0e024b446543df59ee3c5a486e354f
02b76618737b0943895dcfeb89902f594407a88952c1c931c0b60d101f6ceb381f
0337de98034942ebcbce958b4deffe83b125b66132c2b354536004a75fd70fa129
0312c2e60d2f9b5cf4956f7b1975d943ca265d4e1a11c9ae0ce6dd79d6d3c87898
020eae3e76c67292ca5f1fcd253c9eca4863bda011aae16a97d9bcc6e1b34d2556
0307e09b5009d38bc441fff5a2c59a377bfa8230faa948a2af22a514b702915ebd
036669a40ef94fd62203b99081950c61723d76421894115ecddf1fae8a4a3dcc20
035df8d53b710dda96eaf9386ad8d27e1a5e380edde22238dae6a89e233b86d17f
03b03bf6badb6b9db4b94703b614f0b2074fe0afff1be1790a938f0fbfbde9181d
03249024706986db0811a634259775e81b9829cd593948e1ea96702061e06a988b
0330acb51e19afb4b41c36598431cdebff7d9703a2ea76466ee8d3c34daa53a810
03535f9c5f5e30684fb6e1fd96f96a9ea170121a5329e10aa1ff43360b11312b42
021afb59778d7cb46fa344f4db057dce3a4b4e36978d647b24f6844549c03104e2
03fc2b8831fa33a32906cfda7f498d36779ac7c55c1b68554635b45d8114cfa8eb
024f10f5c79d63d1fcfe75b1ef3e03613db1c36ad8b3a18b34050e071c422fcc7c
0232c42ed0f6072b3658cb140fa51d824f96d4b931ffd1c526bd1f3a883e6e3541
03346db2821d1325bb8bf67642b472585d0cc043d7f856b6f4f2180f4af03299ef
028653d7646d7265b0370df95671428570167f13ed087d32451e68a4ce94abbdd7
03a0bd1c2ccedaa2401a754dc23cfe928c27b3c06c3456406d61dd36d2be45c38b
0233587ec84fcbc137b8700296f91db6fcd606db18191231657105eeb4f54a43a0
03c9e8b41623ba1dd4600377f4ca1a7ec9935195199822a1f6c2a6599cc83efcb5
02e3d1af774c4f15f53ea559959278edf9c6c0e9f7dbe60e79b63d684e1d692697
035f24fb3997bc26b9e675a76fcb508061a0993798083b9dc42d2f0d0beb5898e4
03aea3a01e6fe887559de6d380e3176db4157cbb4a665552fb9680be00ac7a1426
02d635e2b2f2f39db4a44fa057f8a227c7d8177ffa62cf19393a680a5d4cc0ddc9
027faa2ce48d84894d7b95be37569e080e493f78fa0237f2c6c11b009c0846b4d1
0344439ae9bb068e17831c74d20ac9ea58fe9e927bfc2e008d136c84707b6ecec6
02e8ebbfc6b0489c7f9e914c9ac5cd00b3894b5c0d2666888d43878736542ad268
0380605c065502011b91ae699fe5799cb181a77cf260f15e66ee9a8b4c714a3452
03e1c1d7588d534019421e1a8dbe4d603538f0a5fea740f88842dbd56bab5e6992
02d091c103faeaef5a9c1740c0a7e9c92abf5f068754f002f5d6b4c15bd3dee37f
0226614b48faa27086e28b38adcfb8bf9d0977a4d84a96e9084e499928415f9bcc
0312434dc511daf147b59ac0fac3c78c32c57c1b99effa96100390bddcad0aba21
02471d6f269ac7a64b0d40e6223c9cbceacd3b98adad2682c3d77eb744ecec09cc
02b1eee9e0402cb4ce20b0339e3800538ea39e4f9b37cb664de6f2bd53605e5049
032c284ce64d08284a41cb51b31e2b94b77008f42106c300885f2ac0b55dc2982b
037e9105e25d7f72d3f95ea13445677032a35c7e2aa5575acdd64f8b8da90be06d
02cb8393c0726ef267aac58e0c0f19538d7898c6ed903971e2286e6f4175402da2
029b409221ad6248f1fbc6013debb3bc544371b309ed16e396b29100a22adc1449
03cf76f320edd295644659343f4909c3030f7dad59d191e6cbcafe909fb1e811ee
03b385346c3d8855267c83912d7295e8b84587f7edcd8a0e4d2417bc71942c1004
0254d77bff491d9d23be06601e002eb7fbc926411ec2474a8e21e364aec86dfdc7
02f99a6b5bb5012863a9473b96b7d8dd6595a8c5b76938b01e16d3026ab9f181f8
02458f4941cad754a66882f50f49e30fca1be35d51a3f7bc17405c585b44b59b71
02debde9c6508ae3c82cd177c4647c378ebcf3109af391dbdc3ed2dfec4bc78328
02991466d5e01b733032d5e74adf70ef47206d6933a36cc889120bc49097f4635e
03c819e37492fe0242711add53cdadae6af4041b28ab67ccea1076d76469964a7f
03e36b3a242a705bc2de081516e60e446eff839ae263e49e04e0c4e2dacea0a165
032eced75e0795418345757979a25eae4259aa52ce2254f359c45d92064fbf40ec
02506ce80d096a73792a70110c0a31b3de481976e4707b63450a647aba55c42833
03d843655dcb92c3a7eada7a77f51a394756cb58fecff9e8d06ebba1dcbbd4ba4b
02c8c8796ddaf1b4686cdce925514601fc418679efc1ab516e61d3d7a0eb2f649d
03a06cb04580a3c326b2cf3239fa23d717f45301ac8b578d9932d3ec57d46501ba
02503b94a7112443ac59fa2ae8bea62f911c91b840470306a3a5059e8be6338409
0258ccb18697f573fd341a663da5695429e9f1751fc9d530b467468b4780bc0d6c
03a840f4410193228e7d11e94eb7fd577232674c0d4c33524d642ec462e82295c0
02542d812ea94e0e12151007a47a086f9345a1152f666143e8a836e2c7930d4cad
035694bd487d7f55cd438fa43611f2f5b5c786e431b0a344c07723d04ba709922b
02bbceb95c405e1be661211e429fbc37d0f2c6772414a2651b30412ca6def51ee7
034a1ea266299d77422dd197fc24a6ae1daca953c05f41699d6bada153779efc63
02d343eab2caa949f32572156916cb35eb67dd60ebcecfdb099bd0f918cdada8ed
026c6d6fc70b0e7fad113ebc83f8124324c33a13bd9de4342ccccdc76d5f19d823
039dc3fbbd4ff77ca3c4de18ced9dd4a9824499553458423ae9ccde929443c81a6
0245d3d84c96368b14d64e25cedff3d47ab01ca770d2f1fd98c42c2edf21124c2a
03f0ddb577dc131ca37e78976a652ee726c1b3820b455e6bace2380cbebba0f754
03364da263b480326d84ac85364e74e53ec4b7986f3a37b6457fd1211edf3a02fe
0210872719636273c78d1cc37bc6932e686b561f38940371d14525ff079b2c464d
03b828a8d6594dd23fdeed48579dfe4f9ee65d90db47e863cf6eb4819d5156849f
038613b0e85cfc3e2cf0d04bf132b8937bd1e76f97e633242854d919d6f193115c
031cbe2778fd95050dca3c6ef19919763c8647673187771e00beb11b167a60504f
0369b48af15ce81ca97ca059163a156991670f1153f3f24d0f4dca7f8db96733f9
0300a42c389df34f24fc2bcef1bc784d78e89cc868bc83a81dc055682813bd3683
020f59c60200c6c40d71d831e77eb0d8732d361c4d42d014f2aabcb7c88f037776
025c135084dc750ea63e54344500794a5d28e12c6e51de32ce9d71bbe8e6717271
0219ee9a469593110dd7a693e9e88d8a6302578e869b2da69761c0da84a2fe76c4
021f39b13838f6f6040244215e12c52621682df3e6b2fd46bc7654114878838a20
02b4531b770af24248ee2d74166e3fa5df6dc219893d5ad374e8c9e6fc92483ec1
028524c5cb9c4b4dc595e93d86f02c21875c292a83d9c76af55510f1366b7f45ea
035e791b3938936d6d4323282d1655acdf128c4c2a633d6f09b2e021d2521c4a9d
0386d638a1448bb19c8b8ff8ebd97a8bd45d530d1f2380d748882fb420e8d64ad2
02394c204c89ee82feb8b2816bd251ba62f90b38b84d3bca180582a7ec09731063
03722adc2002aebc219221195a02b8eac96e3a2dd1009aa6a829cd3ca9321cb818
0297eeda0a780c768875df12f36a3d7cffe1c376781a9647c9d484c40a5ec0ce60
03c3f8071e1a0f307b83b2365f19c443531948c4080f2f880384bb36b2ef3441b6
03e51a0237d7f3288a040ff5a173304fbaa4b5d08b35259343217ece76d8046770
03d2a142c16025bdaff5ef9e2d1bf84849101d448dfcff8c761cdcc7ceefc735b2
02b66e6cca34d7057d46a57608dc38ecb2e752616af6f1ae1df3e1ce2aac88517f
02413724c1d0d70e3862584c29d6f680ddb8d267e22b75b02ce09db03e08cfe9bf
02593e84dec0379ea7260fe10e271ecb80b5ed77bfe2df5759425f6d61d3d3ffd4
023b76bcaaafed69d188827714e4c67c4f910321070f254c89a8361c8d38d2c35c
03913b14ff48dcc7f2d93586fbcf5ea21106e0aa42a9d7788915d45cb8c8505d3e
028305fca51c062aed0d53fbcc4cc305b230362d8d056b46e30296dc39b5d87f87
027baaf5f7e1cac75834191d58380e13d334ee9976c303ca30db0755a75fe3524d
0219064f644d612a43341dfb099dd26e83c680bfb91b9a3b61db317fbb17480513
02290b9b8f861c14c7f4283c77ac2557e43d89a9c7eaf2e8906b4f4ac26c5501d3
039138cd82421f69ca3af94270084d097839e5960c1dc8046e2755e1f7c5d090d3
032598f6647533a35e4a2feefdb81d31cc4c2ec51e0447a791e4406cd577426551
03d195bbae10d64aca265eb490c16ee1acf15b9e962cbed884ae94716e21ed6b5a
02d9a09edc46ff8e693777c9b3edd278ed751696bae028f2d6612b027990ed80be
0278ef0222ec488bc350657af482cef596c05c3d9e4b7548a6b3478171f2b09c6f
02661a8886aa3c9a18f507657c2cd63dfc9abe638c6c2623274e98b3194c14a472
02ba3249214286252c7cac41a898bc239734e30e568efa86abac4d9ee8950911bb
0250e6dcb3c1af852ea79d790adbe7747b439f86def19b9ec7d0e666252bdbfbca
020c350ffb17ff5a267476bd09fc0165191758ef84894f07fcbaac50a44417a726
027c7b943f4aa65eedc8a198a88fee3ec42d0867201063b8444a53749584ca38f7
021dafa13fb99ad02b2f596167166b5ffaf60f9ee7217a645a9b5c92488fa26089
0310b9ea4d1c1a764e9996a0510e71a72c017bfb3107e455721e285e712727f87b
03c88a78eb98be52ed6e770eb3aeb303d9f25e05e652766b7239d36f7910a4378c
0381a81c261328a0bf4fe9f6b033c2ced063fedcf2335c0e3dede183ac9a5511c8
026aba337ef60605b95448061d3eed4967134413d9fbd145c971038f918d9f600a
0215e7b0c3e12686157f43f291383a3a75a0113a3359a27c0f673e00013c46bb02
03ca9e43210fe09fe0a53eeae934ea3887f43c53881c266741a2bf5bc16bb0353f
02ff193aa840831694bdb089fdec0d4ac37a12d202be3bb4639999ac23cf381863
0309fe6334c70bc183e12c178d710d8af725049cf938f8791ed55c0cbc3acb57fe
021d6281c76621d1896f5a373672e5adec4a6dd7c2a5c271e7135f66b5f69c86de
024cf5890674b906c9ce00bbe3041478b0a6f4d1983149847c0d2917e778881dc7
02b4cdad6100167459d08f93f395e119994c75a994b2f32c2005a03bad41588456
027ec09447fd3e1677c8743760ca2c1530dbec80c543362bd315f6735de308543f
02d1d300d17daceb8d9b0823467e820fb87aade3ba53a4dfa81b6458166decdff8
03506443c9d771d1b1d8aa5d7b2447b12490e6fca4c86227b4e233d8275594430d
0248a5294a361aebc70d5a57ca39962e3aa9959956d9be2d1f90a814a6d1a3be7f
03df90df28b57e32ac87c436b43d2c0400a7e885206473c19f64fa6a335e9cb600
02fd5ad9a747f7159f308c8e9f8499e552d2fb6e172b7f3d74dc7d8212c23bc50a
03b211b9aa7ac1ce1586801337d1f94c432e334d3b036ea7177972f11433d65993
0338757a545cc060a9f08978127b0cc5dd052837e01f4c46b881a92ee70d5fe0b6
02ea7d8b5319a77415b26fa58d9d0f5787aaa1f79d7d2b856e76e1c55394168915
03799bbfbb9edd412b5467b532f354ed031823fc3f24443049ada8f3a1e9064d6d
0347c231a759837f8f8ba937ee0009d74148094d2631c02a73fb2db68463c3ef50
036a75abc0a1648b3b0453e68e0a7d9e45fd689033530b373f33bec19a87adc795
030374c826831e6b7d00407c650c44bc944858bce3462dfa08380c0193b46c342f
03eecd262ed059181f1cd3f074f8dc6d6e7315824d854dca9c15e6a2b20b127656
0228625c67e5da85e4a15e4281308b552150f6294053a7a8b7457681fd0dca91fe
03d0109a12937f369cbb111776048566da7e9f00e027c52d1e7265ea2a403a906e
02394ddc2b1b596e224604a4d1887b98052745485313ae2d16c55626beb9c9ad8e
03d4b486b8d81b491ab4f681325797d942037a8713547f12440eb749936810fbdd
02843ec9bb3c8e7cf19f2d9fa7017ec032d39f55db96aba6434aaf855da220e494
03a36026d61f18040b2800b9200b77d66234ba859b952b2786e85db36e11097350
025692ed9cbaae6f3ab4be4d9a9c09a98d64c8118c717247c0b30ee1c4136fa013
034271ae428eaa192e32870455aaf1fbdb5d122fb310c3f489e55ea3cbdf4a1cc8
030f6d9b21cd63a73ddea3d515a323e329e275b83032a899d7d79bef7cacebb29d
0366e1c5b2dd7d604adeba17dddb0d4929eb25ff572b4e183a8971c34356d0b9e8
024e6f0020ae7e6d5a8ed0b91bf02c625dd0207d2f7123e9658ce11556c7180449
0272f227567df54c428098e5f27d814abcd1654780c092e69b2cb2b57c5055f1ba
036520754535773a52020c39a79a21a4d8dd3a3d06f7e6840d5de9d67cb79716c9
03f9a5283c15434032a238236d58417c7599af40dcd8e27490083379bbde511651
0277b3c5e809fc11591a8d7ee8a787f2714ff6a7767198ae88799865dcc494c346
03c51e55204759277de794ba57de375973564eb3fc7d13b5c3e91f172ceada1351
03ff8518ad435303603260b576198f10b882f99a8e841e19aa490e134c7afec3f0
030b1e99881accde61c88e1d32bd1048614fbb5f12a13e20830ea6cbfd466fea97
032dc70da389163c57eee5e48efe18b4f3d22e298051b4834478ba0c8d50d15ebf
02f5e65cded6d5e53776ffbf37e0fe3c746d74b8421b90d54221d207262ba69403
02bcf953ab5d9b2bf626a8c7b9fc5ee2e6c8c15b04698b32aad89699c26e256bd0
02c50266ce5f4eb1ff042ad3f60279f4decc3eddfb5c01018de46e5c375def4a95
0319ebad77f23c99dd6f1a6a265c252ce7085c96fc4e5c19f725565ae59c7e56e0
02e7300b9312abb51a2a87697cc78b4f456be6a16a429db18e87f8f8f2fb07713c
032e2a3f7c008a2fd3592b0fb7e54a6ef23ed4f322f3c41e69bd375361555256a8
035349bbd0b20a6a946923ef5a6b366a8ef909f29f9f6fd60586532faabd45dd59
02db6048ab102191640042102bb6774aa9cadbdee7ce304782f1854e0c234bf562
0247cc98ca5d73629e4abbddbfcfc00e1e9f7ade12af595b8590bb09c5b30f15dd
023e8e65e4c395f5f138ba443fd3329841a49128165e6899fea55e26ba1c54ce18
02cbe4271b0a26f3c5b97d95ec82f28a1f1dfedfad0162f7b79bdb3989bbef0062
0303e2aeef5acce411950df3765e06e6fbdb1bb62d29c2270427f99dea41bfa09c
02697ff03fa39b473cd19d62083d9a54d6adb3c107d66e515199c23233137fef25
0230f4bf3cae71c6dff09b9433a8b0557bb3a550b1a3836f708bea9768afcbcad7
030b75103bc2f0b463267ffde032caefcdc0adc041f73895358c5b0f6b23111ba7
023f8fae1dede7f035b950fd8e796e4caeb949711244c2d52be40b95a71bac3e9e
021dcb8a9a06919c65021ab47134ef9afee8761ec1fbd35606506614a916bd165a
0336a8c660f6832b895f055b3bd37bf54636b7302a2c15f45249a9e73631b10e40
03ced5a13ab8b248062ed57defa2f5e7c0794329698040ccbd7b95f80f0b5aaa5f
03b2b7b9f8f9f550b7949393d347dcd5da7d93c6b4fd75b0b51e8b22bf9bbd4ff2
02692246ff0fcb03099da47441720c1cd431497d282d81cf9f3bfbcc6163947d42
0323ccb0fa6fd0cee21e7e75a95d3b629870ccf967f94702a42522e7b45b73593e
0268434d5eaa8fb9a0eebb670fb9bb5b386c564e112a09ac897fa83c0d4eb05b8d
027e981d095c9257a892370301d2903c40a2e68a62ff8049123100cc5a895e294a
02543f1fd6179c07f8c9cdf0f6aba1fed2addb28700e3ede2248935f515a2568b9
02800ff2b0ab7ed89bd96a03ef19705e0b340284958300770081fe142ce35de5f2
03a1d6c758f6674004caada9e2a6d9f033ee1e4a32b171f0e52b6fd4ea39581700
035b27ac7cc5f1627c601ee97d748360f2e435e72a4903727ce8bcc3c1775e610e
02a46ffcf08bca9dc798635cc4308959e191f68077e03a96b27dd6a7cf2dbb31d3
032a1add5ecf39e483f8e76afa97acfe5761390de89bd3435e84a05f3a40379bd8
0310d903358ab2c2c7bd00d9341993742bc77931e54a7652d1891f16d7022dd061
028e6a19a005c75ada52c72eb96e7aef63a6bf0776792179d9c7d89329ebc8d1f4
032cd01cdb8dbcecd1865fd12fafde5db6d93b8b71a3c5bc5f451eeac3409f2e3b
03554ef51e0ee2a69a136d03eb969f3335c1fc0b2f5411003d05905e8bf22f376f
02576fc4d3c31bdba87bdd3d4400763dd763d87207efc1c5259a87834ab1e58437
0238b1ccadc215515b6540924404229ef60a9c58128f9260d73c0ede6d0ff01a49
02784c3c71fd12b64a4bd71b0d537b79159f2c82e5a487fc1bb45ff907cfa11e06
0254ce0f9e0e24f172bfea1d80370fa48990254f9cba04f69d1408416b622c33e0
022c63de9d9b186942e3a301748035613b13637c8ad783aedb61e96873044b1ef3
0362a924863c2e5a0d98d7011a03f1cc0e830361b675a700df7d3e504ffe8539fa
021c7ce4cb84be0a2200db516691944b66b0a2b38a0adbb6a7a30fec5f5d716cc4
02629e8266bce7cbd65cdf2da77a0eb069d3a9fe73bbd77a50531f54ec2e5c6538
0348940940a09ca5ee3eb61246338438fa20eae289dc70cfa5a02a4d8018f460a7
02b8cf0cfe3bd2202c872c6bb85e33f7b23851a93b0b03465b1e72919071e940a5
03ecc3c993e5cfaf3fac77ec6dd812ae1e8404979a49733fc514897873c8ab2dc0
039dcc042320854d6db36e9ee1e8764dd6f28cf3be2b6cfc0537e6516b4c40dd10
02852700ac50fe7a2dffff311a473648fa8aef2192e688e9b22caa326e9bbafcc9
03389cd0eb5d9f385a17a03aee9d76510e98c9a2465b13cee41f0c2120ae9bba53
0252c896ec6b9e3e7e9ca7a16e8d13caa6bdcee7a2acd8aab72421c26a59ee3b71
037f23ffa87b5a50c030b18d6daf5417191593a57bbd5f7aa8bdc40e87c087cd61
0307fba79d0fc80bd1be54ae91e2302c717a2e557209588581ad1d63347c2dd5b4
0343955fd12f2bae0e22b142d666e876b2a306c722a089ffd78758ff9fbc1039fd
03db5fe02749b69f286e5dc751d43b6bb918fc7dba2fe33d526bdb8df9dd2fb3f3
03183159523253c06175cb159380687a038b42d4e54cb5a00713065b959e125e7f
02fb5aceed1a2dec7db7ede28efc494617b702e6df51abefd93c852ebc6fb99959
0378a8c7f10bba5286256dec7440ae21473590d8f7bd1f681a8927eece47a62392
03b9f63cac416f8274dc0d7ea5098b8e25989847dcb26840a7d18dbf0a80812540
025d6d5d123f4a7fc9857004e31ac39e19795e3d80ab730a31952b6c8e0b7338c0
027c43120527a46f1b3459957cecbd31526cb94579ba48cb7a8b7edf7f275d77a0
0282e4f56d2d1ddb51815ed8753628266e3594739bb50e2dd3dab4b11fb4faaddc
030a8eece700a0a8a6f97663b7a1b27a81e05c63a39e187c67ad9d84c9859ed21e
02d4c78ba4baa933c676582a5c928b99e41868d9614b436086c7154907b0d1c487
038ef5b38f9be1acf69094b5c33abab0dd977b1ebd30284ce7ae3fd0eaec287854
025290cb43fce742c75143ba929d4b90876ed35ff4f5097b2937f26220bcf7d080
03660c3966f7bf36dfd8c375d192a7a833536da539c756f0f4edca50e9a548b013
02b98cc82a5da93f0b3a9636b0b79d2bb0bb2f26fb009c5daf4c76b5fa8ed8c7be
033628ceaf93891b1cfb5fe080f6a6ee65d5eb35d2c16507f1d0dabd1ba771e372
027da27afb887ff7161dce954e36464e94716302982d62275edb4086b344150cae
027e4e51f800083f8a319aeff6dcbf1d5608e60994ed351012dddaf103b7dc0b17
03e97da060c9a2f26a3b669aa18aa240e2c2bd0ee230901ee85a8faf0efc599730
02d5bc8f9223e1ee007bd3963d6e71c598b94018fe565b054378350c2803d5f4a1
03afac944dacc0459ca890cd74da57d7fec71f26b33dfcbae0ac87b0d5d7f5899c
0364d3e8ba251b933906ebf70f3db5107d68b73b722f8c3805df94b8dd3e90de20
03104d01c3edbc6f6330441d251fd14be19acc6e703d5db59d8c5a46fc56e742c2
0347712fcbf8c01a154c29f852e872a9a2e6756e1a801f1f9808d4fddc25260668
03f5e452992fed841952c46755c792abc9d347c0f0e58e471069ba98413c2dfe88
02a49f75a9e0ca895b9ab24482ac379130a0d028c241edf2489e8067bf0b730c54
030add68aa746261cd3a4dd620776db8e74da9150c71276aeca1083ec67b833276
034200d8a9c5247f74d224c9cfc57ab333b9d65877093680147aaa378e1da20eb6
03712a39a96a58178a46bfb2de850968428b42d3c6739387072df4d05395518e3f
02971b804dd1ce74f680363c13fae08e5f765107b15b1233d193201cce22d1c6d3
02dbd159df6cfd4a31598c68c6e6a5fbc8cdd4e1387bc4c47a3f0c9d080251951c
03de76d2a8a29cb4c01482aa0ddad7fec8af3c41181c30329a5c8375224b495c80
03eed5b0305f603bf374a8103a31d0c0a947564cbb71fd285958abf3af39ff35e6
028ab96aab6f6c48a8fd241b86077e865c3c64eeca0d4e0ae13d053a96c5aeabf0
02947458b1996728acd8f37de3753e2bc907d6ed4304bdde18491a1933a91aa407
029718fcbd423bd8c873450d73b2cc60cd0b406451e54235b62ae303a7c847d5bc
03f3ed2936def306ebd5c16042702b968494bbff90278ab12c301319de4cebfabe
029a6f36a5d32e77c2629cdaf8baaa2d7b5b3066795079904327029bc13fe20a7a
03b7d8942a137e7804c2b7ebfc58cdf1636f7a2de5a7e4e403537aca0321fa8e06
030be3111c7a5fcc02b6590e7e5890015719ee9c87865d94eb97eb3b24bf75669d
02909e72ff23c03390630cfadf0ce4fcdb8ba537e576335af8cccf3f9f439a8264
03648c96834e62647308c59f62422a8e9601cecb68d7218d638acbe3e821d7ac47
03e6e6499a84a89dd380b49aa4ba0f89013ae79cd19a9bd6e0de17af8283454e61
038b3589c6dcadbbfd593c233cd7bafae3fe5b745de752c790a2688f8bc199226f
03734dbacb578f97acdec3b7af5dcf7bef7923d12c1334d0bdbe2bd966f96f7ca3
030575c17b3ff34bccb65ff3fbf2defe9442b1324a04f4f15c3a1dc5598a37873d
02d6ffef7dd939398547e4669b0db2930107834fa748b774e73231cea15faec498
02ee2d97a951ab8aa9db908f174230fde6b720fee44eb7320800c3cf5499461c2a
03170e7fe8019e225d2f62ff34d9bb4a681a54daca31b7d42c3c4207dd47f7c50b
03e4530d9dfb3006620addbff7b09f9d735c4410c7b879ae70df722d6676c8ca89
02e5f3fb6fe635644773e115cc15a69dc0c0adc4bbfb4c0ae8a3f076d91a4d8818
023251637a94d8e4be45e6e297748d832cf0a0884f06e6019e9f8a074466574489
0239de6ca40773545670176525ed548dd296dc4fa71ff140d340748898a1c77ab2
032b569ebd3a3045fdfab1000777368edda03b6bebe5615f97639dee9e660868f3
02c190bcc968bd45d793c78282ca0da02640cdb99be9161269cceeda4f882fee33
03af7b0356bed10f66add372de784503547ae6a57017c033d0cccf6dab9d7396cc
02b6e13eeaa0a4c5768248ce464ba26c467e8edd572df5c0339a5f2d1218df82cb
038f93d1aae2fca57eb0ee0be252ffc7d65a30dffc388b1ab1c2951577ab480b48
0329dd2f694256841f7d7642305412e0330f4e9c7a795e1d7ddd2e7706533793e3
02805d95fdbe916c78b5ca3940a2438627a8cf615c045a61940c4889997d27d6e6
03a0f875ad1de3fb1d3363b77a3b3210d91d1aac004f94e7af64c7debe3f57eae0
032d2852e93858269b4a1b4a2ec0e485b7c088039e2e49edeade69b94d291aa00e
034154e16c5ea6202847de6e2e52760e8797e569daf037cc71aec13598fd7a2475
02cdb5e13ed04b2522b0926993a1d266afb928912aeae50cf914ee453cad94c183
03dba71aeeda6c70d9a39cca421c2a5b53cb54c707e15758c20c5e6e021fde067d
029d938e994dffb99a9c281cbddeafd91cb2accccf0d38baef119692e06d2ca855
0393f865c982696a37c69dfa0b79573066a38f6d5f4cb7416615f8576ef00ee105
03d333b7feff043223b23322ae1b4e6314b1c7b85c2cdd7d9769d23269bf5c7985
030ce6642180118c1ffe3ec5757d9a536d368abc64e916c0fb19a61674211af30a
039bce1c2831a4abbfc8a9df2e7606802ab733a80a084cc99f0fe4bfb251e49ba8
02121dce216e2887a0bc4db021c1b8de82c77aa4bfcdeab3071b258683bbb1053b
03b76f10442a03490ed3c333e9372475848e4ccae0d2ff015f34bb5aa62d43295a
03da3c3f0f26bcf64c31bde12a71054bb82a9b6e82b8770ee5b98638e967ef027d
0215a97e5097e7dac278289737d127dde744969f46e0b28ca3079a8bc774d44f5c
0325232893b40e8787147ef9af7f3314bd268cebdb29fb2080a2fc97b423f2a3b3
029e239e9d107330d9cf75a02a48e99f290179788d2ea1125d7b7156cf06dc676f
026bff7301c05c5ea69dac6fcaebc86afef7aea91c41ad904650f9244cac8c7f9f
035280e27fd858ea834e40e24737fe8c4a6268b6a096f1421f121fa4fc3896531d
0212f0fbf102dbf76988c436014d60d5bdfbf8b9fba19ab891c915911147fc1284
025b580b0b88755fce256c903e61aa50b234116c709d9a4bc0882b9b24a88c03b5
03bfc0086ac2b26ad4964b226870b4c43c50ba59985ff6e4f5bd9af6967dbdeaf9
02b7043a3b479cdd0b306979bd4dc9bef1c0f43195bf2e194873013ba1459d62ff
0361cc2779871e9404f5ef7f2e374715335bff6cee70c3ecd8f3e6c856613fc83d
03a31876dcdd2459b17c5a484ff6a28d2c78f61708725e5742be8276d5b8b71a3d
031e704f131f3e1a7061f1efef8a4c44f8200ca11de33e636e4ea4ddaf4a288d3c
02d1e67af7ed1b016c386154f13f603bf6105e34cd3f3cb07b72a406c3dfdcd8d7
022e3dc913ebc08ca976c2b0ec04198f1746ea1e45b827888dc1d02ba9066e3478
03c698099b0fe1813ab321009e369be09035dd430daa23c5fbe355e96fbcd85b27
03f7794005d324bb18882961d1e0c13193e5a6429abb9f8109905496a0449a4153
034a21843d9e5531618be4ee61f8b725e015961465b499ad6421c2890f692dd0a8
0312af66ce43d27c987e33a763e21336c35ea0e93cf87a7f6c38cbe772bfc485ff
03247b52c1eef009d3cd75e92f36dde803246c92f79edfc361f2f6a173f873be2b
0212c6556b10d73e41da6b011506871e263b0851b4b66404f608a5c7e5221eba5c
03b9c6938706eef51ab556d70ef07247769af2a152a112ea2e3411a6d258c7b33c
031849627a5859b6b43433ab5ec2a97d98650ffbb57997fb484e0b065e51a2f9d4
02161d0276b8f5b5514867c30299c54cdaf6a1cb21f4455a52dd120963bd0827e7
03c00f6bc6ab8fdba34b835741ca8371b3afcd8a255524b4478fe79c0dcf2c1afb
03250f1c9d018fa26035692915afff2256f3a220d45060fe778e923612dcd56b06
023b2f74e8eb26a1feeb339270d7d2684ddeef71df45425a48f697b6bb575c1e7b
034a5b227fbb53d4278d686b00d5bc658223e82de08bab646415d6a7a5715ac35a
03e9029476626edb8bf1f4e70b66c25aa88fa636ebb1ffa751f42a57ba6476b600
0214c7593e63a1c926c5969be99b473a9e5f322ec02b1bc95cc07ca67ecba8ecfb
0255f2f8799cf187d95f7672a28d86e5c3b34df3e12e5e3547cec896f4ff402d99
03a94125d3345e1105e3d49dc81cd39590256823c716b3dda943ae22320c737fbb
03ef9744e0bad3d400d9cf532a1ee554a1fceaf74c5b7fc974ba4e7ba308056f2b
02a6a5dda8c43b81f400003b7c3ae26838dc1a486da15690e317eb1dc230e8affc
02ba7e14c23ba8efc15f66e25f335d3b1f4a30dce50da0da7e1f09475fe22dce7e
0204b963d3ee2071050d32c2f7cf9b454698c4e4b765a113f60ed5ccb61faa5b14
035abced8e54e1190977c356e8eda2c8c3ecd61357a931bda74e0c72caa6232b97
0291fbd37a2e0e830d3488b87cb3470f11886d0fe2120c12ec3ffe3cc97615ba50
023841a676711ba6d853f6d4ff4ed0c328e217aff7c9000fbc1018181770e2e929
027de06bbe08e549affd51b848729584dd6edeec5c36a5491d3cbfbf98318d2306
034f9549db7f44881711ab9b113cde006c532a46b03d6d23206ccd05bec33f746c
03799c222dd09217bd752d9794f6314034bc7c669b9341da7e7f6ed4ad2fdb10ae
031a0bae020abc42b82ab6c0ee6d9761af2b1ce09de87f5acedb21fd2f69c17778
027c2f50fd83f01f4d9eb907db90c4c8010b0a2f78b30e3db7225f5e6ee354f215
02a39097bf62abd1d13ece08457872d606d12676a2f67e0c75d9c5669e0e002381
021169eb189fb71eeee6084d6a4d5a502b8595cfe1c502fd358cc04a68267d2d49
036f186e87a7e0ba3da883a5c7c09c8acc2c30b53b6e6a0f82a9b0f5e28d2100ec
0360f189e903c9f18e9b35737c0504b08a5f978c7bc8aac0f9c3519c8eab39835f
038519a98561dbf5e7eaf30af3ec8780826d230a35846c2cf5f9aaec6e101112f5
034ebbe33b46289590c10504ec2c05e84f0a5ceefc85b65d515c0da6e8060d7a8a
0387be3166ce6701223fb606b65bbd5ce3bffe123a8b2948d5d15d69c8fba4006c
0250e5014796342ad327dde0e487554f5ee09f9b5f0c7dfc5cfcd0064c5fa0c728
038c8685c12606b1b13ff97f1dd8e70c72ccca5833697b8c3f4bc0a3fa1db0ef1f
021254ea49c19453347bcec2ae6eeb18c86e92408a3d540c9d073f84314c2ada26
02a9de83914838fbc87413b462ee4e7f2c173fdfdeea5d7732a4860dc9b36d8149
03145d38589ca60279df6a1369c6859b8d829afbc820dcd8bd20ffa2674a043184
03fb3fd811b5e644ddde70e22a21757df8b75a8630e7511dfff3c74bc3fcee7eba
03e867bdb541a9cd0f021f661e0147e2c2d6d7abfd761287552af22ea71f28e6ce
03d073144db947473b3f3497e95cf833b83c7e0661ea25a1d18f9e7a7d4f607671
0299baa6108fc97d6975437d67e31f1563da938fd8ff9889fa41fc6615c5998b8c
0283c4a40aea231d47d447c8cdad9712dc5b485e62b4269a044128e9d64683edb2
0280bb578f1709b603c09c5e0ab398c24df1ab8c402c8e7ad099ccaabde2b1024a
03be4c7988a5ad64ed12514e2b49f6d1904dcdacaf746ce12e8df866010d842eb5
024d0f214fae598a0926bfdfc98703af543a3e9c9a3c2d5b8805370172a729fa9d
02ea56fbd5c89b6e4d6e2979a448e3b1478fba067e7809dbe70997631237199c14
0294e64b6cdd83472d4d69e38509c7a5fc089cf10575cf8847422cd36835db023e
026b764cb383c8dd3cc442909e1da561e5c045473cc53b5f295a8b1165d3e689e7
0289bfe89a9454df68d40410ddf992d5f9a560ee476320f28a4cd14a26bd13a959
02ecef4c5403480fda2ad2ec8e92d5808d77173038271b80c4944ceb7e933a3ffb
03171573be5569e8dc242e268e0daef73a3e63c213af29bcae21cff1e94ccbbae9
021fea372f31f5a94ee909f1de021d2108a7ba7bdc59317e380d10eee5d6d9c695
032bcfe4a95cb772d534f91bde29eeba80878fb09af1d7ffb3442fbac2055ca1bf
03cca312de92349fa6627ece6bed37e8a08a1615fe5743845e2ec0711dace02416
0303c4432359893d73584d9870ba1e579b15cb8127fa34bc9d8d761161f03bc2e6
0304d2e82cd7f5079da5a15ef962285531f5f766180b3effc8de128afd528a9175
0354a4c630a7fdb29d9dbd02aa0feff422aec17e8f56f4503f3f9b75c14dc25558
02c0fa2d94baf0de84c4b5706de6f45d711ee007cd19aacf5f7ad4e82f327b00cd
03a14d202f00000d170c0e853fbca5a040e09174fbd0a77cd46759a71a56b9e482
03c043a212829b1f4e0d49966c1afa9f429e1d0a2fe3e1f8a6ac7ec7e4743c2834
037ded477a0bf350654f4e7e320bd71367ce494bd9f7f7d0db2d829c022af3ba91
025f7a7280cf3a837b45027d8959c14fb9ac461209e8651424456421b250fd398e
03063933eda284b18c2175bdcf96c523da4b54d230e750b5264eff6168b648c8f6
02f24b2092c7251841ae00c8a079119a3a511a4520acb3f2b1a248a2903e0b7b3d
03336a6ac557b679cb2fdec2617bcd04d60b68199227df881117a062ad9e557bad
02c75f95940abe21e1c4ffedaa075011baf8134b3026263fa3263aa094cfc43a3c
03e00c2cbea238a1ba220af98074f7381003b76b813d80a455692b530fd67db654
03b24eaa97046a5cfe2cd0d718cd6f2f4ce7715bc25f89fae752251428ee048590
036d09ac20dc93181fcf64191ade74f6cbc9f741d62e4668bfd4892c8d7a854001
03282741c0d71db08d9d78fc8bc7e5bd0b46bf5e581a97bfe305f3af5fb96bd64e
02a8c5dca4ae03f990caf0d7b9d93952fe283a46ec5e34904d2d5169d9dba267cb
02eb7363591fff4d2eb67862736a121f5f1d34b7eff0f302f061d3c9fbd43a546b
0368d460a2d1d19d06b36d37641085ce40321edf8438754da01dd5eb687ed707f0
020e31277143c2120f29deb74815971996765e066c38b2c8ea3c8997fb454f52e2
031f96f73d9f2aae27bd7c3e41e7b2449e0b73d86aecdca69a8181c32f678476e7
032ea12f95d75b2b350c43fbe37f1f22d33b6e3dad67446db39634e284314e20a9
02043cae3df9294893b14758b42caa28898553859c53a1d3cfc5bf8673e759ffb9
036f81fe3f6ee19ba42b7666e11a89e19490e8d28777ff3d02ff56719598201c03
0350f92a518d5822ca12aea03b8019efa5dca8134dc58e2ba2c89c80686fa9ad33
03b036f78e8eb9306e18ab0f5919fb4682d51b9ff8d03a967601fa0d16486c94ec
03918ac3c39842282e8555eccfd65afb58fe0980a60d352848ded16ebe95db96ad
02fa983d9905f7f241ed755d69accf9c6e8a7e3bb424edb44a95ec46102b407b0b
02282db02e6908954c0e2285d1aa1a77b2e9d2bbb92a2e8f8dd365888684cebf0c
02a1e0b7e51cb569e3a3e173ecae193a32b94fae38b98d5119509bbc4802ad8478
034c809df0cb71ff2c31d2de0f6aab1adcdd2cb7a6eba85ecfedd72b4280351cd3
02f450fa4de435454e79d21edda226fb98fe776fcd70f8072f40a7debb2be8d73b
03b02ce21dd9abe307c60ef3856a15683789bab70fe299686a0798d422c6d53c89
02c6fc60e5bd645360bfad87b23f5620ef909b30c4debed283d9f3ab93d48d0bc0
020dc35d15d395e57d2a64dccbb9284f7adeeec5b15ef8250e1b60d61d2211d65e
03fb885b04afdeec7943a605033f08d947104103e6e6394af0b82b5e24d3e1593f
02175e060a0c23fcb3fb8a8525a3f1d56b2f4e33856d04e5e69a63c5c625f7727a
02e5d49e6f5e1aa1785e26d0b25d05bde49ac0ff23882a2ea5e0a5a3c0a6f0995f
036514d99a4753df2842eab70f2cbc23cf3aad8d76346e0d80fc0650c209e441a8
02d3dbec8345278346ad19f366640c9eb1e3a60d38ce95dec4308e664321f95e6d
03b7a150a996a5d93c76ab3875aec7e4f84f12ead6ace6b1a11439e65e3f00601e
02919f4489a2b7f8e2b2d2ab8266da41cd429830f6b23fd38b397357955aa7ae7a
022cb4e4027bc6048f1abe6d01acd2bf69982fe78ea4e8533da17a307d197687ee
02d7126e022184d610642812622d3ae1158de85cad8b0727b427d059ffcb9124c6
030173ebd6787fb1943e2217874ce987284a3fc5beb5d8780eed156f87628fb187
03707e81776ec50eb785765f7c96148fedfe5aea81742938e2955ceaa65f24e79d
02e71f1c810a8b45c9a759bebc2b863cd89974f45d5bdaea20383a1f844744c999
03f60ff6a71234edb67df8360aa456577d6ec6012eb71c9a54d686a1398a305e4f
0378d3350e17a0093afa0e878e8880af8536c0661e41b5d6d52a7af496cacd4764
0363bbcfed9431dbe8863a53eb0c214fe8442f124467bdc77b038b8cf3cfd9aa89
02325ff97fcaa7683dcb871328495987ad80a5c50a9ce47e8346fe1de486fee7ac
02ff9539a0ef1f2fca3d9892ea8dbded15028313a1101d3f19895f59c0cbdef578
03595da2fc39251bbd33a58f7aef20bf60b7c7cd9ae8ad0ebd01842454570671e4
03a2e5ecfe516c7700645ce05cbbf84b2a3d71247e26fbf0f58849dee8175a054d
035a369871bbb9421c6feaa6ce65316d9531f0eee16439776afc0ac9c690c2e161
03c8192a9cebf14284fe39d5ea7a62065406010ef8006aaf16718303c1b64e5be7
0328f241e642e8e9517da0b64ea4e09c3715b72387331e46e80d4eb6aabd61361b
02ba071d47a11fdc90c3ba882784e7d273facd417c36c016002bf5cfe948513af4
0273a1d40e87f0bf3bf21d4642546bb1f9a65b510a1b1f3645200f6cfb443b5ce0
02103e2dcf7d66b75ced5c59ac064c860c6db90cb7d505e00fd100f53411ac8ae8
024645a76226f09c20e0585b22b6c0ca833f6c78de333c84852531d21ccd3ace3d
02a45b86b9935c85f82401417f3a907635ca310c1f5961a1359cfd938a5c8aa64c
02dbb9a8b0106730258f4048f006fae6bc623aa20f7caeebffcf46f9dd5719eed4
02d7bc09fb8262642f7e65efd45a527567f0a14a5c33e3dc9a46251f3c4c0cf57b
0292b45574c557e47f7fcbb08cb390acda3befe7bf6dab099385baea335e405416
0259732481c2698b6b471fab6bb5c586173c0204677137909c30ab446645d09263
02152f9095ccee92497ce8d5b06fcde1ebcf3ed8fd4bfbe899eb491f110f903c12
037b3ba5b80d6d02da207501aa64ff3355365e4c1008c0e3733bfe5eaabdfce577
038d03d8ff0f7e3984fdcc8abe7193738c332211eaf74cb7eb2f9a97a667801290
03b29e4d005ddae7ef53aac71ea7cad5df8be2ecdb7ead88b1dffefdea80afd207
0374db4e3bc1247b09f3ec4aa673e2254cd49c6b1ad035f92026c8366c3fefbcbb
032ca53dcb2dff2da9338aaed991207563d6e858cff0c066045a6d4a59f23300bb
02f36527e85abd124de57178f2548f1f206a8bf4a3c64623dc2265707f50e16bdb
022537bb914b2a279a498530ba234ea0bd6b53f7ef6742d29e194ebde90342be83
02864bdd6811e561a0f4c22b95b7e38b9a931780e8fadbae909d90d977f0c03a52
030e0a27fc7f4298c3825f9617530fe76c5aca807ef20adae91b6a7d31544213e2
02f554df6e8a77bd962ecc0d81d4390f516c61ca82e7790351990ee8d970c29ce2
02f124bf9aab7aa2a5a8d6bab1d2795c396b09c31df14d862d4e5a6597f76bc051
029c1c229baa94cf8011cd3042d2e845e16654a509c653abdc7658384f07651ee8
03435d49a010268fd30488eeca24a61c122cd35d094953005f68abf0e0b615e093
028bd70bbfcbaaaa1d212de3ebdb2ad5ab65b1da64a38a64215d0336947c1598b4
02564c79fe90d65d776ad9a7f972e93907909e26a998da0cbfea72e8592daf71ca
03b3e4fe7386d3c06dc986bd202bf464d8a14070869d7bb11880aa88aeb28d4fe0
0267e5b993475c022f52054e3871ca2e101d7f7c55df7cfbc9f076268a2c9108dd
02942abe2d02c1751861334db4ae261c3dfcd22ab4a318f6b3bd8451895573d4d8
02bc8cfa63803a860c6e65b5eb973c8736e3903e58020cd75ec2b1e477dd482f88
03871763411c9cfef14183dec370ddb509fc2ae2571c271f5f68e8a1bdf5d27b59
02ac12f58b498ccf5a9167c5c15aac0b7c215c80416138e371e83e4f6e9fc64cc6
037bab215686eca10fdd56534e1019210d17dd2be949608d3f6b089fc4e71e1c31
03713418a04543e77ca1a0214322dc3e38e2509876ab7fbe5f68ded7f9eb08fb27
02b15f683da5bbad203dcda73abb7b42e2cafb0c0321dc96f9f255ee92116d68f7
02dc09dcc6aac4fee0eccff2140de3f918c2edc20acea982fc8b7b66f9a33de527
020a80f80cfa931cdc55ac1155f1a04f86d9eb53d42abe352d33067f8bbb47641c
028a4c04520676c9c276c3625c6cec32d6094324bde6cb7507d2a1c94c6d0745dc
02233967b319546a4e7fece0d88826e4db27cb34c09d6645f741a4fc960b07b0a5
02424929f9234dcd506eea5f2c9a5f17e47697613073b4eca25273f228186cc4ed
02a69b5ef8c6b68d4ca6c1a9f054f6fff0d0c9c5118860068a968ac86d80a6e5c5
03101a1bb57eccd8d2f1941159c9e30aedac4f62149e9a1d257efae01a4c295e1c
03f85ee734f95d49ac388b700ae8427edde09d691959ec38e67f6fe017eeb5fa28
028e5cfb0c3de2dba7102295c387b55f79458ecd22d178d26870f6e54d950bcbd2
025c40e523a7055d5f38290f72b212c73f3cf6a40453c5aa4eac108c76da381645
0387c49cd9a6c950fa47225ffd572471e8b729a19f602816f1bd9e58659c792283
037c71cacf328accbbc309d4d5de1018d16fdbd2c35fa85a1e36bf5f0efb4e45a1
037a3be865ff1f390069dc26f86003baab8fcacd79cd1eaed3e7055658d8b76a73
03a338de317645824f1351265672b29c9509dd7eaf96219075409b31d2f6da4a37
0320e803f4dcd8a1675e5aa0f49bae72f9f2d17a9e1152d4013f593cc4782e5f36
026b9d4e45ae65f326efce2d6e5b032b55aac75a0e25e16f9a2203493d449bfb62
025d1291cdf3dc0c23c1e87c99f79575d78dd0f7af551dfc2b4a83eb8ca6480cc7
023f1abe1a54befced58106faa989dd82121afda8bdf4ccc3cde9208507c2f108a
03db6a6f667ee6162d808c0e2cfa136485bf372416c2156d984d98c2995c6a8778
025cc4a63147efd98b00ecba2e3f9fd07c24bd016a00bb4e4144c861e6be094518
037071150713476c78a3ac6d87d1d1e1d838bd9d34946bcfaeff91a1f4c8c35e7c
0216e3f14e66368987d1fbd71645b84e791e82bc86f12bc52022bd9f17f421af53
02322c3b38eb24b906e225f296e5809495a3ffd4c7abaa09c3a87b26767e26168c
026e225545838914a7e601e087ff6602704ff94c3e1d0077c1963ec1b8acbfb16b
03dd421e22b061d331e90b70ce7bd7651c30ce919034d66ebeb10ac49c1c9b8456
0220d464b79d077667a01e4013ade7d75850ba7e26ff4ccba766cb983240e61583
0388ec66d334b0c492b02d984cf2ae1bd31ac6e987a286e4e42ffcaa454e1e9f93
03948f082552f46b2a218edc6534ede6c8af743eba9b52a3951196d4392bc772da
02eb2b372bb1ba745a535842e984abee1eba5c65d32187096c2077b4451a7f5b33
0226c7f153a9ba8f4db9a5381a47ec79a7793623e1ee9970d77516a840fcad9386
0371bdc94f3f5d8cd7fd875569bdbe92af4fcc6a1a0c029228bd2e45a3024b0016
03f40e0ab85bf4dd78ba12e59dba051913bf34448f01af71c6664de5211cc5c4b9
039cd78bb97e324ea47c2328810e7fcd6db87a133dc0dde21a7ffd360de7bc535c
03656a2af5c67eba7d6130c28ef1b18eaa10a8fce5f7cdf9971a7dfcc9e71e21cc
035b03d7daeda5d5f91a022681788b8700a860867e6f668d2fa9bb1e7af61fb1ac
037e59b238d8e52b6a0896667e8491bcc540528bf7bffdb6f1ed34776b54d0ae05
0297f447ef88ac1323ba818692defa9245a4b75f292bfa655f4538e22c227622d4
02d6adc4f6e1b1217d2d30abc94c97947a5e3de0177dce1fa2584e817350042d52
039942aceb709eea43f1cf8e5f7de497b6507a086917c1c74aef0e436f23ee2dfc
020630d38994f50377b592281073ca605a3a778e3df7ab4e84a937f527f8ba4f69
0281d5cc8ce14c8842f2de02ba09415f782852fb7d2f620befedd3318a53b93ebc
02007a5425bd9c54552302fe405cb2821ebc924ca3a16104fd64394d337c2a68bb
024c1553550e0a4ddf832658eaa574c596103afd8c2785e0d51d8148dee37a5403
03c9b4782cae9c538a1d04abb109cba171482e4f31a4d27d0b655ec44152052db0
03a93b8806055d4695f9a37b51a70d53587e9b436b90591b5e4435706af81f897d
02e6a3711636cfaac44b7c1b953fb6690acc5baa6743dd6173fd981346dba4b08a
029e61b644e81e460acb927a1281e8108ca4ca645247733afd391e0e617b318767
036bd7a4cf644869ab27391473967a83c332a446f94ac7b2b7a783994e60558300
023c2521e79053100e36854bb2e649c06cc6527f4d343f01838ae888e6f05d2511
024d6a24cc580ad3f0b45c4473303472bfb48ea9b9e170787ab6d51c478aac8797
03500b3c49a14c3a915a4edb2dac9f3493566e66c09a4b148d61edc5bebfb64e9b
0306cd5325d676acb72a320490df3319daccaf76a62d10cbfac194cbfff7c4d6ad
0336c59787ea7bb3ba962473d968c9c78dfdec991af6673bdb4de8afd953a58083
034ad57255b7751293897ca683424607f2fc1d23990ffd1a2395f35a78e5a54a3e
03a940278e320859d6630d9e868cab43e716e1b2e4b7201dcad292a6de620224bf
021c24987523ab027d8dc2d1f94b30d2d06120f7b4d668061ccb56002391a10c2d
02e2d47687809eccea15add242f92c28806c1ec9f468eca23bc57a6f2c2f8ff73e
03a833e16d7a05c767881e377adae264f9b84fb550f6c8579d0bac7553717a4edb
02eb9072415367c28d321e047b5b7ae4068530a946e8e4627420b8289364f18dd3
03e42af646e819a5e2574f72dec642d4094ad793e78ad009622710d47a52e2aea1
023ab3cc9ad5edb8d1e51662f3fcaf94e588ba6ba0b19be94bfd4c1e49504e1085
0363fb39a06798fc94829c2df8c01d5ee62566c491bf7a5ea04c73582e907dad53
033d16bcb11e58a85f822c9eae915b9d0c1ba7668cf58f1a844ece8da87df265b8
03785d208331c4d5003ff69d5b57991eaa8e55af169c9198be7f07eefb8eecf738
03722dba0d4956c52456629b5ac387b7658844644b6755158ba6ba6205f84bb066
0251523b9912b34389c80cab05a059bfbc762f3b685de3d1cb5f17410703a9cb21
0317bdf2ded121003fe79f7b69c4f7929d46404665b7833d98f0d933c1645ee274
025517fe28b4ffef2655be5d209e00b835e2a689c508cbf2a6d848c09e7530ded7
03f02c52100a2616dd91016cfdd37f68d97dcf2e0b2f5292369a0d60d40aab6468
03e30ea95f4112321a21c48a4ff83424166df083900f53dc3ba35be7228495a93e
0279d254b7ace875069c078f672b2c166e307e3e0ba5d35169b25bad291e8acfc1
02684b0cee2e248d6dc9cd55738d867e6b46e9050f5cebf293e75a377d0bec9365
03cbd046b6d62cbd7b655dbc248191089d4706aaa128780b210bf9f463c8d68b58
029a6705e230f98a5d316da018767e61c5df0275729d4094f46241aa6d215b7a76
031e964645125faadc779518a4e7101a7767b8aa562ab7d141701c2cd1db4f708e
0247f388ca86922c6f106ef78991840ecbf0e4b6145660dba1bfe612c119eff56d
025a065db5a122a543541b126dd3644b08d54eed9f0bf669afa86cc01a946dcbb0
03c1c99df15d287270e740506c60b99c00e4f9690045933342348ba0f4aa1af78c
027269389813f42ae51061c2fb056dc85a9164820decee97c8cea682c858d57a8a
02b622f64b307325e302eab87c86a64d46b26cfbd9d19746982c04785408064f05
0375bc2f6b51b4a5e5bbb3e7d7e2e5f073923356fc05fc97e26d78704b57be1279
02178df7f818d1f4f93493896a214337a54477fe4d89647bf6c83091948d9d4d80
0302f1e0d69ca0cfc7b87222d06e3329503d92bbcc224fb92e031556e6936bb308
02aab30da939b4d037f249bfa7e56d85136a33aa1a387b3f4c7885a69da41a18f4
023ba45a84f2992e923dfe9307def74c58c740f587fc415140b36ae13c0584798f
024f6f4c1ade838a99f9fb86f1d0efb510ccaefae45a5067a851803c7b34218b4f
03564ea784ca420c2fe644b84954f38a31bd6507af07132fff82a7cb50e0f69752
037b2bce6e48b98e76545840b0393773baf3d8cf39258678cf055bc166cfafc443
02fa272f94fcfd7138dd0fd0249fe6832835a99b9c22b1d140c40cf59e63bf964b
0396f4fa848222d096bcfa8ef2eba70f74eb86c6cef4200dde22da85565cc8762e
0391c1834127c368489595ce1bc68da6721802c41b00e1f09caa46dfceadd182a4
02023a62bcf9f12360a0caf2eb5ea80475b46ccd4a5cbadf62afddd5b184e5f867
03eedfdd03a76e8fb793cf07d1ec7133cc6911d9cc3d51ec803647b56fd099b0ad
021fb2301607466b7be87781b081c8e816ddc78d25df0730e6362c9dfbdf740114
03f7bd9e38d7c8c76d3f0ad89768bd1a66b0f0cf6d2689441ba010bc66a6e1b237
034298c06d13ce86be71c5b7aa422ec27de54ea9ec3e73d65a914aa317bbd57abb
03e9cdcc5a61cc833a3246d6e5efffeff3c7810bb7fa03c90be425bac7e51e1258
024e9d2ab2b5b9f0775175a8159ebd65decaa9e13683080a84a25c510648c4fa1e
03ffe9a839a872d0e56e6f129411d8302b8fac78a91dd27ad2461a6252093051f9
023bb30d81e8d57985b15a3677a12d579ef987298ddcffbf4211b7900f9c4b0fea
024a36ba1b5434b6bbed78eeb8fbf7ac134d62effa04791373f2280598f47d33ef
03848eef57f07dd016b5c3e8916c8485ea420b8562a070eabd361e467e56f7cb4a
0279271ac35ca48469f2e5d463d2d76e51e2974ee7918d42eb76bb28589d26bb36
039af25307e5ecaf18d7b411790753b251b252f0bdbc1a752d95f8e751e00decd3
033db86c56b4a0cda97d3dbf7cb2431b4d5179a38fec685fabc9720d70c1ba387a
03b6ae22314bdabd031786fbd59e4fe0af5b703709e72380d7f16deb4a8f72875d
031cc7fd924891c5b098e2df60c2cea51c6c321a2b07026d972d20b2d2c4917065
025641b8829c05f83e6a928ff58374bb3f18cac0330c0da3d948270d97c26a6fec
027492083f0a6ac4144067ee238d2edce085091391dc6cbc484012818406e42ab5
034a7c73776c7d37588ea850693cc8825d97c7a3538e354e72558ca9d57495b5a2
026f47ce613a223027b5340a044f4c6162ba45e2e0215f6deafd9ae74f1a008c84
028af7b910041fb32ed8222f59331ac98f0cee5c2faefd62bae37342ec192e9591
039ab941cf8aee23217ddde45da2aa6b9f19ed0fe74d7198ca905242f831952f5f
0306070422652d7c7c2b163ed5fe6a9fe085d0d5de1860031a6cc46332b1c9cd18
03750625452a1b2ea60badd710b20e11c3070b871505f4b86386a1e7c99e6ec61b
03f3181051356a87f2e51ed465de240a13be1e0369ac952730a91a112e8e5e8aec
0287c2a311dc9749c0b00909adc261645761ca8b33d291bec7fd29bd487eec6c9e
0275e218823871fc3967c2aa7699f71512a5008eaaed31c4757a666d8c2bb959ba
03426e3d21cf1704232e1df07c31c621daf5dfd489d314b1664fcf12921866f005
03684dd8477ba8e6a6c6769b5a9fbec906acd3345eb6c600cb8357d56b61d506d0
03e79fbe6a27f17e0aa823cfcbe9024faa4939ea6dd33f88d23a81d23c3b079629
02bfba9a90f6c3fd14ffe3f52833d7d5ded2d7ab32d86ec2fe7df7acda3ddd70c5
0247e8c3fbdc3913533822896de4b68767661085e081349794c57d3c9effbff36f
02973e65b73bec124ae9743982b6811228f872046b28eabd414ea7ad449446d796
0383e219b9b93a2ebf16c935b653487461dc287ca7b0855a39b6e213cec15f243e
02f7e40fb5e2f4dcfb66ce49e877aa072e9541b0d90a62fe3d0839bf11214ba856
037b72b05b35c2dbff11e4f58e309aa18b81a1940abad9a657db5fb7cda003cc7e
03fdad3f1a56721ec27816f364da994706cd64f6b8d96dd56d7033584d0aa2585d
035a98d50dc67cc6967e80aa75faee5cd24b783841113e1282c46959306419abe6
02c2972c16329a06e36ef0cb94bd969025e9a4738b65307a75b8bb88dea07af530
02d87c493288022372c1b27e03747850f617aaaa867bc0c3d4e4cec05dd0042cef
039b2e9072eb6578c6d9c3e3a767a7b6fb45c6633957c2ecfc0135dd04920d3e24
038aa0b129632d52f351a4986fdcd3108ec506aca9dd2943f73f6a9893ddbcda41
0257d4cf63541d8251f6dfa371176f7e6ee588e70bb3ae66a147527450774290fc
03b9b22386167fd4c2606a14da285c70ba55927c8fe7c8a89ce475a63b59ec2efb
0315cf3167b29f1344b63f38e8b00ead99702e2e56e22bbc19c5d4dbb0633070f8
038d6313b59c40e3e826ad203d0cc50951bfbfdc22c8092f682505501b6f253513
034a61bbb097eee31c10b8f8f010831ace667ffb24a4131a03909cd4580a7cdfdd
03d317b14379dd15473ae3e0b33fc8b97685c80879237fda633b58392cc4d7c92a
02d05fc6787a91f612d3b3c54fd036b895d4013379f8a6a94dbe03f48754b12cf9
02c2bb8d97e8f78ec5857d7bc1d05fc102f3d44f092cac3edd53d980a735b9781d
0320c058a178bc56bb60f132a9a0a0f736bbe298b9933a0e85fef0d7b23ccce0c9
03e4512af28ae9bbe09e2fbc45dbdd29ff19bae87df9898706597bce72d8cafd46
0223333e696d8238ebbb2ae57c3d865360523db9bba0ba96cd55e02278afc3823a
035526fa6445ba164a12d8c81bd00835880c63bf58d6eb77e18bc3cd59b19123a5
03cfbd4ce30ca5fc416f47b1d59eb74143754425b35e78ae61e70d44ba9f8115aa
02f192f518770e3c054c718c87810fa8800d87bcf8f1623c2bc01a5b353f9a5279
02c60518aecbd2fd1db681f4d1d9f9a554ec3dd3ad679a4c59fc4a4a9a0b946f1e
03abdfc800a56183bf5db8eeabecefee39fbf044bfc25b397cee61e702c59f9bab
035c87635d0facaa50fdce7f0fcfa135e2523ecf1cb869104125468f01f622672b
03e4e88569428cef1abcab0f8e47f277c6ca51b36a1546d2117d29534e6955158b
033b3ae0ac0482c2105dc91df045a7a0e12835a6634fb2b687321f5b653a93dc2f
03b42d6da6fd3328165051d82e1090be3cbd7b79ebb27827848503640bcc187914
0213a09d34920e7a31bdb27274871f88ff904a00603dd7446a74cdef06cec1d460
03759c80f1615027b1bc6d04237228f96641564578f51a7ac403a81d027b8cd5c2
02492ba1da64ad6bdf71169faa506d93b6b6e40e6274e4aa9393de3f605180d8a4
03d3953e6367290d12592ea8327510c7a6b58fbbc540be3c0efdf360200b751af1
03cc147c2ee0b1d7f0c189df71484cf7d1f77039a9b43c494976849ef6f7089bcf
031a07d5941432ae26802e1fc49430135c873391a0032de0ef4d9a2c90126c40ba
029a78c7d0638cc923ac253f50e9ed0d19817e72a92828b6fe7acc7b4a79f5b21b
030042f5c4cf95a722656a6cb55b5ecf8634d92488511a92df23fee096fbddfc9f
034ad9c3063e9299a4d51051d0c5cc9531953c0c243d8d2e7eb0ffaa8edee4883d
0203421c684706d3d77356410d22c4337b01e06c71e671df3ea78810aded0c5534
033b73cc493b03a9f9555b0c3749dfad03f34b3d07c8926c22bfc13b08a33567a5
03d30bd6aacd241f579f045985f8951c5c830cb1dbed540f1348f5da09eb436433
0241258042387c138505d4bc44c6ef4752883697190ec9baf86146132b6b61f345
03fda45e3b0459e9a0931d96dc7b591a311625118c83e0f727aa903c9359f73619
03acac35be70d1aa3c6b7dafb26f747ff2f76286cf666afdca6105d102adc946c2
026a0362b538078a472db5c0bcd50b32415db0896cc5acacb548d13707a598759e
02b24c2a3e929c6f111d7b54eb5919eba7205188594c15b98672a27b2925285ba0
02f5f2358d7596b9e1c15d7828fc72a983aae13b1c2eedf48d5830ded48ab6de77
027621fd79c2c1fd23d79d5dc2d10b16bba601c59a5478dabe16468c1e5c618df1
03e3485a35b15b44af9dff8368af65ce64f3860095d430999cc712e7ffbd772e84
036ba0bd112925a46ed18168bc8d4c91c010f44da98b1aefd566c44591ffddca59
031f27d9ccd2d235b6933bc9c632b4bd58f38c16d9b1e52da3f6081883d03b8524
03ca1f37cd1edcea0648a9a74becdb83fa927b6b8ae72157ecd78339c8853ccf73
03a486e16ff40ecae7dd1f3bc97cdc472b92058fd470675bf8db5805cce3ad5118
03f141ccaff4e6335bf5fa33b10c877d113eddbb51d41113a436fa862e09cbf4f6
02cf254902c305ee00ccb62de6b90e015209e00754d28938ed9901469186dbdba7
02b0de4b853b8e30ef3ea01fcf6e032f3c2ddfe7ce4b778be8b2e7afd91ac224d2
024d06cf0d0caff8ce74ae4737cb1e83eb922d75367c15762447042298295f7d53
02434daa11d89c35ab918a4c43de8016b75ad5b7f03e53d9e40d33173a4c37f7a1
02c6039c427018453374a677c1cc372517e5be69cb2f3cfc73b1eb73ccd08dc0db
023399867227172a9ed725496f8b10996214eb912f2d0e17c904de92fb9ae99cec
033649de962ca10a19dd923fe7497b6437f99a80ee4e4b3faea3bebb3451999a55
0209acff7ab88baec4e24635f114c3e7259698b8db45cd0b5f350fee5742b1bfc6
034a90eb8cd7e4ae06040a6044a3bf1c002148375d70d8431d5e26d00c7845568a
02dc2709a5099fc05a967bddc04f831b3d90fda12d1d2da0ac6fc4ba07a67db7b5
02e136deb9d9f957cfe49e6d08b12883c4c0d1037331596188acc38b56c60ed6f4
02060462b7cf4363cc2e0e62e20ed91883f28a8a0b4ae8958f3820484a7ffe5dc0
03df023b1bfe27a511b5927aea11e35352fae914e15a48ef5874ee5aa31beb4aa6
026bc7e1e78e6a80a2ad9a7f9d82030c6d54c0d76d0eaaca1a83c7b73b4cd3c65f
02c6131c8fef6c9fc38cc16d99f9be96f0af91ba558e1d995cbb59d47898d9e316
023a779979416c0e99c3b79585bf5aa3d0242d7a3b71f31ff90682f63780aa2218
036140271917d0227a70e6f5cd3b6a76c75d3975c6c371dec968c91aa13c66a66c
0393ddd4bfe81af1be16b098f23cfc8b948e783a4fbe6fbaf7385ed0842412602c
034e5dac12fdef56e33547d34e8ed0ae213dc068f140839840284538b139890050
02bceed8e8dc5a9e786e1c76a8a6d207b4307be68b5f21b66f1012796b81f30bd7
027da41c67a1a6e4388b1391e042a56740bf9a5ff6005b8c406c53d8b52c87a900
030e8e9bdf20c170b32237bdc9d4783ba227074c891d632a3744f69a50dab57bc0
02428111eda9dc473023edbf5fa91bba2e1cadfdb352c1fe268083f3f5e84e66f1
020efda06ef15bd2423cfea1c4c371c37082b288a6c89b74d3184eaacffda7a505
03f0523338e91d367501d195e15bf781fa10ba7e783c6d65b2252cd5c003607487
038bd4711baf1654bea0100866e92fd411daf91916dd3aec68d82f7d6c4b656047
03902df12e98cc765151334e37cc2a27b583e41d4573e607d4b3ef1efbf34a3df3
037e7b8562b7c401b58da76a1cc5679c24cbcebfc320c64066f2b51407ba86f80d
0312be55fc87d6b4d376139e62f94ae5a0304febf09ac452b220d1147b6e3c058f
0386a3895886651f8f036217dcb07185fa7a0db5be6e11176acce7d02e7110fa4b
032997973f82a00c378686965700ab2ec8312ed7ae3d364d1721875241815cbe4b
03c30d134d80a2667242376b5ffaa878ae0aa6b01ce5b1bb71a675911d9b870b5c
023430cf1603160026160070ea0306d27e7e183908e942cfab9ebaa913c7db7666
02d9e07baea43d7f2e9b585d54ba6a62974b1a670c9ea428029d925471c9f8d4ed
025f9da5a7ca8ff580dded967b07018bdf7e0a887385c58b2aeb4d95ea8aa5c1e0
039c87e0d950c03bf218ad06d8eec56873380e50b5cf95e1f7034984297136c710
03aa5dd482cd83b525b2b5d17daf096e9454f9aaf3aed2f815a9b7e88e0eb22e53
03aba5bc52cdc3876d26aca9000d1cd86c15fa6a37b1915d8d6d5edc46928243f8
03dfb23a371f7f1f95554bf1491780b65852676d41026f9765e6e200025d281dcc
02ea6d84a0c9bb294888e111da1ca2cd82ce3a9c7d56e9be53ca0ae450ef43f1ad
0384d6979d5ad6dccc966270b08c5f7f530352eeb08d7b55c0cf6af4eb53b73555
022626301cd8455de2aa21bae1dd4b1d99d946004bcf97cebd98eab4c304a5ad2f
03e75d20c6fcd4a22e9f948a97a5c6244b74912f30d8c000e37ae0c5d5212fc1de
02be484bc8c44026f994b4c4e8f44f0e5c73baf95072fdd8fc42ba677874812591
0215b7a86310b40f254a1c4b8cf97e413773d062a23af40a92ef184ef9f2067365
0309bbb47cff3b7de8fedb8c1bd2b74319fc2e4eebbefbd18889e0e5223f888869
03470cd6a938df10e04cd9f78a0bd0e1db55da202d3f4877532116a92c91ee2eaa
0293e2177f344f2f92fa67e798c22c130d392884ef09b107ae9e93bacf8fd7c709
02dc5d2c992044f9b905e6fb42dff73ade2355229ed4d498aa299111d564667b76
02283cc0a102922a329b5858e7a0e748a31f2e58199f10ef3113bfc74dfcc19764
0238ec634fe1623d1a04858a80256219cb4e9553b23f9c71d1302844cef73003e5
027fbeec0153e599006f12499f41d0a8bf3f875749b905ddfc468fd68fe1399f83
02b15ec4a71f820e2adf6474f931f33320802c32aa883cf9820d5904f9fc2d13ae
02c4461ec1e50f6fb4550e30f22b66460a98d22491f673be8d4fd26fbe4775554d
0376df76c454e0080076af96d3159f5b5a9406e4e4ccc7dea2bad24fc26aba0e04
023727b9635114a892f8cf08a58bfc255b40f2823ed79e9d67efb9c28336ee9882
024ceace946edce124b2570cd6302bf43af98adaf0d4b182eec3005e9c2645c2dc
02c0f4d2c2cb925f10da26658f75f7b9b4a6f13acd9009960f4b20a807804298c2
03a2cfc4974fef8b2a37b67589c6df47c7d27aaab08b21b5c565afa13cb807129f
03c5abf37069e7aafedc899ec3cce6d99425533cab47a1a94712ac6c41ee2ab3af
0308f8c248da51598d29eac9280ebb55719cf6b4feb318e0eae147fee761b07b69
02491105803b050cc55484c686cb95f9689c8f4b2ea5620c01393b343996b519d7
03809dc6b117bc746a4d0e0828e6a58e9173f121bc3202147f9eaadb37e37d1a95
02ad564efa97e85fe7340b15ba97b70297979f680387a52bb11dc709a8a259178e
0386d6c9c4b2fa5a3273a0a191aa3a02a882125f5cd6b93f8d623602f2f8ab1056
03f7e58d2bb5c4d33886e40411eda8433daab93eb9074425e9f0d858fd617fe3e2
0251372381202244fa08ea932d6d6384ba339704674177680b43575df628f5bd8e
033c0baaafaedee4cdf74a4c98a47e4557c5aeb3543769f14722121812f49457b9
03480364ac81a1344fa6bbe893dcba2009730850a7abfe03977ae137b278a97c52
02b332373395dc993dfa961728f733658b9ee6552aa0d624a405a7e24a90073f9f
03530b473d473b04233fe0ad6dc0bde2de2af4275196d7401bfc88062bd4540016
0352d571d08c3dbcc2e28ae17e399735a8b778ae5358ac2bccb67b2d30795e1eea
02c187ad83cf2ac7bc94766a9c9f57e1c3b9c17870a4a79e3863f5779746d64194
0296b3b68b19420bff1837b7502eab4e1b06df2ee9aa8bb614eb9608acf5de9089
0225be813448cd9d50c5b679b212b91c7c53441a47dcaef8e2defe25765b8b0014
032cb28ccb3f3dc84c82d8ee2baee671a16af2f05d6661989812ea16dbab10bbc8
02d7a8e30b267b68d17a47517734786419da5681286a53fa36d429a538ca50f779
03b822be046e3d3d335bdc284dd822e7e4dfd5449e6f98c6cd496b96eed935b555
03c30db3808ec49b33d0b4ace57caadac8c87102ad06954362ed8d7b0643b92e93
03bd9bdbb496a23e8661e5da878f594e6fdffcf8a63ec3833b739097dbc0ca8711
02213d5345a2291de55765bd80ef6e5fe2e7376e97b1a023d3a8aff893b7c5fcbd
03fd901b5ed49ff9978f030bce2b32a2c680a5c8bf85f088deb7eb647182ed77e9
0348f9cd0ac5ddcac656d911b9c552283107e66cff11bb81f1e8de5a091e6ea6c3
0338f2a8dca6a8a78240a55b2577bdaa0bf153559598b11dbd4c4d5815d3f6f0fa
02553fd6cd267c8ff731a0713b1b80df9a48e29f843d632f2418a35542bfa1c47e
0227bee88fc8d1380f6608c037ff76be384af3f1e7e0a8b6ae4e6539cef050b387
0276b0bc2a482607e7edb02725e05de287ee23a71d4d55f12835c05cbdcd9b8f0c
0360a542648c93d05b03c6c9b8269409160e09e3e51982dc1d782870065b18a84b
03011e0c907061f2db64ad6cb9310c1b9441101739fa21744ef13d18f196faa90f
031555047a5aeeb365b4d9b0261254ba5e702efee735926b366c10ea1517688e99
03396f45b613af7c8d5e87030003d2f0ab4334c9fe966c3c42bf5d143b86c78218
034dc44c840e3f776c6054218670a96b7872f0cec7f22a145a0985c7c74223d9b6
02b1af374b7d941322c019230a6c52fca95c93834b877fe56bd995ef6da130f728
0310d7aad813bc82b72c040cd64630fb629ed2355b72a09e0e45503e0699d8ee44
03ec4d978f7778b9504e390f309f697c0e70f08dc3ea8ec8799a2fc6fdc56dcb3a
03a84d0aba651094e041794049c44e5dcc6c903e9baa0562a26ca05ba6d4ee41b5
03d84f4a53e523f5f3fd8b27965f26b86eaf20adba9601d2ff4d91ec4a6b6446c9
02766a5789938210d04433efb96a21e7894056599b08eaa44a743a54b32e530718
025a833f16d743d626f4307422b95a84feb6bbd57d7af654629becfdfe3093af8f
02c453b7b86c654b5d8e55fb5dcaef295e6ebc5e4c9e24da3db3b23b5d7a185a3d
03e727882da22bc488096ace04f14cd226e66ab17eff56a12f828658c1acebe255
029d4bae64ddba63996bc0cb3aed49f8c09635ed469195a70e55372a232f59a6da
02ed65b42aef71902dc4ae77e52704ba0edd05d9d63dfbb9eca239d150a999d053
033bdc8b85edcd55e7a85ad73905839c7eff735bc580f84887fc70b0f5eff9211d
02ef31938653698f458889a7d727d26f6d5b3f0ab18760c2f9f624dbc6b4b44c27
03944a20c84ebe7ff1f1e8d2993a9a0eab85d5ad9bd07780fa0f81fd17a8ec2a45
021364c9e9846bfa3c35ee8321d7a385ba21ddc863d1a813d9110877147ab9ea32
02dc435bae92bbd033f6cace1dd6f1a21b35b78629d30701b840d574cd35d212c6
0223b4598913a7811f02a901424acb1d0edb55a7fb4a49ccfcf903d783a385f62a
0365bbf8d8ac196960221c93f2c5face8ad01f0d8c396d3000c121a868338d7370
03eb814fcadbf174183c4426edf5cb9c20a519f22bccd2a64671bd70ed77348343
03a7174afd0f92304c6bb8ccd5a2ff1fc8e507a407741b2dfc05262bdb5d09dee7
03bd96346b21cf7dd0c1919aa4f85ad4f33a1a71b8f815121122bb31cdfc7f9b77
036e5d2c00c480334700cce9ce12726ae294ff53bb1bbc0b57b5857e330700e690
024c3b67b449d267f892773feae70ac3bb3339c2484fc0010c9ae7d42ca3411577
024b32e2b6ed397917f9d9d66d0698a3483ac656a2a079e95ad7741f7fc536452c
021112a0301b5352b3799467d98efaac2c4a6a3443df48f4830fba6f2665d94b5a
03e5368d32033b8f59dfe6876b03a67a28b5849bfd84bd1c6d5f1faef0866cb538
03e19ff9eb4b5e6ad83c0e4fc6a5e83c1438424ede39f800a2ded2d5559430961e
03227d2300f5ad198f0dde13d5a10dc748da02e1f617d62f272ffe3fec64df32df
038fbdafe7f5a64c313bc59c456236d5925eaa5652b032f88f75e1f678a66eee4b
02e5a8f8f28016a72d639ff2032f71fde683b0c749ce276a85b6ee33571770b2c9
03fcd6835620a3c47175c6c38d551decae48f2af9c51049ba3d85ad6dc73cd9f31
03bf1477d2cdad58a59cfc593e4bdd642e3ff0300447a51e9316f6fbab5fd0bae8
02f5f118131de0890083f17bb894fce92d2907a291a15a4e0e3f07776539147098
02523cd83236c4f463c2db181ea942e680b23e3e1e85362c963174b31efa8ee993
03acc24ae567452b387497182a1538c08984a97374cf2a3e05eb07340f1fdabd23
02b089a79bba7217be2a969fd178e98b2f4db83af73ddca865456020ff7047edf8
031642fcd19ff7920b96bc3e20a110ef5d7fda6092a46fd230ae8ef33887f7d649
028dc6ab9dfb95b05227ba60fa925af2194fad607ddb5cf8f7894e0719955b5fe4
020e1c9abcfc4389d53243327b11b707e90ebd29e556fdc5f17aa0bb2c76a7f84b
03f042229f7c678751281cf5e76176ff1941c0acfcf317980e58361c7a217c68ee
02b470a66b54e2b093e549b18d1aa9d3ec5c240e6080dd7d352ba1d0cdebcf0d82
03492ba0a2331951798c78e4d5953e96ad17b1598435576f588ca7612abe210c4f
02a4245922520ed67c29b138dcb0eae28d8c781befaf69b34317be559686486ac2
02537d526f008e42b8c59738ce69ac1f527179493001e991c2bb913cf2e6755598
0225a905dbd3e444cbf690eea894e4179208e60c50a4a131dc747dae63066eb7a8
020ef3438c09e0f99474bc6cddbd6e450dd1be96c8042f17c8e60f7bf68ac7f183
0301ce1e3ae4caf820aeb36e4f85537153c20b81e2155cf81e7920508242cc51f9
0220d1ad68c38c1c62f8d09e0cc5beeef8f4dbf3141bbb92ab0e1d399b664fb9cd
03e71529ea7ee44a04470d1ce6975b5a90969ba112a1b3e393498bda59d603f149
026be7bbbefd1298fd6012004ac69537c517ff2f0a3d9fb6fce1155d014b822951
03265f40ac0b35b34330eed3a246be378fbef8342926b9b3c4874e487aa16b600b
03a1ff8a1b4102ed94b3f11392b56a6ef0d4c4137a0ea0afb4963e1bd66de49f53
037170cd459ca7e5c2163a4b8cbfceb37b4aec2a417b020c323f522f48428a420d
03ae7469ebe2734779c9c96939263786e513e002dc5108e154dc43eec1f4d99d74
03113579a37d457ecbf71d99c562d9af4d86481c91b25e92b76db08100df18f727
0244c2b6eb60eb2a05c95a184ae52886fdcc69a6ea35700324f96a462836e2fdf8
038582ca8fb78cd00e5b7389ac7449ca6da1e89ff0bd42292e2e7ca46d6d68815d
02f41b8e49d16fef00f93a6e924cb2e12023e44fffb09ef8eb6689fc3d79c4be67
0245302a3db8bfad305fff474cc83f4d7f47245b92a002b647fb1937ffc2e4599d
022f68a76c6a7e937920cf6f4afec4737bab1a6a43210a2e8b8d0b1edadf724cdb
03b11813c3ecf9bec7ddaf0cee72ab060dd84cd055bb97c3ec183d89f49f606325
03ff811e1cbbe610813ad245a6033a4501edd6780d2163534aaa7b3e7f8b7c8dcf
03274e977a7fa7f3ae656b92c275cf7b5c20772781cc81183c001d06a1abc5c9da
033c0e7def323257f0de15b142d43449df5f1c8a4c0022a2640e3b88a9753d93e0
029180f7ddc1ba8f51106b6f500ae524952c0406dff5bcbc91e17b7b96635fe099
0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
038edd590b8e38c8811b46fb8997d1edb4a4012e7889a665d24d026c9269ecb51a
02f60f050c626459da805cec4ed13eac0bf5245b1c94ada871efc70b3fb2e0234e
032c03c7de44cb72894edc19ef774c53e317f125e022371c77143ceb98a225be17
03db977f610c6ea54dbc6ede454c3f841d877e4ebd04fcf21a1550de6f4c5f68db
022f4e13268b47f72c2c77391fddb7e03da55dae3d746f08295f11d41bd0f82ae7
0314620a1516a36ec7ff796bf7c628e919d645079a6140cef92ec3000034988425
034c8e99b4f17afb7f1b20aff8bc6305afbf0068d8fe8ded0487e9485c977ce40d
036b4a66090e9d46556b24805572f274b67ff0675f76947c58256ad6d4a5c7091d
02afe054f8e39a3274f0d3a40f57bd15409be9c927194f085478d5029424d7930f
03e3c40f1f51f5142aadf64ed072f4cb1e7c763b2f1795fd12f0f61f1e412247f4
0306b1f2d0cb31595a5042602788c5a8e375d206a6132abb59b9500d238f3db60d
031e1024c40dac17bceb93778cdd5766b266d36ce319ac109e562de0f3e0bf30c4
033dff1b1c030a3cd54b7022da98188a8f92af2109dbd2bac95a02df9aadbc7f5f
022a9277373b1f9996042f4cf832146d010530912053dd43a8ea61de2f23922c44
029633ef768df9b32496c0ddbe35c1ccaef4a086121de33a5b77313c7c6711f51f
03e10d72c744bf86383cce1e6890b048e48e20b467d32ae0202b705d0a54a39e9b
02b63ecc32389705aabc23b48f887947e4a0ec7649b7e8931922f4b12c3477163c
02474452a99ed61c0f32ff0eb7a854e1f96d0355bcf0eae04574e8e68c95125ef0
020249630a7b15c710b01e5dfeea84d7a181d2663d1f2835ad5114adc17e0fb28b
03eee861127f3e019eb630ecb4171b9de5db4ca7f0128e199e0cc720ea78d8c6b6
03b78bd5de1aa407d9b19934597755981349e375530ae340e67b865bfe98148356
03a799367cf44f47b258def64a6be68da00cbea2fc7ffc3bceaf2335c219fce5e2
035a67992e14b161ba48a3d85bc29b2088b1312dfe31fe52d454928fb240d8d809
03f2add47ce53e384a4bd75a0468f9b6d3fbb81c45d8e8fad34aaef6b2e32dc00d
03442f128a222b74c90b13e64d46ed15271d431e4bafd8c315056af1a5eda09fd6
02fd92965a34398684445ece8ffe9cfe1966400ffb57f9f114ae688254a2999262
02f380f8b11b2a9eca5653b6a24fc9f80ff4b4b10481ac650fd2c988063a220ea5
03f40945730a668f5bd50585dc734f321dd027f94a24c34c38be5083b46ff67b26
0371c6e1040b08b3e5e9dcf409481efc844ec517744b95f2679e0a5e7bd258ace9
02e515c706d9149bb74467affe8a489bbd805e65cb7025ab82c6a77eb6dd590beb
03d02cfa2a69fc6edc0f4781aaf0ebc85d0ffc92791215ddf464b325ad6e356996
03b2a5f7cb04f5d917dcac3ff71ca714e83fb4c6e585bb5f5f51794bf1202f1a24
02a0d95dd2ba3f9b7452d3be33dcd8be8300a823de650f4f09bf223accb91948df
034cf048a264cde4bde4a37237e5998a12586f8986c6fa2df8ae7b93431fa30403
039cf742969a96a019d3d6715de290b9991032a8b74ffb1facc8e23c0109e8c189
02365f5080ab3f23c5df8312deaf35ce153f2f78b72eda71810eb5e542168d2009
029705fa0e7fc04e271caa649601b5505c42661e07151ee520bc06ebfb1b406b9f
023521d704f4ac41bf3b007ad8639705be6b64890c0c6a03e36859832f6c15326a
02ed9027004d07a0b9d8396f4cd52eb6174963aede3083fd51147026a2f468b12d
028235ba9dade53227b0b972b3628be1c616e485e9a0769dd8ac0295674a07af1d
02540fdd30a409a336fbd8f3e76acc4d7717fc095717c8819410af4a36d09274fd
030296e89d41d0cea110666991a8393b88aabef631ff0bb375421b3fb9be15432e
02be563adfa977e8b7cf961a6d3af9e88c6e56e3d64028c5a924edad54f991c9ad
03badc4765b450ccf1caacdf13b384bf01e216c3f452cabac8ac76b08fddb3ab03
0223d274d30fc5112a3f882e3d12b7ce28672ef2eba90319f7930ea7ea7e0021d5
024ef70b58ad17c145686b7594d431355fb048179d34dcf30cd96434db5469e0fa
03dcd0696d535fa6f8a177f8b0e8a370af850f1a621d039cbf39779982e7a66249
03c00145d8545334421378fd3bfec643d89138d0277e109546eeb8b21d51e53d49
03e95e3a2d1c4c92198c3df496b9c425150934000508d14cc3b67791c427a69210
0271bc2640147591e5e17b9f28b94754790b11729b94f0a8c966f001db51b03eb2
03c4b5b3d10fcfe8339ea5aa3000300d292230aaf0cd023a26219f03f143da75f3
0296a7ae8b4c93be0e9658a5cfdea3c3a40ba01dd8017476ae5d0074e7c6776ade
039a8c2fdac44ad32b13acc84348bedbfdde232f09149667f7a6150e0a3421aaab
027cb4748b1ec49431469980bc9eea86084a3b75d499a39a5a588631e2b931dd61
023b7c498aedc18a6c8fe1be99132eb23de1df8cd87701d3064b0da70d08acd8e4
03a1984ba2f294575bcdc467cacebec275426f054e58800712cecf2a1d954c276e
02d305a7bafa2e129f34cc04fb0e5dfd0c0c1e07da189ba37e240ceb67f9540357
022d6cef7eca7c2913c247d1c0801b8113d4a531cda3d02621bf8e68fc203c8d54
03d66a28f0bd4f6f35a1b6c9427c33f34c0ed81adb08904d95d5c668ba59644bb6
0315e866009973372583467cf9ed3b994312ba83f2bea5569bfeebf685848eb7fd
0296e603bf9e4c5fc4b1d702269a52d47772f4adaed23c37372c5a31e3ae9d6ee1
03829056293d01443903a6bea344df7423c06002f6372a8be7dc8e435f7e2553c4
03c65be92f03903b3f2237d1f91a5252b4baab8346987f837aaaf722f3ba5bbc3f
03ad222dc4737e239d2c14725bea5defc7d04649533bf337c41042fcbf97c3a0fc
0378bfba7601175db475f60610f0c176e52d791a5920fea28a8eae1faee227b63f
023e7b65c5218bca818cd450361e1e63aaa4282bdaa52a95a30cab9ada57dd7bb5
031ff5d775b55ea67e7c42de8b4021ab78bd6b019271b49b50de4fec48d7c412fa
03e812c31efd2454ff964fcd020755afac60217de18d5c0f5876052d80776069a3
03fcc605b7d60b001348277feb725bda008f7be7dd9393a86fd4ec214bc07de0ec
031c0245aab2964584a465336b395b3d02cadbacbe2fd065a8fd69f903665df01b
035df640fb2c05dc4d36f1b996ef0526247012fb03bf11ffbc2df7431c1e149421
03e6532b2e06611929e4c10609b0956ebbacf763eb89d8af8a5803f571258fc954
03adc73afc0d93b8709c364c542fd382f090b98f862b8c89ee98bc97e781dabd7e
026890d3513ca2c1259604eea4e381406202121e186cb73abce7d0ef77ab1038b4
022835d5b8ab04d3ada7e2940b481105d23a9d01b76de4da5ba055fcabd849a226
0207cad7b3dd5046064a0104020e141b4b2d6569a231247a1f74489bcef0cfa665
02d4910a89fe43146e440eb5d4a5c16173564125cfb1b995f3f7bc6ba24202f588
03ee3e772fb6a92baf3fdbf4d959fe46d05f0062abe315a5d8a81bdb36c159d880
02e435ab6862f31bb03a910632a1238c05da4172589d606faaf8ecc63f47645cc5
0365943728b6d2e651eac0d021dd8421273c1a76549c60ce69116af8d4bd3cd2ee
03e5d1919809331d90cccf7af5d56c864ae2bc59091ca3d466463334a8c1934b9c
02d21229cd28d425baa0a0ed64c641da7536803d81fb9c140ab8b777536c23fe41
035d37676617f9dfe503dda45e02b9131d6514d3e6a5a6164e3278fa1f59d0e4f7
024bc6f267eb219fc5b7737803b9fb27d2c647fd82cadf4b0f19c2545c8f4e80fd
03e6d1963251a6afa4369a9fa4feb75d62885d314f706803218ca2467b500347b3
03a65a8938072172cd68986f5240fbb89e2a933e3d5d67d931036d20aaff944555
0364974a069dda83e7162f6d6791914090dc07d1021e6ed0c7f5a6826e3268c0dc
03108dbf94d09b121f749d58da2f71b82772f5204e1db84b2d06fc600b4ea2b79b
02e0c9eafbc1a867099bffb17be4ec609a9ee1ef3196cff5cdc31a6f811b4d8909
0316e40e1a7906cdb9aa4f3c6202014c083c63f403ea04a18395751470753adff8
03a32ac34a3bd3169f574254ffa498c9b27cae136f99c68207560e156130bd89bb
0318f8d13f19731313c3d45de481a74f984d4ac8bac87369ceea6a1aed39995bb4
03d1f7ba3fbf42932c092b46b453605aa9634f025e2ae0d5412c188ec06f350834
03439eab275682985395c3340f77da2b3282c502256526504d812ae49961636e5b
026df7f91da4534dbe0bf68cf6a92d05a50698a984550b9fb4996933f637ac9240
03a3db56ede38c95aa982f1780c9725dadda538eb3011b076da315e9944a4c0a51
0275a5a6301969f75c48b825bd9a32b0f77fd5fc3a93f896b8c30c7ff6ddf5529b
038806e3528b1cd818f32d217b58715b675917448e145592c5b3f4a814beec435d
02e3e204d09dd3dbfbd23cb4fdc439a8001cef25caad0aa3dcbbd2489d9da196bb
02fbf3686203a0186d73022e2c127322eabe80646c57ba4b6491b3e45bb0fe373d
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
02b07ba9dca9523b7ef4bd97703d43d20399eb698e194704791a25ce77a400df99
034554288528e2c4f761826255482f20abe3d7a8caf747f2170984110b2f645467
0369e33b06240ffd20467920fdb9a62089568327fe668eb2d17cb02b8ce8e608a5
034180ac8b09bbc3ded2f7ea97ee29fc807a5c59059d77a634e18f90621633845f
02510d746a6a0e90c09a8e93dd7c9d6be92de264f08e81114254bb70985582fc08
033f42d8f6d800a7aac0d7d97b8046a9bcac3bfc6a9acf4bfeaaafdb8ff116b931
03f26f995ef1e313e21a91aa2d572a5775ef428c0aab4face67061dbb8d338aa4d
037cbf3da5bb6fbcc9b1ed5b9878e841aa4008e662b783ca32e367a33631caa5bd
02837efb38e822a7800a764150c882d72bde3fcdee3ef77bf81495748e76af12ce
0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
03c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
03c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9
02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
02b07ba9dca9523b7ef4bd97703d43d20399eb698e194704791a25ce77a400df99
034554288528e2c4f761826255482f20abe3d7a8caf747f2170984110b2f645467
0369e33b06240ffd20467920fdb9a62089568327fe668eb2d17cb02b8ce8e608a5
034180ac8b09bbc3ded2f7ea97ee29fc807a5c59059d77a634e18f90621633845f
02510d746a6a0e90c09a8e93dd7c9d6be92de264f08e81114254bb70985582fc08
033f42d8f6d800a7aac0d7d97b8046a9bcac3bfc6a9acf4bfeaaafdb8ff116b931
03f26f995ef1e313e21a91aa2d572a5775ef428c0aab4face67061dbb8d338aa4d
037cbf3da5bb6fbcc9b1ed5b9878e841aa4008e662b783ca32e367a33631caa5bd
02837efb38e822a7800a764150c882d72bde3fcdee3ef77bf81495748e76af12ce
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9
02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9
02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13
02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13
022f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4
022f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4
03fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556
03fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556
025cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc
025cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc
022f01e5e15cca351daff3843fb70f3c2f0a1bdd05e5af888a67784ef3e10a2a01
022f01e5e15cca351daff3843fb70f3c2f0a1bdd05e5af888a67784ef3e10a2a01
03acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe
03acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe
030d84e33ad147ed2ec5bf3263496ba0b4f3a2bccfc28f76a1dd01f1171604fc26
030d84e33ad147ed2ec5bf3263496ba0b4f3a2bccfc28f76a1dd01f1171604fc26
02a836f92423b6bba2d9e8518a92c8c0ed8f8dbf48e0be53bd2fd511bdbb369389
02a836f92423b6bba2d9e8518a92c8c0ed8f8dbf48e0be53bd2fd511bdbb369389
03d5b51f17e1b96c2ffe66913577ce51284901a56e0a95536decbb00049ef01dd4
03d5b51f17e1b96c2ffe66913577ce51284901a56e0a95536decbb00049ef01dd4
03a2763b8363da08689ca0604ec90ad8ee60283ee8de0af620b1ea8b456b6452eb
03a2763b8363da08689ca0604ec90ad8ee60283ee8de0af620b1ea8b456b6452eb
039ac4339ae95ab8988a4c5f5dc7a8cac65b0018883946661f601402ae907c7b28
039ac4339ae95ab8988a4c5f5dc7a8cac65b0018883946661f601402ae907c7b28
0225676177363605d2009d908b4f2acd99920fb11f69886ca373b7c22cb6587469
0225676177363605d2009d908b4f2acd99920fb11f69886ca373b7c22cb6587469
03eca20bac3c75a18682816e17675c7aff736ea7954899dde6106c79bf9e4d55d9
03eca20bac3c75a18682816e17675c7aff736ea7954899dde6106c79bf9e4d55d9
02bff352a06117415d92e245dd36ea34f4d615bb0b7d6cd8c1627664947a7daf95
02bff352a06117415d92e245dd36ea34f4d615bb0b7d6cd8c1627664947a7daf95
0382c9aba3a124baf987639b20621a047a6b7c121cea7f03eb6aee0d2cf34926e7
0382c9aba3a124baf987639b20621a047a6b7c121cea7f03eb6aee0d2cf34926e7
020634f6d472a1d97736c459d6c70be0c519b9d6c3e8ae987d8a7deee23561d656
020634f6d472a1d97736c459d6c70be0c519b9d6c3e8ae987d8a7deee23561d656
036e1995f20f3dc67998a8f4c9d0e4e16dc9faaeacb9eb5170fbd6e4d67e0f7420
036e1995f20f3dc67998a8f4c9d0e4e16dc9faaeacb9eb5170fbd6e4d67e0f7420
0271c5a499d0437e83ee6844111ce52fe6e85acb9f6a3ad58ca9dfb004f502f6d6
0271c5a499d0437e83ee6844111ce52fe6e85acb9f6a3ad58ca9dfb004f502f6d6
03a424ae3e0f3c706335ae487a9407d8c73dcfd912201c4a99f62d641500d61840
03a424ae3e0f3c706335ae487a9407d8c73dcfd912201c4a99f62d641500d61840
036b95a7ab2f4b74515d75382142a04e885e067fcda0fdc11a2970cb2e6c7b338e
036b95a7ab2f4b74515d75382142a04e885e067fcda0fdc11a2970cb2e6c7b338e
0270f1ab1647140063dba01efaf53c4e0242721e54a412ea8a45d6d077c0e98bb2
0270f1ab1647140063dba01efaf53c4e0242721e54a412ea8a45d6d077c0e98bb2
02dc74061d863c0e486bdb24b9064de48e8e6d8e9899626539e124ea12b07f3667
02dc74061d863c0e486bdb24b9064de48e8e6d8e9899626539e124ea12b07f3667
033af91366eec2f5ea6a0d8563ed9e1571b9617b05f352e249b55ac99f9a3b4089
033af91366eec2f5ea6a0d8563ed9e1571b9617b05f352e249b55ac99f9a3b4089
034e858f26dbaa09258de8f0c7426982e4dadbba81ccb482e80815cef33560a94a
034e858f26dbaa09258de8f0c7426982e4dadbba81ccb482e80815cef33560a94a
030ca31c5483cf96f70475975180b3b5834efc3a173cf104b412b2f79102dffab7
030ca31c5483cf96f70475975180b3b5834efc3a173cf104b412b2f79102dffab7
0248ddfabbf1167780f9bd85bab0ebcf95144219667fc8252576e0f62f195a803b
0248ddfabbf1167780f9bd85bab0ebcf95144219667fc8252576e0f62f195a803b
02bd634826e98b18e8a5a8bc055103cda805b695b2f82a32c1c577d7827c452b86
02bd634826e98b18e8a5a8bc055103cda805b695b2f82a32c1c577d7827c452b86
02e05b452a788c99b764ed853197a98ab3c06557fd61ebd81e77437155254d1d2a
02e05b452a788c99b764ed853197a98ab3c06557fd61ebd81e77437155254d1d2a
0260a66ec47ebe42d7e6878a50a7da061e81a1f9c616f1afbc77b642310437b6a6
0260a66ec47ebe42d7e6878a50a7da061e81a1f9c616f1afbc77b642310437b6a6
022c76e6060795452b655f4364a715b91beb7cae610e86adc2a74b43f9cd828baa
022c76e6060795452b655f4364a715b91beb7cae610e86adc2a74b43f9cd828baa
02843036e33642b3e5a19ccb4515b9e0cb378bf489529b33e4853654750ff662f4
02843036e33642b3e5a19ccb4515b9e0cb378bf489529b33e4853654750ff662f4
0343f14ec569a98c4d75a5fc5feac198edd6756c9c667b3058849b16ce68d1d5a7
0343f14ec569a98c4d75a5fc5feac198edd6756c9c667b3058849b16ce68d1d5a7
027321e50764e5c2b5adcf95dc73c1658bd8d83596a92ac683ce630e8d78816cf6
027321e50764e5c2b5adcf95dc73c1658bd8d83596a92ac683ce630e8d78816cf6
02e14dbc3d713ab8497045e13e7b6e1696b830e823e2bfe40e83b987ff860cb3af
02e14dbc3d713ab8497045e13e7b6e1696b830e823e2bfe40e83b987ff860cb3af
02291a1734594ed5a825be67edef1e7f5cd063261150398561b6a1822e3fc813ac
02291a1734594ed5a825be67edef1e7f5cd063261150398561b6a1822e3fc813ac
0364d144fc81ebeff3d39b0b8010e728b808e77aaa0e1ffa81769c244619f7831d
0364d144fc81ebeff3d39b0b8010e728b808e77aaa0e1ffa81769c244619f7831d
0365836b93c1d76ef94d5a5bd93b433549309358f31814f89711d280a0aa6581f5
0365836b93c1d76ef94d5a5bd93b433549309358f31814f89711d280a0aa6581f5
03fd26844a7df3cbff5146e0a4e67a14cc39c018d61eb3855a8a9561e0a3699e2c
03fd26844a7df3cbff5146e0a4e67a14cc39c018d61eb3855a8a9561e0a3699e2c
02ca7628d2a503d8cf40c2a71dff519e23c964ef90d5da06387e66a2bd149f81d3
02ca7628d2a503d8cf40c2a71dff519e23c964ef90d5da06387e66a2bd149f81d3
03f5bceb92352c6d0fd6dbe14e16af7fbbbacafea89c0579a98b1db997a97a4530
03f5bceb92352c6d0fd6dbe14e16af7fbbbacafea89c0579a98b1db997a97a4530
03e9785e6d9b38862fa0e54fc644d5ff2e02f62e84e1c505df516508a770388e4f
03e9785e6d9b38862fa0e54fc644d5ff2e02f62e84e1c505df516508a770388e4f
03b7ce629a4247d27f0cf267d66297217e75692fb3b3a478b04eb6de1f57962950
03b7ce629a4247d27f0cf267d66297217e75692fb3b3a478b04eb6de1f57962950
033d57a61100c13cbfb8b87183d905c4bd62b14ef548d859683afc6032b333d8f4
033d57a61100c13cbfb8b87183d905c4bd62b14ef548d859683afc6032b333d8f4
0212c08e60f4a89c843396bd4e6c7f03d1adcb138b76340244b55c31be3caceb3e
0212c08e60f4a89c843396bd4e6c7f03d1adcb138b76340244b55c31be3caceb3e
02294fc3ea8f610d08910dddba66b891addcfac185ec9109b78679ae4e19ee6b07
02294fc3ea8f610d08910dddba66b891addcfac185ec9109b78679ae4e19ee6b07
02313ba6d136fbd5f0a303dc1eddfca7719a15e9c8f7f2d25f3efd22483b6740c0
02313ba6d136fbd5f0a303dc1eddfca7719a15e9c8f7f2d25f3efd22483b6740c0
027efb6e17707d68f3448850c744bd466b51c4013e1f9190c7dd8184ba74f9fdcd
027efb6e17707d68f3448850c744bd466b51c4013e1f9190c7dd8184ba74f9fdcd
02bc57b0a13f521e1fe96abc34824668fdfc89a85a8e7f69fcebf382c15bd7cb26
02bc57b0a13f521e1fe96abc34824668fdfc89a85a8e7f69fcebf382c15bd7cb26
03028a38699f7c5893bcb259814702c5ac2c1e6c767a265dd4a8126922b863bc00
03028a38699f7c5893bcb259814702c5ac2c1e6c767a265dd4a8126922b863bc00
0280264097d536130b9bb42988bb9c9aedc140b86ab72d5d38fade31d9a4171dc9
0280264097d536130b9bb42988bb9c9aedc140b86ab72d5d38fade31d9a4171dc9
03ff17a8689d9e7a031a5f970476744533ace2579efffa2ce3e148b41205a159ee
03ff17a8689d9e7a031a5f970476744533ace2579efffa2ce3e148b41205a159ee
024bc3263ff0ae28687e030bd9327b1a801ad5837ff1da6b9e49c9bac8fee26dc5
024bc3263ff0ae28687e030bd9327b1a801ad5837ff1da6b9e49c9bac8fee26dc5
026e56e86cc9a62578039da51442418de92c24580996b91458b6e81ec100abe28b
026e56e86cc9a62578039da51442418de92c24580996b91458b6e81ec100abe28b
02b83be1201384ec1ff15474485a9700b30f3b0638b25928cdd6df26d781b15ee8
02b83be1201384ec1ff15474485a9700b30f3b0638b25928cdd6df26d781b15ee8
03187540819f763de7782939a71255ff97712a25c83e2a5e49c5725dcb6914a1b8
03187540819f763de7782939a71255ff97712a25c83e2a5e49c5725dcb6914a1b8
03d5747c593533e620dc7b576febd13fb758525670eeb42006166fcfbaf273bb41
03d5747c593533e620dc7b576febd13fb758525670eeb42006166fcfbaf273bb41
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13`
  .split('\n')
  .filter((a) => a)
  .slice(0, 1000);

const { concatBytes } = secp.utils;

secp.utils.sha256Sync = (...msgs) =>
  sha256.create().update(concatBytes(...msgs)).digest();
secp.utils.hmacSha256Sync = (key, ...msgs) =>
  hmac.create(sha256, key).update(concatBytes(...msgs)).digest();

globalThis.runNobleBenchmark = (async () => {
  const windowSize = 8;
  const x = 2;

  secp.utils.precompute(windowSize);

  for (var i = 0; i < 10 * x; i++) {
    secp.getPublicKey(secp.utils.randomPrivateKey());
  }

  const priv = 'f6fc7fd5acaf8603709160d203253d5cd17daa307483877ad811ec8411df56d2';
  const pub = secp.getPublicKey(priv, false);
  const priv2 = '2e63f49054e1e44ccc2e6ef6ce387936efb16158f89cc302a2426e0b7fd66f66';
  const pub2 = secp.getPublicKey(priv2, false);
  const msg = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
  const signature = await secp.sign(msg, priv);

  for (var i = 0; i < 5 * x; i++) {
    await secp.sign(msg, priv);
  }

  for (var i = 0; i < 10 * x; i++) {
    secp.signSync(msg, priv);
  }

  for (var i = 0; i < 2 * x; i++) {
    secp.verify(signature, msg, pub);
  }

  const [rsig, reco] = await secp.sign(msg, priv, { canonical: true, recovered: true });
  for (var i = 0; i < 2 * x; i++) {
    secp.recoverPublicKey(msg, rsig, reco);
  }

  for (var i = 0; i < 2 * x; i++) {
    secp.getSharedSecret(priv, pub2);
  }

  const pub2Pre = secp.utils.precompute(windowSize, secp.Point.fromHex(pub2));
  for (var i = 0; i < 10 * x; i++) {
    secp.getSharedSecret(priv, pub2Pre);
  }

  for (var i = 0; i < 20 * x; i++) {
    const p = points[i++ % points.length];
    secp.Point.fromHex(p);
  }

  const smsg = '0000000000000000000000000000000000000000000000000000000000000000';
  const spri = '0000000000000000000000000000000000000000000000000000000000000003';
  for (var i = 0; i < x; i++) {
    await secp.schnorr.sign(smsg, spri);
  }

  const spub = secp.Point.fromPrivateKey(spri);
  const ssig = await secp.schnorr.sign(smsg, spri);
  for (var i = 0; i < 2 * x; i++) {
    await secp.schnorr.verify(ssig, smsg, spub);
  }
});

},{"..":1,"@noble/hashes/hmac":5,"@noble/hashes/sha256":6}],9:[function(require,module,exports){

},{}]},{},[8]);

// --- JetStreamExtra/bigint/noble-benchmark.js ---

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

class Benchmark {
    async runIteration() {
        await runNobleBenchmark();
    }
}
JetStreamExtra_run({
    BenchmarkCtor: Benchmark,
    iterations: 6,
    deterministicRandom: true,
}).catch(JetStreamExtra_fail);
