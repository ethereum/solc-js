function processLongVersion(longVersionString){
  let cut = longVersionString.substring(0,longVersionString.indexOf("+"))
  let replacedNightly = cut.replace('-nightly', '')
  return replacedNightly
}

export {processLongVersion}