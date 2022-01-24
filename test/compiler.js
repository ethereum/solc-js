const assert = require('assert');
const tape = require('tape');
const semver = require('semver');
const solc = require('../index.js');
const linker = require('../linker.js');
const execSync = require('child_process').execSync;

const noRemoteVersions = (process.argv.indexOf('--no-remote-versions') >= 0);

function runTests (solc, versionText) {
  console.log(`Running tests with ${versionText} ${solc.version()}`);

  function resplitFileNameOnFirstColon (fileName, contractName) {
    assert(!contractName.includes(':'));

    const contractNameComponents = fileName.split(':');
    const truncatedFileName = contractNameComponents.shift();
    contractNameComponents.push(contractName);

    return [truncatedFileName, contractNameComponents.join(':')];
  }

  function getBytecode (output, fileName, contractName) {
    try {
      let outputContract;
      if (semver.lt(solc.semver(), '0.4.9')) {
        outputContract = output.contracts[contractName];
      } else {
        outputContract = output.contracts[fileName + ':' + contractName];
      }
      return outputContract.bytecode;
    } catch (e) {
      return '';
    }
  }

  function getBytecodeStandard (output, fileName, contractName) {
    try {
      let outputFile;
      if (semver.lt(solc.semver(), '0.4.9')) {
        outputFile = output.contracts[''];
      } else {
        if (semver.gt(solc.semver(), '0.4.10') && semver.lt(solc.semver(), '0.4.20')) {
          [fileName, contractName] = resplitFileNameOnFirstColon(fileName, contractName);
        }
        outputFile = output.contracts[fileName];
      }
      return outputFile[contractName].evm.bytecode.object;
    } catch (e) {
      return '';
    }
  }

  function getGasEstimate (output, fileName, contractName) {
    try {
      let outputFile;
      if (semver.lt(solc.semver(), '0.4.9')) {
        outputFile = output.contracts[''];
      } else {
        if (semver.gt(solc.semver(), '0.4.10') && semver.gt(solc.semver(), '0.4.20')) {
          [fileName, contractName] = resplitFileNameOnFirstColon(fileName, contractName);
        }
        outputFile = output.contracts[fileName];
      }
      return outputFile[contractName].evm.gasEstimates;
    } catch (e) {
      return '';
    }
  }

  function expectError (output, errorType, message) {
    if (output.errors) {
      for (let error in output.errors) {
        error = output.errors[error];
        if (error.type === errorType) {
          if (message) {
            if (error.message.match(message) !== null) {
              return true;
            }
          } else {
            return true;
          }
        }
      }
    }
    return false;
  }

  function expectNoError (output) {
    if (output.errors) {
      for (let error in output.errors) {
        error = output.errors[error];
        if (error.severity === 'error') {
          return false;
        }
      }
    }
    return true;
  }

  tape(versionText, function (t) {
    const tape = t.test;

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
      t.test('single files can be compiled (using lowlevel API)', function (st) {
        if (typeof solc.lowlevel.compileSingle !== 'function') {
          st.skip('Low-level compileSingle interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const output = JSON.parse(solc.lowlevel.compileSingle('contract A { function g() public {} }'));
        st.ok('contracts' in output);
        const bytecode = getBytecode(output, '', 'A');
        st.ok(typeof bytecode === 'string');
        st.ok(bytecode.length > 0);
        st.end();
      });

      t.test('invalid source code fails properly (using lowlevel API)', function (st) {
        // TODO: try finding an example which doesn't crash it?
        if (semver.eq(solc.semver(), '0.4.11')) {
          st.skip('Skipping on broken compiler version');
          st.end();
          return;
        }

        if (typeof solc.lowlevel.compileSingle !== 'function') {
          st.skip('Low-level compileSingle interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const output = JSON.parse(solc.lowlevel.compileSingle('contract x { this is an invalid contract }'));
        if (semver.lt(solc.semver(), '0.1.4')) {
          st.ok(output.error.indexOf('Parser error: Expected identifier') !== -1);
          st.end();
          return;
        }
        st.plan(3);
        st.ok('errors' in output);
        // Check if the ParserError exists, but allow others too
        st.ok(output.errors.length >= 1);
        for (const error in output.errors) {
          // Error should be something like:
          //   ParserError
          //   Error: Expected identifier
          //   Parser error: Expected identifier
          if (
            output.errors[error].indexOf('ParserError') !== -1 ||
        output.errors[error].indexOf('Error: Expected identifier') !== -1 ||
        output.errors[error].indexOf('Parser error: Expected identifier') !== -1 ||
        output.errors[error].indexOf(': Expected identifier') !== -1 // 0.4.12
          ) {
            st.ok(true);
          }
        }
        st.end();
      });

      t.test('multiple files can be compiled (using lowlevel API)', function (st) {
        // <0.1.6 doesn't have this
        if (typeof solc.lowlevel.compileMulti !== 'function') {
          st.skip('Low-level compileMulti interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const input = {
          'a.sol': 'contract A { function f() public returns (uint) { return 7; } }',
          'b.sol': 'import "a.sol"; contract B is A { function g() public { f(); } }'
        };
        const output = JSON.parse(solc.lowlevel.compileMulti(JSON.stringify({ sources: input })));
        const B = getBytecode(output, 'b.sol', 'B');
        st.ok(typeof B === 'string');
        st.ok(B.length > 0);
        const A = getBytecode(output, 'a.sol', 'A');
        st.ok(typeof A === 'string');
        st.ok(A.length > 0);
        st.end();
      });

      t.test('lazy-loading callback works (using lowlevel API)', function (st) {
        // <0.2.1 doesn't have this
        if (typeof solc.lowlevel.compileCallback !== 'function') {
          st.skip('Low-level compileCallback interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const input = {
          'b.sol': 'import "a.sol"; contract B is A { function g() public { f(); } }'
        };
        function findImports (path) {
          if (path === 'a.sol') {
            return { contents: 'contract A { function f() public returns (uint) { return 7; } }' };
          } else {
            return { error: 'File not found' };
          }
        }
        const output = JSON.parse(solc.lowlevel.compileCallback(JSON.stringify({ sources: input }), 0, { import: findImports }));
        const B = getBytecode(output, 'b.sol', 'B');
        st.ok(typeof B === 'string');
        st.ok(B.length > 0);
        const A = getBytecode(output, 'a.sol', 'A');
        st.ok(typeof A === 'string');
        st.ok(A.length > 0);
        st.end();
      });

      t.test('lazy-loading callback works (with file not found) (using lowlevel API)', function (st) {
        // <0.2.1 doesn't have this
        if (typeof solc.lowlevel.compileCallback !== 'function') {
          st.skip('Low-level compileCallback interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const input = {
          'b.sol': 'import "a.sol"; contract B { function g() public { f(); } }'
        };
        function findImports (path) {
          return { error: 'File not found' };
        }
        const output = JSON.parse(solc.lowlevel.compileCallback(JSON.stringify({ sources: input }), 0, { import: findImports }));
        st.plan(3);
        st.ok('errors' in output);
        // Check if the ParserError exists, but allow others too
        st.ok(output.errors.length >= 1);
        for (const error in output.errors) {
          // Error should be something like:
          //   cont.sol:1:1: ParserError: Source "lib.sol" not found: File not found
          //   cont.sol:1:1: Error: Source "lib.sol" not found: File not found
          if (output.errors[error].indexOf('Error') !== -1 && output.errors[error].indexOf('File not found') !== -1) {
            st.ok(true);
          } else if (output.errors[error].indexOf('not found: File not found') !== -1) {
            // 0.4.12 had its own weird way:
            //   b.sol:1:1: : Source "a.sol" not found: File not found
            st.ok(true);
          }
        }
        st.end();
      });

      t.test('lazy-loading callback works (with exception) (using lowlevel API)', function (st) {
        // <0.2.1 doesn't have this
        if (typeof solc.lowlevel.compileCallback !== 'function') {
          st.skip('Low-level compileCallback interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const input = {
          'b.sol': 'import "a.sol"; contract B { function g() public { f(); } }'
        };
        function findImports (path) {
          throw new Error('Could not implement this interface properly...');
        }
        st.throws(function () {
          solc.lowlevel.compileCallback(JSON.stringify({ sources: input }), 0, { import: findImports });
        }, /^Error: Could not implement this interface properly.../);
        st.end();
      });

      t.test('lazy-loading callback fails properly (with invalid callback) (using lowlevel API)', function (st) {
        // <0.2.1 doesn't have this
        if (typeof solc.lowlevel.compileCallback !== 'function') {
          st.skip('Low-level compileCallback interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const input = {
          'cont.sol': 'import "lib.sol"; contract x { function g() public { L.f(); } }'
        };
        st.throws(function () {
          solc.lowlevel.compileCallback(JSON.stringify({ sources: input }), 0, 'this isn\'t a callback');
        }, /Invalid callback object specified./);
        st.end();
      });

      t.test('file import without lazy-loading callback fails properly (using lowlevel API)', function (st) {
        // <0.2.1 doesn't have this
        if (typeof solc.lowlevel.compileCallback !== 'function') {
          st.skip('Low-level compileCallback interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const input = {
          'b.sol': 'import "a.sol"; contract B is A { function g() public { f(); } }'
        };
        const output = JSON.parse(solc.lowlevel.compileCallback(JSON.stringify({ sources: input })));
        st.plan(3);
        st.ok('errors' in output);
        // Check if the ParserError exists, but allow others too
        st.ok(output.errors.length >= 1);
        for (const error in output.errors) {
          // Error should be something like:
          //   cont.sol:1:1: ParserError: Source "lib.sol" not found: File import callback not supported
          //   cont.sol:1:1: Error: Source "lib.sol" not found: File import callback not supported
          if (output.errors[error].indexOf('Error') !== -1 && output.errors[error].indexOf('File import callback not supported') !== -1) {
            st.ok(true);
          } else if (output.errors[error].indexOf('not found: File import callback not supported') !== -1) {
            // 0.4.12 had its own weird way:
            //   b.sol:1:1: : Source "a.sol" not found: File import callback not supported
            st.ok(true);
          }
        }
        st.end();
      });

      t.test('compiling standard JSON (using lowlevel API)', function (st) {
        if (typeof solc.lowlevel.compileStandard !== 'function') {
          st.skip('Low-level compileStandard interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const input = {
          language: 'Solidity',
          settings: {
            outputSelection: {
              '*': {
                '*': ['evm.bytecode']
              }
            }
          },
          sources: {
            'a.sol': {
              content: 'contract A { function f() public returns (uint) { return 7; } }'
            },
            'b.sol': {
              content: 'import "a.sol"; contract B is A { function g() public { f(); } }'
            }
          }
        };

        function bytecodeExists (output, fileName, contractName) {
          try {
            return output.contracts[fileName][contractName].evm.bytecode.object.length > 0;
          } catch (e) {
            return false;
          }
        }

        const output = JSON.parse(solc.lowlevel.compileStandard(JSON.stringify(input)));
        st.ok(bytecodeExists(output, 'a.sol', 'A'));
        st.ok(bytecodeExists(output, 'b.sol', 'B'));
        st.end();
      });

      t.test('invalid source code fails properly with standard JSON (using lowlevel API)', function (st) {
        // TODO: try finding an example which doesn't crash it?
        if (semver.eq(solc.semver(), '0.4.11')) {
          st.skip('Skipping on broken compiler version');
          st.end();
          return;
        }

        if (typeof solc.lowlevel.compileStandard !== 'function') {
          st.skip('Low-level compileStandard interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const input = {
          language: 'Solidity',
          settings: {
            outputSelection: {
              '*': {
                '*': ['evm.bytecode']
              }
            }
          },
          sources: {
            'x.sol': {
              content: 'contract x { this is an invalid contract }'
            }
          }
        };
        const output = JSON.parse(solc.lowlevel.compileStandard(JSON.stringify(input)));
        st.plan(3);
        st.ok('errors' in output);
        st.ok(output.errors.length >= 1);
        // Check if the ParserError exists, but allow others too
        for (const error in output.errors) {
          if (output.errors[error].type === 'ParserError') {
            st.ok(true);
          }
        }
        st.end();
      });

      t.test('compiling standard JSON (with callback) (using lowlevel API)', function (st) {
        if (typeof solc.lowlevel.compileStandard !== 'function') {
          st.skip('Low-level compileStandard interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const input = {
          language: 'Solidity',
          settings: {
            outputSelection: {
              '*': {
                '*': ['evm.bytecode']
              }
            }
          },
          sources: {
            'b.sol': {
              content: 'import "a.sol"; contract B is A { function g() public { f(); } }'
            }
          }
        };

        function findImports (path) {
          if (path === 'a.sol') {
            return { contents: 'contract A { function f() public returns (uint) { return 7; } }' };
          } else {
            return { error: 'File not found' };
          }
        }

        function bytecodeExists (output, fileName, contractName) {
          try {
            return output.contracts[fileName][contractName].evm.bytecode.object.length > 0;
          } catch (e) {
            return false;
          }
        }

        const output = JSON.parse(solc.lowlevel.compileStandard(JSON.stringify(input), { import: findImports }));
        st.ok(bytecodeExists(output, 'a.sol', 'A'));
        st.ok(bytecodeExists(output, 'b.sol', 'B'));
        st.end();
      });

      t.test('compiling standard JSON (single file)', function (st) {
        const input = {
          language: 'Solidity',
          settings: {
            outputSelection: {
              '*': {
                '*': ['evm.bytecode', 'evm.gasEstimates']
              }
            }
          },
          sources: {
            'c.sol': {
              content: 'contract C { function g() public { } function h() internal {} }'
            }
          }
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        st.ok(expectNoError(output));
        const C = getBytecodeStandard(output, 'c.sol', 'C');
        st.ok(typeof C === 'string');
        st.ok(C.length > 0);
        const CGas = getGasEstimate(output, 'c.sol', 'C');
        st.ok(typeof CGas === 'object');
        st.ok(typeof CGas.creation === 'object');
        st.ok(typeof CGas.creation.codeDepositCost === 'string');
        st.ok(typeof CGas.external === 'object');
        st.ok(typeof CGas.external['g()'] === 'string');
        st.ok(typeof CGas.internal === 'object');
        st.ok(typeof CGas.internal['h()'] === 'string');
        st.end();
      });

      t.test('compiling standard JSON (multiple files)', function (st) {
        // <0.1.6 doesn't have this
        if (!solc.features.multipleInputs) {
          st.skip('Not supported by solc');
          st.end();
          return;
        }

        const input = {
          language: 'Solidity',
          settings: {
            outputSelection: {
              '*': {
                '*': ['evm.bytecode', 'evm.gasEstimates']
              }
            }
          },
          sources: {
            'a.sol': {
              content: 'contract A { function f() public returns (uint) { return 7; } }'
            },
            'b.sol': {
              content: 'import "a.sol"; contract B is A { function g() public { f(); } function h() internal {} }'
            }
          }
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        st.ok(expectNoError(output));
        const B = getBytecodeStandard(output, 'b.sol', 'B');
        st.ok(typeof B === 'string');
        st.ok(B.length > 0);
        st.ok(Object.keys(linker.findLinkReferences(B)).length === 0);
        const BGas = getGasEstimate(output, 'b.sol', 'B');
        st.ok(typeof BGas === 'object');
        st.ok(typeof BGas.creation === 'object');
        st.ok(typeof BGas.creation.codeDepositCost === 'string');
        st.ok(typeof BGas.external === 'object');
        st.ok(typeof BGas.external['g()'] === 'string');
        st.ok(typeof BGas.internal === 'object');
        st.ok(typeof BGas.internal['h()'] === 'string');
        const A = getBytecodeStandard(output, 'a.sol', 'A');
        st.ok(typeof A === 'string');
        st.ok(A.length > 0);
        st.end();
      });

      t.test('compiling standard JSON (abstract contract)', function (st) {
        // <0.1.6 doesn't have this
        if (!solc.features.multipleInputs) {
          st.skip('Not supported by solc');
          st.end();
          return;
        }

        const isVersion6 = semver.gt(solc.semver(), '0.5.99');
        let source;
        if (isVersion6) {
          source = 'abstract contract C { function f() public virtual; }';
        } else {
          source = 'contract C { function f() public; }';
        }

        const input = {
          language: 'Solidity',
          settings: {
            outputSelection: {
              '*': {
                '*': ['evm.bytecode', 'evm.gasEstimates']
              }
            }
          },
          sources: {
            'c.sol': {
              content: source
            }
          }
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        st.ok(expectNoError(output));
        const C = getBytecodeStandard(output, 'c.sol', 'C');
        st.ok(typeof C === 'string');
        st.ok(C.length === 0);
        st.end();
      });

      t.test('compiling standard JSON (with imports)', function (st) {
        // <0.2.1 doesn't have this
        if (!solc.features.importCallback) {
          st.skip('Not supported by solc');
          st.end();
          return;
        }

        const input = {
          language: 'Solidity',
          settings: {
            outputSelection: {
              '*': {
                '*': ['evm.bytecode']
              }
            }
          },
          sources: {
            'b.sol': {
              content: 'import "a.sol"; contract B is A { function g() public { f(); } }'
            }
          }
        };

        function findImports (path) {
          if (path === 'a.sol') {
            return { contents: 'contract A { function f() public returns (uint) { return 7; } }' };
          } else {
            return { error: 'File not found' };
          }
        }

        const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
        st.ok(expectNoError(output));
        const A = getBytecodeStandard(output, 'a.sol', 'A');
        st.ok(typeof A === 'string');
        st.ok(A.length > 0);
        const B = getBytecodeStandard(output, 'b.sol', 'B');
        st.ok(typeof B === 'string');
        st.ok(B.length > 0);
        st.ok(Object.keys(linker.findLinkReferences(B)).length === 0);
        st.end();
      });

      t.test('compiling standard JSON (using libraries)', function (st) {
        // 0.4.0 has a bug with libraries
        if (semver.eq(solc.semver(), '0.4.0')) {
          st.skip('Skipping on broken compiler version');
          st.end();
          return;
        }

        // <0.1.6 doesn't have this
        if (!solc.features.multipleInputs) {
          st.skip('Not supported by solc');
          st.end();
          return;
        }

        const input = {
          language: 'Solidity',
          settings: {
            libraries: {
              'lib.sol': {
                L: '0x4200000000000000000000000000000000000001'
              }
            },
            outputSelection: {
              '*': {
                '*': ['evm.bytecode']
              }
            }
          },
          sources: {
            'lib.sol': {
              content: 'library L { function f() public returns (uint) { return 7; } }'
            },
            'a.sol': {
              content: 'import "lib.sol"; contract A { function g() public { L.f(); } }'
            }
          }
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        st.ok(expectNoError(output));
        const A = getBytecodeStandard(output, 'a.sol', 'A');
        st.ok(typeof A === 'string');
        st.ok(A.length > 0);
        st.ok(Object.keys(linker.findLinkReferences(A)).length === 0);
        const L = getBytecodeStandard(output, 'lib.sol', 'L');
        st.ok(typeof L === 'string');
        st.ok(L.length > 0);
        st.end();
      });

      t.test('compiling standard JSON (with warning >=0.4.0)', function (st) {
        // In 0.4.0 "pragma solidity" was added. Not including it is a warning.
        if (semver.lt(solc.semver(), '0.4.0')) {
          st.skip('Not supported by solc');
          st.end();
          return;
        }

        const input = {
          language: 'Solidity',
          settings: {
            outputSelection: {
              '*': {
                '*': ['evm.bytecode']
              }
            }
          },
          sources: {
            'c.sol': {
              content: 'contract C { function f() public { } }'
            }
          }
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        st.ok(expectError(output, 'Warning', 'Source file does not specify required compiler version!'));
        st.end();
      });

      t.test('compiling standard JSON (using libraries) (using lowlevel API)', function (st) {
        // 0.4.0 has a bug with libraries
        if (semver.eq(solc.semver(), '0.4.0')) {
          st.skip('Skipping on broken compiler version');
          st.end();
          return;
        }

        if (typeof solc.lowlevel.compileStandard !== 'function') {
          st.skip('Low-level compileStandard interface not implemented by this compiler version.');
          st.end();
          return;
        }

        const input = {
          language: 'Solidity',
          settings: {
            libraries: {
              'lib.sol': {
                L: '0x4200000000000000000000000000000000000001'
              }
            },
            outputSelection: {
              '*': {
                '*': ['evm.bytecode']
              }
            }
          },
          sources: {
            'lib.sol': {
              content: 'library L { function f() public returns (uint) { return 7; } }'
            },
            'a.sol': {
              content: 'import "lib.sol"; contract A { function g() public { L.f(); } }'
            }
          }
        };

        const output = JSON.parse(solc.lowlevel.compileStandard(JSON.stringify(input)));
        st.ok(expectNoError(output));
        const A = getBytecodeStandard(output, 'a.sol', 'A');
        st.ok(typeof A === 'string');
        st.ok(A.length > 0);
        st.ok(Object.keys(linker.findLinkReferences(A)).length === 0);
        const L = getBytecodeStandard(output, 'lib.sol', 'L');
        st.ok(typeof L === 'string');
        st.ok(L.length > 0);
        st.end();
      });

      t.test('compiling standard JSON (invalid JSON)', function (st) {
        const output = JSON.parse(solc.compile('{invalid'));
        // TODO: change wrapper to output matching error
        st.ok(expectError(output, 'JSONError', 'Line 1, Column 2\n  Missing \'}\' or object member name') || expectError(output, 'JSONError', 'Invalid JSON supplied:'));
        st.end();
      });

      t.test('compiling standard JSON (invalid language)', function (st) {
        const output = JSON.parse(solc.compile('{"language":"InvalidSolidity","sources":{"cont.sol":{"content":""}}}'));
        st.ok(expectError(output, 'JSONError', 'supported as a language.') && expectError(output, 'JSONError', '"Solidity"'));
        st.end();
      });

      t.test('compiling standard JSON (no sources)', function (st) {
        const output = JSON.parse(solc.compile('{"language":"Solidity"}'));
        st.ok(expectError(output, 'JSONError', 'No input sources specified.'));
        st.end();
      });

      t.test('compiling standard JSON (multiple sources on old compiler)', function (st) {
        const output = JSON.parse(solc.compile('{"language":"Solidity","sources":{"cont.sol":{"content":"import \\"lib.sol\\";"},"lib.sol":{"content":""}}}'));
        if (solc.features.multipleInputs) {
          st.ok(expectNoError(output));
        } else {
          st.ok(expectError(output, 'JSONError', 'Multiple sources provided, but compiler only supports single input.') || expectError(output, 'Parser error', 'Parser error: Source not found.'));
        }
        st.end();
      });

      t.test('compiling standard JSON (file names containing symbols)', function (st) {
        const input = {
          language: 'Solidity',
          settings: {
            outputSelection: {
              '*': {
                '*': ['evm.bytecode']
              }
            }
          },
          sources: {
            '!@#$%^&*()_+-=[]{}\\|"\';:~`<>,.?/': {
              content: 'contract C {}'
            }
          }
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        st.ok(expectNoError(output));
        const C = getBytecodeStandard(output, '!@#$%^&*()_+-=[]{}\\|"\';:~`<>,.?/', 'C');
        st.ok(typeof C === 'string');
        st.ok(C.length > 0);
        st.end();
      });

      t.test('compiling standard JSON (file names containing multiple semicolons)', function (st) {
        const input = {
          language: 'Solidity',
          settings: {
            outputSelection: {
              '*': {
                '*': ['evm.bytecode']
              }
            }
          },
          sources: {
            'a:b:c:d:e:f:G.sol': {
              content: 'contract G {}'
            }
          }
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        st.ok(expectNoError(output));
        const G = getBytecodeStandard(output, 'a:b:c:d:e:f:G.sol', 'G');
        st.ok(typeof G === 'string');
        st.ok(G.length > 0);
        st.end();
      });
    });
  });

  // Only run on the latest version.
  if (versionText === 'latest' && !noRemoteVersions) {
    tape('Loading Legacy Versions', function (t) {
      t.test('loading remote version - development snapshot', function (st) {
        // getting the development snapshot
        st.plan(2);
        solc.loadRemoteVersion('latest', function (err, solcSnapshot) {
          if (err) {
            st.plan(1);
            st.skip('Network error - skipping remote loading test');
            st.end();
            return;
          }
          const input = {
            language: 'Solidity',
            settings: {
              outputSelection: {
                '*': {
                  '*': ['evm.bytecode']
                }
              }
            },
            sources: {
              'cont.sol': {
                content: 'contract x { function g() public {} }'
              }
            }
          };
          const output = JSON.parse(solcSnapshot.compile(JSON.stringify(input)));
          const x = getBytecodeStandard(output, 'cont.sol', 'x');
          st.ok(typeof x === 'string');
          st.ok(x.length > 0);
        });
      });
    });
  }
}

runTests(solc, 'latest');

if (!noRemoteVersions) {
  // New compiler interface features 0.1.6, 0.2.1, 0.4.11, 0.5.0, etc.
  // 0.4.0 added pragmas (used in tests above)
  const versions = [
    'v0.1.1+commit.6ff4cd6',
    'v0.1.6+commit.d41f8b7',
    'v0.2.0+commit.4dc2445',
    'v0.2.1+commit.91a6b35',
    'v0.3.6+commit.3fc68da',
    'v0.4.0+commit.acd334c9',
    'v0.4.9+commit.364da425',
    'v0.4.10+commit.f0d539ae',
    'v0.4.11+commit.68ef5810',
    'v0.4.12+commit.194ff033',
    'v0.4.19+commit.c4cbbb05',
    'v0.4.20+commit.3155dd80',
    'v0.4.26+commit.4563c3fc'
  ];
  for (let version in versions) {
    version = versions[version];
    execSync(`curl -L -o /tmp/${version}.js https://solc-bin.ethereum.org/bin/soljson-${version}.js`);
    const newSolc = require('../wrapper.js')(require(`/tmp/${version}.js`));
    runTests(newSolc, version);
  }
}
