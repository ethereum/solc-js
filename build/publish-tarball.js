const { spawn } = require('child_process');
const { name, version } = require('../package.json');
const fs = require('fs');
const path = require('path');

async function main () {
  const packName = `${name}-${version}`;

  const dirCont = fs.readdirSync(path.join(__dirname, '../'));
  const tarballName = dirCont.find((e) => e.startsWith(packName));

  if (tarballName == null) {
    console.log('Run `npm run build:tarball` to build the package before publishing');
    process.exit(1);
  }

  const args = { env: { ...process.env, RELEASE: 'true' }, encoding: 'utf8' };
  const tarPath = path.join(__dirname, '../', tarballName);

  const child = spawn('npm', ['publish', tarPath], args);

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  await new Promise((resolve) => {
    child.on('close', resolve);
  });
}

main().then().catch(console.error);
