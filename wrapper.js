var requireFromString = require('require-from-string');
var https = require('https');
var MemoryStream = require('memorystream');

function setupMethods (soljson) {
  var compileJSON = soljson.cwrap('compileJSON', 'string', ['string', 'number']);
  var compileJSONMulti = null;
  if ('_compileJSONMulti' in soljson) {
    compileJSONMulti = soljson.cwrap('compileJSONMulti', 'string', ['string', 'number']);
  }
  var compileJSONCallback = null;
  var compileStandard = null;
  if (('_compileJSONCallback' in soljson) || ('_compileStandard' in soljson)) {
    var copyString = function (str, ptr) {
      var buffer = soljson._malloc(str.length + 1);
      soljson.writeStringToMemory(str, buffer);
      soljson.setValue(ptr, buffer, '*');
    };
    var wrapCallback = function (callback) {
      return function (path, contents, error) {
        var result = callback(soljson.Pointer_stringify(path));
        if (typeof result.contents === 'string') {
          copyString(result.contents, contents);
        }
        if (typeof result.error === 'string') {
          copyString(result.error, error);
        }
      };
    };

    // This calls compile() with args || cb
    var runWithReadCallback = function (readCallback, compile, args) {
      if (readCallback === undefined) {
        readCallback = function (path) {
          return {
            error: 'File import callback not supported'
          };
        };
      }
      var cb = soljson.Runtime.addFunction(wrapCallback(readCallback));
      var output;
      try {
        args.push(cb);
        output = compile.apply(undefined, args);
      } catch (e) {
        soljson.Runtime.removeFunction(cb);
        throw e;
      }
      soljson.Runtime.removeFunction(cb);
      return output;
    };

    var compileInternal = soljson.cwrap('compileJSONCallback', 'string', ['string', 'number', 'number']);
    compileJSONCallback = function (input, optimize, readCallback) {
      return runWithReadCallback(readCallback, compileInternal, [ input, optimize ]);
    };
    if ('_compileStandard' in soljson) {
      var compileStandardInternal = soljson.cwrap('compileStandard', 'string', ['string', 'number']);
      compileStandard = function (input, readCallback) {
        return runWithReadCallback(readCallback, compileStandardInternal, [ input ]);
      };
    }
  }

  var compile = function (input, optimise, readCallback) {
    var result = '';
    if (readCallback !== undefined && compileJSONCallback !== null) {
      result = compileJSONCallback(JSON.stringify(input), optimise, readCallback);
    } else if (typeof input !== 'string' && compileJSONMulti !== null) {
      result = compileJSONMulti(JSON.stringify(input), optimise);
    } else {
      result = compileJSON(input, optimise);
    }

    var res = JSON.parse(result);
    if (res.errors) {
      // TODO: Remove once the following is clarified:
      // https://github.com/ethereum/solc-js/issues/53
      // only leave the console.error

      if (res.errors.filter(function (value) {
        value.indexOf('Warning') > 0;
      })) {
        console.error('Compiled with Warnings: ', res.errors);
      } else {
        console.error('Compiled with Errors: ', res.errors);
      }
    } else if (res.warnings) {
      console.warn('Compiled with Warnings: ', res.warnings);
    } else {
      console.log('Compiled with sucess.');
    }
    return JSON.parse(result);
  };

  var linkBytecode = function (bytecode, libraries) {
    for (var libraryName in libraries) {
      // truncate to 37 characters
      var internalName = libraryName.slice(0, 36);
      // prefix and suffix with __
      var libLabel = '__' + internalName + Array(37 - internalName.length).join('_') + '__';

      var hexAddress = libraries[libraryName];
      if (hexAddress.slice(0, 2) !== '0x' || hexAddress.length > 42) {
        throw new Error('Invalid address specified for ' + libraryName);
      }
      // remove 0x prefix
      hexAddress = hexAddress.slice(2);
      hexAddress = Array(40 - hexAddress.length + 1).join('0') + hexAddress;

      while (bytecode.indexOf(libLabel) >= 0) {
        bytecode = bytecode.replace(libLabel, hexAddress);
      }
    }

    return bytecode;
  };

  var version = soljson.cwrap('version', 'string', []);

  return {
    version: version,
    compile: compile,
    compileStandard: compileStandard,
    linkBytecode: linkBytecode,
    supportsMulti: compileJSONMulti !== null,
    supportsImportCallback: compileJSONCallback !== null,
    supportsStandard: compileStandard !== null,
    // Use the given version if available.
    useVersion: function (versionString) {
      return setupMethods(require('./bin/soljson-' + versionString + '.js'));
    },
    // Loads the compiler of the given version from the github repository
    // instead of from the local filesystem.
    loadRemoteVersion: function (versionString, cb) {
      var mem = new MemoryStream(null, {readable: false});
      var url = 'https://ethereum.github.io/solc-bin/bin/soljson-' + versionString + '.js';
      https.get(url, function (response) {
        if (response.statusCode !== 200) {
          cb('Error retrieving binary: ' + response.statusMessage);
        } else {
          response.pipe(mem);
          response.on('end', function () {
            cb(null, setupMethods(requireFromString(mem.toString(), 'soljson-' + versionString + '.js')));
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

module.exports = setupMethods;
