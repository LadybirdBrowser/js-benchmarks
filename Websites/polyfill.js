// Polyfill browser globals for LibJS

// --- EventTarget / Event ---
class EventTarget {
  constructor() { this._listeners = {}; }
  addEventListener(type, fn, opts) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(fn);
  }
  removeEventListener(type, fn) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(f => f !== fn);
  }
  dispatchEvent(event) {
    const list = this._listeners[event.type] || [];
    for (const fn of list) { try { fn(event); } catch(e) {} }
    return true;
  }
}

class Event {
  constructor(type, init) {
    init = init || {};
    this.type = type;
    this.bubbles = init.bubbles || false;
    this.cancelable = init.cancelable || false;
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
    this.timeStamp = Date.now();
  }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() {}
  stopImmediatePropagation() {}
}

class CustomEvent extends Event {
  constructor(type, init) {
    super(type, init);
    this.detail = (init && init.detail !== undefined) ? init.detail : null;
  }
}

// --- Timers ---
let _timerId = 1;
function setTimeout(fn, delay) { return _timerId++; }
function clearTimeout(id) {}
function setInterval(fn, delay) { return _timerId++; }
function clearInterval(id) {}
function queueMicrotask(fn) { try { fn(); } catch(e) {} }
function requestAnimationFrame(fn) { return _timerId++; }
function cancelAnimationFrame(id) {}

// --- URL ---
class URL {
  constructor(url, base) {
    if (typeof url !== 'string') url = String(url);
    if (base && typeof base !== 'string') base = String(base);
    try {
      let full = url;
      if (base && !url.match(/^[a-z]+:/i)) {
        if (url.startsWith('/')) {
          const m = base.match(/^([a-z]+:\/\/[^/]*)/i);
          full = m ? m[1] + url : base + url;
        } else {
          full = base.replace(/[^/]*$/, '') + url;
        }
      }
      const m = full.match(/^([a-z][a-z0-9+\-.]*):(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/i);
      if (m) {
        this.protocol = (m[1] || 'https') + ':';
        const host = m[2] || '';
        const colonIdx = host.lastIndexOf(':');
        if (colonIdx > 0) {
          this.hostname = host.slice(0, colonIdx);
          this.port = host.slice(colonIdx + 1);
        } else {
          this.hostname = host;
          this.port = '';
        }
        this.host = host;
        this.pathname = m[3] || '/';
        this.search = m[4] !== undefined ? '?' + m[4] : '';
        this.hash = m[5] !== undefined ? '#' + m[5] : '';
        this.origin = this.protocol + '//' + this.host;
        this.href = full;
        this.searchParams = new URLSearchParams(m[4] || '');
      } else {
        this._setDefault(url);
      }
    } catch(e) {
      this._setDefault(url);
    }
  }
  _setDefault(url) {
    this.protocol = 'https:'; this.hostname = ''; this.port = ''; this.host = '';
    this.pathname = url; this.search = ''; this.hash = ''; this.origin = '';
    this.href = url; this.searchParams = new URLSearchParams('');
  }
  toString() { return this.href; }
  static createObjectURL(blob) { return 'blob:fake-' + Math.random(); }
  static revokeObjectURL(url) {}
}

class URLSearchParams {
  constructor(init) {
    this._params = [];
    if (!init) return;
    if (typeof init === 'string') {
      init = init.replace(/^\?/, '');
      if (init) {
        for (const pair of init.split('&')) {
          const idx = pair.indexOf('=');
          if (idx === -1) this._params.push([decodeURIComponent(pair), '']);
          else this._params.push([decodeURIComponent(pair.slice(0,idx)), decodeURIComponent(pair.slice(idx+1))]);
        }
      }
    } else if (typeof init === 'object') {
      for (const [k, v] of Object.entries(init)) this._params.push([k, String(v)]);
    }
  }
  get(key) { const p = this._params.find(([k]) => k === key); return p ? p[1] : null; }
  getAll(key) { return this._params.filter(([k]) => k === key).map(([,v]) => v); }
  has(key) { return this._params.some(([k]) => k === key); }
  set(key, val) {
    const idx = this._params.findIndex(([k]) => k === key);
    if (idx >= 0) { this._params[idx][1] = String(val); this._params = this._params.filter(([k], i) => k !== key || i === idx); }
    else this._params.push([key, String(val)]);
  }
  append(key, val) { this._params.push([key, String(val)]); }
  delete(key) { this._params = this._params.filter(([k]) => k !== key); }
  forEach(fn) { for (const [k, v] of this._params) fn(v, k, this); }
  keys() { return this._params.map(([k]) => k)[Symbol.iterator](); }
  values() { return this._params.map(([,v]) => v)[Symbol.iterator](); }
  entries() { return this._params[Symbol.iterator](); }
  [Symbol.iterator]() { return this._params[Symbol.iterator](); }
  toString() { return this._params.map(([k,v]) => encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&'); }
}

// --- crypto ---
const crypto = {
  getRandomValues(arr) {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    return arr;
  },
  randomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },
  subtle: {
    digest() { return Promise.resolve(new ArrayBuffer(32)); },
    encrypt() { return Promise.resolve(new ArrayBuffer(0)); },
    decrypt() { return Promise.resolve(new ArrayBuffer(0)); },
    sign() { return Promise.resolve(new ArrayBuffer(0)); },
    verify() { return Promise.resolve(false); },
    importKey() { return Promise.resolve({}); },
    exportKey() { return Promise.resolve({}); },
    generateKey() { return Promise.resolve({}); },
    deriveKey() { return Promise.resolve({}); },
    deriveBits() { return Promise.resolve(new ArrayBuffer(0)); },
  }
};

// --- performance ---
const _perfStart = Date.now();
const performance = {
  now() { return Date.now() - _perfStart; },
  mark(name) {},
  measure(name, start, end) {},
  getEntriesByName(name) { return []; },
  getEntriesByType(type) { return []; },
  clearMarks() {},
  clearMeasures() {},
  timeOrigin: _perfStart,
  eventCounts: new Map(),
};

// --- Blob / File / FileReader / FormData ---
class Blob {
  constructor(parts, opts) {
    parts = parts || [];
    opts = opts || {};
    this.type = opts.type || '';
    this._parts = parts;
    this.size = parts.reduce((s, p) => s + (typeof p === 'string' ? p.length : (p && (p.byteLength || p.size) || 0)), 0);
  }
  text() { return Promise.resolve(this._parts.filter(p => typeof p === 'string').join('')); }
  arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
  stream() { return null; }
  slice(start, end, type) { return new Blob([], {type}); }
}

class File extends Blob {
  constructor(parts, name, opts) {
    super(parts, opts);
    this.name = name;
    this.lastModified = (opts && opts.lastModified) || Date.now();
  }
}

class FileReader extends EventTarget {
  constructor() {
    super();
    this.readyState = 0; this.result = null; this.error = null;
    this.onload = null; this.onerror = null; this.onloadend = null;
    this.onloadstart = null; this.onprogress = null; this.onabort = null;
  }
  readAsText(blob, encoding) { this.readyState = 2; this.result = ''; if (this.onload) this.onload({target:this}); if (this.onloadend) this.onloadend({target:this}); }
  readAsDataURL(blob) { this.readyState = 2; this.result = 'data:;base64,'; if (this.onload) this.onload({target:this}); if (this.onloadend) this.onloadend({target:this}); }
  readAsArrayBuffer(blob) { this.readyState = 2; this.result = new ArrayBuffer(0); if (this.onload) this.onload({target:this}); if (this.onloadend) this.onloadend({target:this}); }
  abort() {}
}

class FormData {
  constructor() { this._data = []; }
  append(key, val, filename) { this._data.push([key, val, filename]); }
  get(key) { const p = this._data.find(([k]) => k === key); return p ? p[1] : null; }
  getAll(key) { return this._data.filter(([k]) => k === key).map(([,v]) => v); }
  has(key) { return this._data.some(([k]) => k === key); }
  set(key, val) { this._data = this._data.filter(([k]) => k !== key); this._data.push([key, val]); }
  delete(key) { this._data = this._data.filter(([k]) => k !== key); }
  forEach(fn) { for (const [k, v] of this._data) fn(v, k, this); }
  entries() { return this._data.map(([k,v]) => [k,v])[Symbol.iterator](); }
  keys() { return this._data.map(([k]) => k)[Symbol.iterator](); }
  values() { return this._data.map(([,v]) => v)[Symbol.iterator](); }
  [Symbol.iterator]() { return this.entries(); }
}

// --- fetch / XMLHttpRequest / WebSocket ---
function fetch(url, opts) {
  return Promise.resolve({
    ok: false, status: 0, statusText: 'Not implemented', url: String(url),
    headers: { get() { return null; }, has() { return false; }, forEach() {}, entries() { return [][Symbol.iterator](); } },
    json() { return Promise.resolve(null); },
    text() { return Promise.resolve(''); },
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); },
    blob() { return Promise.resolve(new Blob()); },
    clone() { return this; },
  });
}

