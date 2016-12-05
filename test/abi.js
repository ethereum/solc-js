const tape = require('tape');
const abi = require('../abi.js');

tape('ABI translator', function (t) {
  t.test('Empty ABI', function (st) {
    st.deepEqual(abi.update('0.4.0', []), []);
    st.end();
  });
  t.test('0.1.1 (no constructor)', function (st) {
    st.deepEqual(abi.update('0.1.1', []), [ { inputs: [], payable: true, type: 'constructor' }, { payable: true, type: 'fallback' } ]);
    st.end();
  });
  t.test('0.4.0 (has fallback)', function (st) {
    var input = [ { inputs: [], type: 'constructor' } ];
    st.deepEqual(abi.update('0.4.0', input), [ { inputs: [], payable: true, type: 'constructor' } ]);
    st.end();
  });
  t.test('0.4.1 (constructor not payable)', function (st) {
    var input = [ { inputs: [], payable: false, type: 'constructor' } ];
    st.deepEqual(abi.update('0.4.1', input), [ { inputs: [], payable: true, type: 'constructor' } ]);
    st.end();
  });
  t.test('0.4.5 (constructor payable)', function (st) {
    var input = [ { inputs: [], payable: false, type: 'constructor' } ];
    st.deepEqual(abi.update('0.4.5', input), [ { inputs: [], payable: false, type: 'constructor' } ]);
    st.end();
  });
});
