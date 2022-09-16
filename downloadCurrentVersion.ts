#!/usr/bin/env node

// This is used to download the correct binary version
// as part of the prepublish step.

import downloader from './downloader';
const pkg = require('./package.json');
const BIN_URL = 'https://binaries.soliditylang.org/bin';

async function download (version, binURL = BIN_URL) {
  try {
    const list = JSON.parse(await downloader.getVersionList(`${binURL}/list.json`));
    const releaseFileName = list.releases[version];
    const expectedFile = list.builds.filter(function (entry) { return entry.path === releaseFileName; })[0];

    if (!expectedFile) {
      throw new Error('Requested version not found. Version list is invalid or corrupted?');
    }

    const expectedHash = expectedFile.keccak256;
    await downloader.downloadBinary(binURL, 'soljson.js', releaseFileName, expectedHash);
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

console.log('Downloading correct solidity binary...');
download(pkg.version.match(/^(\d+\.\d+\.\d+)$/)[1]);
