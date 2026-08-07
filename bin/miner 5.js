// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)


// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts == 'function';
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = typeof process == 'object' && typeof process.versions == 'object' && typeof process.versions.node == 'string';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (Module['ENVIRONMENT']) {
  throw new Error('Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var read_,
    readAsync,
    readBinary;

if (ENVIRONMENT_IS_SHELL) {

  if ((typeof process == 'object' && typeof require === 'function') || typeof window == 'object' || typeof importScripts == 'function') throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  if (typeof read != 'undefined') {
    read_ = read;
  }

  readBinary = (f) => {
    if (typeof readbuffer == 'function') {
      return new Uint8Array(readbuffer(f));
    }
    let data = read(f, 'binary');
    assert(typeof data == 'object');
    return data;
  };

  readAsync = (f, onload, onerror) => {
    setTimeout(() => onload(readBinary(f)));
  };

  if (typeof clearTimeout == 'undefined') {
    globalThis.clearTimeout = (id) => {};
  }

  if (typeof setTimeout == 'undefined') {
    // spidermonkey lacks setTimeout but we use it above in readAsync.
    globalThis.setTimeout = (f) => (typeof f == 'function') ? f() : abort();
  }

  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments;
  }

  if (typeof quit == 'function') {
    quit_ = (status, toThrow) => {
      // Unlike node which has process.exitCode, d8 has no such mechanism. So we
      // have no way to set the exit code and then let the program exit with
      // that code when it naturally stops running (say, when all setTimeouts
      // have completed). For that reason, we must call `quit` - the only way to
      // set the exit code - but quit also halts immediately.  To increase
      // consistency with node (and the web) we schedule the actual quit call
      // using a setTimeout to give the current stack and any exception handlers
      // a chance to run.  This enables features such as addOnPostRun (which
      // expected to be able to run code after main returns).
      setTimeout(() => {
        if (!(toThrow instanceof ExitStatus)) {
          let toLog = toThrow;
          if (toThrow && typeof toThrow == 'object' && toThrow.stack) {
            toLog = [toThrow, toThrow.stack];
          }
          err(`exiting due to exception: ${toLog}`);
        }
        quit(status);
      });
      throw toThrow;
    };
  }

  if (typeof print != 'undefined') {
    // Prefer to use print/printErr where they exist, as they usually work better.
    if (typeof console == 'undefined') console = /** @type{!Console} */({});
    console.log = /** @type{!function(this:Console, ...*): undefined} */ (print);
    console.warn = console.error = /** @type{!function(this:Console, ...*): undefined} */ (typeof printErr != 'undefined' ? printErr : print);
  }

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (typeof document != 'undefined' && document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
  // they are removed because they could contain a slash.
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf('/')+1);
  } else {
    scriptDirectory = '';
  }

  if (!(typeof window == 'object' || typeof importScripts == 'function')) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  // Differentiate the Web Worker from the Node Worker case, as reading must
  // be done differently.
  {
// include: web_or_worker_shell_read.js
read_ = (url) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  }

  if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = (url, onload, onerror) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  }

// end include: web_or_worker_shell_read.js
  }
} else
{
  throw new Error('environment detection error');
}

var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.error.bind(console);

// Merge back in the overrides
Object.assign(Module, moduleOverrides);
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = null;
checkIncomingModuleAPI();

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.

if (Module['arguments']) arguments_ = Module['arguments'];legacyModuleProp('arguments', 'arguments_');

if (Module['thisProgram']) thisProgram = Module['thisProgram'];legacyModuleProp('thisProgram', 'thisProgram');

