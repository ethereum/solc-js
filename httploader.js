var solc = require('./index.js');
var MemoryStream = require('memorystream');
var http = require('http');

module.exports = function (versionString, cb) {
  var mem = new MemoryStream(null, { readable: false } );
  http.get('http://chriseth.github.io/browser-solidity/bin/soljson-' + versionString + '.js', function(response) {
    response.pipe(mem);
    response.on('end', function () {
//    console.log("file finished", mem.toString());
      cb(null, solc.loadVersion(mem.toString()));
    });
  });
}
