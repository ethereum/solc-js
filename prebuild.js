#!/usr/bin/env node

var package = require('./package.json');
var fs = require('fs');
var http = require('http');

console.log('Downloading', package.version);

var file = fs.createWriteStream('soljson.js');
http.get('http://chriseth.github.io/browser-solidity/bin/soljson-' + package.version + '.js', function(response) {
  response.pipe(file);
//  response.on('end', function () {
//    file.close()
//  });
});

// FIXME: is this really the way to wait for this?
(function wait () {
  if (!file.closed) {
    setTimeout(wait, 1000);
  }
})();