if (Module['quit']) quit_ = Module['quit'];legacyModuleProp('quit', 'quit_');

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// Assertions on removed incoming Module JS APIs.
assert(typeof Module['memoryInitializerPrefixURL'] == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['pthreadMainPrefixURL'] == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['cdInitializerPrefixURL'] == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['filePackagePrefixURL'] == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['read'] == 'undefined', 'Module.read option was removed (modify read_ in JS)');
assert(typeof Module['readAsync'] == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
assert(typeof Module['readBinary'] == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
assert(typeof Module['setWindowTitle'] == 'undefined', 'Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)');
assert(typeof Module['TOTAL_MEMORY'] == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
legacyModuleProp('asm', 'wasmExports');
legacyModuleProp('read', 'read_');
legacyModuleProp('readAsync', 'readAsync');
legacyModuleProp('readBinary', 'readBinary');
legacyModuleProp('setWindowTitle', 'setWindowTitle');
var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js';
var ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js';
var JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js';
var OPFS = 'OPFS is no longer included by default; build with -lopfs.js';

var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

assert(!ENVIRONMENT_IS_NODE, "node environment detected but not enabled at build time.  Add 'node' to `-sENVIRONMENT` to enable.");

assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.");


// end include: shell.js
// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary; 
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];legacyModuleProp('wasmBinary', 'wasmBinary');

if (typeof WebAssembly != 'object') {
  abort('no native wasm support detected');
}

// include: base64Utils.js
// Converts a string of base64 into a byte array (Uint8Array).
function intArrayFromBase64(s) {

  var decoded = atob(s);
  var bytes = new Uint8Array(decoded.length);
  for (var i = 0 ; i < decoded.length ; ++i) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}
// end include: base64Utils.js
// Wasm globals

var wasmMemory;

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.

// Memory management

var HEAP,
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/** @type {!Float64Array} */
  HEAPF64;

function updateMemoryViews() {
  var b = wasmMemory.buffer;
  Module['HEAP8'] = HEAP8 = new Int8Array(b);
  Module['HEAP16'] = HEAP16 = new Int16Array(b);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(b);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(b);
  Module['HEAP32'] = HEAP32 = new Int32Array(b);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(b);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(b);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(b);
}

assert(!Module['STACK_SIZE'], 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time')

assert(typeof Int32Array != 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined,
       'JS engine does not provide full typed array support');

// If memory is defined in wasm, the user can't provide it, or set INITIAL_MEMORY
assert(!Module['wasmMemory'], 'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally');
assert(!Module['INITIAL_MEMORY'], 'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically');

// include: runtime_stack_check.js
// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with SAFE_HEAP and ASAN which also
  // monitor writes to address zero.
  if (max == 0) {
    max += 4;
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAPU32[((max)>>2)] = 0x02135467;
  HEAPU32[(((max)+(4))>>2)] = 0x89BACDFE;
  // Also test the global address 0 for integrity.
  HEAPU32[((0)>>2)] = 1668509029;
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  // See writeStackCookie().
  if (max == 0) {
    max += 4;
  }
  var cookie1 = HEAPU32[((max)>>2)];
  var cookie2 = HEAPU32[(((max)+(4))>>2)];
  if (cookie1 != 0x02135467 || cookie2 != 0x89BACDFE) {
    abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`);
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[((0)>>2)] != 0x63736d65 /* 'emsc' */) {
    abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
  }
}
// end include: runtime_stack_check.js
// include: runtime_assertions.js
// Endianness check
(function() {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) throw 'Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)';
})();

// end include: runtime_assertions.js
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;

function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  checkStackCookie();

  
if (!Module["noFSInit"] && !FS.init.initialized)
  FS.init();
FS.ignorePermissions = false;

TTY.init();
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  checkStackCookie();
  
  callRuntimeCallbacks(__ATMAIN__);
}

function postRun() {
  checkStackCookie();

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// include: runtime_math.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc

assert(Math.imul, 'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.fround, 'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.clz32, 'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.trunc, 'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
}

function addRunDependency(id) {
  runDependencies++;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval != 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(() => {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err('still waiting on run dependencies:');
          }
          err(`dependency: ${dep}`);
        }
        if (shown) {
          err('(end of list)');
        }
      }, 10000);
    }
  } else {
    err('warning: run dependency added without ID');
  }
}

function removeRunDependency(id) {
  runDependencies--;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    err('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

/** @param {string|number=} what */
function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  what = 'Aborted(' + what + ')';
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;
  EXITSTATUS = 1;

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // defintion for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// include: URIUtils.js
// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */
var isDataURI = (filename) => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');
// end include: URIUtils.js
function createExportWrapper(name) {
  return function() {
    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
    var f = wasmExports[name];
    assert(f, `exported native function \`${name}\` not found`);
    return f.apply(null, arguments);
  };
}

// include: runtime_exceptions.js
// end include: runtime_exceptions.js
var wasmBinaryFile;
  wasmBinaryFile = 'data:application/octet-stream;base64,AGFzbQEAAAABoQREYAF/AX9gAn9/AX9gAn9/AGABfwBgA39/fwF/YAN/f38AYAAAYAZ/f39/f38Bf2AEf39/fwBgAAF/YAV/f39/fwF/YAR/f39/AX9gBn9/f39/fwBgCH9/f39/f39/AX9gBX9/f39/AGAHf39/f39/fwBgB39/f39/f38Bf2ABfwF+YAABfmAFf35+fn4AYAN/fn8BfmAFf39/f34Bf2ACf38BfmAFf39+f38AYAR/f39/AX5gBn9/f39+fwF/YAp/f39/f39/f39/AGAHf39/f39+fgF/YAJ8fwF8YAR/fn5/AGAKf39/f39/f39/fwF/YAZ/f39/fn4Bf2AAAXxgAn9/AX1gAn9/AXxgA39/fwF+YAR/f39+AX5gBn98f39/fwF/YAJ+fwF/YAR+fn5+AX9gA39+fwF/YAN/f38BfWADf39/AXxgDH9/f39/f39/f39/fwF/YAV/f39/fAF/YAZ/f39/fH8Bf2AHf39/f35+fwF/YAt/f39/f39/f39/fwF/YA9/f39/f39/f39/f39/f38AYAh/f39/f39/fwBgAn9+AGACfn4Bf2ADf35+AGADfn9/AX9gAXwBfmACf3wAYAJ/fQBgAn5+AXxgAn5+AX1gAn9+AX9gA39/fgBgBH9/fn8BfmAGf39/fn9/AGAGf39/f39+AX9gCH9/f39/f35+AX9gCX9/f39/f39/fwF/YAJ+fwBgBH9+f38BfwLUBhoDZW52C19fY3hhX3Rocm93AAUDZW52I2Vtc2NyaXB0ZW5fd2Vic29ja2V0X3NlbmRfdXRmOF90ZXh0AAEDZW52GGVtc2NyaXB0ZW5fd2Vic29ja2V0X25ldwAAA2VudjJlbXNjcmlwdGVuX3dlYnNvY2tldF9zZXRfb25vcGVuX2NhbGxiYWNrX29uX3RocmVhZAALA2VudjVlbXNjcmlwdGVuX3dlYnNvY2tldF9zZXRfb25tZXNzYWdlX2NhbGxiYWNrX29uX3RocmVhZAALA2VudjNlbXNjcmlwdGVuX3dlYnNvY2tldF9zZXRfb25jbG9zZV9jYWxsYmFja19vbl90aHJlYWQACwNlbnYzZW1zY3JpcHRlbl93ZWJzb2NrZXRfc2V0X29uZXJyb3JfY2FsbGJhY2tfb25fdGhyZWFkAAsDZW52GmVtc2NyaXB0ZW5f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bl9idWlsdGluX21lbWFsaWduANcBC3NldFRlbXBSZXQwALwPFWVtc2NyaXB0ZW5fc3RhY2tfaW5pdAC+DxllbXNjcmlwdGVuX3N0YWNrX2dldF9mcmVlAL8PGWVtc2NyaXB0ZW5fc3RhY2tfZ2V0X2Jhc2UAwA8YZW1zY3JpcHRlbl9zdGFja19nZXRfZW5kAMEPCXN0YWNrU2F2ZQDCDwxzdGFja1Jlc3RvcmUAww8Kc3RhY2tBbGxvYwDEDxxlbXNjcmlwdGVuX3N0YWNrX2dldF9jdXJyZW50AMUPFV9fY3hhX2lzX3BvaW50ZXJfdHlwZQClDwxkeW5DYWxsX2ppamkAyw8OZHluQ2FsbF92aWlqaWkAzA8OZHluQ2FsbF9paWlpaWoAzQ8PZHluQ2FsbF9paWlpaWpqAM4PEGR5bkNhbGxfaWlpaWlpamoAzw8JxAYBAEEBC7YDrw8iIyQlJicoKSssLS4vMDEyQaYPNDU2Nzs8tg9UWV5fSUpLTE1OT1BRUmxtbm9wcXJzdHfJAcoBzQGMAo0CjgKQApkCoAKhAqMCpAKlAqcCqAKpAqoCsQKzArUCtgK3ArkCuwK6ArwC1wLZAtgC2gLmAucC6QLqAusC7ALtAu4C7wL0AvYC+AL5AvoC/AL+Av0C/wKSA5QDkwOVA8gDzQPmA9sD3gPhA+MD0QPXA9gDngKfAuQC5QLnA+kD6gPrA+UE5gTsBO0EgQWYBZoFmwWcBZ4FnwWmBacFqAWpBaoFrAWtBa8FsQWyBbcFuAW5BbsFvAXGBdQBmQjDCssKvgvBC8ULyAvLC84L0AvSC9QL1gvYC9oL3AveC7IKtgrHCt4K3wrgCuEK4grjCuQK5QrmCucKvgnyCvMK9gr5CvoK/Qr+CoALqQuqC60LrwuxC7MLtwurC6wLrguwC7ILtAu4C+IFxgrNCs4KzwrQCtEK0grUCtUK1wrYCtkK2grbCugK6QrqCusK7ArtCu4K7wqBC4ILhAuGC4cLiAuJC4sLjAuNC44LjwuQC5ELkguTC5QLlQuXC5kLmgubC5wLngufC6ALoQuiC6MLpAulC6YL4QXjBeQF5QXoBekF6gXrBewF8AXhC/EF/gWHBooGjQaQBpMGlgabBp4GoQbiC6gGsga3BrkGuwa9Br8GwQbFBscGyQbjC9oG4gbpBusG7QbvBvgG+gbk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DiEGIAIgB0GAgICAeHI2AhQgAiAGNgIMIAIgBDYCEAsCQCACQTBqIAFGDQAgBiACQTBqIAP8CgAAIAYgA2ohBgsgBkEAOgAAIAJBGGpBCGogAkEMakHQjAQQyw4iA0EIaiIGKAIANgIAIAIgAykCADcDGCADQgA3AgAgBkEANgIAIAAgAkEYaiABIAVqEMsOIgEpAgA3AgAgAEEIaiABQQhqIgAoAgA2AgAgAUIANwIAIABBADYCAAJAIAIsACNBf0oNACACKAIYEKwOCyACLAAXQX9KDQggAigCDBCsDgwICyADQQFqIQMgAS0AASEGIAFBAWohASAGDQALCyACQTBqEJoBIgFB8P///wdPDQcCQAJAAkAgAUELSQ0AIAFBD3JBAWoiBhCqDiEDIAAgBkGAgICAeHI2AgggACADNgIAIAAgATYCBCADIQAMAQsgACABOgALIAFFDQELIAAgAkEwaiAB/AoAAAsgACABakEAOgAADAULAkAgASgCCCIBLAALQQBIDQAgACABKQIANwIAIABBCGogAUEIaigCADYCAAwFCyAAIAEoAgAgASgCBBDCDgwECyAAQQU6AAsgAEEAOgAFIABBACgAn4AENgAAIABBBGpBAC0Ao4AEOgAADAMLIABBBjoACyAAQQA6AAYgAEEAKADIggQ2AAAgAEEEakEALwDMggQ7AAAMAgtBCBCJD0G9igQQuw5BvPsEQRoQAAALIABBADoABCAAQe7qseMGNgIAIABBBDoACwsgAkGwAmokAA8LIAJBDGoQHgALIAAQHgALvgQBB38jAEEQayICJAAgASgCACEDIABCADcDCCAAIAM2AgACQAJAAkACQAJAAkAgA0F9ag4DAAECAwtBDBCqDiEDAkAgASgCCCIBLAALQQBIDQAgAyABKQIANwIAIANBCGogAUEIaigCADYCACAAIAM2AggMBAsgAyABKAIAIAEoAgQQwg4gACADNgIIDAMLQQwQqg4hBCABKAIIIQEgBEEANgIIIARCADcCAAJAIAEoAgQiBSABKAIAIgFGDQAgBSABayIDQQR1IgZBgICAgAFPDQQgBCADEKoOIgM2AgQgBCADNgIAIAQgAyAGQQR0ajYCCANAIAMgARBqQRBqIQMgAUEQaiIBIAVHDQALIAQgAzYCBAsgACAENgIIDAILQQwQqg4hBCABKAII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akEIaiAAQQhqKAIANgIAIAMgACkCADcDwAEMAgsgA0HAAWogACgCACAAKAIEEMIODAELIANBCGoQeCADQcABakEIaiADQQhqIAAoAgAgACAALQALIgLAQQBIIgQbIAAoAgQgAiAEGxDGDiIAQQhqIgIoAgA2AgAgAyAAKQIANwPAASAAQgA3AgAgAkEANgIAIAMsABNBf0oNACADKAIIEKwOCwJAQeD/BC0AVQ0AQZShBSADKALAASADQcABaiADLQDLASIAwEEASCICGyADKALEASAAIAIbEB0aIAMoAsQBIAMtAMsBIgAgAMBBAEgiABsiAkUNACADKALAASADQcABaiAAGyACakF/ai0AAEEKRg0AIANBCGpBlKEFQQAoApShBUF0aigCAGoQ4QQgA0EIakGEqgUQ9gUiAEEKIAAoAgAoAhwRAQAhACADQQhqEMEKGkGUoQUgABDiAhpBlKEFEL8CGgsCQCABRQ0AQeD/BC0ARUH/AXFFDQAgA0G4nQRBIGoiADYCcCADQeCdBCgCBCIBNgIIIANBCGogAUF0aigCAGpB4J0EKAIINgIAIANBCGogAygCCEF0aigCAGoiASADQQhqQQRqIgIQ6AQgAUKAgICAcDcCSCADIAA2AnAgA0G4nQRBDGo2AggCQCACEMQDIgBB4P8EKAJIQeD/BEHIAGpB4P8EQdMAaiwAAEEASBtBERDBAw0AIANBCGogAygCCEF0aigCAGoiASABKAIQQQRyEOMECyADQfAAaiEBAkAgA0HMAGooAgBFDQAgA0EIaiADKALAASADQcABaiADLQDLASICwEEASCIEGyADKALEASACIAQbEB0aAkAgAygCxAEgAy0AywEiAiACwEEASCICGyIERQ0AIAMoAsABIANBwAFqIAIbIARqQX9qLQAAQQpGDQAgA0HMAWogA0EIaiADKAIIQXRqKAIAahDhBCADQcwBakGEqgUQ9gUiAkEKIAIoAgAoAhwRAQAhAiADQcwBahDBChogA0EIaiACEOICGiADQQhqEL8CGgsgABDJAw0AIANBCGogAygCCEF0aigCAGoiAiACKAIQQQRyEOMECyADQQAoAuCdBCICNgIIIANBCGogAkF0aigCAGpB4J0EKAIMNgIAIAAQyAMaIANBCGpB4J0EQQRqENYCGiABEJ4CGgsCQCADLADLAUF/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VCAKUBsNACADQgBSIAlCgICAgICAwICAf3wiC0KAgICAgIDAgIB/ViALQoCAgICAgMCAgH9RGw0BCwJAIAYgCkKAgICAgIDA//8AVCAKQoCAgICAgMD//wBRGw0AIAJCgICAgICAIIQhBCABIQMMAgsCQCADUCAJQoCAgICAgMD//wBUIAlCgICAgICAwP//AFEbDQAgBEKAgICAgIAghCEEDAILAkAgASAKQoCAgICAgMD//wCFhEIAUg0AQoCAgICAgOD//wAgAiADIAGFIAQgAoVCgICAgICAgICAf4WEUCIGGyEEQgAgASAGGyEDDAILIAMgCUKAgICAgIDA//8AhYRQDQECQCABIAqEQgBSDQAgAyAJhEIAUg0CIAMgAYMhAyAEIAKDIQQMAgsgAyAJhFBFDQAgASEDIAIhBAwBCyADIAEgAyABViAJIApWIAkgClEbIgcbIQkgBCACIAcbIgtC////////P4MhCiACIAQgBxsiAkIwiKdB//8BcSEIAkAgC0IwiKdB//8BcSIGDQAgBUHgAGogCSAKIAkgCiAKUCIGG3kgBkEGdK18pyIGQXFqENwBQRAgBmshBiAFQegAaikDACEKIAUpA2AhCQsgASADIAcbIQMgAkL///////8/gyEEAkAgCA0AIAVB0ABqIAMgBCADIAQgBFAiBxt5IAdBBnStfKciB0FxahDcAUEQIAdrIQggBUHYAGopAwAhBCAFKQNQIQMLIARCA4YgA0I9iIRCgICAgICAgASEIQEgCkIDhiAJQj2IhCEEIANCA4YhCiALIAKFIQMCQCAGIAhGDQACQCAGIAhrIgdB/wBNDQBCACEBQgEhCgwBCyAFQcAAaiAKIAFBgAEgB2sQ3AEgBUEwaiAKIAEgBxDmASAFKQMwIAUpA0AgBUHAAGpBCGopAwCEQgBSrYQhCiAFQTBqQQhqKQMAIQELIARCgICAgICAgASEIQwgCUIDhiEJAkACQCADQn9VDQBCACEDQgAhBCAJIAqFIAwgAYWEUA0CIAkgCn0hAiAMIAF9IAkgClStfSIEQv////////8DVg0BIAVBIGogAiAEIAIgBCAEUCIHG3kgB0EGdK18p0F0aiIHENwBIAYgB2shBiAFQShqKQMAIQQgBSkDICECDAELIAEgDHwgCiAJfCICIApUrXwiBEKAgICAgICACINQDQAgAkIBiCAEQj+GhCAKQgGDhCECIAZBAWohBiAEQgGIIQQLIAtCgICAgICAgICAf4MhCgJAIAZB//8BSA0AIApCgICAgICAwP//AIQhBEIAIQMMAQtBACEHAkACQCAGQQBMDQAgBiEHDAELIAVBEGogAiAEIAZB/wBqENwBIAUgAiAEQQEgBmsQ5gEgBSkDACAFKQMQIAVBEGpBCGopAwCEQgBSrYQhAiAFQQhqKQMAIQQLIAJCA4ggBEI9hoQhAyAHrUIwhiAEQgOIQv///////z+DhCAKhCEEIAKnQQdxIQYCQAJAAkACQAJAEOQBDgMAAQIDCyAEIAMgBkEES618IgogA1StfCEEAkAgBkEERg0AIAohAwwDCyAEIApCAYMiASAKfCIDIAFUrXwhBAwDCyAEIAMgCkIAUiAGQQBHca18IgogA1StfCEEIAohAwwBCyAEIAMgClAgBkEAR3GtfCIKIANUrXwhBCAKIQMLIAZFDQELEOUBGgsgACADNwMAIAAgBDcDCCAFQfAAaiQAC1MBAX4CQAJAIANBwABxRQ0AIAEgA0FAaq2GIQJCACEBDAELIANFDQAgAUHAACADa62IIAIgA60iBIaEIQIgASAEhiEBCyAAIAE3AwAgACACNwMIC+ABAgF/An5BASEEAkAgAEIAUiABQv///////////wCDIgVCgICAgICAwP//AFYgBUKAgICAgIDA//8AURsNACACQgBSIANC////////////AIMiBkKAgICAgIDA//8AViAGQoCAgICAgMD//wBRGw0AAkAgAiAAhCAGIAWEhFBFDQBBAA8LAkAgAyABg0IAUw0AQX8hBCAAIAJUIAEgA1MgASADURsNASAAIAKFIAEgA4WEQgBSDwtBfyEEIAAgAlYgASADVSABIANRGw0AIAAgAoUgASADhYRCAFIhBAsgBAvYAQIBfwJ+QX8hBAJAIABCAFIgAUL///////////8AgyIFQoCAgICAgMD//wBWIAVCgICAgICAwP//AFEbDQAgAkIAUiADQv///////////wCDIgZCgICAgICAwP//AFYgBkKAgICAgIDA//8AURsNAAJAIAIgAIQgBiAFhIRQRQ0AQQAPCwJAIAMgAYNCAFMNACAAIAJUIAEgA1MgASADURsNASAAIAKFIAEgA4WEQgBSDwsgACACViABIANVIAEgA1EbDQAgACAChSABIAOFhEIAUiEECyAEC+cQAgV/D34jAEHQAmsiBSQAIARC////////P4MhCiACQv///////z+DIQsgBCAChUKAgICAgICAgIB/gyEMIARCMIinQf//AXEhBgJAAkACQCACQjCIp0H//wFxIgdBgYB+akGCgH5JDQBBACEIIAZBgYB+akGBgH5LDQELAkAgAVAgAkL///////////8AgyINQoCAgICAgMD//wBUIA1CgICAgICAwP//AFEbDQAgAkKAgICAgIAghCEMDAILAkAgA1AgBEL///////////8AgyICQoCAgICAgMD//wBUIAJCgICAgICAwP//AFEbDQAgBEKAgICAgIAghCEMIAMhAQwCCwJAIAEgDUKAgICAgIDA//8AhYRCAFINAAJAIAMgAkKAgICAgIDA//8AhYRQRQ0AQgAhAUKAgICAgIDg//8AIQwMAwsgDEKAgICAgIDA//8AhCEMQgAhAQwCCwJAIAMgAkKAgICAgIDA//8AhYRCAFINAEIAIQEMAgsCQCABIA2EQgBSDQBCgICAgICA4P//ACAMIAMgAoRQGyEMQgAhAQwCCwJAIAMgAoRCAFINACAMQoCAgICAgMD//wCEIQxCACEBDAILQQAhCAJAIA1C////////P1YNACAFQcACaiABIAsgASALIAtQIggbeSAIQQZ0rXynIghBcWoQ3AFBECAIayEIIAVByAJqKQMAIQsgBSkDwAIhAQsgAkL///////8/Vg0AIAVBsAJqIAMgCiADIAogClAiCRt5IAlBBnStfKciCUFxahDcASAJIAhqQXBqIQggBUG4AmopAwAhCiAFKQOwAiEDCyAFQaACaiADQjGIIApCgICAgICAwACEIg5CD4aEIgJCAEKAgICAsOa8gvUAIAJ9IgRCABDoASAFQZACakIAIAVBoAJqQQhqKQMAfUIAIARCABDoASAFQYACaiAFKQOQAkI/iCAFQZACakEIaikDAEIBhoQiBEIAIAJCABDoASAFQfABaiAEQgBCACAFQYACakEIaikDAH1CABDoASAFQeABaiAFKQPwAUI/iCAFQfABakEIaikDAEIBhoQiBEIAIAJCABDoASAFQdABaiAEQgBCACAFQeABakEIaikDAH1CABDoASAFQcABaiAFKQPQAUI/iCAFQdABakEIaikDAEIBhoQiBEIAIAJCABDoASAFQbABaiAEQgBCACAFQcABakEIaikDAH1CABDoASAFQaABaiACQgAgBSkDsAFCP4ggBUGwAWpBCGopAwBCAYaEQn98IgRCABDoASAFQZABaiADQg+GQgAgBEIAEOgBIAVB8ABqIARCAEIAIAVBoAFqQQhqKQMAIAUpA6ABIgogBUGQAWpBCGopAwB8IgIgClStfCACQgFWrXx9QgAQ6AEgBUGAAWpCASACfUIAIARCABDoASAIIAcgBmtqIQYCQAJAIAUpA3AiD0IBhiIQIAUpA4ABQj+IIAVBgAFqQQhqKQMAIhFCAYaEfCINQpmTf3wiEkIgiCICIAtCgICAgICAwACEIhNCAYYiFEIgiCIEfiIVIAFCAYYiFkIgiCIKIAVB8ABqQQhqKQMAQgGGIA9CP4iEIBFCP4h8IA0gEFStfCASIA1UrXxCf3wiD0IgiCINfnwiECAVVK0gECAPQv////8PgyIPIAFCP4giFyALQgGGhEL/////D4MiC358IhEgEFStfCANIAR+fCAPIAR+IhUgCyANfnwiECAVVK1CIIYgEEIgiIR8IBEgEEIghnwiECARVK18IBAgEkL/////D4MiEiALfiIVIAIgCn58IhEgFVStIBEgDyAWQv7///8PgyIVfnwiGCARVK18fCIRIBBUrXwgESASIAR+IhAgFSANfnwiBCACIAt+fCILIA8gCn58Ig1CIIggBCAQVK0gCyAEVK18IA0gC1StfEIghoR8IgQgEVStfCAEIBggAiAVfiICIBIgCn58IgtCIIggCyACVK1CIIaEfCICIBhUrSACIA1CIIZ8IAJUrXx8IgIgBFStfCIEQv////////8AVg0AIBQgF4QhEyAFQdAAaiACIAQgAyAOEOgBIAFCMYYgBUHQAGpBCGopAwB9IAUpA1AiAUIAUq19IQogBkH+/wBqIQZCACABfSELDAELIAVB4ABqIAJCAYggBEI/hoQiAiAEQgGIIgQgAyAOEOgBIAFCMIYgBUHgAGpBCGopAwB9IAUpA2AiC0IAUq19IQogBkH//wBqIQZCACALfSELIAEhFgsCQCAGQf//AUgNACAMQoCAgICAgMD//wCEIQxCACEBDAELAkACQCAGQQFIDQAgCkIBhiALQj+IhCEBIAatQjCGIARC////////P4OEIQogC0IBhiEEDAELAkAgBkGPf0oNAEIAIQEMAgsgBUHAAGogAiAEQQEgBmsQ5gEgBUEwaiAWIBMgBkHwAGoQ3AEgBUEgaiADIA4gBSkDQCICIAVBwABqQQhqKQMAIgoQ6AEgBUEwakEIaikDACAFQSBqQQhqKQMAQgGGIAUpAyAiAUI/iIR9IAUpAzAiBCABQgGGIgtUrX0hASAEIAt9IQQLIAVBEGogAyAOQgNCABDoASAFIAMgDkIFQgAQ6AEgCiACIAJCAYMiCyAEfCIEIANWIAEgBCALVK18IgEgDlYgASAOURutfCIDIAJUrXwiAiADIAJCgICAgICAwP//AFQgBCAFKQMQViABIAVBEGpBCGopAwAiAlYgASACURtxrXwiAiADVK18IgMgAiADQoCAgICAgMD//wBUIAQgBSkDAFYgASAFQQhqKQMAIgRWIAEgBFEbca18IgEgAlStfCAMhCEMCyAAIAE3AwAgACAMNwMIIAVB0AJqJAALjgICAn8DfiMAQRBrIgIkAAJAAkAgAb0iBEL///////////8AgyIFQoCAgICAgIB4fEL/////////7/8AVg0AIAVCPIYhBiAFQgSIQoCAgICAgICAPHwhBQwBCwJAIAVCgICAgICAgPj/AFQNACAEQjyGIQYgBEIEiEKAgICAgIDA//8AhCEFDAELAkAgBVBFDQBCACEGQgAhBQwBCyACIAVCACAFp2dBIGogBUIgiKdnIAVCgICAgBBUGyIDQTFqENwBIAJBCGopAwBCgICAgICAwACFQYz4ACADa61CMIaEIQUgAikDACEGCyAAIAY3AwAgACAFIARCgICAgICAgICAf4OENwMIIAJBEGokAAvhAQIDfwJ+IwBBEGsiAiQAAkACQCABvCIDQf////8HcSIEQYCAgHxqQf////cHSw0AIAStQhmGQoCAgICAgIDAP3whBUIAIQYMAQsCQCAEQYCAgPwHSQ0AIAOtQhmGQoCAgICAgMD//wCEIQVCACEGDAELAkAgBA0AQgAhBkIAIQUMAQsgAiAErUIAIARnIgRB0QBqENwBIAJBCGopAwBCgICAgICAwACFQYn/ACAEa61CMIaEIQUgAikDACEGCyAAIAY3AwAgACAFIANBgICAgHhxrUIghoQ3AwggAkEQaiQAC40BAgJ/An4jAEEQayICJAACQAJAIAENAEIAIQRCACEFDAELIAIgASABQR91IgNzIANrIgOtQgAgA2ciA0HRAGoQ3AEgAkEIaikDAEKAgICAgIDAAIVBnoABIANrrUIwhnwgAUGAgICAeHGtQiCGhCEFIAIpAwAhBAsgACAENwMAIAAgBTcDCCACQRBqJAALdQIBfwJ+IwBBEGsiAiQAAkACQCABDQBCACEDQgAhBAwBCyACIAGtQgBB8AAgAWciAUEfc2sQ3AEgAkEIaikDAEKAgICAgIDAAIVBnoABIAFrrUIwhnwhBCACKQMAIQMLIAAgAzcDACAAIAQ3AwggAkEQaiQACwQAQQALBABBAAtTAQF+AkACQCADQcAAcUUNACACIANBQGqtiCEBQgAhAgwBCyADRQ0AIAJBwAAgA2uthiABIAOtIgSIhCEBIAIgBIghAgsgACABNwMAIAAgAjcDCAuaCwIFfw9+IwBB4ABrIgUkACAEQv///////z+DIQogBCAChUKAgICAgICAgIB/gyELIAJC////////P4MiDEIgiCENIARCMIinQf//AXEhBgJAAkACQCACQjCIp0H//wFxIgdBgYB+akGCgH5JDQBBACEIIAZBgYB+akGBgH5LDQELAkAgAVAgAkL///////////8AgyIOQoCAgICAgMD//wBUIA5CgICAgICAwP//AFEbDQAgAkKAgICAgIAghCELDAILAkAgA1AgBEL///////////8AgyICQoCAgICAgMD//wBUIAJCgICAgICAwP//AFEbDQAgBEKAgICAgIAghCELIAMhAQwCCwJAIAEgDkKAgICAgIDA//8AhYRCAFINAAJAIAMgAoRQRQ0AQoCAgICAgOD//wAhC0IAIQEMAwsgC0KAgICAgIDA//8AhCELQgAhAQwCCwJAIAMgAkKAgICAgIDA//8AhYRCAFINACABIA6EIQJCACEBAkAgAlBFDQBCgICAgICA4P//ACELDAMLIAtCgICAgICAwP//AIQhCwwCCwJAIAEgDoRCAFINAEIAIQEMAgsCQCADIAKEQgBSDQBCACEBDAILQQAhCAJAIA5C////////P1YNACAFQdAAaiABIAwgASAMIAxQIggbeSAIQQZ0rXynIghBcWoQ3AFBECAIayEIIAVB2ABqKQMAIgxCIIghDSAFKQNQIQELIAJC////////P1YNACAFQcAAaiADIAogAyAKIApQIgkbeSAJQQZ0rXynIglBcWoQ3AEgCCAJa0EQaiEIIAVByABqKQMAIQogBSkDQCEDCyADQg+GIg5CgID+/w+DIgIgAUIgiCIEfiIPIA5CIIgiDiABQv////8PgyIBfnwiEEIghiIRIAIgAX58IhIgEVStIAIgDEL/////D4MiDH4iEyAOIAR+fCIRIANCMYggCkIPhiIUhEL/////D4MiAyABfnwiFSAQQiCIIBAgD1StQiCGhHwiECACIA1CgIAEhCIKfiIWIA4gDH58Ig0gFEIgiEKAgICACIQiAiABfnwiDyADIAR+fCIUQiCGfCIXfCEBIAcgBmogCGpBgYB/aiEGAkACQCACIAR+IhggDiAKfnwiBCAYVK0gBCADIAx+fCIOIARUrXwgAiAKfnwgDiARIBNUrSAVIBFUrXx8IgQgDlStfCADIAp+IgMgAiAMfnwiAiADVK1CIIYgAkIgiIR8IAQgAkIghnwiAiAEVK18IAIgFEIgiCANIBZUrSAPIA1UrXwgFCAPVK18QiCGhHwiBCACVK18IAQgECAVVK0gFyAQVK18fCICIARUrXwiBEKAgICAgIDAAINQDQAgBkEBaiEGDAELIBJCP4ghAyAEQgGGIAJCP4iEIQQgAkIBhiABQj+IhCECIBJCAYYhEiADIAFCAYaEIQELAkAgBkH//wFIDQAgC0KAgICAgIDA//8AhCELQgAhAQwBCwJAAkAgBkEASg0AAkBBASAGayIHQf8ASw0AIAVBMGogEiABIAZB/wBqIgYQ3AEgBUEgaiACIAQgBhDcASAFQRBqIBIgASAHEOYBIAUgAiAEIAcQ5gEgBSkDICAFKQMQhCAFKQMwIAVBMGpBCGopAwCEQgBSrYQhEiAFQSBqQQhqKQMAIAVBEGpBCGopAwCEIQEgBUEIaikDACEEIAUpAwAhAgwCC0IAIQEMAgsgBq1CMIYgBEL///////8/g4QhBAsgBCALhCELAkAgElAgAUJ/VSABQoCAgICAgICAgH9RGw0AIAsgAkIBfCIBUK18IQsMAQsCQCASIAFCgICAgICAgICAf4WEQgBRDQAgAiEBDAELIAsgAiACQgGDfCIBIAJUrXwhCwsgACABNwMAIAAgCzcDCCAFQeAAaiQAC3UBAX4gACAEIAF+IAIgA358IANCIIgiAiABQiCIIgR+fCADQv////8PgyIDIAFC/////w+DIgF+IgVCIIggAyAEfnwiA0IgiHwgA0L/////D4MgAiABfnwiAUIgiHw3AwggACABQiCGIAVC/////w+DhDcDAAtIAQF/IwBBEGsiBSQAIAUgASACIAMgBEKAgICAgICAgIB/hRDbASAFKQMAIQQgACAFQQhqKQMANwMIIAAgBDcDACAFQRBqJAAL5AMCAn8CfiMAQSBrIgIkAAJAAkAgAUL///////////8AgyIEQoCAgICAgMD/Q3wgBEKAgICAgIDAgLx/fFoNACAAQjyIIAFCBIaEIQQCQCAAQv//////////D4MiAEKBgICAgICAgAhUDQAgBEKBgICAgICAgMAAfCEFDAILIARCgICAgICAgIDAAHwhBSAAQoCAgICAgICACFINASAFIARCAYN8IQUMAQsCQCAAUCAEQoCAgICAgMD//wBUIARCgICAgICAwP//AFEbDQAgAEI8iCABQgSGhEL/////////A4NCgICAgICAgPz/AIQhBQwBC0KAgICAgICA+P8AIQUgBEL///////+//8MAVg0AQgAhBSAEQjCIpyIDQZH3AEkNACACQRBqIAAgAUL///////8/g0KAgICAgIDAAIQiBCADQf+If2oQ3AEgAiAAIARBgfgAIANrEOYBIAIpAwAiBEI8iCACQQhqKQMAQgSGhCEFAkAgBEL//////////w+DIAIpAxAgAkEQakEIaikDAIRCAFKthCIEQoGAgICAgICACFQNACAFQgF8IQUMAQsgBEKAgICAgICAgAhSDQAgBUIBgyAFfCEFCyACQSBqJAAgBSABQoCAgICAgICAgH+DhL8LxAMCA38BfiMAQSBrIgIkAAJAAkAgAUL///////////8AgyIFQoCAgICAgMC/QHwgBUKAgICAgIDAwL9/fFoNACABQhmIpyEDAkAgAFAgAUL///8PgyIFQoCAgAhUIAVCgICACFEbDQAgA0GBgICABGohBAwCCyADQYCAgIAEaiEEIAAgBUKAgIAIhYRCAFINASAEIANBAXFqIQQMAQsCQCAAUCAFQoCAgICAgMD//wBUIAVCgICAgICAwP//AFEbDQAgAUIZiKdB////AXFBgICA/gdyIQQMAQtBgICA/AchBCAFQv///////7+/wABWDQBBACEEIAVC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AgA2AgQgAAsHACAAEJkECwQAIAALGQACQCACRQ0AIAAgASACQQJ0EJoCGgsgAAsMACAAIAEgAhCcBBoLGAAgACABKAIANgIAIAAgAigCADYCBCAACwQAIAALCQAgACABEJ8ECw0AIAAgASAAEJkEa2oLBAAgAAsHACAAEKIECwcAIAAQowQLBAAgAAsEACAACwoAIAAQrwMoAgALCgAgABCvAxCnBAsEACAACwQAIAALCwAgACABIAIQrQQLCQAgACABEK8ECzEBAX8gABCvAyICIAItAAtBgAFxIAFB/wBxcjoACyAAEK8DIgAgAC0AC0H/AHE6AAsLDAAgACABLQAAOgAACwsAIAEgAkEBELAECwcAIAAQtgQLDgAgARCwAxogABCwAxoLHgACQCACELEERQ0AIAAgASACELIEDwsgACABELMECwcAIABBCEsLCQAgACACELQECwcAIAAQtQQLCQAgACABELAOCwcAIAAQrA4LBAAgAAsHACAAELgECwQAIAALBAAgAAsJACAAIAEQvAQLuAEBAn8jAEEQayIEJAACQCAAEL0EIANJDQACQAJAIAMQvgRFDQAgACADEKsEIAAQpgQhBQwBCyAEQQhqIAAQsAMgAxC/BEEBahDABCAEKAIIIgUgBCgCDBDBBCAAIAUQwgQgACAEKAIMEMMEIAAgAxDEBAsCQANAIAEgAkYNASAFIAEQrAQgBUEBaiEFIAFBAWohAQwACwALIARBADoAByAFIARBB2oQrAQgBEEQaiQADwsgABDFBAALBwAgASAAawsZACAAELMDEMYEIgAgABDHBEEBdkt2QXBqCwcAIABBC0kLLQEBf0EKIQECQCAAQQtJDQAgAEEBahDKBCIAIABBf2oiACAAQQtGGyEBCyABCxkAIAEgAhDJBCEBIAAgAjYCBCAAIAE2AgALAgALDAAgABCvAyABNgIACzoBAX8gABCvAyICIAIoAghBgICAgHhxIAFB/////wdxcjYCCCAAEK8DIgAgACgCCEGAgICAeHI2AggLDAAgABCvAyABNgIECwoAQfqFBBDIBAALBQAQxwQLBQAQywQLBQAQDgALGgACQCAAEMYEIAFPDQAQzAQACyABQQEQzQQLCgAgAEEPakFwcQsEAEF/CwUAEA4ACxoAAkAgARCxBEUNACAAIAEQzgQPCyAAEM8ECwkA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IBFJDQAgESEKDAELA0AgA0EgaiAFQQFqIgVqIA46AAAgBSALLQAAIgpJDQALCyALIQULIAogA0EgampBAWogDjoAACAFQQFqIQUMAAsAC0EIIQoMAgtBCiEKDAELQQAhCgsgACAKQQBCfxDABSETIAApA3hCACAAKAIEIAAoAixrrH1RDQcCQCAQQfAARw0AIAhFDQAgCCATPgIADAMLIAggDyATEMQFDAILIAhFDQEgBykDACETIAMpAwghFAJAAkACQCAPDgMAAQIECyAIIBQgExDrATgCAAwDCyAIIBQgExDqATkDAAwCCyAIIBQ3AwAgCCATNwMIDAELQR8gAUEBaiAQQeMARyILGyEOAkACQCAPQQFHDQAgCCEKAkAgCUUNACAOQQJ0ENIBIgpFDQcLIANCADcCqAJBACEBA0AgCiENAkADQAJAAkAgACgCBCIKIAAoAmhGDQAgACAKQQFqNgIEIAotAAAhCgwBCyAAEKMBIQoLIAogA0EgampBAWotAABFDQEgAyAKOgAbIANBHGogA0EbakEBIANBqAJqEPcEIgpBfkYNAAJAIApBf0cNAEEAIQwMDAsCQCANRQ0AIA0gAUECdGogAygCHDYCACABQQFqIQELIAlFDQAgASAORw0AC0EBIQ9BACEMIA0gDkEBdEEBciIOQQJ0ENUBIgoNAQwLCwtBACEMIA0hDiADQagCahDBBUUNCAwBCwJAIAlFDQBBACEBIA4Q0gEiCkUNBgNAIAohDQNAAkACQCAAKAIEIgogACgCaEYNACAAIApBAWo2AgQgCi0AACEKDAELIAAQowEhCgsCQCAKIANBIGpqQQFqLQAADQBBACEOIA0hDAwECyANIAFqIAo6AAAgAUEBaiIBIA5HDQALQQEhDyANIA5BAXRBAXIiDhDVASIKDQALIA0hDEEAIQ0MCQtBACEBAkAgCEUNAANAAkACQCAAKAIEIgogACgCaEYNACAAIApBAWo2AgQgCi0AACEKDAELIAAQowEhCgsCQCAKIANBIGpqQQFqLQAADQBBACEOIAghDSAIIQwMAwsgCCABaiAKOgAAIAFBAWohAQwACwALA0ACQAJAIAAoAgQiASAAKAJoRg0AIAAgAUEBajYCBCABLQAAIQEMAQsgABCjASEBCyABIANBIGpqQQFqLQAADQALQQAhDUEAIQxBACEO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ACgCFBECAAsRACAAIAEgASgCACgCGBECAAsPACAAIAAoAgAoAiQRAAALCwAgAEGIqQUQ9gULEQAgACABIAEoAgAoAiwRAgALEQAgACABIAEoAgAoAiARAgALEQAgACABIAEoAgAoAhwRAgALDwAgACAAKAIAKAIMEQAACw8AIAAgACgCACgCEBEAAAsRACAAIAEgASgCACgCFBECAAsRACAAIAEgASgCACgCGBECAAsPACAAIAAoAgAoAiQRAAALEgAgACACNgIEIAAgAToAACAACwcAIAAoAgALDQAgABDNCCABEMsIRgsHACAAKAIACy8BAX8jAEEQayIDJAAgABDKDCABEMoMIAIQygwgA0EPahDLDCECIANBEGokACACCzIBAX8jAEEQayICJAAgAiAAKAIANgIMIAJBDGogARDRDBogAigCDCEAIAJBEGokACAACwcAIAAQrwgLGgEBfyAAEK4IKAIAIQEgABCuCEEANgIAIAELIgAgACABENEIEPUGIAEQ0AgoAgAhASAAEK8IIAE2AgAgAAsHACAAEJEOCxoBAX8gABCQDigCACEBIAAQkA5BADYCACABCyIAIAAgARDUCBDXCCABENMIKAIAIQEgABCRDiABNgIAIAALCQAgACABELsLCy0BAX8gABCQDigCACECIAAQkA4gATYCAAJAIAJFDQAgAiAAEJEOKAIAEQMACwuVBAECfyMAQfAEayIHJAAgByACNgLoBCAHIAE2AuwEIAdBlQE2AhAgB0HIAWogB0HQAWogB0EQahCTByEBIAdBwAFqIAQQ4QQgB0HAAWoQgwMhCCAHQQA6AL8BAkAgB0HsBGogAiADIAdBwAFqIAQQwAIgBSAHQb8BaiAIIAEgB0HEAWogB0HgBGoQ2QhFDQAgB0EAOgC+ASAHQbjyADsAvAEgB0Kw4siZw6aNmzc3ALQBIAggB0G0AWogB0G+AWogB0GAAWoQygYaIAdBlAE2AhAgB0EIakEAIAdBEGoQ8wYhCCAHQRBqIQQCQAJAIAcoAsQBIAEQ2ghrQYkDSA0AIAggBygCxAEgARDaCGtBAnVBAmoQ0gEQ9QYgCBCbCEUNASAIEJsIIQQLAkAgBy0AvwFFDQAgBEEtOgAAIARBAWohBAsgARDaCCECAkADQAJAIAIgBygCxAFJDQAgBEEAOgAAIAcgBjYCACAH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BmoQ7wgLHAACQCAAEMAHRQ0AIAAgARDvCA8LIAAgARDxCAsHACAAEI4MCysBAX8jAEEQayIEJAAgACAEQQ9qIAMQ1QwiAyABIAIQ1gwgBEEQaiQAIAMLCwAgAEGgqQUQ9gULEQAgACABIAEoAgAoAiwRAgALEQAgACABIAEoAgAoAiARAgALCwAgACABEJUJIAALEQAgACABIAEoAgAoAhwRAgALDwAgACAAKAIAKAIMEQAACw8AIAAgACgCACgCEBEAAAsRACAAIAEgASgCACgCFBECAAsRACAAIAEgASgCACgCGBECAAsPACAAIAAoAgAoAiQRAAALCwAgAEGYqQUQ9gULEQAgACABIAEoAgAoAiwRAgALEQAgACABIAEoAgAoAiARAgALEQAgACABIAEoAgAoAhwRAgALDwAgACAAKAIAKAIMEQAACw8AIAAgACgCACgCEBEAAAsRACAAIAEgASgCACgCFBECAAsRACAAIAEgASgCACgCGBECAAsPACAAIAAoAgAoAiQRAAALEgAgACACNgIEIAAgATYCACAACwcAIAAoAgALDQAgABCPCSABEI0JRgsHACAAKAIACy8BAX8jAEEQayIDJAAgABDaDCABENoMIAIQ2gwgA0EPahDbDCECIANBEGokACACCzIBAX8jAEEQayICJAAgAiAAKAIANgIMIAJBDGogARDhDBogAigCDCEAIAJBEGokACAACwcAIAAQqAkLGgEBfyAAEKcJKAIAIQEgABCnCUEANgIAIAELIgAgACABEJMJEJQHIAEQkgkoAgAhASAAEKgJIAE2AgAgAAt9AQJ/IwBBEGsiAiQAAkAgABDAB0UNACAAEPcIIAAQ7QggABCZDBCXDAsgACABEOIMIAEQlgghAyAAEJYIIgBBCGogA0EIaigCADYCACAAIAMpAgA3AgAgAUEAEPEIIAEQ8AghACACQQA2AgwgACACQQxqEO4IIAJBEGokAAuEBQEMfyMAQcADayIHJAAgByAFNwMQIAcgBjcDGCAHIAdB0AJqNgLMAiAHQdACakHkAEGRhgQgB0EQahCYASEIIAdBlAE2AuABQQAhCSAHQdgBakEAIAdB4AFqEPMGIQogB0GUATYC4AEgB0HQAWpBACAHQeABahDzBiELIAdB4AFqIQwCQAJAIAhB5ABJDQAQowYhCCAHIAU3AwAg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EAAgACABQZCpBRCJChCKCgsMAEHItQVBARCZChoLEAAgACABQZipBRCJChCKCgsMAEHQtQVBARCaChoLEAAgACABQaCpBRCJChCKCgsMAEHYtQVBARCbChoLEAAgACABQaipBRCJChCKCgsMAEHgtQVBARCcChoLEAAgACABQbCpBRCJChCKCgsMAEHotQVBARCdChoLEAAgACABQbipBRCJChCKCgsMAEHwtQVBARCeChoLEAAgACABQcCpBRCJChCKCgsMAEH4tQVBARCfChoLEAAgACABQeioBRCJChCKCgsMAEGItgVBARCgChoLEAAgACABQfCoBRCJChCKCgsMAEGYtgVBARChChoLEAAgACABQfioBRCJChCKCgsMAEGotgVBARCiChoLEAAgACABQYCpBRCJChCKCgsMAEG4tgVBARCjChoLEAAgACABQcipBRCJChCKCgsMAEHAtgVBARCkChoLEAAgACABQdCpBRCJChCKCgsXACAAIAE2AgQgAEHA8wRBCGo2AgAgAAsUACAAIAEQhA0iAUEIahCFDRogAQsLACAAIAE2AgAgAAsKACAAIAEQhg0aC2cBAn8jAEEQayICJAACQCAAEIcNIAFPDQAgABCIDQALIAJBCGogABCJDSABEIoNIAAgAigCCCIBNgIEIAAgATYCACACKAIMIQMgABCLDSABIANBAnRqNgIAIABBABCMDSACQRBqJAALXgEDfyMAQRBrIgIkACACQQRqIAAgARCNDSIDKAIEIQEgAygCCCEEA0ACQCABIARHDQAgAxCODRogAkEQaiQADwsgABCJDSABEI8NEJANIAMgAUEEaiIBNgIEDAALAAsJACAAQQE6AAALEAAgACgCBCAAKAIAa0ECdQsMACAAIAAoAgAQpw0LMwAgACAAEJcNIAAQlw0gABCYDUECdGogABCXDSABQQJ0aiAAEJcNIAAQhgpBAnRqEJkNC0oBAX8jAEEgayIBJAAgAUEANgIQIAFBlgE2AgwgASABKQIMNwMAIAAgAUEUaiABIAAQxAoQxQogACgCBCEAIAFBIGokACAAQX9qC3gBAn8jAEEQayIDJAAgARCnCiADQQxqIAEQqwohBAJAIABBCGoiARCGCiACSw0AIAEgAkEBahCuCgsCQCABIAIQpgooAgBFDQAgASACEKYKKAIAEK8KGgsgBBCwCiEAIAEgAhCmCiAANgIAIAQQrAoaIANBEGokAAsXACAAIAEQwAkiAUHs0wRBCGo2AgAgAQsXACAAIAEQwAkiAUGM1ARBCGo2AgAgAQsaACAAIAEQwAkQ3QoiAUHQywRBCGo2AgAgAQsaACAAIAEQwAkQ8QoiAUHkzARBCGo2AgAgAQsaACAAIAEQwAkQ8QoiAUH4zQRBCGo2AgAgAQsaACAAIAEQwAkQ8QoiAUHgzwRBCGo2AgAgAQsaACAAIAEQwAkQ8QoiAUHszgRBCGo2AgAgAQsaACAAIAEQwAkQ8QoiAUHU0ARBCGo2AgAgAQsXACAAIAEQwAkiAUGs1ARBCGo2AgAgAQsXACAAIAEQwAkiAUGg1gRBCGo2AgAgAQsXACAAIAEQwAkiAUH01wRBCGo2AgAgAQsXACAAIAEQwAkiAUHc2QRBCGo2AgAgAQsaACAAIAEQwAkQ4g0iAUG04QRBCGo2AgAgAQsaACAAIAEQwAkQ4g0iAUHI4gRBCGo2AgAgAQsaACAAIAEQwAkQ4g0iAUG84wRBCGo2AgAgAQsaACAAIAEQwAkQ4g0iAUGw5ARBCGo2AgAgAQsaACAAIAEQwAkQ4w0iAUGk5QRBCGo2AgAgAQsaACAAIAEQwAkQ5A0iAUHI5gRBCGo2AgAgAQsaACAAIAEQwAkQ5Q0iAUHs5wRBCGo2AgAgAQsaACAAIAEQwAkQ5g0iAUGQ6QRBCGo2AgAgAQstACAAIAEQwAkiAUEIahDnDSEAIAFBpNsEQQhqNgIAIABBpNsEQThqNgIAIAELLQAgACABEMAJIgFBCGoQ6A0hACABQazdBEEIajYCACAAQazdBEE4ajYCACABCyAAIAAgARDACSIBQQhqEOkNGiABQZjfBEEIajYCACABCyAAIAAgARDACSIBQQhqEOkNGiABQbTgBEEIajYCACABCxoAIAAgARDACRDqDSIBQbTqBEEIajYCACABCxoAIAAgARDACRDqDSIBQazrBEEIajYCACABCzMAAkBBAC0A6KkFRQ0AQQAoAuSpBQ8LEKgKGkEAQQE6AOipBUEAQeCpBTYC5KkFQeCpBQsNACAAKAIAIAFBAnRqCwsAIABBBGoQqQoaCxQAELwKQQBByLYFNgLgqQVB4KkFCxUBAX8gACAAKAIAQQFqIgE2AgAgAQsfAAJAIAAgARC6Cg0AENUDAAsgAEEIaiABELsKKAIACykBAX8jAEEQayICJAAgAiABNgIMIAAgAkEMahCtCiEBIAJBEGokACABCwkAIAAQsQogAAsJACAAIAEQ6w0LOAEBfwJAIAEgABCGCiICTQ0AIAAgASACaxC3Cg8LAkAgASACTw0AIAAgACgCACABQQJ0ahC4CgsLKAEBfwJAIABBBGoQtAoiAUF/Rw0AIAAgACgCACgCCBEDAAsgAUF/RgsaAQF/IAAQuQooAgAhASAAELkKQQA2AgAgAQslAQF/IAAQuQooAgAhASAAELkKQQA2AgACQCABRQ0AIAEQ7A0LC2gBAn8gAEHUvwRBCGo2AgAgAEEIaiEBQQAhAgJAA0AgAiABEIYKTw0BAkAgASACEKYKKAIARQ0AIAEgAhCmCigCABCvChoLIAJBAWohAgwACwALIABBmAFqEL4OGiABELMKGiAAEOIFCyMBAX8jAEEQayIBJAAgAUEMaiAAEIEKELUKIAFBEGokACAACxUBAX8gACAAKAIAQX9qIgE2AgAgAQs7AQF/AkAgACgCACIBKAIARQ0AIAEQhwogACgCABCsDSAAKAIAEIkNIAAoAgAiACgCACAAEJgNEK0NCwsNACAAELIKGiAAEKwOC3ABAn8jAEEgayICJAACQAJAIAAQiw0oAgAgACgCBGtBAnUgAUkNACAAIAEQhAoMAQsgABCJDSEDIAJBDGogACAAEIYKIAFqEKsNIAAQhgogAxCwDSIDIAEQsQ0gACADELINIAMQsw0aCyACQSBqJAALGQEBfyAAEIYKIQIgACABEKcNIAAgAhCICgsHACAAEO0NCysBAX9BACECAkAgAEEIaiIAEIYKIAFNDQAgACABELsKKAIAQQBHIQILIAILDQAgACgCACABQQJ0agsMAEHItgVBARC/CRoLEQBB7KkFEKUKEMAKGkHsqQULMwACQEEALQD0qQVFDQBBACgC8KkFDwsQvQoaQQBBAToA9KkFQQBB7KkFNgLwqQVB7KkFCxgBAX8gABC+CigCACIBNgIAIAEQpwogAAsVACAAIAEoAgAiATYCACABEKcKIAALDQAgACgCABCvChogAAsPACAAKAIAIAEQiQoQugoLCgAgABDMCjYCBAsVACAAIAEpAgA3AgQgACACNgIAIAALOwEBfyMAQRBrIgIkAAJAIAAQyApB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BAAgAAsYACAAIAEoAgA2AgAgACACKAIANgIEIAALCQAgACABEPUDCwQAIAELGAAgACABKAIANgIAIAAgAigCADYCBCAACw0AIAAgASACIAMQuQwLaQEBfyMAQSBrIgQkACAEQRhqIAEgAhC6DCAEQRBqIARBDGogBCgCGCAEKAIcIAMQuwwQvAwgBCABIAQoAhAQvQw2AgwgBCADIAQoAhQQvgw2AgggACAEQQxqIARBCGoQvwwgBEEgaiQACwsAIAAgASACEMAMCwcAIAAQwQwLawEBfyMAQRBrIgUkACAFIAI2AgggBSAENgIMAkADQCACIANGDQEgAigCACEEIAVBDGoQmAMgBBCZAxogBSACQQRqIgI2AgggBUEMahCaAxoMAAsACyAAIAVBCGogBUEMahC/DCAFQRBqJAALCQAgACABEMMMCwkAIAAgARDEDAsMACAAIAEgAhDCDBoLOAEBfyMAQRBrIgMkACADIAEQiwQ2AgwgAyACEIsENgIIIAAgA0EMaiADQQhqEMUMGiADQRBqJAALBAAgAAsYACAAIAEoAgA2AgAgACACKAIANgIEIAALCQAgACABEI4ECwQAIAELGAAgACABKAIANgIAIAAgAigCADYCBCAACwQAIAALBAAgAAtaAQF/IwBBEGsiAyQAIAMgATYCCCADIAA2AgwgAyACNgIEQQAhAQJAIANBA2ogA0EEaiADQQxqEMkMDQAgA0ECaiADQQRqIANBCGoQyQwhAQsgA0EQaiQAIAELDQAgASgCACACKAIASQsHACAAEM0MCw4AIAAgAiABIABrEMwMCwwAIAAgASACEJABRQsnAQF/IwBBEGsiASQAIAEgADYCDCABQQxqEM4MIQAgAUEQaiQAIAALBwAgABDPDAsKACAAKAIAENAMCyoBAX8jAEEQayIBJAAgASAANgIMIAFBDGoQywgQrAMhACABQRBqJAAgAAsRACAAIAAoAgAgAWo2AgAgAAuLAgEDfyMAQRBrIgckAAJAIAAQgwwiCCABayACSQ0AIAAQhAchCQJAIAhBAXZBcGogAU0NACAHIAFBAXQ2AgwgByACIAFqNgIEIAdBBGogB0EMahDiBCgCABCFDEEBaiEICyAHQQRqIAAQ9wggCBCGDCAHKAIEIgggBygCCBCHDAJAIARFDQAgCBCdBCAJEJ0EIAQQ8AIa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ABC6DTYCDCABIAJBDGoQuw02AgQgACABQQRqELwNIABBBGogAUEIahC8DSAAEIsNIAEQtg0QvA0gASABKAIENgIAIAAgABCGChCMDSACQRBqJAALJgAgABC9DQJAIAAoAgBFDQAgABC1DSAAKAIAIAAQvg0QrQ0LIAALFgAgACABEIQNIgFBBGogAhC/DRogAQsKACAAQQxqEMANCwoAIABBDGoQwQ0LKAEBfyABKAIAIQMgACABNgIIIAAgAzYCACAAIAMgAkECdGo2AgQgAAsRACAAKAIIIAAoAgA2AgAgAAsLACAAIAE2AgAgAAsLACABIAIgAxDDDQsHACAAKAIACxwBAX8gACgCACECIAAgASgCADYCACABIAI2AgALDAAgACAAKAIEENcNCxMAIAAQ2A0oAgAgACgCAGtBAnULCwAgACABNgIAIAALCgAgAEEEahDCDQsHACAAEKINCwcAIAAoAgALKwEBfyMAQRBrIgMkACADQQhqIAAgASACEMQNIAMoAgwhAiADQRBqJAAgAgsNACAAIAEgAiADEMUNCw0AIAAgASACIAMQxg0LaQEBfyMAQSBrIgQkACAEQRhqIAEgAhDHDSAEQRBqIARBDGogBCgCGCAEKAIcIAMQyA0QyQ0gBCABIAQoAhAQyg02AgwgBCADIAQoAhQQyw02AgggACAEQQxqIARBCGoQzA0gBEEgaiQACwsAIAAgASACEM0NCwcAIAAQ0g0LfQEBfyMAQRBrIgUkACAFIAM2AgggBSACNgIMIAUgBDYCBAJAA0AgBUEMaiAFQQhqEM4NRQ0BIAVBDGoQzw0oAgAhAyAFQQRqENANIAM2AgAgBUEMahDRDRogBUEEahDRDRoMAAsACyAAIAVBDGogBUEEahDMDSAFQRBqJAALCQAgACABENQNCwkAIAAgARDVDQsMACAAIAEgAhDTDRoLOAEBfyMAQRBrIgMkACADIAEQyA02AgwgAyACEMgNNgIIIAAgA0EMaiADQQhqENMNGiADQRBqJAALDQAgABC7DSABELsNRwsKABDWDSAAENANCwoAIAAoAgBBfGoLEQAgACAAKAIAQXxqNgIAIAALBAAgAAsYACAAIAEoAgA2AgAgACACKAIANgIEIAALCQAgACABEMsNCwQAIAELAgALCQAgACABENkNCwoAIABBDGoQ2g0LNwECfwJAA0AgACgCCCABRg0BIAAQtQ0hAiAAIAAoAghBfGoiAzYCCCACIAMQjw0QqA0MAAsACwsHACAAEKUNCwoAQfqFBBDcDQALBQAQDgALBwAgABDUBQthAQF/IwBBEGsiAiQAIAIgADYCDAJAIAAgAUYNAANAIAIgAUF8aiIBNgIIIAAgAU8NASACQQxqIAJBCGoQ3w0gAiACKAIMQQRqIgA2AgwgAigCCCEBDAALAAsgAkEQaiQACw8AIAAoAgAgASgCABDgDQsJACAAIAEQrgMLNAEBfyMAQRBrIgMkACAAIAIQ9gggA0EANgIMIAEgAkECdGogA0EMahDuCCADQRBqJAAgAAsEACAACwQAIAALBAAgAAsEACAACwQAIAALEAAgAEH48gRBCGo2AgAgAAsQACAAQZzzBEEIajYCACAACwwAIAAQowY2AgAgAAsEACAACw4AIAAgASgCADYCACAACwgAIAAQrwoaCwQAIAALCQAgACABEPANCwcAIAAQ8Q0LCwAgACABNgIAIAALDQAgACgCABDyDRDzDQsHACAAEPUNCwcAIAAQ9A0LPwECfyAAKAIAIABBCGooAgAiAUEBdWohAiAAKAIEIQACQCABQQFxRQ0AIAIoAgAgAGooAgAhAAsgAiAAEQMACwcAIAAoAgALFgAgACABEPkNIgFBBGogAhDqBBogAQsHACAAEPoNCwoAIABBBGoQ6wQLDgAgACABKAIANgIAIAALBAAgAAsKACABIABrQQxtCwsAIAAgASACELUBCwUAEP4NCwgAQYCAgIB4CwUAEIEOCwUAEIIOCw0AQoCAgICAgICAgH8LDQBC////////////AAsLACAAIAEgAhCzAQsFABCFDgsGAEH//wMLBQAQhw4LBABCfwsMACAAIAEQowYQ3gULDAAgACABEKMGEN8FCz0CAX8BfiMAQRBrIgMkACADIAEgAhCjBhDgBSADKQMAIQQgACADQQhqKQMANwMIIAAgBDcDACADQRBqJAALCgAgASAAa0EMbQsOACAAIAEoAgA2AgAgAAsEACAACwQAIAALDgAgACABKAIANgIAIAALBwAgABCSDgsKACAAQQRqEOsECwQAIAALBAAgAAsOACAAIAEoAgA2AgAgAAsEACAACwQAIAALBAAgAAsDAAALBwAgABCFAQsHACAAEIYBCxkAAkAg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cwBwYXJhbXMAQXByAHZlY3RvcgBpZGVudGlmaWVyAE9jdG9iZXIATm92ZW1iZXIAU2VwdGVtYmVyAERlY2VtYmVyAGlvc19iYXNlOjpjbGVhcgBNYXIAU2VwACVJOiVNOiVTICVwAFtXQVNNXSBGZWNoYW1lbnRvIGxpbXBvAFtXQVNNXSBKU09OIGludmFsaWRvAFtXQVNNXSBQb29sQ2xpZW50IGluaWNpYWxpemFkbwBbV0FTTV0gV2ViU29ja2V0IGNyaWFkbwBbV0FTTV0gc3RhcnRNaW5pbmcoKSBpbmljaWFkbwBzaHV0ZG93bgBTdW4ASnVuAHN0ZDo6ZXhjZXB0aW9uAE1vbgBsb2dpbgBuYW4ASmFuAHdzczovL3Byb3h5LXhtci5vbnJlbmRlci5jb20ASnVsAGxsAEFwcmlsAEZyaQBiYWRfYXJyYXlfbmV3X2xlbmd0aABNYXJjaABBdWcAeG1yLXVzLWVhc3QxLm5hbm9wb29sLm9yZwBtb25lcm9taW5lci5sb2cAdGVybWluYXRpbmcAYmFzaWNfc3RyaW5nACUuMTdnAGluZgAlLjBMZgAlTGYAJS5mAHRydWUAVHVlAGZhbHNlAEp1bmUAbWV0aG9kAHRlcm1pbmF0ZV9oYW5kbGVyIHVuZXhwZWN0ZWRseSByZXR1cm5lZABjb25kaXRpb25fdmFyaWFibGUgd2FpdCBmYWlsZWQAdGhyZWFkOjpqb2luIGZhaWxlZABtdXRleCBsb2NrIGZhaWxlZABjbG9ja19nZXR0aW1lKENMT0NLX1JFQUxUSU1FKSBmYWlsZWQAY29uZGl0aW9uX3ZhcmlhYmxlOjp3YWl0OiBtdXRleCBub3QgbG9ja2VkAFdlZABzdGQ6OmJhZF9hbGxvYwBEZWMAd2IAcmIAam9iAEZlYgBhYgB3K2IAcitiAGErYgByd2EAJWEgJWIgJWQgJUg6JU06JVMgJVkAUE9TSVgAJUg6JU06JVMAW1dBU01dIEZlY2hhbWVudG8gTkFPIExJTVBPAFtXQVNNXSBMT0dJTiBFTlZJQURPAFtXQVNNXSBGQUxIQSBBTyBFTlZJQVIgTE9HSU4ATkFOAFBNAEFNAExDX0FMTABMQU5HAElORgBDAEMuVVRGLTgAOEM2aEZiNEJ1bzZkWXdKaVpFYUZoeVloWlRKYVI0TnlYU0J6S01GMUJuTktNR0Q5MnllYVkzYTlQeHVXcDliaFRBaDZkQVh3cXl5TGZGeGFQUmN0N2o4MUw4dDRpSzIAd29ya2VyMQBNb25lcm9NaW5lci8xLjAuMABbV0FTTV0gU3Vic2lzdGVtYSBkZSBUaHJlYWRzIGRvIEVtc2NyaXB0ZW4gcHJvbnRvIHBhcmEgY29tYW5kb3MuAFtXQVNNXSBUb2RvcyBvcyBXZWIgV29ya2VycyBmb3JhbSBlbmNlcnJhZG9zLiBQcm9udG8gcGFyYSByZWluaWNpYXIuAFtXQVNNXSBXZWJTb2NrZXQgaW5pY2lhZG8uIEFndWFyZGFuZG8gZXZlbnRvcy4uLgBbV0FTTV0gRmluYWxpemFuZG8gbyBtb3RvciBkZSBtaW5lcmHDp8OjbyBhIHBlZGlkbyBkYSBpbnRlcmZhY2UuLi4AW1dBU01dIEVudmlhbmRvIExPR0lOLi4uAHcrAHIrAGErAFtXQVNNXSAqKiogT05PUEVOIERJU1BBUk9VICoqKgBbV0FTTV0gKioqIFdFQlNPQ0tFVCBGRUNIT1UgKioqAChudWxsKQAidHlwZSBtaXNtYXRjaCEgY2FsbCBpczx0eXBlPigpIGJlZm9yZSBnZXQ8dHlwZT4oKSIgJiYgaXM8YXJyYXk+KCkAInR5cGUgbWlzbWF0Y2ghIGNhbGwgaXM8dHlwZT4oKSBiZWZvcmUgZ2V0PHR5cGU+KCkiICYmIGlzPG9iamVjdD4oKQAidHlwZSBtaXNtYXRjaCEgY2FsbCBpczx0eXBlPigpIGJlZm9yZSBnZXQ8dHlwZT4oKSIgJiYgaXM8c3RkOjpzdHJpbmc+KCkAUHVyZSB2aXJ0dWFsIGZ1bmN0aW9uIGNhbGxlZCEAW1dBU01dIExPR0lOIC0+IABbV0FTTV0gU3RhdHVzOiAAc3ludGF4IGVycm9yIGF0IGxpbmUgJWQgbmVhcjogAFtXQVNNXSBDbG9zZSByZWFzb246IABsaWJjKythYmk6IABbV0FTTV0gQ2xvc2UgY29kZTogACUwMmQvJTAyZC8lMDRkICglMDJkOiUwMmQ6JTAyZC4lMDNsbGQpICVsbGQ6IABbV0FTTV0gUlg6IAAA3hIElQAAAAD///////////////9ACAEAFAAAAEMuVVRGLTgA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TlNfMTFjaGFyX3RyYWl0c0ljRUVFRQAA6DsBAFQPAQAMDQEAAAAAALQPAQB5AAAAegAAAE5TdDNfXzI4aW9zX2Jhc2VFAAAAwDsBAKAPAQAgPgEAsD4BAEg/AQAAAAAAAAAAAAIAAMADAADABAAAwAUAAMAGAADABwAAwAgAAMAJAADACgAAwAsAAMAMAADADQAAwA4AAMAPAADAEAAAwBEAAMASAADAEwAAwBQAAMAVAADAFgAAwBcAAMAYAADAGQAAwBoAAMAbAADAHAAAwB0AAMAeAADAHwAAwAAAALMBAADDAgAAwwMAAMMEAADDBQAAwwYAAMMHAADDCAAAwwkAAMMKAADDCwAAwwwAAMMNAADTDgAAww8AAMMAAAy7AQAMwwIADMMDAAzDBAAM2wAAAAD0EAEAOwAAAH8AAACAAAAAPgAAAD8AAABAAAAAQQAAAEIAAABDAAAAgQAAAIIAAACDAAAARwAAAEgAAABOU3QzX18yMTBfX3N0ZGluYnVmSWNFRQDoOwEA3BABAAwNAQAAAAAAXBEBADsAAACEAAAAhQAAAD4AAAA/AAAAQAAAAIYAAABCAAAAQwAAAEQAAABFAAAARgAAAIcAAACIAAAATlN0M19fMjExX19zdGRvdXRidWZJY0VFAAAAAOg7AQBAEQEADA0BAAAAAADAEQEAUQAAAIkAAACKAAAAVAAAAFUAAABWAAAAVwAAAFgAAABZAAAAiwAAAIwAAACNAAAAXQAAAF4AAABOU3QzX18yMTBfX3N0ZGluYnVmSXdFRQDoOwEAqBEBACAOAQAAAAAAKBIBAFEAAACOAAAAjwAAAFQAAABVAAAAVgAAAJAAAABYAAAAWQAAAFoAAABbAAAAXAAAAJEAAACSAAAATlN0M19fMjExX19zdGRvdXRidWZJd0VFAAAAAOg7AQAMEgEAIA4BAAAAAAAAAAAAAAAAAP////////////////////////////////////////////////////////////////8AAQIDBAUGBwgJ/////////woLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIj////////CgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiP/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AAECBAcDBgUAAAAAAAAATENfQ1RZUEUAAAAATENfTlVNRVJJQwAATENfVElNRQAAAAAATENfQ09MTEFURQAATENfTU9ORVRBUlkATENfTUVTU0FHRVMAoBUBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAgAAAAMAAAAEAAAABQAAAAYAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAANAAAADgAAAA8AAAAQAAAAEQAAABIAAAATAAAAFAAAABUAAAAWAAAAFwAAABgAAAAZAAAAGgAAABsAAAAcAAAAHQAAAB4AAAAfAAAAIAAAACEAAAAiAAAAIwAAACQAAAAlAAAAJgAAACcAAAAoAAAAKQAAACoAAAArAAAALAAAAC0AAAAuAAAALwAAADAAAAAxAAAAMgAAADMAAAA0AAAA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QgEAAEIBAACCAAAAggAAAIIAAACCAAAAggAAAIIAAACCAAAAKgEAACoBAAAqAQAAKgEAACoBAAAqAQAAKgAAACoAAAAqAAAAKgAAACoAAAAqAAAAKgAAACoAAAAqAAAAKgAAACoAAAAqAAAAKgAAACoAAAAqAAAAKgAAACoAAAAqAAAAKgAAACoAAACCAAAAggAAAIIAAACCAAAAggAAAIIAAAAyAQAAMgEAADIBAAAyAQAAMgEAADIBAAAyAAAAMgAAADIAAAAyAAAAMgAAADIAAAAyAAAAMgAAADIAAAAyAAAAMgAAADIAAAAyAAAAMgAAADIAAAAyAAAAMgAAADIAAAAyAAAAMgAAAIIAAACCAAAAggAAAIIAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7CgBALMAAAC0AAAAqAAAALUAAAC2AAAAtwAAALgAAAC5AAAAugAAALsAAAAAAAAAvCkBALwAAAC9AAAAqAAAAL4AAAC/AAAAwAAAAMEAAADCAAAAAAAAAOApAQDDAAAA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';
  if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile);
  }

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  var binary = tryParseAsDataURI(file);
  if (binary) {
    return binary;
  }
  if (readBinary) {
    return readBinary(file);
  }
  throw "both async and sync fetching of the wasm failed";
}

