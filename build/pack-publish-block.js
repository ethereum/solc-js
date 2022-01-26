// This is meant to run in a hook before npm pack.
// Reporting an error from the hook interrupts the command.
if (process.env.BYPASS_SAFETY_CHECK === 'false' || process.env.BYPASS_SAFETY_CHECK === undefined) {
  console.error('Run `npm run build:tarball` or `npm run publish:tarball` to pack or publish the package');
  process.exit(1);
} else if (process.env.BYPASS_SAFETY_CHECK !== 'true') {
  console.error('Invalid value of the BYPASS_SAFETY_CHECK variable. Must be "true", "false" or unset.');
  process.exit(1);
}
