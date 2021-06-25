const pkg = require("../package.json");
const { exec } = require('child_process');


describe('CLI', () => {
  test('--version', async (done) => {
    await exec('./solcjs --version', (error, stdout) => {
      expect(error).toBeNull;
      expect(stdout).toMatch(RegExp(pkg.version + '(-[^a-zA-A0-9.+]+)?(\\+[^a-zA-Z0-9.-]+)?'));
      done();
    });
  });
  test('no parameters', async (done) => {
    await exec('./solcjs', (error) => {
      expect(error.message).toMatch(RegExp(/Must provide a file/));
      done();
    });
  });

  test('no mode specified', async (done) => {
    await exec('./solcjs test/resources/fixtureSmoke.sol', (error) => {
      expect(error.message).toMatch(RegExp(/Invalid option selected/));
      done();
    });
  });

  test('--bin', async (done) => {
    expect(await exec('./solcjs --bin test/resources/fixtureSmoke.sol', (error) => {
      expect(error).toBeNull;
      done();
    })
    ).toBeTruthy
  });

  test('--bin --optimize', async (done) => {
    let spt = await exec('./solcjs --bin --optimize test/resources/fixtureSmoke.sol', (error) => {
      expect(error).toBeNull;
      done();
    });
    expect(spt).toBeTruthy;
  });

  test('invalid file specified', async (done) => {
    await exec('./solcjs --bin test/fileNotFound.sol', (error) => {
      expect(error.message).toMatch(RegExp(/Error reading/))
      done();
    });
  });

  test('incorrect source source', async (done) => {
    await exec('./solcjs --bin test/resources/fixtureIncorrectSource.sol', (error) => {
      expect(error.message).toMatch(RegExp(/test\/resources\/fixtureIncorrectSource.sol:1:1: SyntaxError: Invalid pragma "contract"/));
      done();
    });
  });

  test('--abi', async (done) => {
    let spt = await exec('./solcjs --abi test/resources/fixtureSmoke.sol', (error) => {
      expect(error).toBeNull;
      done();
    });
    expect(spt).toBeTruthy;
  });

  test('--bin --abi', async (done) => {
    let spt = await exec('./solcjs --bin --abi test/resources/fixtureSmoke.sol', (error) => {
      expect(error).toBeNull;
      done();
    });
    expect(spt).toBeTruthy;
  });

  test('standard json', async (done) => {
    const input = {
      language: 'Solidity',
      settings: {
        outputSelection: {
          '*': {
            '*': ['evm.bytecode', 'userdoc']
          }
        }
      },
      sources: {
        'Contract.sol': {
          content: 'pragma solidity >=0.5.0; contract Contract { function f() pure public {} }'
        }
      }
    };
    let spt = await exec('./solcjs --standard-json', () => {
      done();
    });
    spt.stdin.setEncoding('utf-8');
    spt.stdin.write(JSON.stringify(input));
    spt.stdin.end();
    expect(spt.stderr).toBeNull;
    spt.stdout.on('data', (data) => {
      expect(data).toMatch(RegExp(/Contract.sol/));
    });
    spt.stdout.on('data', (data) => {
      expect(data).toMatch(RegExp(/userdoc/));
    });

    expect(spt).toBeTruthy;
  });
})