function getBinaryPromise(binaryFile) {

  // Otherwise, getBinarySync should be able to get it synchronously
  return Promise.resolve().then(() => getBinarySync(binaryFile));
}

function instantiateArrayBuffer(binaryFile, imports, receiver) {
  return getBinaryPromise(binaryFile).then((binary) => {
    return WebAssembly.instantiate(binary, imports);
  }).then((instance) => {
    return instance;
  }).then(receiver, (reason) => {
    err(`failed to asynchronously prepare wasm: ${reason}`);

    // Warn on some common problems.
    if (isFileURI(wasmBinaryFile)) {
      err(`warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
    }
    abort(reason);
  });
}

function instantiateAsync(binary, binaryFile, imports, callback) {
  return instantiateArrayBuffer(binaryFile, imports, callback);
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  // prepare imports
  var info = {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  };
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    wasmExports = instance.exports;

    

    wasmMemory = wasmExports['memory'];
    Module['wasmMemory'] = wasmMemory;
    assert(wasmMemory, "memory not found in wasm exports");
    // This assertion doesn't hold when emscripten is run in --post-link
    // mode.
    // TODO(sbc): Read INITIAL_MEMORY out of the wasm file in post-link mode.
    //assert(wasmMemory.buffer.byteLength === 536870912);
    updateMemoryViews();

    wasmTable = wasmExports['__indirect_function_table'];
    
    assert(wasmTable, "table not found in wasm exports");

    addOnInit(wasmExports['__wasm_call_ctors']);

    removeRunDependency('wasm-instantiate');
    return wasmExports;
  }
  // wait for the pthread pool (if any)
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    receiveInstance(result['instance']);
  }

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module['instantiateWasm']) {

    try {
      return Module['instantiateWasm'](info, receiveInstance);
    } catch(e) {
      err(`Module.instantiateWasm callback failed with error: ${e}`);
        return false;
    }
  }

  instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult);
  return {}; // no exports yet; we'll fill them in later
}

// Globals used by JS i64 conversions (see makeSetValue)
var tempDouble;
var tempI64;

// include: runtime_debug.js
function legacyModuleProp(prop, newName, incomming=true) {
  if (!Object.getOwnPropertyDescriptor(Module, prop)) {
    Object.defineProperty(Module, prop, {
      configurable: true,
      get() {
        let extra = incomming ? ' (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)' : '';
        abort(`\`Module.${prop}\` has been replaced by \`${newName}\`` + extra);

      }
    });
  }
}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

