// build/dev/javascript/prelude.mjs
var CustomType = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label2) => label2 in fields ? fields[label2] : this[label2]
    );
    return new this.constructor(...properties);
  }
};
var List = class {
  static fromArray(array3, tail) {
    let t = tail || new Empty();
    for (let i = array3.length - 1; i >= 0; --i) {
      t = new NonEmpty(array3[i], t);
    }
    return t;
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  // @internal
  atLeastLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return current !== void 0;
  }
  // @internal
  hasLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return desired === -1 && current instanceof Empty;
  }
  // @internal
  countLength() {
    let current = this;
    let length4 = 0;
    while (current) {
      current = current.tail;
      length4++;
    }
    return length4 - 1;
  }
};
function prepend(element4, tail) {
  return new NonEmpty(element4, tail);
}
function toList(elements, tail) {
  return List.fromArray(elements, tail);
}
var ListIterator = class {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
};
var Empty = class extends List {
};
var NonEmpty = class extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
};
var BitArray = class {
  /**
   * The size in bits of this bit array's data.
   *
   * @type {number}
   */
  bitSize;
  /**
   * The size in bytes of this bit array's data. If this bit array doesn't store
   * a whole number of bytes then this value is rounded up.
   *
   * @type {number}
   */
  byteSize;
  /**
   * The number of unused high bits in the first byte of this bit array's
   * buffer prior to the start of its data. The value of any unused high bits is
   * undefined.
   *
   * The bit offset will be in the range 0-7.
   *
   * @type {number}
   */
  bitOffset;
  /**
   * The raw bytes that hold this bit array's data.
   *
   * If `bitOffset` is not zero then there are unused high bits in the first
   * byte of this buffer.
   *
   * If `bitOffset + bitSize` is not a multiple of 8 then there are unused low
   * bits in the last byte of this buffer.
   *
   * @type {Uint8Array}
   */
  rawBuffer;
  /**
   * Constructs a new bit array from a `Uint8Array`, an optional size in
   * bits, and an optional bit offset.
   *
   * If no bit size is specified it is taken as `buffer.length * 8`, i.e. all
   * bytes in the buffer make up the new bit array's data.
   *
   * If no bit offset is specified it defaults to zero, i.e. there are no unused
   * high bits in the first byte of the buffer.
   *
   * @param {Uint8Array} buffer
   * @param {number} [bitSize]
   * @param {number} [bitOffset]
   */
  constructor(buffer, bitSize, bitOffset) {
    if (!(buffer instanceof Uint8Array)) {
      throw globalThis.Error(
        "BitArray can only be constructed from a Uint8Array"
      );
    }
    this.bitSize = bitSize ?? buffer.length * 8;
    this.byteSize = Math.trunc((this.bitSize + 7) / 8);
    this.bitOffset = bitOffset ?? 0;
    if (this.bitSize < 0) {
      throw globalThis.Error(`BitArray bit size is invalid: ${this.bitSize}`);
    }
    if (this.bitOffset < 0 || this.bitOffset > 7) {
      throw globalThis.Error(
        `BitArray bit offset is invalid: ${this.bitOffset}`
      );
    }
    if (buffer.length !== Math.trunc((this.bitOffset + this.bitSize + 7) / 8)) {
      throw globalThis.Error("BitArray buffer length is invalid");
    }
    this.rawBuffer = buffer;
  }
  /**
   * Returns a specific byte in this bit array. If the byte index is out of
   * range then `undefined` is returned.
   *
   * When returning the final byte of a bit array with a bit size that's not a
   * multiple of 8, the content of the unused low bits are undefined.
   *
   * @param {number} index
   * @returns {number | undefined}
   */
  byteAt(index5) {
    if (index5 < 0 || index5 >= this.byteSize) {
      return void 0;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index5);
  }
  /** @internal */
  equals(other) {
    if (this.bitSize !== other.bitSize) {
      return false;
    }
    const wholeByteCount = Math.trunc(this.bitSize / 8);
    if (this.bitOffset === 0 && other.bitOffset === 0) {
      for (let i = 0; i < wholeByteCount; i++) {
        if (this.rawBuffer[i] !== other.rawBuffer[i]) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (this.rawBuffer[wholeByteCount] >> unusedLowBitCount !== other.rawBuffer[wholeByteCount] >> unusedLowBitCount) {
          return false;
        }
      }
    } else {
      for (let i = 0; i < wholeByteCount; i++) {
        const a = bitArrayByteAt(this.rawBuffer, this.bitOffset, i);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, i);
        if (a !== b) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const a = bitArrayByteAt(
          this.rawBuffer,
          this.bitOffset,
          wholeByteCount
        );
        const b = bitArrayByteAt(
          other.rawBuffer,
          other.bitOffset,
          wholeByteCount
        );
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (a >> unusedLowBitCount !== b >> unusedLowBitCount) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Returns this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.byteAt()` or `BitArray.rawBuffer` instead.
   *
   * @returns {Uint8Array}
   */
  get buffer() {
    bitArrayPrintDeprecationWarning(
      "buffer",
      "Use BitArray.byteAt() or BitArray.rawBuffer instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.buffer does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer;
  }
  /**
   * Returns the length in bytes of this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.bitSize` or `BitArray.byteSize` instead.
   *
   * @returns {number}
   */
  get length() {
    bitArrayPrintDeprecationWarning(
      "length",
      "Use BitArray.bitSize or BitArray.byteSize instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.length does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer.length;
  }
};
function bitArrayByteAt(buffer, bitOffset, index5) {
  if (bitOffset === 0) {
    return buffer[index5] ?? 0;
  } else {
    const a = buffer[index5] << bitOffset & 255;
    const b = buffer[index5 + 1] >> 8 - bitOffset;
    return a | b;
  }
}
var isBitArrayDeprecationMessagePrinted = {};
function bitArrayPrintDeprecationWarning(name, message2) {
  if (isBitArrayDeprecationMessagePrinted[name]) {
    return;
  }
  console.warn(
    `Deprecated BitArray.${name} property used in JavaScript FFI code. ${message2}.`
  );
  isBitArrayDeprecationMessagePrinted[name] = true;
}
var Result = class _Result extends CustomType {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok = class extends Result {
  constructor(value2) {
    super();
    this[0] = value2;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error = class extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};
function isEqual(x, y) {
  let values3 = [x, y];
  while (values3.length) {
    let a = values3.pop();
    let b = values3.pop();
    if (a === b) continue;
    if (!isObject(a) || !isObject(b)) return false;
    let unequal = !structurallyCompatibleObjects(a, b) || unequalDates(a, b) || unequalBuffers(a, b) || unequalArrays(a, b) || unequalMaps(a, b) || unequalSets(a, b) || unequalRegExps(a, b);
    if (unequal) return false;
    const proto = Object.getPrototypeOf(a);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a.equals(b)) continue;
        else return false;
      } catch {
      }
    }
    let [keys2, get3] = getters(a);
    const ka = keys2(a);
    const kb = keys2(b);
    if (ka.length !== kb.length) return false;
    for (let k of ka) {
      values3.push(get3(a, k), get3(b, k));
    }
  }
  return true;
}
function getters(object4) {
  if (object4 instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object4 instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a, b) {
  return a instanceof Date && (a > b || a < b);
}
function unequalBuffers(a, b) {
  return !(a instanceof BitArray) && a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT && !(a.byteLength === b.byteLength && a.every((n, i) => n === b[i]));
}
function unequalArrays(a, b) {
  return Array.isArray(a) && a.length !== b.length;
}
function unequalMaps(a, b) {
  return a instanceof Map && a.size !== b.size;
}
function unequalSets(a, b) {
  return a instanceof Set && (a.size != b.size || [...a].some((e) => !b.has(e)));
}
function unequalRegExps(a, b) {
  return a instanceof RegExp && (a.source !== b.source || a.flags !== b.flags);
}
function isObject(a) {
  return typeof a === "object" && a !== null;
}
function structurallyCompatibleObjects(a, b) {
  if (typeof a !== "object" && typeof b !== "object" && (!a || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a instanceof c)) return false;
  return a.constructor === b.constructor;
}
function makeError(variant, file, module, line, fn, message2, extra) {
  let error = new globalThis.Error(message2);
  error.gleam_error = variant;
  error.file = file;
  error.module = module;
  error.line = line;
  error.function = fn;
  error.fn = fn;
  for (let k in extra) error[k] = extra[k];
  return error;
}

// build/dev/javascript/gleam_stdlib/gleam/order.mjs
var Lt = class extends CustomType {
};
var Eq = class extends CustomType {
};
var Gt = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
var Some = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var None = class extends CustomType {
};
function is_none(option2) {
  return isEqual(option2, new None());
}
function to_result(option2, e) {
  if (option2 instanceof Some) {
    let a = option2[0];
    return new Ok(a);
  } else {
    return new Error(e);
  }
}
function unwrap(option2, default$) {
  if (option2 instanceof Some) {
    let x = option2[0];
    return x;
  } else {
    return default$;
  }
}

// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap();
var tempDataView = /* @__PURE__ */ new DataView(
  /* @__PURE__ */ new ArrayBuffer(8)
);
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== void 0) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a, b) {
  return a ^ b + 2654435769 + (a << 6) + (a >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code = o.hashCode(o);
      if (typeof code === "number") {
        return code;
      }
    } catch {
    }
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0; i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys2 = Object.keys(o);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null) return 1108378658;
  if (u === void 0) return 1108378659;
  if (u === true) return 1108378657;
  if (u === false) return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}
