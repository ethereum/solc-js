import { sync as commandExistsSync } from 'command-exists';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as tmp from 'tmp';

// Timeout in ms.
const timeout = 10000;

const potentialSolvers = [
  {
    name: 'z3',
    command: 'z3',
    params: '-smt2 rlimit=20000000 rewriter.pull_cheap_ite=true fp.spacer.q3.use_qgen=true fp.spacer.mbqi=false fp.spacer.ground_pobs=false'
  },
  {
    name: 'Eldarica',
    command: 'eld',
    params: '-horn -t:' + (timeout / 1000) // Eldarica takes timeout in seconds.
  },
  {
    name: 'cvc4',
    command: 'cvc4',
    params: '--lang=smt2 --tlimit=' + timeout
  }
];

const solvers = potentialSolvers.filter(solver => commandExistsSync(solver.command));

function solve (query, solver) {
  if (solver === undefined) {
    if (solvers.length === 0) {
      throw new Error('No SMT solver available. Assertion checking will not be performed.');
    } else {
      solver = solvers[0];
    }
  }

  const tmpFile = tmp.fileSync({ postfix: '.smt2' });
  fs.writeFileSync(tmpFile.name, query);
  let solverOutput;
  try {
    solverOutput = execSync(
      solver.command + ' ' + solver.params + ' ' + tmpFile.name, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 1024,
        stdio: 'pipe',
        timeout: timeout // Enforce timeout on the process, since solvers can sometimes go around it.
      }
    ).toString();
  } catch (e) {
    // execSync throws if the process times out or returns != 0.
    // The latter might happen with z3 if the query asks for a model
    // for an UNSAT formula. We can still use stdout.
    solverOutput = e.stdout.toString();
    if (
      !solverOutput.startsWith('sat') &&
      !solverOutput.startsWith('unsat') &&
      !solverOutput.startsWith('unknown') &&
      !solverOutput.startsWith('(error') && // Eldarica reports errors in an sexpr, for example: '(error "Failed to reconstruct array model")'
      !solverOutput.startsWith('error')
    ) {
      throw new Error('Failed to solve SMT query. ' + e.toString());
    }
  }
  // Trigger early manual cleanup
  tmpFile.removeCallback();
  return solverOutput;
}

export default {
  smtSolver: solve,
  availableSolvers: solvers
};
