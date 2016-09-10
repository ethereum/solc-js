const tape = require('tape');
const spawn = require('tape-spawn');

<<<<<<< HEAD:test/cli.js
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
=======
tape('CLI BUILD', function (t) {
  t.test('no cmd', function (st) {
    var spt = spawn(st, './solcjs test/DAO/Token.sol');
    spt.stderr.match(/^cmd unknown/);
    spt.end();
  });

  t.test('no mode', function (st) {
    var spt = spawn(st, './solcjs build test/DAO/Token.sol');
    spt.stderr.match(/^Invalid option selected/);
    spt.end();
  });

  t.test('--bin -o output', function (st) {
    var spt = spawn(st, './solcjs build --bin test/DAO/Token.sol');
>>>>>>> 697645a... Major refactoring:test/cli/cli-build.js
    spt.stderr.empty();
    spt.stdout.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('invalid file specified', function (st) {
<<<<<<< HEAD:test/cli.js
    var spt = spawn(st, './solcjs --bin test/fileNotFound.sol');
    spt.stdout.match(/^Error reading /);
    spt.end();
  });

  t.test('--abi', function (st) {
    var spt = spawn(st, './solcjs --abi test/DAO/Token.sol');
=======
    var spt = spawn(st, './solcjs build --bin test/fileNotFound.sol');
    spt.stderr.match(/^Error reading /);
    spt.end();
  });

  t.test('--abi -o output', function (st) {
    var spt = spawn(st, './solcjs build --abi test/DAO/Token.sol');
>>>>>>> 697645a... Major refactoring:test/cli/cli-build.js
    spt.stderr.empty();
    spt.stdout.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('--bin --abi', function (st) {
    var spt = spawn(st, './solcjs build --bin --abi test/DAO/Token.sol');
    spt.stderr.empty();
    spt.stdout.empty();
    spt.succeeds();
    spt.end();
  });
});
