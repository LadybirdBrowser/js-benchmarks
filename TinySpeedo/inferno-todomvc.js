// Speedometer 2 "Inferno-TodoMVC": the SP2 app at todomvc/architecture-examples/inferno (scripts verbatim) running against a
// plain-object DOM, driven by the SP2 TodoMVC steps (resources/tests.js).
var ROUNDS = 10;
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
document.body.innerHTML = "<section id=\"app\" class=\"todoapp\"></section><footer class=\"info\"><p>Double-click to edit a todo</p></footer>";
// ---- begin parts:sp2-steps.js ----
// Speedometer 2 TodoMVC steps (resources/tests.js): add 100 items ("Something to do i"),
// click every .toggle, click every .destroy. Per-app variations: which event carries the
// value (input/change/none), which key event adds, and whether deletion re-queries .destroy.
var sp2Options = { valueEvent: "input", enter: "keydown", requery: false };
function triggerEnter(element, type) {
    var event = document.createEvent('Events');
    event.initEvent(type, true, true);
    event.keyCode = 13;
    event.which = 13;
    element.dispatchEvent(event);
}
async function sp2Settle() {
    await null; drainTasks(); await null; drainTasks();
}
async function sp2RunTodoMVC(rounds, afterStep) {
    for (var tries = 0; !document.querySelector(".new-todo"); ++tries) {
        if (tries === 200) throw new Error("app did not render .new-todo");
        await null;
        drainTasks();
    }
    var newTodo = document.querySelector(".new-todo");
    newTodo.focus();
    for (var r = 0; r < rounds; ++r) {
        for (var i = 0; i < 100; i++) {
            newTodo.value = 'Something to do ' + i;
            if (sp2Options.valueEvent)
                newTodo.dispatchEvent(new Event(sp2Options.valueEvent, { bubbles: true, cancelable: true }));
            triggerEnter(newTodo, sp2Options.enter);
        }
        await sp2Settle();
        var checkboxes = document.querySelectorAll('.toggle');
        if (checkboxes.length !== 100) throw new Error("add failed: " + checkboxes.length);
        if (afterStep) afterStep(0);
        for (var i = 0; i < checkboxes.length; i++)
            checkboxes[i].click();
        await sp2Settle();
        if (document.querySelectorAll('.completed').length !== 100) throw new Error("toggle failed: " + document.querySelectorAll('.completed').length);
        if (afterStep) afterStep(1);
        var deleteButtons = document.querySelectorAll('.destroy');
        for (var i = 0; i < deleteButtons.length; i++)
            (sp2Options.requery ? document.querySelector('.destroy') : deleteButtons[i]).click();
        await sp2Settle();
        if (document.querySelectorAll('.toggle').length !== 0) throw new Error("delete failed");
        if (afterStep) afterStep(2);
    }
}
// ---- end parts:sp2-steps.js ----
sp2Options = { valueEvent: "change", enter: "keydown", requery: true };
// ---- begin verbatim copy of Speedometer SP2:todomvc/architecture-examples/inferno/dist/bundle.js ----
/******/ (function(modules) { // webpackBootstrap
/******/    // The module cache
/******/    var installedModules = {};

/******/    // The require function
/******/    function __webpack_require__(moduleId) {

/******/        // Check if module is in cache
/******/        if(installedModules[moduleId])
/******/            return installedModules[moduleId].exports;

/******/        // Create a new module (and put it into the cache)
/******/        var module = installedModules[moduleId] = {
/******/            exports: {},
/******/            id: moduleId,
/******/            loaded: false
/******/        };

/******/        // Execute the module function
/******/        modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/        // Flag the module as loaded
/******/        module.loaded = true;

/******/        // Return the exports of the module
/******/        return module.exports;
/******/    }


/******/    // expose the modules object (__webpack_modules__)
/******/    __webpack_require__.m = modules;

/******/    // expose the module cache
/******/    __webpack_require__.c = installedModules;

/******/    // __webpack_public_path__
/******/    __webpack_require__.p = "dist";

/******/    // Load entry module and return exports
/******/    return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

    'use strict';

    var _inferno = __webpack_require__(1);

    var _inferno2 = _interopRequireDefault(_inferno);

    var _infernoComponent = __webpack_require__(3);

    var _infernoComponent2 = _interopRequireDefault(_infernoComponent);

    var _share = __webpack_require__(5);

    var _base = __webpack_require__(6);

    var _model = __webpack_require__(7);

    var _model2 = _interopRequireDefault(_model);

    var _item = __webpack_require__(8);

    var _item2 = _interopRequireDefault(_item);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var render = _inferno2.default.render;

    var model = new _model2.default();

    var App = function (_Component) {
        _inherits(App, _Component);

        function App() {
            var _temp, _this, _ret;

            _classCallCheck(this, App);

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            return _ret = (_temp = (_this = _possibleConstructorReturn(this, _Component.call.apply(_Component, [this].concat(args))), _this), _this.state = {
                route: (0, _share.read)(),
                todos: model.get()
            }, _this.update = function (arr) {
                return _this.setState({ todos: arr });
            }, _this.componentWillMount = function () {
                window.onhashchange = function () {
                    return _this.setState({ route: (0, _share.read)() });
                };
            }, _this.add = function (e) {
                if (e.which !== _share.ENTER) return;

                var val = e.target.value.trim();
                if (!val) return;

                e.target.value = '';
                _this.update(model.add(val));
            }, _this.edit = function (todo, val) {
                val = val.trim();
                if (val.length) {
                    _this.update(model.put(todo, { title: val, editing: 0 }));
                } else {
                    _this.remove(todo);
                }
            }, _this.focus = function (todo) {
                return _this.update(model.put(todo, { editing: 1 }));
            }, _this.blur = function (todo) {
                return _this.update(model.put(todo, { editing: 0 }));
            }, _this.remove = function (todo) {
                return _this.update(model.del(todo));
            }, _this.toggleOne = function (todo) {
                return _this.update(model.toggle(todo));
            }, _this.toggleAll = function (ev) {
                return _this.update(model.toggleAll(ev.target.checked));
            }, _this.clearCompleted = function () {
                return _this.update(model.clearCompleted());
            }, _temp), _possibleConstructorReturn(_this, _ret);
        }

        App.prototype.render = function render(_, _ref) {
            var _this2 = this;

            var todos = _ref.todos,
                route = _ref.route;

            var num = todos.length;
            var shown = todos.filter(_share.filters[route]);
            var numDone = todos.filter(_share.filters.completed).length;
            var numAct = num - numDone;

            return _inferno2.default.createVNode(2, 'div', null, [_inferno2.default.createVNode(16, _base.Head, {
                'onEnter': this.add
            }), num ? _inferno2.default.createVNode(2, 'section', {
                'className': 'main'
            }, [_inferno2.default.createVNode(512, 'input', {
                'className': 'toggle-all',
                'type': 'checkbox',
                'checked': numAct === 0
            }, null, {
                'onClick': this.toggleAll
            }), _inferno2.default.createVNode(2, 'ul', {
                'className': 'todo-list'
            }, shown.map(function (t) {
                return _inferno2.default.createVNode(16, _item2.default, {
                    'data': t,
                    'onBlur': function onBlur() {
                        return _this2.blur(t);
                    },
                    'onFocus': function onFocus() {
                        return _this2.focus(t);
                    },
                    'doDelete': function doDelete() {
                        return _this2.remove(t);
                    },
                    'doSave': function doSave(val) {
                        return _this2.edit(t, val);
                    },
                    'doToggle': function doToggle() {
                        return _this2.toggleOne(t);
                    }
                });
            }))]) : null, numAct || numDone ? _inferno2.default.createVNode(16, _base.Foot, {
                'onClear': this.clearCompleted,
                'left': numAct,
                'done': numDone,
                'route': route
            }) : null]);
        };

        return App;
    }(_infernoComponent2.default);

    render(_inferno2.default.createVNode(16, App), document.getElementById('app'));

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

    module.exports = __webpack_require__(2);


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

    /*!
     * inferno v1.0.0-beta32
     * (c) 2016 Dominic Gannaway
     * Released under the MIT License.
     */
    (function (global, factory) {
         true ? factory(exports) :
        typeof define === 'function' && define.amd ? define(['exports'], factory) :
        (factory((global.Inferno = global.Inferno || {})));
    }(this, (function (exports) { 'use strict';

    var NO_OP = '$NO_OP';
    var ERROR_MSG = 'a runtime error occured! Use Inferno in development environment to find the error.';
    var isBrowser = typeof window !== 'undefined' && window.document;

    // this is MUCH faster than .constructor === Array and instanceof Array
    // in Node 7 and the later versions of V8, slower in older versions though
    var isArray = Array.isArray;
    function isStatefulComponent(o) {
        return !isUndefined(o.prototype) && !isUndefined(o.prototype.render);
    }
    function isStringOrNumber(obj) {
        return isString(obj) || isNumber(obj);
    }
    function isNullOrUndef(obj) {
        return isUndefined(obj) || isNull(obj);
    }
    function isInvalid(obj) {
        return isNull(obj) || obj === false || isTrue(obj) || isUndefined(obj);
    }
    function isFunction(obj) {
        return typeof obj === 'function';
    }
    function isAttrAnEvent(attr) {
        return attr[0] === 'o' && attr[1] === 'n' && attr.length > 3;
    }
    function isString(obj) {
        return typeof obj === 'string';
    }
    function isNumber(obj) {
        return typeof obj === 'number';
    }
    function isNull(obj) {
        return obj === null;
    }
    function isTrue(obj) {
        return obj === true;
    }
    function isUndefined(obj) {
        return obj === undefined;
    }
    function isObject(o) {
        return typeof o === 'object';
    }
    function throwError(message) {
        if (!message) {
            message = ERROR_MSG;
        }
        throw new Error(("Inferno Error: " + message));
    }
    function warning(condition, message) {
        if (!condition) {
            console.error(message);
        }
    }
    var EMPTY_OBJ = {};

    function cloneVNode(vNodeToClone, props) {
        var _children = [], len = arguments.length - 2;
        while ( len-- > 0 ) _children[ len ] = arguments[ len + 2 ];

        var children = _children;
        if (_children.length > 0 && !isNull(_children[0])) {
            if (!props) {
                props = {};
            }
            if (_children.length === 1) {
                children = _children[0];
            }
            if (isUndefined(props.children)) {
                props.children = children;
            }
            else {
                if (isArray(children)) {
                    if (isArray(props.children)) {
                        props.children = props.children.concat(children);
                    }
                    else {
                        props.children = [props.children].concat(children);
                    }
                }
                else {
                    if (isArray(props.children)) {
                        props.children.push(children);
                    }
                    else {
                        props.children = [props.children];
                        props.children.push(children);
                    }
                }
            }
        }
        children = null;
        var flags = vNodeToClone.flags;
        var events = vNodeToClone.events || (props && props.events) || null;
        var newVNode;
        if (isArray(vNodeToClone)) {
            newVNode = vNodeToClone.map(function (vNode) { return cloneVNode(vNode); });
        }
        else if (isNullOrUndef(props) && isNullOrUndef(children)) {
            newVNode = Object.assign({}, vNodeToClone);
        }
        else {
            var key = !isNullOrUndef(vNodeToClone.key) ? vNodeToClone.key : props.key;
            var ref = vNodeToClone.ref || props.ref;
            if (flags & 28 /* Component */) {
                newVNode = createVNode(flags, vNodeToClone.type, Object.assign({}, vNodeToClone.props, props), null, events, key, ref, true);
            }
            else if (flags & 3970 /* Element */) {
                children = (props && props.children) || vNodeToClone.children;
                newVNode = createVNode(flags, vNodeToClone.type, Object.assign({}, vNodeToClone.props, props), children, events, key, ref, !children);
            }
        }
        if (flags & 28 /* Component */) {
            var newProps = newVNode.props;
            if (newProps) {
                var newChildren = newProps.children;
                // we need to also clone component children that are in props
                // as the children may also have been hoisted
                if (newChildren) {
                    if (isArray(newChildren)) {
                        for (var i = 0; i < newChildren.length; i++) {
                            var child = newChildren[i];
                            if (!isInvalid(child) && isVNode(child)) {
                                newProps.children[i] = cloneVNode(child);
                            }
                        }
                    }
                    else if (isVNode(newChildren)) {
                        newProps.children = cloneVNode(newChildren);
                    }
                }
            }
            newVNode.children = null;
        }
        newVNode.dom = null;
        return newVNode;
    }

    function _normalizeVNodes(nodes, result, i) {
        for (; i < nodes.length; i++) {
            var n = nodes[i];
            if (!isInvalid(n)) {
                if (Array.isArray(n)) {
                    _normalizeVNodes(n, result, 0);
                }
                else {
                    if (isStringOrNumber(n)) {
                        n = createTextVNode(n);
                    }
                    else if (isVNode(n) && n.dom) {
                        n = cloneVNode(n);
                    }
                    result.push(n);
                }
            }
        }
    }
    function normalizeVNodes(nodes) {
        var newNodes;
        // we assign $ which basically means we've flagged this array for future note
        // if it comes back again, we need to clone it, as people are using it
        // in an immutable way
        // tslint:disable
        if (nodes['$']) {
            nodes = nodes.slice();
        }
        else {
            nodes['$'] = true;
        }
        // tslint:enable
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (isInvalid(n)) {
                if (!newNodes) {
                    newNodes = nodes.slice(0, i);
                }
                newNodes.push(n);
            }
            else if (Array.isArray(n)) {
                var result = (newNodes || nodes).slice(0, i);
                _normalizeVNodes(nodes, result, i);
                return result;
            }
            else if (isStringOrNumber(n)) {
                if (!newNodes) {
                    newNodes = nodes.slice(0, i);
                }
                newNodes.push(createTextVNode(n));
            }
            else if (isVNode(n) && n.dom) {
                if (!newNodes) {
                    newNodes = nodes.slice(0, i);
                }
                newNodes.push(cloneVNode(n));
            }
            else if (newNodes) {
                newNodes.push(cloneVNode(n));
            }
        }
        return newNodes || nodes;
    }
    function normalizeChildren(children) {
        if (isArray(children)) {
            return normalizeVNodes(children);
        }
        else if (isVNode(children) && children.dom) {
            return cloneVNode(children);
        }
        return children;
    }
    function normalizeProps(vNode, props, children) {
        if (!(vNode.flags & 28 /* Component */) && isNullOrUndef(children) && !isNullOrUndef(props.children)) {
            vNode.children = props.children;
        }
        if (props.ref) {
            vNode.ref = props.ref;
        }
        if (props.events) {
            vNode.events = props.events;
        }
        if (!isNullOrUndef(props.key)) {
            vNode.key = props.key;
        }
    }
    function normalize(vNode) {
        var props = vNode.props;
        var children = vNode.children;
        // convert a wrongly created type back to element
        if (isString(vNode.type) && (vNode.flags & 28 /* Component */)) {
            vNode.flags = 3970 /* Element */;
        }
        if (props) {
            normalizeProps(vNode, props, children);
        }
        if (!isInvalid(children)) {
            vNode.children = normalizeChildren(children);
        }
        if (props && !isInvalid(props.children)) {
            props.children = normalizeChildren(props.children);
        }
    }
    function createVNode(flags, type, props, children, events, key, ref, noNormalise) {
        if (flags & 16 /* ComponentUnknown */) {
            flags = isStatefulComponent(type) ? 4 /* ComponentClass */ : 8 /* ComponentFunction */;
        }
        var vNode = {
            children: isUndefined(children) ? null : children,
            dom: null,
            events: events || null,
            flags: flags || 0,
            key: key === undefined ? null : key,
            props: props || null,
            ref: ref || null,
            type: type
        };
        if (!noNormalise) {
            normalize(vNode);
        }
        return vNode;
    }
    function createVoidVNode() {
        return createVNode(4096 /* Void */);
    }
    function createTextVNode(text) {
        return createVNode(1 /* Text */, null, null, text);
    }
    function isVNode(o) {
        return !!o.flags;
    }

    var devToolsStatus = {
        connected: false
    };
    var internalIncrementer = {
        id: 0
    };
    var componentIdMap = new Map();
    function getIncrementalId() {
        return internalIncrementer.id++;
    }
    function sendToDevTools(global, data) {
        var event = new CustomEvent('inferno.client.message', {
            detail: JSON.stringify(data, function (key, val) {
                if (!isNull(val) && !isUndefined(val)) {
                    if (key === '_vComponent' || !isUndefined(val.nodeType)) {
                        return;
                    }
                    else if (isFunction(val)) {
                        return ("$$f:" + (val.name));
                    }
                }
                return val;
            })
        });
        global.dispatchEvent(event);
    }
    function rerenderRoots() {
        for (var i = 0; i < roots.length; i++) {
            var root = roots[i];
            render(root.input, root.dom);
        }
    }
    function initDevToolsHooks(global) {
        global.__INFERNO_DEVTOOLS_GLOBAL_HOOK__ = roots;
        global.addEventListener('inferno.devtools.message', function (message) {
            var detail = JSON.parse(message.detail);
            var type = detail.type;
            switch (type) {
                case 'get-roots':
                    if (!devToolsStatus.connected) {
                        devToolsStatus.connected = true;
                        rerenderRoots();
                        sendRoots(global);
                    }
                    break;
                default:
                    // TODO:?
                    break;
            }
        });
    }
    function sendRoots(global) {
        sendToDevTools(global, { type: 'roots', data: roots });
    }

    var Lifecycle = function Lifecycle() {
        this.listeners = [];
        this.fastUnmount = true;
    };
    Lifecycle.prototype.addListener = function addListener (callback) {
        this.listeners.push(callback);
    };
    Lifecycle.prototype.trigger = function trigger () {
            var this$1 = this;

        for (var i = 0; i < this.listeners.length; i++) {
            this$1.listeners[i]();
        }
    };

    function constructDefaults(string, object, value) {
        /* eslint no-return-assign: 0 */
        string.split(',').forEach(function (i) { return object[i] = value; });
    }
    var xlinkNS = 'http://www.w3.org/1999/xlink';
    var xmlNS = 'http://www.w3.org/XML/1998/namespace';
    var svgNS = 'http://www.w3.org/2000/svg';
    var strictProps = {};
    var booleanProps = {};
    var namespaces = {};
    var isUnitlessNumber = {};
    var skipProps = {};
    var dehyphenProps = {
        textAnchor: 'text-anchor'
    };
    var delegatedProps = {};
    constructDefaults('xlink:href,xlink:arcrole,xlink:actuate,xlink:role,xlink:titlef,xlink:type', namespaces, xlinkNS);
    constructDefaults('xml:base,xml:lang,xml:space', namespaces, xmlNS);
    constructDefaults('volume,defaultValue,defaultChecked', strictProps, true);
    constructDefaults('children,ref,key,selected,checked,value,multiple', skipProps, true);
    constructDefaults('onClick,onMouseDown,onMouseUp,onMouseMove', delegatedProps, true);
    constructDefaults('muted,scoped,loop,open,checked,default,capture,disabled,readonly,required,autoplay,controls,seamless,reversed,allowfullscreen,novalidate', booleanProps, true);
    constructDefaults('animationIterationCount,borderImageOutset,borderImageSlice,borderImageWidth,boxFlex,boxFlexGroup,boxOrdinalGroup,columnCount,flex,flexGrow,flexPositive,flexShrink,flexNegative,flexOrder,gridRow,gridColumn,fontWeight,lineClamp,lineHeight,opacity,order,orphans,tabSize,widows,zIndex,zoom,fillOpacity,floodOpacity,stopOpacity,strokeDasharray,strokeDashoffset,strokeMiterlimit,strokeOpacity,strokeWidth,', isUnitlessNumber, true);

    var delegatedEvents = new Map();
    function handleEvent(name, lastEvent, nextEvent, dom) {
        var delegatedRoots = delegatedEvents.get(name);
        if (nextEvent) {
            if (!delegatedRoots) {
                delegatedRoots = { items: new Map(), count: 0, docEvent: null };
                var docEvent = attachEventToDocument(name, delegatedRoots);
                delegatedRoots.docEvent = docEvent;
                delegatedEvents.set(name, delegatedRoots);
            }
            if (!lastEvent) {
                delegatedRoots.count++;
            }
            delegatedRoots.items.set(dom, nextEvent);
        }
        else if (delegatedRoots) {
            if (delegatedRoots.items.has(dom)) {
                delegatedRoots.count--;
                delegatedRoots.items.delete(dom);
                if (delegatedRoots.count === 0) {
                    document.removeEventListener(normalizeEventName(name), delegatedRoots.docEvent);
                    delegatedEvents.delete(name);
                }
            }
        }
    }
    function dispatchEvent(event, dom, items, count, eventData) {
        var eventsToTrigger = items.get(dom);
        if (eventsToTrigger) {
            count--;
            // linkEvent object
            eventData.dom = dom;
            if (eventsToTrigger.event) {
                eventsToTrigger.event(eventsToTrigger.data, event);
            }
            else {
                eventsToTrigger(event);
            }
            if (eventData.stopPropagation) {
                return;
            }
        }
        var parentDom = dom.parentNode;
        if (count > 0 && (parentDom || parentDom === document.body)) {
            dispatchEvent(event, parentDom, items, count, eventData);
        }
    }
    function normalizeEventName(name) {
        return name.substr(2).toLowerCase();
    }
    function attachEventToDocument(name, delegatedRoots) {
        var docEvent = function (event) {
            var eventData = {
                stopPropagation: false,
                dom: document
            };
            // we have to do this as some browsers recycle the same Event between calls
            // so we need to make the property configurable
            Object.defineProperty(event, 'currentTarget', {
                configurable: true,
                get: function get() {
                    return eventData.dom;
                }
            });
            event.stopPropagation = function () {
                eventData.stopPropagation = true;
            };
            var count = delegatedRoots.count;
            if (count > 0) {
                dispatchEvent(event, event.target, delegatedRoots.items, count, eventData);
            }
        };
        document.addEventListener(normalizeEventName(name), docEvent);
        return docEvent;
    }

    function isCheckedType(type) {
        return type === 'checkbox' || type === 'radio';
    }
    function isControlled(props) {
        var usesChecked = isCheckedType(props.type);
        return usesChecked ? !isNullOrUndef(props.checked) : !isNullOrUndef(props.value);
    }
    function onTextInputChange(e) {
        var vNode = this.vNode;
        var events = vNode.events || EMPTY_OBJ;
        var dom = vNode.dom;
        if (events.onInput) {
            events.onInput(e);
        }
        else if (events.oninput) {
            events.oninput(e);
        }
        // the user may have updated the vNode from the above onInput events
        // so we need to get it from the context of `this` again
        applyValue(this.vNode, dom);
    }
    function onCheckboxChange(e) {
        var vNode = this.vNode;
        var events = vNode.events || EMPTY_OBJ;
        var dom = vNode.dom;
        if (events.onClick) {
            events.onClick(e);
        }
        else if (events.onclick) {
            events.onclick(e);
        }
        // the user may have updated the vNode from the above onClick events
        // so we need to get it from the context of `this` again
        applyValue(this.vNode, dom);
    }
    function handleAssociatedRadioInputs(name) {
        var inputs = document.querySelectorAll(("input[type=\"radio\"][name=\"" + name + "\"]"));
        [].forEach.call(inputs, function (dom) {
            var inputWrapper = wrappers.get(dom);
            if (inputWrapper) {
                var props = inputWrapper.vNode.props;
                if (props) {
                    dom.checked = inputWrapper.vNode.props.checked;
                }
            }
        });
    }
    function processInput(vNode, dom) {
        var props = vNode.props || EMPTY_OBJ;
        applyValue(vNode, dom);
        if (isControlled(props)) {
            var inputWrapper = wrappers.get(dom);
            if (!inputWrapper) {
                inputWrapper = {
                    vNode: vNode
                };
                if (isCheckedType(props.type)) {
                    dom.onclick = onCheckboxChange.bind(inputWrapper);
                    dom.onclick.wrapped = true;
                }
                else {
                    dom.oninput = onTextInputChange.bind(inputWrapper);
                    dom.oninput.wrapped = true;
                }
                wrappers.set(dom, inputWrapper);
            }
            inputWrapper.vNode = vNode;
        }
    }
    function applyValue(vNode, dom) {
        var props = vNode.props || EMPTY_OBJ;
        var type = props.type;
        var value = props.value;
        var checked = props.checked;
        if (type !== dom.type && type) {
            dom.type = type;
        }
        if (props.multiple !== dom.multiple) {
            dom.multiple = props.multiple;
        }
        if (isCheckedType(type)) {
            if (!isNullOrUndef(value)) {
                dom.value = value;
            }
            dom.checked = checked;
            if (type === 'radio' && props.name) {
                handleAssociatedRadioInputs(props.name);
            }
        }
        else {
            if (!isNullOrUndef(value) && dom.value !== value) {
                dom.value = value;
            }
            else if (!isNullOrUndef(checked)) {
                dom.checked = checked;
            }
        }
    }

    function isControlled$1(props) {
        return !isNullOrUndef(props.value);
    }
    function updateChildOption(vNode, value) {
        var props = vNode.props || EMPTY_OBJ;
        var dom = vNode.dom;
        // we do this as multiple may have changed
        dom.value = props.value;
        if ((isArray(value) && value.indexOf(props.value) !== -1) || props.value === value) {
            dom.selected = true;
        }
        else {
            dom.selected = props.selected || false;
        }
    }
    function onSelectChange(e) {
        var vNode = this.vNode;
        var events = vNode.events || EMPTY_OBJ;
        var dom = vNode.dom;
        if (events.onChange) {
            events.onChange(e);
        }
        else if (events.onchange) {
            events.onchange(e);
        }
        // the user may have updated the vNode from the above onChange events
        // so we need to get it from the context of `this` again
        applyValue$1(this.vNode, dom);
    }
    function processSelect(vNode, dom) {
        var props = vNode.props || EMPTY_OBJ;
        applyValue$1(vNode, dom);
        if (isControlled$1(props)) {
            var selectWrapper = wrappers.get(dom);
            if (!selectWrapper) {
                selectWrapper = {
                    vNode: vNode
                };
                dom.onchange = onSelectChange.bind(selectWrapper);
                dom.onchange.wrapped = true;
                wrappers.set(dom, selectWrapper);
            }
            selectWrapper.vNode = vNode;
        }
    }
    function applyValue$1(vNode, dom) {
        var props = vNode.props || EMPTY_OBJ;
        if (props.multiple !== dom.multiple) {
            dom.multiple = props.multiple;
        }
        var children = vNode.children;
        var value = props.value;
        if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
                updateChildOption(children[i], value);
            }
        }
        else if (isVNode(children)) {
            updateChildOption(children, value);
        }
    }

    function isControlled$2(props) {
        return !isNullOrUndef(props.value);
    }
    function onTextareaInputChange(e) {
        var vNode = this.vNode;
        var events = vNode.events || EMPTY_OBJ;
        var dom = vNode.dom;
        if (events.onInput) {
            events.onInput(e);
        }
        else if (events.oninput) {
            events.oninput(e);
        }
        // the user may have updated the vNode from the above onInput events
        // so we need to get it from the context of `this` again
        applyValue$2(this.vNode, dom);
    }
    function processTextarea(vNode, dom) {
        var props = vNode.props || EMPTY_OBJ;
        applyValue$2(vNode, dom);
        var textareaWrapper = wrappers.get(dom);
        if (isControlled$2(props)) {
            if (!textareaWrapper) {
                textareaWrapper = {
                    vNode: vNode
                };
                dom.oninput = onTextareaInputChange.bind(textareaWrapper);
                dom.oninput.wrapped = true;
                wrappers.set(dom, textareaWrapper);
            }
            textareaWrapper.vNode = vNode;
        }
    }
    function applyValue$2(vNode, dom) {
        var props = vNode.props || EMPTY_OBJ;
        var value = props.value;
        if (dom.value !== value) {
            dom.value = value;
        }
    }

    var wrappers = new Map();
    function processElement(flags, vNode, dom) {
        if (flags & 512 /* InputElement */) {
            processInput(vNode, dom);
        }
        else if (flags & 2048 /* SelectElement */) {
            processSelect(vNode, dom);
        }
        else if (flags & 1024 /* TextareaElement */) {
            processTextarea(vNode, dom);
        }
    }

    function unmount(vNode, parentDom, lifecycle, canRecycle, shallowUnmount, isRecycling) {
        var flags = vNode.flags;
        if (flags & 28 /* Component */) {
            unmountComponent(vNode, parentDom, lifecycle, canRecycle, shallowUnmount, isRecycling);
        }
        else if (flags & 3970 /* Element */) {
            unmountElement(vNode, parentDom, lifecycle, canRecycle, shallowUnmount, isRecycling);
        }
        else if (flags & (1 /* Text */ | 4096 /* Void */)) {
            unmountVoidOrText(vNode, parentDom);
        }
    }
    function unmountVoidOrText(vNode, parentDom) {
        if (parentDom) {
            removeChild(parentDom, vNode.dom);
        }
    }
    function unmountComponent(vNode, parentDom, lifecycle, canRecycle, shallowUnmount, isRecycling) {
        var instance = vNode.children;
        var flags = vNode.flags;
        var isStatefulComponent$$1 = flags & 4;
        var ref = vNode.ref;
        var dom = vNode.dom;
        if (!isRecycling) {
            if (!shallowUnmount) {
                if (isStatefulComponent$$1) {
                    var subLifecycle = instance._lifecycle;
                    if (!subLifecycle.fastUnmount) {
                        unmount(instance._lastInput, null, lifecycle, false, shallowUnmount, isRecycling);
                    }
                }
                else {
                    if (!lifecycle.fastUnmount) {
                        unmount(instance, null, lifecycle, false, shallowUnmount, isRecycling);
                    }
                }
            }
            if (isStatefulComponent$$1) {
                instance._ignoreSetState = true;
                instance.componentWillUnmount();
                if (ref && !isRecycling) {
                    ref(null);
                }
                instance._unmounted = true;
                findDOMNodeEnabled && componentToDOMNodeMap.delete(instance);
            }
            else if (!isNullOrUndef(ref)) {
                if (!isNullOrUndef(ref.onComponentWillUnmount)) {
                    ref.onComponentWillUnmount(dom);
                }
            }
        }
        if (parentDom) {
            var lastInput = instance._lastInput;
            if (isNullOrUndef(lastInput)) {
                lastInput = instance;
            }
            removeChild(parentDom, dom);
        }
        if (recyclingEnabled && !isStatefulComponent$$1 && (parentDom || canRecycle)) {
            poolComponent(vNode);
        }
    }
    function unmountElement(vNode, parentDom, lifecycle, canRecycle, shallowUnmount, isRecycling) {
        var dom = vNode.dom;
        var ref = vNode.ref;
        var events = vNode.events;
        if (!shallowUnmount && !lifecycle.fastUnmount) {
            if (ref && !isRecycling) {
                unmountRef(ref);
            }
            var children = vNode.children;
            if (!isNullOrUndef(children)) {
                unmountChildren$1(children, lifecycle, shallowUnmount, isRecycling);
            }
        }
        if (!isNull(events)) {
            for (var name in events) {
                // do not add a hasOwnProperty check here, it affects performance
                patchEvent(name, events[name], null, dom, lifecycle);
                events[name] = null;
            }
        }
        if (parentDom) {
            removeChild(parentDom, dom);
        }
        if (recyclingEnabled && (parentDom || canRecycle)) {
            poolElement(vNode);
        }
    }
    function unmountChildren$1(children, lifecycle, shallowUnmount, isRecycling) {
        if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (!isInvalid(child) && isObject(child)) {
                    unmount(child, null, lifecycle, false, shallowUnmount, isRecycling);
                }
            }
        }
        else if (isObject(children)) {
            unmount(children, null, lifecycle, false, shallowUnmount, isRecycling);
        }
    }
    function unmountRef(ref) {
        if (isFunction(ref)) {
            ref(null);
        }
        else {
            if (isInvalid(ref)) {
                return;
            }
            if (false) {
                throwError('string "refs" are not supported in Inferno 1.0. Use callback "refs" instead.');
            }
            throwError();
        }
    }

    function patch(lastVNode, nextVNode, parentDom, lifecycle, context, isSVG, isRecycling) {
        if (lastVNode !== nextVNode) {
            var lastFlags = lastVNode.flags;
            var nextFlags = nextVNode.flags;
            if (nextFlags & 28 /* Component */) {
                if (lastFlags & 28 /* Component */) {
                    patchComponent(lastVNode, nextVNode, parentDom, lifecycle, context, isSVG, nextFlags & 4 /* ComponentClass */, isRecycling);
                }
                else {
                    replaceVNode(parentDom, mountComponent(nextVNode, null, lifecycle, context, isSVG, nextFlags & 4 /* ComponentClass */), lastVNode, lifecycle, isRecycling);
                }
            }
            else if (nextFlags & 3970 /* Element */) {
                if (lastFlags & 3970 /* Element */) {
                    patchElement(lastVNode, nextVNode, parentDom, lifecycle, context, isSVG, isRecycling);
                }
                else {
                    replaceVNode(parentDom, mountElement(nextVNode, null, lifecycle, context, isSVG), lastVNode, lifecycle, isRecycling);
                }
            }
            else if (nextFlags & 1 /* Text */) {
                if (lastFlags & 1 /* Text */) {
                    patchText(lastVNode, nextVNode);
                }
                else {
                    replaceVNode(parentDom, mountText(nextVNode, null), lastVNode, lifecycle, isRecycling);
                }
            }
            else if (nextFlags & 4096 /* Void */) {
                if (lastFlags & 4096 /* Void */) {
                    patchVoid(lastVNode, nextVNode);
                }
                else {
                    replaceVNode(parentDom, mountVoid(nextVNode, null), lastVNode, lifecycle, isRecycling);
                }
            }
            else {
                // Error case: mount new one replacing old one
                replaceLastChildAndUnmount(lastVNode, nextVNode, parentDom, lifecycle, context, isSVG, isRecycling);
            }
        }
    }
    function unmountChildren(children, dom, lifecycle, isRecycling) {
        if (isVNode(children)) {
            unmount(children, dom, lifecycle, true, false, isRecycling);
        }
        else if (isArray(children)) {
            removeAllChildren(dom, children, lifecycle, false, isRecycling);
        }
        else {
            dom.textContent = '';
        }
    }
    function patchElement(lastVNode, nextVNode, parentDom, lifecycle, context, isSVG, isRecycling) {
        var nextTag = nextVNode.type;
        var lastTag = lastVNode.type;
        if (lastTag !== nextTag) {
            replaceWithNewNode(lastVNode, nextVNode, parentDom, lifecycle, context, isSVG, isRecycling);
        }
        else {
            var dom = lastVNode.dom;
            var lastProps = lastVNode.props;
            var nextProps = nextVNode.props;
            var lastChildren = lastVNode.children;
            var nextChildren = nextVNode.children;
            var lastFlags = lastVNode.flags;
            var nextFlags = nextVNode.flags;
            var lastRef = lastVNode.ref;
            var nextRef = nextVNode.ref;
            var lastEvents = lastVNode.events;
            var nextEvents = nextVNode.events;
            nextVNode.dom = dom;
            if (isSVG || (nextFlags & 128 /* SvgElement */)) {
                isSVG = true;
            }
            if (lastChildren !== nextChildren) {
                patchChildren(lastFlags, nextFlags, lastChildren, nextChildren, dom, lifecycle, context, isSVG, isRecycling);
            }
            if (!(nextFlags & 2 /* HtmlElement */)) {
                processElement(nextFlags, nextVNode, dom);
            }
            if (lastProps !== nextProps) {
                patchProps(lastProps, nextProps, dom, lifecycle, context, isSVG);
            }
            if (lastEvents !== nextEvents) {
                patchEvents(lastEvents, nextEvents, dom, lifecycle);
            }
            if (nextRef) {
                if (lastRef !== nextRef || isRecycling) {
                    mountRef(dom, nextRef, lifecycle);
                }
            }
        }
    }
    function patchChildren(lastFlags, nextFlags, lastChildren, nextChildren, dom, lifecycle, context, isSVG, isRecycling) {
        var patchArray = false;
        var patchKeyed = false;
        if (nextFlags & 64 /* HasNonKeyedChildren */) {
            patchArray = true;
        }
        else if ((lastFlags & 32 /* HasKeyedChildren */) && (nextFlags & 32 /* HasKeyedChildren */)) {
            patchKeyed = true;
            patchArray = true;
        }
        else if (isInvalid(nextChildren)) {
            unmountChildren(lastChildren, dom, lifecycle, isRecycling);
        }
        else if (isInvalid(lastChildren)) {
            if (isStringOrNumber(nextChildren)) {
                setTextContent(dom, nextChildren);
            }
            else {
                if (isArray(nextChildren)) {
                    mountArrayChildren(nextChildren, dom, lifecycle, context, isSVG);
                }
                else {
                    mount(nextChildren, dom, lifecycle, context, isSVG);
                }
            }
        }
        else if (isStringOrNumber(nextChildren)) {
            if (isStringOrNumber(lastChildren)) {
                updateTextContent(dom, nextChildren);
            }
            else {
                unmountChildren(lastChildren, dom, lifecycle, isRecycling);
                setTextContent(dom, nextChildren);
            }
        }
        else if (isArray(nextChildren)) {
            if (isArray(lastChildren)) {
                patchArray = true;
                if (isKeyed(lastChildren, nextChildren)) {
                    patchKeyed = true;
                }
            }
            else {
                unmountChildren(lastChildren, dom, lifecycle, isRecycling);
                mountArrayChildren(nextChildren, dom, lifecycle, context, isSVG);
            }
        }
        else if (isArray(lastChildren)) {
            removeAllChildren(dom, lastChildren, lifecycle, false, isRecycling);
            mount(nextChildren, dom, lifecycle, context, isSVG);
        }
        else if (isVNode(nextChildren)) {
            if (isVNode(lastChildren)) {
                patch(lastChildren, nextChildren, dom, lifecycle, context, isSVG, isRecycling);
            }
            else {
                unmountChildren(lastChildren, dom, lifecycle, isRecycling);
                mount(nextChildren, dom, lifecycle, context, isSVG);
            }
        }
        else if (isVNode(lastChildren)) {
        }
        else {
        }
        if (patchArray) {
            if (patchKeyed) {
                patchKeyedChildren(lastChildren, nextChildren, dom, lifecycle, context, isSVG, isRecycling);
            }
            else {
                patchNonKeyedChildren(lastChildren, nextChildren, dom, lifecycle, context, isSVG, isRecycling);
            }
        }
    }
    function patchComponent(lastVNode, nextVNode, parentDom, lifecycle, context, isSVG, isClass, isRecycling) {
        var lastType = lastVNode.type;
        var nextType = nextVNode.type;
        var nextProps = nextVNode.props || EMPTY_OBJ;
        var lastKey = lastVNode.key;
        var nextKey = nextVNode.key;
        if (lastType !== nextType) {
            if (isClass) {
                replaceWithNewNode(lastVNode, nextVNode, parentDom, lifecycle, context, isSVG, isRecycling);
            }
            else {
                var lastInput = lastVNode.children._lastInput || lastVNode.children;
                var nextInput = createStatelessComponentInput(nextVNode, nextType, nextProps, context);
                patch(lastInput, nextInput, parentDom, lifecycle, context, isSVG, isRecycling);
                var dom = nextVNode.dom = nextInput.dom;
                nextVNode.children = nextInput;
                mountStatelessComponentCallbacks(nextVNode.ref, dom, lifecycle);
                unmount(lastVNode, null, lifecycle, false, true, isRecycling);
            }
        }
        else {
            if (isClass) {
                if (lastKey !== nextKey) {
                    replaceWithNewNode(lastVNode, nextVNode, parentDom, lifecycle, context, isSVG, isRecycling);
                    return false;
                }
                var instance = lastVNode.children;
                if (instance._unmounted) {
                    if (isNull(parentDom)) {
                        return true;
                    }
                    replaceChild(parentDom, mountComponent(nextVNode, null, lifecycle, context, isSVG, nextVNode.flags & 4 /* ComponentClass */), lastVNode.dom);
                }
                else {
                    var defaultProps = nextType.defaultProps;
                    var lastProps = instance.props;
                    if (instance._devToolsStatus.connected && !instance._devToolsId) {
                        componentIdMap.set(instance._devToolsId = getIncrementalId(), instance);
                    }
                    lifecycle.fastUnmount = false;
                    if (!isUndefined(defaultProps)) {
                        copyPropsTo(lastProps, nextProps);
                        nextVNode.props = nextProps;
                    }
                    var lastState = instance.state;
                    var nextState = instance.state;
                    var childContext = instance.getChildContext();
                    nextVNode.children = instance;
                    instance._isSVG = isSVG;
                    if (!isNullOrUndef(childContext)) {
                        childContext = Object.assign({}, context, childContext);
                    }
                    else {
                        childContext = context;
                    }
                    var lastInput$1 = instance._lastInput;
                    var nextInput$1 = instance._updateComponent(lastState, nextState, lastProps, nextProps, context, false);
                    var didUpdate = true;
                    instance._childContext = childContext;
                    if (isInvalid(nextInput$1)) {
                        nextInput$1 = createVoidVNode();
                    }
                    else if (isArray(nextInput$1)) {
                        if (false) {
                            throwError('a valid Inferno VNode (or null) must be returned from a component render. You may have returned an array or an invalid object.');
                        }
                        throwError();
                    }
                    else if (nextInput$1 === NO_OP) {
                        nextInput$1 = lastInput$1;
                        didUpdate = false;
                    }
                    else if (isObject(nextInput$1) && nextInput$1.dom) {
                        nextInput$1 = cloneVNode(nextInput$1);
                    }
                    if (nextInput$1.flags & 28 /* Component */) {
                        nextInput$1.parentVNode = nextVNode;
                    }
                    else if (lastInput$1.flags & 28 /* Component */) {
                        lastInput$1.parentVNode = nextVNode;
                    }
                    instance._lastInput = nextInput$1;
                    instance._vNode = nextVNode;
                    if (didUpdate) {
                        var fastUnmount = lifecycle.fastUnmount;
                        var subLifecycle = instance._lifecycle;
                        lifecycle.fastUnmount = subLifecycle.fastUnmount;
                        patch(lastInput$1, nextInput$1, parentDom, lifecycle, childContext, isSVG, isRecycling);
                        subLifecycle.fastUnmount = lifecycle.unmount;
                        lifecycle.fastUnmount = fastUnmount;
                        instance.componentDidUpdate(lastProps, lastState);
                        findDOMNodeEnabled && componentToDOMNodeMap.set(instance, nextInput$1.dom);
                    }
                    nextVNode.dom = nextInput$1.dom;
                }
            }
            else {
                var shouldUpdate = true;
                var lastProps$1 = lastVNode.props;
                var nextHooks = nextVNode.ref;
                var nextHooksDefined = !isNullOrUndef(nextHooks);
                var lastInput$2 = lastVNode.children;
                var nextInput$2 = lastInput$2;
                nextVNode.dom = lastVNode.dom;
                nextVNode.children = lastInput$2;
                if (lastKey !== nextKey) {
                    shouldUpdate = true;
                }
                else {
                    if (nextHooksDefined && !isNullOrUndef(nextHooks.onComponentShouldUpdate)) {
                        shouldUpdate = nextHooks.onComponentShouldUpdate(lastProps$1, nextProps);
                    }
                }
                if (shouldUpdate !== false) {
                    if (nextHooksDefined && !isNullOrUndef(nextHooks.onComponentWillUpdate)) {
                        lifecycle.fastUnmount = false;
                        nextHooks.onComponentWillUpdate(lastProps$1, nextProps);
                    }
                    nextInput$2 = nextType(nextProps, context);
                    if (isInvalid(nextInput$2)) {
                        nextInput$2 = createVoidVNode();
                    }
                    else if (isArray(nextInput$2)) {
                        if (false) {
                            throwError('a valid Inferno VNode (or null) must be returned from a component render. You may have returned an array or an invalid object.');
                        }
                        throwError();
                    }
                    else if (isObject(nextInput$2) && nextInput$2.dom) {
                        nextInput$2 = cloneVNode(nextInput$2);
                    }
                    if (nextInput$2 !== NO_OP) {
                        patch(lastInput$2, nextInput$2, parentDom, lifecycle, context, isSVG, isRecycling);
                        nextVNode.children = nextInput$2;
                        if (nextHooksDefined && !isNullOrUndef(nextHooks.onComponentDidUpdate)) {
                            lifecycle.fastUnmount = false;
                            nextHooks.onComponentDidUpdate(lastProps$1, nextProps);
                        }
                        nextVNode.dom = nextInput$2.dom;
                    }
                }
                if (nextInput$2.flags & 28 /* Component */) {
                    nextInput$2.parentVNode = nextVNode;
                }
                else if (lastInput$2.flags & 28 /* Component */) {
                    lastInput$2.parentVNode = nextVNode;
                }
            }
        }
        return false;
    }
    function patchText(lastVNode, nextVNode) {
        var nextText = nextVNode.children;
        var dom = lastVNode.dom;
        nextVNode.dom = dom;
        if (lastVNode.children !== nextText) {
            dom.nodeValue = nextText;
        }
    }
    function patchVoid(lastVNode, nextVNode) {
        nextVNode.dom = lastVNode.dom;
    }
    function patchNonKeyedChildren(lastChildren, nextChildren, dom, lifecycle, context, isSVG, isRecycling) {
        var lastChildrenLength = lastChildren.length;
        var nextChildrenLength = nextChildren.length;
        var commonLength = lastChildrenLength > nextChildrenLength ? nextChildrenLength : lastChildrenLength;
        var i;
        var nextNode = null;
        var newNode;
        // Loop backwards so we can use insertBefore
        if (lastChildrenLength < nextChildrenLength) {
            for (i = nextChildrenLength - 1; i >= commonLength; i--) {
                var child = nextChildren[i];
                if (!isInvalid(child)) {
                    if (child.dom) {
                        nextChildren[i] = child = cloneVNode(child);
                    }
                    newNode = mount(child, null, lifecycle, context, isSVG);
                    insertOrAppend(dom, newNode, nextNode);
                    nextNode = newNode;
                }
            }
        }
        else if (nextChildrenLength === 0) {
            removeAllChildren(dom, lastChildren, lifecycle, false, isRecycling);
        }
        else if (lastChildrenLength > nextChildrenLength) {
            for (i = commonLength; i < lastChildrenLength; i++) {
                var child$1 = lastChildren[i];
                if (!isInvalid(child$1)) {
                    unmount(lastChildren[i], dom, lifecycle, false, false, isRecycling);
                }
            }
        }
        for (i = commonLength - 1; i >= 0; i--) {
            var lastChild = lastChildren[i];
            var nextChild = nextChildren[i];
            if (isInvalid(nextChild)) {
                if (!isInvalid(lastChild)) {
                    unmount(lastChild, dom, lifecycle, true, false, isRecycling);
                }
            }
            else {
                if (nextChild.dom) {
                    nextChildren[i] = nextChild = cloneVNode(nextChild);
                }
                if (isInvalid(lastChild)) {
                    newNode = mount(nextChild, null, lifecycle, context, isSVG);
                    insertOrAppend(dom, newNode, nextNode);
                    nextNode = newNode;
                }
                else {
                    patch(lastChild, nextChild, dom, lifecycle, context, isSVG, isRecycling);
                    nextNode = nextChild.dom;
                }
            }
        }
    }
    function patchKeyedChildren(a, b, dom, lifecycle, context, isSVG, isRecycling) {
        var aLength = a.length;
        var bLength = b.length;
        var aEnd = aLength - 1;
        var bEnd = bLength - 1;
        var aStart = 0;
        var bStart = 0;
        var i;
        var j;
        var aNode;
        var bNode;
        var nextNode;
        var nextPos;
        var node;
        if (aLength === 0) {
            if (bLength !== 0) {
                mountArrayChildren(b, dom, lifecycle, context, isSVG);
            }
            return;
        }
        else if (bLength === 0) {
            removeAllChildren(dom, a, lifecycle, false, isRecycling);
            return;
        }
        var aStartNode = a[aStart];
        var bStartNode = b[bStart];
        var aEndNode = a[aEnd];
        var bEndNode = b[bEnd];
        if (bStartNode.dom) {
            b[bStart] = bStartNode = cloneVNode(bStartNode);
        }
        if (bEndNode.dom) {
            b[bEnd] = bEndNode = cloneVNode(bEndNode);
        }
        // Step 1
        /* eslint no-constant-condition: 0 */
        outer: while (true) {
            // Sync nodes with the same key at the beginning.
            while (aStartNode.key === bStartNode.key) {
                patch(aStartNode, bStartNode, dom, lifecycle, context, isSVG, isRecycling);
                aStart++;
                bStart++;
                if (aStart > aEnd || bStart > bEnd) {
                    break outer;
                }
                aStartNode = a[aStart];
                bStartNode = b[bStart];
                if (bStartNode.dom) {
                    b[bStart] = bStartNode = cloneVNode(bStartNode);
                }
            }
            // Sync nodes with the same key at the end.
            while (aEndNode.key === bEndNode.key) {
                patch(aEndNode, bEndNode, dom, lifecycle, context, isSVG, isRecycling);
                aEnd--;
                bEnd--;
                if (aStart > aEnd || bStart > bEnd) {
                    break outer;
                }
                aEndNode = a[aEnd];
                bEndNode = b[bEnd];
                if (bEndNode.dom) {
                    b[bEnd] = bEndNode = cloneVNode(bEndNode);
                }
            }
            // Move and sync nodes from right to left.
            if (aEndNode.key === bStartNode.key) {
                patch(aEndNode, bStartNode, dom, lifecycle, context, isSVG, isRecycling);
                insertOrAppend(dom, bStartNode.dom, aStartNode.dom);
                aEnd--;
                bStart++;
                aEndNode = a[aEnd];
                bStartNode = b[bStart];
                if (bStartNode.dom) {
                    b[bStart] = bStartNode = cloneVNode(bStartNode);
                }
                continue;
            }
            // Move and sync nodes from left to right.
            if (aStartNode.key === bEndNode.key) {
                patch(aStartNode, bEndNode, dom, lifecycle, context, isSVG, isRecycling);
                nextPos = bEnd + 1;
                nextNode = nextPos < b.length ? b[nextPos].dom : null;
                insertOrAppend(dom, bEndNode.dom, nextNode);
                aStart++;
                bEnd--;
                aStartNode = a[aStart];
                bEndNode = b[bEnd];
                if (bEndNode.dom) {
                    b[bEnd] = bEndNode = cloneVNode(bEndNode);
                }
                continue;
            }
            break;
        }
        if (aStart > aEnd) {
            if (bStart <= bEnd) {
                nextPos = bEnd + 1;
                nextNode = nextPos < b.length ? b[nextPos].dom : null;
                while (bStart <= bEnd) {
                    node = b[bStart];
                    if (node.dom) {
                        b[bStart] = node = cloneVNode(node);
                    }
                    bStart++;
                    insertOrAppend(dom, mount(node, null, lifecycle, context, isSVG), nextNode);
                }
            }
        }
        else if (bStart > bEnd) {
            while (aStart <= aEnd) {
                unmount(a[aStart++], dom, lifecycle, false, false, isRecycling);
            }
        }
        else {
            aLength = aEnd - aStart + 1;
            bLength = bEnd - bStart + 1;
            var aNullable = a;
            var sources = new Array(bLength);
            // Mark all nodes as inserted.
            for (i = 0; i < bLength; i++) {
                sources[i] = -1;
            }
            var moved = false;
            var pos = 0;
            var patched = 0;
            if ((bLength <= 4) || (aLength * bLength <= 16)) {
                for (i = aStart; i <= aEnd; i++) {
                    aNode = a[i];
                    if (patched < bLength) {
                        for (j = bStart; j <= bEnd; j++) {
                            bNode = b[j];
                            if (aNode.key === bNode.key) {
                                sources[j - bStart] = i;
                                if (pos > j) {
                                    moved = true;
                                }
                                else {
                                    pos = j;
                                }
                                if (bNode.dom) {
                                    b[j] = bNode = cloneVNode(bNode);
                                }
                                patch(aNode, bNode, dom, lifecycle, context, isSVG, isRecycling);
                                patched++;
                                aNullable[i] = null;
                                break;
                            }
                        }
                    }
                }
            }
            else {
                var keyIndex = new Map();
                for (i = bStart; i <= bEnd; i++) {
                    node = b[i];
                    keyIndex.set(node.key, i);
                }
                for (i = aStart; i <= aEnd; i++) {
                    aNode = a[i];
                    if (patched < bLength) {
                        j = keyIndex.get(aNode.key);
                        if (!isUndefined(j)) {
                            bNode = b[j];
                            sources[j - bStart] = i;
                            if (pos > j) {
                                moved = true;
                            }
                            else {
                                pos = j;
                            }
                            if (bNode.dom) {
                                b[j] = bNode = cloneVNode(bNode);
                            }
                            patch(aNode, bNode, dom, lifecycle, context, isSVG, isRecycling);
                            patched++;
                            aNullable[i] = null;
                        }
                    }
                }
            }
            if (aLength === a.length && patched === 0) {
                removeAllChildren(dom, a, lifecycle, false, isRecycling);
                while (bStart < bLength) {
                    node = b[bStart];
                    if (node.dom) {
                        b[bStart] = node = cloneVNode(node);
                    }
                    bStart++;
                    insertOrAppend(dom, mount(node, null, lifecycle, context, isSVG), null);
                }
            }
            else {
                i = aLength - patched;
                while (i > 0) {
                    aNode = aNullable[aStart++];
                    if (!isNull(aNode)) {
                        unmount(aNode, dom, lifecycle, false, false, isRecycling);
                        i--;
                    }
                }
                if (moved) {
                    var seq = lis_algorithm(sources);
                    j = seq.length - 1;
                    for (i = bLength - 1; i >= 0; i--) {
                        if (sources[i] === -1) {
                            pos = i + bStart;
                            node = b[pos];
                            if (node.dom) {
                                b[pos] = node = cloneVNode(node);
                            }
                            nextPos = pos + 1;
                            nextNode = nextPos < b.length ? b[nextPos].dom : null;
                            insertOrAppend(dom, mount(node, dom, lifecycle, context, isSVG), nextNode);
                        }
                        else {
                            if (j < 0 || i !== seq[j]) {
                                pos = i + bStart;
                                node = b[pos];
                                nextPos = pos + 1;
                                nextNode = nextPos < b.length ? b[nextPos].dom : null;
                                insertOrAppend(dom, node.dom, nextNode);
                            }
                            else {
                                j--;
                            }
                        }
                    }
                }
                else if (patched !== bLength) {
                    for (i = bLength - 1; i >= 0; i--) {
                        if (sources[i] === -1) {
                            pos = i + bStart;
                            node = b[pos];
                            if (node.dom) {
                                b[pos] = node = cloneVNode(node);
                            }
                            nextPos = pos + 1;
                            nextNode = nextPos < b.length ? b[nextPos].dom : null;
                            insertOrAppend(dom, mount(node, null, lifecycle, context, isSVG), nextNode);
                        }
                    }
                }
            }
        }
    }
    // // https://en.wikipedia.org/wiki/Longest_increasing_subsequence
    function lis_algorithm(a) {
        var p = a.slice(0);
        var result = [];
        result.push(0);
        var i;
        var j;
        var u;
        var v;
        var c;
        for (i = 0; i < a.length; i++) {
            if (a[i] === -1) {
                continue;
            }
            j = result[result.length - 1];
            if (a[j] < a[i]) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = ((u + v) / 2) | 0;
                if (a[result[c]] < a[i]) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (a[i] < a[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
        u = result.length;
        v = result[u - 1];
        while (u-- > 0) {
            result[u] = v;
            v = p[v];
        }
        return result;
    }
    function patchProp(prop, lastValue, nextValue, dom, isSVG, lifecycle) {
        if (skipProps[prop]) {
            return;
        }
        if (booleanProps[prop]) {
            dom[prop] = nextValue ? true : false;
        }
        else if (strictProps[prop]) {
            var value = isNullOrUndef(nextValue) ? '' : nextValue;
            if (dom[prop] !== value) {
                dom[prop] = value;
            }
        }
        else if (isAttrAnEvent(prop)) {
            patchEvent(prop, lastValue, nextValue, dom, lifecycle);
        }
        else if (lastValue !== nextValue) {
            if (isNullOrUndef(nextValue)) {
                dom.removeAttribute(prop);
            }
            else if (prop === 'className') {
                if (isSVG) {
                    dom.setAttribute('class', nextValue);
                }
                else {
                    dom.className = nextValue;
                }
            }
            else if (prop === 'style') {
                patchStyle(lastValue, nextValue, dom);
            }
            else if (prop === 'dangerouslySetInnerHTML') {
                var lastHtml = lastValue && lastValue.__html;
                var nextHtml = nextValue && nextValue.__html;
                if (lastHtml !== nextHtml) {
                    if (!isNullOrUndef(nextHtml)) {
                        dom.innerHTML = nextHtml;
                    }
                }
            }
            else if (prop !== 'childrenType' && prop !== 'ref' && prop !== 'key') {
                var dehyphenProp = dehyphenProps[prop];
                var ns = namespaces[prop];
                if (ns) {
                    dom.setAttributeNS(ns, dehyphenProp || prop, nextValue);
                }
                else {
                    dom.setAttribute(dehyphenProp || prop, nextValue);
                }
            }
        }
    }
    function patchEvents(lastEvents, nextEvents, dom, lifecycle) {
        lastEvents = lastEvents || EMPTY_OBJ;
        nextEvents = nextEvents || EMPTY_OBJ;
        if (nextEvents !== EMPTY_OBJ) {
            for (var name in nextEvents) {
                // do not add a hasOwnProperty check here, it affects performance
                patchEvent(name, lastEvents[name], nextEvents[name], dom, lifecycle);
            }
        }
        if (lastEvents !== EMPTY_OBJ) {
            for (var name$1 in lastEvents) {
                // do not add a hasOwnProperty check here, it affects performance
                if (isNullOrUndef(nextEvents[name$1])) {
                    patchEvent(name$1, lastEvents[name$1], null, dom, lifecycle);
                }
            }
        }
    }
    function patchEvent(name, lastValue, nextValue, dom, lifecycle) {
        if (lastValue !== nextValue) {
            var nameLowerCase = name.toLowerCase();
            var domEvent = dom[nameLowerCase];
            // if the function is wrapped, that means it's been controlled by a wrapper
            if (domEvent && domEvent.wrapped) {
                return;
            }
            if (delegatedProps[name]) {
                lifecycle.fastUnmount = false;
                handleEvent(name, lastValue, nextValue, dom);
            }
            else {
                dom[nameLowerCase] = nextValue;
            }
        }
    }
    function patchProps(lastProps, nextProps, dom, lifecycle, context, isSVG) {
        lastProps = lastProps || EMPTY_OBJ;
        nextProps = nextProps || EMPTY_OBJ;
        if (nextProps !== EMPTY_OBJ) {
            for (var prop in nextProps) {
                // do not add a hasOwnProperty check here, it affects performance
                var nextValue = nextProps[prop];
                var lastValue = lastProps[prop];
                if (isNullOrUndef(nextValue)) {
                    removeProp(prop, dom);
                }
                else {
                    patchProp(prop, lastValue, nextValue, dom, isSVG, lifecycle);
                }
            }
        }
        if (lastProps !== EMPTY_OBJ) {
            for (var prop$1 in lastProps) {
                // do not add a hasOwnProperty check here, it affects performance
                if (isNullOrUndef(nextProps[prop$1])) {
                    removeProp(prop$1, dom);
                }
            }
        }
    }
    // We are assuming here that we come from patchProp routine
    // -nextAttrValue cannot be null or undefined
    function patchStyle(lastAttrValue, nextAttrValue, dom) {
        if (isString(nextAttrValue)) {
            dom.style.cssText = nextAttrValue;
            return;
        }
        for (var style in nextAttrValue) {
            // do not add a hasOwnProperty check here, it affects performance
            var value = nextAttrValue[style];
            if (isNumber(value) && !isUnitlessNumber[style]) {
                dom.style[style] = value + 'px';
            }
            else {
                dom.style[style] = value;
            }
        }
        if (!isNullOrUndef(lastAttrValue)) {
            for (var style$1 in lastAttrValue) {
                if (isNullOrUndef(nextAttrValue[style$1])) {
                    dom.style[style$1] = '';
                }
            }
        }
    }
    function removeProp(prop, dom) {
        if (prop === 'className') {
            dom.removeAttribute('class');
        }
        else if (prop === 'value') {
            dom.value = '';
        }
        else if (prop === 'style') {
            dom.style.cssText = null;
            dom.removeAttribute('style');
        }
        else if (delegatedProps[prop]) {
            handleEvent(prop, null, null, dom);
        }
        else {
            dom.removeAttribute(prop);
        }
    }

    var recyclingEnabled = true;
    var componentPools = new Map();
    var elementPools = new Map();
    function disableRecycling() {
        recyclingEnabled = false;
        componentPools.clear();
        elementPools.clear();
    }

    function recycleElement(vNode, lifecycle, context, isSVG) {
        var tag = vNode.type;
        var key = vNode.key;
        var pools = elementPools.get(tag);
        if (!isUndefined(pools)) {
            var pool = key === null ? pools.nonKeyed : pools.keyed.get(key);
            if (!isUndefined(pool)) {
                var recycledVNode = pool.pop();
                if (!isUndefined(recycledVNode)) {
                    patchElement(recycledVNode, vNode, null, lifecycle, context, isSVG, true);
                    return vNode.dom;
                }
            }
        }
        return null;
    }
    function poolElement(vNode) {
        var tag = vNode.type;
        var key = vNode.key;
        var pools = elementPools.get(tag);
        if (isUndefined(pools)) {
            pools = {
                nonKeyed: [],
                keyed: new Map()
            };
            elementPools.set(tag, pools);
        }
        if (isNull(key)) {
            pools.nonKeyed.push(vNode);
        }
        else {
            var pool = pools.keyed.get(key);
            if (isUndefined(pool)) {
                pool = [];
                pools.keyed.set(key, pool);
            }
            pool.push(vNode);
        }
    }
    function recycleComponent(vNode, lifecycle, context, isSVG) {
        var type = vNode.type;
        var key = vNode.key;
        var pools = componentPools.get(type);
        if (!isUndefined(pools)) {
            var pool = key === null ? pools.nonKeyed : pools.keyed.get(key);
            if (!isUndefined(pool)) {
                var recycledVNode = pool.pop();
                if (!isUndefined(recycledVNode)) {
                    var flags = vNode.flags;
                    var failed = patchComponent(recycledVNode, vNode, null, lifecycle, context, isSVG, flags & 4 /* ComponentClass */, true);
                    if (!failed) {
                        return vNode.dom;
                    }
                }
            }
        }
        return null;
    }
    function poolComponent(vNode) {
        var type = vNode.type;
        var key = vNode.key;
        var hooks = vNode.ref;
        var nonRecycleHooks = hooks && (hooks.onComponentWillMount ||
            hooks.onComponentWillUnmount ||
            hooks.onComponentDidMount ||
            hooks.onComponentWillUpdate ||
            hooks.onComponentDidUpdate);
        if (nonRecycleHooks) {
            return;
        }
        var pools = componentPools.get(type);
        if (isUndefined(pools)) {
            pools = {
                nonKeyed: [],
                keyed: new Map()
            };
            componentPools.set(type, pools);
        }
        if (isNull(key)) {
            pools.nonKeyed.push(vNode);
        }
        else {
            var pool = pools.keyed.get(key);
            if (isUndefined(pool)) {
                pool = [];
                pools.keyed.set(key, pool);
            }
            pool.push(vNode);
        }
    }

    function mount(vNode, parentDom, lifecycle, context, isSVG) {
        var flags = vNode.flags;
        if (flags & 3970 /* Element */) {
            return mountElement(vNode, parentDom, lifecycle, context, isSVG);
        }
        else if (flags & 28 /* Component */) {
            return mountComponent(vNode, parentDom, lifecycle, context, isSVG, flags & 4 /* ComponentClass */);
        }
        else if (flags & 4096 /* Void */) {
            return mountVoid(vNode, parentDom);
        }
        else if (flags & 1 /* Text */) {
            return mountText(vNode, parentDom);
        }
        else {
            if (false) {
                throwError(("mount() expects a valid VNode, instead it received an object with the type \"" + (typeof vNode) + "\"."));
            }
            throwError();
        }
    }
    function mountText(vNode, parentDom) {
        var dom = document.createTextNode(vNode.children);
        vNode.dom = dom;
        if (parentDom) {
            appendChild(parentDom, dom);
        }
        return dom;
    }
    function mountVoid(vNode, parentDom) {
        var dom = document.createTextNode('');
        vNode.dom = dom;
        if (parentDom) {
            appendChild(parentDom, dom);
        }
        return dom;
    }
    function mountElement(vNode, parentDom, lifecycle, context, isSVG) {
        if (recyclingEnabled) {
            var dom$1 = recycleElement(vNode, lifecycle, context, isSVG);
            if (!isNull(dom$1)) {
                if (!isNull(parentDom)) {
                    appendChild(parentDom, dom$1);
                }
                return dom$1;
            }
        }
        var tag = vNode.type;
        var flags = vNode.flags;
        if (isSVG || (flags & 128 /* SvgElement */)) {
            isSVG = true;
        }
        var dom = documentCreateElement(tag, isSVG);
        var children = vNode.children;
        var props = vNode.props;
        var events = vNode.events;
        var ref = vNode.ref;
        vNode.dom = dom;
        if (!isNull(children)) {
            if (isStringOrNumber(children)) {
                setTextContent(dom, children);
            }
            else if (isArray(children)) {
                mountArrayChildren(children, dom, lifecycle, context, isSVG);
            }
            else if (isVNode(children)) {
                mount(children, dom, lifecycle, context, isSVG);
            }
        }
        if (!(flags & 2 /* HtmlElement */)) {
            processElement(flags, vNode, dom);
        }
        if (!isNull(props)) {
            for (var prop in props) {
                // do not add a hasOwnProperty check here, it affects performance
                patchProp(prop, null, props[prop], dom, isSVG, lifecycle);
            }
        }
        if (!isNull(events)) {
            for (var name in events) {
                // do not add a hasOwnProperty check here, it affects performance
                patchEvent(name, null, events[name], dom, lifecycle);
            }
        }
        if (!isNull(ref)) {
            mountRef(dom, ref, lifecycle);
        }
        if (!isNull(parentDom)) {
            appendChild(parentDom, dom);
        }
        return dom;
    }
    function mountArrayChildren(children, dom, lifecycle, context, isSVG) {
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (!isInvalid(child)) {
                if (child.dom) {
                    children[i] = child = cloneVNode(child);
                }
                mount(children[i], dom, lifecycle, context, isSVG);
            }
        }
    }
    function mountComponent(vNode, parentDom, lifecycle, context, isSVG, isClass) {
        if (recyclingEnabled) {
            var dom$1 = recycleComponent(vNode, lifecycle, context, isSVG);
            if (!isNull(dom$1)) {
                if (!isNull(parentDom)) {
                    appendChild(parentDom, dom$1);
                }
                return dom$1;
            }
        }
        var type = vNode.type;
        var props = vNode.props || EMPTY_OBJ;
        var ref = vNode.ref;
        var dom;
        if (isClass) {
            var defaultProps = type.defaultProps;
            lifecycle.fastUnmount = false;
            if (!isUndefined(defaultProps)) {
                copyPropsTo(defaultProps, props);
                vNode.props = props;
            }
            var instance = createStatefulComponentInstance(vNode, type, props, context, isSVG, devToolsStatus);
            var input = instance._lastInput;
            var fastUnmount = lifecycle.fastUnmount;
            // we store the fastUnmount value, but we set it back to true on the lifecycle
            // we do this so we can determine if the component render has a fastUnmount or not
            lifecycle.fastUnmount = true;
            instance._vNode = vNode;
            vNode.dom = dom = mount(input, null, lifecycle, instance._childContext, isSVG);
            // we now create a lifecycle for this component and store the fastUnmount value
            var subLifecycle = instance._lifecycle = new Lifecycle();
            subLifecycle.fastUnmount = lifecycle.fastUnmount;
            // we then set the lifecycle fastUnmount value back to what it was before the mount
            lifecycle.fastUnmount = fastUnmount;
            if (!isNull(parentDom)) {
                appendChild(parentDom, dom);
            }
            mountStatefulComponentCallbacks(ref, instance, lifecycle);
            findDOMNodeEnabled && componentToDOMNodeMap.set(instance, dom);
            vNode.children = instance;
        }
        else {
            var input$1 = createStatelessComponentInput(vNode, type, props, context);
            vNode.dom = dom = mount(input$1, null, lifecycle, context, isSVG);
            vNode.children = input$1;
            mountStatelessComponentCallbacks(ref, dom, lifecycle);
            if (!isNull(parentDom)) {
                appendChild(parentDom, dom);
            }
        }
        return dom;
    }
    function mountStatefulComponentCallbacks(ref, instance, lifecycle) {
        if (ref) {
            if (isFunction(ref)) {
                ref(instance);
            }
            else {
                if (false) {
                    throwError('string "refs" are not supported in Inferno 1.0. Use callback "refs" instead.');
                }
                throwError();
            }
        }
        if (!isNull(instance.componentDidMount)) {
            lifecycle.addListener(function () {
                instance.componentDidMount();
            });
        }
    }
    function mountStatelessComponentCallbacks(ref, dom, lifecycle) {
        if (ref) {
            if (!isNullOrUndef(ref.onComponentWillMount)) {
                lifecycle.fastUnmount = false;
                ref.onComponentWillMount();
            }
            if (!isNullOrUndef(ref.onComponentDidMount)) {
                lifecycle.fastUnmount = false;
                lifecycle.addListener(function () { return ref.onComponentDidMount(dom); });
            }
        }
    }
    function mountRef(dom, value, lifecycle) {
        if (isFunction(value)) {
            lifecycle.fastUnmount = false;
            lifecycle.addListener(function () { return value(dom); });
        }
        else {
            if (isInvalid(value)) {
                return;
            }
            if (false) {
                throwError('string "refs" are not supported in Inferno 1.0. Use callback "refs" instead.');
            }
            throwError();
        }
    }

    function copyPropsTo(copyFrom, copyTo) {
        for (var prop in copyFrom) {
            if (isUndefined(copyTo[prop])) {
                copyTo[prop] = copyFrom[prop];
            }
        }
    }
    function createStatefulComponentInstance(vNode, Component, props, context, isSVG, devToolsStatus) {
        if (isUndefined(context)) {
            context = {};
        }
        var instance = new Component(props, context);
        instance.context = context;
        if (instance.props === EMPTY_OBJ) {
            instance.props = props;
        }
        instance._patch = patch;
        instance._devToolsStatus = devToolsStatus;
        if (findDOMNodeEnabled) {
            instance._componentToDOMNodeMap = componentToDOMNodeMap;
        }
        var childContext = instance.getChildContext();
        if (!isNullOrUndef(childContext)) {
            instance._childContext = Object.assign({}, context, childContext);
        }
        else {
            instance._childContext = context;
        }
        instance._unmounted = false;
        instance._pendingSetState = true;
        instance._isSVG = isSVG;
        instance.componentWillMount();
        instance._beforeRender && instance._beforeRender();
        var input = instance.render(props, instance.state, context);
        instance._afterRender && instance._afterRender();
        if (isArray(input)) {
            if (false) {
                throwError('a valid Inferno VNode (or null) must be returned from a component render. You may have returned an array or an invalid object.');
            }
            throwError();
        }
        else if (isInvalid(input)) {
            input = createVoidVNode();
        }
        else {
            if (input.dom) {
                input = cloneVNode(input);
            }
            if (input.flags & 28 /* Component */) {
                // if we have an input that is also a component, we run into a tricky situation
                // where the root vNode needs to always have the correct DOM entry
                // so we break monomorphism on our input and supply it our vNode as parentVNode
                // we can optimise this in the future, but this gets us out of a lot of issues
                input.parentVNode = vNode;
            }
        }
        instance._pendingSetState = false;
        instance._lastInput = input;
        return instance;
    }
    function replaceLastChildAndUnmount(lastInput, nextInput, parentDom, lifecycle, context, isSVG, isRecycling) {
        replaceVNode(parentDom, mount(nextInput, null, lifecycle, context, isSVG), lastInput, lifecycle, isRecycling);
    }
    function replaceVNode(parentDom, dom, vNode, lifecycle, isRecycling) {
        var shallowUnmount = false;
        // we cannot cache nodeType here as vNode might be re-assigned below
        if (vNode.flags & 28 /* Component */) {
            // if we are accessing a stateful or stateless component, we want to access their last rendered input
            // accessing their DOM node is not useful to us here
            unmount(vNode, null, lifecycle, false, false, isRecycling);
            vNode = vNode.children._lastInput || vNode.children;
            shallowUnmount = true;
        }
        replaceChild(parentDom, dom, vNode.dom);
        unmount(vNode, null, lifecycle, false, shallowUnmount, isRecycling);
    }
    function createStatelessComponentInput(vNode, component, props, context) {
        var input = component(props, context);
        if (isArray(input)) {
            if (false) {
                throwError('a valid Inferno VNode (or null) must be returned from a component render. You may have returned an array or an invalid object.');
            }
            throwError();
        }
        else if (isInvalid(input)) {
            input = createVoidVNode();
        }
        else {
            if (input.dom) {
                input = cloneVNode(input);
            }
            if (input.flags & 28 /* Component */) {
                // if we have an input that is also a component, we run into a tricky situation
                // where the root vNode needs to always have the correct DOM entry
                // so we break monomorphism on our input and supply it our vNode as parentVNode
                // we can optimise this in the future, but this gets us out of a lot of issues
                input.parentVNode = vNode;
            }
        }
        return input;
    }
    function setTextContent(dom, text) {
        if (text !== '') {
            dom.textContent = text;
        }
        else {
            dom.appendChild(document.createTextNode(''));
        }
    }
    function updateTextContent(dom, text) {
        dom.firstChild.nodeValue = text;
    }
    function appendChild(parentDom, dom) {
        parentDom.appendChild(dom);
    }
    function insertOrAppend(parentDom, newNode, nextNode) {
        if (isNullOrUndef(nextNode)) {
            appendChild(parentDom, newNode);
        }
        else {
            parentDom.insertBefore(newNode, nextNode);
        }
    }
    function documentCreateElement(tag, isSVG) {
        if (isSVG === true) {
            return document.createElementNS(svgNS, tag);
        }
        else {
            return document.createElement(tag);
        }
    }
    function replaceWithNewNode(lastNode, nextNode, parentDom, lifecycle, context, isSVG, isRecycling) {
        unmount(lastNode, null, lifecycle, false, false, isRecycling);
        var dom = mount(nextNode, null, lifecycle, context, isSVG);
        nextNode.dom = dom;
        replaceChild(parentDom, dom, lastNode.dom);
    }
    function replaceChild(parentDom, nextDom, lastDom) {
        if (!parentDom) {
            parentDom = lastDom.parentNode;
        }
        parentDom.replaceChild(nextDom, lastDom);
    }
    function removeChild(parentDom, dom) {
        parentDom.removeChild(dom);
    }
    function removeAllChildren(dom, children, lifecycle, shallowUnmount, isRecycling) {
        dom.textContent = '';
        if (!lifecycle.fastUnmount) {
            removeChildren(null, children, lifecycle, shallowUnmount, isRecycling);
        }
    }
    function removeChildren(dom, children, lifecycle, shallowUnmount, isRecycling) {
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (!isInvalid(child)) {
                unmount(child, dom, lifecycle, true, shallowUnmount, isRecycling);
            }
        }
    }
    function isKeyed(lastChildren, nextChildren) {
        return nextChildren.length && !isNullOrUndef(nextChildren[0]) && !isNullOrUndef(nextChildren[0].key)
            && lastChildren.length && !isNullOrUndef(lastChildren[0]) && !isNullOrUndef(lastChildren[0].key);
    }

    function normaliseChildNodes(dom) {
        var rawChildNodes = dom.childNodes;
        var length = rawChildNodes.length;
        var i = 0;
        while (i < length) {
            var rawChild = rawChildNodes[i];
            if (rawChild.nodeType === 8) {
                if (rawChild.data === '!') {
                    var placeholder = document.createTextNode('');
                    dom.replaceChild(placeholder, rawChild);
                    i++;
                }
                else {
                    dom.removeChild(rawChild);
                    length--;
                }
            }
            else {
                i++;
            }
        }
    }
    function hydrateComponent(vNode, dom, lifecycle, context, isSVG, isClass) {
        var type = vNode.type;
        var props = vNode.props || {};
        var ref = vNode.ref;
        vNode.dom = dom;
        if (isClass) {
            var _isSVG = dom.namespaceURI === svgNS;
            var defaultProps = type.defaultProps;
            lifecycle.fastUnmount = false;
            if (!isUndefined(defaultProps)) {
                copyPropsTo(defaultProps, props);
                vNode.props = props;
            }
            var instance = createStatefulComponentInstance(vNode, type, props, context, _isSVG, devToolsStatus);
            var input = instance._lastInput;
            var fastUnmount = lifecycle.fastUnmount;
            // we store the fastUnmount value, but we set it back to true on the lifecycle
            // we do this so we can determine if the component render has a fastUnmount or not      
            lifecycle.fastUnmount = true;
            instance._vComponent = vNode;
            instance._vNode = vNode;
            hydrate(input, dom, lifecycle, instance._childContext, _isSVG);
            var subLifecycle = instance._lifecycle = new Lifecycle();
            subLifecycle.fastUnmount = lifecycle.fastUnmount;
            // we then set the lifecycle fastUnmount value back to what it was before the mount
            lifecycle.fastUnmount = fastUnmount;
            mountStatefulComponentCallbacks(ref, instance, lifecycle);
            findDOMNodeEnabled && componentToDOMNodeMap.set(instance, dom);
            vNode.children = instance;
        }
        else {
            var input$1 = createStatelessComponentInput(vNode, type, props, context);
            hydrate(input$1, dom, lifecycle, context, isSVG);
            vNode.children = input$1;
            vNode.dom = input$1.dom;
            mountStatelessComponentCallbacks(ref, dom, lifecycle);
        }
    }
    function hydrateElement(vNode, dom, lifecycle, context, isSVG) {
        var tag = vNode.type;
        var children = vNode.children;
        var props = vNode.props;
        var events = vNode.events;
        var flags = vNode.flags;
        if (isSVG || (flags & 128 /* SvgElement */)) {
            isSVG = true;
        }
        if (dom.nodeType !== 1 || dom.tagName.toLowerCase() !== tag) {
            var newDom = mountElement(vNode, null, lifecycle, context, isSVG);
            vNode.dom = newDom;
            replaceChild(dom.parentNode, newDom, dom);
        }
        else {
            vNode.dom = dom;
            if (children) {
                hydrateChildren(children, dom, lifecycle, context, isSVG);
            }
            if (!(flags & 2 /* HtmlElement */)) {
                processElement(flags, vNode, dom);
            }
            for (var prop in props) {
                patchProp(prop, null, props[prop], dom, isSVG, lifecycle);
            }
            for (var name in events) {
                patchEvent(name, null, events[name], dom, lifecycle);
            }
        }
    }
    function hydrateChildren(children, dom, lifecycle, context, isSVG) {
        normaliseChildNodes(dom);
        var domNodes = Array.prototype.slice.call(dom.childNodes);
        var childNodeIndex = 0;
        if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (isObject(child) && !isNull(child)) {
                    hydrate(child, domNodes[childNodeIndex++], lifecycle, context, isSVG);
                }
            }
        }
        else if (isObject(children)) {
            hydrate(children, dom.firstChild, lifecycle, context, isSVG);
        }
    }
    function hydrateText(vNode, dom) {
        if (dom.nodeType === 3) {
            var newDom = mountText(vNode, null);
            vNode.dom = newDom;
            replaceChild(dom.parentNode, newDom, dom);
        }
        else {
            vNode.dom = dom;
        }
    }
    function hydrateVoid(vNode, dom) {
        vNode.dom = dom;
    }
    function hydrate(vNode, dom, lifecycle, context, isSVG) {
        if (false) {
            if (isInvalid(dom)) {
                throwError("failed to hydrate. The server-side render doesn't match client side.");
            }
        }
        var flags = vNode.flags;
        if (flags & 28 /* Component */) {
            return hydrateComponent(vNode, dom, lifecycle, context, isSVG, flags & 4 /* ComponentClass */);
        }
        else if (flags & 3970 /* Element */) {
            return hydrateElement(vNode, dom, lifecycle, context, isSVG);
        }
        else if (flags & 1 /* Text */) {
            return hydrateText(vNode, dom);
        }
        else if (flags & 4096 /* Void */) {
            return hydrateVoid(vNode, dom);
        }
        else {
            if (false) {
                throwError(("hydrate() expects a valid VNode, instead it received an object with the type \"" + (typeof vNode) + "\"."));
            }
            throwError();
        }
    }
    function hydrateRoot(input, parentDom, lifecycle) {
        if (parentDom && parentDom.nodeType === 1 && parentDom.firstChild) {
            hydrate(input, parentDom.firstChild, lifecycle, {}, false);
            return true;
        }
        return false;
    }

    // rather than use a Map, like we did before, we can use an array here
    // given there shouldn't be THAT many roots on the page, the difference
    // in performance is huge: https://esbench.com/bench/5802a691330ab09900a1a2da
    var roots = [];
    var componentToDOMNodeMap = new Map();
    var findDOMNodeEnabled = false;
    function enableFindDOMNode() {
        findDOMNodeEnabled = true;
    }
    function findDOMNode(ref) {
        if (!findDOMNodeEnabled) {
            if (false) {
                throwError('findDOMNode() has been disabled, use enableFindDOMNode() enabled findDOMNode(). Warning this can significantly impact performance!');
            }
            throwError();
        }
        var dom = ref && ref.nodeType ? ref : null;
        return componentToDOMNodeMap.get(ref) || dom;
    }
    function getRoot(dom) {
        for (var i = 0; i < roots.length; i++) {
            var root = roots[i];
            if (root.dom === dom) {
                return root;
            }
        }
        return null;
    }
    function setRoot(dom, input, lifecycle) {
        roots.push({
            dom: dom,
            input: input,
            lifecycle: lifecycle
        });
    }
    function removeRoot(root) {
        for (var i = 0; i < roots.length; i++) {
            if (roots[i] === root) {
                roots.splice(i, 1);
                return;
            }
        }
    }
    var documentBody = isBrowser ? document.body : null;
    function render(input, parentDom) {
        if (documentBody === parentDom) {
            if (false) {
                throwError('you cannot render() to the "document.body". Use an empty element as a container instead.');
            }
            throwError();
        }
        if (input === NO_OP) {
            return;
        }
        var root = getRoot(parentDom);
        if (isNull(root)) {
            var lifecycle = new Lifecycle();
            if (!isInvalid(input)) {
                if (input.dom) {
                    input = cloneVNode(input);
                }
                if (!hydrateRoot(input, parentDom, lifecycle)) {
                    mount(input, parentDom, lifecycle, {}, false);
                }
                lifecycle.trigger();
                setRoot(parentDom, input, lifecycle);
            }
        }
        else {
            var lifecycle$1 = root.lifecycle;
            lifecycle$1.listeners = [];
            if (isNullOrUndef(input)) {
                unmount(root.input, parentDom, lifecycle$1, false, false, false);
                removeRoot(root);
            }
            else {
                if (input.dom) {
                    input = cloneVNode(input);
                }
                patch(root.input, input, parentDom, lifecycle$1, {}, false, false);
            }
            lifecycle$1.trigger();
            root.input = input;
        }
        if (devToolsStatus.connected) {
            sendRoots(window);
        }
    }
    function createRenderer() {
        var parentDom;
        return function renderer(lastInput, nextInput) {
            if (!parentDom) {
                parentDom = lastInput;
            }
            render(nextInput, parentDom);
        };
    }

    function linkEvent(data, event) {
        return { data: data, event: event };
    }

    if (isBrowser) {
        window.process = {
            env: {
                NODE_ENV: 'development'
            }
        };
        initDevToolsHooks(window);
    }

    if (false) {
        var testFunc = function testFn() {};
        warning(
            (testFunc.name || testFunc.toString()).indexOf('testFn') !== -1,
            'It looks like you\'re using a minified copy of the development build ' +
            'of Inferno. When deploying Inferno apps to production, make sure to use ' +
            'the production build which skips development warnings and is faster. ' +
            'See http://infernojs.org for more details.'
        );
    }

    // we duplicate it so it plays nicely with different module loading systems
    var index = {
        linkEvent: linkEvent,
        // core shapes
        createVNode: createVNode,

        // cloning
        cloneVNode: cloneVNode,

        // used to shared common items between Inferno libs
        NO_OP: NO_OP,
        EMPTY_OBJ: EMPTY_OBJ,

        //DOM
        render: render,
        findDOMNode: findDOMNode,
        createRenderer: createRenderer,
        disableRecycling: disableRecycling,
        enableFindDOMNode: enableFindDOMNode
    };

    exports['default'] = index;
    exports.linkEvent = linkEvent;
    exports.createVNode = createVNode;
    exports.cloneVNode = cloneVNode;
    exports.NO_OP = NO_OP;
    exports.EMPTY_OBJ = EMPTY_OBJ;
    exports.render = render;
    exports.findDOMNode = findDOMNode;
    exports.createRenderer = createRenderer;
    exports.disableRecycling = disableRecycling;
    exports.enableFindDOMNode = enableFindDOMNode;

    Object.defineProperty(exports, '__esModule', { value: true });

    })));


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

    module.exports = __webpack_require__(4);


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

    /*!
     * inferno-component v1.0.0-beta32
     * (c) 2016 Dominic Gannaway
     * Released under the MIT License.
     */
    (function (global, factory) {
         true ? module.exports = factory(__webpack_require__(2)) :
        typeof define === 'function' && define.amd ? define(['inferno'], factory) :
        (global.Inferno = global.Inferno || {}, global.Inferno.Component = factory(global.Inferno));
    }(this, (function (inferno) { 'use strict';

    var ERROR_MSG = 'a runtime error occured! Use Inferno in development environment to find the error.';


    // this is MUCH faster than .constructor === Array and instanceof Array
    // in Node 7 and the later versions of V8, slower in older versions though
    var isArray = Array.isArray;


    function isNullOrUndef(obj) {
        return isUndefined(obj) || isNull(obj);
    }
    function isInvalid(obj) {
        return isNull(obj) || obj === false || isTrue(obj) || isUndefined(obj);
    }
    function isFunction(obj) {
        return typeof obj === 'function';
    }



    function isNull(obj) {
        return obj === null;
    }
    function isTrue(obj) {
        return obj === true;
    }
    function isUndefined(obj) {
        return obj === undefined;
    }

    function throwError(message) {
        if (!message) {
            message = ERROR_MSG;
        }
        throw new Error(("Inferno Error: " + message));
    }

    var Lifecycle = function Lifecycle() {
        this.listeners = [];
        this.fastUnmount = true;
    };
    Lifecycle.prototype.addListener = function addListener (callback) {
        this.listeners.push(callback);
    };
    Lifecycle.prototype.trigger = function trigger () {
            var this$1 = this;

        for (var i = 0; i < this.listeners.length; i++) {
            this$1.listeners[i]();
        }
    };

    var noOp = ERROR_MSG;
    if (false) {
        noOp = 'Inferno Error: Can only update a mounted or mounting component. This usually means you called setState() or forceUpdate() on an unmounted component. This is a no-op.';
    }
    var componentCallbackQueue = new Map();
    // when a components root VNode is also a component, we can run into issues
    // this will recursively look for vNode.parentNode if the VNode is a component
    function updateParentComponentVNodes(vNode, dom) {
        if (vNode.flags & 28 /* Component */) {
            var parentVNode = vNode.parentVNode;
            if (parentVNode) {
                parentVNode.dom = dom;
                updateParentComponentVNodes(parentVNode, dom);
            }
        }
    }
    // this is in shapes too, but we don't want to import from shapes as it will pull in a duplicate of createVNode
    function createVoidVNode() {
        return inferno.createVNode(4096 /* Void */);
    }
    function addToQueue(component, force, callback) {
        // TODO this function needs to be revised and improved on
        var queue = componentCallbackQueue.get(component);
        if (!queue) {
            queue = [];
            componentCallbackQueue.set(component, queue);
            Promise.resolve().then(function () {
                applyState(component, force, function () {
                    for (var i = 0; i < queue.length; i++) {
                        queue[i]();
                    }
                });
                componentCallbackQueue.delete(component);
                component._processingSetState = false;
            });
        }
        if (callback) {
            queue.push(callback);
        }
    }
    function queueStateChanges(component, newState, callback) {
        if (isFunction(newState)) {
            newState = newState(component.state);
        }
        for (var stateKey in newState) {
            component._pendingState[stateKey] = newState[stateKey];
        }
        if (!component._pendingSetState) {
            if (component._processingSetState || callback) {
                addToQueue(component, false, callback);
            }
            else {
                component._pendingSetState = true;
                component._processingSetState = true;
                applyState(component, false, callback);
                component._processingSetState = false;
            }
        }
        else {
            component.state = Object.assign({}, component.state, component._pendingState);
            component._pendingState = {};
        }
    }
    function applyState(component, force, callback) {
        if ((!component._deferSetState || force) && !component._blockRender) {
            component._pendingSetState = false;
            var pendingState = component._pendingState;
            var prevState = component.state;
            var nextState = Object.assign({}, prevState, pendingState);
            var props = component.props;
            var context = component.context;
            component._pendingState = {};
            var nextInput = component._updateComponent(prevState, nextState, props, props, context, force);
            var didUpdate = true;
            if (isInvalid(nextInput)) {
                nextInput = createVoidVNode();
            }
            else if (isArray(nextInput)) {
                if (false) {
                    throwError('a valid Inferno VNode (or null) must be returned from a component render. You may have returned an array or an invalid object.');
                }
                throwError();
            }
            else if (nextInput === inferno.NO_OP) {
                nextInput = component._lastInput;
                didUpdate = false;
            }
            var lastInput = component._lastInput;
            var parentDom = lastInput.dom.parentNode;
            component._lastInput = nextInput;
            if (didUpdate) {
                var subLifecycle = component._lifecycle;
                if (!subLifecycle) {
                    subLifecycle = new Lifecycle();
                }
                else {
                    subLifecycle.listeners = [];
                }
                component._lifecycle = subLifecycle;
                var childContext = component.getChildContext();
                if (!isNullOrUndef(childContext)) {
                    childContext = Object.assign({}, context, component._childContext, childContext);
                }
                else {
                    childContext = Object.assign({}, context, component._childContext);
                }
                component._patch(lastInput, nextInput, parentDom, subLifecycle, childContext, component._isSVG, false);
                subLifecycle.trigger();
                component.componentDidUpdate(props, prevState);
            }
            var vNode = component._vNode;
            var dom = vNode.dom = nextInput.dom;
            var componentToDOMNodeMap = component._componentToDOMNodeMap;
            componentToDOMNodeMap && componentToDOMNodeMap.set(component, nextInput.dom);
            updateParentComponentVNodes(vNode, dom);
            if (!isNullOrUndef(callback)) {
                callback();
            }
        }
    }
    var Component$1 = function Component$1(props, context) {
        this.state = {};
        this.refs = {};
        this._processingSetState = false;
        this._blockRender = false;
        this._ignoreSetState = false;
        this._blockSetState = false;
        this._deferSetState = false;
        this._pendingSetState = false;
        this._pendingState = {};
        this._lastInput = null;
        this._vNode = null;
        this._unmounted = true;
        this._devToolsStatus = null;
        this._devToolsId = null;
        this._lifecycle = null;
        this._childContext = null;
        this._patch = null;
        this._isSVG = false;
        this._componentToDOMNodeMap = null;
        /** @type {object} */
        this.props = props || inferno.EMPTY_OBJ;
        /** @type {object} */
        this.context = context || {};
        if (!this.componentDidMount) {
            this.componentDidMount = null;
        }
    };
    Component$1.prototype.render = function render (nextProps, nextState, nextContext) {
    };
    Component$1.prototype.forceUpdate = function forceUpdate (callback) {
        if (this._unmounted) {
            throw Error(noOp);
        }
        applyState(this, true, callback);
    };
    Component$1.prototype.setState = function setState (newState, callback) {
        if (this._unmounted) {
            throw Error(noOp);
        }
        if (!this._blockSetState) {
            if (!this._ignoreSetState) {
                queueStateChanges(this, newState, callback);
            }
        }
        else {
            if (false) {
                throwError('cannot update state via setState() in componentWillUpdate().');
            }
            throwError();
        }
    };
    Component$1.prototype.componentWillMount = function componentWillMount () {
    };
    Component$1.prototype.componentDidMount = function componentDidMount () {
    };
    Component$1.prototype.componentWillUnmount = function componentWillUnmount () {
    };
    Component$1.prototype.componentDidUpdate = function componentDidUpdate (prevProps, prevState, prevContext) {
    };
    Component$1.prototype.shouldComponentUpdate = function shouldComponentUpdate (nextProps, nextState, context) {
        return true;
    };
    Component$1.prototype.componentWillReceiveProps = function componentWillReceiveProps (nextProps, context) {
    };
    Component$1.prototype.componentWillUpdate = function componentWillUpdate (nextProps, nextState, nextContext) {
    };
    Component$1.prototype.getChildContext = function getChildContext () {
    };
    Component$1.prototype._updateComponent = function _updateComponent (prevState, nextState, prevProps, nextProps, context, force) {
        if (this._unmounted === true) {
            if (false) {
                throwError(noOp);
            }
            throwError();
        }
        if ((prevProps !== nextProps || nextProps === inferno.EMPTY_OBJ) || prevState !== nextState || force) {
            if (prevProps !== nextProps || nextProps === inferno.EMPTY_OBJ) {
                this._blockRender = true;
                this.componentWillReceiveProps(nextProps, context);
                this._blockRender = false;
                if (this._pendingSetState) {
                    nextState = Object.assign({}, nextState, this._pendingState);
                    this._pendingSetState = false;
                    this._pendingState = {};
                }
            }
            var shouldUpdate = this.shouldComponentUpdate(nextProps, nextState, context);
            if (shouldUpdate !== false || force) {
                this._blockSetState = true;
                this.componentWillUpdate(nextProps, nextState, context);
                this._blockSetState = false;
                this.props = nextProps;
                var state = this.state = nextState;
                this.context = context;
                this._beforeRender && this._beforeRender();
                var render = this.render(nextProps, state, context);
                this._afterRender && this._afterRender();
                return render;
            }
        }
        return inferno.NO_OP;
    };

    return Component$1;

    })));


