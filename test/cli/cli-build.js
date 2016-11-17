const tape = require('tape');
const spawn = require('tape-spawn');

tape('CLI BUILD', function (t) {
  t.test('no cmd', function (st) {
    var spt = spawn(st, './solcjs test/DAO/Token.sol');
    spt.stderr.match(/^cmd unknown/);
    spt.end();
  });

  t.test('no parameters', function (st) {
    var spt = spawn(st, './solcjs build');
    spt.stderr.match(/^You must provide at least/);
    spt.end();
  });

  t.test('no mode', function (st) {
    var spt = spawn(st, './solcjs build test/DAO/Token.sol');
    spt.stderr.match(/^Invalid option selected/);
    spt.end();
  });

  t.test('--bin -o output', function (st) {
    var spt = spawn(st, './solcjs build --bin test/DAO/Token.sol');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('invalid file specified', function (st) {
    var spt = spawn(st, './solcjs build --bin test/fileNotFound.sol');
    spt.stderr.match(/^Error reading /);
    spt.end();
  });

  t.test('--abi -o output', function (st) {
    var spt = spawn(st, './solcjs build --abi test/DAO/Token.sol');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('--bin --abi', function (st) {
    var spt = spawn(st, './solcjs build --bin --abi test/DAO/Token.sol');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });
});
