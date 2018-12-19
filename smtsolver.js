var commandExistsSync = require('command-exists').sync;
var execSync = require('child_process').execSync;
var fs = require('fs-extra');
var tmp = require('tmp');

var potentialSolvers = [
  {
    name: 'z3',
    params: ''
  },
  {
    name: 'cvc4',
    params: '--lang=smt2'
  }
];
var solvers = potentialSolvers.filter(solver => commandExistsSync(solver.name));

function solve (query) {
  if (solvers.length === 0) {
    throw new Error('No SMT solver available. Assertion checking will not be performed.');
  }

  var tmpFile = tmp.fileSync();
  fs.writeFileSync(tmpFile.name, query);
  // TODO For now only the first SMT solver found is used.
  // At some point a computation similar to the one done in
  // SMTPortfolio::check should be performed, where the results
  // given by different solvers are compared and an error is
  // reported if solvers disagree (i.e. SAT vs UNSAT).
  var solverOutput = execSync(solvers[0].name + ' ' + solvers[0].params + ' ' + tmpFile.name);
  // Trigger early manual cleanup
  tmpFile.removeCallback();
  return solverOutput.toString();
}

module.exports = {
  smtSolver: solve
};