class XMLHttpRequest extends EventTarget {
  constructor() {
    super();
    this.readyState = 0; this.status = 0; this.statusText = '';
    this.responseText = ''; this.response = null; this.responseType = '';
    this.responseURL = ''; this.timeout = 0; this.withCredentials = false;
    this.upload = new EventTarget();
    this.onreadystatechange = null; this.onload = null; this.onerror = null;
    this.ontimeout = null; this.onabort = null; this.onprogress = null;
    this._headers = {};
  }
  open(method, url) { this.responseURL = url; }
  send(body) {}
  abort() {}
  setRequestHeader(name, value) { this._headers[name] = value; }
  getResponseHeader(name) { return null; }
  getAllResponseHeaders() { return ''; }
  overrideMimeType(mime) {}
}

class WebSocket extends EventTarget {
  constructor(url, protocols) {
    super();
    this.url = url; this.readyState = 3; this.bufferedAmount = 0;
    this.extensions = ''; this.protocol = ''; this.binaryType = 'blob';
    this.onopen = null; this.onclose = null; this.onmessage = null; this.onerror = null;
  }
  send(data) {}
  close(code, reason) {}
}
WebSocket.CONNECTING = 0; WebSocket.OPEN = 1; WebSocket.CLOSING = 2; WebSocket.CLOSED = 3;

class Worker extends EventTarget {
  constructor(url, opts) { super(); this.onmessage = null; this.onerror = null; this.onmessageerror = null; }
  postMessage(msg, transfer) {}
  terminate() {}
}

// --- Observers ---
class MutationObserver {
  constructor(callback) { this._cb = callback; }
  observe(target, opts) {}
  disconnect() {}
  takeRecords() { return []; }
}

class IntersectionObserver {
  constructor(callback, opts) { this._cb = callback; this.root = null; this.rootMargin = '0px'; this.thresholds = [0]; }
  observe(el) {}
  unobserve(el) {}
  disconnect() {}
  takeRecords() { return []; }
}

class ResizeObserver {
  constructor(callback) { this._cb = callback; }
  observe(el, opts) {}
  unobserve(el) {}
  disconnect() {}
}

// --- Storage ---
class Storage {
  constructor() { this._store = {}; }
  get length() { return Object.keys(this._store).length; }
  key(n) { return Object.keys(this._store)[n] || null; }
  getItem(k) { return k in this._store ? this._store[k] : null; }
  setItem(k, v) { this._store[String(k)] = String(v); }
  removeItem(k) { delete this._store[k]; }
  clear() { this._store = {}; }
}
const localStorage = new Storage();
const sessionStorage = new Storage();

// --- Minimal DOM ---
class DOMTokenList {
  constructor() { this._list = []; }
  get length() { return this._list.length; }
  contains(c) { return this._list.includes(c); }
  add(...classes) { for (const c of classes) if (!this._list.includes(c)) this._list.push(c); }
  remove(...classes) { this._list = this._list.filter(c => !classes.includes(c)); }
  toggle(c, force) {
    if (force === undefined) force = !this._list.includes(c);
    if (force) this.add(c); else this.remove(c);
    return force;
  }
  replace(old, next) { const i = this._list.indexOf(old); if (i >= 0) { this._list[i] = next; return true; } return false; }
  forEach(fn) { this._list.forEach(fn); }
  [Symbol.iterator]() { return this._list[Symbol.iterator](); }
  toString() { return this._list.join(' '); }
  item(i) { return this._list[i] || null; }
  value() { return this.toString(); }
}

class CSSStyleDeclaration {
  constructor() {
    this._styles = {};
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) return typeof target[prop] === 'function' ? target[prop].bind(target) : target[prop];
        if (typeof prop === 'string') return target._styles[prop] || '';
        return undefined;
      },
      set(target, prop, val) {
        if (prop === '_styles') { target._styles = val; return true; }
        target._styles[prop] = val;
        return true;
      }
    });
  }
  get cssText() { return Object.entries(this._styles).map(([k,v]) => k+':'+v).join(';'); }
  set cssText(v) { this._styles = {}; if (v) for (const s of v.split(';')) { const i = s.indexOf(':'); if (i > 0) this._styles[s.slice(0,i).trim()] = s.slice(i+1).trim(); } }
  setProperty(prop, val, priority) { this._styles[prop] = val || ''; }
  getPropertyValue(prop) { return this._styles[prop] || ''; }
  removeProperty(prop) { const v = this._styles[prop] || ''; delete this._styles[prop]; return v; }
  get length() { return Object.keys(this._styles).length; }
  item(i) { return Object.keys(this._styles)[i] || ''; }
}

const _domNodeId = { n: 0 };
class Node extends EventTarget {
  constructor() {
    super();
    this._nodeId = ++_domNodeId.n;
    this.nodeType = 1; this.nodeName = ''; this.nodeValue = null;
    this._textContent = '';
    this.childNodes = []; this.parentNode = null; this.parentElement = null;
    this.ownerDocument = null;
    this.firstChild = null; this.lastChild = null;
    this.nextSibling = null; this.previousSibling = null;
  }
  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = String(v); this.childNodes = []; this.firstChild = null; this.lastChild = null; }
  get children() { return this.childNodes.filter(n => n.nodeType === 1); }
  get firstElementChild() { return this.children[0] || null; }
  get lastElementChild() { const c = this.children; return c[c.length-1] || null; }
  get childElementCount() { return this.children.length; }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this; child.parentElement = this.nodeType === 1 ? this : null;
    child.ownerDocument = this.ownerDocument;
    if (this.childNodes.length > 0) {
      const prev = this.childNodes[this.childNodes.length-1];
      prev.nextSibling = child; child.previousSibling = prev;
    }
    this.childNodes.push(child);
    this.firstChild = this.childNodes[0]; this.lastChild = child;
    return child;
  }
  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx >= 0) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null; child.parentElement = null;
      this.firstChild = this.childNodes[0] || null;
      this.lastChild = this.childNodes[this.childNodes.length-1] || null;
    }
    return child;
  }
  insertBefore(newNode, refNode) {
    if (!refNode) return this.appendChild(newNode);
    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
    const idx = this.childNodes.indexOf(refNode);
    if (idx >= 0) { this.childNodes.splice(idx, 0, newNode); newNode.parentNode = this; }
    else this.appendChild(newNode);
    this.firstChild = this.childNodes[0] || null;
    this.lastChild = this.childNodes[this.childNodes.length-1] || null;
    return newNode;
  }
  replaceChild(newChild, oldChild) {
    const idx = this.childNodes.indexOf(oldChild);
    if (idx >= 0) {
      if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
      this.childNodes.splice(idx, 1, newChild);
      newChild.parentNode = this; oldChild.parentNode = null;
    }
    return oldChild;
  }
  cloneNode(deep) {
    const clone = new this.constructor(this.tagName || this.nodeName);
    if (this._attrs) clone._attrs = Object.assign({}, this._attrs);
    clone._textContent = this._textContent;
    if (deep) for (const c of this.childNodes) clone.appendChild(c.cloneNode(true));
    return clone;
  }
  contains(other) { let n = other; while (n) { if (n === this) return true; n = n.parentNode; } return false; }
  hasChildNodes() { return this.childNodes.length > 0; }
  normalize() {}
  get isConnected() { return false; }
  getRootNode() { let n = this; while (n.parentNode) n = n.parentNode; return n; }
  compareDocumentPosition(other) { return 0; }
  isSameNode(other) { return this === other; }
  isEqualNode(other) { return false; }
}
Node.ELEMENT_NODE = 1; Node.TEXT_NODE = 3; Node.COMMENT_NODE = 8;
Node.DOCUMENT_NODE = 9; Node.DOCUMENT_FRAGMENT_NODE = 11;

