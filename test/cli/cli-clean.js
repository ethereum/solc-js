var tape = require('tape');
var spawn = require('tape-spawn');

tape('CLI CLEAN', function (t) {
  t.test('clean', function (st) {
    var spt = spawn(st, './solcjs clean');
    spt.stdout.match(RegExp('I let you do.*'));
    spt.end();
  });
});
