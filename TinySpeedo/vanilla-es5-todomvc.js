// Speedometer 3 "TodoMVC-JavaScript-ES5-Complex-DOM" JavaScript: the SP3 app at todomvc/vanilla-examples/javascript-es5/dist (verbatim)
// running against a plain-object DOM, driven by the SP3 TodoMVC steps.
var ROUNDS = 6;
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
document.body.innerHTML = "\n        <section class=\"todoapp\">\n            <header class=\"header\">\n                <h1>todos</h1>\n                <input class=\"new-todo\" placeholder=\"What needs to be done?\" autofocus />\n            </header>\n            <main class=\"main\">\n                <div class=\"toggle-all-container\">\n                    <input class=\"toggle-all\" type=\"checkbox\" />\n                    <label class=\"toggle-all-label\" for=\"toggle-all\">Mark all as complete</label>\n                </div>\n                <ul class=\"todo-list show-priority\"></ul>\n            </main>\n            <footer class=\"footer\">\n                <span class=\"todo-count\"></span>\n                <ul class=\"filters\">\n                    <li>\n                        <a href=\"#/\" class=\"selected\">All</a>\n                    </li>\n                    <li>\n                        <a href=\"#/active\">Active</a>\n                    </li>\n                    <li>\n                        <a href=\"#/completed\">Completed</a>\n                    </li>\n                </ul>\n                <button class=\"clear-completed\">Clear completed</button>\n            </footer>\n        </section>\n        <footer class=\"info\">\n            <p>Click on input field to write your todo.</p>\n            <p>At least two characters are needed to be a valid entry.</p>\n            <p>Press 'enter' to add the todo.</p>\n            <p>Double-click to edit a todo</p>\n        </footer>\n        ";
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
// ---- begin verbatim copy of Speedometer SP3:todomvc/vanilla-examples/javascript-es5/dist/helpers.js ----
/* global NodeList */
(function (window) {
    "use strict";

    // Get element(s) by CSS selector:
    window.qs = function (selector, scope) {
        return (scope || document).querySelector(selector);
    };
    window.qsa = function (selector, scope) {
        return (scope || document).querySelectorAll(selector);
    };

    // addEventListener wrapper:
    window.$on = function (target, type, callback, useCapture) {
        target.addEventListener(type, callback, !!useCapture);
    };

    // Attach a handler to event for all elements that match the selector,
    // now or in the future, based on a root element
    window.$delegate = function (target, selector, type, handler) {
        function dispatchEvent(event) {
            var targetElement = event.target;
            var potentialElements = window.qsa(selector, target);
            var hasMatch = Array.prototype.indexOf.call(potentialElements, targetElement) >= 0;

            if (hasMatch)
                handler.call(targetElement, event);
        }

        // https://developer.mozilla.org/en-US/docs/Web/Events/blur
        var useCapture = type === "blur" || type === "focus";

        window.$on(target, type, dispatchEvent, useCapture);
    };

    // Find the element's parent with the given tag name:
    // $parent(qs('a'), 'div');
    window.$parent = function (element, tagName) {
        if (!element.parentNode)
            return undefined;

        if (element.parentNode.tagName.toLowerCase() === tagName.toLowerCase())
            return element.parentNode;

        return window.$parent(element.parentNode, tagName);
    };

    // Allow for looping on nodes by chaining:
    // qsa('.foo').forEach(function () {})
    NodeList.prototype.forEach = Array.prototype.forEach;
})(window);

