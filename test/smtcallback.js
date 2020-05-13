const tape = require('tape');
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const solc = require('../index.js');
const smtchecker = require('../smtchecker.js');
const smtsolver = require('../smtsolver.js');

var preamble = 'pragma solidity >=0.0;\n// SPDX-License-Identifier: GPL-3.0\n';
var pragmaSMT = 'pragma experimental SMTChecker;\n';

function collectErrors (solOutput) {
  if (solOutput === undefined) {
    return [];
  }

  var errors = [];
  for (var i in solOutput.errors) {
    var error = solOutput.errors[i];
    if (error.message.includes('This is a pre-release compiler version')) {
      continue;
    }
    errors.push(error.message);
  }
  return errors;
}

function expectErrors (errors, expectations) {
  if (errors.length !== expectations.length) {
    return false;
  }

  for (var i in errors) {
    if (errors[i].includes('Error trying to invoke SMT solver') || expectations[i].includes('Error trying to invoke SMT solver')) {
      continue;
    }
    if (!errors[i].includes(expectations[i])) {
      return false;
    }
  }

  return true;
}

tape('SMTCheckerCallback', function (t) {
  t.test('Interface via callback', function (st) {
    if (!semver.gt(solc.semver(), '0.5.99')) {
      st.skip('SMT callback not implemented by this compiler version.');
      st.end();
      return;
    }

    var satCallback = function (query) {
      return { contents: 'sat\n' };
    };
    var unsatCallback = function (query) {
      return { contents: 'unsat\n' };
    };
    var errorCallback = function (query) {
      return { error: 'Fake SMT solver error.' };
    };

    var input = { 'a': { content: preamble + pragmaSMT + 'contract C { function f(uint x) public pure { assert(x > 0); } }' } };
    var inputJSON = JSON.stringify({
      language: 'Solidity',
      sources: input
    });
    var tests = [
      { cb: satCallback, expectations: ['Assertion violation happens here'] },
      { cb: unsatCallback, expectations: [] },
      { cb: errorCallback, expectations: ['BMC analysis was not possible'] }
    ];
    for (var i in tests) {
      var test = tests[i];
      var output = JSON.parse(solc.compile(
        inputJSON,
        { smtSolver: test.cb }
      ));
      var errors = collectErrors(output);
      st.ok(expectErrors(errors, test.expectations));
    }
    st.end();
  });

  t.test('Solidity smtCheckerTests', function (st) {
    var testdir = path.resolve(__dirname, 'smtCheckerTests/');
    if (!fs.existsSync(testdir)) {
      st.skip('SMT checker tests not present.');
      st.end();
      return;
    }

    if (smtsolver.availableSolvers === 0) {
      st.skip('No SMT solver available.');
      st.end();
      return;
    }

    var sources = [];

    // BFS to get all test files
    var dirs = [testdir];
    var i;
    while (dirs.length > 0) {
      var dir = dirs.shift();
      var files = fs.readdirSync(dir);
      for (i in files) {
        var file = path.join(dir, files[i]);
        if (fs.statSync(file).isDirectory()) {
          dirs.push(file);
        } else {
          sources.push(file);
        }
      }
    }

    // Read tests and collect expectations
    var tests = [];
    for (i in sources) {
      st.comment('Collecting ' + sources[i] + '...');
      var source = fs.readFileSync(sources[i], 'utf8');
      var expected = [];
      var delimiter = '// ----';
      if (source.includes(delimiter)) {
        expected = source.substring(source.indexOf('// ----') + 8, source.length).split('\n');
        // Sometimes the last expectation line ends with a '\n'
        if (expected.length > 0 && expected[expected.length - 1] === '') {
          expected.pop();
        }
      }
      tests[sources[i]] = {
        expectations: expected,
        solidity: { test: { content: preamble + source } }
      };
    }

    // Run all tests
    for (i in tests) {
      var test = tests[i];
      var output = JSON.parse(solc.compile(
        JSON.stringify({
          language: 'Solidity',
          sources: test.solidity
        }),
        { smtSolver: smtchecker.smtCallback(smtsolver.smtSolver) }
      ));
      st.ok(output);

      // Collect obtained error messages
      test.errors = collectErrors(output);

      // These are errors in the SMTLib2Interface encoding.
      if (test.errors.length > 0 && test.errors[test.errors.length - 1].includes('BMC analysis was not possible')) {
        continue;
      }

      // These are due to CHC not being supported via SMTLib2Interface yet.
      if (test.expectations.length !== test.errors.length) {
        continue;
      }

      // Compare expected vs obtained errors
      st.ok(expectErrors(test.expectations, test.errors));
    }

    st.end();
  });
});