class Element extends Node {
  constructor(tagName) {
    super();
    this.tagName = (tagName || '').toUpperCase();
    this.localName = (tagName || '').toLowerCase();
    this.namespaceURI = 'http://www.w3.org/1999/xhtml';
    this.id = ''; this.className = '';
    this.classList = new DOMTokenList();
    this.style = new CSSStyleDeclaration();
    this._attrs = {};
    this.nodeType = 1; this.nodeName = this.tagName;
    this.scrollTop = 0; this.scrollLeft = 0;
    this.scrollWidth = 0; this.scrollHeight = 0;
    this.clientTop = 0; this.clientLeft = 0;
    this.clientWidth = 0; this.clientHeight = 0;
    this.offsetTop = 0; this.offsetLeft = 0;
    this.offsetWidth = 0; this.offsetHeight = 0;
    this.tabIndex = -1; this.draggable = false;
    this.hidden = false; this.dir = ''; this.lang = ''; this.title = '';
    this.slot = ''; this.part = new DOMTokenList();
    this.dataset = new Proxy({}, { get(t, k) { return t[k] || ''; }, set(t, k, v) { t[k] = v; return true; } });
  }
  get innerHTML() { return ''; }
  set innerHTML(v) { this.childNodes = []; this.firstChild = null; this.lastChild = null; }
  get outerHTML() { return '<' + this.localName + '/>'; }
  set outerHTML(v) {}
  get innerText() { return this._textContent || ''; }
  set innerText(v) { this._textContent = String(v); this.childNodes = []; }
  getAttribute(name) { return this._attrs.hasOwnProperty(name) ? this._attrs[name] : null; }
  setAttribute(name, value) {
    this._attrs[name] = String(value);
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
    if (name === 'style') this.style.cssText = value;
  }
  removeAttribute(name) { delete this._attrs[name]; }
  hasAttribute(name) { return this._attrs.hasOwnProperty(name); }
  toggleAttribute(name, force) {
    if (force === undefined) force = !this.hasAttribute(name);
    if (force) this.setAttribute(name, ''); else this.removeAttribute(name);
    return force;
  }
  getAttributeNames() { return Object.keys(this._attrs); }
  getAttributeNS(ns, name) { return this.getAttribute(name); }
  setAttributeNS(ns, name, val) { this.setAttribute(name, val); }
  hasAttributeNS(ns, name) { return this.hasAttribute(name); }
  removeAttributeNS(ns, name) { this.removeAttribute(name); }
  matches(sel) { return false; }
  closest(sel) { return null; }
  querySelector(sel) { return null; }
  querySelectorAll(sel) { return []; }
  getElementsByTagName(tag) { return []; }
  getElementsByClassName(cls) { return []; }
  getElementsByTagNameNS(ns, tag) { return []; }
  getBoundingClientRect() { return {top:0,left:0,bottom:0,right:0,width:0,height:0,x:0,y:0,toJSON(){return this;}}; }
  getClientRects() { return []; }
  scrollIntoView(opts) {}
  scroll(x, y) {} scrollTo(x, y) {} scrollBy(x, y) {}
  focus(opts) {} blur() {} click() {}
  insertAdjacentElement(pos, el) { return el; }
  insertAdjacentHTML(pos, html) {}
  insertAdjacentText(pos, text) {}
  setPointerCapture(id) {} releasePointerCapture(id) {} hasPointerCapture(id) { return false; }
  requestFullscreen() { return Promise.resolve(); }
  requestPointerLock() {}
  after(...nodes) {} before(...nodes) {}
  append(...nodes) { for (const n of nodes) { if (typeof n !== 'string') this.appendChild(n); } }
  prepend(...nodes) {}
  replaceWith(...nodes) {}
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  get offsetParent() { return null; }
  attachShadow(opts) { this._shadowRoot = new DocumentFragment(); return this._shadowRoot; }
  get shadowRoot() { return this._shadowRoot || null; }
  getAnimations() { return []; }
  animate(keyframes, opts) { return new _Animation(null, null); }
}

class HTMLElement extends Element {
  constructor(tag) {
    super(tag);
    this.value = ''; this.checked = false; this.disabled = false;
    this.readOnly = false; this.type = ''; this.name = ''; this.src = '';
    this.href = ''; this.alt = ''; this.placeholder = '';
    this.multiple = false; this.selected = false; this.options = [];
    this.form = null; this.files = null;
    this.validity = {valid:true,valueMissing:false,typeMismatch:false,tooShort:false,tooLong:false,rangeUnderflow:false,rangeOverflow:false,patternMismatch:false,badInput:false,customError:false};
    this.contentEditable = 'false';
    this.spellcheck = false; this.autocomplete = '';
    this.role = ''; this.ariaLabel = ''; this.ariaHidden = null;
    this.onload = null; this.onerror = null;
  }
  checkValidity() { return true; }
  reportValidity() { return true; }
  setCustomValidity(msg) {}
  select() {}
  setSelectionRange() {}
  getSelection() { return null; }
  setRangeText() {}
}

class SVGElement extends Element { constructor(tag) { super(tag || 'svg'); } }
class SVGSVGElement extends SVGElement {
  constructor() { super('svg'); this.viewBox = {baseVal:{x:0,y:0,width:0,height:0}}; this.width = {baseVal:{value:0}}; this.height = {baseVal:{value:0}}; }
  getBBox() { return {x:0,y:0,width:0,height:0}; }
  createSVGMatrix() { return {a:1,b:0,c:0,d:1,e:0,f:0}; }
  createSVGPoint() { return {x:0,y:0,matrixTransform(m){return this;}}; }
}

function _makeCanvasContext(type) {
  const ctx = {
    canvas: null, fillStyle: '#000', strokeStyle: '#000',
    globalAlpha: 1, lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
    miterLimit: 10, font: '10px sans-serif', textAlign: 'start',
    textBaseline: 'alphabetic', direction: 'ltr',
    shadowBlur: 0, shadowColor: 'rgba(0,0,0,0)', shadowOffsetX: 0, shadowOffsetY: 0,
    imageSmoothingEnabled: true, imageSmoothingQuality: 'low',
    globalCompositeOperation: 'source-over', filter: 'none',
    fillRect() {}, clearRect() {}, strokeRect() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, arc() {}, arcTo() {}, ellipse() {}, rect() {},
    fill() {}, stroke() {}, clip() {}, isPointInPath() { return false; }, isPointInStroke() { return false; },
    scale() {}, rotate() {}, translate() {}, transform() {}, setTransform() {}, resetTransform() {},
    getTransform() { return {a:1,b:0,c:0,d:1,e:0,f:0,invertSelf(){return this;},multiplySelf(){return this;}}; },
    save() {}, restore() {},
    createLinearGradient() { return {addColorStop(){}}; },
    createRadialGradient() { return {addColorStop(){}}; },
    createPattern() { return {}; },
    drawImage() {}, drawFocusIfNeeded() {},
    getImageData(x, y, w, h) { return {data: new Uint8ClampedArray(w*h*4), width: w, height: h}; },
    putImageData() {}, createImageData(w, h) { return {data: new Uint8ClampedArray(w*h*4), width: w, height: h}; },
    measureText(text) { return {width: text.length * 6, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2, actualBoundingBoxLeft: 0, actualBoundingBoxRight: text.length * 6, fontBoundingBoxAscent: 10, fontBoundingBoxDescent: 2, hangingBaseline: 8, alphabeticBaseline: 0, ideographicBaseline: -2}; },
    fillText() {}, strokeText() {},
    setLineDash() {}, getLineDash() { return []; }, lineDashOffset: 0,
    createConicGradient() { return {addColorStop(){}}; },
  };
  return ctx;
}

class HTMLCanvasElement extends HTMLElement {
  constructor() { super('canvas'); this.width = 300; this.height = 150; }
  getContext(type, opts) { const ctx = _makeCanvasContext(type); if (ctx) ctx.canvas = this; return ctx; }
  toDataURL(type, quality) { return 'data:image/png;base64,'; }
  toBlob(cb, type, quality) { cb(new Blob()); }
  captureStream() { return null; }
}