// ---- end verbatim copy of SP3:todomvc/vanilla-examples/javascript-es5/dist/helpers.js ----
// ---- begin verbatim copy of Speedometer SP3:todomvc/vanilla-examples/javascript-es5/dist/store.js ----
/* jshint eqeqeq:false */
(function (window) {
    "use strict";

    var MemoryStorage = {};
    var ID = 1;

    /**
     * Creates a new client side storage object and will create an empty
     * collection if no collection already exists.
     *
     * @param {string} name The name of our DB we want to use
     * @param {function} callback Our fake DB uses callbacks because in
     * real life you probably would be making AJAX calls
     */
    function Store(name, callback) {
        callback = callback || function () {};

        this._dbName = name;

        if (!MemoryStorage[name]) {
            var data = {
                todos: [],
            };

            MemoryStorage[name] = JSON.stringify(data);
        }

        callback.call(this, JSON.parse(MemoryStorage[name]));
    }

    /**
     * Finds items based on a query given as a JS object
     *
     * @param {object} query The query to match against (i.e. {foo: 'bar'})
     * @param {function} callback     The callback to fire when the query has
     * completed running
     *
     * @example
     * db.find({foo: 'bar', hello: 'world'}, function (data) {
     *     // data will return any items that have foo: bar and
     *     // hello: world in their properties
     * });
     */
    Store.prototype.find = function (query, callback) {
        if (!callback)
            return;

        var todos = JSON.parse(MemoryStorage[this._dbName]).todos;

        callback.call(
            this,
            todos.filter(function (todo) {
                for (var q in query) {
                    if (query[q] !== todo[q])
                        return false;
                }

                return true;
            })
        );
    };

    /**
     * Will retrieve all data from the collection
     *
     * @param {function} callback The callback to fire upon retrieving data
     */
    Store.prototype.findAll = function (callback) {
        callback = callback || function () {};
        callback.call(this, JSON.parse(MemoryStorage[this._dbName]).todos);
    };

    /**
     * Will save the given data to the DB. If no item exists it will create a new
     * item, otherwise it'll simply update an existing item's properties
     *
     * @param {object} updateData The data to save back into the DB
     * @param {function} callback The callback to fire after saving
     * @param {number} id An optional param to enter an ID of an item to update
     */
    Store.prototype.save = function (updateData, callback, id) {
        var data = JSON.parse(MemoryStorage[this._dbName]);
        var todos = data.todos;

        callback = callback || function () {};

        // If an ID was actually given, find the item and update each property
        if (id) {
            for (var i = 0; i < todos.length; i++) {
                if (todos[i].id === id) {
                    for (var key in updateData)
                        todos[i][key] = updateData[key];

                    break;
                }
            }

            MemoryStorage[this._dbName] = JSON.stringify(data);
            callback.call(this, todos);
        } else {
            // Generate an ID
            updateData.id = ID++;

            todos.push(updateData);
            MemoryStorage[this._dbName] = JSON.stringify(data);
            callback.call(this, [updateData]);
        }
    };

    /**
     * Will remove an item from the Store based on its ID
     *
     * @param {number} id The ID of the item you want to remove
     * @param {function} callback The callback to fire after saving
     */
    Store.prototype.remove = function (id, callback) {
        var data = JSON.parse(MemoryStorage[this._dbName]);
        var todos = data.todos;

        for (var i = 0; i < todos.length; i++) {
            if (todos[i].id === id) {
                todos.splice(i, 1);
                break;
            }
        }

        MemoryStorage[this._dbName] = JSON.stringify(data);
        callback.call(this, todos);
    };

    /**
     * Will drop all storage and start fresh
     *
     * @param {function} callback The callback to fire after dropping the data
     */
    Store.prototype.drop = function (callback) {
        var data = { todos: [] };
        MemoryStorage[this._dbName] = JSON.stringify(data);
        callback.call(this, data.todos);
    };

    // Export to window
    window.app = window.app || {};
    window.app.Store = Store;
})(window);

