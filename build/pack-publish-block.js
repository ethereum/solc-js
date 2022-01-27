const RELEASE = !!(process.env.RELEASE);

if (!RELEASE) {
  console.log('Run `npm run build:tarball` or `npm run publish:tarball` to pack or publish the package');
  process.exit(1); // which terminates the publish process
}