class TextNode extends Node {
  constructor(data) { super(); this.nodeType = 3; this.nodeName = '#text'; this.nodeValue = data; this._textContent = data; }
  get textContent() { return this.nodeValue; }
  set textContent(v) { this.nodeValue = String(v); }
}
class Comment extends Node {
  constructor(data) { super(); this.nodeType = 8; this.nodeName = '#comment'; this.nodeValue = data; }
}
class DocumentFragment extends Node {
  constructor() { super(); this.nodeType = 11; this.nodeName = '#document-fragment'; }
  querySelector(sel) { return null; }
  querySelectorAll(sel) { return []; }
  getElementById(id) { return null; }
  append(...nodes) { for (const n of nodes) { if (typeof n === 'string') this.appendChild(new TextNode(n)); else this.appendChild(n); } }
  prepend(...nodes) {}
  replaceChildren(...nodes) { this.childNodes = []; for (const n of nodes) this.append(n); }
}

class Document extends Node {
  constructor() {
    super();
    this.nodeType = 9; this.nodeName = '#document';
    this.characterSet = 'UTF-8'; this.charset = 'UTF-8';
    this.compatMode = 'CSS1Compat'; this.contentType = 'text/html';
    this.readyState = 'complete';
    this.URL = 'https://discord.com/'; this.documentURI = 'https://discord.com/';
    this.domain = 'discord.com'; this.referrer = ''; this.cookie = '';
    this.lastModified = new Date().toUTCString();
    this.hidden = false; this.visibilityState = 'visible';
    this.title = ''; this.dir = ''; this.designMode = 'off';
    this.activeElement = null;
    this.currentScript = null;
    this.ownerDocument = null;
    this.defaultView = null; // set after window is created
    this.html = this._createElement('html');
    this.head = this._createElement('head');
    this.body = this._createElement('body');
    this.html.appendChild(this.head);
    this.html.appendChild(this.body);
    this.appendChild(this.html);
    this.documentElement = this.html;
  }
  _createElement(tag) {
    const el = new HTMLElement(tag); el.ownerDocument = this; return el;
  }
  createElement(tag) {
    const t = (tag || '').toLowerCase();
    let el;
    if (t === 'canvas') el = new HTMLCanvasElement();
    else if (t === 'svg') el = new SVGSVGElement();
    else el = new HTMLElement(tag);
    el.ownerDocument = this;
    return el;
  }
  createElementNS(ns, tag) { return this.createElement(tag); }
  createTextNode(data) { const n = new TextNode(data); n.ownerDocument = this; return n; }
  createComment(data) { const n = new Comment(data); n.ownerDocument = this; return n; }
  createDocumentFragment() { const f = new DocumentFragment(); f.ownerDocument = this; return f; }
  createEvent(type) { return new Event(''); }
  createRange() {
    return {
      setStart(){}, setEnd(){}, setStartBefore(){}, setEndAfter(){},
      selectNode(){}, selectNodeContents(){}, collapse(){},
      cloneContents(){ return new DocumentFragment(); },
      deleteContents(){}, extractContents(){ return new DocumentFragment(); },
      insertNode(){}, surroundContents(){},
      getBoundingClientRect(){ return {top:0,left:0,bottom:0,right:0,width:0,height:0}; },
      getClientRects(){ return []; }, detach(){}, toString(){ return ''; },
      commonAncestorContainer: null, collapsed: true,
      startOffset: 0, endOffset: 0, startContainer: null, endContainer: null,
    };
  }
  getElementById(id) { return null; }
  querySelector(sel) { return null; }
  querySelectorAll(sel) { return []; }
  getElementsByTagName(tag) { return []; }
  getElementsByClassName(cls) { return []; }
  getElementsByName(name) { return []; }
  getElementsByTagNameNS(ns, tag) { return []; }
  importNode(node, deep) { return node.cloneNode(deep); }
  adoptNode(node) { node.ownerDocument = this; return node; }
  write(str) {} writeln(str) {} open() { return this; } close() {}
  execCommand(cmd) { return false; }
  queryCommandEnabled(cmd) { return false; }
  queryCommandSupported(cmd) { return false; }
  queryCommandState(cmd) { return false; }
  queryCommandValue(cmd) { return ''; }
  getSelection() { return null; }
  caretRangeFromPoint(x, y) { return null; }
  elementFromPoint(x, y) { return null; }
  elementsFromPoint(x, y) { return []; }
  getAnimations() { return []; }
  hasFocus() { return false; }
  get scripts() { return []; }
  get images() { return []; }
  get links() { return []; }
  get forms() { return []; }
  get embeds() { return []; }
  get plugins() { return []; }
  get anchors() { return []; }
  get styleSheets() { return {length:0, item(){ return null; }, [Symbol.iterator](){ return [][Symbol.iterator](); }}; }
  get fonts() { return {ready: Promise.resolve(), check(){ return true; }, load(){ return Promise.resolve([]); }}; }
}

// --- location / history / navigator ---
const location = {
  href: 'https://discord.com/', protocol: 'https:',
  host: 'discord.com', hostname: 'discord.com', port: '',
  pathname: '/', search: '', hash: '', origin: 'https://discord.com',
  assign(url) {}, replace(url) {}, reload() {},
  toString() { return this.href; },
};

const history = {
  length: 1, state: null, scrollRestoration: 'auto',
  pushState(state, title, url) { if (url) location.href = url; },
  replaceState(state, title, url) { if (url) location.href = url; },
  go(delta) {}, back() {}, forward() {},
};

const navigator = {
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  platform: 'Linux x86_64', language: 'en-US', languages: ['en-US', 'en'],
  onLine: true, cookieEnabled: true, doNotTrack: null, maxTouchPoints: 0,
  hardwareConcurrency: 4, deviceMemory: 4,
  vendor: 'Google Inc.', vendorSub: '', product: 'Gecko', productSub: '20030107',
  appName: 'Netscape', appCodeName: 'Mozilla', appVersion: '5.0',
  geolocation: null,
  permissions: { query() { return Promise.resolve({state:'denied', onchange:null}); } },
  mediaDevices: {
    getUserMedia() { return Promise.reject(new Error('Not supported')); },
    enumerateDevices() { return Promise.resolve([]); },
    getDisplayMedia() { return Promise.reject(new Error('Not supported')); },
    addEventListener() {}, removeEventListener() {},
  },
  clipboard: { readText() { return Promise.resolve(''); }, writeText() { return Promise.resolve(); }, read() { return Promise.resolve([]); }, write() { return Promise.resolve(); } },
  serviceWorker: {
    register() { return Promise.reject(new Error('Not supported')); },
    get ready() { return new Promise(() => {}); }, // never resolves, never rejects
    getRegistrations() { return Promise.resolve([]); },
    getRegistration() { return Promise.resolve(undefined); },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
    controller: null,
  },
  sendBeacon(url, data) { return false; },
  vibrate(pattern) { return false; },
  connection: { type: 'wifi', effectiveType: '4g', downlink: 10, rtt: 50, saveData: false, addEventListener() {}, removeEventListener() {} },
  storage: { estimate() { return Promise.resolve({quota: 0, usage: 0}); } },
  userAgentData: { brands: [{brand:'Chrome', version:'120'}], mobile: false, platform: 'Linux', getHighEntropyValues() { return Promise.resolve({}); } },
  mimeTypes: { length: 0, item() { return null; } },
  plugins: { length: 0, item() { return null; }, refresh() {} },
};

const screen = {
  width: 1920, height: 1080, availWidth: 1920, availHeight: 1080,
  colorDepth: 24, pixelDepth: 24,
  orientation: { type: 'landscape-primary', angle: 0, lock() { return Promise.resolve(); }, unlock() {}, addEventListener() {}, removeEventListener() {} },
};

// --- Extra classes defined before Object.assign ---
class _DOMException extends Error {
  constructor(msg, name) { super(msg); this.name = name || 'Error'; this.code = 0; }
}

class _AbortController {
  constructor() {
    this.signal = { aborted: false, reason: undefined, throwIfAborted() { if (this.aborted) throw this.reason; }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } };
  }
  abort(reason) {
    this.signal.aborted = true;
    this.signal.reason = reason || new _DOMException('Aborted', 'AbortError');
  }
}

