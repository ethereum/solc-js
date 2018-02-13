const tape = require('tape');
const solc = require('../index.js');

tape('Version and license', function (t) {
  t.test('check version', function (st) {
    st.equal(typeof solc.version(), 'string');
    st.end();
  });
  t.test('check semver', function (st) {
    st.equal(typeof solc.semver(), 'string');
    st.end();
  });
  t.test('check license', function (st) {
    st.ok(typeof solc.license() === 'undefined' || typeof solc.license() === 'string');
    st.end();
  });
});

tape('Compilation', function (t) {
  t.test('single files can be compiled', function (st) {
    var output = solc.compile('contract x { function g() {} }');
    st.ok('contracts' in output);
    st.ok(':x' in output.contracts);
    st.ok('bytecode' in output.contracts[':x']);
    st.ok(output.contracts[':x'].bytecode.length > 0);
    st.end();
  });
  t.test('invalid source code fails properly', function (st) {
    var output = solc.compile('contract x { this is an invalid contract }');
    st.plan(3);
    st.ok('errors' in output);
    // Check if the ParserError exists, but allow others too
    st.ok(output.errors.length >= 1);
    for (var error in output.errors) {
      if (output.errors[error].indexOf('ParserError') !== -1) {
        st.ok(true);
      }
    }
    st.end();
  });

  t.test('multiple files can be compiled', function (st) {
    var input = {
      'lib.sol': 'library L { function f() returns (uint) { return 7; } }',
      'cont.sol': 'import "lib.sol"; contract x { function g() { L.f(); } }'
    };
    var output = solc.compile({sources: input});
    st.ok('contracts' in output);
    st.ok('cont.sol:x' in output.contracts);
    st.ok('lib.sol:L' in output.contracts);
    st.ok('bytecode' in output.contracts['cont.sol:x']);
    st.ok('bytecode' in output.contracts['lib.sol:L']);
    st.ok(output.contracts['cont.sol:x'].bytecode.length > 0);
    st.ok(output.contracts['lib.sol:L'].bytecode.length > 0);
    st.end();
  });

  t.test('lazy-loading callback works', function (st) {
    var input = {
      'cont.sol': 'import "lib.sol"; contract x { function g() { L.f(); } }'
    };
    function findImports (path) {
      if (path === 'lib.sol') {
        return { contents: 'library L { function f() returns (uint) { return 7; } }' };
      } else {
        return { error: 'File not found' };
      }
    }
    var output = solc.compile({sources: input}, 0, findImports);
    st.ok('contracts' in output);
    st.ok('cont.sol:x' in output.contracts);
    st.ok('lib.sol:L' in output.contracts);
    st.ok('bytecode' in output.contracts['cont.sol:x']);
    st.ok('bytecode' in output.contracts['lib.sol:L']);
    st.ok(output.contracts['cont.sol:x'].bytecode.length > 0);
    st.ok(output.contracts['lib.sol:L'].bytecode.length > 0);
    st.end();
  });

  t.test('lazy-loading callback works (with file not found)', function (st) {
    var input = {
      'cont.sol': 'import "lib.sol"; contract x { function g() { L.f(); } }'
    };
    function findImports (path) {
      return { error: 'File not found' };
    }
    var output = solc.compile({sources: input}, 0, findImports);
    st.plan(3);
    st.ok('errors' in output);
    // Check if the ParserError exists, but allow others too
    st.ok(output.errors.length >= 1);
    for (var error in output.errors) {
      // Error should be something like:
      //   cont.sol:1:1: ParserError: Source "lib.sol" not found: File not found
      if (output.errors[error].indexOf('ParserError') !== -1 && output.errors[error].indexOf('File not found') !== -1) {
        st.ok(true);
      }
    }
    st.end();
  });

  t.test('lazy-loading callback works (with exception)', function (st) {
    var input = {
      'cont.sol': 'import "lib.sol"; contract x { function g() { L.f(); } }'
    };
    function findImports (path) {
      throw new Error('Could not implement this interface properly...');
    }
    st.throws(function () {
      solc.compile({sources: input}, 0, findImports);
    }, /^Error: Could not implement this interface properly.../);
    st.end();
  });

  t.test('file import without lazy-loading callback fails properly', function (st) {
    var input = {
      'cont.sol': 'import "lib.sol"; contract x { function g() { L.f(); } }'
    };
    var output = solc.compile({sources: input}, 0);
    st.plan(3);
    st.ok('errors' in output);
    // Check if the ParserError exists, but allow others too
    st.ok(output.errors.length >= 1);
    for (var error in output.errors) {
      // Error should be something like:
      //   cont.sol:1:1: ParserError: Source "lib.sol" not found: File not supplied initially.
      if (output.errors[error].indexOf('ParserError') !== -1 && output.errors[error].indexOf('File not supplied initially.') !== -1) {
        st.ok(true);
      }
    }
    st.end();
  });

  t.test('compiling standard JSON', function (st) {
    if (!solc.supportsStandard) {
      st.skip('Not supported by solc');
      st.end();
      return;
    }

    var input = {
      'language': 'Solidity',
      'settings': {
        'outputSelection': {
          '*': {
            '*': [ 'evm.bytecode' ]
          }
        }
      },
      'sources': {
        'lib.sol': {
          'content': 'library L { function f() returns (uint) { return 7; } }'
        },
        'cont.sol': {
          'content': 'import "lib.sol"; contract x { function g() { L.f(); } }'
        }
      }
    };

    function bytecodeExists (output, fileName, contractName) {
      try {
        return output.contracts[fileName][contractName]['evm']['bytecode']['object'].length > 0;
      } catch (e) {
        return false;
      }
    }

    var output = JSON.parse(solc.compileStandard(JSON.stringify(input)));
    st.ok(bytecodeExists(output, 'cont.sol', 'x'));
    st.ok(bytecodeExists(output, 'lib.sol', 'L'));
    st.end();
  });
  t.test('invalid source code fails properly with standard JSON', function (st) {
    if (!solc.supportsStandard) {
      st.skip('Not supported by solc');
      st.end();
      return;
    }

    var input = {
      'language': 'Solidity',
      'settings': {
        'outputSelection': {
          '*': {
            '*': [ 'evm.bytecode' ]
          }
        }
      },
      'sources': {
        'x.sol': {
          'content': 'contract x { this is an invalid contract }'
        }
      }
    };
    var output = JSON.parse(solc.compileStandard(JSON.stringify(input)));
    st.plan(3);
    st.ok('errors' in output);
    st.ok(output.errors.length >= 1);
    // Check if the ParserError exists, but allow others too
    for (var error in output.errors) {
      if (output.errors[error].type === 'ParserError') {
        st.ok(true);
      }
    }
    st.end();
  });
  t.test('compiling standard JSON (with callback)', function (st) {
    if (!solc.supportsStandard) {
      st.skip('Not supported by solc');
      st.end();
      return;
    }

    var input = {
      'language': 'Solidity',
      'settings': {
        'outputSelection': {
          '*': {
            '*': [ 'evm.bytecode' ]
          }
        }
      },
      'sources': {
        'cont.sol': {
          'content': 'import "lib.sol"; contract x { function g() { L.f(); } }'
        }
      }
    };

    function findImports (path) {
      if (path === 'lib.sol') {
        return { contents: 'library L { function f() returns (uint) { return 7; } }' };
      } else {
        return { error: 'File not found' };
      }
    }

    function bytecodeExists (output, fileName, contractName) {
      try {
        return output.contracts[fileName][contractName]['evm']['bytecode']['object'].length > 0;
      } catch (e) {
        return false;
      }
    }

    var output = JSON.parse(solc.compileStandard(JSON.stringify(input), findImports));
    st.ok(bytecodeExists(output, 'cont.sol', 'x'));
    st.ok(bytecodeExists(output, 'lib.sol', 'L'));
    st.end();
  });
  t.test('compiling standard JSON (using wrapper)', function (st) {
    var input = {
      'language': 'Solidity',
      'settings': {
        'outputSelection': {
          '*': {
            '*': [ 'evm.bytecode' ]
          }
        }
      },
      'sources': {
        'lib.sol': {
          'content': 'library L { function f() returns (uint) { return 7; } }'
        },
        'cont.sol': {
          'content': 'import "lib.sol"; contract x { function g() { L.f(); } }'
        }
      }
    };

    function bytecodeExists (output, fileName, contractName) {
      try {
        return output.contracts[fileName][contractName]['evm']['bytecode']['object'].length > 0;
      } catch (e) {
        return false;
      }
    }

    var output = JSON.parse(solc.compileStandardWrapper(JSON.stringify(input)));
    st.ok(bytecodeExists(output, 'cont.sol', 'x'));
    st.ok(bytecodeExists(output, 'lib.sol', 'L'));
    st.end();
  });
});