// ---- end verbatim copy of SP3:todomvc/vanilla-examples/javascript-es5/dist/store.js ----
// ---- begin verbatim copy of Speedometer SP3:todomvc/vanilla-examples/javascript-es5/dist/model.js ----
(function (window) {
    "use strict";

    /**
     * Creates a new Model instance and hooks up the storage.
     *
     * @constructor
     * @param {object} storage A reference to the client side storage class
     */
    function Model(storage) {
        this.storage = storage;
    }

    /**
     * Creates a new todo model
     *
     * @param {string} [title] The title of the task
     * @param {function} [callback] The callback to fire after the model is created
     */
    Model.prototype.create = function (title, callback) {
        title = title || "";
        callback = callback || function () {};

        var newItem = {
            title: title.trim(),
            completed: false,
        };

        this.storage.save(newItem, callback);
    };

    /**
     * Finds and returns a model in storage. If no query is given it'll simply
     * return everything. If you pass in a string or number it'll look that up as
     * the ID of the model to find. Lastly, you can pass it an object to match
     * against.
     *
     * @param {string|number|object} [query] A query to match models against
     * @param {function} [callback] The callback to fire after the model is found
     *
     * @example
     * model.read(1, func); // Will find the model with an ID of 1
     * model.read('1'); // Same as above
     * //Below will find a model with foo equalling bar and hello equalling world.
     * model.read({ foo: 'bar', hello: 'world' });
     */
    Model.prototype.read = function (query, callback) {
        var queryType = typeof query;
        callback = callback || function () {};

        if (queryType === "function") {
            callback = query;
            return this.storage.findAll(callback);
        } else if (queryType === "string" || queryType === "number") {
            query = parseInt(query, 10);
            return this.storage.find({ id: query }, callback);
        } else {
            return this.storage.find(query, callback);
        }
    };

    /**
     * Updates a model by giving it an ID, data to update, and a callback to fire when
     * the update is complete.
     *
     * @param {number} id The id of the model to update
     * @param {object} data The properties to update and their new value
     * @param {function} callback The callback to fire when the update is complete.
     */
    Model.prototype.update = function (id, data, callback) {
        this.storage.save(data, callback, id);
    };

    /**
     * Removes a model from storage
     *
     * @param {number} id The ID of the model to remove
     * @param {function} callback The callback to fire when the removal is complete.
     */
    Model.prototype.remove = function (id, callback) {
        this.storage.remove(id, callback);
    };

    /**
     * WARNING: Will remove ALL data from storage.
     *
     * @param {function} callback The callback to fire when the storage is wiped.
     */
    Model.prototype.removeAll = function (callback) {
        this.storage.drop(callback);
    };

    /**
     * Returns a count of all todos
     */
    Model.prototype.getCount = function (callback) {
        var todos = {
            active: 0,
            completed: 0,
            total: 0,
        };

        this.storage.findAll(function (data) {
            data.forEach(function (todo) {
                if (todo.completed)
                    todos.completed++;
                else
                    todos.active++;

                todos.total++;
            });
            callback(todos);
        });
    };

    // Export to window
    window.app = window.app || {};
    window.app.Model = Model;
})(window);

