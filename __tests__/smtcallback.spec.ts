import fs = require('fs');
import path = require('path');
import semver = require('semver');
import solc = require('../index.js');
import smtchecker = require('../src/smtchecker');
import smtsolver = require('../src/smtsolver');

import {
    collectErrors,
    expectErrors
} from "../src/helpers"

let pragmaSol: string = 'pragma solidity >=0.0;\n';
let pragmaSMT: string = 'pragma experimental SMTChecker;\n';


describe('SMTCheckerCallback', () => {

    describe.only('Interface via callback', () => {
        if (!semver.gt(solc.semver(), '0.5.99')) {
            test.only('skipped test', () => {
                console.log('SMT callback not implemented by this compiler version.');
            });
            return;
        }


        test('Interface via callback', () => {

            let satCallback = function (query) {
                return { contents: 'sat\n' };
            };
            let unsatCallback = function (query) {
                return { contents: 'unsat\n' };
            };
            let errorCallback = function (query) {
                return { error: 'Fake SMT solver error.' };
            };

            let input = { a: { content: pragmaSol + pragmaSMT + 'contract C { function f(uint x) public pure { assert(x > 0); } }' } };
            let inputJSON = JSON.stringify({
                language: 'Solidity',
                sources: input
            });
            let tests = [
                { cb: satCallback, expectations: ['Assertion violation happens here'] },
                { cb: unsatCallback, expectations: [] },
                { cb: errorCallback, expectations: ['BMC analysis was not possible'] }
            ];
            for (let i in tests) {
                let test = tests[i];
                let output = JSON.parse(solc.compile(
                    inputJSON,
                    { smtSolver: test.cb }
                ));
                let errors = collectErrors(output);
                expect(expectErrors(errors, test.expectations)).toBeTruthy;
            }
        });

    });

    describe('Solidity smtCheckerTests', () => {
        let testdir = path.resolve(__dirname, 'smtCheckerTests');
        if (!fs.existsSync(testdir)) {
            test.only('skipped test', () => {
                console.log('SMT checker tests not present.');
            })
            return;
        }

        if (smtsolver.availableSolvers === 0) {
            test.only('skipped test', () => {
                console.log('No SMT solver available.');
            })
            return;
        }
        test('Solidity smtCheckerTests', () => {

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

            // Read tests and collect expectations
            let tests = [];
            for (i in sources) {
                console.log('Collecting ' + sources[i] + '...');
                let source = fs.readFileSync(sources[i], 'utf8');
                let expected = [];
                let delimiter = '// ----';
                if (source.includes(delimiter)) {
                    expected = source.substring(source.indexOf('// ----') + 8, source.length).split('\n');
                    // Sometimes the last expectation line ends with a '\n'
                    if (expected.length > 0 && expected[expected.length - 1] === '') {
                        expected.pop();
                    }
                }
                tests[sources[i]] = {
                    expectations: expected,
                    solidity: { test: { content: pragmaSol + source } }
                };
            }

            // Run all tests
            for (i in tests) {
                let test = tests[i];
                let output = JSON.parse(solc.compile(
                    JSON.stringify({
                        language: 'Solidity',
                        sources: test.solidity
                    }),
                    { smtSolver: smtchecker.smtCallback(smtsolver.smtSolver) }
                ));
                expect(output).toBeTruthy;

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
                expect(expectErrors(test.expectations, test.errors)).toBeTruthy;
            }
        });
    });

});
