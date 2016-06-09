const tape = require('tape');
const solc = require('../index.js');

tape('Compilation', function (t) {
  t.test('single files can be compiled', function (st) {
    var output = solc.compile('contract x { function g() {} }');
    st.ok('x' in output.contracts);
    st.ok(output.contracts['x'].bytecode.length > 0);
    st.end();
  });
  t.test('multiple files can be compiled', function (st) {
    var input = {
      'lib.sol': 'library L { function f() returns (uint) { return 7; } }',
      'cont.sol': 'import "lib.sol"; contract x { function g() { L.f(); } }'
    };
    var output = solc.compile({sources: input});
    st.ok('x' in output.contracts);
    st.ok('L' in output.contracts);
    st.ok(output.contracts['x'].bytecode.length > 0);
    st.ok(output.contracts['L'].bytecode.length > 0);
    st.end();
  });
  t.test('lazy-loading callback works', function (st) {
    var input = {
      'cont.sol': 'import "lib.sol"; contract x { function g() { L.f(); } }'
    };
    function findImports (path) {
      if (path === 'lib.sol') {
        return { contents: 'library L { function f() returns (uint) { return 7; } }' };
      } else {
        return { error: 'File not found' };
      }
    }
    var output = solc.compile({sources: input}, 0, findImports);
    st.ok('x' in output.contracts);
    st.ok('L' in output.contracts);
    st.ok(output.contracts['x'].bytecode.length > 0);
    st.ok(output.contracts['L'].bytecode.length > 0);
    st.end();
  });
});
tape('Loading Legacy Versions', function (t) {
  t.test('loading remote version - development snapshot', function (st) {
    // getting the development snapshot
    st.plan(3);
    solc.loadRemoteVersion('latest', function (err, solcSnapshot) {
      st.notOk(err);
      var output = solcSnapshot.compile('contract x { function g() {} }');
      st.ok('x' in output.contracts);
      st.ok(output.contracts['x'].bytecode.length > 0);
    });
  });
});
