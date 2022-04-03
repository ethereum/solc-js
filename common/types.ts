/**
 * A mapping between libraries and the addresses to which they were deployed.
 *
 * Containing support for two level configuration, These two level
 * configurations can be seen below.
 *
 * {
 *     "lib.sol:L1": "0x...",
 *     "lib.sol:L2": "0x...",
 *     "lib.sol": {"L3": "0x..."}
 * }
 */
export interface LibraryAddresses {
  [qualifiedNameOrSourceUnit: string]: string | { [unqualifiedLibraryName: string]: string };
}

/**
 * A mapping between libraries and lists of placeholder instances present in their hex-encoded bytecode.
 * For each placeholder its length and the position of the first character is stored.
 *
 * Each start and length entry will always directly refer to the position in
 * binary and not hex-encoded bytecode.
 */
export interface LinkReferences {
  [libraryLabel: string]: Array<{ start: number, length: number }>;
}

export interface SolJson {
  /**
   * Returns a native JavaScript wrapper for a C function.
   *
   * This is similar to ccall(), but returns a JavaScript function that can be
   * reused as many times as needed. The C function can be defined in a C file,
   * or be a C-compatible C++ function defined using extern "C" (to prevent
   * name mangling).
   *
   * @param ident The name of the C function to be called.
   *
   * @param returnType The return type of the function. This can be "number",
   * "string" or "array", which correspond to the appropriate JavaScript
   * types (use "number" for any C pointer, and "array" for JavaScript arrays
   * and typed arrays; note that arrays are 8-bit), or for a void function it
   * can be null (note: the JavaScript null value, * not a string containing
   * the word “null”).
   *
   * @param argTypes An array of the types of arguments for the function (if
   * there are no arguments, this can be omitted). Types are as in returnType,
   * except that array is not supported as there is no way for us to know the
   * length of the array).
   *
   * @returns A JavaScript function that can be used for running the C function.
   */
  cwrap<T> (ident: string, returnType: string | null, argTypes: string[]): T;

  /**
   * Sets a value at a specific memory address at run-time.
   *
   * Note:
   * setValue() and getValue() only do aligned writes and reads.
   *
   * The type is an LLVM IR type (one of i8, i16, i32, i64, float, double, or
   * a pointer type like i8* or just *), not JavaScript types as used in ccall()
   * or cwrap(). This is a lower-level operation, and we do need to care what
   * specific type is being used.
   *
   * @param ptr A pointer (number) representing the memory address.
   *
   * @param value The value to be stored
   *
   * @param type  An LLVM IR type as a string (see “note” above).
   *
   * @param noSafe Developers should ignore this variable. It is only
   * used in SAFE_HEAP compilation mode, where it can help avoid infinite recursion
   * in some specialist use cases.
   */
  setValue (ptr: number, value: any, type: string, noSafe?: boolean): void;

  /**
   * Given a pointer ptr to a null-terminated UTF8-encoded string in the
   * Emscripten HEAP, returns a copy of that string as a JavaScript String
   * object.
   *
   * @param ptr A pointer to a null-terminated UTF8-encoded string in the
   * Emscripten HEAP.
   *
   * @param maxBytesToRead An optional length that specifies the maximum number
   * of bytes to read. You can omit this parameter to scan the string until the
   * first 0 byte. If maxBytesToRead is passed, and the string at
   * [ptr, ptr+maxBytesToReadr) contains a null byte in the middle, then the
   * string will cut short at that byte index (i.e. maxBytesToRead will not
   * produce a string of exact length [ptr, ptr+maxBytesToRead)) N.B. mixing
   * frequent uses of UTF8ToString() with and without maxBytesToRead may throw
   * JS JIT optimizations off, so it is worth to consider consistently using
   * one style or the other.
   */
  UTF8ToString (ptr: number, maxBytesToRead?: number): string;

  /**
   * v1.38.27: 02/10/2019 (emscripten)
   * --------------------
   *  - Remove deprecated Pointer_stringify (use UTF8ToString instead). See #8011
   *
   * @param ptr
   * @param length
   * @constructor
   *
   * @deprecated use UTF8ToString instead
   */
  // eslint-disable-next-line camelcase
  Pointer_stringify (ptr: number, length?: number): string;

  /**
   * Given a string input return the current length of the given UTF8 bytes.
   * Used when performing stringToUTF8 since stringToUTF8  will require at most
   * str.length*4+1 bytes of space in the HEAP.
   *
   * @param str The input string.
   */
  lengthBytesUTF8 (str: string): number;

  /**
   * Copies the given JavaScript String object str to the Emscripten HEAP at
   * address outPtr, null-terminated and encoded in UTF8 form.
   *
   * The copy will require at most str.length*4+1 bytes of space in the HEAP.
   * You can use the function lengthBytesUTF8() to compute the exact amount
   * of bytes (excluding the null terminator) needed to encode the string.
   *
   * @param str A JavaScript String object.
   *
   * @param outPtr Pointer to data copied from str, encoded in UTF8 format and
   * null-terminated.
   *
   * @param maxBytesToWrite A limit on the number of bytes that this function
   * can at most write out. If the string is longer than this, the output is
   * truncated. The outputted string will always be null terminated, even if
   * truncation occurred, as long as maxBytesToWrite > 0
   */
  stringToUTF8 (str: string, outPtr: number, maxBytesToWrite?: number): void;

  /**
   * Allocates size bytes of uninitialized storage.
   *
   * If allocation succeeds, returns a pointer that is suitably aligned for any
   * object type with fundamental alignment.
   *
   * @param size number of bytes to allocate
   *
   * @returns On success, returns the pointer to the beginning of newly
   * allocated memory. To avoid a memory leak, the returned pointer must be
   * deallocated with free() or realloc().
   */
  _malloc (size: number): number;

