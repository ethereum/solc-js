const assert = require('assert');
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const solc = require('./index.js');
const smtchecker = require('./smtchecker.js');
const smtsolver = require('./smtsolver.js');

function collectErrors (solOutput) {
  assert(solOutput !== undefined);
  let errors = [];
  for (let i in solOutput.errors) {
    const error = solOutput.errors[i];
    if (error.message.includes('CHC: ')) {
      errors.push(error);
    }
  }
  return errors;
}

function parseErrorFromCompiler (error) {
  assert(error.message.includes('CHC: '));
  // The source location represents the property.
  const loc = error.sourceLocation.start + ':' + error.sourceLocation.end;
  const message = error.message;
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
  return { loc: loc, res: res };
}

function buildErrorsDict (errors) {
	let d = {};
	for (let i in errors) {
		const e = parseErrorFromCompiler(errors[i]);
		d[e.loc] = e.res;
	}
  return d;
}

function runSolver (solver, sources) {
  console.log("\n\nRunning " + sources.length + " tests with solver " + solver.name);
  // solverRes is an array of test results,
  // where a test result is represented by a dictionary
  // errorCode => solveStatus.
  let solverRes = [];
  for (let i in sources) {
    const source = fs.readFileSync(sources[i], 'utf8');
    console.log('Running test ' + sources[i]);

    const solidity = { test: { content: source } };
    // Spacer prefers div and mod to be replaced by multiplication using slack vars.
    const divModWithSlacks = solver.command === 'z3';
    const settings = { modelChecker: {
      engine: 'chc',
      solvers: ['cvc4']
      //divModWithSlacks: divModWithSlacks
    }};
    const output = JSON.parse(solc.compile(
      JSON.stringify({
        language: 'Solidity',
        sources: solidity,
        settings: settings
      }),
      { smtSolver: smtchecker.smtCallback(smtsolver.smtSolver, solver) }
    ));
    console.log(output.errors);

    solverRes.push(buildErrorsDict(collectErrors(output)));
  }
  assert(solverRes.length === sources.length);
  return solverRes;
}

function test () {
  // `pragma experimental SMTChecker;` was deprecated in 0.8.4
  assert(semver.gt(solc.semver(), '0.8.3'));

  if (smtsolver.availableSolvers.length === 0) {
    console.log('No SMT solver available.');
    return;
  }

  const testdir = path.resolve(__dirname, 'test/smtCheckerTests/');
  if (!fs.existsSync(testdir)) {
    console.log('SMTChecker tests not present.');
    return;
  }

  // BFS to get all test files
  let sources = [];
  let dirs = [testdir];
  while (dirs.length > 0) {
    let dir = dirs.shift();
    let files = fs.readdirSync(dir);
    for (let i in files) {
      const file = path.join(dir, files[i]);
      if (fs.statSync(file).isDirectory()) {
        dirs.push(file);
      } else {
        sources.push(file);
      }
    }
  }

  const res = smtsolver.availableSolvers.map(s => runSolver(s, sources));

  const isSafe = (d, r) => !(r in d);
  const isUnsafe = (d, r) => (r in d) && d[r] == 'solved';

  let report = {};

  for (let i in sources) {
    // Collect results for source i
    const sRes = res.map(s => s[i]);
    // Collect all locations reported by some solver
    const allKeys = sRes.reduce((acc, v) => { return {...acc, ...v} });

    let sourceSolvedProperties = [];
    for (let i in sRes) {
      sourceSolvedProperties.push(0);
    }

    for (let loc in allKeys) {
      // If one solver does not have the location, the property is safe.
      const safe = sRes.reduce((acc, v) => acc || isSafe(v, loc), false);
      // If one solver reports the location as solved, the property is unsafe.
      const unsafe = !safe && sRes.reduce((acc, v) => acc || isUnsafe(v, loc), false);

      if (safe && unsafe) {
        console.log('Solver discrepancy for test ' + sources[i]);
      }

      const score = sRes.map(s =>
        (safe && isSafe(s, loc)) || (unsafe && isUnsafe(s, loc))
      );

      assert(score.length === sourceSolvedProperties.length);
      for (let j in score) {
        if (score[j]) {
          sourceSolvedProperties[j] += 1;
        }
      }
    }

    const maxSolved = Math.max(...sourceSolvedProperties);
    const winner = sourceSolvedProperties.map(p => { return { solved: p, max: maxSolved } });

    report[sources[i]] = winner;
  }

  let totalWon = [];
  for (let i in res) {
    totalWon.push(0);
  }
  for (let s in report) {
    for (let i in res) {
      if (report[s][i].solved == report[s][i].max) {
        totalWon[i] += 1;
      }
    }
  }

  console.log('\nResults:');
  for (let i in smtsolver.availableSolvers) {
    console.log('Solver ' + smtsolver.availableSolvers[i].name + ' won (or tied) ' + totalWon[i] + ' tests.');
  }

  console.log('\n\nFull report:');
  const firstLine = smtsolver.availableSolvers.reduce((acc, v) => acc + '\t' + v.name, '' );
  console.log(firstLine);
  for (let s in report) {
    line = s;
    for (let i in res) {
      line += '\t' + report[s][i].solved;
      if (report[s][i].solved == report[s][i].max) {
        line += ' (winner)';
      }
    }
    console.log(line);
  }
}

test();
