#!/usr/bin/env node

// This is used to download the correct binary version
// as part of the prepublish step.
import compare from 'version-comparator'
import {processLongVersion} from './processCommitString.helper.js'
import {readJson} from './readFileStream.helper.js'
let semver = require('semver')
let writeJsonFile = require('./writeJson.helper.js')

var pkg = require('./package.json');
var fs = require('fs');
var https = require('https');
var MemoryStream = require('memorystream');
var ethJSUtil = require('ethereumjs-util');

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

  var file = fs.createWriteStream(outputName, { encoding: 'binary' });
  https.get('https://ethereum.github.io/solc-bin/bin/' + version, function (response) {
    if (response.statusCode !== 200) {
      console.log('Error downloading file: ' + response.statusCode);
      process.exit(1);
    }
    response.pipe(file);
    file.on('finish', function () {
      file.close(function () {
        var hash = '0x' + ethJSUtil.sha3(fs.readFileSync(outputName, { encoding: 'binary' })).toString('hex');
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

  let sortedBuildList = list.builds.sort((a,b) => compare(processLongVersion(b.longVersion), processLongVersion(a.longVersion)))
  let latestBuild = sortedBuildList[0]

  let jsonPackagePath = './package.json'
  let readData = readJson(jsonPackagePath)

  readData.version = semver.coerce(latestBuild.longVersion).version;
  writeJsonFile(jsonPackagePath, readData);

  // var wanted = pkg.version.match(/^(\d+\.\d+\.\d+)$/)[1];
  // var releaseFileName = list.releases[wanted];

  var releaseFileName = latestBuild.path

  var expectedHash = list.builds.filter(function (entry) { return entry.path === releaseFileName; })[0].keccak256;
  downloadBinary('soljson.js', releaseFileName, expectedHash);
});