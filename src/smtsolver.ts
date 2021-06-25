const commandExistsSync = require('command-exists').sync;
const execSync = require('child_process').execSync;
import fs = require('fs');
import tmp = require('tmp');

const timeout = 10000;

const potentialSolvers = [
    {
        name: 'z3',
        params: '-smt2 -t:' + timeout
    },
    {
        name: 'cvc4',
        params: '--lang=smt2 --tlimit=' + timeout
    }
];
const solvers = potentialSolvers.filter(solver => commandExistsSync(solver.name));

export const smtSolver = function solve(query: string): string {
    if (solvers.length === 0) {
        throw new Error('No SMT solver available. Assertion checking will not be performed.');
    }

    const tmpFile: any = tmp.fileSync({ postfix: '.smt2' });
    fs.writeFileSync(tmpFile.name, query);
    // TODO For now only the first SMT solver found is used.
    // At some point a computation similar to the one done in
    // SMTPortfolio::check should be performed, where the results
    // given by different solvers are compared and an error is
    // reported if solvers disagree (i.e. SAT vs UNSAT).
    let solverOutput: string;
    try {
        solverOutput = execSync(
            solvers[0].name + ' ' + solvers[0].params + ' ' + tmpFile.name, {
            timeout: 10000
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
            !solverOutput.startsWith('unknown')
        ) {
            throw new Error('Failed to solve SMT query. ' + e.toString());
        }
    }
    // Trigger early manual cleanup
    tmpFile.removeCallback();
    return solverOutput;
}

const availableSolvers = solvers.length;

export { availableSolvers };