function missingGlobal(sym, msg) {
  if (typeof globalThis !== 'undefined') {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
        return undefined;
      }
    });
  }
}

missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer');
missingGlobal('asm', 'Please use wasmExports instead');

function missingLibrarySymbol(sym) {
  if (typeof globalThis !== 'undefined' && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        // Can't `abort()` here because it would break code that does runtime
        // checks.  e.g. `if (typeof SDL === 'undefined')`.
        var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
        // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
        // library.js, which means $name for a JS name with no prefix, or name
        // for a JS name like _name.
        var librarySymbol = sym;
        if (!librarySymbol.startsWith('_')) {
          librarySymbol = '$' + sym;
        }
        msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        warnOnce(msg);
        return undefined;
      }
    });
  }
  // Any symbol that is not included from the JS libary is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get() {
        var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      }
    });
  }
}

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(text) {
  // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as warnings.
  console.warn.apply(console, arguments);
}
// end include: runtime_debug.js
// === Body ===

// end include: preamble.js

  /** @constructor */
  function ExitStatus(status) {
      this.name = 'ExitStatus';
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };

  
    /**
     * @param {number} ptr
     * @param {string} type
     */
  function getValue(ptr, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': abort('to do getValue(i64) use WASM_BIGINT');
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      case '*': return HEAPU32[((ptr)>>2)];
      default: abort(`invalid type for getValue: ${type}`);
    }
  }

  var noExitRuntime = Module['noExitRuntime'] || true;

  var ptrToString = (ptr) => {
      assert(typeof ptr === 'number');
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      ptr >>>= 0;
      return '0x' + ptr.toString(16).padStart(8, '0');
    };

  
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
  function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': HEAP8[((ptr)>>0)] = value; break;
      case 'i8': HEAP8[((ptr)>>0)] = value; break;
      case 'i16': HEAP16[((ptr)>>1)] = value; break;
      case 'i32': HEAP32[((ptr)>>2)] = value; break;
      case 'i64': abort('to do setValue(i64) use WASM_BIGINT');
      case 'float': HEAPF32[((ptr)>>2)] = value; break;
      case 'double': HEAPF64[((ptr)>>3)] = value; break;
      case '*': HEAPU32[((ptr)>>2)] = value; break;
      default: abort(`invalid type for setValue: ${type}`);
    }
  }

  var warnOnce = (text) => {
      if (!warnOnce.shown) warnOnce.shown = {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        err(text);
      }
    };

  /** @constructor */
  function ExceptionInfo(excPtr) {
      this.excPtr = excPtr;
      this.ptr = excPtr - 24;
  
      this.set_type = function(type) {
        HEAPU32[(((this.ptr)+(4))>>2)] = type;
      };
  
      this.get_type = function() {
        return HEAPU32[(((this.ptr)+(4))>>2)];
      };
  
      this.set_destructor = function(destructor) {
        HEAPU32[(((this.ptr)+(8))>>2)] = destructor;
      };
  
      this.get_destructor = function() {
        return HEAPU32[(((this.ptr)+(8))>>2)];
      };
  
      this.set_caught = function(caught) {
        caught = caught ? 1 : 0;
        HEAP8[(((this.ptr)+(12))>>0)] = caught;
      };
  
      this.get_caught = function() {
        return HEAP8[(((this.ptr)+(12))>>0)] != 0;
      };
  
      this.set_rethrown = function(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[(((this.ptr)+(13))>>0)] = rethrown;
      };
  
      this.get_rethrown = function() {
        return HEAP8[(((this.ptr)+(13))>>0)] != 0;
      };
  
      // Initialize native structure fields. Should be called once after allocated.
      this.init = function(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
      }
  
      this.set_adjusted_ptr = function(adjustedPtr) {
        HEAPU32[(((this.ptr)+(16))>>2)] = adjustedPtr;
      };
  
      this.get_adjusted_ptr = function() {
        return HEAPU32[(((this.ptr)+(16))>>2)];
      };
  
      // Get pointer which is expected to be received by catch clause in C++ code. It may be adjusted
      // when the pointer is casted to some of the exception object base classes (e.g. when virtual
      // inheritance is used). When a pointer is thrown this method should return the thrown pointer
      // itself.
      this.get_exception_ptr = function() {
        // Work around a fastcomp bug, this code is still included for some reason in a build without
        // exceptions support.
        var isPointer = ___cxa_is_pointer_type(this.get_type());
        if (isPointer) {
          return HEAPU32[((this.excPtr)>>2)];
        }
        var adjusted = this.get_adjusted_ptr();
        if (adjusted !== 0) return adjusted;
        return this.excPtr;
      };
    }
  
  var exceptionLast = 0;
  
  var uncaughtExceptionCount = 0;
  var ___cxa_throw = (ptr, type, destructor) => {
      var info = new ExceptionInfo(ptr);
      // Initialize ExceptionInfo content after it was allocated in __cxa_allocate_exception.
      info.init(type, destructor);
      exceptionLast = ptr;
      uncaughtExceptionCount++;
      assert(false, 'Exception thrown, but exception catching is not enabled. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch.');
    };

  var setErrNo = (value) => {
      HEAP32[((___errno_location())>>2)] = value;
      return value;
    };
  
  var PATH = {
  isAbs:(path) => path.charAt(0) === '/',
  splitPath:(filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
  normalizeArray:(parts, allowAboveRoot) => {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },
  normalize:(path) => {
        var isAbsolute = PATH.isAbs(path),
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter((p) => !!p), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },
  dirname:(path) => {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },
  basename:(path) => {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        path = PATH.normalize(path);
        path = path.replace(/\/$/, "");
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },
  join:function() {
        var paths = Array.prototype.slice.call(arguments);
        return PATH.normalize(paths.join('/'));
      },
  join2:(l, r) => PATH.normalize(l + '/' + r),
  };
  
  var initRandomFill = () => {
      if (typeof crypto == 'object' && typeof crypto['getRandomValues'] == 'function') {
        // for modern web browsers
        return (view) => crypto.getRandomValues(view);
      } else
      // we couldn't find a proper implementation, as Math.random() is not suitable for /dev/random, see emscripten-core/emscripten/pull/7096
      abort("no cryptographic support found for randomDevice. consider polyfilling it if you want to use something insecure like Math.random(), e.g. put this in a --pre-js: var crypto = { getRandomValues: (array) => { for (var i = 0; i < array.length; i++) array[i] = (Math.random()*256)|0 } };");
    };
  var randomFill = (view) => {
      // Lazily init on the first invocation.
      return (randomFill = initRandomFill())(view);
    };
  
  
  
  var PATH_FS = {
  resolve:function() {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path != 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = PATH.isAbs(path);
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter((p) => !!p), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },
  relative:(from, to) => {
        from = PATH_FS.resolve(from).substr(1);
        to = PATH_FS.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      },
  };
  
  
  var UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf8') : undefined;
  
    /**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */
  var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.  Also, use the length info to avoid running tiny
      // strings through TextDecoder, since .subarray() allocates garbage.
      // (As a tiny code save trick, compare endPtr against endIdx using a negation,
      // so that undefined means Infinity)
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      // If building with TextDecoder, we have already computed the string length
      // above, so test loop end condition against that
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte ' + ptrToString(u0) + ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!');
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
  var FS_stdin_getChar_buffer = [];
  
  var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7F) {
          len++;
        } else if (c <= 0x7FF) {
          len += 2;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          len += 4; ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
  
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
      // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
      // undefined and false each don't write out any bytes.
      if (!(maxBytesToWrite > 0))
        return 0;
  
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xD800 && u <= 0xDFFF) {
          var u1 = str.charCodeAt(++i);
          u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
        }
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 0xC0 | (u >> 6);
          heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 0xE0 | (u >> 12);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 0x10FFFF) warnOnce('Invalid Unicode code point ' + ptrToString(u) + ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).');
          heap[outIdx++] = 0xF0 | (u >> 18);
          heap[outIdx++] = 0x80 | ((u >> 12) & 63);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
  /** @type {function(string, boolean=, number=)} */
  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  }
  var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (typeof window != 'undefined' &&
          typeof window.prompt == 'function') {
          // Browser.
          result = window.prompt('Input: ');  // returns null on cancel
          if (result !== null) {
            result += '\n';
          }
        } else if (typeof readline == 'function') {
          // Command line.
          result = readline();
          if (result !== null) {
            result += '\n';
          }
        }
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
  var TTY = {
  ttys:[],
  init() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process.stdin.setEncoding('utf8');
        // }
      },
  shutdown() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process.stdin.pause();
        // }
      },
  register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
  stream_ops:{
  open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
  close(stream) {
          // flush any pending line data
          stream.tty.ops.fsync(stream.tty);
        },
  fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
  read(stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },
  write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        },
  },
  default_tty_ops:{
  get_char(tty) {
          return FS_stdin_getChar();
        },
  put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },
  fsync(tty) {
          if (tty.output && tty.output.length > 0) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        },
  ioctl_tcgets(tty) {
          // typical setting
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
              0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
              0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ]
          };
        },
  ioctl_tcsets(tty, optional_actions, data) {
          // currently just ignore
          return 0;
        },
  ioctl_tiocgwinsz(tty) {
          return [24, 80];
        },
  },
  default_tty1_ops:{
  put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
  fsync(tty) {
          if (tty.output && tty.output.length > 0) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        },
  },
  };
  
  
  var zeroMemory = (address, size) => {
      HEAPU8.fill(0, address, address + size);
      return address;
    };
  
  var alignMemory = (size, alignment) => {
      assert(alignment, "alignment argument is required");
      return Math.ceil(size / alignment) * alignment;
    };
  var mmapAlloc = (size) => {
      size = alignMemory(size, 65536);
      var ptr = _emscripten_builtin_memalign(65536, size);
      if (!ptr) return 0;
      return zeroMemory(ptr, size);
    };
  var MEMFS = {
  ops_table:null,
  mount(mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },
  createNode(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(63);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
          parent.timestamp = node.timestamp;
        }
        return node;
      },
  getFileDataAsTypedArray(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },
  expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
        // avoid overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity); // Allocate new storage.
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
      },
  resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
        } else {
          var oldContents = node.contents;
          node.contents = new Uint8Array(newSize); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
        }
      },
  node_ops:{
  getattr(node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
  setattr(node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
  lookup(parent, name) {
          throw FS.genericErrors[44];
        },
  mknod(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
  rename(old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.parent.timestamp = Date.now()
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          new_dir.timestamp = old_node.parent.timestamp;
          old_node.parent = new_dir;
        },
  unlink(parent, name) {
          delete parent.contents[name];
          parent.timestamp = Date.now();
        },
  rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.timestamp = Date.now();
        },
  readdir(node) {
          var entries = ['.', '..'];
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },
  symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },
  readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        },
  },
  stream_ops:{
  read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },
  write(stream, buffer, offset, length, position, canOwn) {
          // The data buffer should be a typed array view
          assert(!(buffer instanceof ArrayBuffer));
          // If the buffer is located in main memory (HEAP), and if
          // memory can grow, we can't hold on to references of the
          // memory buffer, as they may get invalidated. That means we
          // need to do copy its contents.
          if (buffer.buffer === HEAP8.buffer) {
            canOwn = false;
          }
  
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) {
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = buffer.slice(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) {
            // Use typed array write which is available.
            node.contents.set(buffer.subarray(offset, offset + length), position);
          } else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position + length);
          return length;
        },
  llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
  allocate(stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },
  mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the
            // buffer we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            HEAP8.set(contents, ptr);
          }
          return { ptr, allocated };
        },
  msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        },
  },
  };
  
  /** @param {boolean=} noRunDep */
  var asyncLoad = (url, onload, onerror, noRunDep) => {
      var dep = !noRunDep ? getUniqueRunDependency(`al ${url}`) : '';
      readAsync(url, (arrayBuffer) => {
        assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
        onload(new Uint8Array(arrayBuffer));
        if (dep) removeRunDependency(dep);
      }, (event) => {
        if (onerror) {
          onerror();
        } else {
          throw `Loading data file "${url}" failed.`;
        }
      });
      if (dep) addRunDependency(dep);
    };
  
  
  var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => {
      FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
    };
  
  var preloadPlugins = Module['preloadPlugins'] || [];
  var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
      // Ensure plugins are ready.
      if (typeof Browser != 'undefined') Browser.init();
  
      var handled = false;
      preloadPlugins.forEach((plugin) => {
        if (handled) return;
        if (plugin['canHandle'](fullname)) {
          plugin['handle'](byteArray, fullname, finish, onerror);
          handled = true;
        }
      });
      return handled;
    };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      // TODO we should allow people to just pass in a complete filename instead
      // of parent and name being that we just join them anyways
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`); // might have several active requests for the same fullname
      function processData(byteArray) {
        function finish(byteArray) {
          if (preFinish) preFinish();
          if (!dontCreateFile) {
            FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
          }
          if (onload) onload();
          removeRunDependency(dep);
        }
        if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
          if (onerror) onerror();
          removeRunDependency(dep);
        })) {
          return;
        }
        finish(byteArray);
      }
      addRunDependency(dep);
      if (typeof url == 'string') {
        asyncLoad(url, (byteArray) => processData(byteArray), onerror);
      } else {
        processData(url);
      }
    };
  
  var FS_modeStringToFlags = (str) => {
      var flagModes = {
        'r': 0,
        'r+': 2,
        'w': 512 | 64 | 1,
        'w+': 512 | 64 | 2,
        'a': 1024 | 64 | 1,
        'a+': 1024 | 64 | 2,
      };
      var flags = flagModes[str];
      if (typeof flags == 'undefined') {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
  
  var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
  
  
  
  
  var ERRNO_MESSAGES = {
  0:"Success",
  1:"Arg list too long",
  2:"Permission denied",
  3:"Address already in use",
  4:"Address not available",
  5:"Address family not supported by protocol family",
  6:"No more processes",
  7:"Socket already connected",
  8:"Bad file number",
  9:"Trying to read unreadable message",
  10:"Mount device busy",
  11:"Operation canceled",
  12:"No children",
  13:"Connection aborted",
  14:"Connection refused",
  15:"Connection reset by peer",
  16:"File locking deadlock error",
  17:"Destination address required",
  18:"Math arg out of domain of func",
  19:"Quota exceeded",
  20:"File exists",
  21:"Bad address",
  22:"File too large",
  23:"Host is unreachable",
  24:"Identifier removed",
  25:"Illegal byte sequence",
  26:"Connection already in progress",
  27:"Interrupted system call",
  28:"Invalid argument",
  29:"I/O error",
  30:"Socket is already connected",
  31:"Is a directory",
  32:"Too many symbolic links",
  33:"Too many open files",
  34:"Too many links",
  35:"Message too long",
  36:"Multihop attempted",
  37:"File or path name too long",
  38:"Network interface is not configured",
  39:"Connection reset by network",
  40:"Network is unreachable",
  41:"Too many open files in system",
  42:"No buffer space available",
  43:"No such device",
  44:"No such file or directory",
  45:"Exec format error",
  46:"No record locks available",
  47:"The link has been severed",
  48:"Not enough core",
  49:"No message of desired type",
  50:"Protocol not available",
  51:"No space left on device",
  52:"Function not implemented",
  53:"Socket is not connected",
  54:"Not a directory",
  55:"Directory not empty",
  56:"State not recoverable",
  57:"Socket operation on non-socket",
  59:"Not a typewriter",
  60:"No such device or address",
  61:"Value too large for defined data type",
  62:"Previous owner died",
  63:"Not super-user",
  64:"Broken pipe",
  65:"Protocol error",
  66:"Unknown protocol",
  67:"Protocol wrong type for socket",
  68:"Math result not representable",
  69:"Read only file system",
  70:"Illegal seek",
  71:"No such process",
  72:"Stale file handle",
  73:"Connection timed out",
  74:"Text file busy",
  75:"Cross-device link",
  100:"Device not a stream",
  101:"Bad font file fmt",
  102:"Invalid slot",
  103:"Invalid request code",
  104:"No anode",
  105:"Block device required",
  106:"Channel number out of range",
  107:"Level 3 halted",
  108:"Level 3 reset",
  109:"Link number out of range",
  110:"Protocol driver not attached",
  111:"No CSI structure available",
  112:"Level 2 halted",
  113:"Invalid exchange",
  114:"Invalid request descriptor",
  115:"Exchange full",
  116:"No data (for no delay io)",
  117:"Timer expired",
  118:"Out of streams resources",
  119:"Machine is not on the network",
  120:"Package not installed",
  121:"The object is remote",
  122:"Advertise error",
  123:"Srmount error",
  124:"Communication error on send",
  125:"Cross mount point (not really error)",
  126:"Given log. name not unique",
  127:"f.d. invalid for this operation",
  128:"Remote address changed",
  129:"Can   access a needed shared lib",
  130:"Accessing a corrupted shared lib",
  131:".lib section in a.out corrupted",
  132:"Attempting to link in too many libs",
  133:"Attempting to exec a shared library",
  135:"Streams pipe error",
  136:"Too many users",
  137:"Socket type not supported",
  138:"Not supported",
  139:"Protocol family not supported",
  140:"Can't send after socket shutdown",
  141:"Too many references",
  142:"Host is down",
  148:"No medium (in tape drive)",
  156:"Level 2 not synchronized",
  };
  
  var ERRNO_CODES = {
      'EPERM': 63,
      'ENOENT': 44,
      'ESRCH': 71,
      'EINTR': 27,
      'EIO': 29,
      'ENXIO': 60,
      'E2BIG': 1,
      'ENOEXEC': 45,
      'EBADF': 8,
      'ECHILD': 12,
      'EAGAIN': 6,
      'EWOULDBLOCK': 6,
      'ENOMEM': 48,
      'EACCES': 2,
      'EFAULT': 21,
      'ENOTBLK': 105,
      'EBUSY': 10,
      'EEXIST': 20,
      'EXDEV': 75,
      'ENODEV': 43,
      'ENOTDIR': 54,
      'EISDIR': 31,
      'EINVAL': 28,
      'ENFILE': 41,
      'EMFILE': 33,
      'ENOTTY': 59,
      'ETXTBSY': 74,
      'EFBIG': 22,
      'ENOSPC': 51,
      'ESPIPE': 70,
      'EROFS': 69,
      'EMLINK': 34,
      'EPIPE': 64,
      'EDOM': 18,
      'ERANGE': 68,
      'ENOMSG': 49,
      'EIDRM': 24,
      'ECHRNG': 106,
      'EL2NSYNC': 156,
      'EL3HLT': 107,
      'EL3RST': 108,
      'ELNRNG': 109,
      'EUNATCH': 110,
      'ENOCSI': 111,
      'EL2HLT': 112,
      'EDEADLK': 16,
      'ENOLCK': 46,
      'EBADE': 113,
      'EBADR': 114,
      'EXFULL': 115,
      'ENOANO': 104,
      'EBADRQC': 103,
      'EBADSLT': 102,
      'EDEADLOCK': 16,
      'EBFONT': 101,
      'ENOSTR': 100,
      'ENODATA': 116,
      'ETIME': 117,
      'ENOSR': 118,
      'ENONET': 119,
      'ENOPKG': 120,
      'EREMOTE': 121,
      'ENOLINK': 47,
      'EADV': 122,
      'ESRMNT': 123,
      'ECOMM': 124,
      'EPROTO': 65,
      'EMULTIHOP': 36,
      'EDOTDOT': 125,
      'EBADMSG': 9,
      'ENOTUNIQ': 126,
      'EBADFD': 127,
      'EREMCHG': 128,
      'ELIBACC': 129,
      'ELIBBAD': 130,
      'ELIBSCN': 131,
      'ELIBMAX': 132,
      'ELIBEXEC': 133,
      'ENOSYS': 52,
      'ENOTEMPTY': 55,
      'ENAMETOOLONG': 37,
      'ELOOP': 32,
      'EOPNOTSUPP': 138,
      'EPFNOSUPPORT': 139,
      'ECONNRESET': 15,
      'ENOBUFS': 42,
      'EAFNOSUPPORT': 5,
      'EPROTOTYPE': 67,
      'ENOTSOCK': 57,
      'ENOPROTOOPT': 50,
      'ESHUTDOWN': 140,
      'ECONNREFUSED': 14,
      'EADDRINUSE': 3,
      'ECONNABORTED': 13,
      'ENETUNREACH': 40,
      'ENETDOWN': 38,
      'ETIMEDOUT': 73,
      'EHOSTDOWN': 142,
      'EHOSTUNREACH': 23,
      'EINPROGRESS': 26,
      'EALREADY': 7,
      'EDESTADDRREQ': 17,
      'EMSGSIZE': 35,
      'EPROTONOSUPPORT': 66,
      'ESOCKTNOSUPPORT': 137,
      'EADDRNOTAVAIL': 4,
      'ENETRESET': 39,
      'EISCONN': 30,
      'ENOTCONN': 53,
      'ETOOMANYREFS': 141,
      'EUSERS': 136,
      'EDQUOT': 19,
      'ESTALE': 72,
      'ENOTSUP': 138,
      'ENOMEDIUM': 148,
      'EILSEQ': 25,
      'EOVERFLOW': 61,
      'ECANCELED': 11,
      'ENOTRECOVERABLE': 56,
      'EOWNERDEAD': 62,
      'ESTRPIPE': 135,
    };
  
  var demangle = (func) => {
      warnOnce('warning: build with -sDEMANGLE_SUPPORT to link in libcxxabi demangling');
      return func;
    };
  var demangleAll = (text) => {
      var regex =
        /\b_Z[\w\d_]+/g;
      return text.replace(regex,
        function(x) {
          var y = demangle(x);
          return x === y ? x : (y + ' [' + x + ']');
        });
    };
  var FS = {
  root:null,
  mounts:[],
  devices:{
  },
  streams:[],
  nextInode:1,
  nameTable:null,
  currentPath:"/",
  initialized:false,
  ignorePermissions:true,
  ErrnoError:null,
  genericErrors:{
  },
  filesystems:null,
  syncFSRequests:0,
  lookupPath(path, opts = {}) {
        path = PATH_FS.resolve(path);
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        opts = Object.assign(defaults, opts)
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(32);
        }
  
        // split the absolute path
        var parts = path.split('/').filter((p) => !!p);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
  
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count + 1 });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(32);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },
  getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
  hashName(parentid, name) {
        var hash = 0;
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },
  hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
  hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
  lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },
  createNode(parent, name, mode, rdev) {
        assert(typeof parent == 'object')
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },
  destroyNode(node) {
        FS.hashRemoveNode(node);
      },
  isRoot(node) {
        return node === node.parent;
      },
  isMountpoint(node) {
        return !!node.mounted;
      },
  isFile(mode) {
        return (mode & 61440) === 32768;
      },
  isDir(mode) {
        return (mode & 61440) === 16384;
      },
  isLink(mode) {
        return (mode & 61440) === 40960;
      },
  isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
  isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
  isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
  isSocket(mode) {
        return (mode & 49152) === 49152;
      },
  flagsToPermissionString(flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },
  nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.includes('r') && !(node.mode & 292)) {
          return 2;
        } else if (perms.includes('w') && !(node.mode & 146)) {
          return 2;
        } else if (perms.includes('x') && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
  mayLookup(dir) {
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
  mayCreate(dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },
  mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return 31;
          }
        }
        return 0;
      },
  mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        } else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== 'r' || // opening for write
              (flags & 512)) { // TODO: check for O_SEARCH? (== search for dir only)
            return 31;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },
  MAX_OPEN_FDS:4096,
  nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
  getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
  getStream:(fd) => FS.streams[fd],
  createStream(stream, fd = -1) {
        if (!FS.FSStream) {
          FS.FSStream = /** @constructor */ function() {
            this.shared = { };
          };
          FS.FSStream.prototype = {};
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              /** @this {FS.FSStream} */
              get() { return this.node; },
              /** @this {FS.FSStream} */
              set(val) { this.node = val; }
            },
            isRead: {
              /** @this {FS.FSStream} */
              get() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              /** @this {FS.FSStream} */
              get() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              /** @this {FS.FSStream} */
              get() { return (this.flags & 1024); }
            },
            flags: {
              /** @this {FS.FSStream} */
              get() { return this.shared.flags; },
              /** @this {FS.FSStream} */
              set(val) { this.shared.flags = val; },
            },
            position : {
              /** @this {FS.FSStream} */
              get() { return this.shared.position; },
              /** @this {FS.FSStream} */
              set(val) { this.shared.position = val; },
            },
          });
        }
        // clone it, so we can return an instance of FSStream
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
  closeStream(fd) {
        FS.streams[fd] = null;
      },
  chrdev_stream_ops:{
  open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },
  llseek() {
          throw new FS.ErrnoError(70);
        },
  },
  major:(dev) => ((dev) >> 8),
  minor:(dev) => ((dev) & 0xff),
  makedev:(ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
  getDevice:(dev) => FS.devices[dev],
  getMounts(mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },
  syncfs(populate, callback) {
        if (typeof populate == 'function') {
          callback = populate;
          populate = false;
        }
  
        FS.syncFSRequests++;
  
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function doCallback(errCode) {
          assert(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(errCode);
        }
  
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach((mount) => {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },
  mount(type, opts, mountpoint) {
        if (typeof type == 'string') {
          // The filesystem was not included, and instead we have an error
          // message stored in the variable.
          throw type;
        }
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
  
        var mount = {
          type,
          opts,
          mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },
  unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach((hash) => {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },
  lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
  mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
  create(path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
  mkdir(path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
  mkdirTree(path, mode) {
        var dirs = path.split('/');
        var d = '';
        for (var i = 0; i < dirs.length; ++i) {
          if (!dirs[i]) continue;
          d += '/' + dirs[i];
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != 20) throw e;
          }
        }
      },
  mkdev(path, mode, dev) {
        if (typeof dev == 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
  symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
  rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
  
        // let the errors from non existant directories percolate up
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
  
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },
  rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
  readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(54);
        }
        return node.node_ops.readdir(node);
      },
  unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
  readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
      },
  stat(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(63);
        }
        return node.node_ops.getattr(node);
      },
  lstat(path) {
        return FS.stat(path, true);
      },
  chmod(path, mode, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },
  lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
  fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.chmod(stream.node, mode);
      },
  chown(path, uid, gid, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },
  lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
  fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.chown(stream.node, uid, gid);
      },
  truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },
  ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.truncate(stream.node, len);
      },
  utime(path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },
  open(path, flags, mode) {
        if (path === "") {
          throw new FS.ErrnoError(44);
        }
        flags = typeof flags == 'string' ? FS_modeStringToFlags(flags) : flags;
        mode = typeof mode == 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path == 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(20);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // do truncation if necessary
        if ((flags & 512) && !created) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        });
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
          }
        }
        return stream;
      },
  close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
  isClosed(stream) {
        return stream.fd === null;
      },
  llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
  read(stream, buffer, offset, length, position) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
  write(stream, buffer, offset, length, position, canOwn) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
  allocate(stream, offset, length) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(28);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(138);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },
  mmap(stream, length, position, prot, flags) {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if ((prot & 2) !== 0
            && (flags & 2) === 0
            && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
  msync(stream, buffer, offset, length, mmapFlags) {
        assert(offset >= 0);
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
  munmap:(stream) => 0,
  ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
  readFile(path, opts = {}) {
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error(`Invalid encoding type "${opts.encoding}"`);
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },
  writeFile(path, data, opts = {}) {
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data == 'string') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
        } else if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        } else {
          throw new Error('Unsupported data type');
        }
        FS.close(stream);
      },
  cwd:() => FS.currentPath,
  chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
  createDefaultDirectories() {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },
  createDefaultDevices() {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using err() rather than out()
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        // use a buffer to avoid overhead of individual crypto calls per byte
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = () => {
          if (randomLeft === 0) {
            randomLeft = randomFill(randomBuffer).byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice('/dev', 'random', randomByte);
        FS.createDevice('/dev', 'urandom', randomByte);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },
  createSpecialDirectories() {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
        // name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        var proc_self = FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount() {
            var node = FS.createNode(proc_self, 'fd', 16384 | 511 /* 0777 */, 73);
            node.node_ops = {
              lookup(parent, name) {
                var fd = +name;
                var stream = FS.getStreamChecked(fd);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: () => stream.path },
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },
  createStandardStreams() {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 0);
        var stdout = FS.open('/dev/stdout', 1);
        var stderr = FS.open('/dev/stderr', 1);
        assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
        assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
        assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
      },
  ensureErrnoError() {
        if (FS.ErrnoError) return;
        FS.ErrnoError = /** @this{Object} */ function ErrnoError(errno, node) {
          // We set the `name` property to be able to identify `FS.ErrnoError`
          // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
          // - when using PROXYFS, an error can come from an underlying FS
          // as different FS objects have their own FS.ErrnoError each,
          // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
          // we'll use the reliable test `err.name == "ErrnoError"` instead
          this.name = 'ErrnoError';
          this.node = node;
          this.setErrno = /** @this{Object} */ function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
  
          // Try to get a maximally helpful stack trace. On Node.js, getting Error.stack
          // now ensures it shows what we want.
          if (this.stack) {
            // Define the stack property for Node.js 4, which otherwise errors on the next line.
            Object.defineProperty(this, "stack", { value: (new Error).stack, writable: true });
            this.stack = demangleAll(this.stack);
          }
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [44].forEach((code) => {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },
  staticInit() {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
        };
      },
  init(input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },
  quit() {
        FS.init.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        _fflush(0);
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },
  findObject(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
          return null;
        }
        return ret.object;
      },
  analyzePath(path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },
  createPath(parent, path, canRead, canWrite) {
        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },
  createFile(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
  createDataFile(parent, name, data, canRead, canWrite, canOwn) {
        var path = name;
        if (parent) {
          parent = typeof parent == 'string' ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data == 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
  createDevice(parent, name, input, output) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
  forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest != 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (read_) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(read_(obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
      },
  createLazyFile(parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        /** @constructor */
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = /** @this{Object} */ function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        };
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        };
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
  
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (from, to) => {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
            }
            return intArrayFromString(xhr.responseText || '', true);
          };
          var lazyArray = this;
          lazyArray.setDataGetter((chunkNum) => {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof lazyArray.chunks[chunkNum] == 'undefined') throw new Error('doXHR failed!');
            return lazyArray.chunks[chunkNum];
          });
  
          if (usesGzip || !datalength) {
            // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
            chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
            datalength = this.getter(0).length;
            chunkSize = datalength;
            out("LazyFiles on gzip forces download of the whole file when length is accessed");
          }
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        };
        if (typeof XMLHttpRequest != 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperties(lazyArray, {
            length: {
              get: /** @this{Object} */ function() {
                if (!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._length;
              }
            },
            chunkSize: {
              get: /** @this{Object} */ function() {
                if (!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._chunkSize;
              }
            }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: /** @this {FSNode} */ function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((key) => {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            FS.forceLoadFile(node);
            return fn.apply(null, arguments);
          };
        });
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        // use a custom read function
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position)
        };
        // use a custom mmap function
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },
  absolutePath() {
        abort('FS.absolutePath has been removed; use PATH_FS.resolve instead');
      },
  createFolder() {
        abort('FS.createFolder has been removed; use FS.mkdir instead');
      },
  createLink() {
        abort('FS.createLink has been removed; use FS.symlink instead');
      },
  joinPath() {
        abort('FS.joinPath has been removed; use PATH.join instead');
      },
  mmapAlloc() {
        abort('FS.mmapAlloc has been replaced by the top level function mmapAlloc');
      },
  standardizePath() {
        abort('FS.standardizePath has been removed; use PATH.normalize instead');
      },
  };
  
  
    /**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */
  var UTF8ToString = (ptr, maxBytesToRead) => {
      assert(typeof ptr == 'number', `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
    };
  var SYSCALLS = {
  DEFAULT_POLLMASK:5,
  calculateAt(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
          return path;
        }
        // relative path
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);;
          }
          return dir;
        }
        return PATH.join2(dir, path);
      },
  doStat(func, path, buf) {
        try {
          var stat = func(path);
        } catch (e) {
          if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
            // an error occurred while trying to look up the path; we should just report ENOTDIR
            return -54;
          }
          throw e;
        }
        HEAP32[((buf)>>2)] = stat.dev;
        HEAP32[(((buf)+(4))>>2)] = stat.mode;
        HEAPU32[(((buf)+(8))>>2)] = stat.nlink;
        HEAP32[(((buf)+(12))>>2)] = stat.uid;
        HEAP32[(((buf)+(16))>>2)] = stat.gid;
        HEAP32[(((buf)+(20))>>2)] = stat.rdev;
        (tempI64 = [stat.size>>>0,(tempDouble = stat.size,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(24))>>2)] = tempI64[0],HEAP32[(((buf)+(28))>>2)] = tempI64[1]);
        HEAP32[(((buf)+(32))>>2)] = 4096;
        HEAP32[(((buf)+(36))>>2)] = stat.blocks;
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        var ctime = stat.ctime.getTime();
        (tempI64 = [Math.floor(atime / 1000)>>>0,(tempDouble = Math.floor(atime / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(40))>>2)] = tempI64[0],HEAP32[(((buf)+(44))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(48))>>2)] = (atime % 1000) * 1000;
        (tempI64 = [Math.floor(mtime / 1000)>>>0,(tempDouble = Math.floor(mtime / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(56))>>2)] = tempI64[0],HEAP32[(((buf)+(60))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(64))>>2)] = (mtime % 1000) * 1000;
        (tempI64 = [Math.floor(ctime / 1000)>>>0,(tempDouble = Math.floor(ctime / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(72))>>2)] = tempI64[0],HEAP32[(((buf)+(76))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(80))>>2)] = (ctime % 1000) * 1000;
        (tempI64 = [stat.ino>>>0,(tempDouble = stat.ino,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(88))>>2)] = tempI64[0],HEAP32[(((buf)+(92))>>2)] = tempI64[1]);
        return 0;
      },
  doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          // MAP_PRIVATE calls need not to be synced back to underlying fs
          return 0;
        }
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
  varargs:undefined,
  get() {
        assert(SYSCALLS.varargs != undefined);
        // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
        var ret = HEAP32[((+SYSCALLS.varargs)>>2)];
        SYSCALLS.varargs += 4;
        return ret;
      },
  getp() { return SYSCALLS.get() },
  getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },
  getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
  };
  function ___syscall_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = SYSCALLS.get();
          if (arg < 0) {
            return -28;
          }
          while (FS.streams[arg]) {
            arg++;
          }
          var newStream;
          newStream = FS.createStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = SYSCALLS.get();
          stream.flags |= arg;
          return 0;
        }
        case 5: {
          var arg = SYSCALLS.getp();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)] = 2;
          return 0;
        }
        case 6:
        case 7:
          return 0; // Pretend that the locking is successful.
        case 16:
        case 8:
          return -28; // These are for sockets. We don't have them fully implemented yet.
        case 9:
          // musl trusts getown return values, due to a bug where they must be, as they overlap with errors. just return -1 here, so fcntl() returns that, and we set errno ourselves.
          setErrNo(28);
          return -1;
        default: {
          return -28;
        }
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21505: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = SYSCALLS.getp();
            HEAP32[((argp)>>2)] = termios.c_iflag || 0;
            HEAP32[(((argp)+(4))>>2)] = termios.c_oflag || 0;
            HEAP32[(((argp)+(8))>>2)] = termios.c_cflag || 0;
            HEAP32[(((argp)+(12))>>2)] = termios.c_lflag || 0;
            for (var i = 0; i < 32; i++) {
              HEAP8[(((argp + i)+(17))>>0)] = termios.c_cc[i] || 0;
            }
            return 0;
          }
          return 0;
        }
        case 21510:
        case 21511:
        case 21512: {
          if (!stream.tty) return -59;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = SYSCALLS.getp();
            var c_iflag = HEAP32[((argp)>>2)];
            var c_oflag = HEAP32[(((argp)+(4))>>2)];
            var c_cflag = HEAP32[(((argp)+(8))>>2)];
            var c_lflag = HEAP32[(((argp)+(12))>>2)];
            var c_cc = []
            for (var i = 0; i < 32; i++) {
              c_cc.push(HEAP8[(((argp + i)+(17))>>0)]);
            }
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
          }
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = SYSCALLS.getp();
          HEAP32[((argp)>>2)] = 0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28; // not supported
        }
        case 21531: {
          var argp = SYSCALLS.getp();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          // TODO: in theory we should write to the winsize struct that gets
          // passed in, but for now musl doesn't read anything on it
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = SYSCALLS.getp();
            HEAP16[((argp)>>1)] = winsize[0];
            HEAP16[(((argp)+(2))>>1)] = winsize[1];
          }
          return 0;
        }
        case 21524: {
          // TODO: technically, this ioctl call should change the window size.
          // but, since emscripten doesn't have any concept of a terminal window
          // yet, we'll just silently throw it away as we do TIOCGWINSZ
          if (!stream.tty) return -59;
          return 0;
        }
        case 21515: {
          if (!stream.tty) return -59;
          return 0;
        }
        default: return -28; // not supported
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? SYSCALLS.get() : 0;
      return FS.open(path, flags, mode).fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  var nowIsMonotonic = 1;
  var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;

  var isLeapYear = (year) => year%4 === 0 && (year%100 !== 0 || year%400 === 0);
  
  var MONTH_DAYS_LEAP_CUMULATIVE = [0,31,60,91,121,152,182,213,244,274,305,335];
  
  var MONTH_DAYS_REGULAR_CUMULATIVE = [0,31,59,90,120,151,181,212,243,273,304,334];
  var ydayFromDate = (date) => {
      var leap = isLeapYear(date.getFullYear());
      var monthDaysCumulative = (leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE);
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1; // -1 since it's days since Jan 1
  
      return yday;
    };
  
  var convertI32PairToI53Checked = (lo, hi) => {
      assert(lo == (lo >>> 0) || lo == (lo|0)); // lo should either be a i32 or a u32
      assert(hi === (hi|0));                    // hi should be a i32
      return ((hi + 0x200000) >>> 0 < 0x400001 - !!lo) ? (lo >>> 0) + hi * 4294967296 : NaN;
    };
  function __localtime_js(time_low, time_high,tmPtr) {
    var time = convertI32PairToI53Checked(time_low, time_high);;
  
    
      var date = new Date(time*1000);
      HEAP32[((tmPtr)>>2)] = date.getSeconds();
      HEAP32[(((tmPtr)+(4))>>2)] = date.getMinutes();
      HEAP32[(((tmPtr)+(8))>>2)] = date.getHours();
      HEAP32[(((tmPtr)+(12))>>2)] = date.getDate();
      HEAP32[(((tmPtr)+(16))>>2)] = date.getMonth();
      HEAP32[(((tmPtr)+(20))>>2)] = date.getFullYear()-1900;
      HEAP32[(((tmPtr)+(24))>>2)] = date.getDay();
  
      var yday = ydayFromDate(date)|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;
      HEAP32[(((tmPtr)+(36))>>2)] = -(date.getTimezoneOffset() * 60);
  
      // Attention: DST is in December in South, and some regions don't have DST at all.
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset))|0;
      HEAP32[(((tmPtr)+(32))>>2)] = dst;
    ;
  }

  
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  
  var stringToNewUTF8 = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = _malloc(size);
      if (ret) stringToUTF8(str, ret, size);
      return ret;
    };
  var __tzset_js = (timezone, daylight, tzname) => {
      // TODO: Use (malleable) environment variables instead of system settings.
      var currentYear = new Date().getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
  
      // Local standard timezone offset. Local standard time is not adjusted for daylight savings.
      // This code uses the fact that getTimezoneOffset returns a greater value during Standard Time versus Daylight Saving Time (DST).
      // Thus it determines the expected output during Standard Time, and it compares whether the output of the given date the same (Standard) or less (DST).
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  
      // timezone is specified as seconds west of UTC ("The external variable
      // `timezone` shall be set to the difference, in seconds, between
      // Coordinated Universal Time (UTC) and local standard time."), the same
      // as returned by stdTimezoneOffset.
      // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
      HEAPU32[((timezone)>>2)] = stdTimezoneOffset * 60;
  
      HEAP32[((daylight)>>2)] = Number(winterOffset != summerOffset);
  
      function extractZone(date) {
        var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
        return match ? match[1] : "GMT";
      };
      var winterName = extractZone(winter);
      var summerName = extractZone(summer);
      var winterNamePtr = stringToNewUTF8(winterName);
      var summerNamePtr = stringToNewUTF8(summerName);
      if (summerOffset < winterOffset) {
        // Northern hemisphere
        HEAPU32[((tzname)>>2)] = winterNamePtr;
        HEAPU32[(((tzname)+(4))>>2)] = summerNamePtr;
      } else {
        HEAPU32[((tzname)>>2)] = summerNamePtr;
        HEAPU32[(((tzname)+(4))>>2)] = winterNamePtr;
      }
    };

  var _abort = () => {
      abort('native code called abort()');
    };

  var _emscripten_date_now = () => Date.now();

  var _emscripten_get_now;
      // Modern environment where performance.now() is supported:
      // N.B. a shorter form "_emscripten_get_now = performance.now;" is
      // unfortunately not allowed even in current browsers (e.g. FF Nightly 75).
      _emscripten_get_now = () => performance.now();
  ;

  var _emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);

  var getHeapMax = () =>
      // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
      // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
      // for any code that deals with heap sizes, which would require special
      // casing all heap size related code to treat 0 specially.
      2147483648;
  
  var growMemory = (size) => {
      var b = wasmMemory.buffer;
      var pages = (size - b.byteLength + 65535) / 65536;
      try {
        // round size grow request up to wasm page size (fixed 64KB per spec)
        wasmMemory.grow(pages); // .grow() takes a delta compared to the previous size
        updateMemoryViews();
        return 1 /*success*/;
      } catch(e) {
        err(`growMemory: Attempted to grow heap from ${b.byteLength} bytes to ${size} bytes, but got error: ${e}`);
      }
      // implicit 0 return to save code size (caller will cast "undefined" into 0
      // anyhow)
    };
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      // With multithreaded builds, races can happen (another thread might increase the size
      // in between), so return a failure, and let the caller retry.
      assert(requestedSize > oldSize);
  
      // Memory resize rules:
      // 1.  Always increase heap size to at least the requested size, rounded up
      //     to next page multiple.
      // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
      //     geometrically: increase the heap size according to
      //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
      //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
      // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
      //     linearly: increase the heap size by at least
      //     MEMORY_GROWTH_LINEAR_STEP bytes.
      // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
      //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
      // 4.  If we were unable to allocate as much memory, it may be due to
      //     over-eager decision to excessively reserve due to (3) above.
      //     Hence if an allocation fails, cut down on the amount of excess
      //     growth, in an attempt to succeed to perform a smaller allocation.
  
      // A limit is set for how much we can grow. We should not exceed that
      // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
        return false;
      }
  
      var alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
  
      // Loop through potential heap size increases. If we attempt a too eager
      // reservation that fails, cut down on the attempted size and reserve a
      // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown); // ensure geometric growth
        // but limit overreserving (default to capping at +96MB overgrowth at most)
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296 );
  
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
  
        var replacement = growMemory(newSize);
        if (replacement) {
  
          return true;
        }
      }
      err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
      return false;
    };

  var WS = {
  sockets:[null],
  socketEvent:null,
  };
  
  var _emscripten_websocket_close = (socketId, code, reason) => {
      var socket = WS.sockets[socketId];
      if (!socket) {
        return -3;
      }
  
      var reasonStr = reason ? UTF8ToString(reason) : undefined;
      // According to WebSocket specification, only close codes that are recognized have integer values
      // 1000-4999, with 3000-3999 and 4000-4999 denoting user-specified close codes:
      // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes
      // Therefore be careful to call the .close() function with exact number and types of parameters.
      // Coerce code==0 to undefined, since Wasm->JS call can only marshal integers, and 0 is not allowed.
      if (reason) socket.close(code || undefined, UTF8ToString(reason));
      else if (code) socket.close(code);
      else socket.close();
      return 0;
    };

  
  var _emscripten_websocket_new = (createAttributes) => {
      if (typeof WebSocket == 'undefined') {
        return -1;
      }
      if (!createAttributes) {
        return -5;
      }
  
      var createAttrs = createAttributes>>2;
      var url = UTF8ToString(HEAP32[createAttrs]);
      var protocols = HEAP32[createAttrs+1];
      // TODO: Add support for createOnMainThread==false; currently all WebSocket connections are created on the main thread.
      // var createOnMainThread = HEAP32[createAttrs+2];
  
      var socket = protocols ? new WebSocket(url, UTF8ToString(protocols).split(',')) : new WebSocket(url);
      // We always marshal received WebSocket data back to Wasm, so enable receiving the data as arraybuffers for easy marshalling.
      socket.binaryType = 'arraybuffer';
      // TODO: While strictly not necessary, this ID would be good to be unique across all threads to avoid confusion.
      var socketId = WS.sockets.length;
      WS.sockets[socketId] = socket;
  
      return socketId;
    };

  
  var _emscripten_websocket_send_utf8_text = (socketId, textData) => {
      var socket = WS.sockets[socketId];
      if (!socket) {
        return -3;
      }
  
      var str = UTF8ToString(textData);
      socket.send(str);
      return 0;
    };

  
  
  var wasmTableMirror = [];
  
  var wasmTable;
  var getWasmTableEntry = (funcPtr) => {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      assert(wasmTable.get(funcPtr) == func, "JavaScript-side Wasm function table mirror is out of date!");
      return func;
    };
  var _emscripten_websocket_set_onclose_callback_on_thread = (socketId, userData, callbackFunc, thread) => {
      if (!WS.socketEvent) WS.socketEvent = _malloc(1024); // TODO: sizeof(EmscriptenWebSocketCloseEvent), which is the largest event struct
  
      var socket = WS.sockets[socketId];
      if (!socket) {
        return -3;
      }
  
      socket.onclose = function(e) {
        HEAPU32[WS.socketEvent>>2] = socketId;
        HEAPU32[(WS.socketEvent+4)>>2] = e.wasClean;
        HEAPU32[(WS.socketEvent+8)>>2] = e.code;
        stringToUTF8(e.reason, WS.socketEvent+10, 512);
        getWasmTableEntry(callbackFunc)(0/*TODO*/, WS.socketEvent, userData);
      }
      return 0;
    };

  
  var _emscripten_websocket_set_onerror_callback_on_thread = (socketId, userData, callbackFunc, thread) => {
      if (!WS.socketEvent) WS.socketEvent = _malloc(1024); // TODO: sizeof(EmscriptenWebSocketCloseEvent), which is the largest event struct
  
      var socket = WS.sockets[socketId];
      if (!socket) {
        return -3;
      }
  
      socket.onerror = function(e) {
        HEAPU32[WS.socketEvent>>2] = socketId;
        getWasmTableEntry(callbackFunc)(0/*TODO*/, WS.socketEvent, userData);
      }
      return 0;
    };

  
  
  
  
  var _emscripten_websocket_set_onmessage_callback_on_thread = (socketId, userData, callbackFunc, thread) => {
      if (!WS.socketEvent) WS.socketEvent = _malloc(1024); // TODO: sizeof(EmscriptenWebSocketCloseEvent), which is the largest event struct
  
      var socket = WS.sockets[socketId];
      if (!socket) {
        return -3;
      }
  
      socket.onmessage = function(e) {
        HEAPU32[WS.socketEvent>>2] = socketId;
        if (typeof e.data == 'string') {
          var buf = stringToNewUTF8(e.data);
          var len = lengthBytesUTF8(e.data)+1;
          HEAPU32[(WS.socketEvent+12)>>2] = 1; // text data
        } else {
          var len = e.data.byteLength;
          var buf = _malloc(len);
          HEAP8.set(new Uint8Array(e.data), buf);
          HEAPU32[(WS.socketEvent+12)>>2] = 0; // binary data
        }
        HEAPU32[(WS.socketEvent+4)>>2] = buf;
        HEAPU32[(WS.socketEvent+8)>>2] = len;
        getWasmTableEntry(callbackFunc)(0/*TODO*/, WS.socketEvent, userData);
        _free(buf);
      }
      return 0;
    };

  
  var _emscripten_websocket_set_onopen_callback_on_thread = (socketId, userData, callbackFunc, thread) => {
  // TODO:
  //    if (thread == 2 ||
  //      (thread == _pthread_self()) return emscripten_websocket_set_onopen_callback_on_calling_thread(socketId, userData, callbackFunc);
  
      if (!WS.socketEvent) WS.socketEvent = _malloc(1024); // TODO: sizeof(EmscriptenWebSocketCloseEvent), which is the largest event struct
  
      var socket = WS.sockets[socketId];
      if (!socket) {
        return -3;
      }
  
      socket.onopen = function(e) {
        HEAPU32[WS.socketEvent>>2] = socketId;
        getWasmTableEntry(callbackFunc)(0/*TODO*/, WS.socketEvent, userData);
      }
      return 0;
    };

  var ENV = {
  };
  
  var getExecutableName = () => {
      return thisProgram || './this.program';
    };
  var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        // Default values.
        // Browser language detection #8751
        var lang = ((typeof navigator == 'object' && navigator.languages && navigator.languages[0]) || 'C').replace('-', '_') + '.UTF-8';
        var env = {
          'USER': 'web_user',
          'LOGNAME': 'web_user',
          'PATH': '/',
          'PWD': '/',
          'HOME': '/home/web_user',
          'LANG': lang,
          '_': getExecutableName()
        };
        // Apply the user-provided values, if any.
        for (var x in ENV) {
          // x is a key in ENV; if ENV[x] is undefined, that means it was
          // explicitly set to be so. We allow user code to do that to
          // force variables with default values to remain unset.
          if (ENV[x] === undefined) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
  
  var stringToAscii = (str, buffer) => {
      for (var i = 0; i < str.length; ++i) {
        assert(str.charCodeAt(i) === (str.charCodeAt(i) & 0xff));
        HEAP8[((buffer++)>>0)] = str.charCodeAt(i);
      }
      // Null-terminate the string
      HEAP8[((buffer)>>0)] = 0;
    };
  
  var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      getEnvStrings().forEach((string, i) => {
        var ptr = environ_buf + bufSize;
        HEAPU32[(((__environ)+(i*4))>>2)] = ptr;
        stringToAscii(string, ptr);
        bufSize += string.length + 1;
      });
      return 0;
    };

  
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[((penviron_count)>>2)] = strings.length;
      var bufSize = 0;
      strings.forEach((string) => bufSize += string.length + 1);
      HEAPU32[((penviron_buf_size)>>2)] = bufSize;
      return 0;
    };

  function _fd_close(fd) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  /** @param {number=} offset */
  var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break; // nothing more to read
        if (typeof offset !== 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_read(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  
  function _fd_seek(fd,offset_low, offset_high,whence,newOffset) {
    var offset = convertI32PairToI53Checked(offset_low, offset_high);;
  
    
  try {
  
      if (isNaN(offset)) return 61;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      (tempI64 = [stream.position>>>0,(tempDouble = stream.position,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[((newOffset)>>2)] = tempI64[0],HEAP32[(((newOffset)+(4))>>2)] = tempI64[1]);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  ;
  }

  /** @param {number=} offset */
  var doWritev = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (typeof offset !== 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_write(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  
  var arraySum = (array, index) => {
      var sum = 0;
      for (var i = 0; i <= index; sum += array[i++]) {
        // no-op
      }
      return sum;
    };
  
  
  var MONTH_DAYS_LEAP = [31,29,31,30,31,30,31,31,30,31,30,31];
  
  var MONTH_DAYS_REGULAR = [31,28,31,30,31,30,31,31,30,31,30,31];
  var addDays = (date, days) => {
      var newDate = new Date(date.getTime());
      while (days > 0) {
        var leap = isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR)[currentMonth];
  
        if (days > daysInCurrentMonth-newDate.getDate()) {
          // we spill over to next month
          days -= (daysInCurrentMonth-newDate.getDate()+1);
          newDate.setDate(1);
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth+1)
          } else {
            newDate.setMonth(0);
            newDate.setFullYear(newDate.getFullYear()+1);
          }
        } else {
          // we stay in current month
          newDate.setDate(newDate.getDate()+days);
          return newDate;
        }
      }
  
      return newDate;
    };
  
  
  
  
  var writeArrayToMemory = (array, buffer) => {
      assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
      HEAP8.set(array, buffer);
    };
  
  var _strftime = (s, maxsize, format, tm) => {
      // size_t strftime(char *restrict s, size_t maxsize, const char *restrict format, const struct tm *restrict timeptr);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/strftime.html
  
      var tm_zone = HEAPU32[(((tm)+(40))>>2)];
  
      var date = {
        tm_sec: HEAP32[((tm)>>2)],
        tm_min: HEAP32[(((tm)+(4))>>2)],
        tm_hour: HEAP32[(((tm)+(8))>>2)],
        tm_mday: HEAP32[(((tm)+(12))>>2)],
        tm_mon: HEAP32[(((tm)+(16))>>2)],
        tm_year: HEAP32[(((tm)+(20))>>2)],
        tm_wday: HEAP32[(((tm)+(24))>>2)],
        tm_yday: HEAP32[(((tm)+(28))>>2)],
        tm_isdst: HEAP32[(((tm)+(32))>>2)],
        tm_gmtoff: HEAP32[(((tm)+(36))>>2)],
        tm_zone: tm_zone ? UTF8ToString(tm_zone) : ''
      };
      
  
      var pattern = UTF8ToString(format);
  
      // expand format
      var EXPANSION_RULES_1 = {
        '%c': '%a %b %d %H:%M:%S %Y',     // Replaced by the locale's appropriate date and time representation - e.g., Mon Aug  3 14:02:01 2013
        '%D': '%m/%d/%y',                 // Equivalent to %m / %d / %y
        '%F': '%Y-%m-%d',                 // Equivalent to %Y - %m - %d
        '%h': '%b',                       // Equivalent to %b
        '%r': '%I:%M:%S %p',              // Replaced by the time in a.m. and p.m. notation
        '%R': '%H:%M',                    // Replaced by the time in 24-hour notation
        '%T': '%H:%M:%S',                 // Replaced by the time
        '%x': '%m/%d/%y',                 // Replaced by the locale's appropriate date representation
        '%X': '%H:%M:%S',                 // Replaced by the locale's appropriate time representation
        // Modified Conversion Specifiers
        '%Ec': '%c',                      // Replaced by the locale's alternative appropriate date and time representation.
        '%EC': '%C',                      // Replaced by the name of the base year (period) in the locale's alternative representation.
        '%Ex': '%m/%d/%y',                // Replaced by the locale's alternative date representation.
        '%EX': '%H:%M:%S',                // Replaced by the locale's alternative time representation.
        '%Ey': '%y',                      // Replaced by the offset from %EC (year only) in the locale's alternative representation.
        '%EY': '%Y',                      // Replaced by the full alternative year representation.
        '%Od': '%d',                      // Replaced by the day of the month, using the locale's alternative numeric symbols, filled as needed with leading zeros if there is any alternative symbol for zero; otherwise, with leading <space> characters.
        '%Oe': '%e',                      // Replaced by the day of the month, using the locale's alternative numeric symbols, filled as needed with leading <space> characters.
        '%OH': '%H',                      // Replaced by the hour (24-hour clock) using the locale's alternative numeric symbols.
        '%OI': '%I',                      // Replaced by the hour (12-hour clock) using the locale's alternative numeric symbols.
        '%Om': '%m',                      // Replaced by the month using the locale's alternative numeric symbols.
        '%OM': '%M',                      // Replaced by the minutes using the locale's alternative numeric symbols.
        '%OS': '%S',                      // Replaced by the seconds using the locale's alternative numeric symbols.
        '%Ou': '%u',                      // Replaced by the weekday as a number in the locale's alternative representation (Monday=1).
        '%OU': '%U',                      // Replaced by the week number of the year (Sunday as the first day of the week, rules corresponding to %U ) using the locale's alternative numeric symbols.
        '%OV': '%V',                      // Replaced by the week number of the year (Monday as the first day of the week, rules corresponding to %V ) using the locale's alternative numeric symbols.
        '%Ow': '%w',                      // Replaced by the number of the weekday (Sunday=0) using the locale's alternative numeric symbols.
        '%OW': '%W',                      // Replaced by the week number of the year (Monday as the first day of the week) using the locale's alternative numeric symbols.
        '%Oy': '%y',                      // Replaced by the year (offset from %C ) using the locale's alternative numeric symbols.
      };
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_1[rule]);
      }
  
      var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
      function leadingSomething(value, digits, character) {
        var str = typeof value == 'number' ? value.toString() : (value || '');
        while (str.length < digits) {
          str = character[0]+str;
        }
        return str;
      }
  
      function leadingNulls(value, digits) {
        return leadingSomething(value, digits, '0');
      }
  
      function compareByDay(date1, date2) {
        function sgn(value) {
          return value < 0 ? -1 : (value > 0 ? 1 : 0);
        }
  
        var compare;
        if ((compare = sgn(date1.getFullYear()-date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth()-date2.getMonth())) === 0) {
            compare = sgn(date1.getDate()-date2.getDate());
          }
        }
        return compare;
      }
  
      function getFirstWeekStartDate(janFourth) {
          switch (janFourth.getDay()) {
            case 0: // Sunday
              return new Date(janFourth.getFullYear()-1, 11, 29);
            case 1: // Monday
              return janFourth;
            case 2: // Tuesday
              return new Date(janFourth.getFullYear(), 0, 3);
            case 3: // Wednesday
              return new Date(janFourth.getFullYear(), 0, 2);
            case 4: // Thursday
              return new Date(janFourth.getFullYear(), 0, 1);
            case 5: // Friday
              return new Date(janFourth.getFullYear()-1, 11, 31);
            case 6: // Saturday
              return new Date(janFourth.getFullYear()-1, 11, 30);
          }
      }
  
      function getWeekBasedYear(date) {
          var thisDate = addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);
  
          var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
          var janFourthNextYear = new Date(thisDate.getFullYear()+1, 0, 4);
  
          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  
          if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
            // this date is after the start of the first week of this year
            if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
              return thisDate.getFullYear()+1;
            }
            return thisDate.getFullYear();
          }
          return thisDate.getFullYear()-1;
      }
  
      var EXPANSION_RULES_2 = {
        '%a': (date) => WEEKDAYS[date.tm_wday].substring(0,3) ,
        '%A': (date) => WEEKDAYS[date.tm_wday],
        '%b': (date) => MONTHS[date.tm_mon].substring(0,3),
        '%B': (date) => MONTHS[date.tm_mon],
        '%C': (date) => {
          var year = date.tm_year+1900;
          return leadingNulls((year/100)|0,2);
        },
        '%d': (date) => leadingNulls(date.tm_mday, 2),
        '%e': (date) => leadingSomething(date.tm_mday, 2, ' '),
        '%g': (date) => {
          // %g, %G, and %V give values according to the ISO 8601:2000 standard week-based year.
          // In this system, weeks begin on a Monday and week 1 of the year is the week that includes
          // January 4th, which is also the week that includes the first Thursday of the year, and
          // is also the first week that contains at least four days in the year.
          // If the first Monday of January is the 2nd, 3rd, or 4th, the preceding days are part of
          // the last week of the preceding year; thus, for Saturday 2nd January 1999,
          // %G is replaced by 1998 and %V is replaced by 53. If December 29th, 30th,
          // or 31st is a Monday, it and any following days are part of week 1 of the following year.
          // Thus, for Tuesday 30th December 1997, %G is replaced by 1998 and %V is replaced by 01.
  
          return getWeekBasedYear(date).toString().substring(2);
        },
        '%G': (date) => getWeekBasedYear(date),
        '%H': (date) => leadingNulls(date.tm_hour, 2),
        '%I': (date) => {
          var twelveHour = date.tm_hour;
          if (twelveHour == 0) twelveHour = 12;
          else if (twelveHour > 12) twelveHour -= 12;
          return leadingNulls(twelveHour, 2);
        },
        '%j': (date) => {
          // Day of the year (001-366)
          return leadingNulls(date.tm_mday + arraySum(isLeapYear(date.tm_year+1900) ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, date.tm_mon-1), 3);
        },
        '%m': (date) => leadingNulls(date.tm_mon+1, 2),
        '%M': (date) => leadingNulls(date.tm_min, 2),
        '%n': () => '\n',
        '%p': (date) => {
          if (date.tm_hour >= 0 && date.tm_hour < 12) {
            return 'AM';
          }
          return 'PM';
        },
        '%S': (date) => leadingNulls(date.tm_sec, 2),
        '%t': () => '\t',
        '%u': (date) => date.tm_wday || 7,
        '%U': (date) => {
          var days = date.tm_yday + 7 - date.tm_wday;
          return leadingNulls(Math.floor(days / 7), 2);
        },
        '%V': (date) => {
          // Replaced by the week number of the year (Monday as the first day of the week)
          // as a decimal number [01,53]. If the week containing 1 January has four
          // or more days in the new year, then it is considered week 1.
          // Otherwise, it is the last week of the previous year, and the next week is week 1.
          // Both January 4th and the first Thursday of January are always in week 1. [ tm_year, tm_wday, tm_yday]
          var val = Math.floor((date.tm_yday + 7 - (date.tm_wday + 6) % 7 ) / 7);
          // If 1 Jan is just 1-3 days past Monday, the previous week
          // is also in this year.
          if ((date.tm_wday + 371 - date.tm_yday - 2) % 7 <= 2) {
            val++;
          }
          if (!val) {
            val = 52;
            // If 31 December of prev year a Thursday, or Friday of a
            // leap year, then the prev year has 53 weeks.
            var dec31 = (date.tm_wday + 7 - date.tm_yday - 1) % 7;
            if (dec31 == 4 || (dec31 == 5 && isLeapYear(date.tm_year%400-1))) {
              val++;
            }
          } else if (val == 53) {
            // If 1 January is not a Thursday, and not a Wednesday of a
            // leap year, then this year has only 52 weeks.
            var jan1 = (date.tm_wday + 371 - date.tm_yday) % 7;
            if (jan1 != 4 && (jan1 != 3 || !isLeapYear(date.tm_year)))
              val = 1;
          }
          return leadingNulls(val, 2);
        },
        '%w': (date) => date.tm_wday,
        '%W': (date) => {
          var days = date.tm_yday + 7 - ((date.tm_wday + 6) % 7);
          return leadingNulls(Math.floor(days / 7), 2);
        },
        '%y': (date) => {
          // Replaced by the last two digits of the year as a decimal number [00,99]. [ tm_year]
          return (date.tm_year+1900).toString().substring(2);
        },
        // Replaced by the year as a decimal number (for example, 1997). [ tm_year]
        '%Y': (date) => date.tm_year+1900,
        '%z': (date) => {
          // Replaced by the offset from UTC in the ISO 8601:2000 standard format ( +hhmm or -hhmm ).
          // For example, "-0430" means 4 hours 30 minutes behind UTC (west of Greenwich).
          var off = date.tm_gmtoff;
          var ahead = off >= 0;
          off = Math.abs(off) / 60;
          // convert from minutes into hhmm format (which means 60 minutes = 100 units)
          off = (off / 60)*100 + (off % 60);
          return (ahead ? '+' : '-') + String("0000" + off).slice(-4);
        },
        '%Z': (date) => date.tm_zone,
        '%%': () => '%'
      };
  
      // Replace %% with a pair of NULLs (which cannot occur in a C string), then
      // re-inject them after processing.
      pattern = pattern.replace(/%%/g, '\0\0')
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.includes(rule)) {
          pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_2[rule](date));
        }
      }
      pattern = pattern.replace(/\0\0/g, '%')
  
      var bytes = intArrayFromString(pattern, false);
      if (bytes.length > maxsize) {
        return 0;
      }
  
      writeArrayToMemory(bytes, s);
      return bytes.length-1;
    };
  var _strftime_l = (s, maxsize, format, tm, loc) => {
      return _strftime(s, maxsize, format, tm); // no locale support yet
    };

  
  var runtimeKeepaliveCounter = 0;
  var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
  
  var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        if (Module['onExit']) Module['onExit'](code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
  
  /** @param {boolean|number=} implicit */
  var exitJS = (status, implicit) => {
      EXITSTATUS = status;
  
      checkUnflushedContent();
  
      // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
      if (keepRuntimeAlive() && !implicit) {
        var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
        err(msg);
      }
  
      _proc_exit(status);
    };

  var handleException = (e) => {
      // Certain exception types we do not treat as errors since they are used for
      // internal control flow.
      // 1. ExitStatus, which is thrown by exit()
      // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
      //    that wish to return to JS event loop.
      if (e instanceof ExitStatus || e == 'unwind') {
        return EXITSTATUS;
      }
      checkStackCookie();
      if (e instanceof WebAssembly.RuntimeError) {
        if (_emscripten_stack_get_current() <= 0) {
          err('Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)');
        }
      }
      quit_(1, e);
    };

  
  var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };

  var getCFunc = (ident) => {
      var func = Module['_' + ident]; // closure exported function
      assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
      return func;
    };
  
  
  
  
    /**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Arguments|Array=} args
     * @param {Object=} opts
     */
  var ccall = (ident, returnType, argTypes, args, opts) => {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== 'array', 'Return type should not be "array".');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func.apply(null, cArgs);
      function onDone(ret) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret);
      }
  
      ret = onDone(ret);
      return ret;
    };

  
  
    /**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */
  var cwrap = (ident, returnType, argTypes, opts) => {
      return function() {
        return ccall(ident, returnType, argTypes, arguments, opts);
      }
    };

  var FSNode = /** @constructor */ function(parent, name, mode, rdev) {
    if (!parent) {
      parent = this;  // root node sets parent to itself
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev;
  };
  var readMode = 292/*292*/ | 73/*73*/;
  var writeMode = 146/*146*/;
  Object.defineProperties(FSNode.prototype, {
   read: {
    get: /** @this{FSNode} */function() {
     return (this.mode & readMode) === readMode;
    },
    set: /** @this{FSNode} */function(val) {
     val ? this.mode |= readMode : this.mode &= ~readMode;
    }
   },
   write: {
    get: /** @this{FSNode} */function() {
     return (this.mode & writeMode) === writeMode;
    },
    set: /** @this{FSNode} */function(val) {
     val ? this.mode |= writeMode : this.mode &= ~writeMode;
    }
   },
   isFolder: {
    get: /** @this{FSNode} */function() {
     return FS.isDir(this.mode);
    }
   },
   isDevice: {
    get: /** @this{FSNode} */function() {
     return FS.isChrdev(this.mode);
    }
   }
  });
  FS.FSNode = FSNode;
  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.staticInit();;
function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
}
var wasmImports = {
  /** @export */
  __cxa_throw: ___cxa_throw,
  /** @export */
  __syscall_fcntl64: ___syscall_fcntl64,
  /** @export */
  __syscall_ioctl: ___syscall_ioctl,
  /** @export */
  __syscall_openat: ___syscall_openat,
  /** @export */
  _emscripten_get_now_is_monotonic: __emscripten_get_now_is_monotonic,
  /** @export */
  _localtime_js: __localtime_js,
  /** @export */
  _tzset_js: __tzset_js,
  /** @export */
  abort: _abort,
  /** @export */
  emscripten_date_now: _emscripten_date_now,
  /** @export */
  emscripten_get_now: _emscripten_get_now,
  /** @export */
  emscripten_memcpy_js: _emscripten_memcpy_js,
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */
  emscripten_websocket_close: _emscripten_websocket_close,
  /** @export */
  emscripten_websocket_new: _emscripten_websocket_new,
  /** @export */
  emscripten_websocket_send_utf8_text: _emscripten_websocket_send_utf8_text,
  /** @export */
  emscripten_websocket_set_onclose_callback_on_thread: _emscripten_websocket_set_onclose_callback_on_thread,
  /** @export */
  emscripten_websocket_set_onerror_callback_on_thread: _emscripten_websocket_set_onerror_callback_on_thread,
  /** @export */
  emscripten_websocket_set_onmessage_callback_on_thread: _emscripten_websocket_set_onmessage_callback_on_thread,
  /** @export */
  emscripten_websocket_set_onopen_callback_on_thread: _emscripten_websocket_set_onopen_callback_on_thread,
  /** @export */
  environ_get: _environ_get,
  /** @export */
  environ_sizes_get: _environ_sizes_get,
  /** @export */
  fd_close: _fd_close,
  /** @export */
  fd_read: _fd_read,
  /** @export */
  fd_seek: _fd_seek,
  /** @export */
  fd_write: _fd_write,
  /** @export */
  strftime_l: _strftime_l
};
var wasmExports = createWasm();
var ___wasm_call_ctors = createExportWrapper('__wasm_call_ctors');
var _startMining = Module['_startMining'] = createExportWrapper('startMining');
var _stopMining = Module['_stopMining'] = createExportWrapper('stopMining');
var _main = Module['_main'] = createExportWrapper('__main_argc_argv');
var _malloc = createExportWrapper('malloc');
var _free = createExportWrapper('free');
var ___errno_location = createExportWrapper('__errno_location');
var _fflush = Module['_fflush'] = createExportWrapper('fflush');
var _emscripten_builtin_memalign = createExportWrapper('emscripten_builtin_memalign');
var setTempRet0 = createExportWrapper('setTempRet0');
var _emscripten_stack_init = () => (_emscripten_stack_init = wasmExports['emscripten_stack_init'])();
var _emscripten_stack_get_free = () => (_emscripten_stack_get_free = wasmExports['emscripten_stack_get_free'])();
var _emscripten_stack_get_base = () => (_emscripten_stack_get_base = wasmExports['emscripten_stack_get_base'])();
var _emscripten_stack_get_end = () => (_emscripten_stack_get_end = wasmExports['emscripten_stack_get_end'])();
var stackSave = createExportWrapper('stackSave');
var stackRestore = createExportWrapper('stackRestore');
var stackAlloc = createExportWrapper('stackAlloc');
var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports['emscripten_stack_get_current'])();
var ___cxa_is_pointer_type = createExportWrapper('__cxa_is_pointer_type');
var dynCall_jiji = Module['dynCall_jiji'] = createExportWrapper('dynCall_jiji');
var dynCall_viijii = Module['dynCall_viijii'] = createExportWrapper('dynCall_viijii');
var dynCall_iiiiij = Module['dynCall_iiiiij'] = createExportWrapper('dynCall_iiiiij');
var dynCall_iiiiijj = Module['dynCall_iiiiijj'] = createExportWrapper('dynCall_iiiiijj');
var dynCall_iiiiiijj = Module['dynCall_iiiiiijj'] = createExportWrapper('dynCall_iiiiiijj');


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

