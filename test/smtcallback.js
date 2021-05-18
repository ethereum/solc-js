const assert = require('assert');
const tape = require('tape');
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const solc = require('../index.js');
const smtchecker = require('../smtchecker.js');
const smtsolver = require('../smtsolver.js');

let preamble = '';

function collectErrors (solOutput) {
  if (solOutput === undefined) {
    return [];
  }

  let errors = [];
  for (let i in solOutput.errors) {
    let error = solOutput.errors[i];
    if (!error.message.includes('CHC: ')) {
      continue;
    }
   let msg = '// ' + error.type + ' ' + error.errorCode + ': (' + error.sourceLocation.start + '-' + error.sourceLocation.end + '): ' + error.message
    errors.push(msg);
  }
  return errors;
}

function parseError (message) {
  let re = new RegExp('// Warning (\\w+):');
  let m = message.match(re);
  assert(m !== undefined);
  assert(m.length >= 2);
  errorCode = m[1];

  let res;
  if (message.includes('Error trying to invoke')) {
    res = 'error';
  } else if (message.includes('might happen')) {
    res = 'notsolved';
  } else if (message.includes('happens here')) {
    res = 'solved';
  } else {
    assert(false);
  }

  return { code: errorCode, res: res };
}

function expectErrors (expectations, errors, ignoreCex) {
	let d = {}
	for (let i in expectations) {
		let e = parseError(expectations[i])
		d[e.code] = { res1: e.res }
	}
	for (let i in errors) {
		let e = parseError(errors[i])
		if (e.code in d) {
			d[e.code].res2 = e.res
		} else {
			d[e.code] = { res2: e.res }
		}
	}

	let w1 = 0;
	let w2 = 0;
	for (let code in d) {
		let o = d[code];
		if (o.res1 == o.res2) {
			continue;
		} else if ((o.res1 === undefined && o.res2 === 'solved') ||	(o.res2 === undefined && o.res1 === 'solved')) {
			assert(false);
		} else if (o.res1 === undefined || o.res1 === 'solved') {
			w1 += 1;
		} else if (o.res2 === undefined || o.res2 === 'solved') {
			w2 += 1;
		}
	}

	return { w1: w1, w2: w2 };

//  if (errors.length !== expectations.length) {
  //  return false;
//  }

  //for (let i in errors) {
   // if (errors[i].includes('Error trying to invoke SMT solver') || expectations[i].includes('Error trying to invoke SMT solver')) {
    //  continue;
   // }
    // Expectations containing counterexamples might have many '\n' in a single line.
    // These are stored escaped in the test format (as '\\n'), whereas the actual error from the compiler has '\n'.
    // Therefore we need to replace '\\n' by '\n' in the expectations.
    // Function `replace` only replaces the first occurrence, and `replaceAll` is not standard yet.
    // Replace all '\\n' by '\n' via split & join.
    //expectations[i] = expectations[i].split('\\n').join('\n');
	/*
    if (ignoreCex) {
      expectations[i] = expectations[i].split('\nCounterexample')[0];
      errors[i] = errors[i].split('\nCounterexample')[0];
    }
    // `expectations` have "// Warning ... " before the actual message,
    // whereas `errors` have only the message.
    if (!expectations[i].includes(errors[i])) {
      return false;
    }
	*/
  //}

  //return true;
}

