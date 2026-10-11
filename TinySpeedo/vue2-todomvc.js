// Speedometer 2 "VueJS-TodoMVC": the SP2 app at todomvc/architecture-examples/vuejs-cli (scripts verbatim) running against a
// plain-object DOM, driven by the SP2 TodoMVC steps (resources/tests.js).
var ROUNDS = 50;
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
document.body.innerHTML = "<div id=app></div>";
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
sp2Options = { valueEvent: "input", enter: "keyup", requery: false };
// ---- begin verbatim copy of Speedometer SP2:todomvc/architecture-examples/vuejs-cli/dist/static/js/manifest.aa9978aa96ee948f2a4c.js ----
!function(e){function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}var r=window.webpackJsonp;window.webpackJsonp=function(t,c,i){for(var u,a,f,s=0,l=[];s<t.length;s++)a=t[s],o[a]&&l.push(o[a][0]),o[a]=0;for(u in c)Object.prototype.hasOwnProperty.call(c,u)&&(e[u]=c[u]);for(r&&r(t,c,i);l.length;)l.shift()();if(i)for(s=0;s<i.length;s++)f=n(n.s=i[s]);return f};var t={},o={2:0};n.e=function(e){function r(){u.onerror=u.onload=null,clearTimeout(a);var n=o[e];0!==n&&(n&&n[1](new Error("Loading chunk "+e+" failed.")),o[e]=void 0)}var t=o[e];if(0===t)return new Promise(function(e){e()});if(t)return t[2];var c=new Promise(function(n,r){t=o[e]=[n,r]});t[2]=c;var i=document.getElementsByTagName("head")[0],u=document.createElement("script");u.type="text/javascript",u.charset="utf-8",u.async=!0,u.timeout=12e4,n.nc&&u.setAttribute("nonce",n.nc),u.src=n.p+"static/js/"+e+"."+{0:"e6c010d57d53537f4ad2",1:"e7008001a8bed009bbf1"}[e]+".js";var a=setTimeout(r,12e4);return u.onerror=u.onload=r,i.appendChild(u),c},n.m=e,n.c=t,n.i=function(e){return e},n.d=function(e,r,t){n.o(e,r)||Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:t})},n.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(r,"a",r),r},n.o=function(e,n){return Object.prototype.hasOwnProperty.call(e,n)},n.p="./",n.oe=function(e){throw console.error(e),e}}([]);
//# sourceMappingURL=manifest.aa9978aa96ee948f2a4c.js.map
// ---- end verbatim copy of SP2:todomvc/architecture-examples/vuejs-cli/dist/static/js/manifest.aa9978aa96ee948f2a4c.js ----
// ---- begin verbatim copy of Speedometer SP2:todomvc/architecture-examples/vuejs-cli/dist/static/js/vendor.e7008001a8bed009bbf1.js ----
webpackJsonp([1],{"7+uW":function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),function(t){/*!
 * Vue.js v2.4.2
 * (c) 2014-2017 Evan You
 * Released under the MIT License.
 */
function n(t){return void 0===t||null===t}function r(t){return void 0!==t&&null!==t}function i(t){return!0===t}function o(t){return!1===t}function a(t){return"string"==typeof t||"number"==typeof t||"boolean"==typeof t}function s(t){return null!==t&&"object"==typeof t}function c(t){return"[object Object]"===Ri.call(t)}function u(t){return"[object RegExp]"===Ri.call(t)}function l(t){var e=parseFloat(t);return e>=0&&Math.floor(e)===e&&isFinite(t)}function f(t){return null==t?"":"object"==typeof t?JSON.stringify(t,null,2):String(t)}function p(t){var e=parseFloat(t);return isNaN(e)?t:e}function d(t,e){for(var n=Object.create(null),r=t.split(","),i=0;i<r.length;i++)n[r[i]]=!0;return e?function(t){return n[t.toLowerCase()]}:function(t){return n[t]}}function h(t,e){if(t.length){var n=t.indexOf(e);if(n>-1)return t.splice(n,1)}}function v(t,e){return Bi.call(t,e)}function m(t){var e=Object.create(null);return function(n){return e[n]||(e[n]=t(n))}}function y(t,e){function n(n){var r=arguments.length;return r?r>1?t.apply(e,arguments):t.call(e,n):t.call(e)}return n._length=t.length,n}function g(t,e){e=e||0;for(var n=t.length-e,r=new Array(n);n--;)r[n]=t[n+e];return r}function _(t,e){for(var n in e)t[n]=e[n];return t}function b(t){for(var e={},n=0;n<t.length;n++)t[n]&&_(e,t[n]);return e}function w(t,e,n){}function $(t,e){if(t===e)return!0;var n=s(t),r=s(e);if(!n||!r)return!n&&!r&&String(t)===String(e);try{var i=Array.isArray(t),o=Array.isArray(e);if(i&&o)return t.length===e.length&&t.every(function(t,n){return $(t,e[n])});if(i||o)return!1;var a=Object.keys(t),c=Object.keys(e);return a.length===c.length&&a.every(function(n){return $(t[n],e[n])})}catch(t){return!1}}function C(t,e){for(var n=0;n<t.length;n++)if($(t[n],e))return n;return-1}function x(t){var e=!1;return function(){e||(e=!0,t.apply(this,arguments))}}function A(t){var e=(t+"").charCodeAt(0);return 36===e||95===e}function k(t,e,n,r){Object.defineProperty(t,e,{value:n,enumerable:!!r,writable:!0,configurable:!0})}function O(t){if(!Qi.test(t)){var e=t.split(".");return function(t){for(var n=0;n<e.length;n++){if(!t)return;t=t[e[n]]}return t}}}function S(t,e,n){if(Xi.errorHandler)Xi.errorHandler.call(null,t,e,n);else{if(!no||"undefined"==typeof console)throw t;console.error(t)}}function T(t){return"function"==typeof t&&/native code/.test(t.toString())}function E(t){wo.target&&$o.push(wo.target),wo.target=t}function j(){wo.target=$o.pop()}function N(t,e,n){t.__proto__=e}function L(t,e,n){for(var r=0,i=n.length;r<i;r++){var o=n[r];k(t,o,e[o])}}function M(t,e){if(s(t)){var n;return v(t,"__ob__")&&t.__ob__ instanceof Oo?n=t.__ob__:ko.shouldConvert&&!mo()&&(Array.isArray(t)||c(t))&&Object.isExtensible(t)&&!t._isVue&&(n=new Oo(t)),e&&n&&n.vmCount++,n}}function I(t,e,n,r,i){var o=new wo,a=Object.getOwnPropertyDescriptor(t,e);if(!a||!1!==a.configurable){var s=a&&a.get,c=a&&a.set,u=!i&&M(n);Object.defineProperty(t,e,{enumerable:!0,configurable:!0,get:function(){var e=s?s.call(t):n;return wo.target&&(o.depend(),u&&u.dep.depend(),Array.isArray(e)&&D(e)),e},set:function(e){var r=s?s.call(t):n;e===r||e!==e&&r!==r||(c?c.call(t,e):n=e,u=!i&&M(e),o.notify())}})}}function P(t,e,n){if(Array.isArray(t)&&l(e))return t.length=Math.max(t.length,e),t.splice(e,1,n),n;if(v(t,e))return t[e]=n,n;var r=t.__ob__;return t._isVue||r&&r.vmCount?n:r?(I(r.value,e,n),r.dep.notify(),n):(t[e]=n,n)}function R(t,e){if(Array.isArray(t)&&l(e))return void t.splice(e,1);var n=t.__ob__;t._isVue||n&&n.vmCount||v(t,e)&&(delete t[e],n&&n.dep.notify())}function D(t){for(var e=void 0,n=0,r=t.length;n<r;n++)e=t[n],e&&e.__ob__&&e.__ob__.dep.depend(),Array.isArray(e)&&D(e)}function F(t,e){if(!e)return t;for(var n,r,i,o=Object.keys(e),a=0;a<o.length;a++)n=o[a],r=t[n],i=e[n],v(t,n)?c(r)&&c(i)&&F(r,i):P(t,n,i);return t}function B(t,e,n){return n?t||e?function(){var r="function"==typeof e?e.call(n):e,i="function"==typeof t?t.call(n):void 0;return r?F(r,i):i}:void 0:e?t?function(){return F("function"==typeof e?e.call(this):e,"function"==typeof t?t.call(this):t)}:e:t}function U(t,e){return e?t?t.concat(e):Array.isArray(e)?e:[e]:t}function H(t,e){var n=Object.create(t||null);return e?_(n,e):n}function V(t){var e=t.props;if(e){var n,r,i,o={};if(Array.isArray(e))for(n=e.length;n--;)"string"==typeof(r=e[n])&&(i=Hi(r),o[i]={type:null});else if(c(e))for(var a in e)r=e[a],i=Hi(a),o[i]=c(r)?r:{type:r};t.props=o}}function z(t){var e=t.inject;if(Array.isArray(e))for(var n=t.inject={},r=0;r<e.length;r++)n[e[r]]=e[r]}function J(t){var e=t.directives;if(e)for(var n in e){var r=e[n];"function"==typeof r&&(e[n]={bind:r,update:r})}}function K(t,e,n){function r(r){var i=So[r]||To;c[r]=i(t[r],e[r],n,r)}"function"==typeof e&&(e=e.options),V(e),z(e),J(e);var i=e.extends;if(i&&(t=K(t,i,n)),e.mixins)for(var o=0,a=e.mixins.length;o<a;o++)t=K(t,e.mixins[o],n);var s,c={};for(s in t)r(s);for(s in e)v(t,s)||r(s);return c}function q(t,e,n,r){if("string"==typeof n){var i=t[e];if(v(i,n))return i[n];var o=Hi(n);if(v(i,o))return i[o];var a=Vi(o);if(v(i,a))return i[a];return i[n]||i[o]||i[a]}}function W(t,e,n,r){var i=e[t],o=!v(n,t),a=n[t];if(X(Boolean,i.type)&&(o&&!v(i,"default")?a=!1:X(String,i.type)||""!==a&&a!==Ji(t)||(a=!0)),void 0===a){a=Z(r,i,t);var s=ko.shouldConvert;ko.shouldConvert=!0,M(a),ko.shouldConvert=s}return a}function Z(t,e,n){if(v(e,"default")){var r=e.default;return t&&t.$options.propsData&&void 0===t.$options.propsData[n]&&void 0!==t._props[n]?t._props[n]:"function"==typeof r&&"Function"!==G(e.type)?r.call(t):r}}function G(t){var e=t&&t.toString().match(/^\s*function (\w+)/);return e?e[1]:""}function X(t,e){if(!Array.isArray(e))return G(e)===G(t);for(var n=0,r=e.length;n<r;n++)if(G(e[n])===G(t))return!0;return!1}function Y(t){return new Eo(void 0,void 0,void 0,String(t))}function Q(t){var e=new Eo(t.tag,t.data,t.children,t.text,t.elm,t.context,t.componentOptions,t.asyncFactory);return e.ns=t.ns,e.isStatic=t.isStatic,e.key=t.key,e.isComment=t.isComment,e.isCloned=!0,e}function tt(t){for(var e=t.length,n=new Array(e),r=0;r<e;r++)n[r]=Q(t[r]);return n}function et(t){function e(){var t=arguments,n=e.fns;if(!Array.isArray(n))return n.apply(null,arguments);for(var r=n.slice(),i=0;i<r.length;i++)r[i].apply(null,t)}return e.fns=t,e}function nt(t,e,r,i,o){var a,s,c,u;for(a in t)s=t[a],c=e[a],u=Mo(a),n(s)||(n(c)?(n(s.fns)&&(s=t[a]=et(s)),r(u.name,s,u.once,u.capture,u.passive)):s!==c&&(c.fns=s,t[a]=c));for(a in e)n(t[a])&&(u=Mo(a),i(u.name,e[a],u.capture))}function rt(t,e,o){function a(){o.apply(this,arguments),h(s.fns,a)}var s,c=t[e];n(c)?s=et([a]):r(c.fns)&&i(c.merged)?(s=c,s.fns.push(a)):s=et([c,a]),s.merged=!0,t[e]=s}function it(t,e,i){var o=e.options.props;if(!n(o)){var a={},s=t.attrs,c=t.props;if(r(s)||r(c))for(var u in o){var l=Ji(u);ot(a,c,u,l,!0)||ot(a,s,u,l,!1)}return a}}function ot(t,e,n,i,o){if(r(e)){if(v(e,n))return t[n]=e[n],o||delete e[n],!0;if(v(e,i))return t[n]=e[i],o||delete e[i],!0}return!1}function at(t){for(var e=0;e<t.length;e++)if(Array.isArray(t[e]))return Array.prototype.concat.apply([],t);return t}function st(t){return a(t)?[Y(t)]:Array.isArray(t)?ut(t):void 0}function ct(t){return r(t)&&r(t.text)&&o(t.isComment)}function ut(t,e){var o,s,c,u=[];for(o=0;o<t.length;o++)s=t[o],n(s)||"boolean"==typeof s||(c=u[u.length-1],Array.isArray(s)?u.push.apply(u,ut(s,(e||"")+"_"+o)):a(s)?ct(c)?c.text+=String(s):""!==s&&u.push(Y(s)):ct(s)&&ct(c)?u[u.length-1]=Y(c.text+s.text):(i(t._isVList)&&r(s.tag)&&n(s.key)&&r(e)&&(s.key="__vlist"+e+"_"+o+"__"),u.push(s)));return u}function lt(t,e){return t.__esModule&&t.default&&(t=t.default),s(t)?e.extend(t):t}function ft(t,e,n,r,i){var o=Lo();return o.asyncFactory=t,o.asyncMeta={data:e,context:n,children:r,tag:i},o}function pt(t,e,o){if(i(t.error)&&r(t.errorComp))return t.errorComp;if(r(t.resolved))return t.resolved;if(i(t.loading)&&r(t.loadingComp))return t.loadingComp;if(!r(t.contexts)){var a=t.contexts=[o],c=!0,u=function(){for(var t=0,e=a.length;t<e;t++)a[t].$forceUpdate()},l=x(function(n){t.resolved=lt(n,e),c||u()}),f=x(function(e){r(t.errorComp)&&(t.error=!0,u())}),p=t(l,f);return s(p)&&("function"==typeof p.then?n(t.resolved)&&p.then(l,f):r(p.component)&&"function"==typeof p.component.then&&(p.component.then(l,f),r(p.error)&&(t.errorComp=lt(p.error,e)),r(p.loading)&&(t.loadingComp=lt(p.loading,e),0===p.delay?t.loading=!0:setTimeout(function(){n(t.resolved)&&n(t.error)&&(t.loading=!0,u())},p.delay||200)),r(p.timeout)&&setTimeout(function(){n(t.resolved)&&f(null)},p.timeout))),c=!1,t.loading?t.loadingComp:t.resolved}t.contexts.push(o)}function dt(t){if(Array.isArray(t))for(var e=0;e<t.length;e++){var n=t[e];if(r(n)&&r(n.componentOptions))return n}}function ht(t){t._events=Object.create(null),t._hasHookEvent=!1;var e=t.$options._parentListeners;e&&yt(t,e)}function vt(t,e,n){n?No.$once(t,e):No.$on(t,e)}function mt(t,e){No.$off(t,e)}function yt(t,e,n){No=t,nt(e,n||{},vt,mt,t)}function gt(t,e){var n={};if(!t)return n;for(var r=[],i=0,o=t.length;i<o;i++){var a=t[i];if(a.context!==e&&a.functionalContext!==e||!a.data||null==a.data.slot)r.push(a);else{var s=a.data.slot,c=n[s]||(n[s]=[]);"template"===a.tag?c.push.apply(c,a.children):c.push(a)}}return r.every(_t)||(n.default=r),n}function _t(t){return t.isComment||" "===t.text}function bt(t,e){e=e||{};for(var n=0;n<t.length;n++)Array.isArray(t[n])?bt(t[n],e):e[t[n].key]=t[n].fn;return e}function wt(t){var e=t.$options,n=e.parent;if(n&&!e.abstract){for(;n.$options.abstract&&n.$parent;)n=n.$parent;n.$children.push(t)}t.$parent=n,t.$root=n?n.$root:t,t.$children=[],t.$refs={},t._watcher=null,t._inactive=null,t._directInactive=!1,t._isMounted=!1,t._isDestroyed=!1,t._isBeingDestroyed=!1}function $t(t,e,n){t.$el=e,t.$options.render||(t.$options.render=Lo),Ot(t,"beforeMount");var r;return r=function(){t._update(t._render(),n)},t._watcher=new Vo(t,r,w),n=!1,null==t.$vnode&&(t._isMounted=!0,Ot(t,"mounted")),t}function Ct(t,e,n,r,i){var o=!!(i||t.$options._renderChildren||r.data.scopedSlots||t.$scopedSlots!==Yi);if(t.$options._parentVnode=r,t.$vnode=r,t._vnode&&(t._vnode.parent=r),t.$options._renderChildren=i,t.$attrs=r.data&&r.data.attrs,t.$listeners=n,e&&t.$options.props){ko.shouldConvert=!1;for(var a=t._props,s=t.$options._propKeys||[],c=0;c<s.length;c++){var u=s[c];a[u]=W(u,t.$options.props,e,t)}ko.shouldConvert=!0,t.$options.propsData=e}if(n){var l=t.$options._parentListeners;t.$options._parentListeners=n,yt(t,n,l)}o&&(t.$slots=gt(i,r.context),t.$forceUpdate())}function xt(t){for(;t&&(t=t.$parent);)if(t._inactive)return!0;return!1}function At(t,e){if(e){if(t._directInactive=!1,xt(t))return}else if(t._directInactive)return;if(t._inactive||null===t._inactive){t._inactive=!1;for(var n=0;n<t.$children.length;n++)At(t.$children[n]);Ot(t,"activated")}}function kt(t,e){if(!(e&&(t._directInactive=!0,xt(t))||t._inactive)){t._inactive=!0;for(var n=0;n<t.$children.length;n++)kt(t.$children[n]);Ot(t,"deactivated")}}function Ot(t,e){var n=t.$options[e];if(n)for(var r=0,i=n.length;r<i;r++)try{n[r].call(t)}catch(n){S(n,t,e+" hook")}t._hasHookEvent&&t.$emit("hook:"+e)}function St(){Uo=Po.length=Ro.length=0,Do={},Fo=Bo=!1}function Tt(){Bo=!0;var t,e;for(Po.sort(function(t,e){return t.id-e.id}),Uo=0;Uo<Po.length;Uo++)t=Po[Uo],e=t.id,Do[e]=null,t.run();var n=Ro.slice(),r=Po.slice();St(),Nt(n),Et(r),yo&&Xi.devtools&&yo.emit("flush")}function Et(t){for(var e=t.length;e--;){var n=t[e],r=n.vm;r._watcher===n&&r._isMounted&&Ot(r,"updated")}}function jt(t){t._inactive=!1,Ro.push(t)}function Nt(t){for(var e=0;e<t.length;e++)t[e]._inactive=!0,At(t[e],!0)}function Lt(t){var e=t.id;if(null==Do[e]){if(Do[e]=!0,Bo){for(var n=Po.length-1;n>Uo&&Po[n].id>t.id;)n--;Po.splice(n+1,0,t)}else Po.push(t);Fo||(Fo=!0,_o(Tt))}}function Mt(t){zo.clear(),It(t,zo)}function It(t,e){var n,r,i=Array.isArray(t);if((i||s(t))&&Object.isExtensible(t)){if(t.__ob__){var o=t.__ob__.dep.id;if(e.has(o))return;e.add(o)}if(i)for(n=t.length;n--;)It(t[n],e);else for(r=Object.keys(t),n=r.length;n--;)It(t[r[n]],e)}}function Pt(t,e,n){Jo.get=function(){return this[e][n]},Jo.set=function(t){this[e][n]=t},Object.defineProperty(t,n,Jo)}function Rt(t){t._watchers=[];var e=t.$options;e.props&&Dt(t,e.props),e.methods&&zt(t,e.methods),e.data?Ft(t):M(t._data={},!0),e.computed&&Ut(t,e.computed),e.watch&&e.watch!==lo&&Jt(t,e.watch)}function Dt(t,e){var n=t.$options.propsData||{},r=t._props={},i=t.$options._propKeys=[],o=!t.$parent;ko.shouldConvert=o;for(var a in e)!function(o){i.push(o);var a=W(o,e,n,t);I(r,o,a),o in t||Pt(t,"_props",o)}(a);ko.shouldConvert=!0}function Ft(t){var e=t.$options.data;e=t._data="function"==typeof e?Bt(e,t):e||{},c(e)||(e={});for(var n=Object.keys(e),r=t.$options.props,i=(t.$options.methods,n.length);i--;){var o=n[i];r&&v(r,o)||A(o)||Pt(t,"_data",o)}M(e,!0)}function Bt(t,e){try{return t.call(e)}catch(t){return S(t,e,"data()"),{}}}function Ut(t,e){var n=t._computedWatchers=Object.create(null);for(var r in e){var i=e[r],o="function"==typeof i?i:i.get;n[r]=new Vo(t,o||w,w,Ko),r in t||Ht(t,r,i)}}function Ht(t,e,n){"function"==typeof n?(Jo.get=Vt(e),Jo.set=w):(Jo.get=n.get?!1!==n.cache?Vt(e):n.get:w,Jo.set=n.set?n.set:w),Object.defineProperty(t,e,Jo)}function Vt(t){return function(){var e=this._computedWatchers&&this._computedWatchers[t];if(e)return e.dirty&&e.evaluate(),wo.target&&e.depend(),e.value}}function zt(t,e){t.$options.props;for(var n in e)t[n]=null==e[n]?w:y(e[n],t)}function Jt(t,e){for(var n in e){var r=e[n];if(Array.isArray(r))for(var i=0;i<r.length;i++)Kt(t,n,r[i]);else Kt(t,n,r)}}function Kt(t,e,n,r){return c(n)&&(r=n,n=n.handler),"string"==typeof n&&(n=t[n]),t.$watch(e,n,r)}function qt(t){var e=t.$options.provide;e&&(t._provided="function"==typeof e?e.call(t):e)}function Wt(t){var e=Zt(t.$options.inject,t);e&&(ko.shouldConvert=!1,Object.keys(e).forEach(function(n){I(t,n,e[n])}),ko.shouldConvert=!0)}function Zt(t,e){if(t){for(var n=Object.create(null),r=go?Reflect.ownKeys(t):Object.keys(t),i=0;i<r.length;i++)for(var o=r[i],a=t[o],s=e;s;){if(s._provided&&a in s._provided){n[o]=s._provided[a];break}s=s.$parent}return n}}function Gt(t,e,n,i,o){var a={},s=t.options.props;if(r(s))for(var c in s)a[c]=W(c,s,e||{});else r(n.attrs)&&Xt(a,n.attrs),r(n.props)&&Xt(a,n.props);var u=Object.create(i),l=function(t,e,n,r){return re(u,t,e,n,r,!0)},f=t.options.render.call(null,l,{data:n,props:a,children:o,parent:i,listeners:n.on||{},injections:Zt(t.options.inject,i),slots:function(){return gt(o,i)}});return f instanceof Eo&&(f.functionalContext=i,f.functionalOptions=t.options,n.slot&&((f.data||(f.data={})).slot=n.slot)),f}function Xt(t,e){for(var n in e)t[Hi(n)]=e[n]}function Yt(t,e,o,a,c){if(!n(t)){var u=o.$options._base;if(s(t)&&(t=u.extend(t)),"function"==typeof t){var l;if(n(t.cid)&&(l=t,void 0===(t=pt(l,u,o))))return ft(l,e,o,a,c);e=e||{},ge(t),r(e.model)&&ne(t.options,e);var f=it(e,t,c);if(i(t.options.functional))return Gt(t,f,e,o,a);var p=e.on;if(e.on=e.nativeOn,i(t.options.abstract)){var d=e.slot;e={},d&&(e.slot=d)}te(e);var h=t.options.name||c;return new Eo("vue-component-"+t.cid+(h?"-"+h:""),e,void 0,void 0,void 0,o,{Ctor:t,propsData:f,listeners:p,tag:c,children:a},l)}}}function Qt(t,e,n,i){var o=t.componentOptions,a={_isComponent:!0,parent:e,propsData:o.propsData,_componentTag:o.tag,_parentVnode:t,_parentListeners:o.listeners,_renderChildren:o.children,_parentElm:n||null,_refElm:i||null},s=t.data.inlineTemplate;return r(s)&&(a.render=s.render,a.staticRenderFns=s.staticRenderFns),new o.Ctor(a)}function te(t){t.hook||(t.hook={});for(var e=0;e<Wo.length;e++){var n=Wo[e],r=t.hook[n],i=qo[n];t.hook[n]=r?ee(i,r):i}}function ee(t,e){return function(n,r,i,o){t(n,r,i,o),e(n,r,i,o)}}function ne(t,e){var n=t.model&&t.model.prop||"value",i=t.model&&t.model.event||"input";(e.props||(e.props={}))[n]=e.model.value;var o=e.on||(e.on={});r(o[i])?o[i]=[e.model.callback].concat(o[i]):o[i]=e.model.callback}function re(t,e,n,r,o,s){return(Array.isArray(n)||a(n))&&(o=r,r=n,n=void 0),i(s)&&(o=Go),ie(t,e,n,r,o)}function ie(t,e,n,i,o){if(r(n)&&r(n.__ob__))return Lo();if(r(n)&&r(n.is)&&(e=n.is),!e)return Lo();Array.isArray(i)&&"function"==typeof i[0]&&(n=n||{},n.scopedSlots={default:i[0]},i.length=0),o===Go?i=st(i):o===Zo&&(i=at(i));var a,s;if("string"==typeof e){var c;s=Xi.getTagNamespace(e),a=Xi.isReservedTag(e)?new Eo(Xi.parsePlatformTagName(e),n,i,void 0,void 0,t):r(c=q(t.$options,"components",e))?Yt(c,n,t,i,e):new Eo(e,n,i,void 0,void 0,t)}else a=Yt(e,n,t,i);return r(a)?(s&&oe(a,s),a):Lo()}function oe(t,e){if(t.ns=e,"foreignObject"!==t.tag&&r(t.children))for(var i=0,o=t.children.length;i<o;i++){var a=t.children[i];r(a.tag)&&n(a.ns)&&oe(a,e)}}function ae(t,e){var n,i,o,a,c;if(Array.isArray(t)||"string"==typeof t)for(n=new Array(t.length),i=0,o=t.length;i<o;i++)n[i]=e(t[i],i);else if("number"==typeof t)for(n=new Array(t),i=0;i<t;i++)n[i]=e(i+1,i);else if(s(t))for(a=Object.keys(t),n=new Array(a.length),i=0,o=a.length;i<o;i++)c=a[i],n[i]=e(t[c],c,i);return r(n)&&(n._isVList=!0),n}function se(t,e,n,r){var i=this.$scopedSlots[t];if(i)return n=n||{},r&&(n=_(_({},r),n)),i(n)||e;var o=this.$slots[t];return o||e}function ce(t){return q(this.$options,"filters",t,!0)||qi}function ue(t,e,n){var r=Xi.keyCodes[e]||n;return Array.isArray(r)?-1===r.indexOf(t):r!==t}function le(t,e,n,r,i){if(n)if(s(n)){Array.isArray(n)&&(n=b(n));var o;for(var a in n)!function(a){if("class"===a||"style"===a||Fi(a))o=t;else{var s=t.attrs&&t.attrs.type;o=r||Xi.mustUseProp(e,s,a)?t.domProps||(t.domProps={}):t.attrs||(t.attrs={})}if(!(a in o)&&(o[a]=n[a],i)){(t.on||(t.on={}))["update:"+a]=function(t){n[a]=t}}}(a)}else;return t}function fe(t,e){var n=this._staticTrees[t];return n&&!e?Array.isArray(n)?tt(n):Q(n):(n=this._staticTrees[t]=this.$options.staticRenderFns[t].call(this._renderProxy),de(n,"__static__"+t,!1),n)}function pe(t,e,n){return de(t,"__once__"+e+(n?"_"+n:""),!0),t}function de(t,e,n){if(Array.isArray(t))for(var r=0;r<t.length;r++)t[r]&&"string"!=typeof t[r]&&he(t[r],e+"_"+r,n);else he(t,e,n)}function he(t,e,n){t.isStatic=!0,t.key=e,t.isOnce=n}function ve(t,e){if(e)if(c(e)){var n=t.on=t.on?_({},t.on):{};for(var r in e){var i=n[r],o=e[r];n[r]=i?[].concat(o,i):o}}else;return t}function me(t){t._vnode=null,t._staticTrees=null;var e=t.$vnode=t.$options._parentVnode,n=e&&e.context;t.$slots=gt(t.$options._renderChildren,n),t.$scopedSlots=Yi,t._c=function(e,n,r,i){return re(t,e,n,r,i,!1)},t.$createElement=function(e,n,r,i){return re(t,e,n,r,i,!0)};var r=e&&e.data;I(t,"$attrs",r&&r.attrs,null,!0),I(t,"$listeners",t.$options._parentListeners,null,!0)}function ye(t,e){var n=t.$options=Object.create(t.constructor.options);n.parent=e.parent,n.propsData=e.propsData,n._parentVnode=e._parentVnode,n._parentListeners=e._parentListeners,n._renderChildren=e._renderChildren,n._componentTag=e._componentTag,n._parentElm=e._parentElm,n._refElm=e._refElm,e.render&&(n.render=e.render,n.staticRenderFns=e.staticRenderFns)}function ge(t){var e=t.options;if(t.super){var n=ge(t.super);if(n!==t.superOptions){t.superOptions=n;var r=_e(t);r&&_(t.extendOptions,r),e=t.options=K(n,t.extendOptions),e.name&&(e.components[e.name]=t)}}return e}function _e(t){var e,n=t.options,r=t.extendOptions,i=t.sealedOptions;for(var o in n)n[o]!==i[o]&&(e||(e={}),e[o]=be(n[o],r[o],i[o]));return e}function be(t,e,n){if(Array.isArray(t)){var r=[];n=Array.isArray(n)?n:[n],e=Array.isArray(e)?e:[e];for(var i=0;i<t.length;i++)(e.indexOf(t[i])>=0||n.indexOf(t[i])<0)&&r.push(t[i]);return r}return t}function we(t){this._init(t)}function $e(t){t.use=function(t){var e=this._installedPlugins||(this._installedPlugins=[]);if(e.indexOf(t)>-1)return this;var n=g(arguments,1);return n.unshift(this),"function"==typeof t.install?t.install.apply(t,n):"function"==typeof t&&t.apply(null,n),e.push(t),this}}function Ce(t){t.mixin=function(t){return this.options=K(this.options,t),this}}function xe(t){t.cid=0;var e=1;t.extend=function(t){t=t||{};var n=this,r=n.cid,i=t._Ctor||(t._Ctor={});if(i[r])return i[r];var o=t.name||n.options.name,a=function(t){this._init(t)};return a.prototype=Object.create(n.prototype),a.prototype.constructor=a,a.cid=e++,a.options=K(n.options,t),a.super=n,a.options.props&&Ae(a),a.options.computed&&ke(a),a.extend=n.extend,a.mixin=n.mixin,a.use=n.use,Zi.forEach(function(t){a[t]=n[t]}),o&&(a.options.components[o]=a),a.superOptions=n.options,a.extendOptions=t,a.sealedOptions=_({},a.options),i[r]=a,a}}function Ae(t){var e=t.options.props;for(var n in e)Pt(t.prototype,"_props",n)}function ke(t){var e=t.options.computed;for(var n in e)Ht(t.prototype,n,e[n])}function Oe(t){Zi.forEach(function(e){t[e]=function(t,n){return n?("component"===e&&c(n)&&(n.name=n.name||t,n=this.options._base.extend(n)),"directive"===e&&"function"==typeof n&&(n={bind:n,update:n}),this.options[e+"s"][t]=n,n):this.options[e+"s"][t]}})}function Se(t){return t&&(t.Ctor.options.name||t.tag)}function Te(t,e){return Array.isArray(t)?t.indexOf(e)>-1:"string"==typeof t?t.split(",").indexOf(e)>-1:!!u(t)&&t.test(e)}function Ee(t,e,n){for(var r in t){var i=t[r];if(i){var o=Se(i.componentOptions);o&&!n(o)&&(i!==e&&je(i),t[r]=null)}}}function je(t){t&&t.componentInstance.$destroy()}function Ne(t){for(var e=t.data,n=t,i=t;r(i.componentInstance);)i=i.componentInstance._vnode,i.data&&(e=Le(i.data,e));for(;r(n=n.parent);)n.data&&(e=Le(e,n.data));return Me(e.staticClass,e.class)}function Le(t,e){return{staticClass:Ie(t.staticClass,e.staticClass),class:r(t.class)?[t.class,e.class]:e.class}}function Me(t,e){return r(t)||r(e)?Ie(t,Pe(e)):""}function Ie(t,e){return t?e?t+" "+e:t:e||""}function Pe(t){return Array.isArray(t)?Re(t):s(t)?De(t):"string"==typeof t?t:""}function Re(t){for(var e,n="",i=0,o=t.length;i<o;i++)r(e=Pe(t[i]))&&""!==e&&(n&&(n+=" "),n+=e);return n}function De(t){var e="";for(var n in t)t[n]&&(e&&(e+=" "),e+=n);return e}function Fe(t){return wa(t)?"svg":"math"===t?"math":void 0}function Be(t){if(!no)return!0;if(Ca(t))return!1;if(t=t.toLowerCase(),null!=xa[t])return xa[t];var e=document.createElement(t);return t.indexOf("-")>-1?xa[t]=e.constructor===window.HTMLUnknownElement||e.constructor===window.HTMLElement:xa[t]=/HTMLUnknownElement/.test(e.toString())}function Ue(t){if("string"==typeof t){var e=document.querySelector(t);return e||document.createElement("div")}return t}function He(t,e){var n=document.createElement(t);return"select"!==t?n:(e.data&&e.data.attrs&&void 0!==e.data.attrs.multiple&&n.setAttribute("multiple","multiple"),n)}function Ve(t,e){return document.createElementNS(_a[t],e)}function ze(t){return document.createTextNode(t)}function Je(t){return document.createComment(t)}function Ke(t,e,n){t.insertBefore(e,n)}function qe(t,e){t.removeChild(e)}function We(t,e){t.appendChild(e)}function Ze(t){return t.parentNode}function Ge(t){return t.nextSibling}function Xe(t){return t.tagName}function Ye(t,e){t.textContent=e}function Qe(t,e,n){t.setAttribute(e,n)}function tn(t,e){var n=t.data.ref;if(n){var r=t.context,i=t.componentInstance||t.elm,o=r.$refs;e?Array.isArray(o[n])?h(o[n],i):o[n]===i&&(o[n]=void 0):t.data.refInFor?Array.isArray(o[n])?o[n].indexOf(i)<0&&o[n].push(i):o[n]=[i]:o[n]=i}}function en(t,e){return t.key===e.key&&(t.tag===e.tag&&t.isComment===e.isComment&&r(t.data)===r(e.data)&&nn(t,e)||i(t.isAsyncPlaceholder)&&t.asyncFactory===e.asyncFactory&&n(e.asyncFactory.error))}function nn(t,e){if("input"!==t.tag)return!0;var n;return(r(n=t.data)&&r(n=n.attrs)&&n.type)===(r(n=e.data)&&r(n=n.attrs)&&n.type)}function rn(t,e,n){var i,o,a={};for(i=e;i<=n;++i)o=t[i].key,r(o)&&(a[o]=i);return a}function on(t,e){(t.data.directives||e.data.directives)&&an(t,e)}function an(t,e){var n,r,i,o=t===Oa,a=e===Oa,s=sn(t.data.directives,t.context),c=sn(e.data.directives,e.context),u=[],l=[];for(n in c)r=s[n],i=c[n],r?(i.oldValue=r.value,un(i,"update",e,t),i.def&&i.def.componentUpdated&&l.push(i)):(un(i,"bind",e,t),i.def&&i.def.inserted&&u.push(i));if(u.length){var f=function(){for(var n=0;n<u.length;n++)un(u[n],"inserted",e,t)};o?rt(e.data.hook||(e.data.hook={}),"insert",f):f()}if(l.length&&rt(e.data.hook||(e.data.hook={}),"postpatch",function(){for(var n=0;n<l.length;n++)un(l[n],"componentUpdated",e,t)}),!o)for(n in s)c[n]||un(s[n],"unbind",t,t,a)}function sn(t,e){var n=Object.create(null);if(!t)return n;var r,i;for(r=0;r<t.length;r++)i=t[r],i.modifiers||(i.modifiers=Ea),n[cn(i)]=i,i.def=q(e.$options,"directives",i.name,!0);return n}function cn(t){return t.rawName||t.name+"."+Object.keys(t.modifiers||{}).join(".")}function un(t,e,n,r,i){var o=t.def&&t.def[e];if(o)try{o(n.elm,t,n,r,i)}catch(r){S(r,n.context,"directive "+t.name+" "+e+" hook")}}function ln(t,e){var i=e.componentOptions;if(!(r(i)&&!1===i.Ctor.options.inheritAttrs||n(t.data.attrs)&&n(e.data.attrs))){var o,a,s=e.elm,c=t.data.attrs||{},u=e.data.attrs||{};r(u.__ob__)&&(u=e.data.attrs=_({},u));for(o in u)a=u[o],c[o]!==a&&fn(s,o,a);oo&&u.value!==c.value&&fn(s,"value",u.value);for(o in c)n(u[o])&&(ma(o)?s.removeAttributeNS(va,ya(o)):da(o)||s.removeAttribute(o))}}function fn(t,e,n){ha(e)?ga(n)?t.removeAttribute(e):t.setAttribute(e,e):da(e)?t.setAttribute(e,ga(n)||"false"===n?"false":"true"):ma(e)?ga(n)?t.removeAttributeNS(va,ya(e)):t.setAttributeNS(va,e,n):ga(n)?t.removeAttribute(e):t.setAttribute(e,n)}function pn(t,e){var i=e.elm,o=e.data,a=t.data;if(!(n(o.staticClass)&&n(o.class)&&(n(a)||n(a.staticClass)&&n(a.class)))){var s=Ne(e),c=i._transitionClasses;r(c)&&(s=Ie(s,Pe(c))),s!==i._prevClass&&(i.setAttribute("class",s),i._prevClass=s)}}function dn(t){function e(){(a||(a=[])).push(t.slice(h,i).trim()),h=i+1}var n,r,i,o,a,s=!1,c=!1,u=!1,l=!1,f=0,p=0,d=0,h=0;for(i=0;i<t.length;i++)if(r=n,n=t.charCodeAt(i),s)39===n&&92!==r&&(s=!1);else if(c)34===n&&92!==r&&(c=!1);else if(u)96===n&&92!==r&&(u=!1);else if(l)47===n&&92!==r&&(l=!1);else if(124!==n||124===t.charCodeAt(i+1)||124===t.charCodeAt(i-1)||f||p||d){switch(n){case 34:c=!0;break;case 39:s=!0;break;case 96:u=!0;break;case 40:d++;break;case 41:d--;break;case 91:p++;break;case 93:p--;break;case 123:f++;break;case 125:f--}if(47===n){for(var v=i-1,m=void 0;v>=0&&" "===(m=t.charAt(v));v--);m&&Ma.test(m)||(l=!0)}}else void 0===o?(h=i+1,o=t.slice(0,i).trim()):e();if(void 0===o?o=t.slice(0,i).trim():0!==h&&e(),a)for(i=0;i<a.length;i++)o=hn(o,a[i]);return o}function hn(t,e){var n=e.indexOf("(");return n<0?'_f("'+e+'")('+t+")":'_f("'+e.slice(0,n)+'")('+t+","+e.slice(n+1)}function vn(t){console.error("[Vue compiler]: "+t)}function mn(t,e){return t?t.map(function(t){return t[e]}).filter(function(t){return t}):[]}function yn(t,e,n){(t.props||(t.props=[])).push({name:e,value:n})}function gn(t,e,n){(t.attrs||(t.attrs=[])).push({name:e,value:n})}function _n(t,e,n,r,i,o){(t.directives||(t.directives=[])).push({name:e,rawName:n,value:r,arg:i,modifiers:o})}function bn(t,e,n,r,i,o){r&&r.capture&&(delete r.capture,e="!"+e),r&&r.once&&(delete r.once,e="~"+e),r&&r.passive&&(delete r.passive,e="&"+e);var a;r&&r.native?(delete r.native,a=t.nativeEvents||(t.nativeEvents={})):a=t.events||(t.events={});var s={value:n,modifiers:r},c=a[e];Array.isArray(c)?i?c.unshift(s):c.push(s):a[e]=c?i?[s,c]:[c,s]:s}function wn(t,e,n){var r=$n(t,":"+e)||$n(t,"v-bind:"+e);if(null!=r)return dn(r);if(!1!==n){var i=$n(t,e);if(null!=i)return JSON.stringify(i)}}function $n(t,e){var n;if(null!=(n=t.attrsMap[e]))for(var r=t.attrsList,i=0,o=r.length;i<o;i++)if(r[i].name===e){r.splice(i,1);break}return n}function Cn(t,e,n){var r=n||{},i=r.number,o=r.trim,a="$$v";o&&(a="(typeof $$v === 'string'? $$v.trim(): $$v)"),i&&(a="_n("+a+")");var s=xn(e,a);t.model={value:"("+e+")",expression:'"'+e+'"',callback:"function ($$v) {"+s+"}"}}function xn(t,e){var n=An(t);return null===n.idx?t+"="+e:"$set("+n.exp+", "+n.idx+", "+e+")"}function An(t){if(na=t,ea=na.length,ia=oa=aa=0,t.indexOf("[")<0||t.lastIndexOf("]")<ea-1)return{exp:t,idx:null};for(;!On();)ra=kn(),Sn(ra)?En(ra):91===ra&&Tn(ra);return{exp:t.substring(0,oa),idx:t.substring(oa+1,aa)}}function kn(){return na.charCodeAt(++ia)}function On(){return ia>=ea}function Sn(t){return 34===t||39===t}function Tn(t){var e=1;for(oa=ia;!On();)if(t=kn(),Sn(t))En(t);else if(91===t&&e++,93===t&&e--,0===e){aa=ia;break}}function En(t){for(var e=t;!On()&&(t=kn())!==e;);}function jn(t,e,n){sa=n;var r=e.value,i=e.modifiers,o=t.tag,a=t.attrsMap.type;if(t.component)return Cn(t,r,i),!1;if("select"===o)Mn(t,r,i);else if("input"===o&&"checkbox"===a)Nn(t,r,i);else if("input"===o&&"radio"===a)Ln(t,r,i);else if("input"===o||"textarea"===o)In(t,r,i);else if(!Xi.isReservedTag(o))return Cn(t,r,i),!1;return!0}function Nn(t,e,n){var r=n&&n.number,i=wn(t,"value")||"null",o=wn(t,"true-value")||"true",a=wn(t,"false-value")||"false";yn(t,"checked","Array.isArray("+e+")?_i("+e+","+i+")>-1"+("true"===o?":("+e+")":":_q("+e+","+o+")")),bn(t,Pa,"var $$a="+e+",$$el=$event.target,$$c=$$el.checked?("+o+"):("+a+");if(Array.isArray($$a)){var $$v="+(r?"_n("+i+")":i)+",$$i=_i($$a,$$v);if($$el.checked){$$i<0&&("+e+"=$$a.concat($$v))}else{$$i>-1&&("+e+"=$$a.slice(0,$$i).concat($$a.slice($$i+1)))}}else{"+xn(e,"$$c")+"}",null,!0)}function Ln(t,e,n){var r=n&&n.number,i=wn(t,"value")||"null";i=r?"_n("+i+")":i,yn(t,"checked","_q("+e+","+i+")"),bn(t,Pa,xn(e,i),null,!0)}function Mn(t,e,n){var r=n&&n.number,i='Array.prototype.filter.call($event.target.options,function(o){return o.selected}).map(function(o){var val = "_value" in o ? o._value : o.value;return '+(r?"_n(val)":"val")+"})",o="var $$selectedVal = "+i+";";o=o+" "+xn(e,"$event.target.multiple ? $$selectedVal : $$selectedVal[0]"),bn(t,"change",o,null,!0)}function In(t,e,n){var r=t.attrsMap.type,i=n||{},o=i.lazy,a=i.number,s=i.trim,c=!o&&"range"!==r,u=o?"change":"range"===r?Ia:"input",l="$event.target.value";s&&(l="$event.target.value.trim()"),a&&(l="_n("+l+")");var f=xn(e,l);c&&(f="if($event.target.composing)return;"+f),yn(t,"value","("+e+")"),bn(t,u,f,null,!0),(s||a)&&bn(t,"blur","$forceUpdate()")}function Pn(t){var e;r(t[Ia])&&(e=io?"change":"input",t[e]=[].concat(t[Ia],t[e]||[]),delete t[Ia]),r(t[Pa])&&(e=uo?"click":"change",t[e]=[].concat(t[Pa],t[e]||[]),delete t[Pa])}function Rn(t,e,n,r,i){if(n){var o=e,a=ca;e=function(n){null!==(1===arguments.length?o(n):o.apply(null,arguments))&&Dn(t,e,r,a)}}ca.addEventListener(t,e,fo?{capture:r,passive:i}:r)}function Dn(t,e,n,r){(r||ca).removeEventListener(t,e,n)}function Fn(t,e){if(!n(t.data.on)||!n(e.data.on)){var r=e.data.on||{},i=t.data.on||{};ca=e.elm,Pn(r),nt(r,i,Rn,Dn,e.context)}}function Bn(t,e){if(!n(t.data.domProps)||!n(e.data.domProps)){var i,o,a=e.elm,s=t.data.domProps||{},c=e.data.domProps||{};r(c.__ob__)&&(c=e.data.domProps=_({},c));for(i in s)n(c[i])&&(a[i]="");for(i in c)if(o=c[i],"textContent"!==i&&"innerHTML"!==i||(e.children&&(e.children.length=0),o!==s[i]))if("value"===i){a._value=o;var u=n(o)?"":String(o);Un(a,e,u)&&(a.value=u)}else a[i]=o}}function Un(t,e,n){return!t.composing&&("option"===e.tag||Hn(t,n)||Vn(t,n))}function Hn(t,e){var n=!0;try{n=document.activeElement!==t}catch(t){}return n&&t.value!==e}function Vn(t,e){var n=t.value,i=t._vModifiers;return r(i)&&i.number?p(n)!==p(e):r(i)&&i.trim?n.trim()!==e.trim():n!==e}function zn(t){var e=Jn(t.style);return t.staticStyle?_(t.staticStyle,e):e}function Jn(t){return Array.isArray(t)?b(t):"string"==typeof t?Fa(t):t}function Kn(t,e){var n,r={};if(e)for(var i=t;i.componentInstance;)i=i.componentInstance._vnode,i.data&&(n=zn(i.data))&&_(r,n);(n=zn(t.data))&&_(r,n);for(var o=t;o=o.parent;)o.data&&(n=zn(o.data))&&_(r,n);return r}function qn(t,e){var i=e.data,o=t.data;if(!(n(i.staticStyle)&&n(i.style)&&n(o.staticStyle)&&n(o.style))){var a,s,c=e.elm,u=o.staticStyle,l=o.normalizedStyle||o.style||{},f=u||l,p=Jn(e.data.style)||{};e.data.normalizedStyle=r(p.__ob__)?_({},p):p;var d=Kn(e,!0);for(s in f)n(d[s])&&Ha(c,s,"");for(s in d)(a=d[s])!==f[s]&&Ha(c,s,null==a?"":a)}}function Wn(t,e){if(e&&(e=e.trim()))if(t.classList)e.indexOf(" ")>-1?e.split(/\s+/).forEach(function(e){return t.classList.add(e)}):t.classList.add(e);else{var n=" "+(t.getAttribute("class")||"")+" ";n.indexOf(" "+e+" ")<0&&t.setAttribute("class",(n+e).trim())}}function Zn(t,e){if(e&&(e=e.trim()))if(t.classList)e.indexOf(" ")>-1?e.split(/\s+/).forEach(function(e){return t.classList.remove(e)}):t.classList.remove(e),t.classList.length||t.removeAttribute("class");else{for(var n=" "+(t.getAttribute("class")||"")+" ",r=" "+e+" ";n.indexOf(r)>=0;)n=n.replace(r," ");n=n.trim(),n?t.setAttribute("class",n):t.removeAttribute("class")}}function Gn(t){if(t){if("object"==typeof t){var e={};return!1!==t.css&&_(e,Ka(t.name||"v")),_(e,t),e}return"string"==typeof t?Ka(t):void 0}}function Xn(t){ts(function(){ts(t)})}function Yn(t,e){var n=t._transitionClasses||(t._transitionClasses=[]);n.indexOf(e)<0&&(n.push(e),Wn(t,e))}function Qn(t,e){t._transitionClasses&&h(t._transitionClasses,e),Zn(t,e)}function tr(t,e,n){var r=er(t,e),i=r.type,o=r.timeout,a=r.propCount;if(!i)return n();var s=i===Wa?Xa:Qa,c=0,u=function(){t.removeEventListener(s,l),n()},l=function(e){e.target===t&&++c>=a&&u()};setTimeout(function(){c<a&&u()},o+1),t.addEventListener(s,l)}function er(t,e){var n,r=window.getComputedStyle(t),i=r[Ga+"Delay"].split(", "),o=r[Ga+"Duration"].split(", "),a=nr(i,o),s=r[Ya+"Delay"].split(", "),c=r[Ya+"Duration"].split(", "),u=nr(s,c),l=0,f=0;return e===Wa?a>0&&(n=Wa,l=a,f=o.length):e===Za?u>0&&(n=Za,l=u,f=c.length):(l=Math.max(a,u),n=l>0?a>u?Wa:Za:null,f=n?n===Wa?o.length:c.length:0),{type:n,timeout:l,propCount:f,hasTransform:n===Wa&&es.test(r[Ga+"Property"])}}function nr(t,e){for(;t.length<e.length;)t=t.concat(t);return Math.max.apply(null,e.map(function(e,n){return rr(e)+rr(t[n])}))}function rr(t){return 1e3*Number(t.slice(0,-1))}function ir(t,e){var i=t.elm;r(i._leaveCb)&&(i._leaveCb.cancelled=!0,i._leaveCb());var o=Gn(t.data.transition);if(!n(o)&&!r(i._enterCb)&&1===i.nodeType){for(var a=o.css,c=o.type,u=o.enterClass,l=o.enterToClass,f=o.enterActiveClass,d=o.appearClass,h=o.appearToClass,v=o.appearActiveClass,m=o.beforeEnter,y=o.enter,g=o.afterEnter,_=o.enterCancelled,b=o.beforeAppear,w=o.appear,$=o.afterAppear,C=o.appearCancelled,A=o.duration,k=Io,O=Io.$vnode;O&&O.parent;)O=O.parent,k=O.context;var S=!k._isMounted||!t.isRootInsert;if(!S||w||""===w){var T=S&&d?d:u,E=S&&v?v:f,j=S&&h?h:l,N=S?b||m:m,L=S&&"function"==typeof w?w:y,M=S?$||g:g,I=S?C||_:_,P=p(s(A)?A.enter:A),R=!1!==a&&!oo,D=sr(L),F=i._enterCb=x(function(){R&&(Qn(i,j),Qn(i,E)),F.cancelled?(R&&Qn(i,T),I&&I(i)):M&&M(i),i._enterCb=null});t.data.show||rt(t.data.hook||(t.data.hook={}),"insert",function(){var e=i.parentNode,n=e&&e._pending&&e._pending[t.key];n&&n.tag===t.tag&&n.elm._leaveCb&&n.elm._leaveCb(),L&&L(i,F)}),N&&N(i),R&&(Yn(i,T),Yn(i,E),Xn(function(){Yn(i,j),Qn(i,T),F.cancelled||D||(ar(P)?setTimeout(F,P):tr(i,c,F))})),t.data.show&&(e&&e(),L&&L(i,F)),R||D||F()}}}function or(t,e){function i(){C.cancelled||(t.data.show||((o.parentNode._pending||(o.parentNode._pending={}))[t.key]=t),h&&h(o),b&&(Yn(o,l),Yn(o,d),Xn(function(){Yn(o,f),Qn(o,l),C.cancelled||w||(ar($)?setTimeout(C,$):tr(o,u,C))})),v&&v(o,C),b||w||C())}var o=t.elm;r(o._enterCb)&&(o._enterCb.cancelled=!0,o._enterCb());var a=Gn(t.data.transition);if(n(a))return e();if(!r(o._leaveCb)&&1===o.nodeType){var c=a.css,u=a.type,l=a.leaveClass,f=a.leaveToClass,d=a.leaveActiveClass,h=a.beforeLeave,v=a.leave,m=a.afterLeave,y=a.leaveCancelled,g=a.delayLeave,_=a.duration,b=!1!==c&&!oo,w=sr(v),$=p(s(_)?_.leave:_),C=o._leaveCb=x(function(){o.parentNode&&o.parentNode._pending&&(o.parentNode._pending[t.key]=null),b&&(Qn(o,f),Qn(o,d)),C.cancelled?(b&&Qn(o,l),y&&y(o)):(e(),m&&m(o)),o._leaveCb=null});g?g(i):i()}}function ar(t){return"number"==typeof t&&!isNaN(t)}function sr(t){if(n(t))return!1;var e=t.fns;return r(e)?sr(Array.isArray(e)?e[0]:e):(t._length||t.length)>1}function cr(t,e){!0!==e.data.show&&ir(e)}function ur(t,e,n){var r=e.value,i=t.multiple;if(!i||Array.isArray(r)){for(var o,a,s=0,c=t.options.length;s<c;s++)if(a=t.options[s],i)o=C(r,lr(a))>-1,a.selected!==o&&(a.selected=o);else if($(lr(a),r))return void(t.selectedIndex!==s&&(t.selectedIndex=s));i||(t.selectedIndex=-1)}}function lr(t){return"_value"in t?t._value:t.value}function fr(t){t.target.composing=!0}function pr(t){t.target.composing&&(t.target.composing=!1,dr(t.target,"input"))}function dr(t,e){var n=document.createEvent("HTMLEvents");n.initEvent(e,!0,!0),t.dispatchEvent(n)}function hr(t){return!t.componentInstance||t.data&&t.data.transition?t:hr(t.componentInstance._vnode)}function vr(t){var e=t&&t.componentOptions;return e&&e.Ctor.options.abstract?vr(dt(e.children)):t}function mr(t){var e={},n=t.$options;for(var r in n.propsData)e[r]=t[r];var i=n._parentListeners;for(var o in i)e[Hi(o)]=i[o];return e}function yr(t,e){if(/\d-keep-alive$/.test(e.tag))return t("keep-alive",{props:e.componentOptions.propsData})}function gr(t){for(;t=t.parent;)if(t.data.transition)return!0}function _r(t,e){return e.key===t.key&&e.tag===t.tag}function br(t){return t.isComment&&t.asyncFactory}function wr(t){t.elm._moveCb&&t.elm._moveCb(),t.elm._enterCb&&t.elm._enterCb()}function $r(t){t.data.newPos=t.elm.getBoundingClientRect()}function Cr(t){var e=t.data.pos,n=t.data.newPos,r=e.left-n.left,i=e.top-n.top;if(r||i){t.data.moved=!0;var o=t.elm.style;o.transform=o.WebkitTransform="translate("+r+"px,"+i+"px)",o.transitionDuration="0s"}}function xr(t,e){var n=e?_s(e):ys;if(n.test(t)){for(var r,i,o=[],a=n.lastIndex=0;r=n.exec(t);){i=r.index,i>a&&o.push(JSON.stringify(t.slice(a,i)));var s=dn(r[1].trim());o.push("_s("+s+")"),a=i+r[0].length}return a<t.length&&o.push(JSON.stringify(t.slice(a))),o.join("+")}}function Ar(t,e){var n=(e.warn,$n(t,"class"));n&&(t.staticClass=JSON.stringify(n));var r=wn(t,"class",!1);r&&(t.classBinding=r)}function kr(t){var e="";return t.staticClass&&(e+="staticClass:"+t.staticClass+","),t.classBinding&&(e+="class:"+t.classBinding+","),e}function Or(t,e){var n=(e.warn,$n(t,"style"));if(n){t.staticStyle=JSON.stringify(Fa(n))}var r=wn(t,"style",!1);r&&(t.styleBinding=r)}function Sr(t){var e="";return t.staticStyle&&(e+="staticStyle:"+t.staticStyle+","),t.styleBinding&&(e+="style:("+t.styleBinding+"),"),e}function Tr(t,e){e.value&&yn(t,"textContent","_s("+e.value+")")}function Er(t,e){e.value&&yn(t,"innerHTML","_s("+e.value+")")}function jr(t,e){var n=e?nc:ec;return t.replace(n,function(t){return tc[t]})}function Nr(t,e){function n(e){l+=e,t=t.substring(e)}function r(t,n,r){var i,s;if(null==n&&(n=l),null==r&&(r=l),t&&(s=t.toLowerCase()),t)for(i=a.length-1;i>=0&&a[i].lowerCasedTag!==s;i--);else i=0;if(i>=0){for(var c=a.length-1;c>=i;c--)e.end&&e.end(a[c].tag,n,r);a.length=i,o=i&&a[i-1].tag}else"br"===s?e.start&&e.start(t,[],!0,n,r):"p"===s&&(e.start&&e.start(t,[],!1,n,r),e.end&&e.end(t,n,r))}for(var i,o,a=[],s=e.expectHTML,c=e.isUnaryTag||Ki,u=e.canBeLeftOpenTag||Ki,l=0;t;){if(i=t,o&&Ys(o)){var f=0,p=o.toLowerCase(),d=Qs[p]||(Qs[p]=new RegExp("([\\s\\S]*?)(</"+p+"[^>]*>)","i")),h=t.replace(d,function(t,n,r){return f=r.length,Ys(p)||"noscript"===p||(n=n.replace(/<!--([\s\S]*?)-->/g,"$1").replace(/<!\[CDATA\[([\s\S]*?)]]>/g,"$1")),ic(p,n)&&(n=n.slice(1)),e.chars&&e.chars(n),""});l+=t.length-h.length,t=h,r(p,l-f,l)}else{var v=t.indexOf("<");if(0===v){if(Fs.test(t)){var m=t.indexOf("--\x3e");if(m>=0){e.shouldKeepComment&&e.comment(t.substring(4,m)),n(m+3);continue}}if(Bs.test(t)){var y=t.indexOf("]>");if(y>=0){n(y+2);continue}}var g=t.match(Ds);if(g){n(g[0].length);continue}var _=t.match(Rs);if(_){var b=l;n(_[0].length),r(_[1],b,l);continue}var w=function(){var e=t.match(Is);if(e){var r={tagName:e[1],attrs:[],start:l};n(e[0].length);for(var i,o;!(i=t.match(Ps))&&(o=t.match(Ns));)n(o[0].length),r.attrs.push(o);if(i)return r.unarySlash=i[1],n(i[0].length),r.end=l,r}}();if(w){!function(t){var n=t.tagName,i=t.unarySlash;s&&("p"===o&&ks(n)&&r(o),u(n)&&o===n&&r(n));for(var l=c(n)||!!i,f=t.attrs.length,p=new Array(f),d=0;d<f;d++){var h=t.attrs[d];Us&&-1===h[0].indexOf('""')&&(""===h[3]&&delete h[3],""===h[4]&&delete h[4],""===h[5]&&delete h[5]);var v=h[3]||h[4]||h[5]||"";p[d]={name:h[1],value:jr(v,e.shouldDecodeNewlines)}}l||(a.push({tag:n,lowerCasedTag:n.toLowerCase(),attrs:p}),o=n),e.start&&e.start(n,p,l,t.start,t.end)}(w),ic(o,t)&&n(1);continue}}var $=void 0,C=void 0,x=void 0;if(v>=0){for(C=t.slice(v);!(Rs.test(C)||Is.test(C)||Fs.test(C)||Bs.test(C)||(x=C.indexOf("<",1))<0);)v+=x,C=t.slice(v);$=t.substring(0,v),n(v)}v<0&&($=t,t=""),e.chars&&$&&e.chars($)}if(t===i){e.chars&&e.chars(t);break}}r()}function Lr(t,e){function n(t){t.pre&&(s=!1),qs(t.tag)&&(c=!1)}Hs=e.warn||vn,qs=e.isPreTag||Ki,Ws=e.mustUseProp||Ki,Zs=e.getTagNamespace||Ki,zs=mn(e.modules,"transformNode"),Js=mn(e.modules,"preTransformNode"),Ks=mn(e.modules,"postTransformNode"),Vs=e.delimiters;var r,i,o=[],a=!1!==e.preserveWhitespace,s=!1,c=!1;return Nr(t,{warn:Hs,expectHTML:e.expectHTML,isUnaryTag:e.isUnaryTag,canBeLeftOpenTag:e.canBeLeftOpenTag,shouldDecodeNewlines:e.shouldDecodeNewlines,shouldKeepComment:e.comments,start:function(t,a,u){var l=i&&i.ns||Zs(t);io&&"svg"===l&&(a=Yr(a));var f={type:1,tag:t,attrsList:a,attrsMap:Zr(a),parent:i,children:[]};l&&(f.ns=l),Xr(f)&&!mo()&&(f.forbidden=!0);for(var p=0;p<Js.length;p++)Js[p](f,e);if(s||(Mr(f),f.pre&&(s=!0)),qs(f.tag)&&(c=!0),s)Ir(f);else{Dr(f),Fr(f),Vr(f),Pr(f),f.plain=!f.key&&!a.length,Rr(f),zr(f),Jr(f);for(var d=0;d<zs.length;d++)zs[d](f,e);Kr(f)}if(r?o.length||r.if&&(f.elseif||f.else)&&Hr(r,{exp:f.elseif,block:f}):r=f,i&&!f.forbidden)if(f.elseif||f.else)Br(f,i);else if(f.slotScope){i.plain=!1;var h=f.slotTarget||'"default"';(i.scopedSlots||(i.scopedSlots={}))[h]=f}else i.children.push(f),f.parent=i;u?n(f):(i=f,o.push(f));for(var v=0;v<Ks.length;v++)Ks[v](f,e)},end:function(){var t=o[o.length-1],e=t.children[t.children.length-1];e&&3===e.type&&" "===e.text&&!c&&t.children.pop(),o.length-=1,i=o[o.length-1],n(t)},chars:function(t){if(i&&(!io||"textarea"!==i.tag||i.attrsMap.placeholder!==t)){var e=i.children;if(t=c||t.trim()?Gr(i)?t:pc(t):a&&e.length?" ":""){var n;!s&&" "!==t&&(n=xr(t,Vs))?e.push({type:2,expression:n,text:t}):" "===t&&e.length&&" "===e[e.length-1].text||e.push({type:3,text:t})}}},comment:function(t){i.children.push({type:3,text:t,isComment:!0})}}),r}function Mr(t){null!=$n(t,"v-pre")&&(t.pre=!0)}function Ir(t){var e=t.attrsList.length;if(e)for(var n=t.attrs=new Array(e),r=0;r<e;r++)n[r]={name:t.attrsList[r].name,value:JSON.stringify(t.attrsList[r].value)};else t.pre||(t.plain=!0)}function Pr(t){var e=wn(t,"key");e&&(t.key=e)}function Rr(t){var e=wn(t,"ref");e&&(t.ref=e,t.refInFor=qr(t))}function Dr(t){var e;if(e=$n(t,"v-for")){var n=e.match(sc);if(!n)return;t.for=n[2].trim();var r=n[1].trim(),i=r.match(cc);i?(t.alias=i[1].trim(),t.iterator1=i[2].trim(),i[3]&&(t.iterator2=i[3].trim())):t.alias=r}}function Fr(t){var e=$n(t,"v-if");if(e)t.if=e,Hr(t,{exp:e,block:t});else{null!=$n(t,"v-else")&&(t.else=!0);var n=$n(t,"v-else-if");n&&(t.elseif=n)}}function Br(t,e){var n=Ur(e.children);n&&n.if&&Hr(n,{exp:t.elseif,block:t})}function Ur(t){for(var e=t.length;e--;){if(1===t[e].type)return t[e];t.pop()}}function Hr(t,e){t.ifConditions||(t.ifConditions=[]),t.ifConditions.push(e)}function Vr(t){null!=$n(t,"v-once")&&(t.once=!0)}function zr(t){if("slot"===t.tag)t.slotName=wn(t,"name");else{var e=wn(t,"slot");e&&(t.slotTarget='""'===e?'"default"':e),"template"===t.tag&&(t.slotScope=$n(t,"scope"))}}function Jr(t){var e;(e=wn(t,"is"))&&(t.component=e),null!=$n(t,"inline-template")&&(t.inlineTemplate=!0)}function Kr(t){var e,n,r,i,o,a,s,c=t.attrsList;for(e=0,n=c.length;e<n;e++)if(r=i=c[e].name,o=c[e].value,ac.test(r))if(t.hasBindings=!0,a=Wr(r),a&&(r=r.replace(fc,"")),lc.test(r))r=r.replace(lc,""),o=dn(o),s=!1,a&&(a.prop&&(s=!0,"innerHtml"===(r=Hi(r))&&(r="innerHTML")),a.camel&&(r=Hi(r)),a.sync&&bn(t,"update:"+Hi(r),xn(o,"$event"))),s||!t.component&&Ws(t.tag,t.attrsMap.type,r)?yn(t,r,o):gn(t,r,o);else if(oc.test(r))r=r.replace(oc,""),bn(t,r,o,a,!1,Hs);else{r=r.replace(ac,"");var u=r.match(uc),l=u&&u[1];l&&(r=r.slice(0,-(l.length+1))),_n(t,r,i,o,l,a)}else{gn(t,r,JSON.stringify(o))}}function qr(t){for(var e=t;e;){if(void 0!==e.for)return!0;e=e.parent}return!1}function Wr(t){var e=t.match(fc);if(e){var n={};return e.forEach(function(t){n[t.slice(1)]=!0}),n}}function Zr(t){for(var e={},n=0,r=t.length;n<r;n++)e[t[n].name]=t[n].value;return e}function Gr(t){return"script"===t.tag||"style"===t.tag}function Xr(t){return"style"===t.tag||"script"===t.tag&&(!t.attrsMap.type||"text/javascript"===t.attrsMap.type)}function Yr(t){for(var e=[],n=0;n<t.length;n++){var r=t[n];dc.test(r.name)||(r.name=r.name.replace(hc,""),e.push(r))}return e}function Qr(t,e){t&&(Gs=vc(e.staticKeys||""),Xs=e.isReservedTag||Ki,ei(t),ni(t,!1))}function ti(t){return d("type,tag,attrsList,attrsMap,plain,parent,children,attrs"+(t?","+t:""))}function ei(t){if(t.static=ri(t),1===t.type){if(!Xs(t.tag)&&"slot"!==t.tag&&null==t.attrsMap["inline-template"])return;for(var e=0,n=t.children.length;e<n;e++){var r=t.children[e];ei(r),r.static||(t.static=!1)}if(t.ifConditions)for(var i=1,o=t.ifConditions.length;i<o;i++){var a=t.ifConditions[i].block;ei(a),a.static||(t.static=!1)}}}function ni(t,e){if(1===t.type){if((t.static||t.once)&&(t.staticInFor=e),t.static&&t.children.length&&(1!==t.children.length||3!==t.children[0].type))return void(t.staticRoot=!0);if(t.staticRoot=!1,t.children)for(var n=0,r=t.children.length;n<r;n++)ni(t.children[n],e||!!t.for);if(t.ifConditions)for(var i=1,o=t.ifConditions.length;i<o;i++)ni(t.ifConditions[i].block,e)}}function ri(t){return 2!==t.type&&(3===t.type||!(!t.pre&&(t.hasBindings||t.if||t.for||Di(t.tag)||!Xs(t.tag)||ii(t)||!Object.keys(t).every(Gs))))}function ii(t){for(;t.parent;){if(t=t.parent,"template"!==t.tag)return!1;if(t.for)return!0}return!1}function oi(t,e,n){var r=e?"nativeOn:{":"on:{";for(var i in t){r+='"'+i+'":'+ai(i,t[i])+","}return r.slice(0,-1)+"}"}function ai(t,e){if(!e)return"function(){}";if(Array.isArray(e))return"["+e.map(function(e){return ai(t,e)}).join(",")+"]";var n=yc.test(e.value),r=mc.test(e.value);if(e.modifiers){var i="",o="",a=[];for(var s in e.modifiers)bc[s]?(o+=bc[s],gc[s]&&a.push(s)):a.push(s);a.length&&(i+=si(a)),o&&(i+=o);return"function($event){"+i+(n?e.value+"($event)":r?"("+e.value+")($event)":e.value)+"}"}return n||r?e.value:"function($event){"+e.value+"}"}function si(t){return"if(!('button' in $event)&&"+t.map(ci).join("&&")+")return null;"}function ci(t){var e=parseInt(t,10);if(e)return"$event.keyCode!=="+e;var n=gc[t];return"_k($event.keyCode,"+JSON.stringify(t)+(n?","+JSON.stringify(n):"")+")"}function ui(t,e){t.wrapListeners=function(t){return"_g("+t+","+e.value+")"}}function li(t,e){t.wrapData=function(n){return"_b("+n+",'"+t.tag+"',"+e.value+","+(e.modifiers&&e.modifiers.prop?"true":"false")+(e.modifiers&&e.modifiers.sync?",true":"")+")"}}function fi(t,e){var n=new $c(e);return{render:"with(this){return "+(t?pi(t,n):'_c("div")')+"}",staticRenderFns:n.staticRenderFns}}function pi(t,e){if(t.staticRoot&&!t.staticProcessed)return di(t,e);if(t.once&&!t.onceProcessed)return hi(t,e);if(t.for&&!t.forProcessed)return yi(t,e);if(t.if&&!t.ifProcessed)return vi(t,e);if("template"!==t.tag||t.slotTarget){if("slot"===t.tag)return Ei(t,e);var n;if(t.component)n=ji(t.component,t,e);else{var r=t.plain?void 0:gi(t,e),i=t.inlineTemplate?null:xi(t,e,!0);n="_c('"+t.tag+"'"+(r?","+r:"")+(i?","+i:"")+")"}for(var o=0;o<e.transforms.length;o++)n=e.transforms[o](t,n);return n}return xi(t,e)||"void 0"}function di(t,e){return t.staticProcessed=!0,e.staticRenderFns.push("with(this){return "+pi(t,e)+"}"),"_m("+(e.staticRenderFns.length-1)+(t.staticInFor?",true":"")+")"}function hi(t,e){if(t.onceProcessed=!0,t.if&&!t.ifProcessed)return vi(t,e);if(t.staticInFor){for(var n="",r=t.parent;r;){if(r.for){n=r.key;break}r=r.parent}return n?"_o("+pi(t,e)+","+e.onceId+++(n?","+n:"")+")":pi(t,e)}return di(t,e)}function vi(t,e,n,r){return t.ifProcessed=!0,mi(t.ifConditions.slice(),e,n,r)}function mi(t,e,n,r){function i(t){return n?n(t,e):t.once?hi(t,e):pi(t,e)}if(!t.length)return r||"_e()";var o=t.shift();return o.exp?"("+o.exp+")?"+i(o.block)+":"+mi(t,e,n,r):""+i(o.block)}function yi(t,e,n,r){var i=t.for,o=t.alias,a=t.iterator1?","+t.iterator1:"",s=t.iterator2?","+t.iterator2:"";return t.forProcessed=!0,(r||"_l")+"(("+i+"),function("+o+a+s+"){return "+(n||pi)(t,e)+"})"}function gi(t,e){var n="{",r=_i(t,e);r&&(n+=r+","),t.key&&(n+="key:"+t.key+","),t.ref&&(n+="ref:"+t.ref+","),t.refInFor&&(n+="refInFor:true,"),t.pre&&(n+="pre:true,"),t.component&&(n+='tag:"'+t.tag+'",');for(var i=0;i<e.dataGenFns.length;i++)n+=e.dataGenFns[i](t);if(t.attrs&&(n+="attrs:{"+Ni(t.attrs)+"},"),t.props&&(n+="domProps:{"+Ni(t.props)+"},"),t.events&&(n+=oi(t.events,!1,e.warn)+","),t.nativeEvents&&(n+=oi(t.nativeEvents,!0,e.warn)+","),t.slotTarget&&(n+="slot:"+t.slotTarget+","),t.scopedSlots&&(n+=wi(t.scopedSlots,e)+","),t.model&&(n+="model:{value:"+t.model.value+",callback:"+t.model.callback+",expression:"+t.model.expression+"},"),t.inlineTemplate){var o=bi(t,e);o&&(n+=o+",")}return n=n.replace(/,$/,"")+"}",t.wrapData&&(n=t.wrapData(n)),t.wrapListeners&&(n=t.wrapListeners(n)),n}function _i(t,e){var n=t.directives;if(n){var r,i,o,a,s="directives:[",c=!1;for(r=0,i=n.length;r<i;r++){o=n[r],a=!0;var u=e.directives[o.name];u&&(a=!!u(t,o,e.warn)),a&&(c=!0,s+='{name:"'+o.name+'",rawName:"'+o.rawName+'"'+(o.value?",value:("+o.value+"),expression:"+JSON.stringify(o.value):"")+(o.arg?',arg:"'+o.arg+'"':"")+(o.modifiers?",modifiers:"+JSON.stringify(o.modifiers):"")+"},")}return c?s.slice(0,-1)+"]":void 0}}function bi(t,e){var n=t.children[0];if(1===n.type){var r=fi(n,e.options);return"inlineTemplate:{render:function(){"+r.render+"},staticRenderFns:["+r.staticRenderFns.map(function(t){return"function(){"+t+"}"}).join(",")+"]}"}}function wi(t,e){return"scopedSlots:_u(["+Object.keys(t).map(function(n){return $i(n,t[n],e)}).join(",")+"])"}function $i(t,e,n){return e.for&&!e.forProcessed?Ci(t,e,n):"{key:"+t+",fn:function("+String(e.attrsMap.scope)+"){return "+("template"===e.tag?xi(e,n)||"void 0":pi(e,n))+"}}"}function Ci(t,e,n){var r=e.for,i=e.alias,o=e.iterator1?","+e.iterator1:"",a=e.iterator2?","+e.iterator2:"";return e.forProcessed=!0,"_l(("+r+"),function("+i+o+a+"){return "+$i(t,e,n)+"})"}function xi(t,e,n,r,i){var o=t.children;if(o.length){var a=o[0];if(1===o.length&&a.for&&"template"!==a.tag&&"slot"!==a.tag)return(r||pi)(a,e);var s=n?Ai(o,e.maybeComponent):0,c=i||Oi;return"["+o.map(function(t){return c(t,e)}).join(",")+"]"+(s?","+s:"")}}function Ai(t,e){for(var n=0,r=0;r<t.length;r++){var i=t[r];if(1===i.type){if(ki(i)||i.ifConditions&&i.ifConditions.some(function(t){return ki(t.block)})){n=2;break}(e(i)||i.ifConditions&&i.ifConditions.some(function(t){return e(t.block)}))&&(n=1)}}return n}function ki(t){return void 0!==t.for||"template"===t.tag||"slot"===t.tag}function Oi(t,e){return 1===t.type?pi(t,e):3===t.type&&t.isComment?Ti(t):Si(t)}function Si(t){return"_v("+(2===t.type?t.expression:Li(JSON.stringify(t.text)))+")"}function Ti(t){return"_e("+JSON.stringify(t.text)+")"}function Ei(t,e){var n=t.slotName||'"default"',r=xi(t,e),i="_t("+n+(r?","+r:""),o=t.attrs&&"{"+t.attrs.map(function(t){return Hi(t.name)+":"+t.value}).join(",")+"}",a=t.attrsMap["v-bind"];return!o&&!a||r||(i+=",null"),o&&(i+=","+o),a&&(i+=(o?"":",null")+","+a),i+")"}function ji(t,e,n){var r=e.inlineTemplate?null:xi(e,n,!0);return"_c("+t+","+gi(e,n)+(r?","+r:"")+")"}function Ni(t){for(var e="",n=0;n<t.length;n++){var r=t[n];e+='"'+r.name+'":'+Li(r.value)+","}return e.slice(0,-1)}function Li(t){return t.replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}function Mi(t,e){try{return new Function(t)}catch(n){return e.push({err:n,code:t}),w}}function Ii(t){var e=Object.create(null);return function(n,r,i){r=r||{};var o=r.delimiters?String(r.delimiters)+n:n;if(e[o])return e[o];var a=t(n,r),s={},c=[];return s.render=Mi(a.render,c),s.staticRenderFns=a.staticRenderFns.map(function(t){return Mi(t,c)}),e[o]=s}}function Pi(t){if(t.outerHTML)return t.outerHTML;var e=document.createElement("div");return e.appendChild(t.cloneNode(!0)),e.innerHTML}var Ri=Object.prototype.toString,Di=d("slot,component",!0),Fi=d("key,ref,slot,is"),Bi=Object.prototype.hasOwnProperty,Ui=/-(\w)/g,Hi=m(function(t){return t.replace(Ui,function(t,e){return e?e.toUpperCase():""})}),Vi=m(function(t){return t.charAt(0).toUpperCase()+t.slice(1)}),zi=/([^-])([A-Z])/g,Ji=m(function(t){return t.replace(zi,"$1-$2").replace(zi,"$1-$2").toLowerCase()}),Ki=function(t,e,n){return!1},qi=function(t){return t},Wi="data-server-rendered",Zi=["component","directive","filter"],Gi=["beforeCreate","created","beforeMount","mounted","beforeUpdate","updated","beforeDestroy","destroyed","activated","deactivated"],Xi={optionMergeStrategies:Object.create(null),silent:!1,productionTip:!1,devtools:!1,performance:!1,errorHandler:null,warnHandler:null,ignoredElements:[],keyCodes:Object.create(null),isReservedTag:Ki,isReservedAttr:Ki,isUnknownElement:Ki,getTagNamespace:w,parsePlatformTagName:qi,mustUseProp:Ki,_lifecycleHooks:Gi},Yi=Object.freeze({}),Qi=/[^\w.$]/,to=w,eo="__proto__"in{},no="undefined"!=typeof window,ro=no&&window.navigator.userAgent.toLowerCase(),io=ro&&/msie|trident/.test(ro),oo=ro&&ro.indexOf("msie 9.0")>0,ao=ro&&ro.indexOf("edge/")>0,so=ro&&ro.indexOf("android")>0,co=ro&&/iphone|ipad|ipod|ios/.test(ro),uo=ro&&/chrome\/\d+/.test(ro)&&!ao,lo={}.watch,fo=!1;if(no)try{var po={};Object.defineProperty(po,"passive",{get:function(){fo=!0}}),window.addEventListener("test-passive",null,po)}catch(t){}var ho,vo,mo=function(){return void 0===ho&&(ho=!no&&void 0!==t&&"server"===t.process.env.VUE_ENV),ho},yo=no&&window.__VUE_DEVTOOLS_GLOBAL_HOOK__,go="undefined"!=typeof Symbol&&T(Symbol)&&"undefined"!=typeof Reflect&&T(Reflect.ownKeys),_o=function(){function t(){r=!1;var t=n.slice(0);n.length=0;for(var e=0;e<t.length;e++)t[e]()}var e,n=[],r=!1;if("undefined"!=typeof Promise&&T(Promise)){var i=Promise.resolve(),o=function(t){console.error(t)};e=function(){i.then(t).catch(o),co&&setTimeout(w)}}else if("undefined"==typeof MutationObserver||!T(MutationObserver)&&"[object MutationObserverConstructor]"!==MutationObserver.toString())e=function(){setTimeout(t,0)};else{var a=1,s=new MutationObserver(t),c=document.createTextNode(String(a));s.observe(c,{characterData:!0}),e=function(){a=(a+1)%2,c.data=String(a)}}return function(t,i){var o;if(n.push(function(){if(t)try{t.call(i)}catch(t){S(t,i,"nextTick")}else o&&o(i)}),r||(r=!0,e()),!t&&"undefined"!=typeof Promise)return new Promise(function(t,e){o=t})}}();vo="undefined"!=typeof Set&&T(Set)?Set:function(){function t(){this.set=Object.create(null)}return t.prototype.has=function(t){return!0===this.set[t]},t.prototype.add=function(t){this.set[t]=!0},t.prototype.clear=function(){this.set=Object.create(null)},t}();var bo=0,wo=function(){this.id=bo++,this.subs=[]};wo.prototype.addSub=function(t){this.subs.push(t)},wo.prototype.removeSub=function(t){h(this.subs,t)},wo.prototype.depend=function(){wo.target&&wo.target.addDep(this)},wo.prototype.notify=function(){for(var t=this.subs.slice(),e=0,n=t.length;e<n;e++)t[e].update()},wo.target=null;var $o=[],Co=Array.prototype,xo=Object.create(Co);["push","pop","shift","unshift","splice","sort","reverse"].forEach(function(t){var e=Co[t];k(xo,t,function(){for(var n=[],r=arguments.length;r--;)n[r]=arguments[r];var i,o=e.apply(this,n),a=this.__ob__;switch(t){case"push":case"unshift":i=n;break;case"splice":i=n.slice(2)}return i&&a.observeArray(i),a.dep.notify(),o})});var Ao=Object.getOwnPropertyNames(xo),ko={shouldConvert:!0},Oo=function(t){if(this.value=t,this.dep=new wo,this.vmCount=0,k(t,"__ob__",this),Array.isArray(t)){(eo?N:L)(t,xo,Ao),this.observeArray(t)}else this.walk(t)};Oo.prototype.walk=function(t){for(var e=Object.keys(t),n=0;n<e.length;n++)I(t,e[n],t[e[n]])},Oo.prototype.observeArray=function(t){for(var e=0,n=t.length;e<n;e++)M(t[e])};var So=Xi.optionMergeStrategies;So.data=function(t,e,n){return n?B(t,e,n):e&&"function"!=typeof e?t:B.call(this,t,e)},Gi.forEach(function(t){So[t]=U}),Zi.forEach(function(t){So[t+"s"]=H}),So.watch=function(t,e){if(t===lo&&(t=void 0),e===lo&&(e=void 0),!e)return Object.create(t||null);if(!t)return e;var n={};_(n,t);for(var r in e){var i=n[r],o=e[r];i&&!Array.isArray(i)&&(i=[i]),n[r]=i?i.concat(o):Array.isArray(o)?o:[o]}return n},So.props=So.methods=So.inject=So.computed=function(t,e){if(!t)return e;var n=Object.create(null);return _(n,t),e&&_(n,e),n},So.provide=B;var To=function(t,e){return void 0===e?t:e},Eo=function(t,e,n,r,i,o,a,s){this.tag=t,this.data=e,this.children=n,this.text=r,this.elm=i,this.ns=void 0,this.context=o,this.functionalContext=void 0,this.key=e&&e.key,this.componentOptions=a,this.componentInstance=void 0,this.parent=void 0,this.raw=!1,this.isStatic=!1,this.isRootInsert=!0,this.isComment=!1,this.isCloned=!1,this.isOnce=!1,this.asyncFactory=s,this.asyncMeta=void 0,this.isAsyncPlaceholder=!1},jo={child:{}};jo.child.get=function(){return this.componentInstance},Object.defineProperties(Eo.prototype,jo);var No,Lo=function(t){void 0===t&&(t="");var e=new Eo;return e.text=t,e.isComment=!0,e},Mo=m(function(t){var e="&"===t.charAt(0);t=e?t.slice(1):t;var n="~"===t.charAt(0);t=n?t.slice(1):t;var r="!"===t.charAt(0);return t=r?t.slice(1):t,{name:t,once:n,capture:r,passive:e}}),Io=null,Po=[],Ro=[],Do={},Fo=!1,Bo=!1,Uo=0,Ho=0,Vo=function(t,e,n,r){this.vm=t,t._watchers.push(this),r?(this.deep=!!r.deep,this.user=!!r.user,this.lazy=!!r.lazy,this.sync=!!r.sync):this.deep=this.user=this.lazy=this.sync=!1,this.cb=n,this.id=++Ho,this.active=!0,this.dirty=this.lazy,this.deps=[],this.newDeps=[],this.depIds=new vo,this.newDepIds=new vo,this.expression="","function"==typeof e?this.getter=e:(this.getter=O(e),this.getter||(this.getter=function(){})),this.value=this.lazy?void 0:this.get()};Vo.prototype.get=function(){E(this);var t,e=this.vm;try{t=this.getter.call(e,e)}catch(t){if(!this.user)throw t;S(t,e,'getter for watcher "'+this.expression+'"')}finally{this.deep&&Mt(t),j(),this.cleanupDeps()}return t},Vo.prototype.addDep=function(t){var e=t.id;this.newDepIds.has(e)||(this.newDepIds.add(e),this.newDeps.push(t),this.depIds.has(e)||t.addSub(this))},Vo.prototype.cleanupDeps=function(){for(var t=this,e=this.deps.length;e--;){var n=t.deps[e];t.newDepIds.has(n.id)||n.removeSub(t)}var r=this.depIds;this.depIds=this.newDepIds,this.newDepIds=r,this.newDepIds.clear(),r=this.deps,this.deps=this.newDeps,this.newDeps=r,this.newDeps.length=0},Vo.prototype.update=function(){this.lazy?this.dirty=!0:this.sync?this.run():Lt(this)},Vo.prototype.run=function(){if(this.active){var t=this.get();if(t!==this.value||s(t)||this.deep){var e=this.value;if(this.value=t,this.user)try{this.cb.call(this.vm,t,e)}catch(t){S(t,this.vm,'callback for watcher "'+this.expression+'"')}else this.cb.call(this.vm,t,e)}}},Vo.prototype.evaluate=function(){this.value=this.get(),this.dirty=!1},Vo.prototype.depend=function(){for(var t=this,e=this.deps.length;e--;)t.deps[e].depend()},Vo.prototype.teardown=function(){var t=this;if(this.active){this.vm._isBeingDestroyed||h(this.vm._watchers,this);for(var e=this.deps.length;e--;)t.deps[e].removeSub(t);this.active=!1}};var zo=new vo,Jo={enumerable:!0,configurable:!0,get:w,set:w},Ko={lazy:!0},qo={init:function(t,e,n,r){if(!t.componentInstance||t.componentInstance._isDestroyed){(t.componentInstance=Qt(t,Io,n,r)).$mount(e?t.elm:void 0,e)}else if(t.data.keepAlive){var i=t;qo.prepatch(i,i)}},prepatch:function(t,e){var n=e.componentOptions;Ct(e.componentInstance=t.componentInstance,n.propsData,n.listeners,e,n.children)},insert:function(t){var e=t.context,n=t.componentInstance;n._isMounted||(n._isMounted=!0,Ot(n,"mounted")),t.data.keepAlive&&(e._isMounted?jt(n):At(n,!0))},destroy:function(t){var e=t.componentInstance;e._isDestroyed||(t.data.keepAlive?kt(e,!0):e.$destroy())}},Wo=Object.keys(qo),Zo=1,Go=2,Xo=0;!function(t){t.prototype._init=function(t){var e=this;e._uid=Xo++,e._isVue=!0,t&&t._isComponent?ye(e,t):e.$options=K(ge(e.constructor),t||{},e),e._renderProxy=e,e._self=e,wt(e),ht(e),me(e),Ot(e,"beforeCreate"),Wt(e),Rt(e),qt(e),Ot(e,"created"),e.$options.el&&e.$mount(e.$options.el)}}(we),function(t){var e={};e.get=function(){return this._data};var n={};n.get=function(){return this._props},Object.defineProperty(t.prototype,"$data",e),Object.defineProperty(t.prototype,"$props",n),t.prototype.$set=P,t.prototype.$delete=R,t.prototype.$watch=function(t,e,n){var r=this;if(c(e))return Kt(r,t,e,n);n=n||{},n.user=!0;var i=new Vo(r,t,e,n);return n.immediate&&e.call(r,i.value),function(){i.teardown()}}}(we),function(t){var e=/^hook:/;t.prototype.$on=function(t,n){var r=this,i=this;if(Array.isArray(t))for(var o=0,a=t.length;o<a;o++)r.$on(t[o],n);else(i._events[t]||(i._events[t]=[])).push(n),e.test(t)&&(i._hasHookEvent=!0);return i},t.prototype.$once=function(t,e){function n(){r.$off(t,n),e.apply(r,arguments)}var r=this;return n.fn=e,r.$on(t,n),r},t.prototype.$off=function(t,e){var n=this,r=this;if(!arguments.length)return r._events=Object.create(null),r;if(Array.isArray(t)){for(var i=0,o=t.length;i<o;i++)n.$off(t[i],e);return r}var a=r._events[t];if(!a)return r;if(1===arguments.length)return r._events[t]=null,r;for(var s,c=a.length;c--;)if((s=a[c])===e||s.fn===e){a.splice(c,1);break}return r},t.prototype.$emit=function(t){var e=this,n=e._events[t];if(n){n=n.length>1?g(n):n;for(var r=g(arguments,1),i=0,o=n.length;i<o;i++)try{n[i].apply(e,r)}catch(n){S(n,e,'event handler for "'+t+'"')}}return e}}(we),function(t){t.prototype._update=function(t,e){var n=this;n._isMounted&&Ot(n,"beforeUpdate");var r=n.$el,i=n._vnode,o=Io;Io=n,n._vnode=t,i?n.$el=n.__patch__(i,t):(n.$el=n.__patch__(n.$el,t,e,!1,n.$options._parentElm,n.$options._refElm),n.$options._parentElm=n.$options._refElm=null),Io=o,r&&(r.__vue__=null),n.$el&&(n.$el.__vue__=n),n.$vnode&&n.$parent&&n.$vnode===n.$parent._vnode&&(n.$parent.$el=n.$el)},t.prototype.$forceUpdate=function(){var t=this;t._watcher&&t._watcher.update()},t.prototype.$destroy=function(){var t=this;if(!t._isBeingDestroyed){Ot(t,"beforeDestroy"),t._isBeingDestroyed=!0;var e=t.$parent;!e||e._isBeingDestroyed||t.$options.abstract||h(e.$children,t),t._watcher&&t._watcher.teardown();for(var n=t._watchers.length;n--;)t._watchers[n].teardown();t._data.__ob__&&t._data.__ob__.vmCount--,t._isDestroyed=!0,t.__patch__(t._vnode,null),Ot(t,"destroyed"),t.$off(),t.$el&&(t.$el.__vue__=null)}}}(we),function(t){t.prototype.$nextTick=function(t){return _o(t,this)},t.prototype._render=function(){var t=this,e=t.$options,n=e.render,r=e.staticRenderFns,i=e._parentVnode;if(t._isMounted)for(var o in t.$slots)t.$slots[o]=tt(t.$slots[o]);t.$scopedSlots=i&&i.data.scopedSlots||Yi,r&&!t._staticTrees&&(t._staticTrees=[]),t.$vnode=i;var a;try{a=n.call(t._renderProxy,t.$createElement)}catch(e){S(e,t,"render function"),a=t._vnode}return a instanceof Eo||(a=Lo()),a.parent=i,a},t.prototype._o=pe,t.prototype._n=p,t.prototype._s=f,t.prototype._l=ae,t.prototype._t=se,t.prototype._q=$,t.prototype._i=C,t.prototype._m=fe,t.prototype._f=ce,t.prototype._k=ue,t.prototype._b=le,t.prototype._v=Y,t.prototype._e=Lo,t.prototype._u=bt,t.prototype._g=ve}(we);var Yo=[String,RegExp,Array],Qo={name:"keep-alive",abstract:!0,props:{include:Yo,exclude:Yo},created:function(){this.cache=Object.create(null)},destroyed:function(){var t=this;for(var e in t.cache)je(t.cache[e])},watch:{include:function(t){Ee(this.cache,this._vnode,function(e){return Te(t,e)})},exclude:function(t){Ee(this.cache,this._vnode,function(e){return!Te(t,e)})}},render:function(){var t=dt(this.$slots.default),e=t&&t.componentOptions;if(e){var n=Se(e);if(n&&(this.include&&!Te(this.include,n)||this.exclude&&Te(this.exclude,n)))return t;var r=null==t.key?e.Ctor.cid+(e.tag?"::"+e.tag:""):t.key;this.cache[r]?t.componentInstance=this.cache[r].componentInstance:this.cache[r]=t,t.data.keepAlive=!0}return t}},ta={KeepAlive:Qo};!function(t){var e={};e.get=function(){return Xi},Object.defineProperty(t,"config",e),t.util={warn:to,extend:_,mergeOptions:K,defineReactive:I},t.set=P,t.delete=R,t.nextTick=_o,t.options=Object.create(null),Zi.forEach(function(e){t.options[e+"s"]=Object.create(null)}),t.options._base=t,_(t.options.components,ta),$e(t),Ce(t),xe(t),Oe(t)}(we),Object.defineProperty(we.prototype,"$isServer",{get:mo}),Object.defineProperty(we.prototype,"$ssrContext",{get:function(){return this.$vnode&&this.$vnode.ssrContext}}),we.version="2.4.2";var ea,na,ra,ia,oa,aa,sa,ca,ua,la=d("style,class"),fa=d("input,textarea,option,select"),pa=function(t,e,n){return"value"===n&&fa(t)&&"button"!==e||"selected"===n&&"option"===t||"checked"===n&&"input"===t||"muted"===n&&"video"===t},da=d("contenteditable,draggable,spellcheck"),ha=d("allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,default,defaultchecked,defaultmuted,defaultselected,defer,disabled,enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,required,reversed,scoped,seamless,selected,sortable,translate,truespeed,typemustmatch,visible"),va="http://www.w3.org/1999/xlink",ma=function(t){return":"===t.charAt(5)&&"xlink"===t.slice(0,5)},ya=function(t){return ma(t)?t.slice(6,t.length):""},ga=function(t){return null==t||!1===t},_a={svg:"http://www.w3.org/2000/svg",math:"http://www.w3.org/1998/Math/MathML"},ba=d("html,body,base,head,link,meta,style,title,address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,menuitem,summary,content,element,shadow,template,blockquote,iframe,tfoot"),wa=d("svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view",!0),$a=function(t){return"pre"===t},Ca=function(t){return ba(t)||wa(t)},xa=Object.create(null),Aa=Object.freeze({createElement:He,createElementNS:Ve,createTextNode:ze,createComment:Je,insertBefore:Ke,removeChild:qe,appendChild:We,parentNode:Ze,nextSibling:Ge,tagName:Xe,setTextContent:Ye,setAttribute:Qe}),ka={create:function(t,e){tn(e)},update:function(t,e){t.data.ref!==e.data.ref&&(tn(t,!0),tn(e))},destroy:function(t){tn(t,!0)}},Oa=new Eo("",{},[]),Sa=["create","activate","update","remove","destroy"],Ta={create:on,update:on,destroy:function(t){on(t,Oa)}},Ea=Object.create(null),ja=[ka,Ta],Na={create:ln,update:ln},La={create:pn,update:pn},Ma=/[\w).+\-_$\]]/,Ia="__r",Pa="__c",Ra={create:Fn,update:Fn},Da={create:Bn,update:Bn},Fa=m(function(t){var e={},n=/;(?![^(]*\))/g,r=/:(.+)/;return t.split(n).forEach(function(t){if(t){var n=t.split(r);n.length>1&&(e[n[0].trim()]=n[1].trim())}}),e}),Ba=/^--/,Ua=/\s*!important$/,Ha=function(t,e,n){if(Ba.test(e))t.style.setProperty(e,n);else if(Ua.test(n))t.style.setProperty(e,n.replace(Ua,""),"important");else{var r=za(e);if(Array.isArray(n))for(var i=0,o=n.length;i<o;i++)t.style[r]=n[i];else t.style[r]=n}},Va=["Webkit","Moz","ms"],za=m(function(t){if(ua=ua||document.createElement("div").style,"filter"!==(t=Hi(t))&&t in ua)return t;for(var e=t.charAt(0).toUpperCase()+t.slice(1),n=0;n<Va.length;n++){var r=Va[n]+e;if(r in ua)return r}}),Ja={create:qn,update:qn},Ka=m(function(t){return{enterClass:t+"-enter",enterToClass:t+"-enter-to",enterActiveClass:t+"-enter-active",leaveClass:t+"-leave",leaveToClass:t+"-leave-to",leaveActiveClass:t+"-leave-active"}}),qa=no&&!oo,Wa="transition",Za="animation",Ga="transition",Xa="transitionend",Ya="animation",Qa="animationend";qa&&(void 0===window.ontransitionend&&void 0!==window.onwebkittransitionend&&(Ga="WebkitTransition",Xa="webkitTransitionEnd"),void 0===window.onanimationend&&void 0!==window.onwebkitanimationend&&(Ya="WebkitAnimation",Qa="webkitAnimationEnd"));var ts=no&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):setTimeout,es=/\b(transform|all)(,|$)/,ns=no?{create:cr,activate:cr,remove:function(t,e){!0!==t.data.show?or(t,e):e()}}:{},rs=[Na,La,Ra,Da,Ja,ns],is=rs.concat(ja),os=function(t){function e(t){return new Eo(E.tagName(t).toLowerCase(),{},[],void 0,t)}function o(t,e){function n(){0==--n.listeners&&s(t)}return n.listeners=e,n}function s(t){var e=E.parentNode(t);r(e)&&E.removeChild(e,t)}function c(t,e,n,o,a){if(t.isRootInsert=!a,!u(t,e,n,o)){var s=t.data,c=t.children,l=t.tag;r(l)?(t.elm=t.ns?E.createElementNS(t.ns,l):E.createElement(l,t),y(t),h(t,c,e),r(s)&&m(t,e),p(n,t.elm,o)):i(t.isComment)?(t.elm=E.createComment(t.text),p(n,t.elm,o)):(t.elm=E.createTextNode(t.text),p(n,t.elm,o))}}function u(t,e,n,o){var a=t.data;if(r(a)){var s=r(t.componentInstance)&&a.keepAlive;if(r(a=a.hook)&&r(a=a.init)&&a(t,!1,n,o),r(t.componentInstance))return l(t,e),i(s)&&f(t,e,n,o),!0}}function l(t,e){r(t.data.pendingInsert)&&(e.push.apply(e,t.data.pendingInsert),t.data.pendingInsert=null),t.elm=t.componentInstance.$el,v(t)?(m(t,e),y(t)):(tn(t),e.push(t))}function f(t,e,n,i){for(var o,a=t;a.componentInstance;)if(a=a.componentInstance._vnode,r(o=a.data)&&r(o=o.transition)){for(o=0;o<S.activate.length;++o)S.activate[o](Oa,a);e.push(a);break}p(n,t.elm,i)}function p(t,e,n){r(t)&&(r(n)?n.parentNode===t&&E.insertBefore(t,e,n):E.appendChild(t,e))}function h(t,e,n){if(Array.isArray(e))for(var r=0;r<e.length;++r)c(e[r],n,t.elm,null,!0);else a(t.text)&&E.appendChild(t.elm,E.createTextNode(t.text))}function v(t){for(;t.componentInstance;)t=t.componentInstance._vnode;return r(t.tag)}function m(t,e){for(var n=0;n<S.create.length;++n)S.create[n](Oa,t);k=t.data.hook,r(k)&&(r(k.create)&&k.create(Oa,t),r(k.insert)&&e.push(t))}function y(t){for(var e,n=t;n;)r(e=n.context)&&r(e=e.$options._scopeId)&&E.setAttribute(t.elm,e,""),n=n.parent;r(e=Io)&&e!==t.context&&r(e=e.$options._scopeId)&&E.setAttribute(t.elm,e,"")}function g(t,e,n,r,i,o){for(;r<=i;++r)c(n[r],o,t,e)}function _(t){var e,n,i=t.data;if(r(i))for(r(e=i.hook)&&r(e=e.destroy)&&e(t),e=0;e<S.destroy.length;++e)S.destroy[e](t);if(r(e=t.children))for(n=0;n<t.children.length;++n)_(t.children[n])}function b(t,e,n,i){for(;n<=i;++n){var o=e[n];r(o)&&(r(o.tag)?(w(o),_(o)):s(o.elm))}}function w(t,e){if(r(e)||r(t.data)){var n,i=S.remove.length+1;for(r(e)?e.listeners+=i:e=o(t.elm,i),r(n=t.componentInstance)&&r(n=n._vnode)&&r(n.data)&&w(n,e),n=0;n<S.remove.length;++n)S.remove[n](t,e);r(n=t.data.hook)&&r(n=n.remove)?n(t,e):e()}else s(t.elm)}function $(t,e,i,o,a){for(var s,u,l,f,p=0,d=0,h=e.length-1,v=e[0],m=e[h],y=i.length-1,_=i[0],w=i[y],$=!a;p<=h&&d<=y;)n(v)?v=e[++p]:n(m)?m=e[--h]:en(v,_)?(C(v,_,o),v=e[++p],_=i[++d]):en(m,w)?(C(m,w,o),m=e[--h],w=i[--y]):en(v,w)?(C(v,w,o),$&&E.insertBefore(t,v.elm,E.nextSibling(m.elm)),v=e[++p],w=i[--y]):en(m,_)?(C(m,_,o),$&&E.insertBefore(t,m.elm,v.elm),m=e[--h],_=i[++d]):(n(s)&&(s=rn(e,p,h)),u=r(_.key)?s[_.key]:null,n(u)?(c(_,o,t,v.elm),_=i[++d]):(l=e[u],en(l,_)?(C(l,_,o),e[u]=void 0,$&&E.insertBefore(t,l.elm,v.elm),_=i[++d]):(c(_,o,t,v.elm),_=i[++d])));p>h?(f=n(i[y+1])?null:i[y+1].elm,g(t,f,i,d,y,o)):d>y&&b(t,e,p,h)}function C(t,e,o,a){if(t!==e){var s=e.elm=t.elm;if(i(t.isAsyncPlaceholder))return void(r(e.asyncFactory.resolved)?A(t.elm,e,o):e.isAsyncPlaceholder=!0);if(i(e.isStatic)&&i(t.isStatic)&&e.key===t.key&&(i(e.isCloned)||i(e.isOnce)))return void(e.componentInstance=t.componentInstance);var c,u=e.data;r(u)&&r(c=u.hook)&&r(c=c.prepatch)&&c(t,e);var l=t.children,f=e.children;if(r(u)&&v(e)){for(c=0;c<S.update.length;++c)S.update[c](t,e);r(c=u.hook)&&r(c=c.update)&&c(t,e)}n(e.text)?r(l)&&r(f)?l!==f&&$(s,l,f,o,a):r(f)?(r(t.text)&&E.setTextContent(s,""),g(s,null,f,0,f.length-1,o)):r(l)?b(s,l,0,l.length-1):r(t.text)&&E.setTextContent(s,""):t.text!==e.text&&E.setTextContent(s,e.text),r(u)&&r(c=u.hook)&&r(c=c.postpatch)&&c(t,e)}}function x(t,e,n){if(i(n)&&r(t.parent))t.parent.data.pendingInsert=e;else for(var o=0;o<e.length;++o)e[o].data.hook.insert(e[o])}function A(t,e,n){if(i(e.isComment)&&r(e.asyncFactory))return e.elm=t,e.isAsyncPlaceholder=!0,!0;e.elm=t;var o=e.tag,a=e.data,s=e.children;if(r(a)&&(r(k=a.hook)&&r(k=k.init)&&k(e,!0),r(k=e.componentInstance)))return l(e,n),!0;if(r(o)){if(r(s))if(t.hasChildNodes()){for(var c=!0,u=t.firstChild,f=0;f<s.length;f++){if(!u||!A(u,s[f],n)){c=!1;break}u=u.nextSibling}if(!c||u)return!1}else h(e,s,n);if(r(a))for(var p in a)if(!j(p)){m(e,n);break}}else t.data!==e.text&&(t.data=e.text);return!0}var k,O,S={},T=t.modules,E=t.nodeOps;for(k=0;k<Sa.length;++k)for(S[Sa[k]]=[],O=0;O<T.length;++O)r(T[O][Sa[k]])&&S[Sa[k]].push(T[O][Sa[k]]);var j=d("attrs,style,class,staticClass,staticStyle,key");return function(t,o,a,s,u,l){if(n(o))return void(r(t)&&_(t));var f=!1,p=[];if(n(t))f=!0,c(o,p,u,l);else{var d=r(t.nodeType);if(!d&&en(t,o))C(t,o,p,s);else{if(d){if(1===t.nodeType&&t.hasAttribute(Wi)&&(t.removeAttribute(Wi),a=!0),i(a)&&A(t,o,p))return x(o,p,!0),t;t=e(t)}var h=t.elm,m=E.parentNode(h);if(c(o,p,h._leaveCb?null:m,E.nextSibling(h)),r(o.parent)){for(var y=o.parent;y;)y.elm=o.elm,y=y.parent;if(v(o))for(var g=0;g<S.create.length;++g)S.create[g](Oa,o.parent)}r(m)?b(m,[t],0,0):r(t.tag)&&_(t)}}return x(o,p,f),o.elm}}({nodeOps:Aa,modules:is}),as=d("text,number,password,search,email,tel,url");oo&&document.addEventListener("selectionchange",function(){var t=document.activeElement;t&&t.vmodel&&dr(t,"input")});var ss={inserted:function(t,e,n){if("select"===n.tag){var r=function(){ur(t,e,n.context)};r(),(io||ao)&&setTimeout(r,0),t._vOptions=[].map.call(t.options,lr)}else("textarea"===n.tag||as(t.type))&&(t._vModifiers=e.modifiers,e.modifiers.lazy||(t.addEventListener("change",pr),so||(t.addEventListener("compositionstart",fr),t.addEventListener("compositionend",pr)),oo&&(t.vmodel=!0)))},componentUpdated:function(t,e,n){if("select"===n.tag){ur(t,e,n.context);var r=t._vOptions;(t._vOptions=[].map.call(t.options,lr)).some(function(t,e){return!$(t,r[e])})&&dr(t,"change")}}},cs={bind:function(t,e,n){var r=e.value;n=hr(n);var i=n.data&&n.data.transition,o=t.__vOriginalDisplay="none"===t.style.display?"":t.style.display;r&&i?(n.data.show=!0,ir(n,function(){t.style.display=o})):t.style.display=r?o:"none"},update:function(t,e,n){var r=e.value;r!==e.oldValue&&(n=hr(n),n.data&&n.data.transition?(n.data.show=!0,r?ir(n,function(){t.style.display=t.__vOriginalDisplay}):or(n,function(){t.style.display="none"})):t.style.display=r?t.__vOriginalDisplay:"none")},unbind:function(t,e,n,r,i){i||(t.style.display=t.__vOriginalDisplay)}},us={model:ss,show:cs},ls={name:String,appear:Boolean,css:Boolean,mode:String,type:String,enterClass:String,leaveClass:String,enterToClass:String,leaveToClass:String,enterActiveClass:String,leaveActiveClass:String,appearClass:String,appearActiveClass:String,appearToClass:String,duration:[Number,String,Object]},fs={name:"transition",props:ls,abstract:!0,render:function(t){var e=this,n=this.$options._renderChildren;if(n&&(n=n.filter(function(t){return t.tag||br(t)}),n.length)){var r=this.mode,i=n[0];if(gr(this.$vnode))return i;var o=vr(i);if(!o)return i;if(this._leaving)return yr(t,i);var s="__transition-"+this._uid+"-";o.key=null==o.key?o.isComment?s+"comment":s+o.tag:a(o.key)?0===String(o.key).indexOf(s)?o.key:s+o.key:o.key;var c=(o.data||(o.data={})).transition=mr(this),u=this._vnode,l=vr(u);if(o.data.directives&&o.data.directives.some(function(t){return"show"===t.name})&&(o.data.show=!0),l&&l.data&&!_r(o,l)&&!br(l)){var f=l&&(l.data.transition=_({},c));if("out-in"===r)return this._leaving=!0,rt(f,"afterLeave",function(){e._leaving=!1,e.$forceUpdate()}),yr(t,i);if("in-out"===r){if(br(o))return u;var p,d=function(){p()};rt(c,"afterEnter",d),rt(c,"enterCancelled",d),rt(f,"delayLeave",function(t){p=t})}}return i}}},ps=_({tag:String,moveClass:String},ls);delete ps.mode;var ds={props:ps,render:function(t){for(var e=this.tag||this.$vnode.data.tag||"span",n=Object.create(null),r=this.prevChildren=this.children,i=this.$slots.default||[],o=this.children=[],a=mr(this),s=0;s<i.length;s++){var c=i[s];if(c.tag)if(null!=c.key&&0!==String(c.key).indexOf("__vlist"))o.push(c),n[c.key]=c,(c.data||(c.data={})).transition=a;else;}if(r){for(var u=[],l=[],f=0;f<r.length;f++){var p=r[f];p.data.transition=a,p.data.pos=p.elm.getBoundingClientRect(),n[p.key]?u.push(p):l.push(p)}this.kept=t(e,null,u),this.removed=l}return t(e,null,o)},beforeUpdate:function(){this.__patch__(this._vnode,this.kept,!1,!0),this._vnode=this.kept},updated:function(){var t=this.prevChildren,e=this.moveClass||(this.name||"v")+"-move";if(t.length&&this.hasMove(t[0].elm,e)){t.forEach(wr),t.forEach($r),t.forEach(Cr);var n=document.body;n.offsetHeight;t.forEach(function(t){if(t.data.moved){var n=t.elm,r=n.style;Yn(n,e),r.transform=r.WebkitTransform=r.transitionDuration="",n.addEventListener(Xa,n._moveCb=function t(r){r&&!/transform$/.test(r.propertyName)||(n.removeEventListener(Xa,t),n._moveCb=null,Qn(n,e))})}})}},methods:{hasMove:function(t,e){if(!qa)return!1;if(this._hasMove)return this._hasMove;var n=t.cloneNode();t._transitionClasses&&t._transitionClasses.forEach(function(t){Zn(n,t)}),Wn(n,e),n.style.display="none",this.$el.appendChild(n);var r=er(n);return this.$el.removeChild(n),this._hasMove=r.hasTransform}}},hs={Transition:fs,TransitionGroup:ds};we.config.mustUseProp=pa,we.config.isReservedTag=Ca,we.config.isReservedAttr=la,we.config.getTagNamespace=Fe,we.config.isUnknownElement=Be,_(we.options.directives,us),_(we.options.components,hs),we.prototype.__patch__=no?os:w,we.prototype.$mount=function(t,e){return t=t&&no?Ue(t):void 0,$t(this,t,e)},setTimeout(function(){Xi.devtools&&yo&&yo.emit("init",we)},0);var vs,ms=!!no&&function(t,e){var n=document.createElement("div");return n.innerHTML='<div a="'+t+'"/>',n.innerHTML.indexOf(e)>0}("\n","&#10;"),ys=/\{\{((?:.|\n)+?)\}\}/g,gs=/[-.*+?^${}()|[\]\/\\]/g,_s=m(function(t){var e=t[0].replace(gs,"\\$&"),n=t[1].replace(gs,"\\$&");return new RegExp(e+"((?:.|\\n)+?)"+n,"g")}),bs={staticKeys:["staticClass"],transformNode:Ar,genData:kr},ws={staticKeys:["staticStyle"],transformNode:Or,genData:Sr},$s=[bs,ws],Cs={model:jn,text:Tr,html:Er},xs=d("area,base,br,col,embed,frame,hr,img,input,isindex,keygen,link,meta,param,source,track,wbr"),As=d("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source"),ks=d("address,article,aside,base,blockquote,body,caption,col,colgroup,dd,details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,title,tr,track"),Os={expectHTML:!0,modules:$s,directives:Cs,isPreTag:$a,isUnaryTag:xs,mustUseProp:pa,canBeLeftOpenTag:As,isReservedTag:Ca,getTagNamespace:Fe,staticKeys:function(t){return t.reduce(function(t,e){return t.concat(e.staticKeys||[])},[]).join(",")}($s)},Ss={decode:function(t){return vs=vs||document.createElement("div"),vs.innerHTML=t,vs.textContent}},Ts=/([^\s"'<>\/=]+)/,Es=/(?:=)/,js=[/"([^"]*)"+/.source,/'([^']*)'+/.source,/([^\s"'=<>`]+)/.source],Ns=new RegExp("^\\s*"+Ts.source+"(?:\\s*("+Es.source+")\\s*(?:"+js.join("|")+"))?"),Ls="[a-zA-Z_][\\w\\-\\.]*",Ms="((?:"+Ls+"\\:)?"+Ls+")",Is=new RegExp("^<"+Ms),Ps=/^\s*(\/?)>/,Rs=new RegExp("^<\\/"+Ms+"[^>]*>"),Ds=/^<!DOCTYPE [^>]+>/i,Fs=/^<!--/,Bs=/^<!\[/,Us=!1;"x".replace(/x(.)?/g,function(t,e){Us=""===e});var Hs,Vs,zs,Js,Ks,qs,Ws,Zs,Gs,Xs,Ys=d("script,style,textarea",!0),Qs={},tc={"&lt;":"<","&gt;":">","&quot;":'"',"&amp;":"&","&#10;":"\n"},ec=/&(?:lt|gt|quot|amp);/g,nc=/&(?:lt|gt|quot|amp|#10);/g,rc=d("pre,textarea",!0),ic=function(t,e){return t&&rc(t)&&"\n"===e[0]},oc=/^@|^v-on:/,ac=/^v-|^@|^:/,sc=/(.*?)\s+(?:in|of)\s+(.*)/,cc=/\((\{[^}]*\}|[^,]*),([^,]*)(?:,([^,]*))?\)/,uc=/:(.*)$/,lc=/^:|^v-bind:/,fc=/\.[^.]+/g,pc=m(Ss.decode),dc=/^xmlns:NS\d+/,hc=/^NS\d+:/,vc=m(ti),mc=/^\s*([\w$_]+|\([^)]*?\))\s*=>|^function\s*\(/,yc=/^\s*[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['.*?']|\[".*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*\s*$/,gc={esc:27,tab:9,enter:13,space:32,up:38,left:37,right:39,down:40,delete:[8,46]},_c=function(t){return"if("+t+")return null;"},bc={stop:"$event.stopPropagation();",prevent:"$event.preventDefault();",self:_c("$event.target !== $event.currentTarget"),ctrl:_c("!$event.ctrlKey"),shift:_c("!$event.shiftKey"),alt:_c("!$event.altKey"),meta:_c("!$event.metaKey"),left:_c("'button' in $event && $event.button !== 0"),middle:_c("'button' in $event && $event.button !== 1"),right:_c("'button' in $event && $event.button !== 2")},wc={on:ui,bind:li,cloak:w},$c=function(t){this.options=t,this.warn=t.warn||vn,this.transforms=mn(t.modules,"transformCode"),this.dataGenFns=mn(t.modules,"genData"),this.directives=_(_({},wc),t.directives);var e=t.isReservedTag||Ki;this.maybeComponent=function(t){return!e(t.tag)},this.onceId=0,this.staticRenderFns=[]},Cc=(new RegExp("\\b"+"do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,super,throw,while,yield,delete,export,import,return,switch,default,extends,finally,continue,debugger,function,arguments".split(",").join("\\b|\\b")+"\\b"),new RegExp("\\b"+"delete,typeof,void".split(",").join("\\s*\\([^\\)]*\\)|\\b")+"\\s*\\([^\\)]*\\)"),function(t){return function(e){function n(n,r){var i=Object.create(e),o=[],a=[];if(i.warn=function(t,e){(e?a:o).push(t)},r){r.modules&&(i.modules=(e.modules||[]).concat(r.modules)),r.directives&&(i.directives=_(Object.create(e.directives),r.directives));for(var s in r)"modules"!==s&&"directives"!==s&&(i[s]=r[s])}var c=t(n,i);return c.errors=o,c.tips=a,c}return{compile:n,compileToFunctions:Ii(n)}}}(function(t,e){var n=Lr(t.trim(),e);Qr(n,e);var r=fi(n,e);return{ast:n,render:r.render,staticRenderFns:r.staticRenderFns}})),xc=Cc(Os),Ac=xc.compileToFunctions,kc=m(function(t){var e=Ue(t);return e&&e.innerHTML}),Oc=we.prototype.$mount;we.prototype.$mount=function(t,e){if((t=t&&Ue(t))===document.body||t===document.documentElement)return this;var n=this.$options;if(!n.render){var r=n.template;if(r)if("string"==typeof r)"#"===r.charAt(0)&&(r=kc(r));else{if(!r.nodeType)return this;r=r.innerHTML}else t&&(r=Pi(t));if(r){var i=Ac(r,{shouldDecodeNewlines:ms,delimiters:n.delimiters,comments:n.comments},this),o=i.render,a=i.staticRenderFns;n.render=o,n.staticRenderFns=a}}return Oc.call(this,t,e)},we.compile=Ac,e.default=we}.call(e,n("DuR2"))},DuR2:function(t,e){var n;n=function(){return this}();try{n=n||Function("return this")()||(0,eval)("this")}catch(t){"object"==typeof window&&(n=window)}t.exports=n},"FZ+f":function(t,e){function n(t,e){var n=t[1]||"",i=t[3];if(!i)return n;if(e&&"function"==typeof btoa){var o=r(i);return[n].concat(i.sources.map(function(t){return"/*# sourceURL="+i.sourceRoot+t+" */"})).concat([o]).join("\n")}return[n].join("\n")}function r(t){return"/*# sourceMappingURL=data:application/json;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(t))))+" */"}t.exports=function(t){var e=[];return e.toString=function(){return this.map(function(e){var r=n(e,t);return e[2]?"@media "+e[2]+"{"+r+"}":r}).join("")},e.i=function(t,n){"string"==typeof t&&(t=[[null,t,""]]);for(var r={},i=0;i<this.length;i++){var o=this[i][0];"number"==typeof o&&(r[o]=!0)}for(i=0;i<t.length;i++){var a=t[i];"number"==typeof a[0]&&r[a[0]]||(n&&!a[2]?a[2]=n:n&&(a[2]="("+a[2]+") and ("+n+")"),e.push(a))}},e}},"VU/8":function(t,e){t.exports=function(t,e,n,r,i){var o,a=t=t||{},s=typeof t.default;"object"!==s&&"function"!==s||(o=t,a=t.default);var c="function"==typeof a?a.options:a;e&&(c.render=e.render,c.staticRenderFns=e.staticRenderFns),r&&(c._scopeId=r);var u;if(i?(u=function(t){t=t||this.$vnode&&this.$vnode.ssrContext||this.parent&&this.parent.$vnode&&this.parent.$vnode.ssrContext,t||"undefined"==typeof __VUE_SSR_CONTEXT__||(t=__VUE_SSR_CONTEXT__),n&&n.call(this,t),t&&t._registeredComponents&&t._registeredComponents.add(i)},c._ssrRegister=u):n&&(u=n),u){var l=c.functional,f=l?c.render:c.beforeCreate;l?c.render=function(t,e){return u.call(e),f(t,e)}:c.beforeCreate=f?[].concat(f,u):[u]}return{esModule:o,exports:a,options:c}}},rjj0:function(t,e,n){function r(t){for(var e=0;e<t.length;e++){var n=t[e],r=l[n.id];if(r){r.refs++;for(var i=0;i<r.parts.length;i++)r.parts[i](n.parts[i]);for(;i<n.parts.length;i++)r.parts.push(o(n.parts[i]));r.parts.length>n.parts.length&&(r.parts.length=n.parts.length)}else{for(var a=[],i=0;i<n.parts.length;i++)a.push(o(n.parts[i]));l[n.id]={id:n.id,refs:1,parts:a}}}}function i(){var t=document.createElement("style");return t.type="text/css",f.appendChild(t),t}function o(t){var e,n,r=document.querySelector('style[data-vue-ssr-id~="'+t.id+'"]');if(r){if(h)return v;r.parentNode.removeChild(r)}if(m){var o=d++;r=p||(p=i()),e=a.bind(null,r,o,!1),n=a.bind(null,r,o,!0)}else r=i(),e=s.bind(null,r),n=function(){r.parentNode.removeChild(r)};return e(t),function(r){if(r){if(r.css===t.css&&r.media===t.media&&r.sourceMap===t.sourceMap)return;e(t=r)}else n()}}function a(t,e,n,r){var i=n?"":r.css;if(t.styleSheet)t.styleSheet.cssText=y(e,i);else{var o=document.createTextNode(i),a=t.childNodes;a[e]&&t.removeChild(a[e]),a.length?t.insertBefore(o,a[e]):t.appendChild(o)}}function s(t,e){var n=e.css,r=e.media,i=e.sourceMap;if(r&&t.setAttribute("media",r),i&&(n+="\n/*# sourceURL="+i.sources[0]+" */",n+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(i))))+" */"),t.styleSheet)t.styleSheet.cssText=n;else{for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(document.createTextNode(n))}}var c="undefined"!=typeof document;if("undefined"!=typeof DEBUG&&DEBUG&&!c)throw new Error("vue-style-loader cannot be used in a non-browser environment. Use { target: 'node' } in your Webpack config to indicate a server-rendering environment.");var u=n("tTVk"),l={},f=c&&(document.head||document.getElementsByTagName("head")[0]),p=null,d=0,h=!1,v=function(){},m="undefined"!=typeof navigator&&/msie [6-9]\b/.test(navigator.userAgent.toLowerCase());t.exports=function(t,e,n){h=n;var i=u(t,e);return r(i),function(e){for(var n=[],o=0;o<i.length;o++){var a=i[o],s=l[a.id];s.refs--,n.push(s)}e?(i=u(t,e),r(i)):i=[];for(var o=0;o<n.length;o++){var s=n[o];if(0===s.refs){for(var c=0;c<s.parts.length;c++)s.parts[c]();delete l[s.id]}}}};var y=function(){var t=[];return function(e,n){return t[e]=n,t.filter(Boolean).join("\n")}}()},rmnh:function(t,e,n){!function(t){function e(){return""===u.hash||"#"===u.hash}function n(t,e){for(var n=0;n<t.length;n+=1)if(!1===e(t[n],n,t))return}function r(t){for(var e=[],n=0,r=t.length;n<r;n++)e=e.concat(t[n]);return e}function i(t,e,n){if(!t.length)return n();var r=0;!function i(){e(t[r],function(e){e||!1===e?(n(e),n=function(){}):(r+=1,r===t.length?n():i())})}()}function o(t,e,n){n=t;for(var r in e)if(e.hasOwnProperty(r)&&(n=e[r](t))!==t)break;return n===t?"([._a-zA-Z0-9-%()]+)":n}function a(t,e){for(var n,r=0,i="";n=t.substr(r).match(/[^\w\d\- %@&]*\*[^\w\d\- %@&]*/);)r=n.index+n[0].length,n[0]=n[0].replace(/^\*/,"([_.()!\\ %@&a-zA-Z0-9-]+)"),i+=t.substr(0,n.index)+n[0];t=i+=t.substr(r);var a,s,c=t.match(/:([^\/]+)/gi);if(c){s=c.length;for(var u=0;u<s;u++)a=c[u],t="::"===a.slice(0,2)?a.slice(1):t.replace(a,o(a,e))}return t}function c(t,e,n,r){var i,o=0,a=0,s=0,n=(n||"(").toString(),r=(r||")").toString();for(i=0;i<t.length;i++){var c=t[i];if(c.indexOf(n,o)>c.indexOf(r,o)||~c.indexOf(n,o)&&!~c.indexOf(r,o)||!~c.indexOf(n,o)&&~c.indexOf(r,o)){if(a=c.indexOf(n,o),s=c.indexOf(r,o),~a&&!~s||!~a&&~s){t=[t.slice(0,(i||1)+1).join(e)].concat(t.slice((i||1)+1))}o=(s>a?s:a)+1,i=0}else o=0}return t}var u=document.location,l={mode:"modern",hash:u.hash,history:!1,check:function(){var t=u.hash;t!=this.hash&&(this.hash=t,this.onHashChanged())},fire:function(){"modern"===this.mode?!0===this.history?window.onpopstate():window.onhashchange():this.onHashChanged()},init:function(t,e){function n(t){for(var e=0,n=f.listeners.length;e<n;e++)f.listeners[e](t)}var r=this;if(this.history=e,f.listeners||(f.listeners=[]),"onhashchange"in window&&(void 0===document.documentMode||document.documentMode>7))!0===this.history?setTimeout(function(){window.onpopstate=n},500):window.onhashchange=n,this.mode="modern";else{var i=document.createElement("iframe");i.id="state-frame",i.style.display="none",document.body.appendChild(i),this.writeFrame(""),"onpropertychange"in document&&"attachEvent"in document&&document.attachEvent("onpropertychange",function(){"location"===event.propertyName&&r.check()}),window.setInterval(function(){r.check()},50),this.onHashChanged=n,this.mode="legacy"}return f.listeners.push(t),this.mode},destroy:function(t){if(f&&f.listeners)for(var e=f.listeners,n=e.length-1;n>=0;n--)e[n]===t&&e.splice(n,1)},setHash:function(t){return"legacy"===this.mode&&this.writeFrame(t),!0===this.history?(window.history.pushState({},document.title,t),this.fire()):u.hash="/"===t[0]?t:"/"+t,this},writeFrame:function(t){var e=document.getElementById("state-frame"),n=e.contentDocument||e.contentWindow.document;n.open(),n.write("<script>_hash = '"+t+"'; onload = parent.listener.syncHash;<script>"),n.close()},syncHash:function(){var t=this._hash;return t!=u.hash&&(u.hash=t),this},onHashChanged:function(){}},f=t.Router=function(t){if(!(this instanceof f))return new f(t);this.params={},this.routes={},this.methods=["on","once","after","before"],this.scope=[],this._methods={},this._insert=this.insert,this.insert=this.insertEx,this.historySupport=null!=(null!=window.history?window.history.pushState:null),this.configure(),this.mount(t||{})};f.prototype.init=function(t){var n,r=this;return this.handler=function(t){var e=t&&t.newURL||window.location.hash,n=!0===r.history?r.getPath():e.replace(/.*#/,"");r.dispatch("on","/"===n.charAt(0)?n:"/"+n)},l.init(this.handler,this.history),!1===this.history?e()&&t?u.hash=t:e()||r.dispatch("on","/"+u.hash.replace(/^(#\/|#|\/)/,"")):(this.convert_hash_in_init?(n=e()&&t?t:e()?null:u.hash.replace(/^#/,""))&&window.history.replaceState({},document.title,n):n=this.getPath(),(n||!0===this.run_in_init)&&this.handler()),this},f.prototype.explode=function(){var t=!0===this.history?this.getPath():u.hash;return"/"===t.charAt(1)&&(t=t.slice(1)),t.slice(1,t.length).split("/")},f.prototype.setRoute=function(t,e,n){var r=this.explode();return"number"==typeof t&&"string"==typeof e?r[t]=e:"string"==typeof n?r.splice(t,e,s):r=[t],l.setHash(r.join("/")),r},f.prototype.insertEx=function(t,e,n,r){return"once"===t&&(t="on",n=function(t){var e=!1;return function(){if(!e)return e=!0,t.apply(this,arguments)}}(n)),this._insert(t,e,n,r)},f.prototype.getRoute=function(t){var e=t;if("number"==typeof t)e=this.explode()[t];else if("string"==typeof t){var n=this.explode();e=n.indexOf(t)}else e=this.explode();return e},f.prototype.destroy=function(){return l.destroy(this.handler),this},f.prototype.getPath=function(){var t=window.location.pathname;return"/"!==t.substr(0,1)&&(t="/"+t),t};var p=/\?.*/;f.prototype.configure=function(t){t=t||{};for(var e=0;e<this.methods.length;e++)this._methods[this.methods[e]]=!0;return this.recurse=t.recurse||this.recurse||!1,this.async=t.async||!1,this.delimiter=t.delimiter||"/",this.strict=void 0===t.strict||t.strict,this.notfound=t.notfound,this.resource=t.resource,this.history=t.html5history&&this.historySupport||!1,this.run_in_init=!0===this.history&&!1!==t.run_handler_in_init,this.convert_hash_in_init=!0===this.history&&!1!==t.convert_hash_in_init,this.every={after:t.after||null,before:t.before||null,on:t.on||null},this},f.prototype.param=function(t,e){":"!==t[0]&&(t=":"+t);var n=new RegExp(t,"g");return this.params[t]=function(t){return t.replace(n,e.source||e)},this},f.prototype.on=f.prototype.route=function(t,e,n){var r=this;return n||"function"!=typeof e||(n=e,e=t,t="on"),Array.isArray(e)?e.forEach(function(e){r.on(t,e,n)}):(e.source&&(e=e.source.replace(/\\\//gi,"/")),Array.isArray(t)?t.forEach(function(t){r.on(t.toLowerCase(),e,n)}):(e=e.split(new RegExp(this.delimiter)),e=c(e,this.delimiter),void this.insert(t,this.scope.concat(e),n)))},f.prototype.path=function(t,e){var n=this.scope.length;t.source&&(t=t.source.replace(/\\\//gi,"/")),t=t.split(new RegExp(this.delimiter)),t=c(t,this.delimiter),this.scope=this.scope.concat(t),e.call(this,this),this.scope.splice(n,t.length)},f.prototype.dispatch=function(t,e,n){function r(){o.last=a.after,o.invoke(o.runlist(a),o,n)}var i,o=this,a=this.traverse(t,e.replace(p,""),this.routes,""),s=this._invoked;return this._invoked=!0,a&&0!==a.length?("forward"===this.recurse&&(a=a.reverse()),(i=this.every&&this.every.after?[this.every.after].concat(this.last):[this.last])&&i.length>0&&s?(this.async?this.invoke(i,this,r):(this.invoke(i,this),r()),!0):(r(),!0)):(this.last=[],"function"==typeof this.notfound&&this.invoke([this.notfound],{method:t,path:e},n),!1)},f.prototype.invoke=function(t,e,r){var o,a=this;this.async?(o=function(n,r){if(Array.isArray(n))return i(n,o,r);"function"==typeof n&&n.apply(e,(t.captures||[]).concat(r))},i(t,o,function(){r&&r.apply(e,arguments)})):(o=function(r){return Array.isArray(r)?n(r,o):"function"==typeof r?r.apply(e,t.captures||[]):void("string"==typeof r&&a.resource&&a.resource[r].apply(e,t.captures||[]))},n(t,o))},f.prototype.traverse=function(t,e,n,r,i){function o(t){function e(t){for(var n=[],r=0;r<t.length;r++)n[r]=Array.isArray(t[r])?e(t[r]):t[r];return n}function n(t){for(var e=t.length-1;e>=0;e--)Array.isArray(t[e])?(n(t[e]),0===t[e].length&&t.splice(e,1)):i(t[e])||t.splice(e,1)}if(!i)return t;var r=e(t);return r.matched=t.matched,r.captures=t.captures,r.after=t.after.filter(i),n(r),r}var a,s,c,u,l=[];if(e===this.delimiter&&n[t])return u=[[n.before,n[t]].filter(Boolean)],u.after=[n.after].filter(Boolean),u.matched=!0,u.captures=[],o(u);for(var f in n)if(n.hasOwnProperty(f)&&(!this._methods[f]||this._methods[f]&&"object"==typeof n[f]&&!Array.isArray(n[f]))){if(a=s=r+this.delimiter+f,this.strict||(s+="["+this.delimiter+"]?"),!(c=e.match(new RegExp("^"+s))))continue;if(c[0]&&c[0]==e&&n[f][t])return u=[[n[f].before,n[f][t]].filter(Boolean)],u.after=[n[f].after].filter(Boolean),u.matched=!0,u.captures=c.slice(1),this.recurse&&n===this.routes&&(u.push([n.before,n.on].filter(Boolean)),u.after=u.after.concat([n.after].filter(Boolean))),o(u);if(u=this.traverse(t,e,n[f],a),u.matched)return u.length>0&&(l=l.concat(u)),this.recurse&&(l.push([n[f].before,n[f].on].filter(Boolean)),u.after=u.after.concat([n[f].after].filter(Boolean)),n===this.routes&&(l.push([n.before,n.on].filter(Boolean)),u.after=u.after.concat([n.after].filter(Boolean)))),l.matched=!0,l.captures=u.captures,l.after=u.after,o(l)}return!1},f.prototype.insert=function(t,e,n,r){var i,o,s,c;if(e=e.filter(function(t){return t&&t.length>0}),r=r||this.routes,c=e.shift(),/\:|\*/.test(c)&&!/\\d|\\w/.test(c)&&(c=a(c,this.params)),e.length>0)return r[c]=r[c]||{},this.insert(t,e,n,r[c]);if(c||e.length||r!==this.routes){if(i=typeof r[c],o=Array.isArray(r[c]),r[c]&&!o&&"object"==i)switch(typeof r[c][t]){case"function":return void(r[c][t]=[r[c][t],n]);case"object":return void r[c][t].push(n);case"undefined":return void(r[c][t]=n)}else if("undefined"==i)return s={},s[t]=n,void(r[c]=s);throw new Error("Invalid route context: "+i)}switch(typeof r[t]){case"function":return void(r[t]=[r[t],n]);case"object":return void r[t].push(n);case"undefined":return void(r[t]=n)}},f.prototype.extend=function(t){var e,n=this,r=t.length;for(e=0;e<r;e++)!function(t){n._methods[t]=!0,n[t]=function(){var e=1===arguments.length?[t,""]:[t];n.on.apply(n,e.concat(Array.prototype.slice.call(arguments)))}}(t[e])},f.prototype.runlist=function(t){var e=this.every&&this.every.before?[this.every.before].concat(r(t)):r(t);return this.every&&this.every.on&&e.push(this.every.on),e.captures=t.captures,e.source=t.source,e},f.prototype.mount=function(t,e){if(t&&"object"==typeof t&&!Array.isArray(t)){var n=this;e=e||[],Array.isArray(e)||(e=e.split(n.delimiter));for(var r in t)t.hasOwnProperty(r)&&function(e,r){var i=e,o=e.split(n.delimiter),a=typeof t[e],s=""===o[0]||!n._methods[o[0]],u=s?"on":i;if(s&&(i=i.slice((i.match(new RegExp("^"+n.delimiter))||[""])[0].length),o.shift()),s&&"object"===a&&!Array.isArray(t[e]))return r=r.concat(o),void n.mount(t[e],r);s&&(r=r.concat(i.split(n.delimiter)),r=c(r,n.delimiter)),n.insert(u,r,t[e])}(r,e.slice(0))}}}(e)},tTVk:function(t,e){t.exports=function(t,e){for(var n=[],r={},i=0;i<e.length;i++){var o=e[i],a=o[0],s=o[1],c=o[2],u=o[3],l={id:t+":"+i,css:s,media:c,sourceMap:u};r[a]?r[a].parts.push(l):n.push(r[a]={id:a,parts:[l]})}return n}}});
//# sourceMappingURL=vendor.e7008001a8bed009bbf1.js.map
// ---- end verbatim copy of SP2:todomvc/architecture-examples/vuejs-cli/dist/static/js/vendor.e7008001a8bed009bbf1.js ----
// ---- begin verbatim copy of Speedometer SP2:todomvc/architecture-examples/vuejs-cli/dist/static/js/app.e6c010d57d53537f4ad2.js ----
webpackJsonp([0],{EHTI:function(e,t,o){"use strict";function n(e){o("jhjR")}Object.defineProperty(t,"__esModule",{value:!0});var l=o("eXNe"),i=o.n(l),s=o("b5yK"),a=o("VU/8"),c=n,r=a(i.a,s.a,c,null,null);t.default=r.exports},M93x:function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=o("xJD8"),l=o.n(n),i=o("VG6p"),s=o("VU/8"),a=s(l.a,i.a,null,null,null);t.default=a.exports},NHnr:function(e,t,o){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}var l=o("7+uW"),i=n(l),s=o("M93x"),a=n(s),c=o("rmnh"),r=n(c);window.VueApp=new i.default({el:"#app",render:function(e){return e(a.default)}});var d=new r.default.Router;["all","active","completed"].forEach(function(e){d.on(e,function(){window.VueApp.filter=e})}),d.configure({notfound:function(){window.location.hash="",window.VueApp.filter="all"}}),d.init()},VG6p:function(e,t,o){"use strict";var n=function(){var e=this,t=e.$createElement,o=e._self._c||t;return o("div",{attrs:{id:"app"}},[o("Todos")],1)},l=[],i={render:n,staticRenderFns:l};t.a=i},b5yK:function(e,t,o){"use strict";var n=function(){var e=this,t=e.$createElement,o=e._self._c||t;return o("section",{staticClass:"todoapp"},[o("header",{staticClass:"header"},[o("h1",[e._v("Todos")]),e._v(" "),o("input",{directives:[{name:"model",rawName:"v-model",value:e.newTodo,expression:"newTodo"}],staticClass:"new-todo",attrs:{type:"text",autofocus:"",autocomplete:"off",placeholder:"What needs to be done?"},domProps:{value:e.newTodo},on:{keyup:function(t){if(!("button"in t)&&e._k(t.keyCode,"enter",13))return null;e.addTodo(t)},input:function(t){t.target.composing||(e.newTodo=t.target.value)}}})]),e._v(" "),o("section",{directives:[{name:"show",rawName:"v-show",value:e.todos.length,expression:"todos.length"}],staticClass:"main"},[o("input",{directives:[{name:"model",rawName:"v-model",value:e.allDone,expression:"allDone"}],staticClass:"toggle-all",attrs:{type:"checkbox"},domProps:{checked:Array.isArray(e.allDone)?e._i(e.allDone,null)>-1:e.allDone},on:{__c:function(t){var o=e.allDone,n=t.target,l=!!n.checked;if(Array.isArray(o)){var i=e._i(o,null);n.checked?i<0&&(e.allDone=o.concat(null)):i>-1&&(e.allDone=o.slice(0,i).concat(o.slice(i+1)))}else e.allDone=l}}}),e._v(" "),o("ul",{staticClass:"todo-list"},e._l(e.filteredTodos,function(t){return o("li",{staticClass:"todo",class:{completed:t.completed,editing:t===e.editing}},[o("div",{staticClass:"view"},[o("input",{directives:[{name:"model",rawName:"v-model",value:t.completed,expression:"todo.completed"}],staticClass:"toggle",attrs:{type:"checkbox"},domProps:{checked:Array.isArray(t.completed)?e._i(t.completed,null)>-1:t.completed},on:{__c:function(o){var n=t.completed,l=o.target,i=!!l.checked;if(Array.isArray(n)){var s=e._i(n,null);l.checked?s<0&&(t.completed=n.concat(null)):s>-1&&(t.completed=n.slice(0,s).concat(n.slice(s+1)))}else t.completed=i}}}),e._v(" "),o("label",{on:{dblclick:function(o){e.editTodo(t)}}},[e._v(e._s(t.title))]),e._v(" "),o("button",{staticClass:"destroy",on:{click:function(o){o.preventDefault(),e.deleteTodo(t)}}})]),e._v(" "),o("input",{directives:[{name:"model",rawName:"v-model",value:t.title,expression:"todo.title"},{name:"todoFocus",rawName:"v-todoFocus",value:t===e.editing,expression:"todo === editing"}],staticClass:"edit",attrs:{type:"text"},domProps:{value:t.title},on:{keyup:function(t){if(!("button"in t)&&e._k(t.keyCode,"enter",13))return null;e.doneEdit(t)},blur:e.doneEdit,input:function(e){e.target.composing||(t.title=e.target.value)}}})])}))]),e._v(" "),o("footer",{directives:[{name:"show",rawName:"v-show",value:e.todos.length>0,expression:"todos.length > 0"}],staticClass:"footer"},[o("span",{staticClass:"todo-count"},[o("strong",[e._v(e._s(e.remaining))]),e._v(" "+e._s(e._f("pluralize")(e.remaining))+" left\n        ")]),e._v(" "),o("ul",{staticClass:"filters"},[o("li",[o("a",{class:{selected:"all"==e.filter},attrs:{href:"#/all"},on:{click:function(t){e.filter="all"}}},[e._v("All")])]),e._v(" "),o("li",[o("a",{class:{selected:"active"==e.filter},attrs:{href:"#/active"},on:{click:function(t){e.filter="active"}}},[e._v("Active")])]),e._v(" "),o("li",[o("a",{class:{selected:"completed"==e.filter},attrs:{href:"#/completed"},on:{click:function(t){e.filter="completed"}}},[e._v("Completed")])])]),e._v(" "),o("button",{directives:[{name:"show",rawName:"v-show",value:e.completed,expression:"completed"}],staticClass:"clear-completed",on:{click:function(t){t.preventDefault(),e.deleteCompleted(t)}}},[e._v("Clear Completed")])])])},l=[],i={render:n,staticRenderFns:l};t.a=i},eXNe:function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=o("7+uW"),l=function(e){return e&&e.__esModule?e:{default:e}}(n);t.default={data:function(){return{todos:[],newTodo:"",filter:"all",allDone:!1,editing:null}},filters:{pluralize:function(e){return 1===e?"item":"items"}},directives:{todoFocus:function(e,t){t&&l.default.nextTick(function(t){e.focus()})}},methods:{addTodo:function(){this.todos.push({completed:!1,title:this.newTodo}),this.newTodo=""},deleteTodo:function(e){this.todos=this.todos.filter(function(t){return t!==e})},deleteCompleted:function(){this.todos=this.todos.filter(function(e){return!e.completed})},editTodo:function(e){this.editing=e},doneEdit:function(){this.editing=null}},computed:{remaining:function(){return this.todos.filter(function(e){return!e.completed}).length},completed:function(){return this.todos.filter(function(e){return e.completed}).length},filteredTodos:function(){return"active"===this.filter?this.todos.filter(function(e){return!e.completed}):"completed"===this.filter?this.todos.filter(function(e){return e.completed}):this.todos},allDone:{get:function(){return 0===this.remaining},set:function(e){this.todos.forEach(function(t){t.completed=e})}}}}},jhjR:function(e,t){},xJD8:function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=o("EHTI"),l=function(e){return e&&e.__esModule?e:{default:e}}(n);t.default={name:"app",components:{Todos:l.default}}}},["NHnr"]);
//# sourceMappingURL=app.e6c010d57d53537f4ad2.js.map
// ---- end verbatim copy of SP2:todomvc/architecture-examples/vuejs-cli/dist/static/js/app.e6c010d57d53537f4ad2.js ----
sp2RunTodoMVC(ROUNDS, function (step) {
    mix(document.body.innerHTML);
}).then(function () { log("checksum " + __checksum); }, function (e) { log("ERROR " + e + "\n" + e.stack); });
