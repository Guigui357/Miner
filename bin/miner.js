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
  wasmBinaryFile = 'data:application/octet-stream;base64,AGFzbQEAAAABrQRGYAF/AX9gAn9/AX9gAn9/AGABfwBgA39/fwF/YAN/f38AYAAAYAZ/f39/f38Bf2AEf39/fwBgAAF/YAV/f39/fwF/YAR/f39/AX9gBn9/f39/fwBgCH9/f39/f39/AX9gBX9/f39/AGAHf39/f39/fwBgB39/f39/f38Bf2ABfwF+YAABfmAFf35+fn4AYAN/fn8BfmAFf39/f34Bf2AFf39+f38AYAZ/f39/fn8Bf2ACf34Bf2ACf38BfmAEf39/fwF+YAp/f39/f39/f39/AGAHf39/f39+fgF/YAJ8fwF8YAJ/fgBgBH9+fn8AYAp/f39/f39/f39/AX9gBn9/f39+fgF/YAABfGADf39+AGACf38BfWACf38BfGADf39/AX5gBH9/f34BfmAGf3x/f39/AX9gAn5/AX9gBH5+fn4Bf2ADf35/AX9gA39/fwF9YAN/f38BfGAMf39/f39/f39/f39/AX9gBX9/f398AX9gBn9/f398fwF/YAd/f39/fn5/AX9gC39/f39/f39/f39/AX9gD39/f39/f39/f39/f39/fwBgCH9/f39/f39/AGAEf39/fgBgAX4Bf2ACfn4Bf2ADf35+AGADfn9/AX9gAXwBfmACf3wAYAJ/fQBgAn5+AXxgAn5+AX1gBH9/fn8BfmAGf39/fn9/AGAGf39/f39+AX9gCH9/f39/f35+AX9gCX9/f39/f39/fwF/YAJ+fwBgBH9+f38BfwLUBhoDZW52C19fY3hhX3Rocm93AAUDZW52I2Vtc2NyaXB0ZW5fd2Vic29ja2V0X3NlbmRfdXRmOF90ZXh0AAEDZW52GGVtc2NyaXB0ZW5fd2Vic29ja2V0X25ldwAAA2VudjJlbXNjcmlwdGVuX3dlYnNvY2tldF9zZXRfb25vcGVuX2NhbGxiYWNrX29uX3RocmVhZAALA2VudjVlbXNjcmlwdGVuX3dlYnNvY2tldF9zZXRfb25tZXNzYWdlX2NhbGxiYWNrX29uX3RocmVhZAALA2VudjNlbXNjcmlwdGVuX3dlYnNvY2tldF9zZXRfb25jbG9zZV9jYWxsYmFja19vbl90aHJlYWQACwNlbnYzZW1zY3JpcHRlbl93ZWJzb2NrZXRfc2V0X29uZXJyb3JfY2FsbGJhY2tfb25fdGhyZWFkAAsDZW52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//////8AgyIJIAMgBEL///////////8AgyIKEO0BQQBKDQACQCABIAkgAyAKEO0BRQ0AIAEhBAwCCyAFQfAAaiABIAJCAEIAEPcBIAVB+ABqKQMAIQIgBSkDcCEEDAELIARCMIinQf//AXEhBgJAAkAgCEUNACABIQQMAQsgBUHgAGogASAJQgBCgICAgICAwLvAABD3ASAFQegAaikDACIJQjCIp0GIf2ohCCAFKQNgIQQLAkAgBg0AIAVB0ABqIAMgCkIAQoCAgICAgMC7wAAQ9wEgBUHYAGopAwAiCkIwiKdBiH9qIQYgBSkDUCEDCyAKQv///////z+DQoCAgICAgMAAhCELIAlC////////P4NCgICAgICAwACEIQkCQCAIIAZMDQADQAJAAkAgCSALfSAEIANUrX0iCkIAUw0AAkAgCiAEIAN9IgSEQgBSDQAgBUEgaiABIAJCAEIAEPcBIAVBKGopAwAhAiAFKQMgIQQMBQsgCkIBhiAEQj+IhCEJDAELIAlCAYYgBEI/iIQhCQsgBEIBhiEEIAhBf2oiCCAGSg0ACyAGIQgLAkACQCAJIAt9IAQgA1StfSIKQgBZDQAgCSEKDAELIAogBCADfSIEhEIAUg0AIAVBMGogASACQgBCABD3ASAFQThqKQMAIQIgBSkDMCEEDAELAkAgCkL///////8/Vg0AA0AgBEI/iCEDIAhBf2ohCCAEQgGGIQQgAyAKQgGGhCIKQoCAgICAgMAAVA0ACwsgB0GAgAJxIQYCQCAIQQBKDQAgBUHAAGogBCAKQv///////z+DIAhB+ABqIAZyrUIwhoRCAEKAgICAgIDAwz8Q9wEgBUHIAGopAwAhAiAFKQNAIQQMAQsgCkL///////8/gyAIIAZyrUIwhoQhAgsgACAENwMAIAAgAjcDCCAFQYABaiQACxwAIAAgAkL///////////8AgzcDCCAAIAE3AwALhwkCBX8DfiMAQTBrIgQkAEIAIQkCQAJAIAJBAksNACACQQJ0IgJBvJQEaigCACEFIAJBsJQEaigCACEGA0ACQAJAIAEoAgQiAiABKAJoRg0AIAEgAkEBajYCBCACLQAAIQIMAQsgARCyASECCyACELMBDQALQQEhBwJAAkAgAkFVag4DAAEAAQtBf0EBIAJBLUYbIQcCQCABKAIEIgIgASgCaEYN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BhC9ASIUQoCAgICAgICAgH9SDQAgBkUNBEIAIRQgASkDcEIAUw0AIAEgASgCBEF/ajYCBAsgFCASfCESDAQLIAtFIQ4gAkEASA0BCyABKQNwQgBTDQAgASABKAIEQX9qNgIECyAORQ0BEKABQRw2AgALQgAhEyABQgAQsQFCACESDAELAkAgBygCkAYiAQ0AIAcgBbdEAAAAAAAAAACiEPABIAdBCGopAwAhEiAHKQMAIRMMAQsCQCATQglVDQAgEiATUg0AAkAgA0EeSg0AIAEgA3YNAQsgB0EwaiAFEPIBIAdBIGogARDzASAHQRBqIAcpAzAgB0EwakEIaikDACAHKQMgIAdBIGpBCGopAwAQ9wEgB0EQakEIaikDACESIAcpAxAhEwwBCwJAIBIgCUEBdq1XDQAQoAFBxAA2AgAgB0HgAGogBRDyASAHQdAAaiAHKQNgIAdB4ABqQQhqKQMAQn9C////////v///ABD3ASAHQcAAaiAHKQNQIAdB0ABqQQhqKQMAQn9C////////v///ABD3ASAHQcAAakEIaikDACESIAcpA0AhEwwBCwJAIBIgBEGefmqsWQ0AEKABQcQANgIAIAdBkAFqIAUQ8gEgB0GAAWogBykDkAEgB0GQAWpBCGopAwBCAEKAgICAgIDAABD3ASAHQfAAaiAHKQOAASAHQYABakEIaikDAEIAQoCAgICAgMAAEPcBIAdB8ABqQQhqKQMAIRIgBykDcCETDAELAkAgEEUNAAJAIBBBCEoNACAHQZAGaiAPQQJ0aiICKAIAIQEDQCABQQpsIQEgEEEBaiIQQQlHDQALIAIgATYCAAsgD0EBaiEPCyASpyEQAkAgDEEJTg0AIAwgEEoNACAQQRFKDQACQCAQQQlHDQAgB0HAAWogBRDyASAHQbABaiAHKAKQBhDzASAHQaABaiAHKQPAASAHQcABakEIaikDACAHKQOwASAHQbABakEIaikDABD3ASAHQaABakEIaikDACESIAcpA6ABIRMMAgsCQCAQQQhKDQAgB0GQAmogBRDyASAHQYACaiAHKAKQBhDzASAHQfABaiAHKQOQAiAHQZACakEIaikDACAHKQOAAiAHQYACakEIaikDABD3ASAHQeABakEIIBBrQQJ0QZCUBGooAgAQ8gEgB0HQAWogBykD8AEgB0HwAWpBCGopAwAgBykD4AEgB0HgAWpBCGopAwAQ7wEgB0HQAWpBCGopAwAhEiAHKQPQASETDAILIAcoApAGIQECQCADIBBBfWxqQRtqIgJBHkoNACABIAJ2DQELIAdB4AJqIAUQ8gEgB0HQAmogARDzASAHQcACaiAHKQPgAiAHQeACakEIaikDACAHKQPQAiAHQdACakEIaikDABD3ASAHQbACaiAQQQJ0QeiTBGooAgAQ8gEgB0GgAmogBykDwAIgB0HAAmpBCGopAwAgBykDsAIgB0GwAmpBCGopAwAQ9wEgB0GgAmpBCGopAwAhEiAHKQOgAiETDAELA0AgB0GQBmogDyIOQX9qIg9BAnRqKAIARQ0AC0EAIQwCQAJAIBBBCW8iAQ0AQQAhDQwBC0EAIQ0gAUEJaiABIBBBAEgbIQkCQAJAIA4NAEEAIQ4MAQtBgJTr3ANBCCAJa0ECdEGQlARqKAIAIgttIQZBACECQQAhAUEAIQ0DQCAHQZAGaiABQQJ0aiIPIA8oAgAiDyALbiIIIAJqIgI2AgAgDUEBakH/D3EgDSABIA1GIAJFcSICGyENIBBBd2ogECACGyEQIAYgDyAIIAtsa2whAiABQQFqIgEgDkcNAAsgAkUNACAHQZAGaiAOQQJ0aiACNgIAIA5BAWohDgsgECAJa0EJaiEQCwNAIAdBkAZqIA1BAnRqIQkgEEEkSCEGAkADQAJAIAYNACAQQSRHDQIgCSgCAEHR6fkETw0CCyAOQf8PaiEPQQAhCwNAIA4hAgJAAkAgB0GQBmogD0H/D3EiAUECdGoiDjUCAEIdhiALrXwiEkKBlOvcA1oNAEEAIQsMAQsgEiASQoCU69wDgCITQoCU69wDfn0hEiATpyELCyAOIBKnIg82AgAgAiACIAIgASAPGyABIA1GGyABIAJBf2pB/w9xIghHGyEOIAFBf2ohDyABIA1HDQALIAxBY2ohDCACIQ4gC0UNAAsCQAJAIA1Bf2pB/w9xIg0gAkYNACACIQ4MAQsgB0GQBmogAkH+D2pB/w9xQQJ0aiIBIAEoAgAgB0GQBmogCEECdGooAgByNgIAIAghDgsgEEEJaiEQIAdBkAZqIA1BAnRqIAs2AgAMAQsLAkADQCAOQQFqQf8PcSERIAdBkAZqIA5Bf2pB/w9xQQJ0aiEJA0BBCUEBIBBBLUobIQ8CQANAIA0hC0EAIQECQAJAA0AgASALakH/D3EiAiAORg0BIAdBkAZqIAJBAnRqKAIAIgIgAUECdEGAlARqKAIAIg1JDQEgAiANSw0CIAFBAWoiAUEERw0ACwsgEEEkRw0AQgAhEkEAIQFCACETA0ACQCABIAtqQf8PcSICIA5HDQAgDkEBakH/D3EiDkECdCAHQZAGampBfGpBADYCAAsgB0GABmogB0GQBmogAkECdGooAgAQ8wEgB0HwBWogEiATQgBCgICAgOWat47AABD3ASAHQeAFaiAHKQPwBSAHQfAFakEIaikDACAHKQOABiAHQYAGakEIaikDABDrASAHQeAFakEIaikDACETIAcpA+AFIRIgAUEBaiIBQQRHDQALIAdB0AVqIAUQ8gEgB0HABWogEiATIAcpA9AFIAdB0AVqQQhqKQMAEPcBIAdBwAVqQQhqKQMAIRNCACESIAcpA8AFIRQgDEHxAGoiDSAEayIBQQAgAUEAShsgAyABIANIIggbIgJB8ABMDQJCACEVQgAhFkIAIRcMBQsgDyAMaiEMIA4hDSALIA5GDQALQYCU69wDIA92IQhBfyAPdEF/cyEGQQAhASALIQ0DQCAHQZAGaiALQQJ0aiICIAIoAgAiAiAPdiABaiIBNgIAIA1BAWpB/w9xIA0gCyANRiABRXEiARshDSAQQXdqIBAgARshECACIAZxIAhsIQEgC0EBakH/D3EiCyAORw0ACyABRQ0BAkAgESANRg0AIAdBkAZqIA5BAnRqIAE2AgAgESEODAMLIAkgCSgCAEEBcjYCAAwBCwsLIAdBkAVqRAAAAAAAAPA/QeEBIAJrELQBEPABIAdBsAVqIAcpA5AFIAdBkAVqQQhqKQMAIBQgExC1ASAHQbAFakEIaikDACEXIAcpA7AFIRYgB0GABWpEAAAAAAAA8D9B8QAgAmsQtAEQ8AEgB0GgBWogFCATIAcpA4AFIAdBgAVqQQhqKQMAELgBIAdB8ARqIBQgEyAHKQOgBSISIAdBoAVqQQhqKQMAIhUQ+QEgB0HgBGogFiAXIAcpA/AEIAdB8ARqQQhqKQMAEOsBIAdB4ARqQQhqKQMAIRMgBykD4AQhFAsCQCALQQRqQf8PcSIPIA5GDQACQAJAIAdBkAZqIA9BAnRqKAIAIg9B/8m17gFLDQACQCAPDQAgC0EFakH/D3EgDkYNAgsgB0HwA2ogBbdEAAAAAAAA0D+iEPABIAdB4ANqIBIgFSAHKQPwAyAHQfADakEIaikDABDrASAHQeADakEIaikDACEVIAcpA+ADIRIMAQsCQCAPQYDKte4BRg0AIAdB0ARqIAW3RAAAAAAAAOg/ohDwASAHQcAEaiASIBUgBykD0AQgB0HQBGpBCGopAwAQ6wEgB0HABGpBCGopAwAhFSAHKQPABCESDAELIAW3IRgCQCALQQVqQf8PcSAORw0AIAdBkARqIBhEAAAAAAAA4D+iEPABIAdBgARqIBIgFSAHKQOQBCAHQZAEakEIaikDABDrASAHQYAEakEIaikDACEVIAcpA4AEIRIMAQsgB0GwBGogGEQAAAAAAADoP6IQ8AEgB0GgBGogEiAVIAcpA7AEIAdBsARqQQhqKQMAEOsBIAdBoARqQQhqKQMAIRUgBykDoAQhEgsgAkHvAEoNACAHQdADaiASIBVCAEKAgICAgIDA/z8QuAEgBykD0AMgB0HQA2pBCGopAwBCAEIAEO0BDQAgB0HAA2ogEiAVQgBCgICAgICAwP8/EOsBIAdBwANqQQhqKQMAIRUgBykDwAMhEgsgB0GwA2ogFCATIBIgFRDrASAHQaADaiAHKQOwAyAHQbADakEIaikDACAWIBcQ+QEgB0GgA2pBCGopAwAhEyAHKQOgAyEUAkAgDUH/////B3EgCkF+akwNACAHQZADaiAUIBMQuQEgB0GAA2ogFCATQgBCgICAgICAgP8/EPcBIAcpA5ADIAdBkANqQQhqKQMAQgBCgICAgICAgLjAABDuASENIAdBgANqQQhqKQMAIBMgDUF/SiIOGyETIAcpA4ADIBQgDhshFCASIBVCAEIAEO0BIQsCQCAMIA5qIgxB7gBqIApKDQAgCCACIAFHIA1BAEhycSALQQBHcUUNAQsQoAFBxAA2AgALIAdB8AJqIBQgEyAMELYBIAdB8AJqQQhqKQMAIRIgBykD8AIhEwsgACASNwMIIAAgEzcDACAHQZDGAGokAAvEBAIEfwF+AkACQCAAKAIEIgIgACgCaEYNACAAIAJBAWo2AgQgAi0AACEDDAELIAAQsgEhAwsCQAJAAkACQAJAIANBVWoOAwABAAELAkACQCAAKAIEIgIgACgCaEYNACAAIAJBAWo2AgQgAi0AACECDAELIAAQsgEhAgsgA0EtRiEEIAJBRmohBSABRQ0BIAVBdUsNASAAKQNwQgBTDQIgACAAKAIEQX9qNgIEDAILIANBRmohBUEAIQQgAyECCyAFQXZJDQBCACEGAkAgAkFQakEKTw0AQQAhAwNAIAIgA0EKbGohAwJAAkAgACgCBCICIAAoAmhGDQAgACACQQFqNgIEIAItAAAhAgwBCyAAELIBIQILIANBUGohAwJAIAJBUGoiBUEJSw0AIANBzJmz5gBIDQELCyADrCEGIAVBCk8NAANAIAKtIAZCCn58IQYCQAJAIAAoAgQiAiAAKAJoRg0AIAAgAkEBajYCBCACLQAAIQIMAQsgABCyASECCyAGQlB8IQYCQCACQVBqIgNBCUsNACAGQq6PhdfHwuujAVMNAQsLIANBCk8NAANAAkACQCAAKAIEIgIgACgCaEYNACAAIAJBAWo2AgQgAi0AACECDAELIAAQsgEhAgsgAkFQakEKSQ0ACwsCQCAAKQNwQgBTDQAgACAAKAIEQX9qNgIEC0IAIAZ9IAYgBBshBgwBC0KAgICAgICAgIB/IQYgACkDcEIAUw0AIAAgACgCBEF/ajYCBEKAgICAgICAgIB/DwsgBgs1AgF/AX0jAEEQayICJAAgAiAAIAFBABC/ASACKQMAIAJBCGopAwAQ+wEhAyACQRBqJAAgAwuGAQIBfwJ+IwBBoAFrIgQkACAEIAE2AjwgBCABNgIUIARBfzYCGCAEQRBqQgAQsQEgBCAEQRBqIANBARC6ASAEQQhqKQMAIQUgBCkDACEGAkAgAkUNACACIAEgBCgCFCAEKAI8a2ogBCgCiAFqNgIACyAAIAU3AwggACAGNwMAIARBoAFqJAALNQIBfwF8IwBBEGsiAiQAIAIgACABQQEQvwEgAikDACACQQhqKQMAEPoBIQMgAkEQaiQAIAMLPAIBfwF+IwBBEGsiAyQAIAMgASACQQIQvwEgAykDACEEIAAgA0EIaikDADcDCCAAIAQ3AwAgA0EQaiQACw0AIAAgASACQn8QwwELtQQCB38EfiMAQRBrIgQkAAJAAkACQAJAIAJBJEoNAEEAIQUgAC0AACIGDQEgACEHDAILEKABQRw2AgBCACEDDAILIAAhBwJAA0AgBsAQswFFDQEgBy0AASEGIAdBAWoiCCEHIAYNAAsgCCEHDAELAkAgBy0AACIGQVVqDgMAAQABC0F/QQAgBkEtRhshBSAHQQFqIQcLAkACQCACQRByQRBHDQAgBy0AAEEwRw0AQQEhCQJAIActAAFB3wFxQdgARw0AIAdBAmohB0EQIQoMAgsgB0EBaiEHIAJBCCACGyEKDAELIAJBCiACGyEKQQAhCQsgCq0hC0EAIQJCACEMAkADQEFQIQYCQCAHLAAAIghBUGpB/wFxQQpJDQBBqX8hBiAIQZ9/akH/AXFBGkkNAEFJIQYgCEG/f2pB/wFxQRlLDQILIAYgCGoiCCAKTg0BIAQgC0IAIAxCABD4AUEBIQYCQCAEKQMIQgBSDQAgDCALfiINIAitIg5Cf4VWDQAgDSAOfCEMQQEhCSACIQYLIAdBAWohByAGIQIMAAsACwJAIAFFDQAgASAHIAAgCRs2AgALAkACQAJAIAJFDQAQoAFBxAA2AgAgBUEAIANCAYMiC1AbIQUgAyEMDAELIAwgA1QNASADQgGDIQsLAkAgC0IAUg0AIAUNABCgAUHEADYCACADQn98IQMMAgsgDCADWA0AEKABQcQANgIADAELIAwgBawiC4UgC30hAwsgBEEQaiQAIAMLFgAgACABIAJCgICAgICAgICAfxDDAQsSACAAIAEgAkKAgICACBDDAacLHgACQCAAQYFgSQ0AEKABQQAgAGs2AgBBfyEACyAACwsAIABBv39qQRpJCw8AIABBIHIgACAAEMcBGwtHAAJAQQAtAJSVBUEBcQ0AQfyUBRCUARoCQEEALQCUlQVBAXENAEGkkwVBqJMFQayTBRAMQQBBAToAlJUFC0H8lAUQlQEaCwtcAQF/IAAgACgCSCIBQX9qIAFyNgJIAkAgACgCACIBQQhxRQ0AIAAgAUEgcjYCAEF/DwsgAEIANwIEIAAgACgCLCIBNgIcIAAgATYCFCAAIAEgACgCMGo2AhBBAAsXAQF/IABBACABEJ4BIgIgAGsgASACGwuPAQIBfgF/AkAgAL0iAkI0iKdB/w9xIgNB/w9GDQACQCADDQACQAJAIABEAAAAAAAAAABiDQBBACEDDAELIABEAAAAAAAA8EOiIAEQzAEhACABKAIAQUBqIQMLIAEgAzYCACAADwsgASADQYJ4ajYCACACQv////////+HgH+DQoCAgICAgIDwP4S/IQALIAAL0QEBA38CQAJAIAIoAhAiAw0AQQAhBCACEMoBDQEgAigCECEDCwJAIAMgAigCFCIEayABTw0AIAIgACABIAIoAiQRBAAPCwJAAkAgAigCUEEASA0AIAFFDQAgASEDAkADQCAAIANqIgVBf2otAABBCkYNASADQX9qIgNFDQIMAAsACyACIAAgAyACKAIkEQQAIgQgA0kNAiABIANrIQEgAigCFCEEDAELIAAhBUEAIQMLIAQgBSABEI4BGiACIAIoAhQgAWo2AhQgAyABaiEECyAEC1sBAn8gAiABbCEEAkACQCADKAJMQX9KDQAgACAEIAMQzQEhAAwBCyADEK0BIQUgACAEIAMQzQEhACAFRQ0AIAMQrgELAkAgACAERw0AIAJBACABGw8LIAAgAW4L8QIBBH8jAEHQAWsiBSQAIAUgAjYCzAEgBUGgAWpBAEEoEI8BGiAFIAUoAswBNgLIAQJAAkBBACABIAVByAFqIAVB0ABqIAVBoAFqIAMgBBDQAUEATg0AQX8hBAwBCwJAAkAgACgCTEEATg0AQQEhBgwBCyAAEK0BRSEGCyAAIAAoAgAiB0FfcTYCAAJAAkACQAJAIAAoAjANACAAQdAANgIwIABBADYCHCAAQgA3AxAgACgCLCEIIAAgBTYCLAwBC0EAIQggACgCEA0BC0F/IQIgABDKAQ0BCyAAIAEgBUHIAWogBUHQAGogBUGgAWogAyAEENABIQILIAdBIHEhBAJAIAhFDQAgAEEAQQAgACgCJBEEABogAEEANgIwIAAgCDYCLCAAQQA2AhwgACgCFCEDIABCADcDECACQX8gAxshAgsgACAAKAIAIgMgBHI2AgBBfyACIANBIHEbIQQgBg0AIAAQrgELIAVB0AFqJAAgBAu7EwIVfwF+IwBB0ABrIgckACAHIAE2AkwgBEHAfmohCCADQYB9aiEJIAdBN2ohCiAHQThqIQtBACEMQQAhDQJAAkACQANAQQAhDgNAIAEhDyAOIA1B/////wdzSg0CIA4gDWohDSAPIQ4CQAJAAkACQAJAIA8tAAAiEEUNAANAAkACQAJAIBBB/wFxIhANACAOIQEMAQsgEEElRw0BIA4hEANAAkAgEC0AAUElRg0AIBAhAQwCCyAOQQFqIQ4gEC0AAiERIBBBAmoiASEQIBFBJUYNAAsLIA4gD2siDiANQf////8HcyIQSg0JAkAgAEUNACAAIA8gDhDRAQsgDg0HIAcgATYCTCABQQFqIQ5BfyESAkAgASwAARCRAUUNACABLQACQSRHDQAgAUEDaiEOIAEsAAFBUGohEkEBIQwLIAcgDjYCTEEAIRMCQAJAIA4sAAAiFEFgaiIBQR9NDQAgDiERDAELQQAhEyAOIRFBASABdCIBQYnRBHFFDQADQCAHIA5BAWoiETYCTCABIBNyIRMgDiwAASIUQWBqIgFBIE8NASARIQ5BASABdCIBQYnRBHENAAsLAkACQCAUQSpHDQAgEUEBaiEUAkACQCARLAABEJEBRQ0AIBEtAAJBJEcNACAULAAAIQ4CQAJAIAANACAIIA5BAnRqQQo2AgBBACEVDAELIAkgDkEDdGooAgAhFQsgEUEDaiEUQQEhDAwBCyAMDQYCQCAADQAgByAUNgJMQQAhDEEAIRUMAwsgAiACKAIAIg5BBGo2AgAgDigCACEVQQAhDAsgByAUNgJMIBVBf0oNAUEAIBVrIRUgE0GAwAByIRMMAQsgB0HMAGoQ0gEiFUEASA0KIAcoAkwhFAtBACEOQX8hFgJAAkAgFC0AAEEuRg0AIBQhAUEAIRcMAQsCQCAULQABQSpHDQAgFEECaiEBAkACQCAULAACEJEBRQ0AIBQtAANBJEcNACABLAAAIRECQAJAIAANACAIIBFBAnRqQQo2AgBBACEWDAELIAkgEUEDdGooAgAhFgsgFEEEaiEBDAELIAwNBgJAIAANAEEAIRYMAQsgAiACKAIAIhFBBGo2AgAgESgCACEWCyAHIAE2AkwgFkF/SiEXDAELIAcgFEEBajYCTEEBIRcgB0HMAGoQ0gEhFiAHKAJMIQELA0AgDiERQRwhGCABIhQsAAAiDkGFf2pBRkkNCyAUQQFqIQEgDiARQTpsakGPlARqLQAAIg5Bf2pBCEkNAAsgByABNgJMAkACQCAOQRtGDQAgDkUNDAJAIBJBAEgNAAJAIAANACAEIBJBAnRqIA42AgAMDAsgByADIBJBA3RqKQMANwNADAILIABFDQggB0HAAGogDiACIAYQ0wEMAQsgEkF/Sg0LQQAhDiAARQ0IC0F/IRggAC0AAEEgcQ0LIBNB//97cSIZIBMgE0GAwABxGyETQQAhEkHygAQhGiALIRsCQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCAULAAAIg5BX3EgDiAOQQ9xQQNGGyAOIBEbIg5BqH9qDiEEFRUVFRUVFRUOFQ8GDg4OFQYVFRUVAgUDFRUJFQEVFQQACyALIRsCQCAOQb9/ag4HDhULFQ4ODgALIA5B0wBGDQkMEwtBACESQfKABCEaIAcpA0AhHAwFC0EAIQ4CQAJAAkACQAJAAkACQCARQf8BcQ4IAAECAwQbBQYbCyAHKAJAIA02AgAMGgsgBygCQCANNgIADBkLIAcoAkAgDaw3AwAMGAsgBygCQCANOwEADBcLIAcoAkAgDToAAAwWCyAHKAJAIA02AgAMFQsgBygCQCANrDcDAAwUCyAWQQggFkEISxshFiATQQhyIRNB+AAhDgsgBykDQCALIA5BIHEQ1AEhD0EAIRJB8oAEIRogBykDQFANAyATQQhxRQ0DIA5BBHZB8oAEaiEaQQIhEgwDC0EAIRJB8oAEIRogBykDQCALENUBIQ8gE0EIcUUNAiAWIAsgD2siDkEBaiAWIA5KGyEWDAILAkAgBykDQCIcQn9VDQAgB0IAIBx9Ihw3A0BBASESQfKABCEaDAELAkAgE0GAEHFFDQBBASESQfOABCEaDAELQfSABEHygAQgE0EBcSISGyEaCyAcIAsQ1gEhDwsgFyAWQQBIcQ0QIBNB//97cSATIBcbIRMCQCAHKQNAIhxCAFINACAWDQAgCyEPIAshG0EAIRYMDQsgFiALIA9rIBxQaiIOIBYgDkobIRYMCwsgBygCQCIOQfKNBCAOGyEPIA8gDyAWQf////8HIBZB/////wdJGxDLASIOaiEbAkAgFkF/TA0AIBkhEyAOIRYMDAsgGSETIA4hFiAbLQAADQ8MCwsCQCAWRQ0AIAcoAkAhEAwCC0EAIQ4gAEEgIBVBACATENcBDAILIAdBADYCDCAHIAcpA0A+AgggByAHQQhqNgJAIAdBCGohEEF/IRYLQQAhDgJAA0AgECgCACIRRQ0BAkAgB0EEaiAREN8BIhFBAEgiDw0AIBEgFiAOa0sNACAQQQRqIRAgESAOaiIOIBZJDQEMAgsLIA8NDwtBPSEYIA5BAEgNDSAAQSAgFSAOIBMQ1wECQCAODQBBACEODAELQQAhESAHKAJAIRADQCAQKAIAIg9FDQEgB0EEaiAPEN8BIg8gEWoiESAOSw0BIAAgB0EEaiAPENEBIBBBBGohECARIA5JDQALCyAAQSAgFSAOIBNBgMAAcxDXASAVIA4gFSAOShshDgwJCyAXIBZBAEhxDQpBPSEYIAAgBysDQCAVIBYgEyAOIAURKAAiDkEATg0IDAsLIAcgBykDQDwAN0EBIRYgCiEPIAshGyAZIRMMBQsgDi0AASEQIA5BAWohDgwACwALIA0hGCAADQggDEUNA0EBIQ4CQANAIAQgDkECdGooAgAiEEUNASADIA5BA3RqIBAgAiAGENMBQQEhGCAOQQFqIg5BCkcNAAwKCwALQQEhGCAOQQpPDQgDQCAEIA5BAnRqKAIADQFBASEYIA5BAWoiDkEKRg0JDAALAAtBHCEYDAYLIAshGwsgFiAbIA9rIgEgFiABShsiFCASQf////8Hc0oNA0E9IRggFSASIBRqIhEgFSARShsiDiAQSg0EIABBICAOIBEgExDXASAAIBogEhDRASAAQTAgDiARIBNBgIAEcxDXASAAQTAgFCABQQAQ1wEgACAPIAEQ0QEgAEEgIA4gESATQYDAAHMQ1wEgBygCTCEBDAELCwtBACEYDAILQT0hGAsQoAEgGDYCAEF/IRgLIAdB0ABqJAAgGAsZAAJAIAAtAABBIHENACABIAIgABDNARoLC3QBA39BACEBAkAgACgCACwAABCRAQ0AQQAPCwNAIAAoAgAhAkF/IQMCQCABQcyZs+YASw0AQX8gAiwAAEFQaiIDIAFBCmwiAWogAyABQf////8Hc0obIQMLIAAgAkEBajYCACADIQEgAiwAARCRAQ0ACyADC7YEAAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAFBd2oOEgABAgUDBAYHCAkKCwwNDg8QERILIAIgAigCACIBQQRqNgIAIAAgASgCADYCAA8LIAIgAigCACIBQQRqNgIAIAAgATQCADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATUCADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATQCADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATUCADcDAA8LIAIgAigCAEEHakF4cSIBQQhqNgIAIAAgASkDADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATIBADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATMBADcDAA8LIAIgAigCACIBQQRqNgIAIAAg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AgAiAw0AIAZBEGohBCAGKAIQIgMNAAsgBUEANgIADAILIAIgA0F+cTYCBCAAIAFBAXI2AgQgACABaiABNgIADAMLQQAhBgsgB0UNAAJAAkAgAiACKAIcIgRBAnRByJcFaiIDKAIARw0AIAMgBjYCACAGDQFBAEEAKAKclQVBfiAEd3E2ApyVBQwCCyAHQRBBFCAHKAIQIAJGG2ogBjYCACAGRQ0BCyAGIAc2AhgCQCACKAIQIgNFDQAgBiADNgIQIAMgBjYCGAsgAkEUaigCACIDRQ0AIAZBFGogAzYCACADIAY2AhgLIAAgAUEBcjYCBCAAIAFqIAE2AgAgAEEAKAKslQVHDQBBACABNgKglQUPCwJAIAFB/wFLDQAgAUF4cUHAlQVqIQMCQAJAQQAoApiVBSIEQQEgAUEDdnQiAXENAEEAIAQgAXI2ApiVBSADIQEMAQsgAygCCCEBCyADIAA2AgggASAANgIMIAAgAzYCDCAAIAE2AggPC0EfIQMCQCABQf///wdLDQAgAUEmIAFBCHZnIgNrdkEBcSADQQF0a0E+aiEDCyAAIAM2AhwgAEIANwIQIANBAnRByJcFaiEEAkACQAJAQQAoApyVBSIGQQEgA3QiAnENAEEAIAYgAnI2ApyVBSAEIAA2AgAgACAENgIYDAELIAFBAEEZIANBAXZrIANBH0YbdCEDIAQoAgAhBgNAIAYiBCgCBEF4cSABRg0CIANBHXYhBiADQQF0IQMgBCAGQQRxakEQaiICKAIAIgYNAAsgAiAANgIAIAAgBDYCGAsgACAANgIMIAAgADYCCA8LIAQoAggiASAANgIMIAQgADYCCCAAQQA2AhggACAENgIMIAAgATYCCAsL6AoCBH8EfiMAQfAAayIFJAAgBEL///////////8AgyEJAkACQAJAIAFQIgYgAkL///////////8AgyIKQoCAgICAgMCAgH98QoCAgICAgMCAgH9UIApQGw0AIANCAFIgCUKAgICAgIDAgIB/fCILQoCAgICAgMCAgH9WIAtCgICAgICAwICAf1EbDQELAkAgBiAKQoCAgICAgMD//wBUIApCgICAgICAwP//AFEbDQAgAkKAgICAgIAghCEEIAEhAwwCCwJAIANQIAlCgICAgICAwP//AFQgCUKAgICAgIDA//8AURsNACAEQoCAgICAgCCEIQQMAgsCQCABIApCgICAgICAwP//AIWEQgBSDQBCgICAgICA4P//ACACIAMgAYUgBCAChUKAgICAgICAgIB/hYRQIgYbIQRCACABIAYbIQMMAgsgAyAJQoCAgICAgMD//wCFhFANAQJAIAEgCoRCAFINACADIAmEQgBSDQIgAyABgyEDIAQgAoMhBAwCCyADIAmEUEUNACABIQMgAiEEDAELIAMgASADIAFWIAkgClYgCSAKURsiBxshCSAEIAIgBxsiC0L///////8/gyEKIAIgBCAHGyICQjCIp0H//wFxIQgCQCALQjCIp0H//wFxIgYNACAFQeAAaiAJIAogCSAKIApQIgYbeSAGQQZ0rXynIgZBcWoQ7AFBECAGayEGIAVB6ABqKQMAIQogBSkDYCEJCyABIAMgBxshAyACQv///////z+DIQQCQCAIDQAgBUHQAGogAyAEIAMgBCAEUCIHG3kgB0EGdK18pyIHQXFqEOwBQRAgB2shCCAFQdgAaikDACEEIAUpA1AhAwsgBEIDhiADQj2IhEKAgICAgICABIQhASAKQgOGIAlCPYiEIQQgA0IDhiEKIAsgAoUhAwJAIAYgCEYNAAJAIAYgCGsiB0H/AE0NAEIAIQFCASEKDAELIAVBwABqIAogAUGAASAHaxDsASAFQTBqIAogASAHEPYBIAUpAzAgBSkDQCAFQcAAakEIaikDAIRCAFKthCEKIAVBMGpBCGopAwAhAQsgBEKAgICAgICABIQhDCAJQgOGIQkCQAJAIANCf1UNAEIAIQNCACEEIAkgCoUgDCABhYRQDQIgCSAKfSECIAwgAX0gCSAKVK19IgRC/////////wNWDQEgBUEgaiACIAQgAiAEIARQIgcbeSAHQQZ0rXynQXRqIgcQ7AEgBiAHayEGIAVBKGopAwAhBCAFKQMgIQIMAQsgASAMfCAKIAl8IgIgClStfCIEQoCAgICAgIAIg1ANACACQgGIIARCP4aEIApCAYOEIQIgBkEBaiEGIARCAYghBAsgC0KAgICAgICAgIB/gyEKAkAgBkH//wFIDQAgCkKAgICAgIDA//8AhCEEQgAhAwwBC0EAIQcCQAJAIAZBAEwNACAGIQcMAQsgBUEQaiACIAQgBkH/AGoQ7AEgBSACIARBASAGaxD2ASAFKQMAIAUpAxAgBUEQakEIaikDAIRCAFKthCECIAVBCGopAwAhBAsgAkIDiCAEQj2GhCEDIAetQjCGIARCA4hC////////P4OEIAqEIQQgAqdBB3EhBgJAAkACQAJAAkAQ9AEOAwABAgMLIAQgAyAGQQRLrXwiCiADVK18IQQCQCAGQQRGDQAgCiEDDAMLIAQgCkIBgyIBIAp8IgMgAVStfCEEDAMLIAQgAyAKQgBSIAZBAEdxrXwiCiADVK18IQQgCiEDDAELIAQgAyAKUCAGQQBHca18IgogA1StfCEEIAohAwsgBkUNAQsQ9QEaCyAAIAM3AwAgACAENwMIIAVB8ABqJAALUwEBfgJAAkAgA0HAAHFFDQAgASADQUBqrYYhAkIAIQEMAQsgA0UNACABQcAAIANrrYggAiADrSIEhoQhAiABIASGIQELIAAgATcDACAAIAI3AwgL4AECAX8CfkEBIQQCQCAAQgBSIAFC////////////AIMiBUKAgICAgIDA//8AViAFQoCAgICAgMD//wBRGw0AIAJCAFIgA0L///////////8AgyIGQoCAgICAgMD//wBWIAZCgICAgICAwP//AFEbDQACQCACIACEIAYgBYSEUEUNAEEADwsCQCADIAGDQgBTDQBBfyEEIAAgAlQgASADUyABIANRGw0BIAAgAoUgASADhYRCAFIPC0F/IQQgACACViABIANVIAEgA1EbDQAgACAChSABIAOFhEIAUiEECyAEC9gBAgF/An5BfyEEAkAgAEIAUiABQv///////////wCDIgVCgICAgICAwP//AFYgBUKAgICAgIDA//8AURsNACACQgBSIANC////////////AIMiBkKAgICAgIDA//8AViAGQoCAgICAgMD//wBRGw0AAkAgAiAAhCAGIAWEhFBFDQBBAA8LAkAgAyABg0IAUw0AIAAgAlQgASADUyABIANRGw0BIAAgAoUgASADhYRCAFIPCyAAIAJWIAEgA1UgASADURsNACAAIAKFIAEgA4WEQgBSIQQLIAQL5xACBX8PfiMAQdACayIFJAAgBEL///////8/gyEKIAJC////////P4MhCyAEIAKFQoCAgICAgICAgH+DIQwgBEIwiKdB//8BcSEGAkACQAJAIAJCMIinQf//AXEiB0GBgH5qQYKAfkkNAEEAIQggBkGBgH5qQYGAfksNAQsCQCAB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C30hBAsgBUEQaiADIA5CA0IAEPgBIAUgAyAOQgVCABD4ASAKIAIgAkIBgyILIAR8IgQgA1YgASAEIAtUrXwiASAOViABIA5RG618IgMgAlStfCICIAMgAkKAgICAgIDA//8AVCAEIAUpAxBWIAEgBUEQakEIaikDACICViABIAJRG3GtfCICIANUrXwiAyACIANCgICAgICAwP//AFQgBCAFKQMAViABIAVBCGopAwAiBFYgASAEURtxrXwiASACVK18IAyEIQwLIAAgATcDACAAIAw3AwggBUHQAmokAAuOAgICfwN+IwBBEGsiAiQAAkACQCABvSIEQv///////////wCDIgVCgICAgICAgHh8Qv/////////v/wBWDQAgBUI8hiEGIAVCBIhCgICAgICAgIA8fCEFDAELAkAgBUKAgICAgICA+P8AVA0AIARCPIYhBiAEQgSIQoCAgICAgMD//wCEIQUMAQsCQCAFUEUNAEIAIQZCACEFDAELIAIgBUIAIAWnZ0EgaiAFQiCIp2cgBUKAgICAEFQbIgNBMWoQ7AEgAkEIaikDAEKAgICAgIDAAIVBjPgAIANrrUIwhoQhBSACKQMAIQYLIAAgBjcDACAAIAUgBEKAgICAgICAgIB/g4Q3AwggAkEQaiQAC+EBAgN/An4jAEEQayICJAACQAJAIAG8IgNB/////wdxIgRBgICAfGpB////9wdLDQAgBK1CGYZCgICAgICAgMA/fCEFQgAhBgwBCwJAIARBgICA/AdJDQAgA61CGYZCgICAgICAwP//AIQhBUIAIQYMAQsCQCAEDQBCACEGQgAhBQwBCyACIAStQgAgBGciBEHRAGoQ7AEgAkEIaikDAEKAgICAgIDAAIVBif8AIARrrUIwhoQhBSACKQMAIQYLIAAgBjcDACAAIAUgA0GAgICAeHGtQiCGhDcDCCACQRBqJAALjQECAn8CfiMAQRBrIgIkAAJAAkAgAQ0AQgAhBEIAIQUMAQsgAiABIAFBH3UiA3MgA2siA61CACADZyIDQdEAahDsASACQQhqKQMAQoCAgICAgMAAhUGegAEgA2utQjCGfCABQYCAgIB4ca1CIIaEIQUgAikDACEECyAAIAQ3AwAgACAFNwMIIAJBEGokAAt1AgF/An4jAEEQayICJAACQAJAIAENAEIAIQNCACEEDAELIAIgAa1CAEHwACABZyIBQR9zaxDsASACQQhqKQMAQoCAgICAgMAAhUGegAEgAWutQjCGfCEEIAIpAwAhAwsgACADNwMAIAAgBDcDCCACQRBqJAALBABBAAsEAEEAC1MBAX4CQAJAIANBwABxRQ0AIAIgA0FAaq2IIQFCACECDAELIANFDQAgAkHAACADa62GIAEgA60iBIiEIQEgAiAEiCECCyAAIAE3AwAgACACNwMIC5oLAgV/D34jAEHgAGsiBSQAIARC////////P4MhCiAEIAKFQoCAgICAgICAgH+DIQsgAkL///////8/gyIMQiCIIQ0gBEIwiKdB//8BcSEGAkACQAJAIAJCMIinQf//AXEiB0GBgH5qQYKAfkkNAEEAIQggBkGBgH5qQYGAfksNAQsCQCABUCACQv///////////wCDIg5CgICAgICAwP//AFQgDkKAgICAgIDA//8AURsNACACQoCAgICAgCCEIQsMAgsCQCADUCAEQv///////////wCDIgJCgICAgICAwP//AFQgAkKAgICAgIDA//8AURsNACAEQoCAgICAgCCEIQsgAyEBDAILAkAgASAOQoCAgICAgMD//wCFhEIAUg0AAkAgAyAChFBFDQBCgICAgICA4P//ACELQgAhAQwDCyALQoCAgICAgMD//wCEIQtCACEBDAILAkAgAyACQoCAgICAgMD//wCFhEIAUg0AIAEgDoQhAkIAIQECQCACUEUNAEKAgICAgIDg//8AIQsMAwsgC0KAgICAgIDA//8AhCELDAILAkAgASAOhEIAUg0AQgAhAQwCCwJAIAMgAoRCAFINAEIAIQEMAgtBACEIAkAgDkL///////8/Vg0AIAVB0ABqIAEgDCABIAwgDFAiCBt5IAhBBnStfKciCEFxahDsAUEQIAhrIQggBUHYAGopAwAiDEIgiCENIAUpA1AhAQsgAkL///////8/Vg0AIAVBwABqIAMgCiADIAogClAiCRt5IAlBBnStfKciCUFxahDsASAIIAlrQRBqIQggBUHIAGopAwAhCiAFKQNAIQMLIANCD4YiDkKAgP7/D4MiAiABQiCIIgR+Ig8gDkIgiCIOIAFC/////w+DIgF+fCIQQiCGIhEgAiABfnwiEiARVK0gAiAMQv////8PgyIMfiITIA4gBH58IhEgA0IxiCAKQg+GIhSEQv////8PgyIDIAF+fCIVIBBCIIggECAPVK1CIIaEfCIQIAIgDUKAgASEIgp+IhYgDiAMfnwiDSAUQiCIQoCAgIAIhCICIAF+fCIPIAMgBH58IhRCIIZ8Ihd8IQEgByAGaiAIakGBgH9qIQYCQAJAIAIgBH4iGCAOIAp+fCIEIBhUrSAEIAMgDH58Ig4gBFStfCACIAp+fCAOIBEgE1StIBUgEVStfHwiBCAOVK18IAMgCn4iAyACIAx+fCICIANUrUIghiACQiCIhHwgBCACQiCGfCICIARUrXwgAiAUQiCIIA0gFlStIA8gDVStfCAUIA9UrXxCIIaEfCIEIAJUrXwgBCAQIBVUrSAXIBBUrXx8IgIgBFStfCIEQoCAgICAgMAAg1ANACAGQQFqIQYMAQsgEkI/iCEDIARCAYYgAkI/iIQhBCACQgGGIAFCP4iEIQIgEkIBhiESIAMgAUIBhoQhAQsCQCAGQf//AUgNACALQoCAgICAgMD//wCEIQtCACEBDAELAkACQCAGQQBKDQACQEEBIAZrIgdB/wBLDQAgBUEwaiASIAEgBkH/AGoiBhDsASAFQSBqIAIgBCAGEOwBIAVBEGogEiABIAcQ9gEgBSACIAQgBxD2ASAFKQMgIAUpAxCEIAUpAzAgBUEwakEIaikDAIRCAFKthCESIAVBIGpBCGopAwAgBUEQakEIaikDAIQhASAFQQhqKQMAIQQgBSkDACECDAILQgAhAQwCCyAGrUIwhiAEQv///////z+DhCEECyAEIAuEIQsCQCASUCABQn9VIAFCgICAgICAgICAf1EbDQAgCyACQgF8IgFQrXwhCwwBCwJAIBIgAUKAgICAgICAgIB/hYRCAFENACACIQEMAQsgCyACIAJCAYN8IgEgAlStfCELCyAAIAE3AwAgACALNwMIIAVB4ABqJAALdQEBfiAAIAQgAX4gAiADfnwgA0IgiCICIAFCIIgiBH58IANC/////w+DIgMgAUL/////D4MiAX4iBUIgiCADIAR+fCIDQiCIfCADQv////8PgyACIAF+fCIBQiCIfDcDCCAAIAFCIIYgBUL/////D4OENwMAC0gBAX8jAEEQayIFJAAgBSABIAIgAyAEQoCAgICAgICAgH+FEOsBIAUpAwAhBCAAIAVBCGopAwA3AwggACAENwMAIAVBEGokAAvkAwICfwJ+IwBBIGsiAiQAAkACQCABQv///////////wCDIgRCgICAgICAwP9DfCAEQoCAgICAgMCAvH98Wg0AIABCPIggAUIEhoQhBAJAIABC//////////8PgyIAQoGAgICAgICACFQNACAEQoGAgICAgICAwAB8IQUMAgsgBEKAgICAgICAgMAAfCEFIABCgICAgICAgIAIUg0BIAUgBEIBg3whBQwBCwJAIABQIARCgICAgICAwP//AFQgBEKAgICAgIDA//8AURsNACAAQjyIIAFCBIaEQv////////8Dg0KAgICAgICA/P8AhCEFDAELQoCAgICAgID4/wAhBSAEQv///////7//wwBWDQBCACEFIARCMIinIgNBkfcASQ0AIAJBEGogACABQv///////z+DQoCAgICAgMAAhCIEIANB/4h/ahDsASACIAAgBEGB+AAgA2sQ9gEgAikDACIEQjyIIAJBCGopAwBCBIaEIQUCQCAEQv//////////D4MgAikDECACQRBqQQhqKQMAhEIAUq2EIgRCgYCAgICAgIAIVA0AIAVCAXwhBQwBCyAEQoCAgICAgICACFINACAFQgGDIAV8IQULIAJBIGokACAFIAFCgICAgICAgICAf4OEvwvEAwIDfwF+IwBBIGsiAiQAAkACQCABQv///////////wCDIgVCgICAgICAwL9AfCAFQoCAgICAgMDAv398Wg0AIAFCGYinIQMCQCAAUCABQv///w+DIgVCgICACFQgBUKAgIAIURsNACADQYGAgIAEaiEEDAILIANBgICAgARqIQQgACAFQoCAgAiFhEIAUg0BIAQgA0EBcWohBAwBCwJAIABQIAVCgICAgICAwP//AFQgBUKAgICAgIDA//8AURsNACABQhmIp0H///8BcUGAgID+B3IhBAwBC0GAgID8ByEEIAVC////////v7/AAFYNAEEAIQQgBUIwiKciA0GR/gBJDQAgAkEQaiAAIAFC////////P4NCgICAgICAwACEIgUgA0H/gX9qEOwBIAIgACAFQYH/ACADaxD2ASACQQhqKQMAIgVCGYinIQQCQCACKQMAIAIpAxAgAkEQakEIaikDAIRCAFKthCIAUCAFQv///w+DIgVCgICACFQgBUKAgIAIURsNACAEQQFqIQQMAQsgACAFQoCA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AxogACABQQRqEOYCCwoAIAAQlwQQ3Q4LEwAgACAAKAIAQXRqKAIAahCXBAsTACAAIAAoAgBBdGooAgBqEJkECw0AIAEoAgAgAigCAEgLKwEBfyMAQRBrIgMkACADQQhqIAAgASACEJ4EIAMoAgwhAiADQRBqJAAgAgsNACAAIAEgAiADEJ8ECw0AIAAgASACIAMQoAQLaQEBfyMAQSBrIgQkACAEQRhqIAEgAhChBCAEQRBqIARBDGogBCgCGCAEKAIcIAMQogQQowQgBCABIAQoAhAQpAQ2AgwgBCADIAQoAhQQpQQ2AgggACAEQQxqIARBCGoQpgQgBEEgaiQACwsAIAAgASACEKcECwcAIAAQqQQLDQAgACACIAMgBBCoBAsJACAAIAEQqwQLCQAgACABEKwECwwAIAAgASACEKoEGgs4AQF/IwBBEGsiAyQAIAMgARCtBDYCDCADIAIQrQQ2AgggACADQQxqIANBCGoQrgQaIANBEGokAAtDAQF/IwBBEGsiBCQAIAQgAjYCDCADIAEgAiABayICELEEGiAEIAMgAmo2AgggACAEQQxqIARBCGoQsgQgBEEQaiQACwcAIAAQzAMLGAAgACABKAIANgIAIAAgAigCADYCBCAACwkAIAAgARC0BAsNACAAIAEgABDMA2tqCwcAIAAQrwQLGAAgACABKAIANgIAIAAgAigCADYCBCAACwcAIAAQsAQLBAAgAAsWAAJAIAJFDQAgACABIAIQqgIaCyAACwwAIAAgASACELMEGgsYACAAIAEoAgA2AgAgACACKAIANgIEIAALCQAgACABELUECw0AIAAgASAAELAEa2oLKwEBfyMAQRBrIgMkACADQQhqIAAgASACELcEIAMoAgwhAiADQRBqJAAgAgsNACAAIAEgAiADELgECw0AIAAgASACIAMQuQQLaQEBfyMAQSBrIgQkACAEQRhqIAEgAhC6BCAEQRBqIARBDGogBCgCGCAEKAIcIAMQuwQQvAQgBCABIAQoAhAQvQQ2AgwgBCADIAQoAhQQvgQ2AgggACAEQQxqIARBCGoQvwQgBEEgaiQACwsAIAAgASACEMAECwcAIAAQwgQLDQAgACACIAMgBBDBBAsJACAAIAEQxAQLCQAgACABEMUECwwAIAAgASACEMMEGgs4AQF/IwBBEGsiAyQAIAMgARDGBDYCDCADIAIQxgQ2AgggACADQQxqIANBCGoQxwQaIANBEGokAAtGAQF/IwBBEGsiBCQAIAQgAjYCDCADIAEgAiABayICQQJ1EMoEGiAEIAMgAmo2AgggACAEQQxqIARBCGoQywQgBEEQaiQACwcAIAAQzQQLGAAgACABKAIANgIAIAAgAigCADYCBCAACwkAIAAgARDOBAsNACAAIAEgABDNBGtqCwcAIAAQyAQLGAAgACABKAIANgIAIAAgAigCADYCBCAACwcAIAAQyQQLBAAgAAsZAAJAIAJFDQAgACABIAJBAnQQqgIaCyAACwwAIAAgASACEMwEGgsYACAAIAEoAgA2AgAgACACKAIANgIEIAALBAAgAAsJACAAIAEQzwQLDQAgACABIAAQyQRragsEACAACwcAIAAQ0gQLBwAgABDTBAsEACAACwQAIAALCgAgABDPAygCAAsKACAAEM8DENcECwQAIAALBAAgAAsLACAAIAEgAhDdBAsJACAAIAEQ3wQLMQEBfyAAEM8DIgIgAi0AC0GAAXEgAUH/AHFyOgALIAAQzwMiACAALQALQf8AcToACwsMACAAIAEtAAA6AAALCwAgASACQQEQ4AQLBwAgABDmBAsOACABENADGiAAENADGgseAAJAIAIQ4QRFDQAgACABIAIQ4gQPCyAAIAEQ4wQLBwAgAEEISwsJACAAIAIQ5AQLBwAgABDlBAsJACAAIAEQ4Q4LBwAgABDdDgsEACAACwcAIAAQ6AQLBAAgAAsEACAACwkAIAAgARDsBAu4AQECfyMAQRBrIgQkAAJAIAAQ7QQgA0kNAAJAAkAgAxDuBEUNACAAIAMQ2wQgABDWBCEFDAELIARBCGogABDQAyADEO8EQQFqEPAEIAQoAggiBSAEKAIMEPEEIAAgBRDyBCAAIAQoAgwQ8wQgACADEPQECwJAA0AgASACRg0BIAUgARDcBCAFQQFqIQUgAUEBaiEBDAALAAsgBEEAOgAHIAUgBEEHahDcBCAEQRBqJAAPCyAAEPUEAAsHACABIABrCxkAIAAQ1QMQ9gQiACAAEPcEQQF2S3ZBcGoLBwAgAEELSQstAQF/QQohAQJAIABBC0kNACAAQQFqEPoEIgAgAEF/aiIAIABBC0YbIQELIAELGQAgASACEPkEIQEgACACNgIEIAAgATYCAAsCAAsMACAAEM8DIAE2AgALOgEBfyAAEM8DIgIgAigCCEGAgICAeHEgAUH/////B3FyNgIIIAAQzwMiACAAKAIIQYCAgIB4cjYCCAsMACAAEM8DIAE2AgQLCgBBs4YEEPgEAAsFABD3BAsFABD7BAsFABAOAAsaAAJAIAAQ9gQgAU8NABD8BAALIAFBARD9BAsKACAAQQ9qQXBxCwQAQX8LBQAQDgALGgACQCABEOEERQ0AIAAgARD+BA8LIAAQ/wQLCQAgACABEN8OCwcAIAAQ2w4LGAACQCAAENgDRQ0AIAAQggUPCyAAEIMFCw0AIAEoAgAgAigCAEkLCgAgABDZAygCAAsKACAAENkDEIQFCwQAIAALDQAgASgCACACKAIASQsxAQF/AkAgACgCACIBRQ0AAkAgARDcAhDCAhDfAg0AIAAoAgBFDwsgAEEANgIAC0EBCxEAIAAgASAAKAIAKAIcEQEACzEBAX8CQCAAKAIAIgFFDQACQCABEK0DEJUDEK8DDQAgACgCAEUPCyAAQQA2AgALQQELEQAgACABIAAoAgAoAiwRAQALDgAgACABKAIANgIAIAALDgAgACABKAIANgIAIAALCgAgAEEEahCOBQsEACAACwQAIAALMQEBfyMAQRBrIgIkACAAIAJBD2ogAkEOahC9AyIAIAEgARCQBRDyDiACQRBqJAAgAAsHACAAEJoFC0ABAn8gACgCKCECA0ACQCACDQAPCyABIAAgACgCJCACQX9qIgJBAnQiA2ooAgAgACgCICADaigCABEFAAwACwALDQAgACABQRxqEPEKGgsJACAAIAEQlQULKAAgACAAKAIYRSABciIBNgIQAkAgACgCFCABcUUNAEG5gwQQmAUACwspAQJ/IwBBEGsiAiQAIAJBD2ogACABEIEFIQMgAkEQaiQAIAEgACADGwtAACAAQfymBEEIajYCACAAQQAQkQUgAEEcahDyChogACgCIBDkASAAKAIkEOQBIAAoAjAQ5AEgACgCPBDkASAACw0AIAAQlgUaIAAQ3Q4LBQAQDgALQQAgAEEANgIUIAAgATYCGCAAQQA2AgwgAEKCoICA4AA3AgQgACABRTYCECAAQSBqQQBBKBCPARogAEEcahDwChoLBwAgABCpAQsOACAAIAEoAgA2AgAgAAsEACAACwQAQQALBABCAAuhAQEDf0F/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iK4FQeCsBUEAKALgrAVBdGooAgBqEKkDEL0FGkGMqgVBACgCjKoFQXRqKAIAakG4qwUQvgUaQeCsBUEAKALgrAVBdGooAgBqELkFGkHgrAVBACgC4KwFQXRqKAIAakG4qwUQvgUaIAALbQEBfyMAQRBrIgMkACAAELICIgAgAjYCKCAAIAE2AiAgAEGMqQRBCGo2AgAQwgIhAiAAQQA6ADQgACACNgIwIANBDGogABDKAyAAIANBDGogACgCACgCCBECACADQQxqEPIKGiADQRBqJAAgAAs2AQF/IABBCGoQvwUhAiAAQfCYBEEMajYCACACQfCYBEEgajYCACAAQQA2AgQgAiABEMAFIAALYwEBfyMAQRBrIgMkACAAELICIgAgATYCICAAQfCpBEEIajYCACADQQxqIAAQygMgA0EMahDuAyEBIANBDGoQ8goaIAAgAjYCKCAAIAE2AiQgACABEO8DOgAsIANBEGokACAACy8BAX8gAEEEahC/BSECIABBoJkEQQxqNgIAIAJBoJkEQSBqNgIAIAIgARDABSAACxQBAX8gACgCSCECIAAgATYCSCACCw4AIABBgMAAEMEFGiAAC20BAX8jAEEQayIDJAAgABCIAyIAIAI2AiggACABNgIgIABB2KoEQQhqNgIAEJUDIQIgAEEAOgA0IAAgAjYCMCADQQxqIAAQwgUgACADQQxqIAAoAgAoAggRAgAgA0EMahDyChogA0EQaiQAIAALNgEBfyAAQQhqEMMFIQIgAEHomgRBDGo2AgAgAkHomgRBIGo2AgAgAEEANgIEIAIgARDEBSAAC2MBAX8jAEEQayIDJAAgABCIAyIAIAE2AiAgAEG8qwRBCGo2AgAgA0EMaiAAEMIFIANBDGoQxQUhASADQQxqEPIKGiAAIAI2AiggACABNgIkIAAgARDGBToALCADQRBqJAAgAAsvAQF/IABBBGoQwwUhAiAAQZibBEEMajYCACACQZibBEEgajYCACACIAEQxAUgAAsUAQF/IAAoAkghAiAAIAE2AkggAgsVACAAENYFIgBByJwEQQhqNgIAIAALGAAgACABEJkFIABBADYCSCAAEMICNgJMCxUBAX8gACAAKAIEIgIgAXI2AgQgAgsNACAAIAFBBGoQ8QoaCxUAIAAQ1gUiAEH8nwRBCGo2AgAgAAsYACAAIAEQ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EKUDEKYDDQELIAUgBSgCAEEEcjYCAEEAIQAMBAsCQCAJKAIAIAsoAogERw0AIAggCSALQYgEahCZCQsgABClAyEKIAkgCSgCACIBQQRqNgIAIAEgCjYCACALIAsoAhRBf2o2AhQMAAsACyACIQEgCSgCACAIEIsJRw0DIAUgBSgCAEEEcjYCAEEAIQAMAQsCQCACRQ0AQQEhCgNAIAogAhDgBk8NAQJAAkAgACALQYwEahCkAw0AIAAQpQMgAiAKEOEGKAIARg0BCyAFIAUoAgBBBHI2AgBBACEADAMLIAAQpwMaIApBAWohCgwACwALQQEhACAMENAIIAsoAmRGDQBBACEAIAtBADYCDCANIAwQ0AggCygCZCALQQxqELcGAkAgCygCDEUNACAFIAUoAgBBBHI2AgAMAQtBASEACyAREIIPGiAQEIIPGiAPEIIPGiAOEIIPGiANEO8OGiAMEN0IGgwDCyACIQELIANBAWohAwwACwALIAtBkARqJAAgAAsKACAAEJoJKAIACwcAIABBKGoLFgAgACABEMUOIgFBBGogAhCbBRogAQuAAwEBfyMAQRBrIgokAAJAAkAgAEUNACAKQQRqIAEQqgkiARCrCSACIAooAgQ2AAAgCkEEaiABEKwJIAggCkEEahCtCRogCkEEahCCDxogCkEEaiABEK4JIAcgCkEEahCtCRogCkEEahCCDxogAyABEK8JNgIAIAQgARCwCTYCACAKQQRqIAEQsQkgBSAKQQRqEMYDGiAKQQRqEO8OGiAKQQRqIAEQsgkgBiAKQQRqEK0JGiAKQQRqEIIPGiABELMJIQEMAQsgCkEEaiABELQJIgEQtQkgAiAKKAIENgAAIApBBGogARC2CSAIIApBBGoQrQkaIApBBGoQgg8aIApBBGogARC3CSAHIApBBGoQrQkaIApBBGoQgg8aIAMgARC4CTYCACAEIAEQuQk2AgAgCkEEaiABELoJIAUgCkEEahDGAxogCkEEahDvDhogCkEEaiABELsJIAYgCkEEahCtCRogCkEEahCCDxogARC8CSEBCyAJIAE2AgAgCkEQaiQACxUAIAAgASgCABCuAyABKAIAEL0JGgsHACAAKAIACw0AIAAQtQcgAUECdGoLDgAgACABEL4JNgIAIAALDAAgACABEL8JQQFzCwcAIAAoAgALEQAgACAAKAIAQQRqNgIAIAALEAAgABDACSABEL4Ja0ECdQsMACAAQQAgAWsQwgkLCwAgACABIAIQwQkL5AEBBn8jAEEQayIDJAAgABDDCSgCACEEAkACQCACKAIAIAAQiwlrIgUQ9wRBAXZPDQAgBUEBdCEFDAELEPcEIQULIAVBBCAFGyEFIAEoAgAhBiAAEIsJIQcCQAJAIARBqAFHDQBBACEIDAELIAAQiwkhCAsCQCAIIAUQ5QEiCEUNAAJAIARBqAFGDQAgABDECRoLIANBpwE2AgQgACADQQhqIAggA0EEahDEByIEEMUJGiAEEMcHGiABIAAQiwkgBiAHa2o2AgAgAiAAEIsJIAVBfHFqNgIAIANBEGokAA8LEOMOAAsHACAAEMYOC64CAQJ/IwBBwANrIgckACAHIAI2ArgDIAcgATYCvAMgB0GoATYCFCAHQRhqIAdBIGogB0EUahDEByEIIAdBEGogBBCSBSAHQRBqEKMDIQEgB0EAOgAPAkAgB0G8A2ogAiADIAdBEGogBBDQAiAFIAdBD2ogASAIIAdBFGogB0GwA2oQiglFDQAgBhCcCQJAIActAA9FDQAgBiABQS0QiQUQiw8LIAFBMBCJBSEBIAgQiwkhAiAHKAIUIgNBfGohBAJAA0AgAiAETw0BIAIoAgAgAUcNASACQQRqIQIMAAsACyAGIAIgAxCdCRoLAkAgB0G8A2ogB0G4A2oQpANFDQAgBSAFKAIAQQJyNgIACyAHKAK8AyECIAdBEGoQ8goaIAgQxwcaIAdBwANqJAAgAgtiAQJ/IwBBEGsiASQAAkACQCAAEPEHRQ0AIAAQngkhAiABQQA2AgwgAiABQQxqEJ8JIABBABCgCQwBCyAAEKEJIQIgAUEANgIIIAIgAUEIahCfCSAAQQAQogkLIAFBEGokAAvZAQEEfyMAQRBrIgMkACAAEOAGIQQgABCjCSEFAkAgASACEKQJIgZFDQACQCAAIAEQpQkNAAJAIAUgBGsgBk8NACAAIAUgBCAFayAGaiAEIARBAEEAEKYJCyAAELUHIARBAnRqIQUCQANAIAEgAkYNASAFIAEQnwkgAUEEaiEBIAVBBGohBQwACwALIANBADYCBCAFIANBBGoQnwkgACAGIARqEKcJDAELIAAgA0EEaiABIAIgABCoCRCpCSIBEO8HIAEQ4AYQiQ8aIAEQgg8aCyADQRBqJAAgAAsKACAAEMcIKAIACwwAIAAgASgCADYCAAsMACAAEMcIIAE2AgQLCgAgABDHCBC9DAsxAQF/IAAQxwgiAiACLQALQYABcSABQf8AcXI6AAsgABDHCCIAIAAtAAtB/wBxOgALCx8BAX9BASEBAkAgABDxB0UNACAAEMoMQX9qIQELIAELCQAgACABEIQNCx0AIAAQ7wcgABDvByAAEOAGQQJ0akEEaiABEIUNCyAAIAAgASACIAMgBCAFIAYQgw0gACADIAVrIAZqEKAJCxwAAkAgABDxB0UNACAAIAEQoAkPCyAAIAEQogkLBwAgABC/DAsrAQF/IwBBEGsiBCQAIAAgBEEPaiADEIYNIgMgASACEIcNIARBEGokACADCwsAIABB8LIFEKcGCxEAIAAgASABKAIAKAIsEQIACxEAIAAgASABKAIAKAIgEQIACwsAIAAgARDGCSAACxEAIAAgASABKAIAKAIcEQIACw8AIAAgACgCACgCDBEAAAsPACAAIAAoAgAoAhARAAALEQAgACABIAEoAgAoAhQRAgALEQAgACABIAEoAgAoAhgRAgALDwAgACAAKAIAKAIkEQAACwsAIABB6LIFEKcGCxEAIAAgASABKAIAKAIsEQIACxEAIAAgASABKAIAKAIgEQIACxEAIAAgASABKAIAKAIcEQIACw8AIAAgACgCACgCDBEAAAsPACAAIAAoAgAoAhARAAALEQAgACABIAEoAgAoAhQRAgALEQAgACABIAEoAgAoAhgRAgALDwAgACAAKAIAKAIkEQAACxIAIAAgAjYCBCAAIAE2AgAgAAsHACAAKAIACw0AIAAQwAkgARC+CUYLBwAgACgCAAsvAQF/IwBBEGsiAyQAIAAQiw0gARCLDSACEIsNIANBD2oQjA0hAiADQRBqJAAgAgsyAQF/IwBBEGsiAiQAIAIgACgCADYCDCACQQxqIAEQkg0aIAIoAgwhACACQRBqJAAgAAsHACAAENkJCxoBAX8gABDYCSgCACEBIAAQ2AlBADYCACABCyIAIAAgARDECRDFByABEMMJKAIAIQEgABDZCSABNgIAIAALfQECfyMAQRBrIgIkAAJAIAAQ8QdFDQAgABCoCSAAEJ4JIAAQygwQyAwLIAAgARCTDSABEMcIIQMgABDHCCIAQQhqIANBCGoo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mMAFQQEQ8AkaCxEAQbyzBRDWChDxChpBvLMFCzMAAkBBAC0AxLMFRQ0AQQAoAsCzBQ8LEO4KGkEAQQE6AMSzBUEAQbyzBTYCwLMFQbyzBQsYAQF/IAAQ7wooAgAiATYCACABENgKIAALFQAgACABKAIAIgE2AgAgARDYCiAACw0AIAAoAgAQ4AoaIAALDwAgACgCACABELoKEOsKCwoAIAAQ/Qo2AgQLFQAgACABKQIANwIEIAAgAjYCACAACzsBAX8jAEEQayICJAACQCAAEPkKQX9GDQAgACACQQhqIAJBDGogARD6ChD7CkGqARDUDgsgAkEQaiQACw0AIAAQkwYaIAAQ3Q4LDwAgACAAKAIAKAIEEQMACwcAIAAoAgALCQAgACABEJ8OCwsAIAAgATYCACAACwcAIAAQoA4LGQEBf0EAQQAoAsizBUEBaiIANgLIswUgAAsNACAAEJMGGiAAEN0OCyoBAX9BACEDAkAgAkH/AEsNACACQQJ0QZDIBGooAgAgAXFBAEchAwsgAwtOAQJ/AkADQCABIAJGDQFBACEEAkAgASgCACIFQf8ASw0AIAVBAnRBkMgEaigCACEECyADIAQ2AgAgA0EEaiEDIAFBBGohAQwACwALIAILRAEBfwN/AkACQCACIANGDQAgAigCACIEQf8ASw0BIARBAnRBkMgEaigCACABcUUNASACIQMLIAMPCyACQQRqIQIMAAsLQwEBfwJAA0AgAiADRg0BAkAgAigCACIEQf8ASw0AIARBAnRBkMgEaigCACABcUUNACACQQRqIQIMAQsLIAIhAwsgAwsdAAJAIAFB/wBLDQAQhAsgAUECdGooAgAhAQsgAQsIABCGBigCAAtFAQF/AkADQCABIAJGDQECQCABKAIAIgNB/wBLDQAQhAsgASgCAEECdGooAgAhAwsgASADNgIAIAFBBGohAQwACwALIAILHQACQCABQf8ASw0AEIcLIAFBAnRqKAIAIQELIAELCAAQhwYoAgALRQEBfwJAA0AgASACRg0BAkAgASgCACIDQf8ASw0AEIcLIAEoAgBBAnRqKAIAIQMLIAEgAzYCACABQQRqIQEMAAsACyACCwQAIAELLAACQANAIAEgAkYNASADIAEsAAA2AgAgA0EEaiEDIAFBAWohAQwACwALIAILDgAgASACIAFBgAFJG8AL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BEEgaiQACwsAIAAgASACEOMMCwcAIAAQ5AwLawEBfyMAQRBrIgUkACAFIAI2AgggBSAENgIMAkADQCACIANGDQEgAiwAACEEIAVBDGoQ+AIgBBD5AhogBSACQQFqIgI2AgggBUEMahD6AhoMAAsACyAAIAVBCGogBUEMahDiDCAFQRBqJAALCQAgACABEOYMCwkAIAAgARDnDAsMACAAIAEgAhDlDBoLOAEBfyMAQRBrIgMkACADIAEQogQ2AgwgAyACEKIENgIIIAAgA0EMaiADQQhqEOgMGiADQRBqJAALBAAgAAsYACAAIAEoAgA2AgAgACACKAIANgIEIAALCQAgACABEKUECwQAIAELGAAgACABKAIANgIAIAAgAigCADYCBCAACw0AIAAgASACIAMQ6gwLaQEBfyMAQSBrIgQkACAEQRhqIAEgAhDrDCAEQRBqIARBDGogBCgCGCAEKAIcIAMQ7AwQ7QwgBCABIAQoAhAQ7gw2AgwgBCADIAQoAhQQ7ww2AgggACAEQQxqIARBCGoQ8AwgBEEgaiQACwsAIAAgASACEPEMCwcAIAAQ8gwLawEBfyMAQRBrIgUkACAFIAI2AgggBSAENgIMAkADQCACIANGDQEgAigCACEEIAVBDGoQuAMgBBC5AxogBSACQQRqIgI2AgggBUEMahC6AxoMAAsACyAAIAVBCGogBUEMahDwDCAFQRBqJAALCQAgACABEPQMCwkAIAAgARD1DAsMACAAIAEgAhDzDBoLOAEBfyMAQRBrIgMkACADIAEQuwQ2AgwgAyACELsENgIIIAAgA0EMaiADQQhqEPYMGiADQRBqJAALBAAgAAsYACAAIAEoAgA2AgAgACACKAIANgIEIAALCQAgACABEL4ECwQAIAELGAAgACABKAIANgIAIAAgAigCADYCBCAACwQAIAALBAAgAAtaAQF/IwBBEGsiAyQAIAMgATYCCCADIAA2AgwgAyACNgIEQQAhAQJAIANBA2ogA0EEaiADQQxqEPoMDQAgA0ECaiADQQRqIANBCGoQ+gwhAQsgA0EQaiQAIAELDQAgASgCACACKAIASQsHACAAEP4MCw4AIAAgAiABIABrEP0MCwwAIAAgASACEJ8BRQsnAQF/IwBBEGsiASQAIAEgADYCDCABQQxqEP8MIQAgAUEQaiQAIAALBwAgABCADQsKACAAKAIAEIENCyoBAX8jAEEQayIBJAAgASAANgIMIAFBDGoQ/AgQzAMhACABQRBqJAAgAAsRACAAIAAoAgAgAWo2AgAgAAuLAgEDfyMAQRBrIgckAAJAIAAQtAwiCCABayACSQ0AIAAQtQchCQJAIAhBAXZBcGogAU0NACAHIAFBAXQ2AgwgByACIAFqNgIEIAdBBGogB0EMahCTBSgCABC2DEEBaiEICyAHQQRqIAAQqAkgCBC3DCAHKAIEIgggBygCCBC4DAJAIARFDQAgCBDNBCAJEM0EIAQQkAMaCwJAIAMgBSAEaiICRg0AIAgQzQQgBEECdCIEaiAGQQJ0aiAJEM0EIARqIAVBAnRqIAMgAmsQkAMaCwJAIAFBAWoiAUECRg0AIAAQqAkgCSABEMgMCyAAIAgQuQwgACAHKAIIELoMIAdBEGokAA8LIAAQuwwACwoAIAEgAGtBAnULWgEBfyMAQRBrIgMkACADIAE2AgggAyAANgIMIAMgAjYCBEEAIQECQCADQQNqIANBBGogA0EMahCIDQ0AIANBAmogA0EEaiADQQhqEIgNIQELIANBEGokACABCwwAIAAQrQwgAhCJDQsSACAAIAEgAiABIAIQpAkQig0LDQAgASgCACACKAIASQsEACAAC7gBAQJ/IwBBEGsiBCQAAkAgABC0DCADSQ0AAkACQCADELUMRQ0AIAAgAxCiCSAAEKEJIQUMAQsgBEEIaiAAEKgJIAMQtgxBAWoQtwwgBCgCCCIFIAQoAgwQuAwgACAFELkMIAAgBCgCDBC6DCAAIAMQoAkLAkADQCABIAJGDQEgBSABEJ8JIAVBBGohBSABQQRqIQEMAAsACyAEQQA2AgQgBSAEQQRqEJ8JIARBEGokAA8LIAAQuwwACwcAIAAQjg0LEQAgACACIAEgAGtBAnUQjQ0LDwAgACABIAJBAnQQnwFFCycBAX8jAEEQayIBJAAgASAANgIMIAFBDGoQjw0hACABQRBqJAAgAAsHACAAEJANCwoAIAAoAgAQkQ0LKgEBfyMAQRBrIgEkACABIAA2AgwgAUEMahC+CRDNBCEAIAFBEGokACAACxQAIAAgACgCACABQQJ0ajYCACAACwkAIAAgARCUDQsOACABEKgJGiAAEKgJGgsNACAAIAEgAiADEJYNC2kBAX8jAEEgayIEJAAgBEEYaiABIAIQlw0gBEEQaiAEQQxqIAQoAhggBCgCHCADEKIEEKMEIAQgASAEKAIQEJgNNgIMIAQgAyAEKAIUEKUENgIIIAAgBEEMaiAEQQhqEJkNIARBIGokAAsLACAAIAEgAhCaDQsJACAAIAEQnA0LDAAgACABIAIQmw0aCzgBAX8jAEEQayIDJAAgAyABEJ0NNgIMIAMgAhCdDTYCCCAAIANBDGogA0EIahCuBBogA0EQaiQACxgAIAAgASgCADYCACAAIAIoAgA2AgQgAAsJACAAIAEQog0LBwAgABCeDQsnAQF/IwBBEGsiASQAIAEgADYCDCABQQxqEJ8NIQAgAUEQaiQAIAALBwAgABCgDQsKACAAKAIAEKENCyoBAX8jAEEQayIBJAAgASAANgIMIAFBDGoQ/ggQsAQhACABQRBqJAAgAAsJACAAIAEQow0LMgEBfyMAQRBrIgIkACACIAA2AgwgAkEMaiABIAJBDGoQnw1rEM8JIQAgAkEQaiQAIAALCwAgACABNgIAIAALDQAgACABIAIgAxCmDQtpAQF/IwBBIGsiBCQAIARBGGogASACEKcNIARBEGogBEEMaiAEKAIYIAQoAhwgAxC7BBC8BCAEIAEgBCgCEBCoDTYCDCAEIAMgBCgCFBC+BDYCCCAAIARBDGogBEEIahCpDSAEQSBqJAALCwAgACABIAIQqg0LCQAgACABEKwNCwwAIAAgASACEKsNGgs4AQF/IwBBEGsiAyQAIAMgARCtDTYCDCADIAIQrQ02AgggACADQQxqIANBCGoQxwQaIANBEGokAAsYACAAIAEoAgA2AgAgACACKAIANgIEIAALCQAgACABELINCwcAIAAQrg0LJwEBfyMAQRBrIgEkACABIAA2AgwgAUEMahCvDSEAIAFBEGokACAACwcAIAAQsA0LCgAgACgCABCxDQsqAQF/IwBBEGsiASQAIAEgADYCDCABQQxqEMAJEMkEIQAgAUEQaiQAIAALCQAgACABELMNCzUBAX8jAEEQayICJAAgAiAANgIMIAJBDGogASACQQxqEK8Na0ECdRDeCSEAIAJBEGokACAACwsAIAAgATYCACAACwsAIABBADYCACAACwcAIAAQwg0LCwAgAEEAOgAAIAALPQEBfyMAQRBrIgEkACABIAAQww0QxA02AgwgARDjAjYC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DSAFQRBqJAALCQAgACABEIUOCwkAIAAgARCGDgsMACAAIAEgAhCEDhoLOAEBfyMAQRBrIgMkACADIAEQ+Q02AgwgAyACEPkNNgIIIAAgA0EMaiADQQhqEIQOGiADQRBqJAALDQAgABDsDSABEOwNRwsKABCHDiAAEIEOCwoAIAAoAgBBfGoLEQAgACAAKAIAQXxqNgIAIAALBAAgAAsYACAAIAEoAgA2AgAgACACKAIANgIEIAALCQAgACABEPwNCwQAIAELAgALCQAgACABEIoOCwoAIABBDGoQiw4LNwECfwJAA0AgACgCCCABRg0BIAAQ5g0hAiAAIAAoAghBfGoiAzYCCCACIAMQwA0Q2Q0MAAsACwsHACAAENYNCwoAQbOGBBCNDgALBQAQDgALBwAgABCFBgthAQF/IwBBEGsiAiQAIAIgADYCDAJAIAAgAUYNAANAIAIgAUF8aiIBNgIIIAAgAU8NASACQQxqIAJBCGoQkA4gAiACKAIMQQRqIgA2AgwgAigCCCEBDAALAAsgAkEQaiQACw8AIAAoAgAgASgCABCRDgsJACAAIAEQzgMLNAEBfyMAQRBrIgMkACAAIAIQpwkgA0EANgIMIAEgAkECdGogA0EMahCfCSADQRBqJAAgAAsEACAACwQAIAALBAAgAAsEACAACwQAIAALEAAgAEHo+gRBCGo2AgAgAAsQACAAQYz7BEEIajYCACAACwwAIAAQ1AY2AgAgAAsEACAACw4AIAAgASgCADYCACAACwgAIAAQ4AoaCwQAIAALCQAgACABEKEOCwcAIAAQog4LCwAgACABNgIAIAALDQAgACgCABCjDhCkDgsHACAAEKYOCwcAIAAQpQ4LPwECfyAAKAIAIABBCGooAgAiAUEBdWohAiAAKAIEIQACQCABQQFxRQ0AIAIoAgAgAGooAgAhAAsgAiAAEQMACwcAIAAoAgALFgAgACABEKoOIgFBBGogAhCbBRogAQsHACAAEKsOCwoAIABBBGoQnAULDgAgACABKAIANgIAIAALBAAgAAsKACABIABrQQxtCwsAIAAgASACEMQBCwUAEK8OCwgAQYCAgIB4CwUAELIOCwUAELMOCw0AQoCAgICAgICAgH8LDQBC////////////AAsLACAAIAEgAhDCAQsFABC2DgsGAEH//wMLBQAQuA4LBABC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ZTo6Y2xlYXIATWFyAFNlcAAlSTolTTolUyAlcABbV0FTTV0gRmVjaGFtZW50byBsaW1wbwBbV0FTTV0gSk9CIGludsOhbGlkbwBbV0FTTV0gSlNPTiBpbnZhbGlkbwBbV0FTTV0gUG9vbENsaWVudCBpbmljaWFsaXphZG8AW1dBU01dIFdlYlNvY2tldCBjcmlhZG8AW1dBU01dIHN0YXJ0TWluaW5nKCkgaW5pY2lhZG8Ac2h1dGRvd24AU3VuAEp1bgBzdGQ6OmV4Y2VwdGlvbgBNb24AbG9naW4AbmFuAEphbgB3c3M6Ly9wcm94eS14bXIub25yZW5kZXIuY29tAEp1bABsbABBcHJpbABGcmkAYmFkX2FycmF5X25ld19sZW5ndGgAc2VlZF9oYXNoAE1hcmNoAEF1ZwB4bXItdXMtZWFzdDEubmFub3Bvb2wub3JnAG1vbmVyb21pbmVyLmxvZwB0ZXJtaW5hdGluZwBiYXNpY19zdHJpbmcAJS4xN2cAaW5mACUuMExmACVMZgAlLmYAdHJ1ZQBUdWUAZmFsc2UASnVuZQBtZXRob2QAbWFwOjphdDogIGtleSBub3QgZm91bmQAam9iX2lkAHRlcm1pbmF0ZV9oYW5kbGVyIHVuZXhwZWN0ZWRseSByZXR1cm5lZABjb25kaXRpb25fdmFyaWFibGUgd2FpdCBmYWlsZWQAdGhyZWFkOjpqb2luIGZhaWxlZABtdXRleCBsb2NrIGZhaWxlZABjbG9ja19nZXR0aW1lKENMT0NLX1JFQUxUSU1FKSBmYWlsZWQAY29uZGl0aW9uX3ZhcmlhYmxlOjp3YWl0OiBtdXRleCBub3QgbG9ja2VkAFdlZABzdGQ6OmJhZF9hbGxvYwBEZWMAd2IAcmIAam9iAEZlYgBhYgB3K2IAcitiAGErYgByd2EAJWEgJWIgJWQgJUg6JU06JVMgJVkAUE9TSVgAJUg6JU06JVMAW1dBU01dIEZlY2hhbWVudG8gTkFPIExJTVBPAFtXQVNNXSBMT0dJTiBFTlZJQURPAFtXQVNNXSBGQUxIQSBBTyBFTlZJQVIgTE9HSU4ATkFOAFBNAEFNAExDX0FMTABMQU5HAElORgBDAEMuVVRGLTgAOEM2aEZiNEJ1bzZkWXdKaVpFYUZoeVloWlRKYVI0TnlYU0J6S01GMUJuTktNR0Q5MnllYVkzYTlQeHVXcDliaFRBaDZkQVh3cXl5TGZGeGFQUmN0N2o4MUw4dDRpSzIAd29ya2VyMQBNb25lcm9NaW5lci8xLjAuMABbV0FTTV0gU3Vic2lzdGVtYSBkZSBUaHJlYWRzIGRvIEVtc2NyaXB0ZW4gcHJvbnRvIHBhcmEgY29tYW5kb3MuAFtXQVNNXSBUb2RvcyBvcyBXZWIgV29ya2VycyBmb3JhbSBlbmNlcnJhZG9zLiBQcm9udG8gcGFyYSByZWluaWNpYXIuAFtXQVNNXSBXZWJTb2NrZXQgaW5pY2lhZG8uIEFndWFyZGFuZG8gZXZlbnRvcy4uLgBbV0FTTV0gRmluYWxpemFuZG8gbyBtb3RvciBkZSBtaW5lcmHDp8OjbyBhIHBlZGlkbyBkYSBpbnRlcmZhY2UuLi4AW1dBU01dIEVudmlhbmRvIExPR0lOLi4uAHcrAHIrAGErAFtXQVNNXSAqKiogT05PUEVOIERJU1BBUk9VICoqKgBbV0FTTV0gKioqIFdFQlNPQ0tFVCBGRUNIT1UgKioqAChudWxsKQAidHlwZSBtaXNtYXRjaCEgY2FsbCBpczx0eXBlPigpIGJlZm9yZSBnZXQ8dHlwZT4oKSIgJiYgaXM8YXJyYXk+KCkAInR5cGUgbWlzbWF0Y2ghIGNhbGwgaXM8dHlwZT4oKSBiZWZvcmUgZ2V0PHR5cGU+KCkiICYmIGlzPG9iamVjdD4oKQAidHlwZSBtaXNtYXRjaCEgY2FsbCBpczx0eXBlPigpIGJlZm9yZSBnZXQ8dHlwZT4oKSIgJiYgaXM8c3RkOjpzdHJpbmc+KCkAInR5cGUgbWlzbWF0Y2ghIGNhbGwgaXM8dHlwZT4oKSBiZWZvcmUgZ2V0PHR5cGU+KCkiICYmIGlzPGRvdWJsZT4oKQBQdXJlIHZpcnR1YWwgZnVuY3Rpb24gY2FsbGVkIQBbV0FTTV0gTE9HSU4gLT4gAERpZmZpY3VsdHk6IAAgSGVpZ2h0OiAAW1dBU01dIFN0YXR1czogAHN5bnRheCBlcnJvciBhdCBsaW5lICVkIG5lYXI6IABbV0FTTV0gQ2xvc2UgcmVhc29uOiAAbGliYysrYWJpOiAAW1dBU01dIENsb3NlIGNvZGU6IAAlMDJkLyUwMmQvJTA0ZCAo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cmFpdHNJY0VFRUUA3EABAKwPAQADAAAAAgAAAPwOAQACAAAARA8BAAIIAAAAAAAAOBABAIAAAACBAAAATlN0M19fMjliYXNpY19pb3NJd05TXzExY2hhcl90cmFpdHNJd0VFRUUAAACAQAEADBABAKATAQBOU3QzX18yMTViYXNpY19zdHJlYW1idWZJd05TXzExY2hhcl90cmFpdHNJd0VFRUUAAAAAWEABAEQQAQBOU3QzX18yMTNiYXNpY19pc3RyZWFtSXdOU18xMWNoYXJfdHJhaXRzSXdFRUVFAADcQAEAgBABAAAAAAABAAAAOBABAAP0//9OU3QzX18yMTNiYXNpY19vc3RyZWFtSXdOU18xMWNoYXJfdHJhaXRzSXdFRUVFAADcQAEAyBABAAAAAAABAAAAOBABAAP0//9OU3QzX18yMTViYXNpY19zdHJpbmdidWZJY05TXzExY2hhcl90cmFpdHNJY0VFTlNfOWFsbG9jYXRvckljRUVFRQAAAIBAAQAQEQEAxA4BAEAAAAAAAAAAmBIBAIIAAACDAAAAOAAAAPj///+YEgEAhAAAAIUAAADA////wP///5gSAQCGAAAAhwAAAGwRAQDQEQEADBIBACASAQA0EgEASBIBAPgRAQDkEQEAlBEBAIARAQBAAAAAAAAAANwPAQBRAAAAUgAAADgAAAD4////3A8BAFMAAABUAAAAwP///8D////cDwEAVQAAAFYAAABAAAAAAAAAAPwOAQBJAAAASgAAAMD////A/////A4BAEsAAABMAAAAOAAAAAAAAABEDwEATQAAAE4AAADI////yP///0QPAQBPAAAAUAAAAE5TdDNfXzIxOGJhc2ljX3N0cmluZ3N0cmVhbUljTlNfMTFjaGFyX3RyYWl0c0ljRUVOU185YWxsb2NhdG9ySWNFRUVFAAAAAIBAAQBQEgEA3A8BAGgAAAAAAAAANBMBAIgAAACJAAAAmP///5j///80EwEAigAAAIsAAACwEgEA6BIBAPwSAQDEEgEAaAAAAAAAAABEDwEATQAAAE4AAACY////mP///0QPAQBPAAAAUAAAAE5TdDNfXzIxNGJhc2ljX29mc3RyZWFtSWNOU18xMWNoYXJfdHJhaXRzSWNFRUVFAIBAAQAEEwEARA8BAE5TdDNfXzIxM2Jhc2ljX2ZpbGVidWZJY05TXzExY2hhcl90cmFpdHNJY0VFRUUAAIBAAQBAEwEAxA4BAAAAAACgEwEAjAAAAI0AAABOU3QzX18yOGlvc19iYXNlRQAAAFhAAQCMEwEA6EIBAHhDAQAQRAEAAAAAAAAAAAAAAAAAAgAAwAMAAMAEAADABQAAwAYAAMAHAADACAAAwAkAAMAKAADACwAAwAwAAMANAADADgAAwA8AAMAQAADAEQAAwBIAAMATAADAFAAAwBUAAMAWAADAFwAAwBgAAMAZAADAGgAAwBsAAMAcAADAHQAAwB4AAMAfAADAAAAAswEAAMMCAADDAwAAwwQAAMMFAADDBgAAwwcAAMMIAADDCQAAwwoAAMMLAADDDAAAww0AANMOAADDDwAAwwAADLsBAAzDAgAMwwMADMMEAAzbAAAAAOQUAQA7AAAAkgAAAJMAAAA+AAAAPwAAAEAAAABBAAAAQgAAAEMAAACUAAAAlQAAAJYAAABHAAAASAAAAE5TdDNfXzIxMF9fc3RkaW5idWZJY0VFAIBAAQDMFAEAxA4BAAAAAABMFQEAOwAAAJcAAACYAAAAPgAAAD8AAABAAAAAmQAAAEIAAABDAAAARAAAAEUAAABGAAAAmgAAAJsAAABOU3QzX18yMTFfX3N0ZG91dGJ1ZkljRUUAAAAAgEABADAVAQDEDgEAAAAAALAVAQBXAAAAnAAAAJ0AAABaAAAAWwAAAFwAAABdAAAAXgAAAF8AAACeAAAAnwAAAKAAAABjAAAAZAAAAE5TdDNfXzIxMF9fc3RkaW5idWZJd0VFAIBAAQCYFQEAeBABAAAAAAAYFgEAVwAAAKEAAACiAAAAWgAAAFsAAABcAAAAowAAAF4AAABfAAAAYAAAAGEAAABiAAAApAAAAKUAAABOU3QzX18yMTFfX3N0ZG91dGJ1Zkl3RUUAAAAAgEABAPwVAQB4EAEAAAAAAAAAAAAAAAAA/////////////////////////////////////////////////////////////////wABAgMEBQYHCAn/////////CgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiP///////8KCwwNDg8QERITFBUWFxgZGhscHR4fICEiI/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAQIEBwMGBQAAAAAAAABMQ19DVFlQRQAAAABMQ19OVU1FUklDAABMQ19USU1FAAAAAABMQ19DT0xMQVRFAABMQ19NT05FVEFSWQBMQ19NRVNTQUdFUwCQGQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAACAAAAAwAAAAQAAAAFAAAABgAAAAcAAAAIAAAACQAAAAoAAAALAAAADAAAAA0AAAAOAAAADwAAABAAAAARAAAAEgAAABMAAAAUAAAAFQAAABYAAAAXAAAAGAAAABkAAAAaAAAAGwAAABwAAAAdAAAAHgAAAB8AAAAgAAAAIQAAACIAAAAjAAAAJAAAACUAAAAmAAAAJwAAACgAAAApAAAAKgAAACsAAAAsAAAALQAAAC4AAAAvAAAAMAAAADEAAAAyAAAA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QgEAAEIBAABCAQAAQgEAAIIAAACCAAAAggAAAIIAAACCAAAAggAAAIIAAAAqAQAAKgEAACoBAAAqAQAAKgEAACoBAAAqAAAAKgAAACoAAAAqAAAAKgAAACoAAAAqAAAAKgAAACoAAAAqAAAAKgAAACoAAAAqAAAAKgAAACoAAAAqAAAAKgAAACoAAAAqAAAAKgAAAIIAAACCAAAAggAAAIIAAACCAAAAggAAADIBAAAyAQAAMgEAADIBAAAyAQAAMgEAADIAAAAyAAAAMgAAADIAAAAyAAAAMgAAADIAAAAyAAAAMgAAADIAAAAyAAAAMgAAADIAAAAyAAAAMgAAADIAAAAyAAAAMgAAADIAAAAyAAAAggAAAIIAAACCAAAAggAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADcLAEAxgAAAMcAAAC7AAAAyAAAAMkAAADKAAAAywAAAMwAAADNAAAAzgAAAAAAAACsLQEAzwAAANAAAAC7AAAA0QAAANIAAADTAAAA1AAAANUAAAAAAAAA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';
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