class _TextEncoder {
  constructor() { this.encoding = 'utf-8'; }
  encode(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0|(c>>6), 0x80|(c&0x3f));
      else if (c < 0xd800 || c >= 0xe000) bytes.push(0xe0|(c>>12), 0x80|((c>>6)&0x3f), 0x80|(c&0x3f));
      else {
        const next = str.charCodeAt(++i);
        const cp = ((c-0xd800)<<10)+(next-0xdc00)+0x10000;
        bytes.push(0xf0|(cp>>18), 0x80|((cp>>12)&0x3f), 0x80|((cp>>6)&0x3f), 0x80|(cp&0x3f));
      }
    }
    return new Uint8Array(bytes);
  }
  encodeInto(str, arr) { const e = this.encode(str); arr.set(e); return {read: str.length, written: e.length}; }
}

class _TextDecoder {
  constructor(encoding, opts) {
    this.encoding = encoding || 'utf-8';
    this.fatal = !!(opts && opts.fatal);
    this.ignoreBOM = !!(opts && opts.ignoreBOM);
  }
  decode(buf, opts) {
    if (!buf) return '';
    const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf.buffer || buf);
    let s = '';
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      if (b < 0x80) s += String.fromCharCode(b);
      else if ((b & 0xe0) === 0xc0 && i+1 < arr.length) s += String.fromCharCode(((b&0x1f)<<6)|(arr[++i]&0x3f));
      else if ((b & 0xf0) === 0xe0 && i+2 < arr.length) s += String.fromCharCode(((b&0x0f)<<12)|((arr[++i]&0x3f)<<6)|(arr[++i]&0x3f));
      else if ((b & 0xf8) === 0xf0 && i+3 < arr.length) {
        const cp = ((b&0x07)<<18)|((arr[++i]&0x3f)<<12)|((arr[++i]&0x3f)<<6)|(arr[++i]&0x3f);
        s += String.fromCodePoint(cp);
      } else s += String.fromCharCode(b);
    }
    return s;
  }
}