var SHIFT = 5;
var BUCKET_SIZE = Math.pow(2, SHIFT);
var MASK = BUCKET_SIZE - 1;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;
var ENTRY = 0;
var ARRAY_NODE = 1;
var INDEX_NODE = 2;
var COLLISION_NODE = 3;
var EMPTY = {
  type: INDEX_NODE,
  bitmap: 0,
  array: []
};
function mask(hash, shift) {
  return hash >>> shift & MASK;
}
function bitpos(hash, shift) {
  return 1 << mask(hash, shift);
}
function bitcount(x) {
  x -= x >> 1 & 1431655765;
  x = (x & 858993459) + (x >> 2 & 858993459);
  x = x + (x >> 4) & 252645135;
  x += x >> 8;
  x += x >> 16;
  return x & 127;
}
function index(bitmap, bit) {
  return bitcount(bitmap & bit - 1);
}
function cloneAndSet(arr, at, val) {
  const len = arr.length;
  const out = new Array(len);
  for (let i = 0; i < len; ++i) {
    out[i] = arr[i];
  }
  out[at] = val;
  return out;
}
function spliceIn(arr, at, val) {
  const len = arr.length;
  const out = new Array(len + 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  out[g++] = val;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function spliceOut(arr, at) {
  const len = arr.length;
  const out = new Array(len - 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  ++i;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function createNode(shift, key1, val1, key2hash, key2, val2) {
  const key1hash = getHash(key1);
  if (key1hash === key2hash) {
    return {
      type: COLLISION_NODE,
      hash: key1hash,
      array: [
        { type: ENTRY, k: key1, v: val1 },
        { type: ENTRY, k: key2, v: val2 }
      ]
    };
  }
  const addedLeaf = { val: false };
  return assoc(
    assocIndex(EMPTY, shift, key1hash, key1, val1, addedLeaf),
    shift,
    key2hash,
    key2,
    val2,
    addedLeaf
  );
}
function assoc(root3, shift, hash, key, val, addedLeaf) {
  switch (root3.type) {
    case ARRAY_NODE:
      return assocArray(root3, shift, hash, key, val, addedLeaf);
    case INDEX_NODE:
      return assocIndex(root3, shift, hash, key, val, addedLeaf);
    case COLLISION_NODE:
      return assocCollision(root3, shift, hash, key, val, addedLeaf);
  }
}
function assocArray(root3, shift, hash, key, val, addedLeaf) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size + 1,
      array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
    };
  }
  if (node.type === ENTRY) {
    if (isEqual(key, node.k)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: ARRAY_NODE,
        size: root3.size,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, node.k, node.v, hash, key, val)
      )
    };
  }
  const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
  if (n === node) {
    return root3;
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function assocIndex(root3, shift, hash, key, val, addedLeaf) {
  const bit = bitpos(hash, shift);
  const idx = index(root3.bitmap, bit);
  if ((root3.bitmap & bit) !== 0) {
    const node = root3.array[idx];
    if (node.type !== ENTRY) {
      const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
      if (n === node) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    const nodeKey = node.k;
    if (isEqual(key, nodeKey)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, nodeKey, node.v, hash, key, val)
      )
    };
  } else {
    const n = root3.array.length;
    if (n >= MAX_INDEX_NODE) {
      const nodes = new Array(32);
      const jdx = mask(hash, shift);
      nodes[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key, val, addedLeaf);
      let j = 0;
      let bitmap = root3.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node = root3.array[j++];
          nodes[i] = node;
        }
        bitmap = bitmap >>> 1;
      }
      return {
        type: ARRAY_NODE,
        size: n + 1,
        array: nodes
      };
    } else {
      const newArray = spliceIn(root3.array, idx, {
        type: ENTRY,
        k: key,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap | bit,
        array: newArray
      };
    }
  }
}
function assocCollision(root3, shift, hash, key, val, addedLeaf) {
  if (hash === root3.hash) {
    const idx = collisionIndexOf(root3, key);
    if (idx !== -1) {
      const entry = root3.array[idx];
      if (entry.v === val) {
        return root3;
      }
      return {
        type: COLLISION_NODE,
        hash,
        array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
      };
    }
    const size2 = root3.array.length;
    addedLeaf.val = true;
    return {
      type: COLLISION_NODE,
      hash,
      array: cloneAndSet(root3.array, size2, { type: ENTRY, k: key, v: val })
    };
  }
  return assoc(
    {
      type: INDEX_NODE,
      bitmap: bitpos(root3.hash, shift),
      array: [root3]
    },
    shift,
    hash,
    key,
    val,
    addedLeaf
  );
}
function collisionIndexOf(root3, key) {
  const size2 = root3.array.length;
  for (let i = 0; i < size2; i++) {
    if (isEqual(key, root3.array[i].k)) {
      return i;
    }
  }
  return -1;
}
function find(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return findArray(root3, shift, hash, key);
    case INDEX_NODE:
      return findIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return findCollision(root3, key);
  }
}
function findArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return void 0;
  }
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return void 0;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return void 0;
  }
  return root3.array[idx];
}
function without(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return withoutArray(root3, shift, hash, key);
    case INDEX_NODE:
      return withoutIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return withoutCollision(root3, key);
  }
}
function withoutArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return root3;
  }
  let n = void 0;
  if (node.type === ENTRY) {
    if (!isEqual(node.k, key)) {
      return root3;
    }
  } else {
    n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
  }
  if (n === void 0) {
    if (root3.size <= MIN_ARRAY_NODE) {
      const arr = root3.array;
      const out = new Array(root3.size - 1);
      let i = 0;
      let j = 0;
      let bitmap = 0;
      while (i < idx) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      ++i;
      while (i < arr.length) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      return {
        type: INDEX_NODE,
        bitmap,
        array: out
      };
    }
    return {
      type: ARRAY_NODE,
      size: root3.size - 1,
      array: cloneAndSet(root3.array, idx, n)
    };
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function withoutIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return root3;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    const n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
    if (n !== void 0) {
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  if (isEqual(key, node.k)) {
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  return root3;
}
function withoutCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return root3;
  }
  if (root3.array.length === 1) {
    return void 0;
  }
  return {
    type: COLLISION_NODE,
    hash: root3.hash,
    array: spliceOut(root3.array, idx)
  };
}
function forEach(root3, fn) {
  if (root3 === void 0) {
    return;
  }
  const items = root3.array;
  const size2 = items.length;
  for (let i = 0; i < size2; i++) {
    const item = items[i];
    if (item === void 0) {
      continue;
    }
    if (item.type === ENTRY) {
      fn(item.v, item.k);
      continue;
    }
    forEach(item, fn);
  }
}
var Dict = class _Dict {
  /**
   * @template V
   * @param {Record<string,V>} o
   * @returns {Dict<string,V>}
   */
  static fromObject(o) {
    const keys2 = Object.keys(o);
    let m = _Dict.new();
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      m = m.set(k, o[k]);
    }
    return m;
  }
  /**
   * @template K,V
   * @param {Map<K,V>} o
   * @returns {Dict<K,V>}
   */
  static fromMap(o) {
    let m = _Dict.new();
    o.forEach((v, k) => {
      m = m.set(k, v);
    });
    return m;
  }
  static new() {
    return new _Dict(void 0, 0);
  }
  /**
   * @param {undefined | Node<K,V>} root
   * @param {number} size
   */
  constructor(root3, size2) {
    this.root = root3;
    this.size = size2;
  }
  /**
   * @template NotFound
   * @param {K} key
   * @param {NotFound} notFound
   * @returns {NotFound | V}
   */
  get(key, notFound) {
    if (this.root === void 0) {
      return notFound;
    }
    const found = find(this.root, 0, getHash(key), key);
    if (found === void 0) {
      return notFound;
    }
    return found.v;
  }
  /**
   * @param {K} key
   * @param {V} val
   * @returns {Dict<K,V>}
   */
  set(key, val) {
    const addedLeaf = { val: false };
    const root3 = this.root === void 0 ? EMPTY : this.root;
    const newRoot = assoc(root3, 0, getHash(key), key, val, addedLeaf);
    if (newRoot === this.root) {
      return this;
    }
    return new _Dict(newRoot, addedLeaf.val ? this.size + 1 : this.size);
  }
  /**
   * @param {K} key
   * @returns {Dict<K,V>}
   */
  delete(key) {
    if (this.root === void 0) {
      return this;
    }
    const newRoot = without(this.root, 0, getHash(key), key);
    if (newRoot === this.root) {
      return this;
    }
    if (newRoot === void 0) {
      return _Dict.new();
    }
    return new _Dict(newRoot, this.size - 1);
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    if (this.root === void 0) {
      return false;
    }
    return find(this.root, 0, getHash(key), key) !== void 0;
  }
  /**
   * @returns {[K,V][]}
   */
  entries() {
    if (this.root === void 0) {
      return [];
    }
    const result = [];
    this.forEach((v, k) => result.push([k, v]));
    return result;
  }
  /**
   *
   * @param {(val:V,key:K)=>void} fn
   */
  forEach(fn) {
    forEach(this.root, fn);
  }
  hashCode() {
    let h = 0;
    this.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
    return h;
  }
  /**
   * @param {unknown} o
   * @returns {boolean}
   */
  equals(o) {
    if (!(o instanceof _Dict) || this.size !== o.size) {
      return false;
    }
    try {
      this.forEach((v, k) => {
        if (!isEqual(o.get(k, !v), v)) {
          throw unequalDictSymbol;
        }
      });
      return true;
    } catch (e) {
      if (e === unequalDictSymbol) {
        return false;
      }
      throw e;
    }
  }
};
var unequalDictSymbol = /* @__PURE__ */ Symbol();

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
var Ascending = class extends CustomType {
};
var Descending = class extends CustomType {
};
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix instanceof Empty) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function reverse(list4) {
  return reverse_and_prepend(list4, toList([]));
}
function filter_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4 instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let _block;
      let $ = fun(first$1);
      if ($) {
        _block = prepend(first$1, acc);
      } else {
        _block = acc;
      }
      let new_acc = _block;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter(list4, predicate) {
  return filter_loop(list4, predicate, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4 instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map(list4, fun) {
  return map_loop(list4, fun, toList([]));
}
function take_loop(loop$list, loop$n, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let n = loop$n;
    let acc = loop$acc;
    let $ = n <= 0;
    if ($) {
      return reverse(acc);
    } else {
      if (list4 instanceof Empty) {
        return reverse(acc);
      } else {
        let first$1 = list4.head;
        let rest$1 = list4.tail;
        loop$list = rest$1;
        loop$n = n - 1;
        loop$acc = prepend(first$1, acc);
      }
    }
  }
}
function take(list4, n) {
  return take_loop(list4, n, toList([]));
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first = loop$first;
    let second2 = loop$second;
    if (first instanceof Empty) {
      return second2;
    } else {
      let first$1 = first.head;
      let rest$1 = first.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second2);
    }
  }
}
function append(first, second2) {
  return append_loop(reverse(first), second2);
}
function prepend2(list4, item) {
  return prepend(item, list4);
}
function fold(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list4 instanceof Empty) {
      return initial;
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function find2(loop$list, loop$is_desired) {
  while (true) {
    let list4 = loop$list;
    let is_desired = loop$is_desired;
    if (list4 instanceof Empty) {
      return new Error(void 0);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = is_desired(first$1);
      if ($) {
        return new Ok(first$1);
      } else {
        loop$list = rest$1;
        loop$is_desired = is_desired;
      }
    }
  }
}
function find_map(loop$list, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    if (list4 instanceof Empty) {
      return new Error(void 0);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = fun(first$1);
      if ($ instanceof Ok) {
        return $;
      } else {
        loop$list = rest$1;
        loop$fun = fun;
      }
    }
  }
}
function sequences(loop$list, loop$compare, loop$growing, loop$direction, loop$prev, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let compare5 = loop$compare;
    let growing = loop$growing;
    let direction = loop$direction;
    let prev = loop$prev;
    let acc = loop$acc;
    let growing$1 = prepend(prev, growing);
    if (list4 instanceof Empty) {
      if (direction instanceof Ascending) {
        return prepend(reverse(growing$1), acc);
      } else {
        return prepend(growing$1, acc);
      }
    } else {
      let new$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = compare5(prev, new$1);
      if (direction instanceof Ascending) {
        if ($ instanceof Lt) {
          loop$list = rest$1;
          loop$compare = compare5;
          loop$growing = growing$1;
          loop$direction = direction;
          loop$prev = new$1;
          loop$acc = acc;
        } else if ($ instanceof Eq) {
          loop$list = rest$1;
          loop$compare = compare5;
          loop$growing = growing$1;
          loop$direction = direction;
          loop$prev = new$1;
          loop$acc = acc;
        } else {
          let _block;
          if (direction instanceof Ascending) {
            _block = prepend(reverse(growing$1), acc);
          } else {
            _block = prepend(growing$1, acc);
          }
          let acc$1 = _block;
          if (rest$1 instanceof Empty) {
            return prepend(toList([new$1]), acc$1);
          } else {
            let next = rest$1.head;
            let rest$2 = rest$1.tail;
            let _block$1;
            let $1 = compare5(new$1, next);
            if ($1 instanceof Lt) {
              _block$1 = new Ascending();
            } else if ($1 instanceof Eq) {
              _block$1 = new Ascending();
            } else {
              _block$1 = new Descending();
            }
            let direction$1 = _block$1;
            loop$list = rest$2;
            loop$compare = compare5;
            loop$growing = toList([new$1]);
            loop$direction = direction$1;
            loop$prev = next;
            loop$acc = acc$1;
          }
        }
      } else if ($ instanceof Lt) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1 instanceof Empty) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare5(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare5;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else if ($ instanceof Eq) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1 instanceof Empty) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare5(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare5;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else {
        loop$list = rest$1;
        loop$compare = compare5;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      }
    }
  }
}
function merge_ascendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (list1 instanceof Empty) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22 instanceof Empty) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare5(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      } else {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      }
    }
  }
}
function merge_ascending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (sequences2 instanceof Empty) {
      return reverse(acc);
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(prepend(reverse(sequence), acc));
      } else {
        let ascending1 = sequences2.head;
        let ascending2 = $.head;
        let rest$1 = $.tail;
        let descending = merge_ascendings(
          ascending1,
          ascending2,
          compare5,
          toList([])
        );
        loop$sequences = rest$1;
        loop$compare = compare5;
        loop$acc = prepend(descending, acc);
      }
    }
  }
}
function merge_descendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (list1 instanceof Empty) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22 instanceof Empty) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare5(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      } else {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      }
    }
  }
}
function merge_descending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (sequences2 instanceof Empty) {
      return reverse(acc);
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(prepend(reverse(sequence), acc));
      } else {
        let descending1 = sequences2.head;
        let descending2 = $.head;
        let rest$1 = $.tail;
        let ascending = merge_descendings(
          descending1,
          descending2,
          compare5,
          toList([])
        );
        loop$sequences = rest$1;
        loop$compare = compare5;
        loop$acc = prepend(ascending, acc);
      }
    }
  }
}
function merge_all(loop$sequences, loop$direction, loop$compare) {
  while (true) {
    let sequences2 = loop$sequences;
    let direction = loop$direction;
    let compare5 = loop$compare;
    if (sequences2 instanceof Empty) {
      return sequences2;
    } else if (direction instanceof Ascending) {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return sequence;
      } else {
        let sequences$1 = merge_ascending_pairs(sequences2, compare5, toList([]));
        loop$sequences = sequences$1;
        loop$direction = new Descending();
        loop$compare = compare5;
      }
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(sequence);
      } else {
        let sequences$1 = merge_descending_pairs(sequences2, compare5, toList([]));
        loop$sequences = sequences$1;
        loop$direction = new Ascending();
        loop$compare = compare5;
      }
    }
  }
}
function sort(list4, compare5) {
  if (list4 instanceof Empty) {
    return list4;
  } else {
    let $ = list4.tail;
    if ($ instanceof Empty) {
      return list4;
    } else {
      let x = list4.head;
      let y = $.head;
      let rest$1 = $.tail;
      let _block;
      let $1 = compare5(x, y);
      if ($1 instanceof Lt) {
        _block = new Ascending();
      } else if ($1 instanceof Eq) {
        _block = new Ascending();
      } else {
        _block = new Descending();
      }
      let direction = _block;
      let sequences$1 = sequences(
        rest$1,
        compare5,
        toList([x]),
        direction,
        y,
        toList([])
      );
      return merge_all(sequences$1, new Ascending(), compare5);
    }
  }
}
function key_find(keyword_list, desired_key) {
  return find_map(
    keyword_list,
    (keyword) => {
      let key;
      let value2;
      key = keyword[0];
      value2 = keyword[1];
      let $ = isEqual(key, desired_key);
      if ($) {
        return new Ok(value2);
      } else {
        return new Error(void 0);
      }
    }
  );
}
function key_set_loop(loop$list, loop$key, loop$value, loop$inspected) {
  while (true) {
    let list4 = loop$list;
    let key = loop$key;
    let value2 = loop$value;
    let inspected = loop$inspected;
    if (list4 instanceof Empty) {
      return reverse(prepend([key, value2], inspected));
    } else {
      let k = list4.head[0];
      if (isEqual(k, key)) {
        let rest$1 = list4.tail;
        return reverse_and_prepend(inspected, prepend([k, value2], rest$1));
      } else {
        let first$1 = list4.head;
        let rest$1 = list4.tail;
        loop$list = rest$1;
        loop$key = key;
        loop$value = value2;
        loop$inspected = prepend(first$1, inspected);
      }
    }
  }
}
function key_set(list4, key, value2) {
  return key_set_loop(list4, key, value2, toList([]));
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic/decode.mjs
var DecodeError = class extends CustomType {
  constructor(expected, found, path2) {
    super();
    this.expected = expected;
    this.found = found;
    this.path = path2;
  }
};
var Decoder = class extends CustomType {
  constructor(function$) {
    super();
    this.function = function$;
  }
};
function run(data, decoder) {
  let $ = decoder.function(data);
  let maybe_invalid_data;
  let errors;
  maybe_invalid_data = $[0];
  errors = $[1];
  if (errors instanceof Empty) {
    return new Ok(maybe_invalid_data);
  } else {
    return new Error(errors);
  }
}
function success(data) {
  return new Decoder((_) => {
    return [data, toList([])];
  });
}
function map2(decoder, transformer) {
  return new Decoder(
    (d) => {
      let $ = decoder.function(d);
      let data;
      let errors;
      data = $[0];
      errors = $[1];
      return [transformer(data), errors];
    }
  );
}
function run_decoders(loop$data, loop$failure, loop$decoders) {
  while (true) {
    let data = loop$data;
    let failure2 = loop$failure;
    let decoders = loop$decoders;
    if (decoders instanceof Empty) {
      return failure2;
    } else {
      let decoder = decoders.head;
      let decoders$1 = decoders.tail;
      let $ = decoder.function(data);
      let layer;
      let errors;
      layer = $;
      errors = $[1];
      if (errors instanceof Empty) {
        return layer;
      } else {
        loop$data = data;
        loop$failure = failure2;
        loop$decoders = decoders$1;
      }
    }
  }
}
function one_of(first, alternatives) {
  return new Decoder(
    (dynamic_data) => {
      let $ = first.function(dynamic_data);
      let layer;
      let errors;
      layer = $;
      errors = $[1];
      if (errors instanceof Empty) {
        return layer;
      } else {
        return run_decoders(dynamic_data, layer, alternatives);
      }
    }
  );
}
function optional(inner) {
  return new Decoder(
    (data) => {
      let $ = is_null(data);
      if ($) {
        return [new None(), toList([])];
      } else {
        let $1 = inner.function(data);
        let data$1;
        let errors;
        data$1 = $1[0];
        errors = $1[1];
        return [new Some(data$1), errors];
      }
    }
  );
}
function run_dynamic_function(data, name, f) {
  let $ = f(data);
  if ($ instanceof Ok) {
    let data$1 = $[0];
    return [data$1, toList([])];
  } else {
    let zero = $[0];
    return [
      zero,
      toList([new DecodeError(name, classify_dynamic(data), toList([]))])
    ];
  }
}
function decode_int(data) {
  return run_dynamic_function(data, "Int", int);
}
function decode_float(data) {
  return run_dynamic_function(data, "Float", float);
}
var int2 = /* @__PURE__ */ new Decoder(decode_int);
var float2 = /* @__PURE__ */ new Decoder(decode_float);
function decode_string(data) {
  return run_dynamic_function(data, "String", string);
}
var string2 = /* @__PURE__ */ new Decoder(decode_string);
function list2(inner) {
  return new Decoder(
    (data) => {
      return list(
        data,
        inner.function,
        (p2, k) => {
          return push_path(p2, toList([k]));
        },
        0,
        toList([])
      );
    }
  );
}
function push_path(layer, path2) {
  let decoder = one_of(
    string2,
    toList([
      (() => {
        let _pipe = int2;
        return map2(_pipe, to_string);
      })()
    ])
  );
  let path$1 = map(
    path2,
    (key) => {
      let key$1 = identity(key);
      let $ = run(key$1, decoder);
      if ($ instanceof Ok) {
        let key$2 = $[0];
        return key$2;
      } else {
        return "<" + classify_dynamic(key$1) + ">";
      }
    }
  );
  let errors = map(
    layer[1],
    (error) => {
      return new DecodeError(
        error.expected,
        error.found,
        append(path$1, error.path)
      );
    }
  );
  return [layer[0], errors];
}
function index3(loop$path, loop$position, loop$inner, loop$data, loop$handle_miss) {
  while (true) {
    let path2 = loop$path;
    let position = loop$position;
    let inner = loop$inner;
    let data = loop$data;
    let handle_miss = loop$handle_miss;
    if (path2 instanceof Empty) {
      let _pipe = inner(data);
      return push_path(_pipe, reverse(position));
    } else {
      let key = path2.head;
      let path$1 = path2.tail;
      let $ = index2(data, key);
      if ($ instanceof Ok) {
        let $1 = $[0];
        if ($1 instanceof Some) {
          let data$1 = $1[0];
          loop$path = path$1;
          loop$position = prepend(key, position);
          loop$inner = inner;
          loop$data = data$1;
          loop$handle_miss = handle_miss;
        } else {
          return handle_miss(data, prepend(key, position));
        }
      } else {
        let kind = $[0];
        let $1 = inner(data);
        let default$;
        default$ = $1[0];
        let _pipe = [
          default$,
          toList([new DecodeError(kind, classify_dynamic(data), toList([]))])
        ];
        return push_path(_pipe, reverse(position));
      }
    }
  }
}
function subfield(field_path, field_decoder, next) {
  return new Decoder(
    (data) => {
      let $ = index3(
        field_path,
        toList([]),
        field_decoder.function,
        data,
        (data2, position) => {
          let $12 = field_decoder.function(data2);
          let default$;
          default$ = $12[0];
          let _pipe = [
            default$,
            toList([new DecodeError("Field", "Nothing", toList([]))])
          ];
          return push_path(_pipe, reverse(position));
        }
      );
      let out;
      let errors1;
      out = $[0];
      errors1 = $[1];
      let $1 = next(out).function(data);
      let out$1;
      let errors2;
      out$1 = $1[0];
      errors2 = $1[1];
      return [out$1, append(errors1, errors2)];
    }
  );
}
function field(field_name, field_decoder, next) {
  return subfield(toList([field_name]), field_decoder, next);
}

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = void 0;
function identity(x) {
  return x;
}
function parse_int(value2) {
  if (/^[-+]?(\d+)$/.test(value2)) {
    return new Ok(parseInt(value2));
  } else {
    return new Error(Nil);
  }
}
function parse_float(value2) {
  if (/^[-+]?(\d+)\.(\d+)([eE][-+]?\d+)?$/.test(value2)) {
    return new Ok(parseFloat(value2));
  } else {
    return new Error(Nil);
  }
}
function to_string(term) {
  return term.toString();
}
function string_length(string5) {
  if (string5 === "") {
    return 0;
  }
  const iterator = graphemes_iterator(string5);
  if (iterator) {
    let i = 0;
    for (const _ of iterator) {
      i++;
    }
    return i;
  } else {
    return string5.match(/./gsu).length;
  }
}
var segmenter = void 0;
function graphemes_iterator(string5) {
  if (globalThis.Intl && Intl.Segmenter) {
    segmenter ||= new Intl.Segmenter();
    return segmenter.segment(string5)[Symbol.iterator]();
  }
}
function pop_codeunit(str) {
  return [str.charCodeAt(0) | 0, str.slice(1)];
}
function lowercase(string5) {
  return string5.toLowerCase();
}
function string_slice(string5, idx, len) {
  if (len <= 0 || idx >= string5.length) {
    return "";
  }
  const iterator = graphemes_iterator(string5);
  if (iterator) {
    while (idx-- > 0) {
      iterator.next();
    }
    let result = "";
    while (len-- > 0) {
      const v = iterator.next().value;
      if (v === void 0) {
        break;
      }
      result += v.segment;
    }
    return result;
  } else {
    return string5.match(/./gsu).slice(idx, idx + len).join("");
  }
}
function string_codeunit_slice(str, from2, length4) {
  return str.slice(from2, from2 + length4);
}
function starts_with(haystack, needle) {
  return haystack.startsWith(needle);
}
var unicode_whitespaces = [
  " ",
  // Space
  "	",
  // Horizontal tab
  "\n",
  // Line feed
  "\v",
  // Vertical tab
  "\f",
  // Form feed
  "\r",
  // Carriage return
  "\x85",
  // Next line
  "\u2028",
  // Line separator
  "\u2029"
  // Paragraph separator
].join("");
var trim_start_regex = /* @__PURE__ */ new RegExp(
  `^[${unicode_whitespaces}]*`
);
var trim_end_regex = /* @__PURE__ */ new RegExp(`[${unicode_whitespaces}]*$`);
function print(string5) {
  if (typeof process === "object" && process.stdout?.write) {
    process.stdout.write(string5);
  } else if (typeof Deno === "object") {
    Deno.stdout.writeSync(new TextEncoder().encode(string5));
  } else {
    console.log(string5);
  }
}
function classify_dynamic(data) {
  if (typeof data === "string") {
    return "String";
  } else if (typeof data === "boolean") {
    return "Bool";
  } else if (data instanceof Result) {
    return "Result";
  } else if (data instanceof List) {
    return "List";
  } else if (data instanceof BitArray) {
    return "BitArray";
  } else if (data instanceof Dict) {
    return "Dict";
  } else if (Number.isInteger(data)) {
    return "Int";
  } else if (Array.isArray(data)) {
    return `Array`;
  } else if (typeof data === "number") {
    return "Float";
  } else if (data === null) {
    return "Nil";
  } else if (data === void 0) {
    return "Nil";
  } else {
    const type = typeof data;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
function float_to_string(float4) {
  const string5 = float4.toString().replace("+", "");
  if (string5.indexOf(".") >= 0) {
    return string5;
  } else {
    const index5 = string5.indexOf("e");
    if (index5 >= 0) {
      return string5.slice(0, index5) + ".0" + string5.slice(index5);
    } else {
      return string5 + ".0";
    }
  }
}
function index2(data, key) {
  if (data instanceof Dict || data instanceof WeakMap || data instanceof Map) {
    const token = {};
    const entry = data.get(key, token);
    if (entry === token) return new Ok(new None());
    return new Ok(new Some(entry));
  }
  const key_is_int = Number.isInteger(key);
  if (key_is_int && key >= 0 && key < 8 && data instanceof List) {
    let i = 0;
    for (const value2 of data) {
      if (i === key) return new Ok(new Some(value2));
      i++;
    }
    return new Error("Indexable");
  }
  if (key_is_int && Array.isArray(data) || data && typeof data === "object" || data && Object.getPrototypeOf(data) === Object.prototype) {
    if (key in data) return new Ok(new Some(data[key]));
    return new Ok(new None());
  }
  return new Error(key_is_int ? "Indexable" : "Dict");
}
function list(data, decode2, pushPath, index5, emptyList) {
  if (!(data instanceof List || Array.isArray(data))) {
    const error = new DecodeError("List", classify_dynamic(data), emptyList);
    return [emptyList, List.fromArray([error])];
  }
  const decoded = [];
  for (const element4 of data) {
    const layer = decode2(element4);
    const [out, errors] = layer;
    if (errors instanceof NonEmpty) {
      const [_, errors2] = pushPath(layer, index5.toString());
      return [emptyList, errors2];
    }
    decoded.push(out);
    index5++;
  }
  return [List.fromArray(decoded), emptyList];
}
function float(data) {
  if (typeof data === "number") return new Ok(data);
  return new Error(0);
}
function int(data) {
  if (Number.isInteger(data)) return new Ok(data);
  return new Error(0);
}
function string(data) {
  if (typeof data === "string") return new Ok(data);
  return new Error("");
}
function is_null(data) {
  return data === null || data === void 0;
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function slice(string5, idx, len) {
  let $ = len < 0;
  if ($) {
    return "";
  } else {
    let $1 = idx < 0;
    if ($1) {
      let translated_idx = string_length(string5) + idx;
      let $2 = translated_idx < 0;
      if ($2) {
        return "";
      } else {
        return string_slice(string5, translated_idx, len);
      }
    } else {
      return string_slice(string5, idx, len);
    }
  }
}
function concat_loop(loop$strings, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let accumulator = loop$accumulator;
    if (strings instanceof Empty) {
      return accumulator;
    } else {
      let string5 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$accumulator = accumulator + string5;
    }
  }
}
function concat2(strings) {
  return concat_loop(strings, "");
}

// build/dev/javascript/gleam_stdlib/gleam/result.mjs
function map3(result, fun) {
  if (result instanceof Ok) {
    let x = result[0];
    return new Ok(fun(x));
  } else {
    return result;
  }
}
function map_error(result, fun) {
  if (result instanceof Ok) {
    return result;
  } else {
    let error = result[0];
    return new Error(fun(error));
  }
}
function try$(result, fun) {
  if (result instanceof Ok) {
    let x = result[0];
    return fun(x);
  } else {
    return result;
  }
}
function unwrap2(result, default$) {
  if (result instanceof Ok) {
    let v = result[0];
    return v;
  } else {
    return default$;
  }
}
function unwrap_both(result) {
  if (result instanceof Ok) {
    let a = result[0];
    return a;
  } else {
    let a = result[0];
    return a;
  }
}
function replace_error(result, error) {
  if (result instanceof Ok) {
    return result;
  } else {
    return new Error(error);
  }
}

// build/dev/javascript/gleam_json/gleam_json_ffi.mjs
function json_to_string(json2) {
  return JSON.stringify(json2);
}
function object(entries) {
  return Object.fromEntries(entries);
}
function identity2(x) {
  return x;
}
function do_null() {
  return null;
}
function decode(string5) {
  try {
    const result = JSON.parse(string5);
    return new Ok(result);
  } catch (err) {
    return new Error(getJsonDecodeError(err, string5));
  }
}
function getJsonDecodeError(stdErr, json2) {
  if (isUnexpectedEndOfInput(stdErr)) return new UnexpectedEndOfInput();
  return toUnexpectedByteError(stdErr, json2);
}
function isUnexpectedEndOfInput(err) {
  const unexpectedEndOfInputRegex = /((unexpected (end|eof))|(end of data)|(unterminated string)|(json( parse error|\.parse)\: expected '(\:|\}|\])'))/i;
  return unexpectedEndOfInputRegex.test(err.message);
}
function toUnexpectedByteError(err, json2) {
  let converters = [
    v8UnexpectedByteError,
    oldV8UnexpectedByteError,
    jsCoreUnexpectedByteError,
    spidermonkeyUnexpectedByteError
  ];
  for (let converter of converters) {
    let result = converter(err, json2);
    if (result) return result;
  }
  return new UnexpectedByte("", 0);
}
function v8UnexpectedByteError(err) {
  const regex = /unexpected token '(.)', ".+" is not valid JSON/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const byte = toHex(match[1]);
  return new UnexpectedByte(byte, -1);
}
function oldV8UnexpectedByteError(err) {
  const regex = /unexpected token (.) in JSON at position (\d+)/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const byte = toHex(match[1]);
  const position = Number(match[2]);
  return new UnexpectedByte(byte, position);
}
function spidermonkeyUnexpectedByteError(err, json2) {
  const regex = /(unexpected character|expected .*) at line (\d+) column (\d+)/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const line = Number(match[2]);
  const column = Number(match[3]);
  const position = getPositionFromMultiline(line, column, json2);
  const byte = toHex(json2[position]);
  return new UnexpectedByte(byte, position);
}
function jsCoreUnexpectedByteError(err) {
  const regex = /unexpected (identifier|token) "(.)"/i;
  const match = regex.exec(err.message);
  if (!match) return null;
  const byte = toHex(match[2]);
  return new UnexpectedByte(byte, 0);
}
function toHex(char) {
  return "0x" + char.charCodeAt(0).toString(16).toUpperCase();
}
function getPositionFromMultiline(line, column, string5) {
  if (line === 1) return column - 1;
  let currentLn = 1;
  let position = 0;
  string5.split("").find((char, idx) => {
    if (char === "\n") currentLn += 1;
    if (currentLn === line) {
      position = idx + column;
      return true;
    }
    return false;
  });
  return position;
}

// build/dev/javascript/gleam_json/gleam/json.mjs
var UnexpectedEndOfInput = class extends CustomType {
};
var UnexpectedByte = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UnableToDecode = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
function do_parse(json2, decoder) {
  return try$(
    decode(json2),
    (dynamic_value) => {
      let _pipe = run(dynamic_value, decoder);
      return map_error(
        _pipe,
        (var0) => {
          return new UnableToDecode(var0);
        }
      );
    }
  );
}
function parse(json2, decoder) {
  return do_parse(json2, decoder);
}
function to_string2(json2) {
  return json_to_string(json2);
}
function string3(input2) {
  return identity2(input2);
}
function bool(input2) {
  return identity2(input2);
}
function int3(input2) {
  return identity2(input2);
}
function float3(input2) {
  return identity2(input2);
}
function null$() {
  return do_null();
}
function object2(entries) {
  return object(entries);
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/function.mjs
function identity3(x) {
  return x;
}

// build/dev/javascript/lustre/lustre/internals/constants.ffi.mjs
var document2 = () => globalThis?.document;
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var SUPPORTS_MOVE_BEFORE = !!globalThis.HTMLElement?.prototype?.moveBefore;

// build/dev/javascript/lustre/lustre/internals/constants.mjs
var empty_list = /* @__PURE__ */ toList([]);
var option_none = /* @__PURE__ */ new None();

// build/dev/javascript/lustre/lustre/vdom/vattr.ffi.mjs
var GT = /* @__PURE__ */ new Gt();
var LT = /* @__PURE__ */ new Lt();
var EQ = /* @__PURE__ */ new Eq();
function compare3(a, b) {
  if (a.name === b.name) {
    return EQ;
  } else if (a.name < b.name) {
    return LT;
  } else {
    return GT;
  }
}

// build/dev/javascript/lustre/lustre/vdom/vattr.mjs
var Attribute = class extends CustomType {
  constructor(kind, name, value2) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value2;
  }
};
var Property = class extends CustomType {
  constructor(kind, name, value2) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value2;
  }
};
var Event2 = class extends CustomType {
  constructor(kind, name, handler, include, prevent_default, stop_propagation, immediate2, debounce, throttle) {
    super();
    this.kind = kind;
    this.name = name;
    this.handler = handler;
    this.include = include;
    this.prevent_default = prevent_default;
    this.stop_propagation = stop_propagation;
    this.immediate = immediate2;
    this.debounce = debounce;
    this.throttle = throttle;
  }
};
var Handler = class extends CustomType {
  constructor(prevent_default, stop_propagation, message2) {
    super();
    this.prevent_default = prevent_default;
    this.stop_propagation = stop_propagation;
    this.message = message2;
  }
};
var Never = class extends CustomType {
  constructor(kind) {
    super();
    this.kind = kind;
  }
};
function merge(loop$attributes, loop$merged) {
  while (true) {
    let attributes = loop$attributes;
    let merged = loop$merged;
    if (attributes instanceof Empty) {
      return merged;
    } else {
      let $ = attributes.head;
      if ($ instanceof Attribute) {
        let $1 = $.name;
        if ($1 === "") {
          let rest = attributes.tail;
          loop$attributes = rest;
          loop$merged = merged;
        } else if ($1 === "class") {
          let $2 = $.value;
          if ($2 === "") {
            let rest = attributes.tail;
            loop$attributes = rest;
            loop$merged = merged;
          } else {
            let $3 = attributes.tail;
            if ($3 instanceof Empty) {
              let attribute$1 = $;
              let rest = $3;
              loop$attributes = rest;
              loop$merged = prepend(attribute$1, merged);
            } else {
              let $4 = $3.head;
              if ($4 instanceof Attribute) {
                let $5 = $4.name;
                if ($5 === "class") {
                  let kind = $.kind;
                  let class1 = $2;
                  let rest = $3.tail;
                  let class2 = $4.value;
                  let value2 = class1 + " " + class2;
                  let attribute$1 = new Attribute(kind, "class", value2);
                  loop$attributes = prepend(attribute$1, rest);
                  loop$merged = merged;
                } else {
                  let attribute$1 = $;
                  let rest = $3;
                  loop$attributes = rest;
                  loop$merged = prepend(attribute$1, merged);
                }
              } else {
                let attribute$1 = $;
                let rest = $3;
                loop$attributes = rest;
                loop$merged = prepend(attribute$1, merged);
              }
            }
          }
        } else if ($1 === "style") {
          let $2 = $.value;
          if ($2 === "") {
            let rest = attributes.tail;
            loop$attributes = rest;
            loop$merged = merged;
          } else {
            let $3 = attributes.tail;
            if ($3 instanceof Empty) {
              let attribute$1 = $;
              let rest = $3;
              loop$attributes = rest;
              loop$merged = prepend(attribute$1, merged);
            } else {
              let $4 = $3.head;
              if ($4 instanceof Attribute) {
                let $5 = $4.name;
                if ($5 === "style") {
                  let kind = $.kind;
                  let style1 = $2;
                  let rest = $3.tail;
                  let style2 = $4.value;
                  let value2 = style1 + ";" + style2;
                  let attribute$1 = new Attribute(kind, "style", value2);
                  loop$attributes = prepend(attribute$1, rest);
                  loop$merged = merged;
                } else {
                  let attribute$1 = $;
                  let rest = $3;
                  loop$attributes = rest;
                  loop$merged = prepend(attribute$1, merged);
                }
              } else {
                let attribute$1 = $;
                let rest = $3;
                loop$attributes = rest;
                loop$merged = prepend(attribute$1, merged);
              }
            }
          }
        } else {
          let attribute$1 = $;
          let rest = attributes.tail;
          loop$attributes = rest;
          loop$merged = prepend(attribute$1, merged);
        }
      } else {
        let attribute$1 = $;
        let rest = attributes.tail;
        loop$attributes = rest;
        loop$merged = prepend(attribute$1, merged);
      }
    }
  }
}
function prepare(attributes) {
  if (attributes instanceof Empty) {
    return attributes;
  } else {
    let $ = attributes.tail;
    if ($ instanceof Empty) {
      return attributes;
    } else {
      let _pipe = attributes;
      let _pipe$1 = sort(_pipe, (a, b) => {
        return compare3(b, a);
      });
      return merge(_pipe$1, empty_list);
    }
  }
}
var attribute_kind = 0;
function attribute(name, value2) {
  return new Attribute(attribute_kind, name, value2);
}
var property_kind = 1;
function property(name, value2) {
  return new Property(property_kind, name, value2);
}
var event_kind = 2;
function event(name, handler, include, prevent_default, stop_propagation, immediate2, debounce, throttle) {
  return new Event2(
    event_kind,
    name,
    handler,
    include,
    prevent_default,
    stop_propagation,
    immediate2,
    debounce,
    throttle
  );
}
var never_kind = 0;
var never = /* @__PURE__ */ new Never(never_kind);
var always_kind = 2;

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute2(name, value2) {
  return attribute(name, value2);
}
function property2(name, value2) {
  return property(name, value2);
}
function boolean_attribute(name, value2) {
  if (value2) {
    return attribute2(name, "");
  } else {
    return property2(name, bool(false));
  }
}
function class$(name) {
  return attribute2("class", name);
}
function id(value2) {
  return attribute2("id", value2);
}
function title(text4) {
  return attribute2("title", text4);
}
function disabled(is_disabled) {
  return boolean_attribute("disabled", is_disabled);
}
function placeholder(text4) {
  return attribute2("placeholder", text4);
}
function selected(is_selected) {
  return boolean_attribute("selected", is_selected);
}
function type_(control_type) {
  return attribute2("type", control_type);
}
function value(control_value) {
  return attribute2("value", control_value);
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(synchronous, before_paint2, after_paint) {
    super();
    this.synchronous = synchronous;
    this.before_paint = before_paint2;
    this.after_paint = after_paint;
  }
};
var empty = /* @__PURE__ */ new Effect(
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([])
);
function none() {
  return empty;
}
function from(effect) {
  let task = (actions) => {
    let dispatch = actions.dispatch;
    return effect(dispatch);
  };
  return new Effect(toList([task]), empty.before_paint, empty.after_paint);
}
function batch(effects) {
  return fold(
    effects,
    empty,
    (acc, eff) => {
      return new Effect(
        fold(eff.synchronous, acc.synchronous, prepend2),
        fold(eff.before_paint, acc.before_paint, prepend2),
        fold(eff.after_paint, acc.after_paint, prepend2)
      );
    }
  );
}

// build/dev/javascript/lustre/lustre/internals/mutable_map.ffi.mjs
function empty2() {
  return null;
}
function get(map6, key) {
  const value2 = map6?.get(key);
  if (value2 != null) {
    return new Ok(value2);
  } else {
    return new Error(void 0);
  }
}
function has_key2(map6, key) {
  return map6 && map6.has(key);
}
function insert2(map6, key, value2) {
  map6 ??= /* @__PURE__ */ new Map();
  map6.set(key, value2);
  return map6;
}
function remove(map6, key) {
  map6?.delete(key);
  return map6;
}

// build/dev/javascript/lustre/lustre/vdom/path.mjs
var Root = class extends CustomType {
};
var Key = class extends CustomType {
  constructor(key, parent) {
    super();
    this.key = key;
    this.parent = parent;
  }
};
var Index = class extends CustomType {
  constructor(index5, parent) {
    super();
    this.index = index5;
    this.parent = parent;
  }
};
function do_matches(loop$path, loop$candidates) {
  while (true) {
    let path2 = loop$path;
    let candidates = loop$candidates;
    if (candidates instanceof Empty) {
      return false;
    } else {
      let candidate = candidates.head;
      let rest = candidates.tail;
      let $ = starts_with(path2, candidate);
      if ($) {
        return $;
      } else {
        loop$path = path2;
        loop$candidates = rest;
      }
    }
  }
}
function add2(parent, index5, key) {
  if (key === "") {
    return new Index(index5, parent);
  } else {
    return new Key(key, parent);
  }
}
var root2 = /* @__PURE__ */ new Root();
var separator_element = "	";
function do_to_string(loop$path, loop$acc) {
  while (true) {
    let path2 = loop$path;
    let acc = loop$acc;
    if (path2 instanceof Root) {
      if (acc instanceof Empty) {
        return "";
      } else {
        let segments = acc.tail;
        return concat2(segments);
      }
    } else if (path2 instanceof Key) {
      let key = path2.key;
      let parent = path2.parent;
      loop$path = parent;
      loop$acc = prepend(separator_element, prepend(key, acc));
    } else {
      let index5 = path2.index;
      let parent = path2.parent;
      loop$path = parent;
      loop$acc = prepend(
        separator_element,
        prepend(to_string(index5), acc)
      );
    }
  }
}
function to_string3(path2) {
  return do_to_string(path2, toList([]));
}
function matches(path2, candidates) {
  if (candidates instanceof Empty) {
    return false;
  } else {
    return do_matches(to_string3(path2), candidates);
  }
}
var separator_event = "\n";
function event2(path2, event4) {
  return do_to_string(path2, toList([separator_event, event4]));
}

// build/dev/javascript/lustre/lustre/vdom/vnode.mjs
var Fragment = class extends CustomType {
  constructor(kind, key, mapper, children, keyed_children) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.children = children;
    this.keyed_children = keyed_children;
  }
};
var Element = class extends CustomType {
  constructor(kind, key, mapper, namespace2, tag, attributes, children, keyed_children, self_closing, void$) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace2;
    this.tag = tag;
    this.attributes = attributes;
    this.children = children;
    this.keyed_children = keyed_children;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Text = class extends CustomType {
  constructor(kind, key, mapper, content) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.content = content;
  }
};
var UnsafeInnerHtml = class extends CustomType {
  constructor(kind, key, mapper, namespace2, tag, attributes, inner_html) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace2;
    this.tag = tag;
    this.attributes = attributes;
    this.inner_html = inner_html;
  }
};
function is_void_element(tag, namespace2) {
  if (namespace2 === "") {
    if (tag === "area") {
      return true;
    } else if (tag === "base") {
      return true;
    } else if (tag === "br") {
      return true;
    } else if (tag === "col") {
      return true;
    } else if (tag === "embed") {
      return true;
    } else if (tag === "hr") {
      return true;
    } else if (tag === "img") {
      return true;
    } else if (tag === "input") {
      return true;
    } else if (tag === "link") {
      return true;
    } else if (tag === "meta") {
      return true;
    } else if (tag === "param") {
      return true;
    } else if (tag === "source") {
      return true;
    } else if (tag === "track") {
      return true;
    } else if (tag === "wbr") {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
function to_keyed(key, node) {
  if (node instanceof Fragment) {
    return new Fragment(
      node.kind,
      key,
      node.mapper,
      node.children,
      node.keyed_children
    );
  } else if (node instanceof Element) {
    return new Element(
      node.kind,
      key,
      node.mapper,
      node.namespace,
      node.tag,
      node.attributes,
      node.children,
      node.keyed_children,
      node.self_closing,
      node.void
    );
  } else if (node instanceof Text) {
    return new Text(node.kind, key, node.mapper, node.content);
  } else {
    return new UnsafeInnerHtml(
      node.kind,
      key,
      node.mapper,
      node.namespace,
      node.tag,
      node.attributes,
      node.inner_html
    );
  }
}
var fragment_kind = 0;
function fragment(key, mapper, children, keyed_children) {
  return new Fragment(fragment_kind, key, mapper, children, keyed_children);
}
var element_kind = 1;
function element(key, mapper, namespace2, tag, attributes, children, keyed_children, self_closing, void$) {
  return new Element(
    element_kind,
    key,
    mapper,
    namespace2,
    tag,
    prepare(attributes),
    children,
    keyed_children,
    self_closing,
    void$ || is_void_element(tag, namespace2)
  );
}
var text_kind = 2;
function text(key, mapper, content) {
  return new Text(text_kind, key, mapper, content);
}
var unsafe_inner_html_kind = 3;

// build/dev/javascript/lustre/lustre/internals/equals.ffi.mjs
var isReferenceEqual = (a, b) => a === b;
var isEqual2 = (a, b) => {
  if (a === b) {
    return true;
  }
  if (a == null || b == null) {
    return false;
  }
  const type = typeof a;
  if (type !== typeof b) {
    return false;
  }
  if (type !== "object") {
    return false;
  }
  const ctor = a.constructor;
  if (ctor !== b.constructor) {
    return false;
  }
  if (Array.isArray(a)) {
    return areArraysEqual(a, b);
  }
  return areObjectsEqual(a, b);
};
var areArraysEqual = (a, b) => {
  let index5 = a.length;
  if (index5 !== b.length) {
    return false;
  }
  while (index5--) {
    if (!isEqual2(a[index5], b[index5])) {
      return false;
    }
  }
  return true;
};
var areObjectsEqual = (a, b) => {
  const properties = Object.keys(a);
  let index5 = properties.length;
  if (Object.keys(b).length !== index5) {
    return false;
  }
  while (index5--) {
    const property3 = properties[index5];
    if (!Object.hasOwn(b, property3)) {
      return false;
    }
    if (!isEqual2(a[property3], b[property3])) {
      return false;
    }
  }
  return true;
};

// build/dev/javascript/lustre/lustre/vdom/events.mjs
var Events = class extends CustomType {
  constructor(handlers, dispatched_paths, next_dispatched_paths) {
    super();
    this.handlers = handlers;
    this.dispatched_paths = dispatched_paths;
    this.next_dispatched_paths = next_dispatched_paths;
  }
};
function new$3() {
  return new Events(
    empty2(),
    empty_list,
    empty_list
  );
}
function tick(events) {
  return new Events(
    events.handlers,
    events.next_dispatched_paths,
    empty_list
  );
}
function do_remove_event(handlers, path2, name) {
  return remove(handlers, event2(path2, name));
}
function remove_event(events, path2, name) {
  let handlers = do_remove_event(events.handlers, path2, name);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function remove_attributes(handlers, path2, attributes) {
  return fold(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name = attribute3.name;
        return do_remove_event(events, path2, name);
      } else {
        return events;
      }
    }
  );
}
function handle(events, path2, name, event4) {
  let next_dispatched_paths = prepend(path2, events.next_dispatched_paths);
  let events$1 = new Events(
    events.handlers,
    events.dispatched_paths,
    next_dispatched_paths
  );
  let $ = get(
    events$1.handlers,
    path2 + separator_event + name
  );
  if ($ instanceof Ok) {
    let handler = $[0];
    return [events$1, run(event4, handler)];
  } else {
    return [events$1, new Error(toList([]))];
  }
}
function has_dispatched_events(events, path2) {
  return matches(path2, events.dispatched_paths);
}
function do_add_event(handlers, mapper, path2, name, handler) {
  return insert2(
    handlers,
    event2(path2, name),
    map2(
      handler,
      (handler2) => {
        return new Handler(
          handler2.prevent_default,
          handler2.stop_propagation,
          identity3(mapper)(handler2.message)
        );
      }
    )
  );
}
function add_event(events, mapper, path2, name, handler) {
  let handlers = do_add_event(events.handlers, mapper, path2, name, handler);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function add_attributes(handlers, mapper, path2, attributes) {
  return fold(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name = attribute3.name;
        let handler = attribute3.handler;
        return do_add_event(events, mapper, path2, name, handler);
      } else {
        return events;
      }
    }
  );
}
function compose_mapper(mapper, child_mapper) {
  let $ = isReferenceEqual(mapper, identity3);
  let $1 = isReferenceEqual(child_mapper, identity3);
  if ($1) {
    return mapper;
  } else if ($) {
    return child_mapper;
  } else {
    return (msg) => {
      return mapper(child_mapper(msg));
    };
  }
}
function do_remove_children(loop$handlers, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let path2 = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children instanceof Empty) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_remove_child(_pipe, path2, child_index, child);
      loop$handlers = _pipe$1;
      loop$path = path2;
      loop$child_index = child_index + 1;
      loop$children = rest;
    }
  }
}
function do_remove_child(handlers, parent, child_index, child) {
  if (child instanceof Fragment) {
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    return do_remove_children(handlers, path2, 0, children);
  } else if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    let _pipe = handlers;
    let _pipe$1 = remove_attributes(_pipe, path2, attributes);
    return do_remove_children(_pipe$1, path2, 0, children);
  } else if (child instanceof Text) {
    return handlers;
  } else {
    let attributes = child.attributes;
    let path2 = add2(parent, child_index, child.key);
    return remove_attributes(handlers, path2, attributes);
  }
}
function remove_child(events, parent, child_index, child) {
  let handlers = do_remove_child(events.handlers, parent, child_index, child);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function do_add_children(loop$handlers, loop$mapper, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let mapper = loop$mapper;
    let path2 = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children instanceof Empty) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_add_child(_pipe, mapper, path2, child_index, child);
      loop$handlers = _pipe$1;
      loop$mapper = mapper;
      loop$path = path2;
      loop$child_index = child_index + 1;
      loop$children = rest;
    }
  }
}
function do_add_child(handlers, mapper, parent, child_index, child) {
  if (child instanceof Fragment) {
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    return do_add_children(handlers, composed_mapper, path2, 0, children);
  } else if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let _pipe = handlers;
    let _pipe$1 = add_attributes(_pipe, composed_mapper, path2, attributes);
    return do_add_children(_pipe$1, composed_mapper, path2, 0, children);
  } else if (child instanceof Text) {
    return handlers;
  } else {
    let attributes = child.attributes;
    let path2 = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    return add_attributes(handlers, composed_mapper, path2, attributes);
  }
}
function add_child(events, mapper, parent, index5, child) {
  let handlers = do_add_child(events.handlers, mapper, parent, index5, child);
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}
function add_children(events, mapper, path2, child_index, children) {
  let handlers = do_add_children(
    events.handlers,
    mapper,
    path2,
    child_index,
    children
  );
  return new Events(
    handlers,
    events.dispatched_paths,
    events.next_dispatched_paths
  );
}