// ---- end verbatim copy of SP3:todomvc/vanilla-examples/javascript-es5/dist/model.js ----
// ---- begin verbatim copy of Speedometer SP3:todomvc/vanilla-examples/javascript-es5/dist/template.js ----
/* jshint laxbreak:true */
(function (window) {
    "use strict";

    var htmlEscapes = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;",
    };

    var escapeHtmlChar = function (chr) {
        return htmlEscapes[chr];
    };

    var reUnescapedHtml = /[&<>"'`]/g;
    var reHasUnescapedHtml = new RegExp(reUnescapedHtml.source);

    var escape = function (string) {
        return string && reHasUnescapedHtml.test(string) ? string.replace(reUnescapedHtml, escapeHtmlChar) : string;
    };

    /**
     * Sets up defaults for all the Template methods such as a default template
     *
     * @constructor
     */
    function Template() {
        this.defaultTemplate
            = '<li data-id="{{id}}" class="{{completed}}" data-priority="{{priority}}">'
            + '<div class="view">'
            + '<input class="toggle" type="checkbox" {{checked}}>'
            + "<label>{{title}}</label>"
            + '<button class="destroy"></button>'
            + "</div>"
            + "</li>";
    }

    /**
     * Creates an <li> HTML string and returns it for placement in your app.
     *
     * NOTE: In real life you should be using a templating engine such as Mustache
     * or Handlebars, however, this is a vanilla JS example.
     *
     * @param {object} data The object containing keys you want to find in the
     *                      template to replace.
     * @returns {string} HTML String of an <li> element
     *
     * @example
     * view.show({
     *    id: 1,
     *    title: "Hello World",
     *    completed: 0,
     * });
     */
    Template.prototype.show = function (data) {
        var i, l;
        var view = "";

        for (i = 0, l = data.length; i < l; i++) {
            var template = this.defaultTemplate;
            var completed = "";
            var checked = "";

            if (data[i].completed) {
                completed = "completed";
                checked = "checked";
            }

            template = template.replace("{{id}}", data[i].id);
            template = template.replace("{{title}}", escape(data[i].title));
            template = template.replace("{{completed}}", completed);
            template = template.replace("{{checked}}", checked);
            template = template.replace("{{priority}}", 4 - (i % 5));

            view = view + template;
        }

        return view;
    };

    /**
     * Displays a counter of how many to dos are left to complete
     *
     * @param {number} activeTodos The number of active todos.
     * @returns {string} String containing the count
     */
    Template.prototype.itemCounter = function (activeTodos) {
        var plural = activeTodos === 1 ? "" : "s";

        return `<strong>${activeTodos}</strong> item${plural} left`;
    };

    /**
     * Updates the text within the "Clear completed" button
     *
     * @param  {[type]} completedTodos The number of completed todos.
     * @returns {string} String containing the count
     */
    Template.prototype.clearCompletedButton = function (completedTodos) {
        if (completedTodos > 0)
            return "Clear completed";
        else
            return "";
    };

    // Export to window
    window.app = window.app || {};
    window.app.Template = Template;
})(window);

// ---- end verbatim copy of SP3:todomvc/vanilla-examples/javascript-es5/dist/template.js ----
// ---- begin verbatim copy of Speedometer SP3:todomvc/vanilla-examples/javascript-es5/dist/view.js ----
/* global qs, qsa, $on, $parent, $delegate */

