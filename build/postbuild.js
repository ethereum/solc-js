const fs = require('fs');
const path = require('path');

fs.chmodSync(path.join(__dirname, '../dist', 'solc.js'), '755');
