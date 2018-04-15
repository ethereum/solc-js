const fs = require('fs');

const writeToFile = (file,data) => {
  const jsonStr =  (data  instanceof Object) ? JSON.stringify(data,null,4) : data ;
  return new Promise((resolve, reject) => {
      fs.writeFile(`${file}`, jsonStr, 'utf-8', function(err) {
        if (err) reject(err);
        else resolve(jsonStr);
      });
    })
}

module.exports = function writeJsonFile(file, data) {
  return writeToFile(file,data)
};