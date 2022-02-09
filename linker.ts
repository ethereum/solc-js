import assert from 'assert';
import { keccak256 } from 'js-sha3';
import { isNil, isObject } from './common/helpers';
import { LibraryPlaceholdersMapping, LinkReferences } from './common/types';

/**
 * Newer versions of the compiler use hashed names instead of the string values.
 *
 * This helper makes the conversion between name and hash at the target length
 * for replacement.
 *
 * @param libraryName
 */
function libraryHashPlaceholder (libraryName: string) {
  return `$${keccak256(libraryName).slice(0, 34)}$`;
}

/**
 * Used to support legacy library names and the current hash library names,
 * replaces the names with the provided hex address.
 *
 * @param bytecode
 * @param hexAddress
 * @param labelName
 */
function replacePlaceholderLabelWithHexAddress (bytecode: string, hexAddress: string, labelName: string): string {
  // truncate to 36 characters, why, I assume this is because legacy names
  // only had a length of 36 characters?
  const truncatedName = labelName.slice(0, 36);

  const prefix = '__';
  const postFix = `${Array(37 - truncatedName.length).join('_')}__`;
  const libLabel = `${prefix}${truncatedName}${postFix}`;

  while (bytecode.indexOf(libLabel) >= 0) {
    bytecode = bytecode.replace(libLabel, hexAddress);
  }

  return bytecode;
}

/**
 * When using libraries, the resulting bytecode will contain placeholders for
 * the real addresses of the referenced libraries. These have to be updated,
 * via a process called linking, before deploying the contract.
 *
 * This method provides a simple helper for linking.
 *
 * @param {string} bytecode
 * @param {string} libraries
 * @returns {string} bytecode
 */
function linkBytecode (bytecode: string, libraries: LibraryPlaceholdersMapping): string {
  assert(typeof bytecode === 'string');
  assert(typeof libraries === 'object');

  // NOTE: for backwards compatibility support old compiler which didn't use file names
  const librariesComplete: { [x: string]: string } = {};

  for (const [libraryName, library] of Object.entries(libraries)) {
    if (isNil(library)) continue;

    // API compatible with the standard JSON i/o
    if (isObject(library)) {
      for (const [key, value] of Object.entries(library)) {
        librariesComplete[key] = value;
        librariesComplete[`${libraryName}:${key}`] = value;
      }

      continue;
    }

    // backwards compatible API for early solc-js versions
    const parsed = libraryName.match(/^([^:]+):(.+)$/);

    if (!isNil(parsed)) librariesComplete[parsed[2]] = library as string;
    librariesComplete[libraryName] = library as string;
  }

  for (const libraryName in librariesComplete) {
    let hexAddress = librariesComplete[libraryName];

    if (!hexAddress.startsWith('0x') || hexAddress.length > 42) {
      throw new Error(`Invalid address specified for ${libraryName}`);
    }

    // remove 0x prefix
    hexAddress = hexAddress.slice(2);
    hexAddress = Array(40 - hexAddress.length + 1).join('0') + hexAddress;

    // replace all library names with a hex address of all zeros of length
    // (40 - len(hexAddress) + 1) + the org hex address without the prefix.
    //
    // and then again for the hash version of hte library name.
    bytecode = replacePlaceholderLabelWithHexAddress(bytecode, hexAddress, libraryName);
    bytecode = replacePlaceholderLabelWithHexAddress(bytecode, hexAddress, libraryHashPlaceholder(libraryName));
  }

  return bytecode;
}

/**
 * As of Solidity 0.4.11 the compiler supports standard JSON input and output
 * which outputs a _link references_ map. This gives a map of library names to
 * offsets in the bytecode to replace the addresses at. It also doesn't have
 * the limitation on library file and contract name lengths.
 *
 * There is a method available here which can find such link references in
 * bytecode produced by an older compiler.
 *
 * @param {string} bytecode
 * @returns {string} LinkedReferences
 */
function findLinkReferences (bytecode: string): LinkReferences {
  assert(typeof bytecode === 'string');

  // find 40 bytes in the pattern of __...<36 digits>...__
  // e.g. __Lib.sol:L_____________________________
  const linkReferences: LinkReferences = {};

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

    // offsets are in bytes in binary representation (and not hex)
    linkReferences[libraryName].push({
      start: (offset + start) / 2,
      length: 20
    });

    offset += start + 20;
    bytecode = bytecode.slice(start + 20);
  }

  return linkReferences;
}

export = {
  linkBytecode,
  findLinkReferences
};
