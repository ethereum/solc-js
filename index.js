var fs = require('fs');

try {
  fs.lstatSync('./soljson.js');
  var wrapper = require('./wrapper.js');
  module.exports = wrapper(require('./soljson.js'));
} catch (e) {
  console.error('soljson.js not available.');
}
