const assert = require('assert');
const keccak256 = require('js-sha3').keccak256;

function libraryHashPlaceholder (input) {
  return '$' + keccak256(input).slice(0, 34) + '$';
}

const linkBytecode = function (bytecode, libraries) {
  assert(typeof bytecode === 'string');
  assert(typeof libraries === 'object');
  // NOTE: for backwards compatibility support old compiler which didn't use file names
  const librariesComplete = {};
  for (const libraryName in libraries) {
    if (typeof libraries[libraryName] === 'object') {
      // API compatible with the standard JSON i/o
      for (const lib in libraries[libraryName]) {
        librariesComplete[lib] = libraries[libraryName][lib];
        librariesComplete[libraryName + ':' + lib] = libraries[libraryName][lib];
      }
    } else {
      // backwards compatible API for early solc-js versions
      const parsed = libraryName.match(/^([^:]+):(.+)$/);
      if (parsed) {
        librariesComplete[parsed[2]] = libraries[libraryName];
      }
      librariesComplete[libraryName] = libraries[libraryName];
    }
  }

  for (const libraryName in librariesComplete) {
    let hexAddress = librariesComplete[libraryName];
    if (hexAddress.slice(0, 2) !== '0x' || hexAddress.length > 42) {
      throw new Error('Invalid address specified for ' + libraryName);
    }
    // remove 0x prefix
    hexAddress = hexAddress.slice(2);
    hexAddress = Array(40 - hexAddress.length + 1).join('0') + hexAddress;

    // Support old (library name) and new (hash of library name)
    // placeholders.
    const replace = function (name) {
      // truncate to 37 characters
      const truncatedName = name.slice(0, 36);
      const libLabel = '__' + truncatedName + Array(37 - truncatedName.length).join('_') + '__';
      while (bytecode.indexOf(libLabel) >= 0) {
        bytecode = bytecode.replace(libLabel, hexAddress);
      }
    };

    replace(libraryName);
    replace(libraryHashPlaceholder(libraryName));
  }

  return bytecode;
};

const findLinkReferences = function (bytecode) {
  assert(typeof bytecode === 'string');
  // find 40 bytes in the pattern of __...<36 digits>...__
  // e.g. __Lib.sol:L_____________________________
  const linkReferences = {};
  let offset = 0;
  while (true) {
    const found = bytecode.match(/__(.{36})__/);
    if (!found) {
      break;
    }

    const start = found.index;
    // trim trailing underscores
    // NOTE: this has no way of knowing if the trailing underscore was part of the name
    const libraryName = found[1].replace(/_+$/gm, '');

    if (!linkReferences[libraryName]) {
      linkReferences[libraryName] = [];
    }

    linkReferences[libraryName].push({
      // offsets are in bytes in binary representation (and not hex)
      start: (offset + start) / 2,
      length: 20
    });

    offset += start + 20;

    bytecode = bytecode.slice(start + 20);
  }
  return linkReferences;
};

module.exports = {
  linkBytecode: linkBytecode,
  findLinkReferences: findLinkReferences
};