class _Image extends HTMLElement {
  constructor(w, h) {
    super('img');
    this.width = w||0; this.height = h||0;
    this.naturalWidth = w||0; this.naturalHeight = h||0;
    this.complete = true; this.currentSrc = ''; this.src = '';
  }
}
class _Audio extends HTMLElement {
  constructor(src) {
    super('audio');
    this.src = src||''; this.currentTime = 0; this.duration = 0;
    this.paused = true; this.muted = false; this.volume = 1;
    this.playbackRate = 1; this.ended = false; this.autoplay = false; this.loop = false;
    this.readyState = 0; this.networkState = 0;
    this.buffered = {length: 0, start(){return 0;}, end(){return 0;}};
    this.played = {length: 0, start(){return 0;}, end(){return 0;}};
    this.seekable = {length: 0, start(){return 0;}, end(){return 0;}};
    this.error = null; this.preload = 'auto';
  }
  play() { return Promise.resolve(); }
  pause() {}
  load() {}
  canPlayType(type) { return ''; }
  fastSeek(time) { this.currentTime = time; }
  addTextTrack() { return {}; }
}
class _Video extends HTMLElement {
  constructor() {
    super('video');
    this.src = ''; this.currentTime = 0; this.duration = 0;
    this.paused = true; this.muted = false; this.volume = 1;
    this.videoWidth = 0; this.videoHeight = 0;
    this.playbackRate = 1; this.ended = false; this.loop = false;
    this.readyState = 0; this.networkState = 0;
    this.poster = ''; this.controls = false;
    this.buffered = {length: 0, start(){return 0;}, end(){return 0;}};
    this.error = null; this.preload = 'auto';
  }
  play() { return Promise.resolve(); }
  pause() {}
  load() {}
  canPlayType(type) { return ''; }
  getVideoPlaybackQuality() { return {totalVideoFrames:0,droppedVideoFrames:0,corruptedVideoFrames:0,totalFrameDelay:0}; }
  requestVideoFrameCallback(cb) { return 0; }
  cancelVideoFrameCallback(id) {}
}
class _OffscreenCanvas {
  constructor(w, h) { this.width = w; this.height = h; }
  getContext(type, opts) { return _makeCanvasContext(type); }
  convertToBlob() { return Promise.resolve(new Blob()); }
  transferToImageBitmap() { return null; }
}
class _ImageData {
  constructor(dataOrWidth, heightOrWidth, height) {
    if (dataOrWidth instanceof Uint8ClampedArray) {
      this.data = dataOrWidth; this.width = heightOrWidth;
      this.height = height || dataOrWidth.length / 4 / heightOrWidth;
    } else {
      this.width = dataOrWidth; this.height = heightOrWidth;
      this.data = new Uint8ClampedArray(dataOrWidth * heightOrWidth * 4);
    }
    this.colorSpace = 'srgb';
  }
}
class _ImageBitmap { constructor() { this.width = 0; this.height = 0; } close() {} }
class _Path2D {
  constructor(path) {}
  addPath() {} closePath() {} moveTo() {} lineTo() {}
  bezierCurveTo() {} quadraticCurveTo() {} arc() {} arcTo() {} ellipse() {} rect() {}
}
class _MessageChannel {
  constructor() {
    this.port1 = { postMessage() {}, onmessage: null, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, start() {}, close() {} };
    this.port2 = { postMessage() {}, onmessage: null, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, start() {}, close() {} };
  }
}
class _MessagePort extends EventTarget { postMessage() {} start() {} close() {} }
class _BroadcastChannel extends EventTarget {
  constructor(name) { super(); this.name = name; this.onmessage = null; this.onmessageerror = null; }
  postMessage(msg) {} close() {}
}
class _MouseEvent extends Event {
  constructor(type, init) {
    super(type, init);
    const i = init || {};
    this.button = i.button||0; this.buttons = i.buttons||0;
    this.clientX = i.clientX||0; this.clientY = i.clientY||0;
    this.screenX = i.screenX||0; this.screenY = i.screenY||0;
    this.pageX = i.pageX||0; this.pageY = i.pageY||0;
    this.offsetX = i.offsetX||0; this.offsetY = i.offsetY||0;
    this.movementX = i.movementX||0; this.movementY = i.movementY||0;
    this.altKey = i.altKey||false; this.ctrlKey = i.ctrlKey||false;
    this.metaKey = i.metaKey||false; this.shiftKey = i.shiftKey||false;
    this.relatedTarget = i.relatedTarget||null;
  }
  getModifierState(key) { return false; }
}
class _WheelEvent extends _MouseEvent {
  constructor(type, init) {
    super(type, init);
    const i = init || {};
    this.deltaX = i.deltaX||0; this.deltaY = i.deltaY||0;
    this.deltaZ = i.deltaZ||0; this.deltaMode = i.deltaMode||0;
  }
}
class _PointerEvent extends _MouseEvent {
  constructor(type, init) {
    super(type, init);
    const i = init || {};
    this.pointerId = i.pointerId||0; this.width = i.width||1; this.height = i.height||1;
    this.pressure = i.pressure||0; this.tangentialPressure = i.tangentialPressure||0;
    this.tiltX = i.tiltX||0; this.tiltY = i.tiltY||0; this.twist = i.twist||0;
    this.pointerType = i.pointerType||'mouse'; this.isPrimary = i.isPrimary !== undefined ? i.isPrimary : true;
  }
  getCoalescedEvents() { return []; }
  getPredictedEvents() { return []; }
}
class _KeyboardEvent extends Event {
  constructor(type, init) {
    super(type, init);
    const i = init || {};
    this.key = i.key||''; this.code = i.code||''; this.location = i.location||0;
    this.repeat = i.repeat||false; this.isComposing = i.isComposing||false;
    this.altKey = i.altKey||false; this.ctrlKey = i.ctrlKey||false;
    this.metaKey = i.metaKey||false; this.shiftKey = i.shiftKey||false;
    this.charCode = i.charCode||0; this.keyCode = i.keyCode||0; this.which = i.which||0;
  }
  getModifierState(key) { return false; }
}
class _FocusEvent extends Event {
  constructor(type, init) { super(type, init); this.relatedTarget = (init && init.relatedTarget) || null; }
}
class _InputEvent extends Event {
  constructor(type, init) {
    super(type, init);
    this.data = (init && init.data) || '';
    this.inputType = (init && init.inputType) || '';
    this.dataTransfer = null; this.isComposing = false;
  }
  getTargetRanges() { return []; }
}
class _CompositionEvent extends Event {
  constructor(type, init) { super(type, init); this.data = (init && init.data) || ''; }
}
class _HashChangeEvent extends Event {
  constructor(type, init) { super(type, init); this.oldURL = (init && init.oldURL) || ''; this.newURL = (init && init.newURL) || ''; }
}
class _PopStateEvent extends Event {
  constructor(type, init) { super(type, init); this.state = (init && init.state) || null; }
}
class _StorageEvent extends Event {
  constructor(type, init) { super(type, init); this.key = null; this.newValue = null; this.oldValue = null; this.storageArea = null; this.url = ''; }
}
class _TouchEvent extends Event {
  constructor(type, init) { super(type, init); this.touches = []; this.changedTouches = []; this.targetTouches = []; this.altKey = false; this.ctrlKey = false; this.metaKey = false; this.shiftKey = false; }
}
class _Touch {
  constructor(init) { Object.assign(this, {identifier:0,target:null,clientX:0,clientY:0,screenX:0,screenY:0,pageX:0,pageY:0,radiusX:0,radiusY:0,rotationAngle:0,force:0}, init); }
}
class _MediaStream extends EventTarget {
  constructor(tracks) { super(); this.id = crypto.randomUUID(); this.active = false; this._tracks = tracks||[]; this.onaddtrack = null; this.onremovetrack = null; }
  getTracks() { return this._tracks; }
  getVideoTracks() { return []; }
  getAudioTracks() { return []; }
  addTrack() {} removeTrack() {}
  clone() { return new _MediaStream(); }
}
class _ClipboardItem {
  constructor(items) { this._items = items; }
  getType(type) { return Promise.resolve(new Blob()); }
  get types() { return Object.keys(this._items); }
}
class _Notification extends EventTarget {
  constructor(title, opts) { super(); this.title = title; this.body = (opts && opts.body) || ''; this.onclick = null; this.onclose = null; this.onshow = null; this.onerror = null; this.tag = (opts && opts.tag) || ''; this.icon = (opts && opts.icon) || ''; }
  close() {}
  static get permission() { return 'denied'; }
  static requestPermission() { return Promise.resolve('denied'); }
}
class _Animation extends EventTarget {
  constructor(effect, timeline) { super(); this.playState = 'idle'; this.currentTime = null; this.startTime = null; this.effect = effect||null; this.ready = Promise.resolve(this); this.finished = Promise.resolve(this); this.onfinish = null; this.oncancel = null; this.onremove = null; this.id = ''; this.pending = false; this.replaceState = 'active'; this.timeline = timeline||null; this.playbackRate = 1; }
  play() { this.playState = 'running'; }
  pause() { this.playState = 'paused'; }
  cancel() { this.playState = 'idle'; }
  finish() { this.playState = 'finished'; }
  reverse() {}
  commitStyles() {}
  persist() {}
  updatePlaybackRate(r) { this.playbackRate = r; }
}
class _KeyframeEffect {
  constructor(target, keyframes, opts) { this.target = target; this.pseudoElement = null; this.composite = 'replace'; this.iterationComposite = 'replace'; this._keyframes = keyframes; this.timing = opts||{}; }
  getKeyframes() { return this._keyframes||[]; }
  setKeyframes(kf) { this._keyframes = kf; }
  getTiming() { return this.timing; }
  getComputedTiming() { return Object.assign({}, this.timing, {progress:0,currentIteration:0,localTime:null,endTime:0,activeDuration:0}); }
  updateTiming(t) { Object.assign(this.timing, t); }
}
class _AudioContext {
  constructor(opts) { this.sampleRate = (opts && opts.sampleRate)||44100; this.state = 'running'; this.currentTime = 0; this.destination = {channelCount:2,maxChannelCount:32,connect(){},disconnect(){}}; this.listener = {positionX:{value:0},positionY:{value:0},positionZ:{value:0},forwardX:{value:0},forwardY:{value:0},forwardZ:{value:-1},upX:{value:0},upY:{value:1},upZ:{value:0},setPosition(){},setOrientation(){}}; this.onstatechange = null; }
  createGain() { return {gain:{value:1,setValueAtTime(){return this;},linearRampToValueAtTime(){return this;},exponentialRampToValueAtTime(){return this;},setTargetAtTime(){return this;},cancelScheduledValues(){return this;}},connect(){return this;},disconnect(){},channelCount:2}; }
  createOscillator() { return {frequency:{value:440},detune:{value:0},type:'sine',start(){},stop(){},connect(){return this;},disconnect(){}}; }
  createAnalyser() { return {fftSize:2048,frequencyBinCount:1024,minDecibels:-100,maxDecibels:-30,smoothingTimeConstant:0.8,getByteFrequencyData(){},getByteTimeDomainData(){},getFloatFrequencyData(){},getFloatTimeDomainData(){},connect(){return this;},disconnect(){}}; }
  createBufferSource() { return {buffer:null,loop:false,loopStart:0,loopEnd:0,playbackRate:{value:1},detune:{value:0},start(){},stop(){},connect(){return this;},disconnect(){},onended:null}; }
  createBuffer(ch, len, sr) { return {numberOfChannels:ch,length:len,sampleRate:sr,duration:len/sr,getChannelData(i){return new Float32Array(len);},copyFromChannel(){},copyToChannel(){}}; }
  createDynamicsCompressor() { return {threshold:{value:-24},knee:{value:30},ratio:{value:12},attack:{value:0.003},release:{value:0.25},reduction:0,connect(){return this;},disconnect(){}}; }
  createBiquadFilter() { return {type:'lowpass',frequency:{value:350},detune:{value:0},Q:{value:1},gain:{value:0},connect(){return this;},disconnect(){},getFrequencyResponse(){}}; }
  createStereoPanner() { return {pan:{value:0},connect(){return this;},disconnect(){}}; }
  createConvolver() { return {buffer:null,normalize:true,connect(){return this;},disconnect(){}}; }
  createDelay(maxDelay) { return {delayTime:{value:0},connect(){return this;},disconnect(){}}; }
  createMediaStreamSource() { return {connect(){return this;},disconnect(){}}; }
  createMediaElementSource(el) { return {connect(){return this;},disconnect(){}}; }
  decodeAudioData(buf) { return Promise.resolve(this.createBuffer(1, 0, this.sampleRate)); }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
class _RTCPeerConnection extends EventTarget {
  constructor(cfg) { super(); this.localDescription = null; this.remoteDescription = null; this.signalingState = 'closed'; this.iceConnectionState = 'closed'; this.iceGatheringState = 'new'; this.connectionState = 'closed'; this.onnegotiationneeded = null; this.onicecandidate = null; this.oniceconnectionstatechange = null; this.onicegatheringstatechange = null; this.onconnectionstatechange = null; this.ondatachannel = null; this.ontrack = null; }
  createOffer() { return Promise.resolve({type:'offer',sdp:''}); }
  createAnswer() { return Promise.resolve({type:'answer',sdp:''}); }
  setLocalDescription(desc) { return Promise.resolve(); }
  setRemoteDescription(desc) { return Promise.resolve(); }
  addIceCandidate(c) { return Promise.resolve(); }
  addTrack() { return {track:null,streams:[],sender:{track:null,replaceTrack(){return Promise.resolve();},getParameters(){return {};},setParameters(){return Promise.resolve();}}}; }
  removeTrack() {}
  createDataChannel(label, opts) { return new _RTCDataChannel(label); }
  getStats() { return Promise.resolve(new Map()); }
  close() {}
  getSenders() { return []; }
  getReceivers() { return []; }
  getTransceivers() { return []; }
  addTransceiver() { return {sender:{track:null},receiver:{track:null},direction:'sendrecv',currentDirection:null,mid:null}; }
  static generateCertificate() { return Promise.resolve({}); }
}
class _RTCDataChannel extends EventTarget {
  constructor(label) { super(); this.label = label; this.readyState = 'closed'; this.bufferedAmount = 0; this.bufferedAmountLowThreshold = 0; this.ordered = true; this.maxRetransmits = null; this.maxPacketLifeTime = null; this.negotiated = false; this.id = null; this.protocol = ''; this.binaryType = 'blob'; this.onopen = null; this.onclose = null; this.onmessage = null; this.onerror = null; this.onbufferedamountlow = null; }
  send() {} close() {}
}
class _RTCSessionDescription { constructor(init) { this.type = (init && init.type) || 'offer'; this.sdp = (init && init.sdp) || ''; } toJSON() { return {type:this.type,sdp:this.sdp}; } }
class _RTCIceCandidate { constructor(init) { Object.assign(this, {candidate:'',sdpMid:null,sdpMLineIndex:null,foundation:null,component:null,priority:null,address:null,protocol:null,port:null,type:null,tcpType:null,relatedAddress:null,relatedPort:null,usernameFragment:null}, init); } toJSON() { return {candidate:this.candidate,sdpMid:this.sdpMid,sdpMLineIndex:this.sdpMLineIndex}; } }

// --- document instance ---
const document = new Document();

// --- Make globalThis an EventTarget (window is an EventTarget in browsers) ---
const _globalET = new EventTarget();
globalThis.addEventListener = _globalET.addEventListener.bind(_globalET);
globalThis.removeEventListener = _globalET.removeEventListener.bind(_globalET);
globalThis.dispatchEvent = _globalET.dispatchEvent.bind(_globalET);

// --- Assign everything to globalThis ---
Object.assign(globalThis, {
  window: globalThis,
  self: globalThis,
  document,
  location,
  history,
  navigator,
  screen,
  crypto,
  performance,
  localStorage,
  sessionStorage,
  URL,
  URLSearchParams,
  Blob,
  File,
  FileReader,
  FormData,
  fetch,
  XMLHttpRequest,
  WebSocket,
  Worker,
  MutationObserver,
  IntersectionObserver,
  ResizeObserver,
  Event,
  CustomEvent,
  EventTarget,
  Node,
  Element,
  HTMLElement,
  SVGElement,
  SVGSVGElement,
  HTMLCanvasElement,
  DocumentFragment,
  Document,
  TextNode,
  Comment,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  requestAnimationFrame,
  cancelAnimationFrame,
  queueMicrotask,
  // Dimensions
  innerWidth: 1920, innerHeight: 1080,
  outerWidth: 1920, outerHeight: 1080,
  devicePixelRatio: 1,
  pageXOffset: 0, pageYOffset: 0,
  scrollX: 0, scrollY: 0,
  screenX: 0, screenY: 0,
  // Window methods
  scrollTo() {}, scrollBy() {}, scroll() {},
  open(url, name, features) { return null; },
  close() {}, focus() {}, blur() {},
  alert(msg) { console.log('alert:', msg); },
  confirm(msg) { return false; },
  prompt(msg, def) { return null; },
  print() {},
  getComputedStyle(el, pseudo) {
    if (!el) return new Proxy({}, {get(t,k){return typeof k==='string'?'':undefined;},set(t,k,v){t[k]=v;return true;}});
    return new Proxy(el.style || {}, {
      get(t, k) { if (k in t && typeof t[k] === 'function') return t[k].bind(t); if (typeof k === 'string') return (t._styles && t._styles[k]) || ''; return undefined; },
      set(t, k, v) { if (t._styles) t._styles[k] = v; return true; }
    });
  },
  matchMedia(query) {
    return { matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } };
  },
  resizeTo() {}, resizeBy() {}, moveTo() {}, moveBy() {}, stop() {},
  getSelection() { return null; },
  frames: [], length: 0, name: '', status: '',
  frameElement: null, parent: globalThis, top: globalThis, opener: null, closed: false,
  postMessage(msg, target, transfer) {},
  isSecureContext: true, crossOriginIsolated: false,
  origin: 'https://discord.com',
  // CSS & Custom Elements
  CSS: { supports() { return false; }, escape(s) { return s; } },
  customElements: { define() {}, get() { return undefined; }, whenDefined() { return Promise.resolve(); }, upgrade() {} },
  // Encoding
  atob(s) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    s = s.replace(/\s/g, '');
    let out = '', i = 0;
    while (i < s.length) {
      const a = chars.indexOf(s[i++]), b = chars.indexOf(s[i++]);
      const c = chars.indexOf(s[i++]), d = chars.indexOf(s[i++]);
      out += String.fromCharCode((a<<2)|(b>>4));
      if (c !== 64) out += String.fromCharCode(((b&0xf)<<4)|(c>>2));
      if (d !== 64) out += String.fromCharCode(((c&3)<<6)|d);
    }
    return out;
  },
  btoa(s) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '', i = 0;
    while (i < s.length) {
      const a = s.charCodeAt(i++), b = s.charCodeAt(i++), c = s.charCodeAt(i++);
      out += chars[a>>2] + chars[((a&3)<<4)|(b>>4)];
      out += isNaN(b) ? '=' : chars[((b&0xf)<<2)|(c>>6)];
      out += isNaN(c) ? '=' : chars[c&0x3f];
    }
    return out;
  },
  createImageBitmap(source) { return Promise.resolve(new _ImageBitmap()); },
  Image: _Image,
  Audio: _Audio,
  Video: _Video,
  HTMLVideoElement: _Video,
  HTMLAudioElement: _Audio,
  HTMLImageElement: _Image,
  OffscreenCanvas: _OffscreenCanvas,
  ImageData: _ImageData,
  ImageBitmap: _ImageBitmap,
  Path2D: _Path2D,
  TextEncoder: _TextEncoder,
  TextDecoder: _TextDecoder,
  AbortController: _AbortController,
  AbortSignal: {
    abort(reason) { const c = new _AbortController(); c.abort(reason); return c.signal; },
    timeout(ms) { const c = new _AbortController(); setTimeout(() => c.abort(new _DOMException('Timeout', 'TimeoutError')), ms); return c.signal; }
  },
  DOMException: _DOMException,
  MessageChannel: _MessageChannel,
  MessagePort: _MessagePort,
  BroadcastChannel: _BroadcastChannel,
  TouchEvent: _TouchEvent,
  Touch: _Touch,
  PointerEvent: _PointerEvent,
  MouseEvent: _MouseEvent,
  KeyboardEvent: _KeyboardEvent,
  WheelEvent: _WheelEvent,
  FocusEvent: _FocusEvent,
  InputEvent: _InputEvent,
  CompositionEvent: _CompositionEvent,
  HashChangeEvent: _HashChangeEvent,
  PopStateEvent: _PopStateEvent,
  StorageEvent: _StorageEvent,
  UIEvent: Event,
  MediaStream: _MediaStream,
  ClipboardItem: _ClipboardItem,
  Notification: _Notification,
  trustedTypes: null,
  caches: {
    open() { return Promise.reject(new Error('Not supported')); },
    match() { return Promise.resolve(null); },
    has() { return Promise.resolve(false); },
    keys() { return Promise.resolve([]); },
    delete() { return Promise.resolve(false); }
  },
  indexedDB: {
    open(name, version) {
      const req = { result: null, error: null, readyState: 'done', onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null, transaction: null };
      setTimeout(() => { if (req.onerror) req.onerror({target: req}); });
      return req;
    },
    deleteDatabase(name) { return { onsuccess: null, onerror: null }; },
    cmp() { return 0; },
  },
  IDBKeyRange: {
    only(v) { return {lower:v,upper:v,lowerOpen:false,upperOpen:false}; },
    lowerBound(v, open) { return {lower:v,lowerOpen:!!open}; },
    upperBound(v, open) { return {upper:v,upperOpen:!!open}; },
    bound(lo, hi, loOpen, hiOpen) { return {lower:lo,upper:hi,lowerOpen:!!loOpen,upperOpen:!!hiOpen}; },
  },
  Animation: _Animation,
  KeyframeEffect: _KeyframeEffect,
  AudioContext: _AudioContext,
  webkitAudioContext: _AudioContext,
  RTCPeerConnection: _RTCPeerConnection,
  webkitRTCPeerConnection: _RTCPeerConnection,
  RTCDataChannel: _RTCDataChannel,
  RTCSessionDescription: _RTCSessionDescription,
  RTCIceCandidate: _RTCIceCandidate,
  // Misc
  VisualViewport: class VisualViewport extends EventTarget {
    constructor() { super(); this.width = 1920; this.height = 1080; this.scale = 1; this.offsetLeft = 0; this.offsetTop = 0; this.pageLeft = 0; this.pageTop = 0; this.onresize = null; this.onscroll = null; }
  },
  FontFace: class FontFace {
    constructor(family, source, descriptors) { this.family = family; this.status = 'loaded'; this.loaded = Promise.resolve(this); }
    load() { return Promise.resolve(this); }
  },
  Headers: class Headers {
    constructor(init) { this._h = {}; if (init) for (const [k,v] of Object.entries(init)) this._h[k.toLowerCase()] = v; }
    get(k) { return this._h[k.toLowerCase()] || null; }
    set(k, v) { this._h[k.toLowerCase()] = v; }
    has(k) { return k.toLowerCase() in this._h; }
    append(k, v) { this._h[k.toLowerCase()] = v; }
    delete(k) { delete this._h[k.toLowerCase()]; }
    forEach(fn) { for (const [k,v] of Object.entries(this._h)) fn(v, k, this); }
    entries() { return Object.entries(this._h)[Symbol.iterator](); }
    keys() { return Object.keys(this._h)[Symbol.iterator](); }
    values() { return Object.values(this._h)[Symbol.iterator](); }
    [Symbol.iterator]() { return this.entries(); }
  },
  Request: class Request {
    constructor(input, init) { this.url = typeof input === 'string' ? input : input.url; init = init||{}; this.method = init.method||'GET'; this.headers = new globalThis.Headers(init.headers); this.body = init.body||null; this.mode = init.mode||'cors'; this.credentials = init.credentials||'same-origin'; this.cache = init.cache||'default'; this.redirect = init.redirect||'follow'; this.signal = (init.signal)||(new _AbortController().signal); }
    json() { return Promise.resolve(null); }
    text() { return Promise.resolve(''); }
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
    clone() { return this; }
  },
  Response: class Response {
    constructor(body, init) { init = init||{}; this.status = init.status||200; this.statusText = init.statusText||'OK'; this.ok = this.status >= 200 && this.status < 300; this.headers = new globalThis.Headers(init.headers); this.url = ''; this.body = null; this.redirected = false; this.type = 'default'; }
    json() { return Promise.resolve(null); }
    text() { return Promise.resolve(''); }
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
    blob() { return Promise.resolve(new Blob()); }
    clone() { return this; }
    static error() { return new globalThis.Response(null, {status:0}); }
    static redirect(url, status) { return new globalThis.Response(null, {status: status||302}); }
  },
  EventSource: class EventSource extends EventTarget {
    constructor(url, opts) { super(); this.url = url; this.readyState = 2; this.withCredentials = false; this.onopen = null; this.onmessage = null; this.onerror = null; }
    close() {}
  },
  MIDIAccess: class MIDIAccess extends EventTarget { constructor() { super(); this.inputs = new Map(); this.outputs = new Map(); this.sysexEnabled = false; this.onstatechange = null; } },
  GamepadEvent: class GamepadEvent extends Event { constructor(type, init) { super(type, init); this.gamepad = (init && init.gamepad) || null; } },
  MediaQueryList: class MediaQueryList extends EventTarget {
    constructor(query) { super(); this.media = query; this.matches = false; this.onchange = null; }
    addListener(fn) { this.addEventListener('change', fn); }
    removeListener(fn) { this.removeEventListener('change', fn); }
  },
  XPathResult: { ANY_TYPE: 0, NUMBER_TYPE: 1, STRING_TYPE: 2, BOOLEAN_TYPE: 3, UNORDERED_NODE_ITERATOR_TYPE: 4, ORDERED_NODE_ITERATOR_TYPE: 5, UNORDERED_NODE_SNAPSHOT_TYPE: 6, ORDERED_NODE_SNAPSHOT_TYPE: 7, ANY_UNORDERED_NODE_TYPE: 8, FIRST_ORDERED_NODE_TYPE: 9 },
  Symbol: Symbol,
  Promise: Promise,
});

