#!/usr/bin/env node

// This is used to download the correct binary version
// as part of the prepublish step.

var package = require('./package.json');
var fs = require('fs');
var https = require('https');
var MemoryStream = require('memorystream');

function getVersionList (cb) {
  console.log('Retrieving available version list...');

  var mem = new MemoryStream(null, { readable: false } );
  https.get('https://ethereum.github.io/solc-bin/bin/list.txt', function(response) {
    response.pipe(mem);
    response.on('end', function () {
      cb(mem.toString());
    });
  });
}

function downloadBinary (version) {
  console.log('Downloading version', version);

  var file = fs.createWriteStream('soljson.js');
  https.get('https://ethereum.github.io/solc-bin/bin/soljson-' + version + '.js', function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(function() {
        console.log("Done.");
      });
    });
  });
}

console.log("Downloading correct solidity binary...");

getVersionList(function(list) {
  var wanted = package.version.match(/^(\d\.\d\.\d)-?\d?$/)[1];
  
  var latest = list.split('\n')
    .map(function(src) {return src.match(/^soljson-v([0-9.]*)-.*.js$/)})
    .filter(function(version) { return version})
    .find(function(version) { return wanted === version[1]});

  downloadBinary(latest[0].match(/^soljson-(.*).js$/)[1]);

});