Module['wasmMemory'] = wasmMemory;
Module['ccall'] = ccall;
Module['cwrap'] = cwrap;
var missingLibrarySymbols = [
  'writeI53ToI64',
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'readI53FromI64',
  'readI53FromU64',
  'convertI32PairToI53',
  'convertU32PairToI53',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'getHostByName',
  'getCallstack',
  'emscriptenLog',
  'convertPCtoSourceLocation',
  'readEmAsmArgs',
  'jstoi_q',
  'jstoi_s',
  'listenOnce',
  'autoResumeAudioContext',
  'dynCallLegacy',
  'getDynCaller',
  'dynCall',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'callUserCallback',
  'maybeExit',
  'asmjsMangle',
  'handleAllocatorInit',
  'HandleAllocator',
  'getNativeTypeSize',
  'STACK_SIZE',
  'STACK_ALIGN',
  'POINTER_SIZE',
  'ASSERTIONS',
  'uleb128Encode',
  'sigToWasmTypes',
  'generateFuncType',
  'convertJsFunctionToWasm',
  'getEmptyTableSlot',
  'updateTableMap',
  'getFunctionAddress',
  'addFunction',
  'removeFunction',
  'reallyNegative',
  'unSign',
  'strLen',
  'reSign',
  'formatString',
  'intArrayToString',
  'AsciiToString',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'registerKeyEventCallback',
  'maybeCStringToJsString',
  'findEventTarget',
  'findCanvasEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'battery',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'jsStackTrace',
  'stackTrace',
  'checkWasiClock',
  'wasiRightsToMuslOFlags',
  'wasiOFlagsToMuslOFlags',
  'createDyncallWrapper',
  'safeSetTimeout',
  'setImmediateWrapped',
  'clearImmediateWrapped',
  'polyfillSetImmediate',
  'getPromise',
  'makePromise',
  'idsToPromises',
  'makePromiseCallback',
  'findMatchingCatch',
  'setMainLoop',
  'getSocketFromFD',
  'getSocketAddress',
  'FS_unlink',
  'FS_mkdirTree',
  '_setNetworkCallback',
  'heapObjectForWebGLType',
  'heapAccessShiftForWebGLHeap',
  'webgl_enable_ANGLE_instanced_arrays',
  'webgl_enable_OES_vertex_array_object',
  'webgl_enable_WEBGL_draw_buffers',
  'webgl_enable_WEBGL_multi_draw',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'colorChannelsInGlTextureFormat',
  'emscriptenWebGLGetTexPixelData',
  '__glGenObject',
  'emscriptenWebGLGetUniform',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'emscriptenWebGLGetVertexAttrib',
  '__glGetActiveAttribOrUniform',
  'writeGLArray',
  'registerWebGlEventCallback',
  'runAndAbortIfError',
  'SDL_unicode',
  'SDL_ttfContext',
  'SDL_audio',
  'ALLOC_NORMAL',
  'ALLOC_STACK',
  'allocate',
  'writeStringToMemory',
  'writeAsciiToMemory',
];
missingLibrarySymbols.forEach(missingLibrarySymbol)

