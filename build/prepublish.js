const RELEASE = !!(process.env.RELEASE);

if (!RELEASE) {
  console.log('Run `npm run publish` to publish the package');
  process.exit(1); // which terminates the publish process
}