(function (window) {
    "use strict";

    /**
     * View that abstracts away the browser's DOM completely.
     * It has two simple entry points:
     *
     *   - bind(eventName, handler)
     *     Takes a todo application event and registers the handler
     *   - render(command, parameterObject)
     *     Renders the given command with the options
     */
    function View(template) {
        this.template = template;

        this.ENTER_KEY = 13;
        this.ESCAPE_KEY = 27;

        this.$todoList = qs(".todo-list");
        this.$todoItemCounter = qs(".todo-count");
        this.$clearCompleted = qs(".clear-completed");
        this.$main = qs(".main");
        this.$footer = qs(".footer");
        this.$toggleAllInput = qs(".toggle-all");
        this.$toggleAll = qs(".toggle-all-label");
        this.$newTodo = qs(".new-todo");
    }

    View.prototype._removeItem = function (id) {
        var elem = qs(`[data-id="${id}"]`);

        if (elem)
            this.$todoList.removeChild(elem);
    };

    View.prototype._clearCompletedButton = function (completedCount, visible) {
        this.$clearCompleted.textContent = this.template.clearCompletedButton(completedCount);
        this.$clearCompleted.style.display = visible ? "block" : "none";
    };

    View.prototype._setFilter = function (currentPage) {
        qs(".filters .selected").className = "";
        qs(`.filters [href="#/${currentPage}"]`).className = "selected";
    };

    View.prototype._elementComplete = function (id, completed) {
        var listItem = qs(`[data-id="${id}"]`);

        if (!listItem)
            return;

        listItem.className = completed ? "completed" : "";

        // In case it was toggled from an event and not by clicking the checkbox
        qs("input", listItem).checked = completed;
    };

    View.prototype._editItem = function (id, title) {
        var listItem = qs(`[data-id="${id}"]`);

        if (!listItem)
            return;

        listItem.className = `${listItem.className} editing`;

        var input = document.createElement("input");
        input.className = "edit";

        listItem.appendChild(input);
        input.focus();
        input.value = title;
    };

    View.prototype._editItemDone = function (id, title) {
        var listItem = qs(`[data-id="${id}"]`);

        if (!listItem)
            return;

        var input = qs("input.edit", listItem);
        listItem.removeChild(input);

        listItem.className = listItem.className.replace("editing", "");

        qsa("label", listItem).forEach(function (label) {
            label.textContent = title;
        });
    };

    View.prototype._replaceContentWithHtml = function (element, html) {
        const parsedDocument = new DOMParser().parseFromString(html, "text/html");
        element.replaceChildren(...parsedDocument.body.childNodes);
    };

    View.prototype.render = function (viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            showEntries: function () {
                self._replaceContentWithHtml(self.$todoList, self.template.show(parameter));
            },
            removeItem: function () {
                self._removeItem(parameter);
            },
            updateElementCount: function () {
                self._replaceContentWithHtml(self.$todoItemCounter, self.template.itemCounter(parameter));
            },
            clearCompletedButton: function () {
                self._clearCompletedButton(parameter.completed, parameter.visible);
            },
            contentBlockVisibility: function () {
                self.$main.style.display = self.$footer.style.display = parameter.visible ? "block" : "none";
            },
            toggleAll: function () {
                self.$toggleAll.checked = parameter.checked;
            },
            setFilter: function () {
                self._setFilter(parameter);
            },
            clearNewTodo: function () {
                self.$newTodo.value = "";
            },
            elementComplete: function () {
                self._elementComplete(parameter.id, parameter.completed);
            },
            editItem: function () {
                self._editItem(parameter.id, parameter.title);
            },
            editItemDone: function () {
                self._editItemDone(parameter.id, parameter.title);
            },
        };

        viewCommands[viewCmd]();
    };

    View.prototype._itemId = function (element) {
        var li = $parent(element, "li");
        return parseInt(li.dataset.id, 10);
    };

    View.prototype._bindItemEditDone = function (handler) {
        var self = this;
        $delegate(self.$todoList, "li .edit", "blur", function () {
            if (!this.dataset.iscanceled) {
                handler({
                    id: self._itemId(this),
                    title: this.value,
                });
            }
        });

        $delegate(self.$todoList, "li .edit", "keypress", function (event) {
            if (event.keyCode === self.ENTER_KEY) {
                // Remove the cursor from the input when you hit enter just like if it
                // were a real form
                this.blur();
            }
        });
    };

    View.prototype._bindItemEditCancel = function (handler) {
        var self = this;
        $delegate(self.$todoList, "li .edit", "keyup", function (event) {
            if (event.keyCode === self.ESCAPE_KEY) {
                this.dataset.iscanceled = true;
                this.blur();

                handler({ id: self._itemId(this) });
            }
        });
    };

    View.prototype.bind = function (event, handler) {
        var self = this;
        if (event === "newTodo") {
            $on(self.$newTodo, "change", function () {
                handler(self.$newTodo.value);
            });
        } else if (event === "removeCompleted") {
            $on(self.$clearCompleted, "click", function () {
                handler();
            });
        } else if (event === "toggleAll") {
            $on(self.$toggleAll, "click", function () {
                self.$toggleAllInput.click();
                handler({ completed: self.$toggleAllInput.checked });
            });
        } else if (event === "itemEdit") {
            $delegate(self.$todoList, "li label", "dblclick", function () {
                handler({ id: self._itemId(this) });
            });
        } else if (event === "itemRemove") {
            $delegate(self.$todoList, ".destroy", "click", function () {
                handler({ id: self._itemId(this) });
            });
        } else if (event === "itemToggle") {
            $delegate(self.$todoList, ".toggle", "click", function () {
                handler({
                    id: self._itemId(this),
                    completed: this.checked,
                });
            });
        } else if (event === "itemEditDone") {
            self._bindItemEditDone(handler);
        } else if (event === "itemEditCancel") {
            self._bindItemEditCancel(handler);
        }
    };

    // Export to window
    window.app = window.app || {};
    window.app.View = View;
})(window);

