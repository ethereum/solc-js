import translate from './translate';
import { https } from 'follow-redirects';
import MemoryStream from 'memorystream';
import assert from 'assert';
import * as semver from 'semver';
import { Callbacks } from './common/interfaces';

const Module = module.constructor as any;

function setupMethods (soljson) {
  let version;
  if ('_solidity_version' in soljson) {
    version = soljson.cwrap('solidity_version', 'string', []);
  } else {
    version = soljson.cwrap('version', 'string', []);
  }

  const versionToSemver = function () {
    return translate.versionToSemver(version());
  };

  const isVersion6 = semver.gt(versionToSemver(), '0.5.99');

  let license;
  if ('_solidity_license' in soljson) {
    license = soljson.cwrap('solidity_license', 'string', []);
  } else if ('_license' in soljson) {
    license = soljson.cwrap('license', 'string', []);
  } else {
    // pre 0.4.14
    license = function () {
      // return undefined
    };
  }

  let alloc;
  if ('_solidity_alloc' in soljson) {
    alloc = soljson.cwrap('solidity_alloc', 'number', ['number']);
  } else {
    alloc = soljson._malloc;
    assert(alloc, 'Expected malloc to be present.');
  }

  let reset;
  if ('_solidity_reset' in soljson) {
    reset = soljson.cwrap('solidity_reset', null, []);
  }

  // Copies the string at @p str to @p ptr.
  const copyToCString = function (str, ptr) {
    const length = soljson.lengthBytesUTF8(str);
    // This is allocating memory using solc's allocator.
    //
    // Before 0.6.0:
    //   Assuming copyToCString is only used in the context of wrapCallback, solc will free these pointers.
    //   See https://github.com/ethereum/solidity/blob/v0.5.13/libsolc/libsolc.h#L37-L40
    //
    // After 0.6.0:
    //   The duty is on solc-js to free these pointers. We accomplish that by calling `reset` at the end.
    const buffer = alloc(length + 1);
    soljson.stringToUTF8(str, buffer, length + 1);
    soljson.setValue(ptr, buffer, '*');
  };

	// Creates a wrapper around `int solidity_lsp_start(callbacks: Callbacks)`.
	const createWrappedLspStart = function() {
		if (!('_solidity_lsp_start' in soljson))
			return null;
		const wrappedLspStart = soljson.cwrap('solidity_lsp_start', 'number', []);
		return function (callbacks: Callbacks) {
			let readCallback = callbacks.import;
			assert(typeof readCallback === 'function', 'Invalid callback specified.');
			const copyFromCString = soljson.UTF8ToString || soljson.Pointer_stringify;

			const wrappedReadCallback = function (path: string, contents: string, error: string) {
				// Calls the user-supplied file read callback and passes the return values
				// accordingly to either @p contents or into @p error on failure.
				const result = readCallback(copyFromCString(path));
				if (typeof result.contents === 'string') {
					copyToCString(result.contents, contents);
				}
				if (typeof result.error === 'string') {
					copyToCString(result.error, error);
				}
			};

			const addFunction = soljson.addFunction || soljson.Runtime.addFunction;
			const removeFunction = soljson.removeFunction || soljson.Runtime.removeFunction;
			const wrappedFunctionId = addFunction(wrappedReadCallback, 'ii');

			try {
				// call solidity_lsp_start(callbacks)
				let args = [];
				args.push(wrappedFunctionId);
				let output = wrappedLspStart.apply(undefined, args);
				removeFunction(wrappedFunctionId);
				return output;
			} catch (e) {
				removeFunction(wrappedFunctionId);
				throw e;
			}
			// NOTE: We MUST NOT reset the compiler here.
			// We instead could try to make sure to only release memory that is
			// safe to be released.
			// Probably by clearly defining semantics and memory lifetimes
			// of output strings.
		};
	};

	// C signature  : int solidity_lsp_send(char const* jsonRpcInputObject);
	// TS signature : int send(object jsonRpcInputObject);
  const createWrappedLspSend = function() {
		if (!('_solidity_lsp_send' in soljson))
			return null;
    const wrappedLspSend = soljson.cwrap('solidity_lsp_send', 'number', ['string']);
    return function (input: String) {
      const args = [];
      args.push(JSON.stringify(input));
      return wrappedLspSend.apply(undefined, args);
    };
  };

	// C signature  : char* solidity_lsp_send_receive(char const* jsonRpcInputObject);
	// TS signature : object sendReceive(object jsonRpcInputObject);
	//
	// sendReceive send one message to the LSP server (notification or method call).
	// The method call may reply with zero or one message that is going to be returned.
  const createWrappedLspSendReceive = function() {
		if (!('_solidity_lsp_send_receive' in soljson))
			return null;
    const wrappedLspSendReceive = soljson.cwrap('solidity_lsp_send_receive', 'string', ['string']);
    return function (input: String) {
      const args = [];
      args.push(JSON.stringify(input));
      const reply = wrappedLspSendReceive.apply(undefined, args);
			return JSON.parse(reply);
    };
  };

  // This is to support multiple versions of Emscripten.
  // Take a single `ptr` and returns a `str`.
  const copyFromCString = soljson.UTF8ToString || soljson.Pointer_stringify;

  const wrapCallback = function (callback) {
    assert(typeof callback === 'function', 'Invalid callback specified.');
    return function (data, contents, error) {
      const result = callback(copyFromCString(data));
      if (typeof result.contents === 'string') {
        copyToCString(result.contents, contents);
      }
      if (typeof result.error === 'string') {
        copyToCString(result.error, error);
      }
    };
  };

  const wrapCallbackWithKind = function (callback) {
    assert(typeof callback === 'function', 'Invalid callback specified.');
    return function (context, kind, data, contents, error) {
      // Must be a null pointer.
      assert(context === 0, 'Callback context must be null.');
      const result = callback(copyFromCString(kind), copyFromCString(data));
      if (typeof result.contents === 'string') {
        copyToCString(result.contents, contents);
      }
      if (typeof result.error === 'string') {
        copyToCString(result.error, error);
      }
    };
  };

  // This calls compile() with args || cb
  const runWithCallbacks = function (callbacks, compile, args) {
    if (callbacks) {
      assert(typeof callbacks === 'object', 'Invalid callback object specified.');
    } else {
      callbacks = {};
    }

    let readCallback = callbacks.import;
    if (readCallback === undefined) {
      readCallback = function (data) {
        return {
          error: 'File import callback not supported'
        };
      };
    }

    let singleCallback;
    if (isVersion6) {
      // After 0.6.x multiple kind of callbacks are supported.
      let smtSolverCallback = callbacks.smtSolver;
      if (smtSolverCallback === undefined) {
        smtSolverCallback = function (data) {
          return {
            error: 'SMT solver callback not supported'
          };
        };
      }

      singleCallback = function (kind, data) {
        if (kind === 'source') {
          return readCallback(data);
        } else if (kind === 'smt-query') {
          return smtSolverCallback(data);
        } else {
          assert(false, 'Invalid callback kind specified.');
        }
      };

      singleCallback = wrapCallbackWithKind(singleCallback);
    } else {
      // Old Solidity version only supported imports.
      singleCallback = wrapCallback(readCallback);
    }

    // This is to support multiple versions of Emscripten.
    const addFunction = soljson.addFunction || soljson.Runtime.addFunction;
    const removeFunction = soljson.removeFunction || soljson.Runtime.removeFunction;

    const cb = addFunction(singleCallback, 'viiiii');
    let output;
    try {
      args.push(cb);
      if (isVersion6) {
        // Callback context.
        args.push(null);
      }
      output = compile.apply(undefined, args);
    } catch (e) {
      removeFunction(cb);
      throw e;
    }
    removeFunction(cb);
    if (reset) {
      // Explicitly free memory.
      //
      // NOTE: cwrap() of "compile" will copy the returned pointer into a
      //       Javascript string and it is not possible to call free() on it.
      //       reset() however will clear up all allocations.
      reset();
    }
    return output;
  };

  let compileJSON = null;
  if ('_compileJSON' in soljson) {
    // input (text), optimize (bool) -> output (jsontext)
    compileJSON = soljson.cwrap('compileJSON', 'string', ['string', 'number']);
  }

  let compileJSONMulti = null;
  if ('_compileJSONMulti' in soljson) {
    // input (jsontext), optimize (bool) -> output (jsontext)
    compileJSONMulti = soljson.cwrap('compileJSONMulti', 'string', ['string', 'number']);
  }

  let compileJSONCallback = null;
  if ('_compileJSONCallback' in soljson) {
    // input (jsontext), optimize (bool), callback (ptr) -> output (jsontext)
    const compileInternal = soljson.cwrap('compileJSONCallback', 'string', ['string', 'number', 'number']);
    compileJSONCallback = function (input, optimize, readCallback) {
      return runWithCallbacks(readCallback, compileInternal, [input, optimize]);
    };
  }

  let compileStandard = null;
  if ('_compileStandard' in soljson) {
    // input (jsontext), callback (ptr) -> output (jsontext)
    const compileStandardInternal = soljson.cwrap('compileStandard', 'string', ['string', 'number']);
    compileStandard = function (input, readCallback) {
      return runWithCallbacks(readCallback, compileStandardInternal, [input]);
    };
  }
  if ('_solidity_compile' in soljson) {
    let solidityCompile;
    if (isVersion6) {
      // input (jsontext), callback (ptr), callback_context (ptr) -> output (jsontext)
      solidityCompile = soljson.cwrap('solidity_compile', 'string', ['string', 'number', 'number']);
    } else {
      // input (jsontext), callback (ptr) -> output (jsontext)
      solidityCompile = soljson.cwrap('solidity_compile', 'string', ['string', 'number']);
    }
    compileStandard = function (input, callbacks) {
      return runWithCallbacks(callbacks, solidityCompile, [input]);
    };
  }

  // Expects a Standard JSON I/O but supports old compilers
  const compileStandardWrapper = function (input, readCallback?: any) {
    if (compileStandard !== null) {
      return compileStandard(input, readCallback);
    }

    function formatFatalError (message) {
      return JSON.stringify({
        errors: [
          {
            type: 'JSONError',
            component: 'solcjs',
            severity: 'error',
            message: message,
            formattedMessage: 'Error: ' + message
          }
        ]
      });
    }

    try {
      input = JSON.parse(input);
    } catch (e) {
      return formatFatalError('Invalid JSON supplied: ' + e.message);
    }

    if (input.language !== 'Solidity') {
      return formatFatalError('Only "Solidity" is supported as a language.');
    }

    // NOTE: this is deliberately `== null`
    if (input.sources == null || input.sources.length === 0) {
      return formatFatalError('No input sources specified.');
    }

    function isOptimizerEnabled (input) {
      return input.settings && input.settings.optimizer && input.settings.optimizer.enabled;
    }

    function translateSources (input) {
      const sources = {};
      for (const source in input.sources) {
        if (input.sources[source].content !== null) {
          sources[source] = input.sources[source].content;
        } else {
          // force failure
          return null;
        }
      }
      return sources;
    }

    function librariesSupplied (input) {
      if (input.settings) {
        return input.settings.libraries;
      }
    }

    function translateOutput (output, libraries) {
      try {
        output = JSON.parse(output);
      } catch (e) {
        return formatFatalError('Compiler returned invalid JSON: ' + e.message);
      }
      output = translate.translateJsonCompilerOutput(output, libraries);
      if (output == null) {
        return formatFatalError('Failed to process output.');
      }
      return JSON.stringify(output);
    }

    const sources = translateSources(input);
    if (sources === null || Object.keys(sources).length === 0) {
      return formatFatalError('Failed to process sources.');
    }

    // Try linking if libraries were supplied
    const libraries = librariesSupplied(input);

    // Try to wrap around old versions
    if (compileJSONCallback !== null) {
      return translateOutput(compileJSONCallback(JSON.stringify({ sources: sources }), isOptimizerEnabled(input), readCallback), libraries);
    }

    if (compileJSONMulti !== null) {
      return translateOutput(compileJSONMulti(JSON.stringify({ sources: sources }), isOptimizerEnabled(input)), libraries);
    }

    // Try our luck with an ancient compiler
    if (compileJSON !== null) {
      if (Object.keys(sources).length !== 1) {
        return formatFatalError('Multiple sources provided, but compiler only supports single input.');
      }
      return translateOutput(compileJSON(sources[Object.keys(sources)[0]], isOptimizerEnabled(input)), libraries);
    }

    return formatFatalError('Compiler does not support any known interface.');
  };

  return {
    version: version,
    semver: versionToSemver,
    license: license,
    lowlevel: {
      compileSingle: compileJSON,
      compileMulti: compileJSONMulti,
      compileCallback: compileJSONCallback,
      compileStandard: compileStandard
    },
    features: {
      legacySingleInput: compileJSON !== null,
      multipleInputs: compileJSONMulti !== null || compileStandard !== null,
      importCallback: compileJSONCallback !== null || compileStandard !== null,
      nativeStandardJSON: compileStandard !== null
    },
    lsp: {
      start: createWrappedLspStart(),
      send: createWrappedLspSend(),
      sendReceive: createWrappedLspSendReceive()
    },
    compile: compileStandardWrapper,
    // Loads the compiler of the given version from the github repository
    // instead of from the local filesystem.
    loadRemoteVersion: function (versionString, cb) {
      const mem = new MemoryStream(null, { readable: false });
      const url = 'https://binaries.soliditylang.org/bin/soljson-' + versionString + '.js';
      https.get(url, function (response) {
        if (response.statusCode !== 200) {
          cb(new Error('Error retrieving binary: ' + response.statusMessage));
        } else {
          response.pipe(mem);
          response.on('end', function () {
            // Based on the require-from-string package.
            const soljson = new Module();
            soljson._compile(mem.toString(), 'soljson-' + versionString + '.js');
            if (module.parent && module.parent.children) {
              // Make sure the module is plugged into the hierarchy correctly to have parent
              // properly garbage collected.
              module.parent.children.splice(module.parent.children.indexOf(soljson), 1);
            }

            cb(null, setupMethods(soljson.exports));
          });
        }
      }).on('error', function (error) {
        cb(error);
      });
    },
    // Use this if you want to add wrapper functions around the pure module.
    setupMethods: setupMethods
  };
}

export = setupMethods;
