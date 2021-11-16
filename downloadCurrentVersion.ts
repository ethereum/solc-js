#!/usr/bin/env node

// This is used to download the correct binary version
// as part of the prepublish step.

import * as pkg from './package.json';
import * as fs from 'fs';
import { https } from 'follow-redirects';
import * as MemoryStream from 'memorystream';
import { keccak256 } from 'js-sha3';

function getVersionList (cb) {
  console.log('Retrieving available version list...');

  const mem = new MemoryStream(null, { readable: false });
  https.get('https://binaries.soliditylang.org/bin/list.json', function (response) {
    if (response.statusCode !== 200) {
      console.log('Error downloading file: ' + response.statusCode);
      process.exit(1);
    }
    response.pipe(mem);
    response.on('end', function () {
      cb(mem.toString());
    });
  });
}

function downloadBinary (outputName, version, expectedHash) {
  console.log('Downloading version', version);

  // Remove if existing
  if (fs.existsSync(outputName)) {
    fs.unlinkSync(outputName);
  }

  process.on('SIGINT', function () {
    console.log('Interrupted, removing file.');
    fs.unlinkSync(outputName);
    process.exit(1);
  });

  const file = fs.createWriteStream(outputName, { encoding: 'binary' });
  https.get('https://binaries.soliditylang.org/bin/' + version, function (response) {
    if (response.statusCode !== 200) {
      console.log('Error downloading file: ' + response.statusCode);
      process.exit(1);
    }
    response.pipe(file);
    file.on('finish', function () {
      file.close(function () {
        const hash = '0x' + keccak256(fs.readFileSync(outputName, { encoding: 'binary' }));
        if (expectedHash !== hash) {
          console.log('Hash mismatch: ' + expectedHash + ' vs ' + hash);
          process.exit(1);
        }
        console.log('Done.');
      });
    });
  });
}

console.log('Downloading correct solidity binary...');

getVersionList(function (list) {
  list = JSON.parse(list);
  const wanted = pkg.version.match(/^(\d+\.\d+\.\d+)$/)[1];
  const releaseFileName = list.releases[wanted];
  const expectedFile = list.builds.filter(function (entry) { return entry.path === releaseFileName; })[0];
  if (!expectedFile) {
    console.log('Version list is invalid or corrupted?');
    process.exit(1);
  }
  const expectedHash = expectedFile.keccak256;
  downloadBinary('soljson.js', releaseFileName, expectedHash);
});
