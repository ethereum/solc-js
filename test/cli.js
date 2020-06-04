const tape = require('tape');
const spawn = require('tape-spawn');
const pkg = require('../package.json');

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
    var spt = spawn(st, './solcjs test/resources/fixtureSmoke.sol');
    spt.stderr.match(/^Invalid option selected/);
    spt.end();
  });

  t.test('--bin', function (st) {
    var spt = spawn(st, './solcjs --bin test/resources/fixtureSmoke.sol');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('--bin --optimize', function (st) {
    var spt = spawn(st, './solcjs --bin --optimize test/resources/fixtureSmoke.sol');
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
    var spt = spawn(st, './solcjs --bin test/resources/fixtureIncorrectSource.sol');
    spt.stderr.match(/^test\/resources\/fixtureIncorrectSource.sol:1:1: SyntaxError: Invalid pragma "contract"/);
    spt.end();
  });

  t.test('--abi', function (st) {
    var spt = spawn(st, './solcjs --abi test/resources/fixtureSmoke.sol');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('--bin --abi', function (st) {
    var spt = spawn(st, './solcjs --bin --abi test/resources/fixtureSmoke.sol');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('no-base-path', function (st) {
    var spt = spawn(st, './solcjs --bin test/resources/importA.sol');
    spt.stderr.match(/not found: File import callback not supported/);
    spt.end();
  });

  t.test('base-path', function (st) {
    var spt = spawn(st, './solcjs --bin --base-path test/resources test/resources/importA.sol');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('standard json', function (st) {
    var input = {
      'language': 'Solidity',
      'settings': {
        'outputSelection': {
          '*': {
            '*': [ 'evm.bytecode', 'userdoc' ]
          }
        }
      },
      'sources': {
        'Contract.sol': {
          'content': 'pragma solidity >=0.5.0; contract Contract { function f() pure public {} }'
        }
      }
    };
    var spt = spawn(st, './solcjs --standard-json');
    spt.stdin.setEncoding('utf-8');
    spt.stdin.write(JSON.stringify(input));
    spt.stdin.end();
    spt.stdin.on('finish', function () {
      spt.stderr.empty();
      spt.stdout.match(/Contract.sol/);
      spt.stdout.match(/userdoc/);
      spt.succeeds();
      spt.end();
    });
  });

  t.test('standard json base path', function (st) {
    var input = {
      'language': 'Solidity',
      'settings': {
        'outputSelection': {
          '*': {
            '*': [ 'metadata' ]
          }
        }
      },
      'sources': {
        'importA.sol': {
          'content': 'import "./importB.sol";'
        }
      }
    };
    var spt = spawn(st, './solcjs --standard-json --base-path test/resources');
    spt.stdin.setEncoding('utf-8');
    spt.stdin.write(JSON.stringify(input));
    spt.stdin.end();
    spt.stdin.on('finish', function () {
      spt.stderr.empty();
      console.log(spt.stdout);
      spt.stdout.match(/{"contracts":{"importB.sol":{"D":{"metadata":/);
      spt.succeeds();
      spt.end();
    });
  });
});
