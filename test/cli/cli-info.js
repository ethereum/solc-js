var tape = require('tape');
var spawn = require('tape-spawn');
var pkg = require('../../package.json');

tape('CLI INFO', function (t) {
  t.test('info', function (st) {
    var spt = spawn(st, './solcjs info');
    spt.stdout.match(RegExp(pkg.version + '(-[^a-zA-A0-9.+]+)?(\\+[^a-zA-Z0-9.-]+)?'));
    spt.end();
  });
});