// Set document.defaultView after window is set up
document.defaultView = globalThis;

// --- WebAssembly stub ---
// Return a never-settling promise so the rejection check is never triggered.
// LibJS checks synchronously on rejection, so any rejected promise causes
// warnings before the caller's .catch() can be attached.
const _wasmPending = () => new Promise(() => {});
globalThis.WebAssembly = {
  compile(buf) { return _wasmPending(); },
  compileStreaming(resp) { return _wasmPending(); },
  instantiate(buf, imports) { return _wasmPending(); },
  instantiateStreaming(resp, imports) { return _wasmPending(); },
  validate(buf) { return false; },
  Module: class Module { constructor(buf) { throw new Error('WebAssembly not supported'); } },
  Instance: class Instance { constructor(mod, imports) { throw new Error('WebAssembly not supported'); } },
  Memory: class Memory { constructor(desc) { this.buffer = new ArrayBuffer((desc && desc.initial || 1) * 65536); } grow(delta) { return 0; } },
  Table: class Table { constructor(desc) { this.length = desc.initial || 0; } get(i) { return null; } set(i, v) {} grow(delta) { return this.length; } },
  Global: class Global { constructor(desc, val) { this.value = val; } valueOf() { return this.value; } },
  Tag: class Tag { constructor(type) {} },
  Exception: class Exception { constructor(tag, vals) {} },
  CompileError: class CompileError extends Error {},
  LinkError: class LinkError extends Error {},
  RuntimeError: class RuntimeError extends Error {},
};

