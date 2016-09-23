var tape = require('tape');
var spawn = require('tape-spawn');

tape('CLI HELP', function (t) {
  t.test('help', function (st) {
    var spt = spawn(st, './solcjs --help');
    spt.stdout.match(RegExp('Usage:.*'));
    spt.stdout.match(RegExp('Options:.*'));
    spt.stdout.match(RegExp('Examples:.*'));
    spt.end();
  });

  // t.test('no params', function (st) {
  //   var spt = spawn(st, './solcjs');
  //   console.log(spt.stdout);
  //   spt.stdout.match(RegExp('Usage:.*'));
  //   spt.stdout.match(RegExp('Options:.*'));
  //   spt.stdout.match(RegExp('Examples:.*'));
  //   spt.end();
  // });
});
