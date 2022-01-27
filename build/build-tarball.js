const { spawn } = require('child_process');

const npmCalls = [
  'npm run updateBinary',
  'npm run build',
  'npm pack ./dist'
];

async function main () {
  for (const script of npmCalls) {
    const content = script.split(' ');

    const args = { env: { ...process.env, RELEASE: 'true' }, encoding: 'utf8' };
    const child = spawn(content[0], content.slice(1), args);

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    await new Promise((resolve) => {
      child.on('close', resolve);
    });
  }
}

main().then().catch(console.error);