// ---- end verbatim copy of SP3:todomvc/vanilla-examples/javascript-es5/dist/view.js ----
// ---- begin verbatim copy of Speedometer SP3:todomvc/vanilla-examples/javascript-es5/dist/controller.js ----
(function (window) {
    "use strict";

    /**
     * Takes a model and view and acts as the controller between them
     *
     * @constructor
     * @param {object} model The model instance
     * @param {object} view The view instance
     */
    function Controller(model, view) {
        var self = this;
        self.model = model;
        self.view = view;

        self.view.bind("newTodo", function (title) {
            self.addItem(title);
        });

        self.view.bind("itemEdit", function (item) {
            self.editItem(item.id);
        });

        self.view.bind("itemEditDone", function (item) {
            self.editItemSave(item.id, item.title);
        });

        self.view.bind("itemEditCancel", function (item) {
            self.editItemCancel(item.id);
        });

        self.view.bind("itemRemove", function (item) {
            self.removeItem(item.id);
        });

        self.view.bind("itemToggle", function (item) {
            self.toggleComplete(item.id, item.completed);
        });

        self.view.bind("removeCompleted", function () {
            self.removeCompletedItems();
        });

        self.view.bind("toggleAll", function (status) {
            self.toggleAll(status.completed);
        });
    }

    /**
     * Loads and initialises the view
     *
     * @param {string} '' | 'active' | 'completed'
     */
    Controller.prototype.setView = function (locationHash) {
        var route = locationHash.split("/")[1];
        var page = route || "";
        this._updateFilterState(page);
    };

    /**
     * An event to fire on load. Will get all items and display them in the
     * todo-list
     */
    Controller.prototype.showAll = function () {
        var self = this;
        self.model.read(function (data) {
            self.view.render("showEntries", data);
        });
    };

    /**
     * Renders all active tasks
     */
    Controller.prototype.showActive = function () {
        var self = this;
        self.model.read({ completed: false }, function (data) {
            self.view.render("showEntries", data);
        });
    };

    /**
     * Renders all completed tasks
     */
    Controller.prototype.showCompleted = function () {
        var self = this;
        self.model.read({ completed: true }, function (data) {
            self.view.render("showEntries", data);
        });
    };

    /**
     * An event to fire whenever you want to add an item. Simply pass in the event
     * object and it'll handle the DOM insertion and saving of the new item.
     */
    Controller.prototype.addItem = function (title) {
        var self = this;

        if (title.trim() === "")
            return;

        self.model.create(title, function () {
            self.view.render("clearNewTodo");
            self._filter(true);
        });
    };

    /*
     * Triggers the item editing mode.
     */
    Controller.prototype.editItem = function (id) {
        var self = this;
        self.model.read(id, function (data) {
            self.view.render("editItem", { id: id, title: data[0].title });
        });
    };

    /*
     * Finishes the item editing mode successfully.
     */
    Controller.prototype.editItemSave = function (id, title) {
        var self = this;
        title = title.trim();

        if (title.length !== 0) {
            self.model.update(id, { title: title }, function () {
                self.view.render("editItemDone", { id: id, title: title });
            });
        } else {
            self.removeItem(id);
        }
    };

    /*
     * Cancels the item editing mode.
     */
    Controller.prototype.editItemCancel = function (id) {
        var self = this;
        self.model.read(id, function (data) {
            self.view.render("editItemDone", { id: id, title: data[0].title });
        });
    };

    /**
     * By giving it an ID it'll find the DOM element matching that ID,
     * remove it from the DOM and also remove it from storage.
     *
     * @param {number} id The ID of the item to remove from the DOM and
     * storage
     */
    Controller.prototype.removeItem = function (id) {
        var self = this;
        self.model.remove(id, function () {
            self.view.render("removeItem", id);
        });

        self._filter();
    };

    /**
     * Will remove all completed items from the DOM and storage.
     */
    Controller.prototype.removeCompletedItems = function () {
        var self = this;
        self.model.read({ completed: true }, function (data) {
            data.forEach(function (item) {
                self.removeItem(item.id);
            });
        });

        self._filter();
    };

    /**
     * Give it an ID of a model and a checkbox and it will update the item
     * in storage based on the checkbox's state.
     *
     * @param {number} id The ID of the element to complete or uncomplete
     * @param {object} checkbox The checkbox to check the state of complete
     *                          or not
     * @param {boolean|undefined} silent Prevent re-filtering the todo items
     */
    Controller.prototype.toggleComplete = function (id, completed, silent) {
        var self = this;
        self.model.update(id, { completed: completed }, function () {
            self.view.render("elementComplete", {
                id: id,
                completed: completed,
            });
        });

        if (!silent)
            self._filter();
    };

    /**
     * Will toggle ALL checkboxes' on/off state and completeness of models.
     * Just pass in the event object.
     */
    Controller.prototype.toggleAll = function (completed) {
        var self = this;
        self.model.read({ completed: !completed }, function (data) {
            data.forEach(function (item) {
                self.toggleComplete(item.id, completed, true);
            });
        });

        self._filter();
    };

    /**
     * Updates the pieces of the page which change depending on the remaining
     * number of todos.
     */
    Controller.prototype._updateCount = function () {
        var self = this;
        self.model.getCount(function (todos) {
            self.view.render("updateElementCount", todos.active);
            self.view.render("clearCompletedButton", {
                completed: todos.completed,
                visible: todos.completed > 0,
            });

            self.view.render("toggleAll", { checked: todos.completed === todos.total });
            self.view.render("contentBlockVisibility", { visible: todos.total > 0 });
        });
    };

    /**
     * Re-filters the todo items, based on the active route.
     * @param {boolean|undefined} force  forces a re-painting of todo items.
     */
    Controller.prototype._filter = function (force) {
        var activeRoute = this._activeRoute.charAt(0).toUpperCase() + this._activeRoute.substr(1);

        // Update the elements on the page, which change with each completed todo
        this._updateCount();

        // If the last active route isn't "All", or we're switching routes, we
        // re-create the todo item elements, calling:
        //   this.show[All|Active|Completed]();
        if (force || this._lastActiveRoute !== "All" || this._lastActiveRoute !== activeRoute)
            this[`show${activeRoute}`]();

        this._lastActiveRoute = activeRoute;
    };

    /**
     * Simply updates the filter nav's selected states
     */
    Controller.prototype._updateFilterState = function (currentPage) {
        // Store a reference to the active route, allowing us to re-filter todo
        // items as they are marked complete or incomplete.
        this._activeRoute = currentPage;

        if (currentPage === "")
            this._activeRoute = "All";

        this._filter();

        this.view.render("setFilter", currentPage);
    };

    // Export to window
    window.app = window.app || {};
    window.app.Controller = Controller;
})(window);

