(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('most'), require('@most/multicast')) :
  typeof define === 'function' && define.amd ? define(['most', '@most/multicast'], factory) :
  (global.mostCreate = factory(global.most,global.mostMulticast));
}(this, function (most,_most_multicast) { 'use strict';

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  function defer (task) { return Promise.resolve(task).then(runTask); }

  function runTask (task) {
    try {
      return task.run()
    } catch (e) {
      return task.error(e)
    }
  }

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  var PropagateAllTask = function PropagateAllTask (sink, time, events) {
    this.sink = sink
    this.time = time
    this.events = events
  };

  PropagateAllTask.prototype.run = function run () {
      var this$1 = this;

    var events = this.events
    var sink = this.sink
    var event

    for (var i = 0, l = events.length; i < l; ++i) {
      event = events[i]
      this$1.time = event.time
      sink.event(event.time, event.value)
    }

    events.length = 0
  };

  PropagateAllTask.prototype.error = function error (e) {
    this.sink.error(this.time, e)
  };

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  var EndTask = function EndTask (t, x, sink) {
    this.time = t
    this.value = x
    this.sink = sink
  };

  EndTask.prototype.run = function run () {
    this.sink.end(this.time, this.value)
  };

  EndTask.prototype.error = function error (e) {
    this.sink.error(this.time, e)
  };

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  var ErrorTask = function ErrorTask (t, e, sink) {
    this.time = t
    this.value = e
    this.sink = sink
  };

  ErrorTask.prototype.run = function run () {
    this.sink.error(this.time, this.value)
  };

  ErrorTask.prototype.error = function error (e) {
    throw e
  };

  var DeferredSink = function DeferredSink (sink) {
    this.sink = sink
    this.events = []
    this.active = true
  };

  DeferredSink.prototype.event = function event (t, x) {
    if (!this.active) {
      return
    }

    if (this.events.length === 0) {
      defer(new PropagateAllTask(this.sink, t, this.events))
    }

    this.events.push({ time: t, value: x })
  };

  DeferredSink.prototype.end = function end (t, x) {
    if (!this.active) {
      return
    }

    this._end(new EndTask(t, x, this.sink))
  };

  DeferredSink.prototype.error = function error (t, e) {
    this._end(new ErrorTask(t, e, this.sink))
  };

  DeferredSink.prototype._end = function _end (task) {
    this.active = false
    defer(task)
  };

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  var CreateSubscriber = function CreateSubscriber (sink, scheduler, subscribe) {
    this.sink = sink
    this.scheduler = scheduler
    this._unsubscribe = this._init(subscribe)
  };

  CreateSubscriber.prototype._init = function _init (subscribe) {
      var this$1 = this;

    var add = function (x) { return this$1.sink.event(this$1.scheduler.now(), x); }
    var end = function (x) { return this$1.sink.end(this$1.scheduler.now(), x); }
    var error = function (e) { return this$1.sink.error(this$1.scheduler.now(), e); }

    try {
      return subscribe(add, end, error)
    } catch (e) {
      error(e)
    }
  };

  CreateSubscriber.prototype.dispose = function dispose () {
    if (typeof this._unsubscribe === 'function') {
      return this._unsubscribe.call(void 0)
    }
  };

  var Create = function Create (subscribe) {
    this._subscribe = subscribe
  };

  Create.prototype.run = function run (sink, scheduler) {
    return new CreateSubscriber(new DeferredSink(sink), scheduler, this._subscribe)
  };

  function index (run) { return new most.Stream(new _most_multicast.MulticastSource(new Create(run))); }

  return index;

}));
},{"@most/multicast":2,"most":116}],2:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@most/prelude')) :
  typeof define === 'function' && define.amd ? define(['exports', '@most/prelude'], factory) :
  (factory((global.mostMulticast = global.mostMulticast || {}),global.mostPrelude));
}(this, (function (exports,_most_prelude) { 'use strict';

var MulticastDisposable = function MulticastDisposable (source, sink) {
  this.source = source
  this.sink = sink
  this.disposed = false
};

MulticastDisposable.prototype.dispose = function dispose () {
  if (this.disposed) {
    return
  }
  this.disposed = true
  var remaining = this.source.remove(this.sink)
  return remaining === 0 && this.source._dispose()
};

function tryEvent (t, x, sink) {
  try {
    sink.event(t, x)
  } catch (e) {
    sink.error(t, e)
  }
}

function tryEnd (t, x, sink) {
  try {
    sink.end(t, x)
  } catch (e) {
    sink.error(t, e)
  }
}

var dispose = function (disposable) { return disposable.dispose(); }

var emptyDisposable = {
  dispose: function dispose$1 () {}
}

var MulticastSource = function MulticastSource (source) {
  this.source = source
  this.sinks = []
  this._disposable = emptyDisposable
};

MulticastSource.prototype.run = function run (sink, scheduler) {
  var n = this.add(sink)
  if (n === 1) {
    this._disposable = this.source.run(this, scheduler)
  }
  return new MulticastDisposable(this, sink)
};

MulticastSource.prototype._dispose = function _dispose () {
  var disposable = this._disposable
  this._disposable = emptyDisposable
  return Promise.resolve(disposable).then(dispose)
};

MulticastSource.prototype.add = function add (sink) {
  this.sinks = _most_prelude.append(sink, this.sinks)
  return this.sinks.length
};

MulticastSource.prototype.remove = function remove$1 (sink) {
  var i = _most_prelude.findIndex(sink, this.sinks)
  // istanbul ignore next
  if (i >= 0) {
    this.sinks = _most_prelude.remove(i, this.sinks)
  }

  return this.sinks.length
};

MulticastSource.prototype.event = function event (time, value) {
  var s = this.sinks
  if (s.length === 1) {
    return s[0].event(time, value)
  }
  for (var i = 0; i < s.length; ++i) {
    tryEvent(time, value, s[i])
  }
};

MulticastSource.prototype.end = function end (time, value) {
  var s = this.sinks
  for (var i = 0; i < s.length; ++i) {
    tryEnd(time, value, s[i])
  }
};

MulticastSource.prototype.error = function error (time, err) {
  var s = this.sinks
  for (var i = 0; i < s.length; ++i) {
    s[i].error(time, err)
  }
};

function multicast (stream) {
  var source = stream.source
  return source instanceof MulticastSource
    ? stream
    : new stream.constructor(new MulticastSource(source))
}

exports['default'] = multicast;
exports.MulticastSource = MulticastSource;

Object.defineProperty(exports, '__esModule', { value: true });

})));


},{"@most/prelude":3}],3:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.mostPrelude = global.mostPrelude || {})));
}(this, (function (exports) { 'use strict';

/** @license MIT License (c) copyright 2010-2016 original author or authors */

// Non-mutating array operations

// cons :: a -> [a] -> [a]
// a with x prepended
function cons (x, a) {
  var l = a.length
  var b = new Array(l + 1)
  b[0] = x
  for (var i = 0; i < l; ++i) {
    b[i + 1] = a[i]
  }
  return b
}

// append :: a -> [a] -> [a]
// a with x appended
function append (x, a) {
  var l = a.length
  var b = new Array(l + 1)
  for (var i = 0; i < l; ++i) {
    b[i] = a[i]
  }

  b[l] = x
  return b
}

// drop :: Int -> [a] -> [a]
// drop first n elements
function drop (n, a) { // eslint-disable-line complexity
  if (n < 0) {
    throw new TypeError('n must be >= 0')
  }

  var l = a.length
  if (n === 0 || l === 0) {
    return a
  }

  if (n >= l) {
    return []
  }

  return unsafeDrop(n, a, l - n)
}

// unsafeDrop :: Int -> [a] -> Int -> [a]
// Internal helper for drop
function unsafeDrop (n, a, l) {
  var b = new Array(l)
  for (var i = 0; i < l; ++i) {
    b[i] = a[n + i]
  }
  return b
}

// tail :: [a] -> [a]
// drop head element
function tail (a) {
  return drop(1, a)
}

// copy :: [a] -> [a]
// duplicate a (shallow duplication)
function copy (a) {
  var l = a.length
  var b = new Array(l)
  for (var i = 0; i < l; ++i) {
    b[i] = a[i]
  }
  return b
}

// map :: (a -> b) -> [a] -> [b]
// transform each element with f
function map (f, a) {
  var l = a.length
  var b = new Array(l)
  for (var i = 0; i < l; ++i) {
    b[i] = f(a[i])
  }
  return b
}

// reduce :: (a -> b -> a) -> a -> [b] -> a
// accumulate via left-fold
function reduce (f, z, a) {
  var r = z
  for (var i = 0, l = a.length; i < l; ++i) {
    r = f(r, a[i], i)
  }
  return r
}

// replace :: a -> Int -> [a]
// replace element at index
function replace (x, i, a) { // eslint-disable-line complexity
  if (i < 0) {
    throw new TypeError('i must be >= 0')
  }

  var l = a.length
  var b = new Array(l)
  for (var j = 0; j < l; ++j) {
    b[j] = i === j ? x : a[j]
  }
  return b
}

// remove :: Int -> [a] -> [a]
// remove element at index
function remove (i, a) {  // eslint-disable-line complexity
  if (i < 0) {
    throw new TypeError('i must be >= 0')
  }

  var l = a.length
  if (l === 0 || i >= l) { // exit early if index beyond end of array
    return a
  }

  if (l === 1) { // exit early if index in bounds and length === 1
    return []
  }

  return unsafeRemove(i, a, l - 1)
}

// unsafeRemove :: Int -> [a] -> Int -> [a]
// Internal helper to remove element at index
function unsafeRemove (i, a, l) {
  var b = new Array(l)
  var j
  for (j = 0; j < i; ++j) {
    b[j] = a[j]
  }
  for (j = i; j < l; ++j) {
    b[j] = a[j + 1]
  }

  return b
}

// removeAll :: (a -> boolean) -> [a] -> [a]
// remove all elements matching a predicate
function removeAll (f, a) {
  var l = a.length
  var b = new Array(l)
  var j = 0
  for (var x, i = 0; i < l; ++i) {
    x = a[i]
    if (!f(x)) {
      b[j] = x
      ++j
    }
  }

  b.length = j
  return b
}

// findIndex :: a -> [a] -> Int
// find index of x in a, from the left
function findIndex (x, a) {
  for (var i = 0, l = a.length; i < l; ++i) {
    if (x === a[i]) {
      return i
    }
  }
  return -1
}

// isArrayLike :: * -> boolean
// Return true iff x is array-like
function isArrayLike (x) {
  return x != null && typeof x.length === 'number' && typeof x !== 'function'
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */

// id :: a -> a
var id = function (x) { return x; }

// compose :: (b -> c) -> (a -> b) -> (a -> c)
var compose = function (f, g) { return function (x) { return f(g(x)); }; }

// apply :: (a -> b) -> a -> b
var apply = function (f, x) { return f(x); }

// curry2 :: ((a, b) -> c) -> (a -> b -> c)
function curry2 (f) {
  function curried (a, b) {
    switch (arguments.length) {
      case 0: return curried
      case 1: return function (b) { return f(a, b); }
      default: return f(a, b)
    }
  }
  return curried
}

// curry3 :: ((a, b, c) -> d) -> (a -> b -> c -> d)
function curry3 (f) {
  function curried (a, b, c) { // eslint-disable-line complexity
    switch (arguments.length) {
      case 0: return curried
      case 1: return curry2(function (b, c) { return f(a, b, c); })
      case 2: return function (c) { return f(a, b, c); }
      default:return f(a, b, c)
    }
  }
  return curried
}

exports.cons = cons;
exports.append = append;
exports.drop = drop;
exports.tail = tail;
exports.copy = copy;
exports.map = map;
exports.reduce = reduce;
exports.replace = replace;
exports.remove = remove;
exports.removeAll = removeAll;
exports.findIndex = findIndex;
exports.isArrayLike = isArrayLike;
exports.id = id;
exports.compose = compose;
exports.apply = apply;
exports.curry2 = curry2;
exports.curry3 = curry3;

Object.defineProperty(exports, '__esModule', { value: true });

})));


},{}],4:[function(require,module,exports){
var bundleFn = arguments[3];
var sources = arguments[4];
var cache = arguments[5];

var stringify = JSON.stringify;

module.exports = function (fn, options) {
    var wkey;
    var cacheKeys = Object.keys(cache);

    for (var i = 0, l = cacheKeys.length; i < l; i++) {
        var key = cacheKeys[i];
        var exp = cache[key].exports;
        // Using babel as a transpiler to use esmodule, the export will always
        // be an object with the default export as a property of it. To ensure
        // the existing api and babel esmodule exports are both supported we
        // check for both
        if (exp === fn || exp && exp.default === fn) {
            wkey = key;
            break;
        }
    }

    if (!wkey) {
        wkey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
        var wcache = {};
        for (var i = 0, l = cacheKeys.length; i < l; i++) {
            var key = cacheKeys[i];
            wcache[key] = key;
        }
        sources[wkey] = [
            Function(['require','module','exports'], '(' + fn + ')(self)'),
            wcache
        ];
    }
    var skey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);

    var scache = {}; scache[wkey] = wkey;
    sources[skey] = [
        Function(['require'], (
            // try to call default if defined to also support babel esmodule
            // exports
            'var f = require(' + stringify(wkey) + ');' +
            '(f.default ? f.default : f)(self);'
        )),
        scache
    ];

    var workerSources = {};
    resolveSources(skey);

    function resolveSources(key) {
        workerSources[key] = true;

        for (var depPath in sources[key][1]) {
            var depKey = sources[key][1][depPath];
            if (!workerSources[depKey]) {
                resolveSources(depKey);
            }
        }
    }

    var src = '(' + bundleFn + ')({'
        + Object.keys(workerSources).map(function (key) {
            return stringify(key) + ':['
                + sources[key][0]
                + ',' + stringify(sources[key][1]) + ']'
            ;
        }).join(',')
        + '},{},[' + stringify(skey) + '])'
    ;

    var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    var blob = new Blob([src], { type: 'text/javascript' });
    if (options && options.bare) { return blob; }
    var workerUrl = URL.createObjectURL(blob);
    var worker = new Worker(workerUrl);
    worker.objectURL = workerUrl;
    return worker;
};

},{}],5:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
(function (global){
'use strict';

var buffer = require('buffer');
var Buffer = buffer.Buffer;
var SlowBuffer = buffer.SlowBuffer;
var MAX_LEN = buffer.kMaxLength || 2147483647;
exports.alloc = function alloc(size, fill, encoding) {
  if (typeof Buffer.alloc === 'function') {
    return Buffer.alloc(size, fill, encoding);
  }
  if (typeof encoding === 'number') {
    throw new TypeError('encoding must not be number');
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size > MAX_LEN) {
    throw new RangeError('size is too large');
  }
  var enc = encoding;
  var _fill = fill;
  if (_fill === undefined) {
    enc = undefined;
    _fill = 0;
  }
  var buf = new Buffer(size);
  if (typeof _fill === 'string') {
    var fillBuf = new Buffer(_fill, enc);
    var flen = fillBuf.length;
    var i = -1;
    while (++i < size) {
      buf[i] = fillBuf[i % flen];
    }
  } else {
    buf.fill(_fill);
  }
  return buf;
}
exports.allocUnsafe = function allocUnsafe(size) {
  if (typeof Buffer.allocUnsafe === 'function') {
    return Buffer.allocUnsafe(size);
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size > MAX_LEN) {
    throw new RangeError('size is too large');
  }
  return new Buffer(size);
}
exports.from = function from(value, encodingOrOffset, length) {
  if (typeof Buffer.from === 'function' && (!global.Uint8Array || Uint8Array.from !== Buffer.from)) {
    return Buffer.from(value, encodingOrOffset, length);
  }
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number');
  }
  if (typeof value === 'string') {
    return new Buffer(value, encodingOrOffset);
  }
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    var offset = encodingOrOffset;
    if (arguments.length === 1) {
      return new Buffer(value);
    }
    if (typeof offset === 'undefined') {
      offset = 0;
    }
    var len = length;
    if (typeof len === 'undefined') {
      len = value.byteLength - offset;
    }
    if (offset >= value.byteLength) {
      throw new RangeError('\'offset\' is out of bounds');
    }
    if (len > value.byteLength - offset) {
      throw new RangeError('\'length\' is out of bounds');
    }
    return new Buffer(value.slice(offset, offset + len));
  }
  if (Buffer.isBuffer(value)) {
    var out = new Buffer(value.length);
    value.copy(out, 0, 0, value.length);
    return out;
  }
  if (value) {
    if (Array.isArray(value) || (typeof ArrayBuffer !== 'undefined' && value.buffer instanceof ArrayBuffer) || 'length' in value) {
      return new Buffer(value);
    }
    if (value.type === 'Buffer' && Array.isArray(value.data)) {
      return new Buffer(value.data);
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ' + 'ArrayBuffer, Array, or array-like object.');
}
exports.allocUnsafeSlow = function allocUnsafeSlow(size) {
  if (typeof Buffer.allocUnsafeSlow === 'function') {
    return Buffer.allocUnsafeSlow(size);
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size >= MAX_LEN) {
    throw new RangeError('size is too large');
  }
  return new SlowBuffer(size);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"buffer":8}],8:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":5,"ieee754":77,"isarray":9}],9:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],10:[function(require,module,exports){
(function (process){
(function () {
  // Hueristics.
  var isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node;
  var isBrowser = typeof window !== 'undefined';
  var isModule = typeof module !== 'undefined' && !!module.exports;

  // Export.
  var detect = (isModule ? exports : (this.detect = {}));
  detect.isNode = isNode;
  detect.isBrowser = isBrowser;
  detect.isModule = isModule;
}).call(this);
}).call(this,require('_process'))
},{"_process":147}],11:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../is-buffer/index.js")})
},{"../../is-buffer/index.js":79}],12:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],13:[function(require,module,exports){
'use strict';

/**
 * Analogue of Object.assign().
 * Copies properties from one or more source objects to
 * a target object. Existing keys on the target object will be overwritten.
 *
 * > Note: This differs from spec in some important ways:
 * > 1. Will throw if passed non-objects, including `undefined` or `null` values.
 * > 2. Does not support the curious Exception handling behavior, exceptions are thrown immediately.
 * > For more details, see:
 * > https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 *
 *
 *
 * @param  {Object} target      The target object to copy properties to.
 * @param  {Object} source, ... The source(s) to copy properties from.
 * @return {Object}             The updated target object.
 */
module.exports = function fastAssign (target) {
  var totalArgs = arguments.length,
      source, i, totalKeys, keys, key, j;

  for (i = 1; i < totalArgs; i++) {
    source = arguments[i];
    keys = Object.keys(source);
    totalKeys = keys.length;
    for (j = 0; j < totalKeys; j++) {
      key = keys[j];
      target[key] = source[key];
    }
  }
  return target;
};

},{}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = defaultTransportFactory;

var _fetch = require('./fetch');

var _fetch2 = _interopRequireDefault(_fetch);

var _xhr = require('./xhr');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// selected is used to cache the detected transport.
var selected = null;

// defaultTransportFactory selects the most appropriate transport based on the
// capabilities of the current environment.
function defaultTransportFactory() {
  if (!selected) {
    selected = detectTransport();
  }
  return selected;
}

function detectTransport() {
  if (typeof Response !== 'undefined' && Response.prototype.hasOwnProperty("body")) {
    // fetch with ReadableStream support.
    return _fetch2.default;
  }

  var mozChunked = 'moz-chunked-arraybuffer';
  if (supportsXhrResponseType(mozChunked)) {
    // Firefox, ArrayBuffer support.
    return (0, _xhr.makeXhrTransport)({
      responseType: mozChunked,
      responseParserFactory: function responseParserFactory() {
        return function (response) {
          return new Uint8Array(response);
        };
      }
    });
  }

  // Bog-standard, expensive, text concatenation with byte encoding :(
  return (0, _xhr.makeXhrTransport)({
    responseType: 'text',
    responseParserFactory: function responseParserFactory() {
      var encoder = new TextEncoder();
      var offset = 0;
      return function (response) {
        var chunk = response.substr(offset);
        offset = response.length;

        return encoder.encode(chunk, { stream: true });
      };
    }
  });
}

function supportsXhrResponseType(type) {
  try {
    var tmpXhr = new XMLHttpRequest();
    tmpXhr.responseType = type;
    return tmpXhr.responseType === type;
  } catch (e) {/* IE throws on setting responseType to an unsupported value */}
  return false;
}

},{"./fetch":16,"./xhr":19}],15:[function(require,module,exports){
module.exports = require("./index").default;

},{"./index":17}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fetchRequest;
// thin wrapper around `fetch()` to ensure we only expose the properties provided by
// the XHR polyfil; / fetch-readablestream Response API.
function fetchRequest(url, options) {
  return fetch(url, options).then(function (r) {
    return {
      body: r.body,
      headers: r.headers,
      ok: r.ok,
      status: r.status,
      statusText: r.statusText,
      url: r.url
    };
  });
}
},{}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fetchStream;

var _defaultTransportFactory = require('./defaultTransportFactory');

var _defaultTransportFactory2 = _interopRequireDefault(_defaultTransportFactory);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function fetchStream(url) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var transport = options.transport;
  if (!transport) {
    transport = fetchStream.transportFactory();
  }

  return transport(url, options);
}

// override this function to delegate to an alternative transport function selection
// strategy; useful when testing.
fetchStream.transportFactory = _defaultTransportFactory2.default;
},{"./defaultTransportFactory":14}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Headers is a partial polyfill for the HTML5 Headers class.
var Headers = exports.Headers = function () {
  function Headers() {
    var _this = this;

    var h = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Headers);

    this.h = {};
    if (h instanceof Headers) {
      h.forEach(function (value, key) {
        return _this.append(key, value);
      });
    }
    Object.getOwnPropertyNames(h).forEach(function (key) {
      return _this.append(key, h[key]);
    });
  }

  _createClass(Headers, [{
    key: "append",
    value: function append(key, value) {
      key = key.toLowerCase();
      if (!Array.isArray(this.h[key])) {
        this.h[key] = [];
      }
      this.h[key].push(value);
    }
  }, {
    key: "set",
    value: function set(key, value) {
      this.h[key.toLowerCase()] = [value];
    }
  }, {
    key: "has",
    value: function has(key) {
      return Array.isArray(this.h[key.toLowerCase()]);
    }
  }, {
    key: "get",
    value: function get(key) {
      key = key.toLowerCase();
      if (Array.isArray(this.h[key])) {
        return this.h[key][0];
      }
    }
  }, {
    key: "getAll",
    value: function getAll(key) {
      return this.h[key.toLowerCase()].concat();
    }
  }, {
    key: "entries",
    value: function entries() {
      var items = [];
      this.forEach(function (value, key) {
        items.push([key, value]);
      });
      return makeIterator(items);
    }

    // forEach is not part of the official spec.

  }, {
    key: "forEach",
    value: function forEach(callback, thisArg) {
      var _this2 = this;

      Object.getOwnPropertyNames(this.h).forEach(function (key) {
        _this2.h[key].forEach(function (value) {
          return callback.call(thisArg, value, key, _this2);
        });
      }, this);
    }
  }]);

  return Headers;
}();

function makeIterator(items) {
  return _defineProperty({
    next: function next() {
      var value = items.shift();
      return {
        done: value === undefined,
        value: value
      };
    }
  }, Symbol.iterator, function () {
    return this;
  });
}
},{}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeXhrTransport = makeXhrTransport;
exports.parseResposneHeaders = parseResposneHeaders;

var _Headers = require('./polyfill/Headers');

function makeXhrTransport(_ref) {
  var responseType = _ref.responseType;
  var responseParserFactory = _ref.responseParserFactory;

  return function xhrTransport(url, options) {
    var xhr = new XMLHttpRequest();
    var responseParser = responseParserFactory();

    var responseStreamController = void 0;
    var cancelled = false;

    var responseStream = new ReadableStream({
      start: function start(c) {
        responseStreamController = c;
      },
      cancel: function cancel() {
        cancelled = true;
        xhr.abort();
      }
    });

    var _options$method = options.method;
    var method = _options$method === undefined ? 'GET' : _options$method;


    xhr.open(method, url);
    xhr.responseType = responseType;
    xhr.withCredentials = options.credentials !== 'omit';
    if (options.headers) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = options.headers.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var pair = _step.value;

          xhr.setRequestHeader(pair[0], pair[1]);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }

    return new Promise(function (resolve, reject) {
      if (options.body && (method === 'GET' || method === 'HEAD')) {
        reject(new TypeError("Failed to execute 'fetchStream' on 'Window': Request with GET/HEAD method cannot have body"));
      }

      xhr.onreadystatechange = function () {
        if (xhr.readyState === xhr.HEADERS_RECEIVED) {
          return resolve({
            body: responseStream,
            headers: parseResposneHeaders(xhr.getAllResponseHeaders()),
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            url: makeResponseUrl(xhr.responseURL, url)
          });
        }
      };

      xhr.onerror = function () {
        return reject(new TypeError('Network request failed'));
      };

      xhr.ontimeout = function () {
        reject(new TypeError('Network request failed'));
      };

      xhr.onprogress = function () {
        if (!cancelled) {
          var bytes = responseParser(xhr.response);
          responseStreamController.enqueue(bytes);
        }
      };

      xhr.onload = function () {
        responseStreamController.close();
      };

      xhr.send(options.body);
    });
  };
}

function makeHeaders() {
  // Prefer the native method if provided by the browser.
  if (typeof Headers !== 'undefined') {
    return new Headers();
  }
  return new _Headers.Headers();
}

function makeResponseUrl(responseUrl, requestUrl) {
  if (!responseUrl) {
    // best guess; note this will not correctly handle redirects.
    if (requestUrl.substring(0, 4) !== "http") {
      return location.origin + requestUrl;
    }
    return requestUrl;
  }
  return responseUrl;
}

function parseResposneHeaders(str) {
  var hdrs = makeHeaders();
  if (str) {
    var pairs = str.split('\r\n');
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      var index = p.indexOf(': ');
      if (index > 0) {
        var key = p.substring(0, index);
        var value = p.substring(index + 2);
        hdrs.append(key, value);
      }
    }
  }
  return hdrs;
}
},{"./polyfill/Headers":18}],20:[function(require,module,exports){
module.exports = adjoint;

/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function adjoint(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};
},{}],21:[function(require,module,exports){
module.exports = clone;

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
function clone(a) {
    var out = new Float32Array(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],22:[function(require,module,exports){
module.exports = copy;

/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],23:[function(require,module,exports){
module.exports = create;

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
function create() {
    var out = new Float32Array(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
},{}],24:[function(require,module,exports){
module.exports = determinant;

/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
function determinant(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};
},{}],25:[function(require,module,exports){
module.exports = fromQuat;

/**
 * Creates a matrix from a quaternion rotation.
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @returns {mat4} out
 */
function fromQuat(out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};
},{}],26:[function(require,module,exports){
module.exports = fromRotationTranslation;

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
function fromRotationTranslation(out, q, v) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};
},{}],27:[function(require,module,exports){
module.exports = frustum;

/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
function frustum(out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};
},{}],28:[function(require,module,exports){
module.exports = identity;

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
},{}],29:[function(require,module,exports){
module.exports = {
  create: require('./create')
  , clone: require('./clone')
  , copy: require('./copy')
  , identity: require('./identity')
  , transpose: require('./transpose')
  , invert: require('./invert')
  , adjoint: require('./adjoint')
  , determinant: require('./determinant')
  , multiply: require('./multiply')
  , translate: require('./translate')
  , scale: require('./scale')
  , rotate: require('./rotate')
  , rotateX: require('./rotateX')
  , rotateY: require('./rotateY')
  , rotateZ: require('./rotateZ')
  , fromRotationTranslation: require('./fromRotationTranslation')
  , fromQuat: require('./fromQuat')
  , frustum: require('./frustum')
  , perspective: require('./perspective')
  , perspectiveFromFieldOfView: require('./perspectiveFromFieldOfView')
  , ortho: require('./ortho')
  , lookAt: require('./lookAt')
  , str: require('./str')
}
},{"./adjoint":20,"./clone":21,"./copy":22,"./create":23,"./determinant":24,"./fromQuat":25,"./fromRotationTranslation":26,"./frustum":27,"./identity":28,"./invert":30,"./lookAt":31,"./multiply":32,"./ortho":33,"./perspective":34,"./perspectiveFromFieldOfView":35,"./rotate":36,"./rotateX":37,"./rotateY":38,"./rotateZ":39,"./scale":40,"./str":41,"./translate":42,"./transpose":43}],30:[function(require,module,exports){
module.exports = invert;

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function invert(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};
},{}],31:[function(require,module,exports){
var identity = require('./identity');

module.exports = lookAt;

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
function lookAt(out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < 0.000001 &&
        Math.abs(eyey - centery) < 0.000001 &&
        Math.abs(eyez - centerz) < 0.000001) {
        return identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};
},{"./identity":28}],32:[function(require,module,exports){
module.exports = multiply;

/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
function multiply(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};
},{}],33:[function(require,module,exports){
module.exports = ortho;

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function ortho(out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};
},{}],34:[function(require,module,exports){
module.exports = perspective;

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function perspective(out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};
},{}],35:[function(require,module,exports){
module.exports = perspectiveFromFieldOfView;

/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function perspectiveFromFieldOfView(out, fov, near, far) {
    var upTan = Math.tan(fov.upDegrees * Math.PI/180.0),
        downTan = Math.tan(fov.downDegrees * Math.PI/180.0),
        leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0),
        rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0),
        xScale = 2.0 / (leftTan + rightTan),
        yScale = 2.0 / (upTan + downTan);

    out[0] = xScale;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    out[4] = 0.0;
    out[5] = yScale;
    out[6] = 0.0;
    out[7] = 0.0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = ((upTan - downTan) * yScale * 0.5);
    out[10] = far / (near - far);
    out[11] = -1.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = (far * near) / (near - far);
    out[15] = 0.0;
    return out;
}


},{}],36:[function(require,module,exports){
module.exports = rotate;

/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
function rotate(out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < 0.000001) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};
},{}],37:[function(require,module,exports){
module.exports = rotateX;

/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateX(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};
},{}],38:[function(require,module,exports){
module.exports = rotateY;

/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateY(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};
},{}],39:[function(require,module,exports){
module.exports = rotateZ;

/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateZ(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};
},{}],40:[function(require,module,exports){
module.exports = scale;

/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
function scale(out, a, v) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],41:[function(require,module,exports){
module.exports = str;

/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
function str(a) {
    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + 
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};
},{}],42:[function(require,module,exports){
module.exports = translate;

/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
function translate(out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};
},{}],43:[function(require,module,exports){
module.exports = transpose;

/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function transpose(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }
    
    return out;
};
},{}],44:[function(require,module,exports){
module.exports = add;

/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function add(out, a, b) {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    out[2] = a[2] + b[2]
    return out
}
},{}],45:[function(require,module,exports){
module.exports = angle

var fromValues = require('./fromValues')
var normalize = require('./normalize')
var dot = require('./dot')

/**
 * Get the angle between two 3D vectors
 * @param {vec3} a The first operand
 * @param {vec3} b The second operand
 * @returns {Number} The angle in radians
 */
function angle(a, b) {
    var tempA = fromValues(a[0], a[1], a[2])
    var tempB = fromValues(b[0], b[1], b[2])
 
    normalize(tempA, tempA)
    normalize(tempB, tempB)
 
    var cosine = dot(tempA, tempB)

    if(cosine > 1.0){
        return 0
    } else {
        return Math.acos(cosine)
    }     
}

},{"./dot":52,"./fromValues":54,"./normalize":63}],46:[function(require,module,exports){
module.exports = clone;

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {vec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */
function clone(a) {
    var out = new Float32Array(3)
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
}
},{}],47:[function(require,module,exports){
module.exports = copy;

/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the source vector
 * @returns {vec3} out
 */
function copy(out, a) {
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
}
},{}],48:[function(require,module,exports){
module.exports = create;

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
function create() {
    var out = new Float32Array(3)
    out[0] = 0
    out[1] = 0
    out[2] = 0
    return out
}
},{}],49:[function(require,module,exports){
module.exports = cross;

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function cross(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2]

    out[0] = ay * bz - az * by
    out[1] = az * bx - ax * bz
    out[2] = ax * by - ay * bx
    return out
}
},{}],50:[function(require,module,exports){
module.exports = distance;

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} distance between a and b
 */
function distance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2]
    return Math.sqrt(x*x + y*y + z*z)
}
},{}],51:[function(require,module,exports){
module.exports = divide;

/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function divide(out, a, b) {
    out[0] = a[0] / b[0]
    out[1] = a[1] / b[1]
    out[2] = a[2] / b[2]
    return out
}
},{}],52:[function(require,module,exports){
module.exports = dot;

/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */
function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
},{}],53:[function(require,module,exports){
module.exports = forEach;

var vec = require('./create')()

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
function forEach(a, stride, offset, count, fn, arg) {
        var i, l
        if(!stride) {
            stride = 3
        }

        if(!offset) {
            offset = 0
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length)
        } else {
            l = a.length
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i] 
            vec[1] = a[i+1] 
            vec[2] = a[i+2]
            fn(vec, vec, arg)
            a[i] = vec[0] 
            a[i+1] = vec[1] 
            a[i+2] = vec[2]
        }
        
        return a
}
},{"./create":48}],54:[function(require,module,exports){
module.exports = fromValues;

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */
function fromValues(x, y, z) {
    var out = new Float32Array(3)
    out[0] = x
    out[1] = y
    out[2] = z
    return out
}
},{}],55:[function(require,module,exports){
module.exports = {
  create: require('./create')
  , clone: require('./clone')
  , angle: require('./angle')
  , fromValues: require('./fromValues')
  , copy: require('./copy')
  , set: require('./set')
  , add: require('./add')
  , subtract: require('./subtract')
  , multiply: require('./multiply')
  , divide: require('./divide')
  , min: require('./min')
  , max: require('./max')
  , scale: require('./scale')
  , scaleAndAdd: require('./scaleAndAdd')
  , distance: require('./distance')
  , squaredDistance: require('./squaredDistance')
  , length: require('./length')
  , squaredLength: require('./squaredLength')
  , negate: require('./negate')
  , inverse: require('./inverse')
  , normalize: require('./normalize')
  , dot: require('./dot')
  , cross: require('./cross')
  , lerp: require('./lerp')
  , random: require('./random')
  , transformMat4: require('./transformMat4')
  , transformMat3: require('./transformMat3')
  , transformQuat: require('./transformQuat')
  , rotateX: require('./rotateX')
  , rotateY: require('./rotateY')
  , rotateZ: require('./rotateZ')
  , forEach: require('./forEach')
}
},{"./add":44,"./angle":45,"./clone":46,"./copy":47,"./create":48,"./cross":49,"./distance":50,"./divide":51,"./dot":52,"./forEach":53,"./fromValues":54,"./inverse":56,"./length":57,"./lerp":58,"./max":59,"./min":60,"./multiply":61,"./negate":62,"./normalize":63,"./random":64,"./rotateX":65,"./rotateY":66,"./rotateZ":67,"./scale":68,"./scaleAndAdd":69,"./set":70,"./squaredDistance":71,"./squaredLength":72,"./subtract":73,"./transformMat3":74,"./transformMat4":75,"./transformQuat":76}],56:[function(require,module,exports){
module.exports = inverse;

/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to invert
 * @returns {vec3} out
 */
function inverse(out, a) {
  out[0] = 1.0 / a[0]
  out[1] = 1.0 / a[1]
  out[2] = 1.0 / a[2]
  return out
}
},{}],57:[function(require,module,exports){
module.exports = length;

/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */
function length(a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    return Math.sqrt(x*x + y*y + z*z)
}
},{}],58:[function(require,module,exports){
module.exports = lerp;

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
function lerp(out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2]
    out[0] = ax + t * (b[0] - ax)
    out[1] = ay + t * (b[1] - ay)
    out[2] = az + t * (b[2] - az)
    return out
}
},{}],59:[function(require,module,exports){
module.exports = max;

/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function max(out, a, b) {
    out[0] = Math.max(a[0], b[0])
    out[1] = Math.max(a[1], b[1])
    out[2] = Math.max(a[2], b[2])
    return out
}
},{}],60:[function(require,module,exports){
module.exports = min;

/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function min(out, a, b) {
    out[0] = Math.min(a[0], b[0])
    out[1] = Math.min(a[1], b[1])
    out[2] = Math.min(a[2], b[2])
    return out
}
},{}],61:[function(require,module,exports){
module.exports = multiply;

/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function multiply(out, a, b) {
    out[0] = a[0] * b[0]
    out[1] = a[1] * b[1]
    out[2] = a[2] * b[2]
    return out
}
},{}],62:[function(require,module,exports){
module.exports = negate;

/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to negate
 * @returns {vec3} out
 */
function negate(out, a) {
    out[0] = -a[0]
    out[1] = -a[1]
    out[2] = -a[2]
    return out
}
},{}],63:[function(require,module,exports){
module.exports = normalize;

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */
function normalize(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    var len = x*x + y*y + z*z
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len)
        out[0] = a[0] * len
        out[1] = a[1] * len
        out[2] = a[2] * len
    }
    return out
}
},{}],64:[function(require,module,exports){
module.exports = random;

/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */
function random(out, scale) {
    scale = scale || 1.0

    var r = Math.random() * 2.0 * Math.PI
    var z = (Math.random() * 2.0) - 1.0
    var zScale = Math.sqrt(1.0-z*z) * scale

    out[0] = Math.cos(r) * zScale
    out[1] = Math.sin(r) * zScale
    out[2] = z * scale
    return out
}
},{}],65:[function(require,module,exports){
module.exports = rotateX;

/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateX(out, a, b, c){
    var p = [], r=[]
    //Translate point to the origin
    p[0] = a[0] - b[0]
    p[1] = a[1] - b[1]
    p[2] = a[2] - b[2]

    //perform rotation
    r[0] = p[0]
    r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c)
    r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c)

    //translate to correct position
    out[0] = r[0] + b[0]
    out[1] = r[1] + b[1]
    out[2] = r[2] + b[2]

    return out
}
},{}],66:[function(require,module,exports){
module.exports = rotateY;

/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateY(out, a, b, c){
    var p = [], r=[]
    //Translate point to the origin
    p[0] = a[0] - b[0]
    p[1] = a[1] - b[1]
    p[2] = a[2] - b[2]
  
    //perform rotation
    r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c)
    r[1] = p[1]
    r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c)
  
    //translate to correct position
    out[0] = r[0] + b[0]
    out[1] = r[1] + b[1]
    out[2] = r[2] + b[2]
  
    return out
}
},{}],67:[function(require,module,exports){
module.exports = rotateZ;

/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateZ(out, a, b, c){
    var p = [], r=[]
    //Translate point to the origin
    p[0] = a[0] - b[0]
    p[1] = a[1] - b[1]
    p[2] = a[2] - b[2]
  
    //perform rotation
    r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c)
    r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c)
    r[2] = p[2]
  
    //translate to correct position
    out[0] = r[0] + b[0]
    out[1] = r[1] + b[1]
    out[2] = r[2] + b[2]
  
    return out
}
},{}],68:[function(require,module,exports){
module.exports = scale;

/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */
function scale(out, a, b) {
    out[0] = a[0] * b
    out[1] = a[1] * b
    out[2] = a[2] * b
    return out
}
},{}],69:[function(require,module,exports){
module.exports = scaleAndAdd;

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */
function scaleAndAdd(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale)
    out[1] = a[1] + (b[1] * scale)
    out[2] = a[2] + (b[2] * scale)
    return out
}
},{}],70:[function(require,module,exports){
module.exports = set;

/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */
function set(out, x, y, z) {
    out[0] = x
    out[1] = y
    out[2] = z
    return out
}
},{}],71:[function(require,module,exports){
module.exports = squaredDistance;

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} squared distance between a and b
 */
function squaredDistance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2]
    return x*x + y*y + z*z
}
},{}],72:[function(require,module,exports){
module.exports = squaredLength;

/**
 * Calculates the squared length of a vec3
 *
 * @param {vec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
function squaredLength(a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    return x*x + y*y + z*z
}
},{}],73:[function(require,module,exports){
module.exports = subtract;

/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function subtract(out, a, b) {
    out[0] = a[0] - b[0]
    out[1] = a[1] - b[1]
    out[2] = a[2] - b[2]
    return out
}
},{}],74:[function(require,module,exports){
module.exports = transformMat3;

/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */
function transformMat3(out, a, m) {
    var x = a[0], y = a[1], z = a[2]
    out[0] = x * m[0] + y * m[3] + z * m[6]
    out[1] = x * m[1] + y * m[4] + z * m[7]
    out[2] = x * m[2] + y * m[5] + z * m[8]
    return out
}
},{}],75:[function(require,module,exports){
module.exports = transformMat4;

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */
function transformMat4(out, a, m) {
    var x = a[0], y = a[1], z = a[2],
        w = m[3] * x + m[7] * y + m[11] * z + m[15]
    w = w || 1.0
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
    return out
}
},{}],76:[function(require,module,exports){
module.exports = transformQuat;

/**
 * Transforms the vec3 with a quat
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec3} out
 */
function transformQuat(out, a, q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx
    return out
}
},{}],77:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],78:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],79:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],80:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = LinkedList;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * Doubly linked list
 * @constructor
 */
function LinkedList() {
  this.head = null;
  this.length = 0;
}

/**
 * Add a node to the end of the list
 * @param {{prev:Object|null, next:Object|null, dispose:function}} x node to add
 */
LinkedList.prototype.add = function (x) {
  if (this.head !== null) {
    this.head.prev = x;
    x.next = this.head;
  }
  this.head = x;
  ++this.length;
};

/**
 * Remove the provided node from the list
 * @param {{prev:Object|null, next:Object|null, dispose:function}} x node to remove
 */
LinkedList.prototype.remove = function (x) {
  // eslint-disable-line  complexity
  --this.length;
  if (x === this.head) {
    this.head = this.head.next;
  }
  if (x.next !== null) {
    x.next.prev = x.prev;
    x.next = null;
  }
  if (x.prev !== null) {
    x.prev.next = x.next;
    x.prev = null;
  }
};

/**
 * @returns {boolean} true iff there are no nodes in the list
 */
LinkedList.prototype.isEmpty = function () {
  return this.length === 0;
};

/**
 * Dispose all nodes
 * @returns {Promise} promise that fulfills when all nodes have been disposed,
 *  or rejects if an error occurs while disposing
 */
LinkedList.prototype.dispose = function () {
  if (this.isEmpty()) {
    return Promise.resolve();
  }

  var promises = [];
  var x = this.head;
  this.head = null;
  this.length = 0;

  while (x !== null) {
    promises.push(x.dispose());
    x = x.next;
  }

  return Promise.all(promises);
};
},{}],81:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isPromise = isPromise;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function isPromise(p) {
  return p !== null && typeof p === 'object' && typeof p.then === 'function';
}
},{}],82:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Queue;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

// Based on https://github.com/petkaantonov/deque

function Queue(capPow2) {
  this._capacity = capPow2 || 32;
  this._length = 0;
  this._head = 0;
}

Queue.prototype.push = function (x) {
  var len = this._length;
  this._checkCapacity(len + 1);

  var i = this._head + len & this._capacity - 1;
  this[i] = x;
  this._length = len + 1;
};

Queue.prototype.shift = function () {
  var head = this._head;
  var x = this[head];

  this[head] = void 0;
  this._head = head + 1 & this._capacity - 1;
  this._length--;
  return x;
};

Queue.prototype.isEmpty = function () {
  return this._length === 0;
};

Queue.prototype.length = function () {
  return this._length;
};

Queue.prototype._checkCapacity = function (size) {
  if (this._capacity < size) {
    this._ensureCapacity(this._capacity << 1);
  }
};

Queue.prototype._ensureCapacity = function (capacity) {
  var oldCapacity = this._capacity;
  this._capacity = capacity;

  var last = this._head + this._length;

  if (last > oldCapacity) {
    copy(this, 0, this, oldCapacity, last & oldCapacity - 1);
  }
};

function copy(src, srcIndex, dst, dstIndex, len) {
  for (var j = 0; j < len; ++j) {
    dst[j + dstIndex] = src[j + srcIndex];
    src[j + srcIndex] = void 0;
  }
}
},{}],83:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Stream;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Stream(source) {
  this.source = source;
}
},{}],84:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scan = scan;
exports.reduce = reduce;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _runSource = require('../runSource');

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a stream containing successive reduce results of applying f to
 * the previous reduce result and the current stream item.
 * @param {function(result:*, x:*):*} f reducer function
 * @param {*} initial initial value
 * @param {Stream} stream stream to scan
 * @returns {Stream} new stream containing successive reduce results
 */
function scan(f, initial, stream) {
  return new _Stream2.default(new Scan(f, initial, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Scan(f, z, source) {
  this.source = source;
  this.f = f;
  this.value = z;
}

Scan.prototype.run = function (sink, scheduler) {
  var d1 = scheduler.asap(_PropagateTask2.default.event(this.value, sink));
  var d2 = this.source.run(new ScanSink(this.f, this.value, sink), scheduler);
  return dispose.all([d1, d2]);
};

function ScanSink(f, z, sink) {
  this.f = f;
  this.value = z;
  this.sink = sink;
}

ScanSink.prototype.event = function (t, x) {
  var f = this.f;
  this.value = f(this.value, x);
  this.sink.event(t, this.value);
};

ScanSink.prototype.error = _Pipe2.default.prototype.error;
ScanSink.prototype.end = _Pipe2.default.prototype.end;

/**
* Reduce a stream to produce a single result.  Note that reducing an infinite
* stream will return a Promise that never fulfills, but that may reject if an error
* occurs.
* @param {function(result:*, x:*):*} f reducer function
* @param {*} initial initial value
* @param {Stream} stream to reduce
* @returns {Promise} promise for the file result of the reduce
*/
function reduce(f, initial, stream) {
  return (0, _runSource.withDefaultScheduler)(new Reduce(f, initial, stream.source));
}

function Reduce(f, z, source) {
  this.source = source;
  this.f = f;
  this.value = z;
}

Reduce.prototype.run = function (sink, scheduler) {
  return this.source.run(new ReduceSink(this.f, this.value, sink), scheduler);
};

function ReduceSink(f, z, sink) {
  this.f = f;
  this.value = z;
  this.sink = sink;
}

ReduceSink.prototype.event = function (t, x) {
  var f = this.f;
  this.value = f(this.value, x);
  this.sink.event(t, this.value);
};

ReduceSink.prototype.error = _Pipe2.default.prototype.error;

ReduceSink.prototype.end = function (t) {
  this.sink.end(t, this.value);
};
},{"../Stream":83,"../disposable/dispose":111,"../runSource":122,"../scheduler/PropagateTask":124,"../sink/Pipe":131}],85:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ap = ap;

var _combine = require('./combine');

var _prelude = require('@most/prelude');

/**
 * Assume fs is a stream containing functions, and apply the latest function
 * in fs to the latest value in xs.
 * fs:         --f---------g--------h------>
 * xs:         -a-------b-------c-------d-->
 * ap(fs, xs): --fa-----fb-gb---gc--hc--hd->
 * @param {Stream} fs stream of functions to apply to the latest x
 * @param {Stream} xs stream of values to which to apply all the latest f
 * @returns {Stream} stream containing all the applications of fs to xs
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function ap(fs, xs) {
  return (0, _combine.combine)(_prelude.apply, fs, xs);
}
},{"./combine":87,"@most/prelude":3}],86:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cons = cons;
exports.concat = concat;

var _core = require('../source/core');

var _continueWith = require('./continueWith');

/**
 * @param {*} x value to prepend
 * @param {Stream} stream
 * @returns {Stream} new stream with x prepended
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function cons(x, stream) {
  return concat((0, _core.of)(x), stream);
}

/**
* @param {Stream} left
* @param {Stream} right
* @returns {Stream} new stream containing all events in left followed by all
*  events in right.  This *timeshifts* right to the end of left.
*/
function concat(left, right) {
  return (0, _continueWith.continueWith)(function () {
    return right;
  }, left);
}
},{"../source/core":135,"./continueWith":89}],87:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.combine = combine;
exports.combineArray = combineArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _transform = require('./transform');

var transform = _interopRequireWildcard(_transform);

var _core = require('../source/core');

var core = _interopRequireWildcard(_core);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _IndexSink = require('../sink/IndexSink');

var _IndexSink2 = _interopRequireDefault(_IndexSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _invoke = require('../invoke');

var _invoke2 = _interopRequireDefault(_invoke);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var map = base.map;
var tail = base.tail;

/**
 * Combine latest events from all input streams
 * @param {function(...events):*} f function to combine most recent events
 * @returns {Stream} stream containing the result of applying f to the most recent
 *  event of each input stream, whenever a new event arrives on any stream.
 */
function combine(f /*, ...streams */) {
  return combineArray(f, tail(arguments));
}

/**
* Combine latest events from all input streams
* @param {function(...events):*} f function to combine most recent events
* @param {[Stream]} streams most recent events
* @returns {Stream} stream containing the result of applying f to the most recent
*  event of each input stream, whenever a new event arrives on any stream.
*/
function combineArray(f, streams) {
  var l = streams.length;
  return l === 0 ? core.empty() : l === 1 ? transform.map(f, streams[0]) : new _Stream2.default(combineSources(f, streams));
}

function combineSources(f, streams) {
  return new Combine(f, map(getSource, streams));
}

function getSource(stream) {
  return stream.source;
}

function Combine(f, sources) {
  this.f = f;
  this.sources = sources;
}

Combine.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l);
  var sinks = new Array(l);

  var mergeSink = new CombineSink(disposables, sinks, sink, this.f);

  for (var indexSink, i = 0; i < l; ++i) {
    indexSink = sinks[i] = new _IndexSink2.default(i, mergeSink);
    disposables[i] = this$1.sources[i].run(indexSink, scheduler);
  }

  return dispose.all(disposables);
};

function CombineSink(disposables, sinks, sink, f) {
  var this$1 = this;

  this.sink = sink;
  this.disposables = disposables;
  this.sinks = sinks;
  this.f = f;

  var l = sinks.length;
  this.awaiting = l;
  this.values = new Array(l);
  this.hasValue = new Array(l);
  for (var i = 0; i < l; ++i) {
    this$1.hasValue[i] = false;
  }

  this.activeCount = sinks.length;
}

CombineSink.prototype.error = _Pipe2.default.prototype.error;

CombineSink.prototype.event = function (t, indexedValue) {
  var i = indexedValue.index;
  var awaiting = this._updateReady(i);

  this.values[i] = indexedValue.value;
  if (awaiting === 0) {
    this.sink.event(t, (0, _invoke2.default)(this.f, this.values));
  }
};

CombineSink.prototype._updateReady = function (index) {
  if (this.awaiting > 0) {
    if (!this.hasValue[index]) {
      this.hasValue[index] = true;
      this.awaiting -= 1;
    }
  }
  return this.awaiting;
};

CombineSink.prototype.end = function (t, indexedValue) {
  dispose.tryDispose(t, this.disposables[indexedValue.index], this.sink);
  if (--this.activeCount === 0) {
    this.sink.end(t, indexedValue.value);
  }
};
},{"../Stream":83,"../disposable/dispose":111,"../invoke":117,"../sink/IndexSink":130,"../sink/Pipe":131,"../source/core":135,"./transform":107,"@most/prelude":3}],88:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concatMap = concatMap;

var _mergeConcurrently = require('./mergeConcurrently');

/**
 * Map each value in stream to a new stream, and concatenate them all
 * stream:              -a---b---cX
 * f(a):                 1-1-1-1X
 * f(b):                        -2-2-2-2X
 * f(c):                                -3-3-3-3X
 * stream.concatMap(f): -1-1-1-1-2-2-2-2-3-3-3-3X
 * @param {function(x:*):Stream} f function to map each value to a stream
 * @param {Stream} stream
 * @returns {Stream} new stream containing all events from each stream returned by f
 */
function concatMap(f, stream) {
  return (0, _mergeConcurrently.mergeMapConcurrently)(f, 1, stream);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
},{"./mergeConcurrently":97}],89:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.continueWith = continueWith;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function continueWith(f, stream) {
  return new _Stream2.default(new ContinueWith(f, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function ContinueWith(f, source) {
  this.f = f;
  this.source = source;
}

ContinueWith.prototype.run = function (sink, scheduler) {
  return new ContinueWithSink(this.f, this.source, sink, scheduler);
};

function ContinueWithSink(f, source, sink, scheduler) {
  this.f = f;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;
  this.disposable = dispose.once(source.run(this, scheduler));
}

ContinueWithSink.prototype.error = _Pipe2.default.prototype.error;

ContinueWithSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }
  this.sink.event(t, x);
};

ContinueWithSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }

  dispose.tryDispose(t, this.disposable, this.sink);
  this._startNext(t, x, this.sink);
};

ContinueWithSink.prototype._startNext = function (t, x, sink) {
  try {
    this.disposable = this._continue(this.f, x, sink);
  } catch (e) {
    sink.error(t, e);
  }
};

ContinueWithSink.prototype._continue = function (f, x, sink) {
  return f(x).source.run(sink, this.scheduler);
};

ContinueWithSink.prototype.dispose = function () {
  this.active = false;
  return this.disposable.dispose();
};
},{"../Stream":83,"../disposable/dispose":111,"../sink/Pipe":131}],90:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.delay = delay;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {Number} delayTime milliseconds to delay each item
 * @param {Stream} stream
 * @returns {Stream} new stream containing the same items, but delayed by ms
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function delay(delayTime, stream) {
  return delayTime <= 0 ? stream : new _Stream2.default(new Delay(delayTime, stream.source));
}

function Delay(dt, source) {
  this.dt = dt;
  this.source = source;
}

Delay.prototype.run = function (sink, scheduler) {
  var delaySink = new DelaySink(this.dt, sink, scheduler);
  return dispose.all([delaySink, this.source.run(delaySink, scheduler)]);
};

function DelaySink(dt, sink, scheduler) {
  this.dt = dt;
  this.sink = sink;
  this.scheduler = scheduler;
}

DelaySink.prototype.dispose = function () {
  var self = this;
  this.scheduler.cancelAll(function (task) {
    return task.sink === self.sink;
  });
};

DelaySink.prototype.event = function (t, x) {
  this.scheduler.delay(this.dt, _PropagateTask2.default.event(x, this.sink));
};

DelaySink.prototype.end = function (t, x) {
  this.scheduler.delay(this.dt, _PropagateTask2.default.end(x, this.sink));
};

DelaySink.prototype.error = _Pipe2.default.prototype.error;
},{"../Stream":83,"../disposable/dispose":111,"../scheduler/PropagateTask":124,"../sink/Pipe":131}],91:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flatMapError = undefined;
exports.recoverWith = recoverWith;
exports.throwError = throwError;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _SafeSink = require('../sink/SafeSink');

var _SafeSink2 = _interopRequireDefault(_SafeSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _tryEvent = require('../source/tryEvent');

var tryEvent = _interopRequireWildcard(_tryEvent);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * If stream encounters an error, recover and continue with items from stream
 * returned by f.
 * @param {function(error:*):Stream} f function which returns a new stream
 * @param {Stream} stream
 * @returns {Stream} new stream which will recover from an error by calling f
 */
function recoverWith(f, stream) {
  return new _Stream2.default(new RecoverWith(f, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var flatMapError = exports.flatMapError = recoverWith;

/**
 * Create a stream containing only an error
 * @param {*} e error value, preferably an Error or Error subtype
 * @returns {Stream} new stream containing only an error
 */
function throwError(e) {
  return new _Stream2.default(new ErrorSource(e));
}

function ErrorSource(e) {
  this.value = e;
}

ErrorSource.prototype.run = function (sink, scheduler) {
  return scheduler.asap(new _PropagateTask2.default(runError, this.value, sink));
};

function runError(t, e, sink) {
  sink.error(t, e);
}

function RecoverWith(f, source) {
  this.f = f;
  this.source = source;
}

RecoverWith.prototype.run = function (sink, scheduler) {
  return new RecoverWithSink(this.f, this.source, sink, scheduler);
};

function RecoverWithSink(f, source, sink, scheduler) {
  this.f = f;
  this.sink = new _SafeSink2.default(sink);
  this.scheduler = scheduler;
  this.disposable = source.run(this, scheduler);
}

RecoverWithSink.prototype.event = function (t, x) {
  tryEvent.tryEvent(t, x, this.sink);
};

RecoverWithSink.prototype.end = function (t, x) {
  tryEvent.tryEnd(t, x, this.sink);
};

RecoverWithSink.prototype.error = function (t, e) {
  var nextSink = this.sink.disable();

  dispose.tryDispose(t, this.disposable, this.sink);
  this._startNext(t, e, nextSink);
};

RecoverWithSink.prototype._startNext = function (t, x, sink) {
  try {
    this.disposable = this._continue(this.f, x, sink);
  } catch (e) {
    sink.error(t, e);
  }
};

RecoverWithSink.prototype._continue = function (f, x, sink) {
  var stream = f(x);
  return stream.source.run(sink, this.scheduler);
};

RecoverWithSink.prototype.dispose = function () {
  return this.disposable.dispose();
};
},{"../Stream":83,"../disposable/dispose":111,"../scheduler/PropagateTask":124,"../sink/SafeSink":132,"../source/tryEvent":143}],92:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filter = filter;
exports.skipRepeats = skipRepeats;
exports.skipRepeatsWith = skipRepeatsWith;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _Filter = require('../fusion/Filter');

var _Filter2 = _interopRequireDefault(_Filter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Retain only items matching a predicate
 * @param {function(x:*):boolean} p filtering predicate called for each item
 * @param {Stream} stream stream to filter
 * @returns {Stream} stream containing only items for which predicate returns truthy
 */
function filter(p, stream) {
  return new _Stream2.default(_Filter2.default.create(p, stream.source));
}

/**
 * Skip repeated events, using === to detect duplicates
 * @param {Stream} stream stream from which to omit repeated events
 * @returns {Stream} stream without repeated events
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function skipRepeats(stream) {
  return skipRepeatsWith(same, stream);
}

/**
 * Skip repeated events using the provided equals function to detect duplicates
 * @param {function(a:*, b:*):boolean} equals optional function to compare items
 * @param {Stream} stream stream from which to omit repeated events
 * @returns {Stream} stream without repeated events
 */
function skipRepeatsWith(equals, stream) {
  return new _Stream2.default(new SkipRepeats(equals, stream.source));
}

function SkipRepeats(equals, source) {
  this.equals = equals;
  this.source = source;
}

SkipRepeats.prototype.run = function (sink, scheduler) {
  return this.source.run(new SkipRepeatsSink(this.equals, sink), scheduler);
};

function SkipRepeatsSink(equals, sink) {
  this.equals = equals;
  this.sink = sink;
  this.value = void 0;
  this.init = true;
}

SkipRepeatsSink.prototype.end = _Pipe2.default.prototype.end;
SkipRepeatsSink.prototype.error = _Pipe2.default.prototype.error;

SkipRepeatsSink.prototype.event = function (t, x) {
  if (this.init) {
    this.init = false;
    this.value = x;
    this.sink.event(t, x);
  } else if (!this.equals(this.value, x)) {
    this.value = x;
    this.sink.event(t, x);
  }
};

function same(a, b) {
  return a === b;
}
},{"../Stream":83,"../fusion/Filter":113,"../sink/Pipe":131}],93:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flatMap = flatMap;
exports.join = join;

var _mergeConcurrently = require('./mergeConcurrently');

/**
 * Map each value in the stream to a new stream, and merge it into the
 * returned outer stream. Event arrival times are preserved.
 * @param {function(x:*):Stream} f chaining function, must return a Stream
 * @param {Stream} stream
 * @returns {Stream} new stream containing all events from each stream returned by f
 */
function flatMap(f, stream) {
  return (0, _mergeConcurrently.mergeMapConcurrently)(f, Infinity, stream);
}

/**
 * Monadic join. Flatten a Stream<Stream<X>> to Stream<X> by merging inner
 * streams to the outer. Event arrival times are preserved.
 * @param {Stream<Stream<X>>} stream stream of streams
 * @returns {Stream<X>} new stream containing all events of all inner streams
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function join(stream) {
  return (0, _mergeConcurrently.mergeConcurrently)(Infinity, stream);
}
},{"./mergeConcurrently":97}],94:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.throttle = throttle;
exports.debounce = debounce;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

var _Map = require('../fusion/Map');

var _Map2 = _interopRequireDefault(_Map);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Limit the rate of events by suppressing events that occur too often
 * @param {Number} period time to suppress events
 * @param {Stream} stream
 * @returns {Stream}
 */
function throttle(period, stream) {
  return new _Stream2.default(throttleSource(period, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function throttleSource(period, source) {
  return source instanceof _Map2.default ? commuteMapThrottle(period, source) : source instanceof Throttle ? fuseThrottle(period, source) : new Throttle(period, source);
}

function commuteMapThrottle(period, source) {
  return _Map2.default.create(source.f, throttleSource(period, source.source));
}

function fuseThrottle(period, source) {
  return new Throttle(Math.max(period, source.period), source.source);
}

function Throttle(period, source) {
  this.period = period;
  this.source = source;
}

Throttle.prototype.run = function (sink, scheduler) {
  return this.source.run(new ThrottleSink(this.period, sink), scheduler);
};

function ThrottleSink(period, sink) {
  this.time = 0;
  this.period = period;
  this.sink = sink;
}

ThrottleSink.prototype.event = function (t, x) {
  if (t >= this.time) {
    this.time = t + this.period;
    this.sink.event(t, x);
  }
};

ThrottleSink.prototype.end = _Pipe2.default.prototype.end;

ThrottleSink.prototype.error = _Pipe2.default.prototype.error;

/**
 * Wait for a burst of events to subside and emit only the last event in the burst
 * @param {Number} period events occuring more frequently than this
 *  will be suppressed
 * @param {Stream} stream stream to debounce
 * @returns {Stream} new debounced stream
 */
function debounce(period, stream) {
  return new _Stream2.default(new Debounce(period, stream.source));
}

function Debounce(dt, source) {
  this.dt = dt;
  this.source = source;
}

Debounce.prototype.run = function (sink, scheduler) {
  return new DebounceSink(this.dt, this.source, sink, scheduler);
};

function DebounceSink(dt, source, sink, scheduler) {
  this.dt = dt;
  this.sink = sink;
  this.scheduler = scheduler;
  this.value = void 0;
  this.timer = null;

  var sourceDisposable = source.run(this, scheduler);
  this.disposable = dispose.all([this, sourceDisposable]);
}

DebounceSink.prototype.event = function (t, x) {
  this._clearTimer();
  this.value = x;
  this.timer = this.scheduler.delay(this.dt, _PropagateTask2.default.event(x, this.sink));
};

DebounceSink.prototype.end = function (t, x) {
  if (this._clearTimer()) {
    this.sink.event(t, this.value);
    this.value = void 0;
  }
  this.sink.end(t, x);
};

DebounceSink.prototype.error = function (t, x) {
  this._clearTimer();
  this.sink.error(t, x);
};

DebounceSink.prototype.dispose = function () {
  this._clearTimer();
};

DebounceSink.prototype._clearTimer = function () {
  if (this.timer === null) {
    return false;
  }
  this.timer.dispose();
  this.timer = null;
  return true;
};
},{"../Stream":83,"../disposable/dispose":111,"../fusion/Map":115,"../scheduler/PropagateTask":124,"../sink/Pipe":131}],95:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loop = loop;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Generalized feedback loop. Call a stepper function for each event. The stepper
 * will be called with 2 params: the current seed and the an event value.  It must
 * return a new { seed, value } pair. The `seed` will be fed back into the next
 * invocation of stepper, and the `value` will be propagated as the event value.
 * @param {function(seed:*, value:*):{seed:*, value:*}} stepper loop step function
 * @param {*} seed initial seed value passed to first stepper call
 * @param {Stream} stream event stream
 * @returns {Stream} new stream whose values are the `value` field of the objects
 * returned by the stepper
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function loop(stepper, seed, stream) {
  return new _Stream2.default(new Loop(stepper, seed, stream.source));
}

function Loop(stepper, seed, source) {
  this.step = stepper;
  this.seed = seed;
  this.source = source;
}

Loop.prototype.run = function (sink, scheduler) {
  return this.source.run(new LoopSink(this.step, this.seed, sink), scheduler);
};

function LoopSink(stepper, seed, sink) {
  this.step = stepper;
  this.seed = seed;
  this.sink = sink;
}

LoopSink.prototype.error = _Pipe2.default.prototype.error;

LoopSink.prototype.event = function (t, x) {
  var result = this.step(this.seed, x);
  this.seed = result.seed;
  this.sink.event(t, result.value);
};

LoopSink.prototype.end = function (t) {
  this.sink.end(t, this.seed);
};
},{"../Stream":83,"../sink/Pipe":131}],96:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.merge = merge;
exports.mergeArray = mergeArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _IndexSink = require('../sink/IndexSink');

var _IndexSink2 = _interopRequireDefault(_IndexSink);

var _core = require('../source/core');

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var copy = base.copy;
var reduce = base.reduce;

/**
 * @returns {Stream} stream containing events from all streams in the argument
 * list in time order.  If two events are simultaneous they will be merged in
 * arbitrary order.
 */
function merge() /* ...streams*/{
  return mergeArray(copy(arguments));
}

/**
 * @param {Array} streams array of stream to merge
 * @returns {Stream} stream containing events from all input observables
 * in time order.  If two events are simultaneous they will be merged in
 * arbitrary order.
 */
function mergeArray(streams) {
  var l = streams.length;
  return l === 0 ? (0, _core.empty)() : l === 1 ? streams[0] : new _Stream2.default(mergeSources(streams));
}

/**
 * This implements fusion/flattening for merge.  It will
 * fuse adjacent merge operations.  For example:
 * - a.merge(b).merge(c) effectively becomes merge(a, b, c)
 * - merge(a, merge(b, c)) effectively becomes merge(a, b, c)
 * It does this by concatenating the sources arrays of
 * any nested Merge sources, in effect "flattening" nested
 * merge operations into a single merge.
 */
function mergeSources(streams) {
  return new Merge(reduce(appendSources, [], streams));
}

function appendSources(sources, stream) {
  var source = stream.source;
  return source instanceof Merge ? sources.concat(source.sources) : sources.concat(source);
}

function Merge(sources) {
  this.sources = sources;
}

Merge.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l);
  var sinks = new Array(l);

  var mergeSink = new MergeSink(disposables, sinks, sink);

  for (var indexSink, i = 0; i < l; ++i) {
    indexSink = sinks[i] = new _IndexSink2.default(i, mergeSink);
    disposables[i] = this$1.sources[i].run(indexSink, scheduler);
  }

  return dispose.all(disposables);
};

function MergeSink(disposables, sinks, sink) {
  this.sink = sink;
  this.disposables = disposables;
  this.activeCount = sinks.length;
}

MergeSink.prototype.error = _Pipe2.default.prototype.error;

MergeSink.prototype.event = function (t, indexValue) {
  this.sink.event(t, indexValue.value);
};

MergeSink.prototype.end = function (t, indexedValue) {
  dispose.tryDispose(t, this.disposables[indexedValue.index], this.sink);
  if (--this.activeCount === 0) {
    this.sink.end(t, indexedValue.value);
  }
};
},{"../Stream":83,"../disposable/dispose":111,"../sink/IndexSink":130,"../sink/Pipe":131,"../source/core":135,"@most/prelude":3}],97:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeConcurrently = mergeConcurrently;
exports.mergeMapConcurrently = mergeMapConcurrently;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _LinkedList = require('../LinkedList');

var _LinkedList2 = _interopRequireDefault(_LinkedList);

var _prelude = require('@most/prelude');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function mergeConcurrently(concurrency, stream) {
  return mergeMapConcurrently(_prelude.id, concurrency, stream);
}

function mergeMapConcurrently(f, concurrency, stream) {
  return new _Stream2.default(new MergeConcurrently(f, concurrency, stream.source));
}

function MergeConcurrently(f, concurrency, source) {
  this.f = f;
  this.concurrency = concurrency;
  this.source = source;
}

MergeConcurrently.prototype.run = function (sink, scheduler) {
  return new Outer(this.f, this.concurrency, this.source, sink, scheduler);
};

function Outer(f, concurrency, source, sink, scheduler) {
  this.f = f;
  this.concurrency = concurrency;
  this.sink = sink;
  this.scheduler = scheduler;
  this.pending = [];
  this.current = new _LinkedList2.default();
  this.disposable = dispose.once(source.run(this, scheduler));
  this.active = true;
}

Outer.prototype.event = function (t, x) {
  this._addInner(t, x);
};

Outer.prototype._addInner = function (t, x) {
  if (this.current.length < this.concurrency) {
    this._startInner(t, x);
  } else {
    this.pending.push(x);
  }
};

Outer.prototype._startInner = function (t, x) {
  try {
    this._initInner(t, x);
  } catch (e) {
    this.error(t, e);
  }
};

Outer.prototype._initInner = function (t, x) {
  var innerSink = new Inner(t, this, this.sink);
  innerSink.disposable = mapAndRun(this.f, x, innerSink, this.scheduler);
  this.current.add(innerSink);
};

function mapAndRun(f, x, sink, scheduler) {
  return f(x).source.run(sink, scheduler);
}

Outer.prototype.end = function (t, x) {
  this.active = false;
  dispose.tryDispose(t, this.disposable, this.sink);
  this._checkEnd(t, x);
};

Outer.prototype.error = function (t, e) {
  this.active = false;
  this.sink.error(t, e);
};

Outer.prototype.dispose = function () {
  this.active = false;
  this.pending.length = 0;
  return Promise.all([this.disposable.dispose(), this.current.dispose()]);
};

Outer.prototype._endInner = function (t, x, inner) {
  this.current.remove(inner);
  dispose.tryDispose(t, inner, this);

  if (this.pending.length === 0) {
    this._checkEnd(t, x);
  } else {
    this._startInner(t, this.pending.shift());
  }
};

Outer.prototype._checkEnd = function (t, x) {
  if (!this.active && this.current.isEmpty()) {
    this.sink.end(t, x);
  }
};

function Inner(time, outer, sink) {
  this.prev = this.next = null;
  this.time = time;
  this.outer = outer;
  this.sink = sink;
  this.disposable = void 0;
}

Inner.prototype.event = function (t, x) {
  this.sink.event(Math.max(t, this.time), x);
};

Inner.prototype.end = function (t, x) {
  this.outer._endInner(Math.max(t, this.time), x, this);
};

Inner.prototype.error = function (t, e) {
  this.outer.error(Math.max(t, this.time), e);
};

Inner.prototype.dispose = function () {
  return this.disposable.dispose();
};
},{"../LinkedList":80,"../Stream":83,"../disposable/dispose":111,"@most/prelude":3}],98:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.observe = observe;
exports.drain = drain;

var _runSource = require('../runSource');

var _transform = require('./transform');

/**
 * Observe all the event values in the stream in time order. The
 * provided function `f` will be called for each event value
 * @param {function(x:T):*} f function to call with each event value
 * @param {Stream<T>} stream stream to observe
 * @return {Promise} promise that fulfills after the stream ends without
 *  an error, or rejects if the stream ends with an error.
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function observe(f, stream) {
  return drain((0, _transform.tap)(f, stream));
}

/**
 * "Run" a stream by creating demand and consuming all events
 * @param {Stream<T>} stream stream to drain
 * @return {Promise} promise that fulfills after the stream ends without
 *  an error, or rejects if the stream ends with an error.
 */
function drain(stream) {
  return (0, _runSource.withDefaultScheduler)(stream.source);
}
},{"../runSource":122,"./transform":107}],99:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromPromise = fromPromise;
exports.awaitPromises = awaitPromises;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _fatalError = require('../fatalError');

var _fatalError2 = _interopRequireDefault(_fatalError);

var _core = require('../source/core');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a stream containing only the promise's fulfillment
 * value at the time it fulfills.
 * @param {Promise<T>} p promise
 * @return {Stream<T>} stream containing promise's fulfillment value.
 *  If the promise rejects, the stream will error
 */
function fromPromise(p) {
  return awaitPromises((0, _core.of)(p));
}

/**
 * Turn a Stream<Promise<T>> into Stream<T> by awaiting each promise.
 * Event order is preserved.
 * @param {Stream<Promise<T>>} stream
 * @return {Stream<T>} stream of fulfillment values.  The stream will
 * error if any promise rejects.
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function awaitPromises(stream) {
  return new _Stream2.default(new Await(stream.source));
}

function Await(source) {
  this.source = source;
}

Await.prototype.run = function (sink, scheduler) {
  return this.source.run(new AwaitSink(sink, scheduler), scheduler);
};

function AwaitSink(sink, scheduler) {
  this.sink = sink;
  this.scheduler = scheduler;
  this.queue = Promise.resolve();
  var self = this;

  // Pre-create closures, to avoid creating them per event
  this._eventBound = function (x) {
    self.sink.event(self.scheduler.now(), x);
  };

  this._endBound = function (x) {
    self.sink.end(self.scheduler.now(), x);
  };

  this._errorBound = function (e) {
    self.sink.error(self.scheduler.now(), e);
  };
}

AwaitSink.prototype.event = function (t, promise) {
  var self = this;
  this.queue = this.queue.then(function () {
    return self._event(promise);
  }).catch(this._errorBound);
};

AwaitSink.prototype.end = function (t, x) {
  var self = this;
  this.queue = this.queue.then(function () {
    return self._end(x);
  }).catch(this._errorBound);
};

AwaitSink.prototype.error = function (t, e) {
  var self = this;
  // Don't resolve error values, propagate directly
  this.queue = this.queue.then(function () {
    return self._errorBound(e);
  }).catch(_fatalError2.default);
};

AwaitSink.prototype._event = function (promise) {
  return promise.then(this._eventBound);
};

AwaitSink.prototype._end = function (x) {
  return Promise.resolve(x).then(this._endBound);
};
},{"../Stream":83,"../fatalError":112,"../source/core":135}],100:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sample = sample;
exports.sampleWith = sampleWith;
exports.sampleArray = sampleArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _invoke = require('../invoke');

var _invoke2 = _interopRequireDefault(_invoke);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * When an event arrives on sampler, emit the result of calling f with the latest
 * values of all streams being sampled
 * @param {function(...values):*} f function to apply to each set of sampled values
 * @param {Stream} sampler streams will be sampled whenever an event arrives
 *  on sampler
 * @returns {Stream} stream of sampled and transformed values
 */
function sample(f, sampler /*, ...streams */) {
  return sampleArray(f, sampler, base.drop(2, arguments));
}

/**
 * When an event arrives on sampler, emit the latest event value from stream.
 * @param {Stream} sampler stream of events at whose arrival time
 *  stream's latest value will be propagated
 * @param {Stream} stream stream of values
 * @returns {Stream} sampled stream of values
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function sampleWith(sampler, stream) {
  return new _Stream2.default(new Sampler(base.id, sampler.source, [stream.source]));
}

function sampleArray(f, sampler, streams) {
  return new _Stream2.default(new Sampler(f, sampler.source, base.map(getSource, streams)));
}

function getSource(stream) {
  return stream.source;
}

function Sampler(f, sampler, sources) {
  this.f = f;
  this.sampler = sampler;
  this.sources = sources;
}

Sampler.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l + 1);
  var sinks = new Array(l);

  var sampleSink = new SampleSink(this.f, sinks, sink);

  for (var hold, i = 0; i < l; ++i) {
    hold = sinks[i] = new Hold(sampleSink);
    disposables[i] = this$1.sources[i].run(hold, scheduler);
  }

  disposables[i] = this.sampler.run(sampleSink, scheduler);

  return dispose.all(disposables);
};

function Hold(sink) {
  this.sink = sink;
  this.hasValue = false;
}

Hold.prototype.event = function (t, x) {
  this.value = x;
  this.hasValue = true;
  this.sink._notify(this);
};

Hold.prototype.end = function () {};
Hold.prototype.error = _Pipe2.default.prototype.error;

function SampleSink(f, sinks, sink) {
  this.f = f;
  this.sinks = sinks;
  this.sink = sink;
  this.active = false;
}

SampleSink.prototype._notify = function () {
  if (!this.active) {
    this.active = this.sinks.every(hasValue);
  }
};

SampleSink.prototype.event = function (t) {
  if (this.active) {
    this.sink.event(t, (0, _invoke2.default)(this.f, base.map(getValue, this.sinks)));
  }
};

SampleSink.prototype.end = _Pipe2.default.prototype.end;
SampleSink.prototype.error = _Pipe2.default.prototype.error;

function hasValue(hold) {
  return hold.hasValue;
}

function getValue(hold) {
  return hold.value;
}
},{"../Stream":83,"../disposable/dispose":111,"../invoke":117,"../sink/Pipe":131,"@most/prelude":3}],101:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.take = take;
exports.skip = skip;
exports.slice = slice;
exports.takeWhile = takeWhile;
exports.skipWhile = skipWhile;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _core = require('../source/core');

var core = _interopRequireWildcard(_core);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _Map = require('../fusion/Map');

var _Map2 = _interopRequireDefault(_Map);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {number} n
 * @param {Stream} stream
 * @returns {Stream} new stream containing only up to the first n items from stream
 */
function take(n, stream) {
  return slice(0, n, stream);
}

/**
 * @param {number} n
 * @param {Stream} stream
 * @returns {Stream} new stream with the first n items removed
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function skip(n, stream) {
  return slice(n, Infinity, stream);
}

/**
 * Slice a stream by index. Negative start/end indexes are not supported
 * @param {number} start
 * @param {number} end
 * @param {Stream} stream
 * @returns {Stream} stream containing items where start <= index < end
 */
function slice(start, end, stream) {
  return end <= start ? core.empty() : new _Stream2.default(sliceSource(start, end, stream.source));
}

function sliceSource(start, end, source) {
  return source instanceof _Map2.default ? commuteMapSlice(start, end, source) : source instanceof Slice ? fuseSlice(start, end, source) : new Slice(start, end, source);
}

function commuteMapSlice(start, end, source) {
  return _Map2.default.create(source.f, sliceSource(start, end, source.source));
}

function fuseSlice(start, end, source) {
  start += source.min;
  end = Math.min(end + source.min, source.max);
  return new Slice(start, end, source.source);
}

function Slice(min, max, source) {
  this.source = source;
  this.min = min;
  this.max = max;
}

Slice.prototype.run = function (sink, scheduler) {
  return new SliceSink(this.min, this.max - this.min, this.source, sink, scheduler);
};

function SliceSink(skip, take, source, sink, scheduler) {
  this.sink = sink;
  this.skip = skip;
  this.take = take;
  this.disposable = dispose.once(source.run(this, scheduler));
}

SliceSink.prototype.end = _Pipe2.default.prototype.end;
SliceSink.prototype.error = _Pipe2.default.prototype.error;

SliceSink.prototype.event = function (t, x) {
  // eslint-disable-line complexity
  if (this.skip > 0) {
    this.skip -= 1;
    return;
  }

  if (this.take === 0) {
    return;
  }

  this.take -= 1;
  this.sink.event(t, x);
  if (this.take === 0) {
    this.dispose();
    this.sink.end(t, x);
  }
};

SliceSink.prototype.dispose = function () {
  return this.disposable.dispose();
};

function takeWhile(p, stream) {
  return new _Stream2.default(new TakeWhile(p, stream.source));
}

function TakeWhile(p, source) {
  this.p = p;
  this.source = source;
}

TakeWhile.prototype.run = function (sink, scheduler) {
  return new TakeWhileSink(this.p, this.source, sink, scheduler);
};

function TakeWhileSink(p, source, sink, scheduler) {
  this.p = p;
  this.sink = sink;
  this.active = true;
  this.disposable = dispose.once(source.run(this, scheduler));
}

TakeWhileSink.prototype.end = _Pipe2.default.prototype.end;
TakeWhileSink.prototype.error = _Pipe2.default.prototype.error;

TakeWhileSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }

  var p = this.p;
  this.active = p(x);
  if (this.active) {
    this.sink.event(t, x);
  } else {
    this.dispose();
    this.sink.end(t, x);
  }
};

TakeWhileSink.prototype.dispose = function () {
  return this.disposable.dispose();
};

function skipWhile(p, stream) {
  return new _Stream2.default(new SkipWhile(p, stream.source));
}

function SkipWhile(p, source) {
  this.p = p;
  this.source = source;
}

SkipWhile.prototype.run = function (sink, scheduler) {
  return this.source.run(new SkipWhileSink(this.p, sink), scheduler);
};

function SkipWhileSink(p, sink) {
  this.p = p;
  this.sink = sink;
  this.skipping = true;
}

SkipWhileSink.prototype.end = _Pipe2.default.prototype.end;
SkipWhileSink.prototype.error = _Pipe2.default.prototype.error;

SkipWhileSink.prototype.event = function (t, x) {
  if (this.skipping) {
    var p = this.p;
    this.skipping = p(x);
    if (this.skipping) {
      return;
    }
  }

  this.sink.event(t, x);
};
},{"../Stream":83,"../disposable/dispose":111,"../fusion/Map":115,"../sink/Pipe":131,"../source/core":135}],102:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.switch = undefined;
exports.switchLatest = switchLatest;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Given a stream of streams, return a new stream that adopts the behavior
 * of the most recent inner stream.
 * @param {Stream} stream of streams on which to switch
 * @returns {Stream} switching stream
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function switchLatest(stream) {
  return new _Stream2.default(new Switch(stream.source));
}

exports.switch = switchLatest;


function Switch(source) {
  this.source = source;
}

Switch.prototype.run = function (sink, scheduler) {
  var switchSink = new SwitchSink(sink, scheduler);
  return dispose.all([switchSink, this.source.run(switchSink, scheduler)]);
};

function SwitchSink(sink, scheduler) {
  this.sink = sink;
  this.scheduler = scheduler;
  this.current = null;
  this.ended = false;
}

SwitchSink.prototype.event = function (t, stream) {
  this._disposeCurrent(t); // TODO: capture the result of this dispose
  this.current = new Segment(t, Infinity, this, this.sink);
  this.current.disposable = stream.source.run(this.current, this.scheduler);
};

SwitchSink.prototype.end = function (t, x) {
  this.ended = true;
  this._checkEnd(t, x);
};

SwitchSink.prototype.error = function (t, e) {
  this.ended = true;
  this.sink.error(t, e);
};

SwitchSink.prototype.dispose = function () {
  return this._disposeCurrent(this.scheduler.now());
};

SwitchSink.prototype._disposeCurrent = function (t) {
  if (this.current !== null) {
    return this.current._dispose(t);
  }
};

SwitchSink.prototype._disposeInner = function (t, inner) {
  inner._dispose(t); // TODO: capture the result of this dispose
  if (inner === this.current) {
    this.current = null;
  }
};

SwitchSink.prototype._checkEnd = function (t, x) {
  if (this.ended && this.current === null) {
    this.sink.end(t, x);
  }
};

SwitchSink.prototype._endInner = function (t, x, inner) {
  this._disposeInner(t, inner);
  this._checkEnd(t, x);
};

SwitchSink.prototype._errorInner = function (t, e, inner) {
  this._disposeInner(t, inner);
  this.sink.error(t, e);
};

function Segment(min, max, outer, sink) {
  this.min = min;
  this.max = max;
  this.outer = outer;
  this.sink = sink;
  this.disposable = dispose.empty();
}

Segment.prototype.event = function (t, x) {
  if (t < this.max) {
    this.sink.event(Math.max(t, this.min), x);
  }
};

Segment.prototype.end = function (t, x) {
  this.outer._endInner(Math.max(t, this.min), x, this);
};

Segment.prototype.error = function (t, e) {
  this.outer._errorInner(Math.max(t, this.min), e, this);
};

Segment.prototype._dispose = function (t) {
  this.max = t;
  dispose.tryDispose(t, this.disposable, this.sink);
};
},{"../Stream":83,"../disposable/dispose":111}],103:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.thru = thru;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function thru(f, stream) {
  return f(stream);
}
},{}],104:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.takeUntil = takeUntil;
exports.skipUntil = skipUntil;
exports.during = during;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _flatMap = require('../combinator/flatMap');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function takeUntil(signal, stream) {
  return new _Stream2.default(new Until(signal.source, stream.source));
}

function skipUntil(signal, stream) {
  return new _Stream2.default(new Since(signal.source, stream.source));
}

function during(timeWindow, stream) {
  return takeUntil((0, _flatMap.join)(timeWindow), skipUntil(timeWindow, stream));
}

function Until(maxSignal, source) {
  this.maxSignal = maxSignal;
  this.source = source;
}

Until.prototype.run = function (sink, scheduler) {
  var min = new Bound(-Infinity, sink);
  var max = new UpperBound(this.maxSignal, sink, scheduler);
  var disposable = this.source.run(new TimeWindowSink(min, max, sink), scheduler);

  return dispose.all([min, max, disposable]);
};

function Since(minSignal, source) {
  this.minSignal = minSignal;
  this.source = source;
}

Since.prototype.run = function (sink, scheduler) {
  var min = new LowerBound(this.minSignal, sink, scheduler);
  var max = new Bound(Infinity, sink);
  var disposable = this.source.run(new TimeWindowSink(min, max, sink), scheduler);

  return dispose.all([min, max, disposable]);
};

function Bound(value, sink) {
  this.value = value;
  this.sink = sink;
}

Bound.prototype.error = _Pipe2.default.prototype.error;
Bound.prototype.event = noop;
Bound.prototype.end = noop;
Bound.prototype.dispose = noop;

function TimeWindowSink(min, max, sink) {
  this.min = min;
  this.max = max;
  this.sink = sink;
}

TimeWindowSink.prototype.event = function (t, x) {
  if (t >= this.min.value && t < this.max.value) {
    this.sink.event(t, x);
  }
};

TimeWindowSink.prototype.error = _Pipe2.default.prototype.error;
TimeWindowSink.prototype.end = _Pipe2.default.prototype.end;

function LowerBound(signal, sink, scheduler) {
  this.value = Infinity;
  this.sink = sink;
  this.disposable = signal.run(this, scheduler);
}

LowerBound.prototype.event = function (t /*, x */) {
  if (t < this.value) {
    this.value = t;
  }
};

LowerBound.prototype.end = noop;
LowerBound.prototype.error = _Pipe2.default.prototype.error;

LowerBound.prototype.dispose = function () {
  return this.disposable.dispose();
};

function UpperBound(signal, sink, scheduler) {
  this.value = Infinity;
  this.sink = sink;
  this.disposable = signal.run(this, scheduler);
}

UpperBound.prototype.event = function (t, x) {
  if (t < this.value) {
    this.value = t;
    this.sink.end(t, x);
  }
};

UpperBound.prototype.end = noop;
UpperBound.prototype.error = _Pipe2.default.prototype.error;

UpperBound.prototype.dispose = function () {
  return this.disposable.dispose();
};

function noop() {}
},{"../Stream":83,"../combinator/flatMap":93,"../disposable/dispose":111,"../sink/Pipe":131}],105:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.timestamp = timestamp;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function timestamp(stream) {
  return new _Stream2.default(new Timestamp(stream.source));
}

function Timestamp(source) {
  this.source = source;
}

Timestamp.prototype.run = function (sink, scheduler) {
  return this.source.run(new TimestampSink(sink), scheduler);
};

function TimestampSink(sink) {
  this.sink = sink;
}

TimestampSink.prototype.end = _Pipe2.default.prototype.end;
TimestampSink.prototype.error = _Pipe2.default.prototype.error;

TimestampSink.prototype.event = function (t, x) {
  this.sink.event(t, { time: t, value: x });
};
},{"../Stream":83,"../sink/Pipe":131}],106:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.transduce = transduce;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Transform a stream by passing its events through a transducer.
 * @param  {function} transducer transducer function
 * @param  {Stream} stream stream whose events will be passed through the
 *  transducer
 * @return {Stream} stream of events transformed by the transducer
 */
function transduce(transducer, stream) {
  return new _Stream2.default(new Transduce(transducer, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Transduce(transducer, source) {
  this.transducer = transducer;
  this.source = source;
}

Transduce.prototype.run = function (sink, scheduler) {
  var xf = this.transducer(new Transformer(sink));
  return this.source.run(new TransduceSink(getTxHandler(xf), sink), scheduler);
};

function TransduceSink(adapter, sink) {
  this.xf = adapter;
  this.sink = sink;
}

TransduceSink.prototype.event = function (t, x) {
  var next = this.xf.step(t, x);

  return this.xf.isReduced(next) ? this.sink.end(t, this.xf.getResult(next)) : next;
};

TransduceSink.prototype.end = function (t, x) {
  return this.xf.result(x);
};

TransduceSink.prototype.error = function (t, e) {
  return this.sink.error(t, e);
};

function Transformer(sink) {
  this.time = -Infinity;
  this.sink = sink;
}

Transformer.prototype['@@transducer/init'] = Transformer.prototype.init = function () {};

Transformer.prototype['@@transducer/step'] = Transformer.prototype.step = function (t, x) {
  if (!isNaN(t)) {
    this.time = Math.max(t, this.time);
  }
  return this.sink.event(this.time, x);
};

Transformer.prototype['@@transducer/result'] = Transformer.prototype.result = function (x) {
  return this.sink.end(this.time, x);
};

/**
* Given an object supporting the new or legacy transducer protocol,
* create an adapter for it.
* @param {object} tx transform
* @returns {TxAdapter|LegacyTxAdapter}
*/
function getTxHandler(tx) {
  return typeof tx['@@transducer/step'] === 'function' ? new TxAdapter(tx) : new LegacyTxAdapter(tx);
}

/**
* Adapter for new official transducer protocol
* @param {object} tx transform
* @constructor
*/
function TxAdapter(tx) {
  this.tx = tx;
}

TxAdapter.prototype.step = function (t, x) {
  return this.tx['@@transducer/step'](t, x);
};
TxAdapter.prototype.result = function (x) {
  return this.tx['@@transducer/result'](x);
};
TxAdapter.prototype.isReduced = function (x) {
  return x != null && x['@@transducer/reduced'];
};
TxAdapter.prototype.getResult = function (x) {
  return x['@@transducer/value'];
};

/**
* Adapter for older transducer protocol
* @param {object} tx transform
* @constructor
*/
function LegacyTxAdapter(tx) {
  this.tx = tx;
}

LegacyTxAdapter.prototype.step = function (t, x) {
  return this.tx.step(t, x);
};
LegacyTxAdapter.prototype.result = function (x) {
  return this.tx.result(x);
};
LegacyTxAdapter.prototype.isReduced = function (x) {
  return x != null && x.__transducers_reduced__;
};
LegacyTxAdapter.prototype.getResult = function (x) {
  return x.value;
};
},{"../Stream":83}],107:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.map = map;
exports.constant = constant;
exports.tap = tap;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Map = require('../fusion/Map');

var _Map2 = _interopRequireDefault(_Map);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Transform each value in the stream by applying f to each
 * @param {function(*):*} f mapping function
 * @param {Stream} stream stream to map
 * @returns {Stream} stream containing items transformed by f
 */
function map(f, stream) {
  return new _Stream2.default(_Map2.default.create(f, stream.source));
}

/**
* Replace each value in the stream with x
* @param {*} x
* @param {Stream} stream
* @returns {Stream} stream containing items replaced with x
*/
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function constant(x, stream) {
  return map(function () {
    return x;
  }, stream);
}

/**
* Perform a side effect for each item in the stream
* @param {function(x:*):*} f side effect to execute for each item. The
*  return value will be discarded.
* @param {Stream} stream stream to tap
* @returns {Stream} new stream containing the same items as this stream
*/
function tap(f, stream) {
  return new _Stream2.default(new Tap(f, stream.source));
}

function Tap(f, source) {
  this.source = source;
  this.f = f;
}

Tap.prototype.run = function (sink, scheduler) {
  return this.source.run(new TapSink(this.f, sink), scheduler);
};

function TapSink(f, sink) {
  this.sink = sink;
  this.f = f;
}

TapSink.prototype.end = _Pipe2.default.prototype.end;
TapSink.prototype.error = _Pipe2.default.prototype.error;

TapSink.prototype.event = function (t, x) {
  var f = this.f;
  f(x);
  this.sink.event(t, x);
};
},{"../Stream":83,"../fusion/Map":115,"../sink/Pipe":131}],108:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zip = zip;
exports.zipArray = zipArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _transform = require('./transform');

var transform = _interopRequireWildcard(_transform);

var _core = require('../source/core');

var core = _interopRequireWildcard(_core);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _IndexSink = require('../sink/IndexSink');

var _IndexSink2 = _interopRequireDefault(_IndexSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _invoke = require('../invoke');

var _invoke2 = _interopRequireDefault(_invoke);

var _Queue = require('../Queue');

var _Queue2 = _interopRequireDefault(_Queue);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var map = base.map; /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var tail = base.tail;

/**
 * Combine streams pairwise (or tuple-wise) by index by applying f to values
 * at corresponding indices.  The returned stream ends when any of the input
 * streams ends.
 * @param {function} f function to combine values
 * @returns {Stream} new stream with items at corresponding indices combined
 *  using f
 */
function zip(f /*, ...streams */) {
  return zipArray(f, tail(arguments));
}

/**
* Combine streams pairwise (or tuple-wise) by index by applying f to values
* at corresponding indices.  The returned stream ends when any of the input
* streams ends.
* @param {function} f function to combine values
* @param {[Stream]} streams streams to zip using f
* @returns {Stream} new stream with items at corresponding indices combined
*  using f
*/
function zipArray(f, streams) {
  return streams.length === 0 ? core.empty() : streams.length === 1 ? transform.map(f, streams[0]) : new _Stream2.default(new Zip(f, map(getSource, streams)));
}

function getSource(stream) {
  return stream.source;
}

function Zip(f, sources) {
  this.f = f;
  this.sources = sources;
}

Zip.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l);
  var sinks = new Array(l);
  var buffers = new Array(l);

  var zipSink = new ZipSink(this.f, buffers, sinks, sink);

  for (var indexSink, i = 0; i < l; ++i) {
    buffers[i] = new _Queue2.default();
    indexSink = sinks[i] = new _IndexSink2.default(i, zipSink);
    disposables[i] = this$1.sources[i].run(indexSink, scheduler);
  }

  return dispose.all(disposables);
};

function ZipSink(f, buffers, sinks, sink) {
  this.f = f;
  this.sinks = sinks;
  this.sink = sink;
  this.buffers = buffers;
}

ZipSink.prototype.event = function (t, indexedValue) {
  // eslint-disable-line complexity
  var buffers = this.buffers;
  var buffer = buffers[indexedValue.index];

  buffer.push(indexedValue.value);

  if (buffer.length() === 1) {
    if (!ready(this.buffers)) {
      return;
    }

    emitZipped(this.f, t, buffers, this.sink);

    if (ended(this.buffers, this.sinks)) {
      this.sink.end(t, void 0);
    }
  }
};

ZipSink.prototype.end = function (t, indexedValue) {
  var buffer = this.buffers[indexedValue.index];
  if (buffer.isEmpty()) {
    this.sink.end(t, indexedValue.value);
  }
};

ZipSink.prototype.error = _Pipe2.default.prototype.error;

function emitZipped(f, t, buffers, sink) {
  sink.event(t, (0, _invoke2.default)(f, map(head, buffers)));
}

function head(buffer) {
  return buffer.shift();
}

function ended(buffers, sinks) {
  for (var i = 0, l = buffers.length; i < l; ++i) {
    if (buffers[i].isEmpty() && !sinks[i].active) {
      return true;
    }
  }
  return false;
}

function ready(buffers) {
  for (var i = 0, l = buffers.length; i < l; ++i) {
    if (buffers[i].isEmpty()) {
      return false;
    }
  }
  return true;
}
},{"../Queue":82,"../Stream":83,"../disposable/dispose":111,"../invoke":117,"../sink/IndexSink":130,"../sink/Pipe":131,"../source/core":135,"./transform":107,"@most/prelude":3}],109:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Disposable;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * Create a new Disposable which will dispose its underlying resource.
 * @param {function} dispose function
 * @param {*?} data any data to be passed to disposer function
 * @constructor
 */
function Disposable(dispose, data) {
  this._dispose = dispose;
  this._data = data;
}

Disposable.prototype.dispose = function () {
  return this._dispose(this._data);
};
},{}],110:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = SettableDisposable;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function SettableDisposable() {
  this.disposable = void 0;
  this.disposed = false;
  this._resolve = void 0;

  var self = this;
  this.result = new Promise(function (resolve) {
    self._resolve = resolve;
  });
}

SettableDisposable.prototype.setDisposable = function (disposable) {
  if (this.disposable !== void 0) {
    throw new Error('setDisposable called more than once');
  }

  this.disposable = disposable;

  if (this.disposed) {
    this._resolve(disposable.dispose());
  }
};

SettableDisposable.prototype.dispose = function () {
  if (this.disposed) {
    return this.result;
  }

  this.disposed = true;

  if (this.disposable !== void 0) {
    this.result = this.disposable.dispose();
  }

  return this.result;
};
},{}],111:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tryDispose = tryDispose;
exports.create = create;
exports.empty = empty;
exports.all = all;
exports.promised = promised;
exports.settable = settable;
exports.once = once;

var _Disposable = require('./Disposable');

var _Disposable2 = _interopRequireDefault(_Disposable);

var _SettableDisposable = require('./SettableDisposable');

var _SettableDisposable2 = _interopRequireDefault(_SettableDisposable);

var _Promise = require('../Promise');

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
var map = base.map;
var identity = base.id;

/**
 * Call disposable.dispose.  If it returns a promise, catch promise
 * error and forward it through the provided sink.
 * @param {number} t time
 * @param {{dispose: function}} disposable
 * @param {{error: function}} sink
 * @return {*} result of disposable.dispose
 */
function tryDispose(t, disposable, sink) {
  var result = disposeSafely(disposable);
  return (0, _Promise.isPromise)(result) ? result.catch(function (e) {
    sink.error(t, e);
  }) : result;
}

/**
 * Create a new Disposable which will dispose its underlying resource
 * at most once.
 * @param {function} dispose function
 * @param {*?} data any data to be passed to disposer function
 * @return {Disposable}
 */
function create(dispose, data) {
  return once(new _Disposable2.default(dispose, data));
}

/**
 * Create a noop disposable. Can be used to satisfy a Disposable
 * requirement when no actual resource needs to be disposed.
 * @return {Disposable|exports|module.exports}
 */
function empty() {
  return new _Disposable2.default(identity, void 0);
}

/**
 * Create a disposable that will dispose all input disposables in parallel.
 * @param {Array<Disposable>} disposables
 * @return {Disposable}
 */
function all(disposables) {
  return create(disposeAll, disposables);
}

function disposeAll(disposables) {
  return Promise.all(map(disposeSafely, disposables));
}

function disposeSafely(disposable) {
  try {
    return disposable.dispose();
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Create a disposable from a promise for another disposable
 * @param {Promise<Disposable>} disposablePromise
 * @return {Disposable}
 */
function promised(disposablePromise) {
  return create(disposePromise, disposablePromise);
}

function disposePromise(disposablePromise) {
  return disposablePromise.then(disposeOne);
}

function disposeOne(disposable) {
  return disposable.dispose();
}

/**
 * Create a disposable proxy that allows its underlying disposable to
 * be set later.
 * @return {SettableDisposable}
 */
function settable() {
  return new _SettableDisposable2.default();
}

/**
 * Wrap an existing disposable (which may not already have been once()d)
 * so that it will only dispose its underlying resource at most once.
 * @param {{ dispose: function() }} disposable
 * @return {Disposable} wrapped disposable
 */
function once(disposable) {
  return new _Disposable2.default(disposeMemoized, memoized(disposable));
}

function disposeMemoized(memoized) {
  if (!memoized.disposed) {
    memoized.disposed = true;
    memoized.value = disposeSafely(memoized.disposable);
    memoized.disposable = void 0;
  }

  return memoized.value;
}

function memoized(disposable) {
  return { disposed: false, disposable: disposable, value: void 0 };
}
},{"../Promise":81,"./Disposable":109,"./SettableDisposable":110,"@most/prelude":3}],112:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fatalError;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function fatalError(e) {
  setTimeout(function () {
    throw e;
  }, 0);
}
},{}],113:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Filter;

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Filter(p, source) {
  this.p = p;
  this.source = source;
}

/**
 * Create a filtered source, fusing adjacent filter.filter if possible
 * @param {function(x:*):boolean} p filtering predicate
 * @param {{run:function}} source source to filter
 * @returns {Filter} filtered source
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

Filter.create = function createFilter(p, source) {
  if (source instanceof Filter) {
    return new Filter(and(source.p, p), source.source);
  }

  return new Filter(p, source);
};

Filter.prototype.run = function (sink, scheduler) {
  return this.source.run(new FilterSink(this.p, sink), scheduler);
};

function FilterSink(p, sink) {
  this.p = p;
  this.sink = sink;
}

FilterSink.prototype.end = _Pipe2.default.prototype.end;
FilterSink.prototype.error = _Pipe2.default.prototype.error;

FilterSink.prototype.event = function (t, x) {
  var p = this.p;
  p(x) && this.sink.event(t, x);
};

function and(p, q) {
  return function (x) {
    return p(x) && q(x);
  };
}
},{"../sink/Pipe":131}],114:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = FilterMap;

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function FilterMap(p, f, source) {
  this.p = p;
  this.f = f;
  this.source = source;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

FilterMap.prototype.run = function (sink, scheduler) {
  return this.source.run(new FilterMapSink(this.p, this.f, sink), scheduler);
};

function FilterMapSink(p, f, sink) {
  this.p = p;
  this.f = f;
  this.sink = sink;
}

FilterMapSink.prototype.event = function (t, x) {
  var f = this.f;
  var p = this.p;
  p(x) && this.sink.event(t, f(x));
};

FilterMapSink.prototype.end = _Pipe2.default.prototype.end;
FilterMapSink.prototype.error = _Pipe2.default.prototype.error;
},{"../sink/Pipe":131}],115:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Map;

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _Filter = require('./Filter');

var _Filter2 = _interopRequireDefault(_Filter);

var _FilterMap = require('./FilterMap');

var _FilterMap2 = _interopRequireDefault(_FilterMap);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Map(f, source) {
  this.f = f;
  this.source = source;
}

/**
 * Create a mapped source, fusing adjacent map.map, filter.map,
 * and filter.map.map if possible
 * @param {function(*):*} f mapping function
 * @param {{run:function}} source source to map
 * @returns {Map|FilterMap} mapped source, possibly fused
 */
Map.create = function createMap(f, source) {
  if (source instanceof Map) {
    return new Map(base.compose(f, source.f), source.source);
  }

  if (source instanceof _Filter2.default) {
    return new _FilterMap2.default(source.p, f, source.source);
  }

  return new Map(f, source);
};

Map.prototype.run = function (sink, scheduler) {
  // eslint-disable-line no-extend-native
  return this.source.run(new MapSink(this.f, sink), scheduler);
};

function MapSink(f, sink) {
  this.f = f;
  this.sink = sink;
}

MapSink.prototype.end = _Pipe2.default.prototype.end;
MapSink.prototype.error = _Pipe2.default.prototype.error;

MapSink.prototype.event = function (t, x) {
  var f = this.f;
  this.sink.event(t, f(x));
};
},{"../sink/Pipe":131,"./Filter":113,"./FilterMap":114,"@most/prelude":3}],116:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.multicast = exports.throwError = exports.flatMapError = exports.recoverWith = exports.await = exports.awaitPromises = exports.fromPromise = exports.debounce = exports.throttle = exports.timestamp = exports.delay = exports.during = exports.since = exports.skipUntil = exports.until = exports.takeUntil = exports.skipWhile = exports.takeWhile = exports.slice = exports.skip = exports.take = exports.distinctBy = exports.skipRepeatsWith = exports.distinct = exports.skipRepeats = exports.filter = exports.switch = exports.switchLatest = exports.zipArray = exports.zip = exports.sampleWith = exports.sampleArray = exports.sample = exports.combineArray = exports.combine = exports.mergeArray = exports.merge = exports.mergeConcurrently = exports.concatMap = exports.flatMapEnd = exports.continueWith = exports.join = exports.chain = exports.flatMap = exports.transduce = exports.ap = exports.tap = exports.constant = exports.map = exports.startWith = exports.concat = exports.generate = exports.iterate = exports.unfold = exports.reduce = exports.scan = exports.loop = exports.drain = exports.forEach = exports.observe = exports.fromEvent = exports.periodic = exports.from = exports.never = exports.empty = exports.just = exports.of = exports.Stream = undefined;

var _fromEvent = require('./source/fromEvent');

Object.defineProperty(exports, 'fromEvent', {
  enumerable: true,
  get: function () {
    return _fromEvent.fromEvent;
  }
});

var _unfold = require('./source/unfold');

Object.defineProperty(exports, 'unfold', {
  enumerable: true,
  get: function () {
    return _unfold.unfold;
  }
});

var _iterate = require('./source/iterate');

Object.defineProperty(exports, 'iterate', {
  enumerable: true,
  get: function () {
    return _iterate.iterate;
  }
});

var _generate = require('./source/generate');

Object.defineProperty(exports, 'generate', {
  enumerable: true,
  get: function () {
    return _generate.generate;
  }
});

var _Stream = require('./Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _core = require('./source/core');

var _from = require('./source/from');

var _periodic = require('./source/periodic');

var _symbolObservable = require('symbol-observable');

var _symbolObservable2 = _interopRequireDefault(_symbolObservable);

var _subscribe = require('./observable/subscribe');

var _thru = require('./combinator/thru');

var _observe = require('./combinator/observe');

var _loop = require('./combinator/loop');

var _accumulate = require('./combinator/accumulate');

var _build = require('./combinator/build');

var _transform = require('./combinator/transform');

var _applicative = require('./combinator/applicative');

var _transduce = require('./combinator/transduce');

var _flatMap = require('./combinator/flatMap');

var _continueWith = require('./combinator/continueWith');

var _concatMap = require('./combinator/concatMap');

var _mergeConcurrently = require('./combinator/mergeConcurrently');

var _merge = require('./combinator/merge');

var _combine = require('./combinator/combine');

var _sample = require('./combinator/sample');

var _zip = require('./combinator/zip');

var _switch = require('./combinator/switch');

var _filter = require('./combinator/filter');

var _slice = require('./combinator/slice');

var _timeslice = require('./combinator/timeslice');

var _delay = require('./combinator/delay');

var _timestamp = require('./combinator/timestamp');

var _limit = require('./combinator/limit');

var _promises = require('./combinator/promises');

var _errors = require('./combinator/errors');

var _multicast = require('@most/multicast');

var _multicast2 = _interopRequireDefault(_multicast);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Core stream type
 * @type {Stream}
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

exports.Stream = _Stream2.default;

// Add of and empty to constructor for fantasy-land compat

_Stream2.default.of = _core.of;
_Stream2.default.empty = _core.empty;
// Add from to constructor for ES Observable compat
_Stream2.default.from = _from.from;
exports.of = _core.of;
exports.just = _core.of;
exports.empty = _core.empty;
exports.never = _core.never;
exports.from = _from.from;
exports.periodic = _periodic.periodic;

// -----------------------------------------------------------------------
// Draft ES Observable proposal interop
// https://github.com/zenparsing/es-observable

_Stream2.default.prototype.subscribe = function (subscriber) {
  return (0, _subscribe.subscribe)(subscriber, this);
};

_Stream2.default.prototype[_symbolObservable2.default] = function () {
  return this;
};

// -----------------------------------------------------------------------
// Fluent adapter

/**
 * Adapt a functional stream transform to fluent style.
 * It applies f to the this stream object
 * @param  {function(s: Stream): Stream} f function that
 * receives the stream itself and must return a new stream
 * @return {Stream}
 */
_Stream2.default.prototype.thru = function (f) {
  return (0, _thru.thru)(f, this);
};

// -----------------------------------------------------------------------
// Adapting other sources

/**
 * Create a stream of events from the supplied EventTarget or EventEmitter
 * @param {String} event event name
 * @param {EventTarget|EventEmitter} source EventTarget or EventEmitter. The source
 *  must support either addEventListener/removeEventListener (w3c EventTarget:
 *  http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-EventTarget),
 *  or addListener/removeListener (node EventEmitter: http://nodejs.org/api/events.html)
 * @returns {Stream} stream of events of the specified type from the source
 */


// -----------------------------------------------------------------------
// Observing

exports.observe = _observe.observe;
exports.forEach = _observe.observe;
exports.drain = _observe.drain;

/**
 * Process all the events in the stream
 * @returns {Promise} promise that fulfills when the stream ends, or rejects
 *  if the stream fails with an unhandled error.
 */

_Stream2.default.prototype.observe = _Stream2.default.prototype.forEach = function (f) {
  return (0, _observe.observe)(f, this);
};

/**
 * Consume all events in the stream, without providing a function to process each.
 * This causes a stream to become active and begin emitting events, and is useful
 * in cases where all processing has been setup upstream via other combinators, and
 * there is no need to process the terminal events.
 * @returns {Promise} promise that fulfills when the stream ends, or rejects
 *  if the stream fails with an unhandled error.
 */
_Stream2.default.prototype.drain = function () {
  return (0, _observe.drain)(this);
};

// -------------------------------------------------------

exports.loop = _loop.loop;

/**
 * Generalized feedback loop. Call a stepper function for each event. The stepper
 * will be called with 2 params: the current seed and the an event value.  It must
 * return a new { seed, value } pair. The `seed` will be fed back into the next
 * invocation of stepper, and the `value` will be propagated as the event value.
 * @param {function(seed:*, value:*):{seed:*, value:*}} stepper loop step function
 * @param {*} seed initial seed value passed to first stepper call
 * @returns {Stream} new stream whose values are the `value` field of the objects
 * returned by the stepper
 */

_Stream2.default.prototype.loop = function (stepper, seed) {
  return (0, _loop.loop)(stepper, seed, this);
};

// -------------------------------------------------------

exports.scan = _accumulate.scan;
exports.reduce = _accumulate.reduce;

/**
 * Create a stream containing successive reduce results of applying f to
 * the previous reduce result and the current stream item.
 * @param {function(result:*, x:*):*} f reducer function
 * @param {*} initial initial value
 * @returns {Stream} new stream containing successive reduce results
 */

_Stream2.default.prototype.scan = function (f, initial) {
  return (0, _accumulate.scan)(f, initial, this);
};

/**
 * Reduce the stream to produce a single result.  Note that reducing an infinite
 * stream will return a Promise that never fulfills, but that may reject if an error
 * occurs.
 * @param {function(result:*, x:*):*} f reducer function
 * @param {*} initial optional initial value
 * @returns {Promise} promise for the file result of the reduce
 */
_Stream2.default.prototype.reduce = function (f, initial) {
  return (0, _accumulate.reduce)(f, initial, this);
};

// -----------------------------------------------------------------------
// Building and extending

exports.concat = _build.concat;
exports.startWith = _build.cons;

/**
 * @param {Stream} tail
 * @returns {Stream} new stream containing all items in this followed by
 *  all items in tail
 */

_Stream2.default.prototype.concat = function (tail) {
  return (0, _build.concat)(this, tail);
};

/**
 * @param {*} x value to prepend
 * @returns {Stream} a new stream with x prepended
 */
_Stream2.default.prototype.startWith = function (x) {
  return (0, _build.cons)(x, this);
};

// -----------------------------------------------------------------------
// Transforming

exports.map = _transform.map;
exports.constant = _transform.constant;
exports.tap = _transform.tap;
exports.ap = _applicative.ap;

/**
 * Transform each value in the stream by applying f to each
 * @param {function(*):*} f mapping function
 * @returns {Stream} stream containing items transformed by f
 */

_Stream2.default.prototype.map = function (f) {
  return (0, _transform.map)(f, this);
};

/**
 * Assume this stream contains functions, and apply each function to each item
 * in the provided stream.  This generates, in effect, a cross product.
 * @param {Stream} xs stream of items to which
 * @returns {Stream} stream containing the cross product of items
 */
_Stream2.default.prototype.ap = function (xs) {
  return (0, _applicative.ap)(this, xs);
};

/**
 * Replace each value in the stream with x
 * @param {*} x
 * @returns {Stream} stream containing items replaced with x
 */
_Stream2.default.prototype.constant = function (x) {
  return (0, _transform.constant)(x, this);
};

/**
 * Perform a side effect for each item in the stream
 * @param {function(x:*):*} f side effect to execute for each item. The
 *  return value will be discarded.
 * @returns {Stream} new stream containing the same items as this stream
 */
_Stream2.default.prototype.tap = function (f) {
  return (0, _transform.tap)(f, this);
};

// -----------------------------------------------------------------------
// Transducer support

exports.transduce = _transduce.transduce;

/**
 * Transform this stream by passing its events through a transducer.
 * @param  {function} transducer transducer function
 * @return {Stream} stream of events transformed by the transducer
 */

_Stream2.default.prototype.transduce = function (transducer) {
  return (0, _transduce.transduce)(transducer, this);
};

// -----------------------------------------------------------------------
// FlatMapping

exports.flatMap = _flatMap.flatMap;
exports.chain = _flatMap.flatMap;
exports.join = _flatMap.join;

/**
 * Map each value in the stream to a new stream, and merge it into the
 * returned outer stream. Event arrival times are preserved.
 * @param {function(x:*):Stream} f chaining function, must return a Stream
 * @returns {Stream} new stream containing all events from each stream returned by f
 */

_Stream2.default.prototype.flatMap = _Stream2.default.prototype.chain = function (f) {
  return (0, _flatMap.flatMap)(f, this);
};

/**
 * Monadic join. Flatten a Stream<Stream<X>> to Stream<X> by merging inner
 * streams to the outer. Event arrival times are preserved.
 * @returns {Stream<X>} new stream containing all events of all inner streams
 */
_Stream2.default.prototype.join = function () {
  return (0, _flatMap.join)(this);
};

exports.continueWith = _continueWith.continueWith;
exports.flatMapEnd = _continueWith.continueWith;

/**
 * Map the end event to a new stream, and begin emitting its values.
 * @param {function(x:*):Stream} f function that receives the end event value,
 * and *must* return a new Stream to continue with.
 * @returns {Stream} new stream that emits all events from the original stream,
 * followed by all events from the stream returned by f.
 */

_Stream2.default.prototype.continueWith = _Stream2.default.prototype.flatMapEnd = function (f) {
  return (0, _continueWith.continueWith)(f, this);
};

exports.concatMap = _concatMap.concatMap;


_Stream2.default.prototype.concatMap = function (f) {
  return (0, _concatMap.concatMap)(f, this);
};

// -----------------------------------------------------------------------
// Concurrent merging

exports.mergeConcurrently = _mergeConcurrently.mergeConcurrently;

/**
 * Flatten a Stream<Stream<X>> to Stream<X> by merging inner
 * streams to the outer, limiting the number of inner streams that may
 * be active concurrently.
 * @param {number} concurrency at most this many inner streams will be
 *  allowed to be active concurrently.
 * @return {Stream<X>} new stream containing all events of all inner
 *  streams, with limited concurrency.
 */

_Stream2.default.prototype.mergeConcurrently = function (concurrency) {
  return (0, _mergeConcurrently.mergeConcurrently)(concurrency, this);
};

// -----------------------------------------------------------------------
// Merging

exports.merge = _merge.merge;
exports.mergeArray = _merge.mergeArray;

/**
 * Merge this stream and all the provided streams
 * @returns {Stream} stream containing items from this stream and s in time
 * order.  If two events are simultaneous they will be merged in
 * arbitrary order.
 */

_Stream2.default.prototype.merge = function () /* ...streams*/{
  return (0, _merge.mergeArray)(base.cons(this, arguments));
};

// -----------------------------------------------------------------------
// Combining

exports.combine = _combine.combine;
exports.combineArray = _combine.combineArray;

/**
 * Combine latest events from all input streams
 * @param {function(...events):*} f function to combine most recent events
 * @returns {Stream} stream containing the result of applying f to the most recent
 *  event of each input stream, whenever a new event arrives on any stream.
 */

_Stream2.default.prototype.combine = function (f /*, ...streams*/) {
  return (0, _combine.combineArray)(f, base.replace(this, 0, arguments));
};

// -----------------------------------------------------------------------
// Sampling

exports.sample = _sample.sample;
exports.sampleArray = _sample.sampleArray;
exports.sampleWith = _sample.sampleWith;

/**
 * When an event arrives on sampler, emit the latest event value from stream.
 * @param {Stream} sampler stream of events at whose arrival time
 *  signal's latest value will be propagated
 * @returns {Stream} sampled stream of values
 */

_Stream2.default.prototype.sampleWith = function (sampler) {
  return (0, _sample.sampleWith)(sampler, this);
};

/**
 * When an event arrives on this stream, emit the result of calling f with the latest
 * values of all streams being sampled
 * @param {function(...values):*} f function to apply to each set of sampled values
 * @returns {Stream} stream of sampled and transformed values
 */
_Stream2.default.prototype.sample = function (f /* ...streams */) {
  return (0, _sample.sampleArray)(f, this, base.tail(arguments));
};

// -----------------------------------------------------------------------
// Zipping

exports.zip = _zip.zip;
exports.zipArray = _zip.zipArray;

/**
 * Pair-wise combine items with those in s. Given 2 streams:
 * [1,2,3] zipWith f [4,5,6] -> [f(1,4),f(2,5),f(3,6)]
 * Note: zip causes fast streams to buffer and wait for slow streams.
 * @param {function(a:Stream, b:Stream, ...):*} f function to combine items
 * @returns {Stream} new stream containing pairs
 */

_Stream2.default.prototype.zip = function (f /*, ...streams*/) {
  return (0, _zip.zipArray)(f, base.replace(this, 0, arguments));
};

// -----------------------------------------------------------------------
// Switching

exports.switchLatest = _switch.switchLatest;
exports.switch = _switch.switchLatest;

/**
 * Given a stream of streams, return a new stream that adopts the behavior
 * of the most recent inner stream.
 * @returns {Stream} switching stream
 */

_Stream2.default.prototype.switch = _Stream2.default.prototype.switchLatest = function () {
  return (0, _switch.switchLatest)(this);
};

// -----------------------------------------------------------------------
// Filtering

exports.filter = _filter.filter;
exports.skipRepeats = _filter.skipRepeats;
exports.distinct = _filter.skipRepeats;
exports.skipRepeatsWith = _filter.skipRepeatsWith;
exports.distinctBy = _filter.skipRepeatsWith;

/**
 * Retain only items matching a predicate
 * stream:                           -12345678-
 * filter(x => x % 2 === 0, stream): --2-4-6-8-
 * @param {function(x:*):boolean} p filtering predicate called for each item
 * @returns {Stream} stream containing only items for which predicate returns truthy
 */

_Stream2.default.prototype.filter = function (p) {
  return (0, _filter.filter)(p, this);
};

/**
 * Skip repeated events, using === to compare items
 * stream:           -abbcd-
 * distinct(stream): -ab-cd-
 * @returns {Stream} stream with no repeated events
 */
_Stream2.default.prototype.skipRepeats = function () {
  return (0, _filter.skipRepeats)(this);
};

/**
 * Skip repeated events, using supplied equals function to compare items
 * @param {function(a:*, b:*):boolean} equals function to compare items
 * @returns {Stream} stream with no repeated events
 */
_Stream2.default.prototype.skipRepeatsWith = function (equals) {
  return (0, _filter.skipRepeatsWith)(equals, this);
};

// -----------------------------------------------------------------------
// Slicing

exports.take = _slice.take;
exports.skip = _slice.skip;
exports.slice = _slice.slice;
exports.takeWhile = _slice.takeWhile;
exports.skipWhile = _slice.skipWhile;

/**
 * stream:          -abcd-
 * take(2, stream): -ab|
 * @param {Number} n take up to this many events
 * @returns {Stream} stream containing at most the first n items from this stream
 */

_Stream2.default.prototype.take = function (n) {
  return (0, _slice.take)(n, this);
};

/**
 * stream:          -abcd->
 * skip(2, stream): ---cd->
 * @param {Number} n skip this many events
 * @returns {Stream} stream not containing the first n events
 */
_Stream2.default.prototype.skip = function (n) {
  return (0, _slice.skip)(n, this);
};

/**
 * Slice a stream by event index. Equivalent to, but more efficient than
 * stream.take(end).skip(start);
 * NOTE: Negative start and end are not supported
 * @param {Number} start skip all events before the start index
 * @param {Number} end allow all events from the start index to the end index
 * @returns {Stream} stream containing items where start <= index < end
 */
_Stream2.default.prototype.slice = function (start, end) {
  return (0, _slice.slice)(start, end, this);
};

/**
 * stream:                        -123451234->
 * takeWhile(x => x < 5, stream): -1234|
 * @param {function(x:*):boolean} p predicate
 * @returns {Stream} stream containing items up to, but not including, the
 * first item for which p returns falsy.
 */
_Stream2.default.prototype.takeWhile = function (p) {
  return (0, _slice.takeWhile)(p, this);
};

/**
 * stream:                        -123451234->
 * skipWhile(x => x < 5, stream): -----51234->
 * @param {function(x:*):boolean} p predicate
 * @returns {Stream} stream containing items following *and including* the
 * first item for which p returns falsy.
 */
_Stream2.default.prototype.skipWhile = function (p) {
  return (0, _slice.skipWhile)(p, this);
};

// -----------------------------------------------------------------------
// Time slicing

exports.takeUntil = _timeslice.takeUntil;
exports.until = _timeslice.takeUntil;
exports.skipUntil = _timeslice.skipUntil;
exports.since = _timeslice.skipUntil;
exports.during = _timeslice.during;

/**
 * stream:                    -a-b-c-d-e-f-g->
 * signal:                    -------x
 * takeUntil(signal, stream): -a-b-c-|
 * @param {Stream} signal retain only events in stream before the first
 * event in signal
 * @returns {Stream} new stream containing only events that occur before
 * the first event in signal.
 */

_Stream2.default.prototype.until = _Stream2.default.prototype.takeUntil = function (signal) {
  return (0, _timeslice.takeUntil)(signal, this);
};

/**
 * stream:                    -a-b-c-d-e-f-g->
 * signal:                    -------x
 * takeUntil(signal, stream): -------d-e-f-g->
 * @param {Stream} signal retain only events in stream at or after the first
 * event in signal
 * @returns {Stream} new stream containing only events that occur after
 * the first event in signal.
 */
_Stream2.default.prototype.since = _Stream2.default.prototype.skipUntil = function (signal) {
  return (0, _timeslice.skipUntil)(signal, this);
};

/**
 * stream:                    -a-b-c-d-e-f-g->
 * timeWindow:                -----s
 * s:                               -----t
 * stream.during(timeWindow): -----c-d-e-|
 * @param {Stream<Stream>} timeWindow a stream whose first event (s) represents
 *  the window start time.  That event (s) is itself a stream whose first event (t)
 *  represents the window end time
 * @returns {Stream} new stream containing only events within the provided timespan
 */
_Stream2.default.prototype.during = function (timeWindow) {
  return (0, _timeslice.during)(timeWindow, this);
};

// -----------------------------------------------------------------------
// Delaying

exports.delay = _delay.delay;

/**
 * @param {Number} delayTime milliseconds to delay each item
 * @returns {Stream} new stream containing the same items, but delayed by ms
 */

_Stream2.default.prototype.delay = function (delayTime) {
  return (0, _delay.delay)(delayTime, this);
};

// -----------------------------------------------------------------------
// Getting event timestamp

exports.timestamp = _timestamp.timestamp;

/**
 * Expose event timestamps into the stream. Turns a Stream<X> into
 * Stream<{time:t, value:X}>
 * @returns {Stream<{time:number, value:*}>}
 */

_Stream2.default.prototype.timestamp = function () {
  return (0, _timestamp.timestamp)(this);
};

// -----------------------------------------------------------------------
// Rate limiting

exports.throttle = _limit.throttle;
exports.debounce = _limit.debounce;

/**
 * Limit the rate of events
 * stream:              abcd----abcd----
 * throttle(2, stream): a-c-----a-c-----
 * @param {Number} period time to suppress events
 * @returns {Stream} new stream that skips events for throttle period
 */

_Stream2.default.prototype.throttle = function (period) {
  return (0, _limit.throttle)(period, this);
};

/**
 * Wait for a burst of events to subside and emit only the last event in the burst
 * stream:              abcd----abcd----
 * debounce(2, stream): -----d-------d--
 * @param {Number} period events occuring more frequently than this
 *  on the provided scheduler will be suppressed
 * @returns {Stream} new debounced stream
 */
_Stream2.default.prototype.debounce = function (period) {
  return (0, _limit.debounce)(period, this);
};

// -----------------------------------------------------------------------
// Awaiting Promises

exports.fromPromise = _promises.fromPromise;
exports.awaitPromises = _promises.awaitPromises;
exports.await = _promises.awaitPromises;

/**
 * Await promises, turning a Stream<Promise<X>> into Stream<X>.  Preserves
 * event order, but timeshifts events based on promise resolution time.
 * @returns {Stream<X>} stream containing non-promise values
 */

_Stream2.default.prototype.await = function () {
  return (0, _promises.awaitPromises)(this);
};

// -----------------------------------------------------------------------
// Error handling

exports.recoverWith = _errors.recoverWith;
exports.flatMapError = _errors.flatMapError;
exports.throwError = _errors.throwError;

/**
 * If this stream encounters an error, recover and continue with items from stream
 * returned by f.
 * stream:                  -a-b-c-X-
 * f(X):                           d-e-f-g-
 * flatMapError(f, stream): -a-b-c-d-e-f-g-
 * @param {function(error:*):Stream} f function which returns a new stream
 * @returns {Stream} new stream which will recover from an error by calling f
 */

_Stream2.default.prototype.recoverWith = _Stream2.default.prototype.flatMapError = function (f) {
  return (0, _errors.flatMapError)(f, this);
};

// -----------------------------------------------------------------------
// Multicasting

exports.multicast = _multicast2.default;

/**
 * Transform the stream into multicast stream.  That means that many subscribers
 * to the stream will not cause multiple invocations of the internal machinery.
 * @returns {Stream} new stream which will multicast events to all observers.
 */

_Stream2.default.prototype.multicast = function () {
  return (0, _multicast2.default)(this);
};
},{"./Stream":83,"./combinator/accumulate":84,"./combinator/applicative":85,"./combinator/build":86,"./combinator/combine":87,"./combinator/concatMap":88,"./combinator/continueWith":89,"./combinator/delay":90,"./combinator/errors":91,"./combinator/filter":92,"./combinator/flatMap":93,"./combinator/limit":94,"./combinator/loop":95,"./combinator/merge":96,"./combinator/mergeConcurrently":97,"./combinator/observe":98,"./combinator/promises":99,"./combinator/sample":100,"./combinator/slice":101,"./combinator/switch":102,"./combinator/thru":103,"./combinator/timeslice":104,"./combinator/timestamp":105,"./combinator/transduce":106,"./combinator/transform":107,"./combinator/zip":108,"./observable/subscribe":121,"./source/core":135,"./source/from":136,"./source/fromEvent":138,"./source/generate":140,"./source/iterate":141,"./source/periodic":142,"./source/unfold":144,"@most/multicast":2,"@most/prelude":3,"symbol-observable":163}],117:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = invoke;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function invoke(f, args) {
  /*eslint complexity: [2,7]*/
  switch (args.length) {
    case 0:
      return f();
    case 1:
      return f(args[0]);
    case 2:
      return f(args[0], args[1]);
    case 3:
      return f(args[0], args[1], args[2]);
    case 4:
      return f(args[0], args[1], args[2], args[3]);
    case 5:
      return f(args[0], args[1], args[2], args[3], args[4]);
    default:
      return f.apply(void 0, args);
  }
}
},{}],118:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isIterable = isIterable;
exports.getIterator = getIterator;
exports.makeIterable = makeIterable;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/*global Set, Symbol*/
var iteratorSymbol;
// Firefox ships a partial implementation using the name @@iterator.
// https://bugzilla.mozilla.org/show_bug.cgi?id=907077#c14
if (typeof Set === 'function' && typeof new Set()['@@iterator'] === 'function') {
  iteratorSymbol = '@@iterator';
} else {
  iteratorSymbol = typeof Symbol === 'function' && Symbol.iterator || '_es6shim_iterator_';
}

function isIterable(o) {
  return typeof o[iteratorSymbol] === 'function';
}

function getIterator(o) {
  return o[iteratorSymbol]();
}

function makeIterable(f, o) {
  o[iteratorSymbol] = f;
  return o;
}
},{}],119:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromObservable = fromObservable;
exports.ObservableSource = ObservableSource;
exports.SubscriberSink = SubscriberSink;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function fromObservable(observable) {
  return new _Stream2.default(new ObservableSource(observable));
}

function ObservableSource(observable) {
  this.observable = observable;
}

ObservableSource.prototype.run = function (sink, scheduler) {
  var sub = this.observable.subscribe(new SubscriberSink(sink, scheduler));
  if (typeof sub === 'function') {
    return dispose.create(sub);
  } else if (sub && typeof sub.unsubscribe === 'function') {
    return dispose.create(unsubscribe, sub);
  }

  throw new TypeError('Observable returned invalid subscription ' + String(sub));
};

function SubscriberSink(sink, scheduler) {
  this.sink = sink;
  this.scheduler = scheduler;
}

SubscriberSink.prototype.next = function (x) {
  this.sink.event(this.scheduler.now(), x);
};

SubscriberSink.prototype.complete = function (x) {
  this.sink.end(this.scheduler.now(), x);
};

SubscriberSink.prototype.error = function (e) {
  this.sink.error(this.scheduler.now(), e);
};

function unsubscribe(subscription) {
  return subscription.unsubscribe();
}
},{"../Stream":83,"../disposable/dispose":111}],120:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getObservable;

var _symbolObservable = require('symbol-observable');

var _symbolObservable2 = _interopRequireDefault(_symbolObservable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getObservable(o) {
  // eslint-disable-line complexity
  var obs = null;
  if (o) {
    // Access foreign method only once
    var method = o[_symbolObservable2.default];
    if (typeof method === 'function') {
      obs = method.call(o);
      if (!(obs && typeof obs.subscribe === 'function')) {
        throw new TypeError('invalid observable ' + obs);
      }
    }
  }

  return obs;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
},{"symbol-observable":163}],121:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.subscribe = subscribe;
exports.SubscribeObserver = SubscribeObserver;
exports.Subscription = Subscription;

var _defaultScheduler = require('../scheduler/defaultScheduler');

var _defaultScheduler2 = _interopRequireDefault(_defaultScheduler);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _fatalError = require('../fatalError');

var _fatalError2 = _interopRequireDefault(_fatalError);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function subscribe(subscriber, stream) {
  if (subscriber == null || typeof subscriber !== 'object') {
    throw new TypeError('subscriber must be an object');
  }

  var disposable = dispose.settable();
  var observer = new SubscribeObserver(_fatalError2.default, subscriber, disposable);

  disposable.setDisposable(stream.source.run(observer, _defaultScheduler2.default));

  return new Subscription(disposable);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function SubscribeObserver(fatalError, subscriber, disposable) {
  this.fatalError = fatalError;
  this.subscriber = subscriber;
  this.disposable = disposable;
}

SubscribeObserver.prototype.event = function (t, x) {
  if (typeof this.subscriber.next === 'function') {
    this.subscriber.next(x);
  }
};

SubscribeObserver.prototype.end = function (t, x) {
  var s = this.subscriber;
  doDispose(this.fatalError, s, s.complete, s.error, this.disposable, x);
};

SubscribeObserver.prototype.error = function (t, e) {
  var s = this.subscriber;
  doDispose(this.fatalError, s, s.error, s.error, this.disposable, e);
};

function Subscription(disposable) {
  this.disposable = disposable;
}

Subscription.prototype.unsubscribe = function () {
  this.disposable.dispose();
};

function doDispose(fatal, subscriber, complete, error, disposable, x) {
  Promise.resolve(disposable.dispose()).then(function () {
    if (typeof complete === 'function') {
      complete.call(subscriber, x);
    }
  }).catch(function (e) {
    if (typeof error === 'function') {
      error.call(subscriber, e);
    }
  }).catch(fatal);
}
},{"../disposable/dispose":111,"../fatalError":112,"../scheduler/defaultScheduler":128}],122:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withDefaultScheduler = withDefaultScheduler;
exports.withScheduler = withScheduler;

var _dispose = require('./disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _defaultScheduler = require('./scheduler/defaultScheduler');

var _defaultScheduler2 = _interopRequireDefault(_defaultScheduler);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function withDefaultScheduler(source) {
  return withScheduler(source, _defaultScheduler2.default);
}

function withScheduler(source, scheduler) {
  return new Promise(function (resolve, reject) {
    runSource(source, scheduler, resolve, reject);
  });
}

function runSource(source, scheduler, resolve, reject) {
  var disposable = dispose.settable();
  var observer = new Drain(resolve, reject, disposable);

  disposable.setDisposable(source.run(observer, scheduler));
}

function Drain(end, error, disposable) {
  this._end = end;
  this._error = error;
  this._disposable = disposable;
  this.active = true;
}

Drain.prototype.event = function (t, x) {};

Drain.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }
  this.active = false;
  disposeThen(this._end, this._error, this._disposable, x);
};

Drain.prototype.error = function (t, e) {
  this.active = false;
  disposeThen(this._error, this._error, this._disposable, e);
};

function disposeThen(end, error, disposable, x) {
  Promise.resolve(disposable.dispose()).then(function () {
    end(x);
  }, error);
}
},{"./disposable/dispose":111,"./scheduler/defaultScheduler":128}],123:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ClockTimer;

var _task = require('../task');

/*global setTimeout, clearTimeout*/

function ClockTimer() {} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

ClockTimer.prototype.now = Date.now;

ClockTimer.prototype.setTimer = function (f, dt) {
  return dt <= 0 ? runAsap(f) : setTimeout(f, dt);
};

ClockTimer.prototype.clearTimer = function (t) {
  return t instanceof Asap ? t.cancel() : clearTimeout(t);
};

function Asap(f) {
  this.f = f;
  this.active = true;
}

Asap.prototype.run = function () {
  return this.active && this.f();
};

Asap.prototype.error = function (e) {
  throw e;
};

Asap.prototype.cancel = function () {
  this.active = false;
};

function runAsap(f) {
  var task = new Asap(f);
  (0, _task.defer)(task);
  return task;
}
},{"../task":145}],124:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = PropagateTask;

var _fatalError = require('../fatalError');

var _fatalError2 = _interopRequireDefault(_fatalError);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function PropagateTask(run, value, sink) {
  this._run = run;
  this.value = value;
  this.sink = sink;
  this.active = true;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

PropagateTask.event = function (value, sink) {
  return new PropagateTask(emit, value, sink);
};

PropagateTask.end = function (value, sink) {
  return new PropagateTask(end, value, sink);
};

PropagateTask.error = function (value, sink) {
  return new PropagateTask(error, value, sink);
};

PropagateTask.prototype.dispose = function () {
  this.active = false;
};

PropagateTask.prototype.run = function (t) {
  if (!this.active) {
    return;
  }
  this._run(t, this.value, this.sink);
};

PropagateTask.prototype.error = function (t, e) {
  if (!this.active) {
    return (0, _fatalError2.default)(e);
  }
  this.sink.error(t, e);
};

function error(t, e, sink) {
  sink.error(t, e);
}

function emit(t, x, sink) {
  sink.event(t, x);
}

function end(t, x, sink) {
  sink.end(t, x);
}
},{"../fatalError":112}],125:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ScheduledTask;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function ScheduledTask(delay, period, task, scheduler) {
  this.time = delay;
  this.period = period;
  this.task = task;
  this.scheduler = scheduler;
  this.active = true;
}

ScheduledTask.prototype.run = function () {
  return this.task.run(this.time);
};

ScheduledTask.prototype.error = function (e) {
  return this.task.error(this.time, e);
};

ScheduledTask.prototype.dispose = function () {
  this.scheduler.cancel(this);
  return this.task.dispose();
};
},{}],126:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Scheduler;

var _ScheduledTask = require('./ScheduledTask');

var _ScheduledTask2 = _interopRequireDefault(_ScheduledTask);

var _task = require('../task');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Scheduler(timer, timeline) {
  this.timer = timer;
  this.timeline = timeline;

  this._timer = null;
  this._nextArrival = Infinity;

  var self = this;
  this._runReadyTasksBound = function () {
    self._runReadyTasks(self.now());
  };
}

Scheduler.prototype.now = function () {
  return this.timer.now();
};

Scheduler.prototype.asap = function (task) {
  return this.schedule(0, -1, task);
};

Scheduler.prototype.delay = function (delay, task) {
  return this.schedule(delay, -1, task);
};

Scheduler.prototype.periodic = function (period, task) {
  return this.schedule(0, period, task);
};

Scheduler.prototype.schedule = function (delay, period, task) {
  var now = this.now();
  var st = new _ScheduledTask2.default(now + Math.max(0, delay), period, task, this);

  this.timeline.add(st);
  this._scheduleNextRun(now);
  return st;
};

Scheduler.prototype.cancel = function (task) {
  task.active = false;
  if (this.timeline.remove(task)) {
    this._reschedule();
  }
};

Scheduler.prototype.cancelAll = function (f) {
  this.timeline.removeAll(f);
  this._reschedule();
};

Scheduler.prototype._reschedule = function () {
  if (this.timeline.isEmpty()) {
    this._unschedule();
  } else {
    this._scheduleNextRun(this.now());
  }
};

Scheduler.prototype._unschedule = function () {
  this.timer.clearTimer(this._timer);
  this._timer = null;
};

Scheduler.prototype._scheduleNextRun = function (now) {
  // eslint-disable-line complexity
  if (this.timeline.isEmpty()) {
    return;
  }

  var nextArrival = this.timeline.nextArrival();

  if (this._timer === null) {
    this._scheduleNextArrival(nextArrival, now);
  } else if (nextArrival < this._nextArrival) {
    this._unschedule();
    this._scheduleNextArrival(nextArrival, now);
  }
};

Scheduler.prototype._scheduleNextArrival = function (nextArrival, now) {
  this._nextArrival = nextArrival;
  var delay = Math.max(0, nextArrival - now);
  this._timer = this.timer.setTimer(this._runReadyTasksBound, delay);
};

Scheduler.prototype._runReadyTasks = function (now) {
  this._timer = null;
  this.timeline.runTasks(now, _task.runTask);
  this._scheduleNextRun(this.now());
};
},{"../task":145,"./ScheduledTask":125}],127:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Timeline;

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function Timeline() {
  this.tasks = [];
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

Timeline.prototype.nextArrival = function () {
  return this.isEmpty() ? Infinity : this.tasks[0].time;
};

Timeline.prototype.isEmpty = function () {
  return this.tasks.length === 0;
};

Timeline.prototype.add = function (st) {
  insertByTime(st, this.tasks);
};

Timeline.prototype.remove = function (st) {
  var i = binarySearch(st.time, this.tasks);

  if (i >= 0 && i < this.tasks.length) {
    var at = base.findIndex(st, this.tasks[i].events);
    if (at >= 0) {
      this.tasks[i].events.splice(at, 1);
      return true;
    }
  }

  return false;
};

Timeline.prototype.removeAll = function (f) {
  var this$1 = this;

  for (var i = 0, l = this.tasks.length; i < l; ++i) {
    removeAllFrom(f, this$1.tasks[i]);
  }
};

Timeline.prototype.runTasks = function (t, runTask) {
  var this$1 = this;

  var tasks = this.tasks;
  var l = tasks.length;
  var i = 0;

  while (i < l && tasks[i].time <= t) {
    ++i;
  }

  this.tasks = tasks.slice(i);

  // Run all ready tasks
  for (var j = 0; j < i; ++j) {
    this$1.tasks = runTasks(runTask, tasks[j], this$1.tasks);
  }
};

function runTasks(runTask, timeslot, tasks) {
  // eslint-disable-line complexity
  var events = timeslot.events;
  for (var i = 0; i < events.length; ++i) {
    var task = events[i];

    if (task.active) {
      runTask(task);

      // Reschedule periodic repeating tasks
      // Check active again, since a task may have canceled itself
      if (task.period >= 0 && task.active) {
        task.time = task.time + task.period;
        insertByTime(task, tasks);
      }
    }
  }

  return tasks;
}

function insertByTime(task, timeslots) {
  // eslint-disable-line complexity
  var l = timeslots.length;

  if (l === 0) {
    timeslots.push(newTimeslot(task.time, [task]));
    return;
  }

  var i = binarySearch(task.time, timeslots);

  if (i >= l) {
    timeslots.push(newTimeslot(task.time, [task]));
  } else if (task.time === timeslots[i].time) {
    timeslots[i].events.push(task);
  } else {
    timeslots.splice(i, 0, newTimeslot(task.time, [task]));
  }
}

function removeAllFrom(f, timeslot) {
  timeslot.events = base.removeAll(f, timeslot.events);
}

function binarySearch(t, sortedArray) {
  // eslint-disable-line complexity
  var lo = 0;
  var hi = sortedArray.length;
  var mid, y;

  while (lo < hi) {
    mid = Math.floor((lo + hi) / 2);
    y = sortedArray[mid];

    if (t === y.time) {
      return mid;
    } else if (t < y.time) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return hi;
}

function newTimeslot(t, events) {
  return { time: t, events: events };
}
},{"@most/prelude":3}],128:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Scheduler = require('./Scheduler');

var _Scheduler2 = _interopRequireDefault(_Scheduler);

var _ClockTimer = require('./ClockTimer');

var _ClockTimer2 = _interopRequireDefault(_ClockTimer);

var _Timeline = require('./Timeline');

var _Timeline2 = _interopRequireDefault(_Timeline);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultScheduler = new _Scheduler2.default(new _ClockTimer2.default(), new _Timeline2.default()); /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

exports.default = defaultScheduler;
},{"./ClockTimer":123,"./Scheduler":126,"./Timeline":127}],129:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = DeferredSink;

var _task = require('../task');

function DeferredSink(sink) {
  this.sink = sink;
  this.events = [];
  this.active = true;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

DeferredSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }

  if (this.events.length === 0) {
    (0, _task.defer)(new PropagateAllTask(this.sink, t, this.events));
  }

  this.events.push({ time: t, value: x });
};

DeferredSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }

  this._end(new EndTask(t, x, this.sink));
};

DeferredSink.prototype.error = function (t, e) {
  this._end(new ErrorTask(t, e, this.sink));
};

DeferredSink.prototype._end = function (task) {
  this.active = false;
  (0, _task.defer)(task);
};

function PropagateAllTask(sink, time, events) {
  this.sink = sink;
  this.events = events;
  this.time = time;
}

PropagateAllTask.prototype.run = function () {
  var this$1 = this;

  var events = this.events;
  var sink = this.sink;
  var event;

  for (var i = 0, l = events.length; i < l; ++i) {
    event = events[i];
    this$1.time = event.time;
    sink.event(event.time, event.value);
  }

  events.length = 0;
};

PropagateAllTask.prototype.error = function (e) {
  this.sink.error(this.time, e);
};

function EndTask(t, x, sink) {
  this.time = t;
  this.value = x;
  this.sink = sink;
}

EndTask.prototype.run = function () {
  this.sink.end(this.time, this.value);
};

EndTask.prototype.error = function (e) {
  this.sink.error(this.time, e);
};

function ErrorTask(t, e, sink) {
  this.time = t;
  this.value = e;
  this.sink = sink;
}

ErrorTask.prototype.run = function () {
  this.sink.error(this.time, this.value);
};

ErrorTask.prototype.error = function (e) {
  throw e;
};
},{"../task":145}],130:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = IndexSink;

var _Pipe = require('./Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function IndexSink(i, sink) {
  this.sink = sink;
  this.index = i;
  this.active = true;
  this.value = void 0;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

IndexSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }
  this.value = x;
  this.sink.event(t, this);
};

IndexSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }
  this.active = false;
  this.sink.end(t, { index: this.index, value: x });
};

IndexSink.prototype.error = _Pipe2.default.prototype.error;
},{"./Pipe":131}],131:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Pipe;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * A sink mixin that simply forwards event, end, and error to
 * another sink.
 * @param sink
 * @constructor
 */
function Pipe(sink) {
  this.sink = sink;
}

Pipe.prototype.event = function (t, x) {
  return this.sink.event(t, x);
};

Pipe.prototype.end = function (t, x) {
  return this.sink.end(t, x);
};

Pipe.prototype.error = function (t, e) {
  return this.sink.error(t, e);
};
},{}],132:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = SafeSink;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function SafeSink(sink) {
  this.sink = sink;
  this.active = true;
}

SafeSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }
  this.sink.event(t, x);
};

SafeSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }
  this.disable();
  this.sink.end(t, x);
};

SafeSink.prototype.error = function (t, e) {
  this.disable();
  this.sink.error(t, e);
};

SafeSink.prototype.disable = function () {
  this.active = false;
  return this.sink;
};
},{}],133:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = EventEmitterSource;

var _DeferredSink = require('../sink/DeferredSink');

var _DeferredSink2 = _interopRequireDefault(_DeferredSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _tryEvent = require('./tryEvent');

var tryEvent = _interopRequireWildcard(_tryEvent);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function EventEmitterSource(event, source) {
  this.event = event;
  this.source = source;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

EventEmitterSource.prototype.run = function (sink, scheduler) {
  // NOTE: Because EventEmitter allows events in the same call stack as
  // a listener is added, use a DeferredSink to buffer events
  // until the stack clears, then propagate.  This maintains most.js's
  // invariant that no event will be delivered in the same call stack
  // as an observer begins observing.
  var dsink = new _DeferredSink2.default(sink);

  function addEventVariadic(a) {
    var arguments$1 = arguments;

    var l = arguments.length;
    if (l > 1) {
      var arr = new Array(l);
      for (var i = 0; i < l; ++i) {
        arr[i] = arguments$1[i];
      }
      tryEvent.tryEvent(scheduler.now(), arr, dsink);
    } else {
      tryEvent.tryEvent(scheduler.now(), a, dsink);
    }
  }

  this.source.addListener(this.event, addEventVariadic);

  return dispose.create(disposeEventEmitter, { target: this, addEvent: addEventVariadic });
};

function disposeEventEmitter(info) {
  var target = info.target;
  target.source.removeListener(target.event, info.addEvent);
}
},{"../disposable/dispose":111,"../sink/DeferredSink":129,"./tryEvent":143}],134:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = EventTargetSource;

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _tryEvent = require('./tryEvent');

var tryEvent = _interopRequireWildcard(_tryEvent);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function EventTargetSource(event, source, capture) {
  this.event = event;
  this.source = source;
  this.capture = capture;
}

EventTargetSource.prototype.run = function (sink, scheduler) {
  function addEvent(e) {
    tryEvent.tryEvent(scheduler.now(), e, sink);
  }

  this.source.addEventListener(this.event, addEvent, this.capture);

  return dispose.create(disposeEventTarget, { target: this, addEvent: addEvent });
};

function disposeEventTarget(info) {
  var target = info.target;
  target.source.removeEventListener(target.event, info.addEvent, target.capture);
}
},{"../disposable/dispose":111,"./tryEvent":143}],135:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.of = of;
exports.empty = empty;
exports.never = never;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Stream containing only x
 * @param {*} x
 * @returns {Stream}
 */
function of(x) {
  return new _Stream2.default(new Just(x));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Just(x) {
  this.value = x;
}

Just.prototype.run = function (sink, scheduler) {
  return scheduler.asap(new _PropagateTask2.default(runJust, this.value, sink));
};

function runJust(t, x, sink) {
  sink.event(t, x);
  sink.end(t, void 0);
}

/**
 * Stream containing no events and ends immediately
 * @returns {Stream}
 */
function empty() {
  return EMPTY;
}

function EmptySource() {}

EmptySource.prototype.run = function (sink, scheduler) {
  var task = _PropagateTask2.default.end(void 0, sink);
  scheduler.asap(task);

  return dispose.create(disposeEmpty, task);
};

function disposeEmpty(task) {
  return task.dispose();
}

var EMPTY = new _Stream2.default(new EmptySource());

/**
 * Stream containing no events and never ends
 * @returns {Stream}
 */
function never() {
  return NEVER;
}

function NeverSource() {}

NeverSource.prototype.run = function () {
  return dispose.empty();
};

var NEVER = new _Stream2.default(new NeverSource());
},{"../Stream":83,"../disposable/dispose":111,"../scheduler/PropagateTask":124}],136:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.from = from;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _fromArray = require('./fromArray');

var _iterable = require('../iterable');

var _fromIterable = require('./fromIterable');

var _getObservable = require('../observable/getObservable');

var _getObservable2 = _interopRequireDefault(_getObservable);

var _fromObservable = require('../observable/fromObservable');

var _prelude = require('@most/prelude');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function from(a) {
  // eslint-disable-line complexity
  if (a instanceof _Stream2.default) {
    return a;
  }

  var observable = (0, _getObservable2.default)(a);
  if (observable != null) {
    return (0, _fromObservable.fromObservable)(observable);
  }

  if (Array.isArray(a) || (0, _prelude.isArrayLike)(a)) {
    return (0, _fromArray.fromArray)(a);
  }

  if ((0, _iterable.isIterable)(a)) {
    return (0, _fromIterable.fromIterable)(a);
  }

  throw new TypeError('from(x) must be observable, iterable, or array-like: ' + a);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
},{"../Stream":83,"../iterable":118,"../observable/fromObservable":119,"../observable/getObservable":120,"./fromArray":137,"./fromIterable":139,"@most/prelude":3}],137:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromArray = fromArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function fromArray(a) {
  return new _Stream2.default(new ArraySource(a));
}

function ArraySource(a) {
  this.array = a;
}

ArraySource.prototype.run = function (sink, scheduler) {
  return scheduler.asap(new _PropagateTask2.default(runProducer, this.array, sink));
};

function runProducer(t, array, sink) {
  for (var i = 0, l = array.length; i < l && this.active; ++i) {
    sink.event(t, array[i]);
  }

  this.active && end(t);

  function end(t) {
    sink.end(t);
  }
}
},{"../Stream":83,"../scheduler/PropagateTask":124}],138:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromEvent = fromEvent;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _EventTargetSource = require('./EventTargetSource');

var _EventTargetSource2 = _interopRequireDefault(_EventTargetSource);

var _EventEmitterSource = require('./EventEmitterSource');

var _EventEmitterSource2 = _interopRequireDefault(_EventEmitterSource);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a stream from an EventTarget, such as a DOM Node, or EventEmitter.
 * @param {String} event event type name, e.g. 'click'
 * @param {EventTarget|EventEmitter} source EventTarget or EventEmitter
 * @param {*?} capture for DOM events, whether to use
 *  capturing--passed as 3rd parameter to addEventListener.
 * @returns {Stream} stream containing all events of the specified type
 * from the source.
 */
function fromEvent(event, source, capture) {
  // eslint-disable-line complexity
  var s;

  if (typeof source.addEventListener === 'function' && typeof source.removeEventListener === 'function') {
    if (arguments.length < 3) {
      capture = false;
    }

    s = new _EventTargetSource2.default(event, source, capture);
  } else if (typeof source.addListener === 'function' && typeof source.removeListener === 'function') {
    s = new _EventEmitterSource2.default(event, source);
  } else {
    throw new Error('source must support addEventListener/removeEventListener or addListener/removeListener');
  }

  return new _Stream2.default(s);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
},{"../Stream":83,"./EventEmitterSource":133,"./EventTargetSource":134}],139:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromIterable = fromIterable;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _iterable = require('../iterable');

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function fromIterable(iterable) {
  return new _Stream2.default(new IterableSource(iterable));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function IterableSource(iterable) {
  this.iterable = iterable;
}

IterableSource.prototype.run = function (sink, scheduler) {
  return new IteratorProducer((0, _iterable.getIterator)(this.iterable), sink, scheduler);
};

function IteratorProducer(iterator, sink, scheduler) {
  this.scheduler = scheduler;
  this.iterator = iterator;
  this.task = new _PropagateTask2.default(runProducer, this, sink);
  scheduler.asap(this.task);
}

IteratorProducer.prototype.dispose = function () {
  return this.task.dispose();
};

function runProducer(t, producer, sink) {
  var x = producer.iterator.next();
  if (x.done) {
    sink.end(t, x.value);
  } else {
    sink.event(t, x.value);
  }

  producer.scheduler.asap(producer.task);
}
},{"../Stream":83,"../iterable":118,"../scheduler/PropagateTask":124}],140:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generate = generate;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Compute a stream using an *async* generator, which yields promises
 * to control event times.
 * @param f
 * @returns {Stream}
 */
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function generate(f /*, ...args */) {
  return new _Stream2.default(new GenerateSource(f, base.tail(arguments)));
}

function GenerateSource(f, args) {
  this.f = f;
  this.args = args;
}

GenerateSource.prototype.run = function (sink, scheduler) {
  return new Generate(this.f.apply(void 0, this.args), sink, scheduler);
};

function Generate(iterator, sink, scheduler) {
  this.iterator = iterator;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;

  var self = this;
  function err(e) {
    self.sink.error(self.scheduler.now(), e);
  }

  Promise.resolve(this).then(next).catch(err);
}

function next(generate, x) {
  return generate.active ? handle(generate, generate.iterator.next(x)) : x;
}

function handle(generate, result) {
  if (result.done) {
    return generate.sink.end(generate.scheduler.now(), result.value);
  }

  return Promise.resolve(result.value).then(function (x) {
    return emit(generate, x);
  }, function (e) {
    return error(generate, e);
  });
}

function emit(generate, x) {
  generate.sink.event(generate.scheduler.now(), x);
  return next(generate, x);
}

function error(generate, e) {
  return handle(generate, generate.iterator.throw(e));
}

Generate.prototype.dispose = function () {
  this.active = false;
};
},{"../Stream":83,"@most/prelude":3}],141:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.iterate = iterate;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Compute a stream by iteratively calling f to produce values
 * Event times may be controlled by returning a Promise from f
 * @param {function(x:*):*|Promise<*>} f
 * @param {*} x initial value
 * @returns {Stream}
 */
function iterate(f, x) {
  return new _Stream2.default(new IterateSource(f, x));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function IterateSource(f, x) {
  this.f = f;
  this.value = x;
}

IterateSource.prototype.run = function (sink, scheduler) {
  return new Iterate(this.f, this.value, sink, scheduler);
};

function Iterate(f, initial, sink, scheduler) {
  this.f = f;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;

  var x = initial;

  var self = this;
  function err(e) {
    self.sink.error(self.scheduler.now(), e);
  }

  function start(iterate) {
    return stepIterate(iterate, x);
  }

  Promise.resolve(this).then(start).catch(err);
}

Iterate.prototype.dispose = function () {
  this.active = false;
};

function stepIterate(iterate, x) {
  iterate.sink.event(iterate.scheduler.now(), x);

  if (!iterate.active) {
    return x;
  }

  var f = iterate.f;
  return Promise.resolve(f(x)).then(function (y) {
    return continueIterate(iterate, y);
  });
}

function continueIterate(iterate, x) {
  return !iterate.active ? iterate.value : stepIterate(iterate, x);
}
},{"../Stream":83}],142:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.periodic = periodic;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a stream that emits the current time periodically
 * @param {Number} period periodicity of events in millis
 * @param {*} value value to emit each period
 * @returns {Stream} new stream that emits the current time every period
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function periodic(period, value) {
  return new _Stream2.default(new Periodic(period, value));
}

function Periodic(period, value) {
  this.period = period;
  this.value = value;
}

Periodic.prototype.run = function (sink, scheduler) {
  return scheduler.periodic(this.period, _PropagateTask2.default.event(this.value, sink));
};
},{"../Stream":83,"../scheduler/PropagateTask":124}],143:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tryEvent = tryEvent;
exports.tryEnd = tryEnd;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function tryEvent(t, x, sink) {
  try {
    sink.event(t, x);
  } catch (e) {
    sink.error(t, e);
  }
}

function tryEnd(t, x, sink) {
  try {
    sink.end(t, x);
  } catch (e) {
    sink.error(t, e);
  }
}
},{}],144:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unfold = unfold;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Compute a stream by unfolding tuples of future values from a seed value
 * Event times may be controlled by returning a Promise from f
 * @param {function(seed:*):{value:*, seed:*, done:boolean}|Promise<{value:*, seed:*, done:boolean}>} f unfolding function accepts
 *  a seed and returns a new tuple with a value, new seed, and boolean done flag.
 *  If tuple.done is true, the stream will end.
 * @param {*} seed seed value
 * @returns {Stream} stream containing all value of all tuples produced by the
 *  unfolding function.
 */
function unfold(f, seed) {
  return new _Stream2.default(new UnfoldSource(f, seed));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function UnfoldSource(f, seed) {
  this.f = f;
  this.value = seed;
}

UnfoldSource.prototype.run = function (sink, scheduler) {
  return new Unfold(this.f, this.value, sink, scheduler);
};

function Unfold(f, x, sink, scheduler) {
  this.f = f;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;

  var self = this;
  function err(e) {
    self.sink.error(self.scheduler.now(), e);
  }

  function start(unfold) {
    return stepUnfold(unfold, x);
  }

  Promise.resolve(this).then(start).catch(err);
}

Unfold.prototype.dispose = function () {
  this.active = false;
};

function stepUnfold(unfold, x) {
  var f = unfold.f;
  return Promise.resolve(f(x)).then(function (tuple) {
    return continueUnfold(unfold, tuple);
  });
}

function continueUnfold(unfold, tuple) {
  if (tuple.done) {
    unfold.sink.end(unfold.scheduler.now(), tuple.value);
    return tuple.value;
  }

  unfold.sink.event(unfold.scheduler.now(), tuple.value);

  if (!unfold.active) {
    return tuple.value;
  }
  return stepUnfold(unfold, tuple.seed);
}
},{"../Stream":83}],145:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defer = defer;
exports.runTask = runTask;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function defer(task) {
  return Promise.resolve(task).then(runTask);
}

function runTask(task) {
  try {
    return task.run();
  } catch (e) {
    return task.error(e);
  }
}
},{}],146:[function(require,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = nextTick;
} else {
  module.exports = process.nextTick;
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}

}).call(this,require('_process'))
},{"_process":147}],147:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],148:[function(require,module,exports){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.createREGL = factory());
}(this, (function () { 'use strict';

var arrayTypes =  {
	"[object Int8Array]": 5120,
	"[object Int16Array]": 5122,
	"[object Int32Array]": 5124,
	"[object Uint8Array]": 5121,
	"[object Uint8ClampedArray]": 5121,
	"[object Uint16Array]": 5123,
	"[object Uint32Array]": 5125,
	"[object Float32Array]": 5126,
	"[object Float64Array]": 5121,
	"[object ArrayBuffer]": 5121
};

var isTypedArray = function (x) {
  return Object.prototype.toString.call(x) in arrayTypes
};

var extend = function (base, opts) {
  var keys = Object.keys(opts);
  for (var i = 0; i < keys.length; ++i) {
    base[keys[i]] = opts[keys[i]];
  }
  return base
};

// Error checking and parameter validation.
//
// Statements for the form `check.someProcedure(...)` get removed by
// a browserify transform for optimized/minified bundles.
//
/* globals btoa */
// only used for extracting shader names.  if btoa not present, then errors
// will be slightly crappier
function decodeB64 (str) {
  if (typeof btoa !== 'undefined') {
    return btoa(str)
  }
  return 'base64:' + str
}

function raise (message) {
  var error = new Error('(regl) ' + message);
  console.error(error);
  throw error
}

function check (pred, message) {
  if (!pred) {
    raise(message);
  }
}

function encolon (message) {
  if (message) {
    return ': ' + message
  }
  return ''
}

function checkParameter (param, possibilities, message) {
  if (!(param in possibilities)) {
    raise('unknown parameter (' + param + ')' + encolon(message) +
          '. possible values: ' + Object.keys(possibilities).join());
  }
}

function checkIsTypedArray (data, message) {
  if (!isTypedArray(data)) {
    raise(
      'invalid parameter type' + encolon(message) +
      '. must be a typed array');
  }
}

function checkTypeOf (value, type, message) {
  if (typeof value !== type) {
    raise(
      'invalid parameter type' + encolon(message) +
      '. expected ' + type + ', got ' + (typeof value));
  }
}

function checkNonNegativeInt (value, message) {
  if (!((value >= 0) &&
        ((value | 0) === value))) {
    raise('invalid parameter type, (' + value + ')' + encolon(message) +
          '. must be a nonnegative integer');
  }
}

function checkOneOf (value, list, message) {
  if (list.indexOf(value) < 0) {
    raise('invalid value' + encolon(message) + '. must be one of: ' + list);
  }
}

var constructorKeys = [
  'gl',
  'canvas',
  'container',
  'attributes',
  'pixelRatio',
  'extensions',
  'optionalExtensions',
  'profile',
  'onDone'
];

function checkConstructor (obj) {
  Object.keys(obj).forEach(function (key) {
    if (constructorKeys.indexOf(key) < 0) {
      raise('invalid regl constructor argument "' + key + '". must be one of ' + constructorKeys);
    }
  });
}

function leftPad (str, n) {
  str = str + '';
  while (str.length < n) {
    str = ' ' + str;
  }
  return str
}

function ShaderFile () {
  this.name = 'unknown';
  this.lines = [];
  this.index = {};
  this.hasErrors = false;
}

function ShaderLine (number, line) {
  this.number = number;
  this.line = line;
  this.errors = [];
}

function ShaderError (fileNumber, lineNumber, message) {
  this.file = fileNumber;
  this.line = lineNumber;
  this.message = message;
}

function guessCommand () {
  var error = new Error();
  var stack = (error.stack || error).toString();
  var pat = /compileProcedure.*\n\s*at.*\((.*)\)/.exec(stack);
  if (pat) {
    return pat[1]
  }
  var pat2 = /compileProcedure.*\n\s*at\s+(.*)(\n|$)/.exec(stack);
  if (pat2) {
    return pat2[1]
  }
  return 'unknown'
}

function guessCallSite () {
  var error = new Error();
  var stack = (error.stack || error).toString();
  var pat = /at REGLCommand.*\n\s+at.*\((.*)\)/.exec(stack);
  if (pat) {
    return pat[1]
  }
  var pat2 = /at REGLCommand.*\n\s+at\s+(.*)\n/.exec(stack);
  if (pat2) {
    return pat2[1]
  }
  return 'unknown'
}

function parseSource (source, command) {
  var lines = source.split('\n');
  var lineNumber = 1;
  var fileNumber = 0;
  var files = {
    unknown: new ShaderFile(),
    0: new ShaderFile()
  };
  files.unknown.name = files[0].name = command || guessCommand();
  files.unknown.lines.push(new ShaderLine(0, ''));
  for (var i = 0; i < lines.length; ++i) {
    var line = lines[i];
    var parts = /^\s*\#\s*(\w+)\s+(.+)\s*$/.exec(line);
    if (parts) {
      switch (parts[1]) {
        case 'line':
          var lineNumberInfo = /(\d+)(\s+\d+)?/.exec(parts[2]);
          if (lineNumberInfo) {
            lineNumber = lineNumberInfo[1] | 0;
            if (lineNumberInfo[2]) {
              fileNumber = lineNumberInfo[2] | 0;
              if (!(fileNumber in files)) {
                files[fileNumber] = new ShaderFile();
              }
            }
          }
          break
        case 'define':
          var nameInfo = /SHADER_NAME(_B64)?\s+(.*)$/.exec(parts[2]);
          if (nameInfo) {
            files[fileNumber].name = (nameInfo[1]
                ? decodeB64(nameInfo[2])
                : nameInfo[2]);
          }
          break
      }
    }
    files[fileNumber].lines.push(new ShaderLine(lineNumber++, line));
  }
  Object.keys(files).forEach(function (fileNumber) {
    var file = files[fileNumber];
    file.lines.forEach(function (line) {
      file.index[line.number] = line;
    });
  });
  return files
}

function parseErrorLog (errLog) {
  var result = [];
  errLog.split('\n').forEach(function (errMsg) {
    if (errMsg.length < 5) {
      return
    }
    var parts = /^ERROR\:\s+(\d+)\:(\d+)\:\s*(.*)$/.exec(errMsg);
    if (parts) {
      result.push(new ShaderError(
        parts[1] | 0,
        parts[2] | 0,
        parts[3].trim()));
    } else if (errMsg.length > 0) {
      result.push(new ShaderError('unknown', 0, errMsg));
    }
  });
  return result
}

function annotateFiles (files, errors) {
  errors.forEach(function (error) {
    var file = files[error.file];
    if (file) {
      var line = file.index[error.line];
      if (line) {
        line.errors.push(error);
        file.hasErrors = true;
        return
      }
    }
    files.unknown.hasErrors = true;
    files.unknown.lines[0].errors.push(error);
  });
}

function checkShaderError (gl, shader, source, type, command) {
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    var errLog = gl.getShaderInfoLog(shader);
    var typeName = type === gl.FRAGMENT_SHADER ? 'fragment' : 'vertex';
    checkCommandType(source, 'string', typeName + ' shader source must be a string', command);
    var files = parseSource(source, command);
    var errors = parseErrorLog(errLog);
    annotateFiles(files, errors);

    Object.keys(files).forEach(function (fileNumber) {
      var file = files[fileNumber];
      if (!file.hasErrors) {
        return
      }

      var strings = [''];
      var styles = [''];

      function push (str, style) {
        strings.push(str);
        styles.push(style || '');
      }

      push('file number ' + fileNumber + ': ' + file.name + '\n', 'color:red;text-decoration:underline;font-weight:bold');

      file.lines.forEach(function (line) {
        if (line.errors.length > 0) {
          push(leftPad(line.number, 4) + '|  ', 'background-color:yellow; font-weight:bold');
          push(line.line + '\n', 'color:red; background-color:yellow; font-weight:bold');

          // try to guess token
          var offset = 0;
          line.errors.forEach(function (error) {
            var message = error.message;
            var token = /^\s*\'(.*)\'\s*\:\s*(.*)$/.exec(message);
            if (token) {
              var tokenPat = token[1];
              message = token[2];
              switch (tokenPat) {
                case 'assign':
                  tokenPat = '=';
                  break
              }
              offset = Math.max(line.line.indexOf(tokenPat, offset), 0);
            } else {
              offset = 0;
            }

            push(leftPad('| ', 6));
            push(leftPad('^^^', offset + 3) + '\n', 'font-weight:bold');
            push(leftPad('| ', 6));
            push(message + '\n', 'font-weight:bold');
          });
          push(leftPad('| ', 6) + '\n');
        } else {
          push(leftPad(line.number, 4) + '|  ');
          push(line.line + '\n', 'color:red');
        }
      });
      if (typeof document !== 'undefined') {
        styles[0] = strings.join('%c');
        console.log.apply(console, styles);
      } else {
        console.log(strings.join(''));
      }
    });

    check.raise('Error compiling ' + typeName + ' shader, ' + files[0].name);
  }
}

function checkLinkError (gl, program, fragShader, vertShader, command) {
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    var errLog = gl.getProgramInfoLog(program);
    var fragParse = parseSource(fragShader, command);
    var vertParse = parseSource(vertShader, command);

    var header = 'Error linking program with vertex shader, "' +
      vertParse[0].name + '", and fragment shader "' + fragParse[0].name + '"';

    if (typeof document !== 'undefined') {
      console.log('%c' + header + '\n%c' + errLog,
        'color:red;text-decoration:underline;font-weight:bold',
        'color:red');
    } else {
      console.log(header + '\n' + errLog);
    }
    check.raise(header);
  }
}

function saveCommandRef (object) {
  object._commandRef = guessCommand();
}

function saveDrawCommandInfo (opts, uniforms, attributes, stringStore) {
  saveCommandRef(opts);

  function id (str) {
    if (str) {
      return stringStore.id(str)
    }
    return 0
  }
  opts._fragId = id(opts.static.frag);
  opts._vertId = id(opts.static.vert);

  function addProps (dict, set) {
    Object.keys(set).forEach(function (u) {
      dict[stringStore.id(u)] = true;
    });
  }

  var uniformSet = opts._uniformSet = {};
  addProps(uniformSet, uniforms.static);
  addProps(uniformSet, uniforms.dynamic);

  var attributeSet = opts._attributeSet = {};
  addProps(attributeSet, attributes.static);
  addProps(attributeSet, attributes.dynamic);

  opts._hasCount = (
    'count' in opts.static ||
    'count' in opts.dynamic ||
    'elements' in opts.static ||
    'elements' in opts.dynamic);
}

function commandRaise (message, command) {
  var callSite = guessCallSite();
  raise(message +
    ' in command ' + (command || guessCommand()) +
    (callSite === 'unknown' ? '' : ' called from ' + callSite));
}

function checkCommand (pred, message, command) {
  if (!pred) {
    commandRaise(message, command || guessCommand());
  }
}

function checkParameterCommand (param, possibilities, message, command) {
  if (!(param in possibilities)) {
    commandRaise(
      'unknown parameter (' + param + ')' + encolon(message) +
      '. possible values: ' + Object.keys(possibilities).join(),
      command || guessCommand());
  }
}

function checkCommandType (value, type, message, command) {
  if (typeof value !== type) {
    commandRaise(
      'invalid parameter type' + encolon(message) +
      '. expected ' + type + ', got ' + (typeof value),
      command || guessCommand());
  }
}

function checkOptional (block) {
  block();
}

function checkFramebufferFormat (attachment, texFormats, rbFormats) {
  if (attachment.texture) {
    checkOneOf(
      attachment.texture._texture.internalformat,
      texFormats,
      'unsupported texture format for attachment');
  } else {
    checkOneOf(
      attachment.renderbuffer._renderbuffer.format,
      rbFormats,
      'unsupported renderbuffer format for attachment');
  }
}

var GL_CLAMP_TO_EDGE = 0x812F;

var GL_NEAREST = 0x2600;
var GL_NEAREST_MIPMAP_NEAREST = 0x2700;
var GL_LINEAR_MIPMAP_NEAREST = 0x2701;
var GL_NEAREST_MIPMAP_LINEAR = 0x2702;
var GL_LINEAR_MIPMAP_LINEAR = 0x2703;

var GL_BYTE = 5120;
var GL_UNSIGNED_BYTE = 5121;
var GL_SHORT = 5122;
var GL_UNSIGNED_SHORT = 5123;
var GL_INT = 5124;
var GL_UNSIGNED_INT = 5125;
var GL_FLOAT = 5126;

var GL_UNSIGNED_SHORT_4_4_4_4 = 0x8033;
var GL_UNSIGNED_SHORT_5_5_5_1 = 0x8034;
var GL_UNSIGNED_SHORT_5_6_5 = 0x8363;
var GL_UNSIGNED_INT_24_8_WEBGL = 0x84FA;

var GL_HALF_FLOAT_OES = 0x8D61;

var TYPE_SIZE = {};

TYPE_SIZE[GL_BYTE] =
TYPE_SIZE[GL_UNSIGNED_BYTE] = 1;

TYPE_SIZE[GL_SHORT] =
TYPE_SIZE[GL_UNSIGNED_SHORT] =
TYPE_SIZE[GL_HALF_FLOAT_OES] =
TYPE_SIZE[GL_UNSIGNED_SHORT_5_6_5] =
TYPE_SIZE[GL_UNSIGNED_SHORT_4_4_4_4] =
TYPE_SIZE[GL_UNSIGNED_SHORT_5_5_5_1] = 2;

TYPE_SIZE[GL_INT] =
TYPE_SIZE[GL_UNSIGNED_INT] =
TYPE_SIZE[GL_FLOAT] =
TYPE_SIZE[GL_UNSIGNED_INT_24_8_WEBGL] = 4;

function pixelSize (type, channels) {
  if (type === GL_UNSIGNED_SHORT_5_5_5_1 ||
      type === GL_UNSIGNED_SHORT_4_4_4_4 ||
      type === GL_UNSIGNED_SHORT_5_6_5) {
    return 2
  } else if (type === GL_UNSIGNED_INT_24_8_WEBGL) {
    return 4
  } else {
    return TYPE_SIZE[type] * channels
  }
}

function isPow2 (v) {
  return !(v & (v - 1)) && (!!v)
}

function checkTexture2D (info, mipData, limits) {
  var i;
  var w = mipData.width;
  var h = mipData.height;
  var c = mipData.channels;

  // Check texture shape
  check(w > 0 && w <= limits.maxTextureSize &&
        h > 0 && h <= limits.maxTextureSize,
        'invalid texture shape');

  // check wrap mode
  if (info.wrapS !== GL_CLAMP_TO_EDGE || info.wrapT !== GL_CLAMP_TO_EDGE) {
    check(isPow2(w) && isPow2(h),
      'incompatible wrap mode for texture, both width and height must be power of 2');
  }

  if (mipData.mipmask === 1) {
    if (w !== 1 && h !== 1) {
      check(
        info.minFilter !== GL_NEAREST_MIPMAP_NEAREST &&
        info.minFilter !== GL_NEAREST_MIPMAP_LINEAR &&
        info.minFilter !== GL_LINEAR_MIPMAP_NEAREST &&
        info.minFilter !== GL_LINEAR_MIPMAP_LINEAR,
        'min filter requires mipmap');
    }
  } else {
    // texture must be power of 2
    check(isPow2(w) && isPow2(h),
      'texture must be a square power of 2 to support mipmapping');
    check(mipData.mipmask === (w << 1) - 1,
      'missing or incomplete mipmap data');
  }

  if (mipData.type === GL_FLOAT) {
    if (limits.extensions.indexOf('oes_texture_float_linear') < 0) {
      check(info.minFilter === GL_NEAREST && info.magFilter === GL_NEAREST,
        'filter not supported, must enable oes_texture_float_linear');
    }
    check(!info.genMipmaps,
      'mipmap generation not supported with float textures');
  }

  // check image complete
  var mipimages = mipData.images;
  for (i = 0; i < 16; ++i) {
    if (mipimages[i]) {
      var mw = w >> i;
      var mh = h >> i;
      check(mipData.mipmask & (1 << i), 'missing mipmap data');

      var img = mipimages[i];

      check(
        img.width === mw &&
        img.height === mh,
        'invalid shape for mip images');

      check(
        img.format === mipData.format &&
        img.internalformat === mipData.internalformat &&
        img.type === mipData.type,
        'incompatible type for mip image');

      if (img.compressed) {
        // TODO: check size for compressed images
      } else if (img.data) {
        // check(img.data.byteLength === mw * mh *
        // Math.max(pixelSize(img.type, c), img.unpackAlignment),
        var rowSize = Math.ceil(pixelSize(img.type, c) * mw / img.unpackAlignment) * img.unpackAlignment;
        check(img.data.byteLength === rowSize * mh,
          'invalid data for image, buffer size is inconsistent with image format');
      } else if (img.element) {
        // TODO: check element can be loaded
      } else if (img.copy) {
        // TODO: check compatible format and type
      }
    } else if (!info.genMipmaps) {
      check((mipData.mipmask & (1 << i)) === 0, 'extra mipmap data');
    }
  }

  if (mipData.compressed) {
    check(!info.genMipmaps,
      'mipmap generation for compressed images not supported');
  }
}

function checkTextureCube (texture, info, faces, limits) {
  var w = texture.width;
  var h = texture.height;
  var c = texture.channels;

  // Check texture shape
  check(
    w > 0 && w <= limits.maxTextureSize && h > 0 && h <= limits.maxTextureSize,
    'invalid texture shape');
  check(
    w === h,
    'cube map must be square');
  check(
    info.wrapS === GL_CLAMP_TO_EDGE && info.wrapT === GL_CLAMP_TO_EDGE,
    'wrap mode not supported by cube map');

  for (var i = 0; i < faces.length; ++i) {
    var face = faces[i];
    check(
      face.width === w && face.height === h,
      'inconsistent cube map face shape');

    if (info.genMipmaps) {
      check(!face.compressed,
        'can not generate mipmap for compressed textures');
      check(face.mipmask === 1,
        'can not specify mipmaps and generate mipmaps');
    } else {
      // TODO: check mip and filter mode
    }

    var mipmaps = face.images;
    for (var j = 0; j < 16; ++j) {
      var img = mipmaps[j];
      if (img) {
        var mw = w >> j;
        var mh = h >> j;
        check(face.mipmask & (1 << j), 'missing mipmap data');
        check(
          img.width === mw &&
          img.height === mh,
          'invalid shape for mip images');
        check(
          img.format === texture.format &&
          img.internalformat === texture.internalformat &&
          img.type === texture.type,
          'incompatible type for mip image');

        if (img.compressed) {
          // TODO: check size for compressed images
        } else if (img.data) {
          check(img.data.byteLength === mw * mh *
            Math.max(pixelSize(img.type, c), img.unpackAlignment),
            'invalid data for image, buffer size is inconsistent with image format');
        } else if (img.element) {
          // TODO: check element can be loaded
        } else if (img.copy) {
          // TODO: check compatible format and type
        }
      }
    }
  }
}

var check$1 = extend(check, {
  optional: checkOptional,
  raise: raise,
  commandRaise: commandRaise,
  command: checkCommand,
  parameter: checkParameter,
  commandParameter: checkParameterCommand,
  constructor: checkConstructor,
  type: checkTypeOf,
  commandType: checkCommandType,
  isTypedArray: checkIsTypedArray,
  nni: checkNonNegativeInt,
  oneOf: checkOneOf,
  shaderError: checkShaderError,
  linkError: checkLinkError,
  callSite: guessCallSite,
  saveCommandRef: saveCommandRef,
  saveDrawInfo: saveDrawCommandInfo,
  framebufferFormat: checkFramebufferFormat,
  guessCommand: guessCommand,
  texture2D: checkTexture2D,
  textureCube: checkTextureCube
});

var VARIABLE_COUNTER = 0;

var DYN_FUNC = 0;

function DynamicVariable (type, data) {
  this.id = (VARIABLE_COUNTER++);
  this.type = type;
  this.data = data;
}

function escapeStr (str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function splitParts (str) {
  if (str.length === 0) {
    return []
  }

  var firstChar = str.charAt(0);
  var lastChar = str.charAt(str.length - 1);

  if (str.length > 1 &&
      firstChar === lastChar &&
      (firstChar === '"' || firstChar === "'")) {
    return ['"' + escapeStr(str.substr(1, str.length - 2)) + '"']
  }

  var parts = /\[(false|true|null|\d+|'[^']*'|"[^"]*")\]/.exec(str);
  if (parts) {
    return (
      splitParts(str.substr(0, parts.index))
      .concat(splitParts(parts[1]))
      .concat(splitParts(str.substr(parts.index + parts[0].length)))
    )
  }

  var subparts = str.split('.');
  if (subparts.length === 1) {
    return ['"' + escapeStr(str) + '"']
  }

  var result = [];
  for (var i = 0; i < subparts.length; ++i) {
    result = result.concat(splitParts(subparts[i]));
  }
  return result
}

function toAccessorString (str) {
  return '[' + splitParts(str).join('][') + ']'
}

function defineDynamic (type, data) {
  return new DynamicVariable(type, toAccessorString(data + ''))
}

function isDynamic (x) {
  return (typeof x === 'function' && !x._reglType) ||
         x instanceof DynamicVariable
}

function unbox (x, path) {
  if (typeof x === 'function') {
    return new DynamicVariable(DYN_FUNC, x)
  }
  return x
}

var dynamic = {
  DynamicVariable: DynamicVariable,
  define: defineDynamic,
  isDynamic: isDynamic,
  unbox: unbox,
  accessor: toAccessorString
};

/* globals requestAnimationFrame, cancelAnimationFrame */
var raf = {
  next: typeof requestAnimationFrame === 'function'
    ? function (cb) { return requestAnimationFrame(cb) }
    : function (cb) { return setTimeout(cb, 16) },
  cancel: typeof cancelAnimationFrame === 'function'
    ? function (raf) { return cancelAnimationFrame(raf) }
    : clearTimeout
};

/* globals performance */
var clock = (typeof performance !== 'undefined' && performance.now)
  ? function () { return performance.now() }
  : function () { return +(new Date()) };

function createStringStore () {
  var stringIds = {'': 0};
  var stringValues = [''];
  return {
    id: function (str) {
      var result = stringIds[str];
      if (result) {
        return result
      }
      result = stringIds[str] = stringValues.length;
      stringValues.push(str);
      return result
    },

    str: function (id) {
      return stringValues[id]
    }
  }
}

// Context and canvas creation helper functions
function createCanvas (element, onDone, pixelRatio) {
  var canvas = document.createElement('canvas');
  extend(canvas.style, {
    border: 0,
    margin: 0,
    padding: 0,
    top: 0,
    left: 0
  });
  element.appendChild(canvas);

  if (element === document.body) {
    canvas.style.position = 'absolute';
    extend(element.style, {
      margin: 0,
      padding: 0
    });
  }

  function resize () {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (element !== document.body) {
      var bounds = element.getBoundingClientRect();
      w = bounds.right - bounds.left;
      h = bounds.bottom - bounds.top;
    }
    canvas.width = pixelRatio * w;
    canvas.height = pixelRatio * h;
    extend(canvas.style, {
      width: w + 'px',
      height: h + 'px'
    });
  }

  window.addEventListener('resize', resize, false);

  function onDestroy () {
    window.removeEventListener('resize', resize);
    element.removeChild(canvas);
  }

  resize();

  return {
    canvas: canvas,
    onDestroy: onDestroy
  }
}

function createContext (canvas, contexAttributes) {
  function get (name) {
    try {
      return canvas.getContext(name, contexAttributes)
    } catch (e) {
      return null
    }
  }
  return (
    get('webgl') ||
    get('experimental-webgl') ||
    get('webgl-experimental')
  )
}

function isHTMLElement (obj) {
  return (
    typeof obj.nodeName === 'string' &&
    typeof obj.appendChild === 'function' &&
    typeof obj.getBoundingClientRect === 'function'
  )
}

function isWebGLContext (obj) {
  return (
    typeof obj.drawArrays === 'function' ||
    typeof obj.drawElements === 'function'
  )
}

function parseExtensions (input) {
  if (typeof input === 'string') {
    return input.split()
  }
  check$1(Array.isArray(input), 'invalid extension array');
  return input
}

function getElement (desc) {
  if (typeof desc === 'string') {
    check$1(typeof document !== 'undefined', 'not supported outside of DOM');
    return document.querySelector(desc)
  }
  return desc
}

function parseArgs (args_) {
  var args = args_ || {};
  var element, container, canvas, gl;
  var contextAttributes = {};
  var extensions = [];
  var optionalExtensions = [];
  var pixelRatio = (typeof window === 'undefined' ? 1 : window.devicePixelRatio);
  var profile = false;
  var onDone = function (err) {
    if (err) {
      check$1.raise(err);
    }
  };
  var onDestroy = function () {};
  if (typeof args === 'string') {
    check$1(
      typeof document !== 'undefined',
      'selector queries only supported in DOM enviroments');
    element = document.querySelector(args);
    check$1(element, 'invalid query string for element');
  } else if (typeof args === 'object') {
    if (isHTMLElement(args)) {
      element = args;
    } else if (isWebGLContext(args)) {
      gl = args;
      canvas = gl.canvas;
    } else {
      check$1.constructor(args);
      if ('gl' in args) {
        gl = args.gl;
      } else if ('canvas' in args) {
        canvas = getElement(args.canvas);
      } else if ('container' in args) {
        container = getElement(args.container);
      }
      if ('attributes' in args) {
        contextAttributes = args.attributes;
        check$1.type(contextAttributes, 'object', 'invalid context attributes');
      }
      if ('extensions' in args) {
        extensions = parseExtensions(args.extensions);
      }
      if ('optionalExtensions' in args) {
        optionalExtensions = parseExtensions(args.optionalExtensions);
      }
      if ('onDone' in args) {
        check$1.type(
          args.onDone, 'function',
          'invalid or missing onDone callback');
        onDone = args.onDone;
      }
      if ('profile' in args) {
        profile = !!args.profile;
      }
      if ('pixelRatio' in args) {
        pixelRatio = +args.pixelRatio;
        check$1(pixelRatio > 0, 'invalid pixel ratio');
      }
    }
  } else {
    check$1.raise('invalid arguments to regl');
  }

  if (element) {
    if (element.nodeName.toLowerCase() === 'canvas') {
      canvas = element;
    } else {
      container = element;
    }
  }

  if (!gl) {
    if (!canvas) {
      check$1(
        typeof document !== 'undefined',
        'must manually specify webgl context outside of DOM environments');
      var result = createCanvas(container || document.body, onDone, pixelRatio);
      if (!result) {
        return null
      }
      canvas = result.canvas;
      onDestroy = result.onDestroy;
    }
    gl = createContext(canvas, contextAttributes);
  }

  if (!gl) {
    onDestroy();
    onDone('webgl not supported, try upgrading your browser or graphics drivers http://get.webgl.org');
    return null
  }

  return {
    gl: gl,
    canvas: canvas,
    container: container,
    extensions: extensions,
    optionalExtensions: optionalExtensions,
    pixelRatio: pixelRatio,
    profile: profile,
    onDone: onDone,
    onDestroy: onDestroy
  }
}

function createExtensionCache (gl, config) {
  var extensions = {};

  function tryLoadExtension (name_) {
    check$1.type(name_, 'string', 'extension name must be string');
    var name = name_.toLowerCase();
    var ext;
    try {
      ext = extensions[name] = gl.getExtension(name);
    } catch (e) {}
    return !!ext
  }

  for (var i = 0; i < config.extensions.length; ++i) {
    var name = config.extensions[i];
    if (!tryLoadExtension(name)) {
      config.onDestroy();
      config.onDone('"' + name + '" extension is not supported by the current WebGL context, try upgrading your system or a different browser');
      return null
    }
  }

  config.optionalExtensions.forEach(tryLoadExtension);

  return {
    extensions: extensions,
    restore: function () {
      Object.keys(extensions).forEach(function (name) {
        if (!tryLoadExtension(name)) {
          throw new Error('(regl): error restoring extension ' + name)
        }
      });
    }
  }
}

var GL_SUBPIXEL_BITS = 0x0D50;
var GL_RED_BITS = 0x0D52;
var GL_GREEN_BITS = 0x0D53;
var GL_BLUE_BITS = 0x0D54;
var GL_ALPHA_BITS = 0x0D55;
var GL_DEPTH_BITS = 0x0D56;
var GL_STENCIL_BITS = 0x0D57;

var GL_ALIASED_POINT_SIZE_RANGE = 0x846D;
var GL_ALIASED_LINE_WIDTH_RANGE = 0x846E;

var GL_MAX_TEXTURE_SIZE = 0x0D33;
var GL_MAX_VIEWPORT_DIMS = 0x0D3A;
var GL_MAX_VERTEX_ATTRIBS = 0x8869;
var GL_MAX_VERTEX_UNIFORM_VECTORS = 0x8DFB;
var GL_MAX_VARYING_VECTORS = 0x8DFC;
var GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8B4D;
var GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0x8B4C;
var GL_MAX_TEXTURE_IMAGE_UNITS = 0x8872;
var GL_MAX_FRAGMENT_UNIFORM_VECTORS = 0x8DFD;
var GL_MAX_CUBE_MAP_TEXTURE_SIZE = 0x851C;
var GL_MAX_RENDERBUFFER_SIZE = 0x84E8;

var GL_VENDOR = 0x1F00;
var GL_RENDERER = 0x1F01;
var GL_VERSION = 0x1F02;
var GL_SHADING_LANGUAGE_VERSION = 0x8B8C;

var GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FF;

var GL_MAX_COLOR_ATTACHMENTS_WEBGL = 0x8CDF;
var GL_MAX_DRAW_BUFFERS_WEBGL = 0x8824;

var wrapLimits = function (gl, extensions) {
  var maxAnisotropic = 1;
  if (extensions.ext_texture_filter_anisotropic) {
    maxAnisotropic = gl.getParameter(GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT);
  }

  var maxDrawbuffers = 1;
  var maxColorAttachments = 1;
  if (extensions.webgl_draw_buffers) {
    maxDrawbuffers = gl.getParameter(GL_MAX_DRAW_BUFFERS_WEBGL);
    maxColorAttachments = gl.getParameter(GL_MAX_COLOR_ATTACHMENTS_WEBGL);
  }

  return {
    // drawing buffer bit depth
    colorBits: [
      gl.getParameter(GL_RED_BITS),
      gl.getParameter(GL_GREEN_BITS),
      gl.getParameter(GL_BLUE_BITS),
      gl.getParameter(GL_ALPHA_BITS)
    ],
    depthBits: gl.getParameter(GL_DEPTH_BITS),
    stencilBits: gl.getParameter(GL_STENCIL_BITS),
    subpixelBits: gl.getParameter(GL_SUBPIXEL_BITS),

    // supported extensions
    extensions: Object.keys(extensions).filter(function (ext) {
      return !!extensions[ext]
    }),

    // max aniso samples
    maxAnisotropic: maxAnisotropic,

    // max draw buffers
    maxDrawbuffers: maxDrawbuffers,
    maxColorAttachments: maxColorAttachments,

    // point and line size ranges
    pointSizeDims: gl.getParameter(GL_ALIASED_POINT_SIZE_RANGE),
    lineWidthDims: gl.getParameter(GL_ALIASED_LINE_WIDTH_RANGE),
    maxViewportDims: gl.getParameter(GL_MAX_VIEWPORT_DIMS),
    maxCombinedTextureUnits: gl.getParameter(GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS),
    maxCubeMapSize: gl.getParameter(GL_MAX_CUBE_MAP_TEXTURE_SIZE),
    maxRenderbufferSize: gl.getParameter(GL_MAX_RENDERBUFFER_SIZE),
    maxTextureUnits: gl.getParameter(GL_MAX_TEXTURE_IMAGE_UNITS),
    maxTextureSize: gl.getParameter(GL_MAX_TEXTURE_SIZE),
    maxAttributes: gl.getParameter(GL_MAX_VERTEX_ATTRIBS),
    maxVertexUniforms: gl.getParameter(GL_MAX_VERTEX_UNIFORM_VECTORS),
    maxVertexTextureUnits: gl.getParameter(GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS),
    maxVaryingVectors: gl.getParameter(GL_MAX_VARYING_VECTORS),
    maxFragmentUniforms: gl.getParameter(GL_MAX_FRAGMENT_UNIFORM_VECTORS),

    // vendor info
    glsl: gl.getParameter(GL_SHADING_LANGUAGE_VERSION),
    renderer: gl.getParameter(GL_RENDERER),
    vendor: gl.getParameter(GL_VENDOR),
    version: gl.getParameter(GL_VERSION)
  }
};

function isNDArrayLike (obj) {
  return (
    !!obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.shape) &&
    Array.isArray(obj.stride) &&
    typeof obj.offset === 'number' &&
    obj.shape.length === obj.stride.length &&
    (Array.isArray(obj.data) ||
      isTypedArray(obj.data)))
}

var values = function (obj) {
  return Object.keys(obj).map(function (key) { return obj[key] })
};

function loop (n, f) {
  var result = Array(n);
  for (var i = 0; i < n; ++i) {
    result[i] = f(i);
  }
  return result
}

var GL_BYTE$1 = 5120;
var GL_UNSIGNED_BYTE$2 = 5121;
var GL_SHORT$1 = 5122;
var GL_UNSIGNED_SHORT$1 = 5123;
var GL_INT$1 = 5124;
var GL_UNSIGNED_INT$1 = 5125;
var GL_FLOAT$2 = 5126;

var bufferPool = loop(8, function () {
  return []
});

function nextPow16 (v) {
  for (var i = 16; i <= (1 << 28); i *= 16) {
    if (v <= i) {
      return i
    }
  }
  return 0
}

function log2 (v) {
  var r, shift;
  r = (v > 0xFFFF) << 4;
  v >>>= r;
  shift = (v > 0xFF) << 3;
  v >>>= shift; r |= shift;
  shift = (v > 0xF) << 2;
  v >>>= shift; r |= shift;
  shift = (v > 0x3) << 1;
  v >>>= shift; r |= shift;
  return r | (v >> 1)
}

function alloc (n) {
  var sz = nextPow16(n);
  var bin = bufferPool[log2(sz) >> 2];
  if (bin.length > 0) {
    return bin.pop()
  }
  return new ArrayBuffer(sz)
}

function free (buf) {
  bufferPool[log2(buf.byteLength) >> 2].push(buf);
}

function allocType (type, n) {
  var result = null;
  switch (type) {
    case GL_BYTE$1:
      result = new Int8Array(alloc(n), 0, n);
      break
    case GL_UNSIGNED_BYTE$2:
      result = new Uint8Array(alloc(n), 0, n);
      break
    case GL_SHORT$1:
      result = new Int16Array(alloc(2 * n), 0, n);
      break
    case GL_UNSIGNED_SHORT$1:
      result = new Uint16Array(alloc(2 * n), 0, n);
      break
    case GL_INT$1:
      result = new Int32Array(alloc(4 * n), 0, n);
      break
    case GL_UNSIGNED_INT$1:
      result = new Uint32Array(alloc(4 * n), 0, n);
      break
    case GL_FLOAT$2:
      result = new Float32Array(alloc(4 * n), 0, n);
      break
    default:
      return null
  }
  if (result.length !== n) {
    return result.subarray(0, n)
  }
  return result
}

function freeType (array) {
  free(array.buffer);
}

var pool = {
  alloc: alloc,
  free: free,
  allocType: allocType,
  freeType: freeType
};

var flattenUtils = {
  shape: arrayShape$1,
  flatten: flattenArray
};

function flatten1D (array, nx, out) {
  for (var i = 0; i < nx; ++i) {
    out[i] = array[i];
  }
}

function flatten2D (array, nx, ny, out) {
  var ptr = 0;
  for (var i = 0; i < nx; ++i) {
    var row = array[i];
    for (var j = 0; j < ny; ++j) {
      out[ptr++] = row[j];
    }
  }
}

function flatten3D (array, nx, ny, nz, out, ptr_) {
  var ptr = ptr_;
  for (var i = 0; i < nx; ++i) {
    var row = array[i];
    for (var j = 0; j < ny; ++j) {
      var col = row[j];
      for (var k = 0; k < nz; ++k) {
        out[ptr++] = col[k];
      }
    }
  }
}

function flattenRec (array, shape, level, out, ptr) {
  var stride = 1;
  for (var i = level + 1; i < shape.length; ++i) {
    stride *= shape[i];
  }
  var n = shape[level];
  if (shape.length - level === 4) {
    var nx = shape[level + 1];
    var ny = shape[level + 2];
    var nz = shape[level + 3];
    for (i = 0; i < n; ++i) {
      flatten3D(array[i], nx, ny, nz, out, ptr);
      ptr += stride;
    }
  } else {
    for (i = 0; i < n; ++i) {
      flattenRec(array[i], shape, level + 1, out, ptr);
      ptr += stride;
    }
  }
}

function flattenArray (array, shape, type, out_) {
  var sz = 1;
  if (shape.length) {
    for (var i = 0; i < shape.length; ++i) {
      sz *= shape[i];
    }
  } else {
    sz = 0;
  }
  var out = out_ || pool.allocType(type, sz);
  switch (shape.length) {
    case 0:
      break
    case 1:
      flatten1D(array, shape[0], out);
      break
    case 2:
      flatten2D(array, shape[0], shape[1], out);
      break
    case 3:
      flatten3D(array, shape[0], shape[1], shape[2], out, 0);
      break
    default:
      flattenRec(array, shape, 0, out, 0);
  }
  return out
}

function arrayShape$1 (array_) {
  var shape = [];
  for (var array = array_; array.length; array = array[0]) {
    shape.push(array.length);
  }
  return shape
}

var int8 = 5120;
var int16 = 5122;
var int32 = 5124;
var uint8 = 5121;
var uint16 = 5123;
var uint32 = 5125;
var float = 5126;
var float32 = 5126;
var glTypes = {
	int8: int8,
	int16: int16,
	int32: int32,
	uint8: uint8,
	uint16: uint16,
	uint32: uint32,
	float: float,
	float32: float32
};

var dynamic$1 = 35048;
var stream = 35040;
var usageTypes = {
	dynamic: dynamic$1,
	stream: stream,
	"static": 35044
};

var arrayFlatten = flattenUtils.flatten;
var arrayShape = flattenUtils.shape;

var GL_STATIC_DRAW = 0x88E4;
var GL_STREAM_DRAW = 0x88E0;

var GL_UNSIGNED_BYTE$1 = 5121;
var GL_FLOAT$1 = 5126;

var DTYPES_SIZES = [];
DTYPES_SIZES[5120] = 1; // int8
DTYPES_SIZES[5122] = 2; // int16
DTYPES_SIZES[5124] = 4; // int32
DTYPES_SIZES[5121] = 1; // uint8
DTYPES_SIZES[5123] = 2; // uint16
DTYPES_SIZES[5125] = 4; // uint32
DTYPES_SIZES[5126] = 4; // float32

function typedArrayCode (data) {
  return arrayTypes[Object.prototype.toString.call(data)] | 0
}

function copyArray (out, inp) {
  for (var i = 0; i < inp.length; ++i) {
    out[i] = inp[i];
  }
}

function transpose (
  result, data, shapeX, shapeY, strideX, strideY, offset) {
  var ptr = 0;
  for (var i = 0; i < shapeX; ++i) {
    for (var j = 0; j < shapeY; ++j) {
      result[ptr++] = data[strideX * i + strideY * j + offset];
    }
  }
}

function wrapBufferState (gl, stats, config) {
  var bufferCount = 0;
  var bufferSet = {};

  function REGLBuffer (type) {
    this.id = bufferCount++;
    this.buffer = gl.createBuffer();
    this.type = type;
    this.usage = GL_STATIC_DRAW;
    this.byteLength = 0;
    this.dimension = 1;
    this.dtype = GL_UNSIGNED_BYTE$1;

    this.persistentData = null;

    if (config.profile) {
      this.stats = {size: 0};
    }
  }

  REGLBuffer.prototype.bind = function () {
    gl.bindBuffer(this.type, this.buffer);
  };

  REGLBuffer.prototype.destroy = function () {
    destroy(this);
  };

  var streamPool = [];

  function createStream (type, data) {
    var buffer = streamPool.pop();
    if (!buffer) {
      buffer = new REGLBuffer(type);
    }
    buffer.bind();
    initBufferFromData(buffer, data, GL_STREAM_DRAW, 0, 1, false);
    return buffer
  }

  function destroyStream (stream$$1) {
    streamPool.push(stream$$1);
  }

  function initBufferFromTypedArray (buffer, data, usage) {
    buffer.byteLength = data.byteLength;
    gl.bufferData(buffer.type, data, usage);
  }

  function initBufferFromData (buffer, data, usage, dtype, dimension, persist) {
    var shape;
    buffer.usage = usage;
    if (Array.isArray(data)) {
      buffer.dtype = dtype || GL_FLOAT$1;
      if (data.length > 0) {
        var flatData;
        if (Array.isArray(data[0])) {
          shape = arrayShape(data);
          var dim = 1;
          for (var i = 1; i < shape.length; ++i) {
            dim *= shape[i];
          }
          buffer.dimension = dim;
          flatData = arrayFlatten(data, shape, buffer.dtype);
          initBufferFromTypedArray(buffer, flatData, usage);
          if (persist) {
            buffer.persistentData = flatData;
          } else {
            pool.freeType(flatData);
          }
        } else if (typeof data[0] === 'number') {
          buffer.dimension = dimension;
          var typedData = pool.allocType(buffer.dtype, data.length);
          copyArray(typedData, data);
          initBufferFromTypedArray(buffer, typedData, usage);
          if (persist) {
            buffer.persistentData = typedData;
          } else {
            pool.freeType(typedData);
          }
        } else if (isTypedArray(data[0])) {
          buffer.dimension = data[0].length;
          buffer.dtype = dtype || typedArrayCode(data[0]) || GL_FLOAT$1;
          flatData = arrayFlatten(
            data,
            [data.length, data[0].length],
            buffer.dtype);
          initBufferFromTypedArray(buffer, flatData, usage);
          if (persist) {
            buffer.persistentData = flatData;
          } else {
            pool.freeType(flatData);
          }
        } else {
          check$1.raise('invalid buffer data');
        }
      }
    } else if (isTypedArray(data)) {
      buffer.dtype = dtype || typedArrayCode(data);
      buffer.dimension = dimension;
      initBufferFromTypedArray(buffer, data, usage);
      if (persist) {
        buffer.persistentData = new Uint8Array(new Uint8Array(data.buffer));
      }
    } else if (isNDArrayLike(data)) {
      shape = data.shape;
      var stride = data.stride;
      var offset = data.offset;

      var shapeX = 0;
      var shapeY = 0;
      var strideX = 0;
      var strideY = 0;
      if (shape.length === 1) {
        shapeX = shape[0];
        shapeY = 1;
        strideX = stride[0];
        strideY = 0;
      } else if (shape.length === 2) {
        shapeX = shape[0];
        shapeY = shape[1];
        strideX = stride[0];
        strideY = stride[1];
      } else {
        check$1.raise('invalid shape');
      }

      buffer.dtype = dtype || typedArrayCode(data.data) || GL_FLOAT$1;
      buffer.dimension = shapeY;

      var transposeData = pool.allocType(buffer.dtype, shapeX * shapeY);
      transpose(transposeData,
        data.data,
        shapeX, shapeY,
        strideX, strideY,
        offset);
      initBufferFromTypedArray(buffer, transposeData, usage);
      if (persist) {
        buffer.persistentData = transposeData;
      } else {
        pool.freeType(transposeData);
      }
    } else {
      check$1.raise('invalid buffer data');
    }
  }

  function destroy (buffer) {
    stats.bufferCount--;

    var handle = buffer.buffer;
    check$1(handle, 'buffer must not be deleted already');
    gl.deleteBuffer(handle);
    buffer.buffer = null;
    delete bufferSet[buffer.id];
  }

  function createBuffer (options, type, deferInit, persistent) {
    stats.bufferCount++;

    var buffer = new REGLBuffer(type);
    bufferSet[buffer.id] = buffer;

    function reglBuffer (options) {
      var usage = GL_STATIC_DRAW;
      var data = null;
      var byteLength = 0;
      var dtype = 0;
      var dimension = 1;
      if (Array.isArray(options) ||
          isTypedArray(options) ||
          isNDArrayLike(options)) {
        data = options;
      } else if (typeof options === 'number') {
        byteLength = options | 0;
      } else if (options) {
        check$1.type(
          options, 'object',
          'buffer arguments must be an object, a number or an array');

        if ('data' in options) {
          check$1(
            data === null ||
            Array.isArray(data) ||
            isTypedArray(data) ||
            isNDArrayLike(data),
            'invalid data for buffer');
          data = options.data;
        }

        if ('usage' in options) {
          check$1.parameter(options.usage, usageTypes, 'invalid buffer usage');
          usage = usageTypes[options.usage];
        }

        if ('type' in options) {
          check$1.parameter(options.type, glTypes, 'invalid buffer type');
          dtype = glTypes[options.type];
        }

        if ('dimension' in options) {
          check$1.type(options.dimension, 'number', 'invalid dimension');
          dimension = options.dimension | 0;
        }

        if ('length' in options) {
          check$1.nni(byteLength, 'buffer length must be a nonnegative integer');
          byteLength = options.length | 0;
        }
      }

      buffer.bind();
      if (!data) {
        gl.bufferData(buffer.type, byteLength, usage);
        buffer.dtype = dtype || GL_UNSIGNED_BYTE$1;
        buffer.usage = usage;
        buffer.dimension = dimension;
        buffer.byteLength = byteLength;
      } else {
        initBufferFromData(buffer, data, usage, dtype, dimension, persistent);
      }

      if (config.profile) {
        buffer.stats.size = buffer.byteLength * DTYPES_SIZES[buffer.dtype];
      }

      return reglBuffer
    }

    function setSubData (data, offset) {
      check$1(offset + data.byteLength <= buffer.byteLength,
        'invalid buffer subdata call, buffer is too small. ' + ' Can\'t write data of size ' + data.byteLength + ' starting from offset ' + offset + ' to a buffer of size ' + buffer.byteLength);

      gl.bufferSubData(buffer.type, offset, data);
    }

    function subdata (data, offset_) {
      var offset = (offset_ || 0) | 0;
      var shape;
      buffer.bind();
      if (Array.isArray(data)) {
        if (data.length > 0) {
          if (typeof data[0] === 'number') {
            var converted = pool.allocType(buffer.dtype, data.length);
            copyArray(converted, data);
            setSubData(converted, offset);
            pool.freeType(converted);
          } else if (Array.isArray(data[0]) || isTypedArray(data[0])) {
            shape = arrayShape(data);
            var flatData = arrayFlatten(data, shape, buffer.dtype);
            setSubData(flatData, offset);
            pool.freeType(flatData);
          } else {
            check$1.raise('invalid buffer data');
          }
        }
      } else if (isTypedArray(data)) {
        setSubData(data, offset);
      } else if (isNDArrayLike(data)) {
        shape = data.shape;
        var stride = data.stride;

        var shapeX = 0;
        var shapeY = 0;
        var strideX = 0;
        var strideY = 0;
        if (shape.length === 1) {
          shapeX = shape[0];
          shapeY = 1;
          strideX = stride[0];
          strideY = 0;
        } else if (shape.length === 2) {
          shapeX = shape[0];
          shapeY = shape[1];
          strideX = stride[0];
          strideY = stride[1];
        } else {
          check$1.raise('invalid shape');
        }
        var dtype = Array.isArray(data.data)
          ? buffer.dtype
          : typedArrayCode(data.data);

        var transposeData = pool.allocType(dtype, shapeX * shapeY);
        transpose(transposeData,
          data.data,
          shapeX, shapeY,
          strideX, strideY,
          data.offset);
        setSubData(transposeData, offset);
        pool.freeType(transposeData);
      } else {
        check$1.raise('invalid data for buffer subdata');
      }
      return reglBuffer
    }

    if (!deferInit) {
      reglBuffer(options);
    }

    reglBuffer._reglType = 'buffer';
    reglBuffer._buffer = buffer;
    reglBuffer.subdata = subdata;
    if (config.profile) {
      reglBuffer.stats = buffer.stats;
    }
    reglBuffer.destroy = function () { destroy(buffer); };

    return reglBuffer
  }

  function restoreBuffers () {
    values(bufferSet).forEach(function (buffer) {
      buffer.buffer = gl.createBuffer();
      gl.bindBuffer(buffer.type, buffer.buffer);
      gl.bufferData(
        buffer.type, buffer.persistentData || buffer.byteLength, buffer.usage);
    });
  }

  if (config.profile) {
    stats.getTotalBufferSize = function () {
      var total = 0;
      // TODO: Right now, the streams are not part of the total count.
      Object.keys(bufferSet).forEach(function (key) {
        total += bufferSet[key].stats.size;
      });
      return total
    };
  }

  return {
    create: createBuffer,

    createStream: createStream,
    destroyStream: destroyStream,

    clear: function () {
      values(bufferSet).forEach(destroy);
      streamPool.forEach(destroy);
    },

    getBuffer: function (wrapper) {
      if (wrapper && wrapper._buffer instanceof REGLBuffer) {
        return wrapper._buffer
      }
      return null
    },

    restore: restoreBuffers,

    _initBuffer: initBufferFromData
  }
}

var points = 0;
var point = 0;
var lines = 1;
var line = 1;
var triangles = 4;
var triangle = 4;
var primTypes = {
	points: points,
	point: point,
	lines: lines,
	line: line,
	triangles: triangles,
	triangle: triangle,
	"line loop": 2,
	"line strip": 3,
	"triangle strip": 5,
	"triangle fan": 6
};

var GL_POINTS = 0;
var GL_LINES = 1;
var GL_TRIANGLES = 4;

var GL_BYTE$2 = 5120;
var GL_UNSIGNED_BYTE$3 = 5121;
var GL_SHORT$2 = 5122;
var GL_UNSIGNED_SHORT$2 = 5123;
var GL_INT$2 = 5124;
var GL_UNSIGNED_INT$2 = 5125;

var GL_ELEMENT_ARRAY_BUFFER = 34963;

var GL_STREAM_DRAW$1 = 0x88E0;
var GL_STATIC_DRAW$1 = 0x88E4;

function wrapElementsState (gl, extensions, bufferState, stats) {
  var elementSet = {};
  var elementCount = 0;

  var elementTypes = {
    'uint8': GL_UNSIGNED_BYTE$3,
    'uint16': GL_UNSIGNED_SHORT$2
  };

  if (extensions.oes_element_index_uint) {
    elementTypes.uint32 = GL_UNSIGNED_INT$2;
  }

  function REGLElementBuffer (buffer) {
    this.id = elementCount++;
    elementSet[this.id] = this;
    this.buffer = buffer;
    this.primType = GL_TRIANGLES;
    this.vertCount = 0;
    this.type = 0;
  }

  REGLElementBuffer.prototype.bind = function () {
    this.buffer.bind();
  };

  var bufferPool = [];

  function createElementStream (data) {
    var result = bufferPool.pop();
    if (!result) {
      result = new REGLElementBuffer(bufferState.create(
        null,
        GL_ELEMENT_ARRAY_BUFFER,
        true,
        false)._buffer);
    }
    initElements(result, data, GL_STREAM_DRAW$1, -1, -1, 0, 0);
    return result
  }

  function destroyElementStream (elements) {
    bufferPool.push(elements);
  }

  function initElements (
    elements,
    data,
    usage,
    prim,
    count,
    byteLength,
    type) {
    elements.buffer.bind();
    if (data) {
      var predictedType = type;
      if (!type && (
          !isTypedArray(data) ||
         (isNDArrayLike(data) && !isTypedArray(data.data)))) {
        predictedType = extensions.oes_element_index_uint
          ? GL_UNSIGNED_INT$2
          : GL_UNSIGNED_SHORT$2;
      }
      bufferState._initBuffer(
        elements.buffer,
        data,
        usage,
        predictedType,
        3);
    } else {
      gl.bufferData(GL_ELEMENT_ARRAY_BUFFER, byteLength, usage);
      elements.buffer.dtype = dtype || GL_UNSIGNED_BYTE$3;
      elements.buffer.usage = usage;
      elements.buffer.dimension = 3;
      elements.buffer.byteLength = byteLength;
    }

    var dtype = type;
    if (!type) {
      switch (elements.buffer.dtype) {
        case GL_UNSIGNED_BYTE$3:
        case GL_BYTE$2:
          dtype = GL_UNSIGNED_BYTE$3;
          break

        case GL_UNSIGNED_SHORT$2:
        case GL_SHORT$2:
          dtype = GL_UNSIGNED_SHORT$2;
          break

        case GL_UNSIGNED_INT$2:
        case GL_INT$2:
          dtype = GL_UNSIGNED_INT$2;
          break

        default:
          check$1.raise('unsupported type for element array');
      }
      elements.buffer.dtype = dtype;
    }
    elements.type = dtype;

    // Check oes_element_index_uint extension
    check$1(
      dtype !== GL_UNSIGNED_INT$2 ||
      !!extensions.oes_element_index_uint,
      '32 bit element buffers not supported, enable oes_element_index_uint first');

    // try to guess default primitive type and arguments
    var vertCount = count;
    if (vertCount < 0) {
      vertCount = elements.buffer.byteLength;
      if (dtype === GL_UNSIGNED_SHORT$2) {
        vertCount >>= 1;
      } else if (dtype === GL_UNSIGNED_INT$2) {
        vertCount >>= 2;
      }
    }
    elements.vertCount = vertCount;

    // try to guess primitive type from cell dimension
    var primType = prim;
    if (prim < 0) {
      primType = GL_TRIANGLES;
      var dimension = elements.buffer.dimension;
      if (dimension === 1) primType = GL_POINTS;
      if (dimension === 2) primType = GL_LINES;
      if (dimension === 3) primType = GL_TRIANGLES;
    }
    elements.primType = primType;
  }

  function destroyElements (elements) {
    stats.elementsCount--;

    check$1(elements.buffer !== null, 'must not double destroy elements');
    delete elementSet[elements.id];
    elements.buffer.destroy();
    elements.buffer = null;
  }

  function createElements (options, persistent) {
    var buffer = bufferState.create(null, GL_ELEMENT_ARRAY_BUFFER, true);
    var elements = new REGLElementBuffer(buffer._buffer);
    stats.elementsCount++;

    function reglElements (options) {
      if (!options) {
        buffer();
        elements.primType = GL_TRIANGLES;
        elements.vertCount = 0;
        elements.type = GL_UNSIGNED_BYTE$3;
      } else if (typeof options === 'number') {
        buffer(options);
        elements.primType = GL_TRIANGLES;
        elements.vertCount = options | 0;
        elements.type = GL_UNSIGNED_BYTE$3;
      } else {
        var data = null;
        var usage = GL_STATIC_DRAW$1;
        var primType = -1;
        var vertCount = -1;
        var byteLength = 0;
        var dtype = 0;
        if (Array.isArray(options) ||
            isTypedArray(options) ||
            isNDArrayLike(options)) {
          data = options;
        } else {
          check$1.type(options, 'object', 'invalid arguments for elements');
          if ('data' in options) {
            data = options.data;
            check$1(
                Array.isArray(data) ||
                isTypedArray(data) ||
                isNDArrayLike(data),
                'invalid data for element buffer');
          }
          if ('usage' in options) {
            check$1.parameter(
              options.usage,
              usageTypes,
              'invalid element buffer usage');
            usage = usageTypes[options.usage];
          }
          if ('primitive' in options) {
            check$1.parameter(
              options.primitive,
              primTypes,
              'invalid element buffer primitive');
            primType = primTypes[options.primitive];
          }
          if ('count' in options) {
            check$1(
              typeof options.count === 'number' && options.count >= 0,
              'invalid vertex count for elements');
            vertCount = options.count | 0;
          }
          if ('type' in options) {
            check$1.parameter(
              options.type,
              elementTypes,
              'invalid buffer type');
            dtype = elementTypes[options.type];
          }
          if ('length' in options) {
            byteLength = options.length | 0;
          } else {
            byteLength = vertCount;
            if (dtype === GL_UNSIGNED_SHORT$2 || dtype === GL_SHORT$2) {
              byteLength *= 2;
            } else if (dtype === GL_UNSIGNED_INT$2 || dtype === GL_INT$2) {
              byteLength *= 4;
            }
          }
        }
        initElements(
          elements,
          data,
          usage,
          primType,
          vertCount,
          byteLength,
          dtype);
      }

      return reglElements
    }

    reglElements(options);

    reglElements._reglType = 'elements';
    reglElements._elements = elements;
    reglElements.subdata = function (data, offset) {
      buffer.subdata(data, offset);
      return reglElements
    };
    reglElements.destroy = function () {
      destroyElements(elements);
    };

    return reglElements
  }

  return {
    create: createElements,
    createStream: createElementStream,
    destroyStream: destroyElementStream,
    getElements: function (elements) {
      if (typeof elements === 'function' &&
          elements._elements instanceof REGLElementBuffer) {
        return elements._elements
      }
      return null
    },
    clear: function () {
      values(elementSet).forEach(destroyElements);
    }
  }
}

var FLOAT = new Float32Array(1);
var INT = new Uint32Array(FLOAT.buffer);

var GL_UNSIGNED_SHORT$4 = 5123;

function convertToHalfFloat (array) {
  var ushorts = pool.allocType(GL_UNSIGNED_SHORT$4, array.length);

  for (var i = 0; i < array.length; ++i) {
    if (isNaN(array[i])) {
      ushorts[i] = 0xffff;
    } else if (array[i] === Infinity) {
      ushorts[i] = 0x7c00;
    } else if (array[i] === -Infinity) {
      ushorts[i] = 0xfc00;
    } else {
      FLOAT[0] = array[i];
      var x = INT[0];

      var sgn = (x >>> 31) << 15;
      var exp = ((x << 1) >>> 24) - 127;
      var frac = (x >> 13) & ((1 << 10) - 1);

      if (exp < -24) {
        // round non-representable denormals to 0
        ushorts[i] = sgn;
      } else if (exp < -14) {
        // handle denormals
        var s = -14 - exp;
        ushorts[i] = sgn + ((frac + (1 << 10)) >> s);
      } else if (exp > 15) {
        // round overflow to +/- Infinity
        ushorts[i] = sgn + 0x7c00;
      } else {
        // otherwise convert directly
        ushorts[i] = sgn + ((exp + 15) << 10) + frac;
      }
    }
  }

  return ushorts
}

function isArrayLike (s) {
  return Array.isArray(s) || isTypedArray(s)
}

var GL_COMPRESSED_TEXTURE_FORMATS = 0x86A3;

var GL_TEXTURE_2D = 0x0DE1;
var GL_TEXTURE_CUBE_MAP = 0x8513;
var GL_TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;

var GL_RGBA = 0x1908;
var GL_ALPHA = 0x1906;
var GL_RGB = 0x1907;
var GL_LUMINANCE = 0x1909;
var GL_LUMINANCE_ALPHA = 0x190A;

var GL_RGBA4 = 0x8056;
var GL_RGB5_A1 = 0x8057;
var GL_RGB565 = 0x8D62;

var GL_UNSIGNED_SHORT_4_4_4_4$1 = 0x8033;
var GL_UNSIGNED_SHORT_5_5_5_1$1 = 0x8034;
var GL_UNSIGNED_SHORT_5_6_5$1 = 0x8363;
var GL_UNSIGNED_INT_24_8_WEBGL$1 = 0x84FA;

var GL_DEPTH_COMPONENT = 0x1902;
var GL_DEPTH_STENCIL = 0x84F9;

var GL_SRGB_EXT = 0x8C40;
var GL_SRGB_ALPHA_EXT = 0x8C42;

var GL_HALF_FLOAT_OES$1 = 0x8D61;

var GL_COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0;
var GL_COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1;
var GL_COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2;
var GL_COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3;

var GL_COMPRESSED_RGB_ATC_WEBGL = 0x8C92;
var GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL = 0x8C93;
var GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL = 0x87EE;

var GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG = 0x8C00;
var GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG = 0x8C01;
var GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG = 0x8C02;
var GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG = 0x8C03;

var GL_COMPRESSED_RGB_ETC1_WEBGL = 0x8D64;

var GL_UNSIGNED_BYTE$4 = 0x1401;
var GL_UNSIGNED_SHORT$3 = 0x1403;
var GL_UNSIGNED_INT$3 = 0x1405;
var GL_FLOAT$3 = 0x1406;

var GL_TEXTURE_WRAP_S = 0x2802;
var GL_TEXTURE_WRAP_T = 0x2803;

var GL_REPEAT = 0x2901;
var GL_CLAMP_TO_EDGE$1 = 0x812F;
var GL_MIRRORED_REPEAT = 0x8370;

var GL_TEXTURE_MAG_FILTER = 0x2800;
var GL_TEXTURE_MIN_FILTER = 0x2801;

var GL_NEAREST$1 = 0x2600;
var GL_LINEAR = 0x2601;
var GL_NEAREST_MIPMAP_NEAREST$1 = 0x2700;
var GL_LINEAR_MIPMAP_NEAREST$1 = 0x2701;
var GL_NEAREST_MIPMAP_LINEAR$1 = 0x2702;
var GL_LINEAR_MIPMAP_LINEAR$1 = 0x2703;

var GL_GENERATE_MIPMAP_HINT = 0x8192;
var GL_DONT_CARE = 0x1100;
var GL_FASTEST = 0x1101;
var GL_NICEST = 0x1102;

var GL_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FE;

var GL_UNPACK_ALIGNMENT = 0x0CF5;
var GL_UNPACK_FLIP_Y_WEBGL = 0x9240;
var GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241;
var GL_UNPACK_COLORSPACE_CONVERSION_WEBGL = 0x9243;

var GL_BROWSER_DEFAULT_WEBGL = 0x9244;

var GL_TEXTURE0 = 0x84C0;

var MIPMAP_FILTERS = [
  GL_NEAREST_MIPMAP_NEAREST$1,
  GL_NEAREST_MIPMAP_LINEAR$1,
  GL_LINEAR_MIPMAP_NEAREST$1,
  GL_LINEAR_MIPMAP_LINEAR$1
];

var CHANNELS_FORMAT = [
  0,
  GL_LUMINANCE,
  GL_LUMINANCE_ALPHA,
  GL_RGB,
  GL_RGBA
];

var FORMAT_CHANNELS = {};
FORMAT_CHANNELS[GL_LUMINANCE] =
FORMAT_CHANNELS[GL_ALPHA] =
FORMAT_CHANNELS[GL_DEPTH_COMPONENT] = 1;
FORMAT_CHANNELS[GL_DEPTH_STENCIL] =
FORMAT_CHANNELS[GL_LUMINANCE_ALPHA] = 2;
FORMAT_CHANNELS[GL_RGB] =
FORMAT_CHANNELS[GL_SRGB_EXT] = 3;
FORMAT_CHANNELS[GL_RGBA] =
FORMAT_CHANNELS[GL_SRGB_ALPHA_EXT] = 4;

function objectName (str) {
  return '[object ' + str + ']'
}

var CANVAS_CLASS = objectName('HTMLCanvasElement');
var CONTEXT2D_CLASS = objectName('CanvasRenderingContext2D');
var IMAGE_CLASS = objectName('HTMLImageElement');
var VIDEO_CLASS = objectName('HTMLVideoElement');

var PIXEL_CLASSES = Object.keys(arrayTypes).concat([
  CANVAS_CLASS,
  CONTEXT2D_CLASS,
  IMAGE_CLASS,
  VIDEO_CLASS
]);

// for every texture type, store
// the size in bytes.
var TYPE_SIZES = [];
TYPE_SIZES[GL_UNSIGNED_BYTE$4] = 1;
TYPE_SIZES[GL_FLOAT$3] = 4;
TYPE_SIZES[GL_HALF_FLOAT_OES$1] = 2;

TYPE_SIZES[GL_UNSIGNED_SHORT$3] = 2;
TYPE_SIZES[GL_UNSIGNED_INT$3] = 4;

var FORMAT_SIZES_SPECIAL = [];
FORMAT_SIZES_SPECIAL[GL_RGBA4] = 2;
FORMAT_SIZES_SPECIAL[GL_RGB5_A1] = 2;
FORMAT_SIZES_SPECIAL[GL_RGB565] = 2;
FORMAT_SIZES_SPECIAL[GL_DEPTH_STENCIL] = 4;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_S3TC_DXT1_EXT] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT1_EXT] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT3_EXT] = 1;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_S3TC_DXT5_EXT] = 1;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_ATC_WEBGL] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL] = 1;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL] = 1;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG] = 0.25;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG] = 0.5;
FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG] = 0.25;

FORMAT_SIZES_SPECIAL[GL_COMPRESSED_RGB_ETC1_WEBGL] = 0.5;

function isNumericArray (arr) {
  return (
    Array.isArray(arr) &&
    (arr.length === 0 ||
    typeof arr[0] === 'number'))
}

function isRectArray (arr) {
  if (!Array.isArray(arr)) {
    return false
  }
  var width = arr.length;
  if (width === 0 || !isArrayLike(arr[0])) {
    return false
  }
  return true
}

function classString (x) {
  return Object.prototype.toString.call(x)
}

function isCanvasElement (object) {
  return classString(object) === CANVAS_CLASS
}

function isContext2D (object) {
  return classString(object) === CONTEXT2D_CLASS
}

function isImageElement (object) {
  return classString(object) === IMAGE_CLASS
}

function isVideoElement (object) {
  return classString(object) === VIDEO_CLASS
}

function isPixelData (object) {
  if (!object) {
    return false
  }
  var className = classString(object);
  if (PIXEL_CLASSES.indexOf(className) >= 0) {
    return true
  }
  return (
    isNumericArray(object) ||
    isRectArray(object) ||
    isNDArrayLike(object))
}

function typedArrayCode$1 (data) {
  return arrayTypes[Object.prototype.toString.call(data)] | 0
}

function convertData (result, data) {
  var n = data.length;
  switch (result.type) {
    case GL_UNSIGNED_BYTE$4:
    case GL_UNSIGNED_SHORT$3:
    case GL_UNSIGNED_INT$3:
    case GL_FLOAT$3:
      var converted = pool.allocType(result.type, n);
      converted.set(data);
      result.data = converted;
      break

    case GL_HALF_FLOAT_OES$1:
      result.data = convertToHalfFloat(data);
      break

    default:
      check$1.raise('unsupported texture type, must specify a typed array');
  }
}

function preConvert (image, n) {
  return pool.allocType(
    image.type === GL_HALF_FLOAT_OES$1
      ? GL_FLOAT$3
      : image.type, n)
}

function postConvert (image, data) {
  if (image.type === GL_HALF_FLOAT_OES$1) {
    image.data = convertToHalfFloat(data);
    pool.freeType(data);
  } else {
    image.data = data;
  }
}

function transposeData (image, array, strideX, strideY, strideC, offset) {
  var w = image.width;
  var h = image.height;
  var c = image.channels;
  var n = w * h * c;
  var data = preConvert(image, n);

  var p = 0;
  for (var i = 0; i < h; ++i) {
    for (var j = 0; j < w; ++j) {
      for (var k = 0; k < c; ++k) {
        data[p++] = array[strideX * j + strideY * i + strideC * k + offset];
      }
    }
  }

  postConvert(image, data);
}

function getTextureSize (format, type, width, height, isMipmap, isCube) {
  var s;
  if (typeof FORMAT_SIZES_SPECIAL[format] !== 'undefined') {
    // we have a special array for dealing with weird color formats such as RGB5A1
    s = FORMAT_SIZES_SPECIAL[format];
  } else {
    s = FORMAT_CHANNELS[format] * TYPE_SIZES[type];
  }

  if (isCube) {
    s *= 6;
  }

  if (isMipmap) {
    // compute the total size of all the mipmaps.
    var total = 0;

    var w = width;
    while (w >= 1) {
      // we can only use mipmaps on a square image,
      // so we can simply use the width and ignore the height:
      total += s * w * w;
      w /= 2;
    }
    return total
  } else {
    return s * width * height
  }
}

function createTextureSet (
  gl, extensions, limits, reglPoll, contextState, stats, config) {
  // -------------------------------------------------------
  // Initialize constants and parameter tables here
  // -------------------------------------------------------
  var mipmapHint = {
    "don't care": GL_DONT_CARE,
    'dont care': GL_DONT_CARE,
    'nice': GL_NICEST,
    'fast': GL_FASTEST
  };

  var wrapModes = {
    'repeat': GL_REPEAT,
    'clamp': GL_CLAMP_TO_EDGE$1,
    'mirror': GL_MIRRORED_REPEAT
  };

  var magFilters = {
    'nearest': GL_NEAREST$1,
    'linear': GL_LINEAR
  };

  var minFilters = extend({
    'mipmap': GL_LINEAR_MIPMAP_LINEAR$1,
    'nearest mipmap nearest': GL_NEAREST_MIPMAP_NEAREST$1,
    'linear mipmap nearest': GL_LINEAR_MIPMAP_NEAREST$1,
    'nearest mipmap linear': GL_NEAREST_MIPMAP_LINEAR$1,
    'linear mipmap linear': GL_LINEAR_MIPMAP_LINEAR$1
  }, magFilters);

  var colorSpace = {
    'none': 0,
    'browser': GL_BROWSER_DEFAULT_WEBGL
  };

  var textureTypes = {
    'uint8': GL_UNSIGNED_BYTE$4,
    'rgba4': GL_UNSIGNED_SHORT_4_4_4_4$1,
    'rgb565': GL_UNSIGNED_SHORT_5_6_5$1,
    'rgb5 a1': GL_UNSIGNED_SHORT_5_5_5_1$1
  };

  var textureFormats = {
    'alpha': GL_ALPHA,
    'luminance': GL_LUMINANCE,
    'luminance alpha': GL_LUMINANCE_ALPHA,
    'rgb': GL_RGB,
    'rgba': GL_RGBA,
    'rgba4': GL_RGBA4,
    'rgb5 a1': GL_RGB5_A1,
    'rgb565': GL_RGB565
  };

  var compressedTextureFormats = {};

  if (extensions.ext_srgb) {
    textureFormats.srgb = GL_SRGB_EXT;
    textureFormats.srgba = GL_SRGB_ALPHA_EXT;
  }

  if (extensions.oes_texture_float) {
    textureTypes.float32 = textureTypes.float = GL_FLOAT$3;
  }

  if (extensions.oes_texture_half_float) {
    textureTypes['float16'] = textureTypes['half float'] = GL_HALF_FLOAT_OES$1;
  }

  if (extensions.webgl_depth_texture) {
    extend(textureFormats, {
      'depth': GL_DEPTH_COMPONENT,
      'depth stencil': GL_DEPTH_STENCIL
    });

    extend(textureTypes, {
      'uint16': GL_UNSIGNED_SHORT$3,
      'uint32': GL_UNSIGNED_INT$3,
      'depth stencil': GL_UNSIGNED_INT_24_8_WEBGL$1
    });
  }

  if (extensions.webgl_compressed_texture_s3tc) {
    extend(compressedTextureFormats, {
      'rgb s3tc dxt1': GL_COMPRESSED_RGB_S3TC_DXT1_EXT,
      'rgba s3tc dxt1': GL_COMPRESSED_RGBA_S3TC_DXT1_EXT,
      'rgba s3tc dxt3': GL_COMPRESSED_RGBA_S3TC_DXT3_EXT,
      'rgba s3tc dxt5': GL_COMPRESSED_RGBA_S3TC_DXT5_EXT
    });
  }

  if (extensions.webgl_compressed_texture_atc) {
    extend(compressedTextureFormats, {
      'rgb atc': GL_COMPRESSED_RGB_ATC_WEBGL,
      'rgba atc explicit alpha': GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL,
      'rgba atc interpolated alpha': GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL
    });
  }

  if (extensions.webgl_compressed_texture_pvrtc) {
    extend(compressedTextureFormats, {
      'rgb pvrtc 4bppv1': GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG,
      'rgb pvrtc 2bppv1': GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG,
      'rgba pvrtc 4bppv1': GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,
      'rgba pvrtc 2bppv1': GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG
    });
  }

  if (extensions.webgl_compressed_texture_etc1) {
    compressedTextureFormats['rgb etc1'] = GL_COMPRESSED_RGB_ETC1_WEBGL;
  }

  // Copy over all texture formats
  var supportedCompressedFormats = Array.prototype.slice.call(
    gl.getParameter(GL_COMPRESSED_TEXTURE_FORMATS));
  Object.keys(compressedTextureFormats).forEach(function (name) {
    var format = compressedTextureFormats[name];
    if (supportedCompressedFormats.indexOf(format) >= 0) {
      textureFormats[name] = format;
    }
  });

  var supportedFormats = Object.keys(textureFormats);
  limits.textureFormats = supportedFormats;

  // associate with every format string its
  // corresponding GL-value.
  var textureFormatsInvert = [];
  Object.keys(textureFormats).forEach(function (key) {
    var val = textureFormats[key];
    textureFormatsInvert[val] = key;
  });

  // associate with every type string its
  // corresponding GL-value.
  var textureTypesInvert = [];
  Object.keys(textureTypes).forEach(function (key) {
    var val = textureTypes[key];
    textureTypesInvert[val] = key;
  });

  var magFiltersInvert = [];
  Object.keys(magFilters).forEach(function (key) {
    var val = magFilters[key];
    magFiltersInvert[val] = key;
  });

  var minFiltersInvert = [];
  Object.keys(minFilters).forEach(function (key) {
    var val = minFilters[key];
    minFiltersInvert[val] = key;
  });

  var wrapModesInvert = [];
  Object.keys(wrapModes).forEach(function (key) {
    var val = wrapModes[key];
    wrapModesInvert[val] = key;
  });

  // colorFormats[] gives the format (channels) associated to an
  // internalformat
  var colorFormats = supportedFormats.reduce(function (color, key) {
    var glenum = textureFormats[key];
    if (glenum === GL_LUMINANCE ||
        glenum === GL_ALPHA ||
        glenum === GL_LUMINANCE ||
        glenum === GL_LUMINANCE_ALPHA ||
        glenum === GL_DEPTH_COMPONENT ||
        glenum === GL_DEPTH_STENCIL) {
      color[glenum] = glenum;
    } else if (glenum === GL_RGB5_A1 || key.indexOf('rgba') >= 0) {
      color[glenum] = GL_RGBA;
    } else {
      color[glenum] = GL_RGB;
    }
    return color
  }, {});

  function TexFlags () {
    // format info
    this.internalformat = GL_RGBA;
    this.format = GL_RGBA;
    this.type = GL_UNSIGNED_BYTE$4;
    this.compressed = false;

    // pixel storage
    this.premultiplyAlpha = false;
    this.flipY = false;
    this.unpackAlignment = 1;
    this.colorSpace = 0;

    // shape info
    this.width = 0;
    this.height = 0;
    this.channels = 0;
  }

  function copyFlags (result, other) {
    result.internalformat = other.internalformat;
    result.format = other.format;
    result.type = other.type;
    result.compressed = other.compressed;

    result.premultiplyAlpha = other.premultiplyAlpha;
    result.flipY = other.flipY;
    result.unpackAlignment = other.unpackAlignment;
    result.colorSpace = other.colorSpace;

    result.width = other.width;
    result.height = other.height;
    result.channels = other.channels;
  }

  function parseFlags (flags, options) {
    if (typeof options !== 'object' || !options) {
      return
    }

    if ('premultiplyAlpha' in options) {
      check$1.type(options.premultiplyAlpha, 'boolean',
        'invalid premultiplyAlpha');
      flags.premultiplyAlpha = options.premultiplyAlpha;
    }

    if ('flipY' in options) {
      check$1.type(options.flipY, 'boolean',
        'invalid texture flip');
      flags.flipY = options.flipY;
    }

    if ('alignment' in options) {
      check$1.oneOf(options.alignment, [1, 2, 4, 8],
        'invalid texture unpack alignment');
      flags.unpackAlignment = options.alignment;
    }

    if ('colorSpace' in options) {
      check$1.parameter(options.colorSpace, colorSpace,
        'invalid colorSpace');
      flags.colorSpace = colorSpace[options.colorSpace];
    }

    if ('type' in options) {
      var type = options.type;
      check$1(extensions.oes_texture_float ||
        !(type === 'float' || type === 'float32'),
        'you must enable the OES_texture_float extension in order to use floating point textures.');
      check$1(extensions.oes_texture_half_float ||
        !(type === 'half float' || type === 'float16'),
        'you must enable the OES_texture_half_float extension in order to use 16-bit floating point textures.');
      check$1(extensions.webgl_depth_texture ||
        !(type === 'uint16' || type === 'uint32' || type === 'depth stencil'),
        'you must enable the WEBGL_depth_texture extension in order to use depth/stencil textures.');
      check$1.parameter(type, textureTypes,
        'invalid texture type');
      flags.type = textureTypes[type];
    }

    var w = flags.width;
    var h = flags.height;
    var c = flags.channels;
    var hasChannels = false;
    if ('shape' in options) {
      check$1(Array.isArray(options.shape) && options.shape.length >= 2,
        'shape must be an array');
      w = options.shape[0];
      h = options.shape[1];
      if (options.shape.length === 3) {
        c = options.shape[2];
        check$1(c > 0 && c <= 4, 'invalid number of channels');
        hasChannels = true;
      }
      check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid width');
      check$1(h >= 0 && h <= limits.maxTextureSize, 'invalid height');
    } else {
      if ('radius' in options) {
        w = h = options.radius;
        check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid radius');
      }
      if ('width' in options) {
        w = options.width;
        check$1(w >= 0 && w <= limits.maxTextureSize, 'invalid width');
      }
      if ('height' in options) {
        h = options.height;
        check$1(h >= 0 && h <= limits.maxTextureSize, 'invalid height');
      }
      if ('channels' in options) {
        c = options.channels;
        check$1(c > 0 && c <= 4, 'invalid number of channels');
        hasChannels = true;
      }
    }
    flags.width = w | 0;
    flags.height = h | 0;
    flags.channels = c | 0;

    var hasFormat = false;
    if ('format' in options) {
      var formatStr = options.format;
      check$1(extensions.webgl_depth_texture ||
        !(formatStr === 'depth' || formatStr === 'depth stencil'),
        'you must enable the WEBGL_depth_texture extension in order to use depth/stencil textures.');
      check$1.parameter(formatStr, textureFormats,
        'invalid texture format');
      var internalformat = flags.internalformat = textureFormats[formatStr];
      flags.format = colorFormats[internalformat];
      if (formatStr in textureTypes) {
        if (!('type' in options)) {
          flags.type = textureTypes[formatStr];
        }
      }
      if (formatStr in compressedTextureFormats) {
        flags.compressed = true;
      }
      hasFormat = true;
    }

    // Reconcile channels and format
    if (!hasChannels && hasFormat) {
      flags.channels = FORMAT_CHANNELS[flags.format];
    } else if (hasChannels && !hasFormat) {
      if (flags.channels !== CHANNELS_FORMAT[flags.format]) {
        flags.format = flags.internalformat = CHANNELS_FORMAT[flags.channels];
      }
    } else if (hasFormat && hasChannels) {
      check$1(
        flags.channels === FORMAT_CHANNELS[flags.format],
        'number of channels inconsistent with specified format');
    }
  }

  function setFlags (flags) {
    gl.pixelStorei(GL_UNPACK_FLIP_Y_WEBGL, flags.flipY);
    gl.pixelStorei(GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL, flags.premultiplyAlpha);
    gl.pixelStorei(GL_UNPACK_COLORSPACE_CONVERSION_WEBGL, flags.colorSpace);
    gl.pixelStorei(GL_UNPACK_ALIGNMENT, flags.unpackAlignment);
  }

  // -------------------------------------------------------
  // Tex image data
  // -------------------------------------------------------
  function TexImage () {
    TexFlags.call(this);

    this.xOffset = 0;
    this.yOffset = 0;

    // data
    this.data = null;
    this.needsFree = false;

    // html element
    this.element = null;

    // copyTexImage info
    this.needsCopy = false;
  }

  function parseImage (image, options) {
    var data = null;
    if (isPixelData(options)) {
      data = options;
    } else if (options) {
      check$1.type(options, 'object', 'invalid pixel data type');
      parseFlags(image, options);
      if ('x' in options) {
        image.xOffset = options.x | 0;
      }
      if ('y' in options) {
        image.yOffset = options.y | 0;
      }
      if (isPixelData(options.data)) {
        data = options.data;
      }
    }

    check$1(
      !image.compressed ||
      data instanceof Uint8Array,
      'compressed texture data must be stored in a uint8array');

    if (options.copy) {
      check$1(!data, 'can not specify copy and data field for the same texture');
      var viewW = contextState.viewportWidth;
      var viewH = contextState.viewportHeight;
      image.width = image.width || (viewW - image.xOffset);
      image.height = image.height || (viewH - image.yOffset);
      image.needsCopy = true;
      check$1(image.xOffset >= 0 && image.xOffset < viewW &&
            image.yOffset >= 0 && image.yOffset < viewH &&
            image.width > 0 && image.width <= viewW &&
            image.height > 0 && image.height <= viewH,
            'copy texture read out of bounds');
    } else if (!data) {
      image.width = image.width || 1;
      image.height = image.height || 1;
      image.channels = image.channels || 4;
    } else if (isTypedArray(data)) {
      image.channels = image.channels || 4;
      image.data = data;
      if (!('type' in options) && image.type === GL_UNSIGNED_BYTE$4) {
        image.type = typedArrayCode$1(data);
      }
    } else if (isNumericArray(data)) {
      image.channels = image.channels || 4;
      convertData(image, data);
      image.alignment = 1;
      image.needsFree = true;
    } else if (isNDArrayLike(data)) {
      var array = data.data;
      if (!Array.isArray(array) && image.type === GL_UNSIGNED_BYTE$4) {
        image.type = typedArrayCode$1(array);
      }
      var shape = data.shape;
      var stride = data.stride;
      var shapeX, shapeY, shapeC, strideX, strideY, strideC;
      if (shape.length === 3) {
        shapeC = shape[2];
        strideC = stride[2];
      } else {
        check$1(shape.length === 2, 'invalid ndarray pixel data, must be 2 or 3D');
        shapeC = 1;
        strideC = 1;
      }
      shapeX = shape[0];
      shapeY = shape[1];
      strideX = stride[0];
      strideY = stride[1];
      image.alignment = 1;
      image.width = shapeX;
      image.height = shapeY;
      image.channels = shapeC;
      image.format = image.internalformat = CHANNELS_FORMAT[shapeC];
      image.needsFree = true;
      transposeData(image, array, strideX, strideY, strideC, data.offset);
    } else if (isCanvasElement(data) || isContext2D(data)) {
      if (isCanvasElement(data)) {
        image.element = data;
      } else {
        image.element = data.canvas;
      }
      image.width = image.element.width;
      image.height = image.element.height;
      image.channels = 4;
    } else if (isImageElement(data)) {
      image.element = data;
      image.width = data.naturalWidth;
      image.height = data.naturalHeight;
      image.channels = 4;
    } else if (isVideoElement(data)) {
      image.element = data;
      image.width = data.videoWidth;
      image.height = data.videoHeight;
      image.channels = 4;
    } else if (isRectArray(data)) {
      var w = image.width || data[0].length;
      var h = image.height || data.length;
      var c = image.channels;
      if (isArrayLike(data[0][0])) {
        c = c || data[0][0].length;
      } else {
        c = c || 1;
      }
      var arrayShape = flattenUtils.shape(data);
      var n = 1;
      for (var dd = 0; dd < arrayShape.length; ++dd) {
        n *= arrayShape[dd];
      }
      var allocData = preConvert(image, n);
      flattenUtils.flatten(data, arrayShape, '', allocData);
      postConvert(image, allocData);
      image.alignment = 1;
      image.width = w;
      image.height = h;
      image.channels = c;
      image.format = image.internalformat = CHANNELS_FORMAT[c];
      image.needsFree = true;
    }

    if (image.type === GL_FLOAT$3) {
      check$1(limits.extensions.indexOf('oes_texture_float') >= 0,
        'oes_texture_float extension not enabled');
    } else if (image.type === GL_HALF_FLOAT_OES$1) {
      check$1(limits.extensions.indexOf('oes_texture_half_float') >= 0,
        'oes_texture_half_float extension not enabled');
    }

    // do compressed texture  validation here.
  }

  function setImage (info, target, miplevel) {
    var element = info.element;
    var data = info.data;
    var internalformat = info.internalformat;
    var format = info.format;
    var type = info.type;
    var width = info.width;
    var height = info.height;

    setFlags(info);

    if (element) {
      gl.texImage2D(target, miplevel, format, format, type, element);
    } else if (info.compressed) {
      gl.compressedTexImage2D(target, miplevel, internalformat, width, height, 0, data);
    } else if (info.needsCopy) {
      reglPoll();
      gl.copyTexImage2D(
        target, miplevel, format, info.xOffset, info.yOffset, width, height, 0);
    } else {
      gl.texImage2D(
        target, miplevel, format, width, height, 0, format, type, data);
    }
  }

  function setSubImage (info, target, x, y, miplevel) {
    var element = info.element;
    var data = info.data;
    var internalformat = info.internalformat;
    var format = info.format;
    var type = info.type;
    var width = info.width;
    var height = info.height;

    setFlags(info);

    if (element) {
      gl.texSubImage2D(
        target, miplevel, x, y, format, type, element);
    } else if (info.compressed) {
      gl.compressedTexSubImage2D(
        target, miplevel, x, y, internalformat, width, height, data);
    } else if (info.needsCopy) {
      reglPoll();
      gl.copyTexSubImage2D(
        target, miplevel, x, y, info.xOffset, info.yOffset, width, height);
    } else {
      gl.texSubImage2D(
        target, miplevel, x, y, width, height, format, type, data);
    }
  }

  // texImage pool
  var imagePool = [];

  function allocImage () {
    return imagePool.pop() || new TexImage()
  }

  function freeImage (image) {
    if (image.needsFree) {
      pool.freeType(image.data);
    }
    TexImage.call(image);
    imagePool.push(image);
  }

  // -------------------------------------------------------
  // Mip map
  // -------------------------------------------------------
  function MipMap () {
    TexFlags.call(this);

    this.genMipmaps = false;
    this.mipmapHint = GL_DONT_CARE;
    this.mipmask = 0;
    this.images = Array(16);
  }

  function parseMipMapFromShape (mipmap, width, height) {
    var img = mipmap.images[0] = allocImage();
    mipmap.mipmask = 1;
    img.width = mipmap.width = width;
    img.height = mipmap.height = height;
    img.channels = mipmap.channels = 4;
  }

  function parseMipMapFromObject (mipmap, options) {
    var imgData = null;
    if (isPixelData(options)) {
      imgData = mipmap.images[0] = allocImage();
      copyFlags(imgData, mipmap);
      parseImage(imgData, options);
      mipmap.mipmask = 1;
    } else {
      parseFlags(mipmap, options);
      if (Array.isArray(options.mipmap)) {
        var mipData = options.mipmap;
        for (var i = 0; i < mipData.length; ++i) {
          imgData = mipmap.images[i] = allocImage();
          copyFlags(imgData, mipmap);
          imgData.width >>= i;
          imgData.height >>= i;
          parseImage(imgData, mipData[i]);
          mipmap.mipmask |= (1 << i);
        }
      } else {
        imgData = mipmap.images[0] = allocImage();
        copyFlags(imgData, mipmap);
        parseImage(imgData, options);
        mipmap.mipmask = 1;
      }
    }
    copyFlags(mipmap, mipmap.images[0]);

    // For textures of the compressed format WEBGL_compressed_texture_s3tc
    // we must have that
    //
    // "When level equals zero width and height must be a multiple of 4.
    // When level is greater than 0 width and height must be 0, 1, 2 or a multiple of 4. "
    //
    // but we do not yet support having multiple mipmap levels for compressed textures,
    // so we only test for level zero.

    if (mipmap.compressed &&
        (mipmap.internalformat === GL_COMPRESSED_RGB_S3TC_DXT1_EXT) ||
        (mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT1_EXT) ||
        (mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT3_EXT) ||
        (mipmap.internalformat === GL_COMPRESSED_RGBA_S3TC_DXT5_EXT)) {
      check$1(mipmap.width % 4 === 0 &&
            mipmap.height % 4 === 0,
            'for compressed texture formats, mipmap level 0 must have width and height that are a multiple of 4');
    }
  }

  function setMipMap (mipmap, target) {
    var images = mipmap.images;
    for (var i = 0; i < images.length; ++i) {
      if (!images[i]) {
        return
      }
      setImage(images[i], target, i);
    }
  }

  var mipPool = [];

  function allocMipMap () {
    var result = mipPool.pop() || new MipMap();
    TexFlags.call(result);
    result.mipmask = 0;
    for (var i = 0; i < 16; ++i) {
      result.images[i] = null;
    }
    return result
  }

  function freeMipMap (mipmap) {
    var images = mipmap.images;
    for (var i = 0; i < images.length; ++i) {
      if (images[i]) {
        freeImage(images[i]);
      }
      images[i] = null;
    }
    mipPool.push(mipmap);
  }

  // -------------------------------------------------------
  // Tex info
  // -------------------------------------------------------
  function TexInfo () {
    this.minFilter = GL_NEAREST$1;
    this.magFilter = GL_NEAREST$1;

    this.wrapS = GL_CLAMP_TO_EDGE$1;
    this.wrapT = GL_CLAMP_TO_EDGE$1;

    this.anisotropic = 1;

    this.genMipmaps = false;
    this.mipmapHint = GL_DONT_CARE;
  }

  function parseTexInfo (info, options) {
    if ('min' in options) {
      var minFilter = options.min;
      check$1.parameter(minFilter, minFilters);
      info.minFilter = minFilters[minFilter];
      if (MIPMAP_FILTERS.indexOf(info.minFilter) >= 0) {
        info.genMipmaps = true;
      }
    }

    if ('mag' in options) {
      var magFilter = options.mag;
      check$1.parameter(magFilter, magFilters);
      info.magFilter = magFilters[magFilter];
    }

    var wrapS = info.wrapS;
    var wrapT = info.wrapT;
    if ('wrap' in options) {
      var wrap = options.wrap;
      if (typeof wrap === 'string') {
        check$1.parameter(wrap, wrapModes);
        wrapS = wrapT = wrapModes[wrap];
      } else if (Array.isArray(wrap)) {
        check$1.parameter(wrap[0], wrapModes);
        check$1.parameter(wrap[1], wrapModes);
        wrapS = wrapModes[wrap[0]];
        wrapT = wrapModes[wrap[1]];
      }
    } else {
      if ('wrapS' in options) {
        var optWrapS = options.wrapS;
        check$1.parameter(optWrapS, wrapModes);
        wrapS = wrapModes[optWrapS];
      }
      if ('wrapT' in options) {
        var optWrapT = options.wrapT;
        check$1.parameter(optWrapT, wrapModes);
        wrapT = wrapModes[optWrapT];
      }
    }
    info.wrapS = wrapS;
    info.wrapT = wrapT;

    if ('anisotropic' in options) {
      var anisotropic = options.anisotropic;
      check$1(typeof anisotropic === 'number' &&
         anisotropic >= 1 && anisotropic <= limits.maxAnisotropic,
        'aniso samples must be between 1 and ');
      info.anisotropic = options.anisotropic;
    }

    if ('mipmap' in options) {
      var hasMipMap = false;
      switch (typeof options.mipmap) {
        case 'string':
          check$1.parameter(options.mipmap, mipmapHint,
            'invalid mipmap hint');
          info.mipmapHint = mipmapHint[options.mipmap];
          info.genMipmaps = true;
          hasMipMap = true;
          break

        case 'boolean':
          hasMipMap = info.genMipmaps = options.mipmap;
          break

        case 'object':
          check$1(Array.isArray(options.mipmap), 'invalid mipmap type');
          info.genMipmaps = false;
          hasMipMap = true;
          break

        default:
          check$1.raise('invalid mipmap type');
      }
      if (hasMipMap && !('min' in options)) {
        info.minFilter = GL_NEAREST_MIPMAP_NEAREST$1;
      }
    }
  }

  function setTexInfo (info, target) {
    gl.texParameteri(target, GL_TEXTURE_MIN_FILTER, info.minFilter);
    gl.texParameteri(target, GL_TEXTURE_MAG_FILTER, info.magFilter);
    gl.texParameteri(target, GL_TEXTURE_WRAP_S, info.wrapS);
    gl.texParameteri(target, GL_TEXTURE_WRAP_T, info.wrapT);
    if (extensions.ext_texture_filter_anisotropic) {
      gl.texParameteri(target, GL_TEXTURE_MAX_ANISOTROPY_EXT, info.anisotropic);
    }
    if (info.genMipmaps) {
      gl.hint(GL_GENERATE_MIPMAP_HINT, info.mipmapHint);
      gl.generateMipmap(target);
    }
  }

  // -------------------------------------------------------
  // Full texture object
  // -------------------------------------------------------
  var textureCount = 0;
  var textureSet = {};
  var numTexUnits = limits.maxTextureUnits;
  var textureUnits = Array(numTexUnits).map(function () {
    return null
  });

  function REGLTexture (target) {
    TexFlags.call(this);
    this.mipmask = 0;
    this.internalformat = GL_RGBA;

    this.id = textureCount++;

    this.refCount = 1;

    this.target = target;
    this.texture = gl.createTexture();

    this.unit = -1;
    this.bindCount = 0;

    this.texInfo = new TexInfo();

    if (config.profile) {
      this.stats = {size: 0};
    }
  }

  function tempBind (texture) {
    gl.activeTexture(GL_TEXTURE0);
    gl.bindTexture(texture.target, texture.texture);
  }

  function tempRestore () {
    var prev = textureUnits[0];
    if (prev) {
      gl.bindTexture(prev.target, prev.texture);
    } else {
      gl.bindTexture(GL_TEXTURE_2D, null);
    }
  }

  function destroy (texture) {
    var handle = texture.texture;
    check$1(handle, 'must not double destroy texture');
    var unit = texture.unit;
    var target = texture.target;
    if (unit >= 0) {
      gl.activeTexture(GL_TEXTURE0 + unit);
      gl.bindTexture(target, null);
      textureUnits[unit] = null;
    }
    gl.deleteTexture(handle);
    texture.texture = null;
    texture.params = null;
    texture.pixels = null;
    texture.refCount = 0;
    delete textureSet[texture.id];
    stats.textureCount--;
  }

  extend(REGLTexture.prototype, {
    bind: function () {
      var texture = this;
      texture.bindCount += 1;
      var unit = texture.unit;
      if (unit < 0) {
        for (var i = 0; i < numTexUnits; ++i) {
          var other = textureUnits[i];
          if (other) {
            if (other.bindCount > 0) {
              continue
            }
            other.unit = -1;
          }
          textureUnits[i] = texture;
          unit = i;
          break
        }
        if (unit >= numTexUnits) {
          check$1.raise('insufficient number of texture units');
        }
        if (config.profile && stats.maxTextureUnits < (unit + 1)) {
          stats.maxTextureUnits = unit + 1; // +1, since the units are zero-based
        }
        texture.unit = unit;
        gl.activeTexture(GL_TEXTURE0 + unit);
        gl.bindTexture(texture.target, texture.texture);
      }
      return unit
    },

    unbind: function () {
      this.bindCount -= 1;
    },

    decRef: function () {
      if (--this.refCount <= 0) {
        destroy(this);
      }
    }
  });

  function createTexture2D (a, b) {
    var texture = new REGLTexture(GL_TEXTURE_2D);
    textureSet[texture.id] = texture;
    stats.textureCount++;

    function reglTexture2D (a, b) {
      var texInfo = texture.texInfo;
      TexInfo.call(texInfo);
      var mipData = allocMipMap();

      if (typeof a === 'number') {
        if (typeof b === 'number') {
          parseMipMapFromShape(mipData, a | 0, b | 0);
        } else {
          parseMipMapFromShape(mipData, a | 0, a | 0);
        }
      } else if (a) {
        check$1.type(a, 'object', 'invalid arguments to regl.texture');
        parseTexInfo(texInfo, a);
        parseMipMapFromObject(mipData, a);
      } else {
        // empty textures get assigned a default shape of 1x1
        parseMipMapFromShape(mipData, 1, 1);
      }

      if (texInfo.genMipmaps) {
        mipData.mipmask = (mipData.width << 1) - 1;
      }
      texture.mipmask = mipData.mipmask;

      copyFlags(texture, mipData);

      check$1.texture2D(texInfo, mipData, limits);
      texture.internalformat = mipData.internalformat;

      reglTexture2D.width = mipData.width;
      reglTexture2D.height = mipData.height;

      tempBind(texture);
      setMipMap(mipData, GL_TEXTURE_2D);
      setTexInfo(texInfo, GL_TEXTURE_2D);
      tempRestore();

      freeMipMap(mipData);

      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          mipData.width,
          mipData.height,
          texInfo.genMipmaps,
          false);
      }
      reglTexture2D.format = textureFormatsInvert[texture.internalformat];
      reglTexture2D.type = textureTypesInvert[texture.type];

      reglTexture2D.mag = magFiltersInvert[texInfo.magFilter];
      reglTexture2D.min = minFiltersInvert[texInfo.minFilter];

      reglTexture2D.wrapS = wrapModesInvert[texInfo.wrapS];
      reglTexture2D.wrapT = wrapModesInvert[texInfo.wrapT];

      return reglTexture2D
    }

    function subimage (image, x_, y_, level_) {
      check$1(!!image, 'must specify image data');

      var x = x_ | 0;
      var y = y_ | 0;
      var level = level_ | 0;

      var imageData = allocImage();
      copyFlags(imageData, texture);
      imageData.width = 0;
      imageData.height = 0;
      parseImage(imageData, image);
      imageData.width = imageData.width || ((texture.width >> level) - x);
      imageData.height = imageData.height || ((texture.height >> level) - y);

      check$1(
        texture.type === imageData.type &&
        texture.format === imageData.format &&
        texture.internalformat === imageData.internalformat,
        'incompatible format for texture.subimage');
      check$1(
        x >= 0 && y >= 0 &&
        x + imageData.width <= texture.width &&
        y + imageData.height <= texture.height,
        'texture.subimage write out of bounds');
      check$1(
        texture.mipmask & (1 << level),
        'missing mipmap data');
      check$1(
        imageData.data || imageData.element || imageData.needsCopy,
        'missing image data');

      tempBind(texture);
      setSubImage(imageData, GL_TEXTURE_2D, x, y, level);
      tempRestore();

      freeImage(imageData);

      return reglTexture2D
    }

    function resize (w_, h_) {
      var w = w_ | 0;
      var h = (h_ | 0) || w;
      if (w === texture.width && h === texture.height) {
        return reglTexture2D
      }

      reglTexture2D.width = texture.width = w;
      reglTexture2D.height = texture.height = h;

      tempBind(texture);
      for (var i = 0; texture.mipmask >> i; ++i) {
        gl.texImage2D(
          GL_TEXTURE_2D,
          i,
          texture.format,
          w >> i,
          h >> i,
          0,
          texture.format,
          texture.type,
          null);
      }
      tempRestore();

      // also, recompute the texture size.
      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          w,
          h,
          false,
          false);
      }

      return reglTexture2D
    }

    reglTexture2D(a, b);

    reglTexture2D.subimage = subimage;
    reglTexture2D.resize = resize;
    reglTexture2D._reglType = 'texture2d';
    reglTexture2D._texture = texture;
    if (config.profile) {
      reglTexture2D.stats = texture.stats;
    }
    reglTexture2D.destroy = function () {
      texture.decRef();
    };

    return reglTexture2D
  }

  function createTextureCube (a0, a1, a2, a3, a4, a5) {
    var texture = new REGLTexture(GL_TEXTURE_CUBE_MAP);
    textureSet[texture.id] = texture;
    stats.cubeCount++;

    var faces = new Array(6);

    function reglTextureCube (a0, a1, a2, a3, a4, a5) {
      var i;
      var texInfo = texture.texInfo;
      TexInfo.call(texInfo);
      for (i = 0; i < 6; ++i) {
        faces[i] = allocMipMap();
      }

      if (typeof a0 === 'number' || !a0) {
        var s = (a0 | 0) || 1;
        for (i = 0; i < 6; ++i) {
          parseMipMapFromShape(faces[i], s, s);
        }
      } else if (typeof a0 === 'object') {
        if (a1) {
          parseMipMapFromObject(faces[0], a0);
          parseMipMapFromObject(faces[1], a1);
          parseMipMapFromObject(faces[2], a2);
          parseMipMapFromObject(faces[3], a3);
          parseMipMapFromObject(faces[4], a4);
          parseMipMapFromObject(faces[5], a5);
        } else {
          parseTexInfo(texInfo, a0);
          parseFlags(texture, a0);
          if ('faces' in a0) {
            var face_input = a0.faces;
            check$1(Array.isArray(face_input) && face_input.length === 6,
              'cube faces must be a length 6 array');
            for (i = 0; i < 6; ++i) {
              check$1(typeof face_input[i] === 'object' && !!face_input[i],
                'invalid input for cube map face');
              copyFlags(faces[i], texture);
              parseMipMapFromObject(faces[i], face_input[i]);
            }
          } else {
            for (i = 0; i < 6; ++i) {
              parseMipMapFromObject(faces[i], a0);
            }
          }
        }
      } else {
        check$1.raise('invalid arguments to cube map');
      }

      copyFlags(texture, faces[0]);
      if (texInfo.genMipmaps) {
        texture.mipmask = (faces[0].width << 1) - 1;
      } else {
        texture.mipmask = faces[0].mipmask;
      }

      check$1.textureCube(texture, texInfo, faces, limits);
      texture.internalformat = faces[0].internalformat;

      reglTextureCube.width = faces[0].width;
      reglTextureCube.height = faces[0].height;

      tempBind(texture);
      for (i = 0; i < 6; ++i) {
        setMipMap(faces[i], GL_TEXTURE_CUBE_MAP_POSITIVE_X + i);
      }
      setTexInfo(texInfo, GL_TEXTURE_CUBE_MAP);
      tempRestore();

      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          reglTextureCube.width,
          reglTextureCube.height,
          texInfo.genMipmaps,
          true);
      }

      reglTextureCube.format = textureFormatsInvert[texture.internalformat];
      reglTextureCube.type = textureTypesInvert[texture.type];

      reglTextureCube.mag = magFiltersInvert[texInfo.magFilter];
      reglTextureCube.min = minFiltersInvert[texInfo.minFilter];

      reglTextureCube.wrapS = wrapModesInvert[texInfo.wrapS];
      reglTextureCube.wrapT = wrapModesInvert[texInfo.wrapT];

      for (i = 0; i < 6; ++i) {
        freeMipMap(faces[i]);
      }

      return reglTextureCube
    }

    function subimage (face, image, x_, y_, level_) {
      check$1(!!image, 'must specify image data');
      check$1(typeof face === 'number' && face === (face | 0) &&
        face >= 0 && face < 6, 'invalid face');

      var x = x_ | 0;
      var y = y_ | 0;
      var level = level_ | 0;

      var imageData = allocImage();
      copyFlags(imageData, texture);
      imageData.width = 0;
      imageData.height = 0;
      parseImage(imageData, image);
      imageData.width = imageData.width || ((texture.width >> level) - x);
      imageData.height = imageData.height || ((texture.height >> level) - y);

      check$1(
        texture.type === imageData.type &&
        texture.format === imageData.format &&
        texture.internalformat === imageData.internalformat,
        'incompatible format for texture.subimage');
      check$1(
        x >= 0 && y >= 0 &&
        x + imageData.width <= texture.width &&
        y + imageData.height <= texture.height,
        'texture.subimage write out of bounds');
      check$1(
        texture.mipmask & (1 << level),
        'missing mipmap data');
      check$1(
        imageData.data || imageData.element || imageData.needsCopy,
        'missing image data');

      tempBind(texture);
      setSubImage(imageData, GL_TEXTURE_CUBE_MAP_POSITIVE_X + face, x, y, level);
      tempRestore();

      freeImage(imageData);

      return reglTextureCube
    }

    function resize (radius_) {
      var radius = radius_ | 0;
      if (radius === texture.width) {
        return
      }

      reglTextureCube.width = texture.width = radius;
      reglTextureCube.height = texture.height = radius;

      tempBind(texture);
      for (var i = 0; i < 6; ++i) {
        for (var j = 0; texture.mipmask >> j; ++j) {
          gl.texImage2D(
            GL_TEXTURE_CUBE_MAP_POSITIVE_X + i,
            j,
            texture.format,
            radius >> j,
            radius >> j,
            0,
            texture.format,
            texture.type,
            null);
        }
      }
      tempRestore();

      if (config.profile) {
        texture.stats.size = getTextureSize(
          texture.internalformat,
          texture.type,
          reglTextureCube.width,
          reglTextureCube.height,
          false,
          true);
      }

      return reglTextureCube
    }

    reglTextureCube(a0, a1, a2, a3, a4, a5);

    reglTextureCube.subimage = subimage;
    reglTextureCube.resize = resize;
    reglTextureCube._reglType = 'textureCube';
    reglTextureCube._texture = texture;
    if (config.profile) {
      reglTextureCube.stats = texture.stats;
    }
    reglTextureCube.destroy = function () {
      texture.decRef();
    };

    return reglTextureCube
  }

  // Called when regl is destroyed
  function destroyTextures () {
    for (var i = 0; i < numTexUnits; ++i) {
      gl.activeTexture(GL_TEXTURE0 + i);
      gl.bindTexture(GL_TEXTURE_2D, null);
      textureUnits[i] = null;
    }
    values(textureSet).forEach(destroy);

    stats.cubeCount = 0;
    stats.textureCount = 0;
  }

  if (config.profile) {
    stats.getTotalTextureSize = function () {
      var total = 0;
      Object.keys(textureSet).forEach(function (key) {
        total += textureSet[key].stats.size;
      });
      return total
    };
  }

  function restoreTextures () {
    values(textureSet).forEach(function (texture) {
      texture.texture = gl.createTexture();
      gl.bindTexture(texture.target, texture.texture);
      for (var i = 0; i < 32; ++i) {
        if ((texture.mipmask & (1 << i)) === 0) {
          continue
        }
        if (texture.target === GL_TEXTURE_2D) {
          gl.texImage2D(GL_TEXTURE_2D,
            i,
            texture.internalformat,
            texture.width >> i,
            texture.height >> i,
            0,
            texture.internalformat,
            texture.type,
            null);
        } else {
          for (var j = 0; j < 6; ++j) {
            gl.texImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X + j,
              i,
              texture.internalformat,
              texture.width >> i,
              texture.height >> i,
              0,
              texture.internalformat,
              texture.type,
              null);
          }
        }
      }
      setTexInfo(texture.texInfo, texture.target);
    });
  }

  return {
    create2D: createTexture2D,
    createCube: createTextureCube,
    clear: destroyTextures,
    getTexture: function (wrapper) {
      return null
    },
    restore: restoreTextures
  }
}

var GL_RENDERBUFFER = 0x8D41;

var GL_RGBA4$1 = 0x8056;
var GL_RGB5_A1$1 = 0x8057;
var GL_RGB565$1 = 0x8D62;
var GL_DEPTH_COMPONENT16 = 0x81A5;
var GL_STENCIL_INDEX8 = 0x8D48;
var GL_DEPTH_STENCIL$1 = 0x84F9;

var GL_SRGB8_ALPHA8_EXT = 0x8C43;

var GL_RGBA32F_EXT = 0x8814;

var GL_RGBA16F_EXT = 0x881A;
var GL_RGB16F_EXT = 0x881B;

var FORMAT_SIZES = [];

FORMAT_SIZES[GL_RGBA4$1] = 2;
FORMAT_SIZES[GL_RGB5_A1$1] = 2;
FORMAT_SIZES[GL_RGB565$1] = 2;

FORMAT_SIZES[GL_DEPTH_COMPONENT16] = 2;
FORMAT_SIZES[GL_STENCIL_INDEX8] = 1;
FORMAT_SIZES[GL_DEPTH_STENCIL$1] = 4;

FORMAT_SIZES[GL_SRGB8_ALPHA8_EXT] = 4;
FORMAT_SIZES[GL_RGBA32F_EXT] = 16;
FORMAT_SIZES[GL_RGBA16F_EXT] = 8;
FORMAT_SIZES[GL_RGB16F_EXT] = 6;

function getRenderbufferSize (format, width, height) {
  return FORMAT_SIZES[format] * width * height
}

var wrapRenderbuffers = function (gl, extensions, limits, stats, config) {
  var formatTypes = {
    'rgba4': GL_RGBA4$1,
    'rgb565': GL_RGB565$1,
    'rgb5 a1': GL_RGB5_A1$1,
    'depth': GL_DEPTH_COMPONENT16,
    'stencil': GL_STENCIL_INDEX8,
    'depth stencil': GL_DEPTH_STENCIL$1
  };

  if (extensions.ext_srgb) {
    formatTypes['srgba'] = GL_SRGB8_ALPHA8_EXT;
  }

  if (extensions.ext_color_buffer_half_float) {
    formatTypes['rgba16f'] = GL_RGBA16F_EXT;
    formatTypes['rgb16f'] = GL_RGB16F_EXT;
  }

  if (extensions.webgl_color_buffer_float) {
    formatTypes['rgba32f'] = GL_RGBA32F_EXT;
  }

  var formatTypesInvert = [];
  Object.keys(formatTypes).forEach(function (key) {
    var val = formatTypes[key];
    formatTypesInvert[val] = key;
  });

  var renderbufferCount = 0;
  var renderbufferSet = {};

  function REGLRenderbuffer (renderbuffer) {
    this.id = renderbufferCount++;
    this.refCount = 1;

    this.renderbuffer = renderbuffer;

    this.format = GL_RGBA4$1;
    this.width = 0;
    this.height = 0;

    if (config.profile) {
      this.stats = {size: 0};
    }
  }

  REGLRenderbuffer.prototype.decRef = function () {
    if (--this.refCount <= 0) {
      destroy(this);
    }
  };

  function destroy (rb) {
    var handle = rb.renderbuffer;
    check$1(handle, 'must not double destroy renderbuffer');
    gl.bindRenderbuffer(GL_RENDERBUFFER, null);
    gl.deleteRenderbuffer(handle);
    rb.renderbuffer = null;
    rb.refCount = 0;
    delete renderbufferSet[rb.id];
    stats.renderbufferCount--;
  }

  function createRenderbuffer (a, b) {
    var renderbuffer = new REGLRenderbuffer(gl.createRenderbuffer());
    renderbufferSet[renderbuffer.id] = renderbuffer;
    stats.renderbufferCount++;

    function reglRenderbuffer (a, b) {
      var w = 0;
      var h = 0;
      var format = GL_RGBA4$1;

      if (typeof a === 'object' && a) {
        var options = a;
        if ('shape' in options) {
          var shape = options.shape;
          check$1(Array.isArray(shape) && shape.length >= 2,
            'invalid renderbuffer shape');
          w = shape[0] | 0;
          h = shape[1] | 0;
        } else {
          if ('radius' in options) {
            w = h = options.radius | 0;
          }
          if ('width' in options) {
            w = options.width | 0;
          }
          if ('height' in options) {
            h = options.height | 0;
          }
        }
        if ('format' in options) {
          check$1.parameter(options.format, formatTypes,
            'invalid renderbuffer format');
          format = formatTypes[options.format];
        }
      } else if (typeof a === 'number') {
        w = a | 0;
        if (typeof b === 'number') {
          h = b | 0;
        } else {
          h = w;
        }
      } else if (!a) {
        w = h = 1;
      } else {
        check$1.raise('invalid arguments to renderbuffer constructor');
      }

      // check shape
      check$1(
        w > 0 && h > 0 &&
        w <= limits.maxRenderbufferSize && h <= limits.maxRenderbufferSize,
        'invalid renderbuffer size');

      if (w === renderbuffer.width &&
          h === renderbuffer.height &&
          format === renderbuffer.format) {
        return
      }

      reglRenderbuffer.width = renderbuffer.width = w;
      reglRenderbuffer.height = renderbuffer.height = h;
      renderbuffer.format = format;

      gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer.renderbuffer);
      gl.renderbufferStorage(GL_RENDERBUFFER, format, w, h);

      if (config.profile) {
        renderbuffer.stats.size = getRenderbufferSize(renderbuffer.format, renderbuffer.width, renderbuffer.height);
      }
      reglRenderbuffer.format = formatTypesInvert[renderbuffer.format];

      return reglRenderbuffer
    }

    function resize (w_, h_) {
      var w = w_ | 0;
      var h = (h_ | 0) || w;

      if (w === renderbuffer.width && h === renderbuffer.height) {
        return reglRenderbuffer
      }

      // check shape
      check$1(
        w > 0 && h > 0 &&
        w <= limits.maxRenderbufferSize && h <= limits.maxRenderbufferSize,
        'invalid renderbuffer size');

      reglRenderbuffer.width = renderbuffer.width = w;
      reglRenderbuffer.height = renderbuffer.height = h;

      gl.bindRenderbuffer(GL_RENDERBUFFER, renderbuffer.renderbuffer);
      gl.renderbufferStorage(GL_RENDERBUFFER, renderbuffer.format, w, h);

      // also, recompute size.
      if (config.profile) {
        renderbuffer.stats.size = getRenderbufferSize(
          renderbuffer.format, renderbuffer.width, renderbuffer.height);
      }

      return reglRenderbuffer
    }

    reglRenderbuffer(a, b);

    reglRenderbuffer.resize = resize;
    reglRenderbuffer._reglType = 'renderbuffer';
    reglRenderbuffer._renderbuffer = renderbuffer;
    if (config.profile) {
      reglRenderbuffer.stats = renderbuffer.stats;
    }
    reglRenderbuffer.destroy = function () {
      renderbuffer.decRef();
    };

    return reglRenderbuffer
  }

  if (config.profile) {
    stats.getTotalRenderbufferSize = function () {
      var total = 0;
      Object.keys(renderbufferSet).forEach(function (key) {
        total += renderbufferSet[key].stats.size;
      });
      return total
    };
  }

  function restoreRenderbuffers () {
    values(renderbufferSet).forEach(function (rb) {
      rb.renderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(GL_RENDERBUFFER, rb.renderbuffer);
      gl.renderbufferStorage(GL_RENDERBUFFER, rb.format, rb.width, rb.height);
    });
    gl.bindRenderbuffer(GL_RENDERBUFFER, null);
  }

  return {
    create: createRenderbuffer,
    clear: function () {
      values(renderbufferSet).forEach(destroy);
    },
    restore: restoreRenderbuffers
  }
};

// We store these constants so that the minifier can inline them
var GL_FRAMEBUFFER = 0x8D40;
var GL_RENDERBUFFER$1 = 0x8D41;

var GL_TEXTURE_2D$1 = 0x0DE1;
var GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 = 0x8515;

var GL_COLOR_ATTACHMENT0 = 0x8CE0;
var GL_DEPTH_ATTACHMENT = 0x8D00;
var GL_STENCIL_ATTACHMENT = 0x8D20;
var GL_DEPTH_STENCIL_ATTACHMENT = 0x821A;

var GL_FRAMEBUFFER_COMPLETE = 0x8CD5;
var GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 0x8CD6;
var GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 0x8CD7;
var GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 0x8CD9;
var GL_FRAMEBUFFER_UNSUPPORTED = 0x8CDD;

var GL_HALF_FLOAT_OES$2 = 0x8D61;
var GL_UNSIGNED_BYTE$5 = 0x1401;
var GL_FLOAT$4 = 0x1406;

var GL_RGBA$1 = 0x1908;

var GL_DEPTH_COMPONENT$1 = 0x1902;

var colorTextureFormatEnums = [
  GL_RGBA$1
];

// for every texture format, store
// the number of channels
var textureFormatChannels = [];
textureFormatChannels[GL_RGBA$1] = 4;

// for every texture type, store
// the size in bytes.
var textureTypeSizes = [];
textureTypeSizes[GL_UNSIGNED_BYTE$5] = 1;
textureTypeSizes[GL_FLOAT$4] = 4;
textureTypeSizes[GL_HALF_FLOAT_OES$2] = 2;

var GL_RGBA4$2 = 0x8056;
var GL_RGB5_A1$2 = 0x8057;
var GL_RGB565$2 = 0x8D62;
var GL_DEPTH_COMPONENT16$1 = 0x81A5;
var GL_STENCIL_INDEX8$1 = 0x8D48;
var GL_DEPTH_STENCIL$2 = 0x84F9;

var GL_SRGB8_ALPHA8_EXT$1 = 0x8C43;

var GL_RGBA32F_EXT$1 = 0x8814;

var GL_RGBA16F_EXT$1 = 0x881A;
var GL_RGB16F_EXT$1 = 0x881B;

var colorRenderbufferFormatEnums = [
  GL_RGBA4$2,
  GL_RGB5_A1$2,
  GL_RGB565$2,
  GL_SRGB8_ALPHA8_EXT$1,
  GL_RGBA16F_EXT$1,
  GL_RGB16F_EXT$1,
  GL_RGBA32F_EXT$1
];

var statusCode = {};
statusCode[GL_FRAMEBUFFER_COMPLETE] = 'complete';
statusCode[GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT] = 'incomplete attachment';
statusCode[GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS] = 'incomplete dimensions';
statusCode[GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT] = 'incomplete, missing attachment';
statusCode[GL_FRAMEBUFFER_UNSUPPORTED] = 'unsupported';

function wrapFBOState (
  gl,
  extensions,
  limits,
  textureState,
  renderbufferState,
  stats) {
  var framebufferState = {
    cur: null,
    next: null,
    dirty: false,
    setFBO: null
  };

  var colorTextureFormats = ['rgba'];
  var colorRenderbufferFormats = ['rgba4', 'rgb565', 'rgb5 a1'];

  if (extensions.ext_srgb) {
    colorRenderbufferFormats.push('srgba');
  }

  if (extensions.ext_color_buffer_half_float) {
    colorRenderbufferFormats.push('rgba16f', 'rgb16f');
  }

  if (extensions.webgl_color_buffer_float) {
    colorRenderbufferFormats.push('rgba32f');
  }

  var colorTypes = ['uint8'];
  if (extensions.oes_texture_half_float) {
    colorTypes.push('half float', 'float16');
  }
  if (extensions.oes_texture_float) {
    colorTypes.push('float', 'float32');
  }

  function FramebufferAttachment (target, texture, renderbuffer) {
    this.target = target;
    this.texture = texture;
    this.renderbuffer = renderbuffer;

    var w = 0;
    var h = 0;
    if (texture) {
      w = texture.width;
      h = texture.height;
    } else if (renderbuffer) {
      w = renderbuffer.width;
      h = renderbuffer.height;
    }
    this.width = w;
    this.height = h;
  }

  function decRef (attachment) {
    if (attachment) {
      if (attachment.texture) {
        attachment.texture._texture.decRef();
      }
      if (attachment.renderbuffer) {
        attachment.renderbuffer._renderbuffer.decRef();
      }
    }
  }

  function incRefAndCheckShape (attachment, width, height) {
    if (!attachment) {
      return
    }
    if (attachment.texture) {
      var texture = attachment.texture._texture;
      var tw = Math.max(1, texture.width);
      var th = Math.max(1, texture.height);
      check$1(tw === width && th === height,
        'inconsistent width/height for supplied texture');
      texture.refCount += 1;
    } else {
      var renderbuffer = attachment.renderbuffer._renderbuffer;
      check$1(
        renderbuffer.width === width && renderbuffer.height === height,
        'inconsistent width/height for renderbuffer');
      renderbuffer.refCount += 1;
    }
  }

  function attach (location, attachment) {
    if (attachment) {
      if (attachment.texture) {
        gl.framebufferTexture2D(
          GL_FRAMEBUFFER,
          location,
          attachment.target,
          attachment.texture._texture.texture,
          0);
      } else {
        gl.framebufferRenderbuffer(
          GL_FRAMEBUFFER,
          location,
          GL_RENDERBUFFER$1,
          attachment.renderbuffer._renderbuffer.renderbuffer);
      }
    }
  }

  function parseAttachment (attachment) {
    var target = GL_TEXTURE_2D$1;
    var texture = null;
    var renderbuffer = null;

    var data = attachment;
    if (typeof attachment === 'object') {
      data = attachment.data;
      if ('target' in attachment) {
        target = attachment.target | 0;
      }
    }

    check$1.type(data, 'function', 'invalid attachment data');

    var type = data._reglType;
    if (type === 'texture2d') {
      texture = data;
      check$1(target === GL_TEXTURE_2D$1);
    } else if (type === 'textureCube') {
      texture = data;
      check$1(
        target >= GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 &&
        target < GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + 6,
        'invalid cube map target');
    } else if (type === 'renderbuffer') {
      renderbuffer = data;
      target = GL_RENDERBUFFER$1;
    } else {
      check$1.raise('invalid regl object for attachment');
    }

    return new FramebufferAttachment(target, texture, renderbuffer)
  }

  function allocAttachment (
    width,
    height,
    isTexture,
    format,
    type) {
    if (isTexture) {
      var texture = textureState.create2D({
        width: width,
        height: height,
        format: format,
        type: type
      });
      texture._texture.refCount = 0;
      return new FramebufferAttachment(GL_TEXTURE_2D$1, texture, null)
    } else {
      var rb = renderbufferState.create({
        width: width,
        height: height,
        format: format
      });
      rb._renderbuffer.refCount = 0;
      return new FramebufferAttachment(GL_RENDERBUFFER$1, null, rb)
    }
  }

  function unwrapAttachment (attachment) {
    return attachment && (attachment.texture || attachment.renderbuffer)
  }

  function resizeAttachment (attachment, w, h) {
    if (attachment) {
      if (attachment.texture) {
        attachment.texture.resize(w, h);
      } else if (attachment.renderbuffer) {
        attachment.renderbuffer.resize(w, h);
      }
    }
  }

  var framebufferCount = 0;
  var framebufferSet = {};

  function REGLFramebuffer () {
    this.id = framebufferCount++;
    framebufferSet[this.id] = this;

    this.framebuffer = gl.createFramebuffer();
    this.width = 0;
    this.height = 0;

    this.colorAttachments = [];
    this.depthAttachment = null;
    this.stencilAttachment = null;
    this.depthStencilAttachment = null;
  }

  function decFBORefs (framebuffer) {
    framebuffer.colorAttachments.forEach(decRef);
    decRef(framebuffer.depthAttachment);
    decRef(framebuffer.stencilAttachment);
    decRef(framebuffer.depthStencilAttachment);
  }

  function destroy (framebuffer) {
    var handle = framebuffer.framebuffer;
    check$1(handle, 'must not double destroy framebuffer');
    gl.deleteFramebuffer(handle);
    framebuffer.framebuffer = null;
    stats.framebufferCount--;
    delete framebufferSet[framebuffer.id];
  }

  function updateFramebuffer (framebuffer) {
    var i;

    gl.bindFramebuffer(GL_FRAMEBUFFER, framebuffer.framebuffer);
    var colorAttachments = framebuffer.colorAttachments;
    for (i = 0; i < colorAttachments.length; ++i) {
      attach(GL_COLOR_ATTACHMENT0 + i, colorAttachments[i]);
    }
    for (i = colorAttachments.length; i < limits.maxColorAttachments; ++i) {
      gl.framebufferTexture2D(
        GL_FRAMEBUFFER,
        GL_COLOR_ATTACHMENT0 + i,
        GL_TEXTURE_2D$1,
        null,
        0);
    }

    gl.framebufferTexture2D(
      GL_FRAMEBUFFER,
      GL_DEPTH_STENCIL_ATTACHMENT,
      GL_TEXTURE_2D$1,
      null,
      0);
    gl.framebufferTexture2D(
      GL_FRAMEBUFFER,
      GL_DEPTH_ATTACHMENT,
      GL_TEXTURE_2D$1,
      null,
      0);
    gl.framebufferTexture2D(
      GL_FRAMEBUFFER,
      GL_STENCIL_ATTACHMENT,
      GL_TEXTURE_2D$1,
      null,
      0);

    attach(GL_DEPTH_ATTACHMENT, framebuffer.depthAttachment);
    attach(GL_STENCIL_ATTACHMENT, framebuffer.stencilAttachment);
    attach(GL_DEPTH_STENCIL_ATTACHMENT, framebuffer.depthStencilAttachment);

    // Check status code
    var status = gl.checkFramebufferStatus(GL_FRAMEBUFFER);
    if (status !== GL_FRAMEBUFFER_COMPLETE) {
      check$1.raise('framebuffer configuration not supported, status = ' +
        statusCode[status]);
    }

    gl.bindFramebuffer(GL_FRAMEBUFFER, framebufferState.next);
    framebufferState.cur = framebufferState.next;

    // FIXME: Clear error code here.  This is a work around for a bug in
    // headless-gl
    gl.getError();
  }

  function createFBO (a0, a1) {
    var framebuffer = new REGLFramebuffer();
    stats.framebufferCount++;

    function reglFramebuffer (a, b) {
      var i;

      check$1(framebufferState.next !== framebuffer,
        'can not update framebuffer which is currently in use');

      var extDrawBuffers = extensions.webgl_draw_buffers;

      var width = 0;
      var height = 0;

      var needsDepth = true;
      var needsStencil = true;

      var colorBuffer = null;
      var colorTexture = true;
      var colorFormat = 'rgba';
      var colorType = 'uint8';
      var colorCount = 1;

      var depthBuffer = null;
      var stencilBuffer = null;
      var depthStencilBuffer = null;
      var depthStencilTexture = false;

      if (typeof a === 'number') {
        width = a | 0;
        height = (b | 0) || width;
      } else if (!a) {
        width = height = 1;
      } else {
        check$1.type(a, 'object', 'invalid arguments for framebuffer');
        var options = a;

        if ('shape' in options) {
          var shape = options.shape;
          check$1(Array.isArray(shape) && shape.length >= 2,
            'invalid shape for framebuffer');
          width = shape[0];
          height = shape[1];
        } else {
          if ('radius' in options) {
            width = height = options.radius;
          }
          if ('width' in options) {
            width = options.width;
          }
          if ('height' in options) {
            height = options.height;
          }
        }

        if ('color' in options ||
            'colors' in options) {
          colorBuffer =
            options.color ||
            options.colors;
          if (Array.isArray(colorBuffer)) {
            check$1(
              colorBuffer.length === 1 || extDrawBuffers,
              'multiple render targets not supported');
          }
        }

        if (!colorBuffer) {
          if ('colorCount' in options) {
            colorCount = options.colorCount | 0;
            check$1(colorCount > 0, 'invalid color buffer count');
          }

          if ('colorTexture' in options) {
            colorTexture = !!options.colorTexture;
            colorFormat = 'rgba4';
          }

          if ('colorType' in options) {
            colorType = options.colorType;
            if (!colorTexture) {
              if (colorType === 'half float' || colorType === 'float16') {
                check$1(extensions.ext_color_buffer_half_float,
                  'you must enable EXT_color_buffer_half_float to use 16-bit render buffers');
                colorFormat = 'rgba16f';
              } else if (colorType === 'float' || colorType === 'float32') {
                check$1(extensions.webgl_color_buffer_float,
                  'you must enable WEBGL_color_buffer_float in order to use 32-bit floating point renderbuffers');
                colorFormat = 'rgba32f';
              }
            } else {
              check$1(extensions.oes_texture_float ||
                !(colorType === 'float' || colorType === 'float32'),
                'you must enable OES_texture_float in order to use floating point framebuffer objects');
              check$1(extensions.oes_texture_half_float ||
                !(colorType === 'half float' || colorType === 'float16'),
                'you must enable OES_texture_half_float in order to use 16-bit floating point framebuffer objects');
            }
            check$1.oneOf(colorType, colorTypes, 'invalid color type');
          }

          if ('colorFormat' in options) {
            colorFormat = options.colorFormat;
            if (colorTextureFormats.indexOf(colorFormat) >= 0) {
              colorTexture = true;
            } else if (colorRenderbufferFormats.indexOf(colorFormat) >= 0) {
              colorTexture = false;
            } else {
              if (colorTexture) {
                check$1.oneOf(
                  options.colorFormat, colorTextureFormats,
                  'invalid color format for texture');
              } else {
                check$1.oneOf(
                  options.colorFormat, colorRenderbufferFormats,
                  'invalid color format for renderbuffer');
              }
            }
          }
        }

        if ('depthTexture' in options || 'depthStencilTexture' in options) {
          depthStencilTexture = !!(options.depthTexture ||
            options.depthStencilTexture);
          check$1(!depthStencilTexture || extensions.webgl_depth_texture,
            'webgl_depth_texture extension not supported');
        }

        if ('depth' in options) {
          if (typeof options.depth === 'boolean') {
            needsDepth = options.depth;
          } else {
            depthBuffer = options.depth;
            needsStencil = false;
          }
        }

        if ('stencil' in options) {
          if (typeof options.stencil === 'boolean') {
            needsStencil = options.stencil;
          } else {
            stencilBuffer = options.stencil;
            needsDepth = false;
          }
        }

        if ('depthStencil' in options) {
          if (typeof options.depthStencil === 'boolean') {
            needsDepth = needsStencil = options.depthStencil;
          } else {
            depthStencilBuffer = options.depthStencil;
            needsDepth = false;
            needsStencil = false;
          }
        }
      }

      // parse attachments
      var colorAttachments = null;
      var depthAttachment = null;
      var stencilAttachment = null;
      var depthStencilAttachment = null;

      // Set up color attachments
      if (Array.isArray(colorBuffer)) {
        colorAttachments = colorBuffer.map(parseAttachment);
      } else if (colorBuffer) {
        colorAttachments = [parseAttachment(colorBuffer)];
      } else {
        colorAttachments = new Array(colorCount);
        for (i = 0; i < colorCount; ++i) {
          colorAttachments[i] = allocAttachment(
            width,
            height,
            colorTexture,
            colorFormat,
            colorType);
        }
      }

      check$1(extensions.webgl_draw_buffers || colorAttachments.length <= 1,
        'you must enable the WEBGL_draw_buffers extension in order to use multiple color buffers.');
      check$1(colorAttachments.length <= limits.maxColorAttachments,
        'too many color attachments, not supported');

      width = width || colorAttachments[0].width;
      height = height || colorAttachments[0].height;

      if (depthBuffer) {
        depthAttachment = parseAttachment(depthBuffer);
      } else if (needsDepth && !needsStencil) {
        depthAttachment = allocAttachment(
          width,
          height,
          depthStencilTexture,
          'depth',
          'uint32');
      }

      if (stencilBuffer) {
        stencilAttachment = parseAttachment(stencilBuffer);
      } else if (needsStencil && !needsDepth) {
        stencilAttachment = allocAttachment(
          width,
          height,
          false,
          'stencil',
          'uint8');
      }

      if (depthStencilBuffer) {
        depthStencilAttachment = parseAttachment(depthStencilBuffer);
      } else if (!depthBuffer && !stencilBuffer && needsStencil && needsDepth) {
        depthStencilAttachment = allocAttachment(
          width,
          height,
          depthStencilTexture,
          'depth stencil',
          'depth stencil');
      }

      check$1(
        (!!depthBuffer) + (!!stencilBuffer) + (!!depthStencilBuffer) <= 1,
        'invalid framebuffer configuration, can specify exactly one depth/stencil attachment');

      var commonColorAttachmentSize = null;

      for (i = 0; i < colorAttachments.length; ++i) {
        incRefAndCheckShape(colorAttachments[i], width, height);
        check$1(!colorAttachments[i] ||
          (colorAttachments[i].texture &&
            colorTextureFormatEnums.indexOf(colorAttachments[i].texture._texture.format) >= 0) ||
          (colorAttachments[i].renderbuffer &&
            colorRenderbufferFormatEnums.indexOf(colorAttachments[i].renderbuffer._renderbuffer.format) >= 0),
          'framebuffer color attachment ' + i + ' is invalid');

        if (colorAttachments[i] && colorAttachments[i].texture) {
          var colorAttachmentSize =
              textureFormatChannels[colorAttachments[i].texture._texture.format] *
              textureTypeSizes[colorAttachments[i].texture._texture.type];

          if (commonColorAttachmentSize === null) {
            commonColorAttachmentSize = colorAttachmentSize;
          } else {
            // We need to make sure that all color attachments have the same number of bitplanes
            // (that is, the same numer of bits per pixel)
            // This is required by the GLES2.0 standard. See the beginning of Chapter 4 in that document.
            check$1(commonColorAttachmentSize === colorAttachmentSize,
                  'all color attachments much have the same number of bits per pixel.');
          }
        }
      }
      incRefAndCheckShape(depthAttachment, width, height);
      check$1(!depthAttachment ||
        (depthAttachment.texture &&
          depthAttachment.texture._texture.format === GL_DEPTH_COMPONENT$1) ||
        (depthAttachment.renderbuffer &&
          depthAttachment.renderbuffer._renderbuffer.format === GL_DEPTH_COMPONENT16$1),
        'invalid depth attachment for framebuffer object');
      incRefAndCheckShape(stencilAttachment, width, height);
      check$1(!stencilAttachment ||
        (stencilAttachment.renderbuffer &&
          stencilAttachment.renderbuffer._renderbuffer.format === GL_STENCIL_INDEX8$1),
        'invalid stencil attachment for framebuffer object');
      incRefAndCheckShape(depthStencilAttachment, width, height);
      check$1(!depthStencilAttachment ||
        (depthStencilAttachment.texture &&
          depthStencilAttachment.texture._texture.format === GL_DEPTH_STENCIL$2) ||
        (depthStencilAttachment.renderbuffer &&
          depthStencilAttachment.renderbuffer._renderbuffer.format === GL_DEPTH_STENCIL$2),
        'invalid depth-stencil attachment for framebuffer object');

      // decrement references
      decFBORefs(framebuffer);

      framebuffer.width = width;
      framebuffer.height = height;

      framebuffer.colorAttachments = colorAttachments;
      framebuffer.depthAttachment = depthAttachment;
      framebuffer.stencilAttachment = stencilAttachment;
      framebuffer.depthStencilAttachment = depthStencilAttachment;

      reglFramebuffer.color = colorAttachments.map(unwrapAttachment);
      reglFramebuffer.depth = unwrapAttachment(depthAttachment);
      reglFramebuffer.stencil = unwrapAttachment(stencilAttachment);
      reglFramebuffer.depthStencil = unwrapAttachment(depthStencilAttachment);

      reglFramebuffer.width = framebuffer.width;
      reglFramebuffer.height = framebuffer.height;

      updateFramebuffer(framebuffer);

      return reglFramebuffer
    }

    function resize (w_, h_) {
      check$1(framebufferState.next !== framebuffer,
        'can not resize a framebuffer which is currently in use');

      var w = w_ | 0;
      var h = (h_ | 0) || w;
      if (w === framebuffer.width && h === framebuffer.height) {
        return reglFramebuffer
      }

      // resize all buffers
      var colorAttachments = framebuffer.colorAttachments;
      for (var i = 0; i < colorAttachments.length; ++i) {
        resizeAttachment(colorAttachments[i], w, h);
      }
      resizeAttachment(framebuffer.depthAttachment, w, h);
      resizeAttachment(framebuffer.stencilAttachment, w, h);
      resizeAttachment(framebuffer.depthStencilAttachment, w, h);

      framebuffer.width = reglFramebuffer.width = w;
      framebuffer.height = reglFramebuffer.height = h;

      updateFramebuffer(framebuffer);

      return reglFramebuffer
    }

    reglFramebuffer(a0, a1);

    return extend(reglFramebuffer, {
      resize: resize,
      _reglType: 'framebuffer',
      _framebuffer: framebuffer,
      destroy: function () {
        destroy(framebuffer);
        decFBORefs(framebuffer);
      },
      use: function (block) {
        framebufferState.setFBO({
          framebuffer: reglFramebuffer
        }, block);
      }
    })
  }

  function createCubeFBO (options) {
    var faces = Array(6);

    function reglFramebufferCube (a) {
      var i;

      check$1(faces.indexOf(framebufferState.next) < 0,
        'can not update framebuffer which is currently in use');

      var extDrawBuffers = extensions.webgl_draw_buffers;

      var params = {
        color: null
      };

      var radius = 0;

      var colorBuffer = null;
      var colorFormat = 'rgba';
      var colorType = 'uint8';
      var colorCount = 1;

      if (typeof a === 'number') {
        radius = a | 0;
      } else if (!a) {
        radius = 1;
      } else {
        check$1.type(a, 'object', 'invalid arguments for framebuffer');
        var options = a;

        if ('shape' in options) {
          var shape = options.shape;
          check$1(
            Array.isArray(shape) && shape.length >= 2,
            'invalid shape for framebuffer');
          check$1(
            shape[0] === shape[1],
            'cube framebuffer must be square');
          radius = shape[0];
        } else {
          if ('radius' in options) {
            radius = options.radius | 0;
          }
          if ('width' in options) {
            radius = options.width | 0;
            if ('height' in options) {
              check$1(options.height === radius, 'must be square');
            }
          } else if ('height' in options) {
            radius = options.height | 0;
          }
        }

        if ('color' in options ||
            'colors' in options) {
          colorBuffer =
            options.color ||
            options.colors;
          if (Array.isArray(colorBuffer)) {
            check$1(
              colorBuffer.length === 1 || extDrawBuffers,
              'multiple render targets not supported');
          }
        }

        if (!colorBuffer) {
          if ('colorCount' in options) {
            colorCount = options.colorCount | 0;
            check$1(colorCount > 0, 'invalid color buffer count');
          }

          if ('colorType' in options) {
            check$1.oneOf(
              options.colorType, colorTypes,
              'invalid color type');
            colorType = options.colorType;
          }

          if ('colorFormat' in options) {
            colorFormat = options.colorFormat;
            check$1.oneOf(
              options.colorFormat, colorTextureFormats,
              'invalid color format for texture');
          }
        }

        if ('depth' in options) {
          params.depth = options.depth;
        }

        if ('stencil' in options) {
          params.stencil = options.stencil;
        }

        if ('depthStencil' in options) {
          params.depthStencil = options.depthStencil;
        }
      }

      var colorCubes;
      if (colorBuffer) {
        if (Array.isArray(colorBuffer)) {
          colorCubes = [];
          for (i = 0; i < colorBuffer.length; ++i) {
            colorCubes[i] = colorBuffer[i];
          }
        } else {
          colorCubes = [ colorBuffer ];
        }
      } else {
        colorCubes = Array(colorCount);
        var cubeMapParams = {
          radius: radius,
          format: colorFormat,
          type: colorType
        };
        for (i = 0; i < colorCount; ++i) {
          colorCubes[i] = textureState.createCube(cubeMapParams);
        }
      }

      // Check color cubes
      params.color = Array(colorCubes.length);
      for (i = 0; i < colorCubes.length; ++i) {
        var cube = colorCubes[i];
        check$1(
          typeof cube === 'function' && cube._reglType === 'textureCube',
          'invalid cube map');
        radius = radius || cube.width;
        check$1(
          cube.width === radius && cube.height === radius,
          'invalid cube map shape');
        params.color[i] = {
          target: GL_TEXTURE_CUBE_MAP_POSITIVE_X$1,
          data: colorCubes[i]
        };
      }

      for (i = 0; i < 6; ++i) {
        for (var j = 0; j < colorCubes.length; ++j) {
          params.color[j].target = GL_TEXTURE_CUBE_MAP_POSITIVE_X$1 + i;
        }
        // reuse depth-stencil attachments across all cube maps
        if (i > 0) {
          params.depth = faces[0].depth;
          params.stencil = faces[0].stencil;
          params.depthStencil = faces[0].depthStencil;
        }
        if (faces[i]) {
          (faces[i])(params);
        } else {
          faces[i] = createFBO(params);
        }
      }

      return extend(reglFramebufferCube, {
        width: radius,
        height: radius,
        color: colorCubes
      })
    }

    function resize (radius_) {
      var i;
      var radius = radius_ | 0;
      check$1(radius > 0 && radius <= limits.maxCubeMapSize,
        'invalid radius for cube fbo');

      if (radius === reglFramebufferCube.width) {
        return reglFramebufferCube
      }

      var colors = reglFramebufferCube.color;
      for (i = 0; i < colors.length; ++i) {
        colors[i].resize(radius);
      }

      for (i = 0; i < 6; ++i) {
        faces[i].resize(radius);
      }

      reglFramebufferCube.width = reglFramebufferCube.height = radius;

      return reglFramebufferCube
    }

    reglFramebufferCube(options);

    return extend(reglFramebufferCube, {
      faces: faces,
      resize: resize,
      _reglType: 'framebufferCube',
      destroy: function () {
        faces.forEach(function (f) {
          f.destroy();
        });
      }
    })
  }

  function restoreFramebuffers () {
    values(framebufferSet).forEach(function (fb) {
      fb.framebuffer = gl.createFramebuffer();
      updateFramebuffer(fb);
    });
  }

  return extend(framebufferState, {
    getFramebuffer: function (object) {
      if (typeof object === 'function' && object._reglType === 'framebuffer') {
        var fbo = object._framebuffer;
        if (fbo instanceof REGLFramebuffer) {
          return fbo
        }
      }
      return null
    },
    create: createFBO,
    createCube: createCubeFBO,
    clear: function () {
      values(framebufferSet).forEach(destroy);
    },
    restore: restoreFramebuffers
  })
}

var GL_FLOAT$5 = 5126;

function AttributeRecord () {
  this.state = 0;

  this.x = 0.0;
  this.y = 0.0;
  this.z = 0.0;
  this.w = 0.0;

  this.buffer = null;
  this.size = 0;
  this.normalized = false;
  this.type = GL_FLOAT$5;
  this.offset = 0;
  this.stride = 0;
  this.divisor = 0;
}

function wrapAttributeState (
  gl,
  extensions,
  limits,
  bufferState,
  stringStore) {
  var NUM_ATTRIBUTES = limits.maxAttributes;
  var attributeBindings = new Array(NUM_ATTRIBUTES);
  for (var i = 0; i < NUM_ATTRIBUTES; ++i) {
    attributeBindings[i] = new AttributeRecord();
  }

  return {
    Record: AttributeRecord,
    scope: {},
    state: attributeBindings
  }
}

var GL_FRAGMENT_SHADER = 35632;
var GL_VERTEX_SHADER = 35633;

var GL_ACTIVE_UNIFORMS = 0x8B86;
var GL_ACTIVE_ATTRIBUTES = 0x8B89;

function wrapShaderState (gl, stringStore, stats, config) {
  // ===================================================
  // glsl compilation and linking
  // ===================================================
  var fragShaders = {};
  var vertShaders = {};

  function ActiveInfo (name, id, location, info) {
    this.name = name;
    this.id = id;
    this.location = location;
    this.info = info;
  }

  function insertActiveInfo (list, info) {
    for (var i = 0; i < list.length; ++i) {
      if (list[i].id === info.id) {
        list[i].location = info.location;
        return
      }
    }
    list.push(info);
  }

  function getShader (type, id, command) {
    var cache = type === GL_FRAGMENT_SHADER ? fragShaders : vertShaders;
    var shader = cache[id];

    if (!shader) {
      var source = stringStore.str(id);
      shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      check$1.shaderError(gl, shader, source, type, command);
      cache[id] = shader;
    }

    return shader
  }

  // ===================================================
  // program linking
  // ===================================================
  var programCache = {};
  var programList = [];

  var PROGRAM_COUNTER = 0;

  function REGLProgram (fragId, vertId) {
    this.id = PROGRAM_COUNTER++;
    this.fragId = fragId;
    this.vertId = vertId;
    this.program = null;
    this.uniforms = [];
    this.attributes = [];

    if (config.profile) {
      this.stats = {
        uniformsCount: 0,
        attributesCount: 0
      };
    }
  }

  function linkProgram (desc, command) {
    var i, info;

    // -------------------------------
    // compile & link
    // -------------------------------
    var fragShader = getShader(GL_FRAGMENT_SHADER, desc.fragId);
    var vertShader = getShader(GL_VERTEX_SHADER, desc.vertId);

    var program = desc.program = gl.createProgram();
    gl.attachShader(program, fragShader);
    gl.attachShader(program, vertShader);
    gl.linkProgram(program);
    check$1.linkError(
      gl,
      program,
      stringStore.str(desc.fragId),
      stringStore.str(desc.vertId),
      command);

    // -------------------------------
    // grab uniforms
    // -------------------------------
    var numUniforms = gl.getProgramParameter(program, GL_ACTIVE_UNIFORMS);
    if (config.profile) {
      desc.stats.uniformsCount = numUniforms;
    }
    var uniforms = desc.uniforms;
    for (i = 0; i < numUniforms; ++i) {
      info = gl.getActiveUniform(program, i);
      if (info) {
        if (info.size > 1) {
          for (var j = 0; j < info.size; ++j) {
            var name = info.name.replace('[0]', '[' + j + ']');
            insertActiveInfo(uniforms, new ActiveInfo(
              name,
              stringStore.id(name),
              gl.getUniformLocation(program, name),
              info));
          }
        } else {
          insertActiveInfo(uniforms, new ActiveInfo(
            info.name,
            stringStore.id(info.name),
            gl.getUniformLocation(program, info.name),
            info));
        }
      }
    }

    // -------------------------------
    // grab attributes
    // -------------------------------
    var numAttributes = gl.getProgramParameter(program, GL_ACTIVE_ATTRIBUTES);
    if (config.profile) {
      desc.stats.attributesCount = numAttributes;
    }

    var attributes = desc.attributes;
    for (i = 0; i < numAttributes; ++i) {
      info = gl.getActiveAttrib(program, i);
      if (info) {
        insertActiveInfo(attributes, new ActiveInfo(
          info.name,
          stringStore.id(info.name),
          gl.getAttribLocation(program, info.name),
          info));
      }
    }
  }

  if (config.profile) {
    stats.getMaxUniformsCount = function () {
      var m = 0;
      programList.forEach(function (desc) {
        if (desc.stats.uniformsCount > m) {
          m = desc.stats.uniformsCount;
        }
      });
      return m
    };

    stats.getMaxAttributesCount = function () {
      var m = 0;
      programList.forEach(function (desc) {
        if (desc.stats.attributesCount > m) {
          m = desc.stats.attributesCount;
        }
      });
      return m
    };
  }

  function restoreShaders () {
    fragShaders = {};
    vertShaders = {};
    for (var i = 0; i < programList.length; ++i) {
      linkProgram(programList[i]);
    }
  }

  return {
    clear: function () {
      var deleteShader = gl.deleteShader.bind(gl);
      values(fragShaders).forEach(deleteShader);
      fragShaders = {};
      values(vertShaders).forEach(deleteShader);
      vertShaders = {};

      programList.forEach(function (desc) {
        gl.deleteProgram(desc.program);
      });
      programList.length = 0;
      programCache = {};

      stats.shaderCount = 0;
    },

    program: function (vertId, fragId, command) {
      check$1.command(vertId >= 0, 'missing vertex shader', command);
      check$1.command(fragId >= 0, 'missing fragment shader', command);

      var cache = programCache[fragId];
      if (!cache) {
        cache = programCache[fragId] = {};
      }
      var program = cache[vertId];
      if (!program) {
        program = new REGLProgram(fragId, vertId);
        stats.shaderCount++;

        linkProgram(program, command);
        cache[vertId] = program;
        programList.push(program);
      }
      return program
    },

    restore: restoreShaders,

    shader: getShader,

    frag: -1,
    vert: -1
  }
}

var GL_RGBA$2 = 6408;
var GL_UNSIGNED_BYTE$6 = 5121;
var GL_PACK_ALIGNMENT = 0x0D05;
var GL_FLOAT$6 = 0x1406; // 5126

function wrapReadPixels (
  gl,
  framebufferState,
  reglPoll,
  context,
  glAttributes,
  extensions) {
  function readPixelsImpl (input) {
    var type;
    if (framebufferState.next === null) {
      check$1(
        glAttributes.preserveDrawingBuffer,
        'you must create a webgl context with "preserveDrawingBuffer":true in order to read pixels from the drawing buffer');
      type = GL_UNSIGNED_BYTE$6;
    } else {
      check$1(
        framebufferState.next.colorAttachments[0].texture !== null,
          'You cannot read from a renderbuffer');
      type = framebufferState.next.colorAttachments[0].texture._texture.type;

      if (extensions.oes_texture_float) {
        check$1(
          type === GL_UNSIGNED_BYTE$6 || type === GL_FLOAT$6,
          'Reading from a framebuffer is only allowed for the types \'uint8\' and \'float\'');
      } else {
        check$1(
          type === GL_UNSIGNED_BYTE$6,
          'Reading from a framebuffer is only allowed for the type \'uint8\'');
      }
    }

    var x = 0;
    var y = 0;
    var width = context.framebufferWidth;
    var height = context.framebufferHeight;
    var data = null;

    if (isTypedArray(input)) {
      data = input;
    } else if (input) {
      check$1.type(input, 'object', 'invalid arguments to regl.read()');
      x = input.x | 0;
      y = input.y | 0;
      check$1(
        x >= 0 && x < context.framebufferWidth,
        'invalid x offset for regl.read');
      check$1(
        y >= 0 && y < context.framebufferHeight,
        'invalid y offset for regl.read');
      width = (input.width || (context.framebufferWidth - x)) | 0;
      height = (input.height || (context.framebufferHeight - y)) | 0;
      data = input.data || null;
    }

    // sanity check input.data
    if (data) {
      if (type === GL_UNSIGNED_BYTE$6) {
        check$1(
          data instanceof Uint8Array,
          'buffer must be \'Uint8Array\' when reading from a framebuffer of type \'uint8\'');
      } else if (type === GL_FLOAT$6) {
        check$1(
          data instanceof Float32Array,
          'buffer must be \'Float32Array\' when reading from a framebuffer of type \'float\'');
      }
    }

    check$1(
      width > 0 && width + x <= context.framebufferWidth,
      'invalid width for read pixels');
    check$1(
      height > 0 && height + y <= context.framebufferHeight,
      'invalid height for read pixels');

    // Update WebGL state
    reglPoll();

    // Compute size
    var size = width * height * 4;

    // Allocate data
    if (!data) {
      if (type === GL_UNSIGNED_BYTE$6) {
        data = new Uint8Array(size);
      } else if (type === GL_FLOAT$6) {
        data = data || new Float32Array(size);
      }
    }

    // Type check
    check$1.isTypedArray(data, 'data buffer for regl.read() must be a typedarray');
    check$1(data.byteLength >= size, 'data buffer for regl.read() too small');

    // Run read pixels
    gl.pixelStorei(GL_PACK_ALIGNMENT, 4);
    gl.readPixels(x, y, width, height, GL_RGBA$2,
                  type,
                  data);

    return data
  }

  function readPixelsFBO (options) {
    var result;
    framebufferState.setFBO({
      framebuffer: options.framebuffer
    }, function () {
      result = readPixelsImpl(options);
    });
    return result
  }

  function readPixels (options) {
    if (!options || !('framebuffer' in options)) {
      return readPixelsImpl(options)
    } else {
      return readPixelsFBO(options)
    }
  }

  return readPixels
}

function slice (x) {
  return Array.prototype.slice.call(x)
}

function join (x) {
  return slice(x).join('')
}

function createEnvironment () {
  // Unique variable id counter
  var varCounter = 0;

  // Linked values are passed from this scope into the generated code block
  // Calling link() passes a value into the generated scope and returns
  // the variable name which it is bound to
  var linkedNames = [];
  var linkedValues = [];
  function link (value) {
    for (var i = 0; i < linkedValues.length; ++i) {
      if (linkedValues[i] === value) {
        return linkedNames[i]
      }
    }

    var name = 'g' + (varCounter++);
    linkedNames.push(name);
    linkedValues.push(value);
    return name
  }

  // create a code block
  function block () {
    var code = [];
    function push () {
      code.push.apply(code, slice(arguments));
    }

    var vars = [];
    function def () {
      var name = 'v' + (varCounter++);
      vars.push(name);

      if (arguments.length > 0) {
        code.push(name, '=');
        code.push.apply(code, slice(arguments));
        code.push(';');
      }

      return name
    }

    return extend(push, {
      def: def,
      toString: function () {
        return join([
          (vars.length > 0 ? 'var ' + vars + ';' : ''),
          join(code)
        ])
      }
    })
  }

  function scope () {
    var entry = block();
    var exit = block();

    var entryToString = entry.toString;
    var exitToString = exit.toString;

    function save (object, prop) {
      exit(object, prop, '=', entry.def(object, prop), ';');
    }

    return extend(function () {
      entry.apply(entry, slice(arguments));
    }, {
      def: entry.def,
      entry: entry,
      exit: exit,
      save: save,
      set: function (object, prop, value) {
        save(object, prop);
        entry(object, prop, '=', value, ';');
      },
      toString: function () {
        return entryToString() + exitToString()
      }
    })
  }

  function conditional () {
    var pred = join(arguments);
    var thenBlock = scope();
    var elseBlock = scope();

    var thenToString = thenBlock.toString;
    var elseToString = elseBlock.toString;

    return extend(thenBlock, {
      then: function () {
        thenBlock.apply(thenBlock, slice(arguments));
        return this
      },
      else: function () {
        elseBlock.apply(elseBlock, slice(arguments));
        return this
      },
      toString: function () {
        var elseClause = elseToString();
        if (elseClause) {
          elseClause = 'else{' + elseClause + '}';
        }
        return join([
          'if(', pred, '){',
          thenToString(),
          '}', elseClause
        ])
      }
    })
  }

  // procedure list
  var globalBlock = block();
  var procedures = {};
  function proc (name, count) {
    var args = [];
    function arg () {
      var name = 'a' + args.length;
      args.push(name);
      return name
    }

    count = count || 0;
    for (var i = 0; i < count; ++i) {
      arg();
    }

    var body = scope();
    var bodyToString = body.toString;

    var result = procedures[name] = extend(body, {
      arg: arg,
      toString: function () {
        return join([
          'function(', args.join(), '){',
          bodyToString(),
          '}'
        ])
      }
    });

    return result
  }

  function compile () {
    var code = ['"use strict";',
      globalBlock,
      'return {'];
    Object.keys(procedures).forEach(function (name) {
      code.push('"', name, '":', procedures[name].toString(), ',');
    });
    code.push('}');
    var src = join(code)
      .replace(/;/g, ';\n')
      .replace(/}/g, '}\n')
      .replace(/{/g, '{\n');
    var proc = Function.apply(null, linkedNames.concat(src));
    return proc.apply(null, linkedValues)
  }

  return {
    global: globalBlock,
    link: link,
    block: block,
    proc: proc,
    scope: scope,
    cond: conditional,
    compile: compile
  }
}

// "cute" names for vector components
var CUTE_COMPONENTS = 'xyzw'.split('');

var GL_UNSIGNED_BYTE$7 = 5121;

var ATTRIB_STATE_POINTER = 1;
var ATTRIB_STATE_CONSTANT = 2;

var DYN_FUNC$1 = 0;
var DYN_PROP$1 = 1;
var DYN_CONTEXT$1 = 2;
var DYN_STATE$1 = 3;
var DYN_THUNK = 4;

var S_DITHER = 'dither';
var S_BLEND_ENABLE = 'blend.enable';
var S_BLEND_COLOR = 'blend.color';
var S_BLEND_EQUATION = 'blend.equation';
var S_BLEND_FUNC = 'blend.func';
var S_DEPTH_ENABLE = 'depth.enable';
var S_DEPTH_FUNC = 'depth.func';
var S_DEPTH_RANGE = 'depth.range';
var S_DEPTH_MASK = 'depth.mask';
var S_COLOR_MASK = 'colorMask';
var S_CULL_ENABLE = 'cull.enable';
var S_CULL_FACE = 'cull.face';
var S_FRONT_FACE = 'frontFace';
var S_LINE_WIDTH = 'lineWidth';
var S_POLYGON_OFFSET_ENABLE = 'polygonOffset.enable';
var S_POLYGON_OFFSET_OFFSET = 'polygonOffset.offset';
var S_SAMPLE_ALPHA = 'sample.alpha';
var S_SAMPLE_ENABLE = 'sample.enable';
var S_SAMPLE_COVERAGE = 'sample.coverage';
var S_STENCIL_ENABLE = 'stencil.enable';
var S_STENCIL_MASK = 'stencil.mask';
var S_STENCIL_FUNC = 'stencil.func';
var S_STENCIL_OPFRONT = 'stencil.opFront';
var S_STENCIL_OPBACK = 'stencil.opBack';
var S_SCISSOR_ENABLE = 'scissor.enable';
var S_SCISSOR_BOX = 'scissor.box';
var S_VIEWPORT = 'viewport';

var S_PROFILE = 'profile';

var S_FRAMEBUFFER = 'framebuffer';
var S_VERT = 'vert';
var S_FRAG = 'frag';
var S_ELEMENTS = 'elements';
var S_PRIMITIVE = 'primitive';
var S_COUNT = 'count';
var S_OFFSET = 'offset';
var S_INSTANCES = 'instances';

var SUFFIX_WIDTH = 'Width';
var SUFFIX_HEIGHT = 'Height';

var S_FRAMEBUFFER_WIDTH = S_FRAMEBUFFER + SUFFIX_WIDTH;
var S_FRAMEBUFFER_HEIGHT = S_FRAMEBUFFER + SUFFIX_HEIGHT;
var S_VIEWPORT_WIDTH = S_VIEWPORT + SUFFIX_WIDTH;
var S_VIEWPORT_HEIGHT = S_VIEWPORT + SUFFIX_HEIGHT;
var S_DRAWINGBUFFER = 'drawingBuffer';
var S_DRAWINGBUFFER_WIDTH = S_DRAWINGBUFFER + SUFFIX_WIDTH;
var S_DRAWINGBUFFER_HEIGHT = S_DRAWINGBUFFER + SUFFIX_HEIGHT;

var NESTED_OPTIONS = [
  S_BLEND_FUNC,
  S_BLEND_EQUATION,
  S_STENCIL_FUNC,
  S_STENCIL_OPFRONT,
  S_STENCIL_OPBACK,
  S_SAMPLE_COVERAGE,
  S_VIEWPORT,
  S_SCISSOR_BOX,
  S_POLYGON_OFFSET_OFFSET
];

var GL_ARRAY_BUFFER$1 = 34962;
var GL_ELEMENT_ARRAY_BUFFER$1 = 34963;

var GL_FRAGMENT_SHADER$1 = 35632;
var GL_VERTEX_SHADER$1 = 35633;

var GL_TEXTURE_2D$2 = 0x0DE1;
var GL_TEXTURE_CUBE_MAP$1 = 0x8513;

var GL_CULL_FACE = 0x0B44;
var GL_BLEND = 0x0BE2;
var GL_DITHER = 0x0BD0;
var GL_STENCIL_TEST = 0x0B90;
var GL_DEPTH_TEST = 0x0B71;
var GL_SCISSOR_TEST = 0x0C11;
var GL_POLYGON_OFFSET_FILL = 0x8037;
var GL_SAMPLE_ALPHA_TO_COVERAGE = 0x809E;
var GL_SAMPLE_COVERAGE = 0x80A0;

var GL_FLOAT$7 = 5126;
var GL_FLOAT_VEC2 = 35664;
var GL_FLOAT_VEC3 = 35665;
var GL_FLOAT_VEC4 = 35666;
var GL_INT$3 = 5124;
var GL_INT_VEC2 = 35667;
var GL_INT_VEC3 = 35668;
var GL_INT_VEC4 = 35669;
var GL_BOOL = 35670;
var GL_BOOL_VEC2 = 35671;
var GL_BOOL_VEC3 = 35672;
var GL_BOOL_VEC4 = 35673;
var GL_FLOAT_MAT2 = 35674;
var GL_FLOAT_MAT3 = 35675;
var GL_FLOAT_MAT4 = 35676;
var GL_SAMPLER_2D = 35678;
var GL_SAMPLER_CUBE = 35680;

var GL_TRIANGLES$1 = 4;

var GL_FRONT = 1028;
var GL_BACK = 1029;
var GL_CW = 0x0900;
var GL_CCW = 0x0901;
var GL_MIN_EXT = 0x8007;
var GL_MAX_EXT = 0x8008;
var GL_ALWAYS = 519;
var GL_KEEP = 7680;
var GL_ZERO = 0;
var GL_ONE = 1;
var GL_FUNC_ADD = 0x8006;
var GL_LESS = 513;

var GL_FRAMEBUFFER$1 = 0x8D40;
var GL_COLOR_ATTACHMENT0$1 = 0x8CE0;

var blendFuncs = {
  '0': 0,
  '1': 1,
  'zero': 0,
  'one': 1,
  'src color': 768,
  'one minus src color': 769,
  'src alpha': 770,
  'one minus src alpha': 771,
  'dst color': 774,
  'one minus dst color': 775,
  'dst alpha': 772,
  'one minus dst alpha': 773,
  'constant color': 32769,
  'one minus constant color': 32770,
  'constant alpha': 32771,
  'one minus constant alpha': 32772,
  'src alpha saturate': 776
};

// There are invalid values for srcRGB and dstRGB. See:
// https://www.khronos.org/registry/webgl/specs/1.0/#6.13
// https://github.com/KhronosGroup/WebGL/blob/0d3201f5f7ec3c0060bc1f04077461541f1987b9/conformance-suites/1.0.3/conformance/misc/webgl-specific.html#L56
var invalidBlendCombinations = [
  'constant color, constant alpha',
  'one minus constant color, constant alpha',
  'constant color, one minus constant alpha',
  'one minus constant color, one minus constant alpha',
  'constant alpha, constant color',
  'constant alpha, one minus constant color',
  'one minus constant alpha, constant color',
  'one minus constant alpha, one minus constant color'
];

var compareFuncs = {
  'never': 512,
  'less': 513,
  '<': 513,
  'equal': 514,
  '=': 514,
  '==': 514,
  '===': 514,
  'lequal': 515,
  '<=': 515,
  'greater': 516,
  '>': 516,
  'notequal': 517,
  '!=': 517,
  '!==': 517,
  'gequal': 518,
  '>=': 518,
  'always': 519
};

var stencilOps = {
  '0': 0,
  'zero': 0,
  'keep': 7680,
  'replace': 7681,
  'increment': 7682,
  'decrement': 7683,
  'increment wrap': 34055,
  'decrement wrap': 34056,
  'invert': 5386
};

var shaderType = {
  'frag': GL_FRAGMENT_SHADER$1,
  'vert': GL_VERTEX_SHADER$1
};

var orientationType = {
  'cw': GL_CW,
  'ccw': GL_CCW
};

function isBufferArgs (x) {
  return Array.isArray(x) ||
    isTypedArray(x) ||
    isNDArrayLike(x)
}

// Make sure viewport is processed first
function sortState (state) {
  return state.sort(function (a, b) {
    if (a === S_VIEWPORT) {
      return -1
    } else if (b === S_VIEWPORT) {
      return 1
    }
    return (a < b) ? -1 : 1
  })
}

function Declaration (thisDep, contextDep, propDep, append) {
  this.thisDep = thisDep;
  this.contextDep = contextDep;
  this.propDep = propDep;
  this.append = append;
}

function isStatic (decl) {
  return decl && !(decl.thisDep || decl.contextDep || decl.propDep)
}

function createStaticDecl (append) {
  return new Declaration(false, false, false, append)
}

function createDynamicDecl (dyn, append) {
  var type = dyn.type;
  if (type === DYN_FUNC$1) {
    var numArgs = dyn.data.length;
    return new Declaration(
      true,
      numArgs >= 1,
      numArgs >= 2,
      append)
  } else if (type === DYN_THUNK) {
    var data = dyn.data;
    return new Declaration(
      data.thisDep,
      data.contextDep,
      data.propDep,
      append)
  } else {
    return new Declaration(
      type === DYN_STATE$1,
      type === DYN_CONTEXT$1,
      type === DYN_PROP$1,
      append)
  }
}

var SCOPE_DECL = new Declaration(false, false, false, function () {});

function reglCore (
  gl,
  stringStore,
  extensions,
  limits,
  bufferState,
  elementState,
  textureState,
  framebufferState,
  uniformState,
  attributeState,
  shaderState,
  drawState,
  contextState,
  timer,
  config) {
  var AttributeRecord = attributeState.Record;

  var blendEquations = {
    'add': 32774,
    'subtract': 32778,
    'reverse subtract': 32779
  };
  if (extensions.ext_blend_minmax) {
    blendEquations.min = GL_MIN_EXT;
    blendEquations.max = GL_MAX_EXT;
  }

  var extInstancing = extensions.angle_instanced_arrays;
  var extDrawBuffers = extensions.webgl_draw_buffers;

  // ===================================================
  // ===================================================
  // WEBGL STATE
  // ===================================================
  // ===================================================
  var currentState = {
    dirty: true,
    profile: config.profile
  };
  var nextState = {};
  var GL_STATE_NAMES = [];
  var GL_FLAGS = {};
  var GL_VARIABLES = {};

  function propName (name) {
    return name.replace('.', '_')
  }

  function stateFlag (sname, cap, init) {
    var name = propName(sname);
    GL_STATE_NAMES.push(sname);
    nextState[name] = currentState[name] = !!init;
    GL_FLAGS[name] = cap;
  }

  function stateVariable (sname, func, init) {
    var name = propName(sname);
    GL_STATE_NAMES.push(sname);
    if (Array.isArray(init)) {
      currentState[name] = init.slice();
      nextState[name] = init.slice();
    } else {
      currentState[name] = nextState[name] = init;
    }
    GL_VARIABLES[name] = func;
  }

  // Dithering
  stateFlag(S_DITHER, GL_DITHER);

  // Blending
  stateFlag(S_BLEND_ENABLE, GL_BLEND);
  stateVariable(S_BLEND_COLOR, 'blendColor', [0, 0, 0, 0]);
  stateVariable(S_BLEND_EQUATION, 'blendEquationSeparate',
    [GL_FUNC_ADD, GL_FUNC_ADD]);
  stateVariable(S_BLEND_FUNC, 'blendFuncSeparate',
    [GL_ONE, GL_ZERO, GL_ONE, GL_ZERO]);

  // Depth
  stateFlag(S_DEPTH_ENABLE, GL_DEPTH_TEST, true);
  stateVariable(S_DEPTH_FUNC, 'depthFunc', GL_LESS);
  stateVariable(S_DEPTH_RANGE, 'depthRange', [0, 1]);
  stateVariable(S_DEPTH_MASK, 'depthMask', true);

  // Color mask
  stateVariable(S_COLOR_MASK, S_COLOR_MASK, [true, true, true, true]);

  // Face culling
  stateFlag(S_CULL_ENABLE, GL_CULL_FACE);
  stateVariable(S_CULL_FACE, 'cullFace', GL_BACK);

  // Front face orientation
  stateVariable(S_FRONT_FACE, S_FRONT_FACE, GL_CCW);

  // Line width
  stateVariable(S_LINE_WIDTH, S_LINE_WIDTH, 1);

  // Polygon offset
  stateFlag(S_POLYGON_OFFSET_ENABLE, GL_POLYGON_OFFSET_FILL);
  stateVariable(S_POLYGON_OFFSET_OFFSET, 'polygonOffset', [0, 0]);

  // Sample coverage
  stateFlag(S_SAMPLE_ALPHA, GL_SAMPLE_ALPHA_TO_COVERAGE);
  stateFlag(S_SAMPLE_ENABLE, GL_SAMPLE_COVERAGE);
  stateVariable(S_SAMPLE_COVERAGE, 'sampleCoverage', [1, false]);

  // Stencil
  stateFlag(S_STENCIL_ENABLE, GL_STENCIL_TEST);
  stateVariable(S_STENCIL_MASK, 'stencilMask', -1);
  stateVariable(S_STENCIL_FUNC, 'stencilFunc', [GL_ALWAYS, 0, -1]);
  stateVariable(S_STENCIL_OPFRONT, 'stencilOpSeparate',
    [GL_FRONT, GL_KEEP, GL_KEEP, GL_KEEP]);
  stateVariable(S_STENCIL_OPBACK, 'stencilOpSeparate',
    [GL_BACK, GL_KEEP, GL_KEEP, GL_KEEP]);

  // Scissor
  stateFlag(S_SCISSOR_ENABLE, GL_SCISSOR_TEST);
  stateVariable(S_SCISSOR_BOX, 'scissor',
    [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]);

  // Viewport
  stateVariable(S_VIEWPORT, S_VIEWPORT,
    [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]);

  // ===================================================
  // ===================================================
  // ENVIRONMENT
  // ===================================================
  // ===================================================
  var sharedState = {
    gl: gl,
    context: contextState,
    strings: stringStore,
    next: nextState,
    current: currentState,
    draw: drawState,
    elements: elementState,
    buffer: bufferState,
    shader: shaderState,
    attributes: attributeState.state,
    uniforms: uniformState,
    framebuffer: framebufferState,
    extensions: extensions,

    timer: timer,
    isBufferArgs: isBufferArgs
  };

  var sharedConstants = {
    primTypes: primTypes,
    compareFuncs: compareFuncs,
    blendFuncs: blendFuncs,
    blendEquations: blendEquations,
    stencilOps: stencilOps,
    glTypes: glTypes,
    orientationType: orientationType
  };

  check$1.optional(function () {
    sharedState.isArrayLike = isArrayLike;
  });

  if (extDrawBuffers) {
    sharedConstants.backBuffer = [GL_BACK];
    sharedConstants.drawBuffer = loop(limits.maxDrawbuffers, function (i) {
      if (i === 0) {
        return [0]
      }
      return loop(i, function (j) {
        return GL_COLOR_ATTACHMENT0$1 + j
      })
    });
  }

  var drawCallCounter = 0;
  function createREGLEnvironment () {
    var env = createEnvironment();
    var link = env.link;
    var global = env.global;
    env.id = drawCallCounter++;

    env.batchId = '0';

    // link shared state
    var SHARED = link(sharedState);
    var shared = env.shared = {
      props: 'a0'
    };
    Object.keys(sharedState).forEach(function (prop) {
      shared[prop] = global.def(SHARED, '.', prop);
    });

    // Inject runtime assertion stuff for debug builds
    check$1.optional(function () {
      env.CHECK = link(check$1);
      env.commandStr = check$1.guessCommand();
      env.command = link(env.commandStr);
      env.assert = function (block, pred, message) {
        block(
          'if(!(', pred, '))',
          this.CHECK, '.commandRaise(', link(message), ',', this.command, ');');
      };

      sharedConstants.invalidBlendCombinations = invalidBlendCombinations;
    });

    // Copy GL state variables over
    var nextVars = env.next = {};
    var currentVars = env.current = {};
    Object.keys(GL_VARIABLES).forEach(function (variable) {
      if (Array.isArray(currentState[variable])) {
        nextVars[variable] = global.def(shared.next, '.', variable);
        currentVars[variable] = global.def(shared.current, '.', variable);
      }
    });

    // Initialize shared constants
    var constants = env.constants = {};
    Object.keys(sharedConstants).forEach(function (name) {
      constants[name] = global.def(JSON.stringify(sharedConstants[name]));
    });

    // Helper function for calling a block
    env.invoke = function (block, x) {
      switch (x.type) {
        case DYN_FUNC$1:
          var argList = [
            'this',
            shared.context,
            shared.props,
            env.batchId
          ];
          return block.def(
            link(x.data), '.call(',
              argList.slice(0, Math.max(x.data.length + 1, 4)),
             ')')
        case DYN_PROP$1:
          return block.def(shared.props, x.data)
        case DYN_CONTEXT$1:
          return block.def(shared.context, x.data)
        case DYN_STATE$1:
          return block.def('this', x.data)
        case DYN_THUNK:
          x.data.append(env, block);
          return x.data.ref
      }
    };

    env.attribCache = {};

    var scopeAttribs = {};
    env.scopeAttrib = function (name) {
      var id = stringStore.id(name);
      if (id in scopeAttribs) {
        return scopeAttribs[id]
      }
      var binding = attributeState.scope[id];
      if (!binding) {
        binding = attributeState.scope[id] = new AttributeRecord();
      }
      var result = scopeAttribs[id] = link(binding);
      return result
    };

    return env
  }

  // ===================================================
  // ===================================================
  // PARSING
  // ===================================================
  // ===================================================
  function parseProfile (options) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    var profileEnable;
    if (S_PROFILE in staticOptions) {
      var value = !!staticOptions[S_PROFILE];
      profileEnable = createStaticDecl(function (env, scope) {
        return value
      });
      profileEnable.enable = value;
    } else if (S_PROFILE in dynamicOptions) {
      var dyn = dynamicOptions[S_PROFILE];
      profileEnable = createDynamicDecl(dyn, function (env, scope) {
        return env.invoke(scope, dyn)
      });
    }

    return profileEnable
  }

  function parseFramebuffer (options, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    if (S_FRAMEBUFFER in staticOptions) {
      var framebuffer = staticOptions[S_FRAMEBUFFER];
      if (framebuffer) {
        framebuffer = framebufferState.getFramebuffer(framebuffer);
        check$1.command(framebuffer, 'invalid framebuffer object');
        return createStaticDecl(function (env, block) {
          var FRAMEBUFFER = env.link(framebuffer);
          var shared = env.shared;
          block.set(
            shared.framebuffer,
            '.next',
            FRAMEBUFFER);
          var CONTEXT = shared.context;
          block.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_WIDTH,
            FRAMEBUFFER + '.width');
          block.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_HEIGHT,
            FRAMEBUFFER + '.height');
          return FRAMEBUFFER
        })
      } else {
        return createStaticDecl(function (env, scope) {
          var shared = env.shared;
          scope.set(
            shared.framebuffer,
            '.next',
            'null');
          var CONTEXT = shared.context;
          scope.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_WIDTH,
            CONTEXT + '.' + S_DRAWINGBUFFER_WIDTH);
          scope.set(
            CONTEXT,
            '.' + S_FRAMEBUFFER_HEIGHT,
            CONTEXT + '.' + S_DRAWINGBUFFER_HEIGHT);
          return 'null'
        })
      }
    } else if (S_FRAMEBUFFER in dynamicOptions) {
      var dyn = dynamicOptions[S_FRAMEBUFFER];
      return createDynamicDecl(dyn, function (env, scope) {
        var FRAMEBUFFER_FUNC = env.invoke(scope, dyn);
        var shared = env.shared;
        var FRAMEBUFFER_STATE = shared.framebuffer;
        var FRAMEBUFFER = scope.def(
          FRAMEBUFFER_STATE, '.getFramebuffer(', FRAMEBUFFER_FUNC, ')');

        check$1.optional(function () {
          env.assert(scope,
            '!' + FRAMEBUFFER_FUNC + '||' + FRAMEBUFFER,
            'invalid framebuffer object');
        });

        scope.set(
          FRAMEBUFFER_STATE,
          '.next',
          FRAMEBUFFER);
        var CONTEXT = shared.context;
        scope.set(
          CONTEXT,
          '.' + S_FRAMEBUFFER_WIDTH,
          FRAMEBUFFER + '?' + FRAMEBUFFER + '.width:' +
          CONTEXT + '.' + S_DRAWINGBUFFER_WIDTH);
        scope.set(
          CONTEXT,
          '.' + S_FRAMEBUFFER_HEIGHT,
          FRAMEBUFFER +
          '?' + FRAMEBUFFER + '.height:' +
          CONTEXT + '.' + S_DRAWINGBUFFER_HEIGHT);
        return FRAMEBUFFER
      })
    } else {
      return null
    }
  }

  function parseViewportScissor (options, framebuffer, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    function parseBox (param) {
      if (param in staticOptions) {
        var box = staticOptions[param];
        check$1.commandType(box, 'object', 'invalid ' + param, env.commandStr);

        var isStatic = true;
        var x = box.x | 0;
        var y = box.y | 0;
        var w, h;
        if ('width' in box) {
          w = box.width | 0;
          check$1.command(w >= 0, 'invalid ' + param, env.commandStr);
        } else {
          isStatic = false;
        }
        if ('height' in box) {
          h = box.height | 0;
          check$1.command(h >= 0, 'invalid ' + param, env.commandStr);
        } else {
          isStatic = false;
        }

        return new Declaration(
          !isStatic && framebuffer && framebuffer.thisDep,
          !isStatic && framebuffer && framebuffer.contextDep,
          !isStatic && framebuffer && framebuffer.propDep,
          function (env, scope) {
            var CONTEXT = env.shared.context;
            var BOX_W = w;
            if (!('width' in box)) {
              BOX_W = scope.def(CONTEXT, '.', S_FRAMEBUFFER_WIDTH, '-', x);
            }
            var BOX_H = h;
            if (!('height' in box)) {
              BOX_H = scope.def(CONTEXT, '.', S_FRAMEBUFFER_HEIGHT, '-', y);
            }
            return [x, y, BOX_W, BOX_H]
          })
      } else if (param in dynamicOptions) {
        var dynBox = dynamicOptions[param];
        var result = createDynamicDecl(dynBox, function (env, scope) {
          var BOX = env.invoke(scope, dynBox);

          check$1.optional(function () {
            env.assert(scope,
              BOX + '&&typeof ' + BOX + '==="object"',
              'invalid ' + param);
          });

          var CONTEXT = env.shared.context;
          var BOX_X = scope.def(BOX, '.x|0');
          var BOX_Y = scope.def(BOX, '.y|0');
          var BOX_W = scope.def(
            '"width" in ', BOX, '?', BOX, '.width|0:',
            '(', CONTEXT, '.', S_FRAMEBUFFER_WIDTH, '-', BOX_X, ')');
          var BOX_H = scope.def(
            '"height" in ', BOX, '?', BOX, '.height|0:',
            '(', CONTEXT, '.', S_FRAMEBUFFER_HEIGHT, '-', BOX_Y, ')');

          check$1.optional(function () {
            env.assert(scope,
              BOX_W + '>=0&&' +
              BOX_H + '>=0',
              'invalid ' + param);
          });

          return [BOX_X, BOX_Y, BOX_W, BOX_H]
        });
        if (framebuffer) {
          result.thisDep = result.thisDep || framebuffer.thisDep;
          result.contextDep = result.contextDep || framebuffer.contextDep;
          result.propDep = result.propDep || framebuffer.propDep;
        }
        return result
      } else if (framebuffer) {
        return new Declaration(
          framebuffer.thisDep,
          framebuffer.contextDep,
          framebuffer.propDep,
          function (env, scope) {
            var CONTEXT = env.shared.context;
            return [
              0, 0,
              scope.def(CONTEXT, '.', S_FRAMEBUFFER_WIDTH),
              scope.def(CONTEXT, '.', S_FRAMEBUFFER_HEIGHT)]
          })
      } else {
        return null
      }
    }

    var viewport = parseBox(S_VIEWPORT);

    if (viewport) {
      var prevViewport = viewport;
      viewport = new Declaration(
        viewport.thisDep,
        viewport.contextDep,
        viewport.propDep,
        function (env, scope) {
          var VIEWPORT = prevViewport.append(env, scope);
          var CONTEXT = env.shared.context;
          scope.set(
            CONTEXT,
            '.' + S_VIEWPORT_WIDTH,
            VIEWPORT[2]);
          scope.set(
            CONTEXT,
            '.' + S_VIEWPORT_HEIGHT,
            VIEWPORT[3]);
          return VIEWPORT
        });
    }

    return {
      viewport: viewport,
      scissor_box: parseBox(S_SCISSOR_BOX)
    }
  }

  function parseProgram (options) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    function parseShader (name) {
      if (name in staticOptions) {
        var id = stringStore.id(staticOptions[name]);
        check$1.optional(function () {
          shaderState.shader(shaderType[name], id, check$1.guessCommand());
        });
        var result = createStaticDecl(function () {
          return id
        });
        result.id = id;
        return result
      } else if (name in dynamicOptions) {
        var dyn = dynamicOptions[name];
        return createDynamicDecl(dyn, function (env, scope) {
          var str = env.invoke(scope, dyn);
          var id = scope.def(env.shared.strings, '.id(', str, ')');
          check$1.optional(function () {
            scope(
              env.shared.shader, '.shader(',
              shaderType[name], ',',
              id, ',',
              env.command, ');');
          });
          return id
        })
      }
      return null
    }

    var frag = parseShader(S_FRAG);
    var vert = parseShader(S_VERT);

    var program = null;
    var progVar;
    if (isStatic(frag) && isStatic(vert)) {
      program = shaderState.program(vert.id, frag.id);
      progVar = createStaticDecl(function (env, scope) {
        return env.link(program)
      });
    } else {
      progVar = new Declaration(
        (frag && frag.thisDep) || (vert && vert.thisDep),
        (frag && frag.contextDep) || (vert && vert.contextDep),
        (frag && frag.propDep) || (vert && vert.propDep),
        function (env, scope) {
          var SHADER_STATE = env.shared.shader;
          var fragId;
          if (frag) {
            fragId = frag.append(env, scope);
          } else {
            fragId = scope.def(SHADER_STATE, '.', S_FRAG);
          }
          var vertId;
          if (vert) {
            vertId = vert.append(env, scope);
          } else {
            vertId = scope.def(SHADER_STATE, '.', S_VERT);
          }
          var progDef = SHADER_STATE + '.program(' + vertId + ',' + fragId;
          check$1.optional(function () {
            progDef += ',' + env.command;
          });
          return scope.def(progDef + ')')
        });
    }

    return {
      frag: frag,
      vert: vert,
      progVar: progVar,
      program: program
    }
  }

  function parseDraw (options, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    function parseElements () {
      if (S_ELEMENTS in staticOptions) {
        var elements = staticOptions[S_ELEMENTS];
        if (isBufferArgs(elements)) {
          elements = elementState.getElements(elementState.create(elements, true));
        } else if (elements) {
          elements = elementState.getElements(elements);
          check$1.command(elements, 'invalid elements', env.commandStr);
        }
        var result = createStaticDecl(function (env, scope) {
          if (elements) {
            var result = env.link(elements);
            env.ELEMENTS = result;
            return result
          }
          env.ELEMENTS = null;
          return null
        });
        result.value = elements;
        return result
      } else if (S_ELEMENTS in dynamicOptions) {
        var dyn = dynamicOptions[S_ELEMENTS];
        return createDynamicDecl(dyn, function (env, scope) {
          var shared = env.shared;

          var IS_BUFFER_ARGS = shared.isBufferArgs;
          var ELEMENT_STATE = shared.elements;

          var elementDefn = env.invoke(scope, dyn);
          var elements = scope.def('null');
          var elementStream = scope.def(IS_BUFFER_ARGS, '(', elementDefn, ')');

          var ifte = env.cond(elementStream)
            .then(elements, '=', ELEMENT_STATE, '.createStream(', elementDefn, ');')
            .else(elements, '=', ELEMENT_STATE, '.getElements(', elementDefn, ');');

          check$1.optional(function () {
            env.assert(ifte.else,
              '!' + elementDefn + '||' + elements,
              'invalid elements');
          });

          scope.entry(ifte);
          scope.exit(
            env.cond(elementStream)
              .then(ELEMENT_STATE, '.destroyStream(', elements, ');'));

          env.ELEMENTS = elements;

          return elements
        })
      }

      return null
    }

    var elements = parseElements();

    function parsePrimitive () {
      if (S_PRIMITIVE in staticOptions) {
        var primitive = staticOptions[S_PRIMITIVE];
        check$1.commandParameter(primitive, primTypes, 'invalid primitve', env.commandStr);
        return createStaticDecl(function (env, scope) {
          return primTypes[primitive]
        })
      } else if (S_PRIMITIVE in dynamicOptions) {
        var dynPrimitive = dynamicOptions[S_PRIMITIVE];
        return createDynamicDecl(dynPrimitive, function (env, scope) {
          var PRIM_TYPES = env.constants.primTypes;
          var prim = env.invoke(scope, dynPrimitive);
          check$1.optional(function () {
            env.assert(scope,
              prim + ' in ' + PRIM_TYPES,
              'invalid primitive, must be one of ' + Object.keys(primTypes));
          });
          return scope.def(PRIM_TYPES, '[', prim, ']')
        })
      } else if (elements) {
        if (isStatic(elements)) {
          if (elements.value) {
            return createStaticDecl(function (env, scope) {
              return scope.def(env.ELEMENTS, '.primType')
            })
          } else {
            return createStaticDecl(function () {
              return GL_TRIANGLES$1
            })
          }
        } else {
          return new Declaration(
            elements.thisDep,
            elements.contextDep,
            elements.propDep,
            function (env, scope) {
              var elements = env.ELEMENTS;
              return scope.def(elements, '?', elements, '.primType:', GL_TRIANGLES$1)
            })
        }
      }
      return null
    }

    function parseParam (param, isOffset) {
      if (param in staticOptions) {
        var value = staticOptions[param] | 0;
        check$1.command(!isOffset || value >= 0, 'invalid ' + param, env.commandStr);
        return createStaticDecl(function (env, scope) {
          if (isOffset) {
            env.OFFSET = value;
          }
          return value
        })
      } else if (param in dynamicOptions) {
        var dynValue = dynamicOptions[param];
        return createDynamicDecl(dynValue, function (env, scope) {
          var result = env.invoke(scope, dynValue);
          if (isOffset) {
            env.OFFSET = result;
            check$1.optional(function () {
              env.assert(scope,
                result + '>=0',
                'invalid ' + param);
            });
          }
          return result
        })
      } else if (isOffset && elements) {
        return createStaticDecl(function (env, scope) {
          env.OFFSET = '0';
          return 0
        })
      }
      return null
    }

    var OFFSET = parseParam(S_OFFSET, true);

    function parseVertCount () {
      if (S_COUNT in staticOptions) {
        var count = staticOptions[S_COUNT] | 0;
        check$1.command(
          typeof count === 'number' && count >= 0, 'invalid vertex count', env.commandStr);
        return createStaticDecl(function () {
          return count
        })
      } else if (S_COUNT in dynamicOptions) {
        var dynCount = dynamicOptions[S_COUNT];
        return createDynamicDecl(dynCount, function (env, scope) {
          var result = env.invoke(scope, dynCount);
          check$1.optional(function () {
            env.assert(scope,
              'typeof ' + result + '==="number"&&' +
              result + '>=0&&' +
              result + '===(' + result + '|0)',
              'invalid vertex count');
          });
          return result
        })
      } else if (elements) {
        if (isStatic(elements)) {
          if (elements) {
            if (OFFSET) {
              return new Declaration(
                OFFSET.thisDep,
                OFFSET.contextDep,
                OFFSET.propDep,
                function (env, scope) {
                  var result = scope.def(
                    env.ELEMENTS, '.vertCount-', env.OFFSET);

                  check$1.optional(function () {
                    env.assert(scope,
                      result + '>=0',
                      'invalid vertex offset/element buffer too small');
                  });

                  return result
                })
            } else {
              return createStaticDecl(function (env, scope) {
                return scope.def(env.ELEMENTS, '.vertCount')
              })
            }
          } else {
            var result = createStaticDecl(function () {
              return -1
            });
            check$1.optional(function () {
              result.MISSING = true;
            });
            return result
          }
        } else {
          var variable = new Declaration(
            elements.thisDep || OFFSET.thisDep,
            elements.contextDep || OFFSET.contextDep,
            elements.propDep || OFFSET.propDep,
            function (env, scope) {
              var elements = env.ELEMENTS;
              if (env.OFFSET) {
                return scope.def(elements, '?', elements, '.vertCount-',
                  env.OFFSET, ':-1')
              }
              return scope.def(elements, '?', elements, '.vertCount:-1')
            });
          check$1.optional(function () {
            variable.DYNAMIC = true;
          });
          return variable
        }
      }
      return null
    }

    return {
      elements: elements,
      primitive: parsePrimitive(),
      count: parseVertCount(),
      instances: parseParam(S_INSTANCES, false),
      offset: OFFSET
    }
  }

  function parseGLState (options, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    var STATE = {};

    GL_STATE_NAMES.forEach(function (prop) {
      var param = propName(prop);

      function parseParam (parseStatic, parseDynamic) {
        if (prop in staticOptions) {
          var value = parseStatic(staticOptions[prop]);
          STATE[param] = createStaticDecl(function () {
            return value
          });
        } else if (prop in dynamicOptions) {
          var dyn = dynamicOptions[prop];
          STATE[param] = createDynamicDecl(dyn, function (env, scope) {
            return parseDynamic(env, scope, env.invoke(scope, dyn))
          });
        }
      }

      switch (prop) {
        case S_CULL_ENABLE:
        case S_BLEND_ENABLE:
        case S_DITHER:
        case S_STENCIL_ENABLE:
        case S_DEPTH_ENABLE:
        case S_SCISSOR_ENABLE:
        case S_POLYGON_OFFSET_ENABLE:
        case S_SAMPLE_ALPHA:
        case S_SAMPLE_ENABLE:
        case S_DEPTH_MASK:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'boolean', prop, env.commandStr);
              return value
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  'typeof ' + value + '==="boolean"',
                  'invalid flag ' + prop, env.commandStr);
              });
              return value
            })

        case S_DEPTH_FUNC:
          return parseParam(
            function (value) {
              check$1.commandParameter(value, compareFuncs, 'invalid ' + prop, env.commandStr);
              return compareFuncs[value]
            },
            function (env, scope, value) {
              var COMPARE_FUNCS = env.constants.compareFuncs;
              check$1.optional(function () {
                env.assert(scope,
                  value + ' in ' + COMPARE_FUNCS,
                  'invalid ' + prop + ', must be one of ' + Object.keys(compareFuncs));
              });
              return scope.def(COMPARE_FUNCS, '[', value, ']')
            })

        case S_DEPTH_RANGE:
          return parseParam(
            function (value) {
              check$1.command(
                isArrayLike(value) &&
                value.length === 2 &&
                typeof value[0] === 'number' &&
                typeof value[1] === 'number' &&
                value[0] <= value[1],
                'depth range is 2d array',
                env.commandStr);
              return value
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  env.shared.isArrayLike + '(' + value + ')&&' +
                  value + '.length===2&&' +
                  'typeof ' + value + '[0]==="number"&&' +
                  'typeof ' + value + '[1]==="number"&&' +
                  value + '[0]<=' + value + '[1]',
                  'depth range must be a 2d array');
              });

              var Z_NEAR = scope.def('+', value, '[0]');
              var Z_FAR = scope.def('+', value, '[1]');
              return [Z_NEAR, Z_FAR]
            })

        case S_BLEND_FUNC:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', 'blend.func', env.commandStr);
              var srcRGB = ('srcRGB' in value ? value.srcRGB : value.src);
              var srcAlpha = ('srcAlpha' in value ? value.srcAlpha : value.src);
              var dstRGB = ('dstRGB' in value ? value.dstRGB : value.dst);
              var dstAlpha = ('dstAlpha' in value ? value.dstAlpha : value.dst);
              check$1.commandParameter(srcRGB, blendFuncs, param + '.srcRGB', env.commandStr);
              check$1.commandParameter(srcAlpha, blendFuncs, param + '.srcAlpha', env.commandStr);
              check$1.commandParameter(dstRGB, blendFuncs, param + '.dstRGB', env.commandStr);
              check$1.commandParameter(dstAlpha, blendFuncs, param + '.dstAlpha', env.commandStr);

              check$1.command(
                (invalidBlendCombinations.indexOf(srcRGB + ', ' + dstRGB) === -1),
                'unallowed blending combination (srcRGB, dstRGB) = (' + srcRGB + ', ' + dstRGB + ')', env.commandStr);

              return [
                blendFuncs[srcRGB],
                blendFuncs[dstRGB],
                blendFuncs[srcAlpha],
                blendFuncs[dstAlpha]
              ]
            },
            function (env, scope, value) {
              var BLEND_FUNCS = env.constants.blendFuncs;

              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid blend func, must be an object');
              });

              function read (prefix, suffix) {
                var func = scope.def(
                  '"', prefix, suffix, '" in ', value,
                  '?', value, '.', prefix, suffix,
                  ':', value, '.', prefix);

                check$1.optional(function () {
                  env.assert(scope,
                    func + ' in ' + BLEND_FUNCS,
                    'invalid ' + prop + '.' + prefix + suffix + ', must be one of ' + Object.keys(blendFuncs));
                });

                return func
              }

              var srcRGB = read('src', 'RGB');
              var dstRGB = read('dst', 'RGB');

              check$1.optional(function () {
                var INVALID_BLEND_COMBINATIONS = env.constants.invalidBlendCombinations;

                env.assert(scope,
                           INVALID_BLEND_COMBINATIONS +
                           '.indexOf(' + srcRGB + '+", "+' + dstRGB + ') === -1 ',
                           'unallowed blending combination for (srcRGB, dstRGB)'
                          );
              });

              var SRC_RGB = scope.def(BLEND_FUNCS, '[', srcRGB, ']');
              var SRC_ALPHA = scope.def(BLEND_FUNCS, '[', read('src', 'Alpha'), ']');
              var DST_RGB = scope.def(BLEND_FUNCS, '[', dstRGB, ']');
              var DST_ALPHA = scope.def(BLEND_FUNCS, '[', read('dst', 'Alpha'), ']');

              return [SRC_RGB, DST_RGB, SRC_ALPHA, DST_ALPHA]
            })

        case S_BLEND_EQUATION:
          return parseParam(
            function (value) {
              if (typeof value === 'string') {
                check$1.commandParameter(value, blendEquations, 'invalid ' + prop, env.commandStr);
                return [
                  blendEquations[value],
                  blendEquations[value]
                ]
              } else if (typeof value === 'object') {
                check$1.commandParameter(
                  value.rgb, blendEquations, prop + '.rgb', env.commandStr);
                check$1.commandParameter(
                  value.alpha, blendEquations, prop + '.alpha', env.commandStr);
                return [
                  blendEquations[value.rgb],
                  blendEquations[value.alpha]
                ]
              } else {
                check$1.commandRaise('invalid blend.equation', env.commandStr);
              }
            },
            function (env, scope, value) {
              var BLEND_EQUATIONS = env.constants.blendEquations;

              var RGB = scope.def();
              var ALPHA = scope.def();

              var ifte = env.cond('typeof ', value, '==="string"');

              check$1.optional(function () {
                function checkProp (block, name, value) {
                  env.assert(block,
                    value + ' in ' + BLEND_EQUATIONS,
                    'invalid ' + name + ', must be one of ' + Object.keys(blendEquations));
                }
                checkProp(ifte.then, prop, value);

                env.assert(ifte.else,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid ' + prop);
                checkProp(ifte.else, prop + '.rgb', value + '.rgb');
                checkProp(ifte.else, prop + '.alpha', value + '.alpha');
              });

              ifte.then(
                RGB, '=', ALPHA, '=', BLEND_EQUATIONS, '[', value, '];');
              ifte.else(
                RGB, '=', BLEND_EQUATIONS, '[', value, '.rgb];',
                ALPHA, '=', BLEND_EQUATIONS, '[', value, '.alpha];');

              scope(ifte);

              return [RGB, ALPHA]
            })

        case S_BLEND_COLOR:
          return parseParam(
            function (value) {
              check$1.command(
                isArrayLike(value) &&
                value.length === 4,
                'blend.color must be a 4d array', env.commandStr);
              return loop(4, function (i) {
                return +value[i]
              })
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  env.shared.isArrayLike + '(' + value + ')&&' +
                  value + '.length===4',
                  'blend.color must be a 4d array');
              });
              return loop(4, function (i) {
                return scope.def('+', value, '[', i, ']')
              })
            })

        case S_STENCIL_MASK:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'number', param, env.commandStr);
              return value | 0
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  'typeof ' + value + '==="number"',
                  'invalid stencil.mask');
              });
              return scope.def(value, '|0')
            })

        case S_STENCIL_FUNC:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', param, env.commandStr);
              var cmp = value.cmp || 'keep';
              var ref = value.ref || 0;
              var mask = 'mask' in value ? value.mask : -1;
              check$1.commandParameter(cmp, compareFuncs, prop + '.cmp', env.commandStr);
              check$1.commandType(ref, 'number', prop + '.ref', env.commandStr);
              check$1.commandType(mask, 'number', prop + '.mask', env.commandStr);
              return [
                compareFuncs[cmp],
                ref,
                mask
              ]
            },
            function (env, scope, value) {
              var COMPARE_FUNCS = env.constants.compareFuncs;
              check$1.optional(function () {
                function assert () {
                  env.assert(scope,
                    Array.prototype.join.call(arguments, ''),
                    'invalid stencil.func');
                }
                assert(value + '&&typeof ', value, '==="object"');
                assert('!("cmp" in ', value, ')||(',
                  value, '.cmp in ', COMPARE_FUNCS, ')');
              });
              var cmp = scope.def(
                '"cmp" in ', value,
                '?', COMPARE_FUNCS, '[', value, '.cmp]',
                ':', GL_KEEP);
              var ref = scope.def(value, '.ref|0');
              var mask = scope.def(
                '"mask" in ', value,
                '?', value, '.mask|0:-1');
              return [cmp, ref, mask]
            })

        case S_STENCIL_OPFRONT:
        case S_STENCIL_OPBACK:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', param, env.commandStr);
              var fail = value.fail || 'keep';
              var zfail = value.zfail || 'keep';
              var zpass = value.zpass || 'keep';
              check$1.commandParameter(fail, stencilOps, prop + '.fail', env.commandStr);
              check$1.commandParameter(zfail, stencilOps, prop + '.zfail', env.commandStr);
              check$1.commandParameter(zpass, stencilOps, prop + '.zpass', env.commandStr);
              return [
                prop === S_STENCIL_OPBACK ? GL_BACK : GL_FRONT,
                stencilOps[fail],
                stencilOps[zfail],
                stencilOps[zpass]
              ]
            },
            function (env, scope, value) {
              var STENCIL_OPS = env.constants.stencilOps;

              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid ' + prop);
              });

              function read (name) {
                check$1.optional(function () {
                  env.assert(scope,
                    '!("' + name + '" in ' + value + ')||' +
                    '(' + value + '.' + name + ' in ' + STENCIL_OPS + ')',
                    'invalid ' + prop + '.' + name + ', must be one of ' + Object.keys(stencilOps));
                });

                return scope.def(
                  '"', name, '" in ', value,
                  '?', STENCIL_OPS, '[', value, '.', name, ']:',
                  GL_KEEP)
              }

              return [
                prop === S_STENCIL_OPBACK ? GL_BACK : GL_FRONT,
                read('fail'),
                read('zfail'),
                read('zpass')
              ]
            })

        case S_POLYGON_OFFSET_OFFSET:
          return parseParam(
            function (value) {
              check$1.commandType(value, 'object', param, env.commandStr);
              var factor = value.factor | 0;
              var units = value.units | 0;
              check$1.commandType(factor, 'number', param + '.factor', env.commandStr);
              check$1.commandType(units, 'number', param + '.units', env.commandStr);
              return [factor, units]
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid ' + prop);
              });

              var FACTOR = scope.def(value, '.factor|0');
              var UNITS = scope.def(value, '.units|0');

              return [FACTOR, UNITS]
            })

        case S_CULL_FACE:
          return parseParam(
            function (value) {
              var face = 0;
              if (value === 'front') {
                face = GL_FRONT;
              } else if (value === 'back') {
                face = GL_BACK;
              }
              check$1.command(!!face, param, env.commandStr);
              return face
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '==="front"||' +
                  value + '==="back"',
                  'invalid cull.face');
              });
              return scope.def(value, '==="front"?', GL_FRONT, ':', GL_BACK)
            })

        case S_LINE_WIDTH:
          return parseParam(
            function (value) {
              check$1.command(
                typeof value === 'number' &&
                value >= limits.lineWidthDims[0] &&
                value <= limits.lineWidthDims[1],
                'invalid line width, must positive number between ' +
                limits.lineWidthDims[0] + ' and ' + limits.lineWidthDims[1], env.commandStr);
              return value
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  'typeof ' + value + '==="number"&&' +
                  value + '>=' + limits.lineWidthDims[0] + '&&' +
                  value + '<=' + limits.lineWidthDims[1],
                  'invalid line width');
              });

              return value
            })

        case S_FRONT_FACE:
          return parseParam(
            function (value) {
              check$1.commandParameter(value, orientationType, param, env.commandStr);
              return orientationType[value]
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '==="cw"||' +
                  value + '==="ccw"',
                  'invalid frontFace, must be one of cw,ccw');
              });
              return scope.def(value + '==="cw"?' + GL_CW + ':' + GL_CCW)
            })

        case S_COLOR_MASK:
          return parseParam(
            function (value) {
              check$1.command(
                isArrayLike(value) && value.length === 4,
                'color.mask must be length 4 array', env.commandStr);
              return value.map(function (v) { return !!v })
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  env.shared.isArrayLike + '(' + value + ')&&' +
                  value + '.length===4',
                  'invalid color.mask');
              });
              return loop(4, function (i) {
                return '!!' + value + '[' + i + ']'
              })
            })

        case S_SAMPLE_COVERAGE:
          return parseParam(
            function (value) {
              check$1.command(typeof value === 'object' && value, param, env.commandStr);
              var sampleValue = 'value' in value ? value.value : 1;
              var sampleInvert = !!value.invert;
              check$1.command(
                typeof sampleValue === 'number' &&
                sampleValue >= 0 && sampleValue <= 1,
                'sample.coverage.value must be a number between 0 and 1', env.commandStr);
              return [sampleValue, sampleInvert]
            },
            function (env, scope, value) {
              check$1.optional(function () {
                env.assert(scope,
                  value + '&&typeof ' + value + '==="object"',
                  'invalid sample.coverage');
              });
              var VALUE = scope.def(
                '"value" in ', value, '?+', value, '.value:1');
              var INVERT = scope.def('!!', value, '.invert');
              return [VALUE, INVERT]
            })
      }
    });

    return STATE
  }

  function parseUniforms (uniforms, env) {
    var staticUniforms = uniforms.static;
    var dynamicUniforms = uniforms.dynamic;

    var UNIFORMS = {};

    Object.keys(staticUniforms).forEach(function (name) {
      var value = staticUniforms[name];
      var result;
      if (typeof value === 'number' ||
          typeof value === 'boolean') {
        result = createStaticDecl(function () {
          return value
        });
      } else if (typeof value === 'function') {
        var reglType = value._reglType;
        if (reglType === 'texture2d' ||
            reglType === 'textureCube') {
          result = createStaticDecl(function (env) {
            return env.link(value)
          });
        } else if (reglType === 'framebuffer' ||
                   reglType === 'framebufferCube') {
          check$1.command(value.color.length > 0,
            'missing color attachment for framebuffer sent to uniform "' + name + '"', env.commandStr);
          result = createStaticDecl(function (env) {
            return env.link(value.color[0])
          });
        } else {
          check$1.commandRaise('invalid data for uniform "' + name + '"', env.commandStr);
        }
      } else if (isArrayLike(value)) {
        result = createStaticDecl(function (env) {
          var ITEM = env.global.def('[',
            loop(value.length, function (i) {
              check$1.command(
                typeof value[i] === 'number' ||
                typeof value[i] === 'boolean',
                'invalid uniform ' + name, env.commandStr);
              return value[i]
            }), ']');
          return ITEM
        });
      } else {
        check$1.commandRaise('invalid or missing data for uniform "' + name + '"', env.commandStr);
      }
      result.value = value;
      UNIFORMS[name] = result;
    });

    Object.keys(dynamicUniforms).forEach(function (key) {
      var dyn = dynamicUniforms[key];
      UNIFORMS[key] = createDynamicDecl(dyn, function (env, scope) {
        return env.invoke(scope, dyn)
      });
    });

    return UNIFORMS
  }

  function parseAttributes (attributes, env) {
    var staticAttributes = attributes.static;
    var dynamicAttributes = attributes.dynamic;

    var attributeDefs = {};

    Object.keys(staticAttributes).forEach(function (attribute) {
      var value = staticAttributes[attribute];
      var id = stringStore.id(attribute);

      var record = new AttributeRecord();
      if (isBufferArgs(value)) {
        record.state = ATTRIB_STATE_POINTER;
        record.buffer = bufferState.getBuffer(
          bufferState.create(value, GL_ARRAY_BUFFER$1, false, true));
        record.type = 0;
      } else {
        var buffer = bufferState.getBuffer(value);
        if (buffer) {
          record.state = ATTRIB_STATE_POINTER;
          record.buffer = buffer;
          record.type = 0;
        } else {
          check$1.command(typeof value === 'object' && value,
            'invalid data for attribute ' + attribute, env.commandStr);
          if (value.constant) {
            var constant = value.constant;
            record.buffer = 'null';
            record.state = ATTRIB_STATE_CONSTANT;
            if (typeof constant === 'number') {
              record.x = constant;
            } else {
              check$1.command(
                isArrayLike(constant) &&
                constant.length > 0 &&
                constant.length <= 4,
                'invalid constant for attribute ' + attribute, env.commandStr);
              CUTE_COMPONENTS.forEach(function (c, i) {
                if (i < constant.length) {
                  record[c] = constant[i];
                }
              });
            }
          } else {
            if (isBufferArgs(value.buffer)) {
              buffer = bufferState.getBuffer(
                bufferState.create(value.buffer, GL_ARRAY_BUFFER$1, false, true));
            } else {
              buffer = bufferState.getBuffer(value.buffer);
            }
            check$1.command(!!buffer, 'missing buffer for attribute "' + attribute + '"', env.commandStr);

            var offset = value.offset | 0;
            check$1.command(offset >= 0,
              'invalid offset for attribute "' + attribute + '"', env.commandStr);

            var stride = value.stride | 0;
            check$1.command(stride >= 0 && stride < 256,
              'invalid stride for attribute "' + attribute + '", must be integer betweeen [0, 255]', env.commandStr);

            var size = value.size | 0;
            check$1.command(!('size' in value) || (size > 0 && size <= 4),
              'invalid size for attribute "' + attribute + '", must be 1,2,3,4', env.commandStr);

            var normalized = !!value.normalized;

            var type = 0;
            if ('type' in value) {
              check$1.commandParameter(
                value.type, glTypes,
                'invalid type for attribute ' + attribute, env.commandStr);
              type = glTypes[value.type];
            }

            var divisor = value.divisor | 0;
            if ('divisor' in value) {
              check$1.command(divisor === 0 || extInstancing,
                'cannot specify divisor for attribute "' + attribute + '", instancing not supported', env.commandStr);
              check$1.command(divisor >= 0,
                'invalid divisor for attribute "' + attribute + '"', env.commandStr);
            }

            check$1.optional(function () {
              var command = env.commandStr;

              var VALID_KEYS = [
                'buffer',
                'offset',
                'divisor',
                'normalized',
                'type',
                'size',
                'stride'
              ];

              Object.keys(value).forEach(function (prop) {
                check$1.command(
                  VALID_KEYS.indexOf(prop) >= 0,
                  'unknown parameter "' + prop + '" for attribute pointer "' + attribute + '" (valid parameters are ' + VALID_KEYS + ')',
                  command);
              });
            });

            record.buffer = buffer;
            record.state = ATTRIB_STATE_POINTER;
            record.size = size;
            record.normalized = normalized;
            record.type = type || buffer.dtype;
            record.offset = offset;
            record.stride = stride;
            record.divisor = divisor;
          }
        }
      }

      attributeDefs[attribute] = createStaticDecl(function (env, scope) {
        var cache = env.attribCache;
        if (id in cache) {
          return cache[id]
        }
        var result = {
          isStream: false
        };
        Object.keys(record).forEach(function (key) {
          result[key] = record[key];
        });
        if (record.buffer) {
          result.buffer = env.link(record.buffer);
          result.type = result.type || (result.buffer + '.dtype');
        }
        cache[id] = result;
        return result
      });
    });

    Object.keys(dynamicAttributes).forEach(function (attribute) {
      var dyn = dynamicAttributes[attribute];

      function appendAttributeCode (env, block) {
        var VALUE = env.invoke(block, dyn);

        var shared = env.shared;

        var IS_BUFFER_ARGS = shared.isBufferArgs;
        var BUFFER_STATE = shared.buffer;

        // Perform validation on attribute
        check$1.optional(function () {
          env.assert(block,
            VALUE + '&&(typeof ' + VALUE + '==="object"||typeof ' +
            VALUE + '==="function")&&(' +
            IS_BUFFER_ARGS + '(' + VALUE + ')||' +
            BUFFER_STATE + '.getBuffer(' + VALUE + ')||' +
            BUFFER_STATE + '.getBuffer(' + VALUE + '.buffer)||' +
            IS_BUFFER_ARGS + '(' + VALUE + '.buffer)||' +
            '("constant" in ' + VALUE +
            '&&(typeof ' + VALUE + '.constant==="number"||' +
            shared.isArrayLike + '(' + VALUE + '.constant))))',
            'invalid dynamic attribute "' + attribute + '"');
        });

        // allocate names for result
        var result = {
          isStream: block.def(false)
        };
        var defaultRecord = new AttributeRecord();
        defaultRecord.state = ATTRIB_STATE_POINTER;
        Object.keys(defaultRecord).forEach(function (key) {
          result[key] = block.def('' + defaultRecord[key]);
        });

        var BUFFER = result.buffer;
        var TYPE = result.type;
        block(
          'if(', IS_BUFFER_ARGS, '(', VALUE, ')){',
          result.isStream, '=true;',
          BUFFER, '=', BUFFER_STATE, '.createStream(', GL_ARRAY_BUFFER$1, ',', VALUE, ');',
          TYPE, '=', BUFFER, '.dtype;',
          '}else{',
          BUFFER, '=', BUFFER_STATE, '.getBuffer(', VALUE, ');',
          'if(', BUFFER, '){',
          TYPE, '=', BUFFER, '.dtype;',
          '}else if("constant" in ', VALUE, '){',
          result.state, '=', ATTRIB_STATE_CONSTANT, ';',
          'if(typeof ' + VALUE + '.constant === "number"){',
          result[CUTE_COMPONENTS[0]], '=', VALUE, '.constant;',
          CUTE_COMPONENTS.slice(1).map(function (n) {
            return result[n]
          }).join('='), '=0;',
          '}else{',
          CUTE_COMPONENTS.map(function (name, i) {
            return (
              result[name] + '=' + VALUE + '.constant.length>=' + i +
              '?' + VALUE + '.constant[' + i + ']:0;'
            )
          }).join(''),
          '}}else{',
          'if(', IS_BUFFER_ARGS, '(', VALUE, '.buffer)){',
          BUFFER, '=', BUFFER_STATE, '.createStream(', GL_ARRAY_BUFFER$1, ',', VALUE, '.buffer);',
          '}else{',
          BUFFER, '=', BUFFER_STATE, '.getBuffer(', VALUE, '.buffer);',
          '}',
          TYPE, '="type" in ', VALUE, '?',
          shared.glTypes, '[', VALUE, '.type]:', BUFFER, '.dtype;',
          result.normalized, '=!!', VALUE, '.normalized;');
        function emitReadRecord (name) {
          block(result[name], '=', VALUE, '.', name, '|0;');
        }
        emitReadRecord('size');
        emitReadRecord('offset');
        emitReadRecord('stride');
        emitReadRecord('divisor');

        block('}}');

        block.exit(
          'if(', result.isStream, '){',
          BUFFER_STATE, '.destroyStream(', BUFFER, ');',
          '}');

        return result
      }

      attributeDefs[attribute] = createDynamicDecl(dyn, appendAttributeCode);
    });

    return attributeDefs
  }

  function parseContext (context) {
    var staticContext = context.static;
    var dynamicContext = context.dynamic;
    var result = {};

    Object.keys(staticContext).forEach(function (name) {
      var value = staticContext[name];
      result[name] = createStaticDecl(function (env, scope) {
        if (typeof value === 'number' || typeof value === 'boolean') {
          return '' + value
        } else {
          return env.link(value)
        }
      });
    });

    Object.keys(dynamicContext).forEach(function (name) {
      var dyn = dynamicContext[name];
      result[name] = createDynamicDecl(dyn, function (env, scope) {
        return env.invoke(scope, dyn)
      });
    });

    return result
  }

  function parseArguments (options, attributes, uniforms, context, env) {
    var staticOptions = options.static;
    var dynamicOptions = options.dynamic;

    check$1.optional(function () {
      var KEY_NAMES = [
        S_FRAMEBUFFER,
        S_VERT,
        S_FRAG,
        S_ELEMENTS,
        S_PRIMITIVE,
        S_OFFSET,
        S_COUNT,
        S_INSTANCES,
        S_PROFILE
      ].concat(GL_STATE_NAMES);

      function checkKeys (dict) {
        Object.keys(dict).forEach(function (key) {
          check$1.command(
            KEY_NAMES.indexOf(key) >= 0,
            'unknown parameter "' + key + '"',
            env.commandStr);
        });
      }

      checkKeys(staticOptions);
      checkKeys(dynamicOptions);
    });

    var framebuffer = parseFramebuffer(options, env);
    var viewportAndScissor = parseViewportScissor(options, framebuffer, env);
    var draw = parseDraw(options, env);
    var state = parseGLState(options, env);
    var shader = parseProgram(options, env);

    function copyBox (name) {
      var defn = viewportAndScissor[name];
      if (defn) {
        state[name] = defn;
      }
    }
    copyBox(S_VIEWPORT);
    copyBox(propName(S_SCISSOR_BOX));

    var dirty = Object.keys(state).length > 0;

    var result = {
      framebuffer: framebuffer,
      draw: draw,
      shader: shader,
      state: state,
      dirty: dirty
    };

    result.profile = parseProfile(options, env);
    result.uniforms = parseUniforms(uniforms, env);
    result.attributes = parseAttributes(attributes, env);
    result.context = parseContext(context, env);
    return result
  }

  // ===================================================
  // ===================================================
  // COMMON UPDATE FUNCTIONS
  // ===================================================
  // ===================================================
  function emitContext (env, scope, context) {
    var shared = env.shared;
    var CONTEXT = shared.context;

    var contextEnter = env.scope();

    Object.keys(context).forEach(function (name) {
      scope.save(CONTEXT, '.' + name);
      var defn = context[name];
      contextEnter(CONTEXT, '.', name, '=', defn.append(env, scope), ';');
    });

    scope(contextEnter);
  }

  // ===================================================
  // ===================================================
  // COMMON DRAWING FUNCTIONS
  // ===================================================
  // ===================================================
  function emitPollFramebuffer (env, scope, framebuffer, skipCheck) {
    var shared = env.shared;

    var GL = shared.gl;
    var FRAMEBUFFER_STATE = shared.framebuffer;
    var EXT_DRAW_BUFFERS;
    if (extDrawBuffers) {
      EXT_DRAW_BUFFERS = scope.def(shared.extensions, '.webgl_draw_buffers');
    }

    var constants = env.constants;

    var DRAW_BUFFERS = constants.drawBuffer;
    var BACK_BUFFER = constants.backBuffer;

    var NEXT;
    if (framebuffer) {
      NEXT = framebuffer.append(env, scope);
    } else {
      NEXT = scope.def(FRAMEBUFFER_STATE, '.next');
    }

    if (!skipCheck) {
      scope('if(', NEXT, '!==', FRAMEBUFFER_STATE, '.cur){');
    }
    scope(
      'if(', NEXT, '){',
      GL, '.bindFramebuffer(', GL_FRAMEBUFFER$1, ',', NEXT, '.framebuffer);');
    if (extDrawBuffers) {
      scope(EXT_DRAW_BUFFERS, '.drawBuffersWEBGL(',
        DRAW_BUFFERS, '[', NEXT, '.colorAttachments.length]);');
    }
    scope('}else{',
      GL, '.bindFramebuffer(', GL_FRAMEBUFFER$1, ',null);');
    if (extDrawBuffers) {
      scope(EXT_DRAW_BUFFERS, '.drawBuffersWEBGL(', BACK_BUFFER, ');');
    }
    scope(
      '}',
      FRAMEBUFFER_STATE, '.cur=', NEXT, ';');
    if (!skipCheck) {
      scope('}');
    }
  }

  function emitPollState (env, scope, args) {
    var shared = env.shared;

    var GL = shared.gl;

    var CURRENT_VARS = env.current;
    var NEXT_VARS = env.next;
    var CURRENT_STATE = shared.current;
    var NEXT_STATE = shared.next;

    var block = env.cond(CURRENT_STATE, '.dirty');

    GL_STATE_NAMES.forEach(function (prop) {
      var param = propName(prop);
      if (param in args.state) {
        return
      }

      var NEXT, CURRENT;
      if (param in NEXT_VARS) {
        NEXT = NEXT_VARS[param];
        CURRENT = CURRENT_VARS[param];
        var parts = loop(currentState[param].length, function (i) {
          return block.def(NEXT, '[', i, ']')
        });
        block(env.cond(parts.map(function (p, i) {
          return p + '!==' + CURRENT + '[' + i + ']'
        }).join('||'))
          .then(
            GL, '.', GL_VARIABLES[param], '(', parts, ');',
            parts.map(function (p, i) {
              return CURRENT + '[' + i + ']=' + p
            }).join(';'), ';'));
      } else {
        NEXT = block.def(NEXT_STATE, '.', param);
        var ifte = env.cond(NEXT, '!==', CURRENT_STATE, '.', param);
        block(ifte);
        if (param in GL_FLAGS) {
          ifte(
            env.cond(NEXT)
                .then(GL, '.enable(', GL_FLAGS[param], ');')
                .else(GL, '.disable(', GL_FLAGS[param], ');'),
            CURRENT_STATE, '.', param, '=', NEXT, ';');
        } else {
          ifte(
            GL, '.', GL_VARIABLES[param], '(', NEXT, ');',
            CURRENT_STATE, '.', param, '=', NEXT, ';');
        }
      }
    });
    if (Object.keys(args.state).length === 0) {
      block(CURRENT_STATE, '.dirty=false;');
    }
    scope(block);
  }

  function emitSetOptions (env, scope, options, filter) {
    var shared = env.shared;
    var CURRENT_VARS = env.current;
    var CURRENT_STATE = shared.current;
    var GL = shared.gl;
    sortState(Object.keys(options)).forEach(function (param) {
      var defn = options[param];
      if (filter && !filter(defn)) {
        return
      }
      var variable = defn.append(env, scope);
      if (GL_FLAGS[param]) {
        var flag = GL_FLAGS[param];
        if (isStatic(defn)) {
          if (variable) {
            scope(GL, '.enable(', flag, ');');
          } else {
            scope(GL, '.disable(', flag, ');');
          }
        } else {
          scope(env.cond(variable)
            .then(GL, '.enable(', flag, ');')
            .else(GL, '.disable(', flag, ');'));
        }
        scope(CURRENT_STATE, '.', param, '=', variable, ';');
      } else if (isArrayLike(variable)) {
        var CURRENT = CURRENT_VARS[param];
        scope(
          GL, '.', GL_VARIABLES[param], '(', variable, ');',
          variable.map(function (v, i) {
            return CURRENT + '[' + i + ']=' + v
          }).join(';'), ';');
      } else {
        scope(
          GL, '.', GL_VARIABLES[param], '(', variable, ');',
          CURRENT_STATE, '.', param, '=', variable, ';');
      }
    });
  }

  function injectExtensions (env, scope) {
    if (extInstancing) {
      env.instancing = scope.def(
        env.shared.extensions, '.angle_instanced_arrays');
    }
  }

  function emitProfile (env, scope, args, useScope, incrementCounter) {
    var shared = env.shared;
    var STATS = env.stats;
    var CURRENT_STATE = shared.current;
    var TIMER = shared.timer;
    var profileArg = args.profile;

    function perfCounter () {
      if (typeof performance === 'undefined') {
        return 'Date.now()'
      } else {
        return 'performance.now()'
      }
    }

    var CPU_START, QUERY_COUNTER;
    function emitProfileStart (block) {
      CPU_START = scope.def();
      block(CPU_START, '=', perfCounter(), ';');
      if (typeof incrementCounter === 'string') {
        block(STATS, '.count+=', incrementCounter, ';');
      } else {
        block(STATS, '.count++;');
      }
      if (timer) {
        if (useScope) {
          QUERY_COUNTER = scope.def();
          block(QUERY_COUNTER, '=', TIMER, '.getNumPendingQueries();');
        } else {
          block(TIMER, '.beginQuery(', STATS, ');');
        }
      }
    }

    function emitProfileEnd (block) {
      block(STATS, '.cpuTime+=', perfCounter(), '-', CPU_START, ';');
      if (timer) {
        if (useScope) {
          block(TIMER, '.pushScopeStats(',
            QUERY_COUNTER, ',',
            TIMER, '.getNumPendingQueries(),',
            STATS, ');');
        } else {
          block(TIMER, '.endQuery();');
        }
      }
    }

    function scopeProfile (value) {
      var prev = scope.def(CURRENT_STATE, '.profile');
      scope(CURRENT_STATE, '.profile=', value, ';');
      scope.exit(CURRENT_STATE, '.profile=', prev, ';');
    }

    var USE_PROFILE;
    if (profileArg) {
      if (isStatic(profileArg)) {
        if (profileArg.enable) {
          emitProfileStart(scope);
          emitProfileEnd(scope.exit);
          scopeProfile('true');
        } else {
          scopeProfile('false');
        }
        return
      }
      USE_PROFILE = profileArg.append(env, scope);
      scopeProfile(USE_PROFILE);
    } else {
      USE_PROFILE = scope.def(CURRENT_STATE, '.profile');
    }

    var start = env.block();
    emitProfileStart(start);
    scope('if(', USE_PROFILE, '){', start, '}');
    var end = env.block();
    emitProfileEnd(end);
    scope.exit('if(', USE_PROFILE, '){', end, '}');
  }

  function emitAttributes (env, scope, args, attributes, filter) {
    var shared = env.shared;

    function typeLength (x) {
      switch (x) {
        case GL_FLOAT_VEC2:
        case GL_INT_VEC2:
        case GL_BOOL_VEC2:
          return 2
        case GL_FLOAT_VEC3:
        case GL_INT_VEC3:
        case GL_BOOL_VEC3:
          return 3
        case GL_FLOAT_VEC4:
        case GL_INT_VEC4:
        case GL_BOOL_VEC4:
          return 4
        default:
          return 1
      }
    }

    function emitBindAttribute (ATTRIBUTE, size, record) {
      var GL = shared.gl;

      var LOCATION = scope.def(ATTRIBUTE, '.location');
      var BINDING = scope.def(shared.attributes, '[', LOCATION, ']');

      var STATE = record.state;
      var BUFFER = record.buffer;
      var CONST_COMPONENTS = [
        record.x,
        record.y,
        record.z,
        record.w
      ];

      var COMMON_KEYS = [
        'buffer',
        'normalized',
        'offset',
        'stride'
      ];

      function emitBuffer () {
        scope(
          'if(!', BINDING, '.buffer){',
          GL, '.enableVertexAttribArray(', LOCATION, ');}');

        var TYPE = record.type;
        var SIZE;
        if (!record.size) {
          SIZE = size;
        } else {
          SIZE = scope.def(record.size, '||', size);
        }

        scope('if(',
          BINDING, '.type!==', TYPE, '||',
          BINDING, '.size!==', SIZE, '||',
          COMMON_KEYS.map(function (key) {
            return BINDING + '.' + key + '!==' + record[key]
          }).join('||'),
          '){',
          GL, '.bindBuffer(', GL_ARRAY_BUFFER$1, ',', BUFFER, '.buffer);',
          GL, '.vertexAttribPointer(', [
            LOCATION,
            SIZE,
            TYPE,
            record.normalized,
            record.stride,
            record.offset
          ], ');',
          BINDING, '.type=', TYPE, ';',
          BINDING, '.size=', SIZE, ';',
          COMMON_KEYS.map(function (key) {
            return BINDING + '.' + key + '=' + record[key] + ';'
          }).join(''),
          '}');

        if (extInstancing) {
          var DIVISOR = record.divisor;
          scope(
            'if(', BINDING, '.divisor!==', DIVISOR, '){',
            env.instancing, '.vertexAttribDivisorANGLE(', [LOCATION, DIVISOR], ');',
            BINDING, '.divisor=', DIVISOR, ';}');
        }
      }

      function emitConstant () {
        scope(
          'if(', BINDING, '.buffer){',
          GL, '.disableVertexAttribArray(', LOCATION, ');',
          '}if(', CUTE_COMPONENTS.map(function (c, i) {
            return BINDING + '.' + c + '!==' + CONST_COMPONENTS[i]
          }).join('||'), '){',
          GL, '.vertexAttrib4f(', LOCATION, ',', CONST_COMPONENTS, ');',
          CUTE_COMPONENTS.map(function (c, i) {
            return BINDING + '.' + c + '=' + CONST_COMPONENTS[i] + ';'
          }).join(''),
          '}');
      }

      if (STATE === ATTRIB_STATE_POINTER) {
        emitBuffer();
      } else if (STATE === ATTRIB_STATE_CONSTANT) {
        emitConstant();
      } else {
        scope('if(', STATE, '===', ATTRIB_STATE_POINTER, '){');
        emitBuffer();
        scope('}else{');
        emitConstant();
        scope('}');
      }
    }

    attributes.forEach(function (attribute) {
      var name = attribute.name;
      var arg = args.attributes[name];
      var record;
      if (arg) {
        if (!filter(arg)) {
          return
        }
        record = arg.append(env, scope);
      } else {
        if (!filter(SCOPE_DECL)) {
          return
        }
        var scopeAttrib = env.scopeAttrib(name);
        check$1.optional(function () {
          env.assert(scope,
            scopeAttrib + '.state',
            'missing attribute ' + name);
        });
        record = {};
        Object.keys(new AttributeRecord()).forEach(function (key) {
          record[key] = scope.def(scopeAttrib, '.', key);
        });
      }
      emitBindAttribute(
        env.link(attribute), typeLength(attribute.info.type), record);
    });
  }

  function emitUniforms (env, scope, args, uniforms, filter) {
    var shared = env.shared;
    var GL = shared.gl;

    var infix;
    for (var i = 0; i < uniforms.length; ++i) {
      var uniform = uniforms[i];
      var name = uniform.name;
      var type = uniform.info.type;
      var arg = args.uniforms[name];
      var UNIFORM = env.link(uniform);
      var LOCATION = UNIFORM + '.location';

      var VALUE;
      if (arg) {
        if (!filter(arg)) {
          continue
        }
        if (isStatic(arg)) {
          var value = arg.value;
          check$1.command(
            value !== null && typeof value !== 'undefined',
            'missing uniform "' + name + '"', env.commandStr);
          if (type === GL_SAMPLER_2D || type === GL_SAMPLER_CUBE) {
            check$1.command(
              typeof value === 'function' &&
              ((type === GL_SAMPLER_2D &&
                (value._reglType === 'texture2d' ||
                value._reglType === 'framebuffer')) ||
              (type === GL_SAMPLER_CUBE &&
                (value._reglType === 'textureCube' ||
                value._reglType === 'framebufferCube'))),
              'invalid texture for uniform ' + name, env.commandStr);
            var TEX_VALUE = env.link(value._texture || value.color[0]._texture);
            scope(GL, '.uniform1i(', LOCATION, ',', TEX_VALUE + '.bind());');
            scope.exit(TEX_VALUE, '.unbind();');
          } else if (
            type === GL_FLOAT_MAT2 ||
            type === GL_FLOAT_MAT3 ||
            type === GL_FLOAT_MAT4) {
            check$1.optional(function () {
              check$1.command(isArrayLike(value),
                'invalid matrix for uniform ' + name, env.commandStr);
              check$1.command(
                (type === GL_FLOAT_MAT2 && value.length === 4) ||
                (type === GL_FLOAT_MAT3 && value.length === 9) ||
                (type === GL_FLOAT_MAT4 && value.length === 16),
                'invalid length for matrix uniform ' + name, env.commandStr);
            });
            var MAT_VALUE = env.global.def('new Float32Array([' +
              Array.prototype.slice.call(value) + '])');
            var dim = 2;
            if (type === GL_FLOAT_MAT3) {
              dim = 3;
            } else if (type === GL_FLOAT_MAT4) {
              dim = 4;
            }
            scope(
              GL, '.uniformMatrix', dim, 'fv(',
              LOCATION, ',false,', MAT_VALUE, ');');
          } else {
            switch (type) {
              case GL_FLOAT$7:
                check$1.commandType(value, 'number', 'uniform ' + name, env.commandStr);
                infix = '1f';
                break
              case GL_FLOAT_VEC2:
                check$1.command(
                  isArrayLike(value) && value.length === 2,
                  'uniform ' + name, env.commandStr);
                infix = '2f';
                break
              case GL_FLOAT_VEC3:
                check$1.command(
                  isArrayLike(value) && value.length === 3,
                  'uniform ' + name, env.commandStr);
                infix = '3f';
                break
              case GL_FLOAT_VEC4:
                check$1.command(
                  isArrayLike(value) && value.length === 4,
                  'uniform ' + name, env.commandStr);
                infix = '4f';
                break
              case GL_BOOL:
                check$1.commandType(value, 'boolean', 'uniform ' + name, env.commandStr);
                infix = '1i';
                break
              case GL_INT$3:
                check$1.commandType(value, 'number', 'uniform ' + name, env.commandStr);
                infix = '1i';
                break
              case GL_BOOL_VEC2:
                check$1.command(
                  isArrayLike(value) && value.length === 2,
                  'uniform ' + name, env.commandStr);
                infix = '2i';
                break
              case GL_INT_VEC2:
                check$1.command(
                  isArrayLike(value) && value.length === 2,
                  'uniform ' + name, env.commandStr);
                infix = '2i';
                break
              case GL_BOOL_VEC3:
                check$1.command(
                  isArrayLike(value) && value.length === 3,
                  'uniform ' + name, env.commandStr);
                infix = '3i';
                break
              case GL_INT_VEC3:
                check$1.command(
                  isArrayLike(value) && value.length === 3,
                  'uniform ' + name, env.commandStr);
                infix = '3i';
                break
              case GL_BOOL_VEC4:
                check$1.command(
                  isArrayLike(value) && value.length === 4,
                  'uniform ' + name, env.commandStr);
                infix = '4i';
                break
              case GL_INT_VEC4:
                check$1.command(
                  isArrayLike(value) && value.length === 4,
                  'uniform ' + name, env.commandStr);
                infix = '4i';
                break
            }
            scope(GL, '.uniform', infix, '(', LOCATION, ',',
              isArrayLike(value) ? Array.prototype.slice.call(value) : value,
              ');');
          }
          continue
        } else {
          VALUE = arg.append(env, scope);
        }
      } else {
        if (!filter(SCOPE_DECL)) {
          continue
        }
        VALUE = scope.def(shared.uniforms, '[', stringStore.id(name), ']');
      }

      if (type === GL_SAMPLER_2D) {
        scope(
          'if(', VALUE, '&&', VALUE, '._reglType==="framebuffer"){',
          VALUE, '=', VALUE, '.color[0];',
          '}');
      } else if (type === GL_SAMPLER_CUBE) {
        scope(
          'if(', VALUE, '&&', VALUE, '._reglType==="framebufferCube"){',
          VALUE, '=', VALUE, '.color[0];',
          '}');
      }

      // perform type validation
      check$1.optional(function () {
        function check (pred, message) {
          env.assert(scope, pred,
            'bad data or missing for uniform "' + name + '".  ' + message);
        }

        function checkType (type) {
          check(
            'typeof ' + VALUE + '==="' + type + '"',
            'invalid type, expected ' + type);
        }

        function checkVector (n, type) {
          check(
            shared.isArrayLike + '(' + VALUE + ')&&' + VALUE + '.length===' + n,
            'invalid vector, should have length ' + n, env.commandStr);
        }

        function checkTexture (target) {
          check(
            'typeof ' + VALUE + '==="function"&&' +
            VALUE + '._reglType==="texture' +
            (target === GL_TEXTURE_2D$2 ? '2d' : 'Cube') + '"',
            'invalid texture type', env.commandStr);
        }

        switch (type) {
          case GL_INT$3:
            checkType('number');
            break
          case GL_INT_VEC2:
            checkVector(2, 'number');
            break
          case GL_INT_VEC3:
            checkVector(3, 'number');
            break
          case GL_INT_VEC4:
            checkVector(4, 'number');
            break
          case GL_FLOAT$7:
            checkType('number');
            break
          case GL_FLOAT_VEC2:
            checkVector(2, 'number');
            break
          case GL_FLOAT_VEC3:
            checkVector(3, 'number');
            break
          case GL_FLOAT_VEC4:
            checkVector(4, 'number');
            break
          case GL_BOOL:
            checkType('boolean');
            break
          case GL_BOOL_VEC2:
            checkVector(2, 'boolean');
            break
          case GL_BOOL_VEC3:
            checkVector(3, 'boolean');
            break
          case GL_BOOL_VEC4:
            checkVector(4, 'boolean');
            break
          case GL_FLOAT_MAT2:
            checkVector(4, 'number');
            break
          case GL_FLOAT_MAT3:
            checkVector(9, 'number');
            break
          case GL_FLOAT_MAT4:
            checkVector(16, 'number');
            break
          case GL_SAMPLER_2D:
            checkTexture(GL_TEXTURE_2D$2);
            break
          case GL_SAMPLER_CUBE:
            checkTexture(GL_TEXTURE_CUBE_MAP$1);
            break
        }
      });

      var unroll = 1;
      switch (type) {
        case GL_SAMPLER_2D:
        case GL_SAMPLER_CUBE:
          var TEX = scope.def(VALUE, '._texture');
          scope(GL, '.uniform1i(', LOCATION, ',', TEX, '.bind());');
          scope.exit(TEX, '.unbind();');
          continue

        case GL_INT$3:
        case GL_BOOL:
          infix = '1i';
          break

        case GL_INT_VEC2:
        case GL_BOOL_VEC2:
          infix = '2i';
          unroll = 2;
          break

        case GL_INT_VEC3:
        case GL_BOOL_VEC3:
          infix = '3i';
          unroll = 3;
          break

        case GL_INT_VEC4:
        case GL_BOOL_VEC4:
          infix = '4i';
          unroll = 4;
          break

        case GL_FLOAT$7:
          infix = '1f';
          break

        case GL_FLOAT_VEC2:
          infix = '2f';
          unroll = 2;
          break

        case GL_FLOAT_VEC3:
          infix = '3f';
          unroll = 3;
          break

        case GL_FLOAT_VEC4:
          infix = '4f';
          unroll = 4;
          break

        case GL_FLOAT_MAT2:
          infix = 'Matrix2fv';
          break

        case GL_FLOAT_MAT3:
          infix = 'Matrix3fv';
          break

        case GL_FLOAT_MAT4:
          infix = 'Matrix4fv';
          break
      }

      scope(GL, '.uniform', infix, '(', LOCATION, ',');
      if (infix.charAt(0) === 'M') {
        var matSize = Math.pow(type - GL_FLOAT_MAT2 + 2, 2);
        var STORAGE = env.global.def('new Float32Array(', matSize, ')');
        scope(
          'false,(Array.isArray(', VALUE, ')||', VALUE, ' instanceof Float32Array)?', VALUE, ':(',
          loop(matSize, function (i) {
            return STORAGE + '[' + i + ']=' + VALUE + '[' + i + ']'
          }), ',', STORAGE, ')');
      } else if (unroll > 1) {
        scope(loop(unroll, function (i) {
          return VALUE + '[' + i + ']'
        }));
      } else {
        scope(VALUE);
      }
      scope(');');
    }
  }

  function emitDraw (env, outer, inner, args) {
    var shared = env.shared;
    var GL = shared.gl;
    var DRAW_STATE = shared.draw;

    var drawOptions = args.draw;

    function emitElements () {
      var defn = drawOptions.elements;
      var ELEMENTS;
      var scope = outer;
      if (defn) {
        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
          scope = inner;
        }
        ELEMENTS = defn.append(env, scope);
      } else {
        ELEMENTS = scope.def(DRAW_STATE, '.', S_ELEMENTS);
      }
      if (ELEMENTS) {
        scope(
          'if(' + ELEMENTS + ')' +
          GL + '.bindBuffer(' + GL_ELEMENT_ARRAY_BUFFER$1 + ',' + ELEMENTS + '.buffer.buffer);');
      }
      return ELEMENTS
    }

    function emitCount () {
      var defn = drawOptions.count;
      var COUNT;
      var scope = outer;
      if (defn) {
        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
          scope = inner;
        }
        COUNT = defn.append(env, scope);
        check$1.optional(function () {
          if (defn.MISSING) {
            env.assert(outer, 'false', 'missing vertex count');
          }
          if (defn.DYNAMIC) {
            env.assert(scope, COUNT + '>=0', 'missing vertex count');
          }
        });
      } else {
        COUNT = scope.def(DRAW_STATE, '.', S_COUNT);
        check$1.optional(function () {
          env.assert(scope, COUNT + '>=0', 'missing vertex count');
        });
      }
      return COUNT
    }

    var ELEMENTS = emitElements();
    function emitValue (name) {
      var defn = drawOptions[name];
      if (defn) {
        if ((defn.contextDep && args.contextDynamic) || defn.propDep) {
          return defn.append(env, inner)
        } else {
          return defn.append(env, outer)
        }
      } else {
        return outer.def(DRAW_STATE, '.', name)
      }
    }

    var PRIMITIVE = emitValue(S_PRIMITIVE);
    var OFFSET = emitValue(S_OFFSET);

    var COUNT = emitCount();
    if (typeof COUNT === 'number') {
      if (COUNT === 0) {
        return
      }
    } else {
      inner('if(', COUNT, '){');
      inner.exit('}');
    }

    var INSTANCES, EXT_INSTANCING;
    if (extInstancing) {
      INSTANCES = emitValue(S_INSTANCES);
      EXT_INSTANCING = env.instancing;
    }

    var ELEMENT_TYPE = ELEMENTS + '.type';

    var elementsStatic = drawOptions.elements && isStatic(drawOptions.elements);

    function emitInstancing () {
      function drawElements () {
        inner(EXT_INSTANCING, '.drawElementsInstancedANGLE(', [
          PRIMITIVE,
          COUNT,
          ELEMENT_TYPE,
          OFFSET + '<<((' + ELEMENT_TYPE + '-' + GL_UNSIGNED_BYTE$7 + ')>>1)',
          INSTANCES
        ], ');');
      }

      function drawArrays () {
        inner(EXT_INSTANCING, '.drawArraysInstancedANGLE(',
          [PRIMITIVE, OFFSET, COUNT, INSTANCES], ');');
      }

      if (ELEMENTS) {
        if (!elementsStatic) {
          inner('if(', ELEMENTS, '){');
          drawElements();
          inner('}else{');
          drawArrays();
          inner('}');
        } else {
          drawElements();
        }
      } else {
        drawArrays();
      }
    }

    function emitRegular () {
      function drawElements () {
        inner(GL + '.drawElements(' + [
          PRIMITIVE,
          COUNT,
          ELEMENT_TYPE,
          OFFSET + '<<((' + ELEMENT_TYPE + '-' + GL_UNSIGNED_BYTE$7 + ')>>1)'
        ] + ');');
      }

      function drawArrays () {
        inner(GL + '.drawArrays(' + [PRIMITIVE, OFFSET, COUNT] + ');');
      }

      if (ELEMENTS) {
        if (!elementsStatic) {
          inner('if(', ELEMENTS, '){');
          drawElements();
          inner('}else{');
          drawArrays();
          inner('}');
        } else {
          drawElements();
        }
      } else {
        drawArrays();
      }
    }

    if (extInstancing && (typeof INSTANCES !== 'number' || INSTANCES >= 0)) {
      if (typeof INSTANCES === 'string') {
        inner('if(', INSTANCES, '>0){');
        emitInstancing();
        inner('}else if(', INSTANCES, '<0){');
        emitRegular();
        inner('}');
      } else {
        emitInstancing();
      }
    } else {
      emitRegular();
    }
  }

  function createBody (emitBody, parentEnv, args, program, count) {
    var env = createREGLEnvironment();
    var scope = env.proc('body', count);
    check$1.optional(function () {
      env.commandStr = parentEnv.commandStr;
      env.command = env.link(parentEnv.commandStr);
    });
    if (extInstancing) {
      env.instancing = scope.def(
        env.shared.extensions, '.angle_instanced_arrays');
    }
    emitBody(env, scope, args, program);
    return env.compile().body
  }

  // ===================================================
  // ===================================================
  // DRAW PROC
  // ===================================================
  // ===================================================
  function emitDrawBody (env, draw, args, program) {
    injectExtensions(env, draw);
    emitAttributes(env, draw, args, program.attributes, function () {
      return true
    });
    emitUniforms(env, draw, args, program.uniforms, function () {
      return true
    });
    emitDraw(env, draw, draw, args);
  }

  function emitDrawProc (env, args) {
    var draw = env.proc('draw', 1);

    injectExtensions(env, draw);

    emitContext(env, draw, args.context);
    emitPollFramebuffer(env, draw, args.framebuffer);

    emitPollState(env, draw, args);
    emitSetOptions(env, draw, args.state);

    emitProfile(env, draw, args, false, true);

    var program = args.shader.progVar.append(env, draw);
    draw(env.shared.gl, '.useProgram(', program, '.program);');

    if (args.shader.program) {
      emitDrawBody(env, draw, args, args.shader.program);
    } else {
      var drawCache = env.global.def('{}');
      var PROG_ID = draw.def(program, '.id');
      var CACHED_PROC = draw.def(drawCache, '[', PROG_ID, ']');
      draw(
        env.cond(CACHED_PROC)
          .then(CACHED_PROC, '.call(this,a0);')
          .else(
            CACHED_PROC, '=', drawCache, '[', PROG_ID, ']=',
            env.link(function (program) {
              return createBody(emitDrawBody, env, args, program, 1)
            }), '(', program, ');',
            CACHED_PROC, '.call(this,a0);'));
    }

    if (Object.keys(args.state).length > 0) {
      draw(env.shared.current, '.dirty=true;');
    }
  }

  // ===================================================
  // ===================================================
  // BATCH PROC
  // ===================================================
  // ===================================================

  function emitBatchDynamicShaderBody (env, scope, args, program) {
    env.batchId = 'a1';

    injectExtensions(env, scope);

    function all () {
      return true
    }

    emitAttributes(env, scope, args, program.attributes, all);
    emitUniforms(env, scope, args, program.uniforms, all);
    emitDraw(env, scope, scope, args);
  }

  function emitBatchBody (env, scope, args, program) {
    injectExtensions(env, scope);

    var contextDynamic = args.contextDep;

    var BATCH_ID = scope.def();
    var PROP_LIST = 'a0';
    var NUM_PROPS = 'a1';
    var PROPS = scope.def();
    env.shared.props = PROPS;
    env.batchId = BATCH_ID;

    var outer = env.scope();
    var inner = env.scope();

    scope(
      outer.entry,
      'for(', BATCH_ID, '=0;', BATCH_ID, '<', NUM_PROPS, ';++', BATCH_ID, '){',
      PROPS, '=', PROP_LIST, '[', BATCH_ID, '];',
      inner,
      '}',
      outer.exit);

    function isInnerDefn (defn) {
      return ((defn.contextDep && contextDynamic) || defn.propDep)
    }

    function isOuterDefn (defn) {
      return !isInnerDefn(defn)
    }

    if (args.needsContext) {
      emitContext(env, inner, args.context);
    }
    if (args.needsFramebuffer) {
      emitPollFramebuffer(env, inner, args.framebuffer);
    }
    emitSetOptions(env, inner, args.state, isInnerDefn);

    if (args.profile && isInnerDefn(args.profile)) {
      emitProfile(env, inner, args, false, true);
    }

    if (!program) {
      var progCache = env.global.def('{}');
      var PROGRAM = args.shader.progVar.append(env, inner);
      var PROG_ID = inner.def(PROGRAM, '.id');
      var CACHED_PROC = inner.def(progCache, '[', PROG_ID, ']');
      inner(
        env.shared.gl, '.useProgram(', PROGRAM, '.program);',
        'if(!', CACHED_PROC, '){',
        CACHED_PROC, '=', progCache, '[', PROG_ID, ']=',
        env.link(function (program) {
          return createBody(
            emitBatchDynamicShaderBody, env, args, program, 2)
        }), '(', PROGRAM, ');}',
        CACHED_PROC, '.call(this,a0[', BATCH_ID, '],', BATCH_ID, ');');
    } else {
      emitAttributes(env, outer, args, program.attributes, isOuterDefn);
      emitAttributes(env, inner, args, program.attributes, isInnerDefn);
      emitUniforms(env, outer, args, program.uniforms, isOuterDefn);
      emitUniforms(env, inner, args, program.uniforms, isInnerDefn);
      emitDraw(env, outer, inner, args);
    }
  }

  function emitBatchProc (env, args) {
    var batch = env.proc('batch', 2);
    env.batchId = '0';

    injectExtensions(env, batch);

    // Check if any context variables depend on props
    var contextDynamic = false;
    var needsContext = true;
    Object.keys(args.context).forEach(function (name) {
      contextDynamic = contextDynamic || args.context[name].propDep;
    });
    if (!contextDynamic) {
      emitContext(env, batch, args.context);
      needsContext = false;
    }

    // framebuffer state affects framebufferWidth/height context vars
    var framebuffer = args.framebuffer;
    var needsFramebuffer = false;
    if (framebuffer) {
      if (framebuffer.propDep) {
        contextDynamic = needsFramebuffer = true;
      } else if (framebuffer.contextDep && contextDynamic) {
        needsFramebuffer = true;
      }
      if (!needsFramebuffer) {
        emitPollFramebuffer(env, batch, framebuffer);
      }
    } else {
      emitPollFramebuffer(env, batch, null);
    }

    // viewport is weird because it can affect context vars
    if (args.state.viewport && args.state.viewport.propDep) {
      contextDynamic = true;
    }

    function isInnerDefn (defn) {
      return (defn.contextDep && contextDynamic) || defn.propDep
    }

    // set webgl options
    emitPollState(env, batch, args);
    emitSetOptions(env, batch, args.state, function (defn) {
      return !isInnerDefn(defn)
    });

    if (!args.profile || !isInnerDefn(args.profile)) {
      emitProfile(env, batch, args, false, 'a1');
    }

    // Save these values to args so that the batch body routine can use them
    args.contextDep = contextDynamic;
    args.needsContext = needsContext;
    args.needsFramebuffer = needsFramebuffer;

    // determine if shader is dynamic
    var progDefn = args.shader.progVar;
    if ((progDefn.contextDep && contextDynamic) || progDefn.propDep) {
      emitBatchBody(
        env,
        batch,
        args,
        null);
    } else {
      var PROGRAM = progDefn.append(env, batch);
      batch(env.shared.gl, '.useProgram(', PROGRAM, '.program);');
      if (args.shader.program) {
        emitBatchBody(
          env,
          batch,
          args,
          args.shader.program);
      } else {
        var batchCache = env.global.def('{}');
        var PROG_ID = batch.def(PROGRAM, '.id');
        var CACHED_PROC = batch.def(batchCache, '[', PROG_ID, ']');
        batch(
          env.cond(CACHED_PROC)
            .then(CACHED_PROC, '.call(this,a0,a1);')
            .else(
              CACHED_PROC, '=', batchCache, '[', PROG_ID, ']=',
              env.link(function (program) {
                return createBody(emitBatchBody, env, args, program, 2)
              }), '(', PROGRAM, ');',
              CACHED_PROC, '.call(this,a0,a1);'));
      }
    }

    if (Object.keys(args.state).length > 0) {
      batch(env.shared.current, '.dirty=true;');
    }
  }

  // ===================================================
  // ===================================================
  // SCOPE COMMAND
  // ===================================================
  // ===================================================
  function emitScopeProc (env, args) {
    var scope = env.proc('scope', 3);
    env.batchId = 'a2';

    var shared = env.shared;
    var CURRENT_STATE = shared.current;

    emitContext(env, scope, args.context);

    if (args.framebuffer) {
      args.framebuffer.append(env, scope);
    }

    sortState(Object.keys(args.state)).forEach(function (name) {
      var defn = args.state[name];
      var value = defn.append(env, scope);
      if (isArrayLike(value)) {
        value.forEach(function (v, i) {
          scope.set(env.next[name], '[' + i + ']', v);
        });
      } else {
        scope.set(shared.next, '.' + name, value);
      }
    });

    emitProfile(env, scope, args, true, true)

    ;[S_ELEMENTS, S_OFFSET, S_COUNT, S_INSTANCES, S_PRIMITIVE].forEach(
      function (opt) {
        var variable = args.draw[opt];
        if (!variable) {
          return
        }
        scope.set(shared.draw, '.' + opt, '' + variable.append(env, scope));
      });

    Object.keys(args.uniforms).forEach(function (opt) {
      scope.set(
        shared.uniforms,
        '[' + stringStore.id(opt) + ']',
        args.uniforms[opt].append(env, scope));
    });

    Object.keys(args.attributes).forEach(function (name) {
      var record = args.attributes[name].append(env, scope);
      var scopeAttrib = env.scopeAttrib(name);
      Object.keys(new AttributeRecord()).forEach(function (prop) {
        scope.set(scopeAttrib, '.' + prop, record[prop]);
      });
    });

    function saveShader (name) {
      var shader = args.shader[name];
      if (shader) {
        scope.set(shared.shader, '.' + name, shader.append(env, scope));
      }
    }
    saveShader(S_VERT);
    saveShader(S_FRAG);

    if (Object.keys(args.state).length > 0) {
      scope(CURRENT_STATE, '.dirty=true;');
      scope.exit(CURRENT_STATE, '.dirty=true;');
    }

    scope('a1(', env.shared.context, ',a0,', env.batchId, ');');
  }

  function isDynamicObject (object) {
    if (typeof object !== 'object' || isArrayLike(object)) {
      return
    }
    var props = Object.keys(object);
    for (var i = 0; i < props.length; ++i) {
      if (dynamic.isDynamic(object[props[i]])) {
        return true
      }
    }
    return false
  }

  function splatObject (env, options, name) {
    var object = options.static[name];
    if (!object || !isDynamicObject(object)) {
      return
    }

    var globals = env.global;
    var keys = Object.keys(object);
    var thisDep = false;
    var contextDep = false;
    var propDep = false;
    var objectRef = env.global.def('{}');
    keys.forEach(function (key) {
      var value = object[key];
      if (dynamic.isDynamic(value)) {
        if (typeof value === 'function') {
          value = object[key] = dynamic.unbox(value);
        }
        var deps = createDynamicDecl(value, null);
        thisDep = thisDep || deps.thisDep;
        propDep = propDep || deps.propDep;
        contextDep = contextDep || deps.contextDep;
      } else {
        globals(objectRef, '.', key, '=');
        switch (typeof value) {
          case 'number':
            globals(value);
            break
          case 'string':
            globals('"', value, '"');
            break
          case 'object':
            if (Array.isArray(value)) {
              globals('[', value.join(), ']');
            }
            break
          default:
            globals(env.link(value));
            break
        }
        globals(';');
      }
    });

    function appendBlock (env, block) {
      keys.forEach(function (key) {
        var value = object[key];
        if (!dynamic.isDynamic(value)) {
          return
        }
        var ref = env.invoke(block, value);
        block(objectRef, '.', key, '=', ref, ';');
      });
    }

    options.dynamic[name] = new dynamic.DynamicVariable(DYN_THUNK, {
      thisDep: thisDep,
      contextDep: contextDep,
      propDep: propDep,
      ref: objectRef,
      append: appendBlock
    });
    delete options.static[name];
  }

  // ===========================================================================
  // ===========================================================================
  // MAIN DRAW COMMAND
  // ===========================================================================
  // ===========================================================================
  function compileCommand (options, attributes, uniforms, context, stats) {
    var env = createREGLEnvironment();

    // link stats, so that we can easily access it in the program.
    env.stats = env.link(stats);

    // splat options and attributes to allow for dynamic nested properties
    Object.keys(attributes.static).forEach(function (key) {
      splatObject(env, attributes, key);
    });
    NESTED_OPTIONS.forEach(function (name) {
      splatObject(env, options, name);
    });

    var args = parseArguments(options, attributes, uniforms, context, env);

    emitDrawProc(env, args);
    emitScopeProc(env, args);
    emitBatchProc(env, args);

    return env.compile()
  }

  // ===========================================================================
  // ===========================================================================
  // POLL / REFRESH
  // ===========================================================================
  // ===========================================================================
  return {
    next: nextState,
    current: currentState,
    procs: (function () {
      var env = createREGLEnvironment();
      var poll = env.proc('poll');
      var refresh = env.proc('refresh');
      var common = env.block();
      poll(common);
      refresh(common);

      var shared = env.shared;
      var GL = shared.gl;
      var NEXT_STATE = shared.next;
      var CURRENT_STATE = shared.current;

      common(CURRENT_STATE, '.dirty=false;');

      emitPollFramebuffer(env, poll);
      emitPollFramebuffer(env, refresh, null, true);

      // Refresh updates all attribute state changes
      var extInstancing = gl.getExtension('angle_instanced_arrays');
      var INSTANCING;
      if (extInstancing) {
        INSTANCING = env.link(extInstancing);
      }
      for (var i = 0; i < limits.maxAttributes; ++i) {
        var BINDING = refresh.def(shared.attributes, '[', i, ']');
        var ifte = env.cond(BINDING, '.buffer');
        ifte.then(
          GL, '.enableVertexAttribArray(', i, ');',
          GL, '.bindBuffer(',
            GL_ARRAY_BUFFER$1, ',',
            BINDING, '.buffer.buffer);',
          GL, '.vertexAttribPointer(',
            i, ',',
            BINDING, '.size,',
            BINDING, '.type,',
            BINDING, '.normalized,',
            BINDING, '.stride,',
            BINDING, '.offset);'
        ).else(
          GL, '.disableVertexAttribArray(', i, ');',
          GL, '.vertexAttrib4f(',
            i, ',',
            BINDING, '.x,',
            BINDING, '.y,',
            BINDING, '.z,',
            BINDING, '.w);',
          BINDING, '.buffer=null;');
        refresh(ifte);
        if (extInstancing) {
          refresh(
            INSTANCING, '.vertexAttribDivisorANGLE(',
            i, ',',
            BINDING, '.divisor);');
        }
      }

      Object.keys(GL_FLAGS).forEach(function (flag) {
        var cap = GL_FLAGS[flag];
        var NEXT = common.def(NEXT_STATE, '.', flag);
        var block = env.block();
        block('if(', NEXT, '){',
          GL, '.enable(', cap, ')}else{',
          GL, '.disable(', cap, ')}',
          CURRENT_STATE, '.', flag, '=', NEXT, ';');
        refresh(block);
        poll(
          'if(', NEXT, '!==', CURRENT_STATE, '.', flag, '){',
          block,
          '}');
      });

      Object.keys(GL_VARIABLES).forEach(function (name) {
        var func = GL_VARIABLES[name];
        var init = currentState[name];
        var NEXT, CURRENT;
        var block = env.block();
        block(GL, '.', func, '(');
        if (isArrayLike(init)) {
          var n = init.length;
          NEXT = env.global.def(NEXT_STATE, '.', name);
          CURRENT = env.global.def(CURRENT_STATE, '.', name);
          block(
            loop(n, function (i) {
              return NEXT + '[' + i + ']'
            }), ');',
            loop(n, function (i) {
              return CURRENT + '[' + i + ']=' + NEXT + '[' + i + '];'
            }).join(''));
          poll(
            'if(', loop(n, function (i) {
              return NEXT + '[' + i + ']!==' + CURRENT + '[' + i + ']'
            }).join('||'), '){',
            block,
            '}');
        } else {
          NEXT = common.def(NEXT_STATE, '.', name);
          CURRENT = common.def(CURRENT_STATE, '.', name);
          block(
            NEXT, ');',
            CURRENT_STATE, '.', name, '=', NEXT, ';');
          poll(
            'if(', NEXT, '!==', CURRENT, '){',
            block,
            '}');
        }
        refresh(block);
      });

      return env.compile()
    })(),
    compile: compileCommand
  }
}

function stats () {
  return {
    bufferCount: 0,
    elementsCount: 0,
    framebufferCount: 0,
    shaderCount: 0,
    textureCount: 0,
    cubeCount: 0,
    renderbufferCount: 0,

    maxTextureUnits: 0
  }
}

var GL_QUERY_RESULT_EXT = 0x8866;
var GL_QUERY_RESULT_AVAILABLE_EXT = 0x8867;
var GL_TIME_ELAPSED_EXT = 0x88BF;

var createTimer = function (gl, extensions) {
  var extTimer = extensions.ext_disjoint_timer_query;

  if (!extTimer) {
    return null
  }

  // QUERY POOL BEGIN
  var queryPool = [];
  function allocQuery () {
    return queryPool.pop() || extTimer.createQueryEXT()
  }
  function freeQuery (query) {
    queryPool.push(query);
  }
  // QUERY POOL END

  var pendingQueries = [];
  function beginQuery (stats) {
    var query = allocQuery();
    extTimer.beginQueryEXT(GL_TIME_ELAPSED_EXT, query);
    pendingQueries.push(query);
    pushScopeStats(pendingQueries.length - 1, pendingQueries.length, stats);
  }

  function endQuery () {
    extTimer.endQueryEXT(GL_TIME_ELAPSED_EXT);
  }

  //
  // Pending stats pool.
  //
  function PendingStats () {
    this.startQueryIndex = -1;
    this.endQueryIndex = -1;
    this.sum = 0;
    this.stats = null;
  }
  var pendingStatsPool = [];
  function allocPendingStats () {
    return pendingStatsPool.pop() || new PendingStats()
  }
  function freePendingStats (pendingStats) {
    pendingStatsPool.push(pendingStats);
  }
  // Pending stats pool end

  var pendingStats = [];
  function pushScopeStats (start, end, stats) {
    var ps = allocPendingStats();
    ps.startQueryIndex = start;
    ps.endQueryIndex = end;
    ps.sum = 0;
    ps.stats = stats;
    pendingStats.push(ps);
  }

  // we should call this at the beginning of the frame,
  // in order to update gpuTime
  var timeSum = [];
  var queryPtr = [];
  function update () {
    var ptr, i;

    var n = pendingQueries.length;
    if (n === 0) {
      return
    }

    // Reserve space
    queryPtr.length = Math.max(queryPtr.length, n + 1);
    timeSum.length = Math.max(timeSum.length, n + 1);
    timeSum[0] = 0;
    queryPtr[0] = 0;

    // Update all pending timer queries
    var queryTime = 0;
    ptr = 0;
    for (i = 0; i < pendingQueries.length; ++i) {
      var query = pendingQueries[i];
      if (extTimer.getQueryObjectEXT(query, GL_QUERY_RESULT_AVAILABLE_EXT)) {
        queryTime += extTimer.getQueryObjectEXT(query, GL_QUERY_RESULT_EXT);
        freeQuery(query);
      } else {
        pendingQueries[ptr++] = query;
      }
      timeSum[i + 1] = queryTime;
      queryPtr[i + 1] = ptr;
    }
    pendingQueries.length = ptr;

    // Update all pending stat queries
    ptr = 0;
    for (i = 0; i < pendingStats.length; ++i) {
      var stats = pendingStats[i];
      var start = stats.startQueryIndex;
      var end = stats.endQueryIndex;
      stats.sum += timeSum[end] - timeSum[start];
      var startPtr = queryPtr[start];
      var endPtr = queryPtr[end];
      if (endPtr === startPtr) {
        stats.stats.gpuTime += stats.sum / 1e6;
        freePendingStats(stats);
      } else {
        stats.startQueryIndex = startPtr;
        stats.endQueryIndex = endPtr;
        pendingStats[ptr++] = stats;
      }
    }
    pendingStats.length = ptr;
  }

  return {
    beginQuery: beginQuery,
    endQuery: endQuery,
    pushScopeStats: pushScopeStats,
    update: update,
    getNumPendingQueries: function () {
      return pendingQueries.length
    },
    clear: function () {
      queryPool.push.apply(queryPool, pendingQueries);
      for (var i = 0; i < queryPool.length; i++) {
        extTimer.deleteQueryEXT(queryPool[i]);
      }
      pendingQueries.length = 0;
      queryPool.length = 0;
    },
    restore: function () {
      pendingQueries.length = 0;
      queryPool.length = 0;
    }
  }
};

var GL_COLOR_BUFFER_BIT = 16384;
var GL_DEPTH_BUFFER_BIT = 256;
var GL_STENCIL_BUFFER_BIT = 1024;

var GL_ARRAY_BUFFER = 34962;

var CONTEXT_LOST_EVENT = 'webglcontextlost';
var CONTEXT_RESTORED_EVENT = 'webglcontextrestored';

var DYN_PROP = 1;
var DYN_CONTEXT = 2;
var DYN_STATE = 3;

function find (haystack, needle) {
  for (var i = 0; i < haystack.length; ++i) {
    if (haystack[i] === needle) {
      return i
    }
  }
  return -1
}

function wrapREGL (args) {
  var config = parseArgs(args);
  if (!config) {
    return null
  }

  var gl = config.gl;
  var glAttributes = gl.getContextAttributes();
  var contextLost = gl.isContextLost();

  var extensionState = createExtensionCache(gl, config);
  if (!extensionState) {
    return null
  }

  var stringStore = createStringStore();
  var stats$$1 = stats();
  var extensions = extensionState.extensions;
  var timer = createTimer(gl, extensions);

  var START_TIME = clock();
  var WIDTH = gl.drawingBufferWidth;
  var HEIGHT = gl.drawingBufferHeight;

  var contextState = {
    tick: 0,
    time: 0,
    viewportWidth: WIDTH,
    viewportHeight: HEIGHT,
    framebufferWidth: WIDTH,
    framebufferHeight: HEIGHT,
    drawingBufferWidth: WIDTH,
    drawingBufferHeight: HEIGHT,
    pixelRatio: config.pixelRatio
  };
  var uniformState = {};
  var drawState = {
    elements: null,
    primitive: 4, // GL_TRIANGLES
    count: -1,
    offset: 0,
    instances: -1
  };

  var limits = wrapLimits(gl, extensions);
  var bufferState = wrapBufferState(gl, stats$$1, config);
  var elementState = wrapElementsState(gl, extensions, bufferState, stats$$1);
  var attributeState = wrapAttributeState(
    gl,
    extensions,
    limits,
    bufferState,
    stringStore);
  var shaderState = wrapShaderState(gl, stringStore, stats$$1, config);
  var textureState = createTextureSet(
    gl,
    extensions,
    limits,
    function () { core.procs.poll(); },
    contextState,
    stats$$1,
    config);
  var renderbufferState = wrapRenderbuffers(gl, extensions, limits, stats$$1, config);
  var framebufferState = wrapFBOState(
    gl,
    extensions,
    limits,
    textureState,
    renderbufferState,
    stats$$1);
  var core = reglCore(
    gl,
    stringStore,
    extensions,
    limits,
    bufferState,
    elementState,
    textureState,
    framebufferState,
    uniformState,
    attributeState,
    shaderState,
    drawState,
    contextState,
    timer,
    config);
  var readPixels = wrapReadPixels(
    gl,
    framebufferState,
    core.procs.poll,
    contextState,
    glAttributes, extensions);

  var nextState = core.next;
  var canvas = gl.canvas;

  var rafCallbacks = [];
  var lossCallbacks = [];
  var restoreCallbacks = [];
  var destroyCallbacks = [config.onDestroy];

  var activeRAF = null;
  function handleRAF () {
    if (rafCallbacks.length === 0) {
      if (timer) {
        timer.update();
      }
      activeRAF = null;
      return
    }

    // schedule next animation frame
    activeRAF = raf.next(handleRAF);

    // poll for changes
    poll();

    // fire a callback for all pending rafs
    for (var i = rafCallbacks.length - 1; i >= 0; --i) {
      var cb = rafCallbacks[i];
      if (cb) {
        cb(contextState, null, 0);
      }
    }

    // flush all pending webgl calls
    gl.flush();

    // poll GPU timers *after* gl.flush so we don't delay command dispatch
    if (timer) {
      timer.update();
    }
  }

  function startRAF () {
    if (!activeRAF && rafCallbacks.length > 0) {
      activeRAF = raf.next(handleRAF);
    }
  }

  function stopRAF () {
    if (activeRAF) {
      raf.cancel(handleRAF);
      activeRAF = null;
    }
  }

  function handleContextLoss (event) {
    event.preventDefault();

    // set context lost flag
    contextLost = true;

    // pause request animation frame
    stopRAF();

    // lose context
    lossCallbacks.forEach(function (cb) {
      cb();
    });
  }

  function handleContextRestored (event) {
    // clear error code
    gl.getError();

    // clear context lost flag
    contextLost = false;

    // refresh state
    extensionState.restore();
    shaderState.restore();
    bufferState.restore();
    textureState.restore();
    renderbufferState.restore();
    framebufferState.restore();
    if (timer) {
      timer.restore();
    }

    // refresh state
    core.procs.refresh();

    // restart RAF
    startRAF();

    // restore context
    restoreCallbacks.forEach(function (cb) {
      cb();
    });
  }

  if (canvas) {
    canvas.addEventListener(CONTEXT_LOST_EVENT, handleContextLoss, false);
    canvas.addEventListener(CONTEXT_RESTORED_EVENT, handleContextRestored, false);
  }

  function destroy () {
    rafCallbacks.length = 0;
    stopRAF();

    if (canvas) {
      canvas.removeEventListener(CONTEXT_LOST_EVENT, handleContextLoss);
      canvas.removeEventListener(CONTEXT_RESTORED_EVENT, handleContextRestored);
    }

    shaderState.clear();
    framebufferState.clear();
    renderbufferState.clear();
    textureState.clear();
    elementState.clear();
    bufferState.clear();

    if (timer) {
      timer.clear();
    }

    destroyCallbacks.forEach(function (cb) {
      cb();
    });
  }

  function compileProcedure (options) {
    check$1(!!options, 'invalid args to regl({...})');
    check$1.type(options, 'object', 'invalid args to regl({...})');

    function flattenNestedOptions (options) {
      var result = extend({}, options);
      delete result.uniforms;
      delete result.attributes;
      delete result.context;

      if ('stencil' in result && result.stencil.op) {
        result.stencil.opBack = result.stencil.opFront = result.stencil.op;
        delete result.stencil.op;
      }

      function merge (name) {
        if (name in result) {
          var child = result[name];
          delete result[name];
          Object.keys(child).forEach(function (prop) {
            result[name + '.' + prop] = child[prop];
          });
        }
      }
      merge('blend');
      merge('depth');
      merge('cull');
      merge('stencil');
      merge('polygonOffset');
      merge('scissor');
      merge('sample');

      return result
    }

    function separateDynamic (object) {
      var staticItems = {};
      var dynamicItems = {};
      Object.keys(object).forEach(function (option) {
        var value = object[option];
        if (dynamic.isDynamic(value)) {
          dynamicItems[option] = dynamic.unbox(value, option);
        } else {
          staticItems[option] = value;
        }
      });
      return {
        dynamic: dynamicItems,
        static: staticItems
      }
    }

    // Treat context variables separate from other dynamic variables
    var context = separateDynamic(options.context || {});
    var uniforms = separateDynamic(options.uniforms || {});
    var attributes = separateDynamic(options.attributes || {});
    var opts = separateDynamic(flattenNestedOptions(options));

    var stats$$1 = {
      gpuTime: 0.0,
      cpuTime: 0.0,
      count: 0
    };

    var compiled = core.compile(opts, attributes, uniforms, context, stats$$1);

    var draw = compiled.draw;
    var batch = compiled.batch;
    var scope = compiled.scope;

    // FIXME: we should modify code generation for batch commands so this
    // isn't necessary
    var EMPTY_ARRAY = [];
    function reserve (count) {
      while (EMPTY_ARRAY.length < count) {
        EMPTY_ARRAY.push(null);
      }
      return EMPTY_ARRAY
    }

    function REGLCommand (args, body) {
      var i;
      if (contextLost) {
        check$1.raise('context lost');
      }
      if (typeof args === 'function') {
        return scope.call(this, null, args, 0)
      } else if (typeof body === 'function') {
        if (typeof args === 'number') {
          for (i = 0; i < args; ++i) {
            scope.call(this, null, body, i);
          }
          return
        } else if (Array.isArray(args)) {
          for (i = 0; i < args.length; ++i) {
            scope.call(this, args[i], body, i);
          }
          return
        } else {
          return scope.call(this, args, body, 0)
        }
      } else if (typeof args === 'number') {
        if (args > 0) {
          return batch.call(this, reserve(args | 0), args | 0)
        }
      } else if (Array.isArray(args)) {
        if (args.length) {
          return batch.call(this, args, args.length)
        }
      } else {
        return draw.call(this, args)
      }
    }

    return extend(REGLCommand, {
      stats: stats$$1
    })
  }

  var setFBO = framebufferState.setFBO = compileProcedure({
    framebuffer: dynamic.define.call(null, DYN_PROP, 'framebuffer')
  });

  function clearImpl (_, options) {
    var clearFlags = 0;
    core.procs.poll();

    var c = options.color;
    if (c) {
      gl.clearColor(+c[0] || 0, +c[1] || 0, +c[2] || 0, +c[3] || 0);
      clearFlags |= GL_COLOR_BUFFER_BIT;
    }
    if ('depth' in options) {
      gl.clearDepth(+options.depth);
      clearFlags |= GL_DEPTH_BUFFER_BIT;
    }
    if ('stencil' in options) {
      gl.clearStencil(options.stencil | 0);
      clearFlags |= GL_STENCIL_BUFFER_BIT;
    }

    check$1(!!clearFlags, 'called regl.clear with no buffer specified');
    gl.clear(clearFlags);
  }

  function clear (options) {
    check$1(
      typeof options === 'object' && options,
      'regl.clear() takes an object as input');
    if ('framebuffer' in options) {
      if (options.framebuffer &&
          options.framebuffer_reglType === 'framebufferCube') {
        for (var i = 0; i < 6; ++i) {
          setFBO(extend({
            framebuffer: options.framebuffer.faces[i]
          }, options), clearImpl);
        }
      } else {
        setFBO(options, clearImpl);
      }
    } else {
      clearImpl(null, options);
    }
  }

  function frame (cb) {
    check$1.type(cb, 'function', 'regl.frame() callback must be a function');
    rafCallbacks.push(cb);

    function cancel () {
      // FIXME:  should we check something other than equals cb here?
      // what if a user calls frame twice with the same callback...
      //
      var i = find(rafCallbacks, cb);
      check$1(i >= 0, 'cannot cancel a frame twice');
      function pendingCancel () {
        var index = find(rafCallbacks, pendingCancel);
        rafCallbacks[index] = rafCallbacks[rafCallbacks.length - 1];
        rafCallbacks.length -= 1;
        if (rafCallbacks.length <= 0) {
          stopRAF();
        }
      }
      rafCallbacks[i] = pendingCancel;
    }

    startRAF();

    return {
      cancel: cancel
    }
  }

  // poll viewport
  function pollViewport () {
    var viewport = nextState.viewport;
    var scissorBox = nextState.scissor_box;
    viewport[0] = viewport[1] = scissorBox[0] = scissorBox[1] = 0;
    contextState.viewportWidth =
      contextState.framebufferWidth =
      contextState.drawingBufferWidth =
      viewport[2] =
      scissorBox[2] = gl.drawingBufferWidth;
    contextState.viewportHeight =
      contextState.framebufferHeight =
      contextState.drawingBufferHeight =
      viewport[3] =
      scissorBox[3] = gl.drawingBufferHeight;
  }

  function poll () {
    contextState.tick += 1;
    contextState.time = now();
    pollViewport();
    core.procs.poll();
  }

  function refresh () {
    pollViewport();
    core.procs.refresh();
    if (timer) {
      timer.update();
    }
  }

  function now () {
    return (clock() - START_TIME) / 1000.0
  }

  refresh();

  function addListener (event, callback) {
    check$1.type(callback, 'function', 'listener callback must be a function');

    var callbacks;
    switch (event) {
      case 'frame':
        return frame(callback)
      case 'lost':
        callbacks = lossCallbacks;
        break
      case 'restore':
        callbacks = restoreCallbacks;
        break
      case 'destroy':
        callbacks = destroyCallbacks;
        break
      default:
        check$1.raise('invalid event, must be one of frame,lost,restore,destroy');
    }

    callbacks.push(callback);
    return {
      cancel: function () {
        for (var i = 0; i < callbacks.length; ++i) {
          if (callbacks[i] === callback) {
            callbacks[i] = callbacks[callbacks.length - 1];
            callbacks.pop();
            return
          }
        }
      }
    }
  }

  var regl = extend(compileProcedure, {
    // Clear current FBO
    clear: clear,

    // Short cuts for dynamic variables
    prop: dynamic.define.bind(null, DYN_PROP),
    context: dynamic.define.bind(null, DYN_CONTEXT),
    this: dynamic.define.bind(null, DYN_STATE),

    // executes an empty draw command
    draw: compileProcedure({}),

    // Resources
    buffer: function (options) {
      return bufferState.create(options, GL_ARRAY_BUFFER, false, false)
    },
    elements: function (options) {
      return elementState.create(options, false)
    },
    texture: textureState.create2D,
    cube: textureState.createCube,
    renderbuffer: renderbufferState.create,
    framebuffer: framebufferState.create,
    framebufferCube: framebufferState.createCube,

    // Expose context attributes
    attributes: glAttributes,

    // Frame rendering
    frame: frame,
    on: addListener,

    // System limits
    limits: limits,
    hasExtension: function (name) {
      return limits.extensions.indexOf(name.toLowerCase()) >= 0
    },

    // Read pixels
    read: readPixels,

    // Destroy regl and all associated resources
    destroy: destroy,

    // Direct GL state manipulation
    _gl: gl,
    _refresh: refresh,

    poll: function () {
      poll();
      if (timer) {
        timer.update();
      }
    },

    // Current time
    now: now,

    // regl Statistics Information
    stats: stats$$1
  });

  config.onDone(null, regl);

  return regl
}

return wrapREGL;

})));


},{}],149:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":12,"inherits":78,"readable-stream/duplex.js":151,"readable-stream/passthrough.js":158,"readable-stream/readable.js":159,"readable-stream/transform.js":160,"readable-stream/writable.js":161}],150:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],151:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":152}],152:[function(require,module,exports){
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}
},{"./_stream_readable":154,"./_stream_writable":156,"core-util-is":11,"inherits":78,"process-nextick-args":146}],153:[function(require,module,exports){
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":155,"core-util-is":11,"inherits":78}],154:[function(require,module,exports){
(function (process){
'use strict';

module.exports = Readable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;
/*<replacement>*/
var bufferShim = require('buffer-shims');
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var StringDecoder;

util.inherits(Readable, Stream);

function prependListener(emitter, event, fn) {
  if (typeof emitter.prependListener === 'function') {
    return emitter.prependListener(event, fn);
  } else {
    // This is a hack to make sure that our error handler is attached before any
    // userland ones.  NEVER DO THIS. This is here only because this code needs
    // to continue to work with older versions of Node.js that do not include
    // the prependListener() method. The goal is to eventually remove this hack.
    if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
  }
}

var Duplex;
function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

var Duplex;
function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options && typeof options.read === 'function') this._read = options.read;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;

  if (!state.objectMode && typeof chunk === 'string') {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = bufferShim.from(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var _e = new Error('stream.unshift() after end event');
      stream.emit('error', _e);
    } else {
      var skipAdd;
      if (state.decoder && !addToFront && !encoding) {
        chunk = state.decoder.write(chunk);
        skipAdd = !state.objectMode && chunk.length === 0;
      }

      if (!addToFront) state.reading = false;

      // Don't add to the buffer if we've decoded to an empty string chunk and
      // we're not in object mode
      if (!skipAdd) {
        // if we want the data now, just emit it.
        if (state.flowing && state.length === 0 && !state.sync) {
          stream.emit('data', chunk);
          stream.read(0);
        } else {
          // update the buffer info.
          state.length += state.objectMode ? 1 : chunk.length;
          if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

          if (state.needReadable) emitReadable(stream);
        }
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var _i = 0; _i < len; _i++) {
      dests[_i].emit('unpipe', this);
    }return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1) return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function (ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = bufferShim.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'))
},{"./_stream_duplex":152,"./internal/streams/BufferList":157,"_process":147,"buffer":8,"buffer-shims":7,"core-util-is":11,"events":12,"inherits":78,"isarray":150,"process-nextick-args":146,"string_decoder/":162,"util":6}],155:[function(require,module,exports){
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function TransformState(stream) {
  this.afterTransform = function (er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
  this.writeencoding = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined) stream.push(data);

  cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  this.once('prefinish', function () {
    if (typeof this._flush === 'function') this._flush(function (er) {
      done(stream, er);
    });else done(stream);
  });
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('Not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

function done(stream, er) {
  if (er) return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length) throw new Error('Calling transform done when ws.length != 0');

  if (ts.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":152,"core-util-is":11,"inherits":78}],156:[function(require,module,exports){
(function (process){
// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;
/*<replacement>*/
var bufferShim = require('buffer-shims');
/*</replacement>*/

util.inherits(Writable, Stream);

function nop() {}

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

var Duplex;
function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function writableStateGetBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
    });
  } catch (_) {}
})();

var Duplex;
function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;
  // Always throw error if a null is written
  // if we are not in object mode then throw
  // if it is not a buffer, string, or undefined.
  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = bufferShim.from(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) processNextTick(cb, er);else cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
        afterWrite(stream, state, finished, cb);
      }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    while (entry) {
      buffer[count] = entry;
      entry = entry.next;
      count += 1;
    }

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequestCount = 0;
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else {
      prefinish(stream, state);
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;

  this.finish = function (err) {
    var entry = _this.entry;
    _this.entry = null;
    while (entry) {
      var cb = entry.callback;
      state.pendingcb--;
      cb(err);
      entry = entry.next;
    }
    if (state.corkedRequestsFree) {
      state.corkedRequestsFree.next = _this;
    } else {
      state.corkedRequestsFree = _this;
    }
  };
}
}).call(this,require('_process'))
},{"./_stream_duplex":152,"_process":147,"buffer":8,"buffer-shims":7,"core-util-is":11,"events":12,"inherits":78,"process-nextick-args":146,"util-deprecate":180}],157:[function(require,module,exports){
'use strict';

var Buffer = require('buffer').Buffer;
/*<replacement>*/
var bufferShim = require('buffer-shims');
/*</replacement>*/

module.exports = BufferList;

function BufferList() {
  this.head = null;
  this.tail = null;
  this.length = 0;
}

BufferList.prototype.push = function (v) {
  var entry = { data: v, next: null };
  if (this.length > 0) this.tail.next = entry;else this.head = entry;
  this.tail = entry;
  ++this.length;
};

BufferList.prototype.unshift = function (v) {
  var entry = { data: v, next: this.head };
  if (this.length === 0) this.tail = entry;
  this.head = entry;
  ++this.length;
};

BufferList.prototype.shift = function () {
  if (this.length === 0) return;
  var ret = this.head.data;
  if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
  --this.length;
  return ret;
};

BufferList.prototype.clear = function () {
  this.head = this.tail = null;
  this.length = 0;
};

BufferList.prototype.join = function (s) {
  if (this.length === 0) return '';
  var p = this.head;
  var ret = '' + p.data;
  while (p = p.next) {
    ret += s + p.data;
  }return ret;
};

BufferList.prototype.concat = function (n) {
  if (this.length === 0) return bufferShim.alloc(0);
  if (this.length === 1) return this.head.data;
  var ret = bufferShim.allocUnsafe(n >>> 0);
  var p = this.head;
  var i = 0;
  while (p) {
    p.data.copy(ret, i);
    i += p.data.length;
    p = p.next;
  }
  return ret;
};
},{"buffer":8,"buffer-shims":7}],158:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":153}],159:[function(require,module,exports){
(function (process){
var Stream = (function (){
  try {
    return require('st' + 'ream'); // hack to fix a circular dependency issue when used with browserify
  } catch(_){}
}());
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream || exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

if (!process.browser && process.env.READABLE_STREAM === 'disable' && Stream) {
  module.exports = Stream;
}

}).call(this,require('_process'))
},{"./lib/_stream_duplex.js":152,"./lib/_stream_passthrough.js":153,"./lib/_stream_readable.js":154,"./lib/_stream_transform.js":155,"./lib/_stream_writable.js":156,"_process":147}],160:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":155}],161:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":156}],162:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":8}],163:[function(require,module,exports){
module.exports = require('./lib/index');

},{"./lib/index":164}],164:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ponyfill = require('./ponyfill');

var _ponyfill2 = _interopRequireDefault(_ponyfill);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var root = module; /* global window */


if (typeof self !== 'undefined') {
  root = self;
} else if (typeof window !== 'undefined') {
  root = window;
} else if (typeof global !== 'undefined') {
  root = global;
} else {
  root = Function('return this')();
}

var result = (0, _ponyfill2['default'])(root);
exports['default'] = result;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./ponyfill":165}],165:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports['default'] = symbolObservablePonyfill;
function symbolObservablePonyfill(root) {
	var result;
	var _Symbol = root.Symbol;

	if (typeof _Symbol === 'function') {
		if (_Symbol.observable) {
			result = _Symbol.observable;
		} else {
			result = _Symbol('observable');
			_Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
};
},{}],166:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],167:[function(require,module,exports){
arguments[4][152][0].apply(exports,arguments)
},{"./_stream_readable":168,"./_stream_writable":170,"core-util-is":11,"dup":152,"inherits":78,"process-nextick-args":146}],168:[function(require,module,exports){
(function (process){
'use strict';

module.exports = Readable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events');

/*<replacement>*/
var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = undefined;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

var Duplex;
function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

var Duplex;
function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options && typeof options.read === 'function') this._read = options.read;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;

  if (!state.objectMode && typeof chunk === 'string') {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      var skipAdd;
      if (state.decoder && !addToFront && !encoding) {
        chunk = state.decoder.write(chunk);
        skipAdd = !state.objectMode && chunk.length === 0;
      }

      if (!addToFront) state.reading = false;

      // Don't add to the buffer if we've decoded to an empty string chunk and
      // we're not in object mode
      if (!skipAdd) {
        // if we want the data now, just emit it.
        if (state.flowing && state.length === 0 && !state.sync) {
          stream.emit('data', chunk);
          stream.read(0);
        } else {
          // update the buffer info.
          state.length += state.objectMode ? 1 : chunk.length;
          if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

          if (state.needReadable) emitReadable(stream);
        }
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended) return 0;

  if (state.objectMode) return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length) return state.buffer[0].length;else return state.length;
  }

  if (n <= 0) return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else {
      return state.length;
    }
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (typeof n !== 'number' || n > 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading) n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended) state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0) endReadable(this);

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      if (state.pipesCount === 1 && state.pipes[0] === dest && src.listenerCount('data') === 1 && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error) dest.on('error', onerror);else if (isArray(dest._events.error)) dest._events.error.unshift(onerror);else dest._events.error = [onerror, dest._events.error];

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var _i = 0; _i < len; _i++) {
      dests[_i].emit('unpipe', this);
    }return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1) return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && !this._readableState.endEmitted) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function (ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0) return null;

  if (length === 0) ret = null;else if (objectMode) ret = list.shift();else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode) ret = list.join('');else if (list.length === 1) ret = list[0];else ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode) ret = '';else ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode) ret += buf.slice(0, cpy);else buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length) list[0] = buf.slice(cpy);else list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'))
},{"./_stream_duplex":167,"_process":147,"buffer":8,"core-util-is":11,"events":12,"inherits":78,"isarray":166,"process-nextick-args":146,"string_decoder/":162,"util":6}],169:[function(require,module,exports){
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function TransformState(stream) {
  this.afterTransform = function (er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
  this.writeencoding = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined) stream.push(data);

  cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  this.once('prefinish', function () {
    if (typeof this._flush === 'function') this._flush(function (er) {
      done(stream, er);
    });else done(stream);
  });
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

function done(stream, er) {
  if (er) return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length) throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming) throw new Error('calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":167,"core-util-is":11,"inherits":78}],170:[function(require,module,exports){
(function (process){
// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
/*</replacement>*/

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;

util.inherits(Writable, Stream);

function nop() {}

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

var Duplex;
function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // create the two objects needed to store the corked requests
  // they are not a linked list, as no new elements are inserted in there
  this.corkedRequestsFree = new CorkedRequest(this);
  this.corkedRequestsFree.next = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function writableStateGetBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
    });
  } catch (_) {}
})();

var Duplex;
function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;

  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) processNextTick(cb, er);else cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
        afterWrite(stream, state, finished, cb);
      }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    while (entry) {
      buffer[count] = entry;
      entry = entry.next;
      count += 1;
    }

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    state.corkedRequestsFree = holder.next;
    holder.next = null;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequestCount = 0;
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else {
      prefinish(stream, state);
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;

  this.finish = function (err) {
    var entry = _this.entry;
    _this.entry = null;
    while (entry) {
      var cb = entry.callback;
      state.pendingcb--;
      cb(err);
      entry = entry.next;
    }
    if (state.corkedRequestsFree) {
      state.corkedRequestsFree.next = _this;
    } else {
      state.corkedRequestsFree = _this;
    }
  };
}
}).call(this,require('_process'))
},{"./_stream_duplex":167,"_process":147,"buffer":8,"core-util-is":11,"events":12,"inherits":78,"process-nextick-args":146,"util-deprecate":180}],171:[function(require,module,exports){
arguments[4][160][0].apply(exports,arguments)
},{"./lib/_stream_transform.js":169,"dup":160}],172:[function(require,module,exports){
(function (process){
var Transform = require('readable-stream/transform')
  , inherits  = require('util').inherits
  , xtend     = require('xtend')

function DestroyableTransform(opts) {
  Transform.call(this, opts)
  this._destroyed = false
}

inherits(DestroyableTransform, Transform)

DestroyableTransform.prototype.destroy = function(err) {
  if (this._destroyed) return
  this._destroyed = true
  
  var self = this
  process.nextTick(function() {
    if (err)
      self.emit('error', err)
    self.emit('close')
  })
}

// a noop _transform function
function noop (chunk, enc, callback) {
  callback(null, chunk)
}


// create a new export function, used by both the main export and
// the .ctor export, contains common logic for dealing with arguments
function through2 (construct) {
  return function (options, transform, flush) {
    if (typeof options == 'function') {
      flush     = transform
      transform = options
      options   = {}
    }

    if (typeof transform != 'function')
      transform = noop

    if (typeof flush != 'function')
      flush = null

    return construct(options, transform, flush)
  }
}


// main export, just make me a transform stream!
module.exports = through2(function (options, transform, flush) {
  var t2 = new DestroyableTransform(options)

  t2._transform = transform

  if (flush)
    t2._flush = flush

  return t2
})


// make me a reusable prototype that I can `new`, or implicitly `new`
// with a constructor call
module.exports.ctor = through2(function (options, transform, flush) {
  function Through2 (override) {
    if (!(this instanceof Through2))
      return new Through2(override)

    this.options = xtend(options, override)

    DestroyableTransform.call(this, this.options)
  }

  inherits(Through2, DestroyableTransform)

  Through2.prototype._transform = transform

  if (flush)
    Through2.prototype._flush = flush

  return Through2
})


module.exports.obj = through2(function (options, transform, flush) {
  var t2 = new DestroyableTransform(xtend({ objectMode: true, highWaterMark: 16 }, options))

  t2._transform = transform

  if (flush)
    t2._flush = flush

  return t2
})

}).call(this,require('_process'))
},{"_process":147,"readable-stream/transform":171,"util":183,"xtend":184}],173:[function(require,module,exports){
(function (Buffer){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Duplex = require('stream').Duplex;

/* utility to wrap a web worker and turn it into a stream*/

var WorkerStream = function (_Duplex) {
  _inherits(WorkerStream, _Duplex);

  function WorkerStream(path) {
    _classCallCheck(this, WorkerStream);

    var _this = _possibleConstructorReturn(this, (WorkerStream.__proto__ || Object.getPrototypeOf(WorkerStream)).call(this));

    _this.worker = typeof path === 'string' ? new Worker(path) : path;

    _this.requests = 0;
    _this.responses = 0;
    _this.doneWriting = false;

    _this.bufferedData = undefined;
    _this.requestedDataQueue = [];

    _this.requestedTotal = 0;
    _this.sentTotal = 0;

    _this.worker.onmessage = function (e) {
      //this._dealWithData(e)

      var data = Buffer(e.data);
      _this.push(data);
      _this.responses += 1;
      _this._done();
    };

    _this.worker.onerror = function (err) {
      _this.emit('error', err);
    };
    return _this;
  }

  _createClass(WorkerStream, [{
    key: '_dealWithData',
    value: function _dealWithData(e) {
      if (e) {
        var data = Buffer(e.data);
        //console.log('recieved', this.requests)
        this.bufferedData = this.bufferedData ? Buffer.concat([this.bufferedData, data]) : data;
      }

      if (this.bufferedData && this.requestedDataQueue.length > 0) {
        var size = this.requestedDataQueue[0];
        var reqChunk = this.bufferedData.slice(0, size);
        this.push(reqChunk); // actual emits requested chunk size

        this.bufferedData = this.bufferedData.slice(size);
        this.sentTotal += reqChunk.length;
        console.log('sentTotal', this.sentTotal);
        this.requestedDataQueue.shift();
        //console.log(this.requestedDataQueue.length)
        //this.responses += 1
      }
      this._done();
    }
  }, {
    key: '_done',
    value: function _done() {
      //if (this.requestedDataQueue.length === 0 && this.doneWriting)
      if (this.requests === this.responses && this.doneWriting) {
        //
        //console.log('done FOR REALZ')
        this.emit('end');
      }
    }
  }, {
    key: 'end',
    value: function end(data) {
      this.doneWriting = true;
      //console.log('done writing', this.requests, this.responses)
      this._done();
    }
  }, {
    key: '_write',
    value: function _write(chunk, encoding, callback) {
      // console.log('_write',chunk.toString('utf8'),'to worker')
      this.requests += 1;
      this.worker.postMessage(chunk.buffer, [chunk.buffer]);

      callback(null, chunk);
    }
  }, {
    key: '_read',
    value: function _read(size) {
      // console.log('consumer asking read', size)
      this.requestedDataQueue.push(size);
      this.requestedTotal += size;
      //console.log('requestedTotal',this.requestedTotal)

      //this._dealWithData()
    }
  }]);

  return WorkerStream;
}(Duplex);

exports.default = WorkerStream;

}).call(this,require("buffer").Buffer)
},{"buffer":8,"stream":149}],174:[function(require,module,exports){
(function (Buffer){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = concatStream;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Duplex = require('stream').Duplex;
//stream-combiner2
// a lot of this is taken from https://github.com/maxogden/concat-stream, with gratitude!

function isArrayish(arr) {
  return (/Array\]$/.test(Object.prototype.toString.call(arr))
  );
}

function isBufferish(p) {
  return typeof p === 'string' || isArrayish(p) || p && typeof p.subarray === 'function';
}

function bufferConcat(parts) {
  var bufs = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (Buffer.isBuffer(p)) {
      bufs.push(p);
    } else if (isBufferish(p)) {
      bufs.push(new Buffer(p));
    } else {
      bufs.push(new Buffer(String(p)));
    }
  }
  return Buffer.concat(bufs);
}

function customConcat(parts) {
  var positionBufs = [];
  var normalBufs = [];

  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (Buffer.isBuffer(p)) {
      var positions = p.slice(0, p.length / 2);
      var normals = p.slice(p.length / 2);
      positionBufs.push(positions);
      normalBufs.push(normals);
    }
  }

  var pBuf = Buffer.concat(positionBufs);
  var nBuf = Buffer.concat(normalBufs);

  return {
    positions: new Float32Array(pBuf.buffer.slice(pBuf.byteOffset, pBuf.byteOffset + pBuf.byteLength)),
    normals: new Float32Array(nBuf.buffer.slice(nBuf.byteOffset, nBuf.byteOffset + nBuf.byteLength))
  };
}

var Formatter = function (_Duplex) {
  _inherits(Formatter, _Duplex);

  function Formatter(processorFn) {
    _classCallCheck(this, Formatter);

    var _this = _possibleConstructorReturn(this, (Formatter.__proto__ || Object.getPrototypeOf(Formatter)).call(this, { readableObjectMode: true }));

    _this.body = [];
    _this.on('finish', function () {
      var result = processorFn(customConcat(this.body));
      this.push(result);
      this.emit('end');
    });
    return _this;
  }

  _createClass(Formatter, [{
    key: '_read',
    value: function _read(size) {}
  }, {
    key: '_write',
    value: function _write(chunk, encoding, callback) {
      this.body.push(chunk);
      callback();
    }
  }, {
    key: 'end',
    value: function end() {
      var self = this;
      setTimeout(function () {
        return self.emit('finish');
      }, 0.001); // WTH ??withouth this, finish is emitted too early
    }
  }]);

  return Formatter;
}(Duplex);

function concatStream(processorFn) {
  return new Formatter(processorFn);
}

}).call(this,require("buffer").Buffer)
},{"buffer":8,"stream":149}],175:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concatStream = undefined;

var _concatStream = require('./concatStream');

Object.defineProperty(exports, 'concatStream', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_concatStream).default;
  }
});
exports.default = makeStlStream;

var _compositeDetect = require('composite-detect');

var _compositeDetect2 = _interopRequireDefault(_compositeDetect);

var _workerSpawner = require('./workerSpawner');

var _workerSpawner2 = _interopRequireDefault(_workerSpawner);

var _parseStream = require('./parseStream');

var _parseStream2 = _interopRequireDefault(_parseStream);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function makeStlStream() {
  var parameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var defaults = {
    useWorker: _compositeDetect2.default.isBrowser === true
  };
  parameters = Object.assign({}, defaults, parameters);
  var _parameters = parameters;
  var useWorker = _parameters.useWorker;


  return useWorker ? (0, _workerSpawner2.default)() : (0, _through2.default)((0, _parseStream2.default)());
}

},{"./concatStream":174,"./parseStream":176,"./workerSpawner":179,"composite-detect":10,"through2":172}],176:[function(require,module,exports){
(function (Buffer){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makeStreamParser;
exports.parseASCIIChunk = parseASCIIChunk;

var _utils = require('./utils');

function makeStreamParser() {
  var chunkNb = 0;
  var totalSize = 0;
  var isBinary = false;

  var faceOffset = 0;
  var previousRemainderData = void 0;
  var parser = function parser(chunk, enc, callback) {
    //console.log('chunk', chunk.length, chunkNb)
    if (chunkNb === 0) {
      isBinary = (0, _utils.isDataBinaryRobust)(chunk.buffer);
    }
    var workChunk = (0, _utils.ensureBinary)(previousRemainderData ? Buffer.concat([previousRemainderData, chunk], previousRemainderData.length + chunk.length) : chunk);

    var _ref = isBinary ? computeBinaryOffset(workChunk, chunkNb) : computASCIIOffset(workChunk, chunkNb);

    var remainingDataInChunk = _ref.remainingDataInChunk;
    var startOffset = _ref.startOffset;


    var parsed = isBinary ? parseBinaryChunk(faceOffset, remainingDataInChunk, startOffset, workChunk) : parseASCIIChunk(workChunk);
    //console.log('faceOffset', faceOffset, 'facesInChunk', facesInChunk, 'remainderDataLength', remainderDataLength, 'current face ', face)

    // update size
    chunkNb += 1;
    totalSize += chunk.length;

    previousRemainderData = parsed.remainderData;
    faceOffset = parsed.faceOffset;

    // we can only send a single buffer out , so concat the two
    var positionsBuffer = toBuffer(parsed.positions);
    var normalsBuffer = toBuffer(parsed.normals);
    // console.log('positions', positionsBuffer.length, parsed.positions.length)
    //console.log('done with chunk', positionsBuffer, callback)
    callback(null, Buffer.concat([positionsBuffer, normalsBuffer], positionsBuffer.length + normalsBuffer.length));
  };

  return parser;
}

// helper function, taken from https://github.com/feross/typedarray-to-buffer
function toBuffer(arr) {
  var buf = new Buffer(arr.buffer);
  if (arr.byteLength !== arr.buffer.byteLength) {
    // Respect the "view", i.e. byteOffset and byteLength, without doing a copy
    buf = buf.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
  }
  return buf;
}

function computeBinaryOffset(workChunk, chunkNb) {
  var dataStartOffset = 84;
  var remainingDataInChunk = chunkNb === 0 ? workChunk.length - dataStartOffset : workChunk.length;
  var startOffset = chunkNb === 0 ? dataStartOffset : 0;

  return { remainingDataInChunk: remainingDataInChunk, startOffset: startOffset };
}

function computASCIIOffset(workChunk, chunkNb) {
  return { remainingDataInChunk: workChunk.length, startOffset: 0 };
}

//handle parsing of a single binary chunk
function parseBinaryChunk(faceOffset, remainingDataInChunk, startOffset, workChunk) {
  // console.log('faces', faces, 'chunk size', chunk.length, 'workChunk', workChunk.length)
  // process all faces data that we can
  var faceLength = 12 * 4 + 2;
  var facesInChunk = Math.floor(remainingDataInChunk / faceLength);

  var reader = new DataView(workChunk.buffer);
  var faces = reader.getUint32(80, true);
  var positions = new Float32Array(facesInChunk * 3 * 3);
  var normals = new Float32Array(facesInChunk * 3 * 3);

  var data = new Float32Array(facesInChunk * 2 * 3 * 3); //we want one big typedArray for all the data , to avoid concat operations

  var lface = 0;
  var offset = 0;

  // console.log(`Faces: ${facesInChunk}/${faces}`)

  for (var face = faceOffset; face < facesInChunk + faceOffset; face += 1) {
    var start = startOffset + lface * faceLength;
    for (var i = 1; i <= 3; i++) {
      var vertexstart = start + i * 12;
      positions[offset] = reader.getFloat32(vertexstart, true);
      positions[offset + 1] = reader.getFloat32(vertexstart + 4, true);
      positions[offset + 2] = reader.getFloat32(vertexstart + 8, true);

      normals[offset] = reader.getFloat32(start, true);
      normals[offset + 1] = reader.getFloat32(start + 4, true);
      normals[offset + 2] = reader.getFloat32(start + 8, true);
      offset += 3;
    }
    lface += 1;
  }

  // compute offsets, remainderData etc for next chunk etc
  var remainderData = workChunk.slice(workChunk.length - remainingDataInChunk % faceLength); // chunk length - remainderDataLength

  return { faceOffset: lface, remainderData: remainderData, positions: positions, normals: normals };
}

// ASCII stl parsing
function parseASCIIChunk(workChunk) {
  var data = (0, _utils.ensureString)(workChunk);
  // console.log('parseASCII')
  var result = void 0,
      text = void 0;
  var patternNormal = /normal[\s]+([\-+]?[0-9]+\.?[0-9]*([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+/g;
  var patternVertex = /vertex[\s]+([\-+]?[0-9]+\.?[0-9]*([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+/g;
  var patternFace = /facet([\s\S]*?)endfacet/g;

  var posArray = [];
  var normArray = [];

  var faces = 0;
  var offset = 0;

  while ((result = patternFace.exec(data)) !== null) {
    var length = 0;

    text = result[0];
    offset = result.index + text.length;

    while ((result = patternNormal.exec(text)) !== null) {
      normArray.push(parseFloat(result[1]), parseFloat(result[3]), parseFloat(result[5]));
      normArray.push(parseFloat(result[1]), parseFloat(result[3]), parseFloat(result[5]));
      normArray.push(parseFloat(result[1]), parseFloat(result[3]), parseFloat(result[5]));
    }

    while ((result = patternVertex.exec(text)) !== null) {
      posArray.push(parseFloat(result[1]), parseFloat(result[3]), parseFloat(result[5]));
      length += 1;
    }
    faces += 1;
  }

  var positions = new Float32Array(faces * 3 * 3);
  var normals = new Float32Array(faces * 3 * 3);

  positions.set(posArray);
  normals.set(normArray);

  // compute offsets, remainderData etc for next chunk etc
  var remainderTextData = data.slice(offset);
  // console.log('remainderData', remainderTextData)
  var remainderData = new Buffer(remainderTextData);
  return { faceOffset: faces, remainderData: remainderData, positions: positions, normals: normals };
}

}).call(this,require("buffer").Buffer)
},{"./utils":178,"buffer":8}],177:[function(require,module,exports){
(function (Buffer){
'use strict';

var _parseStream = require('./parseStream');

var _parseStream2 = _interopRequireDefault(_parseStream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (self) {
  var stlStreamParser = (0, _parseStream2.default)();

  self.onmessage = function (event) {
    // stlStreamParser(event.data, null, (err, data) => self.postMessage(data.buffer, [data.buffer]))
    stlStreamParser(Buffer(event.data), null, function (err, data) {
      return self.postMessage(data.buffer, [data.buffer]);
    });
  };
};

}).call(this,require("buffer").Buffer)
},{"./parseStream":176,"buffer":8}],178:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ensureString = ensureString;
exports.ensureBinary = ensureBinary;
exports.isDataBinary = isDataBinary;
exports.isDataBinaryRobust = isDataBinaryRobust;
function ensureString(buf) {
  //console.log('ensureString')
  if (typeof buf !== 'string') {
    //console.log('forcing string', buf)
    var array_buffer = new Uint8Array(buf);
    var str = '';
    for (var i = 0; i < buf.byteLength; i++) {
      str += String.fromCharCode(array_buffer[i]); // implicitly assumes little-endian
    }
    return str;
  } else {
    //console.log('already string')
    return buf;
  }
}

function ensureBinary(buf) {
  //console.log('ensureBinary')
  if (typeof buf === 'string') {
    //console.log('forcing binary')
    var array_buffer = new Uint8Array(buf.length);
    for (var i = 0; i < buf.length; i++) {
      array_buffer[i] = buf.charCodeAt(i) & 0xff; // implicitly assumes little-endian
    }
    return array_buffer.buffer || array_buffer;
  } else {
    //console.log('already binary')
    return buf;
  }
}

function isDataBinary(data) {
  //console.log('data is binary ?')
  var expect, face_size, n_faces, reader;
  reader = new DataView(data);
  face_size = 32 / 8 * 3 + 32 / 8 * 3 * 3 + 16 / 8;

  n_faces = reader.getUint32(80, true);
  expect = 80 + 32 / 8 + n_faces * face_size;
  return expect === reader.byteLength;
}

// a more robust version of the above, that does NOT require the whole file
function isDataBinaryRobust(data) {
  // console.log('data is binary ?')
  var patternVertex = /vertex[\s]+([\-+]?[0-9]+\.?[0-9]*([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+/g;
  var text = ensureString(data);
  var isBinary = patternVertex.exec(text) === null;
  return isBinary;
}

},{}],179:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = workerSpawner;

var _WorkerStream = require('./WorkerStream');

var _WorkerStream2 = _interopRequireDefault(_WorkerStream);

var _WebWorkify = require('WebWorkify');

var _WebWorkify2 = _interopRequireDefault(_WebWorkify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//import foo from './foo'
function workerSpawner() {
  //const worker = new Worker('./stlStreamWorker.src.js')
  var worker = (0, _WebWorkify2.default)(require('./stlStreamWorker.src.js'));
  var ws = new _WorkerStream2.default(worker);
  return ws;
}

},{"./WorkerStream":173,"./stlStreamWorker.src.js":177,"WebWorkify":4}],180:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],181:[function(require,module,exports){
arguments[4][78][0].apply(exports,arguments)
},{"dup":78}],182:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],183:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":182,"_process":147,"inherits":181}],184:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],185:[function(require,module,exports){
module.exports={
  "name": "usco-mobile",
  "version": "0.5.0",
  "description": "",
  "main": "src/main/index.js",
  "scripts": {
    "test": "ava './src/common/**/*.test.js' --require babel-register --verbose",
    "build-srv": "babel src/ -d dist",
    "build": "browserify src/main/index.js -o dist/viewer.js -t [babelify browserify minifyify]",
    "watch": "watchify src/main -o dist/index.js -t [ babelify]",
    "start-dev": "budo src/main/index.js:dist/viewer.js --port=8080 --live -- -t babelify",
    "test-render": "node src/serverSide/launch.js",
    "host": "http-server -p 8090",
    "release-patch": "git checkout master; npm version patch && npm run build; git commit -a -m 'chore(dist): built dist/'; git push origin master --tags ",
    "release-minor": "git checkout master; npm version minor && npm run build; git commit -a -m 'chore(dist): built dist/'; git push origin master --tags ",
    "release-major": "git checkout master; npm version major && npm run build; git commit -a -m 'chore(dist): built dist/'; git push origin master --tags "
  },
  "author": "Mark 'kaosat-dev' Moissette",
  "license": "MIT",
  "dependencies": {
    "@most/create": "^1.1.3",
    "@most/prelude": "^1.4.1",
    "angle-normals": "^1.0.0",
    "camera-picking-ray": "^1.0.1",
    "fast.js": "^0.1.1",
    "fetch-readablestream": "^0.1.0",
    "gl-mat4": "^1.1.4",
    "gl-vec3": "^1.0.3",
    "glsl-fog": "0.0.1",
    "glslify": "^5.0.2",
    "glslify-sync": "^2.0.0",
    "most": "^1.0.3",
    "ray-aabb-intersection": "^1.0.1",
    "ray-sphere-intersection": "^1.0.0",
    "ray-triangle-intersection": "^1.0.3",
    "regl": "^1.3.0",
    "typedarray-methods": "^1.0.0",
    "usco-stl-parser": "github:usco/usco-stl-parser#streaming",
    "vertices-bounding-box": "^1.0.0"
  },
  "devDependencies": {
    "ava": "^0.15.2",
    "babel-cli": "^6.6.5",
    "babel-core": "^6.2.1",
    "babel-preset-es2015": "^6.1.18",
    "babel-register": "^6.16.3",
    "babelify": "^7.2.0",
    "browserify": "^13.0.0",
    "budo": "^8.3.0",
    "minifyify": "^7.3.3",
    "rollupify": "^0.3.4",
    "watchify": "^3.7.0"
  },
  "browserify": {
    "transform": [
      "glslify-sync/transform"
    ]
  }
}

},{}],186:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getBrandingSvgGeometry;
function getBrandingSvgGeometry(machineName) {
  // the geometry in the imported js files was generated using the svgStringAsGeometry tool + some formating
  // static file size is larger than in the origin svg files, but is faster to load & has better quality
  var brandingSvgs = {
    'ultimaker3': require('./um3LogoGeo.js'),
    'ultimaker3_extended': require('./um3ExtLogoGeo.js')
  };
  return brandingSvgs[machineName];
}

},{"./um3ExtLogoGeo.js":187,"./um3LogoGeo.js":188}],187:[function(require,module,exports){
"use strict";

exports.positions = [[0.5940229598203144, -0.043923134514599435, 0], [0.5734339905165959, -0.043923134514599435, 0], [0.5687546793112053, -0.04829049163963062, 0], [0.5687546793112053, -0.0675068629897679, 0], [0.5739799101572247, -0.0718742201147991, 0], [0.5969709258797102, -0.0718742201147991, 0], [0.6021961567257297, -0.07320002495632641, 0], [0.6021961567257297, -0.07903356625904666, 0], [0.5954111554779136, -0.08035937110057399, 0], [0.5655571499875218, -0.08035937110057399, 0], [0.5587721487397055, -0.07701366358871975, 0], [0.5587721487397055, -0.055722797604192645, 0], [0.5587721487397055, -0.02713220613925628, 0], [0.5587721487397055, -0.005841340154729208, 0], [0.5653231844272522, -0.00249563264287496, 0], [0.5941477414524579, -0.00249563264287496, 0], [0.6006987771400047, -0.0038214374844022653, 0], [0.6006987771400047, -0.00965497878712252, 0], [0.5957075118542547, -0.010980783628649852, 0], [0.5737459445969553, -0.010980783628649852, 0], [0.5687546793112053, -0.014802221113052145, 0], [0.5687546793112053, -0.031616546044422225, 0], [0.5734339905165959, -0.03543798352882452, 0], [0.5940229598203144, -0.03543798352882452, 0], [0.5987022710257048, -0.03676378837035185, 0], [0.5987022710257048, -0.0425973296730721, 0], [0.6209134015472921, -0.026328924382330914, 0], [0.6264037933616171, -0.03456451210381831, 0], [0.6291411904167705, -0.03868230596456202, 0], [0.631933179435987, -0.04317444472173695, 0], [0.6332199900174695, -0.04542051410032441, 0], [0.633563139505865, -0.04542051410032441, 0], [0.6350605190915899, -0.04296387571749436, 0], [0.6377121287746443, -0.03861211629648115, 0], [0.6403793361617172, -0.03456451210381831, 0], [0.6458697279760424, -0.026328924382330886, 0], [0.6488332917394564, -0.024457199900174663, 0], [0.656382580484153, -0.024457199900174663, 0], [0.6551347641627157, -0.028668579985026164, 0], [0.6420950836036938, -0.04719865235837284, 0], [0.6421730721237837, -0.05593336660843523, 0], [0.6555559021712005, -0.07583603693536307, 0], [0.6568037184926381, -0.08035937110057396, 0], [0.6489112802595456, -0.08035937110057396, 0], [0.6458697279760417, -0.0784096580983279, 0], [0.6403793361617167, -0.06983092088844518, 0], [0.6376341402545544, -0.0655571499875218, 0], [0.6346393810831044, -0.06072186174195155, 0], [0.6316446219116543, -0.06093243074619416, 0], [0.6286498627402042, -0.06562733965560269, 0], [0.6259046668330419, -0.06983092088844518, 0], [0.6204142750187169, -0.0784096580983279, 0], [0.6172947342151232, -0.08035937110057396, 0], [0.6090591464936359, -0.08035937110057396, 0], [0.6103069628150735, -0.07591402545545294, 0], [0.6240329423508857, -0.05635450461692034, 0], [0.6241889193910655, -0.047619790366857956, 0], [0.6111492388320436, -0.02874656850511599, 0], [0.609979411030696, -0.024457199900174635, 0], [0.6178718492637882, -0.024457199900174635, 0], [0.6820564012977288, -0.010980783628649852, 0], [0.6820564012977288, -0.021961567257299704, 0], [0.6843180683803343, -0.024457199900174663, 0], [0.694269403543798, -0.024457199900174663, 0], [0.6965310706264034, -0.02562702770152232, 0], [0.6965310706264034, -0.030774270027451946, 0], [0.694269403543798, -0.031944097828799575, 0], [0.6843180683803343, -0.031944097828799575, 0], [0.6820564012977288, -0.036623409034190105, 0], [0.6820564012977288, -0.05721237833790861, 0], [0.6824541427501869, -0.06655540304467181, 0], [0.6860572123783377, -0.07213938108310454, 0], [0.6913214374844021, -0.0727944846518592, 0], [0.6943161966558518, -0.07245133516346389, 0], [0.6956108060893433, -0.07354317444472169, 0], [0.6959539555777388, -0.07869041677065132, 0], [0.6943473920638881, -0.08051534814075365, 0], [0.689855253306713, -0.08126403793361613, 0], [0.683787746443723, -0.0810768654854005, 0], [0.6782037684052904, -0.078830796106813, 0], [0.6741795607686547, -0.07425286997753927, 0], [0.6722766408784624, -0.06696874220114796, 0], [0.6720738707262288, -0.05763351634639378, 0], [0.6720738707262288, -0.03670139755427996, 0], [0.6707480658847016, -0.03194409782879955, 0], [0.6649145245819814, -0.03194409782879955, 0], [0.663588719740454, -0.03077427002745192, 0], [0.663588719740454, -0.025627027701522292, 0], [0.6649145245819814, -0.024457199900174635, 0], [0.6707480658847016, -0.024457199900174635, 0], [0.6720738707262288, -0.022351509857748884, 0], [0.6720738707262288, -0.013086473671075575, 0], [0.6736336411280257, -0.010590841028200616, 0], [0.6804966308959319, -0.008875093586224073, 0], [0.7140628899426005, -0.06263258048415271, 0], [0.7242949837783879, -0.07222516845520337, 0], [0.7364845894684302, -0.07311423758422757, 0], [0.7438934988769652, -0.07147647866234091, 0], [0.7471768155727478, -0.07154666833042173, 0], [0.7482062640379337, -0.07669391065635135, 0], [0.7453440853506366, -0.07904136511105561, 0], [0.7361570376840532, -0.08102227352133762, 0], [0.7239206388819568, -0.08083217650361862, 0], [0.713828924382331, -0.0768567116920389, 0], [0.7067319690541554, -0.069488746256551, 0], [0.7030041177938611, -0.05933659065385571, 0], [0.7029807212378338, -0.04739069908909408, 0], [0.7065214000499127, -0.03669262384576987, 0], [0.7132440104816575, -0.02859156632143745, 0], [0.7227742076366361, -0.024070181869228838, 0], [0.7346206638382831, -0.024165717806338874, 0], [0.743636136760669, -0.029065346580983278, 0], [0.7503743448964315, -0.0413573122036436, 0], [0.7514271899176446, -0.0513164462191165, 0], [0.7512244197654108, -0.05356251559770399, 0], [0.7449307461941603, -0.05440479161467427, 0], [0.7185082355877215, -0.05440479161467427, 0], [0.7125031195408036, -0.054326803094584444, 0], [0.7125031195408036, -0.053983653606189154, 0], [0.7418813950586474, -0.04160687546793113, 0], [0.7355019341152982, -0.03210787372098826, 0], [0.7217057649114049, -0.03203768405290742, 0], [0.7141564761667079, -0.04139630646368855, 0], [0.7176035687546791, -0.046917893686049414, 0], [0.7378493885700024, -0.046917893686049414, 0], [0.764903606189169, -0.03519621911654603, 0], [0.7647008360369352, -0.027849700524082834, 0], [0.76581607187422, -0.02445719990017469, 0], [0.7719927626653356, -0.02445719990017469, 0], [0.7734745445470426, -0.02586099326179185, 0], [0.773817694035438, -0.03203768405290742, 0], [0.7767110681307714, -0.029487459445969554, 0], [0.7858981157973544, -0.02382549288744697, 0], [0.7985634514599449, -0.02395807337159967, 0], [0.807644239767906, -0.030661186673321697, 0], [0.8112999516471175, -0.03996521712003992, 0], [0.8118292987272271, -0.051643998003493875, 0], [0.8118292987272271, -0.07463501372597953, 0], [0.8102695283254302, -0.079860244571999, 0], [0.8034065385575242, -0.079860244571999, 0], [0.8018467681557273, -0.07486897928624905, 0], [0.8018467681557273, -0.05290741202894935, 0], [0.8011526703269276, -0.041552283503868255, 0], [0.7948979910157223, -0.03275517843773398, 0], [0.7842369603194406, -0.03224045420514102, 0], [0.7772179935113548, -0.03776204142750186, 0], [0.77510450461692, -0.0430496630895932, 0], [0.7749017344646867, -0.045295732468180694, 0], [0.7748939356126774, -0.051643998003493875, 0], [0.7748939356126774, -0.07463501372597953, 0], [0.7733341652108805, -0.079860244571999, 0], [0.7664711754429745, -0.079860244571999, 0], [0.7649114050411776, -0.07354317444472172, 0], [0.7649114050411776, -0.04574806588470176, 0], [0.8767157474419762, -0.0013979442226104211, 0], [0.8767157474419762, -0.01982273209383578, 0], [0.8767157474419762, -0.04456459009233839, 0], [0.8767157474419762, -0.06298937796356374, 0], [0.8767235462939853, -0.06969054155228346, 0], [0.8769263164462189, -0.07711504866483646, 0], [0.8758110806089343, -0.08035937110057396, 0], [0.8696343898178187, -0.08035937110057396, 0], [0.8681526079361117, -0.07887758921886695, 0], [0.8678094584477163, -0.07235774893935609, 0], [0.8647679061642122, -0.07511854255053654, 0], [0.8550973296730715, -0.0809832792612927, 0], [0.8438660079236333, -0.08133032817569254, 0], [0.835261924444721, -0.07732951709508362, 0], [0.8288337206763161, -0.06986601572248569, 0], [0.825283293299226, -0.05950134140254554, 0], [0.8253261869852755, -0.0468174834664337, 0], [0.8291495741826802, -0.035815252994759114, 0], [0.8359443239955078, -0.028065143810831018, 0], [0.8448213672947338, -0.023988293923134493, 0], [0.8556432493137005, -0.02415304467182429, 0], [0.8642219865235832, -0.02872317194908907, 0], [0.8667332168704762, -0.026718866982780122, 0], [0.8667332168704762, -0.003727851260294475, 0], [0.8682929872722733, 0.001497379585725004, 0], [0.8751559770401796, 0.001497379585725004, 0], [0.8667254180184676, -0.04579485899675566, 0], [0.8665226478662338, -0.04354878961816817, 0], [0.8643935612677811, -0.03781663339156474, 0], [0.8569690541552282, -0.031405977040179694, 0], [0.8447638507611679, -0.0320454829049164, 0], [0.8363878837035188, -0.04329142750187171, 0], [0.8363176940354378, -0.059949775393062114, 0], [0.844553281756925, -0.07079017968555028, 0], [0.8567662840029946, -0.07155446718243073, 0], [0.8645339406039427, -0.06542456950336911, 0], [0.867021774394809, -0.05927127526828049, 0], [0.8672245445470428, -0.05702520588969303, 0], [0.8672323433990516, -0.05449837783878214, 0], [0.8672323433990516, -0.048321687047666574, 0], [0.8671543548789618, -0.046917893686049414, 0], [0.8668112053905663, -0.046917893686049414, 0], [0.900736211629648, -0.06263258048415271, 0], [0.9109683054654354, -0.07222516845520337, 0], [0.9231579111554777, -0.07311423758422757, 0], [0.9305668205640127, -0.07147647866234091, 0], [0.9338501372597954, -0.07154666833042173, 0], [0.9348795857249812, -0.07669391065635135, 0], [0.9320174070376841, -0.07904136511105561, 0], [0.9228303593711005, -0.08102227352133762, 0], [0.9105939605690043, -0.08083217650361862, 0], [0.9005022460693786, -0.0768567116920389, 0], [0.8934052907412029, -0.069488746256551, 0], [0.8896774394809086, -0.05933659065385571, 0], [0.8896540429248814, -0.04739069908909408, 0], [0.8931947217369602, -0.03669262384576987, 0], [0.8999173321687051, -0.02859156632143745, 0], [0.9094475293236837, -0.024070181869228838, 0], [0.9212939855253306, -0.024165717806338874, 0], [0.9303094584477165, -0.029065346580983278, 0], [0.937047666583479, -0.0413573122036436, 0], [0.9381005116046921, -0.0513164462191165, 0], [0.9378977414524583, -0.05356251559770399, 0], [0.9316040678812079, -0.05440479161467427, 0], [0.905181557274769, -0.05440479161467427, 0], [0.8991764412278511, -0.054326803094584444, 0], [0.8991764412278511, -0.053983653606189154, 0], [0.9280555902171197, -0.04160687546793113, 0], [0.9216761292737707, -0.03210787372098826, 0], [0.9078799600698775, -0.03203768405290742, 0], [0.9003306713251804, -0.04139630646368855, 0], [0.9037777639131515, -0.046917893686049414, 0], [0.9240235837284749, -0.046917893686049414, 0], [0.9995008734714248, -0.0013979442226104211, 0], [0.9995008734714248, -0.01982273209383578, 0], [0.9995008734714248, -0.04456459009233839, 0], [0.9995008734714248, -0.06298937796356374, 0], [0.9995086723234337, -0.06969054155228346, 0], [0.9997114424756675, -0.07711504866483646, 0], [0.9985962066383829, -0.08035937110057396, 0], [0.9924195158472673, -0.08035937110057396, 0], [0.9909377339655603, -0.07887758921886695, 0], [0.9905945844771649, -0.07235774893935609, 0], [0.9875530321936608, -0.07511854255053654, 0], [0.9778824557025201, -0.0809832792612927, 0], [0.9666511339530819, -0.08133032817569254, 0], [0.9580470504741696, -0.07732951709508362, 0], [0.9516188467057647, -0.06986601572248569, 0], [0.9480684193286746, -0.05950134140254554, 0], [0.9481113130147241, -0.0468174834664337, 0], [0.9519347002121288, -0.035815252994759114, 0], [0.9587294500249564, -0.028065143810831018, 0], [0.9676064933241824, -0.023988293923134493, 0], [0.9784283753431491, -0.02415304467182429, 0], [0.9870071125530318, -0.02872317194908907, 0], [0.9895183428999248, -0.026718866982780122, 0], [0.9895183428999248, -0.003727851260294475, 0], [0.9910781133017219, 0.001497379585725004, 0], [0.9979411030696281, 0.001497379585725004, 0], [0.989011417519341, -0.04579485899675566, 0], [0.9888086473671074, -0.04354878961816817, 0], [0.9866795607686547, -0.03781663339156474, 0], [0.9792550536561015, -0.031405977040179694, 0], [0.9670498502620415, -0.0320454829049164, 0], [0.9586738832043922, -0.04329142750187171, 0], [0.9586036935363111, -0.059949775393062114, 0], [0.9668392812577986, -0.07079017968555028, 0], [0.979052283503868, -0.07155446718243073, 0], [0.9868199401048163, -0.06542456950336911, 0], [0.9893077738956824, -0.05927127526828049, 0], [0.9895105440479162, -0.05702520588969303, 0], [0.989518342899925, -0.05449837783878214, 0], [0.989518342899925, -0.048321687047666574, 0], [0.9894403543798351, -0.046917893686049414, 0], [0.9890972048914397, -0.046917893686049414, 0], [-0.7808834539555778, -0.09088782131270275, 0], [-0.7808834539555778, -0.0603475168455203, 0], [-0.7808834539555778, -0.053406538557524315, 0], [-0.7808834539555778, -0.05303219366109304, 0], [-0.7808834539555778, -0.05228350386823055, 0], [-0.7808834539555778, -0.05190915897179934, 0], [-0.7808834539555778, -0.050778325430496624, 0], [-0.7808834539555778, -0.048329485899675555, 0], [-0.7808834539555778, -0.046917893686049414, 0], [-0.7808834539555778, -0.042456950336910416, 0], [-0.7808834539555778, -0.01406912902420765, 0], [-0.7808834539555778, 0.024051659595707518, 0], [-0.7808834539555778, 0.05243948090841029, 0], [-0.7824978163214376, 0.06609527077614175, 0], [-0.79414930122286, 0.07774675567756427, 0], [-0.8125389942600449, 0.07774675567756427, 0], [-0.8241904791614674, 0.06609527077614175, 0], [-0.8258048415273271, 0.052267906164212626, 0], [-0.8258048415273271, 0.02278824557025206, 0], [-0.8258048415273271, -0.01679872722735214, 0], [-0.8258048415273271, -0.04627838782131274, 0], [-0.8264989393561268, -0.06032217057649117, 0], [-0.8319113426503619, -0.0750736991514849, 0], [-0.8423774020464188, -0.08463119228849514, 0], [-0.8575227726478662, -0.08927540865984525, 0], [-0.875800357187422, -0.08927540865984525, 0], [-0.8908696889817819, -0.08463119228849514, 0], [-0.9014234854629398, -0.0750736991514849, 0], [-0.9069470223983029, -0.06032217057649117, 0], [-0.9076615922136262, -0.04627838782131274, 0], [-0.9076615922136262, -0.01679872722735214, 0], [-0.9076615922136262, 0.02278824557025206, 0], [-0.9076615922136262, 0.052267906164212626, 0], [-0.9090185924631894, 0.06545576491140505, 0], [-0.9190323184427253, 0.07676410032443225, 0], [-0.9278840154729224, 0.07915054903918142, 0], [-0.9295841652108809, 0.07935331919141503, 0], [-0.933023458946843, 0.07936111804342401, 0], [-0.9483092088844522, 0.07936111804342401, 0], [-0.9688357873720989, 0.07936111804342401, 0], [-0.984121537309708, 0.07936111804342401, 0], [-0.9917878088345395, 0.07830827302221113, 0], [-0.9989471549787872, 0.07114892687796358, 0], [-0.9989471549787872, 0.060620476665834803, 0], [-0.9917878088345395, 0.053461130521587234, 0], [-0.981142375842276, 0.05240828550037436, 0], [-0.9574650611429998, 0.05240828550037436, 0], [-0.9520838532568006, 0.048118916895433, 0], [-0.9520838532568006, 0.02082293486398802, 0], [-0.9520838532568006, -0.015831669578238085, 0], [-0.9520838532568006, -0.04312765160968305, 0], [-0.9505455296980284, -0.06640430028699776, 0], [-0.9387653637384576, -0.0961198761542301, 0], [-0.916550333790866, -0.11533039836536062, 0], [-0.8853042332168705, -0.12464417737709009, 0], [-0.8495289493386573, -0.12482842525580237, 0], [-0.8199868979286249, -0.11693598702271026, 0], [-0.8078362864986275, -0.11004180184676814, 0], [-0.8078362864986275, -0.11107125031195404, 0], [-0.8067834414774145, -0.11656944097828797, 0], [-0.799624095333167, -0.12372878712253556, 0], [-0.7922541801846769, -0.12478163214374842, 0], [-0.7829891439980035, -0.12478163214374842, 0], [-0.7756192288495134, -0.12372878712253556, 0], [-0.7684598827052658, -0.11656944097828797, 0], [-0.7684598827052658, -0.1060409907661592, 0], [-0.7756192288495134, -0.09888164462191162, 0], [0.10528255240828543, -0.08993636136760666, 0], [0.09395471986523574, -0.07465061142999749, 0], [0.07874305902171197, -0.05412403294235087, 0], [0.06741522647866227, -0.0388382830047417, 0], [0.07023646119291227, -0.031600948340404285, 0], [0.09048228100823552, -0.010325680059895183, 0], [0.09749344896431222, -0.002760793611180421, 0], [0.10062858747192416, 0.003072747691539819, 0], [0.09937297229847752, 0.014505864736710767, 0], [0.08886011979036668, 0.02405165959570753, 0], [0.07779354878961797, 0.02484714250062393, 0], [0.0701038807087595, 0.02082293486398805, 0], [0.061174195158472555, 0.011963438981781899, 0], [0.03715373097080099, -0.014459071624656832, 0], [0.03068068380334399, -0.021579423508859448, 0], [0.026219740454204832, -0.03036093087097576, 0], [0.02684364861492372, -0.04673072123783378, 0], [0.034049787871225146, -0.05983279261292735, 0], [0.0373175068629894, -0.0641865017469428, 0], [0.04768998003493863, -0.07878985213376587, 0], [0.06161872972298443, -0.09840006551035682, 0], [0.07199120289493344, -0.11300341589717988, 0], [0.07628837035188374, -0.1186751310207137, 0], [0.08499188919391032, -0.12393155727476911, 0], [0.09897523084601922, -0.1231438732218617, 0], [0.10906694534564476, -0.11256862989767903, 0], [0.11043174444721715, -0.10083135762415768, 0], [0.10831045670077333, -0.09429591964062889, 0], [-0.005537184926378891, 0.07936111804342401, 0], [-0.0059427252308460465, 0.07936111804342401, 0], [-0.006987771400049803, 0.07943910656351386, 0], [-0.008485150985774847, 0.07978225605190917, 0], [-0.012587347142500649, 0.079860244571999, 0], [-0.02734277514349892, 0.079860244571999, 0], [-0.035960506613426535, 0.07880739955078613, 0], [-0.04311985275767405, 0.07164805340653856, 0], [-0.04311985275767405, 0.06111960319440978, 0], [-0.035960506613426535, 0.053960257050162226, 0], [-0.0299163963064637, 0.05290741202894935, 0], [-0.026484901422510587, 0.05290741202894935, 0], [-0.025705016221612254, 0.05114170319129025, 0], [-0.025705016221612254, 0.03839789158035938, 0], [-0.025705016221612254, 0.003160484776640886, 0], [-0.025705016221612254, -0.05457051721986523, 0], [-0.025705016221612254, -0.08980792402358373, 0], [-0.025705016221612254, -0.1025517356345146, 0], [-0.024270027451959164, -0.11291177938607437, 0], [-0.013913151984028094, -0.12298789618168206, 0], [0.0024332418268031564, -0.12298789618168206, 0], [0.012790117294734227, -0.11291177938607437, 0], [0.014225106064387205, -0.10247886511105563, 0], [0.014225106064387205, -0.0892091184177689, 0], [0.014225106064387205, -0.05251746942850014, 0], [0.014225106064387205, 0.007596081856750691, 0], [0.014225106064387205, 0.04428773084601948, 0], [0.014225106064387205, 0.057557477539306214, 0], [0.01314886448714736, 0.06799039181432495, 0], [0.00313513850761149, 0.07806650860993262, 0], [-0.7097579236336412, 0.07943910656351386, 0], [-0.7112553032193663, 0.07978225605190917, 0], [-0.7153574993760918, 0.079860244571999, 0], [-0.7301129273770901, 0.079860244571999, 0], [-0.7387306588470177, 0.07880739955078613, 0], [-0.7458900049912653, 0.07164805340653856, 0], [-0.7458900049912653, 0.06111960319440978, 0], [-0.7387306588470177, 0.053960257050162226, 0], [-0.7329985026204143, 0.05290741202894935, 0], [-0.7309396056900425, 0.05290741202894935, 0], [-0.7304716745695035, 0.05114170319129025, 0], [-0.7304716745695035, 0.03839789158035938, 0], [-0.7304716745695035, 0.003160484776640886, 0], [-0.7304716745695035, -0.05457051721986523, 0], [-0.7304716745695035, -0.08980792402358373, 0], [-0.7304716745695035, -0.1025517356345146, 0], [-0.7290366857998503, -0.11291177938607437, 0], [-0.7186798103319192, -0.12298789618168206, 0], [-0.7023334165210882, -0.12298789618168206, 0], [-0.6919765410531571, -0.11291177938607437, 0], [-0.6905415522835039, -0.10247886511105563, 0], [-0.6905415522835039, -0.0892091184177689, 0], [-0.6905415522835039, -0.05251746942850014, 0], [-0.6905415522835039, 0.007596081856750691, 0], [-0.6905415522835039, 0.04428773084601948, 0], [-0.6905415522835039, 0.057557477539306214, 0], [-0.6916021961567258, 0.06770963314200151, 0], [-0.7012103818317943, 0.07778574993760917, 0], [-0.5343695408035938, 0.013031881707012739, 0], [-0.5284648349762916, 0.021902101010731225, 0], [-0.5206484355502871, 0.025027490953331677, 0], [-0.5100478459570752, 0.025027490953331677, 0], [-0.5022314465310707, 0.021902101010731225, 0], [-0.4963267407037685, 0.013031881707012739, 0], [-0.4953830796106814, 0.0007506395058647337, 0], [-0.4953830796106814, -0.029411420638881944, 0], [-0.4953830796106814, -0.06991475854754182, 0], [-0.4953830796106814, -0.1000768186922885, 0], [-0.4963267407037685, -0.11235806089343647, 0], [-0.5022314465310707, -0.12122828019715497, 0], [-0.5100478459570752, -0.1243536701397554, 0], [-0.5206484355502871, -0.1243536701397554, 0], [-0.5284648349762916, -0.12122828019715497, 0], [-0.5343695408035938, -0.11235806089343647, 0], [-0.5353132018966809, -0.1000768186922885, 0], [-0.5353132018966809, -0.06991475854754182, 0], [-0.5353132018966809, -0.029411420638881944, 0], [-0.5353132018966809, 0.0007506395058647337, 0], [-0.2384011573496383, -0.09293307025205888, 0], [-0.2483641907911157, -0.06495468866982781, 0], [-0.2617431214125281, -0.027383719116546048, 0], [-0.2717061548540055, 0.0005946624656850557, 0], [-0.2773973671075618, 0.012431370102320947, 0], [-0.2908893810831047, 0.021696406288994257, 0], [-0.3074853381582231, 0.021704205141003255, 0], [-0.3206342026453708, 0.01264193910656353, 0], [-0.32573270214624395, 0.0030025580234589485, 0], [-0.33242021774394803, -0.012829111554779124, 0], [-0.34140059583229354, -0.034088782131270264, 0], [-0.3480881114299975, -0.04992045170950838, 0], [-0.35018990204641887, -0.04992045170950838, 0], [-0.35687741764412284, -0.034088782131270264, 0], [-0.36585779573246824, -0.012829111554779124, 0], [-0.3725453113301722, 0.0030025580234589485, 0], [-0.3776438108310457, 0.01264193910656353, 0], [-0.3907926753181933, 0.021704205141003255, 0], [-0.39934801597204894, 0.022959820314449715, 0], [-0.3997535562765161, 0.022959820314449715, 0], [-0.4007986024457201, 0.023037808834539555, 0], [-0.402295982031445, 0.023380958322934884, 0], [-0.40920576491140503, 0.02345894684302472, 0], [-0.4363145744946344, 0.02345894684302472, 0], [-0.44773989268779646, 0.022406101821811845, 0], [-0.454899238832044, 0.015246755677564273, 0], [-0.454899238832044, 0.004718305465435504, 0], [-0.44773989268779646, -0.0024410406788120545, 0], [-0.44013601197903673, -0.0034938857000249442, 0], [-0.4298415273271775, -0.0034938857000249442, 0], [-0.42893881020713753, -0.007504445345645119, 0], [-0.4380829641876717, -0.03302618854504612, 0], [-0.4503622566758174, -0.06729824369852752, 0], [-0.45950641065635145, -0.09281998689792856, 0], [-0.46201959071624665, -0.10466839281257793, 0], [-0.45574931370102334, -0.11809801597204887, 0], [-0.44738894434739207, -0.12286311454953827, 0], [-0.4440510356875468, -0.12326865485400545, 0], [-0.4366421262790118, -0.12237958572498125, 0], [-0.4270339406039432, -0.11570376840529072, 0], [-0.42289275018717254, -0.10717572373346643, 0], [-0.41579579485899687, -0.0872496568505116, 0], [-0.40626559770401804, -0.060491795607686506, 0], [-0.39916864237584226, -0.04056572872473169, 0], [-0.3967237022710257, -0.040587175567756414, 0], [-0.38826194784127777, -0.06064972236086846, 0], [-0.37689902046418766, -0.08759085662590459, 0], [-0.3684372660344397, -0.10765340341901662, 0], [-0.3667332168704768, -0.11155477913651107, 0], [-0.3659845270776142, -0.11305215872223602, 0], [-0.36553219366109313, -0.11387883703518836, 0], [-0.3651890441726978, -0.11422198652358367, 0], [-0.36473671075617675, -0.11475230846019463, 0], [-0.3639880209633142, -0.11584414774145244, 0], [-0.3633173196905417, -0.11659283753431489, 0], [-0.36291177938607444, -0.11699837783878206, 0], [-0.362163089593212, -0.11766907911155476, 0], [-0.3610712503119541, -0.11841776890441724, 0], [-0.36054092837534324, -0.11887010232093828, 0], [-0.36019777888694793, -0.11921325180933362, 0], [-0.3593711005739958, -0.11966558522585473, 0], [-0.35787372098827075, -0.12041427501871721, 0], [-0.3571172323433992, -0.12078861991514843, 0], [-0.3569144621911655, -0.12078861991514843, 0], [-0.3566259046668332, -0.12078861991514843, 0], [-0.3565479161467434, -0.12078861991514843, 0], [-0.3562047666583481, -0.12078861991514843, 0], [-0.35545607686548575, -0.12108497629148984, 0], [-0.3543018467681558, -0.12149051659595703, 0], [-0.3533347891190419, -0.12178687297229841, 0], [-0.35292924881457466, -0.12178687297229841, 0], [-0.35187640379336194, -0.12186486149238826, 0], [-0.3501762540554034, -0.12220801098078359, 0], [-0.34831232842525606, -0.12227820064886445, 0], [-0.3464717993511359, -0.12207543049663087, 0], [-0.34534876466184217, -0.12178687297229841, 0], [-0.344943224357375, -0.12178687297229841, 0], [-0.34397616670826114, -0.12170108560019957, 0], [-0.3428219366109312, -0.12115516595957067, 0], [-0.34207324681806883, -0.12078861991514843, 0], [-0.3417300973296735, -0.12078861991514843, 0], [-0.34165210880958374, -0.12078861991514843, 0], [-0.34164430995757467, -0.12078861991514843, 0], [-0.3414415398053411, -0.12078861991514843, 0], [-0.3404042924881462, -0.12041427501871715, 0], [-0.33890691290242114, -0.11966558522585467, 0], [-0.338080234589469, -0.11921325180933362, 0], [-0.3377370851010737, -0.11887010232093828, 0], [-0.33720676316446263, -0.11841776890441719, 0], [-0.33611492388320485, -0.1176690791115547, 0], [-0.3353662340903425, -0.11699837783878206, 0], [-0.33496069378587523, -0.11659283753431489, 0], [-0.33428999251310276, -0.11584414774145244, 0], [-0.3335413027202402, -0.11475230846019463, 0], [-0.333088969303719, -0.11422198652358367, 0], [-0.3327458198153237, -0.11387883703518836, 0], [-0.33229348639880274, -0.11305215872223602, 0], [-0.33154479660594016, -0.11155477913651107, 0], [-0.3298407474419771, -0.10765340341901662, 0], [-0.32137899301222916, -0.08759085662590459, 0], [-0.31001606563513906, -0.06064972236086841, 0], [-0.3015543112053911, -0.04058717556775636, 0], [-0.29910937110057456, -0.04056572872473163, 0], [-0.2920124157723989, -0.06049179560768645, 0], [-0.28248221861742007, -0.08724965685051152, 0], [-0.2753852632892444, -0.10717572373346637, 0], [-0.2712440728724739, -0.11570376840529069, 0], [-0.26163588719740516, -0.12237958572498123, 0], [-0.25422697778887016, -0.12319846518592452, 0], [-0.25088906912902487, -0.12265254554529564, 0], [-0.24224014225106094, -0.11831638382830041, 0], [-0.23576709508360372, -0.10494915148490139, 0], [0.2041427501871722, -0.05697841277763911, 0], [0.20564012977289736, -0.05732156226603442, 0], [0.2086836317694032, -0.05739955078612428, 0], [0.22328698215622644, -0.05739955078612428, 0], [0.2428971955328174, -0.05739955078612428, 0], [0.25750054591964044, -0.05739955078612428, 0], [0.26054404791614627, -0.0573917519341153, 0], [0.2620414275018714, -0.05718898178188172, 0], [0.2632580484152729, -0.056900424257549286, 0], [0.26531694534564476, -0.056900424257549286, 0], [0.2741998377838777, -0.05613613676066883, 0], [0.2824198278013472, -0.04805652607936111, 0], [0.2820279354878956, -0.027163401547292236, 0], [0.2724626434988766, -0.004265972048914379, 0], [0.25395986710756135, 0.013952146244072884, 0], [0.22717470988270483, 0.024496194160219618, 0], [0.19402861398802052, 0.02451276672073872, 0], [0.16619646088095785, 0.013557329361118047, 0], [0.14685725761167934, -0.006873713189418505, 0], [0.13680648708510068, -0.03523618823309208, 0], [0.13652280384327398, -0.06505022460693785, 0], [0.1450937422011478, -0.09016252807586721, 0], [0.1634912340903414, -0.11059552033940603, 0], [0.19302548664836494, -0.1226057524332418, 0], [0.21924132767656568, -0.1233466433740953, 0], [0.24943848265535284, -0.1192288495133516, 0], [0.2631644621911653, -0.11616390067382079, 0], [0.27258547541801836, -0.10629055403044668, 0], [0.2716730097329674, -0.09350823558772148, 0], [0.2632346518592463, -0.08661405041177939, 0], [0.24943848265535284, -0.08736274020464184, 0], [0.21924132767656568, -0.09182368355378084, 0], [0.20405598795857238, -0.09213173820813571, 0], [0.19038265067382065, -0.08683631769403541, 0], [0.18094409002994727, -0.07714234464686795, 0], [0.17606785781132972, -0.06398568130771148, 0], [0.17509982530571477, -0.04782256051909158, 0], [0.1814870851010728, -0.018869322435737444, 0], [0.19257705265784852, -0.006564196250311949, 0], [0.20439621287746412, -0.002113976322685288, 0], [0.21822942662839995, -0.002090092338407758, 0], [0.22947927065135976, -0.0065510356875467845, 0], [0.2382490797354626, -0.01475542800099825, 0], [0.24388375031195375, -0.02595457948589964, 0], [0.23923758422760133, -0.03244322435737457, 0], [0.21247192413276728, -0.03244322435737457, 0], [0.20177969802844986, -0.033402483154479634, 0], [0.19536904167706481, -0.039813139505864736, 0], [0.1948309208884449, -0.04896899176441229, 0], [0.19960381831794338, -0.05544203893186922, 0], [-0.07112553032193669, -0.07948200024956324, 0], [-0.07112553032193669, -0.061193692288495104, 0], [-0.07112553032193669, -0.03663510731220364, 0], [-0.07112553032193669, -0.018346799351135503, 0], [-0.07247278200648877, -0.005653192850012464, 0], [-0.0830753213127029, 0.009189972236086853, 0], [-0.10383196593461441, 0.018300981095582744, 0], [-0.13427478475168475, 0.022475316633391567, 0], [-0.15844147741452475, 0.022101946593461444, 0], [-0.1824619416021963, 0.018327302221113048, 0], [-0.193996443723484, 0.015745882206139265, 0], [-0.20259077863738462, 0.007993823309208883, 0], [-0.2028715373097082, -0.004133391564761677, 0], [-0.1948387197404544, -0.012400174694285003, 0], [-0.1819940104816572, -0.012041427501871723, 0], [-0.15591464936361388, -0.007923633641128013, 0], [-0.1478818317943601, -0.006987771400049916, 0], [-0.1386167956076868, -0.006987771400049916, 0], [-0.12692631644621943, -0.007401110556526072, 0], [-0.11589776484901448, -0.010814083166957809, 0], [-0.11207437765160999, -0.016111453394060404, 0], [-0.11155477913651135, -0.02760793611180435, 0], [-0.11155477913651135, -0.06123658597454453, 0], [-0.11217673758422786, -0.0744224950087347, 0], [-0.11697693099575768, -0.08461949401048163, 0], [-0.1261288838283009, -0.09261721674569501, 0], [-0.13916466496131785, -0.09719904230097326, 0], [-0.1561096206638385, -0.09651859246318938, 0], [-0.16741795607686571, -0.08772148739705513, 0], [-0.16853611648365374, -0.07718426347641628, 0], [-0.16524305122286032, -0.07059228381582233, 0], [-0.1544250686298978, -0.06430153481407536, 0], [-0.14175193411529852, -0.06131457449463436, 0], [-0.13507611679560794, -0.05473234339905164, 0], [-0.13664563576241606, -0.04354878961816817, 0], [-0.14201514537060156, -0.038994260044921375, 0], [-0.15059583229348672, -0.03730970801098079, 0], [-0.16412586567257326, -0.03905957543049659, 0], [-0.18404998284252583, -0.044813178500124805, 0], [-0.19922459913900692, -0.05526948933117044, 0], [-0.2077311969678065, -0.07206626684552034, 0], [-0.20787547572997278, -0.09227796668330424, 0], [-0.20059329766658374, -0.10727125967057652, 0], [-0.1880468944971303, -0.11791279323683554, 0], [-0.17234195626403814, -0.1235474638133267, 0], [-0.14878649862740245, -0.12307368355378089, 0], [-0.12142812577988538, -0.11185893436486151, 0], [-0.10756956575992038, -0.10975324432243576, 0], [-0.10034880365610221, -0.12015008890691292, 0], [-0.09146006207886226, -0.12378630365610181, 0], [-0.07879180184676837, -0.12312827551784376, 0], [-0.06910562765160999, -0.11501746942850012, 0], [-0.06796699525829808, -0.10453581232842525, 0], [-0.07050942101322699, -0.0928063389069129, 0], [0.39995632642874956, 0.025954579485899684, 0], [0.38417144996256525, 0.025954579485899684, 0], [0.37418112053905617, 0.024886136760668854, 0], [0.3643701647117541, 0.017321250311954108, 0], [0.35914493386573487, 0.017375842276016986, 0], [0.34933397803843236, 0.024114050411779407, 0], [0.3423540054903915, 0.024956326428749696, 0], [0.3419484651859239, 0.024956326428749696, 0], [0.3409034190167204, 0.02503431494883955, 0], [0.33940603943099545, 0.025377464437234865, 0], [0.3353818317943593, 0.025455452957324706, 0], [0.3209695532817567, 0.025455452957324706, 0], [0.31242981033191897, 0.024402607936111827, 0], [0.30527046418767156, 0.017243261791864268, 0], [0.30527046418767156, 0.006714811579735486, 0], [0.31242981033191897, -0.00044453456451205864, 0], [0.3184739206388818, -0.001497379585724948, 0], [0.3219054155228349, -0.001497379585724948, 0], [0.32268530072373336, -0.005936876091839244, 0], [0.32268530072373336, -0.03418821749438479, 0], [0.32268530072373336, -0.07212573309208879, 0], [0.32268530072373336, -0.10037707449463433, 0], [0.32412028949338656, -0.11341090591464933, 0], [0.33447716496131763, -0.12348702271025702, 0], [0.35082355877214844, -0.12348702271025702, 0], [0.3611804342400795, -0.11341090591464933, 0], [0.3626154230097327, -0.10134218243074614, 0], [0.3626154230097327, -0.07923243698527571, 0], [0.3626154230097327, -0.049542207387072615, 0], [0.3626154230097327, -0.027432461941602187, 0], [0.36589094085350626, -0.021462440728724712, 0], [0.3803032193661091, -0.01048165710007486, 0], [0.38662028949338634, -0.0079860244571999, 0], [0.40000311954080336, -0.0079860244571999, 0], [0.41079673072123724, -0.007268530072373342, 0], [0.421434364861492, -0.00040554030446717404, 0], [0.4215123533815823, 0.014162715248315454, 0], [0.41121786872972255, 0.02445719990017472, 0], [-0.5900923384077864, 0.02196156725729973, 0], [-0.5983279261292738, 0.02196156725729973, 0], [-0.60019965061143, 0.025783004741702024, 0], [-0.60019965061143, 0.04259732967307214, 0], [-0.6016346393810832, 0.0550131020713751, 0], [-0.6119915148490143, 0.06508921886698278, 0], [-0.6283379086598453, 0.06508921886698278, 0], [-0.6386947841277765, 0.0550131020713751, 0], [-0.6401297728974296, 0.04259732967307214, 0], [-0.6401297728974296, 0.025783004741702024, 0], [-0.6402077614175194, 0.02196156725729973, 0], [-0.6405509109059146, 0.02196156725729973, 0], [-0.6458931245320689, 0.020908722236086856, 0], [-0.6530524706763166, 0.013749376091839297, 0], [-0.6530524706763166, 0.0032209258797105144, 0], [-0.6458931245320689, -0.003938420264537031, 0], [-0.6405509109059146, -0.00499126528574992, 0], [-0.6402077614175194, -0.00499126528574992, 0], [-0.6401297728974296, -0.009302080733715978, 0], [-0.6401297728974296, -0.036734542675318164, 0], [-0.6401297728974296, -0.07357242013975543, 0], [-0.6401297728974296, -0.10100488208135762, 0], [-0.6386947841277765, -0.1139100324432243, 0], [-0.6283379086598453, -0.12398614923883201, 0], [-0.6119915148490143, -0.12398614923883201, 0], [-0.6016346393810832, -0.1139100324432243, 0], [-0.60019965061143, -0.10098343523833286, 0], [-0.60019965061143, -0.07341449338657345, 0], [-0.60019965061143, -0.036393342899925095, 0], [-0.60019965061143, -0.008824401048165715, 0], [-0.5983279261292738, -0.004492138757174928, 0], [-0.5900923384077864, -0.004492138757174928, 0], [-0.580359371100574, -0.0037980409283753175, 0], [-0.5713750935862242, 0.0024566383828300473, 0], [-0.5713750935862242, 0.014802221113052173, 0], [-0.580359371100574, 0.02125967057649115, 0], [0.4954532692787623, 0.04043704766658349, 0], [0.5066992138757171, 0.037021150486648384, 0], [0.519167628525081, 0.03690221799351137, 0], [0.5277580640129769, 0.04017383641128027, 0], [0.5342681557274767, 0.04864923883204394, 0], [0.5347526594085348, 0.05960955047417021, 0], [0.530707004928874, 0.0669853147616671, 0], [0.5195205265784872, 0.07322342151235339, 0], [0.5091870476665832, 0.07436985275767409, 0], [0.5040398053406536, 0.07436985275767409, 0], [0.502869977539306, 0.07592962315947094, 0], [0.502869977539306, 0.08279261292737711, 0], [0.5040398053406536, 0.08435238332917395, 0], [0.5091870476665832, 0.08435238332917395, 0], [0.517711192912403, 0.08531164212627902, 0], [0.527528972735213, 0.0905670935238333, 0], [0.531286069690541, 0.09681982312203645, 0], [0.5308522585475415, 0.10624376091839281, 0], [0.5225542800099823, 0.114089406039431, 0], [0.509280633890691, 0.11470551534814076, 0], [0.49926690791115536, 0.11108684801597206, 0], [0.4948371599700523, 0.11029136511105565, 0], [0.4924351135512852, 0.11681120539056651, 0], [0.496490516595957, 0.1209367981033192, 0], [0.509436610930871, 0.1251013850761168, 0], [0.516845520339406, 0.12577988520089844, 0], [0.5234706451210382, 0.12526418611180434, 0], [0.5338665148490145, 0.1215421839905166, 0], [0.5426753181931621, 0.11125062390816073, 0], [0.5431744447217368, 0.09566071874220115, 0], [0.534190167207387, 0.08414961317694035, 0], [0.5263289243823308, 0.08028138258048417, 0], [0.5263289243823308, 0.07993823309208885, 0], [0.5347360868480158, 0.07680309458447718, 0], [0.5461224107811329, 0.06413775892188671, 0], [0.547231797479411, 0.04921758017219866, 0], [0.5427903512602945, 0.03894454236336413, 0], [0.5339971456201646, 0.03103455671325182, 0], [0.5209457667831296, 0.02656386479910158, 0], [0.5049522710257048, 0.02654729223858249, 0], [0.4921465560269527, 0.0301659595707512, 0], [0.48852008984277506, 0.03400299475917147, 0], [0.49126528574993733, 0.040865984527077626, 0], [0.20339406039430985, -0.056900424257549286, 0], [-1, 0.06588470177189919, 0], [-0.9865235837284752, 0.05240828550037436, 0], [-0.9865235837284752, 0.07936111804342401, 0], [-0.9520838532568006, -0.047417020214624406, 0], [-0.9520838532568006, 0.05240828550037436, 0], [-0.9306214125280758, 0.07936111804342401, 0], [-0.9271275268280509, 0.07886199151484902, 0], [-0.9076615922136262, 0.0569004242575493, 0], [-0.9076615922136262, -0.05091090591464938, 0], [-0.8667332168704767, -0.08984277514349887, 0], [-0.8667332168704767, -0.12577988520089844, 0], [-0.8258048415273271, -0.05091090591464938, 0], [-0.8258048415273271, 0.0569004242575493, 0], [-0.8078362864986275, -0.11130521587222358, 0], [-0.8078362864986275, -0.10980783628649864, 0], [-0.8033441477414525, 0.07936111804342401, 0], [-0.7943598702271026, -0.12478163214374842, 0], [-0.7808834539555778, 0.0569004242575493, 0], [-0.7808834539555778, -0.09782879960069873, 0], [-0.7808834539555778, -0.12478163214374842, 0], [-0.7674070376840529, -0.11130521587222358, 0], [-0.7469428500124782, 0.06638382830047417, 0], [-0.7334664337409533, 0.05290741202894935, 0], [-0.7334664337409533, 0.079860244571999, 0], [-0.7304716745695035, -0.1043174444721737, 0], [-0.7304716745695035, 0.05290741202894935, 0], [-0.7120039930122286, 0.079860244571999, 0], [-0.7105066134265037, -0.12428250561517343, 0], [-0.7090092338407787, 0.07936111804342401, 0], [-0.6905415522835039, 0.05939605690042426, 0], [-0.6905415522835039, -0.1043174444721737, 0], [-0.6541053156975294, 0.008485150985774906, 0], [-0.6406288994260045, -0.00499126528574992, 0], [-0.6406288994260045, 0.02196156725729973, 0], [-0.6401297728974296, -0.10531569752932365, 0], [-0.6401297728974296, -0.00499126528574992, 0], [-0.6401297728974296, 0.02196156725729973, 0], [-0.6401297728974296, 0.04641876715747442, 0], [-0.6201647117544298, -0.12528075867232338, 0], [-0.6201647117544298, 0.06638382830047418, 0], [-0.60019965061143, -0.004492138757174928, 0], [-0.60019965061143, -0.10531569752932365, 0], [-0.60019965061143, 0.04641876715747442, 0], [-0.60019965061143, 0.02196156725729973, 0], [-0.5882206139256302, 0.02196156725729973, 0], [-0.5882206139256302, -0.004492138757174928, 0], [-0.5702520588969304, 0.008485150985774906, 0], [-0.5363114549538308, 0.05939605690042426, 0], [-0.5353132018966809, -0.10481657100074869, 0], [-0.5353132018966809, 0.00549039181432494, 0], [-0.5346502994759172, 0.05127745195907164, 0], [-0.5346502994759171, 0.06772523084601946, 0], [-0.5234667456950338, 0.07876840529074121, 0], [-0.5234667456950338, 0.040093898178188175, 0], [-0.5153481407536811, -0.12478163214374842, 0], [-0.5153481407536811, 0.02545545295732469, 0], [-0.5153481407536811, 0.038432742700274525, 0], [-0.5153481407536811, 0.080359371100574, 0], [-0.5072295358123284, 0.040093898178188175, 0], [-0.5072295358123284, 0.07869821562266036, 0], [-0.496045982031445, 0.05127745195907163, 0], [-0.496045982031445, 0.0675146618417769, 0], [-0.49438482655353144, 0.05939605690042426, 0], [-0.4953830796106814, -0.10481657100074869, 0], [-0.4953830796106814, 0.00549039181432494, 0], [-0.4609433491390068, -0.09683054654354872, 0], [-0.4559520838532569, 0.009982530571499896, 0], [-0.4489643124532069, -0.12228599950087343, 0], [-0.44247566758173207, -0.12328425255802342, 0], [-0.44247566758173207, -0.0034938857000249442, 0], [-0.44247566758173207, 0.02345894684302472, 0], [-0.4275018717244822, -0.0034938857000249442, 0], [-0.4240079860244572, -0.1103069628150736, 0], [-0.4030446718243075, 0.02345894684302472, 0], [-0.4000499126528575, 0.022959820314449715, 0], [-0.39905165959570754, 0.022959820314449715, 0], [-0.3980534065385576, -0.037434489643124486, 0], [-0.3735962066383829, 0.00549039181432494, 0], [-0.36710756176690795, -0.11080608934364856, 0], [-0.3656101821811829, -0.11380084851509852, 0], [-0.36511105565260804, -0.11429997504367354, 0], [-0.363613676066883, -0.1162964811579735, 0], [-0.36261542300973304, -0.11729473421512349, 0], [-0.36061891689543313, -0.11879211380084846, 0], [-0.36011979036685815, -0.11929124032942345, 0], [-0.35712503119540817, -0.12078861991514843, 0], [-0.3561267781382582, -0.12078861991514843, 0], [-0.3536311454953833, -0.12178687297229841, 0], [-0.35263289243823337, -0.12178687297229841, 0], [-0.3491390067382084, -0.12228599950087343, 0], [-0.3491390067382082, -0.05240828550037433, 0], [-0.34564512103818357, -0.12178687297229841, 0], [-0.3446468679810336, -0.12178687297229841, 0], [-0.3421512353381587, -0.12078861991514843, 0], [-0.34115298228100877, -0.12078861991514843, 0], [-0.3381582231095588, -0.11929124032942345, 0], [-0.3376590965809838, -0.11879211380084846, 0], [-0.3356625904666838, -0.11729473421512349, 0], [-0.33466433740953394, -0.1162964811579735, 0], [-0.3331669578238089, -0.11429997504367354, 0], [-0.3326678312952339, -0.11380084851509852, 0], [-0.3311704517095089, -0.11080608934364856, 0], [-0.3246818068380335, 0.00549039181432494, 0], [-0.30022460693785935, -0.03743448964312446, 0], [-0.29922635388070884, 0.022959820314449715, 0], [-0.2742700274519597, -0.11030696281507354, 0], [-0.2732717743948092, 0.004991265285749934, 0], [-0.255802345894685, -0.12328425255802339, 0], [-0.24931370102321004, -0.1222859995008734, 0], [-0.2368355378088346, -0.09732967307212377, 0], [-0.20888445220863516, -0.08335413027202397, 0], [-0.20389318692288505, 0.00149737958572499, 0], [-0.1879211380084853, -0.01297728974294982, 0], [-0.1879211380084853, 0.017469428500124777, 0], [-0.1689543299226356, -0.08135762415772398, 0], [-0.1639630646368857, -0.12428250561517346, 0], [-0.15298228100823585, -0.03743448964312454, 0], [-0.15298228100823574, 0.022959820314449715, 0], [-0.14998752183678576, -0.006987771400049916, 0], [-0.1469927626653359, -0.09782879960069873, 0], [-0.14349887696531094, -0.061891689543299204, 0], [-0.13651110556526103, -0.006987771400049916, 0], [-0.1350137259795361, -0.047417020214624406, 0], [-0.11155477913651135, -0.06887946094334912, 0], [-0.11155477913651135, -0.019965061142999736, 0], [-0.10905914649363635, -0.10082355877214874, 0], [-0.08560019965061172, -0.12428250561517346, 0], [-0.07112553032193669, -0.015472922385824808, 0], [-0.07112553032193669, -0.08235587721487396, 0], [-0.06763164462191196, -0.10880958322934865, 0], [-0.04417269777888688, 0.06638382830047417, 0], [-0.030696281507362144, 0.05290741202894935, 0], [-0.030696281507362144, 0.079860244571999, 0], [-0.025705016221612254, -0.1043174444721737, 0], [-0.025705016221612254, 0.05290741202894935, 0], [-0.009233840778637314, 0.079860244571999, 0], [-0.006239081607187447, 0.07936111804342401, 0], [-0.005739955078612469, -0.12428250561517343, 0], [-0.005240828550037491, 0.07936111804342401, 0], [0.014225106064387205, 0.05939605690042426, 0], [0.014225106064387205, -0.1043174444721737, 0], [0.025205889693036942, -0.037933616171699505, 0], [0.03169453456451188, -0.020464187671574728, 0], [0.0356875467931117, -0.061891689543299176, 0], [0.06563513850761149, -0.03643623658597453, 0], [0.06663339156476145, 0.017968555028699797, 0], [0.07362116296481136, -0.11529822810082352, 0], [0.08210631395058621, 0.025455452957324706, 0], [0.09158971799351101, -0.12478163214374839, 0], [0.0950836036935363, -0.005490391814324912, 0], [0.10107312203643604, 0.007486897928624922, 0], [0.107062640379336, -0.09233840778637382, 0], [0.11055652607936084, -0.10531569752932365, 0], [0.13551285250811063, -0.05190915897179934, 0], [0.17544297479410997, -0.056401297728974266, 0], [0.1944097828799598, -0.04442226104317443, 0], [0.2063888195657595, -0.03244322435737457, 0], [0.20638881956575972, -0.05739955078612428, 0], [0.21088095832293452, 0.025954579485899684, 0], [0.2118792113800847, -0.001497379585724976, 0], [0.21237833790865968, -0.09283753431494879, 0], [0.21237833790865968, -0.12428250561517343, 0], [0.2453206887946091, -0.03244322435737457, 0], [0.25630147242325907, -0.0863488894434739, 0], [0.25630147242325907, -0.1182929872722735, 0], [0.2597953581232839, -0.05739955078612428, 0], [0.262790117294734, -0.056900424257549286, 0], [0.2657848764661839, -0.056900424257549286, 0], [0.273271774394809, -0.09882705265784875, 0], [0.28325430496630855, -0.03943099575742451, 0], [0.3042176191664585, 0.011979036685799877, 0], [0.31769403543798336, -0.001497379585724948, 0], [0.31769403543798336, 0.025455452957324706, 0], [0.32268530072373336, -0.10481657100074866, 0], [0.32268530072373336, -0.001497379585724948, 0], [0.3386573496381329, 0.025455452957324706, 0], [0.34165210880958274, 0.024956326428749696, 0], [0.3426503618667327, 0.024956326428749696, 0], [0.34265036186673314, -0.12478163214374839, 0], [0.36161716995258253, 0.011479910157224871, 0], [0.3626154230097327, -0.02395807337159967, 0], [0.3626154230097327, -0.10481657100074866, 0], [0.38058397803843236, 0.025954579485899684, 0], [0.38357873720988245, -0.0079860244571999, 0], [0.40304467182430703, -0.0079860244571999, 0], [0.40354379835288223, 0.025954579485899684, 0], [0.4230097329673068, 0.006488644871474924, 0], [0.4878961816820564, 0.03244322435737461, 0], [0.491889193910656, 0.04242575492887449, 0], [0.49188919391065644, 0.11829298727227353, 0], [0.4953830796106813, 0.10880958322934865, 0], [0.502869977539306, 0.08435238332917395, 0], [0.502869977539306, 0.07436985275767409, 0], [0.5103568754679308, 0.08435238332917395, 0], [0.5103568754679308, 0.07436985275767409, 0], [0.512852508110806, 0.025954579485899684, 0], [0.5133516346393809, 0.03643623658597456, 0], [0.5148490142251059, 0.11529822810082357, 0], [0.516845520339406, 0.1207886199151485, 0], [0.5263289243823308, 0.07986024457199901, 0], [0.5263289243823308, 0.080359371100574, 0], [0.5318193161966556, 0.10082355877214874, 0], [0.5353132018966804, 0.05490391814324933, 0], [0.5442974794110307, 0.10282006488644872, 0], [0.5477913651110555, 0.05490391814324933, 0], [0.5587721487397055, -0.00249563264287496, 0], [0.5587721487397055, -0.08035937110057399, 0], [0.5687546793112053, -0.0718742201147991, 0], [0.5687546793112053, -0.043923134514599435, 0], [0.5687546793112053, -0.03543798352882452, 0], [0.5687546793112053, -0.010980783628649852, 0], [0.5987022710257048, -0.043923134514599435, 0], [0.5987022710257048, -0.03543798352882452, 0], [0.6006987771400047, -0.010980783628649852, 0], [0.6006987771400047, -0.00249563264287496, 0], [0.6021961567257297, -0.08035937110057399, 0], [0.6021961567257297, -0.0718742201147991, 0], [0.6071874220114797, -0.08035937110057396, 0], [0.6081856750686296, -0.024457199900174635, 0], [0.6191664586972794, -0.08035937110057396, 0], [0.6196655852258546, -0.02445719990017469, 0], [0.6196655852258546, -0.024457199900174635, 0], [0.6271524831544795, -0.05190915897179931, 0], [0.6271524831544795, -0.06788120788619911, 0], [0.6276516096830547, -0.03643623658597453, 0], [0.6331420014973794, -0.05839780384327423, 0], [0.6331420014973796, -0.04542051410032441, 0], [0.6336411280259546, -0.04542051410032441, 0], [0.6391315198402792, -0.06788120788619911, 0], [0.6391315198402798, -0.05141003244322435, 0], [0.6391315198402798, -0.03643623658597453, 0], [0.6471175442974793, -0.08035937110057396, 0], [0.6471175442974797, -0.024457199900174663, 0], [0.6580983279261297, -0.024457199900174663, 0], [0.6585974544547044, -0.08035937110057396, 0], [0.663588719740454, -0.024457199900174635, 0], [0.663588719740454, -0.03194409782879955, 0], [0.6720738707262288, -0.010980783628649824, 0], [0.6720738707262288, -0.024457199900174635, 0], [0.6720738707262288, -0.03194409782879955, 0], [0.6720738707262288, -0.06239081607187417, 0], [0.6760668829548289, -0.076865485400549, 0], [0.6820564012977288, -0.061891689543299176, 0], [0.6820564012977288, -0.031944097828799575, 0], [0.6820564012977288, -0.024457199900174663, 0], [0.6820564012977288, -0.008485150985774865, 0], [0.6870476665834788, -0.08135762415772392, 0], [0.6895432992263537, -0.07287247317194906, 0], [0.6955328175692534, -0.07237334664337407, 0], [0.6960319440978286, -0.07986024457199897, 0], [0.6965310706264034, -0.031944097828799575, 0], [0.6965310706264034, -0.024457199900174663, 0], [0.702520588969304, -0.053406538557524315, 0], [0.7125031195408036, -0.05440479161467427, 0], [0.7125031195408036, -0.05390566508609931, 0], [0.7125923289292888, -0.05440479161467427, 0], [0.7130022460693783, -0.046917893686049414, 0], [0.7284751684552033, -0.030446718243074596, 0], [0.7284751684552035, -0.02345894684302468, 0], [0.7299725480409285, -0.08135762415772398, 0], [0.7314699276266534, -0.07337159970052405, 0], [0.7424507112553032, -0.046917893686049414, 0], [0.7469428500124782, -0.0703768405290741, 0], [0.7484402295982033, -0.077863738457699, 0], [0.7509358622410782, -0.05440479161467427, 0], [0.7514349887696534, -0.04991265285749934, 0], [0.7644122785126028, -0.02445719990017469, 0], [0.7649114050411778, -0.03943099575742451, 0], [0.7649114050411776, -0.03943099575742451, 0], [0.7649114050411776, -0.079860244571999, 0], [0.7733965560269527, -0.02445719990017469, 0], [0.7738956825555279, -0.03344147741452458, 0], [0.7748939356126774, -0.079860244571999, 0], [0.7748939356126774, -0.046418767157474394, 0], [0.7753930621412526, -0.04192662840029947, 0], [0.7888694784127772, -0.03144497130022461, 0], [0.7923633641128025, -0.022959820314449687, 0], [0.8018467681557273, -0.079860244571999, 0], [0.8018467681557273, -0.0479161467431994, 0], [0.8118292987272271, -0.079860244571999, 0], [0.8118292987272271, -0.046418767157474394, 0], [0.8248065884701767, -0.053406538557524315, 0], [0.8352882455702517, -0.05190915897179934, 0], [0.8487646618417766, -0.08185675068629897, 0], [0.8497629148989265, -0.02345894684302468, 0], [0.8517594210132267, -0.0723733466433741, 0], [0.8517594210132267, -0.030446718243074624, 0], [0.8662340903419012, -0.04242575492887446, 0], [0.8667332168704762, 0.001497379585725004, 0], [0.8667332168704762, -0.031944097828799575, 0], [0.8667332168704764, -0.046917893686049414, 0], [0.8667332168704764, -0.060394309957574256, 0], [0.8672323433990516, -0.046917893686049414, 0], [0.8672323433990516, -0.0559021712003993, 0], [0.8677314699276264, -0.07087596705764909, 0], [0.8682305964562016, -0.08035937110057396, 0], [0.8767157474419762, -0.06588470177189915, 0], [0.8767157474419762, 0.001497379585725004, 0], [0.8772148739705514, -0.08035937110057396, 0], [0.8891939106563516, -0.053406538557524315, 0], [0.8991764412278507, -0.046917893686049414, 0], [0.8991764412278511, -0.05440479161467427, 0], [0.8991764412278511, -0.05390566508609931, 0], [0.8992656506163363, -0.05440479161467427, 0], [0.9146493636136757, -0.030446718243074596, 0], [0.9151484901422511, -0.02345894684302468, 0], [0.916645869727976, -0.08135762415772398, 0], [0.918143249313701, -0.07337159970052405, 0], [0.9286249064137755, -0.046917893686049414, 0], [0.9336161716995257, -0.0703768405290741, 0], [0.9351135512852509, -0.077863738457699, 0], [0.9376091839281258, -0.05440479161467427, 0], [0.938108310456701, -0.04991265285749934, 0], [0.9475917144996253, -0.053406538557524315, 0], [0.9575742450711253, -0.05190915897179934, 0], [0.9715497878712251, -0.08185675068629897, 0], [0.9725480409283751, -0.02345894684302468, 0], [0.9740454205141, -0.0723733466433741, 0], [0.9740454205141, -0.030446718243074624, 0], [0.9885200898427748, -0.04242575492887446, 0], [0.9890192163713498, -0.046917893686049414, 0], [0.9890192163713498, -0.060394309957574256, 0], [0.9895183428999248, 0.001497379585725004, 0], [0.9895183428999248, -0.031944097828799575, 0], [0.989518342899925, -0.046917893686049414, 0], [0.989518342899925, -0.0559021712003993, 0], [0.990516595957075, -0.07087596705764909, 0], [0.99101572248565, -0.08035937110057396, 0], [0.9995008734714248, -0.06588470177189915, 0], [0.9995008734714248, 0.001497379585725004, 0], [1, -0.08035937110057396, 0]];
exports.cells = [[0, 1, 23], [0, 23, 24], [0, 24, 25], [0, 25, 987], [1, 22, 23], [1, 984, 22], [2, 3, 11], [2, 11, 984], [3, 10, 11], [3, 983, 10], [4, 5, 8], [4, 8, 9], [4, 9, 983], [5, 6, 7], [5, 7, 8], [5, 992, 6], [7, 991, 8], [9, 10, 983], [9, 982, 10], [11, 12, 984], [12, 13, 20], [12, 20, 21], [12, 21, 985], [12, 985, 984], [13, 14, 986], [13, 981, 14], [13, 986, 20], [14, 15, 19], [14, 19, 986], [15, 16, 18], [15, 18, 19], [15, 990, 16], [16, 17, 18], [17, 989, 18], [22, 984, 985], [23, 988, 24], [26, 27, 57], [26, 57, 59], [26, 59, 996], [27, 56, 57], [27, 1000, 56], [28, 29, 56], [28, 56, 1000], [29, 1002, 56], [30, 31, 1005], [30, 1005, 1002], [31, 1003, 1005], [32, 33, 39], [32, 39, 1003], [33, 1006, 39], [34, 35, 38], [34, 38, 39], [34, 39, 1006], [35, 36, 38], [35, 1008, 36], [36, 37, 38], [37, 1009, 38], [39, 1005, 1003], [40, 41, 45], [40, 45, 1004], [40, 46, 47], [40, 47, 1001], [40, 1001, 1005], [40, 1004, 46], [41, 42, 43], [41, 43, 44], [41, 44, 45], [41, 1010, 42], [43, 1007, 44], [48, 49, 55], [48, 55, 1001], [49, 999, 55], [50, 51, 54], [50, 54, 55], [50, 55, 999], [51, 52, 54], [51, 995, 52], [52, 53, 54], [53, 993, 54], [55, 998, 1001], [56, 1002, 998], [57, 58, 59], [57, 994, 58], [59, 997, 996], [60, 61, 91], [60, 91, 92], [60, 92, 93], [60, 93, 1021], [61, 90, 91], [61, 1020, 90], [62, 63, 67], [62, 67, 1019], [62, 1019, 1020], [63, 64, 66], [63, 66, 67], [63, 1027, 64], [64, 65, 66], [65, 1026, 66], [68, 69, 83], [68, 83, 1015], [68, 1015, 1019], [69, 82, 83], [69, 1018, 82], [70, 71, 1017], [70, 80, 81], [70, 81, 1018], [70, 1017, 80], [71, 78, 79], [71, 79, 1017], [71, 1022, 78], [71, 1023, 1022], [72, 73, 74], [72, 74, 75], [72, 75, 76], [72, 76, 77], [72, 77, 1023], [73, 1024, 74], [75, 1025, 76], [77, 1022, 1023], [81, 1016, 1018], [82, 1018, 1016], [84, 85, 89], [84, 89, 1014], [84, 1014, 1015], [85, 86, 88], [85, 88, 89], [85, 1012, 86], [86, 87, 88], [87, 1011, 88], [90, 1020, 1014], [91, 1013, 92], [94, 95, 103], [94, 103, 104], [94, 104, 105], [94, 105, 1029], [94, 1029, 1031], [95, 102, 103], [95, 1036, 102], [96, 97, 100], [96, 100, 101], [96, 101, 1036], [97, 98, 99], [97, 99, 100], [97, 1038, 98], [99, 1039, 100], [101, 1035, 1036], [102, 1036, 1035], [105, 1028, 1029], [106, 107, 1032], [106, 1030, 1028], [106, 1032, 1030], [107, 108, 122], [107, 122, 1032], [108, 109, 121], [108, 121, 122], [109, 1033, 121], [109, 1034, 1033], [110, 111, 120], [110, 120, 1033], [110, 1033, 1034], [111, 112, 119], [111, 119, 120], [112, 1037, 119], [112, 1041, 1037], [113, 114, 115], [113, 115, 1041], [114, 1040, 115], [115, 116, 124], [115, 124, 1037], [115, 1037, 1041], [116, 123, 124], [116, 1030, 123], [116, 1031, 1030], [117, 1028, 118], [117, 1029, 1028], [118, 1028, 1030], [123, 1030, 1032], [125, 126, 130], [125, 130, 1047], [125, 1047, 1043], [126, 127, 128], [126, 128, 129], [126, 129, 130], [126, 1042, 127], [128, 1046, 129], [131, 132, 144], [131, 144, 145], [131, 145, 1047], [132, 1051, 144], [132, 1052, 1051], [133, 134, 143], [133, 143, 1052], [134, 135, 142], [134, 142, 143], [135, 1056, 142], [136, 137, 141], [136, 141, 1054], [136, 1054, 1056], [137, 138, 140], [137, 140, 141], [137, 1055, 138], [138, 139, 140], [139, 1053, 140], [142, 1056, 1054], [143, 1051, 1052], [145, 1050, 1047], [146, 147, 153], [146, 153, 1043], [146, 1043, 1050], [147, 1049, 153], [148, 149, 152], [148, 152, 153], [148, 153, 1049], [149, 150, 151], [149, 151, 152], [149, 1048, 150], [151, 1045, 152], [153, 1044, 1043], [154, 155, 177], [154, 177, 178], [154, 178, 179], [154, 179, 1073], [155, 156, 1065], [155, 176, 177], [155, 1065, 176], [156, 157, 192], [156, 180, 181], [156, 181, 1063], [156, 192, 193], [156, 193, 1068], [156, 1063, 1065], [156, 1068, 180], [157, 190, 191], [157, 191, 1069], [157, 1067, 190], [157, 1069, 192], [157, 1072, 1067], [158, 159, 163], [158, 163, 1070], [158, 1070, 1072], [159, 160, 161], [159, 161, 162], [159, 162, 163], [159, 1074, 160], [161, 1071, 162], [164, 165, 188], [164, 188, 189], [164, 189, 1070], [165, 1059, 1061], [165, 1061, 188], [166, 167, 187], [166, 187, 1059], [167, 168, 187], [168, 169, 186], [168, 186, 187], [169, 1057, 1058], [169, 1058, 186], [170, 171, 185], [170, 185, 1058], [170, 1058, 1057], [171, 172, 185], [172, 173, 184], [172, 184, 185], [173, 1060, 1062], [173, 1062, 184], [174, 175, 183], [174, 183, 1062], [174, 1062, 1060], [175, 1065, 183], [177, 1064, 178], [180, 194, 195], [180, 195, 1066], [180, 1068, 194], [182, 183, 1065], [182, 1065, 1063], [187, 1061, 1059], [189, 1067, 1072], [189, 1072, 1070], [196, 197, 205], [196, 205, 206], [196, 206, 207], [196, 207, 1077], [196, 1077, 1079], [197, 204, 205], [197, 1083, 204], [198, 199, 202], [198, 202, 203], [198, 203, 1083], [199, 200, 201], [199, 201, 202], [199, 1085, 200], [201, 1086, 202], [203, 1082, 1083], [204, 1083, 1082], [207, 1075, 1077], [208, 209, 224], [208, 224, 1076], [208, 1076, 1078], [208, 1078, 1075], [209, 210, 224], [210, 211, 223], [210, 223, 224], [211, 1080, 223], [211, 1081, 1080], [212, 213, 222], [212, 222, 1080], [212, 1080, 1081], [213, 214, 221], [213, 221, 222], [214, 1084, 221], [214, 1088, 1084], [215, 216, 217], [215, 217, 1088], [216, 1087, 217], [217, 218, 226], [217, 226, 1084], [217, 1084, 1088], [218, 225, 226], [218, 1078, 225], [218, 1079, 1078], [219, 1075, 220], [219, 1077, 1075], [220, 1075, 1078], [225, 1078, 1076], [227, 228, 250], [227, 250, 251], [227, 251, 252], [227, 252, 1105], [228, 229, 1099], [228, 249, 250], [228, 1099, 249], [229, 230, 265], [229, 254, 1095], [229, 265, 266], [229, 266, 1100], [229, 1095, 1099], [229, 1100, 254], [230, 263, 264], [230, 264, 1101], [230, 1097, 263], [230, 1101, 265], [230, 1104, 1097], [231, 232, 236], [231, 236, 1102], [231, 1102, 1104], [232, 233, 234], [232, 234, 235], [232, 235, 236], [232, 1106, 233], [234, 1103, 235], [237, 238, 261], [237, 261, 262], [237, 262, 1102], [238, 1091, 1093], [238, 1093, 261], [239, 240, 260], [239, 260, 1093], [239, 1093, 1091], [240, 241, 260], [241, 242, 259], [241, 259, 260], [242, 1089, 1090], [242, 1090, 259], [243, 244, 258], [243, 258, 1090], [243, 1090, 1089], [244, 245, 258], [245, 246, 257], [245, 257, 258], [246, 1092, 1094], [246, 1094, 257], [247, 248, 256], [247, 256, 1094], [247, 1094, 1092], [248, 255, 256], [248, 1099, 255], [250, 1098, 251], [253, 254, 1100], [253, 267, 268], [253, 268, 1096], [253, 1100, 267], [255, 1099, 1095], [262, 1097, 1102], [269, 290, 270], [269, 291, 290], [269, 790, 291], [269, 794, 790], [270, 290, 787], [270, 787, 271], [271, 787, 272], [272, 787, 273], [273, 787, 274], [274, 787, 275], [275, 787, 276], [276, 289, 277], [276, 787, 289], [277, 289, 278], [278, 288, 279], [278, 289, 288], [279, 287, 280], [279, 288, 287], [280, 286, 281], [280, 287, 286], [281, 286, 788], [281, 788, 793], [282, 791, 283], [282, 793, 791], [284, 791, 285], [285, 791, 788], [291, 790, 292], [292, 324, 293], [292, 325, 324], [292, 790, 325], [293, 324, 786], [293, 786, 785], [294, 323, 295], [294, 785, 786], [294, 786, 323], [295, 322, 296], [295, 323, 322], [296, 321, 297], [296, 322, 321], [297, 320, 784], [297, 321, 320], [298, 319, 299], [298, 779, 319], [298, 784, 779], [299, 317, 300], [299, 318, 317], [299, 319, 318], [300, 316, 301], [300, 317, 316], [301, 316, 780], [301, 780, 783], [302, 782, 303], [302, 783, 782], [304, 782, 305], [305, 782, 781], [306, 780, 307], [306, 781, 782], [306, 782, 780], [307, 315, 308], [307, 780, 315], [308, 314, 309], [308, 315, 314], [309, 314, 777], [309, 777, 778], [310, 776, 311], [310, 778, 776], [312, 776, 313], [313, 776, 777], [320, 779, 784], [326, 330, 792], [326, 790, 330], [326, 792, 327], [327, 792, 789], [328, 789, 329], [329, 789, 792], [330, 790, 794], [330, 794, 331], [331, 794, 795], [332, 795, 796], [332, 796, 333], [334, 796, 335], [335, 796, 794], [336, 357, 337], [336, 922, 357], [336, 927, 922], [337, 355, 338], [337, 356, 355], [337, 357, 356], [338, 354, 339], [338, 355, 354], [339, 354, 919], [339, 919, 920], [340, 348, 341], [340, 349, 348], [340, 920, 349], [341, 348, 921], [341, 921, 925], [342, 344, 926], [342, 345, 344], [342, 925, 345], [342, 926, 343], [345, 346, 923], [345, 347, 346], [345, 925, 347], [347, 925, 921], [349, 920, 918], [350, 918, 920], [350, 920, 351], [351, 920, 917], [352, 917, 920], [352, 920, 353], [353, 920, 919], [358, 922, 928], [358, 928, 359], [359, 928, 924], [360, 924, 361], [361, 924, 928], [362, 927, 363], [362, 928, 927], [364, 914, 915], [364, 915, 365], [365, 915, 912], [366, 368, 911], [366, 910, 368], [366, 911, 367], [366, 912, 910], [368, 910, 369], [369, 374, 908], [369, 375, 374], [369, 910, 375], [370, 908, 371], [371, 908, 906], [372, 906, 907], [372, 907, 373], [374, 907, 908], [376, 390, 377], [376, 391, 390], [376, 910, 391], [377, 389, 378], [377, 390, 389], [378, 388, 379], [378, 389, 388], [379, 387, 380], [379, 388, 387], [380, 386, 381], [380, 387, 386], [381, 386, 916], [381, 916, 909], [382, 909, 383], [383, 909, 913], [384, 913, 916], [384, 916, 385], [391, 910, 915], [392, 915, 393], [393, 915, 914], [394, 396, 802], [394, 801, 396], [394, 802, 395], [394, 804, 801], [396, 801, 397], [397, 403, 799], [397, 801, 403], [398, 797, 399], [398, 799, 797], [400, 797, 401], [401, 797, 798], [402, 798, 799], [402, 799, 403], [404, 418, 405], [404, 419, 418], [404, 801, 419], [405, 417, 406], [405, 418, 417], [406, 416, 407], [406, 417, 416], [407, 415, 408], [407, 416, 415], [408, 414, 409], [408, 415, 414], [409, 414, 806], [409, 806, 800], [410, 800, 411], [411, 800, 803], [412, 803, 806], [412, 806, 413], [419, 801, 805], [420, 805, 421], [421, 805, 804], [422, 423, 424], [422, 424, 825], [424, 831, 825], [425, 426, 427], [425, 427, 840], [425, 840, 831], [428, 429, 441], [428, 441, 825], [428, 825, 840], [429, 430, 439], [429, 439, 440], [429, 440, 441], [430, 431, 438], [430, 438, 439], [431, 824, 438], [431, 839, 824], [432, 433, 434], [432, 434, 839], [434, 830, 839], [435, 436, 437], [435, 437, 824], [435, 824, 830], [442, 546, 443], [442, 547, 546], [442, 885, 547], [443, 545, 444], [443, 546, 545], [444, 544, 879], [444, 545, 544], [444, 879, 445], [445, 450, 878], [445, 878, 882], [445, 879, 450], [446, 882, 447], [447, 878, 880], [447, 882, 878], [448, 878, 449], [448, 880, 878], [450, 879, 451], [451, 879, 452], [452, 542, 453], [452, 543, 542], [452, 879, 543], [453, 542, 866], [454, 487, 455], [454, 866, 487], [455, 486, 852], [455, 487, 486], [455, 852, 456], [456, 852, 457], [457, 847, 853], [457, 852, 847], [458, 853, 459], [459, 853, 851], [460, 847, 461], [460, 851, 853], [460, 853, 847], [461, 847, 850], [462, 847, 849], [462, 849, 463], [462, 850, 847], [464, 847, 465], [464, 849, 847], [465, 470, 846], [465, 471, 470], [465, 847, 471], [466, 842, 467], [466, 846, 842], [468, 842, 469], [469, 842, 845], [470, 845, 846], [472, 847, 852], [472, 852, 473], [473, 484, 474], [473, 485, 484], [473, 852, 485], [474, 483, 475], [474, 484, 483], [475, 482, 841], [475, 483, 482], [476, 480, 477], [476, 481, 480], [476, 841, 848], [476, 848, 481], [477, 480, 844], [477, 844, 843], [478, 843, 479], [479, 843, 844], [482, 848, 841], [487, 866, 488], [488, 540, 489], [488, 541, 540], [488, 866, 541], [489, 540, 877], [489, 877, 854], [490, 494, 856], [490, 854, 862], [490, 856, 491], [490, 862, 494], [491, 492, 855], [491, 493, 492], [491, 856, 493], [494, 496, 495], [494, 497, 496], [494, 499, 497], [494, 862, 499], [495, 496, 857], [497, 498, 858], [497, 499, 498], [499, 862, 859], [500, 502, 501], [500, 859, 502], [501, 502, 860], [502, 859, 862], [502, 862, 503], [503, 504, 861], [503, 505, 504], [503, 506, 505], [503, 507, 506], [503, 508, 507], [503, 862, 508], [509, 862, 864], [509, 864, 510], [510, 511, 863], [510, 512, 511], [510, 864, 512], [513, 862, 869], [513, 864, 862], [513, 867, 514], [513, 869, 867], [514, 867, 865], [515, 865, 867], [515, 867, 516], [517, 520, 518], [517, 867, 520], [518, 520, 868], [519, 868, 520], [520, 867, 869], [521, 526, 522], [521, 869, 526], [522, 526, 523], [523, 526, 524], [524, 526, 525], [525, 526, 870], [526, 869, 527], [527, 528, 871], [527, 529, 528], [527, 869, 872], [527, 872, 529], [530, 532, 531], [530, 535, 532], [530, 869, 535], [530, 872, 869], [531, 532, 873], [532, 535, 533], [533, 534, 874], [533, 535, 534], [535, 539, 875], [535, 869, 539], [536, 538, 537], [536, 875, 538], [537, 538, 876], [538, 875, 539], [539, 869, 877], [541, 866, 542], [547, 885, 881], [548, 550, 549], [548, 551, 550], [548, 881, 551], [549, 550, 883], [551, 552, 884], [551, 553, 552], [551, 881, 885], [551, 885, 553], [554, 556, 933], [554, 602, 931], [554, 603, 602], [554, 775, 603], [554, 931, 932], [554, 932, 556], [554, 933, 555], [556, 599, 557], [556, 932, 599], [557, 598, 558], [557, 599, 598], [558, 598, 938], [558, 938, 559], [559, 938, 941], [560, 941, 942], [560, 942, 561], [562, 938, 945], [562, 942, 938], [562, 945, 563], [563, 945, 943], [564, 943, 945], [564, 945, 565], [566, 597, 567], [566, 938, 597], [566, 945, 938], [567, 596, 568], [567, 597, 596], [568, 595, 569], [568, 596, 595], [569, 594, 934], [569, 595, 594], [570, 592, 571], [570, 593, 592], [570, 934, 593], [571, 591, 572], [571, 592, 591], [572, 591, 573], [573, 590, 929], [573, 591, 590], [574, 589, 575], [574, 929, 930], [574, 930, 589], [575, 588, 576], [575, 589, 588], [576, 587, 577], [576, 588, 587], [577, 586, 937], [577, 587, 586], [578, 585, 579], [578, 936, 585], [578, 937, 936], [579, 584, 940], [579, 585, 584], [580, 584, 939], [580, 939, 581], [580, 940, 584], [581, 939, 944], [582, 939, 583], [582, 944, 939], [586, 936, 937], [590, 930, 929], [593, 934, 935], [594, 935, 934], [600, 931, 601], [600, 932, 931], [604, 627, 899], [604, 899, 605], [604, 904, 627], [605, 626, 606], [605, 899, 626], [606, 625, 607], [606, 626, 625], [607, 625, 900], [607, 900, 903], [608, 624, 609], [608, 903, 624], [609, 623, 610], [609, 624, 623], [610, 622, 611], [610, 623, 622], [611, 620, 893], [611, 621, 620], [611, 622, 897], [611, 897, 621], [612, 619, 613], [612, 893, 894], [612, 894, 619], [613, 618, 889], [613, 619, 618], [614, 618, 888], [614, 887, 615], [614, 888, 887], [614, 889, 618], [616, 887, 888], [616, 888, 617], [620, 894, 893], [624, 903, 900], [627, 901, 628], [627, 904, 901], [628, 901, 629], [629, 650, 630], [629, 901, 650], [630, 649, 895], [630, 650, 649], [631, 648, 632], [631, 649, 891], [631, 891, 648], [631, 895, 649], [632, 645, 890], [632, 646, 645], [632, 647, 646], [632, 648, 647], [633, 643, 634], [633, 644, 643], [633, 890, 644], [634, 641, 635], [634, 642, 641], [634, 643, 642], [635, 641, 892], [635, 892, 896], [636, 896, 898], [636, 898, 637], [638, 898, 639], [639, 896, 640], [639, 898, 896], [640, 896, 892], [644, 890, 886], [645, 886, 890], [651, 653, 652], [651, 656, 653], [651, 657, 656], [651, 901, 657], [653, 656, 902], [654, 656, 905], [654, 902, 656], [654, 905, 655], [657, 901, 904], [658, 690, 659], [658, 691, 690], [658, 960, 691], [658, 961, 960], [659, 690, 959], [659, 959, 958], [660, 958, 959], [660, 959, 661], [661, 959, 955], [662, 955, 663], [663, 955, 953], [664, 950, 665], [664, 953, 955], [664, 955, 950], [665, 950, 952], [666, 668, 951], [666, 950, 668], [666, 951, 667], [666, 952, 950], [668, 950, 669], [669, 674, 948], [669, 675, 674], [669, 950, 675], [670, 948, 671], [671, 948, 946], [672, 946, 947], [672, 947, 673], [674, 947, 948], [676, 950, 955], [676, 955, 956], [676, 956, 677], [677, 686, 678], [677, 687, 686], [677, 956, 687], [678, 685, 679], [678, 686, 685], [679, 684, 949], [679, 685, 684], [680, 949, 681], [681, 949, 954], [682, 954, 957], [682, 957, 683], [684, 957, 949], [688, 955, 689], [688, 956, 955], [689, 955, 959], [692, 694, 962], [692, 695, 694], [692, 960, 695], [692, 962, 693], [695, 960, 961], [696, 726, 697], [696, 727, 726], [696, 820, 727], [697, 726, 816], [697, 816, 819], [698, 704, 699], [698, 705, 704], [698, 819, 705], [699, 704, 813], [699, 813, 818], [700, 818, 701], [701, 818, 815], [702, 813, 703], [702, 815, 813], [705, 819, 812], [706, 712, 707], [706, 713, 712], [706, 812, 713], [707, 712, 808], [707, 808, 809], [708, 807, 709], [708, 809, 807], [710, 807, 711], [711, 807, 808], [713, 812, 811], [714, 724, 715], [714, 725, 724], [714, 811, 725], [715, 723, 716], [715, 724, 723], [716, 722, 717], [716, 723, 722], [717, 722, 817], [717, 817, 810], [718, 810, 719], [719, 810, 814], [720, 814, 817], [720, 817, 721], [725, 811, 816], [727, 820, 821], [728, 731, 822], [728, 821, 731], [728, 822, 729], [730, 822, 731], [731, 821, 820], [732, 733, 772], [732, 772, 773], [732, 773, 774], [732, 774, 964], [733, 771, 772], [733, 971, 771], [733, 972, 971], [734, 735, 770], [734, 770, 972], [735, 736, 768], [735, 768, 769], [735, 769, 770], [736, 767, 768], [736, 978, 767], [737, 738, 766], [737, 766, 980], [737, 980, 978], [738, 739, 975], [738, 765, 766], [738, 975, 765], [739, 746, 975], [739, 970, 746], [740, 741, 742], [740, 742, 745], [740, 745, 969], [740, 969, 970], [741, 968, 742], [742, 743, 745], [743, 744, 745], [743, 967, 744], [746, 747, 976], [746, 763, 764], [746, 764, 975], [746, 970, 969], [746, 976, 763], [747, 748, 762], [747, 762, 976], [748, 761, 762], [748, 977, 761], [749, 750, 759], [749, 759, 760], [749, 760, 979], [749, 979, 977], [750, 758, 759], [750, 973, 974], [750, 974, 758], [751, 752, 755], [751, 755, 756], [751, 756, 974], [751, 974, 973], [752, 753, 754], [752, 754, 755], [752, 966, 753], [754, 965, 755], [756, 757, 974], [761, 977, 979], [767, 978, 980], [770, 971, 972], [772, 963, 773], [776, 778, 777], [780, 782, 783], [788, 791, 793], [794, 796, 795], [797, 799, 798], [800, 806, 803], [801, 804, 805], [807, 809, 808], [810, 817, 814], [811, 812, 816], [812, 819, 816], [813, 815, 818], [823, 827, 828], [823, 828, 833], [823, 833, 826], [824, 839, 830], [825, 831, 840], [826, 833, 835], [826, 834, 829], [826, 835, 837], [826, 836, 834], [826, 837, 836], [829, 834, 832], [836, 837, 838], [842, 846, 845], [854, 869, 862], [854, 877, 869], [906, 908, 907], [909, 916, 913], [910, 912, 915], [922, 927, 928], [938, 942, 941], [946, 948, 947], [949, 957, 954], [998, 1002, 1005], [998, 1005, 1001], [1014, 1020, 1015], [1015, 1020, 1019], [1043, 1047, 1050], [1097, 1104, 1102]];

},{}],188:[function(require,module,exports){
"use strict";

exports.positions = [[-0.36325983553692365, 0.05180788455336988, 0], [-0.7168655272492744, -0.11744195420831986, 0], [-0.7168655272492744, -0.07797887778136081, 0], [-0.7168655272492744, -0.06900999677523377, 0], [-0.7168655272492744, -0.0685262818445662, 0], [-0.7168655272492744, -0.06755885198323115, 0], [-0.7168655272492744, -0.06707513705256367, 0], [-0.7168655272492744, -0.06561391486617218, 0], [-0.7168655272492744, -0.06244961302805545, 0], [-0.7168655272492744, -0.06062560464366334, 0], [-0.7168655272492744, -0.05486133505320866, 0], [-0.7168655272492744, -0.01817961947758789, 0], [-0.7168655272492744, 0.03107868429538859, 0], [-0.7168655272492744, 0.06776039987100936, 0], [-0.7189515478877782, 0.08540591744598516, 0], [-0.734007175104805, 0.10046154466301194, 0], [-0.7577696710738472, 0.10046154466301194, 0], [-0.7728252982908739, 0.08540591744598516, 0], [-0.7749113189293777, 0.0675386971944534, 0], [-0.7749113189293777, 0.02944614640438568, 0], [-0.7749113189293777, -0.021706707513705265, 0], [-0.7749113189293777, -0.05979925830377302, 0], [-0.7758082070299903, -0.07794612624959694, 0], [-0.7828019187358917, -0.09700751773621412, 0], [-0.7963257820058046, -0.10935736455981941, 0], [-0.8158960819090616, -0.11535845291841339, 0], [-0.8395137153337633, -0.11535845291841339, 0], [-0.8589857606417285, -0.10935736455981941, 0], [-0.8726229945985167, -0.09700751773621412, 0], [-0.8797603091744599, -0.07794612624959694, 0], [-0.8806836504353435, -0.05979925830377302, 0], [-0.8806836504353435, -0.021706707513705265, 0], [-0.8806836504353435, 0.02944614640438568, 0], [-0.8806836504353435, 0.0675386971944534, 0], [-0.8824371170590133, 0.08457957110609482, 0], [-0.8953764914543696, 0.09919179297000968, 0], [-0.9068143340857788, 0.10227547565301515, 0], [-0.9090112060625605, 0.10253748790712673, 0], [-0.9134553369880684, 0.10254756530151564, 0], [-0.9332070299903257, 0.10254756530151564, 0], [-0.9597307320219284, 0.10254756530151564, 0], [-0.9794824250241857, 0.10254756530151564, 0], [-0.9893885037084811, 0.10118711705901322, 0], [-0.9986395517574976, 0.09193606900999679, 0], [-0.9986395517574976, 0.0783315865849726, 0], [-0.9893885037084811, 0.06908053853595615, 0], [-0.9756328603676233, 0.06772009029345374, 0], [-0.9450378910029023, 0.06772009029345374, 0], [-0.9380844888745565, 0.06217752337955499, 0], [-0.9380844888745565, 0.026906643018381166, 0], [-0.9380844888745565, -0.020457110609480817, 0], [-0.9380844888745565, -0.055727990970654624, 0], [-0.9360967228313447, -0.0858052341986456, 0], [-0.920874818606901, -0.12420262616897774, 0], [-0.8921693606901, -0.14902576789745242, 0], [-0.8517942800709448, -0.1610606961464044, 0], [-0.8055667526604321, -0.16129877458884234, 0], [-0.7673935827152532, -0.15110045146726864, 0], [-0.7516930022573364, -0.14219203482747497, 0], [-0.7516930022573364, -0.14352225088681067, 0], [-0.750332554014834, -0.15062681393098998, 0], [-0.7410815059658175, -0.15987786198000645, 0], [-0.7315583682683006, -0.16123831022250884, 0], [-0.7195864237342793, -0.16123831022250884, 0], [-0.7100632860367624, -0.15987786198000645, 0], [-0.7008122379877458, -0.15062681393098998, 0], [-0.7008122379877458, -0.13702233150596577, 0], [-0.7100632860367624, -0.12777128345694932, 0], [0.42820612302483063, -0.11621251209287323, 0], [0.41356870767494347, -0.0964608190906159, 0], [0.39391274991938086, -0.0699371170590132, 0], [0.3792753345694937, -0.05018542405675588, 0], [0.38292083198968063, -0.04083360206385036, 0], [0.40908174782328266, -0.013342470170912607, 0], [0.4181413253789099, -0.0035673976136729917, 0], [0.42219243792325045, 0.003970493389229298, 0], [0.42056997742663627, 0.01874395356336667, 0], [0.4069856497903901, 0.031078684295388608, 0], [0.3926858271525311, 0.0321065785230571, 0], [0.38274951628506915, 0.026906643018381204, 0], [0.37121089970977095, 0.01545872299258306, 0], [0.34017252499193784, -0.01868348919703319, 0], [0.3318082876491453, -0.02788415027410507, 0], [0.32604401805869054, -0.03923129635601415, 0], [0.32685020960980316, -0.060383747178329554, 0], [0.33616172202515293, -0.07731376975169296, 0], [0.34038415027410474, -0.08293947516930017, 0], [0.3537870848113509, -0.10180939616252817, 0], [0.3717853111899383, -0.1271490043534343, 0], [0.38518824572718424, -0.1460189253466623, 0], [0.3907408900354721, -0.15334771041599476, 0], [0.4019872621734921, -0.16013987423411796, 0], [0.42005603031280203, -0.15912205740083837, 0], [0.4330961786520473, -0.14545711060948077, 0], [0.4348597226701063, -0.13029063205417601, 0], [0.43211867139632365, -0.12184577555627214, 0], [0.2850088681070624, 0.10254756530151564, 0], [0.28448484359883897, 0.10254756530151564, 0], [0.2831344727507257, 0.10264833924540472, 0], [0.28119961302805563, 0.10309174459851661, 0], [0.27589890357949054, 0.10319251854240567, 0], [0.25683247339567883, 0.10319251854240567, 0], [0.2456969525959367, 0.10183207029990325, 0], [0.2364459045469205, 0.0925810222508868, 0], [0.2364459045469205, 0.07897653982586263, 0], [0.2456969525959367, 0.06972549177684619, 0], [0.25350693324733964, 0.06836504353434376, 0], [0.25794098677845856, 0.06836504353434376, 0], [0.2589487262173493, 0.06608345846098033, 0], [0.2589487262173493, 0.04961636619235731, 0], [0.2589487262173493, 0.004083864076104492, 0], [0.2589487262173493, -0.07051404788777813, 0], [0.2589487262173493, -0.11604655000403095, 0], [0.2589487262173493, -0.13251364227265397, 0], [0.2608029667849081, -0.1459005159625927, 0], [0.27418574653337613, -0.1589205095130603, 0], [0.2953079651725252, -0.1589205095130603, 0], [0.30869074492099324, -0.1459005159625927, 0], [0.31054498548855203, -0.1324194816188326, 0], [0.31054498548855203, -0.1152727950661077, 0], [0.31054498548855203, -0.06786117381489844, 0], [0.31054498548855203, 0.009815382134795233, 0], [0.31054498548855203, 0.05722700338600453, 0], [0.31054498548855203, 0.07437368993872943, 0], [0.3091543050628829, 0.08785472428248954, 0], [0.2962149306675266, 0.10087471783295711, 0], [-0.6249596904224445, 0.10264833924540472, 0], [-0.6268945501451145, 0.10309174459851661, 0], [-0.6321952595936795, 0.10319251854240567, 0], [-0.6512616897774912, 0.10319251854240567, 0], [-0.6623972105772331, 0.10183207029990325, 0], [-0.6716482586262497, 0.0925810222508868, 0], [-0.6716482586262497, 0.07897653982586263, 0], [-0.6623972105772331, 0.06972549177684619, 0], [-0.6549903257013867, 0.06836504353434376, 0], [-0.6523298935827153, 0.06836504353434376, 0], [-0.6517252499193809, 0.06608345846098033, 0], [-0.6517252499193809, 0.04961636619235731, 0], [-0.6517252499193809, 0.004083864076104492, 0], [-0.6517252499193809, -0.07051404788777813, 0], [-0.6517252499193809, -0.11604655000403095, 0], [-0.6517252499193809, -0.13251364227265397, 0], [-0.6498710093518221, -0.1459005159625927, 0], [-0.6364882296033538, -0.1589205095130603, 0], [-0.6153660109642052, -0.1589205095130603, 0], [-0.6019832312157369, -0.1459005159625927, 0], [-0.600128990648178, -0.1324194816188326, 0], [-0.600128990648178, -0.1152727950661077, 0], [-0.600128990648178, -0.06786117381489844, 0], [-0.600128990648178, 0.009815382134795233, 0], [-0.600128990648178, 0.05722700338600453, 0], [-0.600128990648178, 0.07437368993872943, 0], [-0.6014995162850694, 0.08749193808448888, 0], [-0.6139148661722025, 0.10051193163495646, 0], [-0.39832916801031926, 0.016839326023863285, 0], [-0.39069932078361824, 0.028301102466946153, 0], [-0.3805992522573364, 0.032339618268300556, 0], [-0.36690155393421486, 0.032339618268300556, 0], [-0.356801485407933, 0.028301102466946153, 0], [-0.349171638181232, 0.016839326023863285, 0], [-0.3479522734601742, 0.0009699492099322759, 0], [-0.3479522734601742, -0.038004373589164774, 0], [-0.3479522734601742, -0.09034132134795231, 0], [-0.3479522734601742, -0.12931564414704935, 0], [-0.349171638181232, -0.1451850209609803, 0], [-0.356801485407933, -0.1566467974040632, 0], [-0.36690155393421486, -0.16068531320541757, 0], [-0.3805992522573364, -0.16068531320541757, 0], [-0.39069932078361824, -0.1566467974040632, 0], [-0.39832916801031926, -0.1451850209609803, 0], [-0.399548532731377, -0.12931564414704935, 0], [-0.399548532731377, -0.09034132134795231, 0], [-0.399548532731377, -0.038004373589164774, 0], [-0.399548532731377, 0.0009699492099322759, 0], [-0.015889531602708895, -0.12008475088681068, 0], [-0.028763402934537385, -0.08393209851660756, 0], [-0.04605117300870687, -0.03538425104804902, 0], [-0.05892504434053536, 0.0007684013221541495, 0], [-0.06627902289584009, 0.01606336665591746, 0], [-0.08371291518864887, 0.028035311189938725, 0], [-0.10515761044824246, 0.028045388584327646, 0], [-0.12214809738793964, 0.01633545630441795, 0], [-0.12873619396968705, 0.0038797968397291218, 0], [-0.13737755965817466, -0.01657731376975168, 0], [-0.1489816792970009, -0.04404829087391162, 0], [-0.15762304498548851, -0.06450540148339248, 0], [-0.16033890277329899, -0.06450540148339248, 0], [-0.1689802684617866, -0.04404829087391162, 0], [-0.18058438810061272, -0.01657731376975168, 0], [-0.18922575378910034, 0.0038797968397291218, 0], [-0.19581385037084809, 0.01633545630441795, 0], [-0.21280433731054504, 0.028045388584327646, 0], [-0.22385923895517568, 0.029667849080941635, 0], [-0.22438326346339887, 0.029667849080941635, 0], [-0.2257336343115125, 0.029768623024830698, 0], [-0.22766849403418254, 0.030212028377942624, 0], [-0.23659706546275394, 0.030312802321831686, 0], [-0.27162608835859403, 0.030312802321831686, 0], [-0.28638947113834246, 0.028952354079329272, 0], [-0.295640519187359, 0.019701306030312817, 0], [-0.295640519187359, 0.006096823605288638, 0], [-0.28638947113834246, -0.003154224443727798, 0], [-0.27656401160915833, -0.004514672686230232, 0], [-0.26326185101580135, -0.004514672686230232, 0], [-0.26209539261528547, -0.009696972750725568, 0], [-0.2739111375362787, -0.04267524588842302, 0], [-0.2897779950016125, -0.08696035553047397, 0], [-0.30159373992260574, -0.11993862866817147, 0], [-0.30484118026443086, -0.13524871009351813, 0], [-0.2967389551757499, -0.15260198323121568, 0], [-0.28593598839084156, -0.15875927120283775, 0], [-0.2816228635923895, -0.1592832957110609, 0], [-0.27204933892292815, -0.15813447275072554, 0], [-0.25963398903579504, -0.1495082231538213, 0], [-0.25428289261528547, -0.13848859238955175, 0], [-0.2451124637213803, -0.11274084972589486, 0], [-0.23279788777813615, -0.07816530957755558, 0], [-0.22362745888423097, -0.0524175669138987, 0], [-0.22046819574330856, -0.05244527974846822, 0], [-0.2095342228313447, -0.07836937681393097, 0], [-0.19485145920670743, -0.11318173573040943, 0], [-0.18391748629474358, -0.1391058327958722, 0], [-0.18171557562076757, -0.1441470493389229, 0], [-0.18074814575943243, -0.14608190906159296, 0], [-0.1801636568848759, -0.1471501128668171, 0], [-0.17972025153176396, -0.147593518219929, 0], [-0.17913576265720743, -0.14827878103837466, 0], [-0.1781683327958723, -0.14968961625282162, 0], [-0.17730167687842646, -0.15065704611415665, 0], [-0.17677765237020326, -0.1511810706223798, 0], [-0.17581022250886813, -0.15204772653982582, 0], [-0.17439938729442117, -0.15301515640116087, 0], [-0.17371412447597556, -0.1535996452757174, 0], [-0.17327071912286374, -0.15404305062882936, 0], [-0.17220251531763975, -0.15462753950338595, 0], [-0.1702676555949696, -0.155594969364721, 0], [-0.1692901483392455, -0.15607868429538851, 0], [-0.1690281360851339, -0.15607868429538851, 0], [-0.16865527249274448, -0.15607868429538851, 0], [-0.1685544985488554, -0.15607868429538851, 0], [-0.16811109319574358, -0.15607868429538851, 0], [-0.16714366333440867, -0.15646162528216698, 0], [-0.1656522089648501, -0.15698564979039012, 0], [-0.1644026120606259, -0.15736859077716855, 0], [-0.1638785875524027, -0.15736859077716855, 0], [-0.16251813930990044, -0.15746936472105766, 0], [-0.1603212673331188, -0.15791277007416957, 0], [-0.15791277007416993, -0.15800346662366974, 0], [-0.15553450499838817, -0.1577414543695582, 0], [-0.15408336020638558, -0.15736859077716855, 0], [-0.15355933569816238, -0.15736859077716855, 0], [-0.15230973879393817, -0.15725773943889057, 0], [-0.1508182844243796, -0.1565523218316671, 0], [-0.1498508545630447, -0.15607868429538851, 0], [-0.14940744920993287, -0.15607868429538851, 0], [-0.1493066752660438, -0.15607868429538851, 0], [-0.14929659787165483, -0.15607868429538851, 0], [-0.14903458561754324, -0.15607868429538851, 0], [-0.14769429216381869, -0.15559496936472095, 0], [-0.14575943244114853, -0.1546275395033859, 0], [-0.14469122863592454, -0.15404305062882936, 0], [-0.14424782328281271, -0.1535996452757174, 0], [-0.14356256046436688, -0.1530151564011608, 0], [-0.14215172524991992, -0.15204772653982576, 0], [-0.141184295388585, -0.1511810706223798, 0], [-0.14066027088036182, -0.15065704611415665, 0], [-0.13979361496291598, -0.14968961625282162, 0], [-0.13882618510158085, -0.14827878103837466, 0], [-0.1382416962270242, -0.147593518219929, 0], [-0.13779829087391238, -0.1471501128668171, 0], [-0.13721380199935584, -0.14608190906159296, 0], [-0.1362463721380207, -0.1441470493389229, 0], [-0.13404446146404458, -0.1391058327958722, 0], [-0.12311048855208062, -0.11318173573040943, 0], [-0.10842772492744335, -0.07836937681393089, 0], [-0.0974937520154795, -0.052445279748468146, 0], [-0.09433448887455731, -0.05241756691389863, 0], [-0.08516405998065213, -0.0781653095775555, 0], [-0.07284948403740799, -0.11274084972589475, 0], [-0.0636790551435028, -0.13848859238955166, 0], [-0.058327958722993456, -0.14950822315382128, 0], [-0.045912608835860125, -0.15813447275072548, 0], [-0.03633908416639875, -0.15919259916156064, 0], [-0.03202595936794661, -0.1584871815543372, 0], [-0.02085012899064853, -0.15288415027410504, 0], [-0.012485891647855518, -0.1356114962915188, 0], [0.5559496936472104, -0.07362544340535308, 0], [0.5578845533698806, -0.07406884875846499, 0], [0.5618172565301514, -0.07416962270235407, 0], [0.5806871775233793, -0.07416962270235407, 0], [0.6060267857142856, -0.07416962270235407, 0], [0.6248967067075135, -0.07416962270235407, 0], [0.6288294098677842, -0.07415954530796516, 0], [0.6307642695904543, -0.07389753305385362, 0], [0.6323363431151239, -0.07352466946146403, 0], [0.6349967752337953, -0.07352466946146403, 0], [0.6464749274427599, -0.07253708481135118, 0], [0.6570965011286678, -0.06209690422444372, 0], [0.656590112060625, -0.035099564656562394, 0], [0.6442301878426311, -0.0055123347307319956, 0], [0.6203215696549498, 0.01802845856175429, 0], [0.5857107586262491, 0.03165309577555628, 0], [0.5428805727990966, 0.031674510238632714, 0], [0.5069168715736854, 0.01751829047081587, 0], [0.4819274528377939, -0.008881963479522718, 0], [0.4689402108190903, -0.04553092752337954, 0], [0.4685736455981937, -0.08405554659787164, 0], [0.4796487020316025, -0.11650475653015153, 0], [0.5034212753950333, -0.1429075298290874, 0], [0.5415843679458234, -0.15842671718800383, 0], [0.5754595291841338, -0.15938406965494997, 0], [0.6144792002579811, -0.15406320541760715, 0], [0.632215414382457, -0.15010278942276684, 0], [0.6443889068042565, -0.13734480812641078, 0], [0.6432098516607547, -0.12082795872299258, 0], [0.6323061109319574, -0.11191954208319896, 0], [0.6144792002579811, -0.11288697194453398, 0], [0.5754595291841338, -0.11865124153498866, 0], [0.5558375826346338, -0.11904929861335047, 0], [0.5381693909222831, -0.11220674782328278, 0], [0.5259732243631083, -0.09968054659787162, 0], [0.5196723335214444, -0.08267998226378584, 0], [0.5184214769429214, -0.06179458239277651, 0], [0.5266748629474358, -0.02438225572395999, 0], [0.5410049177684615, -0.00848201688971299, 0], [0.5562772089648498, -0.002731603716543034, 0], [0.5741519872621732, -0.002700741696226987, 0], [0.5886886286681712, -0.008465011286681704, 0], [0.6000206586584971, -0.01906643018381167, 0], [0.6073015761044822, -0.0335375685262818, 0], [0.601297968397291, -0.04192196065785227, 0], [0.5667123508545626, -0.04192196065785227, 0], [0.5528962431473714, -0.04316148016768781, 0], [0.5446126249596899, -0.05144509835536923, 0], [0.5439172847468556, -0.06327595936794583, 0], [0.5500846501128667, -0.07164019671073846, 0], [0.20025798129635586, -0.10270376491454365, 0], [0.20025798129635586, -0.0790722750725572, 0], [0.20025798129635586, -0.0473385601418897, 0], [0.20025798129635586, -0.023707070299903245, 0], [0.1985171114156723, -0.007304851257658801, 0], [0.18481689374395338, 0.011874949613028062, 0], [0.15799590857787815, 0.023647865607868447, 0], [0.11865879958078018, 0.0290417909545308, 0], [0.08743147371815518, 0.028559335698161888, 0], [0.0563930990003223, 0.023681876813930983, 0], [0.04148863269912928, 0.02034625927120285, 0], [0.030383344082554054, 0.010329329248629471, 0], [0.030020557884553156, -0.005341019026120619, 0], [0.040400274105127254, -0.01602305707836182, 0], [0.05699774266365676, -0.015559496936472106, 0], [0.09069654950016104, -0.010238632699129295, 0], [0.10107626572073514, -0.009029345372460501, 0], [0.11304821025475631, -0.009029345372460501, 0], [0.12815422444372748, -0.009563447275072549, 0], [0.14240491978394032, -0.013973566994517878, 0], [0.14734536238310203, -0.020818637133182858, 0], [0.14801676878426284, -0.035673976136730096, 0], [0.14801676878426284, -0.07912770074169621, 0], [0.14721309658174753, -0.09616605530474037, 0], [0.14101046033537545, -0.10934224846823602, 0], [0.12918463801999303, -0.11967661641405995, 0], [0.11234027329893559, -0.12559708561754268, 0], [0.09044461464043829, -0.12471783295711054, 0], [0.07583239277652343, -0.11335053208642369, 0], [0.07438754635601397, -0.09973471259271204, 0], [0.07864272613672973, -0.09121679498548858, 0], [0.09262133182844234, -0.08308811673653659, 0], [0.10899709771041555, -0.07922847468558525, 0], [0.11762334730731983, -0.07072315382134793, 0], [0.11559527168655248, -0.05627217026765554, 0], [0.10865698564979032, -0.050386971944534, 0], [0.09756933247339528, -0.04821025475653016, 0], [0.08008631288294077, -0.05047137012254106, 0], [0.054341089567881085, -0.057905967832957136, 0], [0.03473299943566577, -0.0714172343598839, 0], [0.023741081505965544, -0.09312142252499193, 0], [0.023554649709770725, -0.11923824975814257, 0], [0.032964416720412615, -0.1386120404708159, 0], [0.04917642494356622, -0.1523626451144792, 0], [0.06946977789422748, -0.15964356256046439, 0], [0.09990728797162163, -0.1590313608513383, 0], [0.13525878748790698, -0.14454006772009032, 0], [0.15316631731699437, -0.14181917123508547, 0], [0.1624967248468232, -0.15525359762979685, 0], [0.17398243510157996, -0.15995218276362463, 0], [0.19035190261206036, -0.15910190261206061, 0], [0.20286802644308244, -0.14862141244759755, 0], [0.20433932602386307, -0.1350773943889068, 0], [0.2010540954530795, -0.11992099322799095, 0], [0.8089729119638824, 0.033537568526281855, 0], [0.7885762657207349, 0.033537568526281855, 0], [0.775667123508545, 0.032156965495001646, 0], [0.7629897613673005, 0.02238189293776205, 0], [0.7562379071267331, 0.022452434698484378, 0], [0.7435605449854881, 0.031159303450499862, 0], [0.7345412770074164, 0.03224766204450179, 0], [0.734017252499193, 0.03224766204450179, 0], [0.73266688165108, 0.032348435988390864, 0], [0.7307320219284099, 0.03279184134150277, 0], [0.7255320864237338, 0.032892615285391835, 0], [0.7069090615930345, 0.032892615285391835, 0], [0.6958743147371815, 0.03153216704288942, 0], [0.6866232666881651, 0.022281118993872986, 0], [0.6866232666881651, 0.008676636568848789, 0], [0.6958743147371815, -0.0005744114801676294, 0], [0.7036842953885842, -0.0019348597226700635, 0], [0.7081183489197032, -0.0019348597226700635, 0], [0.7091260883585939, -0.0076714164785552565, 0], [0.7091260883585939, -0.04417677765237016, 0], [0.7091260883585939, -0.09319826265720728, 0], [0.7091260883585939, -0.12970362383102219, 0], [0.7109803289261529, -0.14654546920348271, 0], [0.724363108674621, -0.15956546275395028, 0], [0.7454853273137696, -0.15956546275395028, 0], [0.7588681070622376, -0.14654546920348271, 0], [0.7607223476297966, -0.1309507013866494, 0], [0.7607223476297966, -0.10238128829409861, 0], [0.7607223476297966, -0.06401664785553046, 0], [0.7607223476297966, -0.035447234762979674, 0], [0.7649548532731376, -0.0277329893582715, 0], [0.7835778781038372, -0.013544018058690733, 0], [0.7917405675588518, -0.010319251854240567, 0], [0.8090333763302158, -0.010319251854240567, 0], [0.8229804901644624, -0.009392131570461135, 0], [0.8367260561109315, -0.0005240245082231429, 0], [0.8368268300548214, 0.018300548210254765, 0], [0.8235246694614635, 0.03160270880361177, 0], [-0.47033215091905844, 0.028377942599161567, 0], [-0.48097387939374403, 0.028377942599161567, 0], [-0.48339245404708164, 0.0333158658497259, 0], [-0.48339245404708164, 0.055042728152208995, 0], [-0.48524669461464043, 0.0710859400193486, 0], [-0.4986294743631088, 0.08410593356981619, 0], [-0.5197516930022574, 0.08410593356981619, 0], [-0.5331344727507257, 0.0710859400193486, 0], [-0.5349887133182845, 0.055042728152208995, 0], [-0.5349887133182845, 0.0333158658497259, 0], [-0.5350894872621735, 0.028377942599161567, 0], [-0.5355328926152854, 0.028377942599161567, 0], [-0.5424359077716866, 0.027017494356659153, 0], [-0.551686955820703, 0.017766446307642715, 0], [-0.551686955820703, 0.00416196388261852, 0], [-0.5424359077716866, -0.005089084166397898, 0], [-0.5355328926152854, -0.006449532408900332, 0], [-0.5350894872621735, -0.006449532408900332, 0], [-0.5349887133182845, -0.012019812157368564, 0], [-0.5349887133182845, -0.047467046920348234, 0], [-0.5349887133182845, -0.09506761931634956, 0], [-0.5349887133182845, -0.13051485407932925, 0], [-0.5331344727507257, -0.1471904224443727, 0], [-0.5197516930022574, -0.16021041599484032, 0], [-0.4986294743631088, -0.16021041599484032, 0], [-0.48524669461464043, -0.1471904224443727, 0], [-0.48339245404708164, -0.13048714124475969, 0], [-0.48339245404708164, -0.09486355207997414, 0], [-0.48339245404708164, -0.04702616091583356, 0], [-0.48339245404708164, -0.011402571751048056, 0], [-0.48097387939374403, -0.005804579168010299, 0], [-0.47033215091905844, -0.005804579168010299, 0], [-0.4577555627217027, -0.00490769106739758, 0], [-0.4461464043856821, 0.0031743792325056434, 0], [-0.4461464043856821, 0.019126894550145133, 0], [-0.4577555627217027, 0.027470977104159962, 0], [0.9323706062560466, 0.05225128990648179, 0], [0.9469022089648496, 0.047837391164140625, 0], [0.9630134432441146, 0.04768371089970979, 0], [0.9741136931634953, 0.05191117784585619, 0], [0.9825257981296354, 0.06286278619800066, 0], [0.9831518562560462, 0.07702530433731056, 0], [0.9779242079168007, 0.08655600008061916, 0], [0.9634694453402124, 0.094616655917446, 0], [0.950116897774911, 0.0960980328926153, 0], [0.9434658174782324, 0.0960980328926153, 0], [0.9419542083198964, 0.09811351177039666, 0], [0.9419542083198964, 0.10698161883263466, 0], [0.9434658174782324, 0.108997097710416, 0], [0.950116897774911, 0.108997097710416, 0], [0.961131489841986, 0.11023661722025155, 0], [0.9738176697033212, 0.11702752136407611, 0], [0.978672454450177, 0.12510707231538215, 0], [0.9781118993872939, 0.1372843437600774, 0], [0.9673895517574973, 0.14742220251531765, 0], [0.9502378265075779, 0.14821831667204127, 0], [0.9372984521122218, 0.1435424056755885, 0], [0.9315744920993227, 0.14251451144792004, 0], [0.9284706546275396, 0.15093921315704611, 0], [0.9337108997097712, 0.15627015478877782, 0], [0.9504393743953563, 0.16165148339245405, 0], [0.9600128990648178, 0.16252821670428894, 0], [0.9685736455981944, 0.1618618490003225, 0], [0.9820068123186074, 0.1570524125282167, 0], [0.9933892292808773, 0.14375403095775557, 0], [0.9940341825217671, 0.12360931957433087, 0], [0.9824250241857464, 0.10873508545630442, 0], [0.9722670106417284, 0.10373669783940666, 0], [0.9722670106417284, 0.10329329248629475, 0], [0.9831304417929698, 0.09924217994195422, 0], [0.9978434376007739, 0.08287649145436957, 0], [0.999276946952596, 0.06359717631409224, 0], [0.9935378708481135, 0.05032272855530476, 0], [0.9821756086746212, 0.040101731296356025, 0], [0.9653110891647858, 0.034324864962915196, 0], [0.9446448726217347, 0.034303450499838774, 0], [0.92809779103515, 0.03897936149629153, 0], [0.9234118026443083, 0.04393743953563369, 0], [0.9269590454692032, 0.052805546597871664, 0], [-1, 0.08513382779748468, 0], [-0.982586262495969, 0.06772009029345374, 0], [-0.982586262495969, 0.10254756530151564, 0], [-0.9380844888745565, -0.06127055788455337, 0], [-0.9380844888745565, 0.06772009029345374, 0], [-0.9103514995162851, 0.10254756530151564, 0], [-0.9058368268300548, 0.1019026120606256, 0], [-0.8806836504353435, 0.07352466946146405, 0], [-0.8806836504353435, -0.06578523057078364, 0], [-0.8277974846823606, -0.11609158336020638, 0], [-0.8277974846823606, -0.16252821670428894, 0], [-0.7749113189293777, -0.06578523057078364, 0], [-0.7749113189293777, 0.07352466946146405, 0], [-0.7516930022573364, -0.14382457271847787, 0], [-0.7516930022573364, -0.1418897129958078, 0], [-0.7458884230893261, 0.10254756530151564, 0], [-0.7342792647533054, -0.16123831022250884, 0], [-0.7168655272492744, 0.07352466946146405, 0], [-0.7168655272492744, -0.1264108352144469, 0], [-0.7168655272492744, -0.16123831022250884, 0], [-0.6994517897452435, -0.14382457271847787, 0], [-0.673008706868752, 0.0857787810383747, 0], [-0.6555949693647212, 0.06836504353434376, 0], [-0.6555949693647212, 0.10319251854240567, 0], [-0.6517252499193809, -0.1347952273460174, 0], [-0.6517252499193809, 0.06836504353434376, 0], [-0.6278619800064495, 0.10319251854240567, 0], [-0.6259271202837795, -0.1605933569816188, 0], [-0.6239922605611093, 0.10254756530151564, 0], [-0.600128990648178, 0.07674943566591422, 0], [-0.600128990648178, -0.1347952273460174, 0], [-0.5530474040632054, 0.010964205095130618, 0], [-0.5356336665591745, -0.006449532408900332, 0], [-0.5356336665591745, 0.028377942599161567, 0], [-0.5349887133182845, -0.13608513382779744, 0], [-0.5349887133182845, -0.006449532408900332, 0], [-0.5349887133182845, 0.028377942599161567, 0], [-0.5349887133182845, 0.059980651402773304, 0], [-0.5091905836826831, -0.16188326346339885, 0], [-0.5091905836826831, 0.08577878103837472, 0], [-0.48339245404708164, -0.005804579168010299, 0], [-0.48339245404708164, -0.13608513382779744, 0], [-0.48339245404708164, 0.059980651402773304, 0], [-0.48339245404708164, 0.028377942599161567, 0], [-0.4679135762657207, 0.028377942599161567, 0], [-0.4679135762657207, -0.005804579168010299, 0], [-0.4446952595936795, 0.010964205095130618, 0], [-0.4008384392131571, 0.07674943566591422, 0], [-0.399548532731377, -0.13544018058690743, 0], [-0.399548532731377, 0.007094485649790401, 0], [-0.39869195420831993, 0.06625886810706226, 0], [-0.39869195420831993, 0.08751209287326668, 0], [-0.3842409706546277, 0.10178168332795873, 0], [-0.3842409706546277, 0.05180788455336988, 0], [-0.3737504030957757, -0.16123831022250884, 0], [-0.3737504030957757, 0.03289261528539182, 0], [-0.3737504030957757, 0.049661399548532735, 0], [-0.3737504030957757, 0.10383747178329572, 0], [-0.36325983553692365, 0.10169098677845857, 0], [-0.3488088519832313, 0.06625886810706225, 0], [-0.3488088519832313, 0.08724000322476622, 0], [-0.34666236697839414, 0.07674943566591422, 0], [-0.3479522734601742, -0.13544018058690743, 0], [-0.3479522734601742, 0.007094485649790401, 0], [-0.3034504998387617, -0.1251209287326668, 0], [-0.2970009674298614, 0.012899064817800737, 0], [-0.2879716220574009, -0.15801354401805864, 0], [-0.2795872299258304, -0.1593034504998387, 0], [-0.2795872299258304, -0.004514672686230232, 0], [-0.2795872299258304, 0.030312802321831686, 0], [-0.2602386326991294, -0.004514672686230232, 0], [-0.2557239600128991, -0.1425346662366978, 0], [-0.22863592389551757, 0.030312802321831686, 0], [-0.22476620445017736, 0.029667849080941635, 0], [-0.2234762979683973, 0.029667849080941635, 0], [-0.22218639148661723, -0.0483714930667526, 0], [-0.19058368268300552, 0.007094485649790401, 0], [-0.18219929055143502, -0.1431796194775878, 0], [-0.18026443082876487, -0.147049338922928, 0], [-0.1796194775878749, -0.14769429216381808, 0], [-0.17768461786520484, -0.1502741051273782, 0], [-0.17639471138342477, -0.15156401160915828, 0], [-0.17381489841986464, -0.15349887133182838, 0], [-0.17316994517897466, -0.1541438245727184, 0], [-0.16930022573363446, -0.15607868429538851, 0], [-0.1680103192518545, -0.15607868429538851, 0], [-0.16478555304740428, -0.15736859077716855, 0], [-0.16349564656562432, -0.15736859077716855, 0], [-0.15898097387939414, -0.15801354401805864, 0], [-0.1589809738793938, -0.0677200902934537, 0], [-0.15446630119316396, -0.15736859077716855, 0], [-0.153176394711384, -0.15736859077716855, 0], [-0.14995162850693378, -0.15607868429538851, 0], [-0.14866172202515382, -0.15607868429538851, 0], [-0.14479200257981362, -0.1541438245727184, 0], [-0.14414704933892364, -0.15349887133182838, 0], [-0.1415672363753634, -0.15156401160915828, 0], [-0.14027732989358344, -0.1502741051273782, 0], [-0.13834247017091328, -0.14769429216381808, 0], [-0.1376975169300233, -0.147049338922928, 0], [-0.13576265720735303, -0.1431796194775878, 0], [-0.12737826507578198, 0.007094485649790401, 0], [-0.09577555627217094, -0.04837149306675256, 0], [-0.0944856497903902, 0.029667849080941635, 0], [-0.06223798774588918, -0.14253466623669772, 0], [-0.060948081264108445, 0.00644953240890035, 0], [-0.03837471783295798, -0.15930345049983866, 0], [-0.029990325701387377, -0.1580135440180586, 0], [-0.01386649467913581, -0.1257658819735569, 0], [0.02225088681070586, -0.10770719122863594, 0], [0.028700419219606532, 0.0019348597226701177, 0], [0.049338922928087614, -0.0167687842631409, 0], [0.049338922928087614, 0.022573363431151235, 0], [0.07384714608190879, -0.10512737826507577, 0], [0.08029667849080924, -0.16059335698161883, 0], [0.09448564979038987, -0.04837149306675267, 0], [0.09448564979039009, 0.029667849080941635, 0], [0.09835536923573018, -0.009029345372460501, 0], [0.1022250886810705, -0.1264108352144469, 0], [0.10673976136730068, -0.07997420187036437, 0], [0.11576910673976104, -0.009029345372460501, 0], [0.11770396646243109, -0.06127055788455337, 0], [0.14801676878426284, -0.08900354724282487, 0], [0.14801676878426284, -0.0257981296356014, 0], [0.15124153498871307, -0.13028055465978716, 0], [0.1815543373105446, -0.16059335698161883, 0], [0.20025798129635586, -0.0199935504675911, 0], [0.20025798129635586, -0.10641728474685584, 0], [0.20477265398258582, -0.14059980651402773, 0], [0.23508545630441802, 0.0857787810383747, 0], [0.2524991938084489, 0.06836504353434376, 0], [0.2524991938084489, 0.10319251854240567, 0], [0.2589487262173493, -0.1347952273460174, 0], [0.2589487262173493, 0.06836504353434376, 0], [0.2802321831667205, 0.10319251854240567, 0], [0.2841019026120606, 0.10254756530151564, 0], [0.2847468558529507, -0.1605933569816188, 0], [0.28539180909384076, 0.10254756530151564, 0], [0.31054498548855203, 0.07674943566591422, 0], [0.31054498548855203, -0.1347952273460174, 0], [0.32473395678813266, -0.049016446307642667, 0], [0.33311834891970316, -0.026443082876491435, 0], [0.3382779748468234, -0.07997420187036433, 0], [0.3769751693002257, -0.047081586584972565, 0], [0.37826507578200563, 0.023218316672041304, 0], [0.387294421154466, -0.14898419864559814, 0], [0.3982586262495966, 0.032892615285391835, 0], [0.4105127378265072, -0.1612383102225088, 0], [0.41502741051273784, -0.007094485649790365, 0], [0.422766849403418, 0.009674298613350552, 0], [0.43050628829409865, -0.11931634956465653, 0], [0.4350209609803286, -0.13608513382779744, 0], [0.4672686230248304, -0.06707513705256367, 0], [0.5188648822960333, -0.07287971622057397, 0], [0.5433731054498545, -0.057400838439213134, 0], [0.5549822637858755, -0.07352466946146403, 0], [0.5588519832312153, -0.04192196065785227, 0], [0.5588519832312155, -0.07416962270235407, 0], [0.5646565623992257, 0.033537568526281855, 0], [0.5659464688810059, -0.0019348597226700995, 0], [0.566591422121896, -0.11996130280554654, 0], [0.566591422121896, -0.1605933569816188, 0], [0.6091583360206383, -0.04192196065785227, 0], [0.6233473073202191, -0.1115769106739761, 0], [0.6233473073202191, -0.15285391809093837, 0], [0.6278619800064493, -0.07416962270235407, 0], [0.6317316994517894, -0.07352466946146403, 0], [0.6356014188971295, -0.07352466946146403, 0], [0.6452757175104804, -0.127700741696227, 0], [0.6581747823282809, -0.0509513060303128, 0], [0.6852628184456626, 0.015478877781360886, 0], [0.7026765559496935, -0.0019348597226700635, 0], [0.7026765559496935, 0.032892615285391835, 0], [0.7091260883585939, -0.1354401805869074, 0], [0.7091260883585939, -0.0019348597226700635, 0], [0.7297645920670746, 0.032892615285391835, 0], [0.7336343115124149, 0.03224766204450179, 0], [0.7349242179941948, 0.03224766204450179, 0], [0.7349242179941953, -0.1612383102225088, 0], [0.7594324411480164, 0.014833924540470835, 0], [0.7607223476297966, -0.030957755562721664, 0], [0.7607223476297966, -0.1354401805869074, 0], [0.7839406643018378, 0.033537568526281855, 0], [0.7878103837471782, -0.010319251854240567, 0], [0.8129635601418894, -0.010319251854240567, 0], [0.8136085133827795, 0.033537568526281855, 0], [0.8387616897774908, 0.008384392131570467, 0], [0.9226056110931957, 0.04192196065785232, 0], [0.9277652370203158, 0.05482102547565304, 0], [0.9277652370203162, 0.1528539180909384, 0], [0.9322799097065462, 0.14059980651402773, 0], [0.9419542083198964, 0.108997097710416, 0], [0.9419542083198964, 0.0960980328926153, 0], [0.9516285069332471, 0.108997097710416, 0], [0.9516285069332471, 0.0960980328926153, 0], [0.9548532731376975, 0.033537568526281855, 0], [0.9554982263785874, 0.04708158658497261, 0], [0.9574330861012574, 0.1489841986455982, 0], [0.9600128990648178, 0.1560786842953886, 0], [0.9722670106417284, 0.10319251854240569, 0], [0.9722670106417284, 0.10383747178329572, 0], [0.9793614962915185, 0.13028055465978716, 0], [0.9838761689777487, 0.07094485649790393, 0], [0.9954853273137698, 0.1328603676233473, 0], [1, 0.07094485649790393, 0]];
exports.cells = [[0, 557, 566], [0, 560, 557], [0, 563, 560], [1, 22, 2], [1, 23, 22], [1, 521, 23], [1, 525, 521], [2, 22, 518], [2, 518, 3], [3, 518, 4], [4, 518, 5], [5, 518, 6], [6, 518, 7], [7, 518, 8], [8, 21, 9], [8, 518, 21], [9, 21, 10], [10, 20, 11], [10, 21, 20], [11, 19, 12], [11, 20, 19], [12, 18, 13], [12, 19, 18], [13, 18, 519], [13, 519, 524], [14, 522, 15], [14, 524, 522], [16, 522, 17], [17, 522, 519], [23, 521, 24], [24, 56, 25], [24, 57, 56], [24, 521, 57], [25, 56, 517], [25, 517, 516], [26, 55, 27], [26, 516, 517], [26, 517, 55], [27, 54, 28], [27, 55, 54], [28, 53, 29], [28, 54, 53], [29, 52, 515], [29, 53, 52], [30, 51, 31], [30, 510, 51], [30, 515, 510], [31, 49, 32], [31, 50, 49], [31, 51, 50], [32, 48, 33], [32, 49, 48], [33, 48, 511], [33, 511, 514], [34, 513, 35], [34, 514, 513], [36, 513, 37], [37, 513, 512], [38, 511, 39], [38, 512, 513], [38, 513, 511], [39, 47, 40], [39, 511, 47], [40, 46, 41], [40, 47, 46], [41, 46, 508], [41, 508, 509], [42, 507, 43], [42, 509, 507], [44, 507, 45], [45, 507, 508], [52, 510, 515], [58, 62, 523], [58, 521, 62], [58, 523, 59], [59, 523, 520], [60, 520, 61], [61, 520, 523], [62, 521, 525], [62, 525, 63], [63, 525, 526], [64, 526, 527], [64, 527, 65], [66, 527, 67], [67, 527, 525], [68, 89, 69], [68, 652, 89], [68, 657, 652], [69, 87, 70], [69, 88, 87], [69, 89, 88], [70, 86, 71], [70, 87, 86], [71, 86, 649], [71, 649, 650], [72, 80, 73], [72, 81, 80], [72, 650, 81], [73, 80, 651], [73, 651, 655], [74, 76, 656], [74, 77, 76], [74, 655, 77], [74, 656, 75], [77, 78, 653], [77, 79, 78], [77, 655, 79], [79, 655, 651], [81, 650, 648], [82, 648, 650], [82, 650, 83], [83, 650, 647], [84, 647, 650], [84, 650, 85], [85, 650, 649], [90, 652, 658], [90, 658, 91], [91, 658, 654], [92, 654, 93], [93, 654, 658], [94, 657, 95], [94, 658, 657], [96, 644, 645], [96, 645, 97], [97, 645, 642], [98, 100, 641], [98, 640, 100], [98, 641, 99], [98, 642, 640], [100, 640, 101], [101, 106, 638], [101, 107, 106], [101, 640, 107], [102, 638, 103], [103, 638, 636], [104, 636, 637], [104, 637, 105], [106, 637, 638], [108, 122, 109], [108, 123, 122], [108, 640, 123], [109, 121, 110], [109, 122, 121], [110, 120, 111], [110, 121, 120], [111, 119, 112], [111, 120, 119], [112, 118, 113], [112, 119, 118], [113, 118, 646], [113, 646, 639], [114, 639, 115], [115, 639, 643], [116, 643, 646], [116, 646, 117], [123, 640, 645], [124, 645, 125], [125, 645, 644], [126, 128, 533], [126, 532, 128], [126, 533, 127], [126, 535, 532], [128, 532, 129], [129, 135, 530], [129, 532, 135], [130, 528, 131], [130, 530, 528], [132, 528, 133], [133, 528, 529], [134, 529, 530], [134, 530, 135], [136, 150, 137], [136, 151, 150], [136, 532, 151], [137, 149, 138], [137, 150, 149], [138, 148, 139], [138, 149, 148], [139, 147, 140], [139, 148, 147], [140, 146, 141], [140, 147, 146], [141, 146, 537], [141, 537, 531], [142, 531, 143], [143, 531, 534], [144, 534, 537], [144, 537, 145], [151, 532, 536], [152, 536, 153], [153, 536, 535], [154, 155, 156], [154, 156, 556], [156, 562, 556], [157, 158, 159], [157, 159, 570], [157, 570, 562], [160, 161, 173], [160, 173, 556], [160, 556, 570], [161, 162, 171], [161, 171, 172], [161, 172, 173], [162, 163, 170], [162, 170, 171], [163, 555, 170], [163, 569, 555], [164, 165, 166], [164, 166, 569], [166, 561, 569], [167, 168, 169], [167, 169, 555], [167, 555, 561], [174, 278, 175], [174, 279, 278], [174, 615, 279], [175, 277, 176], [175, 278, 277], [176, 276, 609], [176, 277, 276], [176, 609, 177], [177, 182, 608], [177, 608, 612], [177, 609, 182], [178, 612, 179], [179, 608, 610], [179, 612, 608], [180, 608, 181], [180, 610, 608], [182, 609, 183], [183, 609, 184], [184, 274, 185], [184, 275, 274], [184, 609, 275], [185, 274, 596], [186, 219, 187], [186, 596, 219], [187, 218, 582], [187, 219, 218], [187, 582, 188], [188, 582, 189], [189, 577, 583], [189, 582, 577], [190, 583, 191], [191, 583, 581], [192, 577, 193], [192, 581, 583], [192, 583, 577], [193, 577, 580], [194, 577, 579], [194, 579, 195], [194, 580, 577], [196, 577, 197], [196, 579, 577], [197, 202, 576], [197, 203, 202], [197, 577, 203], [198, 572, 199], [198, 576, 572], [200, 572, 201], [201, 572, 575], [202, 575, 576], [204, 577, 582], [204, 582, 205], [205, 216, 206], [205, 217, 216], [205, 582, 217], [206, 215, 207], [206, 216, 215], [207, 214, 571], [207, 215, 214], [208, 212, 209], [208, 213, 212], [208, 571, 578], [208, 578, 213], [209, 212, 574], [209, 574, 573], [210, 573, 211], [211, 573, 574], [214, 578, 571], [219, 596, 220], [220, 272, 221], [220, 273, 272], [220, 596, 273], [221, 272, 607], [221, 607, 584], [222, 226, 586], [222, 584, 592], [222, 586, 223], [222, 592, 226], [223, 224, 585], [223, 225, 224], [223, 586, 225], [226, 228, 227], [226, 229, 228], [226, 231, 229], [226, 592, 231], [227, 228, 587], [229, 230, 588], [229, 231, 230], [231, 592, 589], [232, 234, 233], [232, 589, 234], [233, 234, 590], [234, 589, 592], [234, 592, 235], [235, 236, 591], [235, 237, 236], [235, 238, 237], [235, 239, 238], [235, 240, 239], [235, 592, 240], [241, 592, 594], [241, 594, 242], [242, 243, 593], [242, 244, 243], [242, 594, 244], [245, 592, 599], [245, 594, 592], [245, 597, 246], [245, 599, 597], [246, 597, 595], [247, 595, 597], [247, 597, 248], [249, 252, 250], [249, 597, 252], [250, 252, 598], [251, 598, 252], [252, 597, 599], [253, 258, 254], [253, 599, 258], [254, 258, 255], [255, 258, 256], [256, 258, 257], [257, 258, 600], [258, 599, 259], [259, 260, 601], [259, 261, 260], [259, 599, 602], [259, 602, 261], [262, 264, 263], [262, 267, 264], [262, 599, 267], [262, 602, 599], [263, 264, 603], [264, 267, 265], [265, 266, 604], [265, 267, 266], [267, 271, 605], [267, 599, 271], [268, 270, 269], [268, 605, 270], [269, 270, 606], [270, 605, 271], [271, 599, 607], [273, 596, 274], [279, 615, 611], [280, 282, 281], [280, 283, 282], [280, 611, 283], [281, 282, 613], [283, 284, 614], [283, 285, 284], [283, 611, 615], [283, 615, 285], [286, 288, 664], [286, 334, 661], [286, 335, 334], [286, 661, 663], [286, 662, 335], [286, 663, 288], [286, 664, 287], [288, 331, 289], [288, 663, 331], [289, 330, 290], [289, 331, 330], [290, 330, 669], [290, 669, 291], [291, 669, 672], [292, 672, 673], [292, 673, 293], [294, 669, 676], [294, 673, 669], [294, 676, 295], [295, 676, 674], [296, 674, 676], [296, 676, 297], [298, 329, 299], [298, 669, 329], [298, 676, 669], [299, 328, 300], [299, 329, 328], [300, 327, 301], [300, 328, 327], [301, 326, 665], [301, 327, 326], [302, 324, 303], [302, 325, 324], [302, 665, 325], [303, 323, 304], [303, 324, 323], [304, 323, 305], [305, 322, 659], [305, 323, 322], [306, 321, 307], [306, 659, 660], [306, 660, 321], [307, 320, 308], [307, 321, 320], [308, 319, 309], [308, 320, 319], [309, 318, 668], [309, 319, 318], [310, 317, 311], [310, 667, 317], [310, 668, 667], [311, 316, 671], [311, 317, 316], [312, 316, 670], [312, 670, 313], [312, 671, 316], [313, 670, 675], [314, 670, 315], [314, 675, 670], [318, 667, 668], [322, 660, 659], [325, 665, 666], [326, 666, 665], [332, 661, 333], [332, 663, 661], [336, 359, 629], [336, 629, 337], [336, 634, 359], [337, 358, 338], [337, 629, 358], [338, 357, 339], [338, 358, 357], [339, 357, 630], [339, 630, 633], [340, 356, 341], [340, 633, 356], [341, 355, 342], [341, 356, 355], [342, 354, 343], [342, 355, 354], [343, 352, 623], [343, 353, 352], [343, 354, 627], [343, 627, 353], [344, 351, 345], [344, 623, 624], [344, 624, 351], [345, 350, 619], [345, 351, 350], [346, 350, 618], [346, 617, 347], [346, 618, 617], [346, 619, 350], [348, 617, 618], [348, 618, 349], [352, 624, 623], [356, 633, 630], [359, 631, 360], [359, 634, 631], [360, 631, 361], [361, 382, 362], [361, 631, 382], [362, 381, 625], [362, 382, 381], [363, 380, 364], [363, 381, 621], [363, 621, 380], [363, 625, 381], [364, 377, 620], [364, 378, 377], [364, 379, 378], [364, 380, 379], [365, 375, 366], [365, 376, 375], [365, 620, 376], [366, 373, 367], [366, 374, 373], [366, 375, 374], [367, 373, 622], [367, 622, 626], [368, 626, 628], [368, 628, 369], [370, 628, 371], [371, 626, 372], [371, 628, 626], [372, 626, 622], [376, 620, 616], [377, 616, 620], [383, 385, 384], [383, 388, 385], [383, 389, 388], [383, 631, 389], [385, 388, 632], [386, 388, 635], [386, 632, 388], [386, 635, 387], [389, 631, 634], [390, 422, 391], [390, 423, 422], [390, 691, 423], [390, 692, 691], [391, 422, 690], [391, 690, 689], [392, 689, 690], [392, 690, 393], [393, 690, 686], [394, 686, 395], [395, 686, 684], [396, 681, 397], [396, 684, 686], [396, 686, 681], [397, 681, 683], [398, 400, 682], [398, 681, 400], [398, 682, 399], [398, 683, 681], [400, 681, 401], [401, 406, 679], [401, 407, 406], [401, 681, 407], [402, 679, 403], [403, 679, 677], [404, 677, 678], [404, 678, 405], [406, 678, 679], [408, 681, 686], [408, 686, 687], [408, 687, 409], [409, 418, 410], [409, 419, 418], [409, 687, 419], [410, 417, 411], [410, 418, 417], [411, 416, 680], [411, 417, 416], [412, 680, 413], [413, 680, 685], [414, 685, 688], [414, 688, 415], [416, 688, 680], [420, 686, 421], [420, 687, 686], [421, 686, 690], [424, 426, 693], [424, 427, 426], [424, 691, 427], [424, 693, 425], [427, 691, 692], [428, 458, 429], [428, 459, 458], [428, 551, 459], [429, 458, 547], [429, 547, 550], [430, 436, 431], [430, 437, 436], [430, 550, 437], [431, 436, 544], [431, 544, 549], [432, 549, 433], [433, 549, 546], [434, 544, 435], [434, 546, 544], [437, 550, 543], [438, 444, 439], [438, 445, 444], [438, 543, 445], [439, 444, 539], [439, 539, 540], [440, 538, 441], [440, 540, 538], [442, 538, 443], [443, 538, 539], [445, 543, 542], [446, 456, 447], [446, 457, 456], [446, 542, 457], [447, 455, 448], [447, 456, 455], [448, 454, 449], [448, 455, 454], [449, 454, 548], [449, 548, 541], [450, 541, 451], [451, 541, 545], [452, 545, 548], [452, 548, 453], [457, 542, 547], [459, 551, 552], [460, 463, 553], [460, 552, 463], [460, 553, 461], [462, 553, 463], [463, 552, 551], [464, 465, 504], [464, 504, 505], [464, 505, 506], [464, 506, 695], [465, 503, 504], [465, 702, 503], [465, 703, 702], [466, 467, 502], [466, 502, 703], [467, 468, 500], [467, 500, 501], [467, 501, 502], [468, 499, 500], [468, 709, 499], [469, 470, 498], [469, 498, 711], [469, 711, 709], [470, 471, 706], [470, 497, 498], [470, 706, 497], [471, 478, 706], [471, 701, 478], [472, 473, 474], [472, 474, 477], [472, 477, 700], [472, 700, 701], [473, 699, 474], [474, 475, 477], [475, 476, 477], [475, 698, 476], [478, 479, 707], [478, 495, 496], [478, 496, 706], [478, 701, 700], [478, 707, 495], [479, 480, 494], [479, 494, 707], [480, 493, 494], [480, 708, 493], [481, 482, 491], [481, 491, 492], [481, 492, 710], [481, 710, 708], [482, 490, 491], [482, 704, 705], [482, 705, 490], [483, 484, 487], [483, 487, 488], [483, 488, 705], [483, 705, 704], [484, 485, 486], [484, 486, 487], [484, 697, 485], [486, 696, 487], [488, 489, 705], [493, 708, 710], [499, 709, 711], [502, 702, 703], [504, 694, 505], [507, 509, 508], [511, 513, 514], [519, 522, 524], [525, 527, 526], [528, 530, 529], [531, 537, 534], [532, 535, 536], [538, 540, 539], [541, 548, 545], [542, 543, 547], [543, 550, 547], [544, 546, 549], [554, 558, 559], [554, 559, 564], [554, 564, 557], [555, 569, 561], [556, 562, 570], [557, 564, 565], [557, 565, 567], [557, 567, 566], [566, 567, 568], [572, 576, 575], [584, 599, 592], [584, 607, 599], [636, 638, 637], [639, 646, 643], [640, 642, 645], [652, 657, 658], [669, 673, 672], [677, 679, 678], [680, 688, 685]];

},{}],189:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = boundingBox;
// modified version of https://github.com/thibauts/vertices-bounding-box that also works with non nested positions
function boundingBox(positions) {
  if (positions.length === 0) {
    return null;
  }

  var nested = Array.isArray(positions) && Array.isArray(positions[0]);

  var dimensions = nested ? positions[0].length : 3;
  var min = new Array(dimensions);
  var max = new Array(dimensions);

  for (var i = 0; i < dimensions; i += 1) {
    min[i] = Infinity;
    max[i] = -Infinity;
  }

  if (nested) {
    positions.forEach(function (position) {
      for (var i = 0; i < dimensions; i += 1) {
        var _position = nested ? position[i] : position;
        max[i] = _position > max[i] ? _position : max[i]; // position[i] > max[i] ? position[i] : max[i]
        min[i] = _position < min[i] ? _position : min[i]; // min[i] = position[i] < min[i] ? position[i] : min[i]
      }
    });
  } else {
    for (var j = 0; j < positions.length; j += dimensions) {
      for (var i = 0; i < dimensions; i += 1) {
        var _position = positions[i + j]; // nested ? positions[i] : position
        max[i] = _position > max[i] ? _position : max[i]; // position[i] > max[i] ? position[i] : max[i]
        min[i] = _position < min[i] ? _position : min[i]; // min[i] = position[i] < min[i] ? position[i] : min[i]
      }
    }
  }

  return [min, max];
}

},{}],190:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = boundingSphere;
exports.boundingSphereFromBoundingBox = boundingSphereFromBoundingBox;

var _glVec = require('gl-vec3');

/**
  * compute boundingSphere, given positions
  * @param {array} center the center to use (optional).
  * @param {array} positions the array/typed array of positions.
  * for now loosely based on three.js implementation
*/
function boundingSphere() {
  var center = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0, 0];
  var positions = arguments[1];

  if (positions.length === 0) {
    return null;
  }

  if (!center) {
    var box = boundingBox(positions);
    // min & max are the box's min & max
    var result = _glVec.vec3.create();
    center = _glVec.vec3.scale(result, _glVec.vec3.add(result, box.min, box.max), 0.5);
  }
  var nested = Array.isArray(positions) && Array.isArray(positions[0]);

  var maxRadiusSq = 0;
  var increment = nested ? 1 : 3;
  var max = positions.length;
  for (var i = 0; i < max; i += increment) {
    if (nested) {
      maxRadiusSq = Math.max(maxRadiusSq, (0, _glVec.squaredDistance)(center, positions[i]));
    } else {
      var position = [positions[i], positions[i + 1], positions[i + 2]];
      maxRadiusSq = Math.max(maxRadiusSq, (0, _glVec.squaredDistance)(center, position));
    }
  }
  return Math.sqrt(maxRadiusSq);
}

/* compute boundingSphere from boundingBox
  for now more or less based on three.js implementation
*/
function boundingSphereFromBoundingBox() {
  var center = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [0, 0, 0];
  var positions = arguments[1];
  var boundingBox = arguments[2];

  if (positions.length === 0) {
    return null;
  }

  if (!center) {
    // min & max are the box's min & max
    var result = _glVec.vec3.create();
    center = _glVec.vec3.scale(result, _glVec.vec3.add(result, boundingBox[0], boundingBox[1]), 0.5);
  }

  var maxRadiusSq = 0;
  for (var i = 0, il = positions.length; i < il; i++) {
    maxRadiusSq = Math.max(maxRadiusSq, (0, _glVec.squaredDistance)(center, positions[i]));
  }
  return Math.sqrt(maxRadiusSq);
}

},{"gl-vec3":55}],191:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = computeBounds;

var _glVec = require('gl-vec3');

var _glVec2 = _interopRequireDefault(_glVec);

var _boundingBox = require('./boundingBox');

var _boundingBox2 = _interopRequireDefault(_boundingBox);

var _boundingSphere = require('./boundingSphere');

var _boundingSphere2 = _interopRequireDefault(_boundingSphere);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * compute all bounding data given geometry data + position
 * @param  {Object} transforms the initial transforms ie {pos:[x, x, x], rot:[x, x, x], sca:[x, x, x]}.
 * @param  {String} bounds the current bounds of the entity
 * @param  {String} axes on which axes to apply the transformation (default: [0, 0, 1])
 * @return {Object}      a new transforms object, with offset position
 * returns an object in this form:
 * bounds: {
 *  dia: 40,
 *   center: [0,20,8],
 *   min: [9, -10, 0],
 *   max: [15, 10, 4]
 *   size: [6,20,4]
 *}
 */
function computeBounds(object) {
  var scale = object.transforms.sca;
  var bbox = (0, _boundingBox2.default)(object.geometry.positions);
  bbox[0] = bbox[0].map(function (x, i) {
    return x * scale[i];
  });
  bbox[1] = bbox[1].map(function (x, i) {
    return x * scale[i];
  });

  var center = _glVec2.default.scale(_glVec2.default.create(), _glVec2.default.add(_glVec2.default.create(), bbox[0], bbox[1]), 0.5);
  var bsph = (0, _boundingSphere2.default)(center, object.geometry.positions) * Math.max.apply(Math, _toConsumableArray(scale));
  var size = [bbox[1][0] - bbox[0][0], bbox[1][1] - bbox[0][1], bbox[1][2] - bbox[0][2]];

  return {
    dia: bsph,
    center: [].concat(_toConsumableArray(center)),
    min: bbox[0],
    max: bbox[1],
    size: size
  };
}

},{"./boundingBox":189,"./boundingSphere":190,"gl-vec3":55}],192:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isObjectOutsideBounds;
// import boundingBox from './boundingBox'

function computeMinMaxOfPoints(data) {
  var max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  var min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  data.forEach(function (coords) {
    min[0] = coords[0] < min[0] ? coords[0] : min[0];
    min[1] = coords[1] < min[1] ? coords[1] : min[1];
    max[0] = coords[0] > max[0] ? coords[0] : max[0];
    max[1] = coords[1] > max[1] ? coords[1] : max[1];
  });
  return { min: min, max: max };
}

function computeSizeOfPoints(data) {
  var max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  var min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  data.forEach(function (coords) {
    min[0] = coords[0] < min[0] ? coords[0] : min[0];
    min[1] = coords[1] < min[1] ? coords[1] : min[1];
    max[0] = coords[0] > max[0] ? coords[0] : max[0];
    max[1] = coords[1] > max[1] ? coords[1] : max[1];
  });
  return [max[0] - min[0], max[1] - min[1], 0];
}

function adjustedMachineVolumeByDissallowerAreas(machine) {
  var machine_volume = machine.machine_volume;
  var machine_disallowed_areas = machine.machine_disallowed_areas;


  var smallestNegative = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  var smallestPositive = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];

  machine_disallowed_areas.forEach(function (area) {
    // console.log('area', area)
    // kindof a hack, we find the dominant size
    var max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
    var min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];

    area.forEach(function (coords) {
      min[0] = coords[0] < min[0] ? coords[0] : min[0];
      min[1] = coords[1] < min[1] ? coords[1] : min[1];
      max[0] = coords[0] > max[0] ? coords[0] : max[0];
      max[1] = coords[1] > max[1] ? coords[1] : max[1];
    });
    var val = [max[0] - min[0], max[1] - min[1]];
    var biggestAxis = val[0] === Math.max(val[0], val[1]) ? 0 : 1;
    // console.log('biggest ??',val , biggestAxis)

    area.forEach(function (coords) {
      if (coords[0] < 0 && biggestAxis === 1) {
        smallestNegative[0] = coords[0] > smallestNegative[0] ? coords[0] : smallestNegative[0];
      }
      if (coords[0] > 0 && biggestAxis === 1) {
        smallestPositive[0] = coords[0] < smallestPositive[0] ? coords[0] : smallestPositive[0];
      }

      if (coords[1] < 0 && biggestAxis === 0) {
        smallestNegative[1] = coords[1] > smallestNegative[1] ? coords[1] : smallestNegative[1];
      }
      if (coords[1] > 0 && biggestAxis === 0) {
        smallestPositive[1] = coords[1] < smallestPositive[1] ? coords[1] : smallestPositive[1];
      }
    });
  });
  // console.log('min', min, 'max', max)
  // console.log('furthest', furthest)
  return [smallestPositive[0] - smallestNegative[0], smallestPositive[1] - smallestNegative[1], machine_volume[2]];
}

function isObjectOutsideBounds(machine, entity) {
  var bounds = entity.bounds;
  var transforms = entity.transforms;
  var pos = transforms.pos;
  var machine_volume = machine.machine_volume;
  var printable_area = machine.printable_area; // machine volume assumed to be centered around [0,0,0]

  var adjustedVolume = [printable_area[0], printable_area[1], machine_volume[2]]; // adjustedMachineVolumeByDissallowerAreas(machine)
  var halfVolume = adjustedVolume.map(function (x) {
    return x * 0.5;
  });
  halfVolume[2] *= 2; // z is ABOVE the build plate , so not actually centered around 0

  // basic check based on machn dimensions
  var aabbout = pos.reduce(function (acc, val, idx) {
    var cur = val + bounds.min[idx] <= -halfVolume[idx] || val + bounds.max[idx] >= halfVolume[idx];
    // console.log('halfVolume along',idx, halfVolume[idx])
    /*const objOffsetMin = val + bounds.min[idx]
    const halfVol = -halfVolume[idx]
    const result = objOffsetMin <= halfVol
    console.log('min', objOffsetMin, halfVol, result)
     const objOffsetMax = val + bounds.max[idx]
    const halfVol2 = halfVolume[idx]
    const result2 = objOffsetMax >= halfVol2
    console.log('halfVolume along',idx, halfVol)
    console.log('max', objOffsetMax, halfVol2, result2)*/

    return acc || cur;
  }, false);

  return aabbout;
}

},{}],193:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var camera = {
  position: [150, 250, 200],
  target: [0, 0, 0],
  fov: Math.PI / 4,
  aspect: 1,

  projection: new Float32Array(16),
  view: new Float32Array(16),
  near: 10, // 0.01,
  far: 1300,

  thetaDelta: 0,
  phiDelta: 0,
  scale: 1
};
exports.default = camera;

},{}],194:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cameraOffsetToEntityBoundsCenter;

var _glVec = require('gl-vec3');

var _glVec2 = _interopRequireDefault(_glVec);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * offsets camera & camera target to align to objects's 'center of gravity' (center of bounds)
 * on the Z axis only !!
 * @param  {Object} camera the camera we are using
 * @param  {Object} bounds the current bounds of the entity
 */
function cameraOffsetToEntityBoundsCenter(_ref) {
  var camera = _ref.camera;
  var bounds = _ref.bounds;
  var transforms = _ref.transforms;
  var axis = _ref.axis;

  if (!bounds || !camera) {
    throw new Error('No camera/bounds specified!');
  }
  var target = camera.target;
  var position = camera.position;


  var boundsCenter = bounds.max.map(function (pos, idx) {
    return pos - bounds.min[idx];
  });
  //FIXME : do we need to offset things by transforms here or not ?
  var focusPoint = _glVec2.default.add([], _glVec2.default.fromValues.apply(_glVec2.default, _toConsumableArray(transforms.pos)), _glVec2.default.fromValues.apply(_glVec2.default, _toConsumableArray(boundsCenter)));

  var diff = _glVec2.default.subtract([], focusPoint, target);
  var zOffset = [0, 0, diff[axis] * 0.5];
  target = _glVec2.default.add([], target, zOffset);
  position = _glVec2.default.add([], position, zOffset);

  return {
    position: position,
    target: target
  };
}

},{"gl-vec3":55}],195:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = computeCameraToFitBounds;

var _glVec = require('gl-vec3');

var _glVec2 = _interopRequireDefault(_glVec);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// import mat4 from 'gl-mat4'
// import project from 'camera-project'

/**
 * zooms in on an object trying to fit its bounds on the (2d) screen
 * assumes the bounds CENTER is not in world space for now, hence transforms needing to be passed
 * @param  {Object} camera the camera we are using
 * @param  {Object} bounds the current bounds of the entity
 */
function computeCameraToFitBounds(_ref) {
  var camera = _ref.camera;
  var bounds = _ref.bounds;
  var transforms = _ref.transforms;

  /*
  bounds: {
    dia: 40,
    center: [0,20,8],
    min: [9, 10, 0],
    max: [15, 10, 4]
  },*/
  if (!bounds || !camera) {
    throw new Error('No camera/bounds specified!');
  }

  // const {projection, view} = camera
  // const radius = bounds.dia / 2
  // we use radius so that we can be shape indenpdant : a sphere seen from any angle is a sphere...
  var radius = Math.max.apply(Math, _toConsumableArray(bounds.size)) * 0.5; // we find the biggest dimension, and use it as a basis
  // console.log('bounds', bounds.size, bounds.min, bounds.max, radius)

  var entityPosition = _glVec2.default.add([], bounds.center, transforms.pos); // TODO: apply transforms to center , here or elswhere ??

  var targetOffset = _glVec2.default.subtract([], entityPosition, camera.target); // offset between target position & camera's target

  // move camera to base position
  // compute new camera position
  var camNewPos = _glVec2.default.fromValues.apply(_glVec2.default, _toConsumableArray(camera.position));
  var camNewTgt = _glVec2.default.fromValues.apply(_glVec2.default, _toConsumableArray(camera.target));
  camNewPos = _glVec2.default.add(camNewPos, camNewPos, targetOffset);
  camNewTgt = _glVec2.default.fromValues.apply(_glVec2.default, _toConsumableArray(entityPosition));

  // and move it away from the boundingSphere of the object
  /*const width = 640
  const height = 480
  const combinedProjView = mat4.multiply([], projection, view)
  const viewport = [0, 0, width, height]
  // project entityPosition onto 2d plane
  const projectedEntityPosition = project([], entityPosition, viewport, combinedProjView)
  console.log('projectedEntityPosition', projectedEntityPosition)
  // project top, bottom, left & right onto 2d plane
  //console.log('camera can see width', 2 * vec3.distance(entityPosition, camNewPos) * Math.tan(camera.fov / 2))*/

  /*let halfMinFovRad = 0.5 * camera.fov
  if (camera.aspect > 1.0)// fov in x is smaller
  { //console.log('fov x smaller')
    halfMinFovRad = Math.atan(camera.aspect * Math.tan(halfMinFovRad))
  }*/

  var fovY = Math.atan(camera.aspect * Math.tan(camera.fov));
  var halfMinFovRad = Math.sin(Math.min(camera.fov, fovY) * 0.5);
  var dist = _glVec2.default.distance(entityPosition, camNewPos) - radius * 1.5 / halfMinFovRad; // Math.sin(halfMinFovRad)
  // console.log('dist', dist, 'aspect', camera.aspect, 'fov', camera.fov, 'halfMinFovRad', halfMinFovRad)
  // const dist = // vec3.distance(entityPosition, camNewPos) - radius * 4 // FIXME: this needs to use the projection info/perspective

  var vec = _glVec2.default.create();
  vec = _glVec2.default.subtract(vec, camNewPos, camNewTgt);
  vec = _glVec2.default.normalize(vec, vec);
  vec = _glVec2.default.scale(vec, vec, dist);

  camNewPos = _glVec2.default.subtract(camNewPos, camNewPos, vec);

  return {
    position: [].concat(_toConsumableArray(camNewPos)),
    target: [].concat(_toConsumableArray(camNewTgt))
  };
}

},{"gl-vec3":55}],196:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = controlsStream;

var _orbitControls = require('./orbitControls');

var _computeCameraToFitBounds = require('../cameraEffects/computeCameraToFitBounds');

var _computeCameraToFitBounds2 = _interopRequireDefault(_computeCameraToFitBounds);

var _cameraOffsetToEntityBoundsCenter = require('../cameraEffects/cameraOffsetToEntityBoundsCenter');

var _cameraOffsetToEntityBoundsCenter2 = _interopRequireDefault(_cameraOffsetToEntityBoundsCenter);

var _modelUtils = require('../utils/modelUtils');

var _animationFrames = require('../utils/most/animationFrames');

var _glMat = require('gl-mat4');

var _glMat2 = _interopRequireDefault(_glMat);

var _limitFlow = require('../utils/most/limitFlow');

var _limitFlow2 = _interopRequireDefault(_limitFlow);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function controlsStream(interactions, cameraData, focuses$, entityFocuses$, projection$) {
  var settings = cameraData.settings;
  var camera = cameraData.camera;
  var gestures = interactions.gestures;


  var rate$ = (0, _animationFrames.rafStream)(); // heartBeat

  /*let i = 0
  var newdiv = document.createElement("DIV")
  newdiv.style.zIndex = 99
  newdiv.style.position = 'absolute'
  newdiv.style.color = 'red'
  newdiv.style.top = '40px'
  let textNode = document.createTextNode("some text"+i)
  newdiv.appendChild(textNode)
  document.body.appendChild(newdiv)*/

  var dragMoves$ = gestures.dragMoves
  // .throttle(16) // FIXME: not sure, could be optimized some more
  .filter(function (x) {
    return x !== undefined;
  }).map(function (data) {
    var delta = [data.delta.x, data.delta.y];
    if (data.type === 'touch') {
      // delta = delta.map(x => x / mobileReductor)
    }
    return delta;
  }).map(function (delta) {
    var angle = [-Math.PI * delta[0], -Math.PI * delta[1]];
    return angle;
  }).map(function (x) {
    return x.map(function (y) {
      return y * 0.1;
    });
  }); // empirical reduction factor

  var zooms$ = gestures.zooms.map(function (x) {
    return -x;
  }) // we invert zoom direction
  .startWith(0).filter(function (x) {
    return !isNaN(x);
  }).map(function (x) {
    return x * 2.5;
  });
  //.throttle(10)

  // model/ state/ reducers
  function makeCameraModel() {
    function setProjection(state, input) {
      var projection = _glMat2.default.perspective([], state.fov, input.width / input.height, // context.viewportWidth / context.viewportHeight,
      state.near, state.far);
      //state = Object.assign({}, state, {projection})
      state.projection = projection;
      state.aspect = input.width / input.height;
      //state = Object.assign({}, state, update(settings, state)) // not sure
      return state;
    }

    function applyRotation(state, angles) {
      //textNode.nodeValue= 'applyRotation'
      state = (0, _orbitControls.rotate)(settings, state, angles); // mutating, meh
      return state;
    }

    function applyZoom(state, zooms) {
      state = (0, _orbitControls.zoom)(settings, state, zooms); // mutating, meh
      return state;
    }

    function applyFocusOn(state, focuses) {
      state = (0, _orbitControls.setFocus)(settings, state, focuses); // mutating, meh
      return state;
    }

    function zoomToFit(state, input) {
      //console.log('zoomToFit', state.position, state.target,  input)
      var camera = state;
      var bounds = input.bounds;
      var transforms = input.transforms;

      var offsetTargetAndPosition = (0, _cameraOffsetToEntityBoundsCenter2.default)({ camera: camera, bounds: bounds, transforms: transforms, axis: 2 });
      camera = Object.assign({}, state, offsetTargetAndPosition);
      var phase2 = (0, _computeCameraToFitBounds2.default)({ camera: camera, bounds: bounds, transforms: transforms });
      state.targetTgt = phase2.target;
      state.positionTgt = phase2.position;
      return state;
    }

    //this is used for 'continuous updates' for things like spin effects, autoRotate etc
    function updateState(state) {
      //i++
      //textNode.nodeValue= 'foo'+i
      //return state
      return Object.assign({}, state, (0, _orbitControls.update)(settings, state));
    }

    var updateFunctions = {
      setProjection: setProjection,
      applyZoom: applyZoom,
      applyRotation: applyRotation,
      //applyFocusOn,
      zoomToFit: zoomToFit,
      updateState: updateState
    };
    var actions = {
      setProjection: projection$,
      applyZoom: zooms$,
      applyRotation: dragMoves$,
      //applyFocusOn: focuses$,
      zoomToFit: entityFocuses$,
      updateState: rate$
    };

    var cameraState$ = (0, _modelUtils.model)(camera, actions, updateFunctions);

    return cameraState$;
  }

  var cameraState$ = makeCameraModel();

  return cameraState$.thru((0, _limitFlow2.default)(33));
  /*return rate$.sample(x => x,
    cameraState$
      .filter(x => x.changed)
      .merge(cameraState$.take(1))
  )*/
}

},{"../cameraEffects/cameraOffsetToEntityBoundsCenter":194,"../cameraEffects/computeCameraToFitBounds":195,"../utils/modelUtils":209,"../utils/most/animationFrames":210,"../utils/most/limitFlow":212,"./orbitControls":197,"gl-mat4":29}],197:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.update = update;
exports.rotate = rotate;
exports.zoom = zoom;
exports.setFocus = setFocus;
var vec3 = require('gl-vec3');
var mat4 = require('gl-mat4');
var max = Math.max;
var min = Math.min;
var sqrt = Math.sqrt;
var PI = Math.PI;
var sin = Math.sin;
var cos = Math.cos;
var atan2 = Math.atan2;

/* cameras are assumed to have:
 projection
 view
 target (focal point)
 eye/position
 up
*/

var params = exports.params = {
  enabled: true,
  userControl: {
    zoom: true,
    zoomSpeed: 1.0,
    rotate: true,
    rotateSpeed: 1.0,
    pan: true,
    panSpeed: 2.0
  },
  autoRotate: {
    enabled: false,
    speed: 2.0 // 30 seconds per round when fps is 60
  },
  limits: {
    minDistance: 30,
    maxDistance: 800
  },
  EPS: 0.000001,
  drag: 0.27, // Decrease the momentum by 1% each iteration

  up: [0, 0, 1]
};

function update(settings, state) {
  // custom z up is settable, with inverted Y and Z (since we use camera[2] => up)
  var camera = state;
  var EPS = settings.EPS;
  var up = settings.up;
  var drag = settings.drag;
  var position = camera.position;
  var target = camera.target;
  var view = camera.view;
  var targetTgt = camera.targetTgt;
  var positionTgt = camera.positionTgt;


  var curThetaDelta = camera.thetaDelta;
  var curPhiDelta = camera.phiDelta;
  var curScale = camera.scale;

  var offset = vec3.subtract([], position, target);
  var theta = void 0;
  var phi = void 0;

  if (up[2] === 1) {
    // angle from z-axis around y-axis, upVector : z
    theta = atan2(offset[0], offset[1]);
    // angle from y-axis
    phi = atan2(sqrt(offset[0] * offset[0] + offset[1] * offset[1]), offset[2]);
  } else {
    // in case of y up
    theta = atan2(offset[0], offset[2]);
    phi = atan2(sqrt(offset[0] * offset[0] + offset[2] * offset[2]), offset[1]);
    // curThetaDelta = -(curThetaDelta)
  }

  if (params.autoRotate.enabled && params.userControl.rotate) {
    curThetaDelta += 2 * Math.PI / 60 / 60 * params.autoRotate.speed; // arbitrary, kept for backwards compatibility
  }

  theta += curThetaDelta;
  phi += curPhiDelta;

  // restrict phi to be betwee EPS and PI-EPS
  phi = max(EPS, min(PI - EPS, phi));
  // multiply by scaling effect and restrict radius to be between desired limits
  var radius = max(params.limits.minDistance, min(params.limits.maxDistance, vec3.length(offset) * curScale));

  if (up[2] === 1) {
    offset[0] = radius * sin(phi) * sin(theta);
    offset[2] = radius * cos(phi);
    offset[1] = radius * sin(phi) * cos(theta);
  } else {
    offset[0] = radius * sin(phi) * sin(theta);
    offset[1] = radius * cos(phi);
    offset[2] = radius * sin(phi) * cos(theta);
  }

  var newPosition = vec3.add(vec3.create(), target, offset);
  var newTarget = target;
  var newView = mat4.lookAt(view, newPosition, target, up);
  /* mat3.fromMat4(camMat, camMat)
  quat.fromMat3(this.rotation, camMat)
  lookAt(view, this.position, this.target, this.up)
  */

  // temporary setup for camera 'move/zoom to fit'
  if (targetTgt && positionTgt) {
    var posDiff = vec3.subtract([], positionTgt, newPosition);
    var tgtDiff = vec3.subtract([], targetTgt, newTarget);
    //console.log('posDiff', newPosition, positionTgt, newTarget, targetTgt)
    if (vec3.length(posDiff) > 0.1 && vec3.length(tgtDiff) > 0.1) {
      newPosition = vec3.scaleAndAdd(newPosition, newPosition, posDiff, 0.1);
      newTarget = vec3.scaleAndAdd(newTarget, newTarget, tgtDiff, 0.1);
    }
  }

  var dragEffect = 1 - max(min(drag, 1.0), 0.01);

  var positionChanged = vec3.distance(position, newPosition) > 0; // TODO optimise
  return {
    changed: positionChanged,
    thetaDelta: curThetaDelta * dragEffect,
    phiDelta: curPhiDelta * dragEffect,
    scale: 1,

    position: newPosition,
    target: newTarget,
    view: newView
  };
}

function rotate(params, camera, angle) {
  var reductionFactor = 500;
  if (params.userControl.rotate) {
    camera.thetaDelta += angle[0] / reductionFactor;
    camera.phiDelta += angle[1] / reductionFactor;
  }

  return camera;
}

function zoom(params, camera, zoomScale) {
  if (params.userControl.zoom) {
    zoomScale = zoomScale * 0.001; // Math.min(Math.max(zoomScale, -0.1), 0.1)
    var amount = Math.abs(zoomScale) === 1 ? Math.pow(0.95, params.userControl.zoomSpeed) : zoomScale;
    var scale = zoomScale < 0 ? camera.scale / amount : camera.scale * amount;
    camera.scale += amount;

    // these are empirical values , after a LOT of testing
    camera.near += amount * 0.5;
    camera.near = Math.min(Math.max(10, camera.near), 12);
    camera.far += amount * 500;
    camera.far = Math.max(Math.min(2000, camera.far), 150);
    // console.log('near ', camera.near, 'far', camera.far)

    var projection = mat4.perspective([], camera.fov, camera.aspect, // context.viewportWidth / context.viewportHeight,
    camera.near, camera.far);
    camera.projection = projection;
  }
  return camera;
}

function pan(params) {
  // TODO: implement
  /*let distance = _origDist.clone()
  distance.transformDirection(object.matrix)
  distance.multiplyScalar(scope.userPanSpeed)
  object.position.add(distance)
  scope.centers[index].add(distance)*/
  return params;
}

function setFocus(params, camera, focusPoint) {
  var sub = function sub(a, b) {
    return a.map(function (a1, i) {
      return a1 - b[i];
    });
  };
  var add = function add(a, b) {
    return a.map(function (a1, i) {
      return a1 + b[i];
    });
  }; // NOTE: NO typedArray.map support on old browsers, polyfilled
  var camTarget = camera.target;
  var diff = sub(focusPoint, camTarget); // [ focusPoint[0] - camTarget[0],
  var zOffset = [0, 0, diff[2] * 0.5];
  camera.target = add(camTarget, zOffset);
  camera.position = add(camera.position, zOffset);
  return camera;
}

/*
function setObservables (observables) {
  let {dragMoves$, zooms$} = observables
  dragMoves$
    .subscribe(function (e) {
      let delta = e.delta
      let angle = {x: 0,y: 0}
      angle[0] = 2 * Math.PI * delta[0] / PIXELS_PER_ROUND * scope.userRotateSpeed
      angle[1] = -2 * Math.PI * delta[1] / PIXELS_PER_ROUND * scope.userRotateSpeed
      rotate(self.objects, angle)
    })
}*/

},{"gl-mat4":29,"gl-vec3":55}],198:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.elementSize = elementSize;

var _most = require('most');

// element resize event stream, throttled by throttle amount (250ms default)
function elementSize(element) {
  var throttle = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 25;

  var pixelRatio = window.devicePixelRatio;
  function extractSize(x) {
    x = element;
    var width = Math.floor(element.clientWidth * pixelRatio);
    var height = Math.floor(element.clientHeight * pixelRatio);
    var bRect = element.getBoundingClientRect ? element.getBoundingClientRect() : { left: 0, top: 0, bottom: 0, right: 0, width: 0, height: 0 };
    return { width: width, height: height, aspect: width / height, bRect: bRect };
  }

  return (0, _most.fromEvent)('resize', window) //only window fires resize events...
  .throttle(throttle /* ms */).map(extractSize).startWith(extractSize());
}

},{"most":116}],199:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.preventDefault = preventDefault;
exports.interactionsFromEvents = interactionsFromEvents;
exports.pointerGestures = pointerGestures;

var _most = require('most');

var _prelude = require('@most/prelude');

var _assign = require('fast.js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// //////FOr most.js
var repeat = function repeat(n, stream) {
  return n === 0 ? (0, _most.empty)() : n === 1 ? stream : (0, _most.continueWith)(function () {
    return repeat(n - 1, stream);
  }, stream);
};

// see https://github.com/cujojs/most/issues/20

// Imagine map and filter are curried
// faster object.assign
var mapc = (0, _prelude.curry2)(_most.map);
var filterc = (0, _prelude.curry2)(_most.filter);

// this is in another package/module normally
function preventDefault(event) {
  event.preventDefault();
  return event;
}

// for gesture vs touch events
function isNotIos(event) {
  var ios = /iphone|ipod|ipad/.test(window.navigator.userAgent.toLowerCase());
  return ios === false;
}

function interactionsFromEvents(targetEl) {
  var mouseDowns$ = (0, _most.fromEvent)('mousedown', targetEl);
  var mouseUps$ = (0, _most.fromEvent)('mouseup', targetEl);
  var mouseLeaves$ = (0, _most.fromEvent)('mouseleave', targetEl).merge((0, _most.fromEvent)('mouseout', targetEl));
  var mouseMoves$ = (0, _most.fromEvent)('mousemove', targetEl); // .takeUntil(mouseLeaves$) // altMouseMoves(fromEvent(targetEl, 'mousemove')).takeUntil(mouseLeaves$)

  var rightClicks$ = (0, _most.fromEvent)('contextmenu', targetEl).tap(preventDefault); // disable the context menu / right click

  var touchStart$ = (0, _most.fromEvent)('touchstart', targetEl);
  var touchMoves$ = (0, _most.fromEvent)('touchmove', targetEl).filter(function (t) {
    return t.touches.length === 1;
  });
  var touchEnd$ = (0, _most.fromEvent)('touchend', targetEl);

  // const gestureChange$ = fromEvent('gesturechange', targetEl)
  // const gestureStart$ = fromEvent('gesturestart', targetEl)
  // const gestureEnd$ = fromEvent('gestureend', targetEl)

  var pointerDowns$ = (0, _most.merge)(mouseDowns$, touchStart$); // mouse & touch interactions starts
  var pointerUps$ = (0, _most.merge)(mouseUps$, touchEnd$); // mouse & touch interactions ends
  var pointerMoves$ = (0, _most.merge)(mouseMoves$, touchMoves$);

  var zooms$ = (0, _most.merge)((0, _most.merge)(
  // pinchZooms(gestureChange$, gestureStart$, gestureEnd$),// for Ios
  pinchZoomsFromTouch(touchStart$, (0, _most.fromEvent)('touchmove', targetEl), touchEnd$) // for Android (no gestureXX events)
  ), (0, _most.merge)((0, _most.fromEvent)('wheel', targetEl), (0, _most.fromEvent)('DOMMouseScroll', targetEl), (0, _most.fromEvent)('mousewheel', targetEl)).map(_utils.normalizeWheel));

  function preventScroll(targetEl) {
    (0, _most.fromEvent)('mousewheel', targetEl).forEach(preventDefault);
    (0, _most.fromEvent)('DOMMouseScroll', targetEl).forEach(preventDefault);
    (0, _most.fromEvent)('wheel', targetEl).forEach(preventDefault);
    (0, _most.fromEvent)('touchmove', targetEl).forEach(preventDefault);
  }
  preventScroll(targetEl);

  return {
    mouseDowns$: mouseDowns$,
    mouseUps$: mouseUps$,
    mouseMoves$: mouseMoves$,

    rightClicks$: rightClicks$,
    zooms$: zooms$,

    touchStart$: touchStart$,
    touchMoves$: touchMoves$,
    touchEnd$: touchEnd$,

    pointerDowns$: pointerDowns$,
    pointerUps$: pointerUps$,
    pointerMoves$: pointerMoves$ };
}

function gestureStart() {}

// based on http://jsfiddle.net/mattpodwysocki/pfCqq/
function mouseDrags(mouseDowns$, mouseUps, mouseMoves, settings) {
  var longPressDelay = settings.longPressDelay;
  var maxStaticDeltaSqr = settings.maxStaticDeltaSqr;

  return mouseDowns$.flatMap(function (md) {
    // calculate offsets when mouse down
    var startX = md.offsetX * window.devicePixelRatio;
    var startY = md.offsetY * window.devicePixelRatio;
    // Calculate delta with mousemove until mouseup
    var prevX = startX;
    var prevY = startY;

    return mouseMoves.map(function (e) {
      var curX = e.clientX * window.devicePixelRatio;
      var curY = e.clientY * window.devicePixelRatio;

      var delta = {
        left: curX - startX,
        top: curY - startY,
        x: prevX - curX,
        y: curY - prevY
      };

      prevX = curX;
      prevY = curY;

      var normalized = { x: curX, y: curY };
      return { mouseEvent: e, delta: delta, normalized: normalized, type: 'mouse' };
    }).takeUntil(mouseUps);
  });
}

function touchDrags(touchStart$, touchEnd$, touchMove$, settings) {
  return touchStart$.flatMap(function (ts) {
    var startX = ts.touches[0].pageX * window.devicePixelRatio;
    var startY = ts.touches[0].pageY * window.devicePixelRatio;

    var prevX = startX;
    var prevY = startY;

    return touchMove$.map(function (e) {
      var curX = e.touches[0].pageX * window.devicePixelRatio;
      var curY = e.touches[0].pageY * window.devicePixelRatio;

      var x = curX - startX;
      var y = curY - startY;

      var delta = {
        left: x,
        top: y,
        x: prevX - curX,
        y: curY - prevY
      };

      prevX = curX;
      prevY = curY;

      // let output = assign({}, e, {delta})
      var normalized = { x: curX, y: curY };
      return { mouseEvent: e, delta: delta, normalized: normalized, type: 'touch' };
    }).takeUntil(touchEnd$);
  });
}

function pinchZooms(gestureChange$, gestureStart$, gestureEnd$) {
  return gestureStart$.flatMap(function (gs) {
    return gestureChange$.map(function (x) {
      return x.scale;
    })
    // .loop((prev, cur) => ({seed: cur, value: prev ? cur - prev : prev}), undefined)
    .loop(function (prev, cur) {
      console.log('prev', prev, 'cur', cur, 'value', prev ? cur - prev : prev);
      var value = prev ? cur - prev : prev;

      if (value > 0) {
        value = Math.min(Math.max(value, 0), 2);
      } else {
        value = Math.min(Math.max(value, 2), 0);
      }

      return { seed: cur, value: value };
    }, undefined).filter(function (x) {
      return x !== undefined;
    })
    // .map(x => x / x)
    .takeUntil(gestureEnd$);
  }).tap(function (e) {
    return console.log('pinchZooms', e);
  });
}

function pinchZoomsFromTouch(touchStart$, touchMoves$, touchEnd$) {
  // for android , custom gesture handling
  // very very vaguely based on http://stackoverflow.com/questions/11183174/simplest-way-to-detect-a-pinch
  return touchStart$.filter(function (t) {
    return t.touches.length === 2;
  }) // .filter(isNotIos)
  .flatMap(function (ts) {
    var startX1 = ts.touches[0].pageX * window.devicePixelRatio;
    var startY1 = ts.touches[0].pageY * window.devicePixelRatio;

    var startX2 = ts.touches[1].pageX * window.devicePixelRatio;
    var startY2 = ts.touches[1].pageY * window.devicePixelRatio;

    var startDist = startX1 - startX2 * startX1 - startX2 + (startY1 - startY2 * startY1 - startY2);

    return touchMoves$.tap(function (e) {
      return e.preventDefault();
    }).filter(function (t) {
      return t.touches.length === 2;
    })
    // .tap(e => console.log('touchMoves BEFORE', e))
    .map(function (e) {
      var curX1 = e.touches[0].pageX * window.devicePixelRatio;
      var curY1 = e.touches[0].pageY * window.devicePixelRatio;

      var curX2 = e.touches[1].pageX * window.devicePixelRatio;
      var curY2 = e.touches[1].pageY * window.devicePixelRatio;

      var currentDist = curX1 - curX2 * curX1 - curX2 + (curY1 - curY2 * curY1 - curY2);
      return currentDist;
    }).loop(function (prev, cur) {
      if (prev) {
        return { seed: cur, value: cur - prev };
      }
      return { seed: cur, value: cur - startDist };
    }, undefined).filter(function (x) {
      return x !== undefined;
    }).map(function (x) {
      return x * 0.000005;
    }) // arbitrary, in order to harmonise desktop /mobile up to a point
    // .filter(isNotIos)
    /*.map(function (e) {
      const scale = e > 0 ? Math.sqrt(e) : -Math.sqrt(Math.abs(e))
      return scale
    })*/
    .takeUntil(touchEnd$);
  });
}

/* drag move interactions press & move(continuously firing)
*/
function dragMoves(_ref, settings) {
  var mouseDowns$ = _ref.mouseDowns$;
  var mouseUps$ = _ref.mouseUps$;
  var mouseMoves$ = _ref.mouseMoves$;
  var touchStart$ = _ref.touchStart$;
  var touchEnd$ = _ref.touchEnd$;
  var longTaps$ = _ref.longTaps$;
  var touchMoves$ = _ref.touchMoves$;

  var dragMoves$ = (0, _most.merge)(mouseDrags(mouseDowns$, mouseUps$, mouseMoves$, settings), touchDrags(touchStart$, touchEnd$, touchMoves$, settings));
  // .merge(merge(touchEnd$, mouseUps$).map(undefined))
  // .tap(e=>console.log('dragMoves',e))

  // .takeUntil(longTaps$) // .repeat() // no drag moves if there is a context action already taking place

  return dragMoves$;
}

/* alternative "clicks" (ie mouseDown -> mouseUp ) implementation, with more fine
grained control*/
function baseTaps(_ref2, settings) {
  var mouseDowns$ = _ref2.mouseDowns$;
  var mouseUps$ = _ref2.mouseUps$;
  var mouseMoves$ = _ref2.mouseMoves$;
  var touchStart$ = _ref2.touchStart$;
  var touchEnd$ = _ref2.touchEnd$;
  var touchMoves$ = _ref2.touchMoves$;
  var maxStaticDeltaSqr = settings.maxStaticDeltaSqr;


  var starts$ = (0, _most.merge)(mouseDowns$, touchStart$); // mouse & touch interactions starts
  var ends$ = (0, _most.merge)(mouseUps$, touchEnd$); // mouse & touch interactions ends
  var moves$ = (0, _most.merge)(mouseMoves$, touchMoves$);
  // only doing any "clicks if the time between mDOWN and mUP is below longpressDelay"
  // any small mouseMove is ignored (shaky hands)

  return starts$.timestamp().flatMap(function (downEvent) {
    return (0, _most.merge)((0, _most.just)(downEvent), moves$ // Skip if we get a movement before a mouse up
    .tap(function (e) {
      return console.log('e.delta', JSON.stringify(e));
    }).filter(function (data) {
      return (0, _utils.isMoving)(data.delta, maxStaticDeltaSqr);
    }) // allow for small movement (shaky hands!) FIXME: implement
    .take(1).flatMap(function (x) {
      return (0, _most.empty)();
    }).timestamp(), ends$.take(1).timestamp());
  }).loop(function (acc, current) {
    var result = void 0;
    if (acc.length === 1) {
      var interval = current.time - acc[0].time;
      var moveDelta = [current.value.clientX - acc[0].value.offsetX, current.value.clientY - acc[0].value.offsetY]; // FIXME: duplicate of mouseDrags !
      moveDelta = moveDelta[0] * moveDelta[0] + moveDelta[1] * moveDelta[1]; // squared distance
      result = { value: current.value, interval: interval, moveDelta: moveDelta };
      acc = [];
    } else {
      acc.push(current);
    }
    return { seed: acc, value: result };
  }, []).filter(function (e) {
    return e !== undefined;
  }).multicast();
}

function taps(baseInteractions, settings) {
  var taps$ = baseTaps(baseInteractions, settings);
  var longPressDelay = settings.longPressDelay;
  var multiClickDelay = settings.multiClickDelay;
  var maxStaticDeltaSqr = settings.maxStaticDeltaSqr;


  function bufferUntil(obsToBuffer, obsEnd) {
    return obsToBuffer.map(function (data) {
      return { type: 'data', data: data };
    }).merge(taps$.debounce(multiClickDelay).map(function (data) {
      return { type: 'reset' };
    })).loop(function (seed, _ref3) {
      var type = _ref3.type;
      var data = _ref3.data;

      var value = void 0;
      if (type === 'data') {
        seed.push(data);
      } else {
        value = seed;
        seed = [];
      }
      return { seed: seed, value: value };
    }, []).filter(function (x) {
      return x !== undefined;
    });

    /*const baseBuffer$ =
      obsToBuffer.scan(function (acc, current) {
        acc.push(current)
        return acc
    }, [])
     return baseBuffer$
      .until(obsEnd)*/
  }
  /*
  // exploring of more composition based system : much clearer, but needs work
   const deltaBelowMax = x => x.moveDelta < maxStaticDeltaSqr
  const intervalBelowLongPress = x => x.interval <= longPressDelay
  const validButton = event => 'button' in event && event.button === 0
  const exists = x => x !== undefined
   const pluckValue = x => x.value
  const pluckList = x => x.list
  const first = x => x[0]
   const shortTaps = compose(
    filterc(deltaBelowMax),
    filterc(intervalBelowLongPress),
    mapc(pluckValue),
    filterc(validButton)
  )
   const firstInList = compose(
    mapc(pluckList),
    mapc(first)
  )
   //const tapsByNumber = tapCount => compose(filterc(x => x.nb === tapCount), firstInList())*/

  var shortTaps$ = taps$.filter(function (e) {
    return e.interval <= longPressDelay;
  }) // any tap shorter than this time is a short one
  .filter(function (e) {
    return e.moveDelta < maxStaticDeltaSqr;
  }) // when the square distance is bigger than this, it is a movement, not a tap
  .map(function (e) {
    return e.value;
  }).filter(function (event) {
    return 'button' in event && event.button === 0;
  }) // FIXME : bad filter , excludes mobile ?!

  .map(function (data) {
    return { type: 'data', data: data };
  }).merge(taps$.debounce(multiClickDelay).map(function (data) {
    return { type: 'reset' };
  })).loop(function (seed, _ref4) {
    var type = _ref4.type;
    var data = _ref4.data;

    var value = void 0;
    if (type === 'data') {
      seed.push(data);
    } else {
      value = seed;
      seed = [];
    }
    return { seed: seed, value: value };
  }, []).filter(function (x) {
    return x !== undefined;
  })
  // .buffer(function () { return taps$.debounce(multiClickDelay) })// buffer all inputs, and emit at then end of multiClickDelay
  .map(function (list) {
    return { list: list, nb: list.length };
  }).multicast();

  var shortSingleTaps$ = shortTaps$.filter(function (x) {
    return x.nb === 1;
  }).map(function (e) {
    return e.list;
  }).map(function (e) {
    return e[0];
  }); // was flatMap
  var shortDoubleTaps$ = shortTaps$.filter(function (x) {
    return x.nb === 2;
  }).map(function (e) {
    return e.list;
  }).map(function (e) {
    return e[0];
  }); // .take(1) // .repeat()

  // longTaps: either HELD leftmouse/pointer or HELD right click
  var longTaps$ = taps$.filter(function (e) {
    return e.interval > longPressDelay;
  }).filter(function (e) {
    return e.moveDelta < maxStaticDeltaSqr;
  }) // when the square distance is bigger than this, it is a movement, not a tap
  .map(function (e) {
    return e.value;
  });

  return {
    taps$: taps$,
    shortSingleTaps$: shortSingleTaps$,
    shortDoubleTaps$: shortDoubleTaps$,
    longTaps$: longTaps$ };
}

function pointerGestures(baseInteractions) {
  var multiClickDelay = 250;
  var longPressDelay = 250;
  var maxStaticDeltaSqr = 100; // max 100 pixels delta
  var zoomMultiplier = 200; // zoomFactor for normalized interactions across browsers

  var settings = { multiClickDelay: multiClickDelay, longPressDelay: longPressDelay, maxStaticDeltaSqr: maxStaticDeltaSqr };

  var taps$ = taps(baseInteractions, settings);
  var dragMoves$ = dragMoves(baseInteractions, settings);

  return {
    taps: taps$,
    dragMoves: dragMoves$,
    zooms: baseInteractions.zooms$.map(function (x) {
      return x * zoomMultiplier;
    }),
    pointerMoves: baseInteractions.pointerMoves$
  };
}

},{"./utils":200,"@most/prelude":3,"fast.js/object/assign":13,"most":116}],200:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isMoving = isMoving;
exports.normalizeWheel = normalizeWheel;
function isMoving(moveDelta, deltaSqr) {
  return true;
  /* let distSqr = (moveDelta.x * moveDelta.x + moveDelta.y * moveDelta.y)
  let isMoving = (distSqr > deltaSqr)
  // console.log("moving",isMoving)
  return isMoving*/
}

function normalizeWheel(event) {
  var delta = { x: 0, y: 0 };
  if (event.wheelDelta) {
    // WebKit / Opera / Explorer 9
    delta = event.wheelDelta;
  } else if (event.detail) {
    // Firefox older
    delta = -event.detail;
  } else if (event.deltaY) {
    // Firefox
    delta = -event.deltaY;
  }
  delta = delta >= 0 ? 1 : -1;
  return delta;
}

},{}],201:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeAndroidInterface = makeAndroidInterface;
var mobileCaller = {
  interfaceName: 'JAMDroid',

  call: function call(method) {
    //console.log('method', method)
    if (eval('typeof ' + this.interfaceName) !== 'undefined') {
      new Function(this.interfaceName + '.' + method)();
    }
  }
};

function makeAndroidInterface() {
  return {
    viewerReady: function viewerReady(value) {
      return mobileCaller.call('onViewerReady(' + value + ')');
    },
    modelLoaded: function modelLoaded(value) {
      return mobileCaller.call('onLoadModel(' + value + ')');
    },
    machineParamsLoaded: function machineParamsLoaded(value) {
      return mobileCaller.call('onMachineParamsResult(' + value + ')');
    },
    objectFitsPrintableVolume: function objectFitsPrintableVolume(value) {
      return mobileCaller.call('objectFitsPrintableVolume(' + value + ')');
    }
  };
}

},{}],202:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = detectPlatform;
function detectPlatform() {
  var userAgent = window.navigator.userAgent.toLowerCase();
  var safari = /safari/.test(userAgent);
  var ios = /iphone|ipod|ipad/.test(userAgent);

  if (ios) {
    if (safari) {
      // browser
    } else if (!safari) {
      // webview
    }
    return 'ios';
  } else {
    // not iOS
    return 'android';
  }
}

},{}],203:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makeInterface;

var _detector = require('./detector');

var _detector2 = _interopRequireDefault(_detector);

var _androidInterface = require('./androidInterface');

var _iosInterface = require('./iosInterface');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function makeInterface() {
  //console.log('platform', detectPlatform())
  var platform = (0, _detector2.default)();
  var actions = platform === 'ios' ? (0, _iosInterface.makeIosInterface)() : (0, _androidInterface.makeAndroidInterface)();
  return actions;
}

},{"./androidInterface":201,"./detector":202,"./iosInterface":204}],204:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeIosInterface = makeIosInterface;
function callNativeApp(path, payload) {
  try {
    //console.log('calling native app', path, payload)
    window.webkit.messageHandlers[path].postMessage(payload);
  } catch (err) {
    // console.log('Not native')
  }
}

function makeIosInterface() {
  return {
    viewerReady: function viewerReady(value) {
      return callNativeApp('viewer', 'ready');
    }, //(v${value})`),
    modelLoaded: function modelLoaded(value) {
      return callNativeApp('loadModel', value ? 'success' : 'error');
    },
    machineParamsLoaded: function machineParamsLoaded(value) {
      return callNativeApp('machineParams', value ? 'success' : 'error');
    },
    objectFitsPrintableVolume: function objectFitsPrintableVolume(value) {
      return callNativeApp('objectFitsPrintableVolume', '' + value);
    }
  };
}

},{}],205:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = computeTMatrixFromTransforms;

var _glMat = require('gl-mat4');

var _glMat2 = _interopRequireDefault(_glMat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*compute  object transformation matrix from transforms: costly : only do it when changes happened*/
function computeTMatrixFromTransforms(params) {
  var defaults = {
    pos: [0, 0, 0],
    rot: [0, 0, 0],
    sca: [1, 1, 1]
  };

  var _Object$assign = Object.assign({}, defaults, params);

  var pos = _Object$assign.pos;
  var rot = _Object$assign.rot;
  var sca = _Object$assign.sca;
  // create transform matrix

  var transforms = _glMat2.default.identity([]);
  _glMat2.default.translate(transforms, transforms, pos); // [pos[0], pos[2], pos[1]]// z up
  _glMat2.default.rotateX(transforms, transforms, rot[0]);
  _glMat2.default.rotateY(transforms, transforms, rot[1]);
  _glMat2.default.rotateZ(transforms, transforms, rot[2]);
  _glMat2.default.scale(transforms, transforms, sca); // [sca[0], sca[2], sca[1]])

  return transforms;
}

},{"gl-mat4":29}],206:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = centerGeometry;

var _glMat = require('gl-mat4');

var _glMat2 = _interopRequireDefault(_glMat);

var _glVec = require('gl-vec3');

var _glVec2 = _interopRequireDefault(_glVec);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * center the geometry of an object around the zero of the given axes
 * WARNING ! this mutates the original geometric data !
 * @param  {Object} geometry object containing positions data (flat array, flat typed array)
 * @param  {String} bounds the current bounds of the entity
 * @param  {String} axes on which axes to apply the transformation (default: [0, 0, 1])
 * @return {Object}      the modified geometry, centered
 */
function centerGeometry(geometry, bounds, transforms) {
  var axes = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [1, 1, 1];

  var translation = [-0.5 * (bounds.min[0] / transforms.sca[0] + bounds.max[0] / transforms.sca[0]) * axes[0], -0.5 * (bounds.min[1] / transforms.sca[1] + bounds.max[1] / transforms.sca[1]) * axes[1], -0.5 * (bounds.min[2] / transforms.sca[2] + bounds.max[2] / transforms.sca[2]) * axes[2]];
  var translateMat = _glMat2.default.create();
  translateMat = _glMat2.default.translate(translateMat, translateMat, translation);

  // taken almost verbatim from https://github.com/wwwtyro/geo-3d-transform-mat4/blob/master/index.js
  function transform(positions, translateMat) {
    for (var i = 0; i < positions.length; i += 3) {
      var newPos = _glVec2.default.fromValues(positions[i], positions[i + 1], positions[i + 2]);
      _glVec2.default.transformMat4(newPos, newPos, translateMat);
      positions[i] = newPos[0];
      positions[i + 1] = newPos[1];
      positions[i + 2] = newPos[2];
    }
    /*var oldfmt = geoid.identify(positions)
     var newpos = geoconv.convert(positions, geoid.ARRAY_OF_ARRAYS, 3)
     for (var i = 0; i < newpos.length; i++) {
         vec3.transformMat4(newpos[i], newpos[i], m)
     }
     newpos = geoconv.convert(newpos, oldfmt, 3)
     return newpos*/
  }

  transform(geometry.positions, translateMat);
  return geometry;
}

},{"gl-mat4":29,"gl-vec3":55}],207:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = computeNormalsFromUnindexedPositions;

var _glVec = require('gl-vec3');

var _glVec2 = _interopRequireDefault(_glVec);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function computeNormalsFromUnindexedPositions(positions) {
  var normals = new Float32Array(positions.length);
  var pointA = void 0;
  var pointB = void 0;
  var pointC = void 0;
  var cb = void 0;
  var ab = void 0;

  for (var i = 0, il = positions.length; i < il; i += 9) {
    pointA = _glVec2.default.fromValues(positions[i], positions[i + 1], positions[i + 2]);
    pointB = _glVec2.default.fromValues(positions[i + 3], positions[i + 4], positions[i + 5]);
    pointC = _glVec2.default.fromValues(positions[i + 6], positions[i + 7], positions[i + 8]);

    cb = _glVec2.default.subtract([], pointC, pointB);
    ab = _glVec2.default.subtract([], pointA, pointB);
    cb = _glVec2.default.cross(cb, cb, ab);
    cb = _glVec2.default.normalize(cb, cb); // normalize

    normals[i] = cb[0];
    normals[i + 1] = cb[1];
    normals[i + 2] = cb[2];

    normals[i + 3] = cb[0];
    normals[i + 4] = cb[1];
    normals[i + 5] = cb[2];

    normals[i + 6] = cb[0];
    normals[i + 7] = cb[1];
    normals[i + 8] = cb[2];
  }

  return normals;
}

},{"gl-vec3":55}],208:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = doNormalsNeedComputing;
/**
 *very simple heuristic to determine whether or not normals for a given geometry
 * need to be (re)computed or not
 * @param  {Object} geometry geometry data just a pojo, CAN contain normals data
 * @param {Int} testLength how many normals to check for zero normals
 * @return {Boolean} boolean signifying whether normals need computing or not ...
*/
function doNormalsNeedComputing(geometry) {
  var testLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1000;

  var needsRecompute = true;
  if (!geometry.normals) {
    needsRecompute = true;
  } else {
    // we check the fist 1000 normals to see if they are set to 0
    for (var i = 0; i < Math.min(geometry.normals.length, testLength); i++) {
      if (geometry.normals[i] !== 0) {
        needsRecompute = false;
        break;
      }
    }
  }
  return needsRecompute;
}

},{}],209:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.model = model;

var _most = require('most');

function stateHelper(actions, updateFunctions) {
  var modifiers$ = Object.keys(actions).map(function (key) {
    var action = actions[key];
    var actionName = key.replace(/\$/g, '');
    var modifierFunction = updateFunctions[actionName];

    if (modifierFunction && action) {
      var mod$ = action.map(function (input) {
        return function (state) {
          state = modifierFunction(state, input); // call the adapted function
          return state;
        };
      });
      return mod$;
    }
  }).filter(function (e) {
    return e !== undefined;
  });

  return (0, _most.mergeArray)(modifiers$);
}

function smartStateFold(prev, curr) {
  // console.log("prev",prev,"cur",curr)
  if (typeof curr === 'function') {
    return curr(prev);
  } else if (typeof prev === 'function') {
    return prev(curr);
  } else {
    return prev;
  }
}

function model(defaults, actions, updateFunctions) {
  var source$ = (0, _most.just)(defaults);
  var modifications$ = stateHelper(actions, updateFunctions);
  return modifications$.merge(source$).scan(smartStateFold, defaults) // combine existing data with new one
  // .distinctUntilChanged()
  .multicast();
}

},{"most":116}],210:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // taken from https://github.com/briancavalier/most-behavior/blob/2888b2b69fe2c8e44617c611eb5fdaf512d52007/src/animationFrames.js


exports.animationFrames = animationFrames;
exports.rafStream = rafStream;

var _most = require('most');

var _create = require('@most/create');

var _create2 = _interopRequireDefault(_create);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function animationFrames() {
  return new _most.Stream(new AnimationFramesSource());
}

var recurse = function recurse(cancel, schedule) {
  return function (sink, scheduler) {
    var canceler = new Cancel(cancel);
    var onNext = function onNext(x) {
      sink.event(scheduler.now(), x);
      cancel.key = schedule(onNext);
    };
    cancel.key = schedule(onNext);

    return canceler;
  };
};

var _animationFrames = recurse(cancelAnimationFrame, requestAnimationFrame);

var AnimationFramesSource = function () {
  function AnimationFramesSource() {
    _classCallCheck(this, AnimationFramesSource);
  }

  _createClass(AnimationFramesSource, [{
    key: 'run',
    value: function run(sink, scheduler) {
      return _animationFrames(sink, scheduler);
    }
  }]);

  return AnimationFramesSource;
}();

var Cancel = function () {
  function Cancel(cancel) {
    _classCallCheck(this, Cancel);

    this.cancel = cancel;
    this.key = undefined;
  }

  _createClass(Cancel, [{
    key: 'dispose',
    value: function dispose() {
      this.cancel(this.key);
    }
  }]);

  return Cancel;
}();

/* alternative version */


function rafStream() {
  var stream = (0, _create2.default)(function (add, end, error) {
    function step(timestamp) {
      add(null);
      window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  });
  return stream;
}

},{"@most/create":1,"most":116}],211:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = callBackToStream;

var _create = require('@most/create');

var _create2 = _interopRequireDefault(_create);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function callBackToStream() {
  var addWrap = function addWrap() {};

  function callbackTest(externalData) {
    addWrap(externalData);
  }
  var callback = callbackTest;
  var stream = (0, _create2.default)(function (add, end, error) {
    addWrap = add;
  });
  return { stream: stream, callback: callback };
}

},{"@most/create":1}],212:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = limitFlow;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// LimtiFlow by Nathan Ridley(axefrog) from https://gist.github.com/axefrog/84ec77c5f620dab5cdb7dd61e6f1df0b
function limitFlow(period) {
  return function limitFlow(stream) {
    var source = new RateLimitSource(stream.source, period);
    return new stream.constructor(source);
  };
}

var RateLimitSource = function () {
  function RateLimitSource(source, period) {
    _classCallCheck(this, RateLimitSource);

    this.source = source;
    this.period = period;
  }

  _createClass(RateLimitSource, [{
    key: "run",
    value: function run(sink, scheduler) {
      return this.source.run(new RateLimitSink(this, sink, scheduler), scheduler);
    }
  }]);

  return RateLimitSource;
}();

var RateLimitSink = function () {
  function RateLimitSink(source, sink, scheduler) {
    _classCallCheck(this, RateLimitSink);

    this.source = source;
    this.sink = sink;
    this.scheduler = scheduler;
    this.nextTime = 0;
    this.buffered = void 0;
  }

  _createClass(RateLimitSink, [{
    key: "_run",
    value: function _run(t) {
      if (this.buffered === void 0) {
        return;
      }
      var x = this.buffered;
      var now = this.scheduler.now();
      var period = this.source.period;
      var nextTime = this.nextTime;
      this.buffered = void 0;
      this.nextTime = (nextTime + period > now ? nextTime : now) + period;
      this.sink.event(t, x);
    }
  }, {
    key: "event",
    value: function event(t, x) {
      var nothingScheduled = this.buffered === void 0;
      this.buffered = x;
      var task = new RateLimitTask(this);
      var nextTime = this.nextTime;
      if (t >= nextTime) {
        this.scheduler.asap(task);
      } else if (nothingScheduled) {
        var interval = this.nextTime - this.scheduler.now();
        this.scheduler.delay(interval, new RateLimitTask(this));
      }
    }
  }, {
    key: "end",
    value: function end(t, x) {
      this._run(t);
      this.sink.end(t, x);
    }
  }, {
    key: "error",
    value: function error(t, e) {
      this.sink.error(t, e);
    }
  }]);

  return RateLimitSink;
}();

var RateLimitTask = function () {
  function RateLimitTask(sink) {
    _classCallCheck(this, RateLimitTask);

    this.sink = sink;
  }

  _createClass(RateLimitTask, [{
    key: "run",
    value: function run(t) {
      if (this.disposed) {
        return;
      }
      this.sink._run(t);
    }
  }, {
    key: "error",
    value: function error(t, e) {
      if (this.disposed) {
        return;
      }
      this.sink.error(t, e);
    }
  }, {
    key: "dispose",
    value: function dispose() {
      this.disposed = true;
    }
  }]);

  return RateLimitTask;
}();

},{}],213:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = offsetTransformsByBounds;
/**
 * puts the object 'on top' of the plane(s) given by the specified axes
 * warning !! to get the expected result, the geometry of the object should be centered on [0,0,0]
 * @param  {Object} transforms the initial transforms ie {pos:[x, x, x], rot:[x, x, x], sca:[x, x, x]}.
 * @param  {String} bounds the current bounds of the entity
 * @param  {String} axes on which axes to apply the transformation (default: [0, 0, 1])
 * @return {Object}      a new transforms object, with offset position
 */
function offsetTransformsByBounds(transforms, bounds) {
  var axes = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [0, 0, 1];
  var pos = transforms.pos;

  var offsetPos = [0.5 * (bounds.max[0] - bounds.min[0]) * axes[0] + pos[0], 0.5 * (bounds.max[1] - bounds.min[1]) * axes[1] + pos[1], 0.5 * (bounds.max[2] - bounds.min[2]) * axes[2] + pos[2]];
  return Object.assign({}, transforms, { pos: offsetPos });
}

},{}],214:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = formatRawMachineData;
function formatRawMachineData(rawData) {
  return {
    name: rawData.name,
    machine_volume: [rawData.machine_width, rawData.machine_depth, rawData.machine_height],
    machine_head_with_fans_polygon: [], // rawData.machine_head_with_fans_polygon.default_value,
    machine_disallowed_areas: [], // rawData.machine_disallowed_areas.default_value,
    printable_area: rawData.printable_area
  };
}

},{}],215:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = entityPrep;

var _centerGeometry = require('../../common/utils/geometry/centerGeometry');

var _centerGeometry2 = _interopRequireDefault(_centerGeometry);

var _offsetTransformsByBounds = require('../../common/utils/offsetTransformsByBounds');

var _offsetTransformsByBounds2 = _interopRequireDefault(_offsetTransformsByBounds);

var _prepHelpers = require('./prepHelpers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* Pipeline:
  - data => process (normals computation, color format conversion) => (drawCall generation) => drawCall
  - every object with a fundamentall different 'look' (beyond what can be done with shader parameters) => different (VS) & PS
  - even if regl can 'combine' various uniforms, attributes, props etc, the rule above still applies
*/

function entityPrep(rawGeometry$) {
  //NOTE : rotation needs to be manually inverted , or an additional geometry transformation applied
  var addedEntities$ = rawGeometry$.map(function (geometry) {
    return {
      transforms: { pos: [0, 0, 0], rot: [0, 0, Math.PI], sca: [1, 1, 1] }, // [0.2, 1.125, 1.125]},
      geometry: geometry,
      visuals: {
        type: 'mesh',
        visible: true,
        color: [0.02, 0.7, 1, 1] // 07a9ff [1, 1, 0, 0.5],
      },
      meta: { id: 0 } };
  }).map(_prepHelpers.injectNormals).map(_prepHelpers.injectBounds).map(function (data) {
    var geometry = (0, _centerGeometry2.default)(data.geometry, data.bounds, data.transforms);
    return Object.assign({}, data, { geometry: geometry });
  }).map(function (data) {
    var transforms = Object.assign({}, data.transforms, (0, _offsetTransformsByBounds2.default)(data.transforms, data.bounds));
    var entity = Object.assign({}, data, { transforms: transforms });
    return entity;
  }).map(_prepHelpers.injectBounds) // we need to recompute bounds based on changes above
  .map(_prepHelpers.injectTMatrix).tap(function (entity) {
    return console.log('entity done processing', entity);
  }).multicast();

  return addedEntities$;
} // helpers

},{"../../common/utils/geometry/centerGeometry":206,"../../common/utils/offsetTransformsByBounds":213,"./prepHelpers":216}],216:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.injectBounds = injectBounds;
exports.injectTMatrix = injectTMatrix;
exports.injectNormals = injectNormals;

var _computeBounds = require('../../common/bounds/computeBounds');

var _computeBounds2 = _interopRequireDefault(_computeBounds);

var _computeTMatrixFromTransforms = require('../../common/utils/computeTMatrixFromTransforms');

var _computeTMatrixFromTransforms2 = _interopRequireDefault(_computeTMatrixFromTransforms);

var _computeNormalsFromUnindexedPositions = require('../../common/utils/geometry/computeNormalsFromUnindexedPositions');

var _computeNormalsFromUnindexedPositions2 = _interopRequireDefault(_computeNormalsFromUnindexedPositions);

var _doNormalsNeedComputing = require('../../common/utils/geometry/doNormalsNeedComputing');

var _doNormalsNeedComputing2 = _interopRequireDefault(_doNormalsNeedComputing);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// inject bounding box(& co) data
function injectBounds(entity) {
  var bounds = (0, _computeBounds2.default)(entity);
  var result = Object.assign({}, entity, { bounds: bounds });
  // console.log('data with bounds', result)
  return result;
}

// inject object transformation matrix : costly : only do it when changes happened to objects
function injectTMatrix(entity) {
  var modelMat = (0, _computeTMatrixFromTransforms2.default)(entity.transforms);
  var result = Object.assign({}, entity, { modelMat: modelMat });
  // console.log('result', result)
  return result;
}

// inject normals
function injectNormals(entity) {
  var geometry = entity.geometry;
  // FIXME: not entirely sure we should always recompute it, but we had cases of files with normals specified, but wrong
  // let tmpGeometry = reindex(geometry.positions)
  // geometry.normals = normals(tmpGeometry.cells, tmpGeometry.positions)

  geometry.normals = (0, _doNormalsNeedComputing2.default)(geometry) ? (0, _computeNormalsFromUnindexedPositions2.default)(geometry.positions) : geometry.normals;
  var result = Object.assign({}, entity, { geometry: geometry });
  return result;
}

},{"../../common/bounds/computeBounds":191,"../../common/utils/computeTMatrixFromTransforms":205,"../../common/utils/geometry/computeNormalsFromUnindexedPositions":207,"../../common/utils/geometry/doNormalsNeedComputing":208}],217:[function(require,module,exports){
'use strict';

var _render = require('./rendering/render');

var _render2 = _interopRequireDefault(_render);

var _orbitControls = require('../common/controls/orbitControls');

var _camera = require('../common/camera');

var _camera2 = _interopRequireDefault(_camera);

var _most = require('most');

var _limitFlow = require('../common/utils/most/limitFlow');

var _limitFlow2 = _interopRequireDefault(_limitFlow);

var _loader = require('./loader');

var _loader2 = _interopRequireDefault(_loader);

var _controlsStream = require('../common/controls/controlsStream');

var _controlsStream2 = _interopRequireDefault(_controlsStream);

var _pointerGestures = require('../common/interactions/pointerGestures');

var _elementSizing = require('../common/interactions/elementSizing');

var _adressBarDriver = require('./sideEffects/adressBarDriver');

var _adressBarDriver2 = _interopRequireDefault(_adressBarDriver);

var _isObjectOutsideBounds = require('../common/bounds/isObjectOutsideBounds');

var _isObjectOutsideBounds2 = _interopRequireDefault(_isObjectOutsideBounds);

var _entityPrep = require('./entities/entityPrep');

var _entityPrep2 = _interopRequireDefault(_entityPrep);

var _state = require('./state');

var _visualState = require('./visualState');

var _interface = require('../common/mobilePlatforms/interface');

var _interface2 = _interopRequireDefault(_interface);

var _nativeApiDriver = require('./sideEffects/nativeApiDriver');

var _nativeApiDriver2 = _interopRequireDefault(_nativeApiDriver);

var _appMetadataDriver = require('./sideEffects/appMetadataDriver');

var _appMetadataDriver2 = _interopRequireDefault(_appMetadataDriver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// perhaps needed for simplicity: npm module
// require('typedarray-methods')
var reglM = require('regl');
// use this one for server side render
// const regl = require('regl')(require('gl')(256, 256))
// use this one for rendering inside a specific canvas/element
// var regl = require('regl')(canvasOrElement)


// interactions

// import pickStream from '../common/picking/pickStream'

/* --------------------- */


// basic api

// ////////////
var _makeInterface = (0, _interface2.default)();

var viewerReady = _makeInterface.viewerReady;
var modelLoaded = _makeInterface.modelLoaded;
var objectFitsPrintableVolume = _makeInterface.objectFitsPrintableVolume;
var machineParamsLoaded = _makeInterface.machineParamsLoaded;

var nativeApi = (0, _nativeApiDriver2.default)();
var appMetadata = (0, _appMetadataDriver2.default)();

var regl = reglM({
  extensions: [
    //  'oes_texture_float', // FIXME: for shadows, is it widely supported ?
    // 'EXT_disjoint_timer_query'// for gpu benchmarking only
  ],
  profile: true
});

var container = document.querySelector('canvas');
/* --------------------- */

var modelUri$ = (0, _most.merge)(_adressBarDriver2.default, nativeApi.modelUri$).flatMapError(function (error) {
  // console.log('error', error)
  modelLoaded(false); // error)
  return (0, _most.just)(null);
}).filter(function (x) {
  return x !== null;
}).multicast();

var setMachineParams$ = (0, _most.merge)(nativeApi.machineParams$).flatMapError(function (error) {
  // console.log('error', error)
  machineParamsLoaded(false); // error)
  return (0, _most.just)(null);
}).filter(function (x) {
  return x !== null;
}).tap(function (e) {
  return machineParamsLoaded(true);
}).multicast();

var parsedSTL$ = modelUri$.flatMap(_loader2.default).flatMapError(function (error) {
  modelLoaded(false); // error)
  return (0, _most.just)(undefined);
}).filter(function (x) {
  return x !== undefined;
}).multicast();

var render = (0, _render2.default)(regl);
var addEntities$ = (0, _entityPrep2.default)(parsedSTL$);
var setEntityBoundsStatus$ = (0, _most.merge)(setMachineParams$, addEntities$.sample(function (x) {
  return x;
}, setMachineParams$));

var entities$ = (0, _state.makeEntitiesModel)({ addEntities: addEntities$, setEntityBoundsStatus: setEntityBoundsStatus$ });
var machine$ = (0, _state.makeMachineModel)({ setMachineParams: setMachineParams$ });

var appState$ = (0, _state.makeState)(machine$, entities$).forEach(function (x) {
  return x;
});

// interactions : camera controls
var baseInteractions$ = (0, _pointerGestures.interactionsFromEvents)(container);
var gestures = (0, _pointerGestures.pointerGestures)(baseInteractions$);
var focuses$ = addEntities$.map(function (nEntity) {
  var mid = nEntity.bounds.max.map(function (pos, idx) {
    return pos - nEntity.bounds.min[idx];
  });
  return mid;
});

var entityFocuses$ = addEntities$;
var projection$ = (0, _elementSizing.elementSize)(container);
/*baseInteractions$.taps
focuses.forEach(e=>console.log('tapping'))*/
var camState$ = (0, _controlsStream2.default)({ gestures: gestures }, { settings: _orbitControls.params, camera: _camera2.default }, focuses$, entityFocuses$, projection$);

var visualState$ = (0, _visualState.makeVisualState)(regl, machine$, entities$, camState$).multicast().flatMapError(function (error) {
  console.error('error in visualState', error);
  return (0, _most.just)(null);
}).filter(function (x) {
  return x !== null;
});

visualState$.thru((0, _limitFlow2.default)(33)).tap(function (x) {
  return regl.poll();
}).tap(render).flatMapError(function (error) {
  console.error('error in render', error);
  return (0, _most.just)(null);
}).forEach(function (x) {
  return x;
});

// boundsExceeded
var objectFitsPrintableVolume$ = (0, _most.combine)(function (entity, machineParams) {
  // console.log('objectFitsPrintableArea', entity, machineParams)
  return !(0, _isObjectOutsideBounds2.default)(machineParams, entity);
}, addEntities$, setMachineParams$).tap(function (e) {
  return console.log('objectFitsPrintableVolume??', e);
}).multicast();

// display app version, notify 'outside world the viewer is ready etc'
appMetadata.forEach(function (data) {
  viewerReady('\'' + data.version + '\'');
  console.info('Viewer version: ' + data.version);
});

// OUTPUTS (sink side effects)
addEntities$.forEach(function (m) {
  return modelLoaded(true);
}); // side effect => dispatch to callback)
objectFitsPrintableVolume$.forEach(objectFitsPrintableVolume); // dispatch message to signify out of bounds or not

// for testing only
var machineParams = {
  'name': 'ultimaker3_extended',
  'machine_width': 215,
  'machine_depth': 215,
  'machine_height': 300,
  'printable_area': [200, 200]
};

// for testing
// informations about the active machine
// window.nativeApi.setMachineParams(machineParams)

/*setTimeout(function () {
  window.nativeApi.setMachineParams(machineParams)
}, 2000)
setTimeout(function () {
  window.nativeApi.setModelUri( 'http://localhost:8080/data/sanguinololu_enclosure_full.stl')
}, 50)*/

},{"../common/bounds/isObjectOutsideBounds":192,"../common/camera":193,"../common/controls/controlsStream":196,"../common/controls/orbitControls":197,"../common/interactions/elementSizing":198,"../common/interactions/pointerGestures":199,"../common/mobilePlatforms/interface":203,"../common/utils/most/limitFlow":212,"./entities/entityPrep":215,"./loader":218,"./rendering/render":227,"./sideEffects/adressBarDriver":229,"./sideEffects/appMetadataDriver":230,"./sideEffects/nativeApiDriver":231,"./state":232,"./visualState":233,"most":116,"regl":148}],218:[function(require,module,exports){
(function (Buffer){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = loadTest;

var _uscoStlParser = require('usco-stl-parser');

var _uscoStlParser2 = _interopRequireDefault(_uscoStlParser);

var _fetchReadablestream = require('fetch-readablestream');

var _fetchReadablestream2 = _interopRequireDefault(_fetchReadablestream);

var _create = require('@most/create');

var _create2 = _interopRequireDefault(_create);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// import XhrStream from 'xhr-stream'
// require("web-streams-polyfill/dist/polyfill.min.js")
// import 'whatwg-fetch'
// import { ReadableStream } from "web-streams-polyfill"
var Duplex = require('stream').Duplex;
var Readable = require('stream').Readable;

function supportsXhrResponseType(type) {
  try {
    var tmpXhr = new XMLHttpRequest();
    tmpXhr.responseType = type;
    return tmpXhr.responseType === type;
  } catch (e) {/* IE throws on setting responseType to an unsupported value */}
  return false;
}

function supportsStreaming() {
  var fetchSupport = typeof Response !== 'undefined' && Response.prototype.hasOwnProperty('body');
  var mozChunkSupport = supportsXhrResponseType('moz-chunked-arraybuffer');
  return fetchSupport || mozChunkSupport;
}

function loadTest(uri) {
  // console.log(`loading model from: ${uri}`)
  var stlStream = (0, _uscoStlParser2.default)({ useWorker: true });

  var debugHelper = new Duplex({
    read: function read() {
      console.log('reading');
    },
    write: function write(chunk, encoding, next) {
      console.log('chunk in foo', chunk);
      next(null, Buffer(chunk));
    }
  });

  var HttpSourceStream = function (_Readable) {
    _inherits(HttpSourceStream, _Readable);

    function HttpSourceStream(uri) {
      _classCallCheck(this, HttpSourceStream);

      var _this = _possibleConstructorReturn(this, (HttpSourceStream.__proto__ || Object.getPrototypeOf(HttpSourceStream)).call(this));

      var reader = void 0;
      var self = _this;
      var finish = function finish() {
        return self.emit('finish');
      };
      var end = function end() {
        return self.emit('end');
      };
      var push = function push(data) {
        return self.push(data);
      };
      var emitError = function emitError(error) {
        self.emit('error', error);
      };

      var process = function process(data) {
        var value = data.value;
        var done = data.done;
        // console.log('SOURCE chunk', data , value, done)

        if (done) {
          end();
        } else {
          push(Buffer(value));
          return reader.read().then(process).catch(function (e) {
            return emitError(e);
          });
        }
      };

      function streams() {
        (0, _fetchReadablestream2.default)(uri).then(function (response) {
          reader = response.body.getReader();
          reader.read().then(process);
        }).catch(function (e) {
          emitError(e);
        });
      }

      _this.readyData;
      _this.lenToSend = undefined;

      function noStreams() {
        function onLoad(e) {
          console.log('onload', e.target.response);
          var value = Buffer(e.target.response);
          self.lenToSend = value.byteLength;
          self.readyData = value;

          push(value);
          push(null); // DO NOT fire some event, this way value => null are
          //handled in the correct order
        }

        function onError(e) {
          emitError(e);
        }

        var xhr = new XMLHttpRequest();
        xhr.responseType = 'arraybuffer';
        xhr.addEventListener('load', onLoad.bind(this));
        xhr.addEventListener('error', onError);
        xhr.open('GET', uri, true);
        xhr.send();
      }

      if (supportsStreaming()) {
        _this.streamMode = true;
        streams();
      } else {
        _this.streamMode = false;
        noStreams();
      }
      return _this;
    }

    _createClass(HttpSourceStream, [{
      key: '_read',
      value: function _read(size) {
        /*console.log('_read', size, this.lenToSend, this)
        // this.push(this.readyData)
        // setTimeout(this.end, 1,true) // don't call end directly !
        let ready = true
        if (this.streamMode) {
          return
        }
        while(ready) {
          if (size && this.lenToSend !== undefined && this.lenToSend > 0) {
            size = Math.min(size, this.readyData.length)
            const workChunk = this.readyData
            const chunk = workChunk.slice(0, size)
            ready = this.push(chunk)
            this.lenToSend -= size // this.lenToSend//size
            this.readyData = workChunk.slice(size)
            console.log('sent', chunk)
          } else {
            ready = false
          }
          console.log('here')
          if (this.lenToSend !== undefined && this.lenToSend <= 0) {
            console.log('done')
            ready = false
            // this.emit('end')
            setTimeout(this.end, 1, true) // don't call end directly !
          }
        }*/
        // signal the source that it can start again
      }
    }]);

    return HttpSourceStream;
  }(Readable);
  // return HttpSourceStream(uri).pipe(makeStlStream({useWorker: true}))


  return (0, _create2.default)(function (add, end, error) {
    function streamErrorHandler(_error) {
      error(_error);
    }

    new HttpSourceStream(uri).on('error', streamErrorHandler).pipe((0, _uscoStlParser2.default)({ useWorker: true })).on('error', streamErrorHandler).pipe((0, _uscoStlParser.concatStream)(function (data) {
      return add(data);
    })).on('error', streamErrorHandler);
  });
}

}).call(this,require("buffer").Buffer)
},{"@most/create":1,"buffer":8,"fetch-readablestream":15,"stream":149,"usco-stl-parser":175}],219:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = drawCuboid;

var _glMat = require('gl-mat4');

var _glMat2 = _interopRequireDefault(_glMat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

 // works in client & server
function drawCuboid(regl, params) {
  var size = params.size;

  var _size = _slicedToArray(size, 3);

  var width = _size[0];
  var length = _size[1];
  var height = _size[2];

  var halfWidth = width * 0.5;
  var halfLength = length * 0.5;
  var halfHeight = height * 0.5;

  var position = [-halfWidth, -halfLength, -halfHeight, halfWidth, -halfLength, -halfHeight, halfWidth, halfLength, -halfHeight, -halfWidth, halfLength, -halfHeight, -halfWidth, -halfLength, halfHeight, halfWidth, -halfLength, halfHeight, halfWidth, halfLength, halfHeight, -halfWidth, halfLength, halfHeight];

  // use this one for clean cube wireframe outline
  var cells = [0, 1, 2, 3, 0, 4, 5, 6, 7, 4, 5, 1, 2, 6, 7, 3];

  var normal = position.map(function (p) {
    return p / size;
  });

  return regl({
    vert: "precision mediump float;\n#define GLSLIFY 1\n\nuniform float camNear, camFar;\nuniform mat4 model, view, projection;\n\nattribute vec3 position;\nvarying vec3 fragNormal, fragPosition;\nvarying vec4 worldPosition;\n\nvec4 zBufferAdjust(vec4 glPosition, float camNear, float camFar)\n{\n  glPosition.z = 2.0*log(glPosition.w/camNear)/log(camFar/camNear) - 1.;\n  glPosition.z *= glPosition.w;\n  return glPosition;\n}\n\nvoid main() {\n  //fragNormal = normal;\n  fragPosition = position;\n  worldPosition = model * vec4(position, 1);\n  vec4 glPosition = projection * view * worldPosition;\n  gl_Position = glPosition;\n  //gl_Position = zBufferAdjust(glPosition, camNear, camFar);\n}\n",
    frag: "precision mediump float;\n#define GLSLIFY 1\n\nuniform vec4 color;\nvarying vec3 vnormal;\nvarying vec3 fragNormal, fragPosition;\n\nvoid main() {\n  gl_FragColor = color;\n}\n",

    attributes: {
      position: position,
      normal: normal },
    elements: cells,
    uniforms: {
      model: function model(context, props) {
        return props.model || _glMat2.default.identity([]);
      },
      color: regl.prop('color'),
      angle: function angle(_ref) {
        var tick = _ref.tick;
        return 0.01 * tick;
      }
    },
    primitive: 'line strip',
    lineWidth: 2,

    depth: {
      enable: true,
      mask: false,
      func: 'less',
      range: [0, 1]
    }
  });
}

},{"gl-mat4":29}],220:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = drawCuboidFromCoords;

var _glMat = require('gl-mat4');

var _glMat2 = _interopRequireDefault(_glMat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

 // works in client & server
function drawCuboidFromCoords(regl, params) {
  var coords = params.coords;
  var height = params.height;


  var position = coords.map(function (x) {
    return [].concat(_toConsumableArray(x), [0]);
  }).concat(coords.map(function (x) {
    return [].concat(_toConsumableArray(x), [height]);
  }));

  // use this one for clean cube wireframe outline
  var cells = [0, 1, 2, 3, 0, 4, 5, 6, 7, 4, 5, 1, 2, 6, 7, 3];

  var normal = position.map(function (p) {
    return 1;
  });

  return regl({
    vert: "precision mediump float;\n#define GLSLIFY 1\nattribute vec3 position;\nuniform mat4 model, view, projection;\nvarying vec3 fragNormal, fragPosition;\n\nvoid main() {\n //fragNormal = normal;\n fragPosition = position;\n gl_Position = projection * view * model * vec4(position, 1);\n}\n",
    frag: "precision mediump float;\n#define GLSLIFY 1\n\nuniform vec4 color;\nvarying vec3 vnormal;\nvarying vec3 fragNormal, fragPosition;\n\nvoid main() {\n  gl_FragColor = color;\n}\n",

    attributes: {
      position: position,
      normal: normal },
    elements: cells,
    uniforms: {
      model: function model(context, props) {
        return props.model || _glMat2.default.identity([]);
      },
      color: regl.prop('color'),
      angle: function angle(_ref) {
        var tick = _ref.tick;
        return 0.01 * tick;
      }
    },
    primitive: 'line strip',
    lineWidth: 3,

    depth: {
      enable: true,
      mask: false,
      func: 'less',
      range: [0, 1]
    },
    cull: {
      enable: true,
      face: 'front'
    }
  });
}

},{"gl-mat4":29}],221:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makeDrawEnclosure;

var _drawGrid = require('./drawGrid');

var _drawGrid2 = _interopRequireDefault(_drawGrid);

var _drawTri = require('./drawTri');

var _drawTri2 = _interopRequireDefault(_drawTri);

var _drawCuboid = require('./drawCuboid');

var _drawCuboid2 = _interopRequireDefault(_drawCuboid);

var _drawCuboidFromCoords = require('./drawCuboidFromCoords');

var _drawCuboidFromCoords2 = _interopRequireDefault(_drawCuboidFromCoords);

var _drawStaticMesh = require('./drawStaticMesh');

var _drawStaticMesh2 = _interopRequireDefault(_drawStaticMesh);

var _computeTMatrixFromTransforms = require('../../common/utils/computeTMatrixFromTransforms');

var _computeTMatrixFromTransforms2 = _interopRequireDefault(_computeTMatrixFromTransforms);

var _getBrandingSvgGeometry = require('../../branding/getBrandingSvgGeometry');

var _getBrandingSvgGeometry2 = _interopRequireDefault(_getBrandingSvgGeometry);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import getBrandingSvg from '../../branding/getBrandingSvg'
// import makeDrawImgPlane from './drawImgPlane'


function makeDrawEnclosure(regl, params) {
  var machine_disallowed_areas = params.machine_disallowed_areas;
  var machine_volume = params.machine_volume;
  var name = params.name;


  var drawGrid = (0, _drawGrid2.default)(regl, { size: machine_volume, ticks: 50, centered: true });
  var drawGridDense = (0, _drawGrid2.default)(regl, { size: machine_volume, ticks: 10, centered: true });
  var gridOffset = (0, _computeTMatrixFromTransforms2.default)({ pos: [0, 0, 0.1] });
  var gridOffsetD = (0, _computeTMatrixFromTransforms2.default)({ pos: [0, 0, 0.5] });

  var triSize = { width: 50, height: 20 };
  var drawTri = (0, _drawTri2.default)(regl, { width: triSize.width, height: triSize.height });
  var triMatrix = (0, _computeTMatrixFromTransforms2.default)({ pos: [-triSize.width / 2, machine_volume[1] * 0.5, 0.1] });

  var containerSize = [machine_volume[0], machine_volume[1], machine_volume[2]];
  var drawCuboid = (0, _drawCuboid2.default)(regl, { size: containerSize });
  var containerCuboidMatrix = (0, _computeTMatrixFromTransforms2.default)({ pos: [0, 0, machine_volume[2] * 0.5] });

  var buildPlaneGeo = {
    positions: [[-1, +1, 0], [+1, +1, 0], [+1, -1, 0], [-1, -1, 0]],
    cells: [[2, 1, 0], [2, 0, 3]]
  };
  var planeReducer = 0.5; // fudge value in order to prevent overlaps with bounds (z fighting)
  var buildPlaneModel = (0, _computeTMatrixFromTransforms2.default)({ pos: [0, 0, -0.15], sca: [machine_volume[0] * 0.5 - planeReducer, machine_volume[1] * 0.5 - planeReducer, 1] });
  var drawBuildPlane = (0, _drawStaticMesh2.default)(regl, {
    geometry: buildPlaneGeo,
    extras: {
      cull: {
        enable: true,
        face: 'back'
      }
    }
  });

  // branding
  // const logoTexure = svgStringAsReglTexture(regl, getBrandingSvg(name))
  // const logoPlane = makeDrawImgPlane(regl, {texture: logoTexure})
  // logoTexure.width * logoScale, logoTexure.height * logoScale
  var logoMatrix = (0, _computeTMatrixFromTransforms2.default)({ pos: [0, -machine_volume[1] * 0.5, 20], sca: [60, 60, 1], rot: [Math.PI / 2, Math.PI, 0] });
  var logoMesh = (0, _getBrandingSvgGeometry2.default)(name);
  if (!logoMesh) console.warn('no logo found for machine called: \'' + name + '\' ');
  var drawLogoMesh = logoMesh ? (0, _drawStaticMesh2.default)(regl, { geometry: logoMesh }) : function () {};

  // const logoMesh = svgStringAsGeometry(logoImg)
  //const dissalowedVolumes = machine_disallowed_areas
  //  .map((area) => drawCuboidFromCoords(regl, {height: machine_volume[2], coords: area}))

  return function (_ref) {
    var view = _ref.view;
    var camera = _ref.camera;

    drawGrid({ view: view, camera: camera, color: [0, 0, 0, 0.2], model: gridOffset });
    drawGridDense({ view: view, camera: camera, color: [0, 0, 0, 0.06], model: gridOffsetD });

    // drawTri({view, camera, color: [0, 0, 0, 0.5], model: triMatrix})
    drawBuildPlane({ view: view, camera: camera, color: [1, 1, 1, 1], model: buildPlaneModel });
    drawCuboid({ view: view, camera: camera, color: [0, 0, 0.0, 0.5], model: containerCuboidMatrix });
    // dissalowedVolumes.forEach(x => x({view, camera, color: [1, 0, 0, 1]}))
    // logoPlane({view, camera, color: [0.4, 0.4, 0.4, 1], model: logoMatrix2})
    drawLogoMesh({ view: view, camera: camera, color: [0, 0, 0, 0.5], model: logoMatrix });
  };
}

// import svgStringAsReglTexture from '../../common/utils/image/svgStringAsReglTexture'
// import svgStringAsGeometry from '../../common/utils/geometry/svgStringAsGeometry'

},{"../../branding/getBrandingSvgGeometry":186,"../../common/utils/computeTMatrixFromTransforms":205,"./drawCuboid":219,"./drawCuboidFromCoords":220,"./drawGrid":222,"./drawStaticMesh":224,"./drawTri":226}],222:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = prepareDrawGrid;

var _glMat = require('gl-mat4');

var _glMat2 = _interopRequireDefault(_glMat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

 // works in client & server
function prepareDrawGrid(regl) {
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var positions = [];
  var infinite = params.infinite || false;
  var centered = params.centered || false;

  var size = params.size;
  var ticks = params.ticks;

  ticks = ticks || 1;
  size = size || [16, 16];

  var width = size[0];
  var length = size[1];

  if (centered) {
    var halfWidth = width * 0.5;
    var halfLength = length * 0.5;

    var remWidth = halfWidth % ticks;
    var widthStart = -halfWidth + remWidth;
    var widthEnd = -widthStart;

    var remLength = halfLength % ticks;
    var lengthStart = -halfLength + remLength;
    var lengthEnd = -lengthStart;

    var skipEvery = 0;

    for (var i = widthStart, j = 0; i <= widthEnd; i += ticks, j += 1) {
      if (j % skipEvery !== 0) {
        positions.push(lengthStart, i, 0);
        positions.push(lengthEnd, i, 0);
        positions.push(lengthStart, i, 0);
      }
    }
    for (var _i = lengthStart, _j = 0; _i <= lengthEnd; _i += ticks, _j += 1) {
      if (_j % skipEvery !== 0) {
        positions.push(_i, widthStart, 0);
        positions.push(_i, widthEnd, 0);
        positions.push(_i, widthStart, 0);
      }
    }
  } else {
    for (var _i2 = -width * 0.5; _i2 <= width * 0.5; _i2 += ticks) {
      positions.push(-length * 0.5, _i2, 0);
      positions.push(length * 0.5, _i2, 0);
      positions.push(-length * 0.5, _i2, 0);
    }

    for (var _i3 = -length * 0.5; _i3 <= length * 0.5; _i3 += ticks) {
      positions.push(_i3, -width * 0.5, 0);
      positions.push(_i3, width * 0.5, 0);
      positions.push(_i3, -width * 0.5, 0);
    }
  }

  var frag = infinite ? "precision mediump float;\n#define GLSLIFY 1\nuniform vec4 color;\nvarying vec3 fragNormal, fragPosition;\nvarying vec4 worldPosition;\n\n#define FOG_DENSITY 0.03\nfloat fogFactorExp(\n  const float dist,\n  const float density\n) {\n  return 1.0 - clamp(exp(-density * dist), 0.0, 1.0);\n}\n\nuniform vec4 fogColor;\n\nvoid main() {\n  float fogDistance = gl_FragCoord.z / gl_FragCoord.w;\n  float fogAmount = fogFactorExp(fogDistance * 0.1, FOG_DENSITY);\n\n  float dist = distance( vec2(0.,0.), vec2(worldPosition.x,worldPosition.y));\n  dist *= 0.0016;\n  dist = clamp(dist, 0.0, 1.0);\n  //0 ===> 200\n  //\n  //vec4 col = vec4(fogColor.r, color.g, color.b, 0.);\n  //gl_FragColor = col;//mix(color, fogColor, fogAmount);\n  gl_FragColor = mix(color, fogColor, dist);\n}\n" : "precision mediump float;\n#define GLSLIFY 1\nvarying vec3  fragPosition;\nuniform vec4 color;\nvoid main() {\n  gl_FragColor = color;\n}\n";

  return regl({
    vert: "precision mediump float;\n#define GLSLIFY 1\n\nuniform float camNear, camFar;\nuniform mat4 model, view, projection;\n\nattribute vec3 position;\nvarying vec3 fragNormal, fragPosition;\nvarying vec4 worldPosition;\n\nvec4 zBufferAdjust(vec4 glPosition, float camNear, float camFar)\n{\n  glPosition.z = 2.0*log(glPosition.w/camNear)/log(camFar/camNear) - 1.;\n  glPosition.z *= glPosition.w;\n  return glPosition;\n}\n\nvoid main() {\n  //fragNormal = normal;\n  fragPosition = position;\n  worldPosition = model * vec4(position, 1);\n  vec4 glPosition = projection * view * worldPosition;\n  gl_Position = glPosition;\n  //gl_Position = zBufferAdjust(glPosition, camNear, camFar);\n}\n",
    frag: frag,

    attributes: {
      position: regl.buffer(positions)
    },
    count: positions.length / 3,
    uniforms: {
      model: function model(context, props) {
        return props.model || _glMat2.default.identity([]);
      },
      view: function view(context, props) {
        return props.view;
      },
      _projection: function _projection(context, props) {
        return _glMat2.default.ortho([], -300, 300, 350, -350, 0.01, 1000);
      },
      color: regl.prop('color'),
      fogColor: function fogColor(context, props) {
        return props.fogColor || [1, 1, 1, 1];
      }
    },
    lineWidth: 2,
    primitive: 'lines',
    cull: {
      enable: true,
      face: 'front'
    },
    polygonOffset: {
      enable: true,
      offset: {
        factor: 1,
        units: Math.random() * 10
      }
    }

  });
}

},{"gl-mat4":29}],223:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = drawPrintheadShadow;

var _glMat = require('gl-mat4');

var _glMat2 = _interopRequireDefault(_glMat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

 // works in client & server
function drawPrintheadShadow(regl, params) {
  var width = params.width;
  var length = params.length;

  var halfWidth = width * 0.5;
  var halfLength = length * 0.5;

  return regl({
    vert: "precision mediump float;\n#define GLSLIFY 1\nattribute vec3 position, normal;\nuniform mat4 model, view, projection;\nvarying vec3 fragNormal, fragPosition;\n\nvoid main() {\n fragNormal = normal;\n fragPosition = position;\n gl_Position = projection * view * model * vec4(position, 1);\n}\n",
    frag: "precision mediump float;\n#define GLSLIFY 1\nvarying vec3 fragPosition;\nuniform vec4 color;\n\nvoid main() {\n  gl_FragColor = color;\n}\n",

    attributes: {
      position: [-halfWidth, -halfLength, 0, halfWidth, -halfLength, 0, halfWidth, halfLength, 0, -halfWidth, halfLength, 0],
      normal: [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]
    },
    elements: [0, 1, 3, 3, 1, 2],
    // count: 4,
    uniforms: {
      model: function model(context, props) {
        return props.model || _glMat2.default.identity([]);
      },
      color: regl.prop('color')
    },
    cull: {
      enable: true,
      face: 'back'
    },
    polygonOffset: {
      enable: true,
      offset: {
        factor: 1,
        units: Math.random() * 10
      }
    }
  });
}

},{"gl-mat4":29}],224:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = drawMesh;

var _glMat = require('gl-mat4');

var _glMat2 = _interopRequireDefault(_glMat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

 // works in client & server
function drawMesh(regl) {
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { extras: {} };
  var prop = regl.prop;
  var buffer = regl.buffer;
  var geometry = params.geometry;

  var commandParams = {
    vert: "precision mediump float;\n#define GLSLIFY 1\n\nuniform float camNear, camFar;\nuniform mat4 model, view, projection;\n\nattribute vec3 position;\nvarying vec3 fragNormal, fragPosition;\nvarying vec4 worldPosition;\n\nvec4 zBufferAdjust(vec4 glPosition, float camNear, float camFar)\n{\n  glPosition.z = 2.0*log(glPosition.w/camNear)/log(camFar/camNear) - 1.;\n  glPosition.z *= glPosition.w;\n  return glPosition;\n}\n\nvoid main() {\n  //fragNormal = normal;\n  fragPosition = position;\n  worldPosition = model * vec4(position, 1);\n  vec4 glPosition = projection * view * worldPosition;\n  gl_Position = glPosition;\n  //gl_Position = zBufferAdjust(glPosition, camNear, camFar);\n}\n",
    frag: "precision mediump float;\n#define GLSLIFY 1\nvarying vec3 fragPosition;\nuniform vec4 color;\n\nvoid main() {\n  gl_FragColor = color;\n}\n",

    uniforms: {
      model: function model(context, props) {
        return props.model || _glMat2.default.identity([]);
      },
      color: prop('color')
    },
    attributes: {
      position: buffer(geometry.positions)
    },
    elements: geometry.cells,
    cull: {
      enable: false,
      face: 'front'
    }
  };

  // Splice in any extra params
  commandParams = Object.assign({}, commandParams, params.extras);
  return regl(commandParams);
}

},{"gl-mat4":29}],225:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = drawMesh;

var _glMat = require('gl-mat4');

var _glMat2 = _interopRequireDefault(_glMat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

 // works in client & server
function drawMesh(regl) {
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { extras: {} };
  var prop = regl.prop;
  var buffer = regl.buffer;
  var geometry = params.geometry;

  var commandParams = {
    vert: "precision mediump float;\n#define GLSLIFY 1\n\nuniform float camNear, camFar;\nuniform mat4 model, view, projection;\n\nattribute vec3 position, normal;\n\nvarying vec3 fragNormal, fragPosition;\nvarying vec4 _worldSpacePosition;\n\nvec4 zBufferAdjust(vec4 glPosition, float camNear, float camFar)\n{\n  glPosition.z = 2.0*log(glPosition.w/camNear)/log(camFar/camNear) - 1.;\n  glPosition.z *= glPosition.w;\n  return glPosition;\n}\n\nvoid main() {\n  fragPosition = position;\n  fragNormal = normal;\n  vec4 worldSpacePosition = model * vec4(position, 1);\n  _worldSpacePosition = worldSpacePosition;\n  //gl_Position = projection * view * worldSpacePosition;\n\n  vec4 glPosition = projection * view * model * vec4(position, 1);\n  gl_Position = glPosition;\n  //gl_Position = zBufferAdjust(glPosition, camNear, camFar);\n}\n",
    frag: "/*precision mediump float;\n\nuniform vec4 color;\nvarying vec3 vnormal;\nvarying vec3 fragNormal, fragPosition;\n\nvoid main() {\n  //gl_FragColor = color;\n  gl_FragColor = vec4(abs(fragNormal), 1.0);\n}*/\n\nprecision mediump float;\n#define GLSLIFY 1\nvarying vec3 fragNormal;\nuniform float ambientLightAmount;\nuniform float diffuseLightAmount;\nuniform vec4 color;\nuniform vec3 lightDir;\nuniform vec3 opacity;\n\nvarying vec4 _worldSpacePosition;\n\nuniform vec2 printableArea;\n\nvec4 errorColor = vec4(0.15, 0.15, 0.15, 0.3);//vec4(0.15, 0.15, 0.15, 0.3);\n\nvoid main () {\n  vec4 depth = gl_FragCoord;\n\n  float v = 0.8; // shadow value\n  vec4 endColor = color;\n\n  //if anything is outside the printable area, shade differently\n  /*if(_worldSpacePosition.x>printableArea.x*0.5 || _worldSpacePosition.x<-printableArea.x*0.5){\n    endColor = errorColor;\n  }\n  if(_worldSpacePosition.y>printableArea.y*0.5 || _worldSpacePosition.y<printableArea.y*-0.5) {\n    endColor = errorColor;\n  }*/\n\n  vec3 ambient = ambientLightAmount * endColor.rgb;\n  float cosTheta = dot(fragNormal, lightDir);\n  vec3 diffuse = diffuseLightAmount * endColor.rgb * clamp(cosTheta , 0.0, 1.0 );\n\n  float cosTheta2 = dot(fragNormal, vec3(-lightDir.x, -lightDir.y, lightDir.z));\n  vec3 diffuse2 = diffuseLightAmount * endColor.rgb * clamp(cosTheta2 , 0.0, 1.0 );\n\n  gl_FragColor = vec4((ambient + diffuse + diffuse2 * v), endColor.a);\n}\n",

    uniforms: {
      model: function model(context, props) {
        return props.model || _glMat2.default.identity([]);
      },
      color: prop('color'),
      printableArea: function printableArea(context, props) {
        return props.printableArea || [0, 0];
      }
    },
    attributes: {
      position: buffer(geometry.positions)
    },
    cull: {
      enable: true,
      face: 'back'
    }
  };
  if (geometry.cells) {
    commandParams.elements = geometry.cells;
  } else {
    commandParams.count = geometry.positions.length / 3;
  }

  if (geometry.normals) {
    commandParams.attributes.normal = buffer(geometry.normals);
  }
  // Splice in any extra params
  commandParams = Object.assign({}, commandParams, params.extras);
  return regl(commandParams);
}

},{"gl-mat4":29}],226:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = drawTri;

var _glMat = require('gl-mat4');

var _glMat2 = _interopRequireDefault(_glMat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

 // works in client & server
function drawTri(regl, params) {
  var width = params.width;
  var height = params.height;

  return regl({
    vert: "precision mediump float;\n#define GLSLIFY 1\n\nuniform float camNear, camFar;\nuniform mat4 model, view, projection;\n\nattribute vec3 position;\nvarying vec3 fragNormal, fragPosition;\nvarying vec4 worldPosition;\n\nvec4 zBufferAdjust(vec4 glPosition, float camNear, float camFar)\n{\n  glPosition.z = 2.0*log(glPosition.w/camNear)/log(camFar/camNear) - 1.;\n  glPosition.z *= glPosition.w;\n  return glPosition;\n}\n\nvoid main() {\n  //fragNormal = normal;\n  fragPosition = position;\n  worldPosition = model * vec4(position, 1);\n  vec4 glPosition = projection * view * worldPosition;\n  gl_Position = glPosition;\n  //gl_Position = zBufferAdjust(glPosition, camNear, camFar);\n}\n",
    frag: "precision mediump float;\n#define GLSLIFY 1\nvarying vec3 fragPosition;\nuniform vec4 color;\n\nvoid main() {\n  gl_FragColor = color;\n}\n",

    attributes: {
      position: [width / 2, height, 0, 0, 0, 0, width, 0, 0]
    },
    count: 3,
    uniforms: {
      model: function model(context, props) {
        return props.model || _glMat2.default.identity([]);
      },
      color: regl.prop('color')
    },
    cull: {
      enable: false,
      face: 'back'
    }
  });
}

},{"gl-mat4":29}],227:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = prepareRender;

var _wrapperScope = require('./wrapperScope');

var _wrapperScope2 = _interopRequireDefault(_wrapperScope);

var _drawPrintheadShadow = require('./drawPrintheadShadow');

var _drawPrintheadShadow2 = _interopRequireDefault(_drawPrintheadShadow);

var _computeTMatrixFromTransforms = require('../../common/utils/computeTMatrixFromTransforms');

var _computeTMatrixFromTransforms2 = _interopRequireDefault(_computeTMatrixFromTransforms);

var _index = require('./drawGrid/index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function prepareRender(regl, params) {
  var wrapperScope = (0, _wrapperScope2.default)(regl);
  var tick = 0;

  // infine grid, always there
  // infinite grid
  var gridSize = [1220, 1200]; // size of 'infinite grid'
  var drawInfiniGrid = (0, _index2.default)(regl, { size: gridSize, ticks: 10, infinite: true });
  var infiniGridOffset = (0, _computeTMatrixFromTransforms2.default)({ pos: [0, 0, -1.8] });

  var command = function command(props) {
    var entities = props.entities;
    var machine = props.machine;
    var camera = props.camera;
    var view = props.view;
    var background = props.background;
    var outOfBoundsColor = props.outOfBoundsColor;


    wrapperScope(props, function (context) {
      regl.clear({
        color: background,
        depth: 1
      });
      drawInfiniGrid({ view: view, camera: camera, color: [0, 0, 0, 0.1], fogColor: background, model: infiniGridOffset });

      entities.map(function (entity) {
        //use this for colors that change outside build area
        //const color = entity.visuals.color
        //const printableArea = machine ? machine.params.printable_area : [0, 0]
        //this one for single color for outside bounds
        var color = entity.bounds.outOfBounds ? outOfBoundsColor : entity.visuals.color;
        var printableArea = undefined;

        entity.visuals.draw({ view: view, camera: camera, color: color, model: entity.modelMat, printableArea: printableArea });
      });

      if (machine) {
        machine.draw({ view: view, camera: camera });
      }

      /*entities.map(function (entity) {
        const {pos} = entity.transforms
        const offset = pos[2]-entity.bounds.size[2]*0.5
        const model = _model({pos: [pos[0], pos[1], -0.1]})
        const headSize = [100,60]
        const width = entity.bounds.size[0]+headSize[0]
        const length = entity.bounds.size[1]+headSize[1]
         return makeDrawPrintheadShadow(regl, {width,length})({view, camera, model, color: [0.1, 0.1, 0.1, 0.15]})
      })*/
    });
  };

  return function render(data) {
    command(data);
    // boilerplate etc
    tick += 0.01;
    // for stats, resizing etc
    // regl.poll()
  };
}

},{"../../common/utils/computeTMatrixFromTransforms":205,"./drawGrid/index":222,"./drawPrintheadShadow":223,"./wrapperScope":228}],228:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = wrapperScope;

var _glMat = require('gl-mat4');

var _glMat2 = _interopRequireDefault(_glMat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function wrapperScope(regl) {
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var fbo = params.fbo;


  var commandParams = {
    cull: {
      enable: true
    },
    context: {
      lightDir: [0.39, 0.87, 0.29]
    },
    uniforms: {
      lightDir: function lightDir(context) {
        return context.lightDir;
      },
      lightColor: [1, 0.8, 0],
      lightView: function lightView(context) {
        return _glMat2.default.lookAt([], context.lightDir, [0.0, 0.0, 0.0], [0.0, 0.0, 1.0]);
      },
      lightProjection: _glMat2.default.ortho([], -25, 25, -20, 20, -25, 25),

      ambientLightAmount: 0.8,
      diffuseLightAmount: 0.9,
      view: function view(context, props) {
        return props.view;
      },
      projection: function projection(context, props) {
        return props.camera.projection;
      },
      camNear: function camNear(context, props) {
        return props.camera.near;
      },
      camFar: function camFar(context, props) {
        return props.camera.far;
      }
    },
    framebuffer: fbo
  };

  commandParams = Object.assign({}, commandParams, params.extras);
  return regl(commandParams);
}

},{"gl-mat4":29}],229:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _create = require('@most/create');

var _create2 = _interopRequireDefault(_create);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// this is a pseudo cycle.js driver
var adressBarDriver = (0, _create2.default)(function (add, end, error) {
  var url = window.location.href;

  function getParam(name, url) {
    if (!url) url = location.href;
    name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
    var regexS = '[\\?&]' + name + '=([^&#]*)';
    var regex = new RegExp(regexS);
    var results = regex.exec(url);
    return results == null ? null : results[1];
  }
  var params = getParam('modelUrl', url);
  add(params);
});

exports.default = adressBarDriver;

},{"@most/create":1}],230:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = appMetaDataDriver;

var _most = require('most');

/**
 * very simple driver/side effect expose the app's version (from the package.json file)
 * @return {Observable} observable with a single 'version' field as value
*/
function appMetaDataDriver() {
  var json = require('../../../package.json');
  var appMetadata$ = (0, _most.just)({
    version: json.version
  }).multicast();
  return appMetadata$;
}

},{"../../../package.json":185,"most":116}],231:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = nativeApiDriver;

var _callBackToStream = require('../../common/utils/most/callBackToStream');

var _callBackToStream2 = _interopRequireDefault(_callBackToStream);

var _formatRawMachineData = require('../../common/utils/printing/formatRawMachineData');

var _formatRawMachineData2 = _interopRequireDefault(_formatRawMachineData);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// setModelUri('http://localhost:8080/data/sanguinololu_enclosure_full.stl')
function nativeApiDriver(out$) {
  var makeModelUriFromCb = (0, _callBackToStream2.default)();
  var modelUri$ = makeModelUriFromCb.stream;

  var makeMachineParamsFromCb = (0, _callBackToStream2.default)();
  var machineParams$ = makeMachineParamsFromCb.stream.map(_formatRawMachineData2.default);
  // ugh but no choice
  window.nativeApi = {};
  window.nativeApi.setModelUri = makeModelUriFromCb.callback;
  window.nativeApi.setMachineParams = makeMachineParamsFromCb.callback;

  return {
    machineParams$: machineParams$,
    modelUri$: modelUri$ };
}

},{"../../common/utils/most/callBackToStream":211,"../../common/utils/printing/formatRawMachineData":214}],232:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeEntitiesModel = makeEntitiesModel;
exports.makeMachineModel = makeMachineModel;
exports.makeState = makeState;

var _modelUtils = require('../common/utils/modelUtils');

var _isObjectOutsideBounds = require('../common/bounds/isObjectOutsideBounds');

var _isObjectOutsideBounds2 = _interopRequireDefault(_isObjectOutsideBounds);

var _most = require('most');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function makeEntitiesModel(actions) {
  var defaults = [];
  function addEntities(state, inputs) {
    return state.concat([inputs]);
  }
  function setEntityColors(state, inputs) {
    return state.map(function (entity) {
      if (entity.meta.id === inputs.id) {
        var visuals = Object.assign({}, entity.visuals, { color: inputs.color });
        return Object.assign({}, entity, { visuals: visuals });
      }
      return entity;
    });
  }
  function setEntityBoundsStatus(state, input) {
    //console.log('setEntityBoundsStatus')
    return state.map(function (entity) {
      var outOfBounds = (0, _isObjectOutsideBounds2.default)(input, entity);
      var bounds = Object.assign({}, entity.bounds, { outOfBounds: outOfBounds });
      return Object.assign({}, entity, { bounds: bounds });
    });
  }
  var updateFunctions = { addEntities: addEntities, setEntityColors: setEntityColors, setEntityBoundsStatus: setEntityBoundsStatus };
  var state$ = (0, _modelUtils.model)(defaults, actions, updateFunctions);

  return state$.skipRepeats().multicast();
}

function makeMachineModel(actions) {
  var defaults = undefined;
  function setMachineParams(state, inputs) {
    var machine = { params: inputs };
    return machine;
  }
  var updateFunctions = { setMachineParams: setMachineParams };
  var state$ = (0, _modelUtils.model)(defaults, actions, updateFunctions);

  return state$.skipRepeats().multicast();
}

function makeState(machine$, entities$) {
  var appState$ = (0, _most.combineArray)(function (entities, machine) {
    return { entities: entities, machine: machine };
  }, [entities$, machine$]);
  return appState$;
}

},{"../common/bounds/isObjectOutsideBounds":192,"../common/utils/modelUtils":209,"most":116}],233:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeVisualState = makeVisualState;

var _most = require('most');

var _drawEnclosure = require('./rendering/drawEnclosure');

var _drawEnclosure2 = _interopRequireDefault(_drawEnclosure);

var _index = require('./rendering/drawStaticMesh2/index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function makeVisualState(regl, machine$, entities$, camState$) {
  var machineWithVisuals$ = machine$.map(function (machine) {
    if (machine !== undefined) {
      var draw = (0, _drawEnclosure2.default)(regl, machine.params);
      return Object.assign({}, machine, { draw: draw });
    }
  });

  var entitiesWithVisuals$ = entities$.map(function (entities) {
    return entities.map(function (data) {
      var geometry = data.geometry;
      var draw = (0, _index2.default)(regl, { geometry: geometry }); // one command per mesh, but is faster
      var visuals = Object.assign({}, data.visuals, { draw: draw });
      var entity = Object.assign({}, data, { visuals: visuals }); // Object.assign({}, data, {visuals: {draw}})
      return entity;
    });
  });

  // const outOfBoundsColor = [1., 0.6, 0.16, 1. ]//(red: 255, green: 140, blue: 16
  // const background = [1,1,1,1]

  var outOfBoundsColor = [0.15, 0.15, 0.15, 0.3];
  var background = [0.96, 0.96, 0.96, 1];
  return (0, _most.combineArray)(function (entities, machine, camera) {
    var view = camera.view;
    return { entities: entities, machine: machine, view: view, camera: camera, background: background, outOfBoundsColor: outOfBoundsColor };
  }, [entitiesWithVisuals$, machineWithVisuals$, camState$]);
}

},{"./rendering/drawEnclosure":221,"./rendering/drawStaticMesh2/index":225,"most":116}]},{},[217]);
