#!/usr/bin/env node

// This is used to download the correct binary version
// as part of the prepublish step.

var pkg = require('./package.json');
var fs = require('fs');
var https = require('https');
var MemoryStream = require('memorystream');

function getVersionList (cb) {
  console.log('Retrieving available version list...');

  var mem = new MemoryStream(null, { readable: false });
  https.get('https://ethereum.github.io/solc-bin/bin/list.json', function (response) {
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

function downloadBinary (version) {
  console.log('Downloading version', version);

  var file = fs.createWriteStream('soljson.js');
  https.get('https://ethereum.github.io/solc-bin/bin/' + version, function (response) {
    if (response.statusCode !== 200) {
      console.log('Error downloading file: ' + response.statusCode);
      process.exit(1);
    }
    response.pipe(file);
    file.on('finish', function () {
      file.close(function () {
        console.log('Done.');
      });
    });
  });
}

console.log('Downloading correct solidity binary...');

getVersionList(function (list) {
  list = JSON.parse(list);
  var wanted = pkg.version.match(/^(\d+\.\d+\.\d+)$/)[1];
  downloadBinary(list.releases[wanted]);
});
