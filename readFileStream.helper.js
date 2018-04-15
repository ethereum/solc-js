let fs=require('fs');

function readJson(file){
  let data=fs.readFileSync(file, 'utf8');
  let words=JSON.parse(data);
  return words;
}

export {readJson}
