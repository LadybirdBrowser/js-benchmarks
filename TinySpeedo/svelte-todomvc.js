// Speedometer 3 "TodoMVC-Svelte-Complex-DOM" JavaScript: the SP3 dist bundle(s) of todomvc/architecture-examples/svelte
var ROUNDS = 100;
// (verbatim) running against a plain-object DOM, driven by the SP3 TodoMVC steps.
// ---- begin parts:prelude.js ----
// Shell portability + determinism shared by every program.
var log = typeof console === "object" && console.log ? console.log : print;
(function () {
    var seed = 0x2545f491;
    Math.random = function () {
        // xorshift32, deterministic across engines.
        seed ^= seed << 13; seed >>>= 0;
        seed ^= seed >>> 17;
        seed ^= seed << 5; seed >>>= 0;
        return seed / 4294967296;
    };
})();
var __checksum = 0;
function mix(v) {
    // Order-sensitive 31-bit checksum of numbers and strings (strings: length + 3 sampled chars).
    if (typeof v === "string") {
        var n = v.length;
        v = n * 31 + (n ? v.charCodeAt(0) * 7 + v.charCodeAt(n >> 1) * 13 + v.charCodeAt(n - 1) : 0);
    } else if (typeof v === "boolean") {
        v = v ? 1 : 2;
    } else if (typeof v === "number") {
        if (v !== (v | 0)) v = Math.round(v * 1024) | 0;
    } else {
        v = 3;
    }
    __checksum = (Math.imul(__checksum, 16777619) ^ (v | 0)) >>> 0;
}
// Deterministic clock: every Date.now() call advances by 1 ms.
(function () {
    var now = 1700000000000;
    Date.now = function () { return ++now; };
})();
// ---- end parts:prelude.js ----
// ---- begin parts:fakedom.js ----
// Minimal plain-object DOM stand-in (no layout, no selectors beyond trivial ones). Tree links
// are plain data properties maintained on mutation so that the stand-in itself stays cheap.
// EventTarget base (Node.prototype inherits from it, like in browsers, so that libraries that
// patch EventTarget.prototype, e.g. zone.js, see every node).
function FakeEventTarget() { this._listeners = null; }
function FakeNode(nodeType, nodeName) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.tagName = nodeType === 1 ? nodeName : undefined;
    this.localName = nodeType === 1 ? nodeName.toLowerCase() : undefined;
    this.namespaceURI = "http://www.w3.org/1999/xhtml";
    this.parentNode = null;
    this.firstChild = null;
    this.lastChild = null;
    this.nextSibling = null;
    this.previousSibling = null;
    this.ownerDocument = null;
    this.nodeValue = null;
    this._attrs = null;
    this._listeners = null;
    this._classList = null;
    this.shadowRoot = null;
    this.style = null;
    this.className = "";
    this.id = "";
    this.clientWidth = 0;
    this.clientHeight = 0;
    this._value = "";
    this._checked = false;
}
FakeNode.prototype = Object.create(FakeEventTarget.prototype);
FakeNode.prototype.constructor = FakeNode;
Object.defineProperty(FakeNode.prototype, "value", {
    get: function () { return this._value; },
    set: function (v) { this._value = v == null ? "" : "" + v; },
    configurable: true,
});
Object.defineProperty(FakeNode.prototype, "checked", {
    get: function () { return this._checked; },
    set: function (v) { this._checked = !!v; },
    configurable: true,
});
Object.defineProperty(FakeNode.prototype, "type", {
    get: function () { return this.getAttribute("type") || (this.nodeName === "INPUT" ? "text" : ""); },
    set: function (v) { this.setAttribute("type", v); },
    configurable: true,
});
["onabort", "onblur", "onchange", "onclick", "oncontextmenu", "ondblclick", "onfocus", "onfocusin",
 "onfocusout", "oninput", "onkeydown", "onkeypress", "onkeyup", "onmousedown", "onmousemove",
 "onmouseout", "onmouseover", "onmouseup", "onscroll", "onselect", "onsubmit", "onwheel",
 "ontouchstart", "onpointerdown", "onanimationend", "ontransitionend"].forEach(function (k) {
    FakeNode.prototype[k] = null;
});
FakeNode.prototype.ELEMENT_NODE = 1;
FakeNode.prototype.TEXT_NODE = 3;
FakeNode.prototype.COMMENT_NODE = 8;
FakeNode.prototype.DOCUMENT_NODE = 9;
FakeNode.prototype.DOCUMENT_FRAGMENT_NODE = 11;
Object.defineProperty(FakeNode.prototype, "data", {
    get: function () { return this.nodeValue; },
    set: function (v) { this.nodeValue = "" + v; },
});
function FakeClassList(el) { this._el = el; }
FakeClassList.prototype.contains = function (c) {
    return (" " + this._el.className + " ").indexOf(" " + c + " ") !== -1;
};
FakeClassList.prototype.add = function () {
    for (var i = 0; i < arguments.length; ++i) {
        var c = arguments[i];
        if (!this.contains(c)) this._el.className = this._el.className ? this._el.className + " " + c : c;
    }
};
FakeClassList.prototype.remove = function () {
    for (var i = 0; i < arguments.length; ++i) {
        var c = arguments[i];
        if (this.contains(c)) this._el.className = (" " + this._el.className + " ").replace(" " + c + " ", " ").trim();
    }
};
FakeClassList.prototype.toggle = function (c, force) {
    var want = force === undefined ? !this.contains(c) : !!force;
    if (want) this.add(c); else this.remove(c);
    return want;
};
Object.defineProperty(FakeNode.prototype, "classList", {
    get: function () { return this._classList || (this._classList = new FakeClassList(this)); },
});
Object.defineProperty(FakeNode.prototype, "attributes", {
    get: function () {
        var list = [];
        if (this.id) list.push({ name: "id", value: this.id, specified: true });
        if (this.className) list.push({ name: "class", value: this.className, specified: true });
        if (this._attrs) for (var k in this._attrs) if (k !== "class" && k !== "id") list.push({ name: k, value: this._attrs[k], specified: true });
        return list;
    },
});
// HTMLAnchorElement URL decomposition (AngularJS resolves URLs through an <a> element).
Object.defineProperty(FakeNode.prototype, "href", {
    get: function () { var h = this.getAttribute("href"); return h === null ? "" : new FakeURL(h).href; },
    set: function (v) { this.setAttribute("href", v); },
});
["protocol", "host", "hostname", "port", "pathname", "search", "hash"].forEach(function (k) {
    Object.defineProperty(FakeNode.prototype, k, {
        get: function () { var h = this.getAttribute("href"); return h === null ? "" : new FakeURL(h)[k]; },
    });
});
// dataset: a snapshot of data-* attributes (writes are not reflected back).
Object.defineProperty(FakeNode.prototype, "dataset", {
    get: function () {
        var d = {};
        if (this._attrs) for (var k in this._attrs) {
            if (k.indexOf("data-") === 0)
                d[k.slice(5).replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); })] = this._attrs[k];
        }
        return d;
    },
});
Object.defineProperty(FakeNode.prototype, "isConnected", {
    get: function () {
        var n = this;
        for (;;) {
            if (n.parentNode) n = n.parentNode;
            else if (n.nodeType === 11 && n.host) n = n.host;
            else return n.nodeType === 9;
        }
    },
});
Object.defineProperty(FakeNode.prototype, "form", {
    get: function () { return this.parentNode ? this.parentNode.closest("form") : null; },
});
Object.defineProperty(FakeNode.prototype, "parentElement", {
    get: function () { var p = this.parentNode; return p && p.nodeType === 1 ? p : null; },
});
Object.defineProperty(FakeNode.prototype, "childNodes", {
    get: function () {
        var list = [];
        for (var c = this.firstChild; c; c = c.nextSibling) list.push(c);
        return list;
    },
});
Object.defineProperty(FakeNode.prototype, "children", {
    get: function () {
        var list = [];
        for (var c = this.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) list.push(c);
        return list;
    },
});
Object.defineProperty(FakeNode.prototype, "textContent", {
    get: function () {
        if (this.nodeType === 3 || this.nodeType === 8) return this.nodeValue;
        var s = "";
        for (var c = this.firstChild; c; c = c.nextSibling) s += c.textContent;
        return s;
    },
    set: function (v) {
        if (this.nodeType === 3 || this.nodeType === 8) { this.nodeValue = "" + v; return; }
        while (this.firstChild) this.removeChild(this.firstChild);
        if (v !== "" && v != null) this.appendChild(this.ownerDocument.createTextNode("" + v));
    },
});
Object.defineProperty(FakeNode.prototype, "innerHTML", {
    get: function () {
        var s = "";
        for (var c = this.firstChild; c; c = c.nextSibling) s += fakeSerialize(c);
        return s;
    },
    set: function (v) {
        while (this.firstChild) this.removeChild(this.firstChild);
        fakeParseHTML(this, "" + v);
    },
});
Object.defineProperty(FakeNode.prototype, "outerHTML", {
    get: function () { return fakeSerialize(this); },
});
var fakeVoidElements = { AREA: 1, BR: 1, COL: 1, EMBED: 1, HR: 1, IMG: 1, INPUT: 1, LINK: 1, META: 1, SOURCE: 1, TRACK: 1, WBR: 1 };
function fakeDecode(s) {
    if (s.indexOf("&") === -1) return s;
    return s.replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, function (m, e) {
        return e === "amp" ? "&" : e === "lt" ? "<" : e === "gt" ? ">" : e === "quot" ? '"' : e === "nbsp" ? "\u00a0" : "'";
    });
}
function fakeEscape(s, attr) {
    s = ("" + s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return attr ? s.replace(/"/g, "&quot;") : s;
}
// Tiny HTML parser (tags, attributes, text, comments, void elements; no implied end tags).
function fakeParseHTML(parent, html) {
    var doc = parent.ownerDocument || parent;
    if (parent.nodeName === "TEMPLATE") parent = parent.content;
    var re = /<!--([\s\S]*?)-->|<(\?[^>]*)>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s\/>"'=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+|<)/g;
    var attrRe = /([^\s\/>"'=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    var stack = [parent], names = ["#root"], cur = parent, m;
    while ((m = re.exec(html))) {
        if (m[1] !== undefined || m[2] !== undefined) {
            cur.appendChild(doc.createComment(m[1] !== undefined ? m[1] : m[2]));
        } else if (m[3] !== undefined) {
            var tag = m[3].toUpperCase();
            for (var k = names.length - 1; k > 0; --k) {
                if (names[k] === tag) {
                    stack.length = names.length = k;
                    cur = stack[k - 1];
                    break;
                }
            }
        } else if (m[4] !== undefined) {
            var el = doc.createElement(m[4]);
            if (m[5]) {
                var a;
                attrRe.lastIndex = 0;
                while ((a = attrRe.exec(m[5]))) {
                    var v = a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : "";
                    var an = a[1].toLowerCase();
                    v = fakeDecode(v);
                    el.setAttribute(an, v);
                    if (an === "value") el._value = v;
                    else if (an === "checked") el._checked = true;
                }
            }
            cur.appendChild(el);
            if (el.nodeName === "SCRIPT" || el.nodeName === "STYLE" || el.nodeName === "TEXTAREA") {
                // Raw text elements: everything up to the end tag is one text node.
                var endTag = "</" + m[4].toLowerCase(), end = html.toLowerCase().indexOf(endTag, re.lastIndex);
                if (end === -1) end = html.length;
                if (end > re.lastIndex) el.appendChild(doc.createTextNode(html.slice(re.lastIndex, end)));
                var close = html.indexOf(">", end);
                re.lastIndex = close === -1 ? html.length : close + 1;
            } else if (!m[6] && !fakeVoidElements[el.nodeName]) {
                cur = el.nodeName === "TEMPLATE" ? el.content : el;
                stack.push(cur);
                names.push(el.nodeName);
            }
        } else {
            cur.appendChild(doc.createTextNode(fakeDecode(m[7])));
        }
    }
}
function fakeSerialize(n) {
    if (n.nodeType === 3) {
        var p = n.parentNode;
        return p && (p.nodeName === "SCRIPT" || p.nodeName === "STYLE") ? n.nodeValue : fakeEscape(n.nodeValue, false);
    }
    if (n.nodeType === 8) return "<!--" + n.nodeValue + "-->";
    var tag = n.localName, s = "<" + tag;
    if (n.id) s += ' id="' + fakeEscape(n.id, true) + '"';
    if (n.className) s += ' class="' + fakeEscape(n.className, true) + '"';
    if (n._attrs) for (var k in n._attrs) if (k !== "class" && k !== "id") s += " " + k + '="' + fakeEscape(n._attrs[k], true) + '"';
    s += ">";
    if (fakeVoidElements[n.nodeName]) return s;
    for (var c = n.firstChild; c; c = c.nextSibling) s += fakeSerialize(c);
    return s + "</" + tag + ">";
}
FakeNode.prototype._unlink = function (child) {
    if (fakeCustomElementsActive && this.isConnected) fakeCallbackSubtree(child, "disconnectedCallback");
    var prev = child.previousSibling, next = child.nextSibling;
    if (prev) prev.nextSibling = next; else this.firstChild = next;
    if (next) next.previousSibling = prev; else this.lastChild = prev;
    child.parentNode = null;
    child.previousSibling = null;
    child.nextSibling = null;
};
FakeNode.prototype.insertBefore = function (child, ref) {
    if (ref === undefined) ref = null;
    if (child.nodeType === 11) {
        while (child.firstChild) this.insertBefore(child.firstChild, ref);
        return child;
    }
    if (child.parentNode) child.parentNode._unlink(child);
    child.parentNode = this;
    if (ref === null) {
        child.previousSibling = this.lastChild;
        child.nextSibling = null;
        if (this.lastChild) this.lastChild.nextSibling = child; else this.firstChild = child;
        this.lastChild = child;
    } else {
        var prev = ref.previousSibling;
        child.previousSibling = prev;
        child.nextSibling = ref;
        ref.previousSibling = child;
        if (prev) prev.nextSibling = child; else this.firstChild = child;
    }
    if (fakeCustomElementsActive && this.isConnected) fakeCallbackSubtree(child, "connectedCallback");
    return child;
};
FakeNode.prototype.appendChild = function (child) { return this.insertBefore(child, null); };
FakeNode.prototype.append = function () {
    for (var i = 0; i < arguments.length; ++i) {
        var c = arguments[i];
        this.appendChild(typeof c === "object" ? c : this.ownerDocument.createTextNode("" + c));
    }
};
FakeNode.prototype.removeChild = function (child) { this._unlink(child); return child; };
FakeNode.prototype.remove = function () { if (this.parentNode) this.parentNode._unlink(this); };
FakeNode.prototype.replaceChild = function (newChild, oldChild) {
    this.insertBefore(newChild, oldChild);
    this._unlink(oldChild);
    return oldChild;
};
FakeNode.prototype.replaceData = function (offset, count, data) {
    var v = this.nodeValue;
    this.nodeValue = v.slice(0, offset) + data + v.slice(offset + count);
};
FakeNode.prototype.appendData = function (data) { this.nodeValue += data; };
FakeNode.prototype.replaceChildren = function () {
    while (this.firstChild) this.removeChild(this.firstChild);
    for (var i = 0; i < arguments.length; ++i) this.appendChild(arguments[i]);
};
FakeNode.prototype.attachShadow = function (init) {
    var root = new FakeNode(11, "#document-fragment");
    root.ownerDocument = this.ownerDocument;
    Object.defineProperty(root, "host", { value: this, writable: true });
    root.mode = init && init.mode;
    root.adoptedStyleSheets = [];
    root.toString = function () { return "[object ShadowRoot]"; };
    this.shadowRoot = root;
    return root;
};
FakeNode.prototype.hasAttributes = function () { return this.attributes.length > 0; };
FakeNode.prototype.getAttributeNames = function () {
    return this.attributes.map(function (a) { return a.name; });
};
FakeNode.prototype.getRootNode = function () {
    var n = this;
    while (n.parentNode) n = n.parentNode;
    return n;
};
FakeNode.prototype.hasChildNodes = function () { return this.firstChild !== null; };
FakeNode.prototype.contains = function (n) {
    for (; n; n = n.parentNode) if (n === this) return true;
    return false;
};
FakeNode.prototype.setAttribute = function (name, value) {
    if (fakeCustomElementsActive && this.attributeChangedCallback) fakeAttributeChanged(this, name, "" + value);
    if (!this._attrs) this._attrs = {};
    this._attrs[name] = "" + value;
    if (name === "class") this.className = "" + value;
    else if (name === "id") this.id = "" + value;
};
FakeNode.prototype.setAttributeNS = function (ns, name, value) { this.setAttribute(name, value); };
FakeNode.prototype.getAttribute = function (name) {
    if (name === "class") return this.className;
    if (name === "id") return this.id || null;
    var a = this._attrs;
    return a && Object.prototype.hasOwnProperty.call(a, name) ? a[name] : null;
};
FakeNode.prototype.hasAttribute = function (name) { return this.getAttribute(name) !== null; };
FakeNode.prototype.removeAttribute = function (name) {
    if (fakeCustomElementsActive && this.attributeChangedCallback && this.hasAttribute(name)) fakeAttributeChanged(this, name, null);
    if (this._attrs) delete this._attrs[name];
    if (name === "class") this.className = "";
};
FakeNode.prototype.removeAttributeNS = function (ns, name) { this.removeAttribute(name); };
FakeEventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (!this._listeners) this._listeners = {};
    var capture = opts === true || (opts && opts.capture) ? 1 : 0;
    var list = this._listeners[type] || (this._listeners[type] = []);
    list.push({ fn: fn, capture: capture });
};
FakeEventTarget.prototype.removeEventListener = function (type, fn) {
    var list = this._listeners && this._listeners[type];
    if (!list) return;
    for (var i = 0; i < list.length; ++i) {
        if (list[i].fn === fn) { list.splice(i, 1); return; }
    }
};
FakeEventTarget.prototype._fire = function (event, capture) {
    var list = this._listeners && this._listeners[event.type];
    if (list) {
        list = list.slice();
        for (var i = 0; i < list.length && !event._stopImmediate; ++i) {
            if (list[i].capture !== capture) continue;
            event.currentTarget = this;
            var fn = list[i].fn;
            if (typeof fn === "function") fn.call(this, event); else fn.handleEvent(event);
        }
    }
    if (!capture && !event._stopImmediate) {
        // Event handler IDL attributes (element.onclick = fn).
        var handler = this["on" + event.type];
        if (typeof handler === "function") {
            event.currentTarget = this;
            if (handler.call(this, event) === false) event.preventDefault();
        }
    }
};
FakeEventTarget.prototype.dispatchEvent = function (event) {
    if (!(this instanceof FakeNode)) {
        event.target = this;
        event.eventPhase = 2;
        this._fire(event, 1);
        this._fire(event, 0);
        event.currentTarget = null;
        return !event.defaultPrevented;
    }
    var path = [], targets = [], t = this;
    for (var n = this; n; ) {
        path.push(n);
        targets.push(t);
        if (n.nodeType === 11 && n.host) {
            if (!event.composed) break;
            n = t = n.host;
        } else {
            n = n.parentNode;
        }
    }
    if (path[path.length - 1].nodeType === 9) { path.push(fakeWindow); targets.push(t); }
    event.eventPhase = 1;
    for (var i = path.length - 1; i >= 0 && !event._stop; --i) { event.target = targets[i]; path[i]._fire(event, 1); }
    for (var i = 0; i < path.length && !event._stop; ++i) {
        if (i === 0) event.eventPhase = 2;
        else if (!event.bubbles) break;
        else event.eventPhase = 3;
        event.target = targets[i];
        path[i]._fire(event, 0);
    }
    event.target = this;
    event.currentTarget = null;
    return !event.defaultPrevented;
};
FakeNode.prototype.cloneNode = function (deep) {
    var ctor = fakeCustomElementsActive && this.nodeType === 1 ? fakeCustomElementDefs[this.localName] : undefined;
    var n = ctor ? new ctor() : new FakeNode(this.nodeType, this.nodeName);
    if (this.nodeName === "TEMPLATE") {
        n.content = this.ownerDocument.createDocumentFragment();
        if (deep) for (var c = this.content.firstChild; c; c = c.nextSibling) n.content.appendChild(c.cloneNode(true));
    }
    n.ownerDocument = this.ownerDocument;
    n.nodeValue = this.nodeValue;
    n._value = this._value;
    n._checked = this._checked;
    n.className = this.className;
    n.id = this.id;
    if (this._attrs) { n._attrs = {}; for (var k in this._attrs) n._attrs[k] = this._attrs[k]; }
    if (this.nodeType === 1) n.style = new FakeStyle();
    if (deep) for (var c = this.firstChild; c; c = c.nextSibling) n.appendChild(c.cloneNode(true));
    return n;
};
FakeNode.prototype.click = function () {
    var checkbox = this.nodeName === "INPUT" && (this.getAttribute("type") === "checkbox" || this.getAttribute("type") === "radio");
    if (checkbox) this._checked = !this._checked;
    this.dispatchEvent(new FakeEvent("click", { bubbles: true, cancelable: true, composed: true, button: 0, detail: 1 }));
    if (checkbox) {
        this.dispatchEvent(new FakeEvent("input", { bubbles: true, composed: true }));
        this.dispatchEvent(new FakeEvent("change", { bubbles: true }));
    }
};
FakeNode.prototype.focus = function () { if (this.ownerDocument) this.ownerDocument.activeElement = this; };
FakeNode.prototype.blur = function () {};
FakeNode.prototype.getElementsByTagName = function (tag) {
    var out = [];
    tag = tag.toUpperCase();
    (function walk(n) {
        for (var c = n.firstChild; c; c = c.nextSibling) {
            if (c.nodeType === 1 && (tag === "*" || c.nodeName === tag)) out.push(c);
            walk(c);
        }
    })(this);
    return out;
};
// Selectors: comma lists of compound selectors (tag, *, #id, .class, [attr], [attr=value])
// joined by descendant (" ") or child (">") combinators. Parsed selectors are cached.
var fakeSelectorCache = Object.create(null);
function fakeParseCompound(text) {
    var c = { tag: null, id: null, classes: [], attrs: [] };
    var re = /([#.]?)([\w-]+)|\[([\w:-]+)(?:([~^$*|]?=)["']?([^"'\]]*)["']?)?\]|(\*)/g, m;
    while ((m = re.exec(text))) {
        if (m[6]) continue;
        if (m[3]) c.attrs.push({ name: m[3], op: m[4] || null, value: m[5] });
        else if (m[1] === "#") c.id = m[2];
        else if (m[1] === ".") c.classes.push(m[2]);
        else c.tag = m[2].toLowerCase();
    }
    return c;
}
function fakeParseSelector(sel) {
    var parsed = fakeSelectorCache[sel];
    if (parsed) return parsed;
    parsed = sel.split(",").map(function (part) {
        var tokens = part.trim().replace(/\s*>\s*/g, " > ").split(/\s+/);
        var chain = [], combinator = " ";
        for (var i = 0; i < tokens.length; ++i) {
            if (tokens[i] === ">") { combinator = ">"; continue; }
            chain.push({ compound: fakeParseCompound(tokens[i]), combinator: combinator });
            combinator = " ";
        }
        return chain;
    });
    return fakeSelectorCache[sel] = parsed;
}
function fakeMatchCompound(el, c) {
    if (el.nodeType !== 1) return false;
    if (c.tag !== null && el.localName !== c.tag) return false;
    if (c.id !== null && el.id !== c.id) return false;
    if (c.classes.length) {
        var cls = " " + el.className + " ";
        for (var i = 0; i < c.classes.length; ++i) if (cls.indexOf(" " + c.classes[i] + " ") === -1) return false;
    }
    for (var i = 0; i < c.attrs.length; ++i) {
        var a = c.attrs[i], v = el.getAttribute(a.name);
        if (v === null) return false;
        if (a.op === "=" && v !== a.value) return false;
        if (a.op === "~=" && (" " + v + " ").indexOf(" " + a.value + " ") === -1) return false;
        if (a.op === "^=" && v.indexOf(a.value) !== 0) return false;
        if (a.op === "*=" && v.indexOf(a.value) === -1) return false;
    }
    return true;
}
function fakeMatchChain(el, chain, index, scope) {
    if (!fakeMatchCompound(el, chain[index].compound)) return false;
    if (index === 0) return true;
    var combinator = chain[index].combinator;
    for (var p = el.parentNode; p && p !== scope; p = p.parentNode) {
        if (fakeMatchChain(p, chain, index - 1, scope)) return true;
        if (combinator === ">") return false;
    }
    return false;
}
FakeNode.prototype._matches = function (sel, scope) {
    if (this.nodeType !== 1) return false;
    var parsed = fakeParseSelector(sel);
    for (var i = 0; i < parsed.length; ++i)
        if (fakeMatchChain(this, parsed[i], parsed[i].length - 1, scope || null)) return true;
    return false;
};
FakeNode.prototype.matches = FakeNode.prototype._matches;
FakeNode.prototype.querySelectorAll = function (sel) {
    var out = [], scope = this;
    (function walk(n) {
        for (var c = n.firstChild; c; c = c.nextSibling) {
            if (c.nodeType === 1) {
                if (c._matches(sel)) out.push(c);
                walk(c);
            }
        }
    })(this);
    return out;
};
FakeNode.prototype.querySelector = function (sel) { return this.querySelectorAll(sel)[0] || null; };
FakeNode.prototype.getElementsByClassName = function (cls) { return this.querySelectorAll("." + cls); };
FakeNode.prototype.getElementById = function (id) { return this.querySelector("#" + id); };
FakeNode.prototype.closest = function (sel) {
    for (var n = this; n; n = n.parentNode) if (n._matches && n._matches(sel)) return n;
    return null;
};
FakeNode.prototype.getBoundingClientRect = function () {
    var w = this.clientWidth, h = this.clientHeight;
    return { top: 0, left: 0, right: w, bottom: h, width: w, height: h, x: 0, y: 0 };
};

function FakeStyle() { this.cssText = ""; }
FakeStyle.prototype.setProperty = function (name, value) { this[name] = value; };
FakeStyle.prototype.removeProperty = function (name) { delete this[name]; };
FakeStyle.prototype.getPropertyValue = function (name) { return this[name] || ""; };

function FakeDocument() {
    FakeNode.call(this, 9, "#document");
    this.ownerDocument = null;
    this.documentElement = this.createElement("html");
    this.head = this.createElement("head");
    this.body = this.createElement("body");
    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.activeElement = this.body;
    this.defaultView = null;
    this.readyState = "complete";
    this.implementation = { createHTMLDocument: function () { return new FakeDocument(); } };
}
FakeDocument.prototype = Object.create(FakeNode.prototype);
FakeDocument.prototype.constructor = FakeDocument;
FakeDocument.prototype.createElement = function (tag) {
    if (fakeCustomElementsActive) {
        var ctor = fakeCustomElementDefs[("" + tag).toLowerCase()];
        if (ctor) return new ctor();
    }
    var n = new FakeNode(1, ("" + tag).toUpperCase());
    n.ownerDocument = this;
    n.style = new FakeStyle();
    if (n.nodeName === "TEMPLATE") n.content = this.createDocumentFragment();
    return n;
};
FakeDocument.prototype.importNode = function (node, deep) { return node.cloneNode(deep); };
FakeDocument.prototype.adoptNode = function (node) { if (node.parentNode) node.parentNode.removeChild(node); return node; };
function FakeTreeWalker(root, whatToShow) {
    this.root = root;
    this.currentNode = root;
    this.whatToShow = whatToShow === undefined ? 0xFFFFFFFF : whatToShow;
}
FakeTreeWalker.prototype.nextNode = function () {
    var n = this.currentNode, root = this.root;
    for (;;) {
        if (n.firstChild) {
            n = n.firstChild;
        } else {
            while (n && n !== root && !n.nextSibling) n = n.parentNode;
            if (!n || n === root) return null;
            n = n.nextSibling;
        }
        if (this.whatToShow & (1 << (n.nodeType - 1))) {
            this.currentNode = n;
            return n;
        }
    }
};
FakeDocument.prototype.createTreeWalker = function (root, whatToShow) { return new FakeTreeWalker(root, whatToShow); };
FakeDocument.prototype.createElementNS = function (ns, tag) {
    var n = this.createElement(tag);
    n.namespaceURI = ns;
    return n;
};
FakeDocument.prototype.createTextNode = function (text) {
    var n = new FakeNode(3, "#text");
    n.ownerDocument = this;
    n.nodeValue = "" + text;
    return n;
};
FakeDocument.prototype.createComment = function (text) {
    var n = new FakeNode(8, "#comment");
    n.ownerDocument = this;
    n.nodeValue = "" + text;
    return n;
};
FakeDocument.prototype.createDocumentFragment = function () {
    var n = new FakeNode(11, "#document-fragment");
    n.ownerDocument = this;
    return n;
};
FakeDocument.prototype.createEvent = function () { return new FakeEvent(""); };

function FakeEvent(type, init) {
    this.type = type;
    this.bubbles = !!(init && init.bubbles);
    this.composed = !!(init && init.composed);
    this.cancelable = !!(init && init.cancelable);
    this.target = null;
    this.currentTarget = null;
    this.eventPhase = 0;
    this.defaultPrevented = false;
    this.timeStamp = 0;
    this.isTrusted = true;
    this._stop = false;
    this._stopImmediate = false;
    if (init) for (var k in init) if (!(k in this)) this[k] = init[k];
}
FakeEvent.prototype.preventDefault = function () { this.defaultPrevented = true; };
FakeEvent.prototype.stopPropagation = function () { this._stop = true; };
FakeEvent.prototype.stopImmediatePropagation = function () { this._stop = this._stopImmediate = true; };
FakeEvent.prototype.initCustomEvent = function (type, bubbles, cancelable, detail) {
    this.type = type; this.bubbles = bubbles; this.cancelable = cancelable; this.detail = detail;
};
FakeEvent.prototype.composedPath = function () {
    var path = [];
    for (var n = this.target; n; n = n.parentNode) path.push(n);
    return path;
};
FakeEvent.prototype.initEvent = function (type, bubbles, cancelable) {
    this.type = type; this.bubbles = bubbles; this.cancelable = cancelable;
};

var fakeDocument = new FakeDocument();
// Custom elements: constructors run synchronously from createElement/cloneNode/parsing; connected,
// disconnected and attributeChanged callbacks are delivered once anything has been defined.
var fakeCustomElementsActive = false;
var fakeCustomElementDefs = Object.create(null);
var fakeCustomElementNames = new Map();
var fakeUpgradeTarget = null;
function FakeHTMLElement() {
    if (fakeUpgradeTarget) {
        // Upgrade of an element that existed before define(): the constructor's `this` is it.
        var el = fakeUpgradeTarget;
        fakeUpgradeTarget = null;
        Object.setPrototypeOf(el, new.target.prototype);
        return el;
    }
    var name = fakeCustomElementNames.get(new.target);
    FakeNode.call(this, 1, name ? name.toUpperCase() : "UNKNOWN");
    this.ownerDocument = fakeDocument;
    this.style = new FakeStyle();
}
FakeHTMLElement.prototype = Object.create(FakeNode.prototype);
FakeHTMLElement.prototype.constructor = FakeHTMLElement;
Object.defineProperty(FakeHTMLElement, Symbol.hasInstance, {
    value: function (o) {
        if (this === FakeHTMLElement) return o instanceof FakeNode && o.nodeType === 1;
        return Function.prototype[Symbol.hasInstance].call(this, o);
    },
});
function fakeCallbackSubtree(node, callback) {
    if (node.nodeType !== 1 && node.nodeType !== 11) return;
    if (typeof node[callback] === "function" && fakeCustomElementNames.has(node.constructor)) node[callback]();
    if (node.shadowRoot) fakeCallbackSubtree(node.shadowRoot, callback);
    for (var c = node.firstChild; c; c = c.nextSibling) fakeCallbackSubtree(c, callback);
}
function fakeAttributeChanged(el, name, value) {
    var ctor = el.constructor, observed = ctor.__fakeObserved;
    if (!observed || observed.indexOf(name) === -1) return;
    var old = el.getAttribute(name);
    el.attributeChangedCallback(name, old, value);
}
var fakeCustomElements = {
    define: function (name, ctor) {
        fakeCustomElementsActive = true;
        fakeCustomElementDefs[name] = ctor;
        fakeCustomElementNames.set(ctor, name);
        ctor.__fakeObserved = ctor.observedAttributes || [];
        var existing = fakeDocument.getElementsByTagName(name);
        for (var i = 0; i < existing.length; ++i) {
            var el = existing[i];
            fakeUpgradeTarget = el;
            new ctor();
            var observed = ctor.__fakeObserved;
            for (var j = 0; j < observed.length; ++j) {
                var v = el.getAttribute(observed[j]);
                if (v !== null) el.attributeChangedCallback(observed[j], null, v);
            }
            if (el.isConnected && el.connectedCallback) el.connectedCallback();
        }
    },
    get: function (name) { return fakeCustomElementDefs[name]; },
    whenDefined: function () { return Promise.resolve(); },
    upgrade: function () {},
};
// The global object doubles as `window`, like in a browser.
var fakeWindow = (0, eval)("this");
fakeWindow.window = fakeWindow;
fakeWindow.self = fakeWindow;
fakeWindow.document = fakeDocument;
fakeWindow._listeners = null;
fakeWindow.addEventListener = FakeEventTarget.prototype.addEventListener;
fakeWindow.removeEventListener = FakeEventTarget.prototype.removeEventListener;
fakeWindow._fire = FakeEventTarget.prototype._fire;
fakeWindow.location = {
    href: "http://localhost/", hash: "", pathname: "/", search: "", protocol: "http:", host: "localhost", hostname: "localhost", origin: "http://localhost", port: "",
    replace: function (url) { fakeSetURL(url); },
    assign: function (url) { fakeSetURL(url); },
    toString: function () { return this.href; },
};
fakeWindow.history = {
    state: null, length: 1,
    pushState: function (state, title, url) { this.state = state; fakeSetURL(url); },
    replaceState: function (state, title, url) { this.state = state; fakeSetURL(url); },
};
function fakeSetURL(url) {
    if (url == null) return;
    url = "" + url;
    var hash = url.indexOf("#");
    fakeWindow.location.hash = hash === -1 ? "" : url.slice(hash);
    fakeWindow.location.href = "http://localhost/" + (hash === -1 ? "" : url.slice(hash));
}
// Minimal URL (absolute http(s) URLs, or a path/hash relative to a base).
function FakeURL(url, base) {
    url = "" + url;
    var opaque = /^([a-z][a-z0-9+.-]*:)(?!\/\/)(.*)$/i.exec(url);
    if (opaque) {
        this.protocol = opaque[1].toLowerCase();
        this.host = this.hostname = this.port = this.search = this.hash = "";
        this.pathname = opaque[2];
        this.origin = "null";
        this.href = url;
        return;
    }
    var m = /^([a-z]+:)\/\/([^\/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/.exec(url);
    if (!m) {
        var b = new FakeURL(base === undefined ? fakeWindow.location.href : "" + base);
        var origin = b.protocol + "//" + b.host;
        if (url.charAt(0) === "#") url = b.pathname + b.search + url;
        else if (url.charAt(0) === "?") url = b.pathname + url;
        else if (url.charAt(0) !== "/") url = b.pathname.replace(/[^\/]*$/, "") + url;
        m = /^([a-z]+:)\/\/([^\/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/.exec(origin + url);
    }
    this.protocol = m[1];
    this.host = this.hostname = m[2];
    this.port = "";
    this.pathname = m[3] || "/";
    this.search = m[4] || "";
    this.hash = m[5] || "";
    this.origin = this.protocol + "//" + this.host;
    this.href = this.origin + this.pathname + this.search + this.hash;
}
FakeURL.prototype.toString = function () { return this.href; };
fakeWindow.URL = FakeURL;
fakeWindow.navigator = { userAgent: "fakedom", platform: "Linux", language: "en-US" };
fakeWindow.getComputedStyle = function () { return new FakeStyle(); };
fakeWindow.EventTarget = FakeEventTarget;
function FakeCSSStyleSheet() { this.cssText = ""; this.cssRules = []; }
FakeCSSStyleSheet.prototype.replaceSync = function (text) { this.cssText = text; };
FakeCSSStyleSheet.prototype.replace = function (text) { this.cssText = text; return Promise.resolve(this); };
fakeWindow.CSSStyleSheet = FakeCSSStyleSheet;
fakeWindow.customElements = fakeCustomElements;
fakeWindow.Event = FakeEvent;
fakeWindow.CustomEvent = FakeEvent;
fakeWindow.KeyboardEvent = FakeEvent;
fakeWindow.MouseEvent = FakeEvent;
fakeWindow.Node = FakeNode;
fakeWindow.Element = FakeNode;
fakeWindow.HTMLElement = FakeHTMLElement;
fakeWindow.Text = FakeNode;
fakeWindow.NodeList = function NodeList() {};
fakeWindow.HTMLCollection = function HTMLCollection() {};
fakeWindow.HTMLIFrameElement = function HTMLIFrameElement() {};
fakeWindow.SVGElement = function SVGElement() {};
fakeWindow.innerWidth = 1024;
fakeWindow.innerHeight = 768;
fakeWindow.devicePixelRatio = 1;
fakeWindow.performance = { now: function () { return 0; } };
fakeDocument.defaultView = fakeWindow;
fakeDocument.location = fakeWindow.location;
fakeWindow.onhashchange = null;
fakeWindow.onpopstate = null;
// Deterministic task queue standing in for setTimeout/MessageChannel; drained by drivers.
var __tasks = [];
function __setTimeout(fn) {
    var args = Array.prototype.slice.call(arguments, 2);
    __tasks.push(function () { fn.apply(null, args); });
    return __tasks.length;
}
function FakeDOMParser() {}
FakeDOMParser.prototype.parseFromString = function (html) {
    var doc = new FakeDocument();
    doc.body.innerHTML = html;
    return doc;
};
fakeWindow.DOMParser = FakeDOMParser;
function FakeObserver(callback) { this.callback = callback; }
FakeObserver.prototype.observe = function () {};
FakeObserver.prototype.unobserve = function () {};
FakeObserver.prototype.disconnect = function () {};
FakeObserver.prototype.takeRecords = function () { return []; };
fakeWindow.MutationObserver = FakeObserver;
fakeWindow.ResizeObserver = FakeObserver;
fakeWindow.IntersectionObserver = FakeObserver;
fakeWindow.requestAnimationFrame = function (fn) { return __setTimeout(fn, 0, 0); };
fakeWindow.cancelAnimationFrame = function () {};
function drainTasks() {
    var n = 0;
    while (__tasks.length) {
        var t = __tasks.shift();
        t();
        ++n;
    }
    return n;
}
// Fires DOMContentLoaded (document) and load (window), like a page finishing loading.
function fireLoadEvents() {
    fakeDocument.dispatchEvent(new FakeEvent("DOMContentLoaded", { bubbles: true }));
    var load = new FakeEvent("load");
    load.target = fakeDocument;
    fakeWindow._fire(load, 1);
    fakeWindow._fire(load, 0);
}
// ---- end parts:fakedom.js ----
var document = fakeDocument, setTimeout = __setTimeout, clearTimeout = function () {};
fakeSetURL("index.html");
document.body.innerHTML = "<section class=\"todoapp\"></section><footer class=\"info\"><p>Click on input field to write your todo.</p></footer>";
// ---- begin parts:sp3-steps.js ----
// Speedometer 3 TodoMVC steps (resources/tests.mjs + benchmark-runner.mjs PageElement), with the
// todo texts from resources/translations.mjs.
var sp3TodoTextsByLang = {"en":["Electronic Granite Hat","Bespoke Soft Table","Ergonomic Fresh Bike","Luxurious Wooden Cheese","Gorgeous Fresh Pizza","Rustic Rubber Shirt","Modern Rubber Soap","Small Bronze Ball","Awesome Bronze Shoes","Bespoke Steel Chair","Practical Plastic Soap","Incredible Granite Bacon","Elegant Metal Keyboard","Electronic Wooden Sausages","Tasty Wooden Gloves","Luxurious Metal Cheese","Awesome Rubber Gloves","Sleek Soft Car","Licensed Fresh Salad","Ergonomic Frozen Towels","Modern Rubber Keyboard","Tasty Concrete Pizza","Handmade Plastic Chicken","Luxurious Rubber Chicken","Practical Soft Fish","Ergonomic Bronze Shirt","Handcrafted Plastic Bacon","Unbranded Plastic Pants","Modern Wooden Sausages","Handmade Steel Shoes","Rustic Steel Bike","Gorgeous Frozen Salad","Handmade Bronze Chicken","Sleek Granite Bike","Generic Concrete Sausages","Incredible Plastic Tuna","Bespoke Fresh Cheese","Electronic Fresh Bacon","Licensed Wooden Car","Recycled Fresh Fish","Incredible Fresh Shoes","Practical Soft Chips","Small Soft Chicken","Intelligent Fresh Mouse","Modern Metal Mouse","Tasty Granite Gloves","Awesome Rubber Bike","Small Steel Shirt","Refined Concrete Computer","Sleek Frozen Shirt","Intelligent Concrete Shoes","Handmade Rubber Car","Sleek Rubber Towels","Unbranded Concrete Hat","Incredible Plastic Fish","Practical Soft Gloves","Organic Stone Pizza","Generic Wooden Keyboard","Recycled Wooden Chips","Incredible Rubber Chips","Ergonomic Granite Shirt","Tasty Frozen Keyboard","Gorgeous Steel Soap","Luxurious Plastic Chair","Elegant Frozen Bike","Recycled Steel Chair","Modern Bronze Sausages","Elegant Wooden Cheese","Small Plastic Sausages","Luxurious Frozen Shoes","Sleek Plastic Sausages","Handcrafted Fresh Sausages","Incredible Soft Chair","Recycled Wooden Soap","Soft Rubber Duck","Licensed Concrete Tuna","Luxurious Granite Pants","Refined Rubber Keyboard","Handcrafted Plastic Computer","Practical Steel Salad","Incredible Soft Bacon","Practical Metal Fish","Elegant Rubber Shirt","Handcrafted Rubber Table","Gorgeous Wooden Table","Fantastic Steel Sausages","Small Soft Keyboard","Generic Steel Ball","Electronic Frozen Hat","Gorgeous Fresh Chair","Sleek Soft Sausages","Gorgeous Wooden Towels","Bespoke Granite Pizza","Generic Metal Salad","Handmade Rubber Cheese","Fantastic Steel Chair","Handcrafted Frozen Computer","Rustic Rubber Mouse","Sleek Granite Pizza","Gorgeous Plastic Keyboard"],"ja":["電子花崗岩の帽子","オーダーメイドのソフトテーブル","人間工学に基づいた新鮮な自転車","豪華な木製チーズ","ゴージャスな新鮮なピザ","素朴なラバーシャツ","モダンゴム石鹸","小さなブロンズボール","素晴らしいブロンズシューズ","オーダーメイドのスチールチェア","実用的なプラスチック石鹸","信じられないほどの花崗岩のベーコン","エレガントなメタルキーボード","電子木製ソーセージ","おいしい木製手袋","豪華なメタルチーズ","素晴らしいラバーグローブ","洗練されたソフトカー","ライセンスされた新鮮なサラダ","人間工学に基づいた冷凍タオル","モダンなゴムキーボード","おいしいコンクリートピザ","手作りのプラスチックチキン","豪華なゴム鶏","実用的な柔らかい魚","人間工学に基づいたブロンズシャツ","手作りのプラスチックベーコン","ブランドのないプラスチックパンツ","モダンな木製ソーセージ","手作りのスチールシューズ","素朴なスチールバイク","ゴージャスな冷凍サラダ","手作りのブロンズチキン","洗練された花崗岩の自転車","一般的なコンクリートソーセージ","信じられないほどのプラスチックマグロ","オーダーメイドのフレッシュチーズ","電子新鮮なベーコン","ライセンスされた木製車","新鮮な魚をリサイクルしました","信じられないほどの新鮮な靴","実用的なソフトチップ","小さな柔らかい鶏","インテリジェントな新鮮なマウス","現代の金属マウス","おいしい花崗岩の手袋","素晴らしいラバーバイク","小さなスチールシャツ","洗練されたコンクリートコンピューター","洗練された冷凍シャツ","インテリジェントコンクリートシューズ","手作りのラバーカー","洗練されたゴムタオル","ブランドのないコンクリートの帽子","信じられないほどのプラスチックの魚","実用的なソフトグローブ","オーガニックストーンピザ","一般的な木製キーボード","リサイクルされた木製チップ","信じられないほどのゴムチップ","人間工学に基づいた花崗岩のシャツ","おいしい冷凍キーボード","ゴージャスなスチールソープ","豪華なプラスチック製の椅子","エレガントな冷凍自転車","リサイクルスチールチェア","モダンブロンズソーセージ","エレガントな木製チーズ","小さなプラスチックソーセージ","豪華な冷凍靴","なめらかなプラスチックソーセージ","手作りの新鮮なソーセージ","信じられないほどのソフトチェア","リサイクルされた木製石鹸","柔らかいラバーアヒル","ライセンスされたコンクリートマグロ","豪華な花崗岩のズボン","洗練されたゴムキーボード","手作りのプラスチックコンピューター","実用的なスチールサラダ","信じられないほどのソフトベーコン","実用的な金属魚","エレガントなラバーシャツ","手作りのゴムテーブル","ゴージャスな木製のテーブル","素晴らしいスチールソーセージ","小さなソフトキーボード","ジェネリックスチールボール","電子冷凍帽子","ゴージャスな新鮮な椅子","洗練された柔らかいソーセージ","ゴージャスな木製タオル","オーダーメイドの花崗岩のピザ","ジェネリックメタルサラダ","手作りのゴムチーズ","素晴らしいスチールチェア","手作りの冷凍コンピューター","素朴なゴムマウス","洗練された花崗岩のピザ","ゴージャスなプラスチックキーボード"],"ru":["Электронная гранитная шляпа","Беспокойный мягкий стол","Эргономичный свежий велосипед","Роскошный деревянный сыр","Великолепная свежая пицца","Деревенская резиновая рубашка","Современное резиновое мыло","Маленький бронзовый мяч","Потрясающие бронзовые туфли","Стальное кресло на заказ","Практическое пластиковое мыло","Невероятный гранитный бекон","Элегантная металлическая клавиатура","Электронные деревянные колбасы","Вкусные деревянные перчатки","Роскошный металлический сыр","Потрясающие резиновые перчатки","Гладкая мягкая машина","Лицензированный свежий салат","Эргономичные замороженные полотенца","Современная резиновая клавиатура","Вкусная бетонная пицца","Пластиковая курица ручной работы","Роскошная резиновая курица","Практическая мягкая рыба","Эргономичная бронзовая рубашка","Пластиковый бекон из ручной работы","Непревзойденные пластиковые брюки","Современные деревянные колбасы","Стальные туфли ручной работы","Деревенский стальный велосипед","Великолепный замороженный салат","Бронзовая курица ручной работы","Гладкий гранитный велосипед","Общие бетонные колбасы","Невероятный пластиковый тунец","Созданный свежий сыр","Электронный свежий бекон","Лицензированный деревянный автомобиль","Переработанная свежая рыба","Невероятные свежие туфли","Практические мягкие чипсы","Маленькая мягкая курица","Интеллектуальная свежая мышь","Современная металлическая мышь","Вкусные гранитные перчатки","Потрясающий резиновый велосипед","Маленькая стальная рубашка","Изысканный бетонный компьютер","Гладкая замороженная рубашка","Интеллектуальные бетонные туфли","Резиновый автомобиль ручной работы","Гладкие резиновые полотенца","Непревзойденная бетонная шляпа","Невероятная пластиковая рыба","Практические мягкие перчатки","Органическая камня пицца","Общая деревянная клавиатура","Переработанные деревянные чипсы","Невероятные резиновые чипсы","Эргономичная гранитная рубашка","Вкусная замороженная клавиатура","Великолепное стальное мыло","Роскошное пластиковое кресло","Элегантный замороженный велосипед","Переработанное стальное кресло","Современные бронзовые колбасы","Элегантный деревянный сыр","Маленькие пластиковые колбаски","Роскошные замороженные туфли","Гладкие пластиковые колбаски","Свежие колбаски ручной работы","Невероятный мягкий стул","Переработанное деревянное мыло","Мягкая резиновая утка","Лицензированный бетонный тунец","Роскошные гранитные штаны","Рафинированная резиновая клавиатура","Пластиковый компьютер ручной работы","Практический стальной салат","Невероятный мягкий бекон","Практическая металлическая рыба","Элегантная резиновая рубашка","Ручной резиновый стол","Великолепный деревянный стол","Фантастические стальные колбаски","Небольшая мягкая клавиатура","Общий стальной шар","Электронная замороженная шляпа","Великолепный свежий стул","Гладкие мягкие колбаски","Великолепные деревянные полотенца","Сделанная на заказ гранитная пицца","Общий металлический салат","Резиновый сыр ручной работы","Фантастическое стальное кресло","Замороженный компьютер ручной работы","Деревенская резиновая мышь","Главная гранитная пицца","Великолепная пластиковая клавиатура"]};
var sp3TodoTexts = sp3TodoTextsByLang.en;
var numberOfItemsToAdd = 100;
// Per-app variations in tests.mjs: which key event adds the item, and whether an "input"
// event is dispatched first.
var sp3Options = { enter: "keydown", valueEvent: "input", lang: "en" };
function sp3Enter(node, type) {
    node.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, keyCode: 13, which: 13, key: "Enter" }));
}
function sp3Adding100Items(root) {
    var newTodo = root.querySelector(".new-todo");
    for (var i = 0; i < numberOfItemsToAdd; i++) {
        var texts = sp3TodoTextsByLang[sp3Options.lang || "en"];
        newTodo.value = texts[i % texts.length];
        if (sp3Options.valueEvent)
            newTodo.dispatchEvent(new Event(sp3Options.valueEvent, { bubbles: true, cancellable: true }));
        sp3Enter(newTodo, sp3Options.enter);
    }
}
function sp3CompletingAllItems(root) {
    var checkboxes = root.querySelectorAll(".toggle");
    for (var i = 0; i < numberOfItemsToAdd; i++)
        checkboxes[i].click();
}
function sp3DeletingAllItems(root) {
    var deleteButtons = root.querySelectorAll(".destroy");
    for (var i = numberOfItemsToAdd - 1; i >= 0; i--)
        deleteButtons[i].click();
}
// Runs the three steps ROUNDS times with a task + microtask boundary after every step, like
// the SP3 runner (which waits for the next frame between steps).
async function sp3RunTodoMVC(root, rounds, afterStep) {
    var steps = [sp3Adding100Items, sp3CompletingAllItems, sp3DeletingAllItems];
    // prepare(): wait for the app to render its input (some apps mount asynchronously).
    for (var tries = 0; !root.querySelector(".new-todo"); ++tries) {
        if (tries === 50) throw new Error("app did not render .new-todo");
        await null;
        drainTasks();
    }
    root.querySelector(".new-todo").focus();
    for (var r = 0; r < rounds; ++r) {
        for (var s = 0; s < steps.length; ++s) {
            steps[s](root);
            await null;
            drainTasks();
            await null;
            drainTasks();
            var toggles = root.querySelectorAll(".toggle").length;
            var completed = root.querySelectorAll(".completed").length;
            var expected = [[100, 0], [100, 100], [0, 0]][s];
            if (toggles !== expected[0] || completed !== expected[1])
                throw new Error("step " + s + ": " + toggles + " .toggle, " + completed + " .completed");
            if (afterStep) afterStep(s);
        }
    }
}
// ---- end parts:sp3-steps.js ----
// ---- begin verbatim copy of Speedometer SP3:todomvc/architecture-examples/svelte/dist/app.js ----
var app=function(){"use strict";function t(){}function e(t){return t()}function n(){return Object.create(null)}function o(t){t.forEach(e)}function c(t){return"function"==typeof t}function r(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function l(t,e){t.appendChild(e)}function i(t,e,n){t.insertBefore(e,n||null)}function u(t){t.parentNode&&t.parentNode.removeChild(t)}function s(t){return document.createElement(t)}function a(t){return document.createTextNode(t)}function d(){return a(" ")}function f(){return a("")}function p(t,e,n,o){return t.addEventListener(e,n,o),()=>t.removeEventListener(e,n,o)}function m(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function h(t,e){e=""+e,t.data!==e&&(t.data=e)}function $(t,e,n){t.classList[n?"add":"remove"](e)}let g;function x(t){g=t}function y(){if(!g)throw new Error("Function called outside component initialization");return g}function v(){const t=y();return(e,n,{cancelable:o=!1}={})=>{const c=t.$$.callbacks[e];if(c){const r=function(t,e,{bubbles:n=!1,cancelable:o=!1}={}){const c=document.createEvent("CustomEvent");return c.initCustomEvent(t,n,o,e),c}(e,n,{cancelable:o});return c.slice().forEach((e=>{e.call(t,r)})),!r.defaultPrevented}return!0}}const b=[],k=[];let w=[];const _=[],C=Promise.resolve();let E=!1;function A(){E||(E=!0,C.then(S))}function F(t){w.push(t)}const I=new Set;let M=0;function S(){if(0!==M)return;const t=g;do{try{for(;M<b.length;){const t=b[M];M++,x(t),N(t.$$)}}catch(t){throw b.length=0,M=0,t}for(x(null),b.length=0,M=0;k.length;)k.pop()();for(let t=0;t<w.length;t+=1){const e=w[t];I.has(e)||(I.add(e),e())}w.length=0}while(b.length);for(;_.length;)_.pop()();E=!1,I.clear(),x(t)}function N(t){if(null!==t.fragment){t.update(),o(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(F)}}const L=new Set;let O;function j(){O={r:0,c:[],p:O}}function q(){O.r||o(O.c),O=O.p}function P(t,e){t&&t.i&&(L.delete(t),t.i(e))}function T(t,e,n,o){if(t&&t.o){if(L.has(t))return;L.add(t),O.c.push((()=>{L.delete(t),o&&(n&&t.d(1),o())})),t.o(e)}else o&&o()}function z(t,e){T(t,1,1,(()=>{e.delete(t.key)}))}function B(t){t&&t.c()}function W(t,n,r,l){const{fragment:i,after_update:u}=t.$$;i&&i.m(n,r),l||F((()=>{const n=t.$$.on_mount.map(e).filter(c);t.$$.on_destroy?t.$$.on_destroy.push(...n):o(n),t.$$.on_mount=[]})),u.forEach(F)}function D(t,e){const n=t.$$;null!==n.fragment&&(!function(t){const e=[],n=[];w.forEach((o=>-1===t.indexOf(o)?e.push(o):n.push(o))),n.forEach((t=>t())),w=e}(n.after_update),o(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function G(e,c,r,l,i,s,a,d=[-1]){const f=g;x(e);const p=e.$$={fragment:null,ctx:[],props:s,update:t,not_equal:i,bound:n(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(c.context||(f?f.$$.context:[])),callbacks:n(),dirty:d,skip_bound:!1,root:c.target||f.$$.root};a&&a(p.root);let m=!1;if(p.ctx=r?r(e,c.props||{},((t,n,...o)=>{const c=o.length?o[0]:n;return p.ctx&&i(p.ctx[t],p.ctx[t]=c)&&(!p.skip_bound&&p.bound[t]&&p.bound[t](c),m&&function(t,e){-1===t.$$.dirty[0]&&(b.push(t),A(),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}(e,t)),n})):[],p.update(),m=!0,o(p.before_update),p.fragment=!!l&&l(p.ctx),c.target){if(c.hydrate){const t=function(t){return Array.from(t.childNodes)}(c.target);p.fragment&&p.fragment.l(t),t.forEach(u)}else p.fragment&&p.fragment.c();c.intro&&P(e.$$.fragment),W(e,c.target,c.anchor,c.customElement),S()}x(f)}class H{$destroy(){D(this,1),this.$destroy=t}$on(e,n){if(!c(n))return t;const o=this.$$.callbacks[e]||(this.$$.callbacks[e]=[]);return o.push(n),()=>{const t=o.indexOf(n);-1!==t&&o.splice(t,1)}}$set(t){var e;this.$$set&&(e=t,0!==Object.keys(e).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}function J(e){let n,o,c,r,a,f;return{c(){n=s("header"),o=s("h1"),o.textContent="todos",c=d(),r=s("input"),m(r,"class","new-todo"),m(r,"placeholder","What needs to be done?"),r.autofocus=!0,m(n,"class","header")},m(t,u){i(t,n,u),l(n,o),l(n,c),l(n,r),r.focus(),a||(f=p(r,"keydown",e[0]),a=!0)},p:t,i:t,o:t,d(t){t&&u(n),a=!1,f()}}}function K(t){const e=v();return[function(t){"Enter"===t.key&&(e("addItem",{text:t.target.value}),t.target.value="")}]}class Q extends H{constructor(t){super(),G(this,t,K,J,r,{})}}function R(e){let n,o,c;return{c(){n=s("button"),n.textContent="Clear completed",m(n,"class","clear-completed")},m(t,r){i(t,n,r),o||(c=p(n,"click",e[3]),o=!0)},p:t,d(t){t&&u(n),o=!1,c()}}}function U(e){let n,o,c,r,f,p,g,x,y,v,b,k,w,_,C,E,A,F,I=1===e[0]?"item":"items",M=e[2]&&R(e);return{c(){n=s("footer"),o=s("span"),c=s("strong"),r=a(e[0]),f=d(),p=a(I),g=a(" left"),x=d(),y=s("ul"),v=s("li"),b=s("a"),b.textContent="All",k=d(),w=s("li"),_=s("a"),_.textContent="Active",C=d(),E=s("li"),A=s("a"),A.textContent="Completed",F=d(),M&&M.c(),m(o,"class","todo-count"),m(b,"href","#/"),$(b,"selected","all"===e[1]),m(_,"href","#/active"),$(_,"selected","active"===e[1]),m(A,"href","#/completed"),$(A,"selected","completed"===e[1]),m(y,"class","filters"),m(n,"class","footer")},m(t,e){i(t,n,e),l(n,o),l(o,c),l(c,r),l(o,f),l(o,p),l(o,g),l(n,x),l(n,y),l(y,v),l(v,b),l(y,k),l(y,w),l(w,_),l(y,C),l(y,E),l(E,A),l(n,F),M&&M.m(n,null)},p(t,[e]){1&e&&h(r,t[0]),1&e&&I!==(I=1===t[0]?"item":"items")&&h(p,I),2&e&&$(b,"selected","all"===t[1]),2&e&&$(_,"selected","active"===t[1]),2&e&&$(A,"selected","completed"===t[1]),t[2]?M?M.p(t,e):(M=R(t),M.c(),M.m(n,null)):M&&(M.d(1),M=null)},i:t,o:t,d(t){t&&u(n),M&&M.d()}}}function V(t,e,n){let{numActive:o}=e,{currentFilter:c}=e,{numCompleted:r}=e;const l=v();return t.$$set=t=>{"numActive"in t&&n(0,o=t.numActive),"currentFilter"in t&&n(1,c=t.currentFilter),"numCompleted"in t&&n(2,r=t.numCompleted)},[o,c,r,function(t){l("removeCompletedItems")}]}class X extends H{constructor(t){super(),G(this,t,V,U,r,{numActive:0,currentFilter:1,numCompleted:2})}}function Y(e){let n,r,a,f,h,$,g;return{c(){n=s("div"),r=s("input"),f=d(),h=s("label"),h.textContent="Edit Todo Input",r.value=a=e[0].description,m(r,"id","edit-todo-input"),m(r,"class","edit"),m(h,"class","visually-hidden"),m(h,"for","edit-todo-input"),m(n,"class","input-container")},m(o,u){var s;i(o,n,u),l(n,r),l(n,f),l(n,h),$||(g=[p(r,"keydown",e[5]),p(r,"blur",e[6]),(s=e[7].call(null,r),s&&c(s.destroy)?s.destroy:t)],$=!0)},p(t,e){1&e&&a!==(a=t[0].description)&&r.value!==a&&(r.value=a)},d(t){t&&u(n),$=!1,o(g)}}}function Z(e){let n,c,r,f,g,x,y,v,b,k,w,_,C,E=e[0].description+"",A=e[2]&&Y(e);return{c(){n=s("li"),c=s("div"),r=s("input"),g=d(),x=s("label"),y=a(E),v=d(),b=s("button"),k=d(),A&&A.c(),m(r,"class","toggle"),m(r,"type","checkbox"),r.checked=f=e[0].completed,m(b,"class","destroy"),m(c,"class","view"),m(n,"data-priority",w=4-e[1]%5),$(n,"completed",e[0].completed),$(n,"editing",e[2])},m(t,o){i(t,n,o),l(n,c),l(c,r),l(c,g),l(c,x),l(x,y),l(c,v),l(c,b),l(n,k),A&&A.m(n,null),_||(C=[p(r,"change",e[8]),p(x,"dblclick",e[4]),p(b,"click",e[3])],_=!0)},p(t,[e]){1&e&&f!==(f=t[0].completed)&&(r.checked=f),1&e&&E!==(E=t[0].description+"")&&h(y,E),t[2]?A?A.p(t,e):(A=Y(t),A.c(),A.m(n,null)):A&&(A.d(1),A=null),2&e&&w!==(w=4-t[1]%5)&&m(n,"data-priority",w),1&e&&$(n,"completed",t[0].completed),4&e&&$(n,"editing",t[2])},i:t,o:t,d(t){t&&u(n),A&&A.d(),_=!1,o(C)}}}function tt(t,e,n){let{item:o}=e,{index:c}=e;const r=v();let l=!1;function i(){r("removeItem")}return t.$$set=t=>{"item"in t&&n(0,o=t.item),"index"in t&&n(1,c=t.index)},[o,c,l,i,function(){n(2,l=!0)},function(t){"Enter"===t.key?t.target.blur():"Escape"===t.key&&n(2,l=!1)},function(t){if(!l)return;const{value:e}=t.target;e.length?n(0,o.description=e,o):i(),n(2,l=!1)},async function(t){await(A(),C),t.focus()},t=>n(0,o.completed=t.target.checked,o)]}class et extends H{constructor(t){super(),G(this,t,tt,Z,r,{item:0,index:1})}}function nt(t,e,n){const o=t.slice();return o[11]=e[n],o[12]=e,o[13]=n,o}function ot(t){let e,n,c,r,a,f,h,$,g,x,y,v,b,k=[],w=new Map,_=t[4];const C=t=>t[11].id;for(let e=0;e<_.length;e+=1){let n=nt(t,_,e),o=C(n);w.set(o,k[e]=ct(o,n))}return x=new X({props:{numActive:t[3],currentFilter:t[0],numCompleted:t[2]}}),x.$on("removeCompletedItems",t[8]),{c(){e=s("main"),n=s("div"),c=s("input"),a=d(),f=s("label"),f.textContent="Mark all as complete",h=d(),$=s("ul");for(let t=0;t<k.length;t+=1)k[t].c();g=d(),B(x.$$.fragment),m(c,"id","toggle-all"),m(c,"class","toggle-all"),m(c,"type","checkbox"),c.checked=r=t[2]===t[1].length,m(f,"for","toggle-all"),m(n,"class","toggle-all-container"),m($,"class","todo-list show-priority"),m(e,"class","main")},m(o,r){i(o,e,r),l(e,n),l(n,c),l(n,a),l(n,f),l(e,h),l(e,$);for(let t=0;t<k.length;t+=1)k[t]&&k[t].m($,null);l(e,g),W(x,e,null),y=!0,v||(b=p(c,"change",t[7]),v=!0)},p(t,e){(!y||6&e&&r!==(r=t[2]===t[1].length))&&(c.checked=r),80&e&&(_=t[4],j(),k=function(t,e,n,c,r,l,i,u,s,a,d,f){let p=t.length,m=l.length,h=p;const $={};for(;h--;)$[t[h].key]=h;const g=[],x=new Map,y=new Map,v=[];for(h=m;h--;){const t=f(r,l,h),o=n(t);let u=i.get(o);u?c&&v.push((()=>u.p(t,e))):(u=a(o,t),u.c()),x.set(o,g[h]=u),o in $&&y.set(o,Math.abs(h-$[o]))}const b=new Set,k=new Set;function w(t){P(t,1),t.m(u,d),i.set(t.key,t),d=t.first,m--}for(;p&&m;){const e=g[m-1],n=t[p-1],o=e.key,c=n.key;e===n?(d=e.first,p--,m--):x.has(c)?!i.has(o)||b.has(o)?w(e):k.has(c)?p--:y.get(o)>y.get(c)?(k.add(o),w(e)):(b.add(c),p--):(s(n,i),p--)}for(;p--;){const e=t[p];x.has(e.key)||s(e,i)}for(;m;)w(g[m-1]);return o(v),g}(k,e,C,1,t,_,w,$,z,ct,null,nt),q());const n={};8&e&&(n.numActive=t[3]),1&e&&(n.currentFilter=t[0]),4&e&&(n.numCompleted=t[2]),x.$set(n)},i(t){if(!y){for(let t=0;t<_.length;t+=1)P(k[t]);P(x.$$.fragment,t),y=!0}},o(t){for(let t=0;t<k.length;t+=1)T(k[t]);T(x.$$.fragment,t),y=!1},d(t){t&&u(e);for(let t=0;t<k.length;t+=1)k[t].d();D(x),v=!1,b()}}}function ct(t,e){let n,o,c,r;function l(t){e[9](t,e[11],e[12],e[13])}let s={index:e[13]};return void 0!==e[11]&&(s.item=e[11]),o=new et({props:s}),k.push((()=>function(t,e,n){const o=t.$$.props[e];void 0!==o&&(t.$$.bound[o]=n,n(t.$$.ctx[o]))}(o,"item",l))),o.$on("removeItem",(function(){return e[10](e[13])})),{key:t,first:null,c(){n=f(),B(o.$$.fragment),this.first=n},m(t,e){i(t,n,e),W(o,t,e),r=!0},p(t,n){e=t;const r={};var l;16&n&&(r.index=e[13]),!c&&16&n&&(c=!0,r.item=e[11],l=()=>c=!1,_.push(l)),o.$set(r)},i(t){r||(P(o.$$.fragment,t),r=!0)},o(t){T(o.$$.fragment,t),r=!1},d(t){t&&u(n),D(o,t)}}}function rt(t){let e,n,o,c;e=new Q({}),e.$on("addItem",t[5]);let r=t[1].length>0&&ot(t);return{c(){B(e.$$.fragment),n=d(),r&&r.c(),o=f()},m(t,l){W(e,t,l),i(t,n,l),r&&r.m(t,l),i(t,o,l),c=!0},p(t,[e]){t[1].length>0?r?(r.p(t,e),2&e&&P(r,1)):(r=ot(t),r.c(),P(r,1),r.m(o.parentNode,o)):r&&(j(),T(r,1,1,(()=>{r=null})),q())},i(t){c||(P(e.$$.fragment,t),P(r),c=!0)},o(t){T(e.$$.fragment,t),T(r),c=!1},d(t){D(e,t),t&&u(n),r&&r.d(t),t&&u(o)}}}function lt(t,e,n){let o,c,r,l="all",i=[];function u(t){i.splice(t,1),n(1,i)}var s;s=()=>{(function(t){let e="all";function n(){switch(window.location.hash){case"#/active":e="active";break;case"#/completed":e="completed";break;default:e="all"}t(e)}return{init:function(){window.addEventListener("hashchange",n)}}})((t=>n(0,l=t))).init()},y().$$.on_mount.push(s);return t.$$.update=()=>{3&t.$$.dirty&&n(4,o="all"===l?i:"completed"===l?i.filter((t=>t.completed)):i.filter((t=>!t.completed))),2&t.$$.dirty&&n(3,c=i.filter((t=>!t.completed)).length),2&t.$$.dirty&&n(2,r=i.filter((t=>t.completed)).length)},[l,i,r,c,o,function(t){i.push({id:"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,(function(t){var e=16*Math.random()|0;return("x"===t?e:3&e|8).toString(16)})),description:t.detail.text,completed:!1}),n(1,i)},u,function(t){const e=t.target.checked;n(1,i=i.map((t=>({...t,completed:e}))))},function(){n(1,i=i.filter((t=>!t.completed)))},function(t,e,c,r){c[r]=t,n(4,o),n(0,l),n(1,i)},t=>u(t)]}return new class extends H{constructor(t){super(),G(this,t,lt,rt,r,{})}}({target:document.querySelector(".todoapp")})}();
//# sourceMappingURL=app.js.map

// ---- end verbatim copy of SP3:todomvc/architecture-examples/svelte/dist/app.js ----
sp3Options = { enter: "keydown", valueEvent: null };
sp3RunTodoMVC(document.body, ROUNDS, function (step) {
    mix(document.querySelectorAll(".toggle").length);
    mix(document.querySelectorAll(".completed").length);
    mix(document.querySelector(".todoapp").innerHTML);
}).then(function () { log("checksum " + __checksum); }, function (e) { log("ERROR " + e + "\n" + e.stack); });
