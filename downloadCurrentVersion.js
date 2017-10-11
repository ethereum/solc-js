#!/usr/bin/env node

// This is used to download the correct binary version
// as part of the prepublish step.

const semver = require('semver');
const pkg = require('./package.json');
const fs = require('fs');
const https = require('https');
const wanted = semver.clean(pkg.version);
const endpoint = {
  list: 'https://ethereum.github.io/solc-bin/bin/list.json',
  bin: 'https://ethereum.github.io/solc-bin/bin/'
};

const getVersionList = () => {
  return new Promise((resolve, reject) => {
    console.log('Retrieving available version list...');
    https.get(endpoint.list, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error('Error downloading file: ' + response.statusCode));
      }
      response.setEncoding('utf8');
      var rawData = '';
      response.on('data', (chunk) => { rawData += chunk; });
      response.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData.releases);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
};

const downloadBinary = (releases) => {
  return new Promise((resolve, reject) => {
    const version = releases[wanted];
    console.log('Downloading version', version);
    const file = fs.createWriteStream('soljson.js');
    https.get(endpoint.bin + version, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error('Error downloading file: ' + response.statusCode));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
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
