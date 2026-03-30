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

if (typeof RegExp.escape !== "function") {
    RegExp.escape = function(value) {
        return String(value).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    };
}

function JetStreamExtra_enqueueTask(callback, ...args) {
    Promise.resolve().then(() => {
        if (typeof callback === "function")
            callback(...args);
    });
    return 0;
}

globalThis.queueMicrotask ??= function(callback) {
    JetStreamExtra_enqueueTask(callback);
};

globalThis.setTimeout = function(callback, _delay, ...args) {
    return JetStreamExtra_enqueueTask(callback, ...args);
};

globalThis.clearTimeout ??= function() {};
globalThis.setInterval ??= globalThis.setTimeout;
globalThis.clearInterval ??= function() {};
globalThis.requestAnimationFrame = function(callback) {
    return JetStreamExtra_enqueueTask(() => callback(globalThis.performance.now()));
};
globalThis.cancelAnimationFrame = function() {};

globalThis.navigator ??= { userAgent: "JetStreamExtra", hardwareConcurrency: 1 };
globalThis.location ??= { href: "http://localhost/", origin: "http://localhost", protocol: "http:" };
globalThis.process ??= {
    env: {},
    argv: [],
    nextTick(callback, ...args) {
        return JetStreamExtra_enqueueTask(callback, ...args);
    },
};

class JetStreamExtraNode {
    constructor(nodeName = "#node", ownerDocument = null, nodeType = 0) {
        this.nodeName = nodeName;
        this.ownerDocument = ownerDocument;
        this.nodeType = nodeType;
        this.parentNode = null;
        this.parentElement = null;
        this.childNodes = [];
        this.textContent = "";
    }

    appendChild(child) {
        if (!child)
            return child;
        if (child.parentNode)
            child.parentNode.removeChild(child);
        child.parentNode = this;
        child.parentElement = this.nodeType === 1 ? this : null;
        this.childNodes.push(child);
        return child;
    }

    removeChild(child) {
        const index = this.childNodes.indexOf(child);
        if (index >= 0)
            this.childNodes.splice(index, 1);
        child.parentNode = null;
        child.parentElement = null;
        return child;
    }

    insertBefore(child, referenceChild) {
        if (!referenceChild)
            return this.appendChild(child);
        if (child.parentNode)
            child.parentNode.removeChild(child);
        const index = this.childNodes.indexOf(referenceChild);
        if (index < 0)
            return this.appendChild(child);
        child.parentNode = this;
        child.parentElement = this.nodeType === 1 ? this : null;
        this.childNodes.splice(index, 0, child);
        return child;
    }

    replaceChild(newChild, oldChild) {
        this.insertBefore(newChild, oldChild);
        this.removeChild(oldChild);
        return oldChild;
    }

    append(...children) {
        for (const child of children) {
            if (typeof child === "string")
                this.appendChild(this.ownerDocument.createTextNode(child));
            else
                this.appendChild(child);
        }
    }

    remove() {
        this.parentNode?.removeChild(this);
    }

    cloneNode(deep = false) {
        const clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        clone.parentNode = null;
        clone.parentElement = null;
        clone.childNodes = [];
        if (deep) {
            for (const child of this.childNodes)
                clone.appendChild(child.cloneNode(true));
        }
        return clone;
    }

    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
}

class JetStreamExtraTextNode extends JetStreamExtraNode {
    constructor(text = "", ownerDocument = null, nodeType = 3) {
        super("#text", ownerDocument, nodeType);
        this.textContent = String(text);
        this.data = this.textContent;
    }
}

class JetStreamExtraElement extends JetStreamExtraNode {
    constructor(name = "div", ownerDocument = null) {
        super(String(name).toUpperCase(), ownerDocument, 1);
        this.tagName = this.nodeName;
        this.localName = String(name).toLowerCase();
        this.attributes = Object.create(null);
        this.style = {};
        this.dataset = {};
        this.width = 0;
        this.height = 0;
        this.value = "";
        this.checked = false;
        this.disabled = false;
        this.innerHTML = "";
        this.className = "";
        this.classList = {
            add: (...tokens) => {
                const set = new Set(this.className.split(/\s+/).filter(Boolean));
                for (const token of tokens)
                    set.add(token);
                this.className = [...set].join(" ");
            },
            remove: (...tokens) => {
                const removeSet = new Set(tokens);
                this.className = this.className.split(/\s+/).filter((token) => token && !removeSet.has(token)).join(" ");
            },
            contains: (token) => this.className.split(/\s+/).includes(token),
            toggle: (token, force) => {
                const shouldAdd = force ?? !this.classList.contains(token);
                if (shouldAdd)
                    this.classList.add(token);
                else
                    this.classList.remove(token);
                return shouldAdd;
            },
            toString: () => this.className,
        };
        if (this.localName === "template")
            this.content = ownerDocument?.createDocumentFragment() ?? null;
    }

    get children() {
        return this.childNodes.filter((child) => child.nodeType === 1);
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
        if (name === "class")
            this.className = String(value);
        this[name] = value;
    }

    setAttributeNS(_namespace, name, value) {
        this.setAttribute(name, value);
    }

    getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    }

    hasAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attributes, name);
    }

    removeAttribute(name) {
        delete this.attributes[name];
    }

    removeAttributeNS(_namespace, name) {
        this.removeAttribute(name);
    }

    querySelector() { return null; }
    querySelectorAll() { return []; }
    matches() { return false; }
    closest() { return null; }
    focus() {}
    blur() {}

    getBoundingClientRect() {
        return {
            left: 0,
            top: 0,
            width: this.width || 0,
            height: this.height || 0,
            right: this.width || 0,
            bottom: this.height || 0,
        };
    }

    getContext() {
        return {
            canvas: this,
            save() {},
            restore() {},
            scale() {},
            rotate() {},
            translate() {},
            transform() {},
            setTransform() {},
            beginPath() {},
            closePath() {},
            moveTo() {},
            lineTo() {},
            bezierCurveTo() {},
            quadraticCurveTo() {},
            arc() {},
            rect() {},
            fill() {},
            stroke() {},
            clearRect() {},
            fillRect() {},
            strokeRect() {},
            drawImage() {},
            createLinearGradient() { return { addColorStop() {} }; },
            createPattern() { return null; },
            createImageData(width = 0, height = 0) {
                return { data: new Uint8ClampedArray(width * height * 4), width, height };
            },
            getImageData(width = 0, height = 0) {
                return { data: new Uint8ClampedArray(width * height * 4), width, height };
            },
            putImageData() {},
            measureText(text) { return { width: String(text).length * 8 }; },
            fillText() {},
            strokeText() {},
        };
    }
}

class JetStreamExtraDocumentFragment extends JetStreamExtraNode {
    constructor(ownerDocument = null) {
        super("#document-fragment", ownerDocument, 11);
    }
}

class JetStreamExtraDocument extends JetStreamExtraNode {
    constructor() {
        super("#document", null, 9);
        this.ownerDocument = this;
        this.defaultView = globalThis;
        this.readyState = "complete";
        this.documentElement = this.createElement("html");
        this.head = this.createElement("head");
        this.body = this.createElement("body");
        this.documentElement.appendChild(this.head);
        this.documentElement.appendChild(this.body);
        this.appendChild(this.documentElement);
        this.currentScript = null;
        this.implementation = {
            createHTMLDocument: () => new JetStreamExtraDocument(),
        };
    }

    createElement(name) {
        return new JetStreamExtraHTMLElement(name, this);
    }

    createElementNS(_namespace, name) {
        return new JetStreamExtraSVGElement(name, this);
    }

    createTextNode(text) {
        return new JetStreamExtraTextNode(text, this, 3);
    }

    createComment(text) {
        return new JetStreamExtraTextNode(text, this, 8);
    }

    createDocumentFragment() {
        return new JetStreamExtraDocumentFragment(this);
    }

