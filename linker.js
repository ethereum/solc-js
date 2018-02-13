var linkBytecode = function (bytecode, libraries) {
  // NOTE: for backwards compatibility support old compiler which didn't use file names
  var librariesComplete = {};
  for (var libraryName in libraries) {
    var parsed = libraryName.match(/^([^:]*):?(.*)$/);
    if (parsed) {
      librariesComplete[parsed[2]] = libraries[libraryName];
    }
    librariesComplete[libraryName] = libraries[libraryName];
  }

  for (libraryName in librariesComplete) {
    // truncate to 37 characters
    var internalName = libraryName.slice(0, 36);
    // prefix and suffix with __
    var libLabel = '__' + internalName + Array(37 - internalName.length).join('_') + '__';

    var hexAddress = librariesComplete[libraryName];
    if (hexAddress.slice(0, 2) !== '0x' || hexAddress.length > 42) {
      throw new Error('Invalid address specified for ' + libraryName);
    }
    // remove 0x prefix
    hexAddress = hexAddress.slice(2);
    hexAddress = Array(40 - hexAddress.length + 1).join('0') + hexAddress;

    while (bytecode.indexOf(libLabel) >= 0) {
      bytecode = bytecode.replace(libLabel, hexAddress);
    }
  }

  return bytecode;
};

module.exports = {
  linkBytecode: linkBytecode
};
