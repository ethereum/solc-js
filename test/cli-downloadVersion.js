const tape = require('tape');
const spawn = require('tape-spawn');
const pkg = require('../package.json');

tape('CLI downloadVersion', function (t) {
  t.test('--list', function (st) {
    var spt = spawn(st, './downloadVersion.js --list');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });
});
