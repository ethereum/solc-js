var fs = require('fs');

try {
    stats = fs.lstatSync('./soljson.js');
	var wrapper = require('./wrapper.js');
	module.exports = wrapper(require('./soljson.js'));
}
catch (e) {
    console.error('soljson.js not available.');
}



