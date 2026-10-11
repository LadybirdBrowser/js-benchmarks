// Speedometer 3 "TodoMVC-Lit-Complex-DOM" JavaScript: Lit 2 and the SP3 Lit TodoMVC app
// (todomvc/architecture-examples/lit/dist/index.js, a module script, verbatim and wrapped in a
// function) using custom elements and shadow roots of a plain-object DOM, driven by the SP3 Lit
// steps (queries go through shadow roots).
var ROUNDS = 80;
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
document.body.innerHTML = '<todo-app></todo-app><footer class="info"><p>Double-click to edit a todo</p></footer>';
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
(function () {
"use strict";
// ---- begin verbatim copy of Speedometer SP3:todomvc/architecture-examples/lit/dist/index.js (import/export syntax removed) ----
function t(t,e,i,o){var s,n=arguments.length,r=n<3?e:null===o?o=Object.getOwnPropertyDescriptor(e,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(t,e,i,o);else for(var l=t.length-1;l>=0;l--)(s=t[l])&&(r=(n<3?s(r):n>3?s(e,i,r):s(e,i))||r);return n>3&&r&&Object.defineProperty(e,i,r),r
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */}const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),s=new WeakMap;class n{constructor(t,e,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=s.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&s.set(e,t))}return t}toString(){return this.cssText}}const r=t=>new n("string"==typeof t?t:t+"",void 0,o),l=(t,...e)=>{const i=1===t.length?t[0]:e.reduce(((e,i,o)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[o+1]),t[0]);return new n(i,t,o)},a=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return r(e)})(t):t
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */,d=globalThis,h=d.trustedTypes,c=h?h.emptyScript:"",p=d.reactiveElementPolyfillSupport,u={toAttribute(t,e){switch(e){case Boolean:t=t?c:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},g=(t,e)=>e!==t&&(e==e||t==t),f={attribute:!0,type:String,converter:u,reflect:!1,hasChanged:g},m="finalized";class $ extends HTMLElement{static addInitializer(t){this.finalize(),(this.i??=[]).push(t)}static get observedAttributes(){this.finalize();const t=[];for(const[e,i]of this.elementProperties){const o=this._$El(e,i);void 0!==o&&(this._$Eh.set(o,e),t.push(o))}return t}static createProperty(t,e=f){if(e.state&&(e.attribute=!1),this.finalize(),this.elementProperties.set(t,e),!e.noAccessor&&!this.prototype.hasOwnProperty(t)){const i=Symbol(),o=this.getPropertyDescriptor(t,i,e);void 0!==o&&Object.defineProperty(this.prototype,t,o)}}static getPropertyDescriptor(t,e,i){return{get(){return this[e]},set(o){const s=this[t];this[e]=o,this.requestUpdate(t,s,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)||f}static finalize(){if(this.hasOwnProperty(m))return!1;this[m]=!0;const t=Object.getPrototypeOf(this);if(t.finalize(),void 0!==t.i&&(this.i=[...t.i]),this.elementProperties=new Map(t.elementProperties),this._$Eh=new Map,this.hasOwnProperty("properties")){const t=this.properties,e=[...Object.getOwnPropertyNames(t),...Object.getOwnPropertySymbols(t)];for(const i of e)this.createProperty(i,t[i])}return this.elementStyles=this.finalizeStyles(this.styles),!0}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$El(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=new Map,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this.v()}v(){this._$E_=new Promise((t=>this.enableUpdating=t)),this._$AL=new Map,this._$Eg(),this.requestUpdate(),this.constructor.i?.forEach((t=>t(this)))}addController(t){(this._$ES??=[]).push(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$ES?.splice(this._$ES.indexOf(t)>>>0,1)}_$Eg(){const t=this.constructor.elementProperties;for(const e of t.keys())this.hasOwnProperty(e)&&(this._$Ep.set(e,this[e]),delete this[e])}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,o)=>{if(i)t.adoptedStyleSheets=o.map((t=>t instanceof CSSStyleSheet?t:t.styleSheet));else for(const i of o){const o=document.createElement("style"),s=e.litNonce;void 0!==s&&o.setAttribute("nonce",s),o.textContent=i.cssText,t.appendChild(o)}})(t,this.constructor.elementStyles),t}connectedCallback(){void 0===this.renderRoot&&(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),this._$ES?.forEach((t=>t.hostConnected?.()))}enableUpdating(t){}disconnectedCallback(){this._$ES?.forEach((t=>t.hostDisconnected?.()))}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$EO(t,e,i=f){const o=this.constructor._$El(t,i);if(void 0!==o&&!0===i.reflect){const s=(void 0!==i.converter?.toAttribute?i.converter:u).toAttribute(e,i.type);this._$Em=t,null==s?this.removeAttribute(o):this.setAttribute(o,s),this._$Em=null}}_$AK(t,e){const i=this.constructor,o=i._$Eh.get(t);if(void 0!==o&&this._$Em!==o){const t=i.getPropertyOptions(o),s="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:u;this._$Em=o,this[o]=s.fromAttribute(e,t.type),this._$Em=null}}requestUpdate(t,e,i){let o=!0;void 0!==t&&(((i=i||this.constructor.getPropertyOptions(t)).hasChanged||g)(this[t],e)?(this._$AL.has(t)||this._$AL.set(t,e),!0===i.reflect&&this._$Em!==t&&(void 0===this._$EC&&(this._$EC=new Map),this._$EC.set(t,i))):o=!1),!this.isUpdatePending&&o&&(this._$E_=this._$Ej())}async _$Ej(){this.isUpdatePending=!0;try{await this._$E_}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;this.hasUpdated,this._$Ep&&=this._$Ep.forEach(((t,e)=>this[e]=t));let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$ES?.forEach((t=>t.hostUpdate?.())),this.update(e)):this._$Ek()}catch(e){throw t=!1,this._$Ek(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$ES?.forEach((t=>t.hostUpdated?.())),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$Ek(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$E_}shouldUpdate(t){return!0}update(t){this._$EC&&=this._$EC.forEach(((t,e)=>this._$EO(e,this[e],t))),this._$Ek()}updated(t){}firstUpdated(t){}}$[m]=!0,$.elementProperties=new Map,$.elementStyles=[],$.shadowRootOptions={mode:"open"},p?.({ReactiveElement:$}),(d.reactiveElementVersions??=[]).push("2.0.0-pre.0");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const b=globalThis,v=void 0,y=b.trustedTypes,_=y?y.createPolicy("lit-html",{createHTML:t=>t}):void 0,x="$lit$",A=`lit$${(Math.random()+"").slice(9)}$`,w="?"+A,E=`<${w}>`,C=document,k=()=>C.createComment(""),S=t=>null===t||"object"!=typeof t&&"function"!=typeof t,L=Array.isArray,T=t=>L(t)||"function"==typeof t?.[Symbol.iterator],P="[ \t\n\f\r]",U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,N=/-->/g,H=/>/g,D=RegExp(`>|${P}(?:([^\\s"'>=/]+)(${P}*=${P}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),O=/'/g,M=/"/g,R=/^(?:script|style|textarea|title)$/i,z=(t=>(e,...i)=>({_$litType$:t,strings:e,values:i}))(1),I=Symbol.for("lit-noChange"),j=Symbol.for("lit-nothing"),B=new WeakMap,F=C.createTreeWalker(C,129),V=(t,e)=>{const i=t.length-1,o=[];let s,n=2===e?"<svg>":"",r=U;for(let e=0;e<i;e++){const i=t[e];let l,a,d=-1,h=0;for(;h<i.length&&(r.lastIndex=h,a=r.exec(i),null!==a);)h=r.lastIndex,r===U?"!--"===a[1]?r=N:void 0!==a[1]?r=H:void 0!==a[2]?(R.test(a[2])&&(s=RegExp("</"+a[2],"g")),r=D):void 0!==a[3]&&(r=D):r===D?">"===a[0]?(r=s??U,d=-1):void 0===a[1]?d=-2:(d=r.lastIndex-a[2].length,l=a[1],r=void 0===a[3]?D:'"'===a[3]?M:O):r===M||r===O?r=D:r===N||r===H?r=U:(r=D,s=void 0);const c=r===D&&t[e+1].startsWith("/>")?" ":"";n+=r===U?i+E:d>=0?(o.push(l),i.slice(0,d)+x+i.slice(d)+A+c):i+A+(-2===d?e:c)}const l=n+(t[i]||"<?>")+(2===e?"</svg>":"");if(!Array.isArray(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return[void 0!==_?_.createHTML(l):l,o]};class W{constructor({strings:t,_$litType$:e},i){let o;this.parts=[];let s=0,n=0;const r=t.length-1,l=this.parts,[a,d]=V(t,e);if(this.el=W.createElement(a,i),F.currentNode=this.el.content,2===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(o=F.nextNode())&&l.length<r;){if(1===o.nodeType){if(o.hasAttributes())for(const t of o.getAttributeNames())if(t.endsWith(x)){const e=d[n++],i=o.getAttribute(t).split(A),r=/([.?@])?(.*)/.exec(e);l.push({type:1,index:s,name:r[2],strings:i,ctor:"."===r[1]?Q:"?"===r[1]?G:"@"===r[1]?X:Z}),o.removeAttribute(t)}else t.startsWith(A)&&(l.push({type:6,index:s}),o.removeAttribute(t));if(R.test(o.tagName)){const t=o.textContent.split(A),e=t.length-1;if(e>0){o.textContent=y?y.emptyScript:"";for(let i=0;i<e;i++)o.append(t[i],k()),F.nextNode(),l.push({type:2,index:++s});o.append(t[e],k())}}}else if(8===o.nodeType)if(o.data===w)l.push({type:2,index:s});else{let t=-1;for(;-1!==(t=o.data.indexOf(A,t+1));)l.push({type:7,index:s}),t+=A.length-1}s++}v?.({kind:"template prep",template:this,clonableTemplate:this.el,parts:this.parts,strings:t})}static createElement(t,e){const i=C.createElement("template");return i.innerHTML=t,i}}function q(t,e,i=t,o){if(e===I)return e;let s=void 0!==o?i._$Co?.[o]:i._$Cl;const n=S(e)?void 0:e._$litDirective$;return s?.constructor!==n&&(s?._$AO?.(!1),void 0===n?s=void 0:(s=new n(t),s._$AT(t,i,o)),void 0!==o?(i._$Co??=[])[o]=s:i._$Cl=s),void 0!==s&&(e=q(t,s._$AS(t,e.values),s,o)),e}class K{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,o=(t?.creationScope??C).importNode(e,!0);F.currentNode=o;let s=F.nextNode(),n=0,r=0,l=i[0];for(;void 0!==l;){if(n===l.index){let e;2===l.type?e=new J(s,s.nextSibling,this,t):1===l.type?e=new l.ctor(s,l.name,l.strings,this,t):6===l.type&&(e=new Y(s,this,t)),this._$AV.push(e),l=i[++r]}n!==l?.index&&(s=F.nextNode(),n++)}return o}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(v?.({kind:"set part",part:i,value:t[e],valueIndex:e,values:t,templateInstance:this}),void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class J{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,o){this.type=2,this._$AH=j,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=q(this,t,e),S(t)?t===j||null==t||""===t?(this._$AH!==j&&(v?.({kind:"commit nothing to child",start:this._$AA,end:this._$AB,parent:this._$AM,options:this.options}),this._$AR()),this._$AH=j):t!==this._$AH&&t!==I&&this._(t):void 0!==t._$litType$?this.g(t):void 0!==t.nodeType?this.$(t):T(t)?this.T(t):this._(t)}k(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}$(t){this._$AH!==t&&(this._$AR(),v?.({kind:"commit node",start:this._$AA,parent:this._$AM,value:t,options:this.options}),this._$AH=this.k(t))}_(t){if(this._$AH!==j&&S(this._$AH)){const e=this._$AA.nextSibling;v?.({kind:"commit text",node:e,value:t,options:this.options}),e.data=t}else this.$(C.createTextNode(t)),v?.({kind:"commit text",node:this._$AA.nextSibling,value:t,options:this.options});this._$AH=t}g(t){const{values:e,_$litType$:i}=t,o="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=W.createElement(i.h,this.options)),i);if(this._$AH?._$AD===o)v?.({kind:"template updating",template:o,instance:this._$AH,parts:this._$AH._$AV,options:this.options,values:e}),this._$AH.p(e);else{const t=new K(o,this),i=t.u(this.options);v?.({kind:"template instantiated",template:o,instance:t,parts:t._$AV,options:this.options,fragment:i,values:e}),t.p(e),v?.({kind:"template instantiated and updated",template:o,instance:t,parts:t._$AV,options:this.options,fragment:i,values:e}),this.$(i),this._$AH=t}}_$AC(t){let e=B.get(t.strings);return void 0===e&&B.set(t.strings,e=new W(t)),e}T(t){L(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,o=0;for(const s of t)o===e.length?e.push(i=new J(this.k(k()),this.k(k()),this,this.options)):i=e[o],i._$AI(s),o++;o<e.length&&(this._$AR(i&&i._$AB.nextSibling,o),e.length=o)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t&&t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class Z{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,o,s){this.type=1,this._$AH=j,this._$AN=void 0,this.element=t,this.name=e,this._$AM=o,this.options=s,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=j}_$AI(t,e=this,i,o){const s=this.strings;let n=!1;if(void 0===s)t=q(this,t,e,0),n=!S(t)||t!==this._$AH&&t!==I,n&&(this._$AH=t);else{const o=t;let r,l;for(t=s[0],r=0;r<s.length-1;r++)l=q(this,o[i+r],e,r),l===I&&(l=this._$AH[r]),n||=!S(l)||l!==this._$AH[r],l===j?t=j:t!==j&&(t+=(l??"")+s[r+1]),this._$AH[r]=l}n&&!o&&this.j(t)}j(t){t===j?this.element.removeAttribute(this.name):(v?.({kind:"commit attribute",element:this.element,name:this.name,value:t,options:this.options}),this.element.setAttribute(this.name,t??""))}}class Q extends Z{constructor(){super(...arguments),this.type=3}j(t){v?.({kind:"commit property",element:this.element,name:this.name,value:t,options:this.options}),this.element[this.name]=t===j?void 0:t}}class G extends Z{constructor(){super(...arguments),this.type=4}j(t){v?.({kind:"commit boolean attribute",element:this.element,name:this.name,value:!(!t||t===j),options:this.options}),this.element.toggleAttribute(this.name,!!t&&t!==j)}}class X extends Z{constructor(t,e,i,o,s){super(t,e,i,o,s),this.type=5}_$AI(t,e=this){if((t=q(this,t,e,0)??j)===I)return;const i=this._$AH,o=t===j&&i!==j||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,s=t!==j&&(i===j||o);v?.({kind:"commit event listener",element:this.element,name:this.name,value:t,options:this.options,removeListener:o,addListener:s,oldListener:i}),o&&this.element.removeEventListener(this.name,this,i),s&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class Y{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){v?.({kind:"commit to element binding",element:this.element,value:t,options:this.options}),q(this,t)}}const tt={S:x,A,P:w,M:1,C:V,L:K,V:T,D:q,R:J,I:Z,H:G,N:X,U:Q,B:Y},et=b.litHtmlPolyfillSupport;et?.(W,J),(b.litHtmlVersions??=[]).push("3.0.0-pre.0");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
class it extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const o=i?.renderBefore??e;let s=o._$litPart$;if(v?.({kind:"begin render",id:0,value:t,container:e,options:i,part:s}),void 0===s){const t=i?.renderBefore??null;o._$litPart$=s=new J(e.insertBefore(k(),t),t,void 0,i??{})}return s._$AI(t),v?.({kind:"end render",id:0,value:t,container:e,options:i,part:s}),s})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return I}}it.finalized=!0,it._$litElement$=!0,globalThis.litElementHydrateSupport?.({LitElement:it});const ot=globalThis.litElementPolyfillSupport;ot?.({LitElement:it}),(globalThis.litElementVersions??=[]).push("4.0.0-pre.0");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const st=1,nt=2,rt=t=>(...e)=>({_$litDirective$:t,values:e});class lt{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const at=rt(class extends lt{constructor(t){if(super(t),t.type!==st||"class"!==t.name||t.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter((e=>t[e])).join(" ")+" "}update(t,[e]){if(void 0===this.it){this.it=new Set,void 0!==t.strings&&(this.st=new Set(t.strings.join(" ").split(/\s/).filter((t=>""!==t))));for(const t in e)e[t]&&!this.st?.has(t)&&this.it.add(t);return this.render(e)}const i=t.element.classList;for(const t of this.it)t in e||(i.remove(t),this.it.delete(t));for(const t in e){const o=!!e[t];o===this.it.has(t)||this.st?.has(t)||(o?(i.add(t),this.it.add(t)):(i.remove(t),this.it.delete(t)))}return I}}),dt=t=>e=>"function"==typeof e?((t,e)=>(customElements.define(t,e),e))(t,e):((t,e)=>{const{kind:i,elements:o}=e;return{kind:i,elements:o,finisher(e){customElements.define(t,e)}}})(t,e)
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */,ht=(t,e)=>"method"===e.kind&&e.descriptor&&!("value"in e.descriptor)?{...e,finisher(i){i.createProperty(e.key,t)}}:{kind:"field",key:Symbol(),placement:"own",descriptor:{},originalKey:e.key,initializer(){"function"==typeof e.initializer&&(this[e.key]=e.initializer.call(this))},finisher(i){i.createProperty(e.key,t)}},ct=(t,e,i)=>{e.constructor.createProperty(i,t)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pt(t){return(e,i)=>void 0!==i?ct(t,e,i):ht(t,e)
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */}function ut(t){return pt({...t,state:!0})}const gt=l`button{margin:0;padding:0;border:0;background:0 0;font-size:100%;vertical-align:baseline;font-family:inherit;font-weight:inherit;color:inherit;-webkit-appearance:none;-moz-appearance:none;appearance:none;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}.toggle-all:focus+label,.toggle:focus+label,:focus{box-shadow:0 0 2px 2px #cf7d7d;outline:0}.edit,.new-todo{position:relative;margin:0;width:100%;font-size:24px;font-family:inherit;font-weight:inherit;line-height:1.4em;border:0;color:inherit;padding:6px;border:1px solid #999;box-shadow:inset 0 -1px 5px 0 rgba(0,0,0,.2);box-sizing:border-box;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}.new-todo{padding:16px 16px 16px 60px;border:none;background:rgba(0,0,0,.003);box-shadow:inset 0 -2px 1px rgba(0,0,0,.03)}@media screen and (-webkit-min-device-pixel-ratio:0){.toggle-all,li .toggle{background:0 0}li .toggle{height:40px}}@media (max-width:430px){.footer{height:50px}.filters{bottom:10px}}`;function ft(t=21){let e="",i=t;for(;i--;)e+="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict"[64*Math.random()|0];return e}const mt=["all","active","completed"];class $t extends EventTarget{#t=[];#e=this.#i();get all(){return this.#t}get active(){return this.#t.filter((t=>!t.completed))}get completed(){return this.#t.filter((t=>t.completed))}get allCompleted(){return this.#t.every((t=>t.completed))}connect(){window.addEventListener("hashchange",this.#o)}disconnect(){window.removeEventListener("hashchange",this.#o)}filtered(){switch(this.#e){case"active":return this.active;case"completed":return this.completed}return this.all}#s(){this.dispatchEvent(new Event("change"))}add(t){this.#t.push({text:t,completed:!1,id:ft()}),this.#s()}delete(t){const e=this.#t.findIndex((e=>e.id===t));this.#t.splice(e>>>0,1),this.#s()}update(t){const e=this.#t.find((e=>e.id===t.id));void 0!==e&&(Object.assign(e,t),this.#s())}toggle(t){const e=this.#t.find((e=>e.id===t));void 0!==e&&(e.completed=!e.completed,this.#s())}toggleAll(){const t=this.#t.every((t=>t.completed));this.#t=this.#t.map((e=>({...e,completed:!t}))),this.#s()}clearCompleted(){this.#t=this.active,this.#s()}get filter(){return this.#e}set filter(t){this.#e=t,this.#s()}#o=()=>{this.filter=this.#i()};#i(){let t=/#\/(.*)/.exec(window.location.hash)?.[1];return e=t,mt.includes(e)?t:"all";var e}}
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{R:bt}=tt,vt=()=>document.createComment(""),yt=(t,e,i)=>{const o=t._$AA.parentNode,s=void 0===e?t._$AB:e._$AA;if(void 0===i){const e=o.insertBefore(vt(),s),n=o.insertBefore(vt(),s);i=new bt(e,n,t,t.options)}else{const e=i._$AB.nextSibling,n=i._$AM,r=n!==t;if(r){let e;i._$AQ?.(t),i._$AM=t,void 0!==i._$AP&&(e=t._$AU)!==n._$AU&&i._$AP(e)}if(e!==s||r){let t=i._$AA;for(;t!==e;){const e=t.nextSibling;o.insertBefore(t,s),t=e}}}return i},_t=(t,e,i=t)=>(t._$AI(e,i),t),xt={},At=(t,e=xt)=>t._$AH=e,wt=t=>{t._$AP?.(!1,!0);let e=t._$AA;const i=t._$AB.nextSibling;for(;e!==i;){const t=e.nextSibling;e.remove(),e=t}},Et=(t,e,i)=>{const o=new Map;for(let s=e;s<=i;s++)o.set(t[s],s);return o},Ct=rt(class extends lt{constructor(t){if(super(t),t.type!==nt)throw Error("repeat() can only be used in text expressions")}ht(t,e,i){let o;void 0===i?i=e:void 0!==e&&(o=e);const s=[],n=[];let r=0;for(const e of t)s[r]=o?o(e,r):r,n[r]=i(e,r),r++;return{values:n,keys:s}}render(t,e,i){return this.ht(t,e,i).values}update(t,[e,i,o]){const s=(t=>t._$AH)(t),{values:n,keys:r}=this.ht(e,i,o);if(!Array.isArray(s))return this.dt=r,n;const l=this.dt??=[],a=[];let d,h,c=0,p=s.length-1,u=0,g=n.length-1;for(;c<=p&&u<=g;)if(null===s[c])c++;else if(null===s[p])p--;else if(l[c]===r[u])a[u]=_t(s[c],n[u]),c++,u++;else if(l[p]===r[g])a[g]=_t(s[p],n[g]),p--,g--;else if(l[c]===r[g])a[g]=_t(s[c],n[g]),yt(t,a[g+1],s[c]),c++,g--;else if(l[p]===r[u])a[u]=_t(s[p],n[u]),yt(t,s[c],s[p]),p--,u++;else if(void 0===d&&(d=Et(r,u,g),h=Et(l,c,p)),d.has(l[c]))if(d.has(l[p])){const e=h.get(r[u]),i=void 0!==e?s[e]:null;if(null===i){const e=yt(t,s[c]);_t(e,n[u]),a[u]=e}else a[u]=_t(i,n[u]),yt(t,s[c],i),s[e]=null;u++}else wt(s[p]),p--;else wt(s[c]),c++;for(;u<=g;){const e=yt(t,a[g+1]);_t(e,n[u]),a[u++]=e}for(;c<=p;){const t=s[c++];null!==t&&wt(t)}return this.dt=r,At(t,a),I}});
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class kt extends Event{static{this.eventName="todo-add"}constructor(t){super(kt.eventName,{bubbles:!0,composed:!0}),this.text=t}}class St extends Event{static{this.eventName="todo-delete"}constructor(t){super(St.eventName,{bubbles:!0,composed:!0}),this.id=t}}class Lt extends Event{static{this.eventName="todo-edit"}constructor(t){super(Lt.eventName,{bubbles:!0,composed:!0}),this.edit=t}}class Tt extends Event{static{this.eventName="todo-toggle-all"}constructor(){super(Tt.eventName,{bubbles:!0,composed:!0})}}class Pt extends Event{static{this.eventName="clear-completed"}constructor(){super(Pt.eventName,{bubbles:!0,composed:!0})}}let Ut=class extends it{constructor(){super(...arguments),this.todoId="",this.text="",this.completed=!1,this.isEditing=!1}static{this.styles=[gt,l`:host{display:block}li{position:relative;font-size:24px}.editing{border-bottom:none;padding:0}.editing .edit{display:block;width:calc(100% - 43px);padding:12px 16px;margin:0 0 0 43px}.editing .view{display:none}.toggle{text-align:center;width:40px;height:auto;position:absolute;top:0;bottom:0;margin:auto 0;border:none;-webkit-appearance:none;appearance:none}.toggle{opacity:0}.toggle+label{background-image:url(data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23949494%22%20stroke-width%3D%223%22/%3E%3C/svg%3E);background-repeat:no-repeat;background-position:center left}.toggle:checked+label{background-image:url(data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%2359A193%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20fill%3D%22%233EA390%22%20d%3D%22M72%2025L42%2071%2027%2056l-4%204%2020%2020%2034-52z%22%2F%3E%3C%2Fsvg%3E)}label{word-break:break-all;padding:15px 15px 15px 60px;display:block;line-height:1.2;transition:color .4s;font-weight:400;color:#484848}.completed label{color:#949494;text-decoration:line-through}.destroy{display:none;position:absolute;top:0;right:10px;bottom:0;width:40px;height:40px;margin:auto 0;font-size:30px;color:#949494;transition:color .2s ease-out}.destroy:focus,.destroy:hover{color:#c18585}.destroy:after{content:"×";display:block;height:100%;line-height:1.1}li:hover .destroy{display:block}.edit{display:none}:host(:last-child) .editing{margin-bottom:-1px}`,window.extraTodoItemCssToAdopt?l`${r(window.extraTodoItemCssToAdopt)}`:l``]}render(){const t={todo:!0,completed:this.completed??!1,editing:this.isEditing};return z`<li class="${at(t)}"><div class="view"><input class="toggle" type="checkbox" .checked="${this.completed??!1}" @change="${this.#n}"> <label @dblclick="${this.#r}">${this.text}</label> <button @click="${this.#l}" class="destroy"></button></div><input class="edit" type="text" @change="${this.#a}" @keyup="${this.#d}" @blur="${this.#h}" .value="${this.text??""}"></li>`}#n(){this.dispatchEvent(new Lt({id:this.todoId,completed:!this.completed}))}#l(){this.dispatchEvent(new St(this.todoId))}#r(){this.isEditing=!0}#a(t){const e=t.target.value;this.dispatchEvent(new Lt({id:this.todoId,text:e})),this.isEditing=!1}#d(t){"escape"===t.key&&this.#h(t)}#h(t){t.target.value=this.text??""}};t([pt()],Ut.prototype,"todoId",void 0),t([pt()],Ut.prototype,"text",void 0),t([pt({type:Boolean})],Ut.prototype,"completed",void 0),t([ut()],Ut.prototype,"isEditing",void 0),Ut=t([dt("todo-item")],Ut);const Nt=t=>(e,i)=>{const o=Object.getOwnPropertyDescriptor(e,i),{get:s,set:n}=o,r={...o,set(e){const i=this.__updateOnEventListener??=()=>this.requestUpdate(),o=s.call(this);return o?.removeEventListener?.(t,i),e?.addEventListener?.(t,i),n.call(this,e)}};Object.defineProperty(e,i,r)};let Ht=class extends it{static{this.styles=[gt,l`:host{display:block}:focus{box-shadow:none!important}.todo-list{margin:0;padding:0;list-style:none}.toggle-all{width:1px;height:1px;border:none;opacity:0;position:absolute;right:100%;bottom:100%}.toggle-all+label{display:flex;align-items:center;justify-content:center;width:45px;height:65px;font-size:0;position:absolute;top:-65px;left:0}.toggle-all+label:before{content:"❯";display:inline-block;font-size:22px;color:#949494;padding:10px 27px 10px 27px;transform:rotate(90deg)}.toggle-all:checked+label:before{color:#484848}todo-item{border-bottom:1px solid #ededed}todo-item:last-child{border-bottom:none}`,window.extraTodoListCssToAdopt?l`${r(window.extraTodoListCssToAdopt)}`:l``]}render(){return z`${(this.todoList?.all.length??0)>0?z`<input @change="${this.#c}" id="toggle-all" type="checkbox" class="toggle-all" .checked="${this.todoList?.allCompleted??!1}"> <label for="toggle-all">Mark all as complete</label>`:j}<ul class="todo-list">${Ct(this.todoList?.filtered()??[],(t=>t.id),((t,e)=>z`<todo-item data-priority="${4-e%5}" .todoId="${t.id}" .text="${t.text}" .completed="${t.completed}"></todo-item>`))}</ul>`}#c(){this.dispatchEvent(new Tt)}};t([Nt("change"),pt({attribute:!1})],Ht.prototype,"todoList",void 0),Ht=t([dt("todo-list")],Ht);let Dt=class extends it{static{this.styles=[gt,l`:host{display:block}input::-webkit-input-placeholder{font-style:italic;font-weight:400;color:rgba(0,0,0,.4)}input::-moz-placeholder{font-style:italic;font-weight:400;color:rgba(0,0,0,.4)}input::input-placeholder{font-style:italic;font-weight:400;color:rgba(0,0,0,.4)}`]}render(){return z`<input @change="${this.#p}" @keydown="${this.#u}" class="new-todo" autofocus autocomplete="off" placeholder="What needs to be done?">`}#p(){const{value:t}=this.newTodoInput;t.length>0&&this.dispatchEvent(new kt(t)),this.newTodoInput.value=""}#u(t){"Enter"===t.key&&this.#p()}};t([Nt("change"),pt({attribute:!1})],Dt.prototype,"todoList",void 0),t([
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function(t,e){return(({finisher:t,descriptor:e})=>(i,o)=>{if(void 0===o){const o=i.originalKey??i.key,s=null!=e?{kind:"method",placement:"prototype",key:o,descriptor:e(i.key)}:{...i,key:o};return null!=t&&(s.finisher=function(e){t(e,o)}),s}{const s=i.constructor;void 0!==e&&Object.defineProperty(i,o,e(o)),t?.(s,o)}})({descriptor:i=>{const o={get(){return this.renderRoot?.querySelector(t)??null},enumerable:!0,configurable:!0};if(e){const e=Symbol();o.get=function(){return void 0===this[e]&&(this[e]=this.renderRoot?.querySelector(t)??null),this[e]}}return o}})}("input",!0)],Dt.prototype,"newTodoInput",void 0),Dt=t([dt("todo-form")],Dt);let Ot=class extends it{static{this.styles=[gt,l`:host{display:block;padding:10px 15px;height:20px;text-align:center;font-size:15px;border-top:1px solid #e6e6e6}:host:before{content:"";position:absolute;right:0;bottom:0;left:0;height:50px;overflow:hidden;box-shadow:0 1px 1px rgba(0,0,0,.2),0 8px 0 -3px #f6f6f6,0 9px 1px -3px rgba(0,0,0,.2),0 16px 0 -6px #f6f6f6,0 17px 2px -6px rgba(0,0,0,.2)}.todo-count{float:left;text-align:left}.todo-count strong{font-weight:300}.filters{margin:0;padding:0;list-style:none;position:absolute;right:0;left:0}li{display:inline}li a{color:inherit;margin:3px;padding:3px 7px;text-decoration:none;border:1px solid transparent;border-radius:3px}a:hover{border-color:#db7676}a.selected{border-color:#ce4646}.clear-completed,:host .clear-completed:active{float:right;position:relative;line-height:19px;text-decoration:none;cursor:pointer}.clear-completed:hover{text-decoration:underline}`]}render(){if(void 0===this.todoList||0===this.todoList.all.length)return j;const t=Mt({text:"All",filter:"all",selectedFilter:this.todoList?.filter}),e=Mt({text:"Active",filter:"active",selectedFilter:this.todoList?.filter}),i=Mt({text:"Completed",filter:"completed",selectedFilter:this.todoList?.filter});return z`<span class="todo-count"><strong>${this.todoList?.active.length}</strong> items left</span><ul class="filters"><li>${t}</li><li>${e}</li><li>${i}</li></ul>${(this.todoList?.completed.length??0)>0?z`<button @click="${this.#g}" class="clear-completed">Clear Completed</button>`:j}`}#g(){this.dispatchEvent(new Pt)}};function Mt({text:t,filter:e,selectedFilter:i}){return z`<a class="${at({selected:e===i})}" href="#/${e}">${t}</a>`}t([Nt("change"),pt({attribute:!1})],Ot.prototype,"todoList",void 0),Ot=t([dt("todo-footer")],Ot);let Rt=class extends it{static{this.styles=[gt,l`:host{display:block;background:#fff;margin:130px 0 40px 0;position:relative;box-shadow:0 2px 4px 0 rgba(0,0,0,.2),0 25px 50px 0 rgba(0,0,0,.1)}h1{position:absolute;top:-140px;width:100%;font-size:80px;font-weight:200;text-align:center;color:#b83f45;-webkit-text-rendering:optimizeLegibility;-moz-text-rendering:optimizeLegibility;text-rendering:optimizeLegibility}main{position:relative;z-index:2;border-top:1px solid #e6e6e6}.hidden{display:none}:focus{box-shadow:none!important}`]}constructor(){super(),this.todoList=new $t,this.#f=t=>{this.todoList.add(t.text)},this.#m=t=>{this.todoList.delete(t.id)},this.#$=t=>{this.todoList.update(t.edit)},this.#b=t=>{this.todoList.toggleAll()},this.#v=t=>{this.todoList.clearCompleted()},this.addEventListener(kt.eventName,this.#f),this.addEventListener(St.eventName,this.#m),this.addEventListener(Lt.eventName,this.#$),this.addEventListener(Tt.eventName,this.#b),this.addEventListener(Pt.eventName,this.#v)}connectedCallback(){super.connectedCallback(),this.todoList.connect()}disconnectedCallback(){super.disconnectedCallback(),this.todoList.disconnect()}render(){return z`<section><header class="header"><h1>todos</h1><todo-form .todoList="${this.todoList}"></todo-form></header><main class="main"><todo-list class="show-priority" .todoList="${this.todoList}"></todo-list></main><todo-footer class="${at({hidden:0===this.todoList.all.length})}" .todoList="${this.todoList}"></todo-footer></section>`}#f;#m;#$;#b;#v};t([Nt("change"),ut()],Rt.prototype,"todoList",void 0),Rt=t([dt("todo-app")],Rt);

// ---- end verbatim copy of SP3:todomvc/architecture-examples/lit/dist/index.js ----
})();
function shadowQuery(selector, path) {
    var root = document;
    for (var i = 0; i < path.length; ++i) root = root.querySelector(path[i]).shadowRoot;
    return root.querySelector(selector);
}
function shadowQueryAll(selector, path) {
    var root = document;
    for (var i = 0; i < path.length; ++i) root = root.querySelector(path[i]).shadowRoot;
    return root.querySelectorAll(selector);
}
async function settle() { for (var i = 0; i < 4; ++i) { await null; drainTasks(); } }
(async function () {
    await settle();
    var newTodo = shadowQuery(".new-todo", ["todo-app", "todo-form"]);
    newTodo.focus();
    for (var round = 0; round < ROUNDS; ++round) {
        for (var i = 0; i < numberOfItemsToAdd; i++) {
            newTodo.value = sp3TodoTexts[i % sp3TodoTexts.length];
            sp3Enter(newTodo, "keydown");
        }
        await settle();
        var todoItems = shadowQueryAll("todo-item", ["todo-app", "todo-list"]);
        if (todoItems.length !== 100) throw new Error("add failed: " + todoItems.length);
        for (var i = 0; i < numberOfItemsToAdd; i++)
            todoItems[i].shadowRoot.querySelector(".toggle").click();
        await settle();
        var completed = 0;
        todoItems = shadowQueryAll("todo-item", ["todo-app", "todo-list"]);
        for (var i = 0; i < todoItems.length; ++i) if (todoItems[i].shadowRoot.querySelector(".toggle").checked) ++completed;
        if (completed !== 100) throw new Error("toggle failed: " + completed);
        mix(document.querySelector("todo-app").shadowRoot.innerHTML);
        for (var i = numberOfItemsToAdd - 1; i >= 0; i--)
            todoItems[i].shadowRoot.querySelector(".destroy").click();
        await settle();
        if (shadowQueryAll("todo-item", ["todo-app", "todo-list"]).length !== 0) throw new Error("delete failed");
    }
})().then(function () { log("checksum " + __checksum); }, function (e) { log("ERROR " + e + "\n" + e.stack); });
