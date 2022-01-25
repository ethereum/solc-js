const fs = require('fs');
const path = require('path');

const distFolder = path.join(__dirname, 'dist');

if (fs.existsSync(distFolder)) {
  fs.rmdirSync(distFolder);
}
