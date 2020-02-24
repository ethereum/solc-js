import smtchecker = require('../src/smtchecker');

describe('SMTChecker', () => {
    test('smoke test with no axuiliaryInputRequested', () => {
        let input = {};
        let output = {};
        expect(smtchecker.handleSMTQueries(input, output)).toBeNull;
    });

    test('smoke test with no smtlib2queries', () => {
        let input = {};
        let output = { auxiliaryInputRequested: {} };
        expect(smtchecker.handleSMTQueries(input, output)).toBeNull;
    });

    test('smoke test with empty smtlib2queries', () => {
        let input = {};
        let output = { auxiliaryInputRequested: { smtlib2queries: {} } };
        expect(smtchecker.handleSMTQueries(input, output)).toBeNull;
    });
});
