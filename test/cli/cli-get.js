const tape = require('tape');
const spawn = require('tape-spawn');

tape('CLI GET', function (t) {
  t.test('get', function (st) {
    var spt = spawn(st, './solcjs get');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('get --latest', function (st) {
    var spt = spawn(st, './solcjs get --latest');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });
});