  /**
   * Use addFunction to return an integer value that represents a function
   * pointer. Passing that integer to C code then lets it call that value as a
   * function pointer, and the JavaScript function you sent to addFunction will
   * be called.
   *
   * when using addFunction on LLVM wasm backend, you need to provide an
   * additional second argument, a Wasm function signature string. Each
   * character within a signature string represents a type. The first character
   * represents the return type of the function, and remaining characters are for
   * parameter types.
   *
   * 'v': void type
   * 'i': 32-bit integer type
   * 'j': 64-bit integer type (currently does not exist in JavaScript)
   * 'f': 32-bit float type
   * 'd': 64-bit float type
   *
   * @param func
   * @param signature
   */
  addFunction (func: (...args: any[]) => any, signature?: string): number;

  /**
   * Removes an allocated function by the provided function pointer.
   *
   * @param funcPtr
   */
  removeFunction (funcPtr: number): void;

  /**
   * Fallback runtime which can contain the add/remove functions
   */
  Runtime: {
    addFunction (func: (...args: any[]) => any, signature?: string): number;
    removeFunction (funcPtr: number): void;
  };
}

/**************************
 * core binding functions
 *************************/

/**
 * Allocates a chunk of memory of size bytes.
 *
 * Use this function inside callbacks to allocate data that is to be passed to
 * the compiler. You may use solidity_free() or solidity_reset() to free this
 * memory again, but it is not required as the compiler takes ownership for any
 * data passed to it via callbacks.
 *
 * This function will return NULL if the requested memory region could not be
 * allocated.
 *
 * @param size The size of bytes to be allocated.
 */
export type Alloc = (size: number) => number;

/**
 * Returns the complete license document.
 */
export type License = () => string | undefined;

/**
 * This should be called right before each compilation, but not at the end,
 * so additional memory can be freed.
 */
export type Reset = () => string;

/**
 * Returns the compiler version.
 */
export type Version = () => string;

/**
 * Returns the compiler version as a semver version style.
 */
export type VersionToSemver = () => string;

// compile binding functions
export type ReadCallbackResult = { contents: string } | { error: string };
export type ReadCallback = (path: string) => ReadCallbackResult;
export type Callbacks = { [x: string]: ReadCallback };

/**
 * Compile a single file.
 *
 * @solidityMaxVersion 0.5.0
 *
 * @param input
 * @param optimize
 */
export type CompileJson = (input: string, optimize: boolean) => string;

/**
 * Compile a single file with a callback.
 *
 * @solidityMinVersion 0.2.1
 * @solidityMaxVersion 0.5.0
 *
 * @param input
 * @param optimize
 * @param readCallbackPtr
 */
export type CompileJsonCallback = (input: string, optimize: boolean, readCallbackPtr: number) => string;

/**
 *  Compile multiple files.
 *
 * @solidityMinVersion 0.1.6
 * @solidityMaxVersion 0.5.0
 *
 * @param input
 * @param optimize
 */
export type CompileJsonMulti = (input: string, optimize: boolean) => string;

/**
 * Will attempt to bind into compileStandard before falling back to solidity_compile.
 * compileStandard - solidityMaxVersion 0.5.0
 *
 * @solidityMinVersion 0.4.11
 *
 * @param input
 * @param callbackPtr
 * @param contextPtr
 */
export type CompileJsonStandard = (input: string, callbackPtr: number, contextPtr?: number) => string;

/**
 * Compile the provided input, using the best case implementation based on the
 * current binary.
 *
 * @param input
 * @param readCallback
 */
export type CompileSolidity = (input: string, readCallback?: Callbacks) => string;

export interface CompileBindings {
  compileJson: CompileJson;
  compileJsonCallback: CompileJsonCallback;
  compileJsonMulti: CompileJsonMulti;
  compileStandard: CompileJsonStandard;
}

export interface CoreBindings {
  alloc: Alloc;
  license: License;
  reset: Reset;

  version: Version;
  versionToSemver: VersionToSemver;

  copyFromCString: (ptr: string) => string;
  copyToCString: (input: string, ptr: string) => string;

  addFunction: (func: (...args: any[]) => any, signature: string) => number;
  removeFunction: (ptr: number) => void;

  isVersion6OrNewer: boolean,
}

export interface SupportedMethods {
  licenseSupported: boolean;
  versionSupported: boolean;
  allocSupported: boolean;
  resetSupported: boolean;
  compileJsonSupported: boolean;
  compileJsonMultiSupported: boolean;
  compileJsonCallbackSupported: boolean;
  compileJsonStandardSupported: boolean;
}

export interface Wrapper {
  /**
   * Returns the complete license document.
   */
  license (): string | undefined;

  /**
   * Returns the compiler version.
   */
  version (): string;

  /**
   * Returns the compiler version as a semver version style.
   */
  semver (): string;

  /**
   * Compile the provided input, using the best case implementation based on the
   * current binary.
   *
   * @param input
   * @param readCallback
   */
  compile (input: string, readCallback?: Callbacks): string;

  lowlevel: {
    compileSingle?: CompileJson;
    compileMulti?: CompileJsonMulti;
    compileCallback?: CompileJsonCallback;
    compileStandard?: CompileJsonStandard;
  };

  features: {
    legacySingleInput: boolean;
    multipleInputs: boolean;
    importCallback: boolean;
    nativeStandardJSON: boolean;
  };

  loadRemoteVersion (version: string, callback: (error: Error, solc: SolJson) => void): void;

  setupMethods (soljson: SolJson): Wrapper;
}
