import assert from 'assert';

import {
  CompileBindings, CompileJson, CompileJsonCallback, CompileJsonMulti, CompileJsonStandard, CoreBindings, SolJson
} from '../common/types';

import { isNil } from '../common/helpers';
import { bindSolcMethod } from './helpers';

export function setupCompile (solJson: SolJson, core: CoreBindings): CompileBindings {
  return {
    compileJson: bindCompileJson(solJson),
    compileJsonCallback: bindCompileJsonCallback(solJson, core),
    compileJsonMulti: bindCompileJsonMulti(solJson),
    compileStandard: bindCompileStandard(solJson, core)
  };
}

/**********************
 * COMPILE
 **********************/

/**
 * Returns a binding to the solidity compileJSON method.
 * input (text), optimize (bool) -> output (jsontext)
 *
 * @param solJson The Emscripten compiled Solidity object.
 */
function bindCompileJson (solJson: SolJson): CompileJson {
  return bindSolcMethod(
    solJson,
    'compileJSON',
    'string',
    ['string', 'number'],
    null
  );
}

/**
 * Returns a binding to the solidity compileJSONMulti method.
 * input (jsontext), optimize (bool) -> output (jsontext)
 *
 * @param solJson The Emscripten compiled Solidity object.
 */
function bindCompileJsonMulti (solJson: SolJson): CompileJsonMulti {
  return bindSolcMethod(
    solJson,
    'compileJSONMulti',
    'string',
    ['string', 'number'],
    null
  );
}

/**
 * Returns a binding to the solidity compileJSONCallback method.
 * input (jsontext), optimize (bool), callback (ptr) -> output (jsontext)
 *
 * @param solJson The Emscripten compiled Solidity object.
 * @param coreBindings The core bound Solidity methods.
 */
function bindCompileJsonCallback (solJson: SolJson, coreBindings: CoreBindings): CompileJsonCallback {
  const compileInternal = bindSolcMethod(
    solJson,
    'compileJSONCallback',
    'string',
    ['string', 'number', 'number'],
    null
  );

  if (isNil(compileInternal)) return null;

  return function (input, optimize, readCallback) {
    return runWithCallbacks(solJson, coreBindings, readCallback, compileInternal, [input, optimize]);
  };
}

/**
 * Returns a binding to the solidity solidity_compile method with a fallback to
 * compileStandard.
 * input (jsontext), callback (optional >= v6 only - ptr) -> output (jsontext)
 *
 * @param solJson The Emscripten compiled Solidity object.
 * @param coreBindings The core bound Solidity methods.
 */
function bindCompileStandard (solJson: SolJson, coreBindings: CoreBindings): CompileJsonStandard {
  let boundFunctionStandard: any = null;
  let boundFunctionSolidity: any = null;

  // input (jsontext), callback (ptr) -> output (jsontext)
  const compileInternal = bindSolcMethod(
    solJson,
    'compileStandard',
    'string',
    ['string', 'number'],
    null
  );

  if (coreBindings.isVersion6OrNewer) {
    // input (jsontext), callback (ptr), callback_context (ptr) -> output (jsontext)
    boundFunctionSolidity = bindSolcMethod(
      solJson,
      'solidity_compile',
      'string',
      ['string', 'number', 'number'],
      null
    );
  } else {
    // input (jsontext), callback (ptr) -> output (jsontext)
    boundFunctionSolidity = bindSolcMethod(
      solJson,
      'solidity_compile',
      'string',
      ['string', 'number'],
      null
    );
  }

  if (!isNil(compileInternal)) {
    boundFunctionStandard = function (input, readCallback) {
      return runWithCallbacks(solJson, coreBindings, readCallback, compileInternal, [input]);
    };
  }

  if (!isNil(boundFunctionSolidity)) {
    boundFunctionStandard = function (input, callbacks) {
      return runWithCallbacks(solJson, coreBindings, callbacks, boundFunctionSolidity, [input]);
    };
  }

  return boundFunctionStandard;
}

/**********************
 * CALLBACKS
 **********************/

function wrapCallback (coreBindings, callback) {
  assert(typeof callback === 'function', 'Invalid callback specified.');

  return function (data, contents, error) {
    const result = callback(coreBindings.copyFromCString(data));
    if (typeof result.contents === 'string') {
      coreBindings.copyToCString(result.contents, contents);
    }
    if (typeof result.error === 'string') {
      coreBindings.copyToCString(result.error, error);
    }
  };
}

function wrapCallbackWithKind (coreBindings, callback) {
  assert(typeof callback === 'function', 'Invalid callback specified.');

  return function (context, kind, data, contents, error) {
    // Must be a null pointer.
    assert(context === 0, 'Callback context must be null.');
    const result = callback(coreBindings.copyFromCString(kind), coreBindings.copyFromCString(data));
    if (typeof result.contents === 'string') {
      coreBindings.copyToCString(result.contents, contents);
    }
    if (typeof result.error === 'string') {
      coreBindings.copyToCString(result.error, error);
    }
  };
}

// calls compile() with args || cb
function runWithCallbacks (solJson: SolJson, coreBindings: CoreBindings, callbacks, compile, args) {
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
  if (coreBindings.isVersion6OrNewer) {
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

    singleCallback = wrapCallbackWithKind(coreBindings, singleCallback);
  } else {
    // Old Solidity version only supported imports.
    singleCallback = wrapCallback(coreBindings, readCallback);
  }

  const cb = coreBindings.addFunction(singleCallback, 'viiiii');
  let output;
  try {
    args.push(cb);
    if (coreBindings.isVersion6OrNewer) {
      // Callback context.
      args.push(null);
    }

    output = compile(...args);
  } finally {
    coreBindings.removeFunction(cb);
  }

  if (coreBindings.reset) {
    // Explicitly free memory.
    //
    // NOTE: cwrap() of "compile" will copy the returned pointer into a
    //       Javascript string and it is not possible to call free() on it.
    //       reset() however will clear up all allocations.
    coreBindings.reset();
  }
  return output;
}