// build/dev/javascript/lustre/lustre/element.mjs
function element2(tag, attributes, children) {
  return element(
    "",
    identity3,
    "",
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function namespaced(namespace2, tag, attributes, children) {
  return element(
    "",
    identity3,
    namespace2,
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function text2(content) {
  return text("", identity3, content);
}
function none2() {
  return text("", identity3, "");
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function text3(content) {
  return text2(content);
}
function h2(attrs, children) {
  return element2("h2", attrs, children);
}
function h3(attrs, children) {
  return element2("h3", attrs, children);
}
function nav(attrs, children) {
  return element2("nav", attrs, children);
}
function div(attrs, children) {
  return element2("div", attrs, children);
}
function p(attrs, children) {
  return element2("p", attrs, children);
}
function span(attrs, children) {
  return element2("span", attrs, children);
}
function svg(attrs, children) {
  return namespaced("http://www.w3.org/2000/svg", "svg", attrs, children);
}
function button(attrs, children) {
  return element2("button", attrs, children);
}
function input(attrs) {
  return element2("input", attrs, empty_list);
}
function label(attrs, children) {
  return element2("label", attrs, children);
}
function option(attrs, label2) {
  return element2("option", attrs, toList([text2(label2)]));
}
function select(attrs, children) {
  return element2("select", attrs, children);
}
function textarea(attrs, content) {
  return element2(
    "textarea",
    prepend(property2("value", string3(content)), attrs),
    toList([text2(content)])
  );
}

// build/dev/javascript/lustre/lustre/vdom/patch.mjs
var Patch = class extends CustomType {
  constructor(index5, removed, changes, children) {
    super();
    this.index = index5;
    this.removed = removed;
    this.changes = changes;
    this.children = children;
  }
};
var ReplaceText = class extends CustomType {
  constructor(kind, content) {
    super();
    this.kind = kind;
    this.content = content;
  }
};
var ReplaceInnerHtml = class extends CustomType {
  constructor(kind, inner_html) {
    super();
    this.kind = kind;
    this.inner_html = inner_html;
  }
};
var Update = class extends CustomType {
  constructor(kind, added, removed) {
    super();
    this.kind = kind;
    this.added = added;
    this.removed = removed;
  }
};
var Move = class extends CustomType {
  constructor(kind, key, before) {
    super();
    this.kind = kind;
    this.key = key;
    this.before = before;
  }
};
var Replace = class extends CustomType {
  constructor(kind, index5, with$) {
    super();
    this.kind = kind;
    this.index = index5;
    this.with = with$;
  }
};
var Remove = class extends CustomType {
  constructor(kind, index5) {
    super();
    this.kind = kind;
    this.index = index5;
  }
};
var Insert = class extends CustomType {
  constructor(kind, children, before) {
    super();
    this.kind = kind;
    this.children = children;
    this.before = before;
  }
};
function new$5(index5, removed, changes, children) {
  return new Patch(index5, removed, changes, children);
}
var replace_text_kind = 0;
function replace_text(content) {
  return new ReplaceText(replace_text_kind, content);
}
var replace_inner_html_kind = 1;
function replace_inner_html(inner_html) {
  return new ReplaceInnerHtml(replace_inner_html_kind, inner_html);
}
var update_kind = 2;
function update(added, removed) {
  return new Update(update_kind, added, removed);
}
var move_kind = 3;
function move(key, before) {
  return new Move(move_kind, key, before);
}
var remove_kind = 4;
function remove2(index5) {
  return new Remove(remove_kind, index5);
}
var replace_kind = 5;
function replace2(index5, with$) {
  return new Replace(replace_kind, index5, with$);
}
var insert_kind = 6;
function insert3(children, before) {
  return new Insert(insert_kind, children, before);
}

// build/dev/javascript/lustre/lustre/vdom/diff.mjs
var Diff = class extends CustomType {
  constructor(patch, events) {
    super();
    this.patch = patch;
    this.events = events;
  }
};
var AttributeChange = class extends CustomType {
  constructor(added, removed, events) {
    super();
    this.added = added;
    this.removed = removed;
    this.events = events;
  }
};
function is_controlled(events, namespace2, tag, path2) {
  if (tag === "input" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else if (tag === "select" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else if (tag === "textarea" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else {
    return false;
  }
}
function diff_attributes(loop$controlled, loop$path, loop$mapper, loop$events, loop$old, loop$new, loop$added, loop$removed) {
  while (true) {
    let controlled = loop$controlled;
    let path2 = loop$path;
    let mapper = loop$mapper;
    let events = loop$events;
    let old = loop$old;
    let new$8 = loop$new;
    let added = loop$added;
    let removed = loop$removed;
    if (new$8 instanceof Empty) {
      if (old instanceof Empty) {
        return new AttributeChange(added, removed, events);
      } else {
        let $ = old.head;
        if ($ instanceof Event2) {
          let prev = $;
          let old$1 = old.tail;
          let name = $.name;
          let removed$1 = prepend(prev, removed);
          let events$1 = remove_event(events, path2, name);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = old$1;
          loop$new = new$8;
          loop$added = added;
          loop$removed = removed$1;
        } else {
          let prev = $;
          let old$1 = old.tail;
          let removed$1 = prepend(prev, removed);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events;
          loop$old = old$1;
          loop$new = new$8;
          loop$added = added;
          loop$removed = removed$1;
        }
      }
    } else if (old instanceof Empty) {
      let $ = new$8.head;
      if ($ instanceof Event2) {
        let next = $;
        let new$1 = new$8.tail;
        let name = $.name;
        let handler = $.handler;
        let added$1 = prepend(next, added);
        let events$1 = add_event(events, mapper, path2, name, handler);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = old;
        loop$new = new$1;
        loop$added = added$1;
        loop$removed = removed;
      } else {
        let next = $;
        let new$1 = new$8.tail;
        let added$1 = prepend(next, added);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = old;
        loop$new = new$1;
        loop$added = added$1;
        loop$removed = removed;
      }
    } else {
      let next = new$8.head;
      let remaining_new = new$8.tail;
      let prev = old.head;
      let remaining_old = old.tail;
      let $ = compare3(prev, next);
      if ($ instanceof Lt) {
        if (prev instanceof Event2) {
          let name = prev.name;
          let removed$1 = prepend(prev, removed);
          let events$1 = remove_event(events, path2, name);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = remaining_old;
          loop$new = new$8;
          loop$added = added;
          loop$removed = removed$1;
        } else {
          let removed$1 = prepend(prev, removed);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events;
          loop$old = remaining_old;
          loop$new = new$8;
          loop$added = added;
          loop$removed = removed$1;
        }
      } else if ($ instanceof Eq) {
        if (next instanceof Attribute) {
          if (prev instanceof Attribute) {
            let _block;
            let $1 = next.name;
            if ($1 === "value") {
              _block = controlled || prev.value !== next.value;
            } else if ($1 === "checked") {
              _block = controlled || prev.value !== next.value;
            } else if ($1 === "selected") {
              _block = controlled || prev.value !== next.value;
            } else {
              _block = prev.value !== next.value;
            }
            let has_changes = _block;
            let _block$1;
            if (has_changes) {
              _block$1 = prepend(next, added);
            } else {
              _block$1 = added;
            }
            let added$1 = _block$1;
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed;
          } else if (prev instanceof Event2) {
            let name = prev.name;
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            let events$1 = remove_event(events, path2, name);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events$1;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          } else {
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          }
        } else if (next instanceof Property) {
          if (prev instanceof Property) {
            let _block;
            let $1 = next.name;
            if ($1 === "scrollLeft") {
              _block = true;
            } else if ($1 === "scrollRight") {
              _block = true;
            } else if ($1 === "value") {
              _block = controlled || !isEqual2(
                prev.value,
                next.value
              );
            } else if ($1 === "checked") {
              _block = controlled || !isEqual2(
                prev.value,
                next.value
              );
            } else if ($1 === "selected") {
              _block = controlled || !isEqual2(
                prev.value,
                next.value
              );
            } else {
              _block = !isEqual2(prev.value, next.value);
            }
            let has_changes = _block;
            let _block$1;
            if (has_changes) {
              _block$1 = prepend(next, added);
            } else {
              _block$1 = added;
            }
            let added$1 = _block$1;
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed;
          } else if (prev instanceof Event2) {
            let name = prev.name;
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            let events$1 = remove_event(events, path2, name);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events$1;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          } else {
            let added$1 = prepend(next, added);
            let removed$1 = prepend(prev, removed);
            loop$controlled = controlled;
            loop$path = path2;
            loop$mapper = mapper;
            loop$events = events;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed$1;
          }
        } else if (prev instanceof Event2) {
          let name = next.name;
          let handler = next.handler;
          let has_changes = prev.prevent_default.kind !== next.prevent_default.kind || prev.stop_propagation.kind !== next.stop_propagation.kind || prev.immediate !== next.immediate || prev.debounce !== next.debounce || prev.throttle !== next.throttle;
          let _block;
          if (has_changes) {
            _block = prepend(next, added);
          } else {
            _block = added;
          }
          let added$1 = _block;
          let events$1 = add_event(events, mapper, path2, name, handler);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = remaining_old;
          loop$new = remaining_new;
          loop$added = added$1;
          loop$removed = removed;
        } else {
          let name = next.name;
          let handler = next.handler;
          let added$1 = prepend(next, added);
          let removed$1 = prepend(prev, removed);
          let events$1 = add_event(events, mapper, path2, name, handler);
          loop$controlled = controlled;
          loop$path = path2;
          loop$mapper = mapper;
          loop$events = events$1;
          loop$old = remaining_old;
          loop$new = remaining_new;
          loop$added = added$1;
          loop$removed = removed$1;
        }
      } else if (next instanceof Event2) {
        let name = next.name;
        let handler = next.handler;
        let added$1 = prepend(next, added);
        let events$1 = add_event(events, mapper, path2, name, handler);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else {
        let added$1 = prepend(next, added);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      }
    }
  }
}
function do_diff(loop$old, loop$old_keyed, loop$new, loop$new_keyed, loop$moved, loop$moved_offset, loop$removed, loop$node_index, loop$patch_index, loop$path, loop$changes, loop$children, loop$mapper, loop$events) {
  while (true) {
    let old = loop$old;
    let old_keyed = loop$old_keyed;
    let new$8 = loop$new;
    let new_keyed = loop$new_keyed;
    let moved = loop$moved;
    let moved_offset = loop$moved_offset;
    let removed = loop$removed;
    let node_index = loop$node_index;
    let patch_index = loop$patch_index;
    let path2 = loop$path;
    let changes = loop$changes;
    let children = loop$children;
    let mapper = loop$mapper;
    let events = loop$events;
    if (new$8 instanceof Empty) {
      if (old instanceof Empty) {
        return new Diff(
          new Patch(patch_index, removed, changes, children),
          events
        );
      } else {
        let prev = old.head;
        let old$1 = old.tail;
        let _block;
        let $ = prev.key === "" || !has_key2(moved, prev.key);
        if ($) {
          _block = removed + 1;
        } else {
          _block = removed;
        }
        let removed$1 = _block;
        let events$1 = remove_child(events, path2, node_index, prev);
        loop$old = old$1;
        loop$old_keyed = old_keyed;
        loop$new = new$8;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset;
        loop$removed = removed$1;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path2;
        loop$changes = changes;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      }
    } else if (old instanceof Empty) {
      let events$1 = add_children(
        events,
        mapper,
        path2,
        node_index,
        new$8
      );
      let insert4 = insert3(new$8, node_index - moved_offset);
      let changes$1 = prepend(insert4, changes);
      return new Diff(
        new Patch(patch_index, removed, changes$1, children),
        events$1
      );
    } else {
      let next = new$8.head;
      let prev = old.head;
      if (prev.key !== next.key) {
        let new_remaining = new$8.tail;
        let old_remaining = old.tail;
        let next_did_exist = get(old_keyed, next.key);
        let prev_does_exist = has_key2(new_keyed, prev.key);
        if (next_did_exist instanceof Ok) {
          if (prev_does_exist) {
            let match = next_did_exist[0];
            let $ = has_key2(moved, prev.key);
            if ($) {
              loop$old = old_remaining;
              loop$old_keyed = old_keyed;
              loop$new = new$8;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset - 1;
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events;
            } else {
              let before = node_index - moved_offset;
              let changes$1 = prepend(
                move(next.key, before),
                changes
              );
              let moved$1 = insert2(moved, next.key, void 0);
              let moved_offset$1 = moved_offset + 1;
              loop$old = prepend(match, old);
              loop$old_keyed = old_keyed;
              loop$new = new$8;
              loop$new_keyed = new_keyed;
              loop$moved = moved$1;
              loop$moved_offset = moved_offset$1;
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes$1;
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events;
            }
          } else {
            let index5 = node_index - moved_offset;
            let changes$1 = prepend(remove2(index5), changes);
            let events$1 = remove_child(events, path2, node_index, prev);
            let moved_offset$1 = moved_offset - 1;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new$8;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset$1;
            loop$removed = removed;
            loop$node_index = node_index;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = changes$1;
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else if (prev_does_exist) {
          let before = node_index - moved_offset;
          let events$1 = add_child(
            events,
            mapper,
            path2,
            node_index,
            next
          );
          let insert4 = insert3(toList([next]), before);
          let changes$1 = prepend(insert4, changes);
          loop$old = old;
          loop$old_keyed = old_keyed;
          loop$new = new_remaining;
          loop$new_keyed = new_keyed;
          loop$moved = moved;
          loop$moved_offset = moved_offset + 1;
          loop$removed = removed;
          loop$node_index = node_index + 1;
          loop$patch_index = patch_index;
          loop$path = path2;
          loop$changes = changes$1;
          loop$children = children;
          loop$mapper = mapper;
          loop$events = events$1;
        } else {
          let change = replace2(node_index - moved_offset, next);
          let _block;
          let _pipe = events;
          let _pipe$1 = remove_child(_pipe, path2, node_index, prev);
          _block = add_child(_pipe$1, mapper, path2, node_index, next);
          let events$1 = _block;
          loop$old = old_remaining;
          loop$old_keyed = old_keyed;
          loop$new = new_remaining;
          loop$new_keyed = new_keyed;
          loop$moved = moved;
          loop$moved_offset = moved_offset;
          loop$removed = removed;
          loop$node_index = node_index + 1;
          loop$patch_index = patch_index;
          loop$path = path2;
          loop$changes = prepend(change, changes);
          loop$children = children;
          loop$mapper = mapper;
          loop$events = events$1;
        }
      } else {
        let $ = old.head;
        if ($ instanceof Fragment) {
          let $1 = new$8.head;
          if ($1 instanceof Fragment) {
            let next$1 = $1;
            let new$1 = new$8.tail;
            let prev$1 = $;
            let old$1 = old.tail;
            let composed_mapper = compose_mapper(mapper, next$1.mapper);
            let child_path = add2(path2, node_index, next$1.key);
            let child = do_diff(
              prev$1.children,
              prev$1.keyed_children,
              next$1.children,
              next$1.keyed_children,
              empty2(),
              0,
              0,
              0,
              node_index,
              child_path,
              empty_list,
              empty_list,
              composed_mapper,
              events
            );
            let _block;
            let $2 = child.patch;
            let $3 = $2.children;
            if ($3 instanceof Empty) {
              let $4 = $2.changes;
              if ($4 instanceof Empty) {
                let $5 = $2.removed;
                if ($5 === 0) {
                  _block = children;
                } else {
                  _block = prepend(child.patch, children);
                }
              } else {
                _block = prepend(child.patch, children);
              }
            } else {
              _block = prepend(child.patch, children);
            }
            let children$1 = _block;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = changes;
            loop$children = children$1;
            loop$mapper = mapper;
            loop$events = child.events;
          } else {
            let next$1 = $1;
            let new_remaining = new$8.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let change = replace2(node_index - moved_offset, next$1);
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else if ($ instanceof Element) {
          let $1 = new$8.head;
          if ($1 instanceof Element) {
            let next$1 = $1;
            let prev$1 = $;
            if (prev$1.namespace === next$1.namespace && prev$1.tag === next$1.tag) {
              let new$1 = new$8.tail;
              let old$1 = old.tail;
              let composed_mapper = compose_mapper(
                mapper,
                next$1.mapper
              );
              let child_path = add2(path2, node_index, next$1.key);
              let controlled = is_controlled(
                events,
                next$1.namespace,
                next$1.tag,
                child_path
              );
              let $2 = diff_attributes(
                controlled,
                child_path,
                composed_mapper,
                events,
                prev$1.attributes,
                next$1.attributes,
                empty_list,
                empty_list
              );
              let added_attrs;
              let removed_attrs;
              let events$1;
              added_attrs = $2.added;
              removed_attrs = $2.removed;
              events$1 = $2.events;
              let _block;
              if (removed_attrs instanceof Empty && added_attrs instanceof Empty) {
                _block = empty_list;
              } else {
                _block = toList([update(added_attrs, removed_attrs)]);
              }
              let initial_child_changes = _block;
              let child = do_diff(
                prev$1.children,
                prev$1.keyed_children,
                next$1.children,
                next$1.keyed_children,
                empty2(),
                0,
                0,
                0,
                node_index,
                child_path,
                initial_child_changes,
                empty_list,
                composed_mapper,
                events$1
              );
              let _block$1;
              let $3 = child.patch;
              let $4 = $3.children;
              if ($4 instanceof Empty) {
                let $5 = $3.changes;
                if ($5 instanceof Empty) {
                  let $6 = $3.removed;
                  if ($6 === 0) {
                    _block$1 = children;
                  } else {
                    _block$1 = prepend(child.patch, children);
                  }
                } else {
                  _block$1 = prepend(child.patch, children);
                }
              } else {
                _block$1 = prepend(child.patch, children);
              }
              let children$1 = _block$1;
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = children$1;
              loop$mapper = mapper;
              loop$events = child.events;
            } else {
              let next$2 = $1;
              let new_remaining = new$8.tail;
              let prev$2 = $;
              let old_remaining = old.tail;
              let change = replace2(node_index - moved_offset, next$2);
              let _block;
              let _pipe = events;
              let _pipe$1 = remove_child(
                _pipe,
                path2,
                node_index,
                prev$2
              );
              _block = add_child(
                _pipe$1,
                mapper,
                path2,
                node_index,
                next$2
              );
              let events$1 = _block;
              loop$old = old_remaining;
              loop$old_keyed = old_keyed;
              loop$new = new_remaining;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = prepend(change, changes);
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events$1;
            }
          } else {
            let next$1 = $1;
            let new_remaining = new$8.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let change = replace2(node_index - moved_offset, next$1);
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else if ($ instanceof Text) {
          let $1 = new$8.head;
          if ($1 instanceof Text) {
            let next$1 = $1;
            let prev$1 = $;
            if (prev$1.content === next$1.content) {
              let new$1 = new$8.tail;
              let old$1 = old.tail;
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = children;
              loop$mapper = mapper;
              loop$events = events;
            } else {
              let next$2 = $1;
              let new$1 = new$8.tail;
              let old$1 = old.tail;
              let child = new$5(
                node_index,
                0,
                toList([replace_text(next$2.content)]),
                empty_list
              );
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$path = path2;
              loop$changes = changes;
              loop$children = prepend(child, children);
              loop$mapper = mapper;
              loop$events = events;
            }
          } else {
            let next$1 = $1;
            let new_remaining = new$8.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let change = replace2(node_index - moved_offset, next$1);
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        } else {
          let $1 = new$8.head;
          if ($1 instanceof UnsafeInnerHtml) {
            let next$1 = $1;
            let new$1 = new$8.tail;
            let prev$1 = $;
            let old$1 = old.tail;
            let composed_mapper = compose_mapper(mapper, next$1.mapper);
            let child_path = add2(path2, node_index, next$1.key);
            let $2 = diff_attributes(
              false,
              child_path,
              composed_mapper,
              events,
              prev$1.attributes,
              next$1.attributes,
              empty_list,
              empty_list
            );
            let added_attrs;
            let removed_attrs;
            let events$1;
            added_attrs = $2.added;
            removed_attrs = $2.removed;
            events$1 = $2.events;
            let _block;
            if (removed_attrs instanceof Empty && added_attrs instanceof Empty) {
              _block = empty_list;
            } else {
              _block = toList([update(added_attrs, removed_attrs)]);
            }
            let child_changes = _block;
            let _block$1;
            let $3 = prev$1.inner_html === next$1.inner_html;
            if ($3) {
              _block$1 = child_changes;
            } else {
              _block$1 = prepend(
                replace_inner_html(next$1.inner_html),
                child_changes
              );
            }
            let child_changes$1 = _block$1;
            let _block$2;
            if (child_changes$1 instanceof Empty) {
              _block$2 = children;
            } else {
              _block$2 = prepend(
                new$5(node_index, 0, child_changes$1, toList([])),
                children
              );
            }
            let children$1 = _block$2;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = changes;
            loop$children = children$1;
            loop$mapper = mapper;
            loop$events = events$1;
          } else {
            let next$1 = $1;
            let new_remaining = new$8.tail;
            let prev$1 = $;
            let old_remaining = old.tail;
            let change = replace2(node_index - moved_offset, next$1);
            let _block;
            let _pipe = events;
            let _pipe$1 = remove_child(_pipe, path2, node_index, prev$1);
            _block = add_child(
              _pipe$1,
              mapper,
              path2,
              node_index,
              next$1
            );
            let events$1 = _block;
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$path = path2;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$mapper = mapper;
            loop$events = events$1;
          }
        }
      }
    }
  }
}
function diff(events, old, new$8) {
  return do_diff(
    toList([old]),
    empty2(),
    toList([new$8]),
    empty2(),
    empty2(),
    0,
    0,
    0,
    0,
    root2,
    empty_list,
    empty_list,
    identity3,
    tick(events)
  );
}

// build/dev/javascript/lustre/lustre/vdom/reconciler.ffi.mjs
var setTimeout = globalThis.setTimeout;
var clearTimeout = globalThis.clearTimeout;
var createElementNS = (ns, name) => document2().createElementNS(ns, name);
var createTextNode = (data) => document2().createTextNode(data);
var createDocumentFragment = () => document2().createDocumentFragment();
var insertBefore = (parent, node, reference) => parent.insertBefore(node, reference);
var moveBefore = SUPPORTS_MOVE_BEFORE ? (parent, node, reference) => parent.moveBefore(node, reference) : insertBefore;
var removeChild = (parent, child) => parent.removeChild(child);
var getAttribute = (node, name) => node.getAttribute(name);
var setAttribute = (node, name, value2) => node.setAttribute(name, value2);
var removeAttribute = (node, name) => node.removeAttribute(name);
var addEventListener = (node, name, handler, options) => node.addEventListener(name, handler, options);
var removeEventListener = (node, name, handler) => node.removeEventListener(name, handler);
var setInnerHtml = (node, innerHtml) => node.innerHTML = innerHtml;
var setData = (node, data) => node.data = data;
var meta = Symbol("lustre");
var MetadataNode = class {
  constructor(kind, parent, node, key) {
    this.kind = kind;
    this.key = key;
    this.parent = parent;
    this.children = [];
    this.node = node;
    this.handlers = /* @__PURE__ */ new Map();
    this.throttles = /* @__PURE__ */ new Map();
    this.debouncers = /* @__PURE__ */ new Map();
  }
  get parentNode() {
    return this.kind === fragment_kind ? this.node.parentNode : this.node;
  }
};
var insertMetadataChild = (kind, parent, node, index5, key) => {
  const child = new MetadataNode(kind, parent, node, key);
  node[meta] = child;
  parent?.children.splice(index5, 0, child);
  return child;
};
var getPath = (node) => {
  let path2 = "";
  for (let current = node[meta]; current.parent; current = current.parent) {
    if (current.key) {
      path2 = `${separator_element}${current.key}${path2}`;
    } else {
      const index5 = current.parent.children.indexOf(current);
      path2 = `${separator_element}${index5}${path2}`;
    }
  }
  return path2.slice(1);
};
var Reconciler = class {
  #root = null;
  #dispatch = () => {
  };
  #useServerEvents = false;
  #exposeKeys = false;
  constructor(root3, dispatch, { useServerEvents = false, exposeKeys = false } = {}) {
    this.#root = root3;
    this.#dispatch = dispatch;
    this.#useServerEvents = useServerEvents;
    this.#exposeKeys = exposeKeys;
  }
  mount(vdom) {
    insertMetadataChild(element_kind, null, this.#root, 0, null);
    this.#insertChild(this.#root, null, this.#root[meta], 0, vdom);
  }
  push(patch) {
    this.#stack.push({ node: this.#root[meta], patch });
    this.#reconcile();
  }
  // PATCHING ------------------------------------------------------------------
  #stack = [];
  #reconcile() {
    const stack = this.#stack;
    while (stack.length) {
      const { node, patch } = stack.pop();
      const { children: childNodes } = node;
      const { changes, removed, children: childPatches } = patch;
      iterate(changes, (change) => this.#patch(node, change));
      if (removed) {
        this.#removeChildren(node, childNodes.length - removed, removed);
      }
      iterate(childPatches, (childPatch) => {
        const child = childNodes[childPatch.index | 0];
        this.#stack.push({ node: child, patch: childPatch });
      });
    }
  }
  #patch(node, change) {
    switch (change.kind) {
      case replace_text_kind:
        this.#replaceText(node, change);
        break;
      case replace_inner_html_kind:
        this.#replaceInnerHtml(node, change);
        break;
      case update_kind:
        this.#update(node, change);
        break;
      case move_kind:
        this.#move(node, change);
        break;
      case remove_kind:
        this.#remove(node, change);
        break;
      case replace_kind:
        this.#replace(node, change);
        break;
      case insert_kind:
        this.#insert(node, change);
        break;
    }
  }
  // CHANGES -------------------------------------------------------------------
  #insert(parent, { children, before }) {
    const fragment3 = createDocumentFragment();
    const beforeEl = this.#getReference(parent, before);
    this.#insertChildren(fragment3, null, parent, before | 0, children);
    insertBefore(parent.parentNode, fragment3, beforeEl);
  }
  #replace(parent, { index: index5, with: child }) {
    this.#removeChildren(parent, index5 | 0, 1);
    const beforeEl = this.#getReference(parent, index5);
    this.#insertChild(parent.parentNode, beforeEl, parent, index5 | 0, child);
  }
  #getReference(node, index5) {
    index5 = index5 | 0;
    const { children } = node;
    const childCount = children.length;
    if (index5 < childCount) {
      return children[index5].node;
    }
    let lastChild = children[childCount - 1];
    if (!lastChild && node.kind !== fragment_kind) return null;
    if (!lastChild) lastChild = node;
    while (lastChild.kind === fragment_kind && lastChild.children.length) {
      lastChild = lastChild.children[lastChild.children.length - 1];
    }
    return lastChild.node.nextSibling;
  }
  #move(parent, { key, before }) {
    before = before | 0;
    const { children, parentNode } = parent;
    const beforeEl = children[before].node;
    let prev = children[before];
    for (let i = before + 1; i < children.length; ++i) {
      const next = children[i];
      children[i] = prev;
      prev = next;
      if (next.key === key) {
        children[before] = next;
        break;
      }
    }
    const { kind, node, children: prevChildren } = prev;
    moveBefore(parentNode, node, beforeEl);
    if (kind === fragment_kind) {
      this.#moveChildren(parentNode, prevChildren, beforeEl);
    }
  }
  #moveChildren(domParent, children, beforeEl) {
    for (let i = 0; i < children.length; ++i) {
      const { kind, node, children: nestedChildren } = children[i];
      moveBefore(domParent, node, beforeEl);
      if (kind === fragment_kind) {
        this.#moveChildren(domParent, nestedChildren, beforeEl);
      }
    }
  }
  #remove(parent, { index: index5 }) {
    this.#removeChildren(parent, index5, 1);
  }
  #removeChildren(parent, index5, count) {
    const { children, parentNode } = parent;
    const deleted = children.splice(index5, count);
    for (let i = 0; i < deleted.length; ++i) {
      const { kind, node, children: nestedChildren } = deleted[i];
      removeChild(parentNode, node);
      this.#removeDebouncers(deleted[i]);
      if (kind === fragment_kind) {
        deleted.push(...nestedChildren);
      }
    }
  }
  #removeDebouncers(node) {
    const { debouncers, children } = node;
    for (const { timeout } of debouncers.values()) {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
    debouncers.clear();
    iterate(children, (child) => this.#removeDebouncers(child));
  }
  #update({ node, handlers, throttles, debouncers }, { added, removed }) {
    iterate(removed, ({ name }) => {
      if (handlers.delete(name)) {
        removeEventListener(node, name, handleEvent);
        this.#updateDebounceThrottle(throttles, name, 0);
        this.#updateDebounceThrottle(debouncers, name, 0);
      } else {
        removeAttribute(node, name);
        SYNCED_ATTRIBUTES[name]?.removed?.(node, name);
      }
    });
    iterate(added, (attribute3) => this.#createAttribute(node, attribute3));
  }
  #replaceText({ node }, { content }) {
    setData(node, content ?? "");
  }
  #replaceInnerHtml({ node }, { inner_html }) {
    setInnerHtml(node, inner_html ?? "");
  }
  // INSERT --------------------------------------------------------------------
  #insertChildren(domParent, beforeEl, metaParent, index5, children) {
    iterate(
      children,
      (child) => this.#insertChild(domParent, beforeEl, metaParent, index5++, child)
    );
  }
  #insertChild(domParent, beforeEl, metaParent, index5, vnode) {
    switch (vnode.kind) {
      case element_kind: {
        const node = this.#createElement(metaParent, index5, vnode);
        this.#insertChildren(node, null, node[meta], 0, vnode.children);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case text_kind: {
        const node = this.#createTextNode(metaParent, index5, vnode);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case fragment_kind: {
        const head = this.#createTextNode(metaParent, index5, vnode);
        insertBefore(domParent, head, beforeEl);
        this.#insertChildren(
          domParent,
          beforeEl,
          head[meta],
          0,
          vnode.children
        );
        break;
      }
      case unsafe_inner_html_kind: {
        const node = this.#createElement(metaParent, index5, vnode);
        this.#replaceInnerHtml({ node }, vnode);
        insertBefore(domParent, node, beforeEl);
        break;
      }
    }
  }
  #createElement(parent, index5, { kind, key, tag, namespace: namespace2, attributes }) {
    const node = createElementNS(namespace2 || NAMESPACE_HTML, tag);
    insertMetadataChild(kind, parent, node, index5, key);
    if (this.#exposeKeys && key) {
      setAttribute(node, "data-lustre-key", key);
    }
    iterate(attributes, (attribute3) => this.#createAttribute(node, attribute3));
    return node;
  }
  #createTextNode(parent, index5, { kind, key, content }) {
    const node = createTextNode(content ?? "");
    insertMetadataChild(kind, parent, node, index5, key);
    return node;
  }
  #createAttribute(node, attribute3) {
    const { debouncers, handlers, throttles } = node[meta];
    const {
      kind,
      name,
      value: value2,
      prevent_default: prevent,
      debounce: debounceDelay,
      throttle: throttleDelay
    } = attribute3;
    switch (kind) {
      case attribute_kind: {
        const valueOrDefault = value2 ?? "";
        if (name === "virtual:defaultValue") {
          node.defaultValue = valueOrDefault;
          return;
        }
        if (valueOrDefault !== getAttribute(node, name)) {
          setAttribute(node, name, valueOrDefault);
        }
        SYNCED_ATTRIBUTES[name]?.added?.(node, valueOrDefault);
        break;
      }
      case property_kind:
        node[name] = value2;
        break;
      case event_kind: {
        if (handlers.has(name)) {
          removeEventListener(node, name, handleEvent);
        }
        const passive = prevent.kind === never_kind;
        addEventListener(node, name, handleEvent, { passive });
        this.#updateDebounceThrottle(throttles, name, throttleDelay);
        this.#updateDebounceThrottle(debouncers, name, debounceDelay);
        handlers.set(name, (event4) => this.#handleEvent(attribute3, event4));
        break;
      }
    }
  }
  #updateDebounceThrottle(map6, name, delay) {
    const debounceOrThrottle = map6.get(name);
    if (delay > 0) {
      if (debounceOrThrottle) {
        debounceOrThrottle.delay = delay;
      } else {
        map6.set(name, { delay });
      }
    } else if (debounceOrThrottle) {
      const { timeout } = debounceOrThrottle;
      if (timeout) {
        clearTimeout(timeout);
      }
      map6.delete(name);
    }
  }
  #handleEvent(attribute3, event4) {
    const { currentTarget, type } = event4;
    const { debouncers, throttles } = currentTarget[meta];
    const path2 = getPath(currentTarget);
    const {
      prevent_default: prevent,
      stop_propagation: stop,
      include,
      immediate: immediate2
    } = attribute3;
    if (prevent.kind === always_kind) event4.preventDefault();
    if (stop.kind === always_kind) event4.stopPropagation();
    if (type === "submit") {
      event4.detail ??= {};
      event4.detail.formData = [...new FormData(event4.target).entries()];
    }
    const data = this.#useServerEvents ? createServerEvent(event4, include ?? []) : event4;
    const throttle = throttles.get(type);
    if (throttle) {
      const now = Date.now();
      const last = throttle.last || 0;
      if (now > last + throttle.delay) {
        throttle.last = now;
        throttle.lastEvent = event4;
        this.#dispatch(data, path2, type, immediate2);
      }
    }
    const debounce = debouncers.get(type);
    if (debounce) {
      clearTimeout(debounce.timeout);
      debounce.timeout = setTimeout(() => {
        if (event4 === throttles.get(type)?.lastEvent) return;
        this.#dispatch(data, path2, type, immediate2);
      }, debounce.delay);
    }
    if (!throttle && !debounce) {
      this.#dispatch(data, path2, type, immediate2);
    }
  }
};
var iterate = (list4, callback) => {
  if (Array.isArray(list4)) {
    for (let i = 0; i < list4.length; i++) {
      callback(list4[i]);
    }
  } else if (list4) {
    for (list4; list4.head; list4 = list4.tail) {
      callback(list4.head);
    }
  }
};
var handleEvent = (event4) => {
  const { currentTarget, type } = event4;
  const handler = currentTarget[meta].handlers.get(type);
  handler(event4);
};
var createServerEvent = (event4, include = []) => {
  const data = {};
  if (event4.type === "input" || event4.type === "change") {
    include.push("target.value");
  }
  if (event4.type === "submit") {
    include.push("detail.formData");
  }
  for (const property3 of include) {
    const path2 = property3.split(".");
    for (let i = 0, input2 = event4, output = data; i < path2.length; i++) {
      if (i === path2.length - 1) {
        output[path2[i]] = input2[path2[i]];
        break;
      }
      output = output[path2[i]] ??= {};
      input2 = input2[path2[i]];
    }
  }
  return data;
};
var syncedBooleanAttribute = /* @__NO_SIDE_EFFECTS__ */ (name) => {
  return {
    added(node) {
      node[name] = true;
    },
    removed(node) {
      node[name] = false;
    }
  };
};
var syncedAttribute = /* @__NO_SIDE_EFFECTS__ */ (name) => {
  return {
    added(node, value2) {
      node[name] = value2;
    }
  };
};
var SYNCED_ATTRIBUTES = {
  checked: /* @__PURE__ */ syncedBooleanAttribute("checked"),
  selected: /* @__PURE__ */ syncedBooleanAttribute("selected"),
  value: /* @__PURE__ */ syncedAttribute("value"),
  autofocus: {
    added(node) {
      queueMicrotask(() => {
        node.focus?.();
      });
    }
  },
  autoplay: {
    added(node) {
      try {
        node.play?.();
      } catch (e) {
        console.error(e);
      }
    }
  }
};

// build/dev/javascript/lustre/lustre/element/keyed.mjs
function do_extract_keyed_children(loop$key_children_pairs, loop$keyed_children, loop$children) {
  while (true) {
    let key_children_pairs = loop$key_children_pairs;
    let keyed_children = loop$keyed_children;
    let children = loop$children;
    if (key_children_pairs instanceof Empty) {
      return [keyed_children, reverse(children)];
    } else {
      let rest = key_children_pairs.tail;
      let key = key_children_pairs.head[0];
      let element$1 = key_children_pairs.head[1];
      let keyed_element = to_keyed(key, element$1);
      let _block;
      if (key === "") {
        _block = keyed_children;
      } else {
        _block = insert2(keyed_children, key, keyed_element);
      }
      let keyed_children$1 = _block;
      let children$1 = prepend(keyed_element, children);
      loop$key_children_pairs = rest;
      loop$keyed_children = keyed_children$1;
      loop$children = children$1;
    }
  }
}
function extract_keyed_children(children) {
  return do_extract_keyed_children(
    children,
    empty2(),
    empty_list
  );
}
function element3(tag, attributes, children) {
  let $ = extract_keyed_children(children);
  let keyed_children;
  let children$1;
  keyed_children = $[0];
  children$1 = $[1];
  return element(
    "",
    identity3,
    "",
    tag,
    attributes,
    children$1,
    keyed_children,
    false,
    false
  );
}
function namespaced2(namespace2, tag, attributes, children) {
  let $ = extract_keyed_children(children);
  let keyed_children;
  let children$1;
  keyed_children = $[0];
  children$1 = $[1];
  return element(
    "",
    identity3,
    namespace2,
    tag,
    attributes,
    children$1,
    keyed_children,
    false,
    false
  );
}
function fragment2(children) {
  let $ = extract_keyed_children(children);
  let keyed_children;
  let children$1;
  keyed_children = $[0];
  children$1 = $[1];
  return fragment("", identity3, children$1, keyed_children);
}

// build/dev/javascript/lustre/lustre/vdom/virtualise.ffi.mjs
var virtualise = (root3) => {
  const rootMeta = insertMetadataChild(element_kind, null, root3, 0, null);
  let virtualisableRootChildren = 0;
  for (let child = root3.firstChild; child; child = child.nextSibling) {
    if (canVirtualiseNode(child)) virtualisableRootChildren += 1;
  }
  if (virtualisableRootChildren === 0) {
    const placeholder2 = document2().createTextNode("");
    insertMetadataChild(text_kind, rootMeta, placeholder2, 0, null);
    root3.replaceChildren(placeholder2);
    return none2();
  }
  if (virtualisableRootChildren === 1) {
    const children2 = virtualiseChildNodes(rootMeta, root3);
    return children2.head[1];
  }
  const fragmentHead = document2().createTextNode("");
  const fragmentMeta = insertMetadataChild(fragment_kind, rootMeta, fragmentHead, 0, null);
  const children = virtualiseChildNodes(fragmentMeta, root3);
  root3.insertBefore(fragmentHead, root3.firstChild);
  return fragment2(children);
};
var canVirtualiseNode = (node) => {
  switch (node.nodeType) {
    case ELEMENT_NODE:
      return true;
    case TEXT_NODE:
      return !!node.data;
    default:
      return false;
  }
};
var virtualiseNode = (meta2, node, key, index5) => {
  if (!canVirtualiseNode(node)) {
    return null;
  }
  switch (node.nodeType) {
    case ELEMENT_NODE: {
      const childMeta = insertMetadataChild(element_kind, meta2, node, index5, key);
      const tag = node.localName;
      const namespace2 = node.namespaceURI;
      const isHtmlElement = !namespace2 || namespace2 === NAMESPACE_HTML;
      if (isHtmlElement && INPUT_ELEMENTS.includes(tag)) {
        virtualiseInputEvents(tag, node);
      }
      const attributes = virtualiseAttributes(node);
      const children = virtualiseChildNodes(childMeta, node);
      const vnode = isHtmlElement ? element3(tag, attributes, children) : namespaced2(namespace2, tag, attributes, children);
      return vnode;
    }
    case TEXT_NODE:
      insertMetadataChild(text_kind, meta2, node, index5, null);
      return text2(node.data);
    default:
      return null;
  }
};
var INPUT_ELEMENTS = ["input", "select", "textarea"];
var virtualiseInputEvents = (tag, node) => {
  const value2 = node.value;
  const checked = node.checked;
  if (tag === "input" && node.type === "checkbox" && !checked) return;
  if (tag === "input" && node.type === "radio" && !checked) return;
  if (node.type !== "checkbox" && node.type !== "radio" && !value2) return;
  queueMicrotask(() => {
    node.value = value2;
    node.checked = checked;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    if (document2().activeElement !== node) {
      node.dispatchEvent(new Event("blur", { bubbles: true }));
    }
  });
};
var virtualiseChildNodes = (meta2, node) => {
  let children = null;
  let child = node.firstChild;
  let ptr = null;
  let index5 = 0;
  while (child) {
    const key = child.nodeType === ELEMENT_NODE ? child.getAttribute("data-lustre-key") : null;
    if (key != null) {
      child.removeAttribute("data-lustre-key");
    }
    const vnode = virtualiseNode(meta2, child, key, index5);
    const next = child.nextSibling;
    if (vnode) {
      const list_node = new NonEmpty([key ?? "", vnode], null);
      if (ptr) {
        ptr = ptr.tail = list_node;
      } else {
        ptr = children = list_node;
      }
      index5 += 1;
    } else {
      node.removeChild(child);
    }
    child = next;
  }
  if (!ptr) return empty_list;
  ptr.tail = empty_list;
  return children;
};
var virtualiseAttributes = (node) => {
  let index5 = node.attributes.length;
  let attributes = empty_list;
  while (index5-- > 0) {
    const attr = node.attributes[index5];
    if (attr.name === "xmlns") {
      continue;
    }
    attributes = new NonEmpty(virtualiseAttribute(attr), attributes);
  }
  return attributes;
};
var virtualiseAttribute = (attr) => {
  const name = attr.localName;
  const value2 = attr.value;
  return attribute2(name, value2);
};

// build/dev/javascript/lustre/lustre/runtime/client/runtime.ffi.mjs
var is_browser = () => !!document2();
var Runtime = class {
  constructor(root3, [model, effects], view2, update3) {
    this.root = root3;
    this.#model = model;
    this.#view = view2;
    this.#update = update3;
    this.root.addEventListener("context-request", (event4) => {
      if (!(event4.context && event4.callback)) return;
      if (!this.#contexts.has(event4.context)) return;
      event4.stopImmediatePropagation();
      const context = this.#contexts.get(event4.context);
      if (event4.subscribe) {
        const callbackRef = new WeakRef(event4.callback);
        const unsubscribe = () => {
          context.subscribers = context.subscribers.filter(
            (subscriber) => subscriber !== callbackRef
          );
        };
        context.subscribers.push([callbackRef, unsubscribe]);
        event4.callback(context.value, unsubscribe);
      } else {
        event4.callback(context.value);
      }
    });
    this.#reconciler = new Reconciler(this.root, (event4, path2, name) => {
      const [events, result] = handle(this.#events, path2, name, event4);
      this.#events = events;
      if (result.isOk()) {
        const handler = result[0];
        if (handler.stop_propagation) event4.stopPropagation();
        if (handler.prevent_default) event4.preventDefault();
        this.dispatch(handler.message, false);
      }
    });
    this.#vdom = virtualise(this.root);
    this.#events = new$3();
    this.#shouldFlush = true;
    this.#tick(effects);
  }
  // PUBLIC API ----------------------------------------------------------------
  root = null;
  dispatch(msg, immediate2 = false) {
    this.#shouldFlush ||= immediate2;
    if (this.#shouldQueue) {
      this.#queue.push(msg);
    } else {
      const [model, effects] = this.#update(this.#model, msg);
      this.#model = model;
      this.#tick(effects);
    }
  }
  emit(event4, data) {
    const target = this.root.host ?? this.root;
    target.dispatchEvent(
      new CustomEvent(event4, {
        detail: data,
        bubbles: true,
        composed: true
      })
    );
  }
  // Provide a context value for any child nodes that request it using the given
  // key. If the key already exists, any existing subscribers will be notified
  // of the change. Otherwise, we store the value and wait for any `context-request`
  // events to come in.
  provide(key, value2) {
    if (!this.#contexts.has(key)) {
      this.#contexts.set(key, { value: value2, subscribers: [] });
    } else {
      const context = this.#contexts.get(key);
      context.value = value2;
      for (let i = context.subscribers.length - 1; i >= 0; i--) {
        const [subscriberRef, unsubscribe] = context.subscribers[i];
        const subscriber = subscriberRef.deref();
        if (!subscriber) {
          context.subscribers.splice(i, 1);
          continue;
        }
        subscriber(value2, unsubscribe);
      }
    }
  }
  // PRIVATE API ---------------------------------------------------------------
  #model;
  #view;
  #update;
  #vdom;
  #events;
  #reconciler;
  #contexts = /* @__PURE__ */ new Map();
  #shouldQueue = false;
  #queue = [];
  #beforePaint = empty_list;
  #afterPaint = empty_list;
  #renderTimer = null;
  #shouldFlush = false;
  #actions = {
    dispatch: (msg, immediate2) => this.dispatch(msg, immediate2),
    emit: (event4, data) => this.emit(event4, data),
    select: () => {
    },
    root: () => this.root,
    provide: (key, value2) => this.provide(key, value2)
  };
  // A `#tick` is where we process effects and trigger any synchronous updates.
  // Once a tick has been processed a render will be scheduled if none is already.
  // p0
  #tick(effects) {
    this.#shouldQueue = true;
    while (true) {
      for (let list4 = effects.synchronous; list4.tail; list4 = list4.tail) {
        list4.head(this.#actions);
      }
      this.#beforePaint = listAppend(this.#beforePaint, effects.before_paint);
      this.#afterPaint = listAppend(this.#afterPaint, effects.after_paint);
      if (!this.#queue.length) break;
      [this.#model, effects] = this.#update(this.#model, this.#queue.shift());
    }
    this.#shouldQueue = false;
    if (this.#shouldFlush) {
      cancelAnimationFrame(this.#renderTimer);
      this.#render();
    } else if (!this.#renderTimer) {
      this.#renderTimer = requestAnimationFrame(() => {
        this.#render();
      });
    }
  }
  #render() {
    this.#shouldFlush = false;
    this.#renderTimer = null;
    const next = this.#view(this.#model);
    const { patch, events } = diff(this.#events, this.#vdom, next);
    this.#events = events;
    this.#vdom = next;
    this.#reconciler.push(patch);
    if (this.#beforePaint instanceof NonEmpty) {
      const effects = makeEffect(this.#beforePaint);
      this.#beforePaint = empty_list;
      queueMicrotask(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
    if (this.#afterPaint instanceof NonEmpty) {
      const effects = makeEffect(this.#afterPaint);
      this.#afterPaint = empty_list;
      requestAnimationFrame(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
  }
};
function makeEffect(synchronous) {
  return {
    synchronous,
    after_paint: empty_list,
    before_paint: empty_list
  };
}
function listAppend(a, b) {
  if (a instanceof Empty) {
    return b;
  } else if (b instanceof Empty) {
    return a;
  } else {
    return append(a, b);
  }
}

// build/dev/javascript/lustre/lustre/runtime/server/runtime.mjs
var EffectDispatchedMessage = class extends CustomType {
  constructor(message2) {
    super();
    this.message = message2;
  }
};
var EffectEmitEvent = class extends CustomType {
  constructor(name, data) {
    super();
    this.name = name;
    this.data = data;
  }
};
var SystemRequestedShutdown = class extends CustomType {
};

// build/dev/javascript/lustre/lustre/component.mjs
var Config2 = class extends CustomType {
  constructor(open_shadow_root, adopt_styles, delegates_focus, attributes, properties, contexts, is_form_associated, on_form_autofill, on_form_reset, on_form_restore) {
    super();
    this.open_shadow_root = open_shadow_root;
    this.adopt_styles = adopt_styles;
    this.delegates_focus = delegates_focus;
    this.attributes = attributes;
    this.properties = properties;
    this.contexts = contexts;
    this.is_form_associated = is_form_associated;
    this.on_form_autofill = on_form_autofill;
    this.on_form_reset = on_form_reset;
    this.on_form_restore = on_form_restore;
  }
};
function new$6(options) {
  let init2 = new Config2(
    true,
    true,
    false,
    empty_list,
    empty_list,
    empty_list,
    false,
    option_none,
    option_none,
    option_none
  );
  return fold(
    options,
    init2,
    (config, option2) => {
      return option2.apply(config);
    }
  );
}

// build/dev/javascript/lustre/lustre/runtime/client/spa.ffi.mjs
var Spa = class {
  #runtime;
  constructor(root3, [init2, effects], update3, view2) {
    this.#runtime = new Runtime(root3, [init2, effects], view2, update3);
  }
  send(message2) {
    switch (message2.constructor) {
      case EffectDispatchedMessage: {
        this.dispatch(message2.message, false);
        break;
      }
      case EffectEmitEvent: {
        this.emit(message2.name, message2.data);
        break;
      }
      case SystemRequestedShutdown:
        break;
    }
  }
  dispatch(msg, immediate2) {
    this.#runtime.dispatch(msg, immediate2);
  }
  emit(event4, data) {
    this.#runtime.emit(event4, data);
  }
};
var start = ({ init: init2, update: update3, view: view2 }, selector, flags) => {
  if (!is_browser()) return new Error(new NotABrowser());
  const root3 = selector instanceof HTMLElement ? selector : document2().querySelector(selector);
  if (!root3) return new Error(new ElementNotFound(selector));
  return new Ok(new Spa(root3, init2(flags), update3, view2));
};

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init2, update3, view2, config) {
    super();
    this.init = init2;
    this.update = update3;
    this.view = view2;
    this.config = config;
  }
};
var ElementNotFound = class extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
};
var NotABrowser = class extends CustomType {
};
function application(init2, update3, view2) {
  return new App(init2, update3, view2, new$6(empty_list));
}
function start3(app, selector, start_args) {
  return guard(
    !is_browser(),
    new Error(new NotABrowser()),
    () => {
      return start(app, selector, start_args);
    }
  );
}

// build/dev/javascript/lustre/lustre/element/svg.mjs
var namespace = "http://www.w3.org/2000/svg";
function path(attrs) {
  return namespaced(namespace, "path", attrs, empty_list);
}

// build/dev/javascript/lustre/lustre/event.mjs
function is_immediate_event(name) {
  if (name === "input") {
    return true;
  } else if (name === "change") {
    return true;
  } else if (name === "focus") {
    return true;
  } else if (name === "focusin") {
    return true;
  } else if (name === "focusout") {
    return true;
  } else if (name === "blur") {
    return true;
  } else if (name === "select") {
    return true;
  } else {
    return false;
  }
}
function on(name, handler) {
  return event(
    name,
    map2(handler, (msg) => {
      return new Handler(false, false, msg);
    }),
    empty_list,
    never,
    never,
    is_immediate_event(name),
    0,
    0
  );
}
function on_click(msg) {
  return on("click", success(msg));
}
function on_input(msg) {
  return on(
    "input",
    subfield(
      toList(["target", "value"]),
      string2,
      (value2) => {
        return success(msg(value2));
      }
    )
  );
}

// build/dev/javascript/gleam_stdlib/gleam/uri.mjs
var Uri = class extends CustomType {
  constructor(scheme, userinfo, host, port, path2, query, fragment3) {
    super();
    this.scheme = scheme;
    this.userinfo = userinfo;
    this.host = host;
    this.port = port;
    this.path = path2;
    this.query = query;
    this.fragment = fragment3;
  }
};
function is_valid_host_within_brackets_char(char) {
  return 48 >= char && char <= 57 || 65 >= char && char <= 90 || 97 >= char && char <= 122 || char === 58 || char === 46;
}
function parse_fragment(rest, pieces) {
  return new Ok(
    new Uri(
      pieces.scheme,
      pieces.userinfo,
      pieces.host,
      pieces.port,
      pieces.path,
      pieces.query,
      new Some(rest)
    )
  );
}
function parse_query_with_question_mark_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("#")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_fragment(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let query = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          pieces.scheme,
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          new Some(query),
          pieces.fragment
        );
        return parse_fragment(rest, pieces$1);
      }
    } else if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          new Some(original),
          pieces.fragment
        )
      );
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_query_with_question_mark(uri_string, pieces) {
  return parse_query_with_question_mark_loop(uri_string, uri_string, pieces, 0);
}
function parse_path_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("?")) {
      let rest = uri_string.slice(1);
      let path2 = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        pieces.host,
        pieces.port,
        path2,
        pieces.query,
        pieces.fragment
      );
      return parse_query_with_question_mark(rest, pieces$1);
    } else if (uri_string.startsWith("#")) {
      let rest = uri_string.slice(1);
      let path2 = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        pieces.host,
        pieces.port,
        path2,
        pieces.query,
        pieces.fragment
      );
      return parse_fragment(rest, pieces$1);
    } else if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          pieces.host,
          pieces.port,
          original,
          pieces.query,
          pieces.fragment
        )
      );
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_path(uri_string, pieces) {
  return parse_path_loop(uri_string, uri_string, pieces, 0);
}
function parse_port_loop(loop$uri_string, loop$pieces, loop$port) {
  while (true) {
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let port = loop$port;
    if (uri_string.startsWith("0")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10;
    } else if (uri_string.startsWith("1")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 1;
    } else if (uri_string.startsWith("2")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 2;
    } else if (uri_string.startsWith("3")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 3;
    } else if (uri_string.startsWith("4")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 4;
    } else if (uri_string.startsWith("5")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 5;
    } else if (uri_string.startsWith("6")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 6;
    } else if (uri_string.startsWith("7")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 7;
    } else if (uri_string.startsWith("8")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 8;
    } else if (uri_string.startsWith("9")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 9;
    } else if (uri_string.startsWith("?")) {
      let rest = uri_string.slice(1);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        pieces.host,
        new Some(port),
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_query_with_question_mark(rest, pieces$1);
    } else if (uri_string.startsWith("#")) {
      let rest = uri_string.slice(1);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        pieces.host,
        new Some(port),
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_fragment(rest, pieces$1);
    } else if (uri_string.startsWith("/")) {
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        pieces.host,
        new Some(port),
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_path(uri_string, pieces$1);
    } else if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          pieces.host,
          new Some(port),
          pieces.path,
          pieces.query,
          pieces.fragment
        )
      );
    } else {
      return new Error(void 0);
    }
  }
}
function parse_port(uri_string, pieces) {
  if (uri_string.startsWith(":0")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 0);
  } else if (uri_string.startsWith(":1")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 1);
  } else if (uri_string.startsWith(":2")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 2);
  } else if (uri_string.startsWith(":3")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 3);
  } else if (uri_string.startsWith(":4")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 4);
  } else if (uri_string.startsWith(":5")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 5);
  } else if (uri_string.startsWith(":6")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 6);
  } else if (uri_string.startsWith(":7")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 7);
  } else if (uri_string.startsWith(":8")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 8);
  } else if (uri_string.startsWith(":9")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 9);
  } else if (uri_string.startsWith(":")) {
    return new Error(void 0);
  } else if (uri_string.startsWith("?")) {
    let rest = uri_string.slice(1);
    return parse_query_with_question_mark(rest, pieces);
  } else if (uri_string.startsWith("#")) {
    let rest = uri_string.slice(1);
    return parse_fragment(rest, pieces);
  } else if (uri_string.startsWith("/")) {
    return parse_path(uri_string, pieces);
  } else if (uri_string === "") {
    return new Ok(pieces);
  } else {
    return new Error(void 0);
  }
}
function parse_host_outside_of_brackets_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(original),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        )
      );
    } else if (uri_string.startsWith(":")) {
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(host),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_port(uri_string, pieces$1);
    } else if (uri_string.startsWith("/")) {
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(host),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_path(uri_string, pieces$1);
    } else if (uri_string.startsWith("?")) {
      let rest = uri_string.slice(1);
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(host),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_query_with_question_mark(rest, pieces$1);
    } else if (uri_string.startsWith("#")) {
      let rest = uri_string.slice(1);
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(host),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      );
      return parse_fragment(rest, pieces$1);
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_host_within_brackets_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(uri_string),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        )
      );
    } else if (uri_string.startsWith("]")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_port(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let host = string_codeunit_slice(original, 0, size2 + 1);
        let pieces$1 = new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(host),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_port(rest, pieces$1);
      }
    } else if (uri_string.startsWith("/")) {
      if (size2 === 0) {
        return parse_path(uri_string, pieces);
      } else {
        let host = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(host),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_path(uri_string, pieces$1);
      }
    } else if (uri_string.startsWith("?")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_query_with_question_mark(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let host = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(host),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_query_with_question_mark(rest, pieces$1);
      }
    } else if (uri_string.startsWith("#")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_fragment(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let host = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          pieces.scheme,
          pieces.userinfo,
          new Some(host),
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_fragment(rest, pieces$1);
      }
    } else {
      let $ = pop_codeunit(uri_string);
      let char;
      let rest;
      char = $[0];
      rest = $[1];
      let $1 = is_valid_host_within_brackets_char(char);
      if ($1) {
        loop$original = original;
        loop$uri_string = rest;
        loop$pieces = pieces;
        loop$size = size2 + 1;
      } else {
        return parse_host_outside_of_brackets_loop(
          original,
          original,
          pieces,
          0
        );
      }
    }
  }
}
function parse_host_within_brackets(uri_string, pieces) {
  return parse_host_within_brackets_loop(uri_string, uri_string, pieces, 0);
}
function parse_host_outside_of_brackets(uri_string, pieces) {
  return parse_host_outside_of_brackets_loop(uri_string, uri_string, pieces, 0);
}
function parse_host(uri_string, pieces) {
  if (uri_string.startsWith("[")) {
    return parse_host_within_brackets(uri_string, pieces);
  } else if (uri_string.startsWith(":")) {
    let pieces$1 = new Uri(
      pieces.scheme,
      pieces.userinfo,
      new Some(""),
      pieces.port,
      pieces.path,
      pieces.query,
      pieces.fragment
    );
    return parse_port(uri_string, pieces$1);
  } else if (uri_string === "") {
    return new Ok(
      new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(""),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      )
    );
  } else {
    return parse_host_outside_of_brackets(uri_string, pieces);
  }
}
function parse_userinfo_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("@")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_host(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let userinfo = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          pieces.scheme,
          new Some(userinfo),
          pieces.host,
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_host(rest, pieces$1);
      }
    } else if (uri_string === "") {
      return parse_host(original, pieces);
    } else if (uri_string.startsWith("/")) {
      return parse_host(original, pieces);
    } else if (uri_string.startsWith("?")) {
      return parse_host(original, pieces);
    } else if (uri_string.startsWith("#")) {
      return parse_host(original, pieces);
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_authority_pieces(string5, pieces) {
  return parse_userinfo_loop(string5, string5, pieces, 0);
}
function parse_authority_with_slashes(uri_string, pieces) {
  if (uri_string === "//") {
    return new Ok(
      new Uri(
        pieces.scheme,
        pieces.userinfo,
        new Some(""),
        pieces.port,
        pieces.path,
        pieces.query,
        pieces.fragment
      )
    );
  } else if (uri_string.startsWith("//")) {
    let rest = uri_string.slice(2);
    return parse_authority_pieces(rest, pieces);
  } else {
    return parse_path(uri_string, pieces);
  }
}
function parse_scheme_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("/")) {
      if (size2 === 0) {
        return parse_authority_with_slashes(uri_string, pieces);
      } else {
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          new Some(lowercase(scheme)),
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_authority_with_slashes(uri_string, pieces$1);
      }
    } else if (uri_string.startsWith("?")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_query_with_question_mark(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          new Some(lowercase(scheme)),
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_query_with_question_mark(rest, pieces$1);
      }
    } else if (uri_string.startsWith("#")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_fragment(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          new Some(lowercase(scheme)),
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_fragment(rest, pieces$1);
      }
    } else if (uri_string.startsWith(":")) {
      if (size2 === 0) {
        return new Error(void 0);
      } else {
        let rest = uri_string.slice(1);
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(
          new Some(lowercase(scheme)),
          pieces.userinfo,
          pieces.host,
          pieces.port,
          pieces.path,
          pieces.query,
          pieces.fragment
        );
        return parse_authority_with_slashes(rest, pieces$1);
      }
    } else if (uri_string === "") {
      return new Ok(
        new Uri(
          pieces.scheme,
          pieces.userinfo,
          pieces.host,
          pieces.port,
          original,
          pieces.query,
          pieces.fragment
        )
      );
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function to_string5(uri) {
  let _block;
  let $ = uri.fragment;
  if ($ instanceof Some) {
    let fragment3 = $[0];
    _block = toList(["#", fragment3]);
  } else {
    _block = toList([]);
  }
  let parts = _block;
  let _block$1;
  let $1 = uri.query;
  if ($1 instanceof Some) {
    let query = $1[0];
    _block$1 = prepend("?", prepend(query, parts));
  } else {
    _block$1 = parts;
  }
  let parts$1 = _block$1;
  let parts$2 = prepend(uri.path, parts$1);
  let _block$2;
  let $2 = uri.host;
  let $3 = starts_with(uri.path, "/");
  if (!$3 && $2 instanceof Some) {
    let host = $2[0];
    if (host !== "") {
      _block$2 = prepend("/", parts$2);
    } else {
      _block$2 = parts$2;
    }
  } else {
    _block$2 = parts$2;
  }
  let parts$3 = _block$2;
  let _block$3;
  let $4 = uri.host;
  let $5 = uri.port;
  if ($5 instanceof Some && $4 instanceof Some) {
    let port = $5[0];
    _block$3 = prepend(":", prepend(to_string(port), parts$3));
  } else {
    _block$3 = parts$3;
  }
  let parts$4 = _block$3;
  let _block$4;
  let $6 = uri.scheme;
  let $7 = uri.userinfo;
  let $8 = uri.host;
  if ($8 instanceof Some) {
    if ($7 instanceof Some) {
      if ($6 instanceof Some) {
        let h = $8[0];
        let u = $7[0];
        let s = $6[0];
        _block$4 = prepend(
          s,
          prepend(
            "://",
            prepend(u, prepend("@", prepend(h, parts$4)))
          )
        );
      } else {
        _block$4 = parts$4;
      }
    } else if ($6 instanceof Some) {
      let h = $8[0];
      let s = $6[0];
      _block$4 = prepend(s, prepend("://", prepend(h, parts$4)));
    } else {
      let h = $8[0];
      _block$4 = prepend("//", prepend(h, parts$4));
    }
  } else if ($7 instanceof Some) {
    if ($6 instanceof Some) {
      let s = $6[0];
      _block$4 = prepend(s, prepend(":", parts$4));
    } else {
      _block$4 = parts$4;
    }
  } else if ($6 instanceof Some) {
    let s = $6[0];
    _block$4 = prepend(s, prepend(":", parts$4));
  } else {
    _block$4 = parts$4;
  }
  let parts$5 = _block$4;
  return concat2(parts$5);
}
var empty3 = /* @__PURE__ */ new Uri(
  /* @__PURE__ */ new None(),
  /* @__PURE__ */ new None(),
  /* @__PURE__ */ new None(),
  /* @__PURE__ */ new None(),
  "",
  /* @__PURE__ */ new None(),
  /* @__PURE__ */ new None()
);
function parse2(uri_string) {
  return parse_scheme_loop(uri_string, uri_string, empty3, 0);
}

// build/dev/javascript/gleam_http/gleam/http.mjs
var Get = class extends CustomType {
};
var Post = class extends CustomType {
};
var Head = class extends CustomType {
};
var Put = class extends CustomType {
};
var Delete = class extends CustomType {
};
var Trace = class extends CustomType {
};
var Connect = class extends CustomType {
};
var Options = class extends CustomType {
};
var Patch2 = class extends CustomType {
};
var Http = class extends CustomType {
};
var Https = class extends CustomType {
};
function method_to_string(method) {
  if (method instanceof Get) {
    return "GET";
  } else if (method instanceof Post) {
    return "POST";
  } else if (method instanceof Head) {
    return "HEAD";
  } else if (method instanceof Put) {
    return "PUT";
  } else if (method instanceof Delete) {
    return "DELETE";
  } else if (method instanceof Trace) {
    return "TRACE";
  } else if (method instanceof Connect) {
    return "CONNECT";
  } else if (method instanceof Options) {
    return "OPTIONS";
  } else if (method instanceof Patch2) {
    return "PATCH";
  } else {
    let s = method[0];
    return s;
  }
}
function scheme_to_string(scheme) {
  if (scheme instanceof Http) {
    return "http";
  } else {
    return "https";
  }
}
function scheme_from_string(scheme) {
  let $ = lowercase(scheme);
  if ($ === "http") {
    return new Ok(new Http());
  } else if ($ === "https") {
    return new Ok(new Https());
  } else {
    return new Error(void 0);
  }
}

// build/dev/javascript/gleam_http/gleam/http/request.mjs
var Request = class extends CustomType {
  constructor(method, headers, body, scheme, host, port, path2, query) {
    super();
    this.method = method;
    this.headers = headers;
    this.body = body;
    this.scheme = scheme;
    this.host = host;
    this.port = port;
    this.path = path2;
    this.query = query;
  }
};
function to_uri(request) {
  return new Uri(
    new Some(scheme_to_string(request.scheme)),
    new None(),
    new Some(request.host),
    request.port,
    request.path,
    request.query,
    new None()
  );
}
function from_uri(uri) {
  return try$(
    (() => {
      let _pipe = uri.scheme;
      let _pipe$1 = unwrap(_pipe, "");
      return scheme_from_string(_pipe$1);
    })(),
    (scheme) => {
      return try$(
        (() => {
          let _pipe = uri.host;
          return to_result(_pipe, void 0);
        })(),
        (host) => {
          let req = new Request(
            new Get(),
            toList([]),
            "",
            scheme,
            host,
            uri.port,
            uri.path,
            uri.query
          );
          return new Ok(req);
        }
      );
    }
  );
}
function set_header(request, key, value2) {
  let headers = key_set(request.headers, lowercase(key), value2);
  return new Request(
    request.method,
    headers,
    request.body,
    request.scheme,
    request.host,
    request.port,
    request.path,
    request.query
  );
}
function set_body(req, body) {
  let method;
  let headers;
  let scheme;
  let host;
  let port;
  let path2;
  let query;
  method = req.method;
  headers = req.headers;
  scheme = req.scheme;
  host = req.host;
  port = req.port;
  path2 = req.path;
  query = req.query;
  return new Request(method, headers, body, scheme, host, port, path2, query);
}
function set_method(req, method) {
  return new Request(
    method,
    req.headers,
    req.body,
    req.scheme,
    req.host,
    req.port,
    req.path,
    req.query
  );
}

// build/dev/javascript/gleam_http/gleam/http/response.mjs
var Response = class extends CustomType {
  constructor(status, headers, body) {
    super();
    this.status = status;
    this.headers = headers;
    this.body = body;
  }
};
function get_header(response, key) {
  return key_find(response.headers, lowercase(key));
}

// build/dev/javascript/gleam_javascript/gleam_javascript_ffi.mjs
var PromiseLayer = class _PromiseLayer {
  constructor(promise) {
    this.promise = promise;
  }
  static wrap(value2) {
    return value2 instanceof Promise ? new _PromiseLayer(value2) : value2;
  }
  static unwrap(value2) {
    return value2 instanceof _PromiseLayer ? value2.promise : value2;
  }
};
function resolve(value2) {
  return Promise.resolve(PromiseLayer.wrap(value2));
}
function then_await(promise, fn) {
  return promise.then((value2) => fn(PromiseLayer.unwrap(value2)));
}
function map_promise(promise, fn) {
  return promise.then(
    (value2) => PromiseLayer.wrap(fn(PromiseLayer.unwrap(value2)))
  );
}

// build/dev/javascript/gleam_javascript/gleam/javascript/promise.mjs
function tap(promise, callback) {
  let _pipe = promise;
  return map_promise(
    _pipe,
    (a) => {
      callback(a);
      return a;
    }
  );
}
function try_await(promise, callback) {
  let _pipe = promise;
  return then_await(
    _pipe,
    (result) => {
      if (result instanceof Ok) {
        let a = result[0];
        return callback(a);
      } else {
        let e = result[0];
        return resolve(new Error(e));
      }
    }
  );
}

// build/dev/javascript/gleam_fetch/gleam_fetch_ffi.mjs
async function raw_send(request) {
  try {
    return new Ok(await fetch(request));
  } catch (error) {
    return new Error(new NetworkError(error.toString()));
  }
}
function from_fetch_response(response) {
  return new Response(
    response.status,
    List.fromArray([...response.headers]),
    response
  );
}
function request_common(request) {
  let url = to_string5(to_uri(request));
  let method = method_to_string(request.method).toUpperCase();
  let options = {
    headers: make_headers(request.headers),
    method
  };
  return [url, options];
}
function to_fetch_request(request) {
  let [url, options] = request_common(request);
  if (options.method !== "GET" && options.method !== "HEAD") options.body = request.body;
  return new globalThis.Request(url, options);
}
function make_headers(headersList) {
  let headers = new globalThis.Headers();
  for (let [k, v] of headersList) headers.append(k.toLowerCase(), v);
  return headers;
}
async function read_text_body(response) {
  let body;
  try {
    body = await response.body.text();
  } catch (error) {
    return new Error(new UnableToReadBody());
  }
  return new Ok(response.withFields({ body }));
}

// build/dev/javascript/gleam_fetch/gleam/fetch.mjs
var NetworkError = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UnableToReadBody = class extends CustomType {
};
function send2(request) {
  let _pipe = request;
  let _pipe$1 = to_fetch_request(_pipe);
  let _pipe$2 = raw_send(_pipe$1);
  return try_await(
    _pipe$2,
    (resp) => {
      return resolve(new Ok(from_fetch_response(resp)));
    }
  );
}

// build/dev/javascript/rsvp/rsvp.ffi.mjs
var from_relative_url = (url_string) => {
  if (!globalThis.location) return new Error(void 0);
  const url = new URL(url_string, globalThis.location.href);
  const uri = uri_from_url(url);
  return new Ok(uri);
};
var uri_from_url = (url) => {
  const optional2 = (value2) => value2 ? new Some(value2) : new None();
  return new Uri(
    /* scheme   */
    optional2(url.protocol?.slice(0, -1)),
    /* userinfo */
    new None(),
    /* host     */
    optional2(url.hostname),
    /* port     */
    optional2(url.port && Number(url.port)),
    /* path     */
    url.pathname,
    /* query    */
    optional2(url.search?.slice(1)),
    /* fragment */
    optional2(url.hash?.slice(1))
  );
};

// build/dev/javascript/rsvp/rsvp.mjs
var BadBody = class extends CustomType {
};
var BadUrl = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var HttpError = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var JsonError = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var NetworkError2 = class extends CustomType {
};
var UnhandledResponse = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var Handler2 = class extends CustomType {
  constructor(run2) {
    super();
    this.run = run2;
  }
};
function expect_ok_response(handler) {
  return new Handler2(
    (result) => {
      return handler(
        try$(
          result,
          (response) => {
            let $ = response.status;
            let code = $;
            if (code >= 200 && code < 300) {
              return new Ok(response);
            } else {
              let code$1 = $;
              if (code$1 >= 400 && code$1 < 600) {
                return new Error(new HttpError(response));
              } else {
                return new Error(new UnhandledResponse(response));
              }
            }
          }
        )
      );
    }
  );
}
function expect_json_response(handler) {
  return expect_ok_response(
    (result) => {
      return handler(
        try$(
          result,
          (response) => {
            let $ = get_header(response, "content-type");
            if ($ instanceof Ok) {
              let $1 = $[0];
              if ($1 === "application/json") {
                return new Ok(response);
              } else if ($1.startsWith("application/json;")) {
                return new Ok(response);
              } else {
                return new Error(new UnhandledResponse(response));
              }
            } else {
              return new Error(new UnhandledResponse(response));
            }
          }
        )
      );
    }
  );
}
function do_send(request, handler) {
  return from(
    (dispatch) => {
      let _pipe = send2(request);
      let _pipe$1 = try_await(_pipe, read_text_body);
      let _pipe$2 = map_promise(
        _pipe$1,
        (_capture) => {
          return map_error(
            _capture,
            (error) => {
              if (error instanceof NetworkError) {
                return new NetworkError2();
              } else if (error instanceof UnableToReadBody) {
                return new BadBody();
              } else {
                return new BadBody();
              }
            }
          );
        }
      );
      let _pipe$3 = map_promise(_pipe$2, handler.run);
      tap(_pipe$3, dispatch);
      return void 0;
    }
  );
}
function send3(request, handler) {
  return do_send(request, handler);
}
function reject(err, handler) {
  return from(
    (dispatch) => {
      let _pipe = new Error(err);
      let _pipe$1 = handler.run(_pipe);
      return dispatch(_pipe$1);
    }
  );
}
function decode_json_body(response, decoder) {
  let _pipe = response.body;
  let _pipe$1 = parse(_pipe, decoder);
  return map_error(_pipe$1, (var0) => {
    return new JsonError(var0);
  });
}
function expect_json(decoder, handler) {
  return expect_json_response(
    (result) => {
      let _pipe = result;
      let _pipe$1 = try$(
        _pipe,
        (_capture) => {
          return decode_json_body(_capture, decoder);
        }
      );
      return handler(_pipe$1);
    }
  );
}
function to_uri2(uri_string) {
  let _block;
  if (uri_string.startsWith("./")) {
    _block = from_relative_url(uri_string);
  } else if (uri_string.startsWith("/")) {
    _block = from_relative_url(uri_string);
  } else {
    _block = parse2(uri_string);
  }
  let _pipe = _block;
  return replace_error(_pipe, new BadUrl(uri_string));
}
function get2(url, handler) {
  let $ = to_uri2(url);
  if ($ instanceof Ok) {
    let uri = $[0];
    let _pipe = from_uri(uri);
    let _pipe$1 = map3(
      _pipe,
      (_capture) => {
        return send3(_capture, handler);
      }
    );
    let _pipe$2 = map_error(
      _pipe$1,
      (_) => {
        return reject(new BadUrl(url), handler);
      }
    );
    return unwrap_both(_pipe$2);
  } else {
    let err = $[0];
    return reject(err, handler);
  }
}
function post(url, body, handler) {
  let $ = to_uri2(url);
  if ($ instanceof Ok) {
    let uri = $[0];
    let _pipe = from_uri(uri);
    let _pipe$1 = map3(
      _pipe,
      (request) => {
        let _pipe$12 = request;
        let _pipe$22 = set_method(_pipe$12, new Post());
        let _pipe$3 = set_header(
          _pipe$22,
          "content-type",
          "application/json"
        );
        let _pipe$4 = set_body(_pipe$3, to_string2(body));
        return send3(_pipe$4, handler);
      }
    );
    let _pipe$2 = map_error(
      _pipe$1,
      (_) => {
        return reject(new BadUrl(url), handler);
      }
    );
    return unwrap_both(_pipe$2);
  } else {
    let err = $[0];
    return reject(err, handler);
  }
}

// build/dev/javascript/frontend/app.ffi.mjs
function getCurrentTimestamp() {
  return Date.now();
}
function setupDragAndDropListener(handler) {
  document.removeEventListener("itemStatusChanged", window.gleamDragDropHandler);
  window.gleamDragDropHandler = function(event4) {
    const { id: id2, type, newStatus } = event4.detail;
    handler([type, id2, newStatus]);
  };
  document.addEventListener("itemStatusChanged", window.gleamDragDropHandler);
}
function clearDragUpdateState(itemType, itemId) {
  const element4 = document.querySelector(`[data-type="${itemType}"][data-id="${itemId}"]`);
  if (element4 && element4.style) {
    element4.style.opacity = "";
    element4.style.filter = "";
    element4.classList.remove("api-updating");
  }
}

// build/dev/javascript/frontend/colors.mjs
var MaterialColor = class extends CustomType {
  constructor(name, bg_class, text_class, border_class, hover_class) {
    super();
    this.name = name;
    this.bg_class = bg_class;
    this.text_class = text_class;
    this.border_class = border_class;
    this.hover_class = hover_class;
  }
};
function get_material_colors() {
  return toList([
    new MaterialColor(
      "red",
      "bg-rose-500",
      "text-white",
      "border-rose-600",
      "hover:bg-rose-600"
    ),
    new MaterialColor(
      "pink",
      "bg-fuchsia-300",
      "text-black",
      "border-fuchsia-400",
      "hover:bg-fuchsia-400"
    ),
    new MaterialColor(
      "purple",
      "bg-purple-500",
      "text-white",
      "border-purple-600",
      "hover:bg-purple-600"
    ),
    new MaterialColor(
      "deep-purple",
      "bg-violet-600",
      "text-white",
      "border-violet-700",
      "hover:bg-violet-700"
    ),
    new MaterialColor(
      "indigo",
      "bg-indigo-500",
      "text-white",
      "border-indigo-600",
      "hover:bg-indigo-600"
    ),
    new MaterialColor(
      "blue",
      "bg-blue-500",
      "text-white",
      "border-blue-600",
      "hover:bg-blue-600"
    ),
    new MaterialColor(
      "light-blue",
      "bg-sky-400",
      "text-white",
      "border-sky-500",
      "hover:bg-sky-500"
    ),
    new MaterialColor(
      "cyan",
      "bg-cyan-500",
      "text-white",
      "border-cyan-600",
      "hover:bg-cyan-600"
    ),
    new MaterialColor(
      "teal",
      "bg-teal-500",
      "text-white",
      "border-teal-600",
      "hover:bg-teal-600"
    ),
    new MaterialColor(
      "green",
      "bg-green-500",
      "text-white",
      "border-green-600",
      "hover:bg-green-600"
    ),
    new MaterialColor(
      "light-green",
      "bg-lime-500",
      "text-white",
      "border-lime-600",
      "hover:bg-lime-600"
    ),
    new MaterialColor(
      "lime",
      "bg-lime-400",
      "text-black",
      "border-lime-500",
      "hover:bg-lime-500"
    ),
    new MaterialColor(
      "yellow",
      "bg-yellow-400",
      "text-black",
      "border-yellow-500",
      "hover:bg-yellow-500"
    ),
    new MaterialColor(
      "amber",
      "bg-amber-500",
      "text-black",
      "border-amber-600",
      "hover:bg-amber-600"
    ),
    new MaterialColor(
      "orange",
      "bg-orange-500",
      "text-white",
      "border-orange-600",
      "hover:bg-orange-600"
    ),
    new MaterialColor(
      "deep-orange",
      "bg-orange-600",
      "text-white",
      "border-orange-700",
      "hover:bg-orange-700"
    )
  ]);
}
function get_color_by_name(color_name) {
  let _pipe = get_material_colors();
  let _pipe$1 = find2(
    _pipe,
    (color) => {
      return color.name === color_name;
    }
  );
  return unwrap2(
    _pipe$1,
    new MaterialColor(
      "blue",
      "bg-blue-500",
      "text-white",
      "border-blue-600",
      "hover:bg-blue-600"
    )
  );
}
function get_project_color_classes(color_name) {
  let color = get_color_by_name(color_name);
  return color.bg_class + " " + color.text_class + " " + color.border_class;
}
function get_project_badge_classes(color_name) {
  let color = get_color_by_name(color_name);
  return "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium " + color.bg_class + " " + color.text_class;
}

// build/dev/javascript/frontend/types.mjs
var DashboardStats = class extends CustomType {
  constructor(total_projects, active_projects, completed_tasks, pending_tasks, team_members, total_hours) {
    super();
    this.total_projects = total_projects;
    this.active_projects = active_projects;
    this.completed_tasks = completed_tasks;
    this.pending_tasks = pending_tasks;
    this.team_members = team_members;
    this.total_hours = total_hours;
  }
};
var Project = class extends CustomType {
  constructor(id2, name, description, deadline, status, color, created_at) {
    super();
    this.id = id2;
    this.name = name;
    this.description = description;
    this.deadline = deadline;
    this.status = status;
    this.color = color;
    this.created_at = created_at;
  }
};
var Task = class extends CustomType {
  constructor(id2, project_id, title2, description, assigned_to, status, priority, due_date, hours_logged) {
    super();
    this.id = id2;
    this.project_id = project_id;
    this.title = title2;
    this.description = description;
    this.assigned_to = assigned_to;
    this.status = status;
    this.priority = priority;
    this.due_date = due_date;
    this.hours_logged = hours_logged;
  }
};
var TeamMember = class extends CustomType {
  constructor(id2, name, email, role) {
    super();
    this.id = id2;
    this.name = name;
    this.email = email;
    this.role = role;
  }
};
var CacheInfo = class extends CustomType {
  constructor(is_loading, last_fetched, is_valid) {
    super();
    this.is_loading = is_loading;
    this.last_fetched = last_fetched;
    this.is_valid = is_valid;
  }
};
var LoadingStates = class extends CustomType {
  constructor(dashboard, projects, tasks, team) {
    super();
    this.dashboard = dashboard;
    this.projects = projects;
    this.tasks = tasks;
    this.team = team;
  }
};
var DashboardView = class extends CustomType {
};
var ProjectsView = class extends CustomType {
};
var TasksView = class extends CustomType {
  constructor(project_id) {
    super();
    this.project_id = project_id;
  }
};
var TeamView = class extends CustomType {
};
var ProjectForm = class extends CustomType {
  constructor(name, description, deadline, status, color) {
    super();
    this.name = name;
    this.description = description;
    this.deadline = deadline;
    this.status = status;
    this.color = color;
  }
};
var TaskForm = class extends CustomType {
  constructor(project_id, title2, description, status, priority, assigned_to, due_date, hours_logged) {
    super();
    this.project_id = project_id;
    this.title = title2;
    this.description = description;
    this.status = status;
    this.priority = priority;
    this.assigned_to = assigned_to;
    this.due_date = due_date;
    this.hours_logged = hours_logged;
  }
};
var NoForm = class extends CustomType {
};
var ShowingProjectForm = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var ShowingTaskForm = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var EditingProject = class extends CustomType {
  constructor($0, $1) {
    super();
    this[0] = $0;
    this[1] = $1;
  }
};
var EditingTask = class extends CustomType {
  constructor($0, $1) {
    super();
    this[0] = $0;
    this[1] = $1;
  }
};

// build/dev/javascript/frontend/pages/dashboard.mjs
function stat_card(title2, value2, color_class) {
  return div(
    toList([
      class$(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-md dark:hover:shadow-gray-700/40 p-6 transition-all duration-300 transform hover:scale-105"
      )
    ]),
    toList([
      div(
        toList([class$("flex items-center")]),
        toList([
          div(
            toList([class$("flex-shrink-0")]),
            toList([
              div(
                toList([
                  class$(
                    "w-8 h-8 " + color_class + " rounded-full animate-pulse"
                  )
                ]),
                toList([])
              )
            ])
          ),
          div(
            toList([class$("ml-4")]),
            toList([
              p(
                toList([
                  class$(
                    "text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors duration-300"
                  )
                ]),
                toList([text3(title2)])
              ),
              p(
                toList([
                  class$(
                    "text-2xl font-semibold text-gray-900 dark:text-white transition-colors duration-300"
                  )
                ]),
                toList([text3(value2)])
              )
            ])
          )
        ])
      )
    ])
  );
}
function view_recent_projects(projects, on_navigate) {
  return div(
    toList([
      class$(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-md dark:hover:shadow-gray-700/40 p-6 transition-all duration-300 border border-transparent dark:border-gray-700"
      )
    ]),
    toList([
      div(
        toList([class$("flex items-center justify-between mb-4")]),
        toList([
          h3(
            toList([
              class$(
                "text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300"
              )
            ]),
            toList([text3("Recent Projects")])
          ),
          button(
            toList([
              class$(
                "text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 font-medium transition-colors duration-300 text-sm"
              ),
              on_click(on_navigate)
            ]),
            toList([text3("View All \u2192")])
          )
        ])
      ),
      div(
        toList([class$("space-y-3")]),
        (() => {
          let _pipe = take(projects, 5);
          return map(
            _pipe,
            (project) => {
              let color_classes = get_project_color_classes(
                project.color
              );
              let color_info = get_color_by_name(project.color);
              return div(
                toList([
                  class$(
                    "flex items-center justify-between p-3 rounded-lg hover:opacity-90 transition-all duration-300 border-2 " + color_classes
                  )
                ]),
                toList([
                  div(
                    toList([]),
                    toList([
                      p(
                        toList([
                          class$(
                            "font-medium transition-colors duration-300 " + color_info.text_class
                          )
                        ]),
                        toList([text3(project.name)])
                      ),
                      p(
                        toList([
                          class$(
                            "text-sm transition-colors duration-300 " + color_info.text_class + " opacity-80"
                          )
                        ]),
                        toList([text3(project.status)])
                      )
                    ])
                  ),
                  span(
                    toList([
                      class$(
                        "text-xs transition-colors duration-300 " + color_info.text_class + " opacity-70"
                      )
                    ]),
                    toList([text3(project.deadline)])
                  )
                ])
              );
            }
          );
        })()
      )
    ])
  );
}
function view_recent_tasks(tasks, on_navigate) {
  return div(
    toList([
      class$(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-md dark:hover:shadow-gray-700/40 p-6 transition-all duration-300 border border-transparent dark:border-gray-700"
      )
    ]),
    toList([
      div(
        toList([class$("flex items-center justify-between mb-4")]),
        toList([
          h3(
            toList([
              class$(
                "text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300"
              )
            ]),
            toList([text3("Recent Tasks")])
          ),
          button(
            toList([
              class$(
                "text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 font-medium transition-colors duration-300 text-sm"
              ),
              on_click(on_navigate)
            ]),
            toList([text3("View All \u2192")])
          )
        ])
      ),
      div(
        toList([class$("space-y-3")]),
        (() => {
          let _pipe = take(tasks, 5);
          return map(
            _pipe,
            (task) => {
              return div(
                toList([
                  class$(
                    "flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-300 border border-gray-100 dark:border-gray-600"
                  )
                ]),
                toList([
                  div(
                    toList([]),
                    toList([
                      p(
                        toList([
                          class$(
                            "font-medium text-gray-900 dark:text-white transition-colors duration-300"
                          )
                        ]),
                        toList([text3(task.title)])
                      ),
                      p(
                        toList([
                          class$(
                            "text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300"
                          )
                        ]),
                        toList([
                          text3(task.priority + " \xB7 " + task.status)
                        ])
                      )
                    ])
                  ),
                  span(
                    toList([
                      class$(
                        "text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300"
                      )
                    ]),
                    toList([
                      text3(
                        (() => {
                          let $ = task.due_date;
                          if ($ instanceof Some) {
                            let date = $[0];
                            return date;
                          } else {
                            return "No due date";
                          }
                        })()
                      )
                    ])
                  )
                ])
              );
            }
          );
        })()
      )
    ])
  );
}
function view_dashboard(dashboard, projects, tasks, loading_states, on_refresh, on_navigate_to_projects, on_navigate_to_tasks, _) {
  let is_loading = loading_states.dashboard.is_loading || loading_states.projects.is_loading || loading_states.tasks.is_loading;
  return div(
    toList([class$("space-y-6")]),
    toList([
      div(
        toList([class$("flex items-center justify-between")]),
        toList([
          h2(
            toList([
              class$(
                "text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300"
              )
            ]),
            toList([text3("Dashboard")])
          ),
          button(
            toList([
              class$(
                "bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105" + (() => {
                  if (is_loading) {
                    return " opacity-50 cursor-not-allowed";
                  } else {
                    return "";
                  }
                })()
              ),
              on_click(on_refresh),
              (() => {
                if (is_loading) {
                  return disabled(true);
                } else {
                  return disabled(false);
                }
              })()
            ]),
            toList([
              text3(
                (() => {
                  if (is_loading) {
                    return "Loading...";
                  } else {
                    return "Refresh Data";
                  }
                })()
              )
            ])
          )
        ])
      ),
      (() => {
        if (is_loading) {
          return div(
            toList([
              class$(
                "bg-cyan-50 dark:bg-cyan-900 border border-cyan-200 dark:border-cyan-700 rounded-lg p-4 transition-colors duration-300"
              )
            ]),
            toList([
              div(
                toList([class$("flex items-center")]),
                toList([
                  div(
                    toList([
                      class$(
                        "animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600 dark:border-cyan-400 mr-3"
                      )
                    ]),
                    toList([])
                  ),
                  p(
                    toList([
                      class$("text-cyan-800 dark:text-cyan-200")
                    ]),
                    toList([text3("Refreshing dashboard data...")])
                  )
                ])
              )
            ])
          );
        } else {
          return div(toList([]), toList([]));
        }
      })(),
      div(
        toList([
          class$(
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          )
        ]),
        toList([
          stat_card(
            "Total Projects",
            to_string(dashboard.total_projects),
            "bg-cyan-500"
          ),
          stat_card(
            "Active Projects",
            to_string(dashboard.active_projects),
            "bg-green-500"
          ),
          stat_card(
            "Completed Tasks",
            to_string(dashboard.completed_tasks),
            "bg-purple-500"
          ),
          stat_card(
            "Pending Tasks",
            to_string(dashboard.pending_tasks),
            "bg-orange-500"
          ),
          stat_card(
            "Team Members",
            to_string(dashboard.team_members),
            "bg-indigo-500"
          ),
          stat_card(
            "Total Hours",
            float_to_string(dashboard.total_hours),
            "bg-pink-500"
          )
        ])
      ),
      div(
        toList([class$("grid grid-cols-1 lg:grid-cols-2 gap-6")]),
        toList([
          view_recent_projects(projects, on_navigate_to_projects),
          view_recent_tasks(tasks, on_navigate_to_tasks)
        ])
      )
    ])
  );
}

// build/dev/javascript/frontend/pages/projects.mjs
function view_project_form(form, title2, submit_text, on_close, on_update_name, on_update_description, on_update_deadline, on_update_status, on_update_color, on_submit) {
  return div(
    toList([
      class$(
        "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      )
    ]),
    toList([
      div(
        toList([
          class$(
            "bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
          )
        ]),
        toList([
          div(
            toList([class$("flex items-center justify-between mb-4")]),
            toList([
              h3(
                toList([
                  class$(
                    "text-lg font-semibold text-gray-900 dark:text-white"
                  )
                ]),
                toList([text3(title2)])
              ),
              button(
                toList([
                  class$(
                    "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  ),
                  on_click(on_close)
                ]),
                toList([text3("\u2715")])
              )
            ])
          ),
          div(
            toList([class$("space-y-4")]),
            toList([
              div(
                toList([]),
                toList([
                  label(
                    toList([
                      class$(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      )
                    ]),
                    toList([text3("Project Name")])
                  ),
                  input(
                    toList([
                      type_("text"),
                      class$(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                      ),
                      value(form.name),
                      on_input(on_update_name),
                      placeholder("Enter project name")
                    ])
                  )
                ])
              ),
              div(
                toList([]),
                toList([
                  label(
                    toList([
                      class$(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      )
                    ]),
                    toList([text3("Description")])
                  ),
                  textarea(
                    toList([
                      class$(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                      ),
                      attribute2("rows", "3"),
                      on_input(on_update_description),
                      placeholder("Enter project description")
                    ]),
                    form.description
                  )
                ])
              ),
              div(
                toList([]),
                toList([
                  label(
                    toList([
                      class$(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      )
                    ]),
                    toList([text3("Deadline")])
                  ),
                  input(
                    toList([
                      type_("date"),
                      class$(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                      ),
                      value(form.deadline),
                      on_input(on_update_deadline)
                    ])
                  )
                ])
              ),
              div(
                toList([]),
                toList([
                  label(
                    toList([
                      class$(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      )
                    ]),
                    toList([text3("Status")])
                  ),
                  select(
                    toList([
                      class$(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                      ),
                      on_input(on_update_status)
                    ]),
                    toList([
                      option(
                        toList([
                          value("planning"),
                          selected(form.status === "planning")
                        ]),
                        "Planning"
                      ),
                      option(
                        toList([
                          value("active"),
                          selected(form.status === "active")
                        ]),
                        "Active"
                      ),
                      option(
                        toList([
                          value("on_hold"),
                          selected(form.status === "on_hold")
                        ]),
                        "On Hold"
                      ),
                      option(
                        toList([
                          value("completed"),
                          selected(form.status === "completed")
                        ]),
                        "Completed"
                      )
                    ])
                  )
                ])
              ),
              div(
                toList([]),
                toList([
                  label(
                    toList([
                      class$(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      )
                    ]),
                    toList([text3("Project Color")])
                  ),
                  div(
                    toList([class$("grid grid-cols-8 gap-2")]),
                    map(
                      get_material_colors(),
                      (color) => {
                        let is_selected = color.name === form.color;
                        let _block;
                        if (is_selected) {
                          _block = "ring-2 ring-gray-900 dark:ring-white ring-offset-2";
                        } else {
                          _block = "ring-1 ring-gray-300 hover:ring-gray-400";
                        }
                        let border_class = _block;
                        return button(
                          toList([
                            type_("button"),
                            class$(
                              "w-8 h-8 rounded-full transition-all duration-200 shadow-sm hover:scale-110 " + color.bg_class + " " + border_class
                            ),
                            title(color.name),
                            on_click(on_update_color(color.name))
                          ]),
                          toList([])
                        );
                      }
                    )
                  )
                ])
              ),
              div(
                toList([class$("flex justify-end space-x-3 pt-4")]),
                toList([
                  button(
                    toList([
                      type_("button"),
                      class$(
                        "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
                      ),
                      on_click(on_close)
                    ]),
                    toList([text3("Cancel")])
                  ),
                  button(
                    toList([
                      type_("button"),
                      class$(
                        "px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors"
                      ),
                      on_click(on_submit)
                    ]),
                    toList([text3(submit_text)])
                  )
                ])
              )
            ])
          )
        ])
      )
    ])
  );
}
function view_loading() {
  return div(
    toList([class$("flex items-center justify-center py-12")]),
    toList([
      div(
        toList([class$("text-center")]),
        toList([
          div(
            toList([
              class$(
                "animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 dark:border-cyan-400 mx-auto mb-4"
              )
            ]),
            toList([])
          ),
          p(
            toList([
              class$(
                "text-gray-600 dark:text-gray-400 transition-colors duration-300"
              )
            ]),
            toList([text3("Loading projects...")])
          )
        ])
      )
    ])
  );
}
function project_card(project, on_filter_tasks, on_edit_project, _) {
  let color_classes = get_project_color_classes(project.color);
  return div(
    toList([
      class$(
        "project-card relative group rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-lg dark:hover:shadow-gray-700/40 p-6 cursor-pointer transition-all duration-300 ease-out transform hover:-translate-y-1 hover:scale-105 border-2 " + color_classes
      ),
      attribute2("draggable", "true"),
      attribute2("style", "user-select: none;"),
      attribute2("data-id", to_string(project.id)),
      attribute2("data-type", "project"),
      attribute2("data-status", project.status),
      title("Click to edit project"),
      on_click(on_edit_project(project.id))
    ]),
    toList([
      div(
        toList([class$("flex items-start justify-between")]),
        toList([
          div(
            toList([class$("flex-1")]),
            toList([
              h3(
                toList([
                  class$(
                    "text-lg font-semibold transition-colors duration-300"
                  )
                ]),
                toList([text3(project.name)])
              ),
              p(
                toList([
                  class$(
                    "mt-1 transition-colors duration-300 opacity-90"
                  )
                ]),
                toList([text3(project.description)])
              ),
              div(
                toList([class$("flex items-center mt-4 space-x-4")]),
                toList([
                  span(
                    toList([
                      class$(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 backdrop-blur-sm"
                      )
                    ]),
                    toList([text3(project.status)])
                  ),
                  span(
                    toList([
                      class$(
                        "text-sm opacity-90 transition-colors duration-300"
                      )
                    ]),
                    toList([text3("Due: " + project.deadline)])
                  )
                ])
              )
            ])
          ),
          button(
            toList([
              class$(
                "bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-md font-medium transition-all duration-300 backdrop-blur-sm"
              ),
              attribute2("onclick", "event.stopPropagation();"),
              on_click(on_filter_tasks(project.id))
            ]),
            toList([text3("View Tasks")])
          )
        ])
      )
    ])
  );
}
function kanban_column(title2, status, projects, on_filter_tasks, on_edit_project, on_update_project_status) {
  return div(
    toList([
      class$(
        "kanban-column bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 p-4 border border-transparent dark:border-gray-700"
      ),
      attribute2("data-status", status)
    ]),
    toList([
      div(
        toList([class$("mb-4")]),
        toList([
          h3(
            toList([
              class$(
                "text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300 mb-2"
              )
            ]),
            toList([text3(title2)])
          ),
          div(
            toList([
              class$(
                "h-2 rounded-full bg-gray-200 dark:bg-gray-600 opacity-20"
              )
            ]),
            toList([])
          )
        ])
      ),
      div(
        toList([class$("space-y-3 min-h-[200px]")]),
        map(
          projects,
          (project) => {
            return project_card(
              project,
              on_filter_tasks,
              on_edit_project,
              on_update_project_status
            );
          }
        )
      )
    ])
  );
}
function view_projects_kanban(projects, on_filter_tasks, on_edit_project, on_update_project_status) {
  let planning_projects = filter(
    projects,
    (p2) => {
      return p2.status === "planning";
    }
  );
  let active_projects = filter(
    projects,
    (p2) => {
      return p2.status === "active" || p2.status === "in_progress";
    }
  );
  let completed_projects = filter(
    projects,
    (p2) => {
      return p2.status === "completed" || p2.status === "done";
    }
  );
  let on_hold_projects = filter(
    projects,
    (p2) => {
      return p2.status === "on_hold" || p2.status === "review";
    }
  );
  return div(
    toList([
      class$("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6")
    ]),
    toList([
      kanban_column(
        "Planning",
        "planning",
        planning_projects,
        on_filter_tasks,
        on_edit_project,
        on_update_project_status
      ),
      kanban_column(
        "Active",
        "active",
        active_projects,
        on_filter_tasks,
        on_edit_project,
        on_update_project_status
      ),
      kanban_column(
        "On Hold",
        "on_hold",
        on_hold_projects,
        on_filter_tasks,
        on_edit_project,
        on_update_project_status
      ),
      kanban_column(
        "Completed",
        "completed",
        completed_projects,
        on_filter_tasks,
        on_edit_project,
        on_update_project_status
      )
    ])
  );
}
function view_projects(projects, cache_info, on_filter_tasks, on_add_project, on_edit_project, form_state, on_close_form, on_update_name, on_update_description, on_update_deadline, on_update_status, on_update_color, on_submit_form, on_update_project_status) {
  return div(
    toList([class$("space-y-4")]),
    toList([
      div(
        toList([class$("flex items-center justify-between")]),
        toList([
          h2(
            toList([
              class$(
                "text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300"
              )
            ]),
            toList([text3("Projects")])
          ),
          button(
            toList([
              class$(
                "bg-cyan-600 dark:bg-cyan-700 hover:bg-cyan-700 dark:hover:bg-cyan-600 text-white px-4 py-2 rounded-md font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
              ),
              on_click(on_add_project)
            ]),
            toList([text3("Add Project")])
          )
        ])
      ),
      (() => {
        let $ = cache_info.is_loading;
        if ($) {
          return view_loading();
        } else {
          return view_projects_kanban(
            projects,
            on_filter_tasks,
            on_edit_project,
            on_update_project_status
          );
        }
      })(),
      (() => {
        if (form_state instanceof ShowingProjectForm) {
          let form = form_state[0];
          return view_project_form(
            form,
            "Add New Project",
            "Create Project",
            on_close_form,
            on_update_name,
            on_update_description,
            on_update_deadline,
            on_update_status,
            on_update_color,
            on_submit_form
          );
        } else if (form_state instanceof EditingProject) {
          let form = form_state[1];
          return view_project_form(
            form,
            "Edit Project",
            "Update Project",
            on_close_form,
            on_update_name,
            on_update_description,
            on_update_deadline,
            on_update_status,
            on_update_color,
            on_submit_form
          );
        } else {
          return div(toList([]), toList([]));
        }
      })()
    ])
  );
}

// build/dev/javascript/frontend/pages/tasks.mjs
function view_task_form(form, title2, submit_text, projects, team_members, on_close, on_update_project_id, on_update_title, on_update_description, on_update_status, on_update_priority, on_update_assigned_to, on_update_due_date, on_update_hours_logged, on_submit) {
  return div(
    toList([
      class$(
        "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      )
    ]),
    toList([
      div(
        toList([
          class$(
            "bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto"
          )
        ]),
        toList([
          div(
            toList([class$("flex items-center justify-between mb-4")]),
            toList([
              h3(
                toList([
                  class$(
                    "text-lg font-semibold text-gray-900 dark:text-white"
                  )
                ]),
                toList([text3(title2)])
              ),
              button(
                toList([
                  class$(
                    "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  ),
                  on_click(on_close)
                ]),
                toList([text3("\u2715")])
              )
            ])
          ),
          div(
            toList([class$("space-y-4")]),
            toList([
              div(
                toList([]),
                toList([
                  label(
                    toList([
                      class$(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      )
                    ]),
                    toList([text3("Project")])
                  ),
                  select(
                    toList([
                      class$(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                      ),
                      on_input(
                        (value2) => {
                          let $ = parse_int(value2);
                          if ($ instanceof Ok) {
                            let id2 = $[0];
                            return on_update_project_id(id2);
                          } else {
                            return on_update_project_id(1);
                          }
                        }
                      )
                    ]),
                    map(
                      projects,
                      (project) => {
                        return option(
                          toList([
                            value(to_string(project.id)),
                            selected(project.id === form.project_id)
                          ]),
                          project.name
                        );
                      }
                    )
                  )
                ])
              ),
              div(
                toList([]),
                toList([
                  label(
                    toList([
                      class$(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      )
                    ]),
                    toList([text3("Task Title")])
                  ),
                  input(
                    toList([
                      type_("text"),
                      class$(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                      ),
                      value(form.title),
                      on_input(on_update_title),
                      placeholder("Enter task title")
                    ])
                  )
                ])
              ),
              div(
                toList([]),
                toList([
                  label(
                    toList([
                      class$(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      )
                    ]),
                    toList([text3("Description")])
                  ),
                  textarea(
                    toList([
                      class$(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                      ),
                      attribute2("rows", "3"),
                      on_input(on_update_description),
                      placeholder("Enter task description")
                    ]),
                    form.description
                  )
                ])
              ),
              div(
                toList([class$("grid grid-cols-2 gap-4")]),
                toList([
                  div(
                    toList([]),
                    toList([
                      label(
                        toList([
                          class$(
                            "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                          )
                        ]),
                        toList([text3("Status")])
                      ),
                      select(
                        toList([
                          class$(
                            "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                          ),
                          on_input(on_update_status)
                        ]),
                        toList([
                          option(
                            toList([
                              value("pending"),
                              selected(form.status === "pending")
                            ]),
                            "To Do"
                          ),
                          option(
                            toList([
                              value("in_progress"),
                              selected(form.status === "in_progress")
                            ]),
                            "In Progress"
                          ),
                          option(
                            toList([
                              value("testing"),
                              selected(form.status === "testing")
                            ]),
                            "Review"
                          ),
                          option(
                            toList([
                              value("completed"),
                              selected(form.status === "completed")
                            ]),
                            "Done"
                          )
                        ])
                      )
                    ])
                  ),
                  div(
                    toList([]),
                    toList([
                      label(
                        toList([
                          class$(
                            "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                          )
                        ]),
                        toList([text3("Priority")])
                      ),
                      select(
                        toList([
                          class$(
                            "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                          ),
                          on_input(on_update_priority)
                        ]),
                        toList([
                          option(
                            toList([
                              value("low"),
                              selected(form.priority === "low")
                            ]),
                            "Low"
                          ),
                          option(
                            toList([
                              value("medium"),
                              selected(form.priority === "medium")
                            ]),
                            "Medium"
                          ),
                          option(
                            toList([
                              value("high"),
                              selected(form.priority === "high")
                            ]),
                            "High"
                          ),
                          option(
                            toList([
                              value("urgent"),
                              selected(form.priority === "urgent")
                            ]),
                            "Urgent"
                          )
                        ])
                      )
                    ])
                  )
                ])
              ),
              div(
                toList([]),
                toList([
                  label(
                    toList([
                      class$(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      )
                    ]),
                    toList([text3("Assigned To")])
                  ),
                  select(
                    toList([
                      class$(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                      ),
                      on_input(
                        (value2) => {
                          if (value2 === "") {
                            return on_update_assigned_to(new None());
                          } else {
                            let $ = parse_int(value2);
                            if ($ instanceof Ok) {
                              let id2 = $[0];
                              return on_update_assigned_to(new Some(id2));
                            } else {
                              return on_update_assigned_to(new None());
                            }
                          }
                        }
                      )
                    ]),
                    prepend(
                      option(
                        toList([
                          value(""),
                          selected(is_none(form.assigned_to))
                        ]),
                        "Unassigned"
                      ),
                      map(
                        team_members,
                        (member) => {
                          return option(
                            toList([
                              value(to_string(member.id)),
                              selected(
                                (() => {
                                  let $ = form.assigned_to;
                                  if ($ instanceof Some) {
                                    let id2 = $[0];
                                    return id2 === member.id;
                                  } else {
                                    return false;
                                  }
                                })()
                              )
                            ]),
                            member.name
                          );
                        }
                      )
                    )
                  )
                ])
              ),
              div(
                toList([]),
                toList([
                  label(
                    toList([
                      class$(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      )
                    ]),
                    toList([text3("Due Date")])
                  ),
                  input(
                    toList([
                      type_("date"),
                      class$(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white"
                      ),
                      value(
                        (() => {
                          let $ = form.due_date;
                          if ($ instanceof Some) {
                            let date = $[0];
                            return date;
                          } else {
                            return "";
                          }
                        })()
                      ),
                      on_input(
                        (value2) => {
                          if (value2 === "") {
                            return on_update_due_date(new None());
                          } else {
                            let date = value2;
                            return on_update_due_date(new Some(date));
                          }
                        }
                      )
                    ])
                  )
                ])
              ),
              div(
                toList([]),
                toList([
                  label(
                    toList([
                      class$(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      )
                    ]),
                    toList([text3("Hours Logged")])
                  ),
                  div(
                    toList([class$("space-y-3")]),
                    toList([
                      input(
                        toList([
                          type_("range"),
                          class$(
                            "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
                          ),
                          attribute2("min", "0"),
                          attribute2("max", "40"),
                          attribute2("step", "0.5"),
                          value(float_to_string(form.hours_logged)),
                          id("hours-logged-slider"),
                          on_input(
                            (value2) => {
                              let $ = parse_float(value2);
                              if ($ instanceof Ok) {
                                let hours = $[0];
                                return on_update_hours_logged(hours);
                              } else {
                                return on_update_hours_logged(0);
                              }
                            }
                          )
                        ])
                      ),
                      div(
                        toList([
                          class$(
                            "flex items-center justify-between text-sm text-gray-600 dark:text-gray-400"
                          )
                        ]),
                        toList([
                          span(toList([]), toList([text3("0h")])),
                          span(
                            toList([
                              class$(
                                "text-cyan-600 dark:text-cyan-400 font-semibold"
                              )
                            ]),
                            toList([
                              text3(
                                float_to_string(form.hours_logged) + "h"
                              )
                            ])
                          ),
                          span(toList([]), toList([text3("40h")]))
                        ])
                      )
                    ])
                  )
                ])
              ),
              div(
                toList([class$("flex justify-end space-x-3 pt-4")]),
                toList([
                  button(
                    toList([
                      type_("button"),
                      class$(
                        "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
                      ),
                      on_click(on_close)
                    ]),
                    toList([text3("Cancel")])
                  ),
                  button(
                    toList([
                      type_("button"),
                      class$(
                        "px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                      ),
                      on_click(on_submit)
                    ]),
                    toList([text3(submit_text)])
                  )
                ])
              )
            ])
          )
        ])
      )
    ])
  );
}
function view_loading2() {
  return div(
    toList([class$("flex items-center justify-center py-12")]),
    toList([
      div(
        toList([class$("text-center")]),
        toList([
          div(
            toList([
              class$(
                "animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 dark:border-cyan-400 mx-auto mb-4"
              )
            ]),
            toList([])
          ),
          p(
            toList([
              class$(
                "text-gray-600 dark:text-gray-400 transition-colors duration-300"
              )
            ]),
            toList([text3("Loading project data...")])
          )
        ])
      )
    ])
  );
}
function status_color(status) {
  if (status === "completed") {
    return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700";
  } else if (status === "done") {
    return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700";
  } else if (status === "in_progress") {
    return "bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700";
  } else if (status === "pending") {
    return "bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700";
  } else if (status === "active") {
    return "bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700";
  } else if (status === "planning") {
    return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600";
  } else if (status === "todo") {
    return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600";
  } else if (status === "open") {
    return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600";
  } else if (status === "on_hold") {
    return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700";
  } else if (status === "review") {
    return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700";
  } else if (status === "testing") {
    return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700";
  } else {
    return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600";
  }
}
function status_label(status) {
  if (status === "completed") {
    return "Completed";
  } else if (status === "done") {
    return "Done";
  } else if (status === "in_progress") {
    return "In Progress";
  } else if (status === "planning") {
    return "Planning";
  } else if (status === "todo") {
    return "Todo";
  } else if (status === "open") {
    return "Open";
  } else if (status === "pending") {
    return "Pending";
  } else if (status === "on_hold") {
    return "On Hold";
  } else if (status === "review") {
    return "Review";
  } else if (status === "testing") {
    return "Testing";
  } else {
    return "No Status";
  }
}
function priority_color(priority) {
  if (priority === "urgent") {
    return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700";
  } else if (priority === "high") {
    return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-700";
  } else if (priority === "medium") {
    return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700";
  } else if (priority === "low") {
    return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700";
  } else {
    return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600";
  }
}
function task_card(task, projects, team_members, on_edit_task, _) {
  let _block;
  let _pipe = find2(projects, (p2) => {
    return p2.id === task.project_id;
  });
  _block = unwrap2(
    _pipe,
    new Project(0, "Unknown Project", "", "", "", "blue", "")
  );
  let project = _block;
  let _block$1;
  let $ = task.assigned_to;
  if ($ instanceof Some) {
    let member_id = $[0];
    let _pipe$1 = find2(
      team_members,
      (m) => {
        return m.id === member_id;
      }
    );
    let _pipe$2 = map3(_pipe$1, (m) => {
      return m.name;
    });
    _block$1 = unwrap2(_pipe$2, "Unknown Member");
  } else {
    _block$1 = "Unassigned";
  }
  let assigned_member = _block$1;
  return div(
    toList([
      class$(
        "task-card relative group bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-lg dark:hover:shadow-gray-700/40 p-6 cursor-pointer transition-all duration-300 ease-out transform hover:-translate-y-1 hover:scale-105 border border-transparent dark:border-gray-700"
      ),
      attribute2("draggable", "true"),
      attribute2("style", "user-select: none;"),
      attribute2("data-id", to_string(task.id)),
      attribute2("data-type", "task"),
      attribute2("data-status", task.status),
      title("Click to edit task"),
      on_click(on_edit_task(task.id))
    ]),
    toList([
      div(
        toList([class$("flex items-start justify-between")]),
        toList([
          div(
            toList([class$("flex-1")]),
            toList([
              h3(
                toList([
                  class$(
                    "text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300"
                  )
                ]),
                toList([text3(task.title)])
              ),
              p(
                toList([
                  class$(
                    "text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300"
                  )
                ]),
                toList([text3(task.description)])
              ),
              div(
                toList([class$("flex items-center mt-4 space-x-4")]),
                toList([
                  span(
                    toList([
                      class$(
                        get_project_badge_classes(project.color)
                      )
                    ]),
                    toList([text3(project.name)])
                  ),
                  span(
                    toList([
                      class$(
                        "text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300"
                      )
                    ]),
                    toList([text3("Assigned to: " + assigned_member)])
                  )
                ])
              ),
              div(
                toList([class$("flex items-center mt-2 space-x-4")]),
                toList([
                  span(
                    toList([
                      class$(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + status_color(
                          task.status
                        )
                      )
                    ]),
                    toList([
                      (() => {
                        let _pipe$1 = task.status;
                        let _pipe$2 = status_label(_pipe$1);
                        return text3(_pipe$2);
                      })()
                    ])
                  ),
                  span(
                    toList([
                      class$(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + (() => {
                          let _pipe$1 = task.priority;
                          return priority_color(_pipe$1);
                        })()
                      )
                    ]),
                    toList([
                      (() => {
                        let _pipe$1 = task.priority;
                        return text3(_pipe$1);
                      })()
                    ])
                  ),
                  span(
                    toList([
                      class$(
                        "text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300"
                      )
                    ]),
                    toList([
                      text3(
                        float_to_string(task.hours_logged) + "h logged"
                      )
                    ])
                  )
                ])
              ),
              div(
                toList([class$("mt-4")]),
                toList([
                  div(
                    toList([
                      class$(
                        "flex items-center justify-between mb-1"
                      )
                    ]),
                    toList([
                      span(
                        toList([
                          class$(
                            "text-xs font-medium text-gray-700 dark:text-gray-300"
                          )
                        ]),
                        toList([text3("Hours Progress")])
                      ),
                      span(
                        toList([
                          class$(
                            "text-xs text-gray-600 dark:text-gray-400"
                          )
                        ]),
                        toList([
                          text3(
                            float_to_string(task.hours_logged) + " / 40h"
                          )
                        ])
                      )
                    ])
                  ),
                  div(
                    toList([
                      class$(
                        "w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"
                      )
                    ]),
                    toList([
                      div(
                        toList([
                          class$(
                            "bg-cyan-500 dark:bg-cyan-400 h-2 rounded-full transition-all duration-300"
                          ),
                          attribute2(
                            "style",
                            "width: " + (() => {
                              let _block$2;
                              let $1 = task.hours_logged > 40;
                              if ($1) {
                                _block$2 = 100;
                              } else {
                                _block$2 = task.hours_logged / 40 * 100;
                              }
                              let percentage = _block$2;
                              return float_to_string(percentage) + "%";
                            })()
                          )
                        ]),
                        toList([])
                      )
                    ])
                  )
                ])
              )
            ])
          )
        ])
      )
    ])
  );
}
function task_kanban_column(title2, status, tasks, color_class, projects, team_members, on_edit_task, on_update_task_status) {
  return div(
    toList([
      class$(
        "kanban-column bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 p-4 border border-transparent dark:border-gray-700"
      ),
      attribute2("data-status", status)
    ]),
    toList([
      div(
        toList([class$("mb-4")]),
        toList([
          h3(
            toList([
              class$(
                "text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300 mb-2"
              )
            ]),
            toList([text3(title2)])
          ),
          div(
            toList([
              class$(
                "h-2 rounded-full " + color_class + " opacity-20"
              )
            ]),
            toList([])
          )
        ])
      ),
      div(
        toList([class$("space-y-3 min-h-[200px]")]),
        map(
          tasks,
          (task) => {
            return task_card(
              task,
              projects,
              team_members,
              on_edit_task,
              on_update_task_status
            );
          }
        )
      )
    ])
  );
}
function view_tasks_kanban(tasks, projects, team_members, on_edit_task, on_update_task_status) {
  let todo_tasks = filter(
    tasks,
    (t) => {
      return t.status === "pending" || t.status === "todo" || t.status === "open";
    }
  );
  let in_progress_tasks = filter(
    tasks,
    (t) => {
      return t.status === "in_progress" || t.status === "active";
    }
  );
  let review_tasks = filter(
    tasks,
    (t) => {
      return t.status === "testing" || t.status === "review";
    }
  );
  let done_tasks = filter(
    tasks,
    (t) => {
      return t.status === "completed" || t.status === "done" || t.status === "closed";
    }
  );
  return div(
    toList([
      class$("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6")
    ]),
    toList([
      task_kanban_column(
        "To Do",
        "pending",
        todo_tasks,
        "bg-gray-100 dark:bg-gray-700",
        projects,
        team_members,
        on_edit_task,
        on_update_task_status
      ),
      task_kanban_column(
        "In Progress",
        "in_progress",
        in_progress_tasks,
        "bg-cyan-100 dark:bg-cyan-900",
        projects,
        team_members,
        on_edit_task,
        on_update_task_status
      ),
      task_kanban_column(
        "Review",
        "testing",
        review_tasks,
        "bg-yellow-100 dark:bg-yellow-900",
        projects,
        team_members,
        on_edit_task,
        on_update_task_status
      ),
      task_kanban_column(
        "Done",
        "completed",
        done_tasks,
        "bg-green-100 dark:bg-green-900",
        projects,
        team_members,
        on_edit_task,
        on_update_task_status
      )
    ])
  );
}
function view_tasks(tasks, projects, team_members, project_filter, cache_info, on_clear_filter, on_add_task, on_edit_task, form_state, on_close_form, on_update_project_id, on_update_title, on_update_description, on_update_status, on_update_priority, on_update_assigned_to, on_update_due_date, on_update_hours_logged, on_submit_form, on_update_task_status) {
  let _block;
  if (project_filter instanceof Some) {
    let project_id = project_filter[0];
    _block = filter(
      tasks,
      (task) => {
        return task.project_id === project_id;
      }
    );
  } else {
    _block = tasks;
  }
  let filtered_tasks = _block;
  return div(
    toList([class$("space-y-4")]),
    toList([
      div(
        toList([class$("flex items-center justify-between")]),
        toList([
          h2(
            toList([
              class$(
                "text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300"
              )
            ]),
            toList([text3("Tasks")])
          ),
          div(
            toList([class$("flex items-center space-x-4")]),
            toList([
              (() => {
                if (project_filter instanceof Some) {
                  let project_id = project_filter[0];
                  let _block$1;
                  let _pipe = find2(
                    projects,
                    (p2) => {
                      return p2.id === project_id;
                    }
                  );
                  let _pipe$1 = map3(_pipe, (p2) => {
                    return p2.name;
                  });
                  _block$1 = unwrap2(_pipe$1, "Unknown Project");
                  let project_name = _block$1;
                  return div(
                    toList([class$("flex items-center space-x-2")]),
                    toList([
                      span(
                        toList([class$("text-sm text-gray-600")]),
                        toList([text3("Filtered by: " + project_name)])
                      ),
                      button(
                        toList([
                          class$(
                            "text-cyan-600 hover:text-cyan-800 text-sm"
                          ),
                          on_click(on_clear_filter)
                        ]),
                        toList([text3("Show All")])
                      )
                    ])
                  );
                } else {
                  return div(toList([]), toList([]));
                }
              })(),
              button(
                toList([
                  class$(
                    "bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                  ),
                  on_click(on_add_task)
                ]),
                toList([text3("Add Task")])
              )
            ])
          )
        ])
      ),
      (() => {
        let $ = cache_info.is_loading;
        if ($) {
          return view_loading2();
        } else {
          return view_tasks_kanban(
            filtered_tasks,
            projects,
            team_members,
            on_edit_task,
            on_update_task_status
          );
        }
      })(),
      (() => {
        if (form_state instanceof ShowingTaskForm) {
          let form = form_state[0];
          return view_task_form(
            form,
            "Add New Task",
            "Create Task",
            projects,
            team_members,
            on_close_form,
            on_update_project_id,
            on_update_title,
            on_update_description,
            on_update_status,
            on_update_priority,
            on_update_assigned_to,
            on_update_due_date,
            on_update_hours_logged,
            on_submit_form
          );
        } else if (form_state instanceof EditingTask) {
          let form = form_state[1];
          return view_task_form(
            form,
            "Edit Task",
            "Update Task",
            projects,
            team_members,
            on_close_form,
            on_update_project_id,
            on_update_title,
            on_update_description,
            on_update_status,
            on_update_priority,
            on_update_assigned_to,
            on_update_due_date,
            on_update_hours_logged,
            on_submit_form
          );
        } else {
          return div(toList([]), toList([]));
        }
      })()
    ])
  );
}

// build/dev/javascript/frontend/pages/team.mjs
function view_loading3() {
  return div(
    toList([class$("flex items-center justify-center py-12")]),
    toList([
      div(
        toList([class$("text-center")]),
        toList([
          div(
            toList([
              class$(
                "animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 dark:border-cyan-400 mx-auto mb-4"
              )
            ]),
            toList([])
          ),
          p(
            toList([
              class$(
                "text-gray-600 dark:text-gray-400 transition-colors duration-300"
              )
            ]),
            toList([text3("Loading project data...")])
          )
        ])
      )
    ])
  );
}
function team_member_card(member) {
  return div(
    toList([
      class$(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-lg dark:hover:shadow-gray-700/40 p-6 transition-all duration-300 transform hover:scale-105 border border-transparent dark:border-gray-700"
      )
    ]),
    toList([
      div(
        toList([class$("text-center")]),
        toList([
          div(
            toList([
              class$(
                "w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
              )
            ]),
            toList([
              span(
                toList([class$("text-white font-semibold text-xl")]),
                toList([text3(slice(member.name, 0, 1))])
              )
            ])
          ),
          h3(
            toList([
              class$(
                "text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300"
              )
            ]),
            toList([text3(member.name)])
          ),
          p(
            toList([
              class$(
                "text-gray-600 dark:text-gray-400 transition-colors duration-300"
              )
            ]),
            toList([
              text3(
                (() => {
                  let $ = member.role;
                  if ($ === "manager") {
                    return "Manager";
                  } else if ($ === "developer") {
                    return "Developer";
                  } else {
                    return "Guest";
                  }
                })()
              )
            ])
          ),
          p(
            toList([
              class$(
                "text-sm text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-300"
              )
            ]),
            toList([text3(member.email)])
          )
        ])
      )
    ])
  );
}
function view_team(team_members, cache_info) {
  return div(
    toList([class$("space-y-4")]),
    toList([
      h2(
        toList([
          class$(
            "text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300"
          )
        ]),
        toList([text3("Team Members")])
      ),
      (() => {
        let $ = cache_info.is_loading;
        if ($) {
          return view_loading3();
        } else {
          return div(
            toList([
              class$("grid gap-4 md:grid-cols-2 lg:grid-cols-3")
            ]),
            map(team_members, team_member_card)
          );
        }
      })()
    ])
  );
}

// build/dev/javascript/frontend/frontend.mjs
var FILEPATH = "src/frontend.gleam";
var Loading = class extends CustomType {
};
var Loaded = class extends CustomType {
  constructor(dashboard, projects, tasks, team_members, current_view, loading_states, form_state) {
    super();
    this.dashboard = dashboard;
    this.projects = projects;
    this.tasks = tasks;
    this.team_members = team_members;
    this.current_view = current_view;
    this.loading_states = loading_states;
    this.form_state = form_state;
  }
};
var ApiReturnedDashboard = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var ApiReturnedDashboardData = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var ApiReturnedProjects = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var ApiReturnedTasks = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var ApiReturnedTeamMembers = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var ChangeView = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var FilterTasksByProject = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var RefreshData = class extends CustomType {
};
var ShowAddProjectForm = class extends CustomType {
};
var ShowEditProjectForm = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var ShowAddTaskForm = class extends CustomType {
};
var ShowEditTaskForm = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var CloseForm = class extends CustomType {
};
var UpdateProjectFormName = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateProjectFormDescription = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateProjectFormDeadline = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateProjectFormStatus = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateProjectFormColor = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var SubmitProjectForm = class extends CustomType {
};
var UpdateTaskFormProjectId = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateTaskFormTitle = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateTaskFormDescription = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateTaskFormStatus = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateTaskFormPriority = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateTaskFormAssignedTo = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateTaskFormDueDate = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateTaskFormHoursLogged = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var SubmitTaskForm = class extends CustomType {
};
var ApiProjectAdded = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var ApiTaskAdded = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var UpdateTaskStatus = class extends CustomType {
  constructor($0, $1) {
    super();
    this[0] = $0;
    this[1] = $1;
  }
};
var UpdateProjectStatus = class extends CustomType {
  constructor($0, $1) {
    super();
    this[0] = $0;
    this[1] = $1;
  }
};
var UpdateTaskHours = class extends CustomType {
  constructor($0, $1) {
    super();
    this[0] = $0;
    this[1] = $1;
  }
};
var ApiTaskStatusUpdated = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var ApiProjectStatusUpdated = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var ApiTaskHoursUpdated = class extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
};
var LoadingData = class extends CustomType {
  constructor(dashboard, projects, tasks, team_members) {
    super();
    this.dashboard = dashboard;
    this.projects = projects;
    this.tasks = tasks;
    this.team_members = team_members;
  }
};
function setup_drag_drop_effect() {
  return from(
    (dispatch) => {
      let handler = (event_detail) => {
        let $ = event_detail[0];
        if ($ === "task") {
          let id2 = event_detail[1];
          let new_status = event_detail[2];
          return dispatch(new UpdateTaskStatus(id2, new_status));
        } else if ($ === "project") {
          let id2 = event_detail[1];
          let new_status = event_detail[2];
          return dispatch(new UpdateProjectStatus(id2, new_status));
        } else {
          return void 0;
        }
      };
      return setupDragAndDropListener(handler);
    }
  );
}
function create_fresh_cache() {
  return new CacheInfo(false, 0, false);
}
function create_loaded_cache() {
  return new CacheInfo(false, getCurrentTimestamp(), true);
}
function project_decoder() {
  return field(
    "id",
    int2,
    (id2) => {
      return field(
        "name",
        string2,
        (name) => {
          return field(
            "description",
            string2,
            (description) => {
              return field(
                "deadline",
                string2,
                (deadline) => {
                  return field(
                    "status",
                    string2,
                    (status) => {
                      return field(
                        "color",
                        string2,
                        (color) => {
                          return field(
                            "created_at",
                            string2,
                            (created_at) => {
                              return success(
                                new Project(
                                  id2,
                                  name,
                                  description,
                                  deadline,
                                  status,
                                  color,
                                  created_at
                                )
                              );
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function task_decoder() {
  return field(
    "id",
    int2,
    (id2) => {
      return field(
        "project_id",
        int2,
        (project_id) => {
          return field(
            "title",
            string2,
            (title2) => {
              return field(
                "description",
                string2,
                (description) => {
                  return field(
                    "assigned_to",
                    optional(int2),
                    (assigned_to) => {
                      return field(
                        "status",
                        string2,
                        (status) => {
                          return field(
                            "priority",
                            string2,
                            (priority) => {
                              return field(
                                "due_date",
                                optional(string2),
                                (due_date) => {
                                  return field(
                                    "hours_logged",
                                    float2,
                                    (hours_logged) => {
                                      return success(
                                        new Task(
                                          id2,
                                          project_id,
                                          title2,
                                          description,
                                          assigned_to,
                                          status,
                                          priority,
                                          due_date,
                                          hours_logged
                                        )
                                      );
                                    }
                                  );
                                }
                              );
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function team_member_decoder() {
  return field(
    "id",
    int2,
    (id2) => {
      return field(
        "name",
        string2,
        (name) => {
          return field(
            "email",
            string2,
            (email) => {
              return field(
                "role",
                string2,
                (role) => {
                  return success(new TeamMember(id2, name, email, role));
                }
              );
            }
          );
        }
      );
    }
  );
}
function dashboard_data_decoder() {
  return field(
    "total_projects",
    int2,
    (total_projects) => {
      return field(
        "active_projects",
        int2,
        (active_projects) => {
          return field(
            "completed_tasks",
            int2,
            (completed_tasks) => {
              return field(
                "pending_tasks",
                int2,
                (pending_tasks) => {
                  return field(
                    "team_members",
                    int2,
                    (team_members) => {
                      return field(
                        "total_hours",
                        float2,
                        (total_hours) => {
                          return field(
                            "recent_projects",
                            list2(project_decoder()),
                            (recent_projects) => {
                              return field(
                                "recent_tasks",
                                list2(task_decoder()),
                                (recent_tasks) => {
                                  let stats = new DashboardStats(
                                    total_projects,
                                    active_projects,
                                    completed_tasks,
                                    pending_tasks,
                                    team_members,
                                    total_hours
                                  );
                                  return success(
                                    [stats, recent_projects, recent_tasks]
                                  );
                                }
                              );
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function fetch_dashboard_data(handle_response) {
  let url = "http://localhost:3000/api/dashboard";
  let decoder = dashboard_data_decoder();
  let handler = expect_json(decoder, handle_response);
  return get2(url, handler);
}
function fetch_projects(handle_response) {
  let url = "http://localhost:3000/api/projects";
  let decoder = list2(project_decoder());
  let handler = expect_json(decoder, handle_response);
  return get2(url, handler);
}
function fetch_tasks(handle_response) {
  let url = "http://localhost:3000/api/tasks";
  let decoder = list2(task_decoder());
  let handler = expect_json(decoder, handle_response);
  return get2(url, handler);
}
function fetch_team_members(handle_response) {
  let url = "http://localhost:3000/api/team";
  let decoder = list2(team_member_decoder());
  let handler = expect_json(decoder, handle_response);
  return get2(url, handler);
}
function init(_) {
  let empty_dashboard = new DashboardStats(0, 0, 0, 0, 0, 0);
  let fresh_cache = create_fresh_cache();
  let loading_states = new LoadingStates(
    fresh_cache,
    fresh_cache,
    fresh_cache,
    fresh_cache
  );
  return [
    new Loaded(
      empty_dashboard,
      toList([]),
      toList([]),
      toList([]),
      new DashboardView(),
      loading_states,
      new NoForm()
    ),
    batch(
      toList([
        fetch_dashboard_data(
          (var0) => {
            return new ApiReturnedDashboardData(var0);
          }
        ),
        fetch_projects((var0) => {
          return new ApiReturnedProjects(var0);
        }),
        fetch_tasks((var0) => {
          return new ApiReturnedTasks(var0);
        }),
        fetch_team_members(
          (var0) => {
            return new ApiReturnedTeamMembers(var0);
          }
        ),
        setup_drag_drop_effect()
      ])
    )
  ];
}
function create_project(form, handle_response) {
  let url = "http://localhost:3000/api/projects";
  let decoder = project_decoder();
  let handler = expect_json(decoder, handle_response);
  let body = object2(
    toList([
      ["name", string3(form.name)],
      ["description", string3(form.description)],
      ["deadline", string3(form.deadline)],
      ["status", string3(form.status)],
      ["color", string3(form.color)]
    ])
  );
  return post(url, body, handler);
}
function update_project(project_id, form, handle_response) {
  print(
    "\u{1F50D} Frontend: update_project called for project ID: " + to_string(
      project_id
    )
  );
  print("\u{1F50D} Frontend: project form name: " + form.name);
  let url = "http://localhost:3000/api/projects/" + to_string(project_id);
  print("\u{1F50D} Frontend: making POST request to: " + url);
  let decoder = project_decoder();
  let handler = expect_json(decoder, handle_response);
  let body = object2(
    toList([
      ["name", string3(form.name)],
      ["description", string3(form.description)],
      ["deadline", string3(form.deadline)],
      ["status", string3(form.status)],
      ["color", string3(form.color)]
    ])
  );
  return post(url, body, handler);
}
function create_task(form, handle_response) {
  let url = "http://localhost:3000/api/tasks";
  let decoder = task_decoder();
  let handler = expect_json(decoder, handle_response);
  let body = object2(
    toList([
      ["project_id", int3(form.project_id)],
      ["title", string3(form.title)],
      ["description", string3(form.description)],
      ["status", string3(form.status)],
      ["priority", string3(form.priority)],
      [
        "assigned_to",
        (() => {
          let $ = form.assigned_to;
          if ($ instanceof Some) {
            let id2 = $[0];
            return int3(id2);
          } else {
            return null$();
          }
        })()
      ],
      [
        "due_date",
        (() => {
          let $ = form.due_date;
          if ($ instanceof Some) {
            let date = $[0];
            return string3(date);
          } else {
            return null$();
          }
        })()
      ],
      ["hours_logged", float3(0)]
    ])
  );
  return post(url, body, handler);
}
function update_task(task_id, form, handle_response) {
  print(
    "\u{1F50D} Frontend: update_task called for task ID: " + to_string(task_id)
  );
  print("\u{1F50D} Frontend: task form title: " + form.title);
  let url = "http://localhost:3000/api/tasks/" + to_string(task_id);
  print("\u{1F50D} Frontend: making POST request to: " + url);
  let decoder = task_decoder();
  let handler = expect_json(decoder, handle_response);
  let body = object2(
    toList([
      ["project_id", int3(form.project_id)],
      ["title", string3(form.title)],
      ["description", string3(form.description)],
      ["status", string3(form.status)],
      ["priority", string3(form.priority)],
      [
        "assigned_to",
        (() => {
          let $ = form.assigned_to;
          if ($ instanceof Some) {
            let id2 = $[0];
            return int3(id2);
          } else {
            return null$();
          }
        })()
      ],
      [
        "due_date",
        (() => {
          let $ = form.due_date;
          if ($ instanceof Some) {
            let date = $[0];
            return string3(date);
          } else {
            return null$();
          }
        })()
      ],
      ["hours_logged", float3(form.hours_logged)]
    ])
  );
  return post(url, body, handler);
}
function update_task_status(task, new_status, handle_response) {
  let url = "http://localhost:3000/api/tasks/" + to_string(task.id);
  let decoder = task_decoder();
  let handler = expect_json(decoder, handle_response);
  let body = object2(
    toList([
      ["project_id", int3(task.project_id)],
      ["title", string3(task.title)],
      ["description", string3(task.description)],
      ["status", string3(new_status)],
      ["priority", string3(task.priority)],
      [
        "assigned_to",
        (() => {
          let $ = task.assigned_to;
          if ($ instanceof Some) {
            let id2 = $[0];
            return int3(id2);
          } else {
            return null$();
          }
        })()
      ],
      [
        "due_date",
        (() => {
          let $ = task.due_date;
          if ($ instanceof Some) {
            let date = $[0];
            return string3(date);
          } else {
            return null$();
          }
        })()
      ],
      ["hours_logged", float3(task.hours_logged)]
    ])
  );
  return post(url, body, handler);
}
function update_project_status(project, new_status, handle_response) {
  let url = "http://localhost:3000/api/projects/" + to_string(project.id);
  let decoder = project_decoder();
  let handler = expect_json(decoder, handle_response);
  let body = object2(
    toList([
      ["name", string3(project.name)],
      ["description", string3(project.description)],
      ["deadline", string3(project.deadline)],
      ["status", string3(new_status)],
      ["color", string3(project.color)]
    ])
  );
  return post(url, body, handler);
}
function update_task_hours(task, new_hours, handle_response) {
  let url = "http://localhost:3000/api/tasks/" + to_string(task.id);
  let decoder = task_decoder();
  let handler = expect_json(decoder, handle_response);
  let body = object2(
    toList([
      ["project_id", int3(task.project_id)],
      ["title", string3(task.title)],
      ["description", string3(task.description)],
      ["status", string3(task.status)],
      ["priority", string3(task.priority)],
      [
        "assigned_to",
        (() => {
          let $ = task.assigned_to;
          if ($ instanceof Some) {
            let id2 = $[0];
            return int3(id2);
          } else {
            return null$();
          }
        })()
      ],
      [
        "due_date",
        (() => {
          let $ = task.due_date;
          if ($ instanceof Some) {
            let date = $[0];
            return string3(date);
          } else {
            return null$();
          }
        })()
      ],
      ["hours_logged", float3(new_hours)]
    ])
  );
  return post(url, body, handler);
}
function handle_loading_state(msg) {
  let initial_loading_data = new LoadingData(
    new None(),
    new None(),
    new None(),
    new None()
  );
  let _block;
  if (msg instanceof ApiReturnedDashboard) {
    let $2 = msg[0];
    if ($2 instanceof Ok) {
      let dashboard = $2[0];
      _block = new LoadingData(
        new Some(dashboard),
        new None(),
        new None(),
        new None()
      );
    } else {
      _block = initial_loading_data;
    }
  } else if (msg instanceof ApiReturnedProjects) {
    let $2 = msg[0];
    if ($2 instanceof Ok) {
      let projects = $2[0];
      _block = new LoadingData(
        new None(),
        new Some(projects),
        new None(),
        new None()
      );
    } else {
      _block = initial_loading_data;
    }
  } else if (msg instanceof ApiReturnedTasks) {
    let $2 = msg[0];
    if ($2 instanceof Ok) {
      let tasks = $2[0];
      _block = new LoadingData(
        new None(),
        new None(),
        new Some(tasks),
        new None()
      );
    } else {
      _block = initial_loading_data;
    }
  } else if (msg instanceof ApiReturnedTeamMembers) {
    let $2 = msg[0];
    if ($2 instanceof Ok) {
      let team_members = $2[0];
      _block = new LoadingData(
        new None(),
        new None(),
        new None(),
        new Some(team_members)
      );
    } else {
      _block = initial_loading_data;
    }
  } else {
    _block = initial_loading_data;
  }
  let loading_data = _block;
  let $ = loading_data.team_members;
  if ($ instanceof Some) {
    let $1 = loading_data.tasks;
    if ($1 instanceof Some) {
      let $2 = loading_data.projects;
      if ($2 instanceof Some) {
        let $3 = loading_data.dashboard;
        if ($3 instanceof Some) {
          let team_members = $[0];
          let tasks = $1[0];
          let projects = $2[0];
          let dashboard = $3[0];
          let loading_states = new LoadingStates(
            create_loaded_cache(),
            create_loaded_cache(),
            create_loaded_cache(),
            create_loaded_cache()
          );
          return [
            new Loaded(
              dashboard,
              projects,
              tasks,
              team_members,
              new DashboardView(),
              loading_states,
              new NoForm()
            ),
            none()
          ];
        } else {
          return [new Loading(), none()];
        }
      } else {
        return [new Loading(), none()];
      }
    } else {
      return [new Loading(), none()];
    }
  } else {
    return [new Loading(), none()];
  }
}
function handle_loaded_state(dashboard, projects, tasks, team_members, current_view, loading_states, form_state, msg) {
  if (msg instanceof ApiReturnedDashboard) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let dashboard$1 = $[0];
      let updated_loading_states = new LoadingStates(
        create_loaded_cache(),
        loading_states.projects,
        loading_states.tasks,
        loading_states.team
      );
      return [
        new Loaded(
          dashboard$1,
          projects,
          tasks,
          team_members,
          current_view,
          updated_loading_states,
          form_state
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof ApiReturnedDashboardData) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let dashboard$1 = $[0][0];
      let recent_projects = $[0][1];
      let recent_tasks = $[0][2];
      let updated_loading_states = new LoadingStates(
        create_loaded_cache(),
        loading_states.projects,
        loading_states.tasks,
        loading_states.team
      );
      return [
        new Loaded(
          dashboard$1,
          recent_projects,
          recent_tasks,
          team_members,
          current_view,
          updated_loading_states,
          form_state
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof ApiReturnedProjects) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let projects$1 = $[0];
      let updated_loading_states = new LoadingStates(
        loading_states.dashboard,
        create_loaded_cache(),
        loading_states.tasks,
        loading_states.team
      );
      return [
        new Loaded(
          dashboard,
          projects$1,
          tasks,
          team_members,
          current_view,
          updated_loading_states,
          form_state
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof ApiReturnedTasks) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let tasks$1 = $[0];
      let updated_loading_states = new LoadingStates(
        loading_states.dashboard,
        loading_states.projects,
        create_loaded_cache(),
        loading_states.team
      );
      return [
        new Loaded(
          dashboard,
          projects,
          tasks$1,
          team_members,
          current_view,
          updated_loading_states,
          form_state
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof ApiReturnedTeamMembers) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let team_members$1 = $[0];
      let updated_loading_states = new LoadingStates(
        loading_states.dashboard,
        loading_states.projects,
        loading_states.tasks,
        create_loaded_cache()
      );
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members$1,
          current_view,
          updated_loading_states,
          form_state
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof ChangeView) {
    let new_view = msg[0];
    return [
      new Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        new_view,
        loading_states,
        form_state
      ),
      none()
    ];
  } else if (msg instanceof FilterTasksByProject) {
    let project_id = msg[0];
    return [
      new Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        new TasksView(new Some(project_id)),
        loading_states,
        form_state
      ),
      none()
    ];
  } else if (msg instanceof RefreshData) {
    return [
      new Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        current_view,
        loading_states,
        form_state
      ),
      batch(
        toList([
          fetch_dashboard_data(
            (var0) => {
              return new ApiReturnedDashboardData(var0);
            }
          ),
          fetch_projects((var0) => {
            return new ApiReturnedProjects(var0);
          }),
          fetch_tasks((var0) => {
            return new ApiReturnedTasks(var0);
          }),
          fetch_team_members(
            (var0) => {
              return new ApiReturnedTeamMembers(var0);
            }
          )
        ])
      )
    ];
  } else if (msg instanceof ShowAddProjectForm) {
    return [
      new Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        current_view,
        loading_states,
        new ShowingProjectForm(
          new ProjectForm("", "", "", "planning", "#3B82F6")
        )
      ),
      none()
    ];
  } else if (msg instanceof ShowEditProjectForm) {
    let project_id = msg[0];
    let $ = find2(projects, (p2) => {
      return p2.id === project_id;
    });
    if ($ instanceof Ok) {
      let project = $[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingProject(
            project.id,
            new ProjectForm(
              project.name,
              project.description,
              project.deadline,
              project.status,
              project.color
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof ShowAddTaskForm) {
    return [
      new Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        current_view,
        loading_states,
        new ShowingTaskForm(
          new TaskForm(
            (() => {
              if (projects instanceof Empty) {
                return 1;
              } else {
                let first = projects.head;
                return first.id;
              }
            })(),
            "",
            "",
            "todo",
            "medium",
            new None(),
            new None(),
            0
          )
        )
      ),
      none()
    ];
  } else if (msg instanceof ShowEditTaskForm) {
    let task_id = msg[0];
    let $ = find2(tasks, (t) => {
      return t.id === task_id;
    });
    if ($ instanceof Ok) {
      let task = $[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingTask(
            task.id,
            new TaskForm(
              task.project_id,
              task.title,
              task.description,
              task.status,
              task.priority,
              task.assigned_to,
              task.due_date,
              task.hours_logged
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof CloseForm) {
    return [
      new Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        current_view,
        loading_states,
        new NoForm()
      ),
      none()
    ];
  } else if (msg instanceof UpdateProjectFormName) {
    let name = msg[0];
    if (form_state instanceof ShowingProjectForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingProjectForm(
            new ProjectForm(
              name,
              form.description,
              form.deadline,
              form.status,
              form.color
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingProject) {
      let project_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingProject(
            project_id,
            new ProjectForm(
              name,
              form.description,
              form.deadline,
              form.status,
              form.color
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateProjectFormDescription) {
    let description = msg[0];
    if (form_state instanceof ShowingProjectForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingProjectForm(
            new ProjectForm(
              form.name,
              description,
              form.deadline,
              form.status,
              form.color
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingProject) {
      let project_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingProject(
            project_id,
            new ProjectForm(
              form.name,
              description,
              form.deadline,
              form.status,
              form.color
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateProjectFormDeadline) {
    let deadline = msg[0];
    if (form_state instanceof ShowingProjectForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingProjectForm(
            new ProjectForm(
              form.name,
              form.description,
              deadline,
              form.status,
              form.color
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingProject) {
      let project_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingProject(
            project_id,
            new ProjectForm(
              form.name,
              form.description,
              deadline,
              form.status,
              form.color
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateProjectFormStatus) {
    let status = msg[0];
    if (form_state instanceof ShowingProjectForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingProjectForm(
            new ProjectForm(
              form.name,
              form.description,
              form.deadline,
              status,
              form.color
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingProject) {
      let project_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingProject(
            project_id,
            new ProjectForm(
              form.name,
              form.description,
              form.deadline,
              status,
              form.color
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateProjectFormColor) {
    let color = msg[0];
    if (form_state instanceof ShowingProjectForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingProjectForm(
            new ProjectForm(
              form.name,
              form.description,
              form.deadline,
              form.status,
              color
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingProject) {
      let project_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingProject(
            project_id,
            new ProjectForm(
              form.name,
              form.description,
              form.deadline,
              form.status,
              color
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof SubmitProjectForm) {
    print("\u{1F50D} Frontend: SubmitProjectForm message received");
    if (form_state instanceof ShowingProjectForm) {
      let form = form_state[0];
      print("\u{1F50D} Frontend: Creating new project");
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new NoForm()
        ),
        create_project(form, (var0) => {
          return new ApiProjectAdded(var0);
        })
      ];
    } else if (form_state instanceof EditingProject) {
      let project_id = form_state[0];
      let form = form_state[1];
      print(
        "\u{1F50D} Frontend: Editing existing project with ID: " + to_string(
          project_id
        )
      );
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new NoForm()
        ),
        update_project(
          project_id,
          form,
          (var0) => {
            return new ApiProjectStatusUpdated(var0);
          }
        )
      ];
    } else {
      print(
        "\u{1F50D} Frontend: SubmitProjectForm called but form_state is not ShowingProjectForm or EditingProject"
      );
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateTaskFormProjectId) {
    let project_id = msg[0];
    if (form_state instanceof ShowingTaskForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingTaskForm(
            new TaskForm(
              project_id,
              form.title,
              form.description,
              form.status,
              form.priority,
              form.assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingTask) {
      let task_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingTask(
            task_id,
            new TaskForm(
              project_id,
              form.title,
              form.description,
              form.status,
              form.priority,
              form.assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateTaskFormTitle) {
    let title2 = msg[0];
    if (form_state instanceof ShowingTaskForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingTaskForm(
            new TaskForm(
              form.project_id,
              title2,
              form.description,
              form.status,
              form.priority,
              form.assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingTask) {
      let task_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingTask(
            task_id,
            new TaskForm(
              form.project_id,
              title2,
              form.description,
              form.status,
              form.priority,
              form.assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateTaskFormDescription) {
    let description = msg[0];
    if (form_state instanceof ShowingTaskForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingTaskForm(
            new TaskForm(
              form.project_id,
              form.title,
              description,
              form.status,
              form.priority,
              form.assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingTask) {
      let task_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingTask(
            task_id,
            new TaskForm(
              form.project_id,
              form.title,
              description,
              form.status,
              form.priority,
              form.assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateTaskFormStatus) {
    let status = msg[0];
    if (form_state instanceof ShowingTaskForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingTaskForm(
            new TaskForm(
              form.project_id,
              form.title,
              form.description,
              status,
              form.priority,
              form.assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingTask) {
      let task_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingTask(
            task_id,
            new TaskForm(
              form.project_id,
              form.title,
              form.description,
              status,
              form.priority,
              form.assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateTaskFormPriority) {
    let priority = msg[0];
    if (form_state instanceof ShowingTaskForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingTaskForm(
            new TaskForm(
              form.project_id,
              form.title,
              form.description,
              form.status,
              priority,
              form.assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingTask) {
      let task_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingTask(
            task_id,
            new TaskForm(
              form.project_id,
              form.title,
              form.description,
              form.status,
              priority,
              form.assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateTaskFormAssignedTo) {
    let assigned_to = msg[0];
    if (form_state instanceof ShowingTaskForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingTaskForm(
            new TaskForm(
              form.project_id,
              form.title,
              form.description,
              form.status,
              form.priority,
              assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingTask) {
      let task_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingTask(
            task_id,
            new TaskForm(
              form.project_id,
              form.title,
              form.description,
              form.status,
              form.priority,
              assigned_to,
              form.due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateTaskFormDueDate) {
    let due_date = msg[0];
    if (form_state instanceof ShowingTaskForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingTaskForm(
            new TaskForm(
              form.project_id,
              form.title,
              form.description,
              form.status,
              form.priority,
              form.assigned_to,
              due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingTask) {
      let task_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingTask(
            task_id,
            new TaskForm(
              form.project_id,
              form.title,
              form.description,
              form.status,
              form.priority,
              form.assigned_to,
              due_date,
              form.hours_logged
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateTaskFormHoursLogged) {
    let hours_logged = msg[0];
    if (form_state instanceof ShowingTaskForm) {
      let form = form_state[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new ShowingTaskForm(
            new TaskForm(
              form.project_id,
              form.title,
              form.description,
              form.status,
              form.priority,
              form.assigned_to,
              form.due_date,
              hours_logged
            )
          )
        ),
        none()
      ];
    } else if (form_state instanceof EditingTask) {
      let task_id = form_state[0];
      let form = form_state[1];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new EditingTask(
            task_id,
            new TaskForm(
              form.project_id,
              form.title,
              form.description,
              form.status,
              form.priority,
              form.assigned_to,
              form.due_date,
              hours_logged
            )
          )
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof SubmitTaskForm) {
    print("\u{1F50D} Frontend: SubmitTaskForm message received");
    if (form_state instanceof ShowingTaskForm) {
      let form = form_state[0];
      print("\u{1F50D} Frontend: Creating new task");
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new NoForm()
        ),
        create_task(form, (var0) => {
          return new ApiTaskAdded(var0);
        })
      ];
    } else if (form_state instanceof EditingTask) {
      let task_id = form_state[0];
      let form = form_state[1];
      print(
        "\u{1F50D} Frontend: Editing existing task with ID: " + to_string(task_id)
      );
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          new NoForm()
        ),
        update_task(
          task_id,
          form,
          (var0) => {
            return new ApiTaskStatusUpdated(var0);
          }
        )
      ];
    } else {
      print(
        "\u{1F50D} Frontend: SubmitTaskForm called but form_state is not ShowingTaskForm or EditingTask"
      );
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof ApiProjectAdded) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let new_project = $[0];
      return [
        new Loaded(
          dashboard,
          prepend(new_project, projects),
          tasks,
          team_members,
          current_view,
          loading_states,
          new NoForm()
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof ApiTaskAdded) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let new_task = $[0];
      return [
        new Loaded(
          dashboard,
          projects,
          prepend(new_task, tasks),
          team_members,
          current_view,
          loading_states,
          new NoForm()
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateTaskStatus) {
    let task_id = msg[0];
    let new_status = msg[1];
    let $ = find2(tasks, (t) => {
      return t.id === task_id;
    });
    if ($ instanceof Ok) {
      let task = $[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        update_task_status(
          task,
          new_status,
          (var0) => {
            return new ApiTaskStatusUpdated(var0);
          }
        )
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateProjectStatus) {
    let project_id = msg[0];
    let new_status = msg[1];
    let $ = find2(projects, (p2) => {
      return p2.id === project_id;
    });
    if ($ instanceof Ok) {
      let project = $[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        update_project_status(
          project,
          new_status,
          (var0) => {
            return new ApiProjectStatusUpdated(var0);
          }
        )
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof UpdateTaskHours) {
    let task_id = msg[0];
    let new_hours = msg[1];
    let $ = find2(tasks, (t) => {
      return t.id === task_id;
    });
    if ($ instanceof Ok) {
      let task = $[0];
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        update_task_hours(
          task,
          new_hours,
          (var0) => {
            return new ApiTaskHoursUpdated(var0);
          }
        )
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof ApiTaskStatusUpdated) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let updated_task = $[0];
      let updated_tasks = map(
        tasks,
        (task) => {
          let $1 = task.id === updated_task.id;
          if ($1) {
            return updated_task;
          } else {
            return task;
          }
        }
      );
      clearDragUpdateState("task", updated_task.id);
      return [
        new Loaded(
          dashboard,
          projects,
          updated_tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else if (msg instanceof ApiProjectStatusUpdated) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let updated_project = $[0];
      let updated_projects = map(
        projects,
        (project) => {
          let $1 = project.id === updated_project.id;
          if ($1) {
            return updated_project;
          } else {
            return project;
          }
        }
      );
      clearDragUpdateState("project", updated_project.id);
      return [
        new Loaded(
          dashboard,
          updated_projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  } else {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let updated_task = $[0];
      let updated_tasks = map(
        tasks,
        (task) => {
          let $1 = task.id === updated_task.id;
          if ($1) {
            return updated_task;
          } else {
            return task;
          }
        }
      );
      return [
        new Loaded(
          dashboard,
          projects,
          updated_tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    } else {
      return [
        new Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state
        ),
        none()
      ];
    }
  }
}
function update2(model, msg) {
  if (model instanceof Loading) {
    return handle_loading_state(msg);
  } else if (model instanceof Loaded) {
    let dashboard = model.dashboard;
    let projects = model.projects;
    let tasks = model.tasks;
    let team_members = model.team_members;
    let current_view = model.current_view;
    let loading_states = model.loading_states;
    let form_state = model.form_state;
    return handle_loaded_state(
      dashboard,
      projects,
      tasks,
      team_members,
      current_view,
      loading_states,
      form_state,
      msg
    );
  } else {
    return [model, none()];
  }
}
function view_navigation(current_view) {
  return nav(
    toList([
      class$(
        "bg-white dark:bg-gray-800 shadow-lg rounded-lg p-1 mb-6 inline-flex space-x-1"
      )
    ]),
    toList([
      button(
        toList([
          class$(
            (() => {
              if (current_view instanceof DashboardView) {
                return "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 bg-cyan-500 text-white shadow-md hover:bg-cyan-600 dark:bg-cyan-400 dark:text-gray-900 dark:hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2";
              } else {
                return "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 dark:text-gray-300 dark:hover:text-cyan-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2";
              }
            })()
          ),
          on_click(new ChangeView(new DashboardView()))
        ]),
        toList([
          svg(
            toList([
              class$("w-4 h-4 mr-2"),
              attribute2("fill", "none"),
              attribute2("stroke", "currentColor"),
              attribute2("viewBox", "0 0 24 24")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2("stroke-width", "2"),
                  attribute2(
                    "d",
                    "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                  )
                ])
              ),
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2("stroke-width", "2"),
                  attribute2("d", "M8 1v6m8-6v6")
                ])
              )
            ])
          ),
          text3("Dashboard")
        ])
      ),
      button(
        toList([
          class$(
            (() => {
              if (current_view instanceof ProjectsView) {
                return "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 bg-cyan-500 text-white shadow-md hover:bg-cyan-600 dark:bg-cyan-400 dark:text-gray-900 dark:hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2";
              } else {
                return "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 dark:text-gray-300 dark:hover:text-cyan-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2";
              }
            })()
          ),
          on_click(new ChangeView(new ProjectsView()))
        ]),
        toList([
          svg(
            toList([
              class$("w-4 h-4 mr-2"),
              attribute2("fill", "none"),
              attribute2("stroke", "currentColor"),
              attribute2("viewBox", "0 0 24 24")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2("stroke-width", "2"),
                  attribute2(
                    "d",
                    "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  )
                ])
              )
            ])
          ),
          text3("Projects")
        ])
      ),
      button(
        toList([
          class$(
            (() => {
              if (current_view instanceof TasksView) {
                return "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 bg-cyan-500 text-white shadow-md hover:bg-cyan-600 dark:bg-cyan-400 dark:text-gray-900 dark:hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2";
              } else {
                return "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 dark:text-gray-300 dark:hover:text-cyan-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2";
              }
            })()
          ),
          on_click(new ChangeView(new TasksView(new None())))
        ]),
        toList([
          svg(
            toList([
              class$("w-4 h-4 mr-2"),
              attribute2("fill", "none"),
              attribute2("stroke", "currentColor"),
              attribute2("viewBox", "0 0 24 24")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2("stroke-width", "2"),
                  attribute2(
                    "d",
                    "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  )
                ])
              )
            ])
          ),
          text3("Tasks")
        ])
      ),
      button(
        toList([
          class$(
            (() => {
              if (current_view instanceof TeamView) {
                return "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 bg-cyan-500 text-white shadow-md hover:bg-cyan-600 dark:bg-cyan-400 dark:text-gray-900 dark:hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2";
              } else {
                return "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 dark:text-gray-300 dark:hover:text-cyan-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2";
              }
            })()
          ),
          on_click(new ChangeView(new TeamView()))
        ]),
        toList([
          svg(
            toList([
              class$("w-4 h-4 mr-2"),
              attribute2("fill", "none"),
              attribute2("stroke", "currentColor"),
              attribute2("viewBox", "0 0 24 24")
            ]),
            toList([
              path(
                toList([
                  attribute2("stroke-linecap", "round"),
                  attribute2("stroke-linejoin", "round"),
                  attribute2("stroke-width", "2"),
                  attribute2(
                    "d",
                    "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-1.85a4 4 0 11-5.7-5.7 4 4 0 015.7 5.7z"
                  )
                ])
              )
            ])
          ),
          text3("Team")
        ])
      )
    ])
  );
}
function view_refresh_button() {
  return button(
    toList([
      class$(
        "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-green-600 text-white shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ml-4"
      ),
      on_click(new RefreshData())
    ]),
    toList([
      svg(
        toList([
          class$("w-4 h-4 mr-2"),
          attribute2("fill", "none"),
          attribute2("stroke", "currentColor"),
          attribute2("viewBox", "0 0 24 24")
        ]),
        toList([
          path(
            toList([
              attribute2("stroke-linecap", "round"),
              attribute2("stroke-linejoin", "round"),
              attribute2("stroke-width", "2"),
              attribute2(
                "d",
                "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              )
            ])
          )
        ])
      ),
      text3("Refresh")
    ])
  );
}
function view_content(current_view, dashboard, projects, tasks, team_members, loading_states, form_state) {
  if (current_view instanceof DashboardView) {
    return view_dashboard(
      dashboard,
      projects,
      tasks,
      loading_states,
      new RefreshData(),
      new ChangeView(new ProjectsView()),
      new ChangeView(new TasksView(new None())),
      new ChangeView(new TeamView())
    );
  } else if (current_view instanceof ProjectsView) {
    return view_projects(
      projects,
      loading_states.projects,
      (var0) => {
        return new FilterTasksByProject(var0);
      },
      new ShowAddProjectForm(),
      (var0) => {
        return new ShowEditProjectForm(var0);
      },
      form_state,
      new CloseForm(),
      (var0) => {
        return new UpdateProjectFormName(var0);
      },
      (var0) => {
        return new UpdateProjectFormDescription(var0);
      },
      (var0) => {
        return new UpdateProjectFormDeadline(var0);
      },
      (var0) => {
        return new UpdateProjectFormStatus(var0);
      },
      (var0) => {
        return new UpdateProjectFormColor(var0);
      },
      new SubmitProjectForm(),
      (var0, var1) => {
        return new UpdateProjectStatus(var0, var1);
      }
    );
  } else if (current_view instanceof TasksView) {
    let filter_project_id = current_view.project_id;
    return view_tasks(
      tasks,
      projects,
      team_members,
      filter_project_id,
      loading_states.tasks,
      new ChangeView(new TasksView(new None())),
      new ShowAddTaskForm(),
      (var0) => {
        return new ShowEditTaskForm(var0);
      },
      form_state,
      new CloseForm(),
      (var0) => {
        return new UpdateTaskFormProjectId(var0);
      },
      (var0) => {
        return new UpdateTaskFormTitle(var0);
      },
      (var0) => {
        return new UpdateTaskFormDescription(var0);
      },
      (var0) => {
        return new UpdateTaskFormStatus(var0);
      },
      (var0) => {
        return new UpdateTaskFormPriority(var0);
      },
      (var0) => {
        return new UpdateTaskFormAssignedTo(var0);
      },
      (var0) => {
        return new UpdateTaskFormDueDate(var0);
      },
      (var0) => {
        return new UpdateTaskFormHoursLogged(var0);
      },
      new SubmitTaskForm(),
      (var0, var1) => {
        return new UpdateTaskStatus(var0, var1);
      }
    );
  } else {
    return view_team(team_members, loading_states.team);
  }
}
function view(model) {
  if (model instanceof Loading) {
    return div(
      toList([class$("loading")]),
      toList([text3("Loading...")])
    );
  } else if (model instanceof Loaded) {
    let dashboard = model.dashboard;
    let projects = model.projects;
    let tasks = model.tasks;
    let team_members = model.team_members;
    let current_view = model.current_view;
    let loading_states = model.loading_states;
    let form_state = model.form_state;
    return div(
      toList([class$("min-h-screen bg-gray-50 dark:bg-gray-900 p-6")]),
      toList([
        div(
          toList([class$("flex items-center justify-center mb-8")]),
          toList([view_navigation(current_view), view_refresh_button()])
        ),
        view_content(
          current_view,
          dashboard,
          projects,
          tasks,
          team_members,
          loading_states,
          form_state
        )
      ])
    );
  } else {
    return div(
      toList([class$("error")]),
      toList([text3("Loading failed")])
    );
  }
}
function main() {
  let app = application(init, update2, view);
  let $ = start3(app, "#app", void 0);
  if (!($ instanceof Ok)) {
    throw makeError(
      "let_assert",
      FILEPATH,
      "frontend",
      91,
      "main",
      "Pattern match failed, no pattern matched the value.",
      {
        value: $,
        start: 2453,
        end: 2502,
        pattern_start: 2464,
        pattern_end: 2469
      }
    );
  }
  return void 0;
}

// build/.lustre/entry.mjs
main();
