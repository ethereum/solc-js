#!/usr/bin/env node

// This is used to download the correct binary version
// as part of the prepublish step.

const pkg = require('./package.json');
const fs = require('fs');
const https = require('https');
const semver = require('semver');
const MemoryStream = require('memorystream');
const ethJSUtil = require('ethereumjs-util');
const wanted = semver.clean(pkg.version);
const endpoint = {
  list: 'https://ethereum.github.io/solc-bin/bin/list.json',
  bin: 'https://ethereum.github.io/solc-bin/bin/'
};

const getVersionList = () => {
  return new Promise((resolve, reject) => {
    console.log('Retrieving available version list...');
    const mem = new MemoryStream(null, { readable: false });
    https.get(endpoint.list, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error('Error downloading file: ' + response.statusCode));
      }
      response.pipe(mem);
      response.on('end', () => {
        const rawData = mem.toString();
        try {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
};

const downloadBinary = (list) => {
  return new Promise((resolve, reject) => {
    const outputName = 'soljson.js';
    const version = list.releases[wanted];
    const expectedHash = list.builds.filter((entry) => {
      return entry.path === version;
    })[0].keccak256;
    console.log('Downloading version', version);

    // Remove if existing
    if (fs.existsSync(outputName)) {
      fs.unlinkSync(outputName);
    }

    process.on('SIGINT', () => {
      fs.unlinkSync(outputName);
      reject(new Error('Interrupted, removing file.'));
    });

    const file = fs.createWriteStream(outputName, { encoding: 'binary' });
    https.get(endpoint.bin + version, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error('Error downloading file: ' + response.statusCode));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          const hash = '0x' + ethJSUtil.sha3(
            fs.readFileSync(outputName, { encoding: 'binary' })
          ).toString('hex');
          if (expectedHash !== hash) {
            reject(new Error('Hash mismatch: ' + expectedHash + ' vs ' + hash));
          }
          resolve();
        });
      }).on('error', reject);
    }).on('error', reject);
  });
};

Promise.resolve(() => { console.log('Downloading the solidity binary...'); })
  .then(getVersionList)
  .then(downloadBinary)
  .then(() => { console.log('Done.'); })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
