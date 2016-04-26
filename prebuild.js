#!/usr/bin/env node

var package = require('./package.json');
var fs = require('fs');
var http = require('http');
var MemoryStream = require('memorystream');

function getVersionList (cb) {
  console.log('Downloading available version list');

  var mem = new MemoryStream(null, { readable: false } );
  http.get('http://ethereum.github.io/solc-bin/bin/list.txt', function(response) {
    response.pipe(mem);
    response.on('end', function () {
      cb(mem.toString());
    });
  });
}

function getSoljson (version) {
  console.log('Downloading version ', version);

  var file = fs.createWriteStream('soljson.js');
  http.get('http://ethereum.github.io/solc-bin/bin/soljson-' + version + '.js', function(response) {
    response.pipe(file);
//    response.on('end', function () {
//      file.close()
//    });
  });

  // FIXME: is this really the way to wait for this?
  (function wait () {
    if (!file.closed) {
      setTimeout(wait, 1000);
    }
  })();
}

getVersionList(function(list) {
  var wanted = package.version.match(/^(\d\.\d\.\d)-?\d?$/)[1];

  var sources = list.split('\n');
  for (var i = sources.length - 1; i >= 0; i--) {
    // FIXME: use build as well
    var version = sources[i].match(/^soljson-v([0-9.]*)-.*.js$/);

    // Skip invalid lines
    if (!version) {
      continue;
    }

    if (version[1] === wanted) {
      getSoljson(sources[i].match(/^soljson-(.*).js$/)[1]);
      return;
    }
  }
});