tape('Loading Legacy Versions', function (t) {
  t.test('loading remote version - development snapshot', function (st) {
    // getting the development snapshot
    st.plan(3);
    solc.loadRemoteVersion('latest', function (err, solcSnapshot) {
      st.notOk(err);
      var output = solcSnapshot.compile('contract x { function g() {} }');
      st.ok(':x' in output.contracts);
      st.ok(output.contracts[':x'].bytecode.length > 0);
    });
  });
});

tape('Linking', function (t) {
  t.test('link properly', function (st) {
    var input = {
      'lib.sol': 'library L { function f() returns (uint) { return 7; } }',
      'cont.sol': 'import "lib.sol"; contract x { function g() { L.f(); } }'
    };
    var output = solc.compile({sources: input});
    st.ok('contracts' in output);
    st.ok('cont.sol:x' in output.contracts);
    st.ok('bytecode' in output.contracts['cont.sol:x']);
    st.ok(output.contracts['cont.sol:x'].bytecode.length > 0);
    var bytecode = solc.linkBytecode(output.contracts['cont.sol:x'].bytecode, { 'lib.sol:L': '0x123456' });
    st.ok(bytecode.indexOf('_') < 0);
    st.end();
  });

  t.test('linker to fail with missing library', function (st) {
    var input = {
      'lib.sol': 'library L { function f() returns (uint) { return 7; } }',
      'cont.sol': 'import "lib.sol"; contract x { function g() { L.f(); } }'
    };
    var output = solc.compile({sources: input});
    st.ok('contracts' in output);
    st.ok('cont.sol:x' in output.contracts);
    st.ok('bytecode' in output.contracts['cont.sol:x']);
    st.ok(output.contracts['cont.sol:x'].bytecode.length > 0);
    var bytecode = solc.linkBytecode(output.contracts['cont.sol:x'].bytecode, { });
    st.ok(bytecode.indexOf('_') >= 0);
    st.end();
  });

  t.test('linker to fail with invalid address', function (st) {
    var input = {
      'lib.sol': 'library L { function f() returns (uint) { return 7; } }',
      'cont.sol': 'import "lib.sol"; contract x { function g() { L.f(); } }'
    };
    var output = solc.compile({sources: input});
    st.ok('contracts' in output);
    st.ok('cont.sol:x' in output.contracts);
    st.ok('bytecode' in output.contracts['cont.sol:x']);
    st.ok(output.contracts['cont.sol:x'].bytecode.length > 0);
    st.throws(function () {
      solc.linkBytecode(output.contracts['cont.sol:x'].bytecode, { 'lib.sol:L': '' });
    });
    st.end();
  });

  t.test('linker properly with truncated library name', function (st) {
    var input = {
      'lib.sol': 'library L1234567890123456789012345678901234567890 { function f() returns (uint) { return 7; } }',
      'cont.sol': 'import "lib.sol"; contract x { function g() { L1234567890123456789012345678901234567890.f(); } }'
    };
    var output = solc.compile({sources: input});
    st.ok('contracts' in output);
    st.ok('cont.sol:x' in output.contracts);
    st.ok('bytecode' in output.contracts['cont.sol:x']);
    st.ok(output.contracts['cont.sol:x'].bytecode.length > 0);
    var bytecode = solc.linkBytecode(output.contracts['cont.sol:x'].bytecode, { 'lib.sol:L1234567890123456789012345678901234567890': '0x123456' });
    st.ok(bytecode.indexOf('_') < 0);
    st.end();
  });
});
