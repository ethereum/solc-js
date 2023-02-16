import { downloadSpecificVersion, getVersionList } from "./downloadSpecificVersion";
import * as semver from 'semver';
import * as fs from 'fs';
import os from 'os';
import path from "path";
import specificSolVersion from ".";

export const SOLC_INSTALLATION_DIRECTORY = os.homedir() + '/.bagels'
 
// Parse thru, and check the version in the contract
const contractPath = '/Users/hack/Local/bagels-solc-js/test/resources/BasicContract.sol';

const contractAsString = getContractAsString(contractPath);

// Get a valid compiler version that's already installed from the contract
const validInstalledSolVersion = getInstalledValidVersion(contractAsString);

async function compileContract(solVersionDir) {
  let input = {
    language: 'Solidity',
    sources: {
      ['BasicContract']: {
        content: contractAsString,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*'],
        },
      },
    },
  }

  let output = JSON.parse(
    specificSolVersion(solVersionDir).compile(JSON.stringify(input)),
  )

  for (let contractName in output.contracts['BasicContract']) {
    console.log('abi: ', output.contracts['BasicContract'][contractName].abi);
    console.log('bytecode: ', output.contracts['BasicContract'][contractName].evm.bytecode.object)
  }
}

async function main() { 
  if (validInstalledSolVersion) {
    try { 
      console.time("Compiled contract");
  
      compileContract(validInstalledSolVersion);
  
      console.timeEnd("Compiled contract");
  
      // return;
    } catch (e) {
      console.log(e);
    }
  } 
  // Download a valid solc version
  else { 
     let list = await getVersionList();
     let parsedList = JSON.parse(list);
        
     const releases = parsedList['releases'];
     let validSolcVersionToDownload: string | null;
  
     const pragmaSolidityLine = getPragmaSolidity(contractAsString);
  
     for (const key in releases) { 
       if (isValidVersion(key, pragmaSolidityLine)) {
         validSolcVersionToDownload = key;
         break;
       }
     }
   
     if (!validSolcVersionToDownload) { 
       throw new Error("Couldn't find a valid solc version to download. Is the pragma solidity line valid?")
     }
   
     console.log(`downloading solc-js v${validSolcVersionToDownload}...`);
     const output = await downloadSpecificVersion(validSolcVersionToDownload);

     compileContract(output);
     console.log(output);
  }
}

main();

function getContractAsString(contractDir) { 
  return fs.readFileSync(contractDir).toString();
}

// Returns version path
function getInstalledValidVersion(contractAsString:string): String | null {
  try { 
    let contractPragmaVersion = getPragmaSolidity(contractAsString);

    if (!contractPragmaVersion) { 
      throw new Error('Could not find solidity version in the contract. Did you declare pragma solidity?')
    }

    let validVersionAlreadyInstalled = null;
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
    throw new Error("Could not find solidity version in the contract. Did you declare pragma solidity?")
  }
}

function getInstalledVersions() { 
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

function getPragmaSolidity(contractString) {
  const lines = contractString.split('\n');
  return lines?.find(line => line.startsWith('pragma solidity'))?.split('pragma solidity')[1].replace(';', '').trim();
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