    getElementById() { return null; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
}

class JetStreamExtraHTMLElement extends JetStreamExtraElement {}
class JetStreamExtraSVGElement extends JetStreamExtraElement {}

globalThis.Node ??= JetStreamExtraNode;
globalThis.Element ??= JetStreamExtraElement;
globalThis.HTMLElement ??= JetStreamExtraHTMLElement;
globalThis.SVGElement ??= JetStreamExtraSVGElement;
globalThis.DocumentFragment ??= JetStreamExtraDocumentFragment;
globalThis.Event ??= class Event { constructor(type) { this.type = type; } };
globalThis.CustomEvent ??= class CustomEvent extends Event { constructor(type, init = {}) { super(type); this.detail = init.detail; } };

globalThis.document = new JetStreamExtraDocument();
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.top = globalThis;
globalThis.window.document = globalThis.document;
globalThis.window.navigator = globalThis.navigator;
globalThis.window.location = globalThis.location;
document.defaultView = globalThis;

globalThis.customElements ??= {
    define() {},
    get() { return undefined; },
};

globalThis.MutationObserver ??= class MutationObserver {
    constructor(callback) {
        this.callback = callback;
    }
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
};

globalThis.Blob ??= class Blob {
    constructor(parts = [], options = {}) {
        this.parts = parts;
        this.type = options.type || "";
    }
};

globalThis.URL ??= {};
globalThis.URL.createObjectURL ??= function() { return "blob:jetstreamextra"; };
globalThis.URL.revokeObjectURL ??= function() {};

if (typeof globalThis.MessageChannel === "undefined") {
    class JetStreamExtraMessagePort {
        constructor() {
            this.onmessage = null;
            this._peer = null;
        }
        postMessage(data) {
            const event = { data };
            JetStreamExtra_enqueueTask(() => {
                if (typeof this._peer?.onmessage === "function")
                    this._peer.onmessage(event);
            });
        }
        start() {}
        close() {}
        addEventListener(type, listener) {
            if (type === "message")
                this.onmessage = listener;
        }
        removeEventListener(type, listener) {
            if (type === "message" && this.onmessage === listener)
                this.onmessage = null;
        }
    }
    globalThis.MessageChannel = class MessageChannel {
        constructor() {
            this.port1 = new JetStreamExtraMessagePort();
            this.port2 = new JetStreamExtraMessagePort();
            this.port1._peer = this.port2;
            this.port2._peer = this.port1;
        }
    };
}

if (typeof globalThis.TextEncoder === "undefined") {
    globalThis.TextEncoder = class TextEncoder {
        encode(input = "") {
            const bytes = [];
            for (const char of String(input)) {
                const codePoint = char.codePointAt(0);
                if (codePoint <= 0x7f) {
                    bytes.push(codePoint);
                } else if (codePoint <= 0x7ff) {
                    bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
                } else if (codePoint <= 0xffff) {
                    bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
                } else {
                    bytes.push(0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
                }
            }
            return Uint8Array.from(bytes);
        }
    };
}

if (typeof globalThis.TextDecoder === "undefined") {
    globalThis.TextDecoder = class TextDecoder {
        decode(input = new Uint8Array()) {
            return Array.from(input, (byte) => String.fromCharCode(byte)).join("");
        }
    };
}

function JetStreamExtra_defineJetStream(preload) {
    globalThis.JetStream = {
        preload,
        async getString(value) {
            return typeof value === "string" ? value : String(value);
        },
        async getBinary(value) {
            if (value instanceof Int8Array)
                return value;
            if (value instanceof Uint8Array)
                return new Int8Array(value);
            if (value instanceof ArrayBuffer)
                return new Int8Array(value);
            if (Array.isArray(value))
                return Int8Array.from(value);
            if (typeof value === "string")
                return new TextEncoder().encode(value);
            throw new Error("Unsupported binary preload value");
        },
    };
    return globalThis.JetStream;
}

globalThis.JetStreamExtra_runWithArguments = async function({ BenchmarkCtor, constructorArguments = {}, iterations, deterministicRandom = false }) {
    Math.random = deterministicRandom ? JetStreamExtra_deterministicRandom : JetStreamExtra_originalRandom;

    const benchmark = new BenchmarkCtor(constructorArguments);
    await benchmark.init?.();

    for (let iteration = 0; iteration < iterations; ++iteration) {
        await benchmark.prepareForNextIteration?.();
        if (deterministicRandom)
            Math.random.__resetSeed();
        await benchmark.runIteration(iteration);
    }

    await benchmark.validate?.(iterations);
};
// --- JetStreamExtra/startup/preload.js ---

// --- JetStreamExtra/startup/preload.js ---

JetStreamExtra_defineJetStream({
        BUNDLE: '(()=>{var e={19:()=>{!function(e){\n/*ThouShaltNotCache*/\nvar t=/(?:\\\\.|[^\\\\\\n\\r]|(?:\\n|\\r\\n?)(?![\\r\\n]))/.source;function n(e){\n/*ThouShaltNotCache*/\nreturn e=e.replace(/<inner>/g,function(){\n/*ThouShaltNotCache*/\nreturn t}),RegExp(/((?:^|[^\\\\])(?:\\\\{2})*)/.source+"(?:"+e+")")}var a=/(?:\\\\.|``(?:[^`\\r\\n]|`(?!`))+``|`[^`\\r\\n]+`|[^\\\\|\\r\\n`])+/.source,r=/\\|?__(?:\\|__)+\\|?(?:(?:\\n|\\r\\n?)|(?![\\s\\S]))/.source.replace(/__/g,function(){\n/*ThouShaltNotCache*/\nreturn a}),s=/\\|?[ \\t]*:?-{3,}:?[ \\t]*(?:\\|[ \\t]*:?-{3,}:?[ \\t]*)+\\|?(?:\\n|\\r\\n?)/.source;e.languages.markdown=e.languages.extend("markup",{}),e.languages.insertBefore("markdown","prolog",{"front-matter-block":{pattern:/(^(?:\\s*[\\r\\n])?)---(?!.)[\\s\\S]*?[\\r\\n]---(?!.)/,lookbehind:!0,greedy:!0,inside:{punctuation:/^---|---$/,"front-matter":{pattern:/\\S+(?:\\s+\\S+)*/,alias:["yaml","language-yaml"],inside:e.languages.yaml}}},blockquote:{pattern:/^>(?:[\\t ]*>)*/m,alias:"punctuation"},table:{pattern:RegExp("^"+r+s+"(?:"+r+")*","m"),inside:{"table-data-rows":{pattern:RegExp("^("+r+s+")(?:"+r+")*$"),lookbehind:!0,inside:{"table-data":{pattern:RegExp(a),inside:e.languages.markdown},punctuation:/\\|/}},"table-line":{pattern:RegExp("^("+r+")"+s+"$"),lookbehind:!0,inside:{punctuation:/\\||:?-{3,}:?/}},"table-header-row":{pattern:RegExp("^"+r+"$"),inside:{"table-header":{pattern:RegExp(a),alias:"important",inside:e.languages.markdown},punctuation:/\\|/}}}},code:[{pattern:/((?:^|\\n)[ \\t]*\\n|(?:^|\\r\\n?)[ \\t]*\\r\\n?)(?: {4}|\\t).+(?:(?:\\n|\\r\\n?)(?: {4}|\\t).+)*/,lookbehind:!0,alias:"keyword"},{pattern:/^```[\\s\\S]*?^```$/m,greedy:!0,inside:{"code-block":{pattern:/^(```.*(?:\\n|\\r\\n?))[\\s\\S]+?(?=(?:\\n|\\r\\n?)^```$)/m,lookbehind:!0},"code-language":{pattern:/^(```).+/,lookbehind:!0},punctuation:/```/}}],title:[{pattern:/\\S.*(?:\\n|\\r\\n?)(?:==+|--+)(?=[ \\t]*$)/m,alias:"important",inside:{punctuation:/==+$|--+$/}},{pattern:/(^\\s*)#.+/m,lookbehind:!0,alias:"important",inside:{punctuation:/^#+|#+$/}}],hr:{pattern:/(^\\s*)([*-])(?:[\\t ]*\\2){2,}(?=\\s*$)/m,lookbehind:!0,alias:"punctuation"},list:{pattern:/(^\\s*)(?:[*+-]|\\d+\\.)(?=[\\t ].)/m,lookbehind:!0,alias:"punctuation"},"url-reference":{pattern:/!?\\[[^\\]]+\\]:[\\t ]+(?:\\S+|<(?:\\\\.|[^>\\\\])+>)(?:[\\t ]+(?:"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|\\((?:\\\\.|[^)\\\\])*\\)))?/,inside:{variable:{pattern:/^(!?\\[)[^\\]]+/,lookbehind:!0},string:/(?:"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|\\((?:\\\\.|[^)\\\\])*\\))$/,punctuation:/^[\\[\\]!:]|[<>]/},alias:"url"},bold:{pattern:n(/\\b__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__\\b|\\*\\*(?:(?!\\*)<inner>|\\*(?:(?!\\*)<inner>)+\\*)+\\*\\*/.source),lookbehind:!0,greedy:!0,inside:{content:{pattern:/(^..)[\\s\\S]+(?=..$)/,lookbehind:!0,inside:{}},punctuation:/\\*\\*|__/}},italic:{pattern:n(/\\b_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_\\b|\\*(?:(?!\\*)<inner>|\\*\\*(?:(?!\\*)<inner>)+\\*\\*)+\\*/.source),lookbehind:!0,greedy:!0,inside:{content:{pattern:/(^.)[\\s\\S]+(?=.$)/,lookbehind:!0,inside:{}},punctuation:/[*_]/}},strike:{pattern:n(/(~~?)(?:(?!~)<inner>)+\\2/.source),lookbehind:!0,greedy:!0,inside:{content:{pattern:/(^~~?)[\\s\\S]+(?=\\1$)/,lookbehind:!0,inside:{}},punctuation:/~~?/}},"code-snippet":{pattern:/(^|[^\\\\`])(?:``[^`\\r\\n]+(?:`[^`\\r\\n]+)*``(?!`)|`[^`\\r\\n]+`(?!`))/,lookbehind:!0,greedy:!0,alias:["code","keyword"]},url:{pattern:n(/!?\\[(?:(?!\\])<inner>)+\\](?:\\([^\\s)]+(?:[\\t ]+"(?:\\\\.|[^"\\\\])*")?\\)|[ \\t]?\\[(?:(?!\\])<inner>)+\\])/.source),lookbehind:!0,greedy:!0,inside:{operator:/^!/,content:{pattern:/(^\\[)[^\\]]+(?=\\])/,lookbehind:!0,inside:{}},variable:{pattern:/(^\\][ \\t]?\\[)[^\\]]+(?=\\]$)/,lookbehind:!0},url:{pattern:/(^\\]\\()[^\\s)]+/,lookbehind:!0},string:{pattern:/(^[ \\t]+)"(?:\\\\.|[^"\\\\])*"(?=\\)$)/,lookbehind:!0}}}}),["url","bold","italic","strike"].forEach(function(t){\n/*ThouShaltNotCache*/\n["url","bold","italic","strike","code-snippet"].forEach(function(n){\n/*ThouShaltNotCache*/\nt!==n&&(e.languages.markdown[t].inside.content.inside[n]=e.languages.markdown[n])})}),e.hooks.add("after-tokenize",function(e){\n/*ThouShaltNotCache*/\n"markdown"!==e.language&&"md"!==e.language||function e(t){\n/*ThouShaltNotCache*/\nif(t&&"string"!=typeof t)for(var n=0,a=t.length;n<a;n++){var r=t[n];if("code"===r.type){var s=r.content[1],i=r.content[3];if(s&&i&&"code-language"===s.type&&"code-block"===i.type&&"string"==typeof s.content){var o=s.content.replace(/\\b#/g,"sharp").replace(/\\b\\+\\+/g,"pp"),l="language-"+(o=(/[a-z][\\w-]*/i.exec(o)||[""])[0].toLowerCase());i.alias?"string"==typeof i.alias?i.alias=[i.alias,l]:i.alias.push(l):i.alias=[l]}}else e(r.content)}}(e.tokens)}),e.hooks.add("wrap",function(t){\n/*ThouShaltNotCache*/\nif("code-block"===t.type){for(var n="",a=0,r=t.classes.length;a<r;a++){var s=t.classes[a],u=/language-(.+)/.exec(s);if(u){n=u[1];break}}var c,g=e.languages[n];if(g)t.content=e.highlight((c=t.content,c.replace(i,"").replace(/&(\\w{1,8}|#x?[\\da-f]{1,8});/gi,function(e,t){var n;if("#"===(\n/*ThouShaltNotCache*/\nt=t.toLowerCase())[0])return n="x"===t[1]?parseInt(t.slice(2),16):Number(t.slice(1)),l(n);var a=o[t];return a||e})),g,n);else if(n&&"none"!==n&&e.plugins.autoloader){var d="md-"+(new Date).valueOf()+"-"+Math.floor(1e16*Math.random());t.attributes.id=d,e.plugins.autoloader.loadLanguages(n,function(){\n/*ThouShaltNotCache*/\nvar t=document.getElementById(d);t&&(t.innerHTML=e.highlight(t.textContent,e.languages[n],n))})}}});var i=RegExp(e.languages.markup.tag.pattern.source,"gi"),o={amp:"&",lt:"<",gt:">",quot:\'"\'},l=String.fromCodePoint||String.fromCharCode;e.languages.md=e.languages.markdown}(Prism)},44:()=>{Prism.languages.python={comment:{pattern:/(^|[^\\\\])#.*/,lookbehind:!0,greedy:!0},"string-interpolation":{pattern:/(?:f|fr|rf)(?:("""|\'\'\')[\\s\\S]*?\\1|("|\')(?:\\\\.|(?!\\2)[^\\\\\\r\\n])*\\2)/i,greedy:!0,inside:{interpolation:{pattern:/((?:^|[^{])(?:\\{\\{)*)\\{(?!\\{)(?:[^{}]|\\{(?!\\{)(?:[^{}]|\\{(?!\\{)(?:[^{}])+\\})+\\})+\\}/,lookbehind:!0,inside:{"format-spec":{pattern:/(:)[^:(){}]+(?=\\}$)/,lookbehind:!0},"conversion-option":{pattern:/![sra](?=[:}]$)/,alias:"punctuation"},rest:null}},string:/[\\s\\S]+/}},"triple-quoted-string":{pattern:/(?:[rub]|br|rb)?("""|\'\'\')[\\s\\S]*?\\1/i,greedy:!0,alias:"string"},string:{pattern:/(?:[rub]|br|rb)?("|\')(?:\\\\.|(?!\\1)[^\\\\\\r\\n])*\\1/i,greedy:!0},function:{pattern:/((?:^|\\s)def[ \\t]+)[a-zA-Z_]\\w*(?=\\s*\\()/g,lookbehind:!0},"class-name":{pattern:/(\\bclass\\s+)\\w+/i,lookbehind:!0},decorator:{pattern:/(^[\\t ]*)@\\w+(?:\\.\\w+)*/m,lookbehind:!0,alias:["annotation","punctuation"],inside:{punctuation:/\\./}},keyword:/\\b(?:_(?=\\s*:)|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\\b/,builtin:/\\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\\b/,boolean:/\\b(?:False|None|True)\\b/,number:/\\b0(?:b(?:_?[01])+|o(?:_?[0-7])+|x(?:_?[a-f0-9])+)\\b|(?:\\b\\d+(?:_\\d+)*(?:\\.(?:\\d+(?:_\\d+)*)?)?|\\B\\.\\d+(?:_\\d+)*)(?:e[+-]?\\d+(?:_\\d+)*)?j?(?!\\w)/i,operator:/[-+%=]=?|!=|:=|\\*\\*?=?|\\/\\/?=?|<[<=>]?|>[=>]?|[&|^~]/,punctuation:/[{}[\\];(),.:]/},Prism.languages.python["string-interpolation"].inside.interpolation.inside.rest=Prism.languages.python,Prism.languages.py=Prism.languages.python},244:()=>{Prism.languages.sql={comment:{pattern:/(^|[^\\\\])(?:\\/\\*[\\s\\S]*?\\*\\/|(?:--|\\/\\/|#).*)/,lookbehind:!0},variable:[{pattern:/@(["\'`])(?:\\\\[\\s\\S]|(?!\\1)[^\\\\])+\\1/,greedy:!0},/@[\\w.$]+/],string:{pattern:/(^|[^@\\\\])("|\')(?:\\\\[\\s\\S]|(?!\\2)[^\\\\]|\\2\\2)*\\2/,greedy:!0,lookbehind:!0},identifier:{pattern:/(^|[^@\\\\])`(?:\\\\[\\s\\S]|[^`\\\\]|``)*`/,greedy:!0,lookbehind:!0,inside:{punctuation:/^`|`$/}},function:/\\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\\s*\\()/i,keyword:/\\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:COL|_INSERT)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:ING|S)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\\b/i,boolean:/\\b(?:FALSE|NULL|TRUE)\\b/i,number:/\\b0x[\\da-f]+\\b|\\b\\d+(?:\\.\\d*)?|\\B\\.\\d+\\b/i,operator:/[-+*\\/=%^~]|&&?|\\|\\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\\b(?:AND|BETWEEN|DIV|ILIKE|IN|IS|LIKE|NOT|OR|REGEXP|RLIKE|SOUNDS LIKE|XOR)\\b/i,punctuation:/[;[\\]()`,.]/}},421:()=>{Prism.languages.c=Prism.languages.extend("clike",{comment:{pattern:/\\/\\/(?:[^\\r\\n\\\\]|\\\\(?:\\r\\n?|\\n|(?![\\r\\n])))*|\\/\\*[\\s\\S]*?(?:\\*\\/|$)/,greedy:!0},string:{pattern:/"(?:\\\\(?:\\r\\n|[\\s\\S])|[^"\\\\\\r\\n])*"/,greedy:!0},"class-name":{pattern:/(\\b(?:enum|struct)\\s+(?:__attribute__\\s*\\(\\([\\s\\S]*?\\)\\)\\s*)?)\\w+|\\b[a-z]\\w*_t\\b/,lookbehind:!0},keyword:/\\b(?:_Alignas|_Alignof|_Atomic|_Bool|_Complex|_Generic|_Imaginary|_Noreturn|_Static_assert|_Thread_local|__attribute__|asm|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|typeof|union|unsigned|void|volatile|while)\\b/,function:/\\b[a-z_]\\w*(?=\\s*\\()/i,number:/(?:\\b0x(?:[\\da-f]+(?:\\.[\\da-f]*)?|\\.[\\da-f]+)(?:p[+-]?\\d+)?|(?:\\b\\d+(?:\\.\\d*)?|\\B\\.\\d+)(?:e[+-]?\\d+)?)[ful]{0,4}/i,operator:/>>=?|<<=?|->|([-+&|:])\\1|[?:~]|[-+*/%&|^!=<>]=?/}),Prism.languages.insertBefore("c","string",{char:{pattern:/\'(?:\\\\(?:\\r\\n|[\\s\\S])|[^\'\\\\\\r\\n]){0,32}\'/,greedy:!0}}),Prism.languages.insertBefore("c","string",{macro:{pattern:/(^[\\t ]*)#\\s*[a-z](?:[^\\r\\n\\\\/]|\\/(?!\\*)|\\/\\*(?:[^*]|\\*(?!\\/))*\\*\\/|\\\\(?:\\r\\n|[\\s\\S]))*/im,lookbehind:!0,greedy:!0,alias:"property",inside:{string:[{pattern:/^(#\\s*include\\s*)<[^>]+>/,lookbehind:!0},Prism.languages.c.string],char:Prism.languages.c.char,comment:Prism.languages.c.comment,"macro-name":[{pattern:/(^#\\s*define\\s+)\\w+\\b(?!\\()/i,lookbehind:!0},{pattern:/(^#\\s*define\\s+)\\w+\\b(?=\\()/i,lookbehind:!0,alias:"function"}],directive:{pattern:/^(#\\s*)[a-z]+/,lookbehind:!0,alias:"keyword"},"directive-hash":/^#/,punctuation:/##|\\\\(?=[\\r\\n])/,expression:{pattern:/\\S[\\s\\S]*/,inside:Prism.languages.c}}}}),Prism.languages.insertBefore("c","function",{constant:/\\b(?:EOF|NULL|SEEK_CUR|SEEK_END|SEEK_SET|__DATE__|__FILE__|__LINE__|__TIMESTAMP__|__TIME__|__func__|stderr|stdin|stdout)\\b/}),delete Prism.languages.c.boolean},613:()=>{Prism.languages.javascript=Prism.languages.extend("clike",{"class-name":[Prism.languages.clike["class-name"],{pattern:/(^|[^$\\w\\xA0-\\uFFFF])(?!\\s)[_$A-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?=\\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\\})\\s*)catch\\b/,lookbehind:!0},{pattern:/(^|[^.]|\\.\\.\\.\\s*)\\b(?:as|assert(?=\\s*\\{)|async(?=\\s*(?:function\\b|\\(|[$\\w\\xA0-\\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\\s*(?:\\{|$))|for|from(?=\\s*(?:[\'"]|$))|function|(?:get|set)(?=\\s*(?:[#\\[$\\w\\xA0-\\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\\b/,lookbehind:!0}],function:/#?(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?=\\s*(?:\\.\\s*(?:apply|bind|call)\\s*)?\\()/,number:{pattern:RegExp(/(^|[^\\w$])/.source+"(?:"+/NaN|Infinity/.source+"|"+/0[bB][01]+(?:_[01]+)*n?/.source+"|"+/0[oO][0-7]+(?:_[0-7]+)*n?/.source+"|"+/0[xX][\\dA-Fa-f]+(?:_[\\dA-Fa-f]+)*n?/.source+"|"+/\\d+(?:_\\d+)*n/.source+"|"+/(?:\\d+(?:_\\d+)*(?:\\.(?:\\d+(?:_\\d+)*)?)?|\\.\\d+(?:_\\d+)*)(?:[Ee][+-]?\\d+(?:_\\d+)*)?/.source+")"+/(?![\\w$])/.source),lookbehind:!0},operator:/--|\\+\\+|\\*\\*=?|=>|&&=?|\\|\\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\\.{3}|\\?\\?=?|\\?\\.?|[~:]/}),Prism.languages.javascript["class-name"][0].pattern=/(\\b(?:class|extends|implements|instanceof|interface|new)\\s+)[\\w.\\\\]+/,Prism.languages.insertBefore("javascript","keyword",{regex:{pattern:RegExp(/((?:^|[^$\\w\\xA0-\\uFFFF."\'\\])\\s]|\\b(?:return|yield))\\s*)/.source+/\\//.source+"(?:"+/(?:\\[(?:[^\\]\\\\\\r\\n]|\\\\.)*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}/.source+"|"+/(?:\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.)*\\])*\\])*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source+")"+/(?=(?:\\s|\\/\\*(?:[^*]|\\*(?!\\/))*\\*\\/)*(?:$|[\\r\\n,.;:})\\]]|\\/\\/))/.source),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\\/)[\\s\\S]+(?=\\/[a-z]*$)/,lookbehind:!0,alias:"language-regex",inside:Prism.languages.regex},"regex-delimiter":/^\\/|\\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?=\\s*[=:]\\s*(?:async\\s*)?(?:\\bfunction\\b|(?:\\((?:[^()]|\\([^()]*\\))*\\)|(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*)\\s*=>))/,alias:"function"},parameter:[{pattern:/(function(?:\\s+(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*)?\\s*\\(\\s*)(?!\\s)(?:[^()\\s]|\\s+(?![\\s)])|\\([^()]*\\))+(?=\\s*\\))/,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/(^|[^$\\w\\xA0-\\uFFFF])(?!\\s)[_$a-z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?=\\s*=>)/i,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/(\\(\\s*)(?!\\s)(?:[^()\\s]|\\s+(?![\\s)])|\\([^()]*\\))+(?=\\s*\\)\\s*=>)/,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/((?:\\b|\\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\\w\\xA0-\\uFFFF]))(?:(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*\\s*)\\(\\s*|\\]\\s*\\(\\s*)(?!\\s)(?:[^()\\s]|\\s+(?![\\s)])|\\([^()]*\\))+(?=\\s*\\)\\s*\\{)/,lookbehind:!0,inside:Prism.languages.javascript}],constant:/\\b[A-Z](?:[A-Z_]|\\dx?)*\\b/}),Prism.languages.insertBefore("javascript","string",{hashbang:{pattern:/^#!.*/,greedy:!0,alias:"comment"},"template-string":{pattern:/`(?:\\\\[\\s\\S]|\\$\\{(?:[^{}]|\\{(?:[^{}]|\\{[^}]*\\})*\\})+\\}|(?!\\$\\{)[^\\\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:"string"},interpolation:{pattern:/((?:^|[^\\\\])(?:\\\\{2})*)\\$\\{(?:[^{}]|\\{(?:[^{}]|\\{[^}]*\\})*\\})+\\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\\$\\{|\\}$/,alias:"punctuation"},rest:Prism.languages.javascript}},string:/[\\s\\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \\t]*)(["\'])(?:\\\\(?:\\r\\n|[\\s\\S])|(?!\\2)[^\\\\\\r\\n])*\\2(?=\\s*:)/m,lookbehind:!0,greedy:!0,alias:"property"}}),Prism.languages.insertBefore("javascript","operator",{"literal-property":{pattern:/((?:^|[,{])[ \\t]*)(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?=\\s*:)/m,lookbehind:!0,alias:"property"}}),Prism.languages.markup&&(Prism.languages.markup.tag.addInlined("script","javascript"),Prism.languages.markup.tag.addAttribute(/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,"javascript")),Prism.languages.js=Prism.languages.javascript},634:()=>{Prism.languages.clike={comment:[{pattern:/(^|[^\\\\])\\/\\*[\\s\\S]*?(?:\\*\\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\\\:])\\/\\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["\'])(?:\\\\(?:\\r\\n|[\\s\\S])|(?!\\1)[^\\\\\\r\\n])*\\1/,greedy:!0},"class-name":{pattern:/(\\b(?:class|extends|implements|instanceof|interface|new|trait)\\s+|\\bcatch\\s+\\()[\\w.\\\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\\\]/}},keyword:/\\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\\b/,boolean:/\\b(?:false|true)\\b/,function:/\\b\\w+(?=\\()/,number:/\\b0x[\\da-f]+\\b|(?:\\b\\d+(?:\\.\\d*)?|\\B\\.\\d+)(?:e[+-]?\\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\\+\\+?|&&?|\\|\\|?|[?*/~^%]/,punctuation:/[{}[\\];(),.:]/}},642:(e,t,n)=>{var a=function(e){\n/*ThouShaltNotCache*/\nvar t=/(?:^|\\s)lang(?:uage)?-([\\w-]+)(?=\\s|$)/i,n=0,a={},r={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function e(t){\n/*ThouShaltNotCache*/\nreturn t instanceof s?new s(t.type,e(t.content),t.alias):Array.isArray(t)?t.map(e):t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\\u00a0/g," ")},type:function(e){\n/*ThouShaltNotCache*/\nreturn Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){\n/*ThouShaltNotCache*/\nreturn e.__id||Object.defineProperty(e,"__id",{value:++n}),e.__id},clone:function e(t,n){var a,s;switch(\n/*ThouShaltNotCache*/\nn=n||{},r.util.type(t)){case"Object":if(s=r.util.objId(t),n[s])return n[s];for(var i in a={},n[s]=a,t)t.hasOwnProperty(i)&&(a[i]=e(t[i],n));return a;case"Array":return s=r.util.objId(t),n[s]?n[s]:(a=[],n[s]=a,t.forEach(function(t,r){\n/*ThouShaltNotCache*/\na[r]=e(t,n)}),a);default:return t}},getLanguage:function(e){\n/*ThouShaltNotCache*/\nfor(;e;){var n=t.exec(e.className);if(n)return n[1].toLowerCase();e=e.parentElement}return"none"},setLanguage:function(e,n){\n/*ThouShaltNotCache*/\ne.className=e.className.replace(RegExp(t,"gi"),""),e.classList.add("language-"+n)},currentScript:function(){\n/*ThouShaltNotCache*/\nif("undefined"==typeof document)return null;if(document.currentScript&&"SCRIPT"===document.currentScript.tagName)return document.currentScript;try{throw new Error}catch(a){var e=(/at [^(\\r\\n]*\\((.*):[^:]+:[^:]+\\)$/i.exec(a.stack)||[])[1];if(e){var t=document.getElementsByTagName("script");for(var n in t)if(t[n].src==e)return t[n]}return null}},isActive:function(e,t,n){for(\n/*ThouShaltNotCache*/\nvar a="no-"+t;e;){var r=e.classList;if(r.contains(t))return!0;if(r.contains(a))return!1;e=e.parentElement}return!!n}},languages:{plain:a,plaintext:a,text:a,txt:a,extend:function(e,t){\n/*ThouShaltNotCache*/\nvar n=r.util.clone(r.languages[e]);for(var a in t)n[a]=t[a];return n},insertBefore:function(e,t,n,a){var s=(\n/*ThouShaltNotCache*/\na=a||r.languages)[e],i={};for(var o in s)if(s.hasOwnProperty(o)){if(o==t)for(var l in n)n.hasOwnProperty(l)&&(i[l]=n[l]);n.hasOwnProperty(o)||(i[o]=s[o])}var u=a[e];return a[e]=i,r.languages.DFS(r.languages,function(t,n){\n/*ThouShaltNotCache*/\nn===u&&t!=e&&(this[t]=i)}),i},DFS:function e(t,n,a,s){\n/*ThouShaltNotCache*/\ns=s||{};var i=r.util.objId;for(var o in t)if(t.hasOwnProperty(o)){n.call(t,o,t[o],a||o);var l=t[o],u=r.util.type(l);"Object"!==u||s[i(l)]?"Array"!==u||s[i(l)]||(s[i(l)]=!0,e(l,n,o,s)):(s[i(l)]=!0,e(l,n,null,s))}}},plugins:{},highlightAll:function(e,t){\n/*ThouShaltNotCache*/\nr.highlightAllUnder(document,e,t)},highlightAllUnder:function(e,t,n){\n/*ThouShaltNotCache*/\nvar a={callback:n,container:e,selector:\'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code\'};r.hooks.run("before-highlightall",a),a.elements=Array.prototype.slice.apply(a.container.querySelectorAll(a.selector)),r.hooks.run("before-all-elements-highlight",a);for(var s,i=0;s=a.elements[i++];)r.highlightElement(s,!0===t,a.callback)},highlightElement:function(t,n,a){\n/*ThouShaltNotCache*/\nvar s=r.util.getLanguage(t),i=r.languages[s];r.util.setLanguage(t,s);var o=t.parentElement;o&&"pre"===o.nodeName.toLowerCase()&&r.util.setLanguage(o,s);var l={element:t,language:s,grammar:i,code:t.textContent};function u(e){\n/*ThouShaltNotCache*/\nl.highlightedCode=e,r.hooks.run("before-insert",l),l.element.innerHTML=l.highlightedCode,r.hooks.run("after-highlight",l),r.hooks.run("complete",l),a&&a.call(l.element)}if(r.hooks.run("before-sanity-check",l),(o=l.element.parentElement)&&"pre"===o.nodeName.toLowerCase()&&!o.hasAttribute("tabindex")&&o.setAttribute("tabindex","0"),!l.code)return r.hooks.run("complete",l),void(a&&a.call(l.element));if(r.hooks.run("before-highlight",l),l.grammar)if(n&&e.Worker){var c=new Worker(r.filename);c.onmessage=function(e){\n/*ThouShaltNotCache*/\nu(e.data)},c.postMessage(JSON.stringify({language:l.language,code:l.code,immediateClose:!0}))}else u(r.highlight(l.code,l.grammar,l.language));else u(r.util.encode(l.code))},highlight:function(e,t,n){\n/*ThouShaltNotCache*/\nvar a={code:e,grammar:t,language:n};if(r.hooks.run("before-tokenize",a),!a.grammar)throw new Error(\'The language "\'+a.language+\'" has no grammar.\');return a.tokens=r.tokenize(a.code,a.grammar),r.hooks.run("after-tokenize",a),s.stringify(r.util.encode(a.tokens),a.language)},tokenize:function(e,t){\n/*ThouShaltNotCache*/\nvar n=t.rest;if(n){for(var a in n)t[a]=n[a];delete t.rest}var r=new l;return u(r,r.head,e),o(e,r,t,r.head,0),function(e){\n/*ThouShaltNotCache*/\nvar t=[],n=e.head.next;for(;n!==e.tail;)t.push(n.value),n=n.next;return t}(r)},hooks:{all:{},add:function(e,t){\n/*ThouShaltNotCache*/\nvar n=r.hooks.all;n[e]=n[e]||[],n[e].push(t)},run:function(e,t){\n/*ThouShaltNotCache*/\nvar n=r.hooks.all[e];if(n&&n.length)for(var a,s=0;a=n[s++];)a(t)}},Token:s};function s(e,t,n,a){\n/*ThouShaltNotCache*/\nthis.type=e,this.content=t,this.alias=n,this.length=0|(a||"").length}function i(e,t,n,a){\n/*ThouShaltNotCache*/\ne.lastIndex=t;var r=e.exec(n);if(r&&a&&r[1]){var s=r[1].length;r.index+=s,r[0]=r[0].slice(s)}return r}function o(e,t,n,a,l,g){\n/*ThouShaltNotCache*/\nfor(var d in n)if(n.hasOwnProperty(d)&&n[d]){var p=n[d];p=Array.isArray(p)?p:[p];for(var m=0;m<p.length;++m){if(g&&g.cause==d+","+m)return;var b=p[m],f=b.inside,h=!!b.lookbehind,E=!!b.greedy,y=b.alias;if(E&&!b.pattern.global){var A=b.pattern.toString().match(/[imsuy]*$/)[0];b.pattern=RegExp(b.pattern.source,A+"g")}for(var F=b.pattern||b,k=a.next,S=l;k!==t.tail&&!(g&&S>=g.reach);S+=k.value.length,k=k.next){var T=k.value;if(t.length>e.length)return;if(!(T instanceof s)){var v,w=1;if(E){if(!(v=i(F,S,e,h))||v.index>=e.length)break;var x=v.index,I=v.index+v[0].length,R=S;for(R+=k.value.length;x>=R;)R+=(k=k.next).value.length;if(S=R-=k.value.length,k.value instanceof s)continue;for(var _=k;_!==t.tail&&(R<I||"string"==typeof _.value);_=_.next)w++,R+=_.value.length;w--,T=e.slice(S,R),v.index-=S}else if(!(v=i(F,0,T,h)))continue;x=v.index;var N=v[0],O=T.slice(0,x),L=T.slice(x+N.length),P=S+T.length;g&&P>g.reach&&(g.reach=P);var C=k.prev;if(O&&(C=u(t,C,O),S+=O.length),c(t,C,w),k=u(t,C,new s(d,f?r.tokenize(N,f):N,y,N)),L&&u(t,k,L),w>1){var $={cause:d+","+m,reach:P};o(e,t,n,k.prev,S,$),g&&$.reach>g.reach&&(g.reach=$.reach)}}}}}}function l(){\n/*ThouShaltNotCache*/\nvar e={value:null,prev:null,next:null},t={value:null,prev:e,next:null};e.next=t,this.head=e,this.tail=t,this.length=0}function u(e,t,n){\n/*ThouShaltNotCache*/\nvar a=t.next,r={value:n,prev:t,next:a};return t.next=r,a.prev=r,e.length++,r}function c(e,t,n){for(\n/*ThouShaltNotCache*/\nvar a=t.next,r=0;r<n&&a!==e.tail;r++)a=a.next;t.next=a,a.prev=t,e.length-=r}if(e.Prism=r,s.stringify=function e(t,n){\n/*ThouShaltNotCache*/\nif("string"==typeof t)return t;if(Array.isArray(t)){var a="";return t.forEach(function(t){\n/*ThouShaltNotCache*/\na+=e(t,n)}),a}var s={type:t.type,content:e(t.content,n),tag:"span",classes:["token",t.type],attributes:{},language:n},i=t.alias;i&&(Array.isArray(i)?Array.prototype.push.apply(s.classes,i):s.classes.push(i)),r.hooks.run("wrap",s);var o="";for(var l in s.attributes)o+=" "+l+\'="\'+(s.attributes[l]||"").replace(/"/g,"&quot;")+\'"\';return"<"+s.tag+\' class="\'+s.classes.join(" ")+\'"\'+o+">"+s.content+"</"+s.tag+">"},!e.document)return e.addEventListener?(r.disableWorkerMessageHandler||e.addEventListener("message",function(t){\n/*ThouShaltNotCache*/\nvar n=JSON.parse(t.data),a=n.language,s=n.code,i=n.immediateClose;e.postMessage(r.highlight(s,r.languages[a],a)),i&&e.close()},!1),r):r;var g=r.util.currentScript();function d(){\n/*ThouShaltNotCache*/\nr.manual||r.highlightAll()}if(g&&(r.filename=g.src,g.hasAttribute("data-manual")&&(r.manual=!0)),!r.manual){var p=document.readyState;"loading"===p||"interactive"===p&&g&&g.defer?document.addEventListener("DOMContentLoaded",d):window.requestAnimationFrame?window.requestAnimationFrame(d):window.setTimeout(d,16)}return r}("undefined"!=typeof window?window:"undefined"!=typeof WorkerGlobalScope&&self instanceof WorkerGlobalScope?self:{});e.exports&&(e.exports=a),void 0!==n.g&&(n.g.Prism=a),a.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\\s\\S])*?-->/,greedy:!0},prolog:{pattern:/<\\?[\\s\\S]+?\\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"\'[\\]]|"[^"]*"|\'[^\']*\')+(?:\\[(?:[^<"\'\\]]|"[^"]*"|\'[^\']*\'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\\]\\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\\[]*\\[)[\\s\\S]+(?=\\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|\'[^\']*\'/,greedy:!0},punctuation:/^<!|>$|[[\\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\\s<>\'"]+/}},cdata:{pattern:/<!\\[CDATA\\[[\\s\\S]*?\\]\\]>/i,greedy:!0},tag:{pattern:/<\\/?(?!\\d)[^\\s>\\/=$<%]+(?:\\s(?:\\s*[^\\s>\\/=]+(?:\\s*=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s\'">=]+(?=[\\s>]))|(?=[\\s/>])))+)?\\s*\\/?>/,greedy:!0,inside:{tag:{pattern:/^<\\/?[^\\s>\\/]+/,inside:{punctuation:/^<\\/?/,namespace:/^[^\\s>\\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s\'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:"attr-equals"},{pattern:/^(\\s*)["\']|["\']$/,lookbehind:!0}]}},punctuation:/\\/?>/,"attr-name":{pattern:/[^\\s>\\/]+/,inside:{namespace:/^[^\\s>\\/:]+:/}}}},entity:[{pattern:/&[\\da-z]{1,8};/i,alias:"named-entity"},/&#x?[\\da-f]{1,8};/i]},a.languages.markup.tag.inside["attr-value"].inside.entity=a.languages.markup.entity,a.languages.markup.doctype.inside["internal-subset"].inside=a.languages.markup,a.hooks.add("wrap",function(e){\n/*ThouShaltNotCache*/\n"entity"===e.type&&(e.attributes.title=e.content.replace(/&amp;/,"&"))}),Object.defineProperty(a.languages.markup.tag,"addInlined",{value:function(e,t){\n/*ThouShaltNotCache*/\nvar n={};n["language-"+t]={pattern:/(^<!\\[CDATA\\[)[\\s\\S]+?(?=\\]\\]>$)/i,lookbehind:!0,inside:a.languages[t]},n.cdata=/^<!\\[CDATA\\[|\\]\\]>$/i;var r={"included-cdata":{pattern:/<!\\[CDATA\\[[\\s\\S]*?\\]\\]>/i,inside:n}};r["language-"+t]={pattern:/[\\s\\S]+/,inside:a.languages[t]};var s={};s[e]={pattern:RegExp(/(<__[^>]*>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[\\s\\S])*?(?=<\\/__>)/.source.replace(/__/g,function(){\n/*ThouShaltNotCache*/\nreturn e}),"i"),lookbehind:!0,greedy:!0,inside:r},a.languages.insertBefore("markup","cdata",s)}}),Object.defineProperty(a.languages.markup.tag,"addAttribute",{value:function(e,t){\n/*ThouShaltNotCache*/\na.languages.markup.tag.inside["special-attr"].push({pattern:RegExp(/(^|["\'\\s])/.source+"(?:"+e+")"+/\\s*=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s\'">=]+(?=[\\s>]))/.source,"i"),lookbehind:!0,inside:{"attr-name":/^[^\\s=]+/,"attr-value":{pattern:/=[\\s\\S]+/,inside:{value:{pattern:/(^=\\s*(["\']|(?!["\'])))\\S[\\s\\S]*(?=\\2$)/,lookbehind:!0,alias:[t,"language-"+t],inside:a.languages[t]},punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|\'/]}}}})}}),a.languages.html=a.languages.markup,a.languages.mathml=a.languages.markup,a.languages.svg=a.languages.markup,a.languages.xml=a.languages.extend("markup",{}),a.languages.ssml=a.languages.xml,a.languages.atom=a.languages.xml,a.languages.rss=a.languages.xml,function(e){\n/*ThouShaltNotCache*/\nvar t=/(?:"(?:\\\\(?:\\r\\n|[\\s\\S])|[^"\\\\\\r\\n])*"|\'(?:\\\\(?:\\r\\n|[\\s\\S])|[^\'\\\\\\r\\n])*\')/;e.languages.css={comment:/\\/\\*[\\s\\S]*?\\*\\//,atrule:{pattern:RegExp("@[\\\\w-](?:"+/[^;{\\s"\']|\\s+(?!\\s)/.source+"|"+t.source+")*?"+/(?:;|(?=\\s*\\{))/.source),inside:{rule:/^@[\\w-]+/,"selector-function-argument":{pattern:/(\\bselector\\s*\\(\\s*(?![\\s)]))(?:[^()\\s]|\\s+(?![\\s)])|\\((?:[^()]|\\([^()]*\\))*\\))+(?=\\s*\\))/,lookbehind:!0,alias:"selector"},keyword:{pattern:/(^|[^\\w-])(?:and|not|only|or)(?![\\w-])/,lookbehind:!0}}},url:{pattern:RegExp("\\\\burl\\\\((?:"+t.source+"|"+/(?:[^\\\\\\r\\n()"\']|\\\\[\\s\\S])*/.source+")\\\\)","i"),greedy:!0,inside:{function:/^url/i,punctuation:/^\\(|\\)$/,string:{pattern:RegExp("^"+t.source+"$"),alias:"url"}}},selector:{pattern:RegExp("(^|[{}\\\\s])[^{}\\\\s](?:[^{};\\"\'\\\\s]|\\\\s+(?![\\\\s{])|"+t.source+")*(?=\\\\s*\\\\{)"),lookbehind:!0},string:{pattern:t,greedy:!0},property:{pattern:/(^|[^-\\w\\xA0-\\uFFFF])(?!\\s)[-_a-z\\xA0-\\uFFFF](?:(?!\\s)[-\\w\\xA0-\\uFFFF])*(?=\\s*:)/i,lookbehind:!0},important:/!important\\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\\()/i,lookbehind:!0},punctuation:/[(){};:,]/},e.languages.css.atrule.inside.rest=e.languages.css;var n=e.languages.markup;n&&(n.tag.addInlined("style","css"),n.tag.addAttribute("style","css"))}(a),a.languages.clike={comment:[{pattern:/(^|[^\\\\])\\/\\*[\\s\\S]*?(?:\\*\\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\\\:])\\/\\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["\'])(?:\\\\(?:\\r\\n|[\\s\\S])|(?!\\1)[^\\\\\\r\\n])*\\1/,greedy:!0},"class-name":{pattern:/(\\b(?:class|extends|implements|instanceof|interface|new|trait)\\s+|\\bcatch\\s+\\()[\\w.\\\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\\\]/}},keyword:/\\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\\b/,boolean:/\\b(?:false|true)\\b/,function:/\\b\\w+(?=\\()/,number:/\\b0x[\\da-f]+\\b|(?:\\b\\d+(?:\\.\\d*)?|\\B\\.\\d+)(?:e[+-]?\\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\\+\\+?|&&?|\\|\\|?|[?*/~^%]/,punctuation:/[{}[\\];(),.:]/},a.languages.javascript=a.languages.extend("clike",{"class-name":[a.languages.clike["class-name"],{pattern:/(^|[^$\\w\\xA0-\\uFFFF])(?!\\s)[_$A-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?=\\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\\})\\s*)catch\\b/,lookbehind:!0},{pattern:/(^|[^.]|\\.\\.\\.\\s*)\\b(?:as|assert(?=\\s*\\{)|async(?=\\s*(?:function\\b|\\(|[$\\w\\xA0-\\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\\s*(?:\\{|$))|for|from(?=\\s*(?:[\'"]|$))|function|(?:get|set)(?=\\s*(?:[#\\[$\\w\\xA0-\\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\\b/,lookbehind:!0}],function:/#?(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?=\\s*(?:\\.\\s*(?:apply|bind|call)\\s*)?\\()/,number:{pattern:RegExp(/(^|[^\\w$])/.source+"(?:"+/NaN|Infinity/.source+"|"+/0[bB][01]+(?:_[01]+)*n?/.source+"|"+/0[oO][0-7]+(?:_[0-7]+)*n?/.source+"|"+/0[xX][\\dA-Fa-f]+(?:_[\\dA-Fa-f]+)*n?/.source+"|"+/\\d+(?:_\\d+)*n/.source+"|"+/(?:\\d+(?:_\\d+)*(?:\\.(?:\\d+(?:_\\d+)*)?)?|\\.\\d+(?:_\\d+)*)(?:[Ee][+-]?\\d+(?:_\\d+)*)?/.source+")"+/(?![\\w$])/.source),lookbehind:!0},operator:/--|\\+\\+|\\*\\*=?|=>|&&=?|\\|\\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\\.{3}|\\?\\?=?|\\?\\.?|[~:]/}),a.languages.javascript["class-name"][0].pattern=/(\\b(?:class|extends|implements|instanceof|interface|new)\\s+)[\\w.\\\\]+/,a.languages.insertBefore("javascript","keyword",{regex:{pattern:RegExp(/((?:^|[^$\\w\\xA0-\\uFFFF."\'\\])\\s]|\\b(?:return|yield))\\s*)/.source+/\\//.source+"(?:"+/(?:\\[(?:[^\\]\\\\\\r\\n]|\\\\.)*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}/.source+"|"+/(?:\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.)*\\])*\\])*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source+")"+/(?=(?:\\s|\\/\\*(?:[^*]|\\*(?!\\/))*\\*\\/)*(?:$|[\\r\\n,.;:})\\]]|\\/\\/))/.source),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\\/)[\\s\\S]+(?=\\/[a-z]*$)/,lookbehind:!0,alias:"language-regex",inside:a.languages.regex},"regex-delimiter":/^\\/|\\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?=\\s*[=:]\\s*(?:async\\s*)?(?:\\bfunction\\b|(?:\\((?:[^()]|\\([^()]*\\))*\\)|(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*)\\s*=>))/,alias:"function"},parameter:[{pattern:/(function(?:\\s+(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*)?\\s*\\(\\s*)(?!\\s)(?:[^()\\s]|\\s+(?![\\s)])|\\([^()]*\\))+(?=\\s*\\))/,lookbehind:!0,inside:a.languages.javascript},{pattern:/(^|[^$\\w\\xA0-\\uFFFF])(?!\\s)[_$a-z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?=\\s*=>)/i,lookbehind:!0,inside:a.languages.javascript},{pattern:/(\\(\\s*)(?!\\s)(?:[^()\\s]|\\s+(?![\\s)])|\\([^()]*\\))+(?=\\s*\\)\\s*=>)/,lookbehind:!0,inside:a.languages.javascript},{pattern:/((?:\\b|\\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\\w\\xA0-\\uFFFF]))(?:(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*\\s*)\\(\\s*|\\]\\s*\\(\\s*)(?!\\s)(?:[^()\\s]|\\s+(?![\\s)])|\\([^()]*\\))+(?=\\s*\\)\\s*\\{)/,lookbehind:!0,inside:a.languages.javascript}],constant:/\\b[A-Z](?:[A-Z_]|\\dx?)*\\b/}),a.languages.insertBefore("javascript","string",{hashbang:{pattern:/^#!.*/,greedy:!0,alias:"comment"},"template-string":{pattern:/`(?:\\\\[\\s\\S]|\\$\\{(?:[^{}]|\\{(?:[^{}]|\\{[^}]*\\})*\\})+\\}|(?!\\$\\{)[^\\\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:"string"},interpolation:{pattern:/((?:^|[^\\\\])(?:\\\\{2})*)\\$\\{(?:[^{}]|\\{(?:[^{}]|\\{[^}]*\\})*\\})+\\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\\$\\{|\\}$/,alias:"punctuation"},rest:a.languages.javascript}},string:/[\\s\\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \\t]*)(["\'])(?:\\\\(?:\\r\\n|[\\s\\S])|(?!\\2)[^\\\\\\r\\n])*\\2(?=\\s*:)/m,lookbehind:!0,greedy:!0,alias:"property"}}),a.languages.insertBefore("javascript","operator",{"literal-property":{pattern:/((?:^|[,{])[ \\t]*)(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?=\\s*:)/m,lookbehind:!0,alias:"property"}}),a.languages.markup&&(a.languages.markup.tag.addInlined("script","javascript"),a.languages.markup.tag.addAttribute(/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,"javascript")),a.languages.js=a.languages.javascript,function(){\n/*ThouShaltNotCache*/\nif(void 0!==a&&"undefined"!=typeof document){Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector);var e={js:"javascript",py:"python",rb:"ruby",ps1:"powershell",psm1:"powershell",sh:"bash",bat:"batch",h:"c",tex:"latex"},t="data-src-status",n="loading",r="loaded",s="pre[data-src]:not(["+t+\'="\'+r+\'"]):not([\'+t+\'="\'+n+\'"])\';a.hooks.add("before-highlightall",function(e){\n/*ThouShaltNotCache*/\ne.selector+=", "+s}),a.hooks.add("before-sanity-check",function(i){\n/*ThouShaltNotCache*/\nvar o=i.element;if(o.matches(s)){i.code="",o.setAttribute(t,n);var l=o.appendChild(document.createElement("CODE"));l.textContent="Loading\\u2026";var u=o.getAttribute("data-src"),c=i.language;if("none"===c){var g=(/\\.(\\w+)$/.exec(u)||[,"none"])[1];c=e[g]||g}a.util.setLanguage(l,c),a.util.setLanguage(o,c);var d=a.plugins.autoloader;d&&d.loadLanguages(c),function(e,t,n){\n/*ThouShaltNotCache*/\nvar a=new XMLHttpRequest;a.open("GET",e,!0),a.onreadystatechange=function(){\n/*ThouShaltNotCache*/\n4==a.readyState&&(a.status<400&&a.responseText?t(a.responseText):a.status>=400?n("\\u2716 Error "+a.status+" while fetching file: "+a.statusText):n("\\u2716 Error: File does not exist or is empty"))},a.send(null)}(u,function(e){\n/*ThouShaltNotCache*/\no.setAttribute(t,r);var n=function(e){\n/*ThouShaltNotCache*/\nvar t=/^\\s*(\\d+)\\s*(?:(,)\\s*(?:(\\d+)\\s*)?)?$/.exec(e||"");if(t){var n=Number(t[1]),a=t[2],r=t[3];return a?r?[n,Number(r)]:[n,void 0]:[n,n]}}(o.getAttribute("data-range"));if(n){var s=e.split(/\\r\\n?|\\n/g),i=n[0],u=null==n[1]?s.length:n[1];i<0&&(i+=s.length),i=Math.max(0,Math.min(i-1,s.length)),u<0&&(u+=s.length),u=Math.max(0,Math.min(u,s.length)),e=s.slice(i,u).join("\\n"),o.hasAttribute("data-start")||o.setAttribute("data-start",String(i+1))}l.textContent=e,a.highlightElement(l)},function(e){\n/*ThouShaltNotCache*/\no.setAttribute(t,"failed"),l.textContent=e})}}),a.plugins.fileHighlight={highlight:function(e){for(\n/*ThouShaltNotCache*/\nvar t,n=(e||document).querySelectorAll(s),r=0;t=n[r++];)a.highlightElement(t)}};var i=!1;a.fileHighlight=function(){\n/*ThouShaltNotCache*/\ni||(console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."),i=!0),a.plugins.fileHighlight.highlight.apply(this,arguments)}}}()},648:()=>{Prism.languages.json={property:{pattern:/(^|[^\\\\])"(?:\\\\.|[^\\\\"\\r\\n])*"(?=\\s*:)/,lookbehind:!0,greedy:!0},string:{pattern:/(^|[^\\\\])"(?:\\\\.|[^\\\\"\\r\\n])*"(?!\\s*:)/,lookbehind:!0,greedy:!0},comment:{pattern:/\\/\\/.*|\\/\\*[\\s\\S]*?(?:\\*\\/|$)/,greedy:!0},number:/-?\\b\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?\\b/i,punctuation:/[{}[\\],]/,operator:/:/,boolean:/\\b(?:false|true)\\b/,null:{pattern:/\\bnull\\b/,alias:"keyword"}},Prism.languages.webmanifest=Prism.languages.json},694:()=>{Prism.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\\s\\S])*?-->/,greedy:!0},prolog:{pattern:/<\\?[\\s\\S]+?\\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"\'[\\]]|"[^"]*"|\'[^\']*\')+(?:\\[(?:[^<"\'\\]]|"[^"]*"|\'[^\']*\'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\\]\\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\\[]*\\[)[\\s\\S]+(?=\\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|\'[^\']*\'/,greedy:!0},punctuation:/^<!|>$|[[\\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\\s<>\'"]+/}},cdata:{pattern:/<!\\[CDATA\\[[\\s\\S]*?\\]\\]>/i,greedy:!0},tag:{pattern:/<\\/?(?!\\d)[^\\s>\\/=$<%]+(?:\\s(?:\\s*[^\\s>\\/=]+(?:\\s*=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s\'">=]+(?=[\\s>]))|(?=[\\s/>])))+)?\\s*\\/?>/,greedy:!0,inside:{tag:{pattern:/^<\\/?[^\\s>\\/]+/,inside:{punctuation:/^<\\/?/,namespace:/^[^\\s>\\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s\'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:"attr-equals"},{pattern:/^(\\s*)["\']|["\']$/,lookbehind:!0}]}},punctuation:/\\/?>/,"attr-name":{pattern:/[^\\s>\\/]+/,inside:{namespace:/^[^\\s>\\/:]+:/}}}},entity:[{pattern:/&[\\da-z]{1,8};/i,alias:"named-entity"},/&#x?[\\da-f]{1,8};/i]},Prism.languages.markup.tag.inside["attr-value"].inside.entity=Prism.languages.markup.entity,Prism.languages.markup.doctype.inside["internal-subset"].inside=Prism.languages.markup,Prism.hooks.add("wrap",function(e){\n/*ThouShaltNotCache*/\n"entity"===e.type&&(e.attributes.title=e.content.replace(/&amp;/,"&"))}),Object.defineProperty(Prism.languages.markup.tag,"addInlined",{value:function(e,t){\n/*ThouShaltNotCache*/\nvar n={};n["language-"+t]={pattern:/(^<!\\[CDATA\\[)[\\s\\S]+?(?=\\]\\]>$)/i,lookbehind:!0,inside:Prism.languages[t]},n.cdata=/^<!\\[CDATA\\[|\\]\\]>$/i;var a={"included-cdata":{pattern:/<!\\[CDATA\\[[\\s\\S]*?\\]\\]>/i,inside:n}};a["language-"+t]={pattern:/[\\s\\S]+/,inside:Prism.languages[t]};var r={};r[e]={pattern:RegExp(/(<__[^>]*>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[\\s\\S])*?(?=<\\/__>)/.source.replace(/__/g,function(){\n/*ThouShaltNotCache*/\nreturn e}),"i"),lookbehind:!0,greedy:!0,inside:a},Prism.languages.insertBefore("markup","cdata",r)}}),Object.defineProperty(Prism.languages.markup.tag,"addAttribute",{value:function(e,t){\n/*ThouShaltNotCache*/\nPrism.languages.markup.tag.inside["special-attr"].push({pattern:RegExp(/(^|["\'\\s])/.source+"(?:"+e+")"+/\\s*=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s\'">=]+(?=[\\s>]))/.source,"i"),lookbehind:!0,inside:{"attr-name":/^[^\\s=]+/,"attr-value":{pattern:/=[\\s\\S]+/,inside:{value:{pattern:/(^=\\s*(["\']|(?!["\'])))\\S[\\s\\S]*(?=\\2$)/,lookbehind:!0,alias:[t,"language-"+t],inside:Prism.languages[t]},punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|\'/]}}}})}}),Prism.languages.html=Prism.languages.markup,Prism.languages.mathml=Prism.languages.markup,Prism.languages.svg=Prism.languages.markup,Prism.languages.xml=Prism.languages.extend("markup",{}),Prism.languages.ssml=Prism.languages.xml,Prism.languages.atom=Prism.languages.xml,Prism.languages.rss=Prism.languages.xml},871:()=>{!function(e){\n/*ThouShaltNotCache*/\nvar t=/(?:"(?:\\\\(?:\\r\\n|[\\s\\S])|[^"\\\\\\r\\n])*"|\'(?:\\\\(?:\\r\\n|[\\s\\S])|[^\'\\\\\\r\\n])*\')/;e.languages.css={comment:/\\/\\*[\\s\\S]*?\\*\\//,atrule:{pattern:RegExp("@[\\\\w-](?:"+/[^;{\\s"\']|\\s+(?!\\s)/.source+"|"+t.source+")*?"+/(?:;|(?=\\s*\\{))/.source),inside:{rule:/^@[\\w-]+/,"selector-function-argument":{pattern:/(\\bselector\\s*\\(\\s*(?![\\s)]))(?:[^()\\s]|\\s+(?![\\s)])|\\((?:[^()]|\\([^()]*\\))*\\))+(?=\\s*\\))/,lookbehind:!0,alias:"selector"},keyword:{pattern:/(^|[^\\w-])(?:and|not|only|or)(?![\\w-])/,lookbehind:!0}}},url:{pattern:RegExp("\\\\burl\\\\((?:"+t.source+"|"+/(?:[^\\\\\\r\\n()"\']|\\\\[\\s\\S])*/.source+")\\\\)","i"),greedy:!0,inside:{function:/^url/i,punctuation:/^\\(|\\)$/,string:{pattern:RegExp("^"+t.source+"$"),alias:"url"}}},selector:{pattern:RegExp("(^|[{}\\\\s])[^{}\\\\s](?:[^{};\\"\'\\\\s]|\\\\s+(?![\\\\s{])|"+t.source+")*(?=\\\\s*\\\\{)"),lookbehind:!0},string:{pattern:t,greedy:!0},property:{pattern:/(^|[^-\\w\\xA0-\\uFFFF])(?!\\s)[-_a-z\\xA0-\\uFFFF](?:(?!\\s)[-\\w\\xA0-\\uFFFF])*(?=\\s*:)/i,lookbehind:!0},important:/!important\\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\\()/i,lookbehind:!0},punctuation:/[(){};:,]/},e.languages.css.atrule.inside.rest=e.languages.css;var n=e.languages.markup;n&&(n.tag.addInlined("style","css"),n.tag.addAttribute("style","css"))}(Prism)},893:()=>{!function(e){\n/*ThouShaltNotCache*/\nvar t=/\\b(?:alignas|alignof|asm|auto|bool|break|case|catch|char|char16_t|char32_t|char8_t|class|co_await|co_return|co_yield|compl|concept|const|const_cast|consteval|constexpr|constinit|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|final|float|for|friend|goto|if|import|inline|int|int16_t|int32_t|int64_t|int8_t|long|module|mutable|namespace|new|noexcept|nullptr|operator|override|private|protected|public|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|uint16_t|uint32_t|uint64_t|uint8_t|union|unsigned|using|virtual|void|volatile|wchar_t|while)\\b/,n=/\\b(?!<keyword>)\\w+(?:\\s*\\.\\s*\\w+)*\\b/.source.replace(/<keyword>/g,function(){\n/*ThouShaltNotCache*/\nreturn t.source});e.languages.cpp=e.languages.extend("c",{"class-name":[{pattern:RegExp(/(\\b(?:class|concept|enum|struct|typename)\\s+)(?!<keyword>)\\w+/.source.replace(/<keyword>/g,function(){\n/*ThouShaltNotCache*/\nreturn t.source})),lookbehind:!0},/\\b[A-Z]\\w*(?=\\s*::\\s*\\w+\\s*\\()/,/\\b[A-Z_]\\w*(?=\\s*::\\s*~\\w+\\s*\\()/i,/\\b\\w+(?=\\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>\\s*::\\s*\\w+\\s*\\()/],keyword:t,number:{pattern:/(?:\\b0b[01\']+|\\b0x(?:[\\da-f\']+(?:\\.[\\da-f\']*)?|\\.[\\da-f\']+)(?:p[+-]?[\\d\']+)?|(?:\\b[\\d\']+(?:\\.[\\d\']*)?|\\B\\.[\\d\']+)(?:e[+-]?[\\d\']+)?)[ful]{0,4}/i,greedy:!0},operator:/>>=?|<<=?|->|--|\\+\\+|&&|\\|\\||[?:~]|<=>|[-+*/%&|^!=<>]=?|\\b(?:and|and_eq|bitand|bitor|not|not_eq|or|or_eq|xor|xor_eq)\\b/,boolean:/\\b(?:false|true)\\b/}),e.languages.insertBefore("cpp","string",{module:{pattern:RegExp(/(\\b(?:import|module)\\s+)/.source+"(?:"+/"(?:\\\\(?:\\r\\n|[\\s\\S])|[^"\\\\\\r\\n])*"|<[^<>\\r\\n]*>/.source+"|"+/<mod-name>(?:\\s*:\\s*<mod-name>)?|:\\s*<mod-name>/.source.replace(/<mod-name>/g,function(){\n/*ThouShaltNotCache*/\nreturn n})+")"),lookbehind:!0,greedy:!0,inside:{string:/^[<"][\\s\\S]+/,operator:/:/,punctuation:/\\./}},"raw-string":{pattern:/R"([^()\\\\ ]{0,16})\\([\\s\\S]*?\\)\\1"/,alias:"string",greedy:!0}}),e.languages.insertBefore("cpp","keyword",{"generic-function":{pattern:/\\b(?!operator\\b)[a-z_]\\w*\\s*<(?:[^<>]|<[^<>]*>)*>(?=\\s*\\()/i,inside:{function:/^\\w+/,generic:{pattern:/<[\\s\\S]+/,alias:"class-name",inside:e.languages.cpp}}}}),e.languages.insertBefore("cpp","operator",{"double-colon":{pattern:/::/,alias:"punctuation"}}),e.languages.insertBefore("cpp","class-name",{"base-clause":{pattern:/(\\b(?:class|struct)\\s+\\w+\\s*:\\s*)[^;{}"\'\\s]+(?:\\s+[^;{}"\'\\s]+)*(?=\\s*[;{])/,lookbehind:!0,greedy:!0,inside:e.languages.extend("cpp",{})}}),e.languages.insertBefore("inside","double-colon",{"class-name":/\\b[a-z_]\\w*\\b(?!\\s*::)/i},e.languages.cpp["base-clause"])}(Prism)},973:()=>{!function(e){\n/*ThouShaltNotCache*/\ne.languages.typescript=e.languages.extend("javascript",{"class-name":{pattern:/(\\b(?:class|extends|implements|instanceof|interface|new|type)\\s+)(?!keyof\\b)(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?:\\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,lookbehind:!0,greedy:!0,inside:null},builtin:/\\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\\b/}),e.languages.typescript.keyword.push(/\\b(?:abstract|declare|is|keyof|readonly|require)\\b/,/\\b(?:asserts|infer|interface|module|namespace|type)\\b(?=\\s*(?:[{_$a-zA-Z\\xA0-\\uFFFF]|$))/,/\\btype\\b(?=\\s*(?:[\\{*]|$))/),delete e.languages.typescript.parameter,delete e.languages.typescript["literal-property"];var t=e.languages.extend("typescript",{});delete t["class-name"],e.languages.typescript["class-name"].inside=t,e.languages.insertBefore("typescript","function",{decorator:{pattern:/@[$\\w\\xA0-\\uFFFF]+/,inside:{at:{pattern:/^@/,alias:"operator"},function:/^[\\s\\S]+/}},"generic-function":{pattern:/#?(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*\\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\\s*\\()/,greedy:!0,inside:{function:/^#?(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*/,generic:{pattern:/<[\\s\\S]+/,alias:"class-name",inside:t}}}}),e.languages.ts=e.languages.typescript}(Prism)}},t={};function n(a){var r=t[a];if(void 0!==r)return r.exports;var s=t[a]={exports:{}};return e[a](s,s.exports,n),s.exports}n.d=(e,t)=>{for(var a in t)n.o(t,a)&&!n.o(e,a)&&Object.defineProperty(e,a,{enumerable:!0,get:t[a]})},n.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),n.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),n.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var a={};(()=>{"use strict";n.r(a),n.d(a,{runTest:()=>t});var e=n(642);n(694),n(871),n(634),n(613),n(421),n(893),n(19),n(648),n(244),n(44),n(973);function t(t){\n/*ThouShaltNotCache*/\nconst n=[];for(const{content:a,lang:r}of t){const t=e.highlight(a,e.languages[r],r);n.push({html:t})}return n}})(),PrismJSBenchmark=a})();\n//# sourceMappingURL=bundle.es6.min.js.map',
        SAMPLE_CPP: '#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nclass MyClass {\npublic:\n    MyClass(const std::string& name) : name_(name) {}\n\n    void printName() const {\n        std::cout << "Name: " << name_ << std::endl;\n    }\n\nprivate:\n    std::string name_;\n};\n\ntemplate<typename T>\nvoid printVector(const std::vector<T>& vec) {\n    for (const auto& item : vec) {\n        std::cout << item << " ";\n    }\n    std::cout << std::endl;\n}\n\nint main() {\n    std::cout << "Hello, C++ World!" << std::endl;\n\n    std::vector<int> numbers = {1, 2, 3, 4, 5};\n    printVector(numbers);\n\n    std::vector<std::string> strings = {"apple", "banana", "cherry"};\n    printVector(strings);\n\n    std::sort(strings.begin(), strings.end());\n    printVector(strings);\n\n    MyClass obj("Test Object");\n    obj.printName();\n\n    return 0;\n}\n',
        SAMPLE_CSS: '/* Large CSS file for testing */\n\nbody {\n    font-family: Arial, sans-serif;\n    line-height: 1.6;\n    color: #333;\n}\n\n.container {\n    width: 90%;\n    margin: 0 auto;\n    padding: 20px;\n}\n\n.header {\n    background: #f4f4f4;\n    padding: 1rem;\n    border-bottom: 1px solid #ddd;\n}\n\n.header h1 {\n    margin: 0;\n}\n\n.nav {\n    background: #333;\n    color: #fff;\n    padding: 0.5rem;\n}\n\n.nav ul {\n    padding: 0;\n    list-style: none;\n}\n\n.nav ul li {\n    display: inline;\n    margin-right: 20px;\n}\n\n.nav a {\n    color: #fff;\n    text-decoration: none;\n}\n\n.main {\n    padding: 1rem 0;\n}\n\n.footer {\n    background: #333;\n    color: #fff;\n    text-align: center;\n    padding: 1rem;\n    margin-top: 20px;\n}\n\n.btn {\n    display: inline-block;\n    background: #5cb85c;\n    color: #fff;\n    padding: 10px 20px;\n    border: none;\n    cursor: pointer;\n}\n\n.btn:hover {\n    background: #4cae4c;\n}\n\n.grid {\n    display: grid;\n    grid-template-columns: repeat(4, 1fr);\n    gap: 1rem;\n}\n\n.card {\n    border: 1px solid #ccc;\n    padding: 1rem;\n    box-shadow: 2px 2px 5px rgba(0,0,0,0.1);\n}\n\n.table {\n    width: 100%;\n    border-collapse: collapse;\n}\n\n.table th, .table td {\n    border: 1px solid #ddd;\n    padding: 8px;\n}\n\n.table th {\n    background-color: #f2f2f2;\n}\n\n.form-group {\n    margin-bottom: 15px;\n}\n\n.form-group label {\n    display: block;\n    margin-bottom: 5px;\n}\n\n.form-group input {\n    width: 100%;\n    padding: 8px;\n    border: 1px solid #ccc;\n}\n\n.alert {\n    padding: 15px;\n    margin-bottom: 20px;\n    border: 1px solid transparent;\n    border-radius: 4px;\n}\n\n.alert-success {\n    color: #3c763d;\n    background-color: #dff0d8;\n    border-color: #d6e9c6;\n}\n\n.alert-danger {\n    color: #a94442;\n    background-color: #f2dede;\n    border-color: #ebccd1;\n}\n',
        SAMPLE_HTML: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Large HTML Document</title>\n    <style>\n        body { font-family: sans-serif; }\n        .container { width: 80%; margin: 0 auto; }\n        .header { background: #333; color: #fff; padding: 1rem; }\n        .footer { background: #333; color: #fff; padding: 1rem; text-align: center; }\n        .main { padding: 1rem; }\n        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }\n        .card { border: 1px solid #ccc; padding: 1rem; }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <header class="header">\n            <h1>Large HTML Document for Testing</h1>\n        </header>\n        <main class="main">\n            <p>This is a large HTML document created for testing purposes. It contains a variety of elements to simulate a real-world web page.</p>\n            <div class="grid">\n                <div class="card"><h2>Card 1</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>\n                <div class="card"><h2>Card 2</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>\n                <div class="card"><h2>Card 3</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>\n                <div class="card"><h2>Card 4</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>\n                <div class="card"><h2>Card 5</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>\n                <div class="card"><h2>Card 6</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>\n                <div class="card"><h2>Card 7</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>\n                <div class="card"><h2>Card 8</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>\n                <div class="card"><h2>Card 9</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>\n            </div>\n            <section>\n                <h2>More Content</h2>\n                <p>Here is some more content to make the file larger.</p>\n                <ul>\n                    <li>List item 1</li>\n                    <li>List item 2</li>\n                    <li>List item 3</li>\n                    <li>List item 4</li>\n                    <li>List item 5</li>\n                    <li>List item 6</li>\n                    <li>List item 7</li>\n                    <li>List item 8</li>\n                    <li>List item 9</li>\n                    <li>List item 10</li>\n                </ul>\n                <p>Even more content...</p>\n                <pre><code>\nfunction helloWorld() {\n    console.log("Hello, world!");\n}\n                </code></pre>\n            </section>\n            <section>\n                <h2>And More...</h2>\n                <p>Adding more sections to increase the size of the document.</p>\n                <table>\n                    <thead>\n                        <tr>\n                            <th>Header 1</th>\n                            <th>Header 2</th>\n                            <th>Header 3</th>\n                        </tr>\n                    </thead>\n                    <tbody>\n                        <tr>\n                            <td>Data 1</td>\n                            <td>Data 2</td>\n                            <td>Data 3</td>\n                        </tr>\n                        <tr>\n                            <td>Data 4</td>\n                            <td>Data 5</td>\n                            <td>Data 6</td>\n                        </tr>\n                        <tr>\n                            <td>Data 7</td>\n                            <td>Data 8</td>\n                            <td>Data 9</td>\n                        </tr>\n                    </tbody>\n                </table>\n            </section>\n        </main>\n        <footer class="footer">\n            <p>&copy; 2025 Test Document</p>\n        </footer>\n    </div>\n</body>\n</html>\n',
        SAMPLE_JS: '// Large JavaScript file for testing\n\nfunction a() {\n    // Function a\n    let x = 10;\n    for (let i = 0; i < 100; i++) {\n        x += i;\n    }\n    return x;\n}\n\nfunction b() {\n    // Function b\n    let y = 20;\n    let z = a();\n    return y + z;\n}\n\nfunction c() {\n    // Function c\n    let arr = [];\n    for (let i = 0; i < 1000; i++) {\n        arr.push({\n            id: i,\n            value: Math.random()\n        });\n    }\n    return arr;\n}\n\nfunction d() {\n    // Function d\n    let obj = {};\n    for (let i = 0; i < 500; i++) {\n        obj[\'key\' + i] = \'value\' + i;\n    }\n    return obj;\n}\n\nfunction e() {\n    // Function e\n    let text = "This is a long string of text. ".repeat(100);\n    return text;\n}\n\nfunction f() {\n    // Function f\n    let result = 0;\n    for (let i = 0; i < 1000; i++) {\n        result += Math.sqrt(i);\n    }\n    return result;\n}\n\nfunction g() {\n    // Function g\n    let date = new Date();\n    return date.toString();\n}\n\nfunction h() {\n    // Function h\n    let regex = new RegExp(\'^[a-zA-Z0-9]*$\');\n    return regex.test(\'someTestString123\');\n}\n\nfunction i() {\n    // Function i\n    let promise = new Promise((resolve, reject) => {\n        setTimeout(() => {\n            resolve("Promise resolved after 1 second");\n        }, 1000);\n    });\n    return promise;\n}\n\nasync function j() {\n    // Function j\n    let result = await i();\n    console.log(result);\n}\n\nclass MyClass {\n    constructor() {\n        this.property1 = \'value1\';\n        this.property2 = 123;\n    }\n\n    method1() {\n        return this.property1;\n    }\n\n    method2() {\n        return this.property2;\n    }\n}\n\nconst instance = new MyClass();\n\nconsole.log(a());\nconsole.log(b());\nconsole.log(c());\nconsole.log(d());\nconsole.log(e());\nconsole.log(f());\nconsole.log(g());\nconsole.log(h());\nj();\nconsole.log(instance.method1());\nconsole.log(instance.method2());\n',
        SAMPLE_JSON: '{\n  "name": "prismjs-benchmark",\n  "version": "1.0.0",\n  "description": "A benchmark for Prism.js",\n  "main": "index.js",\n  "scripts": {\n    "test": "echo \\"Error: no test specified\\" && exit 1"\n  },\n  "keywords": [\n    "prism",\n    "benchmark"\n  ],\n  "author": "",\n  "license": "ISC"\n}',
        SAMPLE_MD: '# Markdown Sample\n\nThis is a sample Markdown file for testing Prism.js highlighting.\n\n## Code Block\n\n```javascript\nfunction hello() {\n  console.log("Hello, World!");\n}\n```\n\n## List\n\n- Item 1\n- Item 2\n- Item 3\n',
        SAMPLE_SQL: "-- SQL Sample\nSELECT\n    id,\n    name,\n    email\nFROM\n    users\nWHERE\n    age > 25\nORDER BY\n    name;\n\nINSERT INTO products (name, price)\nVALUES ('New Product', 99.99);\n",
        SAMPLE_TS: '// TypeScript Sample\ninterface Person {\n    firstName: string;\n    lastName: string;\n}\n\nfunction greeter(person: Person): string {\n    return "Hello, " + person.firstName + " " + person.lastName;\n}\n\nlet user: Person = { firstName: "Jane", lastName: "User" };\n\nconsole.log(greeter(user));\n\nclass Student {\n    fullName: string;\n    constructor(public firstName: string, public middleInitial: string, public lastName: string) {\n        this.fullName = firstName + " " + middleInitial + " " + lastName;\n    }\n}\n\nlet student = new Student("John", "Q.", "Public");\nconsole.log("Student:", student.fullName);\n'
});

// --- JetStreamExtra/prismjs/globals.js ---

var PrismJSBenchmark;

// --- JetStreamExtra/utils/StartupBenchmark.js ---

/*
 * Copyright (C) 2025 Apple Inc. All rights reserved.
 * Copyright 2025 Google LLC
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

const CACHE_BUST_COMMENT = "/*ThouShaltNotCache*/";
const CACHE_BUST_COMMENT_RE = new RegExp(
  `\n${RegExp.escape(CACHE_BUST_COMMENT)}\n`,
  "g"
);

class StartupBenchmark {
  // Total iterations for this benchmark.
  #iterationCount = 0;
  // Original source code.
  #sourceCode;
  // quickHahs(this.#sourceCode) for use in custom validate() methods.
  #sourceHash = 0;
  // Number of no-cache comments in the original #sourceCode.
  #expectedCacheCommentCount = 0;
  // How many times (separate iterations) should we reuse the source code.
  // Use 0 to skip and only use a single #sourceCode string.
  #sourceCodeReuseCount = 1;
  // #sourceCode for each iteration, number of unique sources is controlled
  // by codeReuseCount;
  #iterationSourceCodes = [];

  constructor({
    iterationCount,
    expectedCacheCommentCount,
    sourceCodeReuseCount = 1,
  } = {}) {
    console.assert(
      iterationCount > 0,
      `Expected iterationCount to be positive, but got ${iterationCount}`
    );
    this.#iterationCount = iterationCount;
    console.assert(
      expectedCacheCommentCount > 0,
      `Expected expectedCacheCommentCount to be positive, but got ${expectedCacheCommentCount}`
    );
    this.#expectedCacheCommentCount = expectedCacheCommentCount;
    console.assert(
      sourceCodeReuseCount >= 0,
      `Expected sourceCodeReuseCount to be non-negative, but got ${sourceCodeReuseCount}`
    );
    this.#sourceCodeReuseCount = sourceCodeReuseCount;
  }

  get iterationCount() {
    return this.#iterationCount;
  }

  get sourceCode() {
    return this.#sourceCode;
  }

  get sourceHash() {
    return this.#sourceHash;
  }

  get expectedCacheCommentCount() {
    return this.#expectedCacheCommentCount;
  }

  get sourceCodeReuseCount() {
    return this.#sourceCodeReuseCount;
  }

  get iterationSourceCodes() {
    return this.#iterationSourceCodes;
  }

  async init() {
    if (!JetStream.preload.BUNDLE) {
      throw new Error("Missing JetStream.preload.BUNDLE");
    }
    this.#sourceCode = await JetStream.getString(JetStream.preload.BUNDLE);
    if (!this.sourceCode || !this.sourceCode.length) {
      throw new Error("Couldn't load JetStream.preload.BUNDLE");
    }

    const cacheCommentCount = this.sourceCode.match(
      CACHE_BUST_COMMENT_RE
    ).length;
    this.#sourceHash = this.quickHash(this.sourceCode);
    this.validateSourceCacheComments(cacheCommentCount);
    for (let i = 0; i < this.iterationCount; i++)
      this.#iterationSourceCodes[i] = this.createIterationSourceCode(i);
    this.validateIterationSourceCodes();
  }

  validateSourceCacheComments(cacheCommentCount) {
    console.assert(
      cacheCommentCount === this.expectedCacheCommentCount,
      `Invalid cache comment count ${cacheCommentCount} expected ${this.expectedCacheCommentCount}.`
    );
  }

  validateIterationSourceCodes() {
    if (this.#iterationSourceCodes.some((each) => !each?.length))
      throw new Error(`Got invalid iterationSourceCodes`);
    let expectedSize = 1;
    if (this.sourceCodeReuseCount !== 0)
      expectedSize = Math.ceil(this.iterationCount / this.sourceCodeReuseCount);
    const uniqueSources = new Set(this.iterationSourceCodes);
    if (uniqueSources.size != expectedSize)
      throw new Error(
        `Expected ${expectedSize} unique sources, but got ${uniqueSources.size}.`
      );
  }

  createIterationSourceCode(iteration) {
    // Alter the code per iteration to prevent caching.
    const cacheId =
      Math.floor(iteration / this.sourceCodeReuseCount) *
      this.sourceCodeReuseCount;
    // Reuse existing sources if this.codeReuseCount > 1:
    if (cacheId < this.iterationSourceCodes.length)
      return this.iterationSourceCodes[cacheId];

    const sourceCode = this.sourceCode.replaceAll(
      CACHE_BUST_COMMENT_RE,
      `/*${cacheId}*/`
    );
    // Warm up quickHash.
    this.quickHash(sourceCode);
    return sourceCode;
  }

  quickHash(str) {
    let hash = 5381;
    let i = str.length;
    while (i > 0) {
      hash = (hash * 33) ^ (str.charCodeAt(i) | 0);
      i -= 919;
    }
    return hash | 0;
  }
}

// --- JetStreamExtra/prismjs/benchmark.js ---

/*
 * Copyright (C) 2025 Apple Inc. All rights reserved.
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

const EXPECTED_ASSERTION_COUNT = 1213680;

class Benchmark extends StartupBenchmark {
  lastResult;
  totalHash = 0xdeadbeef;
  samples = [];

  constructor({iterationCount}) {
    super({
      iterationCount,
      expectedCacheCommentCount: 71,
      sourceCodeReuseCount: 1,
    });
  }

  async init() {
    await Promise.all([
      super.init(),
      this.loadData("cpp", JetStream.preload.SAMPLE_CPP, -1086372285),
      this.loadData("css", JetStream.preload.SAMPLE_CSS, 1173668337),
      this.loadData("markup", JetStream.preload.SAMPLE_HTML, -270772291),
      this.loadData("js", JetStream.preload.SAMPLE_JS, -838545229),
      this.loadData("markdown", JetStream.preload.SAMPLE_MD, 5859883),
      this.loadData("sql", JetStream.preload.SAMPLE_SQL, 5859941),
      this.loadData("json", JetStream.preload.SAMPLE_JSON, 5859883),
      this.loadData("typescript", JetStream.preload.SAMPLE_TS, 133251625),
    ]);
  }

  async loadData(lang, file, hash) {
    const sample = { lang, hash };
    // Push eagerly to have deterministic order.
    this.samples.push(sample);
    sample.content = await JetStream.getString(file);
    // Warm up quickHash and force good string representation.
    this.quickHash(sample.content);
    console.assert(sample.content.length > 0);
  }

  runIteration(iteration) {
    // Module is loaded into PrismJSBenchmark
    let PrismJSBenchmark;
    eval(this.iterationSourceCodes[iteration]);
    this.lastResult = PrismJSBenchmark.runTest(this.samples);

    for (const result of this.lastResult) {
      result.hash = this.quickHash(result.html);
      this.totalHash ^= result.hash;
    }
  }

  validate() {
    console.assert(this.lastResult.length == this.samples.length);
    for (let i = 0; i < this.samples.length; i++) {
      const sample = this.samples[i];
      const result = this.lastResult[i];
      console.assert(result.html.length > 0);
      console.assert(
        result.hash == sample.hash,
        `Invalid result.hash = ${result.hash}, expected ${sample.hash}`
      );
    }
  }
}
JetStreamExtra_runWithArguments({
    BenchmarkCtor: Benchmark,
    constructorArguments: { iterationCount: 50 },
    iterations: 50,
}).catch(JetStreamExtra_fail);
