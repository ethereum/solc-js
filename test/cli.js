const tape = require('tape');
const spawn = require('tape-spawn');
const pkg = require('../package.json');
const semver = require('semver');

var daodir;
if (semver.lt(pkg.version, '0.5.0')) {
  daodir = 'DAO040';
} else {
  daodir = 'DAO';
}

tape('CLI', function (t) {
  t.test('--version', function (st) {
    var spt = spawn(st, './solcjs --version');
    spt.stdout.match(RegExp(pkg.version + '(-[^a-zA-A0-9.+]+)?(\\+[^a-zA-Z0-9.-]+)?'));
    spt.stderr.empty();
    spt.end();
  });

  t.test('no parameters', function (st) {
    var spt = spawn(st, './solcjs');
    spt.stderr.match(/^Must provide a file/);
    spt.end();
  });

  t.test('no mode specified', function (st) {
    var spt = spawn(st, './solcjs test/' + daodir + '/Token.sol');
    spt.stderr.match(/^Invalid option selected/);
    spt.end();
  });

  t.test('--bin', function (st) {
    var spt = spawn(st, './solcjs --bin test/' + daodir + '/Token.sol');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('invalid file specified', function (st) {
    var spt = spawn(st, './solcjs --bin test/fileNotFound.sol');
    spt.stderr.match(/^Error reading /);
    spt.end();
  });

  t.test('incorrect source source', function (st) {
    var spt = spawn(st, './solcjs --bin test/fixtureIncorrectSource.sol');
    spt.stderr.match(/^test\/fixtureIncorrectSource.sol:1:1: SyntaxError: Invalid pragma "contract"/);
    spt.end();
  });

  t.test('--abi', function (st) {
    var spt = spawn(st, './solcjs --abi test/' + daodir + '/Token.sol');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('--bin --abi', function (st) {
    var spt = spawn(st, './solcjs --bin --abi test/' + daodir + '/Token.sol');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });
});
