const assert = require('assert');
const tape = require('tape');
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const solc = require('../index.js');
const smtchecker = require('../smtchecker.js');
const smtsolver = require('../smtsolver.js');

function isSMTCheckerErrorMessage (message) {
  return message.includes('BMC: ') || message.includes('CHC: ');
}

function isSMTCheckerError (error) {
  return isSMTCheckerErrorMessage(error.message);
}

function collectErrors (solOutput) {
  assert(solOutput !== undefined);
  return solOutput.errors.filter(error => isSMTCheckerError(error));
}

function stringToSolverStatus (message) {
  if (message.includes('Error trying to invoke')) {
    return 'error';
  } else if (message.includes('might happen')) {
    return 'notsolved';
  } else {
    return 'solved';
  }
}

function errorFromExpectation (line) {
  let re = new RegExp('// Warning (\\w+): \\((\\d+)-(\\d+)\\): ');
  let m = line.match(re);
  assert(m !== undefined);
  // m = [match, error code, location start, location end, ...]
  assert(m.length >= 4);
  let message = line.split(':');
  // message = [warning, location, bmc/chc, message]
  assert(message.length >= 4);
  // message = 'BMC/CHC: message'
  message = message[2].replace(' ', '') + ':' + message[3];
  return { errorCode: m[1], sourceLocation: { start: m[2], end: m[3] }, message: message };
}

function errorData (error) {
  assert(isSMTCheckerError(error));
  // The source location represents the property.
  const loc = error.sourceLocation.start + ':' + error.sourceLocation.end;
  const res = stringToSolverStatus(error.message);
  return { loc: loc, res: res };
}

function buildErrorsDict (errors) {
  let d = {};
  for (let i in errors) {
    const e = errorData(errors[i]);
    const engine = errors[i].message.split(':')[0];
    d[engine + '-' + e.loc] = e.res;
  }
  return d;
}

function compareResults (results) {
  console.log(results);
  assert(results.length >= 2);
  const allProperties = results.reduce((acc, v) => { return {...acc, ...v}; });
  const isSafe = (d, r) => !(r in d);
  const isUnsafe = (d, r) => (r in d) && d[r] === 'solved';

  let solvedProperties = new Array(results.length).fill(0);

  for (let loc in allProperties) {
    // If one solver does not have the location, the property is safe.
    const safe = results.reduce((acc, v) => acc || isSafe(v, loc), false);
    // If one solver reports the location as solved, the property is unsafe.
    const unsafe = !safe && results.reduce((acc, v) => acc || isUnsafe(v, loc), false);

    const info = loc.split('-'); // [bmc or chc, start:end]
    // Contradiction found.
    if (safe && unsafe) {
      // But maybe one solver solved 'safe' via CHC,
      // and another solved reported a false positive 'unsafe' via BMC.
      let falsePositive = false;
      if (info[0] === 'BMC') {
        // If that's the case, at least one solver must have proved CHC safe.
        const keyCHC = 'CHC-' + info[1];
        const safeCHC = results.reduce((acc, v) => acc || isSafe(v, keyCHC), false);
        if (safeCHC) {
          falsePositive = true;
        }
      }
      if (!falsePositive) {
        return { ok: false, score: [] };
      }
    }

    // We only keep track of scores for CHC because BMC has too many
    // false positives.
    if (info[0] === 'CHC') {
      const score = results.map(s =>
        (safe && isSafe(s, loc)) || (unsafe && isUnsafe(s, loc))
      );

      assert(score.length === solvedProperties.length);
      for (let j in score) {
        if (score[j]) {
          solvedProperties[j] += 1;
        }
      }
    }
  }
  return { ok: true, score: solvedProperties };
}

function collectFiles (testdir) {
  let sources = [];
  // BFS to get all test files
  let dirs = [testdir];
  while (dirs.length > 0) {
    const dir = dirs.shift();
    const files = fs.readdirSync(dir);
    for (let i in files) {
      const file = path.join(dir, files[i]);
      if (fs.statSync(file).isDirectory()) {
        dirs.push(file);
      } else {
        sources.push(file);
      }
    }
  }
  return sources;
}

function createTests (sources, st) {
  // Read tests and collect expectations
  let tests = {};
  for (let i in sources) {
    st.comment('Collecting ' + sources[i] + '...');
    const source = fs.readFileSync(sources[i], 'utf8');

    let engine;
    const option = '// SMTEngine: ';
    if (source.includes(option)) {
      let idx = source.indexOf(option);
      if (source.indexOf(option, idx + 1) !== -1) {
        st.skip('SMTEngine option given multiple times.');
        continue;
      }
      const re = new RegExp(option + '(\\w+)');
      let m = source.match(re);
      assert(m !== undefined);
      assert(m.length >= 2);
      engine = m[1];
    }

    if (source.includes('==== Source')) {
      st.skip('Test requires soltest in source imports.');
      continue;
    }

    let expected = [];
    const delimiter = '// ----';
    if (source.includes(delimiter)) {
      expected = source.substring(source.indexOf('// ----') + 8, source.length).split('\n');
      expected = expected.filter(line => isSMTCheckerErrorMessage(line));
      expected = expected.map(line => errorFromExpectation(line));
    }
    tests[sources[i]] = {
      expectations: expected,
      solidity: { test: { content: source } },
      engine: engine
    };
  }
  return tests;
}