var unexportedSymbols = [
  'run',
  'addOnPreRun',
  'addOnInit',
  'addOnPreMain',
  'addOnExit',
  'addOnPostRun',
  'addRunDependency',
  'removeRunDependency',
  'FS_createFolder',
  'FS_createPath',
  'FS_createLazyFile',
  'FS_createLink',
  'FS_createDevice',
  'FS_readFile',
  'out',
  'err',
  'callMain',
  'abort',
  'wasmExports',
  'stackAlloc',
  'stackSave',
  'stackRestore',
  'getTempRet0',
  'setTempRet0',
  'writeStackCookie',
  'checkStackCookie',
  'intArrayFromBase64',
  'tryParseAsDataURI',
  'convertI32PairToI53Checked',
  'ptrToString',
  'zeroMemory',
  'exitJS',
  'getHeapMax',
  'growMemory',
  'ENV',
  'MONTH_DAYS_REGULAR',
  'MONTH_DAYS_LEAP',
  'MONTH_DAYS_REGULAR_CUMULATIVE',
  'MONTH_DAYS_LEAP_CUMULATIVE',
  'isLeapYear',
  'ydayFromDate',
  'arraySum',
  'addDays',
  'ERRNO_CODES',
  'ERRNO_MESSAGES',
  'setErrNo',
  'DNS',
  'Protocols',
  'Sockets',
  'initRandomFill',
  'randomFill',
  'timers',
  'warnOnce',
  'UNWIND_CACHE',
  'readEmAsmArgsArray',
  'getExecutableName',
  'handleException',
  'keepRuntimeAlive',
  'asyncLoad',
  'alignMemory',
  'mmapAlloc',
  'wasmTable',
  'noExitRuntime',
  'getCFunc',
  'freeTableIndexes',
  'functionsInTableMap',
  'setValue',
  'getValue',
  'PATH',
  'PATH_FS',
  'UTF8Decoder',
  'UTF8ArrayToString',
  'UTF8ToString',
  'stringToUTF8Array',
  'stringToUTF8',
  'lengthBytesUTF8',
  'intArrayFromString',
  'stringToAscii',
  'UTF16Decoder',
  'stringToNewUTF8',
  'stringToUTF8OnStack',
  'writeArrayToMemory',
  'JSEvents',
  'specialHTMLTargets',
  'currentFullscreenStrategy',
  'restoreOldWindowedStyle',
  'demangle',
  'demangleAll',
  'ExitStatus',
  'getEnvStrings',
  'doReadv',
  'doWritev',
  'promiseMap',
  'uncaughtExceptionCount',
  'exceptionLast',
  'exceptionCaught',
  'ExceptionInfo',
  'Browser',
  'wget',
  'SYSCALLS',
  'preloadPlugins',
  'FS_createPreloadedFile',
  'FS_modeStringToFlags',
  'FS_getMode',
  'FS_stdin_getChar_buffer',
  'FS_stdin_getChar',
  'FS',
  'FS_createDataFile',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'miniTempWebGLIntBuffers',
  'GL',
  'emscripten_webgl_power_preferences',
  'AL',
  'GLUT',
  'EGL',
  'GLEW',
  'IDBStore',
  'SDL',
  'SDL_gfx',
  'allocateUTF8',
  'allocateUTF8OnStack',
  'WS',
];
unexportedSymbols.forEach(unexportedRuntimeSymbol);



var calledRun;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};

function callMain(args = []) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  var entryFunction = _main;

  args.unshift(thisProgram);

  var argc = args.length;
  var argv = stackAlloc((argc + 1) * 4);
  var argv_ptr = argv;
  args.forEach((arg) => {
    HEAPU32[((argv_ptr)>>2)] = stringToUTF8OnStack(arg);
    argv_ptr += 4;
  });
  HEAPU32[((argv_ptr)>>2)] = 0;

  try {

    var ret = entryFunction(argc, argv);

    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  }
  catch (e) {
    return handleException(e);
  }
}

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

function run(args = arguments_) {

  if (runDependencies > 0) {
    return;
  }

    stackCheckInit();

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    preMain();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (shouldRunNow) callMain(args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
  checkStackCookie();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
    _fflush(0);
    // also flush in the JS FS layer
    ['stdout', 'stderr'].forEach(function(name) {
      var info = FS.analyzePath('/dev/' + name);
      if (!info) return;
      var stream = info.object;
      var rdev = stream.rdev;
      var tty = TTY.ttys[rdev];
      if (tty && tty.output && tty.output.length) {
        has = true;
      }
    });
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.');
  }
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;

if (Module['noInitialRun']) shouldRunNow = false;

run();


// end include: postamble.js
