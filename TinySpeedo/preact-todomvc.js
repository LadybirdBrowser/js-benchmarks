// Speedometer 3 "TodoMVC-Preact-Complex-DOM" JavaScript: the SP3 dist bundle(s) of todomvc/architecture-examples/preact
var ROUNDS = 80;
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
fakeSetURL("index.html#/home");
document.body.innerHTML = "<section class=\"todoapp\" id=\"root\"></section><footer class=\"info\"><p>Click on input field to write your todo.</p></footer>";
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
// ---- begin verbatim copy of Speedometer SP3:todomvc/architecture-examples/preact/dist/app.js ----
!function(){"use strict";var e,t,n,_,o,l,r,i={},u=[],c=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;function s(e,t){for(var n in t)e[n]=t[n];return e}function a(e){var t=e.parentNode;t&&t.removeChild(e)}function f(t,n,_){var o,l,r,i={};for(r in n)"key"==r?o=n[r]:"ref"==r?l=n[r]:i[r]=n[r];if(arguments.length>2&&(i.children=arguments.length>3?e.call(arguments,2):_),"function"==typeof t&&null!=t.defaultProps)for(r in t.defaultProps)void 0===i[r]&&(i[r]=t.defaultProps[r]);return p(t,i,o,l,null)}function p(e,_,o,l,r){var i={type:e,props:_,key:o,ref:l,__k:null,__:null,__b:0,__e:null,__d:void 0,__c:null,__h:null,constructor:void 0,__v:null==r?++n:r};return null==r&&null!=t.vnode&&t.vnode(i),i}function d(e){return e.children}function h(e,t){this.props=e,this.context=t}function v(e,t){if(null==t)return e.__?v(e.__,e.__.__k.indexOf(e)+1):null;for(var n;t<e.__k.length;t++)if(null!=(n=e.__k[t])&&null!=n.__e)return n.__e;return"function"==typeof e.type?v(e):null}function m(e){var t,n;if(null!=(e=e.__)&&null!=e.__c){for(e.__e=e.__c.base=null,t=0;t<e.__k.length;t++)if(null!=(n=e.__k[t])&&null!=n.__e){e.__e=e.__c.base=n.__e;break}return m(e)}}function g(e){(!e.__d&&(e.__d=!0)&&_.push(e)&&!y.__r++||o!==t.debounceRendering)&&((o=t.debounceRendering)||l)(y)}function y(){var e,t,n,o,l,i,u,c;for(_.sort(r);e=_.shift();)e.__d&&(t=_.length,o=void 0,l=void 0,u=(i=(n=e).__v).__e,(c=n.__P)&&(o=[],(l=s({},i)).__v=i.__v+1,T(c,i,l,n.__n,void 0!==c.ownerSVGElement,null!=i.__h?[u]:null,o,null==u?v(i):u,i.__h),N(o,i),i.__e!=u&&m(i)),_.length>t&&_.sort(r));y.__r=0}function k(e,t,n,_,o,l,r,c,s,a){var f,h,m,g,y,k,x,w=_&&_.__k||u,E=w.length;for(n.__k=[],f=0;f<t.length;f++)if(null!=(g=n.__k[f]=null==(g=t[f])||"boolean"==typeof g||"function"==typeof g?null:"string"==typeof g||"number"==typeof g||"bigint"==typeof g?p(null,g,null,null,g):Array.isArray(g)?p(d,{children:g},null,null,null):g.__b>0?p(g.type,g.props,g.key,g.ref?g.ref:null,g.__v):g)){if(g.__=n,g.__b=n.__b+1,null===(m=w[f])||m&&g.key==m.key&&g.type===m.type)w[f]=void 0;else for(h=0;h<E;h++){if((m=w[h])&&g.key==m.key&&g.type===m.type){w[h]=void 0;break}m=null}T(e,g,m=m||i,o,l,r,c,s,a),y=g.__e,(h=g.ref)&&m.ref!=h&&(x||(x=[]),m.ref&&x.push(m.ref,null,g),x.push(h,g.__c||y,g)),null!=y?(null==k&&(k=y),"function"==typeof g.type&&g.__k===m.__k?g.__d=s=b(g,s,e):s=C(e,g,m,w,y,s),"function"==typeof n.type&&(n.__d=s)):s&&m.__e==s&&s.parentNode!=e&&(s=v(m))}for(n.__e=k,f=E;f--;)null!=w[f]&&("function"==typeof n.type&&null!=w[f].__e&&w[f].__e==n.__d&&(n.__d=S(_).nextSibling),P(w[f],w[f]));if(x)for(f=0;f<x.length;f++)D(x[f],x[++f],x[++f])}function b(e,t,n){for(var _,o=e.__k,l=0;o&&l<o.length;l++)(_=o[l])&&(_.__=e,t="function"==typeof _.type?b(_,t,n):C(n,_,_,o,_.__e,t));return t}function C(e,t,n,_,o,l){var r,i,u;if(void 0!==t.__d)r=t.__d,t.__d=void 0;else if(null==n||o!=l||null==o.parentNode)e:if(null==l||l.parentNode!==e)e.appendChild(o),r=null;else{for(i=l,u=0;(i=i.nextSibling)&&u<_.length;u+=1)if(i==o)break e;e.insertBefore(o,l),r=l}return void 0!==r?r:o.nextSibling}function S(e){var t,n,_;if(null==e.type||"string"==typeof e.type)return e.__e;if(e.__k)for(t=e.__k.length-1;t>=0;t--)if((n=e.__k[t])&&(_=S(n)))return _;return null}function x(e,t,n){"-"===t[0]?e.setProperty(t,null==n?"":n):e[t]=null==n?"":"number"!=typeof n||c.test(t)?n:n+"px"}function w(e,t,n,_,o){var l;e:if("style"===t)if("string"==typeof n)e.style.cssText=n;else{if("string"==typeof _&&(e.style.cssText=_=""),_)for(t in _)n&&t in n||x(e.style,t,"");if(n)for(t in n)_&&n[t]===_[t]||x(e.style,t,n[t])}else if("o"===t[0]&&"n"===t[1])l=t!==(t=t.replace(/Capture$/,"")),t=t.toLowerCase()in e?t.toLowerCase().slice(2):t.slice(2),e.l||(e.l={}),e.l[t+l]=n,n?_||e.addEventListener(t,l?H:E,l):e.removeEventListener(t,l?H:E,l);else if("dangerouslySetInnerHTML"!==t){if(o)t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if("width"!==t&&"height"!==t&&"href"!==t&&"list"!==t&&"form"!==t&&"tabIndex"!==t&&"download"!==t&&t in e)try{e[t]=null==n?"":n;break e}catch(e){}"function"==typeof n||(null==n||!1===n&&-1==t.indexOf("-")?e.removeAttribute(t):e.setAttribute(t,n))}}function E(e){return this.l[e.type+!1](t.event?t.event(e):e)}function H(e){return this.l[e.type+!0](t.event?t.event(e):e)}function T(e,n,_,o,l,r,i,u,c){var a,f,p,v,m,g,y,b,C,S,x,w,E,H,T,N=n.type;if(void 0!==n.constructor)return null;null!=_.__h&&(c=_.__h,u=n.__e=_.__e,n.__h=null,r=[u]),(a=t.__b)&&a(n);try{e:if("function"==typeof N){if(b=n.props,C=(a=N.contextType)&&o[a.__c],S=a?C?C.props.value:a.__:o,_.__c?y=(f=n.__c=_.__c).__=f.__E:("prototype"in N&&N.prototype.render?n.__c=f=new N(b,S):(n.__c=f=new h(b,S),f.constructor=N,f.render=U),C&&C.sub(f),f.props=b,f.state||(f.state={}),f.context=S,f.__n=o,p=f.__d=!0,f.__h=[],f._sb=[]),null==f.__s&&(f.__s=f.state),null!=N.getDerivedStateFromProps&&(f.__s==f.state&&(f.__s=s({},f.__s)),s(f.__s,N.getDerivedStateFromProps(b,f.__s))),v=f.props,m=f.state,f.__v=n,p)null==N.getDerivedStateFromProps&&null!=f.componentWillMount&&f.componentWillMount(),null!=f.componentDidMount&&f.__h.push(f.componentDidMount);else{if(null==N.getDerivedStateFromProps&&b!==v&&null!=f.componentWillReceiveProps&&f.componentWillReceiveProps(b,S),!f.__e&&null!=f.shouldComponentUpdate&&!1===f.shouldComponentUpdate(b,f.__s,S)||n.__v===_.__v){for(n.__v!==_.__v&&(f.props=b,f.state=f.__s,f.__d=!1),f.__e=!1,n.__e=_.__e,n.__k=_.__k,n.__k.forEach((function(e){e&&(e.__=n)})),x=0;x<f._sb.length;x++)f.__h.push(f._sb[x]);f._sb=[],f.__h.length&&i.push(f);break e}null!=f.componentWillUpdate&&f.componentWillUpdate(b,f.__s,S),null!=f.componentDidUpdate&&f.__h.push((function(){f.componentDidUpdate(v,m,g)}))}if(f.context=S,f.props=b,f.__P=e,w=t.__r,E=0,"prototype"in N&&N.prototype.render){for(f.state=f.__s,f.__d=!1,w&&w(n),a=f.render(f.props,f.state,f.context),H=0;H<f._sb.length;H++)f.__h.push(f._sb[H]);f._sb=[]}else do{f.__d=!1,w&&w(n),a=f.render(f.props,f.state,f.context),f.state=f.__s}while(f.__d&&++E<25);f.state=f.__s,null!=f.getChildContext&&(o=s(s({},o),f.getChildContext())),p||null==f.getSnapshotBeforeUpdate||(g=f.getSnapshotBeforeUpdate(v,m)),T=null!=a&&a.type===d&&null==a.key?a.props.children:a,k(e,Array.isArray(T)?T:[T],n,_,o,l,r,i,u,c),f.base=n.__e,n.__h=null,f.__h.length&&i.push(f),y&&(f.__E=f.__=null),f.__e=!1}else null==r&&n.__v===_.__v?(n.__k=_.__k,n.__e=_.__e):n.__e=A(_.__e,n,_,o,l,r,i,c);(a=t.diffed)&&a(n)}catch(e){n.__v=null,(c||null!=r)&&(n.__e=u,n.__h=!!c,r[r.indexOf(u)]=null),t.__e(e,n,_)}}function N(e,n){t.__c&&t.__c(n,e),e.some((function(n){try{e=n.__h,n.__h=[],e.some((function(e){e.call(n)}))}catch(e){t.__e(e,n.__v)}}))}function A(t,n,_,o,l,r,u,c){var s,f,p,d=_.props,h=n.props,m=n.type,g=0;if("svg"===m&&(l=!0),null!=r)for(;g<r.length;g++)if((s=r[g])&&"setAttribute"in s==!!m&&(m?s.localName===m:3===s.nodeType)){t=s,r[g]=null;break}if(null==t){if(null===m)return document.createTextNode(h);t=l?document.createElementNS("http://www.w3.org/2000/svg",m):document.createElement(m,h.is&&h),r=null,c=!1}if(null===m)d===h||c&&t.data===h||(t.data=h);else{if(r=r&&e.call(t.childNodes),f=(d=_.props||i).dangerouslySetInnerHTML,p=h.dangerouslySetInnerHTML,!c){if(null!=r)for(d={},g=0;g<t.attributes.length;g++)d[t.attributes[g].name]=t.attributes[g].value;(p||f)&&(p&&(f&&p.__html==f.__html||p.__html===t.innerHTML)||(t.innerHTML=p&&p.__html||""))}if(function(e,t,n,_,o){var l;for(l in n)"children"===l||"key"===l||l in t||w(e,l,null,n[l],_);for(l in t)o&&"function"!=typeof t[l]||"children"===l||"key"===l||"value"===l||"checked"===l||n[l]===t[l]||w(e,l,t[l],n[l],_)}(t,h,d,l,c),p)n.__k=[];else if(g=n.props.children,k(t,Array.isArray(g)?g:[g],n,_,o,l&&"foreignObject"!==m,r,u,r?r[0]:_.__k&&v(_,0),c),null!=r)for(g=r.length;g--;)null!=r[g]&&a(r[g]);c||("value"in h&&void 0!==(g=h.value)&&(g!==t.value||"progress"===m&&!g||"option"===m&&g!==d.value)&&w(t,"value",g,d.value,!1),"checked"in h&&void 0!==(g=h.checked)&&g!==t.checked&&w(t,"checked",g,d.checked,!1))}return t}function D(e,n,_){try{"function"==typeof e?e(n):e.current=n}catch(e){t.__e(e,_)}}function P(e,n,_){var o,l;if(t.unmount&&t.unmount(e),(o=e.ref)&&(o.current&&o.current!==e.__e||D(o,null,n)),null!=(o=e.__c)){if(o.componentWillUnmount)try{o.componentWillUnmount()}catch(e){t.__e(e,n)}o.base=o.__P=null,e.__c=void 0}if(o=e.__k)for(l=0;l<o.length;l++)o[l]&&P(o[l],n,_||"function"!=typeof e.type);_||null==e.__e||a(e.__e),e.__=e.__e=e.__d=void 0}function U(e,t,n){return this.constructor(e,n)}e=u.slice,t={__e:function(e,t,n,_){for(var o,l,r;t=t.__;)if((o=t.__c)&&!o.__)try{if((l=o.constructor)&&null!=l.getDerivedStateFromError&&(o.setState(l.getDerivedStateFromError(e)),r=o.__d),null!=o.componentDidCatch&&(o.componentDidCatch(e,_||{}),r=o.__d),r)return o.__E=o}catch(t){e=t}throw e}},n=0,h.prototype.setState=function(e,t){var n;n=null!=this.__s&&this.__s!==this.state?this.__s:this.__s=s({},this.state),"function"==typeof e&&(e=e(s({},n),this.props)),e&&s(n,e),null!=e&&this.__v&&(t&&this._sb.push(t),g(this))},h.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),g(this))},h.prototype.render=d,_=[],l="function"==typeof Promise?Promise.prototype.then.bind(Promise.resolve()):setTimeout,r=function(e,t){return e.__v.__b-t.__v.__b},y.__r=0;var F,I,W,L,M=0,V=[],R=[],O=t.__b,q=t.__r,j=t.diffed,B=t.__c,K=t.unmount;function $(e,n){t.__h&&t.__h(I,e,M||n),M=0;var _=I.__H||(I.__H={__:[],__h:[]});return e>=_.__.length&&_.__.push({__V:R}),_.__[e]}function G(e){return M=1,function(e,t,n){var _=$(F++,2);if(_.t=e,!_.__c&&(_.__=[n?n(t):ne(void 0,t),function(e){var t=_.__N?_.__N[0]:_.__[0],n=_.t(t,e);t!==n&&(_.__N=[n,_.__[1]],_.__c.setState({}))}],_.__c=I,!I.u)){var o=function(e,t,n){if(!_.__c.__H)return!0;var o=_.__c.__H.__.filter((function(e){return e.__c}));if(o.every((function(e){return!e.__N})))return!l||l.call(this,e,t,n);var r=!1;return o.forEach((function(e){if(e.__N){var t=e.__[0];e.__=e.__N,e.__N=void 0,t!==e.__[0]&&(r=!0)}})),!(!r&&_.__c.props===e)&&(!l||l.call(this,e,t,n))};I.u=!0;var l=I.shouldComponentUpdate,r=I.componentWillUpdate;I.componentWillUpdate=function(e,t,n){if(this.__e){var _=l;l=void 0,o(e,t,n),l=_}r&&r.call(this,e,t,n)},I.shouldComponentUpdate=o}return _.__N||_.__}(ne,e)}function z(e,n){var _=$(F++,3);!t.__s&&te(_.__H,n)&&(_.__=e,_.i=n,I.__H.__h.push(_))}function J(e){return M=5,function(e,t){var n=$(F++,7);return te(n.__H,t)?(n.__V=e(),n.i=t,n.__h=e,n.__V):n.__}((function(){return{current:e}}),[])}function Q(){for(var e;e=V.shift();)if(e.__P&&e.__H)try{e.__H.__h.forEach(Z),e.__H.__h.forEach(ee),e.__H.__h=[]}catch(n){e.__H.__h=[],t.__e(n,e.__v)}}t.__b=function(e){I=null,O&&O(e)},t.__r=function(e){q&&q(e),F=0;var t=(I=e.__c).__H;t&&(W===I?(t.__h=[],I.__h=[],t.__.forEach((function(e){e.__N&&(e.__=e.__N),e.__V=R,e.__N=e.i=void 0}))):(t.__h.forEach(Z),t.__h.forEach(ee),t.__h=[])),W=I},t.diffed=function(e){j&&j(e);var n=e.__c;n&&n.__H&&(n.__H.__h.length&&(1!==V.push(n)&&L===t.requestAnimationFrame||((L=t.requestAnimationFrame)||Y)(Q)),n.__H.__.forEach((function(e){e.i&&(e.__H=e.i),e.__V!==R&&(e.__=e.__V),e.i=void 0,e.__V=R}))),W=I=null},t.__c=function(e,n){n.some((function(e){try{e.__h.forEach(Z),e.__h=e.__h.filter((function(e){return!e.__||ee(e)}))}catch(_){n.some((function(e){e.__h&&(e.__h=[])})),n=[],t.__e(_,e.__v)}})),B&&B(e,n)},t.unmount=function(e){K&&K(e);var n,_=e.__c;_&&_.__H&&(_.__H.__.forEach((function(e){try{Z(e)}catch(e){n=e}})),_.__H=void 0,n&&t.__e(n,_.__v))};var X="function"==typeof requestAnimationFrame;function Y(e){var t,n=function(){clearTimeout(_),X&&cancelAnimationFrame(t),setTimeout(e)},_=setTimeout(n,100);X&&(t=requestAnimationFrame(n))}function Z(e){var t=I,n=e.__c;"function"==typeof n&&(e.__c=void 0,n()),I=t}function ee(e){var t=I;e.__c=e.__(),I=t}function te(e,t){return!e||e.length!==t.length||t.some((function(t,n){return t!==e[n]}))}function ne(e,t){return"function"==typeof t?t(e):t}let _e="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";function oe(){let e="",t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:21;for(;t--;)e+=_e[64*Math.random()|0];return e}let le=[];function re(e){let{onKeyDown:t}=e;return f("header",{class:"header"},f("h1",null,"todos"),f("input",{class:"new-todo",placeholder:"What needs to be done?",onKeyDown:t,autoFocus:!0}))}var ie,ue={},ce={get exports(){return ue},set exports(e){ue=e}};
/*!
    	Copyright (c) 2018 Jed Watson.
    	Licensed under the MIT License (MIT), see
    	http://jedwatson.github.io/classnames
    */