function collectStringErrors (solOutput) {
  assert(solOutput !== undefined);
  return solOutput.errors.filter(error => !error.message.includes('This is a pre-release')).map(error => error.message);
}

function expectStringErrors (a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; ++i) {
    if (!a[i].includes(b[i])) {
      return false;
    }
  }
  return true;
}

tape('SMTCheckerCallback', function (t) {
  t.test('Interface via callback', function (st) {
    // This test does not use a solver and is used only to test
    // the callback mechanism.

    if (!semver.gt(solc.semver(), '0.5.99')) {
      st.skip('SMT callback not implemented by this compiler version.');
      st.end();
      return;
    }

    const satCallback = function (query) {
      return { contents: 'sat\n' };
    };
    const unsatCallback = function (query) {
      return { contents: 'unsat\n' };
    };
    const errorCallback = function (query) {
      return { error: 'Fake SMT solver error.' };
    };

    let pragmaSMT = '';
    let settings = {};
    // `pragma experimental SMTChecker;` was deprecated in 0.8.4
    if (!semver.gt(solc.semver(), '0.8.3')) {
      pragmaSMT = 'pragma experimental SMTChecker;\n';
    } else {
      settings = { modelChecker: { engine: 'all' } };
    }

    const input = { 'a': { content: pragmaSMT + 'pragma solidity >=0.0;\n// SPDX-License-Identifier: GPL-3.0\ncontract C { function f(uint x) public pure { assert(x > 0); } }' } };
    const inputJSON = JSON.stringify({
      language: 'Solidity',
      sources: input,
      settings: settings
    });

    let tests;
    if (!semver.gt(solc.semver(), '0.6.8')) {
      // Up to version 0.6.8 there were no embedded solvers.
      tests = [
        { cb: satCallback, expectations: ['Assertion violation happens here'] },
        { cb: unsatCallback, expectations: [] },
        { cb: errorCallback, expectations: ['BMC analysis was not possible'] }
      ];
    } else if (!semver.gt(solc.semver(), '0.6.12')) {
      // Solidity 0.6.9 comes with z3.
      tests = [
        { cb: satCallback, expectations: ['Assertion violation happens here'] },
        { cb: unsatCallback, expectations: ['At least two SMT solvers provided conflicting answers. Results might not be sound.'] },
        { cb: errorCallback, expectations: ['Assertion violation happens here'] }
      ];
    } else {
      // Solidity 0.7.0 reports assertion violations via CHC.
      tests = [
        { cb: satCallback, expectations: ['Assertion violation happens here'] },
        { cb: unsatCallback, expectations: ['Assertion violation happens here'] },
        { cb: errorCallback, expectations: ['Assertion violation happens here'] }
      ];
    }

    for (let i in tests) {
      const test = tests[i];
      const output = JSON.parse(solc.compile(
        inputJSON,
        { smtSolver: test.cb }
      ));
      st.ok(expectStringErrors(collectStringErrors(output), test.expectations));
    }
    st.end();
  });

  t.test('Solidity smtCheckerTests', function (st) {
    // 0.7.2 added `BMC:` and `CHC:` as prefixes to the error messages.
    // This format is rewquired for this test.
    if (!semver.gt(solc.semver(), '0.7.1')) {
      st.skip('SMTChecker output format will not match.');
      st.end();
      return;
    }

    const testdir = path.resolve(__dirname, 'smtCheckerTests/');
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

    const sources = collectFiles(testdir);
    const tests = createTests(sources, st);

    // Run all tests
    for (let i in tests) {
      const test = tests[i];
      st.comment('Running ' + i + ' ...');
      let results = [];
      let solvers = ['z3'];
      // 0.8.5 introduced the `solvers` option,
      // so we can test the statica z3 inside soljson
      // and a local solver as well.
      if (semver.gt(solc.semver(), '0.8.4')) {
        solvers.push('smtlib2');
      }
      for (let s in solvers) {
        st.comment('... with solver ' + solvers[s]);
        let settings = {};
        // `pragma experimental SMTChecker;` was deprecated in 0.8.4
        if (semver.gt(solc.semver(), '0.8.3')) {
          const engine = test.engine !== undefined ? test.engine : 'all';
          settings = { modelChecker: { engine: engine } };

          // 0.8.5 introduced the `solvers` option.
          if (semver.gt(solc.semver(), '0.8.4')) {
            settings.modelChecker.solvers = [solvers[s]];
          }
        }
        const output = JSON.parse(solc.compile(
          JSON.stringify({
            language: 'Solidity',
            sources: test.solidity,
            settings: settings
          }),
          { smtSolver: smtchecker.smtCallback(smtsolver.smtSolver) }
        ));
        st.ok(output);

        results.push(buildErrorsDict(collectErrors(output)));
      }
      results.push(buildErrorsDict(test.expectations));

      const res = compareResults(results);
      if (res.ok) {
        solvers.push('C++ Spacer');
        assert(res.score.length === solvers.length);
        const max = Math.max(...res.score);
        for (let j = 0; j < solvers.length; ++j) {
          if (res.score[j] === max) {
            st.comment('Solver ' + solvers[j] + ' = best.');
          } else {
            st.comment('Solver ' + solvers[j] + ' was not the best, but also not inconsistent.');
          }
        }
      } else {
        st.comment('Solver discrepancy found.');
      }
      st.ok(res.ok);
    }

    st.end();
  });
});
