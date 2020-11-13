const tape = require('tape');
const abi = require('../abi.js');

tape('ABI translator', function (t) {
  t.test('Empty ABI', function (st) {
    st.deepEqual(abi.update('0.4.0', []), []);
    st.end();
  });
  t.test('0.1.1 (no constructor)', function (st) {
    st.deepEqual(abi.update('0.1.1', []), [ { inputs: [], payable: true, stateMutability: 'payable', type: 'constructor' }, { payable: true, stateMutability: 'payable', type: 'fallback' } ]);
    st.end();
  });
  t.test('0.3.6 (constructor)', function (st) {
    var input = [ { inputs: [], type: 'constructor' } ];
    st.deepEqual(abi.update('0.3.6', input), [ { inputs: [], payable: true, stateMutability: 'payable', type: 'constructor' }, { payable: true, stateMutability: 'payable', type: 'fallback' } ]);
    st.end();
  });
  t.test('0.3.6 (non-constant function)', function (st) {
    var input = [ { inputs: [], type: 'function' } ];
    st.deepEqual(abi.update('0.3.6', input), [ { inputs: [], payable: true, stateMutability: 'payable', type: 'function' }, { payable: true, stateMutability: 'payable', type: 'fallback' } ]);
    st.end();
  });
  t.test('0.3.6 (constant function)', function (st) {
    var input = [ { inputs: [], type: 'function', constant: true } ];
    st.deepEqual(abi.update('0.3.6', input), [ { inputs: [], constant: true, stateMutability: 'view', type: 'function' }, { payable: true, stateMutability: 'payable', type: 'fallback' } ]);
    st.end();
  });
  t.test('0.3.6 (event)', function (st) {
    var input = [ { inputs: [], type: 'event' } ];
    st.deepEqual(abi.update('0.3.6', input), [ { inputs: [], type: 'event' }, { payable: true, stateMutability: 'payable', type: 'fallback' } ]);
    st.end();
  });
  t.test('0.3.6 (has no fallback)', function (st) {
    var input = [ { inputs: [], type: 'constructor' } ];
    st.deepEqual(abi.update('0.3.6', input), [ { inputs: [], type: 'constructor', payable: true, stateMutability: 'payable' }, { type: 'fallback', payable: true, stateMutability: 'payable' } ]);
    st.end();
  });
  t.test('0.4.0 (has fallback)', function (st) {
    var input = [ { inputs: [], type: 'constructor' }, { type: 'fallback' } ];
    st.deepEqual(abi.update('0.4.0', input), [ { inputs: [], type: 'constructor', payable: true, stateMutability: 'payable' }, { type: 'fallback', stateMutability: 'nonpayable' } ]);
    st.end();
  });
  t.test('0.4.0 (non-constant function)', function (st) {
    var input = [ { inputs: [], type: 'function' } ];
    st.deepEqual(abi.update('0.4.0', input), [ { inputs: [], stateMutability: 'nonpayable', type: 'function' } ]);
    st.end();
  });
  t.test('0.4.0 (constant function)', function (st) {
    var input = [ { inputs: [], type: 'function', constant: true } ];
    st.deepEqual(abi.update('0.4.0', input), [ { inputs: [], constant: true, stateMutability: 'view', type: 'function' } ]);
    st.end();
  });
  t.test('0.4.0 (payable function)', function (st) {
    var input = [ { inputs: [], payable: true, type: 'function' } ];
    st.deepEqual(abi.update('0.4.0', input), [ { inputs: [], payable: true, stateMutability: 'payable', type: 'function' } ]);
    st.end();
  });
  t.test('0.4.1 (constructor not payable)', function (st) {
    var input = [ { inputs: [], payable: false, type: 'constructor' } ];
    st.deepEqual(abi.update('0.4.1', input), [ { inputs: [], payable: true, stateMutability: 'payable', type: 'constructor' } ]);
    st.end();
  });
  t.test('0.4.5 (constructor payable)', function (st) {
    var input = [ { inputs: [], payable: false, type: 'constructor' } ];
    st.deepEqual(abi.update('0.4.5', input), [ { inputs: [], payable: false, stateMutability: 'nonpayable', type: 'constructor' } ]);
    st.end();
  });
  t.test('0.4.16 (statemutability)', function (st) {
    var input = [ { inputs: [], payable: false, stateMutability: 'pure', type: 'function' } ];
    st.deepEqual(abi.update('0.4.16', input), [ { inputs: [], payable: false, stateMutability: 'pure', type: 'function' } ]);
    st.end();
  });
});
