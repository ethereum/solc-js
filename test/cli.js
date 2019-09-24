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
    var spt = spawn(st, './solcjs test/contracts/Smoke.sol');
    spt.stderr.match(/^Invalid option selected/);
    spt.end();
  });

  t.test('--bin', function (st) {
    var spt = spawn(st, './solcjs --bin test/contracts/Smoke.sol');
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
    var spt = spawn(st, './solcjs --abi test/contracts/Smoke.sol');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('--bin --abi', function (st) {
    var spt = spawn(st, './solcjs --bin --abi test/contracts/Smoke.sol');
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
});
