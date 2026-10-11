// Speedometer 3 "Editor-CodeMirror" Highlight step: the Lezer LR parser (@lezer/common,
// @lezer/lr) with the @lezer/javascript grammar parses the editor's document (react-dom
// development source) and @lezer/highlight walks the tree assigning highlight classes.
// All library code is copied verbatim from the SP3 CodeMirror bundle.
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
// ---- begin verbatim copy of Speedometer SP3:editors/dist/assets/codemirror-521de7ab.js lines 12101-14009 ----
const DefaultBufferLength = 1024;
let nextPropID = 0;
class Range2 {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }
}
class NodeProp {
  /// Create a new node prop type.
  constructor(config2 = {}) {
    this.id = nextPropID++;
    this.perNode = !!config2.perNode;
    this.deserialize = config2.deserialize || (() => {
      throw new Error("This node type doesn't define a deserialize function");
    });
  }
  /// This is meant to be used with
  /// [`NodeSet.extend`](#common.NodeSet.extend) or
  /// [`LRParser.configure`](#lr.ParserConfig.props) to compute
  /// prop values for each node type in the set. Takes a [match
  /// object](#common.NodeType^match) or function that returns undefined
  /// if the node type doesn't get this prop, and the prop's value if
  /// it does.
  add(match) {
    if (this.perNode)
      throw new RangeError("Can't add per-node props to node types");
    if (typeof match != "function")
      match = NodeType.match(match);
    return (type) => {
      let result = match(type);
      return result === void 0 ? null : [this, result];
    };
  }
}
NodeProp.closedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.openedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.group = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.contextHash = new NodeProp({ perNode: true });
NodeProp.lookAhead = new NodeProp({ perNode: true });
NodeProp.mounted = new NodeProp({ perNode: true });
const noProps = /* @__PURE__ */ Object.create(null);
class NodeType {
  /// @internal
  constructor(name2, props, id2, flags = 0) {
    this.name = name2;
    this.props = props;
    this.id = id2;
    this.flags = flags;
  }
  /// Define a node type.
  static define(spec) {
    let props = spec.props && spec.props.length ? /* @__PURE__ */ Object.create(null) : noProps;
    let flags = (spec.top ? 1 : 0) | (spec.skipped ? 2 : 0) | (spec.error ? 4 : 0) | (spec.name == null ? 8 : 0);
    let type = new NodeType(spec.name || "", props, spec.id, flags);
    if (spec.props)
      for (let src of spec.props) {
        if (!Array.isArray(src))
          src = src(type);
        if (src) {
          if (src[0].perNode)
            throw new RangeError("Can't store a per-node prop on a node type");
          props[src[0].id] = src[1];
        }
      }
    return type;
  }
  /// Retrieves a node prop for this type. Will return `undefined` if
  /// the prop isn't present on this node.
  prop(prop) {
    return this.props[prop.id];
  }
  /// True when this is the top node of a grammar.
  get isTop() {
    return (this.flags & 1) > 0;
  }
  /// True when this node is produced by a skip rule.
  get isSkipped() {
    return (this.flags & 2) > 0;
  }
  /// Indicates whether this is an error node.
  get isError() {
    return (this.flags & 4) > 0;
  }
  /// When true, this node type doesn't correspond to a user-declared
  /// named node, for example because it is used to cache repetition.
  get isAnonymous() {
    return (this.flags & 8) > 0;
  }
  /// Returns true when this node's name or one of its
  /// [groups](#common.NodeProp^group) matches the given string.
  is(name2) {
    if (typeof name2 == "string") {
      if (this.name == name2)
        return true;
      let group = this.prop(NodeProp.group);
      return group ? group.indexOf(name2) > -1 : false;
    }
    return this.id == name2;
  }
  /// Create a function from node types to arbitrary values by
  /// specifying an object whose property names are node or
  /// [group](#common.NodeProp^group) names. Often useful with
  /// [`NodeProp.add`](#common.NodeProp.add). You can put multiple
  /// names, separated by spaces, in a single property name to map
  /// multiple node names to a single value.
  static match(map) {
    let direct = /* @__PURE__ */ Object.create(null);
    for (let prop in map)
      for (let name2 of prop.split(" "))
        direct[name2] = map[prop];
    return (node) => {
      for (let groups = node.prop(NodeProp.group), i = -1; i < (groups ? groups.length : 0); i++) {
        let found = direct[i < 0 ? node.name : groups[i]];
        if (found)
          return found;
      }
    };
  }
}
NodeType.none = new NodeType(
  "",
  /* @__PURE__ */ Object.create(null),
  0,
  8
  /* NodeFlag.Anonymous */
);
class NodeSet {
  /// Create a set with the given types. The `id` property of each
  /// type should correspond to its position within the array.
  constructor(types2) {
    this.types = types2;
    for (let i = 0; i < types2.length; i++)
      if (types2[i].id != i)
        throw new RangeError("Node type ids should correspond to array positions when creating a node set");
  }
  /// Create a copy of this set with some node properties added. The
  /// arguments to this method can be created with
  /// [`NodeProp.add`](#common.NodeProp.add).
  extend(...props) {
    let newTypes = [];
    for (let type of this.types) {
      let newProps = null;
      for (let source of props) {
        let add2 = source(type);
        if (add2) {
          if (!newProps)
            newProps = Object.assign({}, type.props);
          newProps[add2[0].id] = add2[1];
        }
      }
      newTypes.push(newProps ? new NodeType(type.name, newProps, type.id, type.flags) : type);
    }
    return new NodeSet(newTypes);
  }
}
const CachedNode = /* @__PURE__ */ new WeakMap(), CachedInnerNode = /* @__PURE__ */ new WeakMap();
var IterMode;
(function(IterMode2) {
  IterMode2[IterMode2["ExcludeBuffers"] = 1] = "ExcludeBuffers";
  IterMode2[IterMode2["IncludeAnonymous"] = 2] = "IncludeAnonymous";
  IterMode2[IterMode2["IgnoreMounts"] = 4] = "IgnoreMounts";
  IterMode2[IterMode2["IgnoreOverlays"] = 8] = "IgnoreOverlays";
})(IterMode || (IterMode = {}));
class Tree {
  /// Construct a new tree. See also [`Tree.build`](#common.Tree^build).
  constructor(type, children, positions, length, props) {
    this.type = type;
    this.children = children;
    this.positions = positions;
    this.length = length;
    this.props = null;
    if (props && props.length) {
      this.props = /* @__PURE__ */ Object.create(null);
      for (let [prop, value] of props)
        this.props[typeof prop == "number" ? prop : prop.id] = value;
    }
  }
  /// @internal
  toString() {
    let mounted = this.prop(NodeProp.mounted);
    if (mounted && !mounted.overlay)
      return mounted.tree.toString();
    let children = "";
    for (let ch of this.children) {
      let str = ch.toString();
      if (str) {
        if (children)
          children += ",";
        children += str;
      }
    }
    return !this.type.name ? children : (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (children.length ? "(" + children + ")" : "");
  }
  /// Get a [tree cursor](#common.TreeCursor) positioned at the top of
  /// the tree. Mode can be used to [control](#common.IterMode) which
  /// nodes the cursor visits.
  cursor(mode = 0) {
    return new TreeCursor(this.topNode, mode);
  }
  /// Get a [tree cursor](#common.TreeCursor) pointing into this tree
  /// at the given position and side (see
  /// [`moveTo`](#common.TreeCursor.moveTo).
  cursorAt(pos, side = 0, mode = 0) {
    let scope = CachedNode.get(this) || this.topNode;
    let cursor = new TreeCursor(scope);
    cursor.moveTo(pos, side);
    CachedNode.set(this, cursor._tree);
    return cursor;
  }
  /// Get a [syntax node](#common.SyntaxNode) object for the top of the
  /// tree.
  get topNode() {
    return new TreeNode(this, 0, 0, null);
  }
  /// Get the [syntax node](#common.SyntaxNode) at the given position.
  /// If `side` is -1, this will move into nodes that end at the
  /// position. If 1, it'll move into nodes that start at the
  /// position. With 0, it'll only enter nodes that cover the position
  /// from both sides.
  ///
  /// Note that this will not enter
  /// [overlays](#common.MountedTree.overlay), and you often want
  /// [`resolveInner`](#common.Tree.resolveInner) instead.
  resolve(pos, side = 0) {
    let node = resolveNode(CachedNode.get(this) || this.topNode, pos, side, false);
    CachedNode.set(this, node);
    return node;
  }
  /// Like [`resolve`](#common.Tree.resolve), but will enter
  /// [overlaid](#common.MountedTree.overlay) nodes, producing a syntax node
  /// pointing into the innermost overlaid tree at the given position
  /// (with parent links going through all parent structure, including
  /// the host trees).
  resolveInner(pos, side = 0) {
    let node = resolveNode(CachedInnerNode.get(this) || this.topNode, pos, side, true);
    CachedInnerNode.set(this, node);
    return node;
  }
  /// Iterate over the tree and its children, calling `enter` for any
  /// node that touches the `from`/`to` region (if given) before
  /// running over such a node's children, and `leave` (if given) when
  /// leaving the node. When `enter` returns `false`, that node will
  /// not have its children iterated over (or `leave` called).
  iterate(spec) {
    let { enter, leave, from = 0, to = this.length } = spec;
    for (let c = this.cursor((spec.mode || 0) | IterMode.IncludeAnonymous); ; ) {
      let entered = false;
      if (c.from <= to && c.to >= from && (c.type.isAnonymous || enter(c) !== false)) {
        if (c.firstChild())
          continue;
        entered = true;
      }
      for (; ; ) {
        if (entered && leave && !c.type.isAnonymous)
          leave(c);
        if (c.nextSibling())
          break;
        if (!c.parent())
          return;
        entered = true;
      }
    }
  }
  /// Get the value of the given [node prop](#common.NodeProp) for this
  /// node. Works with both per-node and per-type props.
  prop(prop) {
    return !prop.perNode ? this.type.prop(prop) : this.props ? this.props[prop.id] : void 0;
  }
  /// Returns the node's [per-node props](#common.NodeProp.perNode) in a
  /// format that can be passed to the [`Tree`](#common.Tree)
  /// constructor.
  get propValues() {
    let result = [];
    if (this.props)
      for (let id2 in this.props)
        result.push([+id2, this.props[id2]]);
    return result;
  }
  /// Balance the direct children of this tree, producing a copy of
  /// which may have children grouped into subtrees with type
  /// [`NodeType.none`](#common.NodeType^none).
  balance(config2 = {}) {
    return this.children.length <= 8 ? this : balanceRange(NodeType.none, this.children, this.positions, 0, this.children.length, 0, this.length, (children, positions, length) => new Tree(this.type, children, positions, length, this.propValues), config2.makeTree || ((children, positions, length) => new Tree(NodeType.none, children, positions, length)));
  }
  /// Build a tree from a postfix-ordered buffer of node information,
  /// or a cursor over such a buffer.
  static build(data) {
    return buildTree(data);
  }
}
Tree.empty = new Tree(NodeType.none, [], [], 0);
class FlatBufferCursor {
  constructor(buffer, index) {
    this.buffer = buffer;
    this.index = index;
  }
  get id() {
    return this.buffer[this.index - 4];
  }
  get start() {
    return this.buffer[this.index - 3];
  }
  get end() {
    return this.buffer[this.index - 2];
  }
  get size() {
    return this.buffer[this.index - 1];
  }
  get pos() {
    return this.index;
  }
  next() {
    this.index -= 4;
  }
  fork() {
    return new FlatBufferCursor(this.buffer, this.index);
  }
}
class TreeBuffer {
  /// Create a tree buffer.
  constructor(buffer, length, set) {
    this.buffer = buffer;
    this.length = length;
    this.set = set;
  }
  /// @internal
  get type() {
    return NodeType.none;
  }
  /// @internal
  toString() {
    let result = [];
    for (let index = 0; index < this.buffer.length; ) {
      result.push(this.childString(index));
      index = this.buffer[index + 3];
    }
    return result.join(",");
  }
  /// @internal
  childString(index) {
    let id2 = this.buffer[index], endIndex = this.buffer[index + 3];
    let type = this.set.types[id2], result = type.name;
    if (/\W/.test(result) && !type.isError)
      result = JSON.stringify(result);
    index += 4;
    if (endIndex == index)
      return result;
    let children = [];
    while (index < endIndex) {
      children.push(this.childString(index));
      index = this.buffer[index + 3];
    }
    return result + "(" + children.join(",") + ")";
  }
  /// @internal
  findChild(startIndex, endIndex, dir, pos, side) {
    let { buffer } = this, pick = -1;
    for (let i = startIndex; i != endIndex; i = buffer[i + 3]) {
      if (checkSide(side, pos, buffer[i + 1], buffer[i + 2])) {
        pick = i;
        if (dir > 0)
          break;
      }
    }
    return pick;
  }
  /// @internal
  slice(startI, endI, from) {
    let b = this.buffer;
    let copy = new Uint16Array(endI - startI), len = 0;
    for (let i = startI, j = 0; i < endI; ) {
      copy[j++] = b[i++];
      copy[j++] = b[i++] - from;
      let to = copy[j++] = b[i++] - from;
      copy[j++] = b[i++] - startI;
      len = Math.max(len, to);
    }
    return new TreeBuffer(copy, len, this.set);
  }
}
function checkSide(side, pos, from, to) {
  switch (side) {
    case -2:
      return from < pos;
    case -1:
      return to >= pos && from < pos;
    case 0:
      return from < pos && to > pos;
    case 1:
      return from <= pos && to > pos;
    case 2:
      return to > pos;
    case 4:
      return true;
  }
}
function enterUnfinishedNodesBefore(node, pos) {
  let scan = node.childBefore(pos);
  while (scan) {
    let last = scan.lastChild;
    if (!last || last.to != scan.to)
      break;
    if (last.type.isError && last.from == last.to) {
      node = scan;
      scan = last.prevSibling;
    } else {
      scan = last;
    }
  }
  return node;
}
function resolveNode(node, pos, side, overlays) {
  var _a2;
  while (node.from == node.to || (side < 1 ? node.from >= pos : node.from > pos) || (side > -1 ? node.to <= pos : node.to < pos)) {
    let parent = !overlays && node instanceof TreeNode && node.index < 0 ? null : node.parent;
    if (!parent)
      return node;
    node = parent;
  }
  let mode = overlays ? 0 : IterMode.IgnoreOverlays;
  if (overlays)
    for (let scan = node, parent = scan.parent; parent; scan = parent, parent = scan.parent) {
      if (scan instanceof TreeNode && scan.index < 0 && ((_a2 = parent.enter(pos, side, mode)) === null || _a2 === void 0 ? void 0 : _a2.from) != scan.from)
        node = parent;
    }
  for (; ; ) {
    let inner = node.enter(pos, side, mode);
    if (!inner)
      return node;
    node = inner;
  }
}
class TreeNode {
  constructor(_tree, from, index, _parent) {
    this._tree = _tree;
    this.from = from;
    this.index = index;
    this._parent = _parent;
  }
  get type() {
    return this._tree.type;
  }
  get name() {
    return this._tree.type.name;
  }
  get to() {
    return this.from + this._tree.length;
  }
  nextChild(i, dir, pos, side, mode = 0) {
    for (let parent = this; ; ) {
      for (let { children, positions } = parent._tree, e = dir > 0 ? children.length : -1; i != e; i += dir) {
        let next = children[i], start = positions[i] + parent.from;
        if (!checkSide(side, pos, start, start + next.length))
          continue;
        if (next instanceof TreeBuffer) {
          if (mode & IterMode.ExcludeBuffers)
            continue;
          let index = next.findChild(0, next.buffer.length, dir, pos - start, side);
          if (index > -1)
            return new BufferNode(new BufferContext(parent, next, i, start), null, index);
        } else if (mode & IterMode.IncludeAnonymous || (!next.type.isAnonymous || hasChild(next))) {
          let mounted;
          if (!(mode & IterMode.IgnoreMounts) && next.props && (mounted = next.prop(NodeProp.mounted)) && !mounted.overlay)
            return new TreeNode(mounted.tree, start, i, parent);
          let inner = new TreeNode(next, start, i, parent);
          return mode & IterMode.IncludeAnonymous || !inner.type.isAnonymous ? inner : inner.nextChild(dir < 0 ? next.children.length - 1 : 0, dir, pos, side);
        }
      }
      if (mode & IterMode.IncludeAnonymous || !parent.type.isAnonymous)
        return null;
      if (parent.index >= 0)
        i = parent.index + dir;
      else
        i = dir < 0 ? -1 : parent._parent._tree.children.length;
      parent = parent._parent;
      if (!parent)
        return null;
    }
  }
  get firstChild() {
    return this.nextChild(
      0,
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  get lastChild() {
    return this.nextChild(
      this._tree.children.length - 1,
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  childAfter(pos) {
    return this.nextChild(
      0,
      1,
      pos,
      2
      /* Side.After */
    );
  }
  childBefore(pos) {
    return this.nextChild(
      this._tree.children.length - 1,
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  enter(pos, side, mode = 0) {
    let mounted;
    if (!(mode & IterMode.IgnoreOverlays) && (mounted = this._tree.prop(NodeProp.mounted)) && mounted.overlay) {
      let rPos = pos - this.from;
      for (let { from, to } of mounted.overlay) {
        if ((side > 0 ? from <= rPos : from < rPos) && (side < 0 ? to >= rPos : to > rPos))
          return new TreeNode(mounted.tree, mounted.overlay[0].from + this.from, -1, this);
      }
    }
    return this.nextChild(0, 1, pos, side, mode);
  }
  nextSignificantParent() {
    let val = this;
    while (val.type.isAnonymous && val._parent)
      val = val._parent;
    return val;
  }
  get parent() {
    return this._parent ? this._parent.nextSignificantParent() : null;
  }
  get nextSibling() {
    return this._parent && this.index >= 0 ? this._parent.nextChild(
      this.index + 1,
      1,
      0,
      4
      /* Side.DontCare */
    ) : null;
  }
  get prevSibling() {
    return this._parent && this.index >= 0 ? this._parent.nextChild(
      this.index - 1,
      -1,
      0,
      4
      /* Side.DontCare */
    ) : null;
  }
  cursor(mode = 0) {
    return new TreeCursor(this, mode);
  }
  get tree() {
    return this._tree;
  }
  toTree() {
    return this._tree;
  }
  resolve(pos, side = 0) {
    return resolveNode(this, pos, side, false);
  }
  resolveInner(pos, side = 0) {
    return resolveNode(this, pos, side, true);
  }
  enterUnfinishedNodesBefore(pos) {
    return enterUnfinishedNodesBefore(this, pos);
  }
  getChild(type, before = null, after = null) {
    let r = getChildren(this, type, before, after);
    return r.length ? r[0] : null;
  }
  getChildren(type, before = null, after = null) {
    return getChildren(this, type, before, after);
  }
  /// @internal
  toString() {
    return this._tree.toString();
  }
  get node() {
    return this;
  }
  matchContext(context) {
    return matchNodeContext(this, context);
  }
}
function getChildren(node, type, before, after) {
  let cur2 = node.cursor(), result = [];
  if (!cur2.firstChild())
    return result;
  if (before != null) {
    while (!cur2.type.is(before))
      if (!cur2.nextSibling())
        return result;
  }
  for (; ; ) {
    if (after != null && cur2.type.is(after))
      return result;
    if (cur2.type.is(type))
      result.push(cur2.node);
    if (!cur2.nextSibling())
      return after == null ? result : [];
  }
}
function matchNodeContext(node, context, i = context.length - 1) {
  for (let p = node.parent; i >= 0; p = p.parent) {
    if (!p)
      return false;
    if (!p.type.isAnonymous) {
      if (context[i] && context[i] != p.name)
        return false;
      i--;
    }
  }
  return true;
}
class BufferContext {
  constructor(parent, buffer, index, start) {
    this.parent = parent;
    this.buffer = buffer;
    this.index = index;
    this.start = start;
  }
}
class BufferNode {
  get name() {
    return this.type.name;
  }
  get from() {
    return this.context.start + this.context.buffer.buffer[this.index + 1];
  }
  get to() {
    return this.context.start + this.context.buffer.buffer[this.index + 2];
  }
  constructor(context, _parent, index) {
    this.context = context;
    this._parent = _parent;
    this.index = index;
    this.type = context.buffer.set.types[context.buffer.buffer[index]];
  }
  child(dir, pos, side) {
    let { buffer } = this.context;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.context.start, side);
    return index < 0 ? null : new BufferNode(this.context, this, index);
  }
  get firstChild() {
    return this.child(
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  get lastChild() {
    return this.child(
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  childAfter(pos) {
    return this.child(
      1,
      pos,
      2
      /* Side.After */
    );
  }
  childBefore(pos) {
    return this.child(
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  enter(pos, side, mode = 0) {
    if (mode & IterMode.ExcludeBuffers)
      return null;
    let { buffer } = this.context;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], side > 0 ? 1 : -1, pos - this.context.start, side);
    return index < 0 ? null : new BufferNode(this.context, this, index);
  }
  get parent() {
    return this._parent || this.context.parent.nextSignificantParent();
  }
  externalSibling(dir) {
    return this._parent ? null : this.context.parent.nextChild(
      this.context.index + dir,
      dir,
      0,
      4
      /* Side.DontCare */
    );
  }
  get nextSibling() {
    let { buffer } = this.context;
    let after = buffer.buffer[this.index + 3];
    if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
      return new BufferNode(this.context, this._parent, after);
    return this.externalSibling(1);
  }
  get prevSibling() {
    let { buffer } = this.context;
    let parentStart = this._parent ? this._parent.index + 4 : 0;
    if (this.index == parentStart)
      return this.externalSibling(-1);
    return new BufferNode(this.context, this._parent, buffer.findChild(
      parentStart,
      this.index,
      -1,
      0,
      4
      /* Side.DontCare */
    ));
  }
  cursor(mode = 0) {
    return new TreeCursor(this, mode);
  }
  get tree() {
    return null;
  }
  toTree() {
    let children = [], positions = [];
    let { buffer } = this.context;
    let startI = this.index + 4, endI = buffer.buffer[this.index + 3];
    if (endI > startI) {
      let from = buffer.buffer[this.index + 1];
      children.push(buffer.slice(startI, endI, from));
      positions.push(0);
    }
    return new Tree(this.type, children, positions, this.to - this.from);
  }
  resolve(pos, side = 0) {
    return resolveNode(this, pos, side, false);
  }
  resolveInner(pos, side = 0) {
    return resolveNode(this, pos, side, true);
  }
  enterUnfinishedNodesBefore(pos) {
    return enterUnfinishedNodesBefore(this, pos);
  }
  /// @internal
  toString() {
    return this.context.buffer.childString(this.index);
  }
  getChild(type, before = null, after = null) {
    let r = getChildren(this, type, before, after);
    return r.length ? r[0] : null;
  }
  getChildren(type, before = null, after = null) {
    return getChildren(this, type, before, after);
  }
  get node() {
    return this;
  }
  matchContext(context) {
    return matchNodeContext(this, context);
  }
}
class TreeCursor {
  /// Shorthand for `.type.name`.
  get name() {
    return this.type.name;
  }
  /// @internal
  constructor(node, mode = 0) {
    this.mode = mode;
    this.buffer = null;
    this.stack = [];
    this.index = 0;
    this.bufferNode = null;
    if (node instanceof TreeNode) {
      this.yieldNode(node);
    } else {
      this._tree = node.context.parent;
      this.buffer = node.context;
      for (let n = node._parent; n; n = n._parent)
        this.stack.unshift(n.index);
      this.bufferNode = node;
      this.yieldBuf(node.index);
    }
  }
  yieldNode(node) {
    if (!node)
      return false;
    this._tree = node;
    this.type = node.type;
    this.from = node.from;
    this.to = node.to;
    return true;
  }
  yieldBuf(index, type) {
    this.index = index;
    let { start, buffer } = this.buffer;
    this.type = type || buffer.set.types[buffer.buffer[index]];
    this.from = start + buffer.buffer[index + 1];
    this.to = start + buffer.buffer[index + 2];
    return true;
  }
  yield(node) {
    if (!node)
      return false;
    if (node instanceof TreeNode) {
      this.buffer = null;
      return this.yieldNode(node);
    }
    this.buffer = node.context;
    return this.yieldBuf(node.index, node.type);
  }
  /// @internal
  toString() {
    return this.buffer ? this.buffer.buffer.childString(this.index) : this._tree.toString();
  }
  /// @internal
  enterChild(dir, pos, side) {
    if (!this.buffer)
      return this.yield(this._tree.nextChild(dir < 0 ? this._tree._tree.children.length - 1 : 0, dir, pos, side, this.mode));
    let { buffer } = this.buffer;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.buffer.start, side);
    if (index < 0)
      return false;
    this.stack.push(this.index);
    return this.yieldBuf(index);
  }
  /// Move the cursor to this node's first child. When this returns
  /// false, the node has no child, and the cursor has not been moved.
  firstChild() {
    return this.enterChild(
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  /// Move the cursor to this node's last child.
  lastChild() {
    return this.enterChild(
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  /// Move the cursor to the first child that ends after `pos`.
  childAfter(pos) {
    return this.enterChild(
      1,
      pos,
      2
      /* Side.After */
    );
  }
  /// Move to the last child that starts before `pos`.
  childBefore(pos) {
    return this.enterChild(
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  /// Move the cursor to the child around `pos`. If side is -1 the
  /// child may end at that position, when 1 it may start there. This
  /// will also enter [overlaid](#common.MountedTree.overlay)
  /// [mounted](#common.NodeProp^mounted) trees unless `overlays` is
  /// set to false.
  enter(pos, side, mode = this.mode) {
    if (!this.buffer)
      return this.yield(this._tree.enter(pos, side, mode));
    return mode & IterMode.ExcludeBuffers ? false : this.enterChild(1, pos, side);
  }
  /// Move to the node's parent node, if this isn't the top node.
  parent() {
    if (!this.buffer)
      return this.yieldNode(this.mode & IterMode.IncludeAnonymous ? this._tree._parent : this._tree.parent);
    if (this.stack.length)
      return this.yieldBuf(this.stack.pop());
    let parent = this.mode & IterMode.IncludeAnonymous ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
    this.buffer = null;
    return this.yieldNode(parent);
  }
  /// @internal
  sibling(dir) {
    if (!this.buffer)
      return !this._tree._parent ? false : this.yield(this._tree.index < 0 ? null : this._tree._parent.nextChild(this._tree.index + dir, dir, 0, 4, this.mode));
    let { buffer } = this.buffer, d = this.stack.length - 1;
    if (dir < 0) {
      let parentStart = d < 0 ? 0 : this.stack[d] + 4;
      if (this.index != parentStart)
        return this.yieldBuf(buffer.findChild(
          parentStart,
          this.index,
          -1,
          0,
          4
          /* Side.DontCare */
        ));
    } else {
      let after = buffer.buffer[this.index + 3];
      if (after < (d < 0 ? buffer.buffer.length : buffer.buffer[this.stack[d] + 3]))
        return this.yieldBuf(after);
    }
    return d < 0 ? this.yield(this.buffer.parent.nextChild(this.buffer.index + dir, dir, 0, 4, this.mode)) : false;
  }
  /// Move to this node's next sibling, if any.
  nextSibling() {
    return this.sibling(1);
  }
  /// Move to this node's previous sibling, if any.
  prevSibling() {
    return this.sibling(-1);
  }
  atLastNode(dir) {
    let index, parent, { buffer } = this;
    if (buffer) {
      if (dir > 0) {
        if (this.index < buffer.buffer.buffer.length)
          return false;
      } else {
        for (let i = 0; i < this.index; i++)
          if (buffer.buffer.buffer[i + 3] < this.index)
            return false;
      }
      ({ index, parent } = buffer);
    } else {
      ({ index, _parent: parent } = this._tree);
    }
    for (; parent; { index, _parent: parent } = parent) {
      if (index > -1)
        for (let i = index + dir, e = dir < 0 ? -1 : parent._tree.children.length; i != e; i += dir) {
          let child = parent._tree.children[i];
          if (this.mode & IterMode.IncludeAnonymous || child instanceof TreeBuffer || !child.type.isAnonymous || hasChild(child))
            return false;
        }
    }
    return true;
  }
  move(dir, enter) {
    if (enter && this.enterChild(
      dir,
      0,
      4
      /* Side.DontCare */
    ))
      return true;
    for (; ; ) {
      if (this.sibling(dir))
        return true;
      if (this.atLastNode(dir) || !this.parent())
        return false;
    }
  }
  /// Move to the next node in a
  /// [pre-order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order,_NLR)
  /// traversal, going from a node to its first child or, if the
  /// current node is empty or `enter` is false, its next sibling or
  /// the next sibling of the first parent node that has one.
  next(enter = true) {
    return this.move(1, enter);
  }
  /// Move to the next node in a last-to-first pre-order traveral. A
  /// node is followed by its last child or, if it has none, its
  /// previous sibling or the previous sibling of the first parent
  /// node that has one.
  prev(enter = true) {
    return this.move(-1, enter);
  }
  /// Move the cursor to the innermost node that covers `pos`. If
  /// `side` is -1, it will enter nodes that end at `pos`. If it is 1,
  /// it will enter nodes that start at `pos`.
  moveTo(pos, side = 0) {
    while (this.from == this.to || (side < 1 ? this.from >= pos : this.from > pos) || (side > -1 ? this.to <= pos : this.to < pos))
      if (!this.parent())
        break;
    while (this.enterChild(1, pos, side)) {
    }
    return this;
  }
  /// Get a [syntax node](#common.SyntaxNode) at the cursor's current
  /// position.
  get node() {
    if (!this.buffer)
      return this._tree;
    let cache2 = this.bufferNode, result = null, depth = 0;
    if (cache2 && cache2.context == this.buffer) {
      scan:
        for (let index = this.index, d = this.stack.length; d >= 0; ) {
          for (let c = cache2; c; c = c._parent)
            if (c.index == index) {
              if (index == this.index)
                return c;
              result = c;
              depth = d + 1;
              break scan;
            }
          index = this.stack[--d];
        }
    }
    for (let i = depth; i < this.stack.length; i++)
      result = new BufferNode(this.buffer, result, this.stack[i]);
    return this.bufferNode = new BufferNode(this.buffer, result, this.index);
  }
  /// Get the [tree](#common.Tree) that represents the current node, if
  /// any. Will return null when the node is in a [tree
  /// buffer](#common.TreeBuffer).
  get tree() {
    return this.buffer ? null : this._tree._tree;
  }
  /// Iterate over the current node and all its descendants, calling
  /// `enter` when entering a node and `leave`, if given, when leaving
  /// one. When `enter` returns `false`, any children of that node are
  /// skipped, and `leave` isn't called for it.
  iterate(enter, leave) {
    for (let depth = 0; ; ) {
      let mustLeave = false;
      if (this.type.isAnonymous || enter(this) !== false) {
        if (this.firstChild()) {
          depth++;
          continue;
        }
        if (!this.type.isAnonymous)
          mustLeave = true;
      }
      for (; ; ) {
        if (mustLeave && leave)
          leave(this);
        mustLeave = this.type.isAnonymous;
        if (this.nextSibling())
          break;
        if (!depth)
          return;
        this.parent();
        depth--;
        mustLeave = true;
      }
    }
  }
  /// Test whether the current node matches a given context—a sequence
  /// of direct parent node names. Empty strings in the context array
  /// are treated as wildcards.
  matchContext(context) {
    if (!this.buffer)
      return matchNodeContext(this.node, context);
    let { buffer } = this.buffer, { types: types2 } = buffer.set;
    for (let i = context.length - 1, d = this.stack.length - 1; i >= 0; d--) {
      if (d < 0)
        return matchNodeContext(this.node, context, i);
      let type = types2[buffer.buffer[this.stack[d]]];
      if (!type.isAnonymous) {
        if (context[i] && context[i] != type.name)
          return false;
        i--;
      }
    }
    return true;
  }
}
function hasChild(tree) {
  return tree.children.some((ch) => ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch));
}
function buildTree(data) {
  var _a2;
  let { buffer, nodeSet, maxBufferLength = DefaultBufferLength, reused = [], minRepeatType = nodeSet.types.length } = data;
  let cursor = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
  let types2 = nodeSet.types;
  let contextHash = 0, lookAhead = 0;
  function takeNode(parentStart, minPos, children2, positions2, inRepeat) {
    let { id: id2, start, end, size } = cursor;
    let lookAheadAtStart = lookAhead;
    while (size < 0) {
      cursor.next();
      if (size == -1) {
        let node2 = reused[id2];
        children2.push(node2);
        positions2.push(start - parentStart);
        return;
      } else if (size == -3) {
        contextHash = id2;
        return;
      } else if (size == -4) {
        lookAhead = id2;
        return;
      } else {
        throw new RangeError(`Unrecognized record size: ${size}`);
      }
    }
    let type = types2[id2], node, buffer2;
    let startPos = start - parentStart;
    if (end - start <= maxBufferLength && (buffer2 = findBufferSize(cursor.pos - minPos, inRepeat))) {
      let data2 = new Uint16Array(buffer2.size - buffer2.skip);
      let endPos = cursor.pos - buffer2.size, index = data2.length;
      while (cursor.pos > endPos)
        index = copyToBuffer(buffer2.start, data2, index);
      node = new TreeBuffer(data2, end - buffer2.start, nodeSet);
      startPos = buffer2.start - parentStart;
    } else {
      let endPos = cursor.pos - size;
      cursor.next();
      let localChildren = [], localPositions = [];
      let localInRepeat = id2 >= minRepeatType ? id2 : -1;
      let lastGroup = 0, lastEnd = end;
      while (cursor.pos > endPos) {
        if (localInRepeat >= 0 && cursor.id == localInRepeat && cursor.size >= 0) {
          if (cursor.end <= lastEnd - maxBufferLength) {
            makeRepeatLeaf(localChildren, localPositions, start, lastGroup, cursor.end, lastEnd, localInRepeat, lookAheadAtStart);
            lastGroup = localChildren.length;
            lastEnd = cursor.end;
          }
          cursor.next();
        } else {
          takeNode(start, endPos, localChildren, localPositions, localInRepeat);
        }
      }
      if (localInRepeat >= 0 && lastGroup > 0 && lastGroup < localChildren.length)
        makeRepeatLeaf(localChildren, localPositions, start, lastGroup, start, lastEnd, localInRepeat, lookAheadAtStart);
      localChildren.reverse();
      localPositions.reverse();
      if (localInRepeat > -1 && lastGroup > 0) {
        let make = makeBalanced(type);
        node = balanceRange(type, localChildren, localPositions, 0, localChildren.length, 0, end - start, make, make);
      } else {
        node = makeTree(type, localChildren, localPositions, end - start, lookAheadAtStart - end);
      }
    }
    children2.push(node);
    positions2.push(startPos);
  }
  function makeBalanced(type) {
    return (children2, positions2, length2) => {
      let lookAhead2 = 0, lastI = children2.length - 1, last, lookAheadProp;
      if (lastI >= 0 && (last = children2[lastI]) instanceof Tree) {
        if (!lastI && last.type == type && last.length == length2)
          return last;
        if (lookAheadProp = last.prop(NodeProp.lookAhead))
          lookAhead2 = positions2[lastI] + last.length + lookAheadProp;
      }
      return makeTree(type, children2, positions2, length2, lookAhead2);
    };
  }
  function makeRepeatLeaf(children2, positions2, base2, i, from, to, type, lookAhead2) {
    let localChildren = [], localPositions = [];
    while (children2.length > i) {
      localChildren.push(children2.pop());
      localPositions.push(positions2.pop() + base2 - from);
    }
    children2.push(makeTree(nodeSet.types[type], localChildren, localPositions, to - from, lookAhead2 - to));
    positions2.push(from - base2);
  }
  function makeTree(type, children2, positions2, length2, lookAhead2 = 0, props) {
    if (contextHash) {
      let pair2 = [NodeProp.contextHash, contextHash];
      props = props ? [pair2].concat(props) : [pair2];
    }
    if (lookAhead2 > 25) {
      let pair2 = [NodeProp.lookAhead, lookAhead2];
      props = props ? [pair2].concat(props) : [pair2];
    }
    return new Tree(type, children2, positions2, length2, props);
  }
  function findBufferSize(maxSize, inRepeat) {
    let fork = cursor.fork();
    let size = 0, start = 0, skip = 0, minStart = fork.end - maxBufferLength;
    let result = { size: 0, start: 0, skip: 0 };
    scan:
      for (let minPos = fork.pos - maxSize; fork.pos > minPos; ) {
        let nodeSize2 = fork.size;
        if (fork.id == inRepeat && nodeSize2 >= 0) {
          result.size = size;
          result.start = start;
          result.skip = skip;
          skip += 4;
          size += 4;
          fork.next();
          continue;
        }
        let startPos = fork.pos - nodeSize2;
        if (nodeSize2 < 0 || startPos < minPos || fork.start < minStart)
          break;
        let localSkipped = fork.id >= minRepeatType ? 4 : 0;
        let nodeStart2 = fork.start;
        fork.next();
        while (fork.pos > startPos) {
          if (fork.size < 0) {
            if (fork.size == -3)
              localSkipped += 4;
            else
              break scan;
          } else if (fork.id >= minRepeatType) {
            localSkipped += 4;
          }
          fork.next();
        }
        start = nodeStart2;
        size += nodeSize2;
        skip += localSkipped;
      }
    if (inRepeat < 0 || size == maxSize) {
      result.size = size;
      result.start = start;
      result.skip = skip;
    }
    return result.size > 4 ? result : void 0;
  }
  function copyToBuffer(bufferStart, buffer2, index) {
    let { id: id2, start, end, size } = cursor;
    cursor.next();
    if (size >= 0 && id2 < minRepeatType) {
      let startIndex = index;
      if (size > 4) {
        let endPos = cursor.pos - (size - 4);
        while (cursor.pos > endPos)
          index = copyToBuffer(bufferStart, buffer2, index);
      }
      buffer2[--index] = startIndex;
      buffer2[--index] = end - bufferStart;
      buffer2[--index] = start - bufferStart;
      buffer2[--index] = id2;
    } else if (size == -3) {
      contextHash = id2;
    } else if (size == -4) {
      lookAhead = id2;
    }
    return index;
  }
  let children = [], positions = [];
  while (cursor.pos > 0)
    takeNode(data.start || 0, data.bufferStart || 0, children, positions, -1);
  let length = (_a2 = data.length) !== null && _a2 !== void 0 ? _a2 : children.length ? positions[0] + children[0].length : 0;
  return new Tree(types2[data.topID], children.reverse(), positions.reverse(), length);
}
const nodeSizeCache = /* @__PURE__ */ new WeakMap();
function nodeSize(balanceType, node) {
  if (!balanceType.isAnonymous || node instanceof TreeBuffer || node.type != balanceType)
    return 1;
  let size = nodeSizeCache.get(node);
  if (size == null) {
    size = 1;
    for (let child of node.children) {
      if (child.type != balanceType || !(child instanceof Tree)) {
        size = 1;
        break;
      }
      size += nodeSize(balanceType, child);
    }
    nodeSizeCache.set(node, size);
  }
  return size;
}
function balanceRange(balanceType, children, positions, from, to, start, length, mkTop, mkTree) {
  let total = 0;
  for (let i = from; i < to; i++)
    total += nodeSize(balanceType, children[i]);
  let maxChild = Math.ceil(
    total * 1.5 / 8
    /* Balance.BranchFactor */
  );
  let localChildren = [], localPositions = [];
  function divide(children2, positions2, from2, to2, offset) {
    for (let i = from2; i < to2; ) {
      let groupFrom = i, groupStart = positions2[i], groupSize = nodeSize(balanceType, children2[i]);
      i++;
      for (; i < to2; i++) {
        let nextSize = nodeSize(balanceType, children2[i]);
        if (groupSize + nextSize >= maxChild)
          break;
        groupSize += nextSize;
      }
      if (i == groupFrom + 1) {
        if (groupSize > maxChild) {
          let only = children2[groupFrom];
          divide(only.children, only.positions, 0, only.children.length, positions2[groupFrom] + offset);
          continue;
        }
        localChildren.push(children2[groupFrom]);
      } else {
        let length2 = positions2[i - 1] + children2[i - 1].length - groupStart;
        localChildren.push(balanceRange(balanceType, children2, positions2, groupFrom, i, groupStart, length2, null, mkTree));
      }
      localPositions.push(groupStart + offset - start);
    }
  }
  divide(children, positions, from, to, 0);
  return (mkTop || mkTree)(localChildren, localPositions, length);
}
class NodeWeakMap {
  constructor() {
    this.map = /* @__PURE__ */ new WeakMap();
  }
  setBuffer(buffer, index, value) {
    let inner = this.map.get(buffer);
    if (!inner)
      this.map.set(buffer, inner = /* @__PURE__ */ new Map());
    inner.set(index, value);
  }
  getBuffer(buffer, index) {
    let inner = this.map.get(buffer);
    return inner && inner.get(index);
  }
  /// Set the value for this syntax node.
  set(node, value) {
    if (node instanceof BufferNode)
      this.setBuffer(node.context.buffer, node.index, value);
    else if (node instanceof TreeNode)
      this.map.set(node.tree, value);
  }
  /// Retrieve value for this syntax node, if it exists in the map.
  get(node) {
    return node instanceof BufferNode ? this.getBuffer(node.context.buffer, node.index) : node instanceof TreeNode ? this.map.get(node.tree) : void 0;
  }
  /// Set the value for the node that a cursor currently points to.
  cursorSet(cursor, value) {
    if (cursor.buffer)
      this.setBuffer(cursor.buffer.buffer, cursor.index, value);
    else
      this.map.set(cursor.tree, value);
  }
  /// Retrieve the value for the node that a cursor currently points
  /// to.
  cursorGet(cursor) {
    return cursor.buffer ? this.getBuffer(cursor.buffer.buffer, cursor.index) : this.map.get(cursor.tree);
  }
}
class TreeFragment {
  /// Construct a tree fragment. You'll usually want to use
  /// [`addTree`](#common.TreeFragment^addTree) and
  /// [`applyChanges`](#common.TreeFragment^applyChanges) instead of
  /// calling this directly.
  constructor(from, to, tree, offset, openStart = false, openEnd = false) {
    this.from = from;
    this.to = to;
    this.tree = tree;
    this.offset = offset;
    this.open = (openStart ? 1 : 0) | (openEnd ? 2 : 0);
  }
  /// Whether the start of the fragment represents the start of a
  /// parse, or the end of a change. (In the second case, it may not
  /// be safe to reuse some nodes at the start, depending on the
  /// parsing algorithm.)
  get openStart() {
    return (this.open & 1) > 0;
  }
  /// Whether the end of the fragment represents the end of a
  /// full-document parse, or the start of a change.
  get openEnd() {
    return (this.open & 2) > 0;
  }
  /// Create a set of fragments from a freshly parsed tree, or update
  /// an existing set of fragments by replacing the ones that overlap
  /// with a tree with content from the new tree. When `partial` is
  /// true, the parse is treated as incomplete, and the resulting
  /// fragment has [`openEnd`](#common.TreeFragment.openEnd) set to
  /// true.
  static addTree(tree, fragments = [], partial = false) {
    let result = [new TreeFragment(0, tree.length, tree, 0, false, partial)];
    for (let f of fragments)
      if (f.to > tree.length)
        result.push(f);
    return result;
  }
  /// Apply a set of edits to an array of fragments, removing or
  /// splitting fragments as necessary to remove edited ranges, and
  /// adjusting offsets for fragments that moved.
  static applyChanges(fragments, changes, minGap = 128) {
    if (!changes.length)
      return fragments;
    let result = [];
    let fI = 1, nextF = fragments.length ? fragments[0] : null;
    for (let cI = 0, pos = 0, off = 0; ; cI++) {
      let nextC = cI < changes.length ? changes[cI] : null;
      let nextPos = nextC ? nextC.fromA : 1e9;
      if (nextPos - pos >= minGap)
        while (nextF && nextF.from < nextPos) {
          let cut = nextF;
          if (pos >= cut.from || nextPos <= cut.to || off) {
            let fFrom = Math.max(cut.from, pos) - off, fTo = Math.min(cut.to, nextPos) - off;
            cut = fFrom >= fTo ? null : new TreeFragment(fFrom, fTo, cut.tree, cut.offset + off, cI > 0, !!nextC);
          }
          if (cut)
            result.push(cut);
          if (nextF.to > nextPos)
            break;
          nextF = fI < fragments.length ? fragments[fI++] : null;
        }
      if (!nextC)
        break;
      pos = nextC.toA;
      off = nextC.toA - nextC.toB;
    }
    return result;
  }
}
class Parser {
  /// Start a parse, returning a [partial parse](#common.PartialParse)
  /// object. [`fragments`](#common.TreeFragment) can be passed in to
  /// make the parse incremental.
  ///
  /// By default, the entire input is parsed. You can pass `ranges`,
  /// which should be a sorted array of non-empty, non-overlapping
  /// ranges, to parse only those ranges. The tree returned in that
  /// case will start at `ranges[0].from`.
  startParse(input, fragments, ranges) {
    if (typeof input == "string")
      input = new StringInput(input);
    ranges = !ranges ? [new Range2(0, input.length)] : ranges.length ? ranges.map((r) => new Range2(r.from, r.to)) : [new Range2(0, 0)];
    return this.createParse(input, fragments || [], ranges);
  }
  /// Run a full parse, returning the resulting tree.
  parse(input, fragments, ranges) {
    let parse = this.startParse(input, fragments, ranges);
    for (; ; ) {
      let done = parse.advance();
      if (done)
        return done;
    }
  }
}
class StringInput {
  constructor(string2) {
    this.string = string2;
  }
  get length() {
    return this.string.length;
  }
  chunk(from) {
    return this.string.slice(from);
  }
  get lineChunks() {
    return false;
  }
  read(from, to) {
    return this.string.slice(from, to);
  }
}
new NodeProp({ perNode: true });
let nextTagID = 0;
class Tag {
  /// @internal
  constructor(set, base2, modified) {
    this.set = set;
    this.base = base2;
    this.modified = modified;
    this.id = nextTagID++;
  }
  /// Define a new tag. If `parent` is given, the tag is treated as a
  /// sub-tag of that parent, and
  /// [highlighters](#highlight.tagHighlighter) that don't mention
  /// this tag will try to fall back to the parent tag (or grandparent
  /// tag, etc).
  static define(parent) {
    if (parent === null || parent === void 0 ? void 0 : parent.base)
      throw new Error("Can not derive from a modified tag");
    let tag = new Tag([], null, []);
    tag.set.push(tag);
    if (parent)
      for (let t2 of parent.set)
        tag.set.push(t2);
    return tag;
  }
  /// Define a tag _modifier_, which is a function that, given a tag,
  /// will return a tag that is a subtag of the original. Applying the
  /// same modifier to a twice tag will return the same value (`m1(t1)
  /// == m1(t1)`) and applying multiple modifiers will, regardless or
  /// order, produce the same tag (`m1(m2(t1)) == m2(m1(t1))`).
  ///
  /// When multiple modifiers are applied to a given base tag, each
  /// smaller set of modifiers is registered as a parent, so that for
  /// example `m1(m2(m3(t1)))` is a subtype of `m1(m2(t1))`,
  /// `m1(m3(t1)`, and so on.
  static defineModifier() {
    let mod = new Modifier();
    return (tag) => {
      if (tag.modified.indexOf(mod) > -1)
        return tag;
      return Modifier.get(tag.base || tag, tag.modified.concat(mod).sort((a, b) => a.id - b.id));
    };
  }
}
let nextModifierID = 0;
class Modifier {
  constructor() {
    this.instances = [];
    this.id = nextModifierID++;
  }
  static get(base2, mods) {
    if (!mods.length)
      return base2;
    let exists = mods[0].instances.find((t2) => t2.base == base2 && sameArray(mods, t2.modified));
    if (exists)
      return exists;
    let set = [], tag = new Tag(set, base2, mods);
    for (let m of mods)
      m.instances.push(tag);
    let configs = powerSet(mods);
    for (let parent of base2.set)
      if (!parent.modified.length)
        for (let config2 of configs)
          set.push(Modifier.get(parent, config2));
    return tag;
  }
}
function sameArray(a, b) {
  return a.length == b.length && a.every((x, i) => x == b[i]);
}
function powerSet(array) {
  let sets = [[]];
  for (let i = 0; i < array.length; i++) {
    for (let j = 0, e = sets.length; j < e; j++) {
      sets.push(sets[j].concat(array[i]));
    }
  }
  return sets.sort((a, b) => b.length - a.length);
}
function styleTags(spec) {
  let byName = /* @__PURE__ */ Object.create(null);
  for (let prop in spec) {
    let tags2 = spec[prop];
    if (!Array.isArray(tags2))
      tags2 = [tags2];
    for (let part of prop.split(" "))
      if (part) {
        let pieces = [], mode = 2, rest = part;
        for (let pos = 0; ; ) {
          if (rest == "..." && pos > 0 && pos + 3 == part.length) {
            mode = 1;
            break;
          }
          let m = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(rest);
          if (!m)
            throw new RangeError("Invalid path: " + part);
          pieces.push(m[0] == "*" ? "" : m[0][0] == '"' ? JSON.parse(m[0]) : m[0]);
          pos += m[0].length;
          if (pos == part.length)
            break;
          let next = part[pos++];
          if (pos == part.length && next == "!") {
            mode = 0;
            break;
          }
          if (next != "/")
            throw new RangeError("Invalid path: " + part);
          rest = part.slice(pos);
        }
        let last = pieces.length - 1, inner = pieces[last];
        if (!inner)
          throw new RangeError("Invalid path: " + part);
        let rule = new Rule(tags2, mode, last > 0 ? pieces.slice(0, last) : null);
        byName[inner] = rule.sort(byName[inner]);
      }
  }
  return ruleNodeProp.add(byName);
}
const ruleNodeProp = new NodeProp();
class Rule {
  constructor(tags2, mode, context, next) {
    this.tags = tags2;
    this.mode = mode;
    this.context = context;
    this.next = next;
  }
  get opaque() {
    return this.mode == 0;
  }
  get inherit() {
    return this.mode == 1;
  }
  sort(other) {
    if (!other || other.depth < this.depth) {
      this.next = other;
      return this;
    }
    other.next = this.sort(other.next);
    return other;
  }
  get depth() {
    return this.context ? this.context.length : 0;
  }
}
Rule.empty = new Rule([], 2, null);
function tagHighlighter(tags2, options) {
  let map = /* @__PURE__ */ Object.create(null);
  for (let style of tags2) {
    if (!Array.isArray(style.tag))
      map[style.tag.id] = style.class;
    else
      for (let tag of style.tag)
        map[tag.id] = style.class;
  }
  let { scope, all = null } = options || {};
  return {
    style: (tags3) => {
      let cls = all;
      for (let tag of tags3) {
        for (let sub of tag.set) {
          let tagClass = map[sub.id];
          if (tagClass) {
            cls = cls ? cls + " " + tagClass : tagClass;
            break;
          }
        }
      }
      return cls;
    },
    scope
  };
}
function highlightTags(highlighters, tags2) {
  let result = null;
  for (let highlighter of highlighters) {
    let value = highlighter.style(tags2);
    if (value)
      result = result ? result + " " + value : value;
  }
  return result;
}
function highlightTree(tree, highlighter, putStyle, from = 0, to = tree.length) {
  let builder = new HighlightBuilder(from, Array.isArray(highlighter) ? highlighter : [highlighter], putStyle);
  builder.highlightRange(tree.cursor(), from, to, "", builder.highlighters);
  builder.flush(to);
}
class HighlightBuilder {
  constructor(at, highlighters, span) {
    this.at = at;
    this.highlighters = highlighters;
    this.span = span;
    this.class = "";
  }
  startSpan(at, cls) {
    if (cls != this.class) {
      this.flush(at);
      if (at > this.at)
        this.at = at;
      this.class = cls;
    }
  }
  flush(to) {
    if (to > this.at && this.class)
      this.span(this.at, to, this.class);
  }
  highlightRange(cursor, from, to, inheritedClass, highlighters) {
    let { type, from: start, to: end } = cursor;
    if (start >= to || end <= from)
      return;
    if (type.isTop)
      highlighters = this.highlighters.filter((h) => !h.scope || h.scope(type));
    let cls = inheritedClass;
    let rule = getStyleTags(cursor) || Rule.empty;
    let tagCls = highlightTags(highlighters, rule.tags);
    if (tagCls) {
      if (cls)
        cls += " ";
      cls += tagCls;
      if (rule.mode == 1)
        inheritedClass += (inheritedClass ? " " : "") + tagCls;
    }
    this.startSpan(cursor.from, cls);
    if (rule.opaque)
      return;
    let mounted = cursor.tree && cursor.tree.prop(NodeProp.mounted);
    if (mounted && mounted.overlay) {
      let inner = cursor.node.enter(mounted.overlay[0].from + start, 1);
      let innerHighlighters = this.highlighters.filter((h) => !h.scope || h.scope(mounted.tree.type));
      let hasChild2 = cursor.firstChild();
      for (let i = 0, pos = start; ; i++) {
        let next = i < mounted.overlay.length ? mounted.overlay[i] : null;
        let nextPos = next ? next.from + start : end;
        let rangeFrom = Math.max(from, pos), rangeTo = Math.min(to, nextPos);
        if (rangeFrom < rangeTo && hasChild2) {
          while (cursor.from < rangeTo) {
            this.highlightRange(cursor, rangeFrom, rangeTo, inheritedClass, highlighters);
            this.startSpan(Math.min(rangeTo, cursor.to), cls);
            if (cursor.to >= nextPos || !cursor.nextSibling())
              break;
          }
        }
        if (!next || nextPos > to)
          break;
        pos = next.to + start;
        if (pos > from) {
          this.highlightRange(inner.cursor(), Math.max(from, next.from + start), Math.min(to, pos), inheritedClass, innerHighlighters);
          this.startSpan(pos, cls);
        }
      }
      if (hasChild2)
        cursor.parent();
    } else if (cursor.firstChild()) {
      do {
        if (cursor.to <= from)
          continue;
        if (cursor.from >= to)
          break;
        this.highlightRange(cursor, from, to, inheritedClass, highlighters);
        this.startSpan(Math.min(to, cursor.to), cls);
      } while (cursor.nextSibling());
      cursor.parent();
    }
  }
}
function getStyleTags(node) {
  let rule = node.type.prop(ruleNodeProp);
  while (rule && rule.context && !node.matchContext(rule.context))
    rule = rule.next;
  return rule || null;
}
const t = Tag.define;
const comment = t(), name = t(), typeName = t(name), propertyName = t(name), literal = t(), string = t(literal), number = t(literal), content = t(), heading = t(content), keyword = t(), operator = t(), punctuation = t(), bracket = t(punctuation), meta = t();
const tags = {
  /// A comment.
  comment,
  /// A line [comment](#highlight.tags.comment).
  lineComment: t(comment),
  /// A block [comment](#highlight.tags.comment).
  blockComment: t(comment),
  /// A documentation [comment](#highlight.tags.comment).
  docComment: t(comment),
  /// Any kind of identifier.
  name,
  /// The [name](#highlight.tags.name) of a variable.
  variableName: t(name),
  /// A type [name](#highlight.tags.name).
  typeName,
  /// A tag name (subtag of [`typeName`](#highlight.tags.typeName)).
  tagName: t(typeName),
  /// A property or field [name](#highlight.tags.name).
  propertyName,
  /// An attribute name (subtag of [`propertyName`](#highlight.tags.propertyName)).
  attributeName: t(propertyName),
  /// The [name](#highlight.tags.name) of a class.
  className: t(name),
  /// A label [name](#highlight.tags.name).
  labelName: t(name),
  /// A namespace [name](#highlight.tags.name).
  namespace: t(name),
  /// The [name](#highlight.tags.name) of a macro.
  macroName: t(name),
  /// A literal value.
  literal,
  /// A string [literal](#highlight.tags.literal).
  string,
  /// A documentation [string](#highlight.tags.string).
  docString: t(string),
  /// A character literal (subtag of [string](#highlight.tags.string)).
  character: t(string),
  /// An attribute value (subtag of [string](#highlight.tags.string)).
  attributeValue: t(string),
  /// A number [literal](#highlight.tags.literal).
  number,
  /// An integer [number](#highlight.tags.number) literal.
  integer: t(number),
  /// A floating-point [number](#highlight.tags.number) literal.
  float: t(number),
  /// A boolean [literal](#highlight.tags.literal).
  bool: t(literal),
  /// Regular expression [literal](#highlight.tags.literal).
  regexp: t(literal),
  /// An escape [literal](#highlight.tags.literal), for example a
  /// backslash escape in a string.
  escape: t(literal),
  /// A color [literal](#highlight.tags.literal).
  color: t(literal),
  /// A URL [literal](#highlight.tags.literal).
  url: t(literal),
  /// A language keyword.
  keyword,
  /// The [keyword](#highlight.tags.keyword) for the self or this
  /// object.
  self: t(keyword),
  /// The [keyword](#highlight.tags.keyword) for null.
  null: t(keyword),
  /// A [keyword](#highlight.tags.keyword) denoting some atomic value.
  atom: t(keyword),
  /// A [keyword](#highlight.tags.keyword) that represents a unit.
  unit: t(keyword),
  /// A modifier [keyword](#highlight.tags.keyword).
  modifier: t(keyword),
  /// A [keyword](#highlight.tags.keyword) that acts as an operator.
  operatorKeyword: t(keyword),
  /// A control-flow related [keyword](#highlight.tags.keyword).
  controlKeyword: t(keyword),
  /// A [keyword](#highlight.tags.keyword) that defines something.
  definitionKeyword: t(keyword),
  /// A [keyword](#highlight.tags.keyword) related to defining or
  /// interfacing with modules.
  moduleKeyword: t(keyword),
  /// An operator.
  operator,
  /// An [operator](#highlight.tags.operator) that dereferences something.
  derefOperator: t(operator),
  /// Arithmetic-related [operator](#highlight.tags.operator).
  arithmeticOperator: t(operator),
  /// Logical [operator](#highlight.tags.operator).
  logicOperator: t(operator),
  /// Bit [operator](#highlight.tags.operator).
  bitwiseOperator: t(operator),
  /// Comparison [operator](#highlight.tags.operator).
  compareOperator: t(operator),
  /// [Operator](#highlight.tags.operator) that updates its operand.
  updateOperator: t(operator),
  /// [Operator](#highlight.tags.operator) that defines something.
  definitionOperator: t(operator),
  /// Type-related [operator](#highlight.tags.operator).
  typeOperator: t(operator),
  /// Control-flow [operator](#highlight.tags.operator).
  controlOperator: t(operator),
  /// Program or markup punctuation.
  punctuation,
  /// [Punctuation](#highlight.tags.punctuation) that separates
  /// things.
  separator: t(punctuation),
  /// Bracket-style [punctuation](#highlight.tags.punctuation).
  bracket,
  /// Angle [brackets](#highlight.tags.bracket) (usually `<` and `>`
  /// tokens).
  angleBracket: t(bracket),
  /// Square [brackets](#highlight.tags.bracket) (usually `[` and `]`
  /// tokens).
  squareBracket: t(bracket),
  /// Parentheses (usually `(` and `)` tokens). Subtag of
  /// [bracket](#highlight.tags.bracket).
  paren: t(bracket),
  /// Braces (usually `{` and `}` tokens). Subtag of
  /// [bracket](#highlight.tags.bracket).
  brace: t(bracket),
  /// Content, for example plain text in XML or markup documents.
  content,
  /// [Content](#highlight.tags.content) that represents a heading.
  heading,
  /// A level 1 [heading](#highlight.tags.heading).
  heading1: t(heading),
  /// A level 2 [heading](#highlight.tags.heading).
  heading2: t(heading),
  /// A level 3 [heading](#highlight.tags.heading).
  heading3: t(heading),
  /// A level 4 [heading](#highlight.tags.heading).
  heading4: t(heading),
  /// A level 5 [heading](#highlight.tags.heading).
  heading5: t(heading),
  /// A level 6 [heading](#highlight.tags.heading).
  heading6: t(heading),
  /// A prose separator (such as a horizontal rule).
  contentSeparator: t(content),
  /// [Content](#highlight.tags.content) that represents a list.
  list: t(content),
  /// [Content](#highlight.tags.content) that represents a quote.
  quote: t(content),
  /// [Content](#highlight.tags.content) that is emphasized.
  emphasis: t(content),
  /// [Content](#highlight.tags.content) that is styled strong.
  strong: t(content),
  /// [Content](#highlight.tags.content) that is part of a link.
  link: t(content),
  /// [Content](#highlight.tags.content) that is styled as code or
  /// monospace.
  monospace: t(content),
  /// [Content](#highlight.tags.content) that has a strike-through
  /// style.
  strikethrough: t(content),
  /// Inserted text in a change-tracking format.
  inserted: t(),
  /// Deleted text.
  deleted: t(),
  /// Changed text.
  changed: t(),
  /// An invalid or unsyntactic element.
  invalid: t(),
  /// Metadata or meta-instruction.
  meta,
  /// [Metadata](#highlight.tags.meta) that applies to the entire
  /// document.
  documentMeta: t(meta),
  /// [Metadata](#highlight.tags.meta) that annotates or adds
  /// attributes to a given syntactic element.
  annotation: t(meta),
  /// Processing instruction or preprocessor directive. Subtag of
  /// [meta](#highlight.tags.meta).
  processingInstruction: t(meta),
  /// [Modifier](#highlight.Tag^defineModifier) that indicates that a
  /// given element is being defined. Expected to be used with the
  /// various [name](#highlight.tags.name) tags.
  definition: Tag.defineModifier(),
  /// [Modifier](#highlight.Tag^defineModifier) that indicates that
  /// something is constant. Mostly expected to be used with
  /// [variable names](#highlight.tags.variableName).
  constant: Tag.defineModifier(),
  /// [Modifier](#highlight.Tag^defineModifier) used to indicate that
  /// a [variable](#highlight.tags.variableName) or [property
  /// name](#highlight.tags.propertyName) is being called or defined
  /// as a function.
  function: Tag.defineModifier(),
  /// [Modifier](#highlight.Tag^defineModifier) that can be applied to
  /// [names](#highlight.tags.name) to indicate that they belong to
  /// the language's standard environment.
  standard: Tag.defineModifier(),
  /// [Modifier](#highlight.Tag^defineModifier) that indicates a given
  /// [names](#highlight.tags.name) is local to some scope.
  local: Tag.defineModifier(),
  /// A generic variant [modifier](#highlight.Tag^defineModifier) that
  /// can be used to tag language-specific alternative variants of
  /// some common tag. It is recommended for themes to define special
  /// forms of at least the [string](#highlight.tags.string) and
  /// [variable name](#highlight.tags.variableName) tags, since those
  /// come up a lot.
  special: Tag.defineModifier()
};
// ---- end verbatim copy of SP3:editors/dist/assets/codemirror-521de7ab.js lines 12101-14009 ----
const classHighlighter =
// ---- begin verbatim copy of Speedometer SP3:editors/dist/assets/codemirror-521de7ab.js lines 14010-14041 ----
tagHighlighter([
  { tag: tags.link, class: "tok-link" },
  { tag: tags.heading, class: "tok-heading" },
  { tag: tags.emphasis, class: "tok-emphasis" },
  { tag: tags.strong, class: "tok-strong" },
  { tag: tags.keyword, class: "tok-keyword" },
  { tag: tags.atom, class: "tok-atom" },
  { tag: tags.bool, class: "tok-bool" },
  { tag: tags.url, class: "tok-url" },
  { tag: tags.labelName, class: "tok-labelName" },
  { tag: tags.inserted, class: "tok-inserted" },
  { tag: tags.deleted, class: "tok-deleted" },
  { tag: tags.literal, class: "tok-literal" },
  { tag: tags.string, class: "tok-string" },
  { tag: tags.number, class: "tok-number" },
  { tag: [tags.regexp, tags.escape, tags.special(tags.string)], class: "tok-string2" },
  { tag: tags.variableName, class: "tok-variableName" },
  { tag: tags.local(tags.variableName), class: "tok-variableName tok-local" },
  { tag: tags.definition(tags.variableName), class: "tok-variableName tok-definition" },
  { tag: tags.special(tags.variableName), class: "tok-variableName2" },
  { tag: tags.definition(tags.propertyName), class: "tok-propertyName tok-definition" },
  { tag: tags.typeName, class: "tok-typeName" },
  { tag: tags.namespace, class: "tok-namespace" },
  { tag: tags.className, class: "tok-className" },
  { tag: tags.macroName, class: "tok-macroName" },
  { tag: tags.propertyName, class: "tok-propertyName" },
  { tag: tags.operator, class: "tok-operator" },
  { tag: tags.comment, class: "tok-comment" },
  { tag: tags.meta, class: "tok-meta" },
  { tag: tags.invalid, class: "tok-invalid" },
  { tag: tags.punctuation, class: "tok-punctuation" }
]);
// ---- end verbatim copy of SP3:editors/dist/assets/codemirror-521de7ab.js lines 14010-14041 ----
// ---- begin verbatim copy of Speedometer SP3:editors/dist/assets/codemirror-521de7ab.js lines 19791-21552 ----
class Stack {
  /// @internal
  constructor(p, stack, state, reducePos, pos, score2, buffer, bufferBase, curContext, lookAhead = 0, parent) {
    this.p = p;
    this.stack = stack;
    this.state = state;
    this.reducePos = reducePos;
    this.pos = pos;
    this.score = score2;
    this.buffer = buffer;
    this.bufferBase = bufferBase;
    this.curContext = curContext;
    this.lookAhead = lookAhead;
    this.parent = parent;
  }
  /// @internal
  toString() {
    return `[${this.stack.filter((_, i) => i % 3 == 0).concat(this.state)}]@${this.pos}${this.score ? "!" + this.score : ""}`;
  }
  // Start an empty stack
  /// @internal
  static start(p, state, pos = 0) {
    let cx = p.parser.context;
    return new Stack(p, [], state, pos, pos, 0, [], 0, cx ? new StackContext(cx, cx.start) : null, 0, null);
  }
  /// The stack's current [context](#lr.ContextTracker) value, if
  /// any. Its type will depend on the context tracker's type
  /// parameter, or it will be `null` if there is no context
  /// tracker.
  get context() {
    return this.curContext ? this.curContext.context : null;
  }
  // Push a state onto the stack, tracking its start position as well
  // as the buffer base at that point.
  /// @internal
  pushState(state, start) {
    this.stack.push(this.state, start, this.bufferBase + this.buffer.length);
    this.state = state;
  }
  // Apply a reduce action
  /// @internal
  reduce(action) {
    var _a2;
    let depth = action >> 19, type = action & 65535;
    let { parser: parser2 } = this.p;
    let dPrec = parser2.dynamicPrecedence(type);
    if (dPrec)
      this.score += dPrec;
    if (depth == 0) {
      this.pushState(parser2.getGoto(this.state, type, true), this.reducePos);
      if (type < parser2.minRepeatTerm)
        this.storeNode(type, this.reducePos, this.reducePos, 4, true);
      this.reduceContext(type, this.reducePos);
      return;
    }
    let base2 = this.stack.length - (depth - 1) * 3 - (action & 262144 ? 6 : 0);
    let start = base2 ? this.stack[base2 - 2] : this.p.ranges[0].from, size = this.reducePos - start;
    if (size >= 2e3 && !((_a2 = this.p.parser.nodeSet.types[type]) === null || _a2 === void 0 ? void 0 : _a2.isAnonymous)) {
      if (start == this.p.lastBigReductionStart) {
        this.p.bigReductionCount++;
        this.p.lastBigReductionSize = size;
      } else if (this.p.lastBigReductionSize < size) {
        this.p.bigReductionCount = 1;
        this.p.lastBigReductionStart = start;
        this.p.lastBigReductionSize = size;
      }
    }
    let bufferBase = base2 ? this.stack[base2 - 1] : 0, count = this.bufferBase + this.buffer.length - bufferBase;
    if (type < parser2.minRepeatTerm || action & 131072) {
      let pos = parser2.stateFlag(
        this.state,
        1
        /* StateFlag.Skipped */
      ) ? this.pos : this.reducePos;
      this.storeNode(type, start, pos, count + 4, true);
    }
    if (action & 262144) {
      this.state = this.stack[base2];
    } else {
      let baseStateID = this.stack[base2 - 3];
      this.state = parser2.getGoto(baseStateID, type, true);
    }
    while (this.stack.length > base2)
      this.stack.pop();
    this.reduceContext(type, start);
  }
  // Shift a value into the buffer
  /// @internal
  storeNode(term, start, end, size = 4, isReduce = false) {
    if (term == 0 && (!this.stack.length || this.stack[this.stack.length - 1] < this.buffer.length + this.bufferBase)) {
      let cur2 = this, top2 = this.buffer.length;
      if (top2 == 0 && cur2.parent) {
        top2 = cur2.bufferBase - cur2.parent.bufferBase;
        cur2 = cur2.parent;
      }
      if (top2 > 0 && cur2.buffer[top2 - 4] == 0 && cur2.buffer[top2 - 1] > -1) {
        if (start == end)
          return;
        if (cur2.buffer[top2 - 2] >= start) {
          cur2.buffer[top2 - 2] = end;
          return;
        }
      }
    }
    if (!isReduce || this.pos == end) {
      this.buffer.push(term, start, end, size);
    } else {
      let index = this.buffer.length;
      if (index > 0 && this.buffer[index - 4] != 0)
        while (index > 0 && this.buffer[index - 2] > end) {
          this.buffer[index] = this.buffer[index - 4];
          this.buffer[index + 1] = this.buffer[index - 3];
          this.buffer[index + 2] = this.buffer[index - 2];
          this.buffer[index + 3] = this.buffer[index - 1];
          index -= 4;
          if (size > 4)
            size -= 4;
        }
      this.buffer[index] = term;
      this.buffer[index + 1] = start;
      this.buffer[index + 2] = end;
      this.buffer[index + 3] = size;
    }
  }
  // Apply a shift action
  /// @internal
  shift(action, next, nextEnd) {
    let start = this.pos;
    if (action & 131072) {
      this.pushState(action & 65535, this.pos);
    } else if ((action & 262144) == 0) {
      let nextState = action, { parser: parser2 } = this.p;
      if (nextEnd > this.pos || next <= parser2.maxNode) {
        this.pos = nextEnd;
        if (!parser2.stateFlag(
          nextState,
          1
          /* StateFlag.Skipped */
        ))
          this.reducePos = nextEnd;
      }
      this.pushState(nextState, start);
      this.shiftContext(next, start);
      if (next <= parser2.maxNode)
        this.buffer.push(next, start, nextEnd, 4);
    } else {
      this.pos = nextEnd;
      this.shiftContext(next, start);
      if (next <= this.p.parser.maxNode)
        this.buffer.push(next, start, nextEnd, 4);
    }
  }
  // Apply an action
  /// @internal
  apply(action, next, nextEnd) {
    if (action & 65536)
      this.reduce(action);
    else
      this.shift(action, next, nextEnd);
  }
  // Add a prebuilt (reused) node into the buffer.
  /// @internal
  useNode(value, next) {
    let index = this.p.reused.length - 1;
    if (index < 0 || this.p.reused[index] != value) {
      this.p.reused.push(value);
      index++;
    }
    let start = this.pos;
    this.reducePos = this.pos = start + value.length;
    this.pushState(next, start);
    this.buffer.push(
      index,
      start,
      this.reducePos,
      -1
      /* size == -1 means this is a reused value */
    );
    if (this.curContext)
      this.updateContext(this.curContext.tracker.reuse(this.curContext.context, value, this, this.p.stream.reset(this.pos - value.length)));
  }
  // Split the stack. Due to the buffer sharing and the fact
  // that `this.stack` tends to stay quite shallow, this isn't very
  // expensive.
  /// @internal
  split() {
    let parent = this;
    let off = parent.buffer.length;
    while (off > 0 && parent.buffer[off - 2] > parent.reducePos)
      off -= 4;
    let buffer = parent.buffer.slice(off), base2 = parent.bufferBase + off;
    while (parent && base2 == parent.bufferBase)
      parent = parent.parent;
    return new Stack(this.p, this.stack.slice(), this.state, this.reducePos, this.pos, this.score, buffer, base2, this.curContext, this.lookAhead, parent);
  }
  // Try to recover from an error by 'deleting' (ignoring) one token.
  /// @internal
  recoverByDelete(next, nextEnd) {
    let isNode = next <= this.p.parser.maxNode;
    if (isNode)
      this.storeNode(next, this.pos, nextEnd, 4);
    this.storeNode(0, this.pos, nextEnd, isNode ? 8 : 4);
    this.pos = this.reducePos = nextEnd;
    this.score -= 190;
  }
  /// Check if the given term would be able to be shifted (optionally
  /// after some reductions) on this stack. This can be useful for
  /// external tokenizers that want to make sure they only provide a
  /// given token when it applies.
  canShift(term) {
    for (let sim = new SimulatedStack(this); ; ) {
      let action = this.p.parser.stateSlot(
        sim.state,
        4
        /* ParseState.DefaultReduce */
      ) || this.p.parser.hasAction(sim.state, term);
      if (action == 0)
        return false;
      if ((action & 65536) == 0)
        return true;
      sim.reduce(action);
    }
  }
  // Apply up to Recover.MaxNext recovery actions that conceptually
  // inserts some missing token or rule.
  /// @internal
  recoverByInsert(next) {
    if (this.stack.length >= 300)
      return [];
    let nextStates = this.p.parser.nextStates(this.state);
    if (nextStates.length > 4 << 1 || this.stack.length >= 120) {
      let best = [];
      for (let i = 0, s; i < nextStates.length; i += 2) {
        if ((s = nextStates[i + 1]) != this.state && this.p.parser.hasAction(s, next))
          best.push(nextStates[i], s);
      }
      if (this.stack.length < 120)
        for (let i = 0; best.length < 4 << 1 && i < nextStates.length; i += 2) {
          let s = nextStates[i + 1];
          if (!best.some((v, i2) => i2 & 1 && v == s))
            best.push(nextStates[i], s);
        }
      nextStates = best;
    }
    let result = [];
    for (let i = 0; i < nextStates.length && result.length < 4; i += 2) {
      let s = nextStates[i + 1];
      if (s == this.state)
        continue;
      let stack = this.split();
      stack.pushState(s, this.pos);
      stack.storeNode(0, stack.pos, stack.pos, 4, true);
      stack.shiftContext(nextStates[i], this.pos);
      stack.score -= 200;
      result.push(stack);
    }
    return result;
  }
  // Force a reduce, if possible. Return false if that can't
  // be done.
  /// @internal
  forceReduce() {
    let reduce = this.p.parser.stateSlot(
      this.state,
      5
      /* ParseState.ForcedReduce */
    );
    if ((reduce & 65536) == 0)
      return false;
    let { parser: parser2 } = this.p;
    if (!parser2.validAction(this.state, reduce)) {
      let depth = reduce >> 19, term = reduce & 65535;
      let target = this.stack.length - depth * 3;
      if (target < 0 || parser2.getGoto(this.stack[target], term, false) < 0)
        return false;
      this.storeNode(0, this.reducePos, this.reducePos, 4, true);
      this.score -= 100;
    }
    this.reducePos = this.pos;
    this.reduce(reduce);
    return true;
  }
  /// @internal
  forceAll() {
    while (!this.p.parser.stateFlag(
      this.state,
      2
      /* StateFlag.Accepting */
    )) {
      if (!this.forceReduce()) {
        this.storeNode(0, this.pos, this.pos, 4, true);
        break;
      }
    }
    return this;
  }
  /// Check whether this state has no further actions (assumed to be a direct descendant of the
  /// top state, since any other states must be able to continue
  /// somehow). @internal
  get deadEnd() {
    if (this.stack.length != 3)
      return false;
    let { parser: parser2 } = this.p;
    return parser2.data[parser2.stateSlot(
      this.state,
      1
      /* ParseState.Actions */
    )] == 65535 && !parser2.stateSlot(
      this.state,
      4
      /* ParseState.DefaultReduce */
    );
  }
  /// Restart the stack (put it back in its start state). Only safe
  /// when this.stack.length == 3 (state is directly below the top
  /// state). @internal
  restart() {
    this.state = this.stack[0];
    this.stack.length = 0;
  }
  /// @internal
  sameState(other) {
    if (this.state != other.state || this.stack.length != other.stack.length)
      return false;
    for (let i = 0; i < this.stack.length; i += 3)
      if (this.stack[i] != other.stack[i])
        return false;
    return true;
  }
  /// Get the parser used by this stack.
  get parser() {
    return this.p.parser;
  }
  /// Test whether a given dialect (by numeric ID, as exported from
  /// the terms file) is enabled.
  dialectEnabled(dialectID) {
    return this.p.parser.dialect.flags[dialectID];
  }
  shiftContext(term, start) {
    if (this.curContext)
      this.updateContext(this.curContext.tracker.shift(this.curContext.context, term, this, this.p.stream.reset(start)));
  }
  reduceContext(term, start) {
    if (this.curContext)
      this.updateContext(this.curContext.tracker.reduce(this.curContext.context, term, this, this.p.stream.reset(start)));
  }
  /// @internal
  emitContext() {
    let last = this.buffer.length - 1;
    if (last < 0 || this.buffer[last] != -3)
      this.buffer.push(this.curContext.hash, this.reducePos, this.reducePos, -3);
  }
  /// @internal
  emitLookAhead() {
    let last = this.buffer.length - 1;
    if (last < 0 || this.buffer[last] != -4)
      this.buffer.push(this.lookAhead, this.reducePos, this.reducePos, -4);
  }
  updateContext(context) {
    if (context != this.curContext.context) {
      let newCx = new StackContext(this.curContext.tracker, context);
      if (newCx.hash != this.curContext.hash)
        this.emitContext();
      this.curContext = newCx;
    }
  }
  /// @internal
  setLookAhead(lookAhead) {
    if (lookAhead > this.lookAhead) {
      this.emitLookAhead();
      this.lookAhead = lookAhead;
    }
  }
  /// @internal
  close() {
    if (this.curContext && this.curContext.tracker.strict)
      this.emitContext();
    if (this.lookAhead > 0)
      this.emitLookAhead();
  }
}
class StackContext {
  constructor(tracker, context) {
    this.tracker = tracker;
    this.context = context;
    this.hash = tracker.strict ? tracker.hash(context) : 0;
  }
}
var Recover;
(function(Recover2) {
  Recover2[Recover2["Insert"] = 200] = "Insert";
  Recover2[Recover2["Delete"] = 190] = "Delete";
  Recover2[Recover2["Reduce"] = 100] = "Reduce";
  Recover2[Recover2["MaxNext"] = 4] = "MaxNext";
  Recover2[Recover2["MaxInsertStackDepth"] = 300] = "MaxInsertStackDepth";
  Recover2[Recover2["DampenInsertStackDepth"] = 120] = "DampenInsertStackDepth";
  Recover2[Recover2["MinBigReduction"] = 2e3] = "MinBigReduction";
})(Recover || (Recover = {}));
class SimulatedStack {
  constructor(start) {
    this.start = start;
    this.state = start.state;
    this.stack = start.stack;
    this.base = this.stack.length;
  }
  reduce(action) {
    let term = action & 65535, depth = action >> 19;
    if (depth == 0) {
      if (this.stack == this.start.stack)
        this.stack = this.stack.slice();
      this.stack.push(this.state, 0, 0);
      this.base += 3;
    } else {
      this.base -= (depth - 1) * 3;
    }
    let goto = this.start.p.parser.getGoto(this.stack[this.base - 3], term, true);
    this.state = goto;
  }
}
class StackBufferCursor {
  constructor(stack, pos, index) {
    this.stack = stack;
    this.pos = pos;
    this.index = index;
    this.buffer = stack.buffer;
    if (this.index == 0)
      this.maybeNext();
  }
  static create(stack, pos = stack.bufferBase + stack.buffer.length) {
    return new StackBufferCursor(stack, pos, pos - stack.bufferBase);
  }
  maybeNext() {
    let next = this.stack.parent;
    if (next != null) {
      this.index = this.stack.bufferBase - next.bufferBase;
      this.stack = next;
      this.buffer = next.buffer;
    }
  }
  get id() {
    return this.buffer[this.index - 4];
  }
  get start() {
    return this.buffer[this.index - 3];
  }
  get end() {
    return this.buffer[this.index - 2];
  }
  get size() {
    return this.buffer[this.index - 1];
  }
  next() {
    this.index -= 4;
    this.pos -= 4;
    if (this.index == 0)
      this.maybeNext();
  }
  fork() {
    return new StackBufferCursor(this.stack, this.pos, this.index);
  }
}
function decodeArray(input, Type = Uint16Array) {
  if (typeof input != "string")
    return input;
  let array = null;
  for (let pos = 0, out = 0; pos < input.length; ) {
    let value = 0;
    for (; ; ) {
      let next = input.charCodeAt(pos++), stop = false;
      if (next == 126) {
        value = 65535;
        break;
      }
      if (next >= 92)
        next--;
      if (next >= 34)
        next--;
      let digit = next - 32;
      if (digit >= 46) {
        digit -= 46;
        stop = true;
      }
      value += digit;
      if (stop)
        break;
      value *= 46;
    }
    if (array)
      array[out++] = value;
    else
      array = new Type(value);
  }
  return array;
}
class CachedToken {
  constructor() {
    this.start = -1;
    this.value = -1;
    this.end = -1;
    this.extended = -1;
    this.lookAhead = 0;
    this.mask = 0;
    this.context = 0;
  }
}
const nullToken = new CachedToken();
class InputStream {
  /// @internal
  constructor(input, ranges) {
    this.input = input;
    this.ranges = ranges;
    this.chunk = "";
    this.chunkOff = 0;
    this.chunk2 = "";
    this.chunk2Pos = 0;
    this.next = -1;
    this.token = nullToken;
    this.rangeIndex = 0;
    this.pos = this.chunkPos = ranges[0].from;
    this.range = ranges[0];
    this.end = ranges[ranges.length - 1].to;
    this.readNext();
  }
  /// @internal
  resolveOffset(offset, assoc) {
    let range = this.range, index = this.rangeIndex;
    let pos = this.pos + offset;
    while (pos < range.from) {
      if (!index)
        return null;
      let next = this.ranges[--index];
      pos -= range.from - next.to;
      range = next;
    }
    while (assoc < 0 ? pos > range.to : pos >= range.to) {
      if (index == this.ranges.length - 1)
        return null;
      let next = this.ranges[++index];
      pos += next.from - range.to;
      range = next;
    }
    return pos;
  }
  /// @internal
  clipPos(pos) {
    if (pos >= this.range.from && pos < this.range.to)
      return pos;
    for (let range of this.ranges)
      if (range.to > pos)
        return Math.max(pos, range.from);
    return this.end;
  }
  /// Look at a code unit near the stream position. `.peek(0)` equals
  /// `.next`, `.peek(-1)` gives you the previous character, and so
  /// on.
  ///
  /// Note that looking around during tokenizing creates dependencies
  /// on potentially far-away content, which may reduce the
  /// effectiveness incremental parsing—when looking forward—or even
  /// cause invalid reparses when looking backward more than 25 code
  /// units, since the library does not track lookbehind.
  peek(offset) {
    let idx = this.chunkOff + offset, pos, result;
    if (idx >= 0 && idx < this.chunk.length) {
      pos = this.pos + offset;
      result = this.chunk.charCodeAt(idx);
    } else {
      let resolved = this.resolveOffset(offset, 1);
      if (resolved == null)
        return -1;
      pos = resolved;
      if (pos >= this.chunk2Pos && pos < this.chunk2Pos + this.chunk2.length) {
        result = this.chunk2.charCodeAt(pos - this.chunk2Pos);
      } else {
        let i = this.rangeIndex, range = this.range;
        while (range.to <= pos)
          range = this.ranges[++i];
        this.chunk2 = this.input.chunk(this.chunk2Pos = pos);
        if (pos + this.chunk2.length > range.to)
          this.chunk2 = this.chunk2.slice(0, range.to - pos);
        result = this.chunk2.charCodeAt(0);
      }
    }
    if (pos >= this.token.lookAhead)
      this.token.lookAhead = pos + 1;
    return result;
  }
  /// Accept a token. By default, the end of the token is set to the
  /// current stream position, but you can pass an offset (relative to
  /// the stream position) to change that.
  acceptToken(token, endOffset = 0) {
    let end = endOffset ? this.resolveOffset(endOffset, -1) : this.pos;
    if (end == null || end < this.token.start)
      throw new RangeError("Token end out of bounds");
    this.token.value = token;
    this.token.end = end;
  }
  getChunk() {
    if (this.pos >= this.chunk2Pos && this.pos < this.chunk2Pos + this.chunk2.length) {
      let { chunk, chunkPos } = this;
      this.chunk = this.chunk2;
      this.chunkPos = this.chunk2Pos;
      this.chunk2 = chunk;
      this.chunk2Pos = chunkPos;
      this.chunkOff = this.pos - this.chunkPos;
    } else {
      this.chunk2 = this.chunk;
      this.chunk2Pos = this.chunkPos;
      let nextChunk = this.input.chunk(this.pos);
      let end = this.pos + nextChunk.length;
      this.chunk = end > this.range.to ? nextChunk.slice(0, this.range.to - this.pos) : nextChunk;
      this.chunkPos = this.pos;
      this.chunkOff = 0;
    }
  }
  readNext() {
    if (this.chunkOff >= this.chunk.length) {
      this.getChunk();
      if (this.chunkOff == this.chunk.length)
        return this.next = -1;
    }
    return this.next = this.chunk.charCodeAt(this.chunkOff);
  }
  /// Move the stream forward N (defaults to 1) code units. Returns
  /// the new value of [`next`](#lr.InputStream.next).
  advance(n = 1) {
    this.chunkOff += n;
    while (this.pos + n >= this.range.to) {
      if (this.rangeIndex == this.ranges.length - 1)
        return this.setDone();
      n -= this.range.to - this.pos;
      this.range = this.ranges[++this.rangeIndex];
      this.pos = this.range.from;
    }
    this.pos += n;
    if (this.pos >= this.token.lookAhead)
      this.token.lookAhead = this.pos + 1;
    return this.readNext();
  }
  setDone() {
    this.pos = this.chunkPos = this.end;
    this.range = this.ranges[this.rangeIndex = this.ranges.length - 1];
    this.chunk = "";
    return this.next = -1;
  }
  /// @internal
  reset(pos, token) {
    if (token) {
      this.token = token;
      token.start = pos;
      token.lookAhead = pos + 1;
      token.value = token.extended = -1;
    } else {
      this.token = nullToken;
    }
    if (this.pos != pos) {
      this.pos = pos;
      if (pos == this.end) {
        this.setDone();
        return this;
      }
      while (pos < this.range.from)
        this.range = this.ranges[--this.rangeIndex];
      while (pos >= this.range.to)
        this.range = this.ranges[++this.rangeIndex];
      if (pos >= this.chunkPos && pos < this.chunkPos + this.chunk.length) {
        this.chunkOff = pos - this.chunkPos;
      } else {
        this.chunk = "";
        this.chunkOff = 0;
      }
      this.readNext();
    }
    return this;
  }
  /// @internal
  read(from, to) {
    if (from >= this.chunkPos && to <= this.chunkPos + this.chunk.length)
      return this.chunk.slice(from - this.chunkPos, to - this.chunkPos);
    if (from >= this.chunk2Pos && to <= this.chunk2Pos + this.chunk2.length)
      return this.chunk2.slice(from - this.chunk2Pos, to - this.chunk2Pos);
    if (from >= this.range.from && to <= this.range.to)
      return this.input.read(from, to);
    let result = "";
    for (let r of this.ranges) {
      if (r.from >= to)
        break;
      if (r.to > from)
        result += this.input.read(Math.max(r.from, from), Math.min(r.to, to));
    }
    return result;
  }
}
class TokenGroup {
  constructor(data, id2) {
    this.data = data;
    this.id = id2;
  }
  token(input, stack) {
    let { parser: parser2 } = stack.p;
    readToken(this.data, input, stack, this.id, parser2.data, parser2.tokenPrecTable);
  }
}
TokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
class LocalTokenGroup {
  constructor(data, precTable, elseToken) {
    this.precTable = precTable;
    this.elseToken = elseToken;
    this.data = typeof data == "string" ? decodeArray(data) : data;
  }
  token(input, stack) {
    let start = input.pos, cur2;
    for (; ; ) {
      cur2 = input.pos;
      readToken(this.data, input, stack, 0, this.data, this.precTable);
      if (input.token.value > -1)
        break;
      if (this.elseToken == null)
        return;
      if (input.next < 0)
        break;
      input.advance();
      input.reset(cur2 + 1, input.token);
    }
    if (cur2 > start) {
      input.reset(start, input.token);
      input.acceptToken(this.elseToken, cur2 - start);
    }
  }
}
LocalTokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
class ExternalTokenizer {
  /// Create a tokenizer. The first argument is the function that,
  /// given an input stream, scans for the types of tokens it
  /// recognizes at the stream's position, and calls
  /// [`acceptToken`](#lr.InputStream.acceptToken) when it finds
  /// one.
  constructor(token, options = {}) {
    this.token = token;
    this.contextual = !!options.contextual;
    this.fallback = !!options.fallback;
    this.extend = !!options.extend;
  }
}
function readToken(data, input, stack, group, precTable, precOffset) {
  let state = 0, groupMask = 1 << group, { dialect } = stack.p.parser;
  scan:
    for (; ; ) {
      if ((groupMask & data[state]) == 0)
        break;
      let accEnd = data[state + 1];
      for (let i = state + 3; i < accEnd; i += 2)
        if ((data[i + 1] & groupMask) > 0) {
          let term = data[i];
          if (dialect.allows(term) && (input.token.value == -1 || input.token.value == term || overrides(term, input.token.value, precTable, precOffset))) {
            input.acceptToken(term);
            break;
          }
        }
      let next = input.next, low = 0, high = data[state + 2];
      if (input.next < 0 && high > low && data[accEnd + high * 3 - 3] == 65535 && data[accEnd + high * 3 - 3] == 65535) {
        state = data[accEnd + high * 3 - 1];
        continue scan;
      }
      for (; low < high; ) {
        let mid = low + high >> 1;
        let index = accEnd + mid + (mid << 1);
        let from = data[index], to = data[index + 1] || 65536;
        if (next < from)
          high = mid;
        else if (next >= to)
          low = mid + 1;
        else {
          state = data[index + 2];
          input.advance();
          continue scan;
        }
      }
      break;
    }
}
function findOffset(data, start, term) {
  for (let i = start, next; (next = data[i]) != 65535; i++)
    if (next == term)
      return i - start;
  return -1;
}
function overrides(token, prev, tableData, tableOffset) {
  let iPrev = findOffset(tableData, tableOffset, prev);
  return iPrev < 0 || findOffset(tableData, tableOffset, token) < iPrev;
}
const verbose = typeof process != "undefined" && process.env && /\bparse\b/.test({}.LOG);
let stackIDs = null;
var Safety;
(function(Safety2) {
  Safety2[Safety2["Margin"] = 25] = "Margin";
})(Safety || (Safety = {}));
function cutAt(tree, pos, side) {
  let cursor = tree.cursor(IterMode.IncludeAnonymous);
  cursor.moveTo(pos);
  for (; ; ) {
    if (!(side < 0 ? cursor.childBefore(pos) : cursor.childAfter(pos)))
      for (; ; ) {
        if ((side < 0 ? cursor.to < pos : cursor.from > pos) && !cursor.type.isError)
          return side < 0 ? Math.max(0, Math.min(
            cursor.to - 1,
            pos - 25
            /* Safety.Margin */
          )) : Math.min(tree.length, Math.max(
            cursor.from + 1,
            pos + 25
            /* Safety.Margin */
          ));
        if (side < 0 ? cursor.prevSibling() : cursor.nextSibling())
          break;
        if (!cursor.parent())
          return side < 0 ? 0 : tree.length;
      }
  }
}
class FragmentCursor {
  constructor(fragments, nodeSet) {
    this.fragments = fragments;
    this.nodeSet = nodeSet;
    this.i = 0;
    this.fragment = null;
    this.safeFrom = -1;
    this.safeTo = -1;
    this.trees = [];
    this.start = [];
    this.index = [];
    this.nextFragment();
  }
  nextFragment() {
    let fr = this.fragment = this.i == this.fragments.length ? null : this.fragments[this.i++];
    if (fr) {
      this.safeFrom = fr.openStart ? cutAt(fr.tree, fr.from + fr.offset, 1) - fr.offset : fr.from;
      this.safeTo = fr.openEnd ? cutAt(fr.tree, fr.to + fr.offset, -1) - fr.offset : fr.to;
      while (this.trees.length) {
        this.trees.pop();
        this.start.pop();
        this.index.pop();
      }
      this.trees.push(fr.tree);
      this.start.push(-fr.offset);
      this.index.push(0);
      this.nextStart = this.safeFrom;
    } else {
      this.nextStart = 1e9;
    }
  }
  // `pos` must be >= any previously given `pos` for this cursor
  nodeAt(pos) {
    if (pos < this.nextStart)
      return null;
    while (this.fragment && this.safeTo <= pos)
      this.nextFragment();
    if (!this.fragment)
      return null;
    for (; ; ) {
      let last = this.trees.length - 1;
      if (last < 0) {
        this.nextFragment();
        return null;
      }
      let top2 = this.trees[last], index = this.index[last];
      if (index == top2.children.length) {
        this.trees.pop();
        this.start.pop();
        this.index.pop();
        continue;
      }
      let next = top2.children[index];
      let start = this.start[last] + top2.positions[index];
      if (start > pos) {
        this.nextStart = start;
        return null;
      }
      if (next instanceof Tree) {
        if (start == pos) {
          if (start < this.safeFrom)
            return null;
          let end = start + next.length;
          if (end <= this.safeTo) {
            let lookAhead = next.prop(NodeProp.lookAhead);
            if (!lookAhead || end + lookAhead < this.fragment.to)
              return next;
          }
        }
        this.index[last]++;
        if (start + next.length >= Math.max(this.safeFrom, pos)) {
          this.trees.push(next);
          this.start.push(start);
          this.index.push(0);
        }
      } else {
        this.index[last]++;
        this.nextStart = start + next.length;
      }
    }
  }
}
class TokenCache {
  constructor(parser2, stream) {
    this.stream = stream;
    this.tokens = [];
    this.mainToken = null;
    this.actions = [];
    this.tokens = parser2.tokenizers.map((_) => new CachedToken());
  }
  getActions(stack) {
    let actionIndex = 0;
    let main = null;
    let { parser: parser2 } = stack.p, { tokenizers } = parser2;
    let mask = parser2.stateSlot(
      stack.state,
      3
      /* ParseState.TokenizerMask */
    );
    let context = stack.curContext ? stack.curContext.hash : 0;
    let lookAhead = 0;
    for (let i = 0; i < tokenizers.length; i++) {
      if ((1 << i & mask) == 0)
        continue;
      let tokenizer = tokenizers[i], token = this.tokens[i];
      if (main && !tokenizer.fallback)
        continue;
      if (tokenizer.contextual || token.start != stack.pos || token.mask != mask || token.context != context) {
        this.updateCachedToken(token, tokenizer, stack);
        token.mask = mask;
        token.context = context;
      }
      if (token.lookAhead > token.end + 25)
        lookAhead = Math.max(token.lookAhead, lookAhead);
      if (token.value != 0) {
        let startIndex = actionIndex;
        if (token.extended > -1)
          actionIndex = this.addActions(stack, token.extended, token.end, actionIndex);
        actionIndex = this.addActions(stack, token.value, token.end, actionIndex);
        if (!tokenizer.extend) {
          main = token;
          if (actionIndex > startIndex)
            break;
        }
      }
    }
    while (this.actions.length > actionIndex)
      this.actions.pop();
    if (lookAhead)
      stack.setLookAhead(lookAhead);
    if (!main && stack.pos == this.stream.end) {
      main = new CachedToken();
      main.value = stack.p.parser.eofTerm;
      main.start = main.end = stack.pos;
      actionIndex = this.addActions(stack, main.value, main.end, actionIndex);
    }
    this.mainToken = main;
    return this.actions;
  }
  getMainToken(stack) {
    if (this.mainToken)
      return this.mainToken;
    let main = new CachedToken(), { pos, p } = stack;
    main.start = pos;
    main.end = Math.min(pos + 1, p.stream.end);
    main.value = pos == p.stream.end ? p.parser.eofTerm : 0;
    return main;
  }
  updateCachedToken(token, tokenizer, stack) {
    let start = this.stream.clipPos(stack.pos);
    tokenizer.token(this.stream.reset(start, token), stack);
    if (token.value > -1) {
      let { parser: parser2 } = stack.p;
      for (let i = 0; i < parser2.specialized.length; i++)
        if (parser2.specialized[i] == token.value) {
          let result = parser2.specializers[i](this.stream.read(token.start, token.end), stack);
          if (result >= 0 && stack.p.parser.dialect.allows(result >> 1)) {
            if ((result & 1) == 0)
              token.value = result >> 1;
            else
              token.extended = result >> 1;
            break;
          }
        }
    } else {
      token.value = 0;
      token.end = this.stream.clipPos(start + 1);
    }
  }
  putAction(action, token, end, index) {
    for (let i = 0; i < index; i += 3)
      if (this.actions[i] == action)
        return index;
    this.actions[index++] = action;
    this.actions[index++] = token;
    this.actions[index++] = end;
    return index;
  }
  addActions(stack, token, end, index) {
    let { state } = stack, { parser: parser2 } = stack.p, { data } = parser2;
    for (let set = 0; set < 2; set++) {
      for (let i = parser2.stateSlot(
        state,
        set ? 2 : 1
        /* ParseState.Actions */
      ); ; i += 3) {
        if (data[i] == 65535) {
          if (data[i + 1] == 1) {
            i = pair(data, i + 2);
          } else {
            if (index == 0 && data[i + 1] == 2)
              index = this.putAction(pair(data, i + 2), token, end, index);
            break;
          }
        }
        if (data[i] == token)
          index = this.putAction(pair(data, i + 1), token, end, index);
      }
    }
    return index;
  }
}
var Rec;
(function(Rec2) {
  Rec2[Rec2["Distance"] = 5] = "Distance";
  Rec2[Rec2["MaxRemainingPerStep"] = 3] = "MaxRemainingPerStep";
  Rec2[Rec2["MinBufferLengthPrune"] = 500] = "MinBufferLengthPrune";
  Rec2[Rec2["ForceReduceLimit"] = 10] = "ForceReduceLimit";
  Rec2[Rec2["CutDepth"] = 15e3] = "CutDepth";
  Rec2[Rec2["CutTo"] = 9e3] = "CutTo";
  Rec2[Rec2["MaxLeftAssociativeReductionCount"] = 300] = "MaxLeftAssociativeReductionCount";
  Rec2[Rec2["MaxStackCount"] = 12] = "MaxStackCount";
})(Rec || (Rec = {}));
class Parse {
  constructor(parser2, input, fragments, ranges) {
    this.parser = parser2;
    this.input = input;
    this.ranges = ranges;
    this.recovering = 0;
    this.nextStackID = 9812;
    this.minStackPos = 0;
    this.reused = [];
    this.stoppedAt = null;
    this.lastBigReductionStart = -1;
    this.lastBigReductionSize = 0;
    this.bigReductionCount = 0;
    this.stream = new InputStream(input, ranges);
    this.tokens = new TokenCache(parser2, this.stream);
    this.topTerm = parser2.top[1];
    let { from } = ranges[0];
    this.stacks = [Stack.start(this, parser2.top[0], from)];
    this.fragments = fragments.length && this.stream.end - from > parser2.bufferLength * 4 ? new FragmentCursor(fragments, parser2.nodeSet) : null;
  }
  get parsedPos() {
    return this.minStackPos;
  }
  // Move the parser forward. This will process all parse stacks at
  // `this.pos` and try to advance them to a further position. If no
  // stack for such a position is found, it'll start error-recovery.
  //
  // When the parse is finished, this will return a syntax tree. When
  // not, it returns `null`.
  advance() {
    let stacks = this.stacks, pos = this.minStackPos;
    let newStacks = this.stacks = [];
    let stopped, stoppedTokens;
    if (this.bigReductionCount > 300 && stacks.length == 1) {
      let [s] = stacks;
      while (s.forceReduce() && s.stack.length && s.stack[s.stack.length - 2] >= this.lastBigReductionStart) {
      }
      this.bigReductionCount = this.lastBigReductionSize = 0;
    }
    for (let i = 0; i < stacks.length; i++) {
      let stack = stacks[i];
      for (; ; ) {
        this.tokens.mainToken = null;
        if (stack.pos > pos) {
          newStacks.push(stack);
        } else if (this.advanceStack(stack, newStacks, stacks)) {
          continue;
        } else {
          if (!stopped) {
            stopped = [];
            stoppedTokens = [];
          }
          stopped.push(stack);
          let tok = this.tokens.getMainToken(stack);
          stoppedTokens.push(tok.value, tok.end);
        }
        break;
      }
    }
    if (!newStacks.length) {
      let finished = stopped && findFinished(stopped);
      if (finished)
        return this.stackToTree(finished);
      if (this.parser.strict) {
        if (verbose && stopped)
          console.log("Stuck with token " + (this.tokens.mainToken ? this.parser.getName(this.tokens.mainToken.value) : "none"));
        throw new SyntaxError("No parse at " + pos);
      }
      if (!this.recovering)
        this.recovering = 5;
    }
    if (this.recovering && stopped) {
      let finished = this.stoppedAt != null && stopped[0].pos > this.stoppedAt ? stopped[0] : this.runRecovery(stopped, stoppedTokens, newStacks);
      if (finished)
        return this.stackToTree(finished.forceAll());
    }
    if (this.recovering) {
      let maxRemaining = this.recovering == 1 ? 1 : this.recovering * 3;
      if (newStacks.length > maxRemaining) {
        newStacks.sort((a, b) => b.score - a.score);
        while (newStacks.length > maxRemaining)
          newStacks.pop();
      }
      if (newStacks.some((s) => s.reducePos > pos))
        this.recovering--;
    } else if (newStacks.length > 1) {
      outer:
        for (let i = 0; i < newStacks.length - 1; i++) {
          let stack = newStacks[i];
          for (let j = i + 1; j < newStacks.length; j++) {
            let other = newStacks[j];
            if (stack.sameState(other) || stack.buffer.length > 500 && other.buffer.length > 500) {
              if ((stack.score - other.score || stack.buffer.length - other.buffer.length) > 0) {
                newStacks.splice(j--, 1);
              } else {
                newStacks.splice(i--, 1);
                continue outer;
              }
            }
          }
        }
      if (newStacks.length > 12)
        newStacks.splice(
          12,
          newStacks.length - 12
          /* Rec.MaxStackCount */
        );
    }
    this.minStackPos = newStacks[0].pos;
    for (let i = 1; i < newStacks.length; i++)
      if (newStacks[i].pos < this.minStackPos)
        this.minStackPos = newStacks[i].pos;
    return null;
  }
  stopAt(pos) {
    if (this.stoppedAt != null && this.stoppedAt < pos)
      throw new RangeError("Can't move stoppedAt forward");
    this.stoppedAt = pos;
  }
  // Returns an updated version of the given stack, or null if the
  // stack can't advance normally. When `split` and `stacks` are
  // given, stacks split off by ambiguous operations will be pushed to
  // `split`, or added to `stacks` if they move `pos` forward.
  advanceStack(stack, stacks, split) {
    let start = stack.pos, { parser: parser2 } = this;
    let base2 = verbose ? this.stackID(stack) + " -> " : "";
    if (this.stoppedAt != null && start > this.stoppedAt)
      return stack.forceReduce() ? stack : null;
    if (this.fragments) {
      let strictCx = stack.curContext && stack.curContext.tracker.strict, cxHash = strictCx ? stack.curContext.hash : 0;
      for (let cached = this.fragments.nodeAt(start); cached; ) {
        let match = this.parser.nodeSet.types[cached.type.id] == cached.type ? parser2.getGoto(stack.state, cached.type.id) : -1;
        if (match > -1 && cached.length && (!strictCx || (cached.prop(NodeProp.contextHash) || 0) == cxHash)) {
          stack.useNode(cached, match);
          if (verbose)
            console.log(base2 + this.stackID(stack) + ` (via reuse of ${parser2.getName(cached.type.id)})`);
          return true;
        }
        if (!(cached instanceof Tree) || cached.children.length == 0 || cached.positions[0] > 0)
          break;
        let inner = cached.children[0];
        if (inner instanceof Tree && cached.positions[0] == 0)
          cached = inner;
        else
          break;
      }
    }
    let defaultReduce = parser2.stateSlot(
      stack.state,
      4
      /* ParseState.DefaultReduce */
    );
    if (defaultReduce > 0) {
      stack.reduce(defaultReduce);
      if (verbose)
        console.log(base2 + this.stackID(stack) + ` (via always-reduce ${parser2.getName(
          defaultReduce & 65535
          /* Action.ValueMask */
        )})`);
      return true;
    }
    if (stack.stack.length >= 15e3) {
      while (stack.stack.length > 9e3 && stack.forceReduce()) {
      }
    }
    let actions = this.tokens.getActions(stack);
    for (let i = 0; i < actions.length; ) {
      let action = actions[i++], term = actions[i++], end = actions[i++];
      let last = i == actions.length || !split;
      let localStack = last ? stack : stack.split();
      localStack.apply(action, term, end);
      if (verbose)
        console.log(base2 + this.stackID(localStack) + ` (via ${(action & 65536) == 0 ? "shift" : `reduce of ${parser2.getName(
          action & 65535
          /* Action.ValueMask */
        )}`} for ${parser2.getName(term)} @ ${start}${localStack == stack ? "" : ", split"})`);
      if (last)
        return true;
      else if (localStack.pos > start)
        stacks.push(localStack);
      else
        split.push(localStack);
    }
    return false;
  }
  // Advance a given stack forward as far as it will go. Returns the
  // (possibly updated) stack if it got stuck, or null if it moved
  // forward and was given to `pushStackDedup`.
  advanceFully(stack, newStacks) {
    let pos = stack.pos;
    for (; ; ) {
      if (!this.advanceStack(stack, null, null))
        return false;
      if (stack.pos > pos) {
        pushStackDedup(stack, newStacks);
        return true;
      }
    }
  }
  runRecovery(stacks, tokens, newStacks) {
    let finished = null, restarted = false;
    for (let i = 0; i < stacks.length; i++) {
      let stack = stacks[i], token = tokens[i << 1], tokenEnd = tokens[(i << 1) + 1];
      let base2 = verbose ? this.stackID(stack) + " -> " : "";
      if (stack.deadEnd) {
        if (restarted)
          continue;
        restarted = true;
        stack.restart();
        if (verbose)
          console.log(base2 + this.stackID(stack) + " (restarted)");
        let done = this.advanceFully(stack, newStacks);
        if (done)
          continue;
      }
      let force = stack.split(), forceBase = base2;
      for (let j = 0; force.forceReduce() && j < 10; j++) {
        if (verbose)
          console.log(forceBase + this.stackID(force) + " (via force-reduce)");
        let done = this.advanceFully(force, newStacks);
        if (done)
          break;
        if (verbose)
          forceBase = this.stackID(force) + " -> ";
      }
      for (let insert2 of stack.recoverByInsert(token)) {
        if (verbose)
          console.log(base2 + this.stackID(insert2) + " (via recover-insert)");
        this.advanceFully(insert2, newStacks);
      }
      if (this.stream.end > stack.pos) {
        if (tokenEnd == stack.pos) {
          tokenEnd++;
          token = 0;
        }
        stack.recoverByDelete(token, tokenEnd);
        if (verbose)
          console.log(base2 + this.stackID(stack) + ` (via recover-delete ${this.parser.getName(token)})`);
        pushStackDedup(stack, newStacks);
      } else if (!finished || finished.score < stack.score) {
        finished = stack;
      }
    }
    return finished;
  }
  // Convert the stack's buffer to a syntax tree.
  stackToTree(stack) {
    stack.close();
    return Tree.build({
      buffer: StackBufferCursor.create(stack),
      nodeSet: this.parser.nodeSet,
      topID: this.topTerm,
      maxBufferLength: this.parser.bufferLength,
      reused: this.reused,
      start: this.ranges[0].from,
      length: stack.pos - this.ranges[0].from,
      minRepeatType: this.parser.minRepeatTerm
    });
  }
  stackID(stack) {
    let id2 = (stackIDs || (stackIDs = /* @__PURE__ */ new WeakMap())).get(stack);
    if (!id2)
      stackIDs.set(stack, id2 = String.fromCodePoint(this.nextStackID++));
    return id2 + stack;
  }
}
function pushStackDedup(stack, newStacks) {
  for (let i = 0; i < newStacks.length; i++) {
    let other = newStacks[i];
    if (other.pos == stack.pos && other.sameState(stack)) {
      if (newStacks[i].score < stack.score)
        newStacks[i] = stack;
      return;
    }
  }
  newStacks.push(stack);
}
class Dialect {
  constructor(source, flags, disabled) {
    this.source = source;
    this.flags = flags;
    this.disabled = disabled;
  }
  allows(term) {
    return !this.disabled || this.disabled[term] == 0;
  }
}
const id = (x) => x;
class ContextTracker {
  /// Define a context tracker.
  constructor(spec) {
    this.start = spec.start;
    this.shift = spec.shift || id;
    this.reduce = spec.reduce || id;
    this.reuse = spec.reuse || id;
    this.hash = spec.hash || (() => 0);
    this.strict = spec.strict !== false;
  }
}
class LRParser extends Parser {
  /// @internal
  constructor(spec) {
    super();
    this.wrappers = [];
    if (spec.version != 14)
      throw new RangeError(`Parser version (${spec.version}) doesn't match runtime version (${14})`);
    let nodeNames = spec.nodeNames.split(" ");
    this.minRepeatTerm = nodeNames.length;
    for (let i = 0; i < spec.repeatNodeCount; i++)
      nodeNames.push("");
    let topTerms = Object.keys(spec.topRules).map((r) => spec.topRules[r][1]);
    let nodeProps = [];
    for (let i = 0; i < nodeNames.length; i++)
      nodeProps.push([]);
    function setProp(nodeID, prop, value) {
      nodeProps[nodeID].push([prop, prop.deserialize(String(value))]);
    }
    if (spec.nodeProps)
      for (let propSpec of spec.nodeProps) {
        let prop = propSpec[0];
        if (typeof prop == "string")
          prop = NodeProp[prop];
        for (let i = 1; i < propSpec.length; ) {
          let next = propSpec[i++];
          if (next >= 0) {
            setProp(next, prop, propSpec[i++]);
          } else {
            let value = propSpec[i + -next];
            for (let j = -next; j > 0; j--)
              setProp(propSpec[i++], prop, value);
            i++;
          }
        }
      }
    this.nodeSet = new NodeSet(nodeNames.map((name2, i) => NodeType.define({
      name: i >= this.minRepeatTerm ? void 0 : name2,
      id: i,
      props: nodeProps[i],
      top: topTerms.indexOf(i) > -1,
      error: i == 0,
      skipped: spec.skippedNodes && spec.skippedNodes.indexOf(i) > -1
    })));
    if (spec.propSources)
      this.nodeSet = this.nodeSet.extend(...spec.propSources);
    this.strict = false;
    this.bufferLength = DefaultBufferLength;
    let tokenArray = decodeArray(spec.tokenData);
    this.context = spec.context;
    this.specializerSpecs = spec.specialized || [];
    this.specialized = new Uint16Array(this.specializerSpecs.length);
    for (let i = 0; i < this.specializerSpecs.length; i++)
      this.specialized[i] = this.specializerSpecs[i].term;
    this.specializers = this.specializerSpecs.map(getSpecializer);
    this.states = decodeArray(spec.states, Uint32Array);
    this.data = decodeArray(spec.stateData);
    this.goto = decodeArray(spec.goto);
    this.maxTerm = spec.maxTerm;
    this.tokenizers = spec.tokenizers.map((value) => typeof value == "number" ? new TokenGroup(tokenArray, value) : value);
    this.topRules = spec.topRules;
    this.dialects = spec.dialects || {};
    this.dynamicPrecedences = spec.dynamicPrecedences || null;
    this.tokenPrecTable = spec.tokenPrec;
    this.termNames = spec.termNames || null;
    this.maxNode = this.nodeSet.types.length - 1;
    this.dialect = this.parseDialect();
    this.top = this.topRules[Object.keys(this.topRules)[0]];
  }
  createParse(input, fragments, ranges) {
    let parse = new Parse(this, input, fragments, ranges);
    for (let w of this.wrappers)
      parse = w(parse, input, fragments, ranges);
    return parse;
  }
  /// Get a goto table entry @internal
  getGoto(state, term, loose = false) {
    let table = this.goto;
    if (term >= table[0])
      return -1;
    for (let pos = table[term + 1]; ; ) {
      let groupTag = table[pos++], last = groupTag & 1;
      let target = table[pos++];
      if (last && loose)
        return target;
      for (let end = pos + (groupTag >> 1); pos < end; pos++)
        if (table[pos] == state)
          return target;
      if (last)
        return -1;
    }
  }
  /// Check if this state has an action for a given terminal @internal
  hasAction(state, terminal) {
    let data = this.data;
    for (let set = 0; set < 2; set++) {
      for (let i = this.stateSlot(
        state,
        set ? 2 : 1
        /* ParseState.Actions */
      ), next; ; i += 3) {
        if ((next = data[i]) == 65535) {
          if (data[i + 1] == 1)
            next = data[i = pair(data, i + 2)];
          else if (data[i + 1] == 2)
            return pair(data, i + 2);
          else
            break;
        }
        if (next == terminal || next == 0)
          return pair(data, i + 1);
      }
    }
    return 0;
  }
  /// @internal
  stateSlot(state, slot) {
    return this.states[state * 6 + slot];
  }
  /// @internal
  stateFlag(state, flag) {
    return (this.stateSlot(
      state,
      0
      /* ParseState.Flags */
    ) & flag) > 0;
  }
  /// @internal
  validAction(state, action) {
    if (action == this.stateSlot(
      state,
      4
      /* ParseState.DefaultReduce */
    ))
      return true;
    for (let i = this.stateSlot(
      state,
      1
      /* ParseState.Actions */
    ); ; i += 3) {
      if (this.data[i] == 65535) {
        if (this.data[i + 1] == 1)
          i = pair(this.data, i + 2);
        else
          return false;
      }
      if (action == pair(this.data, i + 1))
        return true;
    }
  }
  /// Get the states that can follow this one through shift actions or
  /// goto jumps. @internal
  nextStates(state) {
    let result = [];
    for (let i = this.stateSlot(
      state,
      1
      /* ParseState.Actions */
    ); ; i += 3) {
      if (this.data[i] == 65535) {
        if (this.data[i + 1] == 1)
          i = pair(this.data, i + 2);
        else
          break;
      }
      if ((this.data[i + 2] & 65536 >> 16) == 0) {
        let value = this.data[i + 1];
        if (!result.some((v, i2) => i2 & 1 && v == value))
          result.push(this.data[i], value);
      }
    }
    return result;
  }
  /// Configure the parser. Returns a new parser instance that has the
  /// given settings modified. Settings not provided in `config` are
  /// kept from the original parser.
  configure(config2) {
    let copy = Object.assign(Object.create(LRParser.prototype), this);
    if (config2.props)
      copy.nodeSet = this.nodeSet.extend(...config2.props);
    if (config2.top) {
      let info = this.topRules[config2.top];
      if (!info)
        throw new RangeError(`Invalid top rule name ${config2.top}`);
      copy.top = info;
    }
    if (config2.tokenizers)
      copy.tokenizers = this.tokenizers.map((t2) => {
        let found = config2.tokenizers.find((r) => r.from == t2);
        return found ? found.to : t2;
      });
    if (config2.specializers) {
      copy.specializers = this.specializers.slice();
      copy.specializerSpecs = this.specializerSpecs.map((s, i) => {
        let found = config2.specializers.find((r) => r.from == s.external);
        if (!found)
          return s;
        let spec = Object.assign(Object.assign({}, s), { external: found.to });
        copy.specializers[i] = getSpecializer(spec);
        return spec;
      });
    }
    if (config2.contextTracker)
      copy.context = config2.contextTracker;
    if (config2.dialect)
      copy.dialect = this.parseDialect(config2.dialect);
    if (config2.strict != null)
      copy.strict = config2.strict;
    if (config2.wrap)
      copy.wrappers = copy.wrappers.concat(config2.wrap);
    if (config2.bufferLength != null)
      copy.bufferLength = config2.bufferLength;
    return copy;
  }
  /// Tells you whether any [parse wrappers](#lr.ParserConfig.wrap)
  /// are registered for this parser.
  hasWrappers() {
    return this.wrappers.length > 0;
  }
  /// Returns the name associated with a given term. This will only
  /// work for all terms when the parser was generated with the
  /// `--names` option. By default, only the names of tagged terms are
  /// stored.
  getName(term) {
    return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.nodeSet.types[term].name || term);
  }
  /// The eof term id is always allocated directly after the node
  /// types. @internal
  get eofTerm() {
    return this.maxNode + 1;
  }
  /// The type of top node produced by the parser.
  get topNode() {
    return this.nodeSet.types[this.top[1]];
  }
  /// @internal
  dynamicPrecedence(term) {
    let prec2 = this.dynamicPrecedences;
    return prec2 == null ? 0 : prec2[term] || 0;
  }
  /// @internal
  parseDialect(dialect) {
    let values = Object.keys(this.dialects), flags = values.map(() => false);
    if (dialect)
      for (let part of dialect.split(" ")) {
        let id2 = values.indexOf(part);
        if (id2 >= 0)
          flags[id2] = true;
      }
    let disabled = null;
    for (let i = 0; i < values.length; i++)
      if (!flags[i]) {
        for (let j = this.dialects[values[i]], id2; (id2 = this.data[j++]) != 65535; )
          (disabled || (disabled = new Uint8Array(this.maxTerm + 1)))[id2] = 1;
      }
    return new Dialect(dialect, flags, disabled);
  }
  /// Used by the output of the parser generator. Not available to
  /// user code. @hide
  static deserialize(spec) {
    return new LRParser(spec);
  }
}
function pair(data, off) {
  return data[off] | data[off + 1] << 16;
}
function findFinished(stacks) {
  let best = null;
  for (let stack of stacks) {
    let stopped = stack.p.stoppedAt;
    if ((stack.pos == stack.p.stream.end || stopped != null && stack.pos > stopped) && stack.p.parser.stateFlag(
      stack.state,
      2
      /* StateFlag.Accepting */
    ) && (!best || best.score < stack.score))
      best = stack;
  }
  return best;
}
function getSpecializer(spec) {
  if (spec.external) {
    let mask = spec.extend ? 1 : 0;
    return (value, stack) => spec.external(value, stack) << 1 | mask;
  }
  return spec.get;
}
const noSemi = 301, incdec = 1, incdecPrefix = 2, insertSemi = 302, spaces = 304, newline = 305, LineComment = 3, BlockComment = 4;
const space = [
  9,
  10,
  11,
  12,
  13,
  32,
  133,
  160,
  5760,
  8192,
  8193,
  8194,
  8195,
  8196,
  8197,
  8198,
  8199,
  8200,
  8201,
  8202,
  8232,
  8233,
  8239,
  8287,
  12288
];
const braceR = 125, semicolon = 59, slash = 47, star = 42, plus = 43, minus = 45;
const trackNewline = new ContextTracker({
  start: false,
  shift(context, term) {
    return term == LineComment || term == BlockComment || term == spaces ? context : term == newline;
  },
  strict: false
});
const insertSemicolon = new ExternalTokenizer((input, stack) => {
  let { next } = input;
  if ((next == braceR || next == -1 || stack.context) && stack.canShift(insertSemi))
    input.acceptToken(insertSemi);
}, { contextual: true, fallback: true });
const noSemicolon = new ExternalTokenizer((input, stack) => {
  let { next } = input, after;
  if (space.indexOf(next) > -1)
    return;
  if (next == slash && ((after = input.peek(1)) == slash || after == star))
    return;
  if (next != braceR && next != semicolon && next != -1 && !stack.context && stack.canShift(noSemi))
    input.acceptToken(noSemi);
}, { contextual: true });
const incdecToken = new ExternalTokenizer((input, stack) => {
  let { next } = input;
  if (next == plus || next == minus) {
    input.advance();
    if (next == input.next) {
      input.advance();
      let mayPostfix = !stack.context && stack.canShift(incdec);
      input.acceptToken(mayPostfix ? incdec : incdecPrefix);
    }
  }
}, { contextual: true });
const jsHighlight = styleTags({
  "get set async static": tags.modifier,
  "for while do if else switch try catch finally return throw break continue default case": tags.controlKeyword,
  "in of await yield void typeof delete instanceof": tags.operatorKeyword,
  "let var const function class extends": tags.definitionKeyword,
  "import export from": tags.moduleKeyword,
  "with debugger as new": tags.keyword,
  TemplateString: tags.special(tags.string),
  super: tags.atom,
  BooleanLiteral: tags.bool,
  this: tags.self,
  null: tags.null,
  Star: tags.modifier,
  VariableName: tags.variableName,
  "CallExpression/VariableName TaggedTemplateExpression/VariableName": tags.function(tags.variableName),
  VariableDefinition: tags.definition(tags.variableName),
  Label: tags.labelName,
  PropertyName: tags.propertyName,
  PrivatePropertyName: tags.special(tags.propertyName),
  "CallExpression/MemberExpression/PropertyName": tags.function(tags.propertyName),
  "FunctionDeclaration/VariableDefinition": tags.function(tags.definition(tags.variableName)),
  "ClassDeclaration/VariableDefinition": tags.definition(tags.className),
  PropertyDefinition: tags.definition(tags.propertyName),
  PrivatePropertyDefinition: tags.definition(tags.special(tags.propertyName)),
  UpdateOp: tags.updateOperator,
  LineComment: tags.lineComment,
  BlockComment: tags.blockComment,
  Number: tags.number,
  String: tags.string,
  Escape: tags.escape,
  ArithOp: tags.arithmeticOperator,
  LogicOp: tags.logicOperator,
  BitOp: tags.bitwiseOperator,
  CompareOp: tags.compareOperator,
  RegExp: tags.regexp,
  Equals: tags.definitionOperator,
  Arrow: tags.function(tags.punctuation),
  ": Spread": tags.punctuation,
  "( )": tags.paren,
  "[ ]": tags.squareBracket,
  "{ }": tags.brace,
  "InterpolationStart InterpolationEnd": tags.special(tags.brace),
  ".": tags.derefOperator,
  ", ;": tags.separator,
  "@": tags.meta,
  TypeName: tags.typeName,
  TypeDefinition: tags.definition(tags.typeName),
  "type enum interface implements namespace module declare": tags.definitionKeyword,
  "abstract global Privacy readonly override": tags.modifier,
  "is keyof unique infer": tags.operatorKeyword,
  JSXAttributeValue: tags.attributeValue,
  JSXText: tags.content,
  "JSXStartTag JSXStartCloseTag JSXSelfCloseEndTag JSXEndTag": tags.angleBracket,
  "JSXIdentifier JSXNameSpacedName": tags.tagName,
  "JSXAttribute/JSXIdentifier JSXAttribute/JSXNameSpacedName": tags.attributeName,
  "JSXBuiltin/JSXIdentifier": tags.standard(tags.tagName)
});
const spec_identifier = { __proto__: null, export: 14, as: 19, from: 27, default: 30, async: 35, function: 36, extends: 46, this: 50, true: 58, false: 58, null: 70, void: 74, typeof: 78, super: 96, new: 130, delete: 146, yield: 155, await: 159, class: 164, public: 219, private: 219, protected: 219, readonly: 221, instanceof: 240, satisfies: 243, in: 244, const: 246, import: 278, keyof: 333, unique: 337, infer: 343, is: 379, abstract: 399, implements: 401, type: 403, let: 406, var: 408, interface: 415, enum: 419, namespace: 425, module: 427, declare: 431, global: 435, for: 456, of: 465, while: 468, with: 472, do: 476, if: 480, else: 482, switch: 486, case: 492, try: 498, catch: 502, finally: 506, return: 510, throw: 514, break: 518, continue: 522, debugger: 526 };
const spec_word = { __proto__: null, async: 117, get: 119, set: 121, public: 181, private: 181, protected: 181, static: 183, abstract: 185, override: 187, readonly: 193, accessor: 195, new: 383 };
const spec_LessThan = { __proto__: null, "<": 137 };
const parser = LRParser.deserialize({
  version: 14,
  states: "$BhO`QUOOO%QQUOOO'TQWOOP(_OSOOO*mQ(CjO'#CfO*tOpO'#CgO+SO!bO'#CgO+bO07`O'#DZO-sQUO'#DaO.TQUO'#DlO%QQUO'#DvO0[QUO'#EOOOQ(CY'#EW'#EWO0rQSO'#ETOOQO'#I_'#I_O0zQSO'#GjOOQO'#Eh'#EhO1VQSO'#EgO1[QSO'#EgO3^Q(CjO'#JbO5}Q(CjO'#JcO6kQSO'#FVO6pQ#tO'#FnOOQ(CY'#F_'#F_O6{O&jO'#F_O7ZQ,UO'#FuO8qQSO'#FtOOQ(CY'#Jc'#JcOOQ(CW'#Jb'#JbOOQQ'#J|'#J|O8vQSO'#IOO8{Q(C[O'#IPOOQQ'#JO'#JOOOQQ'#IT'#ITQ`QUOOO%QQUO'#DnO9TQUO'#DzO%QQUO'#D|O9[QSO'#GjO9aQ,UO'#ClO9oQSO'#EfO9zQSO'#EqO:PQ,UO'#F^O:nQSO'#GjO:sQSO'#GnO;OQSO'#GnO;^QSO'#GqO;^QSO'#GrO;^QSO'#GtO9[QSO'#GwO;}QSO'#GzO=`QSO'#CbO=pQSO'#HXO=xQSO'#H_O=xQSO'#HaO`QUO'#HcO=xQSO'#HeO=xQSO'#HhO=}QSO'#HnO>SQ(C]O'#HtO%QQUO'#HvO>_Q(C]O'#HxO>jQ(C]O'#HzO8{Q(C[O'#H|O>uQ(CjO'#CfO?wQWO'#DfQOQSOOO@_QSO'#EPO9aQ,UO'#EfO@jQSO'#EfO@uQ`O'#F^OOQQ'#Cd'#CdOOQ(CW'#Dk'#DkOOQ(CW'#Jf'#JfO%QQUO'#JfOBOQWO'#E_OOQ(CW'#E^'#E^OBYQ(C`O'#E_OBtQWO'#ESOOQO'#Ji'#JiOCYQWO'#ESOCgQWO'#E_OC}QWO'#EeODQQWO'#E_O@}QWO'#E_OBtQWO'#E_PDkO?MpO'#C`POOO)CDm)CDmOOOO'#IU'#IUODvOpO,59ROOQ(CY,59R,59ROOOO'#IV'#IVOEUO!bO,59RO%QQUO'#D]OOOO'#IX'#IXOEdO07`O,59uOOQ(CY,59u,59uOErQUO'#IYOFVQSO'#JdOHXQbO'#JdO+pQUO'#JdOH`QSO,59{OHvQSO'#EhOITQSO'#JqOI`QSO'#JpOI`QSO'#JpOIhQSO,5;UOImQSO'#JoOOQ(CY,5:W,5:WOItQUO,5:WOKuQ(CjO,5:bOLfQSO,5:jOLkQSO'#JmOMeQ(C[O'#JnO:sQSO'#JmOMlQSO'#JmOMtQSO,5;TOMyQSO'#JmOOQ(CY'#Cf'#CfO%QQUO'#EOONmQ`O,5:oOOQO'#Jj'#JjOOQO-E<]-E<]O9[QSO,5=UO! TQSO,5=UO! YQUO,5;RO!#]Q,UO'#EcO!$pQSO,5;RO!&YQ,UO'#DpO!&aQUO'#DuO!&kQWO,5;[O!&sQWO,5;[O%QQUO,5;[OOQQ'#E}'#E}OOQQ'#FP'#FPO%QQUO,5;]O%QQUO,5;]O%QQUO,5;]O%QQUO,5;]O%QQUO,5;]O%QQUO,5;]O%QQUO,5;]O%QQUO,5;]O%QQUO,5;]O%QQUO,5;]O%QQUO,5;]OOQQ'#FT'#FTO!'RQUO,5;nOOQ(CY,5;s,5;sOOQ(CY,5;t,5;tO!)UQSO,5;tOOQ(CY,5;u,5;uO%QQUO'#IeO!)^Q(C[O,5<bO!#]Q,UO,5;]O!){Q,UO,5;]O%QQUO,5;qO!*SQ#tO'#FdO!+PQ#tO'#JuO!*kQ#tO'#JuO!+WQ#tO'#JuOOQO'#Ju'#JuO!+lQ#tO,5;|OOOO,5<Y,5<YO!+}QUO'#FpOOOO'#Id'#IdO6{O&jO,5;yO!,UQ#tO'#FrOOQ(CY,5;y,5;yO!,uQ7[O'#CrOOQ(CY'#Cv'#CvO!-YQSO'#CvO!-_O07`O'#CzO!-{Q,UO,5<_O!.SQSO,5<aO!/iQMhO'#GPO!/vQSO'#GQO!/{QSO'#GQO!0QQMhO'#GUO!1PQWO'#GYO!1rQ7[O'#J]OOQ(CY'#J]'#J]O!1|QSO'#J[O!2[QSO'#JZO!2dQSO'#CqOOQ(CY'#Ct'#CtOOQ(CY'#DO'#DOOOQ(CY'#DQ'#DQO0uQSO'#DSO!$uQ,UO'#FwO!$uQ,UO'#FyO!2lQSO'#F{O!2qQSO'#F|O!/{QSO'#GSO!$uQ,UO'#GXO!2vQSO'#EiO!3bQSO,5<`O`QUO,5>jOOQQ'#JW'#JWOOQQ,5>k,5>kOOQQ-E<R-E<RO!5aQ(CjO,5:YO!7}Q(CjO,5:fO%QQUO,5:fO!:hQ(CjO,5:hOOQ(CW'#Co'#CoO!;XQ,UO,5=UO!;gQ(C[O'#JXO8qQSO'#JXO=}QSO,59WO!;xQWO,59WO!<QQ,UO,59WO9aQ,UO,59WO!<]QSO,5;RO!<eQSO'#HWO!<vQSO'#KQO%QQUO,5;vO!=OQWO,5;xO!=TQSO,5=qO!=YQSO,5=qO!=_QSO,5=qO8{Q(C[O,5=qO!=mQSO'#EjO!>gQWO'#EkOOQ(CW'#Jo'#JoO!>nQ(C[O'#J}O8{Q(C[O,5=YO;^QSO,5=`OOQO'#Cr'#CrO!>yQWO,5=]O!?RQ,UO,5=^O!?^QSO,5=`O!?cQ`O,5=cO=}QSO'#G|O9[QSO'#HOO!?kQSO'#HOO9aQ,UO'#HRO!?pQSO'#HROOQQ,5=f,5=fO!?uQSO'#HSO!?}QSO'#ClO!@SQSO,58|O!@^QSO,58|O!BfQUO,58|OOQQ,58|,58|O!BsQ(C[O,58|O%QQUO,58|O!COQUO'#HZOOQQ'#H['#H[OOQQ'#H]'#H]O`QUO,5=sO!C`QSO,5=sO`QUO,5=yO`QUO,5={O!CeQSO,5=}O`QUO,5>PO!CjQSO,5>SO!CoQUO,5>YOOQQ,5>`,5>`O%QQUO,5>`O8{Q(C[O,5>bOOQQ,5>d,5>dO!GvQSO,5>dOOQQ,5>f,5>fO!GvQSO,5>fOOQQ,5>h,5>hO!G{QWO'#DXO%QQUO'#JfO!HjQWO'#JfO!IXQWO'#DgO!IjQWO'#DgO!K{QUO'#DgO!LSQSO'#JeO!L[QSO,5:QO!LaQSO'#ElO!LoQSO'#JrO!LwQSO,5;VO!L|QWO'#DgO!MZQWO'#EROOQ(CY,5:k,5:kO%QQUO,5:kO!MbQSO,5:kO=}QSO,5;QO!;xQWO,5;QO!<QQ,UO,5;QO9aQ,UO,5;QO!MjQSO,5@QO!MoQ!LQO,5:oO!NrQ(C`O,5:yOBtQWO,5:nO# ^QWO,5:nO# kQWO,5:yO#!RQWO,5:yO#!lQWO,5:yOBtQWO,5:yO=}QSO,5:nOOQ(CW'#Eb'#EbOOQO,5:y,5:yO%QQUO,5:yO##]Q(C[O,5:yO##hQ(C[O,5:yO!;xQWO,5:nOOQO,5;P,5;PO##vQ(C[O,5:yPOOO'#IS'#ISP#$[O?MpO,58zPOOO,58z,58zOOOO-E<S-E<SOOQ(CY1G.m1G.mOOOO-E<T-E<TO#$gQ`O,59wOOOO-E<V-E<VOOQ(CY1G/a1G/aO#$lQbO,5>tO+pQUO,5>tOOQO,5>z,5>zO#$vQUO'#IYOOQO-E<W-E<WO#%TQSO,5@OO#%]QbO,5@OO#%dQSO,5@[OOQ(CY1G/g1G/gO%QQUO,5@]O#%lQSO'#I`OOQO-E<^-E<^O#%dQSO,5@[OOQ(CW1G0p1G0pOOQ(CY1G/r1G/rOOQ(CY1G0U1G0UO#&QQSO,5@XO:sQSO,5@XO#&YQSO,5@XO%QQUO,5@YO#&hQ(C[O,5@YO#&yQ(C[O,5@YO#'QQSO'#IbO#&QQSO,5@XOOQ(CW1G0o1G0oO!&kQWO,5:qO!&vQWO,5:qOOQO,5:s,5:sO#'oQSO,5:sO#'wQ,UO1G2pO9[QSO1G2pOOQ(CY1G0m1G0mO#(VQ(CjO1G0mO#)[Q(ChO,5:}OOQ(CY'#GO'#GOO#)xQ(CjO'#J]O! YQUO1G0mO#,QQ,UO'#JgO#,[QSO,5:[O#,aQbO'#JhO%QQUO'#JhO#,kQSO,5:aOOQ(CY'#DX'#DXOOQ(CY1G0v1G0vO%QQUO1G0vOOQ(CY1G1`1G1`O#,pQSO1G0vO#/XQ(CjO1G0wO#/`Q(CjO1G0wO#1yQ(CjO1G0wO#2QQ(CjO1G0wO#4[Q(CjO1G0wO#4rQ(CjO1G0wO#7lQ(CjO1G0wO#7sQ(CjO1G0wO#:^Q(CjO1G0wO#:eQ(CjO1G0wO#<]Q(CjO1G0wO#?]Q$IUO'#CfO#AZQ$IUO1G1YO#CXQ$IUO'#JcO!)XQSO1G1`O#ClQ(CjO,5?POOQ(CW-E<c-E<cO#D`Q(CjO1G0wOOQ(CY1G0w1G0wO#FkQ(CjO1G1]O#G_Q#tO,5<QO#GgQ#tO,5<RO#GoQ#tO'#FiO#HWQSO'#FhOOQO'#Jv'#JvOOQO'#Ic'#IcO#H]Q#tO1G1hOOQ(CY1G1h1G1hOOOO1G1s1G1sO#HnQ$IUO'#JbO#HxQSO,5<[O!'RQUO,5<[OOOO-E<b-E<bOOQ(CY1G1e1G1eO#H}QWO'#JuOOQ(CY,5<^,5<^O#IVQWO,5<^OOQ(CY,59b,59bO!#]Q,UO'#C|OOOO'#IW'#IWO#I[O07`O,59fOOQ(CY,59f,59fO%QQUO1G1yO!2qQSO'#IgO#IgQSO,5<rOOQ(CY,5<o,5<oOOQO'#Ge'#GeO!$uQ,UO,5=OOOQO'#Gg'#GgO!$uQ,UO,5=QO!#]Q,UO,5=SOOQO1G1{1G1{O#IuQ`O'#CoO#JYQ`O,5<kO#JaQSO'#JyO9[QSO'#JyO#JoQSO,5<mO!$uQ,UO,5<lO#JtQSO'#GRO#KPQSO,5<lO#KUQ`O'#GOO#KcQ`O'#JzO#KmQSO'#JzO!#]Q,UO'#JzO#KrQSO,5<pO#KwQWO'#GZO!0zQWO'#GZO#LYQSO'#G]O#L_QSO'#G_O!/{QSO'#GbO#LdQ(C[O'#IiO#LoQWO,5<tOOQ(CY,5<t,5<tO#LvQWO'#GZO#MUQWO'#G[O#M^QWO'#G[OOQ(CY,5=T,5=TO!$uQ,UO,5?vO!$uQ,UO,5?vO#McQSO'#IjO#MnQSO,5?uO#MvQSO,59]O#NgQ,UO,59nOOQ(CY,59n,59nO$ YQ,UO,5<cO$ {Q,UO,5<eO?oQSO,5<gOOQ(CY,5<h,5<hO$!VQSO,5<nO$![Q,UO,5<sO! YQUO1G1zO$!lQSO1G1zOOQQ1G4U1G4UOOQ(CY1G/t1G/tO!)UQSO1G/tO$$kQ(CjO1G0QOOQQ1G2p1G2pO!#]Q,UO1G2pO%QQUO1G2pO$%[QSO1G2pO$%gQ,UO'#EcOOQ(CW,5?s,5?sO$%qQ(C[O,5?sOOQQ1G.r1G.rO=}QSO1G.rO!;xQWO1G.rO!<QQ,UO1G.rO$&SQSO1G0mO$&XQSO'#CfO$&dQSO'#KRO$&lQSO,5=rO$&qQSO'#KRO$&vQSO'#KRO$'RQSO'#IrO$'aQSO,5@lO$'iQbO1G1bOOQ(CY1G1d1G1dO9[QSO1G3]O?oQSO1G3]O$'pQSO1G3]O$'uQSO1G3]OOQQ1G3]1G3]O:sQSO'#JpO:sQSO'#ElO%QQUO'#ElO:sQSO'#IlO$'zQ(C[O,5@iOOQQ1G2t1G2tO!?^QSO1G2zO!#]Q,UO1G2wO$(VQSO1G2wOOQQ1G2x1G2xO!#]Q,UO1G2xO$([QSO1G2xO$(dQWO'#GvOOQQ1G2z1G2zO!0zQWO'#InO!?cQ`O1G2}OOQQ1G2}1G2}OOQQ,5=h,5=hO$(lQ,UO,5=jO9[QSO,5=jO#L_QSO,5=mO8qQSO,5=mO!;xQWO,5=mO!<QQ,UO,5=mO9aQ,UO,5=mO$(zQSO'#KPO$)VQSO,5=nOOQQ1G.h1G.hO$)[Q(C[O1G.hO?oQSO1G.hO$)gQSO1G.hO8{Q(C[O1G.hO$)rQbO,5@nO$*VQSO,5@nO$*bQUO,5=uO$*iQSO,5=uO:sQSO,5@nOOQQ1G3_1G3_O`QUO1G3_OOQQ1G3e1G3eOOQQ1G3g1G3gO=xQSO1G3iO$*nQUO1G3kO$.oQUO'#HjOOQQ1G3n1G3nO$.|QSO'#HpO=}QSO'#HrOOQQ1G3t1G3tO$/UQUO1G3tO8{Q(C[O1G3zOOQQ1G3|1G3|OOQ(CW'#GV'#GVO8{Q(C[O1G4OO8{Q(C[O1G4QO$3YQSO,5@QO!'RQUO,5;WO:sQSO,5;WO=}QSO,5:RO!'RQUO,5:RO!;xQWO,5:RO$3_Q$IUO,5:ROOQO,5;W,5;WO$3iQWO'#IZO$4PQSO,5@POOQ(CY1G/l1G/lO$4XQWO'#IaO$4cQSO,5@^OOQ(CW1G0q1G0qO!IjQWO,5:ROOQO'#I^'#I^O$4kQWO,5:mOOQ(CY,5:m,5:mO!MeQSO1G0VOOQ(CY1G0V1G0VO%QQUO1G0VOOQ(CY1G0l1G0lO=}QSO1G0lO!;xQWO1G0lO!<QQ,UO1G0lOOQ(CW1G5l1G5lO=}QSO1G0YOOQO1G0e1G0eO%QQUO1G0eO$4rQ(C[O1G0eO$4}Q(C[O1G0eO!;xQWO1G0YOBtQWO1G0YO$5]Q(C`O1G0eO$5wQWO1G0YOBtQWO1G0eO$6UQWO1G0eO$6lQWO1G0eO$7VQ(C[O1G0eOOQO1G0Y1G0YO$7kQ(CjO1G0ePOOO-E<Q-E<QPOOO1G.f1G.fOOOO1G/c1G/cO$7uQ`O,5<bO$7}QbO1G4`OOQO1G4f1G4fO%QQUO,5>tO$8XQSO1G5jO$8aQSO1G5vO$8iQbO1G5wO:sQSO,5>zO$8sQSO1G5sO$8sQSO1G5sO:sQSO1G5sO$8{Q(CjO1G5tO%QQUO1G5tO$9]Q(C[O1G5tO$9nQSO,5>|O:sQSO,5>|OOQO,5>|,5>|O$:SQSO,5>|OOQO-E<`-E<`OOQO1G0]1G0]OOQO1G0_1G0_O!)XQSO1G0_OOQQ7+([7+([O!#]Q,UO7+([O%QQUO7+([O$:bQSO7+([O$:mQ,UO7+([O$:{Q(CjO,59nO$=TQ(CjO,5<cO$?`Q(CjO,5<eO$AkQ(CjO,5<sOOQ(CY7+&X7+&XO$C|Q(CjO7+&XO$DpQ,UO'#I[O$DzQSO,5@ROOQ(CY1G/v1G/vO$ESQUO'#I]O$EaQSO,5@SO$EiQbO,5@SOOQ(CY1G/{1G/{O$EsQSO7+&bOOQ(CY7+&b7+&bO$ExQ$IUO,5:bO%QQUO7+&tO$FSQ$IUO,5:YO$FaQ$IUO,5:fO$FkQ$IUO,5:hOOQ(CY7+&z7+&zOOQO1G1l1G1lOOQO1G1m1G1mO$FuQ#tO,5<TO!'RQUO,5<SOOQO-E<a-E<aOOQ(CY7+'S7+'SOOOO7+'_7+'_OOOO1G1v1G1vO$GQQSO1G1vOOQ(CY1G1x1G1xO$GVQ`O,59hOOOO-E<U-E<UOOQ(CY1G/Q1G/QO$G^Q(CjO7+'eOOQ(CY,5?R,5?RO$HQQSO,5?ROOQ(CY1G2^1G2^P$HVQSO'#IgPOQ(CY-E<e-E<eO$HyQ,UO1G2jO$IlQ,UO1G2lO$IvQ`O1G2nOOQ(CY1G2V1G2VO$I}QSO'#IfO$J]QSO,5@eO$J]QSO,5@eO$JeQSO,5@eO$JpQSO,5@eOOQO1G2X1G2XO$KOQ,UO1G2WO!$uQ,UO1G2WO$K`QMhO'#IhO$KpQSO,5@fO!#]Q,UO,5@fO$KxQ`O,5@fOOQ(CY1G2[1G2[OOQ(CW,5<u,5<uOOQ(CW,5<v,5<vO$LSQSO,5<vOBoQSO,5<vO!;xQWO,5<uOOQO'#G^'#G^O$LXQSO,5<wOOQ(CW,5<y,5<yO$LSQSO,5<|OOQO,5?T,5?TOOQO-E<g-E<gOOQ(CY1G2`1G2`O!0zQWO,5<uO$LaQSO,5<vO#LYQSO,5<wO!0zQWO,5<vO$LlQ,UO1G5bO$LvQ,UO1G5bOOQO,5?U,5?UOOQO-E<h-E<hOOQO1G.w1G.wO!=OQWO,59pO%QQUO,59pO$MTQSO1G2RO!$uQ,UO1G2YO$MYQ(CjO7+'fOOQ(CY7+'f7+'fO! YQUO7+'fOOQ(CY7+%`7+%`O$M|Q`O'#J{O!MeQSO7+([O$NWQbO7+([O$:eQSO7+([O$N_Q(ChO'#CfO$NrQ(ChO,5<zO% dQSO,5<zOOQ(CW1G5_1G5_OOQQ7+$^7+$^O=}QSO7+$^O!;xQWO7+$^O! YQUO7+&XO% iQSO'#IqO% }QSO,5@mOOQO1G3^1G3^O9[QSO,5@mO% }QSO,5@mO%!VQSO,5@mOOQO,5?^,5?^OOQO-E<p-E<pOOQ(CY7+&|7+&|O%![QSO7+(wO8{Q(C[O7+(wO9[QSO7+(wO?oQSO7+(wO%!aQSO,5;WOOQ(CW,5?W,5?WOOQ(CW-E<j-E<jOOQQ7+(f7+(fO%!fQ(ChO7+(cO!#]Q,UO7+(cO%!pQ`O7+(dOOQQ7+(d7+(dO!#]Q,UO7+(dO%!wQSO'#KOO%#SQSO,5=bOOQO,5?Y,5?YOOQO-E<l-E<lOOQQ7+(i7+(iO%$`QWO'#HPOOQQ1G3U1G3UO!#]Q,UO1G3UO%QQUO1G3UO%$gQSO1G3UO%$rQ,UO1G3UO8{Q(C[O1G3XO#L_QSO1G3XO8qQSO1G3XO!;xQWO1G3XO!<QQ,UO1G3XO%%QQSO'#IpO%%]QSO,5@kO%%eQWO,5@kOOQ(CW1G3Y1G3YOOQQ7+$S7+$SO?oQSO7+$SO8{Q(C[O7+$SO%%pQSO7+$SO%QQUO1G6YO%QQUO1G6ZO%%uQUO1G3aO%%|QSO1G3aO%&RQUO1G3aO%&YQ(C[O1G6YOOQQ7+(y7+(yO8{Q(C[O7+)TO`QUO7+)VOOQQ'#KU'#KUOOQQ'#Is'#IsO%&dQUO,5>UOOQQ,5>U,5>UO%QQUO'#HkO%&qQSO'#HmOOQQ,5>[,5>[O:sQSO,5>[OOQQ,5>^,5>^OOQQ7+)`7+)`OOQQ7+)f7+)fOOQQ7+)j7+)jOOQQ7+)l7+)lO%&vQWO1G5lO%'[Q$IUO1G0rO%'fQSO1G0rOOQO1G/m1G/mO%'qQ$IUO1G/mO=}QSO1G/mO!'RQUO'#DgOOQO,5>u,5>uOOQO-E<X-E<XOOQO,5>{,5>{OOQO-E<_-E<_O!;xQWO1G/mOOQO-E<[-E<[OOQ(CY1G0X1G0XOOQ(CY7+%q7+%qO!MeQSO7+%qOOQ(CY7+&W7+&WO=}QSO7+&WO!;xQWO7+&WOOQO7+%t7+%tO$7kQ(CjO7+&POOQO7+&P7+&PO%QQUO7+&PO%'{Q(C[O7+&PO=}QSO7+%tO!;xQWO7+%tO%(WQ(C[O7+&POBtQWO7+%tO%(fQ(C[O7+&PO%(zQ(C`O7+&PO%)UQWO7+%tOBtQWO7+&PO%)cQWO7+&PO%)yQSO7++_O%)yQSO7++_O%*RQ(CjO7++`O%QQUO7++`OOQO1G4h1G4hO:sQSO1G4hO%*cQSO1G4hOOQO7+%y7+%yO!MeQSO<<KvO$NWQbO<<KvO%*qQSO<<KvOOQQ<<Kv<<KvO!#]Q,UO<<KvO%QQUO<<KvO%*yQSO<<KvO%+UQ(CjO1G2jO%-aQ(CjO1G2lO%/lQ(CjO1G2WO%1}Q,UO,5>vOOQO-E<Y-E<YO%2XQbO,5>wO%QQUO,5>wOOQO-E<Z-E<ZO%2cQSO1G5nOOQ(CY<<I|<<I|O%2kQ$IUO1G0mO%4uQ$IUO1G0wO%4|Q$IUO1G0wO%7QQ$IUO1G0wO%7XQ$IUO1G0wO%8|Q$IUO1G0wO%9dQ$IUO1G0wO%;wQ$IUO1G0wO%<OQ$IUO1G0wO%>SQ$IUO1G0wO%>ZQ$IUO1G0wO%@RQ$IUO1G0wO%@fQ(CjO<<J`O%AkQ$IUO1G0wO%CaQ$IUO'#J]O%EdQ$IUO1G1]O%EqQ$IUO1G0QO!'RQUO'#FkOOQO'#Jw'#JwOOQO1G1o1G1oO%E{QSO1G1nO%FQQ$IUO,5?POOOO7+'b7+'bOOOO1G/S1G/SOOQ(CY1G4m1G4mO!$uQ,UO7+(YO%F[QSO,5?QO9[QSO,5?QOOQO-E<d-E<dO%FjQSO1G6PO%FjQSO1G6PO%FrQSO1G6PO%F}Q,UO7+'rO%G_Q`O,5?SO%GiQSO,5?SO!#]Q,UO,5?SOOQO-E<f-E<fO%GnQ`O1G6QO%GxQSO1G6QOOQ(CW1G2b1G2bO$LSQSO1G2bOOQ(CW1G2a1G2aO%HQQSO1G2cO!#]Q,UO1G2cOOQ(CW1G2h1G2hO!;xQWO1G2aOBoQSO1G2bO%HVQSO1G2cO%H_QSO1G2bO!$uQ,UO7+*|OOQ(CY1G/[1G/[O%HjQSO1G/[OOQ(CY7+'m7+'mO%HoQ,UO7+'tO%IPQ(CjO<<KQOOQ(CY<<KQ<<KQO!#]Q,UO'#IkO%IsQSO,5@gO!#]Q,UO1G2fOOQQ<<Gx<<GxO=}QSO<<GxO%I{Q(CjO<<IsOOQ(CY<<Is<<IsOOQO,5?],5?]O%JoQSO,5?]O$&vQSO,5?]OOQO-E<o-E<oO%JtQSO1G6XO%JtQSO1G6XO9[QSO1G6XO?oQSO<<LcOOQQ<<Lc<<LcO%J|QSO<<LcO8{Q(C[O<<LcO%KRQSO1G0rOOQQ<<K}<<K}O%!fQ(ChO<<K}OOQQ<<LO<<LOO%!pQ`O<<LOO%KWQWO'#ImO%KcQSO,5@jO!'RQUO,5@jOOQQ1G2|1G2|O%KkQ(C`O'#JfO%LVQUO'#JfO%L^QWO'#E_O%LwQ(C[O'#E_OBYQ(C`O'#E_O(VQWO'#HQOOQO'#Io'#IoO8{Q(C[O'#IoO%M]QWO,5=kOOQQ,5=k,5=kO%MuQWO'#E_O%LmQWO'#E_O%M|QWO'#E_O%NgQWO'#E_O& WQWO'#HQO& iQSO7+(pO& nQSO7+(pOOQQ7+(p7+(pO!#]Q,UO7+(pO%QQUO7+(pO& vQSO7+(pOOQQ7+(s7+(sO8{Q(C[O7+(sO#L_QSO7+(sO8qQSO7+(sO!;xQWO7+(sO&!RQSO,5?[OOQO-E<n-E<nOOQO'#HT'#HTO&!^QSO1G6VO8{Q(C[O<<GnOOQQ<<Gn<<GnO?oQSO<<GnO&!fQSO7++tO&!kQSO7++uOOQQ7+({7+({O&!pQSO7+({O&!uQUO7+({O&!|QSO7+({O%QQUO7++tO%QQUO7++uOOQQ<<Lo<<LoOOQQ<<Lq<<LqOOQQ-E<q-E<qOOQQ1G3p1G3pO&#RQSO,5>VOOQQ,5>X,5>XO&#WQSO1G3vO:sQSO7+&^O!'RQUO7+&^OOQO7+%X7+%XO&#]Q$IUO1G5wO=}QSO7+%XOOQ(CY<<I]<<I]OOQ(CY<<Ir<<IrO=}QSO<<IrOOQO<<Ik<<IkO$7kQ(CjO<<IkO%QQUO<<IkOOQO<<I`<<I`O=}QSO<<I`O&#gQ(C[O<<IkO!;xQWO<<I`O&#rQ(C[O<<IkOBtQWO<<I`O&$QQ(C[O<<IkO&$fQ(C`O<<IkO&$pQWO<<I`OBtQWO<<IkO&$}QSO<<NyO&%VQ(CjO<<NzOOQO7+*S7+*SO:sQSO7+*SOOQQANAbANAbO&%gQSOANAbO!#]Q,UOANAbO!MeQSOANAbO$NWQbOANAbO%QQUOANAbO&%oQ(CjO7+'rO&(QQ(CjO7+'tO&*cQbO1G4cO&*mQ$IUO7+&XO&*zQ$IUO,59nO&,}Q$IUO,5<cO&/QQ$IUO,5<eO&1TQ$IUO,5<sO&2yQ$IUO7+'eO&3WQ$IUO7+'fO&3eQSO,5<VOOQO7+'Y7+'YO&3jQ,UO<<KtOOQO1G4l1G4lO&3qQSO1G4lO&3|QSO1G4lO&4[QSO7++kO&4[QSO7++kO!#]Q,UO1G4nO&4dQ`O1G4nO&4nQSO7++lOOQ(CW7+'|7+'|O$LSQSO7+'}O&4vQ`O7+'}OOQ(CW7+'{7+'{O$LSQSO7+'|O&4}QSO7+'}O!#]Q,UO7+'}OBoQSO7+'|O&5SQ,UO<<NhOOQ(CY7+$v7+$vO&5^Q`O,5?VOOQO-E<i-E<iO&5hQ(ChO7+(QOOQQAN=dAN=dO9[QSO1G4wOOQO1G4w1G4wO&5xQSO1G4wO&5}QSO7++sO&5}QSO7++sO8{Q(C[OANA}O?oQSOANA}OOQQANA}ANA}OOQQANAiANAiOOQQANAjANAjO&6VQSO,5?XOOQO-E<k-E<kO&6bQ$IUO1G6UO#L_QSO,5=lO8qQSO,5=lO&8rQbO'#CfO&8|QWO,5:yO&9WQWO,5:yO&9eQWO,5:yO!;xQWO,5=lOOQO,5?Z,5?ZOOQO-E<m-E<mOOQQ1G3V1G3VO%LVQUO,5<wO%KkQ(C`O,5=lO!NrQ(C`O,5:yO(VQWO,5=lO&9xQWO,5=lO&:ZQWO,5:yOOQQ<<L[<<L[O!#]Q,UO<<L[O& iQSO<<L[O&:tQSO<<L[O%QQUO<<L[OOQQ<<L_<<L_O8{Q(C[O<<L_O#L_QSO<<L_O8qQSO<<L_O&:|QWO1G4vO&;XQSO7++qOOQQAN=YAN=YO8{Q(C[OAN=YOOQQ<= `<= `OOQQ<= a<= aOOQQ<<Lg<<LgO&;aQSO<<LgO&;fQUO<<LgO&;mQSO<= `O&;rQSO<= aOOQQ1G3q1G3qO=}QSO7+)bO&;wQSO<<IxO&<SQ$IUO<<IxOOQO<<Hs<<HsOOQ(CYAN?^AN?^OOQOAN?VAN?VO$7kQ(CjOAN?VOOQOAN>zAN>zO%QQUOAN?VO=}QSOAN>zO&<^Q(C[OAN?VO!;xQWOAN>zO&<iQ(C[OAN?VOBtQWOAN>zO&<wQ(C[OAN?VOOQO<<Mn<<MnOOQQG26|G26|O!#]Q,UOG26|O!MeQSOG26|O&=]QSOG26|O$NWQbOG26|O&=eQ$IUO<<J`O&=rQ$IUO1G2WO&?hQ$IUO1G2jO&AkQ$IUO1G2lO&CnQ$IUO<<KQO&C{Q$IUO<<IsOOQO1G1q1G1qO!$uQ,UOANA`OOQO7+*W7+*WO&DYQSO7+*WO&DeQSO<= VO&DmQ`O7+*YOOQ(CW<<Ki<<KiO$LSQSO<<KiOOQ(CW<<Kh<<KhO&DwQ`O<<KiO$LSQSO<<KhOOQO7+*c7+*cO9[QSO7+*cO&EOQSO<= _OOQQG27iG27iO8{Q(C[OG27iO!'RQUO1G4sO&EWQSO7++pO8{Q(C[O1G3WO#L_QSO1G3WO&E`QWO1G0eO&EjQWO1G0eO8qQSO1G3WO!;xQWO1G3WO(VQWO1G3WO%KkQ(C`O1G3WO$5]Q(C`O1G0eO&EwQWO1G3WO& iQSOANAvOOQQANAvANAvO!#]Q,UOANAvO&FYQSOANAvOOQQANAyANAyO8{Q(C[OANAyO#L_QSOANAyOOQO'#HU'#HUOOQO7+*b7+*bOOQQG22tG22tOOQQANBRANBRO&FbQSOANBROOQQANDzANDzOOQQAND{AND{OOQQ<<L|<<L|O!'RQUOAN?dOOQOG24qG24qO$7kQ(CjOG24qOOQOG24fG24fO%QQUOG24qO=}QSOG24fO&FgQ(C[OG24qO!;xQWOG24fO&FrQ(C[OG24qO!MeQSOLD,hOOQQLD,hLD,hO!#]Q,UOLD,hO&GQQSOLD,hO&GYQ$IUO7+'rO&IOQ$IUO7+'tO&JtQ,UOG26zOOQO<<Mr<<MrOOQ(CWANATANATO$LSQSOANATOOQ(CWANASANASOOQO<<M}<<M}OOQQLD-TLD-TO&KUQ$IUO7+*_OOQO7+(r7+(rO8{Q(C[O7+(rO&K`QWO7+&PO#L_QSO7+(rO8qQSO7+(rO!;xQWO7+(rO(VQWO7+(rOOQQG27bG27bO& iQSOG27bO!#]Q,UOG27bOOQQG27eG27eO8{Q(C[OG27eOOQQG27mG27mO&KjQ$IUOG25OOOQOLD*]LD*]O$7kQ(CjOLD*]OOQOLD*QLD*QO%QQUOLD*]O=}QSOLD*QO&KtQ(C[OLD*]OOQQ!$(!S!$(!SO!MeQSO!$(!SO!#]Q,UO!$(!SO&LPQ(CjOG26zOOQ(CWG26oG26oOOQO<<L^<<L^O8{Q(C[O<<L^O#L_QSO<<L^O8qQSO<<L^O!;xQWO<<L^OOQQLD,|LD,|O& iQSOLD,|OOQQLD-PLD-POOQO!$'Mw!$'MwO$7kQ(CjO!$'MwOOQO!$'Ml!$'MlO%QQUO!$'MwOOQQ!)9En!)9EnO!MeQSO!)9EnOOQOANAxANAxO8{Q(C[OANAxO#L_QSOANAxO8qQSOANAxOOQQ!$(!h!$(!hOOQO!)9Cc!)9CcO$7kQ(CjO!)9CcOOQQ!.K;Y!.K;YO&NbQ$IUOG26zOOQOG27dG27dO8{Q(C[OG27dO#L_QSOG27dOOQO!.K8}!.K8}OOQOLD-OLD-OO8{Q(C[OLD-OOOQO!$(!j!$(!jO!'RQUO'#DvO0rQSO'#ETO'!WQbO'#JbO!'RQUO'#DnO'!_QUO'#DzO!'RQUO'#D|O'!fQbO'#CfO'$|QbO'#CfO'%^QUO,5;RO!'RQUO,5;]O!'RQUO,5;]O!'RQUO,5;]O!'RQUO,5;]O!'RQUO,5;]O!'RQUO,5;]O!'RQUO,5;]O!'RQUO,5;]O!'RQUO,5;]O!'RQUO,5;]O!'RQUO,5;]O!'RQUO'#IeO''aQSO,5<bO''iQ,UO,5;]O'(|Q,UO,5;]O!'RQUO,5;qO0uQSO'#DSO0uQSO'#DSO!#]Q,UO'#FwO''iQ,UO'#FwO!#]Q,UO'#FyO''iQ,UO'#FyO!#]Q,UO'#GXO''iQ,UO'#GXO!'RQUO,5:fO!'RQUO,5@]O'%^QUO1G0mO')TQ$IUO'#CfO!'RQUO1G1yO!#]Q,UO,5=OO''iQ,UO,5=OO!#]Q,UO,5=QO''iQ,UO,5=QO!#]Q,UO,5<lO''iQ,UO,5<lO'%^QUO1G1zO!'RQUO7+&tO!#]Q,UO1G2WO''iQ,UO1G2WO!#]Q,UO1G2YO''iQ,UO1G2YO'%^QUO7+'fO'%^QUO7+&XO!#]Q,UOANA`O''iQ,UOANA`O')_QSO'#EgO')dQSO'#EgO')lQSO'#FVO')qQSO'#EqO')vQSO'#JqO'*RQSO'#JoO'*^QSO,5;RO'*cQ,UO,5<_O'*jQSO'#GQO'*oQSO'#GQO'*tQSO,5<`O'*|QSO,5;RO'+UQ$IUO1G1YO'+]QSO,5<lO'+bQSO,5<lO'+gQSO,5<nO'+lQSO,5<nO'+qQSO1G1zO'+vQSO1G0mO'+{Q,UO<<KtO',SQ,UO<<KtO7ZQ,UO'#FuO8qQSO'#FtO@jQSO'#EfO!'RQUO,5;nO!/{QSO'#GQO!/{QSO'#GQO!/{QSO'#GSO!/{QSO'#GSO!$uQ,UO7+(YO!$uQ,UO7+(YO$IvQ`O1G2nO$IvQ`O1G2nO!#]Q,UO,5=SO!#]Q,UO,5=S",
  stateData: "'-[~O'lOS'mOSROS'nRQ~OPYOQYOV!TO^pOaxObwOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!XXO!csO!hZO!kYO!lYO!mYO!otO!quO!tvO!x]O#o}O$PzO$TfO%_{O%a!OO%c|O%d|O%g!PO%i!QO%l!RO%m!RO%o!SO%|!UO&S!VO&U!WO&W!XO&Y!YO&]!ZO&c![O&i!]O&k!^O&m!_O&o!`O&q!aO'sSO'uTO'xUO(QVO(_[O(liO~OPYOQYOa!gOb!fOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!X!cO!csO!hZO!kYO!lYO!mYO!otO!quO!t!eO$P!hO$TfO's!bO'uTO'xUO(QVO(_[O(liO~O^!qOl!kO|!lO![!rO!]!pO!^!pO!x;oO!|!vO!}!tO#O!uO#P!sO#S!wO#T!wO't!iO'uTO'xUO(T!jO(_!nO~O'n!xO~OPYXXYX^YXkYXyYXzYX|YX!VYX!eYX!fYX!hYX!lYX#WYX#ccX#fYX#gYX#hYX#iYX#jYX#kYX#lYX#mYX#nYX#pYX#rYX#tYX#uYX#zYX'jYX(QYX(`YX(gYX(hYX~O!a$yX~P(dO[!zO'u!|O'v!zO'w!|O~O[!}O'w!|O'x!|O'y!}O~Oq#PO!O#QO(R#QO(S#SO~OPYOQYOa!gOb!fOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!X!cO!csO!hZO!kYO!lYO!mYO!otO!quO!t!eO$P!hO$TfO's;tO'uTO'xUO(QVO(_[O(liO~O!U#WO!V#TO!S(WP!S(dP~P+pO!W#`O~P`OPYOQYOa!gOb!fOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!X!cO!csO!hZO!kYO!lYO!mYO!otO!quO!t!eO$P!hO$TfO'uTO'xUO(QVO(_[O(liO~O!U#fO!x]O#a#iO#b#fO's;uO!g(aP~P.[O!h#kO's#jO~O!t#oO!x]O%_#pO~O#c#qO~O!a#rO#c#qO~OP$YOX$aOk#}Oy#vOz#wO|#xO!V$^O!e$PO!f#tO!h#uO!l$YO#f#{O#g#|O#h#|O#i#|O#j$OO#k$PO#l$PO#m$`O#n$PO#p$QO#r$SO#t$UO#u$VO(QVO(`$WO(g#yO(h#zO~O^(UX'j(UX'h(UX!g(UX!S(UX!X(UX%`(UX!a(UX~P1dO#W$bO#z$bOP(VXX(VXk(VXy(VXz(VX|(VX!V(VX!e(VX!h(VX!l(VX#f(VX#g(VX#h(VX#i(VX#j(VX#k(VX#l(VX#m(VX#n(VX#p(VX#r(VX#t(VX#u(VX(Q(VX(`(VX(g(VX(h(VX!X(VX%`(VX~O^(VX!f(VX'j(VX'h(VX!S(VX!g(VXo(VX!a(VX~P3zO#W$bO~O$V$dO$X$cO$`$iO~O!X$jO$TfO$c$kO$e$mO~Oi%POk$qOl$pOm$pOs%QOu%ROw%SO|$xO!X$yO!c%XO!h$uO#b%YO$P%VO$l%TO$n%UO$q%WO's$oO'uTO'xUO'|%OO(Q$rOd'}P~O!h%ZO~O!a%]O~O^%^O'j%^O~O't!iO~P%QO's%eO~O!h%ZO's%eO't!iO'|%OO~Ob%lO!h%ZO's%eO~O#n$PO~Oy%qO!X%nO!h%pO%a%tO's%eO't!iO'uTO'xUO](tP~O!t#oO~O|%vO!X%wO's%eO~O|%vO!X%wO%i%{O's%eO~O's%|O~O#o}O%a!OO%c|O%d|O%g!PO%i!QO%l!RO%m!RO~Oa&VOb&UO!t&SO%_&TO%q&RO~P;cOa&YObwO!X&XO!tvO!x]O#o}O%_{O%c|O%d|O%g!PO%i!QO%l!RO%m!RO%o!SO~O_&]O#W&`O%a&ZO't!iO~P<bO!h&aO!q&eO~O!h#kO~O!XXO~O^%^O'i&mO'j%^O~O^%^O'i&pO'j%^O~O^%^O'i&rO'j%^O~O'hYX!SYXoYX!gYX&QYX!XYX%`YX!aYX~P(dO!['PO!]&xO!^&xO't!iO'uTO'xUO~Ol&vO|&uO!U&yO(T&tO!W(XP!W(fP~P?cOg'SO!X'QO's%eO~Ob'XO!h%ZO's%eO~Oy%qO!h%pO~Ol!kO|!lO!['^O!]']O!^']O!}'`O#O'`O#P'_O#S'bO#T'bO't!iO'uTO'xUO(T!jO(_!nO~O!x;oO!|'aO~P@}O^%^O!a#rO!h%ZO!l'hO#W'fO'j%^O'|%OO(`'dO~Ol!kO|!lO'uTO'xUO(T!jO(_!nO~O!]']O!^']O't!iO~PBtO!['^O!]']O!^']O#S'bO#T'bO't!iO~PBtO!XXO!['^O!]']O!^']O#P'_O#S'bO#T'bO't!iO~PBtO'o'lO'p'lO'q'nO~O[!zO'u'pO'v!zO'w'pO~O[!}O'w'pO'x'pO'y!}O~Oq#PO!O#QO(R#QO(S'tO~O!U'vO!S&|X!S'SX!V&|X!V'SX~P+pO!V'xO!S(WX~OP$YOX$aOk#}Oy#vOz#wO|#xO!V'xO!e$PO!f#tO!h#uO!l$YO#f#{O#g#|O#h#|O#i#|O#j$OO#k$PO#l$PO#m$`O#n$PO#p$QO#r$SO#t$UO#u$VO(QVO(`$WO(g#yO(h#zO~O!S(WX~PF_O!S'}O~O!S(cX!V(cX!a(cX!g(cX(`(cX~O#W(cX#c#[X!W(cX~PHeO#W(OO!S(eX!V(eX~O!V(PO!S(dX~O!S(SO~O#W$bO~PHeO!W(TO~P`Oy#vOz#wO|#xO!f#tO!h#uO(QVOP!jaX!jak!ja!V!ja!e!ja!l!ja#f!ja#g!ja#h!ja#i!ja#j!ja#k!ja#l!ja#m!ja#n!ja#p!ja#r!ja#t!ja#u!ja(`!ja(g!ja(h!ja~O^!ja'j!ja'h!ja!S!ja!g!jao!ja!X!ja%`!ja!a!ja~PI{O!g(UO~O|%vO!X%wO!x]O#a(XO#b(WO's%eO~O!a#rO#W(YO(`'dO!V(bX^(bX'j(bX~O!g(bX~PMPO!V(]O!g(aX~O!g(_O~O|%vO!X%wO#b(WO's%eO~Oy(`Oz(aO!f#tO!h#uO!x!wa|!wa~O!t!wa%_!wa!X!wa#a!wa#b!wa's!wa~PNXO!t(eO~OPYOQYOa!gOb!fOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!XXO!csO!hZO!kYO!lYO!mYO!otO!quO!t!eO$P!hO$TfO's!bO'uTO'xUO(QVO(_[O(liO~Oi%POk$qOl$pOm$pOs%QOu%ROw<XO|$xO!X$yO!c=cO!h$uO#b<_O$P%VO$l<ZO$n<]O$q%WO's(iO'uTO'xUO'|%OO(Q$rO~O#c(kO~Oi%POk$qOl$pOm$pOs%QOu%ROw%SO|$xO!X$yO!c%XO!h$uO#b%YO$P%VO$l%TO$n%UO$q%WO's(iO'uTO'xUO'|%OO(Q$rO~Od(ZP~P!$uO!U(oO!g([P~P%QO(T(qO(_[O~O|(sO!h#uO(T(qO(_[O~OP;nOQ;nOa=_Ob!fOikOk;nOlkOmkOskOu;nOw;nO|WO!QkO!RkO!X!cO!c;qO!hZO!k;nO!l;nO!m;nO!o;rO!q;sO!t!eO$P!hO$TfO's)RO'uTO'xUO(QVO(_[O(l=]O~Oz)UO!h#uO~O!V$^O^$ja'j$ja'h$ja!g$ja!S$ja!X$ja%`$ja!a$ja~O#o)YO~P!#]Oy)]O!a)[O!X$WX$S$WX$V$WX$X$WX$`$WX~O!a)[O!X(iX$S(iX$V(iX$X(iX$`(iX~Oy)]O~P!*kOy)]O!X(iX$S(iX$V(iX$X(iX$`(iX~O!X)_O$S)cO$V)^O$X)^O$`)dO~O!U)gO~P!'RO$V$dO$X$cO$`)kO~Og$rXy$rX|$rX!f$rX(g$rX(h$rX~OdfXd$rXgfX!VfX#WfX~P!,aOl)mO~Oq)nO(R)oO(S)qO~Og)zOy)sO|)tO(g)vO(h)xO~Od)rO~P!-jOd){O~Oi%POk$qOl$pOm$pOs%QOu%ROw<XO|$xO!X$yO!c=cO!h$uO#b<_O$P%VO$l<ZO$n<]O$q%WO'uTO'xUO'|%OO(Q$rO~O!U*PO's)|O!g(mP~P!.XO#c*RO~O!h*SO~O!U*XO's*UO!S(nP~P!.XOk*eO|*]O![*cO!]*[O!^*[O!h*SO#S*dO%V*_O't!iO(T!jO~O!W*bO~P!0_O!f#tOg(PXy(PX|(PX(g(PX(h(PX!V(PX#W(PX~Od(PX#x(PX~P!1WOg*hO#W*gOd(OX!V(OX~O!V*iOd'}X~O's%|Od'}P~O!h*pO~O's(iO~O|%vO!U#fO!X%wO!x]O#a#iO#b#fO's%eO!g(aP~O!a#rO#c*tO~OP$YOX$aOk#}Oy#vOz#wO|#xO!e$PO!f#tO!h#uO!l$YO#f#{O#g#|O#h#|O#i#|O#j$OO#k$PO#l$PO#m$`O#n$PO#p$QO#r$SO#t$UO#u$VO(QVO(`$WO(g#yO(h#zO~O^!ba!V!ba'j!ba'h!ba!S!ba!g!bao!ba!X!ba%`!ba!a!ba~P!3jOy#vOz#wO|#xO!f#tO!h#uO(QVOP!naX!nak!na!V!na!e!na!l!na#f!na#g!na#h!na#i!na#j!na#k!na#l!na#m!na#n!na#p!na#r!na#t!na#u!na(`!na(g!na(h!na~O^!na'j!na'h!na!S!na!g!nao!na!X!na%`!na!a!na~P!6TOy#vOz#wO|#xO!f#tO!h#uO(QVOP!paX!pak!pa!V!pa!e!pa!l!pa#f!pa#g!pa#h!pa#i!pa#j!pa#k!pa#l!pa#m!pa#n!pa#p!pa#r!pa#t!pa#u!pa(`!pa(g!pa(h!pa~O^!pa'j!pa'h!pa!S!pa!g!pao!pa!X!pa%`!pa!a!pa~P!8nOg*|O!X'QO%`*{O'|%OO~O!a+OO!X'{X^'{X!V'{X'j'{X~O!h%ZO'|%OO~O!h%ZO's%eO'|%OO~O!a#rO#c(kO~O%a+[O's+WO'uTO'xUO!W(uP~O!V+]O](tX~O(T(qO~OX+aO~O]+bO~O!X%nO's%eO't!iO](tP~O|%vO!U+fO!V(PO!X%wO's%eO!S(dP~Ol&|O|+hO!U+gO'uTO'xUO(T(qO~O!W(fP~P!>RO!V+iO^(qX'j(qX~O#W+mO'|%OO~Og+pO!X$yO'|%OO~O!X+rO~Oy+tO!XXO~O!t+yO~Ob,OO~O's#jO!W(sP~Ob%lO~O%a!OO's%|O~P<bOX,UO],TO~OPYOQYOaxObwOikOkYOlkOmkOskOuYOwYO|WO!QkO!RkO!csO!hZO!kYO!lYO!mYO!otO!quO!tvO!x]O$TfO%_{O'uTO'xUO(QVO(_[O(liO~O!X!cO$P!hO's!bO~P!@fO],TO^%^O'j%^O~O^,YO#o,[O%c,[O%d,[O~P%QO!h&aO~O&S,aO~O!X,cO~O&e,eO&g,fOP&baQ&baV&ba^&baa&bab&bai&bak&bal&bam&bas&bau&baw&ba|&ba!Q&ba!R&ba!X&ba!c&ba!h&ba!k&ba!l&ba!m&ba!o&ba!q&ba!t&ba!x&ba#o&ba$P&ba$T&ba%_&ba%a&ba%c&ba%d&ba%g&ba%i&ba%l&ba%m&ba%o&ba%|&ba&S&ba&U&ba&W&ba&Y&ba&]&ba&c&ba&i&ba&k&ba&m&ba&o&ba&q&ba'h&ba's&ba'u&ba'x&ba(Q&ba(_&ba(l&ba!W&ba&Z&ba_&ba&`&ba~O's,kO~O!V{X!V!_X!W{X!W!_X!a{X!a!_X!h!_X#W{X'|!_X~O!a,pO#W,oO!V#`X!V(YX!W#`X!W(YX!a(YX!h(YX'|(YX~O!a,rO!h%ZO'|%OO!V!ZX!W!ZX~Ol!kO|!lO'uTO'xUO(T!jO~OP;nOQ;nOa=_Ob!fOikOk;nOlkOmkOskOu;nOw;nO|WO!QkO!RkO!X!cO!c;qO!hZO!k;nO!l;nO!m;nO!o;rO!q;sO!t!eO$P!hO$TfO'uTO'xUO(QVO(_[O(l=]O~O's<dO~P!I{O!V,vO!W(XX~O!W,xO~O!a,pO#W,oO!V#`X!W#`X~O!V,yO!W(fX~O!W,{O~O!],|O!^,|O't!iO~P!IjO!W-PO~P'TOg-SO!X'QO~O!S-XO~Ol!wa![!wa!]!wa!^!wa!|!wa!}!wa#O!wa#P!wa#S!wa#T!wa't!wa'u!wa'x!wa(T!wa(_!wa~PNXO^%^O!a#rO!h%ZO!l-^O#W-[O'j%^O'|%OO(`'dO~O!]-`O!^-`O't!iO~PBtO![-bO!]-`O!^-`O#S-cO#T-cO't!iO~PBtO![-bO!]-`O!^-`O#P-dO#S-cO#T-cO't!iO~PBtO![-bO!]-`O!^-`O!}-eO#O-eO#P-dO#S-cO#T-cO't!iO~PBtO^%^O#W-[O'j%^O~O^%^O!a#rO#W-[O'j%^O~O^%^O!a#rO!l-^O#W-[O'j%^O(`'dO~O'o'lO'p'lO'q-jO~Oo-kO~O!S&|a!V&|a~P!3jO!U-oO!S&|X!V&|X~P%QO!V'xO!S(Wa~O!S(Wa~PF_O!V(PO!S(da~O|%vO!U-sO!X%wO's%eO!S'SX!V'SX~O!V(]O!g(aa~O|%vO!X%wO#b-vO's%eO~O#W-xO!V(ba!g(ba^(ba'j(ba~O!a#rO~P#&hO|%vO!U-{O!X%wO!x]O#a-}O#b-{O's%eO!V'UX!g'UX~Oz.RO!h#uO~Og.UO!X'QO%`.TO'|%OO~O^#Zi!V#Zi'j#Zi'h#Zi!S#Zi!g#Zio#Zi!X#Zi%`#Zi!a#Zi~P!3jOg=iOy)sO|)tO(g)vO(h)xO~O#c#Va^#Va#W#Va'j#Va!V#Va!g#Va!X#Va!S#Va~P#(yO#c(PXP(PXX(PX^(PXk(PXz(PX!e(PX!h(PX!l(PX#f(PX#g(PX#h(PX#i(PX#j(PX#k(PX#l(PX#m(PX#n(PX#p(PX#r(PX#t(PX#u(PX'j(PX(Q(PX(`(PX!g(PX!S(PX'h(PXo(PX!X(PX%`(PX!a(PX~P!1WO!V._Od(ZX~P!-jOd.aO~O!V.bO!g([X~P!3jO!g.eO~O!S.gO~OP$YOy#vOz#wO|#xO!f#tO!h#uO!l$YO(QVOX#ei^#eik#ei!V#ei!e#ei#g#ei#h#ei#i#ei#j#ei#k#ei#l#ei#m#ei#n#ei#p#ei#r#ei#t#ei#u#ei'j#ei(`#ei(g#ei(h#ei'h#ei!S#ei!g#eio#ei!X#ei%`#ei!a#ei~O#f#ei~P#,uO#f#{O~P#,uOP$YOy#vOz#wO|#xO!f#tO!h#uO!l$YO#f#{O#g#|O#h#|O#i#|O(QVOX#ei^#ei!V#ei!e#ei#j#ei#k#ei#l#ei#m#ei#n#ei#p#ei#r#ei#t#ei#u#ei'j#ei(`#ei(g#ei(h#ei'h#ei!S#ei!g#eio#ei!X#ei%`#ei!a#ei~Ok#ei~P#/gOk#}O~P#/gOP$YOk#}Oy#vOz#wO|#xO!f#tO!h#uO!l$YO#f#{O#g#|O#h#|O#i#|O#j$OO(QVO^#ei!V#ei#p#ei#r#ei#t#ei#u#ei'j#ei(`#ei(g#ei(h#ei'h#ei!S#ei!g#eio#ei!X#ei%`#ei!a#ei~OX#ei!e#ei#k#ei#l#ei#m#ei#n#ei~P#2XOX$aO!e$PO#k$PO#l$PO#m$`O#n$PO~P#2XOP$YOX$aOk#}Oy#vOz#wO|#xO!e$PO!f#tO!h#uO!l$YO#f#{O#g#|O#h#|O#i#|O#j$OO#k$PO#l$PO#m$`O#n$PO#p$QO(QVO^#ei!V#ei#r#ei#t#ei#u#ei'j#ei(`#ei(h#ei'h#ei!S#ei!g#eio#ei!X#ei%`#ei!a#ei~O(g#ei~P#5YO(g#yO~P#5YOP$YOX$aOk#}Oy#vOz#wO|#xO!e$PO!f#tO!h#uO!l$YO#f#{O#g#|O#h#|O#i#|O#j$OO#k$PO#l$PO#m$`O#n$PO#p$QO#r$SO(QVO(g#yO^#ei!V#ei#t#ei#u#ei'j#ei(`#ei'h#ei!S#ei!g#eio#ei!X#ei%`#ei!a#ei~O(h#ei~P#7zO(h#zO~P#7zOP$YOX$aOk#}Oy#vOz#wO|#xO!e$PO!f#tO!h#uO!l$YO#f#{O#g#|O#h#|O#i#|O#j$OO#k$PO#l$PO#m$`O#n$PO#p$QO#r$SO#t$UO(QVO(g#yO(h#zO~O^#ei!V#ei#u#ei'j#ei(`#ei'h#ei!S#ei!g#eio#ei!X#ei%`#ei!a#ei~P#:lOPYXXYXkYXyYXzYX|YX!eYX!fYX!hYX!lYX#WYX#ccX#fYX#gYX#hYX#iYX#jYX#kYX#lYX#mYX#nYX#pYX#rYX#tYX#uYX#zYX(QYX(`YX(gYX(hYX!VYX!WYX~O#xYX~P#=VOP$YOX<VOk;yOy#vOz#wO|#xO!e;{O!f#tO!h#uO!l$YO#f;wO#g;xO#h;xO#i;xO#j;zO#k;{O#l;{O#m<UO#n;{O#p;|O#r<OO#t<QO#u<RO(QVO(`$WO(g#yO(h#zO~O#x.iO~P#?dOP(VXX(VXk(VXy(VXz(VX|(VX!e(VX!f(VX!h(VX!l(VX#f(VX#g(VX#h(VX#i(VX#j(VX#k(VX#l(VX#m(VX#p(VX#r(VX#t(VX#u(VX(Q(VX(`(VX(g(VX(h(VX!V(VX~O#W<WO#z<WO#n(VX#x(VX!W(VX~P#AbO^'Xa!V'Xa'j'Xa'h'Xa!g'Xa!S'Xao'Xa!X'Xa%`'Xa!a'Xa~P!3jOP#eiX#ei^#eik#eiz#ei!V#ei!e#ei!f#ei!h#ei!l#ei#f#ei#g#ei#h#ei#i#ei#j#ei#k#ei#l#ei#m#ei#n#ei#p#ei#r#ei#t#ei#u#ei'j#ei(Q#ei(`#ei'h#ei!S#ei!g#eio#ei!X#ei%`#ei!a#ei~P#(yO^#yi!V#yi'j#yi'h#yi!S#yi!g#yio#yi!X#yi%`#yi!a#yi~P!3jO$V.nO$X.nO~O$V.oO$X.oO~O!a)[O#W.pO!X$]X$S$]X$V$]X$X$]X$`$]X~O!U.qO~O!X)_O$S.sO$V)^O$X)^O$`.tO~O!V<SO!W(UX~P#?dO!W.uO~O!a)[O$`(iX~O$`.wO~Oq)nO(R)oO(S.zO~Ol.}O!S/OO'uTO'xUO~O!VcX!acX!gcX!g$rX(`cX~P!,aO!g/UO~P#(yO!V/VO!a#rO(`'dO!g(mX~O!g/[O~O!U*PO's%eO!g(mP~O#c/^O~O!S$rX!V$rX!a$yX~P!,aO!V/_O!S(nX~P#(yO!a/aO~O!S/cO~Ok/gO!a#rO!h%ZO'|%OO(`'dO~O's/iO~O!a+OO~O^%^O!V/mO'j%^O~O!W/oO~P!0_O!]/pO!^/pO't!iO(T!jO~O|/rO(T!jO~O#S/sO~O's%|Od'^X!V'^X~O!V*iOd'}a~Od/xO~Oy/yOz/yO|/zOgva(gva(hva!Vva#Wva~Odva#xva~P#M{Oy)sO|)tOg$ka(g$ka(h$ka!V$ka#W$ka~Od$ka#x$ka~P#NqOy)sO|)tOg$ma(g$ma(h$ma!V$ma#W$ma~Od$ma#x$ma~P$ dO#c/|O~Od${a!V${a#W${a#x${a~P!-jO#c0PO~Oy#vOz#wO|#xO!f#tO!h#uO(QVOP!niX!nik!ni!V!ni!e!ni!l!ni#f!ni#g!ni#h!ni#i!ni#j!ni#k!ni#l!ni#m!ni#n!ni#p!ni#r!ni#t!ni#u!ni(`!ni(g!ni(h!ni~O^!ni'j!ni'h!ni!S!ni!g!nio!ni!X!ni%`!ni!a!ni~P$!qOg.UO!X'QO%`.TO~Oi0WO's0VO~P!.[O!a+OO!X'{a^'{a!V'{a'j'{a~O#c0^O~OXYX!VcX!WcX~O!V0_O!W(uX~O!W0aO~OX0bO~O's+WO'uTO'xUO~O!X%nO's%eO]'fX!V'fX~O!V+]O](ta~O!g0gO~P!3jOX0jO~O]0kO~O!V+iO^(qa'j(qa~O#W0qO~Og0tO!X$yO~O(T(qO!W(rP~Og0}O!X0zO%`0|O'|%OO~OX1XO!V1VO!W(sX~O!W1YO~O]1[O^%^O'j%^O~O's#jO'uTO'xUO~O#W$bO#n1_O#z$bO&Q1`O^(VX~P#AbO#W$bO#n1_O&Q1`O~O^1aO~P%QO^1cO~O&Z1gOP&XiQ&XiV&Xi^&Xia&Xib&Xii&Xik&Xil&Xim&Xis&Xiu&Xiw&Xi|&Xi!Q&Xi!R&Xi!X&Xi!c&Xi!h&Xi!k&Xi!l&Xi!m&Xi!o&Xi!q&Xi!t&Xi!x&Xi#o&Xi$P&Xi$T&Xi%_&Xi%a&Xi%c&Xi%d&Xi%g&Xi%i&Xi%l&Xi%m&Xi%o&Xi%|&Xi&S&Xi&U&Xi&W&Xi&Y&Xi&]&Xi&c&Xi&i&Xi&k&Xi&m&Xi&o&Xi&q&Xi'h&Xi's&Xi'u&Xi'x&Xi(Q&Xi(_&Xi(l&Xi!W&Xi_&Xi&`&Xi~O_1mO!W1kO&`1lO~P`O!XXO!h1oO~O&g,fOP&biQ&biV&bi^&bia&bib&bii&bik&bil&bim&bis&biu&biw&bi|&bi!Q&bi!R&bi!X&bi!c&bi!h&bi!k&bi!l&bi!m&bi!o&bi!q&bi!t&bi!x&bi#o&bi$P&bi$T&bi%_&bi%a&bi%c&bi%d&bi%g&bi%i&bi%l&bi%m&bi%o&bi%|&bi&S&bi&U&bi&W&bi&Y&bi&]&bi&c&bi&i&bi&k&bi&m&bi&o&bi&q&bi'h&bi's&bi'u&bi'x&bi(Q&bi(_&bi(l&bi!W&bi&Z&bi_&bi&`&bi~O!S1uO~O!V!Za!W!Za~P#?dOl!kO|!lO!U1{O(T!jO!V&}X!W&}X~P?cO!V,vO!W(Xa~O!V'TX!W'TX~P!>RO!V,yO!W(fa~O!W2SO~P'TO^%^O#W2]O'j%^O~O^%^O!a#rO#W2]O'j%^O~O^%^O!a#rO!h%ZO!l2aO#W2]O'j%^O'|%OO(`'dO~O!]2bO!^2bO't!iO~PBtO![2eO!]2bO!^2bO#S2fO#T2fO't!iO~PBtO![2eO!]2bO!^2bO#P2gO#S2fO#T2fO't!iO~PBtO^%^O!a#rO!l2aO#W2]O'j%^O(`'dO~O^%^O'j%^O~P!3jO!V$^Oo$ja~O!S&|i!V&|i~P!3jO!V'xO!S(Wi~O!V(PO!S(di~O!S(ei!V(ei~P!3jO!V(]O!g(ai~O!V(bi!g(bi^(bi'j(bi~P!3jO#W2kO!V(bi!g(bi^(bi'j(bi~O|%vO!X%wO!x]O#a2nO#b2mO's%eO~O|%vO!X%wO#b2mO's%eO~Og2uO!X'QO%`2tO~Og2uO!X'QO%`2tO'|%OO~O#cvaPvaXva^vakva!eva!fva!hva!lva#fva#gva#hva#iva#jva#kva#lva#mva#nva#pva#rva#tva#uva'jva(Qva(`va!gva!Sva'hvaova!Xva%`va!ava~P#M{O#c$kaP$kaX$ka^$kak$kaz$ka!e$ka!f$ka!h$ka!l$ka#f$ka#g$ka#h$ka#i$ka#j$ka#k$ka#l$ka#m$ka#n$ka#p$ka#r$ka#t$ka#u$ka'j$ka(Q$ka(`$ka!g$ka!S$ka'h$kao$ka!X$ka%`$ka!a$ka~P#NqO#c$maP$maX$ma^$mak$maz$ma!e$ma!f$ma!h$ma!l$ma#f$ma#g$ma#h$ma#i$ma#j$ma#k$ma#l$ma#m$ma#n$ma#p$ma#r$ma#t$ma#u$ma'j$ma(Q$ma(`$ma!g$ma!S$ma'h$mao$ma!X$ma%`$ma!a$ma~P$ dO#c${aP${aX${a^${ak${az${a!V${a!e${a!f${a!h${a!l${a#f${a#g${a#h${a#i${a#j${a#k${a#l${a#m${a#n${a#p${a#r${a#t${a#u${a'j${a(Q${a(`${a!g${a!S${a'h${a#W${ao${a!X${a%`${a!a${a~P#(yO^#Zq!V#Zq'j#Zq'h#Zq!S#Zq!g#Zqo#Zq!X#Zq%`#Zq!a#Zq~P!3jOd'OX!V'OX~P!$uO!V._Od(Za~O!U2}O!V'PX!g'PX~P%QO!V.bO!g([a~O!V.bO!g([a~P!3jO!S3QO~O#x!ja!W!ja~PI{O#x!ba!V!ba!W!ba~P#?dO#x!na!W!na~P!6TO#x!pa!W!pa~P!8nO!X3dO$TfO$^3eO~O!W3iO~Oo3jO~P#(yO^$gq!V$gq'j$gq'h$gq!S$gq!g$gqo$gq!X$gq%`$gq!a$gq~P!3jO!S3kO~Ol.}O'uTO'xUO~Oy)sO|)tO(h)xOg%Wi(g%Wi!V%Wi#W%Wi~Od%Wi#x%Wi~P$HbOy)sO|)tOg%Yi(g%Yi(h%Yi!V%Yi#W%Yi~Od%Yi#x%Yi~P$ITO(`$WO~P#(yO!U3nO's%eO!V'YX!g'YX~O!V/VO!g(ma~O!V/VO!a#rO!g(ma~O!V/VO!a#rO(`'dO!g(ma~Od$ti!V$ti#W$ti#x$ti~P!-jO!U3vO's*UO!S'[X!V'[X~P!.XO!V/_O!S(na~O!V/_O!S(na~P#(yO!a#rO~O!a#rO#n4OO~Ok4RO!a#rO(`'dO~Od(Oi!V(Oi~P!-jO#W4UOd(Oi!V(Oi~P!-jO!g4XO~O^$hq!V$hq'j$hq'h$hq!S$hq!g$hqo$hq!X$hq%`$hq!a$hq~P!3jO!V4]O!X(oX~P#(yO!f#tO~P3zO!X$rX%TYX^$rX!V$rX'j$rX~P!,aO%T4_OghXyhX|hX!XhX(ghX(hhX^hX!VhX'jhX~O%T4_O~O%a4fO's+WO'uTO'xUO!V'eX!W'eX~O!V0_O!W(ua~OX4jO~O]4kO~O!S4oO~O^%^O'j%^O~P#(yO!X$yO~P#(yO!V4tO#W4vO!W(rX~O!W4wO~Ol!kO|4yO![5WO!]4}O!^4}O!x;oO!|5VO!}5UO#O5UO#P5TO#S5SO#T!wO't!iO'uTO'xUO(T!jO(_!nO~O!W5RO~P%#XOg5]O!X0zO%`5[O~Og5]O!X0zO%`5[O'|%OO~O's#jO!V'dX!W'dX~O!V1VO!W(sa~O'uTO'xUO(T5fO~O]5jO~O!g5mO~P%QO^5oO~O^5oO~P%QO#n5qO&Q5rO~PMPO_1mO!W5vO&`1lO~P`O!a5xO~O!a5zO!V(Yi!W(Yi!a(Yi!h(Yi'|(Yi~O!V#`i!W#`i~P#?dO#W5{O!V#`i!W#`i~O!V!Zi!W!Zi~P#?dO^%^O#W6UO'j%^O~O^%^O!a#rO#W6UO'j%^O~O^%^O!a#rO!l6ZO#W6UO'j%^O(`'dO~O!h%ZO'|%OO~P%(fO!]6[O!^6[O't!iO~PBtO![6_O!]6[O!^6[O#S6`O#T6`O't!iO~PBtO!V(]O!g(aq~O!V(bq!g(bq^(bq'j(bq~P!3jO|%vO!X%wO#b6dO's%eO~O!X'QO%`6gO~Og6jO!X'QO%`6gO~O#c%WiP%WiX%Wi^%Wik%Wiz%Wi!e%Wi!f%Wi!h%Wi!l%Wi#f%Wi#g%Wi#h%Wi#i%Wi#j%Wi#k%Wi#l%Wi#m%Wi#n%Wi#p%Wi#r%Wi#t%Wi#u%Wi'j%Wi(Q%Wi(`%Wi!g%Wi!S%Wi'h%Wio%Wi!X%Wi%`%Wi!a%Wi~P$HbO#c%YiP%YiX%Yi^%Yik%Yiz%Yi!e%Yi!f%Yi!h%Yi!l%Yi#f%Yi#g%Yi#h%Yi#i%Yi#j%Yi#k%Yi#l%Yi#m%Yi#n%Yi#p%Yi#r%Yi#t%Yi#u%Yi'j%Yi(Q%Yi(`%Yi!g%Yi!S%Yi'h%Yio%Yi!X%Yi%`%Yi!a%Yi~P$ITO#c$tiP$tiX$ti^$tik$tiz$ti!V$ti!e$ti!f$ti!h$ti!l$ti#f$ti#g$ti#h$ti#i$ti#j$ti#k$ti#l$ti#m$ti#n$ti#p$ti#r$ti#t$ti#u$ti'j$ti(Q$ti(`$ti!g$ti!S$ti'h$ti#W$tio$ti!X$ti%`$ti!a$ti~P#(yOd'Oa!V'Oa~P!-jO!V'Pa!g'Pa~P!3jO!V.bO!g([i~O#x#Zi!V#Zi!W#Zi~P#?dOP$YOy#vOz#wO|#xO!f#tO!h#uO!l$YO(QVOX#eik#ei!e#ei#g#ei#h#ei#i#ei#j#ei#k#ei#l#ei#m#ei#n#ei#p#ei#r#ei#t#ei#u#ei#x#ei(`#ei(g#ei(h#ei!V#ei!W#ei~O#f#ei~P%2xO#f;wO~P%2xOP$YOy#vOz#wO|#xO!f#tO!h#uO!l$YO#f;wO#g;xO#h;xO#i;xO(QVOX#ei!e#ei#j#ei#k#ei#l#ei#m#ei#n#ei#p#ei#r#ei#t#ei#u#ei#x#ei(`#ei(g#ei(h#ei!V#ei!W#ei~Ok#ei~P%5TOk;yO~P%5TOP$YOk;yOy#vOz#wO|#xO!f#tO!h#uO!l$YO#f;wO#g;xO#h;xO#i;xO#j;zO(QVO#p#ei#r#ei#t#ei#u#ei#x#ei(`#ei(g#ei(h#ei!V#ei!W#ei~OX#ei!e#ei#k#ei#l#ei#m#ei#n#ei~P%7`OX<VO!e;{O#k;{O#l;{O#m<UO#n;{O~P%7`OP$YOX<VOk;yOy#vOz#wO|#xO!e;{O!f#tO!h#uO!l$YO#f;wO#g;xO#h;xO#i;xO#j;zO#k;{O#l;{O#m<UO#n;{O#p;|O(QVO#r#ei#t#ei#u#ei#x#ei(`#ei(h#ei!V#ei!W#ei~O(g#ei~P%9zO(g#yO~P%9zOP$YOX<VOk;yOy#vOz#wO|#xO!e;{O!f#tO!h#uO!l$YO#f;wO#g;xO#h;xO#i;xO#j;zO#k;{O#l;{O#m<UO#n;{O#p;|O#r<OO(QVO(g#yO#t#ei#u#ei#x#ei(`#ei!V#ei!W#ei~O(h#ei~P%<VO(h#zO~P%<VOP$YOX<VOk;yOy#vOz#wO|#xO!e;{O!f#tO!h#uO!l$YO#f;wO#g;xO#h;xO#i;xO#j;zO#k;{O#l;{O#m<UO#n;{O#p;|O#r<OO#t<QO(QVO(g#yO(h#zO~O#u#ei#x#ei(`#ei!V#ei!W#ei~P%>bO^#vy!V#vy'j#vy'h#vy!S#vy!g#vyo#vy!X#vy%`#vy!a#vy~P!3jOg=jOy)sO|)tO(g)vO(h)xO~OP#eiX#eik#eiz#ei!e#ei!f#ei!h#ei!l#ei#f#ei#g#ei#h#ei#i#ei#j#ei#k#ei#l#ei#m#ei#n#ei#p#ei#r#ei#t#ei#u#ei#x#ei(Q#ei(`#ei!V#ei!W#ei~P%AYO!f#tOP(PXX(PXg(PXk(PXy(PXz(PX|(PX!e(PX!h(PX!l(PX#f(PX#g(PX#h(PX#i(PX#j(PX#k(PX#l(PX#m(PX#n(PX#p(PX#r(PX#t(PX#u(PX#x(PX(Q(PX(`(PX(g(PX(h(PX!V(PX!W(PX~O#x#yi!V#yi!W#yi~P#?dO#x!ni!W!ni~P$!qO!W6vO~O!V'Xa!W'Xa~P#?dO!a#rO(`'dO!V'Ya!g'Ya~O!V/VO!g(mi~O!V/VO!a#rO!g(mi~Od$tq!V$tq#W$tq#x$tq~P!-jO!S'[a!V'[a~P#(yO!a6}O~O!V/_O!S(ni~P#(yO!V/_O!S(ni~O!S7RO~O!a#rO#n7WO~Ok7XO!a#rO(`'dO~O!S7ZO~Od$vq!V$vq#W$vq#x$vq~P!-jO^$hy!V$hy'j$hy'h$hy!S$hy!g$hyo$hy!X$hy%`$hy!a$hy~P!3jO!V4]O!X(oa~O^#Zy!V#Zy'j#Zy'h#Zy!S#Zy!g#Zyo#Zy!X#Zy%`#Zy!a#Zy~P!3jOX7`O~O!V0_O!W(ui~O]7fO~O!a5zO~O(T(qO!V'aX!W'aX~O!V4tO!W(ra~O!h%ZO'|%OO^(YX!a(YX!l(YX#W(YX'j(YX(`(YX~O's7oO~P.[O!x;oO!|7rO!}7qO#O7qO#P7pO#S'bO#T'bO~PBtO^%^O!a#rO!l'hO#W'fO'j%^O(`'dO~O!W7vO~P%#XOl!kO'uTO'xUO(T!jO(_!nO~O|7wO~P%MdO![7{O!]7zO!^7zO#P7pO#S'bO#T'bO't!iO~PBtO![7{O!]7zO!^7zO!}7|O#O7|O#P7pO#S'bO#T'bO't!iO~PBtO!]7zO!^7zO't!iO(T!jO(_!nO~O!X0zO~O!X0zO%`8OO~Og8RO!X0zO%`8OO~OX8WO!V'da!W'da~O!V1VO!W(si~O!g8[O~O!g8]O~O!g8^O~O!g8^O~P%QO^8`O~O!a8cO~O!g8dO~O!V(ei!W(ei~P#?dO^%^O#W8lO'j%^O~O^%^O!a#rO#W8lO'j%^O~O^%^O!a#rO!l8pO#W8lO'j%^O(`'dO~O!h%ZO'|%OO~P&$QO!]8qO!^8qO't!iO~PBtO!V(]O!g(ay~O!V(by!g(by^(by'j(by~P!3jO!X'QO%`8uO~O#c$tqP$tqX$tq^$tqk$tqz$tq!V$tq!e$tq!f$tq!h$tq!l$tq#f$tq#g$tq#h$tq#i$tq#j$tq#k$tq#l$tq#m$tq#n$tq#p$tq#r$tq#t$tq#u$tq'j$tq(Q$tq(`$tq!g$tq!S$tq'h$tq#W$tqo$tq!X$tq%`$tq!a$tq~P#(yO#c$vqP$vqX$vq^$vqk$vqz$vq!V$vq!e$vq!f$vq!h$vq!l$vq#f$vq#g$vq#h$vq#i$vq#j$vq#k$vq#l$vq#m$vq#n$vq#p$vq#r$vq#t$vq#u$vq'j$vq(Q$vq(`$vq!g$vq!S$vq'h$vq#W$vqo$vq!X$vq%`$vq!a$vq~P#(yO!V'Pi!g'Pi~P!3jO#x#Zq!V#Zq!W#Zq~P#?dOy/yOz/yO|/zOPvaXvagvakva!eva!fva!hva!lva#fva#gva#hva#iva#jva#kva#lva#mva#nva#pva#rva#tva#uva#xva(Qva(`va(gva(hva!Vva!Wva~Oy)sO|)tOP$kaX$kag$kak$kaz$ka!e$ka!f$ka!h$ka!l$ka#f$ka#g$ka#h$ka#i$ka#j$ka#k$ka#l$ka#m$ka#n$ka#p$ka#r$ka#t$ka#u$ka#x$ka(Q$ka(`$ka(g$ka(h$ka!V$ka!W$ka~Oy)sO|)tOP$maX$mag$mak$maz$ma!e$ma!f$ma!h$ma!l$ma#f$ma#g$ma#h$ma#i$ma#j$ma#k$ma#l$ma#m$ma#n$ma#p$ma#r$ma#t$ma#u$ma#x$ma(Q$ma(`$ma(g$ma(h$ma!V$ma!W$ma~OP${aX${ak${az${a!e${a!f${a!h${a!l${a#f${a#g${a#h${a#i${a#j${a#k${a#l${a#m${a#n${a#p${a#r${a#t${a#u${a#x${a(Q${a(`${a!V${a!W${a~P%AYO#x$gq!V$gq!W$gq~P#?dO#x$hq!V$hq!W$hq~P#?dO!W9PO~O#x9QO~P!-jO!a#rO!V'Yi!g'Yi~O!a#rO(`'dO!V'Yi!g'Yi~O!V/VO!g(mq~O!S'[i!V'[i~P#(yO!V/_O!S(nq~O!S9WO~P#(yO!S9WO~Od(Oy!V(Oy~P!-jO!V'_a!X'_a~P#(yO!X%Sq^%Sq!V%Sq'j%Sq~P#(yOX9]O~O!V0_O!W(uq~O#W9aO!V'aa!W'aa~O!V4tO!W(ri~P#?dOPYXXYXkYXyYXzYX|YX!SYX!VYX!eYX!fYX!hYX!lYX#WYX#ccX#fYX#gYX#hYX#iYX#jYX#kYX#lYX#mYX#nYX#pYX#rYX#tYX#uYX#zYX(QYX(`YX(gYX(hYX~O!a%QX#n%QX~P&6lO#S-cO#T-cO~PBtO#P9eO#S-cO#T-cO~PBtO!}9fO#O9fO#P9eO#S-cO#T-cO~PBtO!]9iO!^9iO't!iO(T!jO(_!nO~O![9lO!]9iO!^9iO#P9eO#S-cO#T-cO't!iO~PBtO!X0zO%`9oO~O'uTO'xUO(T9tO~O!V1VO!W(sq~O!g9wO~O!g9wO~P%QO!g9yO~O!g9zO~O#W9|O!V#`y!W#`y~O!V#`y!W#`y~P#?dO^%^O#W:QO'j%^O~O^%^O!a#rO#W:QO'j%^O~O^%^O!a#rO!l:UO#W:QO'j%^O(`'dO~O!X'QO%`:XO~O#x#vy!V#vy!W#vy~P#?dOP$tiX$tik$tiz$ti!e$ti!f$ti!h$ti!l$ti#f$ti#g$ti#h$ti#i$ti#j$ti#k$ti#l$ti#m$ti#n$ti#p$ti#r$ti#t$ti#u$ti#x$ti(Q$ti(`$ti!V$ti!W$ti~P%AYOy)sO|)tO(h)xOP%WiX%Wig%Wik%Wiz%Wi!e%Wi!f%Wi!h%Wi!l%Wi#f%Wi#g%Wi#h%Wi#i%Wi#j%Wi#k%Wi#l%Wi#m%Wi#n%Wi#p%Wi#r%Wi#t%Wi#u%Wi#x%Wi(Q%Wi(`%Wi(g%Wi!V%Wi!W%Wi~Oy)sO|)tOP%YiX%Yig%Yik%Yiz%Yi!e%Yi!f%Yi!h%Yi!l%Yi#f%Yi#g%Yi#h%Yi#i%Yi#j%Yi#k%Yi#l%Yi#m%Yi#n%Yi#p%Yi#r%Yi#t%Yi#u%Yi#x%Yi(Q%Yi(`%Yi(g%Yi(h%Yi!V%Yi!W%Yi~O#x$hy!V$hy!W$hy~P#?dO#x#Zy!V#Zy!W#Zy~P#?dO!a#rO!V'Yq!g'Yq~O!V/VO!g(my~O!S'[q!V'[q~P#(yO!S:`O~P#(yO!V0_O!W(uy~O!V4tO!W(rq~O#S2fO#T2fO~PBtO#P:gO#S2fO#T2fO~PBtO!]:kO!^:kO't!iO(T!jO(_!nO~O!X0zO%`:nO~O!g:qO~O^%^O#W:vO'j%^O~O^%^O!a#rO#W:vO'j%^O~O!X'QO%`:{O~OP$tqX$tqk$tqz$tq!e$tq!f$tq!h$tq!l$tq#f$tq#g$tq#h$tq#i$tq#j$tq#k$tq#l$tq#m$tq#n$tq#p$tq#r$tq#t$tq#u$tq#x$tq(Q$tq(`$tq!V$tq!W$tq~P%AYOP$vqX$vqk$vqz$vq!e$vq!f$vq!h$vq!l$vq#f$vq#g$vq#h$vq#i$vq#j$vq#k$vq#l$vq#m$vq#n$vq#p$vq#r$vq#t$vq#u$vq#x$vq(Q$vq(`$vq!V$vq!W$vq~P%AYOd%[!Z!V%[!Z#W%[!Z#x%[!Z~P!-jO!V'aq!W'aq~P#?dO#S6`O#T6`O~PBtO!V#`!Z!W#`!Z~P#?dO^%^O#W;ZO'j%^O~O#c%[!ZP%[!ZX%[!Z^%[!Zk%[!Zz%[!Z!V%[!Z!e%[!Z!f%[!Z!h%[!Z!l%[!Z#f%[!Z#g%[!Z#h%[!Z#i%[!Z#j%[!Z#k%[!Z#l%[!Z#m%[!Z#n%[!Z#p%[!Z#r%[!Z#t%[!Z#u%[!Z'j%[!Z(Q%[!Z(`%[!Z!g%[!Z!S%[!Z'h%[!Z#W%[!Zo%[!Z!X%[!Z%`%[!Z!a%[!Z~P#(yOP%[!ZX%[!Zk%[!Zz%[!Z!e%[!Z!f%[!Z!h%[!Z!l%[!Z#f%[!Z#g%[!Z#h%[!Z#i%[!Z#j%[!Z#k%[!Z#l%[!Z#m%[!Z#n%[!Z#p%[!Z#r%[!Z#t%[!Z#u%[!Z#x%[!Z(Q%[!Z(`%[!Z!V%[!Z!W%[!Z~P%AYOo(UX~P1dO't!iO~P!'RO!ScX!VcX#WcX~P&6lOPYXXYXkYXyYXzYX|YX!VYX!VcX!eYX!fYX!hYX!lYX#WYX#WcX#ccX#fYX#gYX#hYX#iYX#jYX#kYX#lYX#mYX#nYX#pYX#rYX#tYX#uYX#zYX(QYX(`YX(gYX(hYX~O!acX!gYX!gcX(`cX~P'!sOP;nOQ;nOa=_Ob!fOikOk;nOlkOmkOskOu;nOw;nO|WO!QkO!RkO!XXO!c;qO!hZO!k;nO!l;nO!m;nO!o;rO!q;sO!t!eO$P!hO$TfO's)RO'uTO'xUO(QVO(_[O(l=]O~O!V<SO!W$ja~Oi%POk$qOl$pOm$pOs%QOu%ROw<YO|$xO!X$yO!c=dO!h$uO#b<`O$P%VO$l<[O$n<^O$q%WO's(iO'uTO'xUO'|%OO(Q$rO~O#o)YO~P''iO!WYX!WcX~P'!sO#c;vO~O!a#rO#c;vO~O#W<WO~O#n;{O~O#W<bO!V(eX!W(eX~O#W<WO!V(cX!W(cX~O#c<cO~Od<eO~P!-jO#c<jO~O#c<kO~O!a#rO#c<lO~O!a#rO#c<cO~O#x<mO~P#?dO#c<nO~O#c<oO~O#c<pO~O#c<qO~O#c<rO~O#c<sO~O#x<tO~P!-jO#x<uO~P!-jO$T~!f!|#O#P#S#a#b#m(l$l$n$q%T%_%`%a%g%i%l%m%o%q~'nR$T(l#g!R'l't#hl#f#iky'm(T'm's$V$X$V~",
  goto: "$/X(yPPPP(zP(}P)_P+a/fPPPP6iPP7OP<|@mPAQPAQPPPAQPBpPAQPAQPAQPBtPPByPCdPH`PPPHdPPPPHdKfPPPKlMlPHdP!!SPPPP!$eHdPPPHdPHdP!&vHdP!*]!+_!+dP!,U!,Y!,UPPPP!/f!1kPP!1t!3OP!+_HdHd!6b!9m!>v!>v!BnPPP!BuHdPPPPPPPPPPP!FTP!GiPPHd!HyPHdPHdHdHdHdPHd!J`PP!MiP#!nP#!r#!|##Q##QP!MfP##U##UP#&ZP#&_HdHd#&e#)iAQPAQPAQAQP#*sAQAQ#,mAQ#.zAQ#0nAQAQ#1[#3W#3W#3[#3d#3W#3lP#3WPAQ#4hAQ#5pAQAQ6iPPP#6{PP#7e#7eP#7eP#7z#7ePP#8QP#7wP#7w#8d!1p#7w#9O#9U6f(}#9X(}P#9`#9`#9`P(}P(}P(}P(}PP(}P#9f#9iP#9i(}P#9mP#9pP(}P(}P(}P(}P(}P(}(}PP#9v#9|#:W#:^#:d#:j#:p#;O#;U#;[#;f#;l#<h#<w#<}#=a#=g#=m#={#>b#?r#@Q#@W#@^#@d#@j#@t#@z#AQ#A[#An#AtPPPPPPPPPP#AzPPPPPPP#Bn#FYP#Gu#G|#HUPPPP#L`$ U$'t$'w$'z$)w$)z$)}$*UPP$*[$*`$+X$,X$,]$,qPP$,u$,{$-PP$-S$-W$-Z$.P$.g$.l$.o$.r$.x$.{$/P$/TR!yRmpOXr!X#a%]&d&f&g&i,^,c1g1jU!pQ'Q-OQ%ctQ%kwQ%rzQ&[!TS&x!c,vQ'W!f[']!m!r!s!t!u!vS*[$y*aQ+U%lQ+c%tQ+}&UQ,|'PQ-W'XW-`'^'_'`'aQ/p*cQ1U,OU2b-b-d-eS4}0z5QS6[2e2gU7z5U5V5WQ8q6_S9i7{7|Q:k9lR<a;r%QdOPWXYZrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$^$b%]%c%p&]&`&d&f&g&i&m&u'S'f'v'x(O(Y(k(o(s)r*t+h,Y,^,c-S-[-o-x.b.i/z0P0^0}1_1`1a1c1g1j1l2]2k2}4y5]5o5q5r6U7w8R8`8l:Q:v;ZS#m];o!r)T$X$j&y)g,o,r.q1{3d4v5{9a9|;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`Q*l%SQ+Z%nQ,P&XQ,W&aQ.X<XQ0T*|Q0X+OQ0d+[Q1^,UQ2q.UQ4e0_Q5d1VQ6i2uQ6o<YQ7b4fR8x6j'OkOPWXYZrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$X$^$b$j%]%c%p&]&`&a&d&f&g&i&m&u&y'S'f'v'x(O(Y(k(o(s)g)r*t*|+h,Y,^,c,o,r-S-[-o-x.U.b.i.q/z0P0^0}1_1`1a1c1g1j1l1{2]2k2u2}3d4v4y5]5o5q5r5{6U6j7w8R8`8l9a9|:Q:v;Z;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`#S!kQ!m!p!r!s!t!u!v!w&x'P'Q']'^'_'`'a'b,v,|-O-`-b-c-d-e0z2b2e2f2g4z5Q5S5T5U5V6[6_6`7p7q7r7|8q9e9f:g$Y$pi#r#t$`$a$u$x%T%U%Y)n)w)y)z*R*X*g*h*{+O+m+p.T._/^/_/a/|0q0t0|2t3l3v4O4U4]4_5[6g6}7W8O8u9Q9o:X:n:{<U<V<Z<[<]<^<_<`<f<g<h<i<j<k<n<o<p<q<t<u=]=e=f=i=jQ%uzQ&v!cS&|%w,yQ+Z%nS.})t/PQ/{*pQ0d+[Q0i+bQ1],TQ1^,UQ4e0_Q4n0kQ5g1XQ5h1[Q7b4fQ7e4kQ8Z5jQ9`7fR9u8WpmOXr!T!X#a%]&Z&d&f&g&i,^,c1g1jR,R&]&x`OPXYrstux!X!^!g!l#P#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$X$^$b$j%]%c%p&]&`&a&d&f&g&i&m&u'S'f'x(O(Y(k(o(s)g)r*t*|+h,Y,^,c,o,r-S-[-o-x.U.b.i.q/z0P0^0}1_1`1a1c1g1j1l1{2]2k2u2}3d4v4y5]5o5q5r5{6U6j7w8R8`8l9a9|:Q:v;Z;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=_=`[#YWZ#T#W&y'vQ%fvQ%jwS%oz%t!U%x|}#d#f#i%Z%v(P(W(X(]+f+g+i,[,p-s-v-z-{-}1o2m2n5z6dQ&Q!RQ'T!eQ'V!fQ(d#oS*O$u*SS+T%k%lQ+X%nQ+x&SQ+|&US-V'W'XQ.W(eQ/Z*PQ0]+UQ0c+[Q0e+]Q0h+aQ1P+yS1T+},OQ2X-WQ3m/VQ4d0_Q4h0bQ4m0jQ5c1UQ6z3nQ7a4fQ7d4jQ9[7`R:b9]v$wi#t%T%U%Y)w)y*R*g*h._/^/|3l4U9Q=]=e=f!`%hw!f!o%j%k%l&w'V'W'X'['i*Z+T+U,s-V-W-_-a/h0]2Q2X2`2d4Q6Y6^8o:TQ*}%fQ+n%}Q+q&OQ+{&UQ.V(dQ1O+xU1S+|+},OQ2v.WQ5^1PS5b1T1US7n4x4|Q8V5cU9g7s7x7yU:i9h9j9kQ;R:jQ;a;S!z=a#r$`$a$u$x)n)z*X*{+O+m+p.T/_/a0q0t0|2t3v4O4]4_5[6g6}7W8O8u9o:X:n:{<Z<]<_<f<h<j<n<p<t=i=jg=b<U<V<[<^<`<g<i<k<o<q<uW$|i%O*i=]S%}!O&ZQ&O!PQ&P!QR+l%{$Z${i#r#t$`$a$u$x%T%U%Y)n)w)y)z*R*X*g*h*{+O+m+p.T._/^/_/a/|0q0t0|2t3l3v4O4U4]4_5[6g6}7W8O8u9Q9o:X:n:{<U<V<Z<[<]<^<_<`<f<g<h<i<j<k<n<o<p<q<t<u=]=e=f=i=jT)o$r)pV*m%S<X<YU&|!c%w,yS(r#v#wQ+`%qS.P(`(aQ0u+rQ4V/yR7j4t'OkOPWXYZrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$X$^$b$j%]%c%p&]&`&a&d&f&g&i&m&u&y'S'f'v'x(O(Y(k(o(s)g)r*t*|+h,Y,^,c,o,r-S-[-o-x.U.b.i.q/z0P0^0}1_1`1a1c1g1j1l1{2]2k2u2}3d4v4y5]5o5q5r5{6U6j7w8R8`8l9a9|:Q:v;Z;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`$o$]c#V#b%a%b%d'u'{(g(n(v(w(x(y(z({(|(})O)P)Q)S)V)Z)e*y+_,t-h-m-r-w.^.d.h.j.k.l.{/}1v1y2Z2j2|3R3S3T3U3V3W3X3Y3Z3[3]3^3_3b3c3h4Z4b5}6T6b6m6n6s6t7l8f8j8y8}9O:O:d:r:t;X;d;p=ST#QV#R'PkOPWXYZrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$X$^$b$j%]%c%p&]&`&a&d&f&g&i&m&u&y'S'f'v'x(O(Y(k(o(s)g)r*t*|+h,Y,^,c,o,r-S-[-o-x.U.b.i.q/z0P0^0}1_1`1a1c1g1j1l1{2]2k2u2}3d4v4y5]5o5q5r5{6U6j7w8R8`8l9a9|:Q:v;Z;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`Q&z!cR1|,v!z!kQ!c!m!p!r!s!t!u!v!w&x'P'Q']'^'_'`'a'b,v,|-O-`-b-c-d-e2b2e2f2g4z5S5T6[6_6`7p7q7r8q9e9f:gS*Z$y*aS/h*[*cQ/q*dQ0w+tQ4Q/pQ4T/sS4x0z5QS7s4}5WS7x5U5VS9h7z7{Q9j7|S:j9i9lR;S:klpOXr!X#a%]&d&f&g&i,^,c1g1jQ&k![Q'j!tS(f#q;vQ+R%iQ+v&QQ+w&RQ-T'UQ-g'cS.](k<cS0O*t<lQ0Z+SQ0y+uQ1n,eQ1p,fQ1x,qQ2V-UQ2Y-YS4[0P<rQ4`0[S4c0^<sQ5|1zQ6Q2WQ6V2_Q7_4aQ8g6OQ8h6RQ8k6WQ9{8dQ:P8mQ:u:RR;Y:w$j$[c#V#b%b%d'u'{(g(n(v(w(x(y(z({(|(})O)P)Q)S)V)Z)e*y+_,t-h-m-r-w.^.d.h.k.l.{/}1v1y2Z2j2|3R3S3T3U3V3W3X3Y3Z3[3]3^3_3b3c3h4Z4b5}6T6b6m6n6s6t7l8f8j8y8}9O:O:d:r:t;X;d;p=SS(c#l'ZU*f$z(j3aS*x%a.jQ2r0TQ6f2qQ8w6iR:Y8x$j$Zc#V#b%b%d'u'{(g(n(v(w(x(y(z({(|(})O)P)Q)S)V)Z)e*y+_,t-h-m-r-w.^.d.h.k.l.{/}1v1y2Z2j2|3R3S3T3U3V3W3X3Y3Z3[3]3^3_3b3c3h4Z4b5}6T6b6m6n6s6t7l8f8j8y8}9O:O:d:r:t;X;d;p=SS(b#l'ZS(t#w$[S*w%a.jS.Q(a(cQ.m)UQ0Q*xR2o.R'OkOPWXYZrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$X$^$b$j%]%c%p&]&`&a&d&f&g&i&m&u&y'S'f'v'x(O(Y(k(o(s)g)r*t*|+h,Y,^,c,o,r-S-[-o-x.U.b.i.q/z0P0^0}1_1`1a1c1g1j1l1{2]2k2u2}3d4v4y5]5o5q5r5{6U6j7w8R8`8l9a9|:Q:v;Z;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`S#m];oQ&f!VQ&g!WQ&i!YQ&j!ZR1f,aQ'R!eQ*z%fQ-R'TS.S(d*}Q2T-QW2s.V.W0S0UQ6P2UU6e2p2r2vS8t6f6hS:W8v8wS:y:V:YQ;[:zR;e;]V!qQ'Q-O!_^OQXZ_r!T!X!m#a#d%Z%]&Z&]&d&f&g&i'Q(],^,c-O-z0z1g1j4z5QT#m];o%[yOPWXYZrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$^$b%]%c%p&]&`&a&d&f&g&i&m&u'S'f'v'x(O(Y(k(o(s)r*t*|+h,Y,^,c-S-[-o-x.U.b.i/z0P0^0}1_1`1a1c1g1j1l2]2k2u2}4y5]5o5q5r6U6j7w8R8`8l:Q:v;ZS(r#v#wS.P(`(a!s<y$X$j&y)g,o,r.q1{3d4v5{9a9|;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`U!oQ'Q-OY'[!m!s!t!u!vS'i!p!rW'k!w4z5S5TS-_']'^U-a'_'`'aW-f'b7p7q7rS2`-`-bU2c-c9e9fS2d-d-eS4|0z5QS6Y2b2eS6]2f:gQ6^2gS7s4}5WS7y5U5VS8o6[6_Q8r6`S9h7z7{Q9k7|Q:T8qS:j9i9lR;S:kU!qQ'Q-OT5O0z5QU'h!o4{4|S([#e1dU-^'['k7yQ/Y*OQ/f*ZU2a-a-f9kQ3r/ZS3{/g/qS6Z2c2dQ6y3mS7U4R4TS8p6]6^Q9S6zQ9Z7XR:U8rQ#sbU'g!o4{4|S(Z#e1dQ*u%[Q+P%gQ+V%mW-]'['h'k7yQ-y([Q/X*OQ/e*ZQ/k*^Q0Y+QQ1Q+zW2^-^-a-f9kS3q/Y/ZS3z/f/qQ3}/jQ4P/lQ5`1RU6X2a2c2dQ6x3mQ6|3rS7Q3{4TQ7V4SQ8T5aU8n6Z6]6^S9R6y6zQ9V7RQ9X7UQ9c7mQ9r8US:S8p8rQ:^9SQ:_9WQ:a9ZQ:f9dQ:p9sQ:x:UQ:}:`Q;P:hQ;_;QQ;h;`Q;l;iQ<|<wQ=X=QR=Y=R%[aOPWXYZrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$^$b%]%c%p&]&`&a&d&f&g&i&m&u'S'f'v'x(O(Y(k(o(s)r*t*|+h,Y,^,c-S-[-o-x.U.b.i/z0P0^0}1_1`1a1c1g1j1l2]2k2u2}4y5]5o5q5r6U6j7w8R8`8l:Q:v;ZS#sx!g!r<v$X$j&y)g,o,r.q1{3d4v5{9a9|;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`R<|=_%[bOPWXYZrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$^$b%]%c%p&]&`&a&d&f&g&i&m&u'S'f'v'x(O(Y(k(o(s)r*t*|+h,Y,^,c-S-[-o-x.U.b.i/z0P0^0}1_1`1a1c1g1j1l2]2k2u2}4y5]5o5q5r6U6j7w8R8`8l:Q:v;ZQ%[j!`%gw!f!o%j%k%l&w'V'W'X'['i*Z+T+U,s-V-W-_-a/h0]2Q2X2`2d4Q6Y6^8o:TS%mx!gQ+Q%hQ+z&UW1R+{+|+},OU5a1S1T1US7m4x4|S8U5b5cW9d7n7s7x7yQ9s8VW:h9g9h9j9kS;Q:i:jS;`;R;SQ;i;a!r<w$X$j&y)g,o,r.q1{3d4v5{9a9|;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`Q=Q=^R=R=_%OeOPXYrstu!X!^!l#P#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$^$b%]%c%p&]&`&d&f&g&i&m&u'S'f'x(O(Y(k(o(s)r*t*|+h,Y,^,c-S-[-o-x.U.b.i/z0P0^0}1_1`1a1c1g1j1l2]2k2u2}4y5]5o5q5r6U6j7w8R8`8l:Q:v;ZY#_WZ#T#W'v!U%x|}#d#f#i%Z%v(P(W(X(]+f+g+i,[,p-s-v-z-{-}1o2m2n5z6dQ,X&a!p<x$X$j)g,o,r.q1{3d4v5{9a9|;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`R<{&yS&}!c%wR2O,y%QdOPWXYZrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$^$b%]%c%p&]&`&d&f&g&i&m&u'S'f'v'x(O(Y(k(o(s)r*t+h,Y,^,c-S-[-o-x.b.i/z0P0^0}1_1`1a1c1g1j1l2]2k2}4y5]5o5q5r6U7w8R8`8l:Q:v;Z!r)T$X$j&y)g,o,r.q1{3d4v5{9a9|;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`Q,W&aQ0T*|Q2q.UQ6i2uR8x6j!l$Rc#V%a'u'{(g(n(})O)P)Q)V)Z+_-h-m-r-w.^.d.{/}2Z2j2|3_4Z4b6T6b6m8j:O:t;X;d;p!T;})S)e,t.j1v1y3R3Z3[3]3^3b3h5}6n6s6t7l8f8y8}9O:d:r=S!h$Tc#V%a'u'{(g(n)P)Q)V)Z+_-h-m-r-w.^.d.{/}2Z2j2|3_4Z4b6T6b6m8j:O:t;X;d;p!P<P)S)e,t.j1v1y3R3]3^3b3h5}6n6s6t7l8f8y8}9O:d:r=S!d$Xc#V%a'u'{(g(n)V)Z+_-h-m-r-w.^.d.{/}2Z2j2|3_4Z4b6T6b6m8j:O:t;X;d;pQ3l/Tz=`)S)e,t.j1v1y3R3b3h5}6n6s6t7l8f8y8}9O:d:r=SQ=e=gR=f=h'OkOPWXYZrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$X$^$b$j%]%c%p&]&`&a&d&f&g&i&m&u&y'S'f'v'x(O(Y(k(o(s)g)r*t*|+h,Y,^,c,o,r-S-[-o-x.U.b.i.q/z0P0^0}1_1`1a1c1g1j1l1{2]2k2u2}3d4v4y5]5o5q5r5{6U6j7w8R8`8l9a9|:Q:v;Z;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`S$kh$lR3e.p'VgOPWXYZhrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$X$^$b$j$l%]%c%p&]&`&a&d&f&g&i&m&u&y'S'f'v'x(O(Y(k(o(s)g)r*t*|+h,Y,^,c,o,r-S-[-o-x.U.b.i.p.q/z0P0^0}1_1`1a1c1g1j1l1{2]2k2u2}3d4v4y5]5o5q5r5{6U6j7w8R8`8l9a9|:Q:v;Z;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`T$gf$mQ$efS)^$h)bR)j$mT$ff$mT)`$h)b'VhOPWXYZhrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$X$^$b$j$l%]%c%p&]&`&a&d&f&g&i&m&u&y'S'f'v'x(O(Y(k(o(s)g)r*t*|+h,Y,^,c,o,r-S-[-o-x.U.b.i.p.q/z0P0^0}1_1`1a1c1g1j1l1{2]2k2u2}3d4v4y5]5o5q5r5{6U6j7w8R8`8l9a9|:Q:v;Z;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`T$kh$lQ$nhR)i$l%[jOPWXYZrstu!X!^!l#P#T#W#a#k#q#u#x#{#|#}$O$P$Q$R$S$T$U$V$^$b%]%c%p&]&`&a&d&f&g&i&m&u'S'f'v'x(O(Y(k(o(s)r*t*|+h,Y,^,c-S-[-o-x.U.b.i/z0P0^0}1_1`1a1c1g1j1l2]2k2u2}4y5]5o5q5r6U6j7w8R8`8l:Q:v;Z!s=^$X$j&y)g,o,r.q1{3d4v5{9a9|;n;q;r;s;v;w;x;y;z;{;|;}<O<P<Q<R<S<W<a<b<c<e<l<m<r<s=`#alOPXZr!X!^!l#P#a#k#x$j%]&]&`&a&d&f&g&i&m&u'S(s)g*|+h,Y,^,c-S.U.q/z0}1_1`1a1c1g1j1l2u3d4y5]5o5q5r6j7w8R8`v$zi#t%T%U%Y)w)y*R*g*h._/^/|3l4U9Q=]=e=f!z(j#r$`$a$u$x)n)z*X*{+O+m+p.T/_/a0q0t0|2t3v4O4]4_5[6g6}7W8O8u9o:X:n:{<Z<]<_<f<h<j<n<p<t=i=jQ*q%WQ.|)sg3a<U<V<[<^<`<g<i<k<o<q<uv$vi#t%T%U%Y)w)y*R*g*h._/^/|3l4U9Q=]=e=fQ*T$wS*^$y*aQ*r%XQ/l*_!z=O#r$`$a$u$x)n)z*X*{+O+m+p.T/_/a0q0t0|2t3v4O4]4_5[6g6}7W8O8u9o:X:n:{<Z<]<_<f<h<j<n<p<t=i=jf=P<U<V<[<^<`<g<i<k<o<q<uQ=T=aQ=U=bQ=V=cR=W=dv$zi#t%T%U%Y)w)y*R*g*h._/^/|3l4U9Q=]=e=f!z(j#r$`$a$u$x)n)z*X*{+O+m+p.T/_/a0q0t0|2t3v4O4]4_5[6g6}7W8O8u9o:X:n:{<Z<]<_<f<h<j<n<p<t=i=jg3a<U<V<[<^<`<g<i<k<o<q<ulnOXr!X#a%]&d&f&g&i,^,c1g1jQ*W$xQ,l&pQ,m&rR3u/_$Y${i#r#t$`$a$u$x%T%U%Y)n)w)y)z*R*X*g*h*{+O+m+p.T._/^/_/a/|0q0t0|2t3l3v4O4U4]4_5[6g6}7W8O8u9Q9o:X:n:{<U<V<Z<[<]<^<_<`<f<g<h<i<j<k<n<o<p<q<t<u=]=e=f=i=jQ+o&OQ0s+qQ4r0rR7i4sT*`$y*aS*`$y*aT5P0z5QS/j*]4yT4S/r7wQ+P%gQ/k*^Q0Y+QQ1Q+zQ5`1RQ8T5aQ9c7mQ9r8UQ:f9dQ:p9sQ;P:hQ;_;QQ;h;`R;l;in)w$s(l*s/]/t/u2z3s4Y6w7Y:]<}=Z=[!W<f(h)X)}*V.[.x/T/b0R0p0r2y3t3x4q4s6k6l7O7S7[7^9U9Y:|=g=h]<g3`6r8z:Z:[;fp)y$s(l*s/R/]/t/u2z3s4Y6w7Y:]<}=Z=[!Y<h(h)X)}*V.[.x/T/b0R0p0r2w2y3t3x4q4s6k6l7O7S7[7^9U9Y:|=g=h_<i3`6r8z8{:Z:[;fpmOXr!T!X#a%]&Z&d&f&g&i,^,c1g1jQ&W!SR,Y&apmOXr!T!X#a%]&Z&d&f&g&i,^,c1g1jR&W!SQ+s&PR0o+lqmOXr!T!X#a%]&Z&d&f&g&i,^,c1g1jQ0{+xS5Z1O1PU7}5X5Y5^S9n8P8QS:l9m9pQ;T:mR;b;UQ&_!TR,S&ZR5g1XS%oz%tR0e+]Q&d!UR,^&eR,d&jT1h,c1jR,h&kQ,g&kR1q,hQ'm!xR-i'mQrOQ#aXT%`r#aQ!{TR'o!{Q#OUR'q#OQ)p$rR.y)pQ#RVR's#RQ#UWU'y#U'z-pQ'z#VR-p'{Q,w&zR1},wQ.`(lR2{.`Q.c(nS3O.c3PR3P.dQ-O'QR2R-Or_OXr!T!X#a%]&Z&]&d&f&g&i,^,c1g1jU!mQ'Q-OS#dZ%ZY#n_!m#d-z4zQ-z(]T4z0z5QS#[W%vU(Q#[(R-qQ(R#]R-q'|Q,z&}R2P,zQ(^#gQ-t(VW.O(^-t2h6aQ2h-uR6a2iQ)b$hR.r)bQ$lhR)h$lQ$_cU)W$_-l<TQ-l;pR<T)eQ/W*OW3o/W3p6{9TU3p/X/Y/ZS6{3q3rR9T6|#m)u$s(h(l)X)}*V*n*o*s.Y.Z.[.x/R/S/T/]/b/t/u0R0p0r2w2x2y2z3`3s3t3x4Y4q4s6k6l6p6q6r6w7O7S7Y7[7^8z8{8|9U9Y:Z:[:]:|;f<}=Z=[=g=hQ/`*VU3w/`3y7PQ3y/bR7P3xQ*a$yR/n*aQ*j$}R/w*jQ4^0RR7]4^Q+j%yR0n+jQ4u0uS7k4u9bR9b7lQ+u&QR0x+uQ5Q0zR7u5QQ1W,PS5e1W8XR8X5gQ0`+XW4g0`4i7c9^Q4i0cQ7c4hR9^7dQ+^%oR0f+^Q1j,cR5u1jWqOXr#aQ&h!XQ*v%]Q,]&dQ,_&fQ,`&gQ,b&iQ1e,^S1h,c1jR5t1gQ%_oQ&l!]Q&o!_Q&q!`Q&s!aU'e!o4{4|Q+e%uQ+k%zQ,R&_Q,j&nY-Z'['g'h'k7yQ/m*`S1Z,S,VQ1r,iQ1s,lQ1t,m[2[-]-^-a-f-h9kQ4l0iQ4p0pQ5_1QQ5i1]Q5s1fY6S2Z2^2a2c2dQ7g4nQ7h4qQ7t5PQ8S5`Q8Y5hY8i6T6X6Z6]6^Q9_7eQ9q8TQ9v8ZW9}8j8n8p8rQ:c9`Q:e9cQ:o9rU:s:O:S:UQ;O:fQ;V:pS;W:t:xQ;^;PQ;c;XQ;g;_Q;j;dQ;k;hR;m;lQ%iwQ'U!fQ'c!oU+S%j%k%lQ,q&wU-U'V'W'XS-Y'['iQ/d*ZS0[+T+UQ1z,sS2W-V-WS2_-_-aQ3|/hQ4a0]Q6O2QQ6R2XS6W2`2dQ7T4QS8m6Y6^Q:R8oR:w:TS$ti=]R*k%OU$}i%O=]R/v*iQ$siS(h#r+OQ(l#tS)X$`$aQ)}$uQ*V$xQ*n%TQ*o%UQ*s%YQ.Y<ZQ.Z<]Q.[<_Q.x)nQ/R)wQ/S)yQ/T)zQ/]*RQ/b*XQ/t*gQ/u*hh0R*{.T0|2t5[6g8O8u9o:X:n:{Q0p+mQ0r+pQ2w<fQ2x<hQ2y<jQ2z._S3`<U<VQ3s/^Q3t/_Q3x/aQ4Y/|Q4q0qQ4s0tQ6k<nQ6l<pQ6p<[Q6q<^Q6r<`Q6w3lQ7O3vQ7S4OQ7Y4UQ7[4]Q7^4_Q8z<kQ8{<gQ8|<iQ9U6}Q9Y7WQ:Z<oQ:[<qQ:]9QQ:|<tQ;f<uQ<}=]Q=Z=eQ=[=fQ=g=iR=h=jloOXr!X#a%]&d&f&g&i,^,c1g1jQ!dPS#cZ#kQ&n!^U'Y!l4y7wQ'r#PQ(u#xQ)f$jS,V&]&`Q,Z&aQ,i&mQ,n&uQ-Q'SQ.f(sQ.v)gQ0U*|Q0l+hQ1b,YQ2U-SQ2r.UQ3g.qQ4W/zQ5Y0}Q5k1_Q5l1`Q5n1aQ5p1cQ5w1lQ6f2uQ6u3dQ8Q5]Q8_5oQ8a5qQ8b5rQ8w6jQ9p8RR9x8`#UcOPXZr!X!^!l#a#k#x%]&]&`&a&d&f&g&i&m&u'S(s*|+h,Y,^,c-S.U/z0}1_1`1a1c1g1j1l2u4y5]5o5q5r6j7w8R8`Q#VWQ#bYQ%asQ%btQ%duS'u#T'xQ'{#WQ(g#qQ(n#uQ(v#{Q(w#|Q(x#}Q(y$OQ(z$PQ({$QQ(|$RQ(}$SQ)O$TQ)P$UQ)Q$VQ)S$XQ)V$^Q)Z$bW)e$j)g.q3dQ*y%cQ+_%pS,t&y1{Q-h'fS-m'v-oQ-r(OQ-w(YQ.^(kQ.d(oQ.h;nQ.j;qQ.k;rQ.l;sQ.{)rQ/}*tQ1v,oQ1y,rQ2Z-[Q2j-xQ2|.bQ3R;vQ3S;wQ3T;xQ3U;yQ3V;zQ3W;{Q3X;|Q3Y;}Q3Z<OQ3[<PQ3]<QQ3^<RQ3_.iQ3b<WQ3c<aQ3h<SQ4Z0PQ4b0^Q5}<bQ6T2]Q6b2kQ6m2}Q6n<cQ6s<eQ6t<lQ7l4vQ8f5{Q8j6UQ8y<mQ8}<rQ9O<sQ:O8lQ:d9aQ:r9|Q:t:QQ;X:vQ;d;ZQ;p#PR=S=`R#XWR&{!cU!oQ'Q-OS&w!c,vY'[!m!s!t!u!vS'i!p!r['k!w4z5S5T5U5VS,s&x'PS-_']'^U-a'_'`'aY-f'b7p7q7r7|Q2Q,|S2`-`-bU2c-c9e9fS2d-d-eS4{0z5QS6Y2b2eS6]2f:gQ6^2gS8o6[6_Q8r6`R:T8qR(m#tR(p#uQ!dQT,}'Q-OQ#l]R'Z;oT#hZ%ZS#gZ%ZU%y|},[U(V#d#f#iS-u(W(XQ-|(]Q0m+iQ2i-vU2l-z-{-}S6c2m2nR8s6d`#ZW#T#W%v'v(P+f-st#eZ|}#d#f#i%Z(W(X(]+i-v-z-{-}2m2n6dQ1d,[Q1w,pQ5y1oQ8e5zT<z&y+gT#^W%vS#]W%vS'w#T(PS'|#W+fS,u&y+gT-n'v-sT'O!c%wQ$hfR)l$mT)a$h)bR3f.pT*Q$u*SR*Y$xQ0S*{Q2p.TQ5X0|Q6h2tQ8P5[Q8v6gQ9m8OQ:V8uQ:m9oQ:z:XQ;U:nR;]:{lpOXr!X#a%]&d&f&g&i,^,c1g1jQ&^!TR,R&ZV%z|},[R0v+rR,Q&XQ%szR+d%tR+Y%nT&b!U&eT&c!U&eT1i,c1j",
  nodeNames: "⚠ ArithOp ArithOp LineComment BlockComment Script ExportDeclaration export Star as VariableName String Escape from ; default FunctionDeclaration async function VariableDefinition > TypeParamList TypeDefinition extends ThisType this LiteralType ArithOp Number BooleanLiteral TemplateType InterpolationEnd Interpolation InterpolationStart NullType null VoidType void TypeofType typeof MemberExpression . ?. PropertyName [ TemplateString Escape Interpolation super RegExp ] ArrayExpression Spread , } { ObjectExpression Property async get set PropertyDefinition Block : NewExpression new TypeArgList CompareOp < ) ( ArgList UnaryExpression delete LogicOp BitOp YieldExpression yield AwaitExpression await ParenthesizedExpression ClassExpression class ClassBody MethodDeclaration Decorator @ MemberExpression PrivatePropertyName CallExpression Privacy static abstract override PrivatePropertyDefinition PropertyDeclaration readonly accessor Optional TypeAnnotation Equals StaticBlock FunctionExpression ArrowFunction ParamList ParamList ArrayPattern ObjectPattern PatternProperty Privacy readonly Arrow MemberExpression BinaryExpression ArithOp ArithOp ArithOp ArithOp BitOp CompareOp instanceof satisfies in const CompareOp BitOp BitOp BitOp LogicOp LogicOp ConditionalExpression LogicOp LogicOp AssignmentExpression UpdateOp PostfixExpression CallExpression TaggedTemplateExpression DynamicImport import ImportMeta JSXElement JSXSelfCloseEndTag JSXStartTag JSXSelfClosingTag JSXIdentifier JSXBuiltin JSXIdentifier JSXNamespacedName JSXMemberExpression JSXSpreadAttribute JSXAttribute JSXAttributeValue JSXEscape JSXEndTag JSXOpenTag JSXFragmentTag JSXText JSXEscape JSXStartCloseTag JSXCloseTag PrefixCast ArrowFunction TypeParamList SequenceExpression KeyofType keyof UniqueType unique ImportType InferredType infer TypeName ParenthesizedType FunctionSignature ParamList NewSignature IndexedType TupleType Label ArrayType ReadonlyType ObjectType MethodType PropertyType IndexSignature PropertyDefinition CallSignature TypePredicate is NewSignature new UnionType LogicOp IntersectionType LogicOp ConditionalType ParameterizedType ClassDeclaration abstract implements type VariableDeclaration let var TypeAliasDeclaration InterfaceDeclaration interface EnumDeclaration enum EnumBody NamespaceDeclaration namespace module AmbientDeclaration declare GlobalDeclaration global ClassDeclaration ClassBody MethodDeclaration AmbientFunctionDeclaration ExportGroup VariableName VariableName ImportDeclaration ImportGroup ForStatement for ForSpec ForInSpec ForOfSpec of WhileStatement while WithStatement with DoStatement do IfStatement if else SwitchStatement switch SwitchBody CaseLabel case DefaultLabel TryStatement try CatchClause catch FinallyClause finally ReturnStatement return ThrowStatement throw BreakStatement break ContinueStatement continue DebuggerStatement debugger LabeledStatement ExpressionStatement SingleExpression SingleClassItem",
  maxTerm: 362,
  context: trackNewline,
  nodeProps: [
    ["group", -26, 6, 14, 16, 62, 198, 202, 205, 206, 208, 211, 214, 225, 227, 233, 235, 237, 239, 242, 248, 254, 256, 258, 260, 262, 264, 265, "Statement", -32, 10, 11, 25, 28, 29, 35, 45, 48, 49, 51, 56, 64, 72, 76, 78, 80, 81, 102, 103, 112, 113, 130, 133, 135, 136, 137, 138, 140, 141, 161, 162, 164, "Expression", -23, 24, 26, 30, 34, 36, 38, 165, 167, 169, 170, 172, 173, 174, 176, 177, 178, 180, 181, 182, 192, 194, 196, 197, "Type", -3, 84, 95, 101, "ClassItem"],
    ["openedBy", 31, "InterpolationStart", 50, "[", 54, "{", 69, "(", 142, "JSXStartTag", 154, "JSXStartTag JSXStartCloseTag"],
    ["closedBy", 33, "InterpolationEnd", 44, "]", 55, "}", 70, ")", 143, "JSXSelfCloseEndTag JSXEndTag", 159, "JSXEndTag"]
  ],
  propSources: [jsHighlight],
  skippedNodes: [0, 3, 4, 268],
  repeatNodeCount: 32,
  tokenData: "$>y(CSR!bOX%ZXY+gYZ-yZ[+g[]%Z]^.c^p%Zpq+gqr/mrs3cst:_tu>PuvBavwDxwxGgxyMvyz! Qz{!![{|!%O|}!&]}!O!%O!O!P!'g!P!Q!1w!Q!R#0t!R![#3T![!]#@T!]!^#Aa!^!_#Bk!_!`#GS!`!a#In!a!b#N{!b!c$$z!c!}>P!}#O$&U#O#P$'`#P#Q$,w#Q#R$.R#R#S>P#S#T$/`#T#o$0j#o#p$4z#p#q$5p#q#r$7Q#r#s$8^#s$f%Z$f$g+g$g#BY>P#BY#BZ$9h#BZ$IS>P$IS$I_$9h$I_$I|>P$I|$I}$<s$I}$JO$<s$JO$JT>P$JT$JU$9h$JU$KV>P$KV$KW$9h$KW&FU>P&FU&FV$9h&FV;'S>P;'S;=`BZ<%l?HT>P?HT?HU$9h?HUO>P(n%d_$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z&j&hT$c&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c&j&zP;=`<%l&c'|'U]$c&j'y!bOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}!b(SU'y!bOY'}Zw'}x#O'}#P;'S'};'S;=`(f<%lO'}!b(iP;=`<%l'}'|(oP;=`<%l&}'[(y]$c&j'vpOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(rp)wU'vpOY)rZr)rs#O)r#P;'S)r;'S;=`*Z<%lO)rp*^P;=`<%l)r'[*dP;=`<%l(r#S*nX'vp'y!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g#S+^P;=`<%l*g(n+dP;=`<%l%Z(CS+rq$c&j'vp'y!b'l(;dOX%ZXY+gYZ&cZ[+g[p%Zpq+gqr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p$f%Z$f$g+g$g#BY%Z#BY#BZ+g#BZ$IS%Z$IS$I_+g$I_$JT%Z$JT$JU+g$JU$KV%Z$KV$KW+g$KW&FU%Z&FU&FV+g&FV;'S%Z;'S;=`+a<%l?HT%Z?HT?HU+g?HUO%Z(CS.ST'w#S$c&j'm(;dO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c(CS.n_$c&j'vp'y!b'm(;dOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#`/x`$c&j!l$Ip'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`0z!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S1V`#p$Id$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`2X!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S2d_#p$Id$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$2b3l_'u$(n$c&j'y!bOY4kYZ5qZr4krs7nsw4kwx5qx!^4k!^!_8p!_#O4k#O#P5q#P#o4k#o#p8p#p;'S4k;'S;=`:X<%lO4k*r4r_$c&j'y!bOY4kYZ5qZr4krs7nsw4kwx5qx!^4k!^!_8p!_#O4k#O#P5q#P#o4k#o#p8p#p;'S4k;'S;=`:X<%lO4k)`5vX$c&jOr5qrs6cs!^5q!^!_6y!_#o5q#o#p6y#p;'S5q;'S;=`7h<%lO5q)`6jT$^#t$c&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c#t6|TOr6yrs7]s;'S6y;'S;=`7b<%lO6y#t7bO$^#t#t7eP;=`<%l6y)`7kP;=`<%l5q*r7w]$^#t$c&j'y!bOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}%W8uZ'y!bOY8pYZ6yZr8prs9hsw8pwx6yx#O8p#O#P6y#P;'S8p;'S;=`:R<%lO8p%W9oU$^#t'y!bOY'}Zw'}x#O'}#P;'S'};'S;=`(f<%lO'}%W:UP;=`<%l8p*r:[P;=`<%l4k#%|:hg$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}st%Ztu<Puw%Zwx(rx!^%Z!^!_*g!_!c%Z!c!}<P!}#O%Z#O#P&c#P#R%Z#R#S<P#S#T%Z#T#o<P#o#p*g#p$g%Z$g;'S<P;'S;=`=y<%lO<P#%|<[i$c&j(_!L^'vp'y!bOY%ZYZ&cZr%Zrs&}st%Ztu<Puw%Zwx(rx!Q%Z!Q![<P![!^%Z!^!_*g!_!c%Z!c!}<P!}#O%Z#O#P&c#P#R%Z#R#S<P#S#T%Z#T#o<P#o#p*g#p$g%Z$g;'S<P;'S;=`=y<%lO<P#%|=|P;=`<%l<P(CS>`k$c&j'vp'y!b(T!LY's&;d$V#tOY%ZYZ&cZr%Zrs&}st%Ztu>Puw%Zwx(rx}%Z}!O@T!O!Q%Z!Q![>P![!^%Z!^!_*g!_!c%Z!c!}>P!}#O%Z#O#P&c#P#R%Z#R#S>P#S#T%Z#T#o>P#o#p*g#p$g%Z$g;'S>P;'S;=`BZ<%lO>P+d@`k$c&j'vp'y!b$V#tOY%ZYZ&cZr%Zrs&}st%Ztu@Tuw%Zwx(rx}%Z}!O@T!O!Q%Z!Q![@T![!^%Z!^!_*g!_!c%Z!c!}@T!}#O%Z#O#P&c#P#R%Z#R#S@T#S#T%Z#T#o@T#o#p*g#p$g%Z$g;'S@T;'S;=`BT<%lO@T+dBWP;=`<%l@T(CSB^P;=`<%l>P%#SBl`$c&j'vp'y!b#h$IdOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#SCy_$c&j#z$Id'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%DfETa(h%<v$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sv%ZvwFYwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#SFe`$c&j#t$Id'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$2bGp_'x$)`$c&j'vpOYHoYZIuZrHorsIuswHowxKVx!^Ho!^!_LX!_#OHo#O#PIu#P#oHo#o#pLX#p;'SHo;'S;=`Mp<%lOHo*QHv_$c&j'vpOYHoYZIuZrHorsIuswHowxKVx!^Ho!^!_LX!_#OHo#O#PIu#P#oHo#o#pLX#p;'SHo;'S;=`Mp<%lOHo)`IzX$c&jOwIuwx6cx!^Iu!^!_Jg!_#oIu#o#pJg#p;'SIu;'S;=`KP<%lOIu#tJjTOwJgwx7]x;'SJg;'S;=`Jy<%lOJg#tJ|P;=`<%lJg)`KSP;=`<%lIu*QK`]$^#t$c&j'vpOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(r$fL^Z'vpOYLXYZJgZrLXrsJgswLXwxMPx#OLX#O#PJg#P;'SLX;'S;=`Mj<%lOLX$fMWU$^#t'vpOY)rZr)rs#O)r#P;'S)r;'S;=`*Z<%lO)r$fMmP;=`<%lLX*QMsP;=`<%lHo(*QNR_!h(!b$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z!'l! ]_!gM|$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'+h!!ib$c&j'vp'y!b't#)d#i$IdOY%ZYZ&cZr%Zrs&}sw%Zwx(rxz%Zz{!#q{!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S!#|`$c&j'vp'y!b#f$IdOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z&-O!%Z`$c&j'vp'y!bk&%`OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z&C[!&h_!V&;l$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(CS!'rc$c&j'vp'y!by'<nOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!(}!P!Q%Z!Q![!+g![!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z!'d!)Wa$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!*]!P!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z!'d!*h_!UMt$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l!+rg$c&j'vp'y!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!+g![!^%Z!^!_*g!_!g%Z!g!h!-Z!h#O%Z#O#P&c#P#R%Z#R#S!+g#S#X%Z#X#Y!-Z#Y#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l!-dg$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx{%Z{|!.{|}%Z}!O!.{!O!Q%Z!Q![!0a![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!0a#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l!/Uc$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!0a![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!0a#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l!0lc$c&j'vp'y!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!0a![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!0a#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(CS!2Sf$c&j'vp'y!b#g$IdOY!3hYZ&cZr!3hrs!4{sw!3hwx!C}xz!3hz{#$s{!P!3h!P!Q#&Y!Q!^!3h!^!_!Mh!_!`#-x!`!a#/_!a!}!3h!}#O##[#O#P!<w#P#o!3h#o#p!Mh#p;'S!3h;'S;=`#$m<%lO!3h(r!3sb$c&j'vp'y!b!RSOY!3hYZ&cZr!3hrs!4{sw!3hwx!C}x!P!3h!P!Q!Kh!Q!^!3h!^!_!Mh!_!}!3h!}#O##[#O#P!<w#P#o!3h#o#p!Mh#p;'S!3h;'S;=`#$m<%lO!3h(Q!5U`$c&j'y!b!RSOY!4{YZ&cZw!4{wx!6Wx!P!4{!P!Q!=o!Q!^!4{!^!_!?g!_!}!4{!}#O!Bn#O#P!<w#P#o!4{#o#p!?g#p;'S!4{;'S;=`!Cw<%lO!4{&n!6_^$c&j!RSOY!6WYZ&cZ!P!6W!P!Q!7Z!Q!^!6W!^!_!8g!_!}!6W!}#O!;U#O#P!<w#P#o!6W#o#p!8g#p;'S!6W;'S;=`!=i<%lO!6W&n!7ba$c&j!RSO!^&c!_#Z&c#Z#[!7Z#[#]&c#]#^!7Z#^#a&c#a#b!7Z#b#g&c#g#h!7Z#h#i&c#i#j!7Z#j#m&c#m#n!7Z#n#o&c#p;'S&c;'S;=`&w<%lO&cS!8lX!RSOY!8gZ!P!8g!P!Q!9X!Q!}!8g!}#O!9p#O#P!:o#P;'S!8g;'S;=`!;O<%lO!8gS!9^U!RS#Z#[!9X#]#^!9X#a#b!9X#g#h!9X#i#j!9X#m#n!9XS!9sVOY!9pZ#O!9p#O#P!:Y#P#Q!8g#Q;'S!9p;'S;=`!:i<%lO!9pS!:]SOY!9pZ;'S!9p;'S;=`!:i<%lO!9pS!:lP;=`<%l!9pS!:rSOY!8gZ;'S!8g;'S;=`!;O<%lO!8gS!;RP;=`<%l!8g&n!;Z[$c&jOY!;UYZ&cZ!^!;U!^!_!9p!_#O!;U#O#P!<P#P#Q!6W#Q#o!;U#o#p!9p#p;'S!;U;'S;=`!<q<%lO!;U&n!<UX$c&jOY!;UYZ&cZ!^!;U!^!_!9p!_#o!;U#o#p!9p#p;'S!;U;'S;=`!<q<%lO!;U&n!<tP;=`<%l!;U&n!<|X$c&jOY!6WYZ&cZ!^!6W!^!_!8g!_#o!6W#o#p!8g#p;'S!6W;'S;=`!=i<%lO!6W&n!=lP;=`<%l!6W(Q!=xi$c&j'y!b!RSOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#Z&}#Z#[!=o#[#]&}#]#^!=o#^#a&}#a#b!=o#b#g&}#g#h!=o#h#i&}#i#j!=o#j#m&}#m#n!=o#n#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}!f!?nZ'y!b!RSOY!?gZw!?gwx!8gx!P!?g!P!Q!@a!Q!}!?g!}#O!Ap#O#P!:o#P;'S!?g;'S;=`!Bh<%lO!?g!f!@hb'y!b!RSOY'}Zw'}x#O'}#P#Z'}#Z#[!@a#[#]'}#]#^!@a#^#a'}#a#b!@a#b#g'}#g#h!@a#h#i'}#i#j!@a#j#m'}#m#n!@a#n;'S'};'S;=`(f<%lO'}!f!AuX'y!bOY!ApZw!Apwx!9px#O!Ap#O#P!:Y#P#Q!?g#Q;'S!Ap;'S;=`!Bb<%lO!Ap!f!BeP;=`<%l!Ap!f!BkP;=`<%l!?g(Q!Bu^$c&j'y!bOY!BnYZ&cZw!Bnwx!;Ux!^!Bn!^!_!Ap!_#O!Bn#O#P!<P#P#Q!4{#Q#o!Bn#o#p!Ap#p;'S!Bn;'S;=`!Cq<%lO!Bn(Q!CtP;=`<%l!Bn(Q!CzP;=`<%l!4{'`!DW`$c&j'vp!RSOY!C}YZ&cZr!C}rs!6Ws!P!C}!P!Q!EY!Q!^!C}!^!_!GQ!_!}!C}!}#O!JX#O#P!<w#P#o!C}#o#p!GQ#p;'S!C};'S;=`!Kb<%lO!C}'`!Eci$c&j'vp!RSOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#Z(r#Z#[!EY#[#](r#]#^!EY#^#a(r#a#b!EY#b#g(r#g#h!EY#h#i(r#i#j!EY#j#m(r#m#n!EY#n#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(rt!GXZ'vp!RSOY!GQZr!GQrs!8gs!P!GQ!P!Q!Gz!Q!}!GQ!}#O!IZ#O#P!:o#P;'S!GQ;'S;=`!JR<%lO!GQt!HRb'vp!RSOY)rZr)rs#O)r#P#Z)r#Z#[!Gz#[#])r#]#^!Gz#^#a)r#a#b!Gz#b#g)r#g#h!Gz#h#i)r#i#j!Gz#j#m)r#m#n!Gz#n;'S)r;'S;=`*Z<%lO)rt!I`X'vpOY!IZZr!IZrs!9ps#O!IZ#O#P!:Y#P#Q!GQ#Q;'S!IZ;'S;=`!I{<%lO!IZt!JOP;=`<%l!IZt!JUP;=`<%l!GQ'`!J`^$c&j'vpOY!JXYZ&cZr!JXrs!;Us!^!JX!^!_!IZ!_#O!JX#O#P!<P#P#Q!C}#Q#o!JX#o#p!IZ#p;'S!JX;'S;=`!K[<%lO!JX'`!K_P;=`<%l!JX'`!KeP;=`<%l!C}(r!Ksk$c&j'vp'y!b!RSOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#Z%Z#Z#[!Kh#[#]%Z#]#^!Kh#^#a%Z#a#b!Kh#b#g%Z#g#h!Kh#h#i%Z#i#j!Kh#j#m%Z#m#n!Kh#n#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#W!Mq]'vp'y!b!RSOY!MhZr!Mhrs!?gsw!Mhwx!GQx!P!Mh!P!Q!Nj!Q!}!Mh!}#O#!U#O#P!:o#P;'S!Mh;'S;=`##U<%lO!Mh#W!Nse'vp'y!b!RSOY*gZr*grs'}sw*gwx)rx#O*g#P#Z*g#Z#[!Nj#[#]*g#]#^!Nj#^#a*g#a#b!Nj#b#g*g#g#h!Nj#h#i*g#i#j!Nj#j#m*g#m#n!Nj#n;'S*g;'S;=`+Z<%lO*g#W#!]Z'vp'y!bOY#!UZr#!Urs!Apsw#!Uwx!IZx#O#!U#O#P!:Y#P#Q!Mh#Q;'S#!U;'S;=`##O<%lO#!U#W##RP;=`<%l#!U#W##XP;=`<%l!Mh(r##e`$c&j'vp'y!bOY##[YZ&cZr##[rs!Bnsw##[wx!JXx!^##[!^!_#!U!_#O##[#O#P!<P#P#Q!3h#Q#o##[#o#p#!U#p;'S##[;'S;=`#$g<%lO##[(r#$jP;=`<%l##[(r#$pP;=`<%l!3h(CS#%Qb$c&j'vp'y!b'n(;d!RSOY!3hYZ&cZr!3hrs!4{sw!3hwx!C}x!P!3h!P!Q!Kh!Q!^!3h!^!_!Mh!_!}!3h!}#O##[#O#P!<w#P#o!3h#o#p!Mh#p;'S!3h;'S;=`#$m<%lO!3h(CS#&e_$c&j'vp'y!bR(;dOY#&YYZ&cZr#&Yrs#'dsw#&Ywx#*tx!^#&Y!^!_#,s!_#O#&Y#O#P#(f#P#o#&Y#o#p#,s#p;'S#&Y;'S;=`#-r<%lO#&Y(Bb#'m]$c&j'y!bR(;dOY#'dYZ&cZw#'dwx#(fx!^#'d!^!_#)w!_#O#'d#O#P#(f#P#o#'d#o#p#)w#p;'S#'d;'S;=`#*n<%lO#'d(AO#(mX$c&jR(;dOY#(fYZ&cZ!^#(f!^!_#)Y!_#o#(f#o#p#)Y#p;'S#(f;'S;=`#)q<%lO#(f(;d#)_SR(;dOY#)YZ;'S#)Y;'S;=`#)k<%lO#)Y(;d#)nP;=`<%l#)Y(AO#)tP;=`<%l#(f(<v#*OW'y!bR(;dOY#)wZw#)wwx#)Yx#O#)w#O#P#)Y#P;'S#)w;'S;=`#*h<%lO#)w(<v#*kP;=`<%l#)w(Bb#*qP;=`<%l#'d(Ap#*}]$c&j'vpR(;dOY#*tYZ&cZr#*trs#(fs!^#*t!^!_#+v!_#O#*t#O#P#(f#P#o#*t#o#p#+v#p;'S#*t;'S;=`#,m<%lO#*t(<U#+}W'vpR(;dOY#+vZr#+vrs#)Ys#O#+v#O#P#)Y#P;'S#+v;'S;=`#,g<%lO#+v(<U#,jP;=`<%l#+v(Ap#,pP;=`<%l#*t(=h#,|Y'vp'y!bR(;dOY#,sZr#,srs#)wsw#,swx#+vx#O#,s#O#P#)Y#P;'S#,s;'S;=`#-l<%lO#,s(=h#-oP;=`<%l#,s(CS#-uP;=`<%l#&Y%#W#.Vb$c&j#z$Id'vp'y!b!RSOY!3hYZ&cZr!3hrs!4{sw!3hwx!C}x!P!3h!P!Q!Kh!Q!^!3h!^!_!Mh!_!}!3h!}#O##[#O#P!<w#P#o!3h#o#p!Mh#p;'S!3h;'S;=`#$m<%lO!3h+h#/lb$S#t$c&j'vp'y!b!RSOY!3hYZ&cZr!3hrs!4{sw!3hwx!C}x!P!3h!P!Q!Kh!Q!^!3h!^!_!Mh!_!}!3h!}#O##[#O#P!<w#P#o!3h#o#p!Mh#p;'S!3h;'S;=`#$m<%lO!3h$/l#1Pp$c&j'vp'y!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!+g!P!Q%Z!Q![#3T![!^%Z!^!_*g!_!g%Z!g!h!-Z!h#O%Z#O#P&c#P#R%Z#R#S#3T#S#U%Z#U#V#6_#V#X%Z#X#Y!-Z#Y#b%Z#b#c#5T#c#d#9g#d#l%Z#l#m#<i#m#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#3`k$c&j'vp'y!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!+g!P!Q%Z!Q![#3T![!^%Z!^!_*g!_!g%Z!g!h!-Z!h#O%Z#O#P&c#P#R%Z#R#S#3T#S#X%Z#X#Y!-Z#Y#b%Z#b#c#5T#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#5`_$c&j'vp'y!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#6hd$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!R#7v!R!S#7v!S!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#7v#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#8Rf$c&j'vp'y!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!R#7v!R!S#7v!S!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#7v#S#b%Z#b#c#5T#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#9pc$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!Y#:{!Y!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#:{#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#;We$c&j'vp'y!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!Y#:{!Y!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#:{#S#b%Z#b#c#5T#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#<rg$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![#>Z![!^%Z!^!_*g!_!c%Z!c!i#>Z!i#O%Z#O#P&c#P#R%Z#R#S#>Z#S#T%Z#T#Z#>Z#Z#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z$/l#>fi$c&j'vp'y!bl$'|OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![#>Z![!^%Z!^!_*g!_!c%Z!c!i#>Z!i#O%Z#O#P&c#P#R%Z#R#S#>Z#S#T%Z#T#Z#>Z#Z#b%Z#b#c#5T#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%Gh#@b_!a$b$c&j#x%<f'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z)[#Al_^l$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(CS#Bz^'|!*v!e'.r'vp'y!b$T)d(lSOY*gZr*grs'}sw*gwx)rx!P*g!P!Q#Cv!Q!^*g!^!_#Dl!_!`#F^!`#O*g#P;'S*g;'S;=`+Z<%lO*g(n#DPX$e&j'vp'y!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g$Kh#DuZ#j$Id'vp'y!bOY*gZr*grs'}sw*gwx)rx!_*g!_!`#Eh!`#O*g#P;'S*g;'S;=`+Z<%lO*g$Kh#EqX#z$Id'vp'y!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g$Kh#FgX#k$Id'vp'y!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g%Gh#G_a#W%?x$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`0z!`!a#Hd!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#W#Ho_#c$Ih$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%Gh#I}adBf#k$Id$`#|$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`#KS!`!a#L^!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S#K__#k$Id$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S#Lia#j$Id$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`!a#Mn!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S#My`#j$Id$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'+h$ Wc(`$Ip$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P$!c!P!^%Z!^!_*g!_!a%Z!a!b$#m!b#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'+`$!n_z'#p$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S$#x`$c&j#u$Id'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#&^$%V_!x!Ln$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(@^$&a_|(8n$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(n$'eZ$c&jO!^$(W!^!_$(n!_#i$(W#i#j$(s#j#l$(W#l#m$*f#m#o$(W#o#p$(n#p;'S$(W;'S;=`$,q<%lO$(W(n$(_T[#S$c&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c#S$(sO[#S(n$(x[$c&jO!Q&c!Q![$)n![!^&c!_!c&c!c!i$)n!i#T&c#T#Z$)n#Z#o&c#o#p$,U#p;'S&c;'S;=`&w<%lO&c(n$)sZ$c&jO!Q&c!Q![$*f![!^&c!_!c&c!c!i$*f!i#T&c#T#Z$*f#Z#o&c#p;'S&c;'S;=`&w<%lO&c(n$*kZ$c&jO!Q&c!Q![$+^![!^&c!_!c&c!c!i$+^!i#T&c#T#Z$+^#Z#o&c#p;'S&c;'S;=`&w<%lO&c(n$+cZ$c&jO!Q&c!Q![$(W![!^&c!_!c&c!c!i$(W!i#T&c#T#Z$(W#Z#o&c#p;'S&c;'S;=`&w<%lO&c#S$,XR!Q![$,b!c!i$,b#T#Z$,b#S$,eS!Q![$,b!c!i$,b#T#Z$,b#q#r$(n(n$,tP;=`<%l$(W!'l$-S_!SM|$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#S$.^`#r$Id$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z&,v$/k_$c&j'vp'y!b(Q&%WOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(CS$0yk$c&j'vp'y!b(T!LY's&;d$X#tOY%ZYZ&cZr%Zrs&}st%Ztu$0juw%Zwx(rx}%Z}!O$2n!O!Q%Z!Q![$0j![!^%Z!^!_*g!_!c%Z!c!}$0j!}#O%Z#O#P&c#P#R%Z#R#S$0j#S#T%Z#T#o$0j#o#p*g#p$g%Z$g;'S$0j;'S;=`$4t<%lO$0j+d$2yk$c&j'vp'y!b$X#tOY%ZYZ&cZr%Zrs&}st%Ztu$2nuw%Zwx(rx}%Z}!O$2n!O!Q%Z!Q![$2n![!^%Z!^!_*g!_!c%Z!c!}$2n!}#O%Z#O#P&c#P#R%Z#R#S$2n#S#T%Z#T#o$2n#o#p*g#p$g%Z$g;'S$2n;'S;=`$4n<%lO$2n+d$4qP;=`<%l$2n(CS$4wP;=`<%l$0j!5p$5TX!X!3l'vp'y!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g%Df$5{a(g%<v$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Cn!`#O%Z#O#P&c#P#o%Z#o#p*g#p#q$#m#q;'S%Z;'S;=`+a<%lO%Z%#`$7__!W$I`o`$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(r$8i_!mS$c&j'vp'y!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(CS$9y|$c&j'vp'y!b'l(;d(T!LY's&;d$V#tOX%ZXY+gYZ&cZ[+g[p%Zpq+gqr%Zrs&}st%Ztu>Puw%Zwx(rx}%Z}!O@T!O!Q%Z!Q![>P![!^%Z!^!_*g!_!c%Z!c!}>P!}#O%Z#O#P&c#P#R%Z#R#S>P#S#T%Z#T#o>P#o#p*g#p$f%Z$f$g+g$g#BY>P#BY#BZ$9h#BZ$IS>P$IS$I_$9h$I_$JT>P$JT$JU$9h$JU$KV>P$KV$KW$9h$KW&FU>P&FU&FV$9h&FV;'S>P;'S;=`BZ<%l?HT>P?HT?HU$9h?HUO>P(CS$=Uk$c&j'vp'y!b'm(;d(T!LY's&;d$V#tOY%ZYZ&cZr%Zrs&}st%Ztu>Puw%Zwx(rx}%Z}!O@T!O!Q%Z!Q![>P![!^%Z!^!_*g!_!c%Z!c!}>P!}#O%Z#O#P&c#P#R%Z#R#S>P#S#T%Z#T#o>P#o#p*g#p$g%Z$g;'S>P;'S;=`BZ<%lO>P",
  tokenizers: [noSemicolon, incdecToken, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, insertSemicolon, new LocalTokenGroup("$S~RRtu[#O#Pg#S#T#|~_P#o#pb~gOq~~jVO#i!P#i#j!U#j#l!P#l#m!q#m;'S!P;'S;=`#v<%lO!P~!UO!O~~!XS!Q![!e!c!i!e#T#Z!e#o#p#Z~!hR!Q![!q!c!i!q#T#Z!q~!tR!Q![!}!c!i!}#T#Z!}~#QR!Q![!P!c!i!P#T#Z!P~#^R!Q![#g!c!i#g#T#Z#g~#jS!Q![#g!c!i#g#T#Z#g#q#r!P~#yP;=`<%l!P~$RO(S~~", 141, 325), new LocalTokenGroup("j~RQYZXz{^~^O'p~~aP!P!Qd~iO'q~~", 25, 307)],
  topRules: { "Script": [0, 5], "SingleExpression": [1, 266], "SingleClassItem": [2, 267] },
  dialects: { jsx: 13213, ts: 13215 },
  dynamicPrecedences: { "76": 1, "78": 1, "162": 1, "190": 1 },
  specialized: [{ term: 311, get: (value) => spec_identifier[value] || -1 }, { term: 327, get: (value) => spec_word[value] || -1 }, { term: 67, get: (value) => spec_LessThan[value] || -1 }],
  tokenPrec: 13238
});
// ---- end verbatim copy of SP3:editors/dist/assets/codemirror-521de7ab.js lines 19791-21552 ----
// Contents of Speedometer SP3:editors/assets/longscript.js lines 1-2500 as a string.
var longscript = "/**\n * @license React\n * react-dom.development.js\n *\n * Copyright (c) Facebook, Inc. and its affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */\n(function (global, factory) {\n  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react')) :\n  typeof define === 'function' && define.amd ? define(['exports', 'react'], factory) :\n  (global = global || self, factory(global.ReactDOM = {}, global.React));\n}(this, (function (exports, React) { 'use strict';\n\n  var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;\n\n  var suppressWarning = false;\n  function setSuppressWarning(newSuppressWarning) {\n    {\n      suppressWarning = newSuppressWarning;\n    }\n  } // In DEV, calls to console.warn and console.error get replaced\n  // by calls to these methods by a Babel plugin.\n  //\n  // In PROD (or in packages without access to React internals),\n  // they are left as they are instead.\n\n  function warn(format) {\n    {\n      if (!suppressWarning) {\n        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {\n          args[_key - 1] = arguments[_key];\n        }\n\n        printWarning('warn', format, args);\n      }\n    }\n  }\n  function error(format) {\n    {\n      if (!suppressWarning) {\n        for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {\n          args[_key2 - 1] = arguments[_key2];\n        }\n\n        printWarning('error', format, args);\n      }\n    }\n  }\n\n  function printWarning(level, format, args) {\n    // When changing this logic, you might want to also\n    // update consoleWithStackDev.www.js as well.\n    {\n      var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;\n      var stack = ReactDebugCurrentFrame.getStackAddendum();\n\n      if (stack !== '') {\n        format += '%s';\n        args = args.concat([stack]);\n      } // eslint-disable-next-line react-internal/safe-string-coercion\n\n\n      var argsWithFormat = args.map(function (item) {\n        return String(item);\n      }); // Careful: RN currently depends on this prefix\n\n      argsWithFormat.unshift('Warning: ' + format); // We intentionally don't use spread (or .apply) directly because it\n      // breaks IE9: https://github.com/facebook/react/issues/13610\n      // eslint-disable-next-line react-internal/no-production-logging\n\n      Function.prototype.apply.call(console[level], console, argsWithFormat);\n    }\n  }\n\n  var FunctionComponent = 0;\n  var ClassComponent = 1;\n  var IndeterminateComponent = 2; // Before we know whether it is function or class\n\n  var HostRoot = 3; // Root of a host tree. Could be nested inside another node.\n\n  var HostPortal = 4; // A subtree. Could be an entry point to a different renderer.\n\n  var HostComponent = 5;\n  var HostText = 6;\n  var Fragment = 7;\n  var Mode = 8;\n  var ContextConsumer = 9;\n  var ContextProvider = 10;\n  var ForwardRef = 11;\n  var Profiler = 12;\n  var SuspenseComponent = 13;\n  var MemoComponent = 14;\n  var SimpleMemoComponent = 15;\n  var LazyComponent = 16;\n  var IncompleteClassComponent = 17;\n  var DehydratedFragment = 18;\n  var SuspenseListComponent = 19;\n  var ScopeComponent = 21;\n  var OffscreenComponent = 22;\n  var LegacyHiddenComponent = 23;\n  var CacheComponent = 24;\n  var TracingMarkerComponent = 25;\n\n  // -----------------------------------------------------------------------------\n\n  var enableClientRenderFallbackOnTextMismatch = true; // TODO: Need to review this code one more time before landing\n  // the react-reconciler package.\n\n  var enableNewReconciler = false; // Support legacy Primer support on internal FB www\n\n  var enableLazyContextPropagation = false; // FB-only usage. The new API has different semantics.\n\n  var enableLegacyHidden = false; // Enables unstable_avoidThisFallback feature in Fiber\n\n  var enableSuspenseAvoidThisFallback = false; // Enables unstable_avoidThisFallback feature in Fizz\n  // React DOM Chopping Block\n  //\n  // Similar to main Chopping Block but only flags related to React DOM. These are\n  // grouped because we will likely batch all of them into a single major release.\n  // -----------------------------------------------------------------------------\n  // Disable support for comment nodes as React DOM containers. Already disabled\n  // in open source, but www codebase still relies on it. Need to remove.\n\n  var disableCommentsAsDOMContainers = true; // Disable javascript: URL strings in href for XSS protection.\n  // and client rendering, mostly to allow JSX attributes to apply to the custom\n  // element's object properties instead of only HTML attributes.\n  // https://github.com/facebook/react/issues/11347\n\n  var enableCustomElementPropertySupport = false; // Disables children for <textarea> elements\n  var warnAboutStringRefs = false; // -----------------------------------------------------------------------------\n  // Debugging and DevTools\n  // -----------------------------------------------------------------------------\n  // Adds user timing marks for e.g. state updates, suspense, and work loop stuff,\n  // for an experimental timeline tool.\n\n  var enableSchedulingProfiler = true; // Helps identify side effects in render-phase lifecycle hooks and setState\n\n  var enableProfilerTimer = true; // Record durations for commit and passive effects phases.\n\n  var enableProfilerCommitHooks = true; // Phase param passed to onRender callback differentiates between an \"update\" and a \"cascading-update\".\n\n  var allNativeEvents = new Set();\n  /**\n   * Mapping from registration name to event name\n   */\n\n\n  var registrationNameDependencies = {};\n  /**\n   * Mapping from lowercase registration names to the properly cased version,\n   * used to warn in the case of missing event handlers. Available\n   * only in true.\n   * @type {Object}\n   */\n\n  var possibleRegistrationNames =  {} ; // Trust the developer to only use possibleRegistrationNames in true\n\n  function registerTwoPhaseEvent(registrationName, dependencies) {\n    registerDirectEvent(registrationName, dependencies);\n    registerDirectEvent(registrationName + 'Capture', dependencies);\n  }\n  function registerDirectEvent(registrationName, dependencies) {\n    {\n      if (registrationNameDependencies[registrationName]) {\n        error('EventRegistry: More than one plugin attempted to publish the same ' + 'registration name, `%s`.', registrationName);\n      }\n    }\n\n    registrationNameDependencies[registrationName] = dependencies;\n\n    {\n      var lowerCasedName = registrationName.toLowerCase();\n      possibleRegistrationNames[lowerCasedName] = registrationName;\n\n      if (registrationName === 'onDoubleClick') {\n        possibleRegistrationNames.ondblclick = registrationName;\n      }\n    }\n\n    for (var i = 0; i < dependencies.length; i++) {\n      allNativeEvents.add(dependencies[i]);\n    }\n  }\n\n  var canUseDOM = !!(typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement !== 'undefined');\n\n  var hasOwnProperty = Object.prototype.hasOwnProperty;\n\n  /*\n   * The `'' + value` pattern (used in in perf-sensitive code) throws for Symbol\n   * and Temporal.* types. See https://github.com/facebook/react/pull/22064.\n   *\n   * The functions in this module will throw an easier-to-understand,\n   * easier-to-debug exception with a clear errors message message explaining the\n   * problem. (Instead of a confusing exception thrown inside the implementation\n   * of the `value` object).\n   */\n  // $FlowFixMe only called in DEV, so void return is not possible.\n  function typeName(value) {\n    {\n      // toStringTag is needed for namespaced types like Temporal.Instant\n      var hasToStringTag = typeof Symbol === 'function' && Symbol.toStringTag;\n      var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || 'Object';\n      return type;\n    }\n  } // $FlowFixMe only called in DEV, so void return is not possible.\n\n\n  function willCoercionThrow(value) {\n    {\n      try {\n        testStringCoercion(value);\n        return false;\n      } catch (e) {\n        return true;\n      }\n    }\n  }\n\n  function testStringCoercion(value) {\n    // If you ended up here by following an exception call stack, here's what's\n    // happened: you supplied an object or symbol value to React (as a prop, key,\n    // DOM attribute, CSS property, string ref, etc.) and when React tried to\n    // coerce it to a string using `'' + value`, an exception was thrown.\n    //\n    // The most common types that will cause this exception are `Symbol` instances\n    // and Temporal objects like `Temporal.Instant`. But any object that has a\n    // `valueOf` or `[Symbol.toPrimitive]` method that throws will also cause this\n    // exception. (Library authors do this to prevent users from using built-in\n    // numeric operators like `+` or comparison operators like `>=` because custom\n    // methods are needed to perform accurate arithmetic or comparison.)\n    //\n    // To fix the problem, coerce this object or symbol value to a string before\n    // passing it to React. The most reliable way is usually `String(value)`.\n    //\n    // To find which value is throwing, check the browser or debugger console.\n    // Before this exception was thrown, there should be `console.error` output\n    // that shows the type (Symbol, Temporal.PlainDate, etc.) that caused the\n    // problem and how that type was used: key, atrribute, input value prop, etc.\n    // In most cases, this console output also shows the component and its\n    // ancestor components where the exception happened.\n    //\n    // eslint-disable-next-line react-internal/safe-string-coercion\n    return '' + value;\n  }\n\n  function checkAttributeStringCoercion(value, attributeName) {\n    {\n      if (willCoercionThrow(value)) {\n        error('The provided `%s` attribute is an unsupported type %s.' + ' This value must be coerced to a string before before using it here.', attributeName, typeName(value));\n\n        return testStringCoercion(value); // throw (to help callers find troubleshooting comments)\n      }\n    }\n  }\n  function checkKeyStringCoercion(value) {\n    {\n      if (willCoercionThrow(value)) {\n        error('The provided key is an unsupported type %s.' + ' This value must be coerced to a string before before using it here.', typeName(value));\n\n        return testStringCoercion(value); // throw (to help callers find troubleshooting comments)\n      }\n    }\n  }\n  function checkPropStringCoercion(value, propName) {\n    {\n      if (willCoercionThrow(value)) {\n        error('The provided `%s` prop is an unsupported type %s.' + ' This value must be coerced to a string before before using it here.', propName, typeName(value));\n\n        return testStringCoercion(value); // throw (to help callers find troubleshooting comments)\n      }\n    }\n  }\n  function checkCSSPropertyStringCoercion(value, propName) {\n    {\n      if (willCoercionThrow(value)) {\n        error('The provided `%s` CSS property is an unsupported type %s.' + ' This value must be coerced to a string before before using it here.', propName, typeName(value));\n\n        return testStringCoercion(value); // throw (to help callers find troubleshooting comments)\n      }\n    }\n  }\n  function checkHtmlStringCoercion(value) {\n    {\n      if (willCoercionThrow(value)) {\n        error('The provided HTML markup uses a value of unsupported type %s.' + ' This value must be coerced to a string before before using it here.', typeName(value));\n\n        return testStringCoercion(value); // throw (to help callers find troubleshooting comments)\n      }\n    }\n  }\n  function checkFormFieldValueStringCoercion(value) {\n    {\n      if (willCoercionThrow(value)) {\n        error('Form field values (value, checked, defaultValue, or defaultChecked props)' + ' must be strings, not %s.' + ' This value must be coerced to a string before before using it here.', typeName(value));\n\n        return testStringCoercion(value); // throw (to help callers find troubleshooting comments)\n      }\n    }\n  }\n\n  // A reserved attribute.\n  // It is handled by React separately and shouldn't be written to the DOM.\n  var RESERVED = 0; // A simple string attribute.\n  // Attributes that aren't in the filter are presumed to have this type.\n\n  var STRING = 1; // A string attribute that accepts booleans in React. In HTML, these are called\n  // \"enumerated\" attributes with \"true\" and \"false\" as possible values.\n  // When true, it should be set to a \"true\" string.\n  // When false, it should be set to a \"false\" string.\n\n  var BOOLEANISH_STRING = 2; // A real boolean attribute.\n  // When true, it should be present (set either to an empty string or its name).\n  // When false, it should be omitted.\n\n  var BOOLEAN = 3; // An attribute that can be used as a flag as well as with a value.\n  // When true, it should be present (set either to an empty string or its name).\n  // When false, it should be omitted.\n  // For any other value, should be present with that value.\n\n  var OVERLOADED_BOOLEAN = 4; // An attribute that must be numeric or parse as a numeric.\n  // When falsy, it should be removed.\n\n  var NUMERIC = 5; // An attribute that must be positive numeric or parse as a positive numeric.\n  // When falsy, it should be removed.\n\n  var POSITIVE_NUMERIC = 6;\n\n  /* eslint-disable max-len */\n  var ATTRIBUTE_NAME_START_CHAR = \":A-Z_a-z\\\\u00C0-\\\\u00D6\\\\u00D8-\\\\u00F6\\\\u00F8-\\\\u02FF\\\\u0370-\\\\u037D\\\\u037F-\\\\u1FFF\\\\u200C-\\\\u200D\\\\u2070-\\\\u218F\\\\u2C00-\\\\u2FEF\\\\u3001-\\\\uD7FF\\\\uF900-\\\\uFDCF\\\\uFDF0-\\\\uFFFD\";\n  /* eslint-enable max-len */\n\n  var ATTRIBUTE_NAME_CHAR = ATTRIBUTE_NAME_START_CHAR + \"\\\\-.0-9\\\\u00B7\\\\u0300-\\\\u036F\\\\u203F-\\\\u2040\";\n  var VALID_ATTRIBUTE_NAME_REGEX = new RegExp('^[' + ATTRIBUTE_NAME_START_CHAR + '][' + ATTRIBUTE_NAME_CHAR + ']*$');\n  var illegalAttributeNameCache = {};\n  var validatedAttributeNameCache = {};\n  function isAttributeNameSafe(attributeName) {\n    if (hasOwnProperty.call(validatedAttributeNameCache, attributeName)) {\n      return true;\n    }\n\n    if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) {\n      return false;\n    }\n\n    if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) {\n      validatedAttributeNameCache[attributeName] = true;\n      return true;\n    }\n\n    illegalAttributeNameCache[attributeName] = true;\n\n    {\n      error('Invalid attribute name: `%s`', attributeName);\n    }\n\n    return false;\n  }\n  function shouldIgnoreAttribute(name, propertyInfo, isCustomComponentTag) {\n    if (propertyInfo !== null) {\n      return propertyInfo.type === RESERVED;\n    }\n\n    if (isCustomComponentTag) {\n      return false;\n    }\n\n    if (name.length > 2 && (name[0] === 'o' || name[0] === 'O') && (name[1] === 'n' || name[1] === 'N')) {\n      return true;\n    }\n\n    return false;\n  }\n  function shouldRemoveAttributeWithWarning(name, value, propertyInfo, isCustomComponentTag) {\n    if (propertyInfo !== null && propertyInfo.type === RESERVED) {\n      return false;\n    }\n\n    switch (typeof value) {\n      case 'function': // $FlowIssue symbol is perfectly valid here\n\n      case 'symbol':\n        // eslint-disable-line\n        return true;\n\n      case 'boolean':\n        {\n          if (isCustomComponentTag) {\n            return false;\n          }\n\n          if (propertyInfo !== null) {\n            return !propertyInfo.acceptsBooleans;\n          } else {\n            var prefix = name.toLowerCase().slice(0, 5);\n            return prefix !== 'data-' && prefix !== 'aria-';\n          }\n        }\n\n      default:\n        return false;\n    }\n  }\n  function shouldRemoveAttribute(name, value, propertyInfo, isCustomComponentTag) {\n    if (value === null || typeof value === 'undefined') {\n      return true;\n    }\n\n    if (shouldRemoveAttributeWithWarning(name, value, propertyInfo, isCustomComponentTag)) {\n      return true;\n    }\n\n    if (isCustomComponentTag) {\n\n      return false;\n    }\n\n    if (propertyInfo !== null) {\n\n      switch (propertyInfo.type) {\n        case BOOLEAN:\n          return !value;\n\n        case OVERLOADED_BOOLEAN:\n          return value === false;\n\n        case NUMERIC:\n          return isNaN(value);\n\n        case POSITIVE_NUMERIC:\n          return isNaN(value) || value < 1;\n      }\n    }\n\n    return false;\n  }\n  function getPropertyInfo(name) {\n    return properties.hasOwnProperty(name) ? properties[name] : null;\n  }\n\n  function PropertyInfoRecord(name, type, mustUseProperty, attributeName, attributeNamespace, sanitizeURL, removeEmptyString) {\n    this.acceptsBooleans = type === BOOLEANISH_STRING || type === BOOLEAN || type === OVERLOADED_BOOLEAN;\n    this.attributeName = attributeName;\n    this.attributeNamespace = attributeNamespace;\n    this.mustUseProperty = mustUseProperty;\n    this.propertyName = name;\n    this.type = type;\n    this.sanitizeURL = sanitizeURL;\n    this.removeEmptyString = removeEmptyString;\n  } // When adding attributes to this list, be sure to also add them to\n  // the `possibleStandardNames` module to ensure casing and incorrect\n  // name warnings.\n\n\n  var properties = {}; // These props are reserved by React. They shouldn't be written to the DOM.\n\n  var reservedProps = ['children', 'dangerouslySetInnerHTML', // TODO: This prevents the assignment of defaultValue to regular\n  // elements (not just inputs). Now that ReactDOMInput assigns to the\n  // defaultValue property -- do we need this?\n  'defaultValue', 'defaultChecked', 'innerHTML', 'suppressContentEditableWarning', 'suppressHydrationWarning', 'style'];\n\n  reservedProps.forEach(function (name) {\n    properties[name] = new PropertyInfoRecord(name, RESERVED, false, // mustUseProperty\n    name, // attributeName\n    null, // attributeNamespace\n    false, // sanitizeURL\n    false);\n  }); // A few React string attributes have a different name.\n  // This is a mapping from React prop names to the attribute names.\n\n  [['acceptCharset', 'accept-charset'], ['className', 'class'], ['htmlFor', 'for'], ['httpEquiv', 'http-equiv']].forEach(function (_ref) {\n    var name = _ref[0],\n        attributeName = _ref[1];\n    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty\n    attributeName, // attributeName\n    null, // attributeNamespace\n    false, // sanitizeURL\n    false);\n  }); // These are \"enumerated\" HTML attributes that accept \"true\" and \"false\".\n  // In React, we let users pass `true` and `false` even though technically\n  // these aren't boolean attributes (they are coerced to strings).\n\n  ['contentEditable', 'draggable', 'spellCheck', 'value'].forEach(function (name) {\n    properties[name] = new PropertyInfoRecord(name, BOOLEANISH_STRING, false, // mustUseProperty\n    name.toLowerCase(), // attributeName\n    null, // attributeNamespace\n    false, // sanitizeURL\n    false);\n  }); // These are \"enumerated\" SVG attributes that accept \"true\" and \"false\".\n  // In React, we let users pass `true` and `false` even though technically\n  // these aren't boolean attributes (they are coerced to strings).\n  // Since these are SVG attributes, their attribute names are case-sensitive.\n\n  ['autoReverse', 'externalResourcesRequired', 'focusable', 'preserveAlpha'].forEach(function (name) {\n    properties[name] = new PropertyInfoRecord(name, BOOLEANISH_STRING, false, // mustUseProperty\n    name, // attributeName\n    null, // attributeNamespace\n    false, // sanitizeURL\n    false);\n  }); // These are HTML boolean attributes.\n\n  ['allowFullScreen', 'async', // Note: there is a special case that prevents it from being written to the DOM\n  // on the client side because the browsers are inconsistent. Instead we call focus().\n  'autoFocus', 'autoPlay', 'controls', 'default', 'defer', 'disabled', 'disablePictureInPicture', 'disableRemotePlayback', 'formNoValidate', 'hidden', 'loop', 'noModule', 'noValidate', 'open', 'playsInline', 'readOnly', 'required', 'reversed', 'scoped', 'seamless', // Microdata\n  'itemScope'].forEach(function (name) {\n    properties[name] = new PropertyInfoRecord(name, BOOLEAN, false, // mustUseProperty\n    name.toLowerCase(), // attributeName\n    null, // attributeNamespace\n    false, // sanitizeURL\n    false);\n  }); // These are the few React props that we set as DOM properties\n  // rather than attributes. These are all booleans.\n\n  ['checked', // Note: `option.selected` is not updated if `select.multiple` is\n  // disabled with `removeAttribute`. We have special logic for handling this.\n  'multiple', 'muted', 'selected' // NOTE: if you add a camelCased prop to this list,\n  // you'll need to set attributeName to name.toLowerCase()\n  // instead in the assignment below.\n  ].forEach(function (name) {\n    properties[name] = new PropertyInfoRecord(name, BOOLEAN, true, // mustUseProperty\n    name, // attributeName\n    null, // attributeNamespace\n    false, // sanitizeURL\n    false);\n  }); // These are HTML attributes that are \"overloaded booleans\": they behave like\n  // booleans, but can also accept a string value.\n\n  ['capture', 'download' // NOTE: if you add a camelCased prop to this list,\n  // you'll need to set attributeName to name.toLowerCase()\n  // instead in the assignment below.\n  ].forEach(function (name) {\n    properties[name] = new PropertyInfoRecord(name, OVERLOADED_BOOLEAN, false, // mustUseProperty\n    name, // attributeName\n    null, // attributeNamespace\n    false, // sanitizeURL\n    false);\n  }); // These are HTML attributes that must be positive numbers.\n\n  ['cols', 'rows', 'size', 'span' // NOTE: if you add a camelCased prop to this list,\n  // you'll need to set attributeName to name.toLowerCase()\n  // instead in the assignment below.\n  ].forEach(function (name) {\n    properties[name] = new PropertyInfoRecord(name, POSITIVE_NUMERIC, false, // mustUseProperty\n    name, // attributeName\n    null, // attributeNamespace\n    false, // sanitizeURL\n    false);\n  }); // These are HTML attributes that must be numbers.\n\n  ['rowSpan', 'start'].forEach(function (name) {\n    properties[name] = new PropertyInfoRecord(name, NUMERIC, false, // mustUseProperty\n    name.toLowerCase(), // attributeName\n    null, // attributeNamespace\n    false, // sanitizeURL\n    false);\n  });\n  var CAMELIZE = /[\\-\\:]([a-z])/g;\n\n  var capitalize = function (token) {\n    return token[1].toUpperCase();\n  }; // This is a list of all SVG attributes that need special casing, namespacing,\n  // or boolean value assignment. Regular attributes that just accept strings\n  // and have the same names are omitted, just like in the HTML attribute filter.\n  // Some of these attributes can be hard to find. This list was created by\n  // scraping the MDN documentation.\n\n\n  ['accent-height', 'alignment-baseline', 'arabic-form', 'baseline-shift', 'cap-height', 'clip-path', 'clip-rule', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'dominant-baseline', 'enable-background', 'fill-opacity', 'fill-rule', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'glyph-name', 'glyph-orientation-horizontal', 'glyph-orientation-vertical', 'horiz-adv-x', 'horiz-origin-x', 'image-rendering', 'letter-spacing', 'lighting-color', 'marker-end', 'marker-mid', 'marker-start', 'overline-position', 'overline-thickness', 'paint-order', 'panose-1', 'pointer-events', 'rendering-intent', 'shape-rendering', 'stop-color', 'stop-opacity', 'strikethrough-position', 'strikethrough-thickness', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'text-anchor', 'text-decoration', 'text-rendering', 'underline-position', 'underline-thickness', 'unicode-bidi', 'unicode-range', 'units-per-em', 'v-alphabetic', 'v-hanging', 'v-ideographic', 'v-mathematical', 'vector-effect', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'word-spacing', 'writing-mode', 'xmlns:xlink', 'x-height' // NOTE: if you add a camelCased prop to this list,\n  // you'll need to set attributeName to name.toLowerCase()\n  // instead in the assignment below.\n  ].forEach(function (attributeName) {\n    var name = attributeName.replace(CAMELIZE, capitalize);\n    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty\n    attributeName, null, // attributeNamespace\n    false, // sanitizeURL\n    false);\n  }); // String SVG attributes with the xlink namespace.\n\n  ['xlink:actuate', 'xlink:arcrole', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type' // NOTE: if you add a camelCased prop to this list,\n  // you'll need to set attributeName to name.toLowerCase()\n  // instead in the assignment below.\n  ].forEach(function (attributeName) {\n    var name = attributeName.replace(CAMELIZE, capitalize);\n    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty\n    attributeName, 'http://www.w3.org/1999/xlink', false, // sanitizeURL\n    false);\n  }); // String SVG attributes with the xml namespace.\n\n  ['xml:base', 'xml:lang', 'xml:space' // NOTE: if you add a camelCased prop to this list,\n  // you'll need to set attributeName to name.toLowerCase()\n  // instead in the assignment below.\n  ].forEach(function (attributeName) {\n    var name = attributeName.replace(CAMELIZE, capitalize);\n    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty\n    attributeName, 'http://www.w3.org/XML/1998/namespace', false, // sanitizeURL\n    false);\n  }); // These attribute exists both in HTML and SVG.\n  // The attribute name is case-sensitive in SVG so we can't just use\n  // the React name like we do for attributes that exist only in HTML.\n\n  ['tabIndex', 'crossOrigin'].forEach(function (attributeName) {\n    properties[attributeName] = new PropertyInfoRecord(attributeName, STRING, false, // mustUseProperty\n    attributeName.toLowerCase(), // attributeName\n    null, // attributeNamespace\n    false, // sanitizeURL\n    false);\n  }); // These attributes accept URLs. These must not allow javascript: URLS.\n  // These will also need to accept Trusted Types object in the future.\n\n  var xlinkHref = 'xlinkHref';\n  properties[xlinkHref] = new PropertyInfoRecord('xlinkHref', STRING, false, // mustUseProperty\n  'xlink:href', 'http://www.w3.org/1999/xlink', true, // sanitizeURL\n  false);\n  ['src', 'href', 'action', 'formAction'].forEach(function (attributeName) {\n    properties[attributeName] = new PropertyInfoRecord(attributeName, STRING, false, // mustUseProperty\n    attributeName.toLowerCase(), // attributeName\n    null, // attributeNamespace\n    true, // sanitizeURL\n    true);\n  });\n\n  // and any newline or tab are filtered out as if they're not part of the URL.\n  // https://url.spec.whatwg.org/#url-parsing\n  // Tab or newline are defined as \\r\\n\\t:\n  // https://infra.spec.whatwg.org/#ascii-tab-or-newline\n  // A C0 control is a code point in the range \\u0000 NULL to \\u001F\n  // INFORMATION SEPARATOR ONE, inclusive:\n  // https://infra.spec.whatwg.org/#c0-control-or-space\n\n  /* eslint-disable max-len */\n\n  var isJavaScriptProtocol = /^[\\u0000-\\u001F ]*j[\\r\\n\\t]*a[\\r\\n\\t]*v[\\r\\n\\t]*a[\\r\\n\\t]*s[\\r\\n\\t]*c[\\r\\n\\t]*r[\\r\\n\\t]*i[\\r\\n\\t]*p[\\r\\n\\t]*t[\\r\\n\\t]*\\:/i;\n  var didWarn = false;\n\n  function sanitizeURL(url) {\n    {\n      if (!didWarn && isJavaScriptProtocol.test(url)) {\n        didWarn = true;\n\n        error('A future version of React will block javascript: URLs as a security precaution. ' + 'Use event handlers instead if you can. If you need to generate unsafe HTML try ' + 'using dangerouslySetInnerHTML instead. React was passed %s.', JSON.stringify(url));\n      }\n    }\n  }\n\n  /**\n   * Get the value for a property on a node. Only used in DEV for SSR validation.\n   * The \"expected\" argument is used as a hint of what the expected value is.\n   * Some properties have multiple equivalent values.\n   */\n  function getValueForProperty(node, name, expected, propertyInfo) {\n    {\n      if (propertyInfo.mustUseProperty) {\n        var propertyName = propertyInfo.propertyName;\n        return node[propertyName];\n      } else {\n        // This check protects multiple uses of `expected`, which is why the\n        // react-internal/safe-string-coercion rule is disabled in several spots\n        // below.\n        {\n          checkAttributeStringCoercion(expected, name);\n        }\n\n        if ( propertyInfo.sanitizeURL) {\n          // If we haven't fully disabled javascript: URLs, and if\n          // the hydration is successful of a javascript: URL, we\n          // still want to warn on the client.\n          // eslint-disable-next-line react-internal/safe-string-coercion\n          sanitizeURL('' + expected);\n        }\n\n        var attributeName = propertyInfo.attributeName;\n        var stringValue = null;\n\n        if (propertyInfo.type === OVERLOADED_BOOLEAN) {\n          if (node.hasAttribute(attributeName)) {\n            var value = node.getAttribute(attributeName);\n\n            if (value === '') {\n              return true;\n            }\n\n            if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {\n              return value;\n            } // eslint-disable-next-line react-internal/safe-string-coercion\n\n\n            if (value === '' + expected) {\n              return expected;\n            }\n\n            return value;\n          }\n        } else if (node.hasAttribute(attributeName)) {\n          if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {\n            // We had an attribute but shouldn't have had one, so read it\n            // for the error message.\n            return node.getAttribute(attributeName);\n          }\n\n          if (propertyInfo.type === BOOLEAN) {\n            // If this was a boolean, it doesn't matter what the value is\n            // the fact that we have it is the same as the expected.\n            return expected;\n          } // Even if this property uses a namespace we use getAttribute\n          // because we assume its namespaced name is the same as our config.\n          // To use getAttributeNS we need the local name which we don't have\n          // in our config atm.\n\n\n          stringValue = node.getAttribute(attributeName);\n        }\n\n        if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {\n          return stringValue === null ? expected : stringValue; // eslint-disable-next-line react-internal/safe-string-coercion\n        } else if (stringValue === '' + expected) {\n          return expected;\n        } else {\n          return stringValue;\n        }\n      }\n    }\n  }\n  /**\n   * Get the value for a attribute on a node. Only used in DEV for SSR validation.\n   * The third argument is used as a hint of what the expected value is. Some\n   * attributes have multiple equivalent values.\n   */\n\n  function getValueForAttribute(node, name, expected, isCustomComponentTag) {\n    {\n      if (!isAttributeNameSafe(name)) {\n        return;\n      }\n\n      if (!node.hasAttribute(name)) {\n        return expected === undefined ? undefined : null;\n      }\n\n      var value = node.getAttribute(name);\n\n      {\n        checkAttributeStringCoercion(expected, name);\n      }\n\n      if (value === '' + expected) {\n        return expected;\n      }\n\n      return value;\n    }\n  }\n  /**\n   * Sets the value for a property on a node.\n   *\n   * @param {DOMElement} node\n   * @param {string} name\n   * @param {*} value\n   */\n\n  function setValueForProperty(node, name, value, isCustomComponentTag) {\n    var propertyInfo = getPropertyInfo(name);\n\n    if (shouldIgnoreAttribute(name, propertyInfo, isCustomComponentTag)) {\n      return;\n    }\n\n    if (shouldRemoveAttribute(name, value, propertyInfo, isCustomComponentTag)) {\n      value = null;\n    }\n\n\n    if (isCustomComponentTag || propertyInfo === null) {\n      if (isAttributeNameSafe(name)) {\n        var _attributeName = name;\n\n        if (value === null) {\n          node.removeAttribute(_attributeName);\n        } else {\n          {\n            checkAttributeStringCoercion(value, name);\n          }\n\n          node.setAttribute(_attributeName,  '' + value);\n        }\n      }\n\n      return;\n    }\n\n    var mustUseProperty = propertyInfo.mustUseProperty;\n\n    if (mustUseProperty) {\n      var propertyName = propertyInfo.propertyName;\n\n      if (value === null) {\n        var type = propertyInfo.type;\n        node[propertyName] = type === BOOLEAN ? false : '';\n      } else {\n        // Contrary to `setAttribute`, object properties are properly\n        // `toString`ed by IE8/9.\n        node[propertyName] = value;\n      }\n\n      return;\n    } // The rest are treated as attributes with special cases.\n\n\n    var attributeName = propertyInfo.attributeName,\n        attributeNamespace = propertyInfo.attributeNamespace;\n\n    if (value === null) {\n      node.removeAttribute(attributeName);\n    } else {\n      var _type = propertyInfo.type;\n      var attributeValue;\n\n      if (_type === BOOLEAN || _type === OVERLOADED_BOOLEAN && value === true) {\n        // If attribute type is boolean, we know for sure it won't be an execution sink\n        // and we won't require Trusted Type here.\n        attributeValue = '';\n      } else {\n        // `setAttribute` with objects becomes only `[object]` in IE8/9,\n        // ('' + value) makes it output the correct toString()-value.\n        {\n          {\n            checkAttributeStringCoercion(value, attributeName);\n          }\n\n          attributeValue = '' + value;\n        }\n\n        if (propertyInfo.sanitizeURL) {\n          sanitizeURL(attributeValue.toString());\n        }\n      }\n\n      if (attributeNamespace) {\n        node.setAttributeNS(attributeNamespace, attributeName, attributeValue);\n      } else {\n        node.setAttribute(attributeName, attributeValue);\n      }\n    }\n  }\n\n  // ATTENTION\n  // When adding new symbols to this file,\n  // Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'\n  // The Symbol used to tag the ReactElement-like types.\n  var REACT_ELEMENT_TYPE = Symbol.for('react.element');\n  var REACT_PORTAL_TYPE = Symbol.for('react.portal');\n  var REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');\n  var REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode');\n  var REACT_PROFILER_TYPE = Symbol.for('react.profiler');\n  var REACT_PROVIDER_TYPE = Symbol.for('react.provider');\n  var REACT_CONTEXT_TYPE = Symbol.for('react.context');\n  var REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');\n  var REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');\n  var REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list');\n  var REACT_MEMO_TYPE = Symbol.for('react.memo');\n  var REACT_LAZY_TYPE = Symbol.for('react.lazy');\n  var REACT_SCOPE_TYPE = Symbol.for('react.scope');\n  var REACT_DEBUG_TRACING_MODE_TYPE = Symbol.for('react.debug_trace_mode');\n  var REACT_OFFSCREEN_TYPE = Symbol.for('react.offscreen');\n  var REACT_LEGACY_HIDDEN_TYPE = Symbol.for('react.legacy_hidden');\n  var REACT_CACHE_TYPE = Symbol.for('react.cache');\n  var REACT_TRACING_MARKER_TYPE = Symbol.for('react.tracing_marker');\n  var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;\n  var FAUX_ITERATOR_SYMBOL = '@@iterator';\n  function getIteratorFn(maybeIterable) {\n    if (maybeIterable === null || typeof maybeIterable !== 'object') {\n      return null;\n    }\n\n    var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];\n\n    if (typeof maybeIterator === 'function') {\n      return maybeIterator;\n    }\n\n    return null;\n  }\n\n  var assign = Object.assign;\n\n  // Helpers to patch console.logs to avoid logging during side-effect free\n  // replaying on render function. This currently only patches the object\n  // lazily which won't cover if the log function was extracted eagerly.\n  // We could also eagerly patch the method.\n  var disabledDepth = 0;\n  var prevLog;\n  var prevInfo;\n  var prevWarn;\n  var prevError;\n  var prevGroup;\n  var prevGroupCollapsed;\n  var prevGroupEnd;\n\n  function disabledLog() {}\n\n  disabledLog.__reactDisabledLog = true;\n  function disableLogs() {\n    {\n      if (disabledDepth === 0) {\n        /* eslint-disable react-internal/no-production-logging */\n        prevLog = console.log;\n        prevInfo = console.info;\n        prevWarn = console.warn;\n        prevError = console.error;\n        prevGroup = console.group;\n        prevGroupCollapsed = console.groupCollapsed;\n        prevGroupEnd = console.groupEnd; // https://github.com/facebook/react/issues/19099\n\n        var props = {\n          configurable: true,\n          enumerable: true,\n          value: disabledLog,\n          writable: true\n        }; // $FlowFixMe Flow thinks console is immutable.\n\n        Object.defineProperties(console, {\n          info: props,\n          log: props,\n          warn: props,\n          error: props,\n          group: props,\n          groupCollapsed: props,\n          groupEnd: props\n        });\n        /* eslint-enable react-internal/no-production-logging */\n      }\n\n      disabledDepth++;\n    }\n  }\n  function reenableLogs() {\n    {\n      disabledDepth--;\n\n      if (disabledDepth === 0) {\n        /* eslint-disable react-internal/no-production-logging */\n        var props = {\n          configurable: true,\n          enumerable: true,\n          writable: true\n        }; // $FlowFixMe Flow thinks console is immutable.\n\n        Object.defineProperties(console, {\n          log: assign({}, props, {\n            value: prevLog\n          }),\n          info: assign({}, props, {\n            value: prevInfo\n          }),\n          warn: assign({}, props, {\n            value: prevWarn\n          }),\n          error: assign({}, props, {\n            value: prevError\n          }),\n          group: assign({}, props, {\n            value: prevGroup\n          }),\n          groupCollapsed: assign({}, props, {\n            value: prevGroupCollapsed\n          }),\n          groupEnd: assign({}, props, {\n            value: prevGroupEnd\n          })\n        });\n        /* eslint-enable react-internal/no-production-logging */\n      }\n\n      if (disabledDepth < 0) {\n        error('disabledDepth fell below zero. ' + 'This is a bug in React. Please file an issue.');\n      }\n    }\n  }\n\n  var ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;\n  var prefix;\n  function describeBuiltInComponentFrame(name, source, ownerFn) {\n    {\n      if (prefix === undefined) {\n        // Extract the VM specific prefix used by each line.\n        try {\n          throw Error();\n        } catch (x) {\n          var match = x.stack.trim().match(/\\n( *(at )?)/);\n          prefix = match && match[1] || '';\n        }\n      } // We use the prefix to ensure our stacks line up with native stack frames.\n\n\n      return '\\n' + prefix + name;\n    }\n  }\n  var reentry = false;\n  var componentFrameCache;\n\n  {\n    var PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;\n    componentFrameCache = new PossiblyWeakMap();\n  }\n\n  function describeNativeComponentFrame(fn, construct) {\n    // If something asked for a stack inside a fake render, it should get ignored.\n    if ( !fn || reentry) {\n      return '';\n    }\n\n    {\n      var frame = componentFrameCache.get(fn);\n\n      if (frame !== undefined) {\n        return frame;\n      }\n    }\n\n    var control;\n    reentry = true;\n    var previousPrepareStackTrace = Error.prepareStackTrace; // $FlowFixMe It does accept undefined.\n\n    Error.prepareStackTrace = undefined;\n    var previousDispatcher;\n\n    {\n      previousDispatcher = ReactCurrentDispatcher.current; // Set the dispatcher in DEV because this might be call in the render function\n      // for warnings.\n\n      ReactCurrentDispatcher.current = null;\n      disableLogs();\n    }\n\n    try {\n      // This should throw.\n      if (construct) {\n        // Something should be setting the props in the constructor.\n        var Fake = function () {\n          throw Error();\n        }; // $FlowFixMe\n\n\n        Object.defineProperty(Fake.prototype, 'props', {\n          set: function () {\n            // We use a throwing setter instead of frozen or non-writable props\n            // because that won't throw in a non-strict mode function.\n            throw Error();\n          }\n        });\n\n        if (typeof Reflect === 'object' && Reflect.construct) {\n          // We construct a different control for this case to include any extra\n          // frames added by the construct call.\n          try {\n            Reflect.construct(Fake, []);\n          } catch (x) {\n            control = x;\n          }\n\n          Reflect.construct(fn, [], Fake);\n        } else {\n          try {\n            Fake.call();\n          } catch (x) {\n            control = x;\n          }\n\n          fn.call(Fake.prototype);\n        }\n      } else {\n        try {\n          throw Error();\n        } catch (x) {\n          control = x;\n        }\n\n        fn();\n      }\n    } catch (sample) {\n      // This is inlined manually because closure doesn't do it for us.\n      if (sample && control && typeof sample.stack === 'string') {\n        // This extracts the first frame from the sample that isn't also in the control.\n        // Skipping one frame that we assume is the frame that calls the two.\n        var sampleLines = sample.stack.split('\\n');\n        var controlLines = control.stack.split('\\n');\n        var s = sampleLines.length - 1;\n        var c = controlLines.length - 1;\n\n        while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {\n          // We expect at least one stack frame to be shared.\n          // Typically this will be the root most one. However, stack frames may be\n          // cut off due to maximum stack limits. In this case, one maybe cut off\n          // earlier than the other. We assume that the sample is longer or the same\n          // and there for cut off earlier. So we should find the root most frame in\n          // the sample somewhere in the control.\n          c--;\n        }\n\n        for (; s >= 1 && c >= 0; s--, c--) {\n          // Next we find the first one that isn't the same which should be the\n          // frame that called our sample function and the control.\n          if (sampleLines[s] !== controlLines[c]) {\n            // In V8, the first line is describing the message but other VMs don't.\n            // If we're about to return the first line, and the control is also on the same\n            // line, that's a pretty good indicator that our sample threw at same line as\n            // the control. I.e. before we entered the sample frame. So we ignore this result.\n            // This can happen if you passed a class to function component, or non-function.\n            if (s !== 1 || c !== 1) {\n              do {\n                s--;\n                c--; // We may still have similar intermediate frames from the construct call.\n                // The next one that isn't the same should be our match though.\n\n                if (c < 0 || sampleLines[s] !== controlLines[c]) {\n                  // V8 adds a \"new\" prefix for native classes. Let's remove it to make it prettier.\n                  var _frame = '\\n' + sampleLines[s].replace(' at new ', ' at '); // If our component frame is labeled \"<anonymous>\"\n                  // but we have a user-provided \"displayName\"\n                  // splice it in to make the stack more readable.\n\n\n                  if (fn.displayName && _frame.includes('<anonymous>')) {\n                    _frame = _frame.replace('<anonymous>', fn.displayName);\n                  }\n\n                  {\n                    if (typeof fn === 'function') {\n                      componentFrameCache.set(fn, _frame);\n                    }\n                  } // Return the line we found.\n\n\n                  return _frame;\n                }\n              } while (s >= 1 && c >= 0);\n            }\n\n            break;\n          }\n        }\n      }\n    } finally {\n      reentry = false;\n\n      {\n        ReactCurrentDispatcher.current = previousDispatcher;\n        reenableLogs();\n      }\n\n      Error.prepareStackTrace = previousPrepareStackTrace;\n    } // Fallback to just using the name if we couldn't make it throw.\n\n\n    var name = fn ? fn.displayName || fn.name : '';\n    var syntheticFrame = name ? describeBuiltInComponentFrame(name) : '';\n\n    {\n      if (typeof fn === 'function') {\n        componentFrameCache.set(fn, syntheticFrame);\n      }\n    }\n\n    return syntheticFrame;\n  }\n\n  function describeClassComponentFrame(ctor, source, ownerFn) {\n    {\n      return describeNativeComponentFrame(ctor, true);\n    }\n  }\n  function describeFunctionComponentFrame(fn, source, ownerFn) {\n    {\n      return describeNativeComponentFrame(fn, false);\n    }\n  }\n\n  function shouldConstruct(Component) {\n    var prototype = Component.prototype;\n    return !!(prototype && prototype.isReactComponent);\n  }\n\n  function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {\n\n    if (type == null) {\n      return '';\n    }\n\n    if (typeof type === 'function') {\n      {\n        return describeNativeComponentFrame(type, shouldConstruct(type));\n      }\n    }\n\n    if (typeof type === 'string') {\n      return describeBuiltInComponentFrame(type);\n    }\n\n    switch (type) {\n      case REACT_SUSPENSE_TYPE:\n        return describeBuiltInComponentFrame('Suspense');\n\n      case REACT_SUSPENSE_LIST_TYPE:\n        return describeBuiltInComponentFrame('SuspenseList');\n    }\n\n    if (typeof type === 'object') {\n      switch (type.$$typeof) {\n        case REACT_FORWARD_REF_TYPE:\n          return describeFunctionComponentFrame(type.render);\n\n        case REACT_MEMO_TYPE:\n          // Memo may contain any component type so we recursively resolve it.\n          return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);\n\n        case REACT_LAZY_TYPE:\n          {\n            var lazyComponent = type;\n            var payload = lazyComponent._payload;\n            var init = lazyComponent._init;\n\n            try {\n              // Lazy may contain any component type so we recursively resolve it.\n              return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);\n            } catch (x) {}\n          }\n      }\n    }\n\n    return '';\n  }\n\n  function describeFiber(fiber) {\n    var owner =  fiber._debugOwner ? fiber._debugOwner.type : null ;\n    var source =  fiber._debugSource ;\n\n    switch (fiber.tag) {\n      case HostComponent:\n        return describeBuiltInComponentFrame(fiber.type);\n\n      case LazyComponent:\n        return describeBuiltInComponentFrame('Lazy');\n\n      case SuspenseComponent:\n        return describeBuiltInComponentFrame('Suspense');\n\n      case SuspenseListComponent:\n        return describeBuiltInComponentFrame('SuspenseList');\n\n      case FunctionComponent:\n      case IndeterminateComponent:\n      case SimpleMemoComponent:\n        return describeFunctionComponentFrame(fiber.type);\n\n      case ForwardRef:\n        return describeFunctionComponentFrame(fiber.type.render);\n\n      case ClassComponent:\n        return describeClassComponentFrame(fiber.type);\n\n      default:\n        return '';\n    }\n  }\n\n  function getStackByFiberInDevAndProd(workInProgress) {\n    try {\n      var info = '';\n      var node = workInProgress;\n\n      do {\n        info += describeFiber(node);\n        node = node.return;\n      } while (node);\n\n      return info;\n    } catch (x) {\n      return '\\nError generating stack: ' + x.message + '\\n' + x.stack;\n    }\n  }\n\n  function getWrappedName(outerType, innerType, wrapperName) {\n    var displayName = outerType.displayName;\n\n    if (displayName) {\n      return displayName;\n    }\n\n    var functionName = innerType.displayName || innerType.name || '';\n    return functionName !== '' ? wrapperName + \"(\" + functionName + \")\" : wrapperName;\n  } // Keep in sync with react-reconciler/getComponentNameFromFiber\n\n\n  function getContextName(type) {\n    return type.displayName || 'Context';\n  } // Note that the reconciler package should generally prefer to use getComponentNameFromFiber() instead.\n\n\n  function getComponentNameFromType(type) {\n    if (type == null) {\n      // Host root, text node or just invalid type.\n      return null;\n    }\n\n    {\n      if (typeof type.tag === 'number') {\n        error('Received an unexpected object in getComponentNameFromType(). ' + 'This is likely a bug in React. Please file an issue.');\n      }\n    }\n\n    if (typeof type === 'function') {\n      return type.displayName || type.name || null;\n    }\n\n    if (typeof type === 'string') {\n      return type;\n    }\n\n    switch (type) {\n      case REACT_FRAGMENT_TYPE:\n        return 'Fragment';\n\n      case REACT_PORTAL_TYPE:\n        return 'Portal';\n\n      case REACT_PROFILER_TYPE:\n        return 'Profiler';\n\n      case REACT_STRICT_MODE_TYPE:\n        return 'StrictMode';\n\n      case REACT_SUSPENSE_TYPE:\n        return 'Suspense';\n\n      case REACT_SUSPENSE_LIST_TYPE:\n        return 'SuspenseList';\n\n    }\n\n    if (typeof type === 'object') {\n      switch (type.$$typeof) {\n        case REACT_CONTEXT_TYPE:\n          var context = type;\n          return getContextName(context) + '.Consumer';\n\n        case REACT_PROVIDER_TYPE:\n          var provider = type;\n          return getContextName(provider._context) + '.Provider';\n\n        case REACT_FORWARD_REF_TYPE:\n          return getWrappedName(type, type.render, 'ForwardRef');\n\n        case REACT_MEMO_TYPE:\n          var outerName = type.displayName || null;\n\n          if (outerName !== null) {\n            return outerName;\n          }\n\n          return getComponentNameFromType(type.type) || 'Memo';\n\n        case REACT_LAZY_TYPE:\n          {\n            var lazyComponent = type;\n            var payload = lazyComponent._payload;\n            var init = lazyComponent._init;\n\n            try {\n              return getComponentNameFromType(init(payload));\n            } catch (x) {\n              return null;\n            }\n          }\n\n        // eslint-disable-next-line no-fallthrough\n      }\n    }\n\n    return null;\n  }\n\n  function getWrappedName$1(outerType, innerType, wrapperName) {\n    var functionName = innerType.displayName || innerType.name || '';\n    return outerType.displayName || (functionName !== '' ? wrapperName + \"(\" + functionName + \")\" : wrapperName);\n  } // Keep in sync with shared/getComponentNameFromType\n\n\n  function getContextName$1(type) {\n    return type.displayName || 'Context';\n  }\n\n  function getComponentNameFromFiber(fiber) {\n    var tag = fiber.tag,\n        type = fiber.type;\n\n    switch (tag) {\n      case CacheComponent:\n        return 'Cache';\n\n      case ContextConsumer:\n        var context = type;\n        return getContextName$1(context) + '.Consumer';\n\n      case ContextProvider:\n        var provider = type;\n        return getContextName$1(provider._context) + '.Provider';\n\n      case DehydratedFragment:\n        return 'DehydratedFragment';\n\n      case ForwardRef:\n        return getWrappedName$1(type, type.render, 'ForwardRef');\n\n      case Fragment:\n        return 'Fragment';\n\n      case HostComponent:\n        // Host component type is the display name (e.g. \"div\", \"View\")\n        return type;\n\n      case HostPortal:\n        return 'Portal';\n\n      case HostRoot:\n        return 'Root';\n\n      case HostText:\n        return 'Text';\n\n      case LazyComponent:\n        // Name comes from the type in this case; we don't have a tag.\n        return getComponentNameFromType(type);\n\n      case Mode:\n        if (type === REACT_STRICT_MODE_TYPE) {\n          // Don't be less specific than shared/getComponentNameFromType\n          return 'StrictMode';\n        }\n\n        return 'Mode';\n\n      case OffscreenComponent:\n        return 'Offscreen';\n\n      case Profiler:\n        return 'Profiler';\n\n      case ScopeComponent:\n        return 'Scope';\n\n      case SuspenseComponent:\n        return 'Suspense';\n\n      case SuspenseListComponent:\n        return 'SuspenseList';\n\n      case TracingMarkerComponent:\n        return 'TracingMarker';\n      // The display name for this tags come from the user-provided type:\n\n      case ClassComponent:\n      case FunctionComponent:\n      case IncompleteClassComponent:\n      case IndeterminateComponent:\n      case MemoComponent:\n      case SimpleMemoComponent:\n        if (typeof type === 'function') {\n          return type.displayName || type.name || null;\n        }\n\n        if (typeof type === 'string') {\n          return type;\n        }\n\n        break;\n\n    }\n\n    return null;\n  }\n\n  var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;\n  var current = null;\n  var isRendering = false;\n  function getCurrentFiberOwnerNameInDevOrNull() {\n    {\n      if (current === null) {\n        return null;\n      }\n\n      var owner = current._debugOwner;\n\n      if (owner !== null && typeof owner !== 'undefined') {\n        return getComponentNameFromFiber(owner);\n      }\n    }\n\n    return null;\n  }\n\n  function getCurrentFiberStackInDev() {\n    {\n      if (current === null) {\n        return '';\n      } // Safe because if current fiber exists, we are reconciling,\n      // and it is guaranteed to be the work-in-progress version.\n\n\n      return getStackByFiberInDevAndProd(current);\n    }\n  }\n\n  function resetCurrentFiber() {\n    {\n      ReactDebugCurrentFrame.getCurrentStack = null;\n      current = null;\n      isRendering = false;\n    }\n  }\n  function setCurrentFiber(fiber) {\n    {\n      ReactDebugCurrentFrame.getCurrentStack = fiber === null ? null : getCurrentFiberStackInDev;\n      current = fiber;\n      isRendering = false;\n    }\n  }\n  function getCurrentFiber() {\n    {\n      return current;\n    }\n  }\n  function setIsRendering(rendering) {\n    {\n      isRendering = rendering;\n    }\n  }\n\n  // Flow does not allow string concatenation of most non-string types. To work\n  // around this limitation, we use an opaque type that can only be obtained by\n  // passing the value through getToStringValue first.\n  function toString(value) {\n    // The coercion safety check is performed in getToStringValue().\n    // eslint-disable-next-line react-internal/safe-string-coercion\n    return '' + value;\n  }\n  function getToStringValue(value) {\n    switch (typeof value) {\n      case 'boolean':\n      case 'number':\n      case 'string':\n      case 'undefined':\n        return value;\n\n      case 'object':\n        {\n          checkFormFieldValueStringCoercion(value);\n        }\n\n        return value;\n\n      default:\n        // function, symbol are assigned as empty strings\n        return '';\n    }\n  }\n\n  var hasReadOnlyValue = {\n    button: true,\n    checkbox: true,\n    image: true,\n    hidden: true,\n    radio: true,\n    reset: true,\n    submit: true\n  };\n  function checkControlledValueProps(tagName, props) {\n    {\n      if (!(hasReadOnlyValue[props.type] || props.onChange || props.onInput || props.readOnly || props.disabled || props.value == null)) {\n        error('You provided a `value` prop to a form field without an ' + '`onChange` handler. This will render a read-only field. If ' + 'the field should be mutable use `defaultValue`. Otherwise, ' + 'set either `onChange` or `readOnly`.');\n      }\n\n      if (!(props.onChange || props.readOnly || props.disabled || props.checked == null)) {\n        error('You provided a `checked` prop to a form field without an ' + '`onChange` handler. This will render a read-only field. If ' + 'the field should be mutable use `defaultChecked`. Otherwise, ' + 'set either `onChange` or `readOnly`.');\n      }\n    }\n  }\n\n  function isCheckable(elem) {\n    var type = elem.type;\n    var nodeName = elem.nodeName;\n    return nodeName && nodeName.toLowerCase() === 'input' && (type === 'checkbox' || type === 'radio');\n  }\n\n  function getTracker(node) {\n    return node._valueTracker;\n  }\n\n  function detachTracker(node) {\n    node._valueTracker = null;\n  }\n\n  function getValueFromNode(node) {\n    var value = '';\n\n    if (!node) {\n      return value;\n    }\n\n    if (isCheckable(node)) {\n      value = node.checked ? 'true' : 'false';\n    } else {\n      value = node.value;\n    }\n\n    return value;\n  }\n\n  function trackValueOnNode(node) {\n    var valueField = isCheckable(node) ? 'checked' : 'value';\n    var descriptor = Object.getOwnPropertyDescriptor(node.constructor.prototype, valueField);\n\n    {\n      checkFormFieldValueStringCoercion(node[valueField]);\n    }\n\n    var currentValue = '' + node[valueField]; // if someone has already defined a value or Safari, then bail\n    // and don't track value will cause over reporting of changes,\n    // but it's better then a hard failure\n    // (needed for certain tests that spyOn input values and Safari)\n\n    if (node.hasOwnProperty(valueField) || typeof descriptor === 'undefined' || typeof descriptor.get !== 'function' || typeof descriptor.set !== 'function') {\n      return;\n    }\n\n    var get = descriptor.get,\n        set = descriptor.set;\n    Object.defineProperty(node, valueField, {\n      configurable: true,\n      get: function () {\n        return get.call(this);\n      },\n      set: function (value) {\n        {\n          checkFormFieldValueStringCoercion(value);\n        }\n\n        currentValue = '' + value;\n        set.call(this, value);\n      }\n    }); // We could've passed this the first time\n    // but it triggers a bug in IE11 and Edge 14/15.\n    // Calling defineProperty() again should be equivalent.\n    // https://github.com/facebook/react/issues/11768\n\n    Object.defineProperty(node, valueField, {\n      enumerable: descriptor.enumerable\n    });\n    var tracker = {\n      getValue: function () {\n        return currentValue;\n      },\n      setValue: function (value) {\n        {\n          checkFormFieldValueStringCoercion(value);\n        }\n\n        currentValue = '' + value;\n      },\n      stopTracking: function () {\n        detachTracker(node);\n        delete node[valueField];\n      }\n    };\n    return tracker;\n  }\n\n  function track(node) {\n    if (getTracker(node)) {\n      return;\n    } // TODO: Once it's just Fiber we can move this to node._wrapperState\n\n\n    node._valueTracker = trackValueOnNode(node);\n  }\n  function updateValueIfChanged(node) {\n    if (!node) {\n      return false;\n    }\n\n    var tracker = getTracker(node); // if there is no tracker at this point it's unlikely\n    // that trying again will succeed\n\n    if (!tracker) {\n      return true;\n    }\n\n    var lastValue = tracker.getValue();\n    var nextValue = getValueFromNode(node);\n\n    if (nextValue !== lastValue) {\n      tracker.setValue(nextValue);\n      return true;\n    }\n\n    return false;\n  }\n\n  function getActiveElement(doc) {\n    doc = doc || (typeof document !== 'undefined' ? document : undefined);\n\n    if (typeof doc === 'undefined') {\n      return null;\n    }\n\n    try {\n      return doc.activeElement || doc.body;\n    } catch (e) {\n      return doc.body;\n    }\n  }\n\n  var didWarnValueDefaultValue = false;\n  var didWarnCheckedDefaultChecked = false;\n  var didWarnControlledToUncontrolled = false;\n  var didWarnUncontrolledToControlled = false;\n\n  function isControlled(props) {\n    var usesChecked = props.type === 'checkbox' || props.type === 'radio';\n    return usesChecked ? props.checked != null : props.value != null;\n  }\n  /**\n   * Implements an <input> host component that allows setting these optional\n   * props: `checked`, `value`, `defaultChecked`, and `defaultValue`.\n   *\n   * If `checked` or `value` are not supplied (or null/undefined), user actions\n   * that affect the checked state or value will trigger updates to the element.\n   *\n   * If they are supplied (and not null/undefined), the rendered element will not\n   * trigger updates to the element. Instead, the props must change in order for\n   * the rendered element to be updated.\n   *\n   * The rendered element will be initialized as unchecked (or `defaultChecked`)\n   * with an empty value (or `defaultValue`).\n   *\n   * See http://www.w3.org/TR/2012/WD-html5-20121025/the-input-element.html\n   */\n\n\n  function getHostProps(element, props) {\n    var node = element;\n    var checked = props.checked;\n    var hostProps = assign({}, props, {\n      defaultChecked: undefined,\n      defaultValue: undefined,\n      value: undefined,\n      checked: checked != null ? checked : node._wrapperState.initialChecked\n    });\n    return hostProps;\n  }\n  function initWrapperState(element, props) {\n    {\n      checkControlledValueProps('input', props);\n\n      if (props.checked !== undefined && props.defaultChecked !== undefined && !didWarnCheckedDefaultChecked) {\n        error('%s contains an input of type %s with both checked and defaultChecked props. ' + 'Input elements must be either controlled or uncontrolled ' + '(specify either the checked prop, or the defaultChecked prop, but not ' + 'both). Decide between using a controlled or uncontrolled input ' + 'element and remove one of these props. More info: ' + 'https://reactjs.org/link/controlled-components', getCurrentFiberOwnerNameInDevOrNull() || 'A component', props.type);\n\n        didWarnCheckedDefaultChecked = true;\n      }\n\n      if (props.value !== undefined && props.defaultValue !== undefined && !didWarnValueDefaultValue) {\n        error('%s contains an input of type %s with both value and defaultValue props. ' + 'Input elements must be either controlled or uncontrolled ' + '(specify either the value prop, or the defaultValue prop, but not ' + 'both). Decide between using a controlled or uncontrolled input ' + 'element and remove one of these props. More info: ' + 'https://reactjs.org/link/controlled-components', getCurrentFiberOwnerNameInDevOrNull() || 'A component', props.type);\n\n        didWarnValueDefaultValue = true;\n      }\n    }\n\n    var node = element;\n    var defaultValue = props.defaultValue == null ? '' : props.defaultValue;\n    node._wrapperState = {\n      initialChecked: props.checked != null ? props.checked : props.defaultChecked,\n      initialValue: getToStringValue(props.value != null ? props.value : defaultValue),\n      controlled: isControlled(props)\n    };\n  }\n  function updateChecked(element, props) {\n    var node = element;\n    var checked = props.checked;\n\n    if (checked != null) {\n      setValueForProperty(node, 'checked', checked, false);\n    }\n  }\n  function updateWrapper(element, props) {\n    var node = element;\n\n    {\n      var controlled = isControlled(props);\n\n      if (!node._wrapperState.controlled && controlled && !didWarnUncontrolledToControlled) {\n        error('A component is changing an uncontrolled input to be controlled. ' + 'This is likely caused by the value changing from undefined to ' + 'a defined value, which should not happen. ' + 'Decide between using a controlled or uncontrolled input ' + 'element for the lifetime of the component. More info: https://reactjs.org/link/controlled-components');\n\n        didWarnUncontrolledToControlled = true;\n      }\n\n      if (node._wrapperState.controlled && !controlled && !didWarnControlledToUncontrolled) {\n        error('A component is changing a controlled input to be uncontrolled. ' + 'This is likely caused by the value changing from a defined to ' + 'undefined, which should not happen. ' + 'Decide between using a controlled or uncontrolled input ' + 'element for the lifetime of the component. More info: https://reactjs.org/link/controlled-components');\n\n        didWarnControlledToUncontrolled = true;\n      }\n    }\n\n    updateChecked(element, props);\n    var value = getToStringValue(props.value);\n    var type = props.type;\n\n    if (value != null) {\n      if (type === 'number') {\n        if (value === 0 && node.value === '' || // We explicitly want to coerce to number here if possible.\n        // eslint-disable-next-line\n        node.value != value) {\n          node.value = toString(value);\n        }\n      } else if (node.value !== toString(value)) {\n        node.value = toString(value);\n      }\n    } else if (type === 'submit' || type === 'reset') {\n      // Submit/reset inputs need the attribute removed completely to avoid\n      // blank-text buttons.\n      node.removeAttribute('value');\n      return;\n    }\n\n    {\n      // When syncing the value attribute, the value comes from a cascade of\n      // properties:\n      //  1. The value React property\n      //  2. The defaultValue React property\n      //  3. Otherwise there should be no change\n      if (props.hasOwnProperty('value')) {\n        setDefaultValue(node, props.type, value);\n      } else if (props.hasOwnProperty('defaultValue')) {\n        setDefaultValue(node, props.type, getToStringValue(props.defaultValue));\n      }\n    }\n\n    {\n      // When syncing the checked attribute, it only changes when it needs\n      // to be removed, such as transitioning from a checkbox into a text input\n      if (props.checked == null && props.defaultChecked != null) {\n        node.defaultChecked = !!props.defaultChecked;\n      }\n    }\n  }\n  function postMountWrapper(element, props, isHydrating) {\n    var node = element; // Do not assign value if it is already set. This prevents user text input\n    // from being lost during SSR hydration.\n\n    if (props.hasOwnProperty('value') || props.hasOwnProperty('defaultValue')) {\n      var type = props.type;\n      var isButton = type === 'submit' || type === 'reset'; // Avoid setting value attribute on submit/reset inputs as it overrides the\n      // default value provided by the browser. See: #12872\n\n      if (isButton && (props.value === undefined || props.value === null)) {\n        return;\n      }\n\n      var initialValue = toString(node._wrapperState.initialValue); // Do not assign value if it is already set. This prevents user text input\n      // from being lost during SSR hydration.\n\n      if (!isHydrating) {\n        {\n          // When syncing the value attribute, the value property should use\n          // the wrapperState._initialValue property. This uses:\n          //\n          //   1. The value React property when present\n          //   2. The defaultValue React property when present\n          //   3. An empty string\n          if (initialValue !== node.value) {\n            node.value = initialValue;\n          }\n        }\n      }\n\n      {\n        // Otherwise, the value attribute is synchronized to the property,\n        // so we assign defaultValue to the same thing as the value property\n        // assignment step above.\n        node.defaultValue = initialValue;\n      }\n    } // Normally, we'd just do `node.checked = node.checked` upon initial mount, less this bug\n    // this is needed to work around a chrome bug where setting defaultChecked\n    // will sometimes influence the value of checked (even after detachment).\n    // Reference: https://bugs.chromium.org/p/chromium/issues/detail?id=608416\n    // We need to temporarily unset name to avoid disrupting radio button groups.\n\n\n    var name = node.name;\n\n    if (name !== '') {\n      node.name = '';\n    }\n\n    {\n      // When syncing the checked attribute, both the checked property and\n      // attribute are assigned at the same time using defaultChecked. This uses:\n      //\n      //   1. The checked React property when present\n      //   2. The defaultChecked React property when present\n      //   3. Otherwise, false\n      node.defaultChecked = !node.defaultChecked;\n      node.defaultChecked = !!node._wrapperState.initialChecked;\n    }\n\n    if (name !== '') {\n      node.name = name;\n    }\n  }\n  function restoreControlledState(element, props) {\n    var node = element;\n    updateWrapper(node, props);\n    updateNamedCousins(node, props);\n  }\n\n  function updateNamedCousins(rootNode, props) {\n    var name = props.name;\n\n    if (props.type === 'radio' && name != null) {\n      var queryRoot = rootNode;\n\n      while (queryRoot.parentNode) {\n        queryRoot = queryRoot.parentNode;\n      } // If `rootNode.form` was non-null, then we could try `form.elements`,\n      // but that sometimes behaves strangely in IE8. We could also try using\n      // `form.getElementsByName`, but that will only return direct children\n      // and won't include inputs that use the HTML5 `form=` attribute. Since\n      // the input might not even be in a form. It might not even be in the\n      // document. Let's just use the local `querySelectorAll` to ensure we don't\n      // miss anything.\n\n\n      {\n        checkAttributeStringCoercion(name, 'name');\n      }\n\n      var group = queryRoot.querySelectorAll('input[name=' + JSON.stringify('' + name) + '][type=\"radio\"]');\n\n      for (var i = 0; i < group.length; i++) {\n        var otherNode = group[i];\n\n        if (otherNode === rootNode || otherNode.form !== rootNode.form) {\n          continue;\n        } // This will throw if radio buttons rendered by different copies of React\n        // and the same name are rendered into the same form (same as #1939).\n        // That's probably okay; we don't support it just as we don't support\n        // mixing React radio buttons with non-React ones.\n\n\n        var otherProps = getFiberCurrentPropsFromNode(otherNode);\n\n        if (!otherProps) {\n          throw new Error('ReactDOMInput: Mixing React and non-React radio inputs with the ' + 'same `name` is not supported.');\n        } // We need update the tracked value on the named cousin since the value\n        // was changed but the input saw no event or value set\n\n\n        updateValueIfChanged(otherNode); // If this is a controlled radio button group, forcing the input that\n        // was previously checked to update will cause it to be come re-checked\n        // as appropriate.\n\n        updateWrapper(otherNode, otherProps);\n      }\n    }\n  } // In Chrome, assigning defaultValue to certain input types triggers input validation.\n  // For number inputs, the display value loses trailing decimal points. For email inputs,\n  // Chrome raises \"The specified value <x> is not a valid email address\".\n  //\n  // Here we check to see if the defaultValue has actually changed, avoiding these problems\n  // when the user is inputting text\n  //\n  // https://github.com/facebook/react/issues/7253\n\n\n  function setDefaultValue(node, type, value) {\n    if ( // Focused number inputs synchronize on blur. See ChangeEventPlugin.js\n    type !== 'number' || getActiveElement(node.ownerDocument) !== node) {\n      if (value == null) {\n        node.defaultValue = toString(node._wrapperState.initialValue);\n      } else if (node.defaultValue !== toString(value)) {\n        node.defaultValue = toString(value);\n      }\n    }\n  }\n\n  var didWarnSelectedSetOnOption = false;\n  var didWarnInvalidChild = false;\n  var didWarnInvalidInnerHTML = false;\n  /**\n   * Implements an <option> host component that warns when `selected` is set.\n   */\n\n  function validateProps(element, props) {\n    {\n      // If a value is not provided, then the children must be simple.\n      if (props.value == null) {\n        if (typeof props.children === 'object' && props.children !== null) {\n          React.Children.forEach(props.children, function (child) {\n            if (child == null) {\n              return;\n            }\n\n            if (typeof child === 'string' || typeof child === 'number') {\n              return;\n            }\n\n            if (!didWarnInvalidChild) {\n              didWarnInvalidChild = true;\n\n              error('Cannot infer the option value of complex children. ' + 'Pass a `value` prop or use a plain string as children to <option>.');\n            }\n          });\n        } else if (props.dangerouslySetInnerHTML != null) {\n          if (!didWarnInvalidInnerHTML) {\n            didWarnInvalidInnerHTML = true;\n\n            error('Pass a `value` prop if you set dangerouslyInnerHTML so React knows ' + 'which value should be selected.');\n          }\n        }\n      } // TODO: Remove support for `selected` in <option>.\n\n\n      if (props.selected != null && !didWarnSelectedSetOnOption) {\n        error('Use the `defaultValue` or `value` props on <select> instead of ' + 'setting `selected` on <option>.');\n\n        didWarnSelectedSetOnOption = true;\n      }\n    }\n  }\n  function postMountWrapper$1(element, props) {\n    // value=\"\" should make a value attribute (#6219)\n    if (props.value != null) {\n      element.setAttribute('value', toString(getToStringValue(props.value)));\n    }\n  }\n\n  var isArrayImpl = Array.isArray; // eslint-disable-next-line no-redeclare\n\n  function isArray(a) {\n    return isArrayImpl(a);\n  }\n\n  var didWarnValueDefaultValue$1;\n\n  {\n    didWarnValueDefaultValue$1 = false;\n  }\n\n  function getDeclarationErrorAddendum() {\n    var ownerName = getCurrentFiberOwnerNameInDevOrNull();\n\n    if (ownerName) {\n      return '\\n\\nCheck the render method of `' + ownerName + '`.';\n    }\n\n    return '';\n  }\n\n  var valuePropNames = ['value', 'defaultValue'];\n  /**\n   * Validation function for `value` and `defaultValue`.\n   */\n\n  function checkSelectPropTypes(props) {\n    {\n      checkControlledValueProps('select', props);\n\n      for (var i = 0; i < valuePropNames.length; i++) {\n        var propName = valuePropNames[i];\n\n        if (props[propName] == null) {\n          continue;\n        }\n\n        var propNameIsArray = isArray(props[propName]);\n\n        if (props.multiple && !propNameIsArray) {\n          error('The `%s` prop supplied to <select> must be an array if ' + '`multiple` is true.%s', propName, getDeclarationErrorAddendum());\n        } else if (!props.multiple && propNameIsArray) {\n          error('The `%s` prop supplied to <select> must be a scalar ' + 'value if `multiple` is false.%s', propName, getDeclarationErrorAddendum());\n        }\n      }\n    }\n  }\n\n  function updateOptions(node, multiple, propValue, setDefaultSelected) {\n    var options = node.options;\n\n    if (multiple) {\n      var selectedValues = propValue;\n      var selectedValue = {};\n\n      for (var i = 0; i < selectedValues.length; i++) {\n        // Prefix to avoid chaos with special keys.\n        selectedValue['$' + selectedValues[i]] = true;\n      }\n\n      for (var _i = 0; _i < options.length; _i++) {\n        var selected = selectedValue.hasOwnProperty('$' + options[_i].value);\n\n        if (options[_i].selected !== selected) {\n          options[_i].selected = selected;\n        }\n\n        if (selected && setDefaultSelected) {\n          options[_i].defaultSelected = true;\n        }\n      }\n    } else {\n      // Do not set `select.value` as exact behavior isn't consistent across all\n      // browsers for all cases.\n      var _selectedValue = toString(getToStringValue(propValue));\n\n      var defaultSelected = null;\n\n      for (var _i2 = 0; _i2 < options.length; _i2++) {\n        if (options[_i2].value === _selectedValue) {\n          options[_i2].selected = true;\n\n          if (setDefaultSelected) {\n            options[_i2].defaultSelected = true;\n          }\n\n          return;\n        }\n\n        if (defaultSelected === null && !options[_i2].disabled) {\n          defaultSelected = options[_i2];\n        }\n      }\n\n      if (defaultSelected !== null) {\n        defaultSelected.selected = true;\n      }\n    }\n  }\n  /**\n   * Implements a <select> host component that allows optionally setting the\n   * props `value` and `defaultValue`. If `multiple` is false, the prop must be a\n   * stringable. If `multiple` is true, the prop must be an array of stringables.\n   *\n   * If `value` is not supplied (or null/undefined), user actions that change the\n   * selected option will trigger updates to the rendered options.\n   *\n   * If it is supplied (and not null/undefined), the rendered options will not\n   * update in response to user actions. Instead, the `value` prop must change in\n   * order for the rendered options to update.\n   *\n   * If `defaultValue` is provided, any options with the supplied values will be\n   * selected.\n   */\n\n\n  function getHostProps$1(element, props) {\n    return assign({}, props, {\n      value: undefined\n    });\n  }\n  function initWrapperState$1(element, props) {\n    var node = element;\n\n    {\n      checkSelectPropTypes(props);\n    }\n\n    node._wrapperState = {\n      wasMultiple: !!props.multiple\n    };\n\n    {\n      if (props.value !== undefined && props.defaultValue !== undefined && !didWarnValueDefaultValue$1) {\n        error('Select elements must be either controlled or uncontrolled ' + '(specify either the value prop, or the defaultValue prop, but not ' + 'both). Decide between using a controlled or uncontrolled select ' + 'element and remove one of these props. More info: ' + 'https://reactjs.org/link/controlled-components');\n\n        didWarnValueDefaultValue$1 = true;\n      }\n    }\n  }\n  function postMountWrapper$2(element, props) {\n    var node = element;\n    node.multiple = !!props.multiple;\n    var value = props.value;\n\n    if (value != null) {\n      updateOptions(node, !!props.multiple, value, false);\n    } else if (props.defaultValue != null) {\n      updateOptions(node, !!props.multiple, props.defaultValue, true);\n    }\n  }\n  function postUpdateWrapper(element, props) {\n    var node = element;\n    var wasMultiple = node._wrapperState.wasMultiple;\n    node._wrapperState.wasMultiple = !!props.multiple;\n    var value = props.value;\n\n    if (value != null) {\n      updateOptions(node, !!props.multiple, value, false);\n    } else if (wasMultiple !== !!props.multiple) {\n      // For simplicity, reapply `defaultValue` if `multiple` is toggled.\n      if (props.defaultValue != null) {\n        updateOptions(node, !!props.multiple, props.defaultValue, true);\n      } else {\n        // Revert the select back to its default unselected state.\n        updateOptions(node, !!props.multiple, props.multiple ? [] : '', false);\n      }\n    }\n  }\n  function restoreControlledState$1(element, props) {\n    var node = element;\n    var value = props.value;\n\n    if (value != null) {\n      updateOptions(node, !!props.multiple, value, false);\n    }\n  }\n\n  var didWarnValDefaultVal = false;\n\n  /**\n   * Implements a <textarea> host component that allows setting `value`, and\n   * `defaultValue`. This differs from the traditional DOM API because value is\n   * usually set as PCDATA children.\n   *\n   * If `value` is not supplied (or null/undefined), user actions that affect the\n   * value will trigger updates to the element.\n   *\n   * If `value` is supplied (and not null/undefined), the rendered element will\n   * not trigger updates to the element. Instead, the `value` prop must change in\n   * order for the rendered element to be updated.\n   *\n   * The rendered element will be initialized with an empty value, the prop\n   * `defaultValue` if specified, or the children content (deprecated).\n   */\n  function getHostProps$2(element, props) {\n    var node = element;\n\n    if (props.dangerouslySetInnerHTML != null) {\n      throw new Error('`dangerouslySetInnerHTML` does not make sense on <textarea>.');\n    } // Always set children to the same thing. In IE9, the selection range will\n    // get reset if `textContent` is mutated.  We could add a check in setTextContent\n    // to only set the value if/when the value differs from the node value (which would\n    // completely solve this IE9 bug), but Sebastian+Sophie seemed to like this\n    // solution. The value can be a boolean or object so that's why it's forced\n    // to be a string.\n\n\n    var hostProps = assign({}, props, {\n      value: undefined,\n      defaultValue: undefined,\n      children: toString(node._wrapperState.initialValue)\n    });\n\n    return hostProps;\n  }\n  function initWrapperState$2(element, props) {\n    var node = element;\n\n    {\n      checkControlledValueProps('textarea', props);\n\n      if (props.value !== undefined && props.defaultValue !== undefined && !didWarnValDefaultVal) {\n        error('%s contains a textarea with both value and defaultValue props. ' + 'Textarea elements must be either controlled or uncontrolled ' + '(specify either the value prop, or the defaultValue prop, but not ' + 'both). Decide between using a controlled or uncontrolled textarea ' + 'and remove one of these props. More info: ' + 'https://reactjs.org/link/controlled-components', getCurrentFiberOwnerNameInDevOrNull() || 'A component');\n\n        didWarnValDefaultVal = true;\n      }\n    }\n\n    var initialValue = props.value; // Only bother fetching default value if we're going to use it\n\n    if (initialValue == null) {\n      var children = props.children,\n          defaultValue = props.defaultValue;\n\n      if (children != null) {\n        {\n          error('Use the `defaultValue` or `value` props instead of setting ' + 'children on <textarea>.');\n        }\n\n        {\n          if (defaultValue != null) {\n            throw new Error('If you supply `defaultValue` on a <textarea>, do not pass children.');\n          }\n\n          if (isArray(children)) {\n            if (children.length > 1) {\n              throw new Error('<textarea> can only have at most one child.');\n            }\n\n            children = children[0];\n          }\n\n          defaultValue = children;\n        }\n      }\n\n      if (defaultValue == null) {\n        defaultValue = '';\n      }\n\n      initialValue = defaultValue;\n    }\n\n    node._wrapperState = {\n      initialValue: getToStringValue(initialValue)\n    };\n  }\n  function updateWrapper$1(element, props) {\n    var node = element;\n    var value = getToStringValue(props.value);\n    var defaultValue = getToStringValue(props.defaultValue);\n\n    if (value != null) {\n      // Cast `value` to a string to ensure the value is set correctly. While\n      // browsers typically do this as necessary, jsdom doesn't.\n      var newValue = toString(value); // To avoid side effects (such as losing text selection), only set value if changed\n\n      if (newValue !== node.value) {\n        node.value = newValue;\n      }\n\n      if (props.defaultValue == null && node.defaultValue !== newValue) {\n        node.defaultValue = newValue;\n      }\n    }\n\n    if (defaultValue != null) {\n      node.defaultValue = toString(defaultValue);\n    }\n  }\n  function postMountWrapper$3(element, props) {\n    var node = element; // This is in postMount because we need access to the DOM node, which is not\n    // available until after the component has mounted.\n\n    var textContent = node.textContent; // Only set node.value if textContent is equal to the expected\n    // initial value. In IE10/IE11 there is a bug where the placeholder attribute\n    // will populate textContent as well.\n    // https://developer.microsoft.com/microsoft-edge/platform/issues/101525/\n\n    if (textContent === node._wrapperState.initialValue) {\n      if (textContent !== '' && textContent !== null) {\n        node.value = textContent;\n      }\n    }\n  }\n  function restoreControlledState$2(element, props) {\n    // DOM component is still mounted; update\n    updateWrapper$1(element, props);\n  }\n\n  var HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';\n  var MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';\n  var SVG_NAMESPACE = 'http://www.w3.org/2000/svg'; // Assumes there is no parent namespace.\n\n  function getIntrinsicNamespace(type) {\n    switch (type) {\n      case 'svg':\n        return SVG_NAMESPACE;\n\n      case 'math':\n        return MATH_NAMESPACE;\n\n      default:\n        return HTML_NAMESPACE;\n    }\n  }\n  function getChildNamespace(parentNamespace, type) {\n    if (parentNamespace == null || parentNamespace === HTML_NAMESPACE) {\n      // No (or default) parent namespace: potential entry point.\n      return getIntrinsicNamespace(type);\n    }\n\n    if (parentNamespace === SVG_NAMESPACE && type === 'foreignObject') {\n      // We're leaving SVG.\n      return HTML_NAMESPACE;\n    } // By default, pass namespace below.\n\n\n    return parentNamespace;\n  }\n\n  /* globals MSApp */\n\n  /**\n   * Create a function which has 'unsafe' privileges (required by windows8 apps)\n   */\n  var createMicrosoftUnsafeLocalFunction = function (func) {\n    if (typeof MSApp !== 'undefined' && MSApp.execUnsafeLocalFunction) {\n      return function (arg0, arg1, arg2, arg3) {\n        MSApp.execUnsafeLocalFunction(function () {\n          return func(arg0, arg1, arg2, arg3);\n        });\n      };\n    } else {\n      return func;\n    }\n  };\n\n  var reusableSVGContainer;\n  /**\n   * Set the innerHTML property of a node\n   *\n   * @param {DOMElement} node\n   * @param {string} html\n   * @internal\n   */\n\n  var setInnerHTML = createMicrosoftUnsafeLocalFunction(function (node, html) {\n    if (node.namespaceURI === SVG_NAMESPACE) {\n\n      if (!('innerHTML' in node)) {\n        // IE does not have innerHTML for SVG nodes, so instead we inject the\n        // new markup in a temp node and then move the child nodes across into\n        // the target node\n        reusableSVGContainer = reusableSVGContainer || document.createElement('div');\n        reusableSVGContainer.innerHTML = '<svg>' + html.valueOf().toString() + '</svg>';\n        var svgNode = reusableSVGContainer.firstChild;\n\n        while (node.firstChild) {\n          node.removeChild(node.firstChild);\n        }\n\n        while (svgNode.firstChild) {\n          node.appendChild(svgNode.firstChild);\n        }\n\n        return;\n      }\n    }\n\n    node.innerHTML = html;\n  });\n\n  /**\n   * HTML nodeType values that represent the type of the node\n   */\n  var ELEMENT_NODE = 1;\n  var TEXT_NODE = 3;\n  var COMMENT_NODE = 8;\n  var DOCUMENT_NODE = 9;\n  var DOCUMENT_FRAGMENT_NODE = 11;\n\n  /**\n   * Set the textContent property of a node. For text updates, it's faster\n   * to set the `nodeValue` of the Text node directly instead of using\n   * `.textContent` which will remove the existing node and create a new one.\n   *\n   * @param {DOMElement} node\n   * @param {string} text\n   * @internal\n   */\n\n  var setTextContent = function (node, text) {\n    if (text) {\n      var firstChild = node.firstChild;\n\n      if (firstChild && firstChild === node.lastChild && firstChild.nodeType === TEXT_NODE) {\n        firstChild.nodeValue = text;\n        return;\n      }\n    }\n\n    node.textContent = text;\n  };\n\n  // List derived from Gecko source code:\n  // https://github.com/mozilla/gecko-dev/blob/4e638efc71/layout/style/test/property_database.js\n  var shorthandToLonghand = {\n    animation: ['animationDelay', 'animationDirection', 'animationDuration', 'animationFillMode', 'animationIterationCount', 'animationName', 'animationPlayState', 'animationTimingFunction'],\n    background: ['backgroundAttachment', 'backgroundClip', 'backgroundColor', 'backgroundImage', 'backgroundOrigin', 'backgroundPositionX', 'backgroundPositionY', 'backgroundRepeat', 'backgroundSize'],\n    backgroundPosition: ['backgroundPositionX', 'backgroundPositionY'],\n    border: ['borderBottomColor', 'borderBottomStyle', 'borderBottomWidth', 'borderImageOutset', 'borderImageRepeat', 'borderImageSlice', 'borderImageSource', 'borderImageWidth', 'borderLeftColor', 'borderLeftStyle', 'borderLeftWidth', 'borderRightColor', 'borderRightStyle', 'borderRightWidth', 'borderTopColor', 'borderTopStyle', 'borderTopWidth'],\n    borderBlockEnd: ['borderBlockEndColor', 'borderBlockEndStyle', 'borderBlockEndWidth'],\n    borderBlockStart: ['borderBlockStartColor', 'borderBlockStartStyle', 'borderBlockStartWidth'],\n    borderBottom: ['borderBottomColor', 'borderBottomStyle', 'borderBottomWidth'],\n    borderColor: ['borderBottomColor', 'borderLeftColor', 'borderRightColor', 'borderTopColor'],\n    borderImage: ['borderImageOutset', 'borderImageRepeat', 'borderImageSlice', 'borderImageSource', 'borderImageWidth'],\n    borderInlineEnd: ['borderInlineEndColor', 'borderInlineEndStyle', 'borderInlineEndWidth'],\n    borderInlineStart: ['borderInlineStartColor', 'borderInlineStartStyle', 'borderInlineStartWidth'],\n    borderLeft: ['borderLeftColor', 'borderLeftStyle', 'borderLeftWidth'],\n    borderRadius: ['borderBottomLeftRadius', 'borderBottomRightRadius', 'borderTopLeftRadius', 'borderTopRightRadius'],\n    borderRight: ['borderRightColor', 'borderRightStyle', 'borderRightWidth'],\n    borderStyle: ['borderBottomStyle', 'borderLeftStyle', 'borderRightStyle', 'borderTopStyle'],\n    borderTop: ['borderTopColor', 'borderTopStyle', 'borderTopWidth'],\n    borderWidth: ['borderBottomWidth', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth'],\n    columnRule: ['columnRuleColor', 'columnRuleStyle', 'columnRuleWidth'],\n    columns: ['columnCount', 'columnWidth'],\n    flex: ['flexBasis', 'flexGrow', 'flexShrink'],\n    flexFlow: ['flexDirection', 'flexWrap'],\n    font: ['fontFamily', 'fontFeatureSettings', 'fontKerning', 'fontLanguageOverride', 'fontSize', 'fontSizeAdjust', 'fontStretch', 'fontStyle', 'fontVariant', 'fontVariantAlternates', 'fontVariantCaps', 'fontVariantEastAsian', 'fontVariantLigatures', 'fontVariantNumeric', 'fontVariantPosition', 'fontWeight', 'lineHeight'],\n    fontVariant: ['fontVariantAlternates', 'fontVariantCaps', 'fontVariantEastAsian', 'fontVariantLigatures', 'fontVariantNumeric', 'fontVariantPosition'],\n    gap: ['columnGap', 'rowGap'],\n    grid: ['gridAutoColumns', 'gridAutoFlow', 'gridAutoRows', 'gridTemplateAreas', 'gridTemplateColumns', 'gridTemplateRows'],\n    gridArea: ['gridColumnEnd', 'gridColumnStart', 'gridRowEnd', 'gridRowStart'],";

let ROUNDS = 10;
for (let round = 0; round < ROUNDS; ++round) {
    let tree = parser.parse(longscript);
    mix(tree.length);
    let spans = 0;
    highlightTree(tree, classHighlighter, (from, to, cls) => {
        ++spans;
        if ((spans & 63) === 0) { mix(from); mix(cls); }
    });
    mix(spans);
    // Walk the syntax tree like folding/bracket matching do.
    let cursor = tree.cursor(), nodes = 0;
    do { ++nodes; } while (cursor.next());
    mix(nodes);
}
log("checksum " + __checksum);