tape('SMTCheckerCallback', function (t) {
	/*
  t.test('Interface via callback', function (st) {
    if (!semver.gt(solc.semver(), '0.5.99')) {
      st.skip('SMT callback not implemented by this compiler version.');
      st.end();
      return;
    }

    let satCallback = function (query) {
      return { contents: 'sat\n' };
    };
    let unsatCallback = function (query) {
      return { contents: 'unsat\n' };
    };
    let errorCallback = function (query) {
      return { error: 'Fake SMT solver error.' };
    };

    let pragmaSMT = '';
    let settings = {};
    // `pragma experimental SMTChecker;` was deprecated in 0.8.4
    if (!semver.gt(solc.semver(), '0.8.3')) {
      pragmaSMT = 'pragma experimental SMTChecker;\n';
    } else {
      settings = { modelChecker: { engine: 'chc' } };
    }

    let input = { 'a': { content: preamble + pragmaSMT + 'contract C { function f(uint x) public pure { assert(x > 0); } }' } };
    let inputJSON = JSON.stringify({
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
      let test = tests[i];
      let output = JSON.parse(solc.compile(
        inputJSON,
        { smtSolver: test.cb }
      ));
      let errors = collectErrors(output);
      st.ok(expectErrors(errors, test.expectations));
    }
    st.end();
  });
*/
  t.test('Solidity smtCheckerTests', function (st) {
    let testdir = path.resolve(__dirname, 'smtCheckerTests/');
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

    let sources = [];

    // BFS to get all test files
    let dirs = [testdir];
    let i;
    while (dirs.length > 0) {
      let dir = dirs.shift();
      let files = fs.readdirSync(dir);
      for (i in files) {
        let file = path.join(dir, files[i]);
        if (fs.statSync(file).isDirectory()) {
          dirs.push(file);
        } else {
          sources.push(file);
        }
      }
    }

    console.log("Collecting " + sources.length + " tests:");
    // Read tests and collect expectations
    let tests = [];
    for (i in sources) {
      let source = fs.readFileSync(sources[i], 'utf8');

      let engine;
      let option = '// SMTEngine: ';
      if (source.includes(option)) {
        let idx = source.indexOf(option);
        if (source.indexOf(option, idx + 1) !== -1) {
          st.skip('SMTEngine option given multiple times.');
          continue;
        }
        let re = new RegExp(option + '(\\w+)');
        let m = source.match(re);
        assert(m !== undefined);
        assert(m.length >= 2);
        engine = m[1];
        if (engine === 'bmc') {
          st.skip('SMTEngine requires BMC.');
          continue;
        }
      }
      engine = 'chc';

      let expected1 = [];
      let expected2 = [];
      let delimiter = '// ----';
      if (source.includes(delimiter)) {
        expected1 = source.substring(source.indexOf('// ----') + 8, source.length).split('\n');
        for (let j = 0; j < expected1.length; ++j) {
          if (expected1[j].includes('CHC:'))
	          expected2.push(expected1[j]);
        }
      }
      st.comment('Collecting ' + sources[i] + '...');
      tests[sources[i]] = {
        expectations: expected2,
        solidity: { test: { content: preamble + source } },
        ignoreCex: source.includes('// SMTIgnoreCex: yes'),
        engine: engine
      };
    }

	let wTests1 = 0;
	let wTests2 = 0;
    let wTies = 0;
    let wBoth = 0;
	let wProperties1 = 0;
	let wProperties2 = 0;
    // Run all tests
    for (i in tests) {
      console.log('Running test ' + i + '\n');
      let test = tests[i];

      // Z3's nondeterminism sometimes causes a test to timeout in one context but not in the other,
      // so if we see timeout we skip a potentially misleading run.
      //let findError = (errorMsg) => { return errorMsg.includes('Error trying to invoke SMT solver'); };
      //if (test.expectations.find(findError) !== undefined) {
      //  st.skip('Test contains timeout which may have been caused by nondeterminism.');
      //  continue;
      //}

      let settings = {};
      // `pragma experimental SMTChecker;` was deprecated in 0.8.4
      if (semver.gt(solc.semver(), '0.8.3')) {
        let engine = test.engine !== undefined ? test.engine : 'chc';
        settings = { modelChecker: {
          engine: engine,
		  divModWithSlacks: false
          //targets: ['assert']
        }};
      }
      let output = JSON.parse(solc.compile(
        JSON.stringify({
          language: 'Solidity',
          sources: test.solidity,
          settings: settings
        }),
        { smtSolver: smtchecker.smtCallback(smtsolver.smtSolver) }
      ));
      st.ok(output);

      // Collect obtained error messages
      test.errors = collectErrors(output);

      // These are errors in the SMTLib2Interface encoding.
      //if (test.errors.length > 0 && test.errors[test.errors.length - 1].includes('BMC analysis was not possible')) {
      //  continue;
      //}

      // These are due to CHC not being supported via SMTLib2Interface yet.
      //if (test.expectations.length !== test.errors.length) {
      //  continue;
      //}

      //if (test.errors.find(findError) !== undefined) {
      //  st.skip('Test contains timeout which may have been caused by nondeterminism.');
      //  continue;
      //}

      // Compare expected vs obtained errors
      let score = expectErrors(test.expectations, test.errors, test.ignoreCex);
	  let w1 = score.w1;
	  let w2 = score.w2;
		wProperties1 += score.w1
		wProperties2 += score.w2
		if (w1 > 0 && w2 == 0) {
			wTests1 += 1;
		} else if (w2 > 0 && w1 == 0) {
			wTests2 += 1;
		} else if (w1 == 0 && w2 == 0) {
			wTies += 1;
		} else if (w1 > 0 && w2 > 0) {
			wBot += 1;
		} else {
			assert(false);
		}
		/*
      if (!r) {
        console.log(test.expectations);
        console.log(test.errors);
        console.log('\n\n');
      }
      st.ok(r);
	  */
    }
	console.log('Solver 1 won in ' + wProperties1 + ' properties.')
	console.log('Solver 2 won in ' + wProperties2 + ' properties.')
	console.log('Solver 1 won in ' + wTests1+ ' tests.')
	console.log('Solver 2 won in ' + wTests2+ ' tests.')
	console.log('Solvers were equal in ' + wTies+ ' tests.')
	console.log('Solvers both won and lost in ' + wBoth+ ' tests.')
    st.end();
  });
});
