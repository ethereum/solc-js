const tape = require('tape');
const spawn = require('tape-spawn');

tape('CLI LIST', function (t) {
  t.test('list', function (st) {
    var spt = spawn(st, './solcjs list');
    spt.stderr.empty();
    // spt.stdout.empty();
    spt.succeeds();
    spt.end();
  });
});
