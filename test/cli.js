const tape = require('tape');
const spawn = require('tape-spawn');
const pkg = require('../package.json');

tape('CLI', function (t) {
  t.test('--version', function (st) {
    var spt = spawn(st, './solcjs --version');
    spt.stdout.match(RegExp(pkg.version + '(-[^a-zA-A0-9.+]+)?(\\+[^a-zA-Z0-9.-]+)?'));
    spt.end();
  });

  t.test('no parameters', function (st) {
    var spt = spawn(st, './solcjs');
    spt.stderr.match(/^Must provide a file/);
    spt.end();
  });

  t.test('no mode specified', function (st) {
    var spt = spawn(st, './solcjs test/DAO/Token.sol');
    spt.stdout.match(/^Invalid option selected/);
    spt.end();
  });

  t.test('--bin', function (st) {
    var spt = spawn(st, './solcjs --bin test/DAO/Token.sol');
    spt.stderr.empty();
    spt.stdout.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('invalid file specified', function (st) {
    var spt = spawn(st, './solcjs --bin test/fileNotFound.sol');
    spt.stdout.match(/^Error reading /);
    spt.end();
  });

  t.test('--abi', function (st) {
    var spt = spawn(st, './solcjs --abi test/DAO/Token.sol');
    spt.stderr.empty();
    spt.stdout.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('--bin --abi', function (st) {
    var spt = spawn(st, './solcjs --bin --abi test/DAO/Token.sol');
    spt.stderr.empty();
    spt.stdout.empty();
    spt.succeeds();
    spt.end();
  });
});