/***/ },
/* 5 */
/***/ function(module, exports) {

    'use strict';

    exports.__esModule = true;
    exports.read = read;
    exports.assign = assign;
    exports.isEqual = isEqual;
    /**
     * Shared funcs/values
     */

    var ENTER = exports.ENTER = 13;
    var ESCAPE = exports.ESCAPE = 27;

    var filters = exports.filters = {
        all: function all(t) {
            return true;
        },
        active: function active(t) {
            return !t.completed;
        },
        completed: function completed(t) {
            return t.completed;
        }
    };

    /**
     * Read the `location.hash` value
     * @return {String}
     */
    function read() {
        return location.hash.replace('#/', '') || 'all';
    }

    /**
     * Modified `Object.assign` shim
     * - always writes to new object
     * @return {Object}
     */
    function assign() {
        var src = void 0;
        var tar = {};
        for (var s = 0; s < arguments.length; s++) {
            src = Object(arguments[s]);
            for (var k in src) {
                tar[k] = src[k];
            }
        }
        return tar;
    }

    /**
     * Are two Objects equal values?
     * @param  {Object} a
     * @param  {Object} b
     * @return {Boolean}
     */
    function isEqual(a, b) {
        // Create arrays of property names
        var aProps = Object.getOwnPropertyNames(a);
        var bProps = Object.getOwnPropertyNames(b);

        if (aProps.length !== bProps.length) return false;

        for (var i = 0; i < aProps.length; i++) {
            var k = aProps[i];
            if (a[k] !== b[k]) return false;
        }

        return true;
    }

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

    'use strict';

    exports.__esModule = true;
    exports.links = undefined;
    exports.Head = Head;
    exports.Foot = Foot;

    var _inferno = __webpack_require__(1);

    var _inferno2 = _interopRequireDefault(_inferno);

    var _share = __webpack_require__(5);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
     * Stateless Header component
     */
    function Head(_ref) {
        var onEnter = _ref.onEnter;

        return _inferno2.default.createVNode(2, 'header', {
            'className': 'header'
        }, [_inferno2.default.createVNode(2, 'h1', null, 'todos'), _inferno2.default.createVNode(512, 'input', {
            'className': 'new-todo',
            'autofocus': true,
            'autocomplete': 'off',
            'placeholder': 'What needs to be done?'
        }, null, {
            'onkeydown': onEnter
        })]);
    }

    var links = exports.links = [{ hash: '#/', name: 'All' }, { hash: '#/active', name: 'Active' }, { hash: '#/completed', name: 'Completed' }];

    /**
     * Stateless Footer component
     */
    function Foot(_ref2) {
        var left = _ref2.left,
            done = _ref2.done,
            route = _ref2.route,
            onClear = _ref2.onClear;

        return _inferno2.default.createVNode(2, 'footer', {
            'className': 'footer'
        }, [_inferno2.default.createVNode(2, 'span', {
            'className': 'todo-count'
        }, [_inferno2.default.createVNode(2, 'strong', null, left), ' ', left > 1 ? 'items' : 'item', ' left']), _inferno2.default.createVNode(2, 'ul', {
            'className': 'filters'
        }, links.map(function (_ref3) {
            var hash = _ref3.hash,
                name = _ref3.name;
            return _inferno2.default.createVNode(2, 'li', null, _inferno2.default.createVNode(2, 'a', {
                'href': hash,
                'className': name.toLowerCase() === route ? 'selected' : ''
            }, name));
        })), done > 0 ? _inferno2.default.createVNode(2, 'button', {
            'className': 'clear-completed'
        }, 'Clear completed', {
            'onClick': onClear
        }) : null]);
    }

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

    'use strict';

    exports.__esModule = true;

    var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

    var _share = __webpack_require__(5);

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var STOR = {};
    var STOR_ID = 'todos-inferno';

    var Model = function Model() {
        var _this = this;

        _classCallCheck(this, Model);

        this.get = function () {
            return _this.data = JSON.parse(STOR[STOR_ID] || '[]');
        };

        this.set = function (arr) {
            _this.data = arr || _this.data || [];
            STOR[STOR_ID] = JSON.stringify(_this.data);
            return _this.data;
        };

        this.add = function (str) {
            return _this.set(_this.data.concat({ title: str, completed: false }));
        };

        this.put = function (todo, obj) {
            return _this.set(_this.data.map(function (t) {
                return (0, _share.isEqual)(t, todo) ? (0, _share.assign)(todo, obj) : t;
            }));
        };

        this.del = function (todo) {
            return _this.set(_this.data.filter(function (t) {
                return !(0, _share.isEqual)(t, todo);
            }));
        };

        this.toggle = function (todo) {
            return _this.put(todo, { completed: !todo.completed });
        };

        this.toggleAll = function (completed) {
            return _this.set(_this.data.map(function (t) {
                return _extends({}, t, { completed: completed });
            }));
        };

        this.clearCompleted = function () {
            return _this.set(_this.data.filter(function (t) {
                return !t.completed;
            }));
        };
    };

    exports.default = Model;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

    'use strict';

    exports.__esModule = true;

    var _inferno = __webpack_require__(1);

    var _inferno2 = _interopRequireDefault(_inferno);

    var _infernoComponent = __webpack_require__(3);

    var _infernoComponent2 = _interopRequireDefault(_infernoComponent);

    var _share = __webpack_require__(5);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Item = function (_Component) {
        _inherits(Item, _Component);

        function Item(_ref) {
            var data = _ref.data,
                props = _objectWithoutProperties(_ref, ['data']);

            _classCallCheck(this, Item);

            var _this = _possibleConstructorReturn(this, _Component.call(this, props));

            _initialiseProps.call(_this);

            _this.todo = data;
            _this.state = { text: data.title };
            _this.editor = null;
            return _this;
        }

        Item.prototype.render = function render(_ref2, _ref3) {
            var _this2 = this;

            var doToggle = _ref2.doToggle,
                doDelete = _ref2.doDelete,
                doSave = _ref2.doSave,
                onBlur = _ref2.onBlur,
                onFocus = _ref2.onFocus;
            var text = _ref3.text;
            var _todo = this.todo,
                title = _todo.title,
                completed = _todo.completed,
                editing = _todo.editing;


            var cls = [];
            editing && cls.push('editing');
            completed && cls.push('completed');

            var handleKeydown = function handleKeydown(e) {
                if (e.which === _share.ESCAPE) return onBlur();
                if (e.which === _share.ENTER) return doSave(text);
            };

            // tmp fix
            var handleBlur = function handleBlur() {
                return doSave(text);
            };
            var handleInput = function handleInput(e) {
                return _this2.setText(e.target.value);
            };

            return _inferno2.default.createVNode(2, 'li', {
                'className': cls.join(' ')
            }, [_inferno2.default.createVNode(2, 'div', {
                'className': 'view'
            }, [_inferno2.default.createVNode(512, 'input', {
                'className': 'toggle',
                'type': 'checkbox',
                'checked': completed
            }, null, {
                'onClick': doToggle
            }), _inferno2.default.createVNode(2, 'label', null, title, {
                'ondblclick': onFocus
            }), _inferno2.default.createVNode(2, 'button', {
                'className': 'destroy'
            }, null, {
                'onClick': doDelete
            })]), _inferno2.default.createVNode(512, 'input', {
                'className': 'edit',
                'value': editing && text
            }, null, {
                'onblur': handleBlur,
                'oninput': handleInput,
                'onkeydown': handleKeydown
            }, null, function (el) {
                _this2.editor = el;
            })]);
        };

        return Item;
    }(_infernoComponent2.default);

    var _initialiseProps = function _initialiseProps() {
        var _this3 = this;

        this.componentWillReceiveProps = function (_ref4) {
            var data = _ref4.data;
            return _this3.setText(data.title);
        };

        this.shouldComponentUpdate = function (_ref5, _ref6) {
            var data = _ref5.data;
            var text = _ref6.text;
            return !((0, _share.isEqual)(data, _this3.todo) && text === _this3.state.text);
        };

        this.componentWillUpdate = function (_ref7) {
            var data = _ref7.data;
            return _this3.todo = data;
        };

        this.componentDidUpdate = function () {
            return _this3.editor.focus();
        };

        this.setText = function (text) {
            return _this3.setState({ text: text });
        };
    };

    exports.default = Item;

/***/ }
/******/ ]);
// ---- end verbatim copy of SP2:todomvc/architecture-examples/inferno/dist/bundle.js ----
sp2RunTodoMVC(ROUNDS, function (step) {
    mix(document.body.innerHTML);
}).then(function () { log("checksum " + __checksum); }, function (e) { log("ERROR " + e + "\n" + e.stack); });