// ---- end verbatim copy of SP3:todomvc/vanilla-examples/javascript-es5/dist/controller.js ----
// ---- begin verbatim copy of Speedometer SP3:todomvc/vanilla-examples/javascript-es5/dist/app.js ----
/* global app, $on */
(function () {
    "use strict";

    /**
     * Sets up a brand new Todo list.
     *
     * @param {string} name The name of your new to do list.
     */
    function Todo(name) {
        this.storage = new app.Store(name);
        this.model = new app.Model(this.storage);
        this.template = new app.Template();
        this.view = new app.View(this.template);
        this.controller = new app.Controller(this.model, this.view);
    }

    var todo = new Todo("javascript-es5");

    function setView() {
        todo.controller.setView(document.location.hash);
    }
    $on(window, "load", setView);
    $on(window, "hashchange", setView);
})();

// ---- end verbatim copy of SP3:todomvc/vanilla-examples/javascript-es5/dist/app.js ----
sp3Options = { enter: "keypress", valueEvent: "change", lang: "ja" };
fireLoadEvents();
sp3RunTodoMVC(document.body, ROUNDS, function (step) {
    mix(document.querySelector(".todoapp").innerHTML);
}).then(function () { log("checksum " + __checksum); }, function (e) { log("ERROR " + e + "\n" + e.stack); });