// --- Meta/Instagram module system stub ---
globalThis.__d = function(name, deps, factory, id) {};

// --- Google Docs stubs ---
globalThis.DOCS_timing = { cjes: Date.now() };
globalThis.KX_preloadModulesInCorePre = function() {};

// --- VS Code stubs ---
globalThis._VSCODE_NLS_MESSAGES = new Proxy([], { get(t, k) { return typeof k === 'string' && /^\d+$/.test(k) ? '' : t[k]; } });
globalThis._VSCODE_FILE_ROOT = 'https://vscode.dev/';

// --- Discord-specific globals ---
globalThis.__OVERLAY__ = false;
globalThis.__SENTRY__ = { hub: { captureException() {}, captureMessage() {}, addBreadcrumb() {}, withScope(fn) { fn({setTag(){},setExtra(){},setLevel(){},setUser(){},setContext(){},addBreadcrumb(){}}); }, configureScope(fn) { fn({setTag(){},setExtra(){},setLevel(){},setUser(){},setContext(){},addBreadcrumb(){}}); }, getClient() { return null; } } };
globalThis.__SENTRY_DEBUG__ = false;
globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true, supportsFiber: true, inject() {}, onCommitFiberRoot() {}, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {} };
globalThis.__REDUX_DEVTOOLS_EXTENSION__ = undefined;
globalThis.__REACT_DND_CONTEXT_INSTANCE__ = undefined;

globalThis.GLOBAL_ENV = {
  RELEASE_CHANNEL: 'stable',
  API_ENDPOINT: '//discord.com/api',
  API_VERSION: 9,
  GATEWAY_ENDPOINT: 'wss://gateway.discord.gg',
  CDN_HOST: 'cdn.discordapp.com',
  ASSET_ENDPOINT: 'https://discord.com',
  MEDIA_PROXY_ENDPOINT: 'https://media.discordapp.net',
  STATIC_ENDPOINT: 'https://discordapp.com',
  WEBAPP_ENDPOINT: 'https://discord.com',
  MARKETING_ENDPOINT: '//discord.com',
  DEVELOPERS_ENDPOINT: 'https://discord.com',
  PUBLIC_PATH: '/',
  INVITE_HOST: 'discord.gg',
  GIFT_CODE_HOST: 'discord.gift',
  GUILD_TEMPLATE_HOST: 'discord.new',
  ACTIVITY_APPLICATION_HOST: 'discordsays.com',
  WIDGET_ENDPOINT: '//discord.com/widget',
  NETWORKING_ENDPOINT: 'https://router.discordapp.net',
  RTC_LATENCY_ENDPOINT: '//latency.discord.media/rtc',
  REMOTE_AUTH_ENDPOINT: 'wss://remote-auth-gateway.discord.gg',
  IMAGE_PROXY_ENDPOINTS: 'https://images-ext-1.discordapp.net https://images-ext-2.discordapp.net',
  MUX_ENV_KEY: '',
  WEBAUTHN_ORIGIN: 'https://discord.com',
  NATIVE_WEBSOCKET_ORIGIN: null,
  MIGRATION_SOURCE_ORIGIN: null,
  MIGRATION_DESTINATION_ORIGIN: null,
  PROJECT_ENV: 'production',
  STRIPE_KEY: '',
  BRAINTREE_KEY: '',
  ADYEN_KEY: '',
};
