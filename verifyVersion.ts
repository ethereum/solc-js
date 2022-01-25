#!/usr/bin/env node

import * as semver from 'semver';

import { version as packageVersion } from './package.json';
import solc from './';

const solcVersion = (solc as any).version();

console.log('solcVersion: ' + solcVersion);
console.log('packageVersion: ' + packageVersion);

if (semver.eq(packageVersion, solcVersion)) {
  console.log('Version matching');
  process.exit(0);
} else {
  console.log('Version mismatch');
  process.exit(1);
}
