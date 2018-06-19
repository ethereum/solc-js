const tape = require('tape');
const fs = require('fs');
const solc = require('../index.js');
const semver = require('semver');

tape('Deterministic Compilation', function (t) {
  t.test('DAO', function (st) {
    var input = {};
    var prevBytecode = null;
    var testdir;
    if (semver.lt(solc.semver(), '0.5.0')) {
      testdir = 'test/DAO040/';
    } else {
      testdir = 'test/DAO/';
    }
    var files = ['DAO.sol', 'Token.sol', 'TokenCreation.sol', 'ManagedAccount.sol'];
    var i;
    for (i in files) {
      var file = files[i];
      input[file] = fs.readFileSync(testdir + file, 'utf8');
    }
    for (i = 0; i < 10; i++) {
      var output = solc.compile({sources: input}, 1);
      var bytecode = output.contracts['DAO.sol:DAO'].bytecode;
      st.ok(bytecode.length > 0);
      if (prevBytecode !== null) {
        st.equal(prevBytecode, bytecode);
      }
      prevBytecode = bytecode;
      // reset compiler state
      solc.compile({sources: {f: 'contract c {}'}}, 1);
    }
    st.end();
  });
});
