import tape from 'tape';
import spawn from 'tape-spawn';
import * as path from 'path';
import specificSolVersion, { getInstalledVersions, SOLC_INSTALLATION_DIRECTORY } from '../';
import fs from 'fs';

const SOLC_VERSION_TO_DOWNLOAD = '0.8.4';

function runTests(solc) {
  tape('bagels', function (t) {
    t.test('downloaded right version', function (st) {
      const readDir = fs.readdirSync(SOLC_INSTALLATION_DIRECTORY);

      const solcInDir = readDir.includes(`soljson-${SOLC_VERSION_TO_DOWNLOAD}.js`);

      st.equal(solcInDir, true);
      st.end();
    })
    // TODO: Still doesn't work!!!
    t.test('download invalid version', async function (st) {
      const specificSolc = await specificSolVersion('0.8.1'); 
      st.end();
    })
    t.test('weird pragma', async function (st) {
      const specificSolc = await specificSolVersion('>=0.5.0 <0.8.0'); 
      st.end();
    })
  });
}

async function main() { 
  cleanInstall();
  const solc = await specificSolVersion(SOLC_VERSION_TO_DOWNLOAD);
  runTests(solc);
}

main();

function cleanInstall() { 
  if (fs.existsSync(SOLC_INSTALLATION_DIRECTORY)) {
    console.log(SOLC_INSTALLATION_DIRECTORY);
    fs.rmSync(SOLC_INSTALLATION_DIRECTORY, { recursive: true });
  }
}
