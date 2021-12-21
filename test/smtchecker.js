const tape = require('tape');
const smtchecker = require('../smtchecker.js');

tape('SMTChecker', function (t) {
  t.test('smoke test with no axuiliaryInputRequested', function (st) {
    const input = {};
    const output = {};
    st.equal(smtchecker.handleSMTQueries(input, output), null);
    st.end();
  });

  t.test('smoke test with no smtlib2queries', function (st) {
    const input = {};
    const output = { auxiliaryInputRequested: {} };
    st.equal(smtchecker.handleSMTQueries(input, output), null);
    st.end();
  });

  t.test('smoke test with empty smtlib2queries', function (st) {
    const input = {};
    const output = { auxiliaryInputRequested: { smtlib2queries: { } } };
    st.equal(smtchecker.handleSMTQueries(input, output), null);
    st.end();
  });
});
