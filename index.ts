import { downloadSpecificVersion, getVersionList } from "./downloadSpecificVersion";
import wrapper from './wrapper';
import os from 'os';
import fs from 'fs';
import path from 'path'; 
import * as semver from 'semver';

export const SOLC_INSTALLATION_DIRECTORY = os.homedir() + '/.bagels';

// Important to note: 
// contractSolVersion can be any semver type of string
// Examples: >0.5.1, =0.5.5, etc, etc
export default async function specificSolVersion(contractSolVersion?: string):Promise<any> {
  if (!contractSolVersion) {
    // If no input passed, just return the default (whatever the package version # is)
    // Only doing this to keep the base test cases intact (this is what gets returned for those)
    const soljson = require('./soljson.js');
    return wrapper(soljson);
  }
  
  const validInstalledSolVersion = getInstalledValidVersion(contractSolVersion);

  if (validInstalledSolVersion) {
    try { 
      const soljson = require(validInstalledSolVersion);
      return wrapper(soljson);
    } catch (e) {
      console.log(e);
    }
  } 
  // Download a valid solc version
  else { 
    await downloadValidSolcVersion(contractSolVersion);
  }
}

export async function downloadValidSolcVersion(contractSolVersion) {
  let list = await getVersionList();
  let parsedList = JSON.parse(list);
    
  const releases = parsedList['releases'];
  let validSolcVersionToDownload: string | null;

  for (const key in releases) { 
    if (isValidVersion(key, contractSolVersion)) {
      validSolcVersionToDownload = key;
      break;
    }
  }

  if (!validSolcVersionToDownload) {
    throw new Error("Couldn't find a valid solc version to download. Is the pragma solidity line valid?")
  }

  console.log(`downloading solc-js v${validSolcVersionToDownload}...`);

  console.time('download finished')
  const output = await downloadSpecificVersion(validSolcVersionToDownload);
  console.timeEnd('download finished')

  const soljson = require(output);
  return wrapper(soljson);
}
export function getInstalledValidVersion(contractPragmaVersion: string): string | null {
  try { 
    let validVersionAlreadyInstalled;
    const installedVersions = getInstalledVersions();

    for (var index = 0; index < Object.keys(installedVersions).length; index++) {
      let version = Object.keys(installedVersions)[index];
      let versionPath = Object.values(installedVersions)[index];

      // plainInstalledVersion = 0.6.1, contractPragmaVersion = >0.6.0, or something
      const installedVersionIsValid = isValidVersion(version, contractPragmaVersion); 

      if (installedVersionIsValid) {
        validVersionAlreadyInstalled = versionPath;
        break;
      }
    }

    return validVersionAlreadyInstalled;
  } catch (e) {
    console.log(e);
    throw new Error("Could not pick from the installed solc versions. Did you declare pragma solidity?")
  }
}

export function getInstalledVersions() { 
  if (!fs.existsSync(SOLC_INSTALLATION_DIRECTORY)) {
    fs.mkdirSync(SOLC_INSTALLATION_DIRECTORY);
  } 

  const files = fs.readdirSync(SOLC_INSTALLATION_DIRECTORY);
  const solVersions = files.filter(file => file.startsWith('soljson-'));

  let versionMappings = {};

  // Get things into this format: { 0.5.17': '/Users/hack/.bagels/soljson-0.5.17.js }
  solVersions.map((solVersion) => {
    let version = path.join(SOLC_INSTALLATION_DIRECTORY, solVersion);
    let plainInstalledVersionNumber = solVersion.substring('soljson-'.length).replace('.js', "");

    versionMappings[plainInstalledVersionNumber] = version;
  })

  return versionMappings;
}

function isValidVersion(version, contractPragmaVersion) { 
  let satisfied = semver.satisfies(version, contractPragmaVersion);
      
  // Need to figure out if the major + minor versions are the same b/c minor version upgrades 0.x.1 can include breaking changes
  const strippedPragma = stripSemver(contractPragmaVersion);
  let minorRange = semver.minor(version) === semver.minor(strippedPragma)
  let majorRange = semver.major(version) === semver.major(strippedPragma)

  if (satisfied && minorRange && majorRange) { 
    return true;
  } else {
    return false;
  }
}

// ^0.1.2 --> 0.1.2
// >=1.2.1 --> 1.2.1
// etc, etc. For hopefully all types of pragma solidity results
function stripSemver(semverString) {
  return semverString.replace(/[=>^<~]/g, '')
}