ie=ce,function(){var e={}.hasOwnProperty;function t(){for(var n=[],_=0;_<arguments.length;_++){var o=arguments[_];if(o){var l=typeof o;if("string"===l||"number"===l)n.push(o);else if(Array.isArray(o)){if(o.length){var r=t.apply(null,o);r&&n.push(r)}}else if("object"===l){if(o.toString!==Object.prototype.toString&&!o.toString.toString().includes("[native code]")){n.push(o.toString());continue}for(var i in o)e.call(o,i)&&o[i]&&n.push(i)}}}return n.join(" ")}ie.exports?(t.default=t,ie.exports=t):window.classNames=t}();var se=ue;function ae(e){let{onSave:t,onRemove:n,onToggle:_,todo:o,index:l}=e;const[r,i]=G(!1),u=J(null);function c(e){const _=e.target.value.trim();_?(t(o,_),i(!1)):n(o)}return z((()=>{u.current&&(u.current.focus(),u.current.setSelectionRange(u.current.value.length,u.current.value.length))}),[r]),f("li",{class:se({completed:o.completed,editing:r}),"data-priority":4-l%5},f("div",{class:"view"},f("input",{class:"toggle",type:"checkbox",checked:o.completed,onChange:function(e){_(o),e.preventDefault()}}),f("label",{onDblClick:function(){i(!0)}},o.title),f("button",{class:"destroy",onClick:function(){n(o)}})),r?f("div",{class:"input-container"},f("input",{class:"edit",id:"edit-todo-input",ref:u,onBlur:c,onKeyDown:function(e){"Escape"===e.key?i(!1):"Enter"===e.key&&c(e)},defaultValue:o.title}),f("label",{class:"visually-hidden",htmlFor:"edit-todo-input"},"Edit Todo Input"," ")):null)}const fe={all:e=>!0,active:e=>!e.completed,completed:e=>e.completed};function pe(e){let{onChange:t,onToggle:n,onRemove:_,onSave:o,todos:l,route:r}=e;const i=l.filter(fe[r]);return f("main",{class:"main"},f("div",{class:"toggle-all-container"},f("input",{class:"toggle-all",type:"checkbox",id:"toggle-all",checked:0===l.filter(fe.active).length,onChange:t}),f("label",{class:"toggle-all-label",htmlFor:"toggle-all"},"Toggle All Input")),f("ul",{class:"todo-list show-priority"},i.map(((e,t)=>f(ae,{key:e.id,todo:e,onToggle:n,onRemove:_,onSave:o,index:t})))))}function de(e){let{todos:t,route:n,onClearCompleted:_}=e;const o=t.filter((e=>!e.completed)).length,l=t.length-o;return f("footer",{class:"footer"},f("span",{class:"todo-count"},`${o} ${1===o?"item":"items"} left!`),f("ul",{class:"filters"},f("li",null,f("a",{href:"#/",class:se({selected:"all"===n})},"All"))," ",f("li",null,f("a",{href:"#/active",class:se({selected:"active"===n})},"Active"))," ",f("li",null,f("a",{href:"#/completed",class:se({selected:"completed"===n})},"Completed"))),l>0&&f("button",{class:"clear-completed",onClick:_},"Clear completed"))}const he=()=>{let e=String(location.hash||"").split("/").pop();return fe[e]||(e="all"),e};!function(n,_,o){var l,r,u;t.__&&t.__(n,_),r=(l="function"==typeof o)?null:o&&o.__k||_.__k,u=[],T(_,n=(!l&&o||_).__k=f(d,null,[n]),r||i,i,void 0!==_.ownerSVGElement,!l&&o?[o]:r?null:_.firstChild?e.call(_.childNodes):null,u,!l&&o?o:r?r.__e:_.firstChild,l),N(u,n)}(f((function(){const[,e]=G(Date.now()),[t,n]=G("all"),_=function(e){const t=[e];function n(){t.forEach((e=>e()))}return{addItem:function(e){le=le.concat({id:oe(),title:e,completed:!1}),n()},toggleAll:function(e){le=le.map((t=>({...t,completed:e}))),n()},toggleItem:function(e){le=le.map((t=>t!==e?t:{...t,completed:!t.completed})),n()},removeItem:function(e){le=le.filter((t=>t!==e)),n()},updateItem:function(e,t){le=le.map((n=>n!==e?n:{...n,title:t})),n()},clearCompleted:function(){le=le.filter((e=>!e.completed)),n()},getTodos:function(){return[...le]}}}((function(){e(Date.now())}));return z((()=>{function e(){n(he())}addEventListener("hashchange",e),e()}),[]),f(d,null,f(re,{onKeyDown:function(e){if("Enter"===e.key){const t=e.target.value.trim();t&&(_.addItem(t),e.target.value="")}}}),_.getTodos().length>0?f(d,null,f(pe,{todos:_.getTodos(),route:t,onChange:function(e){_.toggleAll(e.target.checked)},onToggle:_.toggleItem,onRemove:_.removeItem,onSave:_.updateItem}),f(de,{todos:_.getTodos(),route:t,onClearCompleted:_.clearCompleted})):null)}),null),document.querySelector(".todoapp"))}();
//# sourceMappingURL=app.js.map

// ---- end verbatim copy of SP3:todomvc/architecture-examples/preact/dist/app.js ----
sp3Options = { enter: "keydown", valueEvent: null };
sp3RunTodoMVC(document.body, ROUNDS, function (step) {
    mix(document.querySelectorAll(".toggle").length);
    mix(document.querySelectorAll(".completed").length);
    mix(document.querySelector(".todoapp").innerHTML);
}).then(function () { log("checksum " + __checksum); }, function (e) { log("ERROR " + e + "\n" + e.stack); });
